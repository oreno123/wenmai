"""注册「纹样合集」账号并把高分纹样发布到广场（pending，待管理员审核）。

输入  scripts/pattern_scores.jsonl 中 score>=9 的条目 + public/patterns/*.png
输出  scripts/pattern_published.json（账号信息 + 每件 work id）

用法  python publish_patterns.py            # 全流程
      python publish_patterns.py --account-only   # 只注册账号
需要  环境变量 ZHIPU_API_KEY 无关；直接走 wenmai-api.ruoziqing.cn
"""
import argparse
import io
import json
import os
import pathlib
import random
import string
import sys
import time
import urllib.request
import urllib.error

from PIL import Image

import httpx

sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent
PATTERNS = ROOT / 'public' / 'patterns'
SCORES = ROOT / 'scripts' / 'pattern_scores.jsonl'
PUBLISHED = ROOT / 'scripts' / 'pattern_published.json'

BASE = 'https://wenmai-api.ruoziqing.cn'
ANON = (ROOT / '.env.local').read_text(encoding='utf-8').split('VITE_SUPABASE_ANON_KEY=')[1].splitlines()[0].strip()
# 种子模式：设 SERVICE_ROLE_KEY 环境变量则绕过 RLS（含每日 3 件限频），直接 approved
SR = os.environ.get('SERVICE_ROLE_KEY')

EMAIL = 'collection@wenmai.art'
USERNAME = '纹样合集'

# 文件名 -> (patternId, 四字题, series)
# series: 青铜器 | 唐草 | null
MANIFEST = {
    'lianban_tang.png': ('lianban-1', '莲瓣承唐', '唐草'),
    'jiaoye.png': ('jiaoye-1', '蕉叶引商', '青铜器'),
    'rendong.png': ('rendong-1', '忍冬不凋', '唐草'),
    'lianzhu.png': ('lianzhu-1', '联珠环宝', '青铜器'),
    'chanlian.png': ('chanlian-1', '缠枝莲语', '唐草'),
    'zhezhi_mudan.png': ('zhezhi-1', '折枝富贵', '唐草'),
    'haishui_jiangya.png': ('haishui-1', '海崖立波', '青铜器'),
    'yunlei_ring.png': ('yunlei-1', '云雷回响', '青铜器'),
    'ruding.png': ('ruding-1', '乳钉列阵', '青铜器'),
    'qiequ.png': ('qiequ-1', '窃曲流转', '青铜器'),
    'chuiling.png': ('chuiling-1', '垂鳞叠甲', '青铜器'),
    'zhonghuan.png': ('zhonghuan-1', '重环相扣', '青铜器'),
    'wawen.png': ('wawen-1', '瓦纹横陈', '青铜器'),
    'panhui.png': ('panhui-1', '蟠虺纠缠', '青铜器'),
    'chiwen.png': ('chi-1', '双螭对峙', '青铜器'),
    'feng_shang.png': ('feng-1', '玄鸟衔商', '青铜器'),
    'luanniao.png': ('luan-1', '鸾鸟衔绶', None),
    'tuanhe.png': ('tuanhe-1', '团鹤延年', None),
    'xixiangfeng.png': ('xixiang-1', '喜相逢双蝶', None),
    'yuzao.png': ('yuzao-1', '鱼藻相忘', '青花瓷'),
    'bianfu.png': ('bianfu-1', '蝠到福来', None),
    'chanbao.png': ('chanbao-1', '宝相缠枝', '唐草'),
    'piqiuhua.png': ('piqiu-1', '皮球散花', '唐草'),
    'babao.png': ('babao-1', '八宝聚祥', None),
    'anbaxian.png': ('anbaxian-1', '暗八仙踪', None),
    'yingluo.png': ('yingluo-1', '璎珞垂珠', None),
    'shoudai.png': ('shoudai-1', '绶带萦回', None),
    'bogu.png': ('bogu-1', '博古清供', None),
    'guibei.png': ('guibei-1', '龟背锦纹', '青铜器'),
    'shidi.png': ('shidi-1', '柿蒂承露', '青铜器'),
    'sanduo.png': ('sanduo-1', '三多并茂', '唐草'),
    'suihansanyou.png': ('suihan-1', '岁寒三友', '唐草'),
    'wufu.png': ('wufu-1', '五福捧寿', None),
    'longfeng.png': ('longfeng-1', '龙凤呈祥', '青铜器'),
    'erlong.png': ('erlong-1', '双龙戏珠', '青铜器'),
    'qilin.png': ('qilin-1', '麒麟踏云', None),
    'shizi.png': ('shizi-1', '狮滚绣球', None),
    'yunhe.png': ('yunhe-1', '云鹤翔集', None),
    'feitian.png': ('feitian-1', '飞天散花', None),
}


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


def signup(client):
    st, body = req(client, 'POST', '/auth/v1/signup',
                   body={'email': EMAIL, 'password': _PW, 'data': {'username': USERNAME}})
    j = json.loads(body)
    if st not in (200, 201):
        if 'user_already_exists' in body.decode('utf-8', 'ignore'):
            return login(client)
        raise SystemExit(f'signup 失败 status={st} {body[:200]}')
    tok = j.get('access_token')
    uid = j['user']['id']
    # profiles 行（RLS: 本人可插）
    st2, body2 = req(client, 'POST', '/rest/v1/profiles', token=tok,
                     body={'user_id': uid, 'username': USERNAME, 'points': 1000, 'free_pulls': 10, 'library': []})
    print(f'signup ok uid={uid} profile status={st2} {body2[:120] if st2 >= 300 else ""}')
    return tok, uid


def login(client):
    st, body = req(client, 'POST', '/auth/v1/token?grant_type=password',
                   body={'email': EMAIL, 'password': _PW})
    j = json.loads(body)
    if st != 200 or not j.get('access_token'):
        raise SystemExit(f'login 失败 status={st} {body[:200]}')
    return j['access_token'], j['user']['id']


def fresh_token(client, tok, uid):
    if tok:
        st, _ = req(client, 'GET', '/auth/v1/user', token=tok)
        if st == 200:
            return tok, uid
        print('token 过期，重新登录')
    return login(client)


def cover_webp(png_path: pathlib.Path) -> bytes:
    im = Image.open(png_path).convert('RGB')
    im.thumbnail((1536, 1536))
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=90)
    return buf.getvalue()


# ---- 封面 v2：宣纸底 + 软抠图形（借 publish_existing_combos 的章管线） ----
_CM = None


def _combos_mod():
    global _CM
    if _CM is None:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            'pec', pathlib.Path(__file__).resolve().parent / 'publish_existing_combos.py')
        mod = importlib.util.module_from_spec(spec)
        sys.argv = [spec.name]
        spec.loader.exec_module(mod)
        # 即梦 20 件全是满底彩纹样：注册进软抠分支
        stems = {v[0]: k.replace('.png', '') for k, v in MANIFEST.items()}
        mod.LIB_IMG.update({pid: f'/patterns/{stem}.png' for pid, stem in stems.items()})
        mod.SOFT_IDS.update(stems)
        _CM = mod
    return _CM


# 满底纹样（整幅纹理/带状）：软抠必碎，改「织物色卡」式整幅呈现
FULLBLEED = {'rendong-1', 'haishui-1', 'ruding-1', 'zhonghuan-1',
             'yunlei-1', 'lianzhu-1', 'wawen-1'}
# 源图缺陷（宝相：右上斜污渍+右边框残），裁保留区（比例 bbox）
CROP_STAMP = {'chanbao-1': (0.08, 0.10, 0.62, 0.90)}
# 色卡取景偏移：重环源图左上有斜向采光亮斑，取右下暗区方卡
SWATCH_CROP = {'zhonghuan-1': (0.46, 0.48, 0.96, 0.98)}


def _rounded_mask(size, radius=26, feather=3):
    from PIL import ImageDraw, ImageFilter
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([6, 6, size[0] - 6, size[1] - 6], radius=radius, fill=255)
    return mask.filter(ImageFilter.GaussianBlur(feather))


def cover_webp_v2(pid: str) -> bytes:
    m = _combos_mod()
    im = m.paper_bg().convert('RGBA')
    if pid in FULLBLEED:
        fname = {v[0]: k for k, v in MANIFEST.items()}[pid]
        src = Image.open(PATTERNS / fname).convert('RGB')
        if pid in SWATCH_CROP:
            l, t, r, b = SWATCH_CROP[pid]
            src = src.crop((round(l * src.width), round(t * src.height),
                            round(r * src.width), round(b * src.height)))
        s = min(src.size)
        src = src.crop(((src.width - s) // 2, (src.height - s) // 2,
                        (src.width + s) // 2, (src.height + s) // 2))
        el = src.resize((740, 740), Image.LANCZOS).convert('RGBA')
        el.putalpha(_rounded_mask((740, 740)))
    else:
        st = m.stamp(pid)
        if pid in CROP_STAMP:
            l, t, r, b = CROP_STAMP[pid]
            w0, h0 = st.size
            st = st.crop((round(l * w0), round(t * h0), round(r * w0), round(b * h0)))
        w, h = st.size
        scale = min(740 / w, 740 / h)
        el = st.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    im.alpha_composite(el, ((im.width - el.width) // 2, (im.height - el.height) // 2))
    buf = io.BytesIO()
    im.convert('RGB').save(buf, 'WEBP', quality=88)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--account-only', action='store_true')
    ap.add_argument('--covers-only', action='store_true',
                    help='重渲已有作品封面（宣纸底+软抠）并覆写 storage，不动数据库')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    global _PW
    rec = {}
    if PUBLISHED.exists():
        rec = json.loads(PUBLISHED.read_text(encoding='utf-8'))
    _PW = rec.get('password') or ''.join(random.choices(string.ascii_letters + string.digits, k=16))
    rec.update({'email': EMAIL, 'username': USERNAME, 'password': _PW})

    client = httpx.Client(timeout=90, trust_env=False)
    uid = rec.get('uid')
    if SR:
        tok = SR
        print('service_role 种子模式：绕过限频，直接 approved')
    else:
        tok = rec.get('token')
        if not (tok and uid):
            tok, uid = signup(client)
            rec.update({'token': tok, 'uid': uid})
        else:
            tok, uid = fresh_token(client, tok, uid)
            rec.update({'token': tok, 'uid': uid})

    if args.account_only:
        PUBLISHED.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding='utf-8')
        print('账号信息已写入', PUBLISHED)
        return

    if args.covers_only:
        works = rec.get('works', [])
        print(f'重渲 {len(works)} 件封面')
        for w in works:
            r = client.post(
                f'{BASE}/storage/v1/object/works/{uid}/{w["id"]}.webp',
                content=cover_webp_v2(w['pattern']),
                headers={'apikey': SR or ANON, 'Authorization': 'Bearer ' + tok,
                         'Content-Type': 'image/webp', 'x-upsert': 'true'})
            ok = r.status_code in (200, 201)
            w['cover_v2'] = ok
            print(f'  {w["title"]} {"ok" if ok else f"FAIL {r.status_code} {r.text[:80]}"}')
            time.sleep(0.5)
        PUBLISHED.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding='utf-8')
        return

    # 打分筛选
    keep = {}
    if SCORES.exists():
        for line in open(SCORES, encoding='utf-8'):
            try:
                row = json.loads(line)
                if row.get('score', -1) >= 9 and row.get('keep'):
                    keep[row['key'] + '.png'] = row['score']
            except json.JSONDecodeError:
                pass
    print(f'≥9 分候选: {len(keep)} 张')

    works = rec.setdefault('works', [])
    done_titles = {w['title'] for w in works}
    # 与 export_jimeng_assets.py 同口径：按分数降序取前 20
    ranked = sorted(MANIFEST.items(), key=lambda kv: -keep.get(kv[0], -1))
    for fname, (pid, title, series) in ranked:
        if fname not in keep:
            continue
        if len([w for w in works if w.get('score', 0) >= 9]) >= 20:
            break
        if title in done_titles:
            continue
        png = PATTERNS / fname
        if not png.exists():
            print(f'!! 缺文件 {fname}')
            continue
        print(f'发布 {title} ({fname}, score={keep[fname]})')
        if args.dry_run:
            continue
        placements = [{'id': pid, 'x': 512, 'y': 512, 'size': 880, 'rotation': 0, 'scaleX': 1, 'scaleY': 1}]
        st, body = req(client, 'POST', '/rest/v1/works?select=id', token=tok, body={
            'author_id': uid, 'title': title, 'template': 'free',
            'placements': placements, 'series': series, 'status': 'approved' if SR else 'pending',
        }, prefer=True)
        if st not in (200, 201):
            print(f'  INSERT 失败 {st} {body[:180]}')
            continue
        wid = json.loads(body)[0]['id']
        st2, body2 = req(client, 'POST', f'/storage/v1/object/works/{uid}/{wid}.webp', token=tok,
                         raw=cover_webp(png), ctype='image/webp')
        pub_url = f'{BASE}/storage/v1/object/public/works/{uid}/{wid}.webp'
        if st2 in (200, 201):
            req(client, 'PATCH', f'/rest/v1/works?id=eq.{wid}', token=tok, body={'cover_path': pub_url})
        works.append({'id': wid, 'title': title, 'pattern': pid, 'file': fname, 'series': series,
                      'score': keep[fname], 'cover': pub_url if st2 in (200, 201) else None})
        PUBLISHED.write_text(json.dumps(rec, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'  ok wid={wid[:8]} cover={st2}')
        time.sleep(1.0)

    print(f'\n合计发布 {len(works)} 件 (pending)。账号: {EMAIL} / {_PW}')
    print('待管理员(oreno)在 /admin 审核通过')


if __name__ == '__main__':
    main()
