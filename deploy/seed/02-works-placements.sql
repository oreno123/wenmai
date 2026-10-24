-- 02-works-placements.sql
-- 给 13 件种子作品补上真实的拼贴组成（placements）。
-- 背景：01-gallery.sql 只建表，种子作品是用 placements='[]' 插进去的，
-- 于是 /puzzle?fork=<id> 复用出来是一张空画布，看不到任何东西。
-- placements 的 id 字段就是 patternId（PuzzlePage 设计如此），坐标是 0..1024 画布空间。
-- 只填 placements 仍为空的行，不动任何已有组成。

SET search_path = public;
BEGIN;

CREATE TEMP TABLE seed_pl (
  ord int, title text, id text, x int, y int, size int, rot int, sx numeric, sy numeric
) ON COMMIT DROP;

INSERT INTO seed_pl (ord, title, id, x, y, size, rot, sx, sy) VALUES
  -- 青花瓷
  (1,'缠枝映月','qh-26',512,500,470,0,1,1),
  (2,'缠枝映月','qh-4',512,876,340,0,1,0.36),
  (3,'缠枝映月','qh-23',512,168,210,0,1,1),
  (1,'莲台清供','qh-16',512,496,480,0,1,1),
  (2,'莲台清供','qh-15',512,880,340,0,1,0.34),
  (3,'莲台清供','qh-19',512,170,190,0,1,1),
  (1,'牡丹听雨','qh-23',512,500,460,0,1,1),
  (2,'牡丹听雨','qh-25',512,160,210,0,1,1),
  (3,'牡丹听雨','qh-18',512,880,340,0,1,0.34),
  (1,'江崖叠雪','qh-19',512,512,500,0,1,1),
  (2,'江崖叠雪','qh-8',512,520,340,0,1,1),
  (3,'江崖叠雪','qh-15',512,880,330,0,1,0.30),
  -- 青铜器
  (1,'回纹问鼎','taotie-1',512,490,430,0,1,1),
  (2,'回纹问鼎','basic-2',512,860,330,0,1,0.34),
  (1,'云雷载德','cloud-4',512,490,450,0,1,1),
  (2,'云雷载德','taotie-2',512,165,230,0,1,1),
  (3,'云雷载德','basic-2',512,865,330,0,1,0.32),
  (1,'饕餮不语','taotie-3',512,500,470,0,1,1),
  (2,'饕餮不语','tile-1',512,870,340,0,1,0.30),
  (1,'夔龙蟠踞','taotie-3',512,500,450,0,1,1),
  (2,'夔龙蟠踞','dragon-1',512,160,235,0,1,1),
  (3,'夔龙蟠踞','basic-2',512,870,330,0,1,0.32),
  -- 唐草
  (1,'卷草长春','scroll-1',512,490,440,0,1,1),
  (2,'卷草长春','scroll-2',512,865,340,0,1,0.32),
  (1,'宝相重光','scroll-3',512,500,470,0,1,1),
  (2,'宝相重光','basic-3',512,165,220,0,1,1),
  (3,'宝相重光','scroll-1',512,875,330,0,1,0.30),
  (1,'缠枝无尽','scroll-2',512,490,450,0,1,1),
  (2,'缠枝无尽','scroll-1',512,870,340,0,1,0.32),
  -- 山海经
  (1,'应龙布雨','sj-12',512,500,480,0,1,1),
  (2,'应龙布雨','sj-11',512,150,200,0,1,1),
  (1,'白鹿行水','sj-7',512,500,480,0,1,1),
  (2,'白鹿行水','basic-1',512,155,215,0,1,1);

UPDATE public.works w
SET placements = agg.j
FROM (
  SELECT title,
         jsonb_agg(jsonb_build_object(
           'id', id, 'x', x, 'y', y, 'size', size,
           'rotation', rot, 'scaleX', sx, 'scaleY', sy) ORDER BY ord) AS j
  FROM seed_pl
  GROUP BY title
) agg
WHERE w.title = agg.title
  AND w.status = 'approved'
  AND (w.placements IS NULL OR w.placements = '[]'::jsonb);

SELECT title, jsonb_array_length(placements) AS placements_n
FROM public.works
ORDER BY created_at DESC;

COMMIT;
