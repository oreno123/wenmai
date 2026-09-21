-- 04-admin-column-lock.sql
-- 修复 WM-01（CRITICAL）：任意登录用户可 PATCH /rest/v1/profiles {"is_admin":true} 自我提权。
-- 根因：RLS 只限行不限列 + 00-roles.sql 默认 GRANT 全列 UPDATE + is_wm_admin() 读该列。
-- 双层防护：
--   1) 列级 REVOKE —— 主防线，authenticated/anon 对 is_admin 列无 UPDATE 权限
--   2) BEFORE UPDATE 触发器 —— 防将来重新 GRANT 后回退；auth.uid() IS NULL 的直连运维会话（psql）放行
-- 幂等可重复执行。应用后跑 deploy/e2e_gallery_test.py 回归（e2e 伪造的是真管理员 JWT，不受影响）。

REVOKE UPDATE (is_admin) ON TABLE public.profiles FROM authenticated, anon;

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

-- 验证（应用后手动执行）：
--   \dp public.profiles                        -- UPDATE 权限列清单里 is_admin 应消失
--   以普通用户 JWT PATCH {"is_admin":true}      -- 应得 42501 permission denied
