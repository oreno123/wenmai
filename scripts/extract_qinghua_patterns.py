"""Extract reviewed motifs from the GLB surface, never disconnected UV islands.

Recipes are visually reviewed surface windows, not automatic semantic labels.
No missing brushwork is generated. Landscape panels retain the porcelain ground.
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from vessel_surface import atlas_labels, unwrap


def ink_alpha(rgb, valid):
    """Soft blue separation retains pale strokes without eroding thin stems."""
    rgb = rgb.astype(np.float32)
    red, green, blue = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    chroma = blue - .65 * red - .35 * green
    light = .2126 * red + .7152 * green + .0722 * blue
    background = np.percentile(light[valid], 90)
    alpha = np.clip(np.maximum((chroma + 1) / 12, (background - light - 18) / 40), 0, 1)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(((alpha > .20) & valid).astype(np.uint8), 8)
    keep = np.zeros(count, np.uint8)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= 10
    return np.uint8(alpha * 255) * keep[labels]


def extract(folder: Path, recipe_path: Path):
    recipe = json.loads(recipe_path.read_text(encoding='utf-8'))
    baked, valid, geometry = unwrap(folder / 'model.glb')
    h, w = valid.shape
    Image.fromarray(baked).save(folder / 'surface-preview.jpg', quality=93)
    alpha = ink_alpha(baked, valid)
    labels = np.zeros((h, w), np.uint8)
    elements = []
    for index, region in enumerate(recipe['regions']):
        box = np.rint(np.array(region['rect']) * [w, h, w, h]).astype(int)
        x0, y0, x1, y1 = box
        if not (0 <= x0 < x1 <= w and 0 <= y0 < y1 <= h):
            raise ValueError(f'Invalid surface region: {region}')
        panel = region.get('kind') == 'panel'
        opacity = np.uint8(valid[y0:y1, x0:x1]) * 255 if panel else alpha[y0:y1, x0:x1].copy()
        if region.get('polygon'):
            boundary = np.zeros(opacity.shape, np.uint8)
            points = np.rint(np.array(region['polygon']) * [x1-x0-1, y1-y0-1]).astype(np.int32)
            cv2.fillPoly(boundary, [points], 1)
            opacity *= boundary
        if region.get('isolate'):
            core = cv2.morphologyEx(np.uint8(opacity > 48), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
            n, parts, stats, _ = cv2.connectedComponentsWithStats(core, 8)
            if n > 1:
                largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
                main = cv2.dilate(np.uint8(parts == largest), np.ones((5, 5), np.uint8))
                opacity *= main
        if np.count_nonzero(opacity > 128) < 100:
            raise ValueError(f'No usable pigment in {region["label"]}')
        crop = Image.fromarray(baked[y0:y1, x0:x1])
        crop.putalpha(Image.fromarray(opacity))
        xyz, _, _, _, _, depth = geometry
        r = np.median(depth[y0:y1, x0:x1][np.isfinite(depth[y0:y1, x0:x1])])
        scale_x = 2*np.pi*r / np.ptp(xyz[:, 1]) * h/w
        crop = crop.resize((max(1, round(crop.width * scale_x)), crop.height), Image.Resampling.LANCZOS)
        if crop.getbbox():
            crop = crop.crop(crop.getbbox())
        out = Image.new('RGBA', (crop.width+24, crop.height+24))
        out.paste(crop, (12, 12))
        out.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        filename = f'surface_elem_{index:02}.png'
        out.save(folder / filename, optimize=True)
        sub = labels[y0:y1, x0:x1]
        # Specific motifs keep priority over larger panels containing them.
        sub[(opacity > 48) & (sub == 0)] = index + 1
        elements.append({
            'id': index, 'label': region['label'], 'level': region.get('level', 'main'),
            'kind': 'panel' if panel else 'motif', 'image': filename,
            'bbox': box.tolist(), 'area': round(float(np.mean(opacity > 48)), 5),
            'surfaceRect': region['rect'], 'uv': {'u0': 0, 'v0': 0, 'u1': 0, 'v1': 0},
            'source': 'mesh-surface.reviewed-region',
        })
    selection = atlas_labels(labels, geometry)
    for e in elements:
        yy, xx = np.where(selection == e['id'] + 1)
        if not len(xx):
            raise ValueError(f'No mesh hit region for {e["label"]}')
        e['uv'] = dict(zip(('u0', 'v0', 'u1', 'v1'), [float(xx.min()/2048), float(yy.min()/2048),
                                                     float((xx.max()+1)/2048), float((yy.max()+1)/2048)]))
    Image.fromarray(selection).save(folder / 'selection-mask.png', optimize=True)
    manifest = {'version': 3, 'extraction': 'mesh-surface', 'review': 'manual-surface-windows',
                'note': recipe['note'], 'elements': elements}
    (folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(f'{folder.name}: {len(elements)} reviewed surface regions, IDs {np.unique(selection).tolist()}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folders', nargs='+', type=Path)
    args = parser.parse_args()
    for folder in args.folders:
        recipe = Path(__file__).parent / 'surface_recipes' / f'{folder.name}.json'
        if not recipe.exists():
            parser.error(f'Missing reviewed surface recipe: {recipe}')
        extract(folder, recipe)
