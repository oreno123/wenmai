-- 修复 works 表 RLS 无限递归（42P17）
-- 根因：insert_own_with_daily_limit 的 WITH CHECK 里 SELECT COUNT(*) FROM works，
--       works 策略查询 works 自身 → 递归。云版时代用 SECURITY DEFINER 绕过，
--       重写 001_gallery.sql 时丢失了该修复。
-- 方案：is_admin 判定与当日发布计数都包进 SECURITY DEFINER 函数（以表 owner 运行，绕开 RLS）。

SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_wm_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = uid AND is_admin);
$$;

CREATE OR REPLACE FUNCTION public.works_published_today(uid UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INT FROM public.works
  WHERE author_id = uid AND created_at > NOW() - INTERVAL '1 day';
$$;

GRANT EXECUTE ON FUNCTION public.is_wm_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.works_published_today(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "read_approved_or_own_or_admin" ON works;
CREATE POLICY "read_approved_or_own_or_admin" ON works FOR SELECT
  USING (
    status = 'approved'
    OR author_id = auth.uid()
    OR public.is_wm_admin(auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_with_daily_limit" ON works;
CREATE POLICY "insert_own_with_daily_limit" ON works FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND public.works_published_today(auth.uid()) < 3
  );

DROP POLICY IF EXISTS "update_own_or_admin" ON works;
CREATE POLICY "update_own_or_admin" ON works FOR UPDATE
  USING (
    author_id = auth.uid()
    OR public.is_wm_admin(auth.uid())
  );
