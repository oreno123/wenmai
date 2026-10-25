"""glm-4v-flash 免费鉴定：上图鉴的 38 张青铜提取卡的纹样学名。

输入  scripts/bronze_verdict_merge.json 的 final_pass + public/relic/m/{slug}/elem_XX.png
输出  scripts/bronze_labels.jsonl（逐条追加，可断点续跑）
产出  {"name":学名, "alt":备选, "desc":画面描述, "confidence":0-1}
说明  desc 只描述画面所见；器物学讲解文案另在 src/data/relicNotes.ts 手写，不虚构。
"""
import base64
import io
import json
import os
import pathlib
import sys
import time

import httpx
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public' / 'relic'
MERGE = ROOT / 'scripts' / 'bronze_verdict_merge.json'
OUT = ROOT / 'scripts' / 'bronze_labels.jsonl'
KEY = os.environ['ZHIPU_API_KEY']

TERMS = ('兽面纹(饕餮纹)、夔龙纹、龙纹、凤鸟纹、鸟纹、云雷纹、勾连雷纹、涡纹、圆涡纹、'
         '四瓣目纹、弦纹、蕉叶纹、乳钉纹、蟠螭纹、窃曲纹、重环纹、环带纹、垂鳞纹、'
         '瓦沟纹、几何形纹、写实动物纹、铭文')

PROMPT = (
    '这张图是从博物馆青铜器三维扫描模型表面几何提取的纹样卡片（器物：{vessel}·{dynasty}，原位置标注：{label}）。'
    '鉴定画面主体的纹样学名。优先从这些标准器物学术语中选：{terms}；'
    '若画面是多种纹样组合，主学名取占画面最大或最主体的那种，其余写进 desc。'
    '若看不出确定纹样，name 写 "待考"，不要硬猜。只输出严格JSON：'
    '{{"name":"主学名","alt":"备选学名或空串","desc":"一句话描述画面构图与元素（眼见为实）","confidence":0.0}}'
)


def load_b64(path: pathlib.Path) -> str:
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])
        im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((1024, 1024))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=88)
    return base64.b64encode(buf.getvalue()).decode()


def parse_json(text: str) -> dict | None:
    text = text.strip()
    if text.startswith('```'):
        text = text.strip('`').lstrip('json').strip()
    start, end = text.find('{'), text.rfind('}')
    if start >= 0 and end > start:
        try:
            d = json.loads(text[start:end + 1])
            if isinstance(d, dict) and 'name' in d:
                return d
        except json.JSONDecodeError:
            pass
    return None


def main() -> None:
    merge = json.load(open(MERGE, encoding='utf-8'))
    keys = merge['final_pass']
    idx = {m['id']: m for m in json.load(open(PUBLIC / 'index.json', encoding='utf-8'))['models']}

    done = set()
    if OUT.exists():
        for line in open(OUT, encoding='utf-8'):
            try:
                row = json.loads(line)
                if row.get('name') != 'error':
                    done.add(row['key'])
            except json.JSONDecodeError:
                pass

    client = httpx.Client(timeout=60)
    n_ok = n_skip = n_err = 0
    with open(OUT, 'a', encoding='utf-8') as fout:
        for key in keys:
            slug, eid = key.split('#')
            if key in done:
                n_skip += 1
                continue
            m = idx[slug]
            man = json.load(open(PUBLIC / 'm' / slug / 'manifest.json', encoding='utf-8'))
            e = next(el for el in man['elements'] if el['id'] == int(eid))
            img = PUBLIC / 'm' / slug / f'elem_{int(eid):02d}.png'
            row = {'key': key, 'vessel': slug, 'vessel_name': m['name'],
                   'dynasty': m['dynasty'], 'element': int(eid), 'label': e.get('label', e.get('name', ''))}
            try:
                r = client.post(
                    'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                    headers={'Authorization': f'Bearer {KEY}'},
                    json={'model': 'glm-4v-flash', 'messages': [{'role': 'user', 'content': [
                        {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{load_b64(img)}'}},
                        {'type': 'text', 'text': PROMPT.format(
                            vessel=m['name'], dynasty=m['dynasty'],
                            label=e.get('label', e.get('name', '')), terms=TERMS)},
                    ]}]},
                )
                verdict = parse_json(r.json()['choices'][0]['message']['content'])
                if verdict is None:
                    raise ValueError('unparseable: ' + r.text[:200])
                row.update(verdict)
                n_ok += 1
            except Exception as exc:  # noqa: BLE001
                row.update({'name': 'error', 'desc': str(exc)[:200]})
                n_err += 1
            fout.write(json.dumps(row, ensure_ascii=False) + '\n')
            fout.flush()
            print(f"{key} {row.get('name')} c={row.get('confidence', '')}", flush=True)
            time.sleep(1.2)
    print(f'DONE ok={n_ok} skip={n_skip} err={n_err} -> {OUT}')


if __name__ == '__main__':
    main()
