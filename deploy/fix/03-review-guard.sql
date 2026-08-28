-- 堵审核绕过漏洞：
-- 1) INSERT 策略未强制 status='pending' → 作者可直发 approved 上公开广场
-- 2) UPDATE 策略允许作者改自己行的任意列（含 status）→ 作者可自审通过
-- 修法：INSERT 强制 pending + reviewed_by IS NULL；UPDATE 加触发器，非管理员改 status/reviewed_by 即报错。
-- 管理员路径（approveWork/rejectWork 走 UPDATE）不受影响，前端零改动。

SET search_path = public;

DROP POLICY IF EXISTS "insert_own_with_daily_limit" ON works;
CREATE POLICY "insert_own_with_daily_limit" ON works FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND public.works_published_today(auth.uid()) < 3
  );

CREATE OR REPLACE FUNCTION public.guard_work_status() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by)
     AND NOT public.is_wm_admin(auth.uid()) THEN
    RAISE EXCEPTION '只有管理员可以变更审核状态';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_work_status ON works;
CREATE TRIGGER trg_guard_work_status BEFORE UPDATE ON works
FOR EACH ROW EXECUTE FUNCTION public.guard_work_status();
