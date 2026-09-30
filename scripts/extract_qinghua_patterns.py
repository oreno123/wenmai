"""Derive selectable Qinghua pattern regions from an embedded vessel texture.

The source of truth is the model's base-color texture: cobalt ink is separated from
porcelain using a blue-excess score, joined into nearby visual regions, then emitted
as UV-space elements and transparent cutouts. No hand-drawn UV rectangles are used.
"""
import argparse
import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def cobalt_mask(image: Image.Image) -> Image.Image:
    """Keep cobalt paint while rejecting neutral shadow and beige repair marks."""
    rgb = image.convert('RGB')
    pixels = list(rgb.getdata())
    values = []
    for red, green, blue in pixels:
        # Cobalt remains blue-biased even where capture lighting desaturates it.
        blue_excess = blue - (red * 0.62 + green * 0.38)
        dark_blue = blue > red * 1.10 and blue > green * 1.01 and blue < 190
        values.append(255 if blue_excess > 18 and dark_blue else 0)
    mask = Image.new('L', rgb.size)
    mask.putdata(values)
    # Connect brush strokes without swallowing the porcelain ground.
    return mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(11))


def components(mask: Image.Image, min_pixels: int):
    width, height = mask.size
    data = mask.load()
    seen = bytearray(width * height)
    result = []
    for y in range(height):
        for x in range(width):
            start = y * width + x
            if seen[start] or data[x, y] < 128:
                continue
            queue = deque([(x, y)])
            seen[start] = 1
            count = 0
            x0 = x1 = x
            y0 = y1 = y
            while queue:
                cx, cy = queue.popleft()
                count += 1
                x0, x1 = min(x0, cx), max(x1, cx)
                y0, y1 = min(y0, cy), max(y1, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1), (cx - 1, cy - 1), (cx + 1, cy + 1), (cx - 1, cy + 1), (cx + 1, cy - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        index = ny * width + nx
                        if not seen[index] and data[nx, ny] >= 128:
                            seen[index] = 1
                            queue.append((nx, ny))
            if count >= min_pixels:
                result.append((count, (x0, y0, x1 + 1, y1 + 1)))
    return result


def overlap(a, b):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    return max(0, min(ax1, bx1) - max(ax0, bx0)) * max(0, min(ay1, by1) - max(ay0, by0))


def extract(folder: Path, limit: int):
    texture = Image.open(folder / 'texture.jpg').convert('RGB')
    analysis = texture.resize((512, 512), Image.Resampling.LANCZOS)
    joined = cobalt_mask(analysis)
    raw = cobalt_mask(texture)
    candidates = sorted(components(joined, 140), reverse=True)
    chosen = []
    for count, box in candidates:
        area = (box[2] - box[0]) * (box[3] - box[1])
        if area > 512 * 512 * 0.24 or area < 700:
            continue
        if any(overlap(box, existing[1]) / min(area, existing[0]) > 0.48 for existing in chosen):
            continue
        chosen.append((area, box, count))
        if len(chosen) >= limit:
            break
    if not chosen:
        raise RuntimeError(f'No cobalt regions detected in {folder / "texture.jpg"}')

    sx = texture.width / 512
    sy = texture.height / 512
    elements = []
    selection = Image.new('L', texture.size)
    for index, (_, box, count) in enumerate(chosen):
        x0, y0, x1, y1 = [int(value * scale) for value, scale in zip(box, (sx, sy, sx, sy))]
        pad = 26
        x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
        x1, y1 = min(texture.width, x1 + pad), min(texture.height, y1 + pad)
        crop = texture.crop((x0, y0, x1, y1))
        crop_mask = raw.crop((x0, y0, x1, y1))
        # The click mask keeps only cobalt pixels from this component, so a blank
        # porcelain area inside the component's bounding box cannot be extracted.
        hit_mask = crop_mask.point(lambda value: 255 if value >= 96 else 0)
        selection.paste(Image.new('L', crop_mask.size, index + 1), (x0, y0), hit_mask)
        crop.putalpha(crop_mask)
        crop.thumbnail((860, 860), Image.Resampling.LANCZOS)
        crop.save(folder / f'elem_{index:02}.png', optimize=True)
        elements.append({
            'id': index,
            'label': f'青花纹样片段 {index + 1:02}',
            'level': 'main' if index < min(3, len(chosen)) else 'ground',
            'bbox': [x0, y0, x1, y1],
            'area': round(count / (512 * 512), 5),
            'uv': {
                'u0': round(x0 / texture.width, 5),
                'v0': round(y0 / texture.height, 5),
                'u1': round(x1 / texture.width, 5),
                'v1': round(y1 / texture.height, 5),
            },
            'source': 'baseColorTexture.cobalt-segmentation',
            'confidence': round(min(0.98, 0.55 + count / 8500), 2),
        })
    (folder / 'manifest.json').write_text(json.dumps({'version': 2, 'extraction': 'cobalt-segmentation', 'elements': elements}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    selection.save(folder / 'selection-mask.png', optimize=True)
    print(f'{folder.name}: {len(elements)} texture-derived pattern regions')


parser = argparse.ArgumentParser()
parser.add_argument('folders', nargs='+', type=Path)
parser.add_argument('--limit', type=int, default=6)
args = parser.parse_args()
for target in args.folders:
    extract(target, args.limit)
