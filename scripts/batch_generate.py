"""
纹脉 — 硅基流动批量纹样生成器
用法: python batch_generate.py
图片保存到 D:/desktop/纹样照片/generated/
"""

import json
import os
import time
import urllib.request

API_KEY = "sk-oiizamtxlaardldfsxibywruktjoabhqfkvozzunepyaxuig"
API_URL = "https://api.siliconflow.cn/v1/images/generations"
MODEL = "Tongyi-MAI/Z-Image-Turbo"
OUTPUT_DIR = "D:/desktop/纹样照片/generated"

PROMPTS = [
    {"id": "ruyi_cloud", "name": "如意云纹", "prompt": "Traditional Chinese ruyi cloud pattern, stylized cloud scrolls with inward-curving terminals, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "flowing_cloud", "name": "流云纹", "prompt": "Traditional Chinese flowing cloud pattern liuyun, dynamic cloud wisps trailing horizontally, Han dynasty style, circular composition, golden line art on cream paper background, fine gongbi painting style, asymmetric flow, no shadow, 2048x2048"},
    {"id": "auspicious_cloud", "name": "祥云纹", "prompt": "Traditional Chinese auspicious cloud pattern xiangyun, layered cloud scrolls with five-petal terminals, Tang dynasty style, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "floral_cloud", "name": "朵云纹", "prompt": "Traditional Chinese floral cloud pattern duoyun, cloud clusters like flower blossoms, Song dynasty style, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "taotie_shang", "name": "饕餮纹·商", "prompt": "Traditional Chinese taotie beast mask pattern, Shang dynasty bronze style, frontal symmetric animal face with prominent eyes and horns, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "taotie_zhou", "name": "饕餮纹·周", "prompt": "Traditional Chinese taotie beast mask pattern, Western Zhou dynasty style, more refined and elongated animal face with curled patterns, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "kuilong_taotie", "name": "夔龙饕餮纹", "prompt": "Traditional Chinese kuilong-taotie composite pattern, Warring States style, beast face flanked by two kuilong dragons, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "panlong", "name": "蟠龙纹", "prompt": "Traditional Chinese coiled dragon pattern panlong, Han dynasty style, dragon body coiled in circular form, scales and claws visible, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "xinglong", "name": "行龙纹", "prompt": "Traditional Chinese walking dragon pattern xinglong, Tang dynasty style, dragon striding sideways with flowing mane, dynamic pose, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    {"id": "shenglong", "name": "升龙纹", "prompt": "Traditional Chinese ascending dragon pattern shenglong, Ming dynasty style, dragon rising upward with five claws, imperial style, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    {"id": "baoxiang_scroll", "name": "宝相花卷草", "prompt": "Traditional Chinese baoxiang flower scroll pattern, Tang dynasty style, composite floral-scroll motif with lotus and peony elements, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "wanzi", "name": "万字纹", "prompt": "Traditional Chinese wan swastika pattern, repeating geometric swastika fret, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "ruyi_corner", "name": "如意角花", "prompt": "Traditional Chinese ruyi corner ornament, ruyi-scepter head motif for corner decoration, quarter-circle composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    {"id": "phoenix_corner", "name": "凤鸟角花", "prompt": "Traditional Chinese phoenix corner ornament, stylized feng bird motif for corner decoration, quarter-circle composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    # 山海经
    {"id": "jiuwei_hu", "name": "九尾狐", "prompt": "Traditional Chinese nine-tailed fox jiuwei hu from Classic of Mountains and Seas, mythical fox with nine flowing tails fanning outward, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "zhulong", "name": "烛龙", "prompt": "Traditional Chinese Torch Dragon zhulong from Classic of Mountains and Seas, giant serpentine dragon with human face holding torch, eyes glowing, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    {"id": "qiongqi", "name": "穷奇", "prompt": "Traditional Chinese Qiongqi beast from Classic of Mountains and Seas, winged tiger-like creature, fierce mythical beast, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "taowu", "name": "梼杌", "prompt": "Traditional Chinese Taowu beast from Classic of Mountains and Seas, tiger-like creature with human face and boar tusks, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "hundun", "name": "混沌", "prompt": "Traditional Chinese Hundun Chaos beast from Classic of Mountains and Seas, formless bag-like creature with six legs and four wings, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "bifang", "name": "毕方", "prompt": "Traditional Chinese Bifang bird from Classic of Mountains and Seas, one-legged crane-like bird with blue red feathers, fire bird, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    {"id": "dijiang", "name": "帝江", "prompt": "Traditional Chinese Dijiang from Classic of Mountains and Seas, round red creature with six legs and four wings, no face, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "luan_bird", "name": "鸾鸟", "prompt": "Traditional Chinese Luan sacred bird from Classic of Mountains and Seas, five-colored phoenix-like bird with majestic tail feathers, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "jingwei", "name": "精卫", "prompt": "Traditional Chinese Jingwei bird from Classic of Mountains and Seas, mythical bird carrying stone to fill the sea, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
    {"id": "baize", "name": "白泽", "prompt": "Traditional Chinese Baize divine beast from Classic of Mountains and Seas, wise ox-like creature with nine eyes and six horns, circular composition, golden line art on cream paper background, fine gongbi painting style, symmetric, no shadow, 2048x2048"},
    {"id": "kunpeng", "name": "鲲鹏", "prompt": "Traditional Chinese Kunpeng from Classic of Mountains and Seas, giant fish transforming into a massive bird spanning the sky, circular composition, golden line art on cream paper background, fine gongbi painting style, no shadow, 2048x2048"},
]


def generate_one(item):
    payload = json.dumps({
        "model": MODEL,
        "prompt": item["prompt"],
        "image_size": "1024x1024",
    }).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            url = data["images"][0]["url"]
            return url
    except Exception as e:
        print(f"  [FAIL] API error: {e}")
        return None


def download_image(url, filepath):
    try:
        urllib.request.urlretrieve(url, filepath)
        return os.path.getsize(filepath)
    except Exception as e:
        print(f"  [FAIL] download error: {e}")
        return 0


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Skip already downloaded
    todo = []
    for item in PROMPTS:
        out = os.path.join(OUTPUT_DIR, f"{item['id']}.png")
        if os.path.exists(out) and os.path.getsize(out) > 1000:
            print(f"  [SKIP] {item['name']} already exists")
        else:
            todo.append(item)

    if not todo:
        print("全部已完成！")
        return

    print(f"待生成: {len(todo)}/{len(PROMPTS)}\n")

    success = 0
    fail = 0

    for i, item in enumerate(todo):
        print(f"[{i+1}/{len(todo)}] {item['name']}...")
        url = generate_one(item)
        if not url:
            fail += 1
            continue

        out = os.path.join(OUTPUT_DIR, f"{item['id']}.png")
        size = download_image(url, out)
        if size > 0:
            print(f"  [OK] saved ({size//1024}KB)")
            success += 1
        else:
            fail += 1

        # Rate limit
        if i < len(todo) - 1:
            time.sleep(2)

    print(f"\n完成: {success} 成功, {fail} 失败, 共 {len(todo)}")
    print(f"图片保存在: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
