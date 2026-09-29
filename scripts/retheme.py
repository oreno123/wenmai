#!/usr/bin/env python3
"""Apply the approved 纹脉 palette mapping without touching material or identity colors.

Usage:
  python scripts/retheme.py --dry-run
  python scripts/retheme.py --write
"""
from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src'

# Series identity, ceramic/relic materials, structural alpha and semantic status colors.
SKIP_PATHS = {
    Path('store/patternData.ts'),
}
WEBGL_OR_GLSL_PATHS = {
    Path('components/common/FluidShaderBackground.jsx'),
    Path('components/common/HomeHero3D.jsx'),
    Path('components/common/CloudShaderBackground.jsx'),
    Path('components/products/GLBModel.jsx'),
    Path('components/products/Mug.jsx'),
    Path('pages/RelicPage.tsx'),
    Path('pages/Landing.jsx'),
    Path('pages/SplashPage.jsx'),
    Path('showcase/GossamerThread.jsx'),
    Path('shaders/cloudTrain.js'),
    Path('shaders/fluowingFluid.js'),
}

# A bucket: CSS and React style contexts resolve to semantic tokens.
TOKEN_MAP = {
    '#F2D58A': 'var(--color-gold-bright)', '#D4AF6A': 'var(--color-gold-main)',
    '#F2EBDB': 'var(--color-text-primary)', '#6A6A6A': 'var(--color-text-secondary)',
    '#D4AF37': 'var(--color-gold-main)', '#F5F1E8': 'var(--color-text-primary)',
    '#6B5C45': 'var(--color-text-dim)', '#D4A843': 'var(--color-gold-main)',
    '#BC6B2F': 'var(--color-gold-main)', '#D4813A': 'var(--color-gold-bright)',
    '#96521F': 'var(--color-gold-main)', '#A89580': 'var(--color-text-secondary)',
    '#8A6A30': 'var(--color-gold-dim)', '#0A0806': 'var(--color-bg-base)',
    '#0A0807': 'var(--color-bg-base)', '#0A0907': 'var(--color-bg-base)',
    '#8B6914': 'var(--color-gold-dim)', '#7A7060': 'var(--color-text-dim)',
    '#C9A84C': 'var(--color-gold-main)', '#C9943A': 'var(--color-gold-main)',
    '#C9A23C': 'var(--color-gold-main)', '#4A4A4A': 'var(--color-text-dim)',
    '#F5D870': 'var(--color-gold-bright)', '#BC1F28': 'var(--color-red-accent)',
    '#A09682': 'var(--color-text-secondary)', '#8B6F1F': 'var(--color-gold-dim)',
    '#8A7A4A': 'var(--color-gold-dim)', '#5A5A5A': 'var(--color-text-dim)',
    '#5A420E': 'var(--color-gold-deep)', '#0F0F10': 'var(--color-bg-base)',
    '#C8B896': 'var(--color-text-secondary)', '#8A8A8A': 'var(--color-text-secondary)',
    '#2B221A': 'var(--color-bg-card)', '#1F1D17': 'var(--color-bg-card)',
    '#14120D': 'var(--color-bg-card)', '#8A4A20': 'var(--color-gold-deep)',
    '#9A9A9A': 'var(--color-text-secondary)', '#F0EBE0': 'var(--color-text-primary)',
    '#F7F3EA': 'var(--color-text-primary)', '#666': 'var(--color-text-secondary)',
}
RGBA_MAP = {
    (212, 175, 106): (201, 162, 75), (201, 162, 60): (201, 162, 75),
    (212, 175, 55): (201, 162, 75), (201, 148, 58): (201, 162, 75),
    (242, 213, 138): (227, 192, 121), (200, 180, 150): (216, 205, 186),
    (180, 155, 100): (138, 111, 53), (188, 31, 40): (158, 53, 48),
    (15, 15, 16): (23, 21, 19), (245, 241, 232): (216, 205, 186),
    (8, 6, 4): (23, 21, 19), (10, 8, 6): (23, 21, 19),
    (31, 24, 18): (36, 30, 25), (255, 240, 176): (227, 192, 121),
    (201, 168, 76): (201, 162, 75),
}
# B/C bucket cannot consume CSS vars. Derived from the same palette, as literal sRGB hex.
LITERAL_MAP = {
    old: {'var(--color-gold-bright)': '#E3C079', 'var(--color-gold-main)': '#C9A24B',
          'var(--color-gold-dim)': '#8A6F35', 'var(--color-gold-deep)': '#5A4620',
          'var(--color-text-primary)': '#D8CDBA', 'var(--color-text-secondary)': '#A89C88',
          'var(--color-text-dim)': '#6E655A', 'var(--color-bg-base)': '#171513',
          'var(--color-bg-card)': '#241E19', 'var(--color-red-accent)': '#9E3530'}[new]
    for old, new in TOKEN_MAP.items()
}

RGBA_RE = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(\s*,\s*[^)]*)?\)', re.I)

@dataclass(frozen=True)
class Change:
    line: int
    old: str
    new: str


def transform(text: str, use_literals: bool) -> tuple[str, list[Change]]:
    mapping = LITERAL_MAP if use_literals else TOKEN_MAP
    changes: list[Change] = []
    lines = text.splitlines(keepends=True)
    output: list[str] = []
    for line_no, line in enumerate(lines, 1):
        changed = line
        for old, new in mapping.items():
            if old.lower() in changed.lower():
                changed = re.sub(re.escape(old), new, changed, flags=re.I)
                changes.append(Change(line_no, old, new))
        def replace_rgba(match: re.Match[str]) -> str:
            rgb = tuple(map(int, match.group(1, 2, 3)))
            if rgb not in RGBA_MAP:
                return match.group(0)
            new_rgb = RGBA_MAP[rgb]
            old = ','.join(map(str, rgb))
            new = ','.join(map(str, new_rgb))
            changes.append(Change(line_no, old, new))
            return f'rgba({new}{match.group(4) or ""})'
        changed = RGBA_RE.sub(replace_rgba, changed)
        output.append(changed)
    return ''.join(output), changes


def main() -> None:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--write', action='store_true')
    args = parser.parse_args()
    total = 0
    files = 0
    for path in sorted(SOURCE.rglob('*')):
        if path.suffix not in {'.js', '.jsx', '.ts', '.tsx', '.css'} or not path.is_file():
            continue
        rel = path.relative_to(SOURCE)
        if rel in SKIP_PATHS:
            continue
        original = path.read_text(encoding='utf-8')
        changed, changes = transform(original, rel in WEBGL_OR_GLSL_PATHS)
        if not changes:
            continue
        files += 1
        total += len(changes)
        for change in changes:
            print(f'src/{rel}:{change.line}  {change.old} => {change.new}')
        if args.write:
            path.write_text(changed, encoding='utf-8')
    print(f'\n{files} files, {total} replacements ({"written" if args.write else "dry run"})')

if __name__ == '__main__':
    main()
