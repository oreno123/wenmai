"""glm-4v-flash 免费视觉打分：即梦生成的纹样候选 10 分制。

输入  public/patterns/*.png（本批新增候选）
输出  scripts/pattern_scores.jsonl（逐条追加，可断点续跑）
取   score >= 9 的入正库
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
SRC = ROOT / 'patterns-src'
OUT = ROOT / 'scripts' / 'pattern_scores.jsonl'
KEY = os.environ['ZHIPU_API_KEY']

PROMPT = (
    '这是一张中国传统文化纹样图（金色线条、宣纸底、工笔风格），将用于文化产品的纹样素材库，'
    '用户会用它自由拼贴创作。请从以下维度严格打分：'
    '①纹样主体完整清晰、居中或构图讲究；②线条流畅均匀、干净不杂乱；'
    '③有真实传统纹样的韵致（不是似是而非的乱线）；④无 AI 伪影（断裂、糊成一片、'
    '主体残缺、 meaningless 涂鸦）；⑤整体美感——愿不愿意把它裱起来看。'
    '只输出严格JSON：{"score":0到10整数,"keep":true或false,"reason":"一句话中文点评"}。'
    '评分校准：9-10=可直接入精品库，赏心悦目；7-8=不错但有明显瑕疵；'
    '5-6=勉强能看；0-4=残缺/杂乱/不像纹样。宁严勿松。'
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
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            return None
    return None


def main() -> None:
    done = set()
    if OUT.exists():
        for line in open(OUT, encoding='utf-8'):
            try:
                done.add(json.loads(line)['key'])
            except (json.JSONDecodeError, KeyError):
                pass

    # 本批候选：generate_patterns.py 2026-10 扩充批的输出 png
    BATCH = {
        'lianban_tang.png', 'jiaoye.png', 'rendong.png', 'lianzhu.png', 'chanlian.png',
        'zhezhi_mudan.png', 'haishui_jiangya.png', 'yunlei_ring.png', 'ruding.png', 'qiequ.png',
        'chuiling.png', 'zhonghuan.png', 'wawen.png', 'panhui.png', 'chiwen.png',
        'feng_shang.png', 'luanniao.png', 'tuanhe.png', 'xixiangfeng.png', 'yuzao.png',
        'bianfu.png', 'chanbao.png', 'piqiuhua.png', 'babao.png', 'anbaxian.png',
        'yingluo.png', 'shoudai.png', 'bogu.png', 'guibei.png', 'shidi.png',
        'sanduo.png', 'suihansanyou.png', 'wufu.png', 'longfeng.png', 'erlong.png',
        'qilin.png', 'shizi.png', 'yunhe.png', 'feitian.png',
    }
    files = sorted(p for p in SRC.glob('*.png') if p.name in BATCH)
    todo = [p for p in files if p.stem not in done]
    print(f'候选 {len(files)} 张，已完成 {len(done)}，待评 {len(todo)}')

    client = httpx.Client(timeout=60)
    n_ok = n_err = 0
    with open(OUT, 'a', encoding='utf-8') as fout:
        for p in todo:
            row = {'key': p.stem, 'file': p.name}
            try:
                r = client.post(
                    'https://open.bigmodel.cn/api/paas/v4/chat/completions',
                    headers={'Authorization': f'Bearer {KEY}'},
                    json={'model': 'glm-4v-flash', 'messages': [{'role': 'user', 'content': [
                        {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{load_b64(p)}'}},
                        {'type': 'text', 'text': PROMPT},
                    ]}]},
                )
                verdict = parse_json(r.json()['choices'][0]['message']['content'])
                if verdict is None:
                    raise ValueError('unparseable: ' + r.text[:200])
                row.update(verdict)
                n_ok += 1
            except Exception as exc:  # noqa: BLE001
                row.update({'score': -1, 'keep': False, 'reason': str(exc)[:200]})
                n_err += 1
            fout.write(json.dumps(row, ensure_ascii=False) + '\n')
            fout.flush()
            print(f"{p.stem:16s} {row.get('score')} {'KEEP' if row.get('keep') else 'drop'} {str(row.get('reason',''))[:46]}")
            time.sleep(1.2)
    print(f'DONE ok={n_ok} err={n_err} -> {OUT}')


if __name__ == '__main__':
    main()
