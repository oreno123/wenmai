"""glm-4v-flash 免费视觉核对：19 件青铜器的提取卡质量分档。

输入  public/relic/m/{id}/manifest.json + elem_XX.png
输出  scripts/bronze_card_audit.jsonl（逐条追加，可断点续跑）
判定  verdict=enter（进图鉴）| extract_only（只留提取页）| error
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
OUT = ROOT / 'scripts' / 'bronze_card_audit.jsonl'
CERAMICS = {'qinghua_peony', 'qinghua_second', 'cizhou_blackwhite', 'dingyao_carved'}
KEY = os.environ['ZHIPU_API_KEY']

PROMPT = (
    '这张图是从博物馆青铜器三维扫描模型表面提取的纹样卡片（器物：{vessel}·{dynasty}，标注：{label}）。'
    '判断它是否值得放进公开纹样图鉴。只输出严格JSON，不要其他文字：'
    '{{"verdict":"enter|extract_only","score":0到10整数,"reason":"一句话中文"}}。'
    '判定标准：主体纹样完整可辨、能看出是什么纹样、无大面积空白→6分以上判 enter；'
    '破碎残块、两侧残缺、大面积空白、纯噪声、完全看不出纹样内容的判 extract_only。'
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
    try:
        d = json.loads(text)
        if isinstance(d, dict) and 'verdict' in d:
            return d
    except json.JSONDecodeError:
        pass
    start, end = text.find('{'), text.rfind('}')
    if start >= 0 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return None
    return None


def main() -> None:
    idx = json.load(open(PUBLIC / 'index.json', encoding='utf-8'))
    done = set()
    if OUT.exists():
        for line in open(OUT, encoding='utf-8'):
            try:
                done.add(json.loads(line)['key'])
            except (json.JSONDecodeError, KeyError):
                pass

    client = httpx.Client(timeout=60)
    n_ok = n_skip = n_err = 0
    with open(OUT, 'a', encoding='utf-8') as fout:
        for m in idx['models']:
            if m['id'] in CERAMICS:
                continue
            man = json.load(open(PUBLIC / m['manifest'].lstrip('/relic/'), encoding='utf-8'))
            for e in man['elements']:
                key = f"{m['id']}#{e['id']}"
                if key in done:
                    n_skip += 1
                    continue
                img = PUBLIC / 'm' / m['id'] / f"elem_{e['id']:02d}.png"
                if not img.exists():
                    fout.write(json.dumps({'key': key, 'verdict': 'error', 'reason': 'missing file'}, ensure_ascii=False) + '\n')
                    fout.flush()
                    n_err += 1
                    continue
                row = {'key': key, 'vessel': m['id'], 'vessel_name': m['name'],
                       'dynasty': m['dynasty'], 'element': e['id'], 'label': e.get('label', e['name'])}
                try:
                    r = client.post(
                        'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                        headers={'Authorization': f'Bearer {KEY}'},
                        json={'model': 'glm-4v-flash', 'messages': [{'role': 'user', 'content': [
                            {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{load_b64(img)}'}},
                            {'type': 'text', 'text': PROMPT.format(vessel=m['name'], dynasty=m['dynasty'], label=e.get('label', e['name']))},
                        ]}]},
                    )
                    verdict = parse_json(r.json()['choices'][0]['message']['content'])
                    if verdict is None:
                        raise ValueError('unparseable: ' + r.text[:200])
                    row.update(verdict)
                    n_ok += 1
                except Exception as exc:  # noqa: BLE001
                    row.update({'verdict': 'error', 'reason': str(exc)[:200]})
                    n_err += 1
                fout.write(json.dumps(row, ensure_ascii=False) + '\n')
                fout.flush()
                print(f"{key} {row.get('verdict')} {row.get('score', '')} {row.get('reason', '')[:40]}")
                time.sleep(1.2)
    print(f'DONE ok={n_ok} skip={n_skip} err={n_err} -> {OUT}')


if __name__ == '__main__':
    main()
