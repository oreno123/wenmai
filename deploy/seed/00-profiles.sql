-- 固定落到 public：防 ALTER ROLE 级 search_path 或连接默认值把表建进 auth schema
SET search_path = public;

-- profiles 表 — 字段从 src/lib/auth.ts + src/store/gameStore.ts 的
-- upsert/select 推断（云端原始建表 SQL 不在 repo，这是等价重建）
-- 在 auth schema 就绪后执行（supabase/postgres 镜像自带 auth.users）

CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  points INT NOT NULL DEFAULT 0,
  free_pulls INT NOT NULL DEFAULT 0,
  pity_counter INT NOT NULL DEFAULT 0,
  daily_pull_date TEXT,
  library JSONB NOT NULL DEFAULT '[]'::jsonb,
  creations JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 读：公开（gallery 嵌套读 author username 需要；用户名本身是公开展示字段）
DROP POLICY IF EXISTS "read_public" ON profiles;
CREATE POLICY "read_public" ON profiles FOR SELECT
USING (TRUE);

-- 写：仅本人（signUp 时 upsert 自己的行 + gameStore 持续同步自己的行）
DROP POLICY IF EXISTS "insert_own" ON profiles;
CREATE POLICY "insert_own" ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own" ON profiles;
CREATE POLICY "update_own" ON profiles FOR UPDATE
USING (auth.uid() = user_id);
