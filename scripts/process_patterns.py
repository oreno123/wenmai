"""
纹脉 — 纹样图片批量处理脚本
功能：
1. 将透明底 PNG 合成到宣纸/奶白底色
2. 生成多尺寸版本（512/1024/2048）
3. 输出 WebP 格式（web 优化）
4. 可选：从黑底图提取透明底

用法：
  python process_patterns.py                  # 默认处理所有
  python process_patterns.py --source 黑底    # 从黑底图提取透明
  python process_patterns.py --input xxx.png  # 处理单张
  python process_patterns.py --webp-only      # 只做 WebP 转换
"""

import os
import sys
import argparse
from pathlib import Path
from PIL import Image

# ── 配置 ──────────────────────────────────────────────

SOURCE_DIR = Path(r"D:\desktop\纹样照片")
PROJECT_DIR = Path(r"D:\desktop\纹脉\wenmai")
OUTPUT_DIR = PROJECT_DIR / "public" / "patterns"

# 输出尺寸
SIZES = {
    "thumb": 256,
    "card": 512,
    "detail": 1024,
    "original": 2048,
}

# 底色选项
BG_CREAM = (245, 240, 230)    # 宣纸白
BG_WHITE = (255, 255, 255)     # 纯白
BG_WARM = (250, 245, 235)      # 暖白

# 黑底提取阈值
BLACK_THRESHOLD = 30

# WebP 质量
WEBP_QUALITY = 85

# ── 核心函数 ──────────────────────────────────────────


def remove_black_background(img: Image.Image, threshold: int = BLACK_THRESHOLD) -> Image.Image:
    """将纯黑背景像素设为透明（适用于黑底金线纹样图）"""
    img = img.convert("RGBA")
    data = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = data[x, y]
            if r < threshold and g < threshold and b < threshold:
                data[x, y] = (r, g, b, 0)
    return img


def composite_on_background(transparent_img: Image.Image, bg_color: tuple = BG_CREAM) -> Image.Image:
    """将透明底图片合成到指定底色上"""
    bg = Image.new("RGBA", transparent_img.size, (*bg_color, 255))
    bg.paste(transparent_img, mask=transparent_img.split()[3])
    return bg


def resize_to_circle(img: Image.Image, size: int) -> Image.Image:
    """缩放到指定尺寸，保持正方形"""
    if max(img.size) != size:
        img = img.resize((size, size), Image.LANCZOS)
    return img


def save_webp(img: Image.Image, path: Path, quality: int = WEBP_QUALITY) -> Path:
    """保存为 WebP 格式"""
    webp_path = path.with_suffix(".webp")
    img_rgb = img.convert("RGB")
    img_rgb.save(webp_path, "WEBP", quality=quality, method=6)
    return webp_path


def save_png(img: Image.Image, path: Path) -> Path:
    """保存为 PNG"""
    img.save(path, "PNG", optimize=True)
    return path


def process_single(
    input_path: Path,
    output_name: str,
    sizes: dict = SIZES,
    bg_color: tuple = BG_CREAM,
    from_black: bool = False,
    webp_only: bool = False,
):
    """处理单张图片：提取透明 → 合成底色 → 多尺寸 → WebP"""
    print(f"  处理: {input_path.name}")

    img = Image.open(input_path)

    # 如果是从黑底提取
    if from_black:
        img = remove_black_background(img)
    elif img.mode != "RGBA":
        img = img.convert("RGBA")

    # 输出各尺寸
    results = []
    for label, size in sizes.items():
        resized = resize_to_circle(img.copy(), size)

        # 透明底版本（原始用途）
        if not webp_only:
            transparent_path = OUTPUT_DIR / f"{output_name}_{label}.png"
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            save_png(resized, transparent_path)
            results.append(transparent_path)

        # 宣纸底版本（卡片展示用）
        composited = composite_on_background(resized, bg_color)
        cream_path = OUTPUT_DIR / f"{output_name}_{label}_cream.png"
        if not webp_only:
            save_png(composited, cream_path)
            results.append(cream_path)

        # WebP 版本（仅奶油底，用于 web 加速）
        webp_path = OUTPUT_DIR / f"{output_name}_{label}.webp"
        save_webp(composited, webp_path)
        results.append(webp_path)

    # 保留一张原始尺寸 PNG（与现有代码兼容）
    if not webp_only:
        orig_png = OUTPUT_DIR / f"{output_name}.png"
        save_png(resize_to_circle(img.copy(), 2048), orig_png)
        results.append(orig_png)

    return results


def batch_process(source_dir: Path, from_black: bool = False, webp_only: bool = False):
    """批量处理目录下所有图片"""
    # 文件名到输出名的映射
    NAME_MAP = {
        "2632": "juancao-s",       # 卷草纹变体
        "2864": "tuanlong",        # 团龙纹
        "3301": "lianhua",         # 莲花纹
        "6545": "huiwen",          # 回纹
        "6731": "yunlei",          # 云雷纹
        "8828": "juancao",         # 卷草纹
    }

    files = list(source_dir.glob("*.png"))
    # 过滤掉 transparent_ 开头的文件（如果是非黑底模式）
    if not from_black:
        files = [f for f in files if not f.name.startswith("transparent_")]
    else:
        files = [f for f in files if not f.name.startswith("transparent_")]

    print(f"找到 {len(files)} 张图片")

    all_results = []
    for f in sorted(files):
        # 从文件名提取编号
        parts = f.stem.split("-")
        code = parts[-1] if parts else ""

        # 查找映射
        output_name = None
        for key, val in NAME_MAP.items():
            if key in f.name:
                output_name = val
                break

        if not output_name:
            print(f"  跳过（未识别）: {f.name}")
            continue

        results = process_single(f, output_name, from_black=from_black, webp_only=webp_only)
        all_results.extend(results)

    return all_results


def process_transparent_versions(source_dir: Path, webp_only: bool = False):
    """处理已有的 transparent_ 版本"""
    NAME_MAP = {
        "2632": "juancao-s",
        "2864": "tuanlong",
        "3301": "lianhua",
        "6545": "huiwen",
        "6731": "yunlei",
        "8828": "juancao",
    }

    files = list(source_dir.glob("transparent_*.png"))
    print(f"找到 {len(files)} 张透明底图片")

    all_results = []
    for f in sorted(files):
        output_name = None
        for key, val in NAME_MAP.items():
            if key in f.name:
                output_name = val
                break

        if not output_name:
            continue

        results = process_single(f, output_name, from_black=False, webp_only=webp_only)
        all_results.extend(results)

    return all_results


# ── 入口 ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="纹脉纹样图片批量处理")
    parser.add_argument("--source", choices=["黑底", "透明", "auto"], default="auto",
                        help="源图类型：黑底=从黑底提取透明，透明=用已有透明底")
    parser.add_argument("--input", type=str, help="处理单张图片")
    parser.add_argument("--webp-only", action="store_true", help="只生成 WebP")
    parser.add_argument("--bg", choices=["cream", "white", "warm"], default="cream",
                        help="底色选择")
    parser.add_argument("--dry-run", action="store_true", help="只显示将要处理的文件")

    args = parser.parse_args()

    bg_map = {"cream": BG_CREAM, "white": BG_WHITE, "warm": BG_WARM}
    bg_color = bg_map[args.bg]

    print("=" * 50)
    print("纹脉 — 纹样图片处理")
    print(f"源目录: {SOURCE_DIR}")
    print(f"输出目录: {OUTPUT_DIR}")
    print(f"底色: {args.bg}")
    print("=" * 50)

    if args.dry_run:
        files = list(SOURCE_DIR.glob("*.png"))
        for f in sorted(files):
            print(f"  {f.name}")
        return

    if args.input:
        input_path = Path(args.input)
        if not input_path.exists():
            print(f"文件不存在: {input_path}")
            sys.exit(1)
        output_name = input_path.stem.replace("jimeng-2026-05-23-", "")
        results = process_single(input_path, output_name, bg_color=bg_color)
        print(f"\n生成 {len(results)} 个文件:")
        for r in results:
            print(f"  {r}")
        return

    # 批量处理
    if args.source == "黑底":
        results = batch_process(SOURCE_DIR, from_black=True, webp_only=args.webp_only)
    elif args.source == "透明":
        results = process_transparent_versions(SOURCE_DIR, webp_only=args.webp_only)
    else:
        # auto: 优先用透明底版本
        transparent_files = list(SOURCE_DIR.glob("transparent_*.png"))
        if transparent_files:
            print("检测到透明底文件，优先使用")
            results = process_transparent_versions(SOURCE_DIR, webp_only=args.webp_only)
        else:
            print("未找到透明底文件，从黑底提取")
            results = batch_process(SOURCE_DIR, from_black=True, webp_only=args.webp_only)

    print(f"\n完成！共生成 {len(results)} 个文件")
    print(f"输出目录: {OUTPUT_DIR}")

    # 统计文件大小
    total_size = sum(os.path.getsize(f) for f in results if f.exists())
    print(f"总大小: {total_size / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
