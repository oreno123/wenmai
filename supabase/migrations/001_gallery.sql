-- ============================================================
-- 纹脉广场 v1 — 数据库 Schema + RLS + Triggers + Storage
-- 日期：2026-07-01
-- 用法：在 Supabase Dashboard → SQL Editor → New query → 整段粘贴 → Run
-- 注意：跑完后需要手动把自己设为管理员，见文件末尾
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 1. works 表
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS works (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID REFERENCES profiles(user_id) NOT NULL,
  title TEXT NOT NULL,
  template TEXT,
  placements JSONB NOT NULL,
  cover_path TEXT,
  series TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  rejected_reason TEXT,
  forked_from UUID REFERENCES works(id),
  likes_count INT NOT NULL DEFAULT 0,
  reuse_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(user_id)
);

CREATE INDEX IF NOT EXISTS idx_works_status_created ON works(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_works_author ON works(author_id);
CREATE INDEX IF NOT EXISTS idx_works_forked_from ON works(forked_from);

-- ──────────────────────────────────────────────────────────
-- 2. likes 表
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS likes (
  user_id UUID REFERENCES profiles(user_id),
  work_id UUID REFERENCES works(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, work_id)
);

-- ──────────────────────────────────────────────────────────
-- 3. profiles 扩展（管理员 + 作品计数）
-- ──────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS works_count INT NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────
-- 4. Triggers — 自动维护计数
-- ──────────────────────────────────────────────────────────

-- likes 变动 → works.likes_count 同步
CREATE OR REPLACE FUNCTION update_likes_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works SET likes_count = likes_count + 1 WHERE id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE works SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.work_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_likes_count ON likes;
CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- work INSERT → forked_from 源作品 reuse_count +1
CREATE OR REPLACE FUNCTION update_work_counts() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.forked_from IS NOT NULL THEN
    UPDATE works SET reuse_count = reuse_count + 1 WHERE id = NEW.forked_from;
  END IF;
  IF NEW.status = 'approved' THEN
    UPDATE profiles SET works_count = works_count + 1 WHERE user_id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_work_counts ON works;
CREATE TRIGGER trg_work_counts
  AFTER INSERT ON works
  FOR EACH ROW EXECUTE FUNCTION update_work_counts();

-- work 审核状态变更 → 同步作者 works_count
CREATE OR REPLACE FUNCTION update_works_count_on_review() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status = 'approved' AND NEW.status <> 'approved' THEN
      UPDATE profiles SET works_count = GREATEST(0, works_count - 1) WHERE user_id = NEW.author_id;
    ELSIF OLD.status <> 'approved' AND NEW.status = 'approved' THEN
      UPDATE profiles SET works_count = works_count + 1 WHERE user_id = NEW.author_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_works_count_review ON works;
CREATE TRIGGER trg_works_count_review
  AFTER UPDATE OF status ON works
  FOR EACH ROW EXECUTE FUNCTION update_works_count_on_review();

-- ──────────────────────────────────────────────────────────
-- 5. RLS — 行级安全策略
-- ──────────────────────────────────────────────────────────

ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- works 读：approved 公开 + 作者读自己 + 管理员读全部
DROP POLICY IF EXISTS "read_approved_or_own_or_admin" ON works;
CREATE POLICY "read_approved_or_own_or_admin" ON works FOR SELECT
  USING (
    status = 'approved'
    OR author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin)
  );

-- works 写：登录用户发布，每用户每天 ≤ 3 件
DROP POLICY IF EXISTS "insert_own_with_daily_limit" ON works;
CREATE POLICY "insert_own_with_daily_limit" ON works FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (
      SELECT COUNT(*) FROM works
      WHERE author_id = auth.uid()
        AND created_at > NOW() - INTERVAL '1 day'
    ) < 3
  );

-- works 改：作者可改自己 / 管理员可审
DROP POLICY IF EXISTS "update_own_or_admin" ON works;
CREATE POLICY "update_own_or_admin" ON works FOR UPDATE
  USING (
    author_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND is_admin)
  );

-- likes：登录可 like / 自己可 unlike
DROP POLICY IF EXISTS "like_if_logged_in" ON likes;
CREATE POLICY "like_if_logged_in" ON likes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "unlike_own" ON likes;
CREATE POLICY "unlike_own" ON likes FOR DELETE
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────
-- 6. Storage bucket
-- ──────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('works', 'works', true)
ON CONFLICT (id) DO NOTHING;

-- 上传：只能往自己文件夹
DROP POLICY IF EXISTS "upload_own_folder" ON storage.objects;
CREATE POLICY "upload_own_folder" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'works'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 读：公开
DROP POLICY IF EXISTS "read_works_bucket" ON storage.objects;
CREATE POLICY "read_works_bucket" ON storage.objects FOR SELECT
  USING (bucket_id = 'works');

-- 删：只能删自己
DROP POLICY IF EXISTS "delete_own_works" ON storage.objects;
CREATE POLICY "delete_own_works" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'works'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ──────────────────────────────────────────────────────────
-- 7. 把当前所有已存在的用户设为非管理员（默认值，可省略）
-- ──────────────────────────────────────────────────────────
-- DO $$ BEGIN
--   UPDATE profiles SET is_admin = FALSE WHERE is_admin IS NULL;
-- END $$;

-- ============================================================
-- 跑完后必做：
-- 1. 把自己设为管理员（替换 user_id）：
--    UPDATE profiles SET is_admin = TRUE WHERE user_id = '你的-uuid';
--    （查询自己的 user_id：SELECT auth.uid(); 或在 Auth 页面看）
--
-- 2. 确认 Storage bucket 创建成功：Dashboard → Storage → 应能看到 'works'
--
-- 3. 测试：用普通账号发布一件作品 → 检查 status=pending →
--    用管理员账号访问 /admin 审核 → 通过后 /gallery 可见
-- ============================================================
