-- 04-admin-column-lock.sql
-- 修复 WM-01（CRITICAL）：任意登录用户可 PATCH /rest/v1/profiles {"is_admin":true} 自我提权。
-- 根因：RLS 只限行不限列 + 00-roles.sql 默认 GRANT 全列 UPDATE + is_wm_admin() 读该列。
--
-- ⚠️ PostgreSQL 坑（v1 踩过）：REVOKE UPDATE (is_admin) 对"表级整授的 UPDATE"无效——
--    列权限只做加法不做减法，has_column_privige 仍返回 true。
--    正确写法 = 整表 REVOKE UPDATE + 按列 GRANT 回（白名单不含 is_admin）。
--
-- 双层防护：
--   1) 列级白名单 —— authenticated 可 UPDATE 除 is_admin 外全部列；anon 收走全部 UPDATE
--      （anon 本就被 update_own 的 RLS 挡死，收掉是纯收紧）
--   2) BEFORE UPDATE 触发器 —— 防 default privileges 重跑后回退；auth.uid() IS NULL 的
--      直连运维会话（psql）放行，运维仍可手工授权管理员
-- 幂等可重复执行。应用后跑 deploy/e2e_gallery_test.py 回归（e2e 伪造真管理员 JWT，不受影响）。

REVOKE UPDATE ON TABLE public.profiles FROM authenticated, anon;
GRANT UPDATE (user_id, username, points, free_pulls, pity_counter, daily_pull_date,
              library, creations, updated_at, works_count)
  ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_profile_admin() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND auth.uid() IS NOT NULL
     AND NOT public.is_wm_admin(auth.uid()) THEN
    RAISE EXCEPTION 'profiles.is_admin 不可由普通用户修改 (WM-01)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profile_admin ON public.profiles;
CREATE TRIGGER trg_guard_profile_admin
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_admin();

-- 验证（应用后手动执行，两条都应如注释所示）：
--   SELECT has_column_privilege('authenticated','public.profiles','is_admin','UPDATE');  -- false
--   SELECT has_column_privilege('authenticated','public.profiles','points','UPDATE');    -- true
--   以普通用户 JWT PATCH {"is_admin":true} 应得 42501 permission denied
