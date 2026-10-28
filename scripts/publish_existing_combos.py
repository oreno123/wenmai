"""用库内已有纹样按 6 个经典模板组合 20 件作品，发布到广场（pending）。

组合 = templates.ts 的排布（中心主纹 + 四角/四边/双边），素材全部来自
PATTERN_LIBRARY / 山海经 / 青花瓷 / AI 元素库——即「已有的组合」。
封面用 PIL 按 placements 同坐标离屏渲染（宣纸底 + 辐射渐变 + 颗粒）。

账号与 scripts/publish_patterns.py 共用（纹样合集）。
输出  scripts/combos_published.json
"""
import io
import json
import os
import pathlib
import re
import sys
import time

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

import httpx

sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
REC = ROOT / 'scripts' / 'pattern_published.json'
OUT = ROOT / 'scripts' / 'combos_published.json'

BASE = 'https://wenmai-api.ruoziqing.cn'
ANON = (ROOT / '.env.local').read_text(encoding='utf-8').split('VITE_SUPABASE_ANON_KEY=')[1].splitlines()[0].strip()
# 种子模式：设 SERVICE_ROLE_KEY 环境变量则绕过 RLS（含每日 3 件限频），直接 approved
SR = os.environ.get('SERVICE_ROLE_KEY')

# PATTERN_LIBRARY 里用到的 id -> image（patternData.ts 摘录）
LIB_IMG = {
    'basic-1': '/patterns/ruyi_cloud.webp',
    'basic-3': '/patterns/lianhua.webp',
    'cloud-1': '/patterns/liuyun.webp',
    'cloud-2': '/patterns/xiangyun.webp',
    'cloud-3': '/patterns/duoyun.webp',
    'taotie-1': '/patterns/taotie_shang.webp',
    'taotie-2': '/patterns/taotie_zhou.webp',
    'taotie-3': '/patterns/kuilong_taotie.webp',
    'dragon-1': '/patterns/panlong.webp',
    'dragon-2': '/patterns/xinglong.webp',
    'dragon-3': '/patterns/shenglong.webp',
    'dragon-4': '/patterns/tuanlong.webp',
    'scroll-1': '/patterns/juancao.webp',
    'scroll-2': '/patterns/juancao-fixed.webp',
    'scroll-3': '/patterns/baoxiang.webp',
    'corner-1': '/patterns/ruyi_corner.webp',
    'corner-2': '/patterns/fengniao_corner.webp',
    'sj-8': '/patterns/shanjing/文鳐鱼·鸟翼锦鲤纹.webp',
    'sj-10': '/patterns/shanjing/计蒙·游渊司雨纹.webp',
    'sj-12': '/patterns/shanjing/应龙·飞龙布雨纹.webp',
    'sj-18': '/patterns/shanjing/穷奇·如虎飞翼纹.webp',
    'sj-21': '/patterns/shanjing/凤皇·自在歌舞纹.webp',
    'qh-1': '/patterns/qinghua/qh-1.webp',
    'qh-2': '/patterns/qinghua/qh-2.webp',
    # 即梦高分纹样（团构图，做组合封面中心；同款也以单品形式发布在广场）
    # chanbao 源图右边框残+斜污渍弃用
    'chanlian-1': '/patterns/chanlian.png',
    'tuanhe-1': '/patterns/tuanhe.png',
    'chiwen-1': '/patterns/chiwen.png',
    'lianban-1': '/patterns/lianban_tang.png',
}

# aiAssets.ts 解析出的 id -> image（ai-element-* / ai-hero-*）
AI_IMG = dict(re.findall(
    r'\{ id: "(ai-[a-z0-9-]+)",.*?image: "([^"]+)"',
    (ROOT / 'src' / 'data' / 'aiAssets.ts').read_text(encoding='utf-8'),
))

C = 1024  # 画布


def P(pid, nx, ny, size, rot=0, sx=1):
    return {'id': pid, 'x': round(nx * C), 'y': round(ny * C), 'size': size,
            'rotation': rot, 'scaleX': sx, 'scaleY': 1}


def corners4(center, corner):
    return [center,
            P(corner, 0.18, 0.18, 140, 0), P(corner, 0.82, 0.18, 140, 90),
            P(corner, 0.18, 0.82, 140, -90), P(corner, 0.82, 0.82, 140, 180)]


def edges4(center, edge):
    return [center,
            P(edge, 0.5, 0.16, 180, 180), P(edge, 0.5, 0.84, 180, 0),
            P(edge, 0.16, 0.5, 180, 90), P(edge, 0.84, 0.5, 180, -90)]


COMBOS = [
    # 青铜器
    {'title': '青铜威仪', 'series': '青铜器', 'template': '青铜威仪',
     'placements': corners4(P('taotie-1', 0.5, 0.5, 380), 'ai-element-corner-geometric-border-00')},
    {'title': '周鼎饕餮', 'series': '青铜器', 'template': '青铜威仪',
     'placements': corners4(P('taotie-2', 0.5, 0.5, 380), 'ai-element-corner-huiwen-00')},
    {'title': '夔龙拱卫', 'series': '青铜器', 'template': '青铜威仪',
     'placements': corners4(P('taotie-3', 0.5, 0.5, 380), 'ai-element-corner-tuanlong-00')},
    # 团龙
    {'title': '团龙献瑞', 'series': '团龙', 'template': '团龙献瑞',
     'placements': corners4(P('dragon-4', 0.5, 0.5, 360), 'ai-element-corner-dragon-00')},
    {'title': '蟠龙镇四方', 'series': '团龙', 'template': '团龙献瑞',
     'placements': corners4(P('dragon-1', 0.5, 0.5, 360), 'ai-element-corner-phoenix-00')},
    {'title': '双龙戏珠', 'series': '团龙', 'template': '双龙戏珠',
     'placements': [P('basic-3', 0.5, 0.5, 200),
                    P('dragon-2', 0.28, 0.5, 280, 0, 1), P('dragon-2', 0.72, 0.5, 280, 0, -1)]},
    {'title': '升龙对望', 'series': '团龙', 'template': '双龙戏珠',
     'placements': [P('scroll-3', 0.5, 0.5, 200),
                    P('dragon-3', 0.28, 0.5, 280, 0, 1), P('dragon-3', 0.72, 0.5, 280, 0, -1)]},
    # 唐草 / 花卉
    {'title': '莲池清韵', 'series': '唐草', 'template': '莲池清韵',
     'placements': corners4(P('basic-3', 0.5, 0.5, 320), 'ai-element-corner-geometric-border-00')},
    {'title': '宝相花卷', 'series': '唐草', 'template': '莲池清韵',
     'placements': edges4(P('scroll-3', 0.5, 0.5, 340), 'cloud-2')},
    # 综合（云）
    {'title': '四合祥云', 'series': None, 'template': None,
     'placements': corners4(P('cloud-2', 0.5, 0.5, 320), 'ai-element-corner-huiwen-00')},
    # 山海经
    {'title': '应龙布雨', 'series': '山海经', 'template': '山海异兽',
     'placements': edges4(P('sj-12', 0.5, 0.5, 380), 'cloud-1')},
    {'title': '凤皇来仪', 'series': '山海经', 'template': '山海异兽',
     'placements': edges4(P('sj-21', 0.5, 0.5, 380), 'cloud-2')},
    {'title': '计蒙司雨', 'series': '山海经', 'template': '山海异兽',
     'placements': edges4(P('sj-10', 0.5, 0.5, 380), 'cloud-3')},
    {'title': '穷奇御风', 'series': '山海经', 'template': '山海异兽',
     'placements': edges4(P('sj-18', 0.5, 0.5, 380), 'cloud-1')},
    {'title': '文鳐跃浪', 'series': '山海经', 'template': '山海异兽',
     'placements': edges4(P('sj-8', 0.5, 0.5, 380), 'cloud-2')},
    # 青花瓷（qh-* 照片低清、AI 元素库全是角隅件，中心一律改用即梦团构图 + 染色）
    {'title': '青花缠枝', 'series': '青花瓷', 'template': '青花缠枝',
     'placements': corners4(P('chanlian-1', 0.5, 0.5, 400), 'ai-element-juancao-02')},
    {'title': '青花云涌', 'series': '青花瓷', 'template': '青花缠枝',
     'placements': corners4(P('tuanhe-1', 0.5, 0.5, 400), 'ai-element-juancao-02')},
    # AI 元素做角饰，即梦团构图做中心
    {'title': '宝相庄严', 'series': '唐草', 'template': None,
     'placements': corners4(P('ai-element-baoxianghua-02', 0.5, 0.5, 440),
                            'ai-element-corner-baoxianghua-00')},
    {'title': '龙腾八方', 'series': '团龙', 'template': None,
     'placements': corners4(P('chiwen-1', 0.5, 0.5, 400),
                            'ai-element-corner-dragon-00')},
    {'title': '缠枝莲意', 'series': '唐草', 'template': '青花缠枝',
     'placements': corners4(P('lianban-1', 0.5, 0.5, 400),
                            'ai-element-juancao-00')},
]


def resolve(pid):
    img = LIB_IMG.get(pid) or AI_IMG.get(pid)
    if not img:
        raise SystemExit(f'未知纹样 id: {pid}')
    p = PUB / img.lstrip('/')
    if not p.exists():
        raise SystemExit(f'缺图片文件: {p}')
    return p


def req(client, method, path, token=None, body=None, raw=None, ctype='application/json', prefer=False):
    h = {'apikey': SR or ANON}
    if token:
        h['Authorization'] = 'Bearer ' + token
    if prefer:
        h['Prefer'] = 'return=representation'
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode('utf-8')
        h['Content-Type'] = ctype
    if raw is not None:
        data = raw
        h['Content-Type'] = ctype
    r = client.request(method, BASE + path, headers=h, content=data)
    return r.status_code, r.content


def login(client, email, password):
    st, body = req(client, 'POST', '/auth/v1/token?grant_type=password',
                   body={'email': email, 'password': password})
    j = json.loads(body)
    if st != 200 or not j.get('access_token'):
        raise SystemExit(f'login 失败 status={st} {body[:200]}')
    return j['access_token'], j['user']['id']


_bg = None


def paper_bg():
    """宣纸底：辐射渐变 + 颗粒（对应 PuzzlePage 的离屏背景）。"""
    global _bg
    if _bg is not None:
        return _bg.copy()
    im = Image.new('RGB', (C, C))
    cx = cy = C / 2
    inner, outer = (216, 205, 186), (232, 223, 200)
    for r in range(int(C * 0.72), -1, -1):
        k = r / (C * 0.6)
        col = tuple(int(i + (o - i) * min(1, k)) for i, o in zip(inner, outer))
        ImageDraw.Draw(im).ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
    px = im.load()
    import random
    rnd = random.Random(42)
    for _ in range(240):
        x, y = rnd.randrange(C), rnd.randrange(C)
        px[x, y] = tuple(min(255, v + 8) for v in px[x, y])
    _bg = im
    return im.copy()


WORK = 512  # 抠线工作尺寸（应用是 256，放大一档让封面更清晰，逻辑一致）
LIB_CORNER_IDS = {p for p in LIB_IMG if p.startswith('corner-')}


def _disc_radius(arr):
    """从中心向 720 个方向探测徽章半径：每条射线最远的非背景像素。

    背景 = 亮且低饱和（圆外白底）；返回保守（5 百分位）半径。
    """
    import numpy as np
    c = WORK / 2
    n = 720
    thetas = np.linspace(0, 2 * np.pi, n, endpoint=False)
    rs = np.linspace(0, WORK / 2, WORK // 2)
    xs = np.clip((c + np.cos(thetas)[:, None] * rs).astype(np.int16), 0, WORK - 1)
    ys = np.clip((c + np.sin(thetas)[:, None] * rs).astype(np.int16), 0, WORK - 1)
    px = arr[ys, xs, :3].astype(np.int16)
    v = (px.max(-1) + px.min(-1)) // 2
    sat = px.max(-1) - px.min(-1)
    is_bg = (v > 200) & (sat < 75)
    # 每条射线最远的非背景像素半径；徽章金环在绝大多数射线上都存在，
    # 用中位数定半径（5 百分位会被个别空射线拉小导致裁切纹样）。
    far = np.where(is_bg, -1, rs[None, :].repeat(n, 0)).max(axis=1)
    r = np.percentile(far[far > 0], 50) if (far > 0).any() else WORK * 0.45
    return float(np.clip(r + 3, WORK * 0.3, WORK * 0.5))


LINE_IDS = {'dragon-1', 'dragon-2', 'dragon-3', 'dragon-4',
            'scroll-1', 'scroll-2', 'basic-3',
            'sj-8', 'sj-10', 'sj-12', 'sj-18', 'sj-21'}

# 即梦彩纹样（满底填色，非线稿）：二值抠会只剩碎片，走软 alpha 渐变抠底
SOFT_IDS = {'chanlian-1', 'tuanhe-1', 'chiwen-1', 'lianban-1'}
# 软抠阈值（起点,满值）：默认 (18,50)；chanlian 纸面青斑多，收紧起点
SOFT_RAMP = {'chanlian-1': (30, 58)}

# 实测确认带即梦水印（左上「AI生成」徽章 + 右下「即梦AI」）的素材：
# 512 画布坐标。中值滤波会把徽章并进主体连通域且会长回残边，
# 所以除了滤波前预删（防合并），还要在合成完成后最终裁一遍。
WM_DEL = {
    'dragon-4': [(8, 8, 200, 96), (370, 440, 510, 510)],
    'basic-3': [(8, 8, 200, 96), (370, 440, 510, 510)],
    'scroll-2': [(8, 8, 200, 96), (370, 440, 510, 510)],
}

# 青花系列：线稿按亮度重映射成钴蓝渐变（暗→浓钴蓝，亮→浅霁蓝）
COBALT = ((26, 54, 108), (78, 122, 188))
TINT = {
    'chanlian-1': COBALT,
    'tuanhe-1': COBALT,
    'ai-element-juancao-02': COBALT,
}


def _recenter(out, pad=6):
    """按 alpha 包围盒裁切后重新居中到 WORK 画布。"""
    import numpy as np
    ys_, xs_ = np.where(out[..., 3] > 40)
    if not len(xs_):
        return Image.fromarray(out, 'RGBA')
    y0, y1, x0, x1 = ys_.min(), ys_.max(), xs_.min(), xs_.max()
    crop = out[y0:y1 + 1, x0:x1 + 1]
    c2 = Image.new('RGBA', (WORK, WORK), (0, 0, 0, 0))
    ci = Image.fromarray(crop, 'RGBA').resize(
        (max(1, round(crop.shape[1] / max(crop.shape) * (WORK - 2 * pad))),
         max(1, round(crop.shape[0] / max(crop.shape) * (WORK - 2 * pad)))), Image.LANCZOS)
    c2.paste(ci, ((WORK - ci.width) // 2, (WORK - ci.height) // 2))
    return c2


def make_stamp(pid, path):
    """三类源图三种抠法（对齐 App blockOutline 的抠线思路）：

    1. 线条素材（黑底龙纹/红底山海经/灰白底 AI 素材/米纸底卷草）：
       底色 = 原图边框中位数，色距>32 保线条；中值滤波 + 连通域≥400px
       滤掉水印碎笔（水印是细笔画独立小连通域，纹样是大块）；
       0.8px 羽化 + 包围盒重居中。
    2. qh-* 青花瓷照片：整圆裁成瓷盘片。
    3. 其余馆藏徽章（宣纸底正圆构图）：圆片羽化蒙版成「团扇圆片」；
       探满 0.485W = 满幅方形构图，方形+边缘羽化。
    """
    import numpy as np
    from scipy import ndimage

    im = Image.open(path).convert('RGBA')
    if pid in LIB_CORNER_IDS:  # corner-1/2 是双角+环源图，切左上象限
        im = im.crop((0, 0, im.width // 2, im.height // 2))
    scale = WORK / max(im.size)
    w, h = round(im.width * scale), round(im.height * scale)
    im = im.resize((w, h), Image.LANCZOS)
    canvas = Image.new('RGBA', (WORK, WORK), (0, 0, 0, 0))
    canvas.paste(im, ((WORK - w) // 2, (WORK - h) // 2))

    arr = np.asarray(canvas)
    yy, xx = np.mgrid[0:WORK, 0:WORK]
    dist = np.sqrt((xx - WORK / 2 + 0.5) ** 2 + (yy - WORK / 2 + 0.5) ** 2)

    if pid in SOFT_IDS:  # 软抠底：保留填色与浅色笔触，无滤波无组件过滤
        src = arr[..., :3].astype(np.int16)
        border = np.concatenate([src[0], src[-1], src[:, 0], src[:, -1]])
        bg = np.median(border, axis=0)
        d = np.sqrt(((src - bg) ** 2).sum(-1))
        lo, hi = SOFT_RAMP.get(pid, (18, 50))
        a = (np.clip((d - lo) / (hi - lo), 0, 1) * 255).astype(np.uint8)
        a[arr[..., 3] < 200] = 0
        rgb_out = arr[..., :3].copy()
        if pid in TINT:
            lum = rgb_out.astype(np.float32).mean(-1, keepdims=True)
            t = np.clip((lum - 70) / 115, 0, 1)
            lo = np.array(TINT[pid][0], np.float32)
            hi = np.array(TINT[pid][1], np.float32)
            rgb_out[...] = (lo + (hi - lo) * t).astype(np.uint8)
        a = np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.8)))
        # 去纸面散落墨点：保留 ≥700px 连通域（外圈细环 ~800px 不能误删）
        lab2, n2 = ndimage.label(a > 100)
        if n2 > 1:
            keep2 = np.isin(lab2, [i + 1 for i in range(n2)
                                   if (lab2 == i + 1).sum() >= 700])
            a = np.where(keep2, a, 0).astype(np.uint8)
        return Image.fromarray(np.dstack([rgb_out, a]), 'RGBA')
    if pid in LINE_IDS or pid in AI_IMG:
        # 底色取原图边框中位数（贴图前采样，避免透明 letterbox 污染）
        src = np.asarray(im.convert('RGB')).astype(np.int16)
        border = np.concatenate([src[0], src[-1], src[:, 0], src[:, -1]])
        bg = np.median(border, axis=0)
        rgb = arr[..., :3].astype(np.int16)
        d = np.sqrt(((rgb - bg) ** 2).sum(-1))
        alpha = (d > 32) & (arr[..., 3] > 200)
        for zx0, zy0, zx1, zy1 in WM_DEL.get(pid, []):
            alpha[zy0:zy1, zx0:zx1] = False
        m = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
        lab, n = ndimage.label(np.asarray(m) > 127)
        if n:
            sizes = np.bincount(lab.ravel())[1:]
            mean_d = ndimage.mean(d, lab, range(1, n + 1))
            boxes = ndimage.find_objects(lab)
            # 即梦水印成对出现在左上「AI生成」徽章 + 右下「即梦AI」：
            # 包含在角区内的小连通域整体删除；纸底噪斑按平均色距过滤
            WM_ZONES = [(6, 6, 104, 58), (380, 458, 510, 510)]
            keep = []
            for i in range(n):
                sl = boxes[i]
                x0, x1 = sl[1].start, sl[1].stop
                y0, y1 = sl[0].start, sl[0].stop
                in_zone = any(zx0 <= x0 and x1 <= zx1 and zy0 <= y0 and y1 <= zy1
                              for zx0, zy0, zx1, zy1 in WM_ZONES)
                if in_zone and sizes[i] < 2500:
                    continue
                if sizes[i] >= 3000:
                    keep.append(i + 1)
                elif sizes[i] >= 400 and mean_d[i] >= 55:
                    keep.append(i + 1)
            alpha = np.isin(lab, keep) if keep else np.zeros_like(alpha)
        # 1px 深色衬边：白线/金线在米纸底上更扎实
        core = alpha
        halo = ndimage.binary_dilation(core, iterations=1) & ~core
        a = np.where(core, 255, np.where(halo, 95, 0)).astype(np.uint8)
        a = np.asarray(Image.fromarray(a).filter(ImageFilter.GaussianBlur(0.6)))
        rgb_out = arr[..., :3].copy()
        rgb_out[halo & ~core] = (74, 62, 46)
        if pid in TINT:
            lum = rgb_out.astype(np.float32).mean(-1, keepdims=True)
            t = np.clip((lum - 70) / 115, 0, 1)
            lo = np.array(TINT[pid][0], np.float32)
            hi = np.array(TINT[pid][1], np.float32)
            rgb_out[...] = (lo + (hi - lo) * t).astype(np.uint8)
        out = np.dstack([rgb_out, a])
        for zx0, zy0, zx1, zy1 in WM_DEL.get(pid, []):
            out[zy0:zy1, zx0:zx1, 3] = 0
        return _recenter(out)
    elif pid.startswith('qh-'):  # 青花瓷照片：整圆裁成瓷盘片（提亮防"黑块"观感）
        r = WORK * 0.49
        alpha = (np.clip((r + 1.5 - dist) / 3, 0, 1) * 255).astype(np.uint8)
        plate = ImageEnhance.Brightness(Image.fromarray(
            np.dstack([arr[..., :3], alpha]), 'RGBA')).enhance(1.42)
        plate = ImageEnhance.Color(plate).enhance(1.1)
        return plate
    else:  # 馆藏徽章：探半径；探满 = 满幅方形构图，方形+边缘羽化
        r = _disc_radius(np.asarray(canvas).astype(np.int16))
        if r >= WORK * 0.485:
            edge = np.minimum(np.minimum(xx, yy), np.minimum(WORK - 1 - xx, WORK - 1 - yy))
            alpha = (np.clip(edge / 14, 0, 1) * 255).astype(np.uint8)
        else:
            alpha = (np.clip((r + 1.5 - dist) / 3, 0, 1) * 255).astype(np.uint8)

    out = np.dstack([arr[..., :3], alpha])
    return Image.fromarray(out, 'RGBA')


_stamp_cache = {}


def stamp(pid):
    if pid not in _stamp_cache:
        _stamp_cache[pid] = make_stamp(pid, resolve(pid))
    return _stamp_cache[pid]


def render_cover(placements):
    im = paper_bg().convert('RGBA')
    for pl in sorted(placements, key=lambda p: p['size']):  # 小的先画、主纹压顶
        el = stamp(pl['id']).resize(
            (abs(int(pl['scaleX'] * pl['size'])) or 1, int(pl['size'])), Image.LANCZOS)
        if pl['scaleX'] < 0:
            el = el.transpose(Image.FLIP_LEFT_RIGHT)
        if pl['rotation']:
            el = el.rotate(-pl['rotation'], resample=Image.BICUBIC)
        im.alpha_composite(el, (int(pl['x'] - el.width / 2), int(pl['y'] - el.height / 2)))
    buf = io.BytesIO()
    im.convert('RGB').save(buf, 'WEBP', quality=88)
    return buf.getvalue()


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--local', action='store_true',
                    help='只离线渲封面到 scripts/_preview/combos_v2/，不发布')
    args = ap.parse_args()

    if args.local:
        outdir = ROOT / 'scripts' / '_preview' / 'combos_v2'
        outdir.mkdir(parents=True, exist_ok=True)
        for i, combo in enumerate(COMBOS, 1):
            (outdir / f'c{i:02d}.webp').write_bytes(render_cover(combo['placements']))
            print(f'rendered c{i:02d} {combo["title"]}')
        print('->', outdir)
        return

    rec = json.loads(REC.read_text(encoding='utf-8'))
    out = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    works = out.setdefault('works', [])
    done = {w['title'] for w in works}

    client = httpx.Client(timeout=90, trust_env=False)
    uid = rec['uid']
    if SR:
        tok = SR
        print('service_role 种子模式：绕过限频，直接 approved')
    else:
        tok, uid = login(client, rec['email'], rec['password'])
    out.update({'email': rec['email'], 'uid': uid})
    print(f'login ok uid={uid[:8]}，待发布组合 {sum(1 for c in COMBOS if c["title"] not in done)} 件')

    for combo in COMBOS:
        if combo['title'] in done:
            continue
        print(f'发布 {combo["title"]} ({len(combo["placements"])} 元素, series={combo["series"]})')
        cover = render_cover(combo['placements'])
        st, body = req(client, 'POST', '/rest/v1/works?select=id', token=tok, body={
            'author_id': uid, 'title': combo['title'], 'template': combo['template'],
            'placements': combo['placements'], 'series': combo['series'], 'status': 'approved' if SR else 'pending',
        }, prefer=True)
        if st not in (200, 201):
            print(f'  INSERT 失败 {st} {body[:180]}')
            continue
        wid = json.loads(body)[0]['id']
        st2, _ = req(client, 'POST', f'/storage/v1/object/works/{uid}/{wid}.webp', token=tok,
                     raw=cover, ctype='image/webp')
        pub_url = f'{BASE}/storage/v1/object/public/works/{uid}/{wid}.webp'
        if st2 in (200, 201):
            req(client, 'PATCH', f'/rest/v1/works?id=eq.{wid}', token=tok, body={'cover_path': pub_url})
        works.append({'id': wid, 'title': combo['title'], 'series': combo['series'],
                      'placements': combo['placements'], 'cover': pub_url if st2 in (200, 201) else None})
        OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'  ok wid={wid[:8]} cover={st2}')
        time.sleep(1.0)

    print(f'\n合计组合作品 {len(works)} 件 (pending)。账号: {rec["email"]}')


if __name__ == '__main__':
    main()
