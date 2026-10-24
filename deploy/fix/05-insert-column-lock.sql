-- 05-insert-column-lock.sql
-- 修复 run-2 两条：
--   WM2-01 (CRITICAL)：任意登录用户 POST /rest/v1/profiles {"is_admin":true} 自封管理员。
--                      fix/04 只锁了 UPDATE 路径，INSERT 路径整表可写、从无 REVOKE。
--   WM2-05 (MEDIUM)  ：works 表的 likes_count/reuse_count/author_id/forked_from 可由作者
--                      PATCH 直写成任意值；已过审作品的 cover_path 也可被事后替换。
--
-- ⚠️ 前提：先跑 04-admin-column-lock.sql（本文件会覆盖它建的 trg_guard_profile_admin，
--    改成 INSERT OR UPDATE 两个动作；直接跑本文件也能建起来，不依赖 04 的顺序）。
--
-- ⚠️ Postgres 坑（同 04）：列权限只做加法。REVOKE INSERT (is_admin) 对表级 INSERT 无效，
--    必须"整表 REVOKE INSERT + 按列 GRANT 回"。
--
-- ⚠️ 为什么 works 的 status/reviewed_by/rejected_reason 仍在白名单里：
--    本项目的"管理员"不是独立 DB role，而是 authenticated 用户身上的 is_admin 标志位。
--    列 GRANT 认 role 不认数据，锁掉这四列会连管理员一起锁死，审核直接不可用。
--    这四列的行级归属继续由 01-gallery.sql:138 的 guard_work_status 触发器把关（只放行
--    真管理员），列锁只负责"与客户端无关"的列。
--
-- 幂等可重复执行。应用后跑 deploy/e2e_gallery_test.py 回归；
-- e2e 用伪造的服务端密钥直连、且以 postgres 超级用户会话建档，不受本文件影响。

-- ══════════════════════════════════════════════════════════
-- Part A — profiles：掐断 INSERT 自封管理员（WM2-01）
-- ══════════════════════════════════════════════════════════

-- 整表 REVOKE，再按列白名单 GRANT（显式排除 is_admin）
-- anon 本就被 insert_own 策略挡死（auth.uid() 恒为 NULL），收掉 INSERT 是纯收紧。
REVOKE INSERT ON TABLE public.profiles FROM authenticated, anon;
GRANT INSERT (user_id, username, points, free_pulls, pity_counter, daily_pull_date,
              library, creations, updated_at)
  ON TABLE public.profiles TO authenticated;

-- 列白名单与客户端 upsert 负载逐列核对：
--   src/lib/auth.js:54   注册建档 → user_id, username, points, free_pulls, pity_counter,
--                                    daily_pull_date, library, creations, updated_at
--   src/store/gameStore.ts:20 持续同步 → 同上减去 username
-- works_count 不在列内：它由 update_work_counts / update_works_count_on_review 触发器维护，
-- 客户端从不 INSERT 它（UPDATE 权仍在 04 的白名单里，触发器才写得动）。

-- 守卫从 UPDATE-only 扩到 INSERT OR UPDATE（防 default privileges 重跑后回退）。
-- INSERT 分支不能沿用 "NEW.is_admin IS DISTINCT FROM OLD.is_admin" —— INSERT 时 OLD 为 NULL，
-- 该表达式对 is_admin=false 也会判真，会把每一次正常建档都拦掉。
CREATE OR REPLACE FUNCTION public.guard_profile_admin() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_admin, FALSE)
       AND auth.uid() IS NOT NULL
       AND NOT public.is_wm_admin(auth.uid()) THEN
      RAISE EXCEPTION 'profiles.is_admin 不可在 INSERT 时设置 (WM2-01)';
    END IF;
  ELSE  -- UPDATE
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
       AND auth.uid() IS NOT NULL
       AND NOT public.is_wm_admin(auth.uid()) THEN
      RAISE EXCEPTION 'profiles.is_admin 不可由普通用户修改 (WM-01)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_admin ON public.profiles;
CREATE TRIGGER trg_guard_profile_admin
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_admin();

-- ══════════════════════════════════════════════════════════
-- Part B — works：列级白名单（WM2-05）
-- ══════════════════════════════════════════════════════════

REVOKE UPDATE ON TABLE public.works FROM authenticated, anon;
GRANT UPDATE (title, template, placements, series, cover_path,
              status, rejected_reason, reviewed_at, reviewed_by)
  ON TABLE public.works TO authenticated;

-- 白名单逐项对客户端：
--   src/lib/galleryApi.js:157  作者发布后回填 cover_path        → cover_path
--   src/lib/galleryApi.js:216  管理员通过审核                    → status, reviewed_at,
--   src/lib/galleryApi.js:235  管理员驳回                        →   reviewed_by, rejected_reason
--   （title/template/placements/series = 作者编辑自己作品，保留可用）
-- 移出白名单（永不可由客户端 UPDATE）：
--   author_id     —— 归属不可变，改归属 = 偷作品
--   forked_from   —— 改来源 = 伪造 fork 链 / 配合 reuse_count 刷榜
--   likes_count   —— 由 trg_likes_count 维护（01-gallery.sql:58）
--   reuse_count   —— 由 update_work_counts 维护（01-gallery.sql:76）
--   id / created_at —— 行标识与时间戳

-- Part B 的必要配套：计数器触发器改成 SECURITY DEFINER。
-- 为什么必须改：update_likes_count / update_work_counts 原本是普通触发器，以"发起用户"身份
-- 运行。锁掉 likes_count / reuse_count 的 UPDATE 权后，普通用户点一次赞（AFTER INSERT ON likes）
-- 或 fork 一次（AFTER INSERT ON works）会让触发器里那句 UPDATE works SET likes_count=… 以
-- *该用户* 身份执行 → 命中列锁 → 42501，点赞和发布双双坏掉。SECURITY DEFINER 让这几句以函数
-- 属主（表 owner）身份跑，绕开列权限，而列锁对客户端仍然生效。
-- 顺带把 search_path 钉死在 public，防 search_path 劫持（SECURITY DEFINER 的常规要求）。
CREATE OR REPLACE FUNCTION public.update_likes_count() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE works SET likes_count = likes_count + 1 WHERE id = NEW.work_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE works SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.work_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_work_counts() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.forked_from IS NOT NULL THEN
    UPDATE works SET reuse_count = reuse_count + 1 WHERE id = NEW.forked_from;
  END IF;
  IF NEW.status = 'approved' THEN
    UPDATE profiles SET works_count = works_count + 1 WHERE user_id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_works_count_on_review() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

-- ══════════════════════════════════════════════════════════
-- Part C — 守卫：过审作品不得事后换封面 / 普通用户不得碰审核字段
-- ══════════════════════════════════════════════════════════

-- covre_path 仍必须留在白名单（发布流程要先 INSERT 再回填），但只允许在
-- pending 状态下由作者本人回填 —— 堵掉"作品已过审后把封面换成违规图"。
CREATE OR REPLACE FUNCTION public.guard_work_cover() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.cover_path IS DISTINCT FROM OLD.cover_path
     AND NOT public.is_wm_admin(auth.uid())
     AND NOT (OLD.status = 'pending' AND OLD.author_id = auth.uid()) THEN
    RAISE EXCEPTION '仅可在待审状态下更新自己作品的封面 (WM2-05)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_work_cover ON public.works;
CREATE TRIGGER trg_guard_work_cover
BEFORE UPDATE ON public.works
FOR EACH ROW EXECUTE FUNCTION public.guard_work_cover();

-- 审核四字段的守护由 01-gallery.sql:138 的 guard_work_status 负责（只放行真管理员）。
-- 这里加宽到 rejected_reason / reviewed_at —— 原版只守 status / reviewed_by，
-- 普通用户仍能给自己 pending 的作品塞 rejected_reason（纯脏数据，不致命，顺手堵上）。
CREATE OR REPLACE FUNCTION public.guard_work_status() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
      OR NEW.rejected_reason IS DISTINCT FROM OLD.rejected_reason
      OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at)
     AND NOT public.is_wm_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有管理员可以变更审核状态';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_work_status ON public.works;
CREATE TRIGGER trg_guard_work_status BEFORE UPDATE ON public.works
FOR EACH ROW EXECUTE FUNCTION public.guard_work_status();

-- ══════════════════════════════════════════════════════════
-- 验证（应用后手动执行，均应如注释所示）
-- ══════════════════════════════════════════════════════════
--   SELECT has_column_privilege('authenticated','public.profiles','is_admin','INSERT');   -- false
--   SELECT has_column_privilege('authenticated','public.profiles','creations','INSERT');  -- true
--   SELECT has_column_privilege('authenticated','public.works','likes_count','UPDATE');   -- false
--   SELECT has_column_privilege('authenticated','public.works','cover_path','UPDATE');    -- true
--   SELECT has_column_privilege('authenticated','public.works','status','UPDATE');        -- true（admin 走触发器）
--   -- 以普通用户 JWT：
--   --   POST /rest/v1/profiles {"user_id":"<self>","is_admin":true}  → 401/403 或 42501
--   --   PATCH /rest/v1/works?id=eq.<已过审自己的作品> {"likes_count":999999}    → 42501
--   --   PATCH /rest/v1/works?id=eq.<已过审自己的作品> {"cover_path":"..."}      → 触发器 RAISE
--   -- 回归：普通用户发布作品（含封面上传）、管理员通过/驳回，两条链路都应照常工作。
