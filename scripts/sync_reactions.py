#!/usr/bin/env python3
"""Sync named user-supplied reaction photos into XI Mystery's offline HTML.

Run from the repository root. Existing images are left untouched; reruns are idempotent.
Each name_score_tag.jpg is routed to its score bucket.
"""
from __future__ import annotations

import base64
import json
import mimetypes
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
ASSET_DIR = ROOT / 'reaction_photos'
LABELS = {
    'calafiori': ('卡拉菲奥里', 'Riccardo Calafiori'),
    'guardiola': ('瓜迪奥拉', 'Pep Guardiola'),
    'neymar': ('内马尔', 'Neymar Jr.'),
    'olise': ('奥利塞', 'Michael Olise'),
    'tuchel': ('图赫尔', 'Thomas Tuchel'),
}


def replace_block(source: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = source.find(start_marker)
    if start < 0:
        raise RuntimeError(f'Missing start marker: {start_marker}')
    beginning = start + len(start_marker)
    end = source.find(end_marker, beginning)
    if end < 0:
        raise RuntimeError(f'Missing end marker after {start_marker}: {end_marker}')
    return source[:beginning] + replacement + source[end:]


def read_block(source: str, start_marker: str, end_marker: str):
    start = source.find(start_marker)
    if start < 0:
        raise RuntimeError('Missing embedded data: ' + start_marker)
    begin = start + len(start_marker)
    end = source.find(end_marker, begin)
    if end < 0:
        raise RuntimeError('Missing embedded data terminator: ' + start_marker)
    return json.loads(source[begin:end])


def main() -> None:
    src = INDEX.read_text(encoding='utf-8')
    image_start = 'window.XI_REACTION_IMAGES = '
    image_end = ';\n\n</script>'
    reaction_start = 'const FINISH_REACTIONS='
    reaction_end = ';\nfunction translateKey'
    images = read_block(src, image_start, image_end)
    reactions = read_block(src, reaction_start, reaction_end)

    counts = {'perfect': 0, 'high': 0, 'mid': 0, 'low': 0}
    new_assets = 0
    for path in sorted(ASSET_DIR.glob('*')):
        match = re.fullmatch(r'([a-z]+)_(\d{3})_(\d+)\.(jpe?g|png)', path.name, re.IGNORECASE)
        if not match:
            raise ValueError(f'Unexpected filename: {path.name}; expected name_score_tag.jpg')
        slug, digits, tag, ext = match.groups()
        score = int(digits)
        if score > 500:
            raise ValueError(f'Invalid score: {path.name}')
        tier = 'perfect' if score == 500 else 'high' if score >= 400 else 'mid' if score >= 200 else 'low'
        bucket = reactions[tier]['items']
        existing = [row for row in bucket if row.get('file') == path.name]
        if not existing:
            prefix = {'perfect': 'F', 'high': 'H', 'mid': 'M', 'low': 'L'}[tier]
            used = [int(row['id'][1:]) for row in bucket if re.fullmatch(prefix + r'\d+', row['id'])]
            next_id = prefix + str(max(used, default=0) + 1).zfill(2)
            zh, en = LABELS.get(slug, (slug.capitalize(), slug.capitalize()))
            label = {'zh': f'{zh} · {int(tag)}', 'en': f'{en} · {int(tag)}', 'es': f'{en} · {int(tag)}'}
            bucket.append({'id': next_id, 'file': path.name, 'label': label, 'local': path.name})
            counts[tier] += 1
        if path.name not in images:
            mime = mimetypes.guess_type(path.name)[0] or 'image/jpeg'
            images[path.name] = 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')
            new_assets += 1

    # The reaction data occurs after the embedded photos, so update it first.
    src = replace_block(src, reaction_start, reaction_end, json.dumps(reactions, ensure_ascii=False, indent=2))
    src = replace_block(src, image_start, image_end, json.dumps(images, ensure_ascii=False, separators=(',', ':')))
    INDEX.write_text(src, encoding='utf-8')
    print('Reactions added by tier:', counts, '| embedded photos added:', new_assets)


if __name__ == '__main__':
    main()

