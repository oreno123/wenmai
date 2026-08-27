-- Supabase 兼容层：替代 supabase/postgres 镜像的预置角色/schema
-- __POSTGRES_PASSWORD__ 由部署脚本 sed 替换
-- 以 postgres 超用户执行（docker-entrypoint-initdb.d 首次初始化自动跑）

-- ── 1. Supabase 角色体系 ──
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN PASSWORD '__POSTGRES_PASSWORD__'
  IN ROLE anon, authenticated, service_role;

-- ── 2. schema：auth（GoTrue 将 migrate 表进来）、storage（storage-api 将 migrate）──
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

-- RLS 依赖的 JWT helper（与官方 supabase/postgres 镜像一致）
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

-- ── 3. 授权 ──
GRANT USAGE, CREATE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth, storage TO anon, authenticated, service_role;

-- postgres 用户后续建的表（业务 SQL 灌入阶段）自动授权给 API 角色
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
