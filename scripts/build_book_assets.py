# -*- coding: utf-8 -*-
"""拆书纹样接入 wenmai：全局 manifest 中已过目 5 书的干净卡 → webp + SVG + book/index.json
口径（2026-10-25）：只收用户画廊过目「先这样」的 5 本书；存疑旗卡不上站。
重跑幂等：文件按内容重写，index.json 全量重建。
"""
import json, os, shutil
from PIL import Image

SRC = r'D:\desktop\纹脉\资料\纹样大全\_提取'
OUT = r'D:\desktop\纹脉\wenmai\public\book'
PILOT = ['003', '004', '005', '014', '016']
MAX_EDGE = 1100

TITLES = {
    '003': '中国牡丹纹图谱',
    '004': '中国凤纹图谱',
    '005': '中国龙纹图谱',
    '014': '传统祥禽瑞兽图谱',
    '016': '青铜器造型与纹样',
}


def convert_all():
    m = json.load(open(os.path.join(SRC, 'manifest.json'), encoding='utf-8'))
    cards = [i for i in m if i['book_key'] in PILOT and not i.get('flag')]
    print('cards:', len(cards))
    total = 0
    books = {k: [] for k in PILOT}
    for i, item in enumerate(cards):
        key = item['book_key']
        stem = item['plate']
        dst = os.path.join(OUT, key)
        os.makedirs(dst, exist_ok=True)
        webp_name = stem + '.webp'
        webp_path = os.path.join(dst, webp_name)
        png = os.path.join(SRC, item['purified'])
        img = Image.open(png)
        w, h = img.size
        scale = MAX_EDGE / max(w, h)
        if scale < 1:
            img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        img.save(webp_path, 'WEBP', quality=80, method=6)
        svg_name = None
        if item.get('svg'):
            svg_src = os.path.join(SRC, item['svg'])
            if os.path.exists(svg_src):
                svg_name = stem + '.svg'
                shutil.copyfile(svg_src, os.path.join(dst, svg_name))
        total += os.path.getsize(webp_path)
        books[key].append({
            'id': stem, 'name': item.get('name') or '未命名',
            'era': item.get('era') or '', 'family': item.get('family') or '',
            'carrier': item.get('carrier') or '', 'note': item.get('note') or '',
            'file': f'{key}/{webp_name}', 'svg': f'{key}/{svg_name}' if svg_name else '',
        })
        if (i + 1) % 200 == 0:
            print('  %d/%d, %.1f MB so far' % (i + 1, len(cards), total / 1048576))
    index = [{'key': k, 'title': TITLES[k], 'cards': books[k]} for k in PILOT]
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False)
    print('done: %d cards, webp total %.1f MB' % (len(cards), total / 1048576))
    print('per book:', {k: len(v) for k, v in books.items()})


if __name__ == '__main__':
    convert_all()
