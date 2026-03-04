#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_MEDIA_ROOT = Path('/home/julio/workspace/personal/docs/training app/media')
TS_OUTPUT = REPO_ROOT / 'src' / 'data' / 'mediaCatalog.ts'
MANIFEST_OUTPUT = DOCS_MEDIA_ROOT / 'media_manifest.json'

MULTI_PATTERNS = re.compile(r'(variation|variations|circuit|exercises)', re.IGNORECASE)

SLUG_TO_EXERCISE_SLUGS = {
    'hip-thrust': ['hip-thrust'],
    'lat-db-row': ['remo-con-mancuernas'],
    'la-db-row-2': ['remo-con-mancuernas'],
    'db-squat': ['sentadilla-profunda'],
    'db-squat-2': ['sentadilla-profunda'],
    'db-squat-variations': ['sentadilla-profunda'],
    'lower-back-extension': ['hiperextensiones'],
    'machine-chest-fly': ['aperturas'],
    'machine-chest-fly-2': ['aperturas'],
    'lying-leg-curl': ['curl-femoral'],
    'db-lunges': ['zancadas'],
    'australian-pullup-variations': ['dominadas'],
    'barbell-row-variations': ['remo-en-t', 'remo-inclinado'],
    'delt-exercises': ['face-pull'],
    'delt-exercises-2': ['face-pull'],
    'leg-abduction': ['maquina-aductores'],
    'leg-abduction-2': ['maquina-aductores'],
    'lower-body-landmine-exercises': ['zancadas', 'sentadilla-profunda'],
    'lower-body-exercises-1': ['sentadilla-profunda', 'zancadas'],
    'lower-body-exercises-2': ['peso-muerto-rumano', 'zancadas'],
    'upper-body-exercises-1': ['face-pull', 'remo-con-mancuernas', 'jalon-al-pecho'],
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def title_case_slug(slug: str) -> str:
    return ' '.join(part.capitalize() for part in slug.replace('-', ' ').split())


def parse_video_meta(path: Path, is_duplicate: bool) -> tuple[str, str]:
    name = path.name
    if is_duplicate:
        m = re.match(r'^dup_(\d+)_([a-z0-9-]+)\.mp4$', name)
    else:
        m = re.match(r'^(\d+)_([a-z0-9-]+)\.mp4$', name)

    if not m:
        raise ValueError(f'Unexpected video name format: {name}')

    index, slug = m.group(1), m.group(2)
    return index.zfill(2), slug


def detect_role(media_type: str, slug: str) -> str:
    if media_type == 'image':
        return 'reference'
    if MULTI_PATTERNS.search(slug):
        return 'multi'
    return 'single'


def build_records() -> list[dict]:
    records: list[dict] = []

    images = sorted((DOCS_MEDIA_ROOT / 'images' / 'reference').glob('*.jpeg'))
    for idx, path in enumerate(images, start=1):
        rel = path.relative_to(DOCS_MEDIA_ROOT).as_posix()
        records.append(
            {
                'id': f'ref-image-{idx:02d}',
                'title': f'Reference {idx:02d}',
                'slug': f'reference-{idx:02d}',
                'type': 'image',
                'path': f'media/{rel}',
                'isDuplicate': False,
                'checksum': sha256(path),
                'role': 'reference',
                'exerciseSlugs': [],
            }
        )

    video_sources: list[tuple[Path, bool]] = []
    video_sources.extend((path, False) for path in sorted((DOCS_MEDIA_ROOT / 'videos' / 'exercises').glob('*.mp4')))
    video_sources.extend(
        (path, True) for path in sorted((DOCS_MEDIA_ROOT / 'videos' / 'archive' / 'duplicates').glob('*.mp4'))
    )

    for path, is_duplicate in video_sources:
        index, slug = parse_video_meta(path, is_duplicate)
        rel = path.relative_to(DOCS_MEDIA_ROOT).as_posix()
        role = detect_role('video', slug)
        exercise_slugs = SLUG_TO_EXERCISE_SLUGS.get(slug, [])
        records.append(
            {
                'id': f'video-{index}',
                'title': title_case_slug(slug),
                'slug': slug,
                'type': 'video',
                'path': f'media/{rel}',
                'isDuplicate': is_duplicate,
                'checksum': sha256(path),
                'role': role,
                'exerciseSlugs': exercise_slugs,
            }
        )

    return records


def write_ts(records: list[dict]) -> None:
    lines: list[str] = []
    lines.append('export type MediaRole = \'single\' | \'multi\' | \'reference\'')
    lines.append('')
    lines.append('export interface MediaCatalogRecord {')
    lines.append('  id: string')
    lines.append('  title: string')
    lines.append('  slug: string')
    lines.append("  type: 'image' | 'video'")
    lines.append('  path: string')
    lines.append('  isDuplicate: boolean')
    lines.append('  checksum: string | null')
    lines.append('  role: MediaRole')
    lines.append('  exerciseSlugs: string[]')
    lines.append('}')
    lines.append('')
    lines.append('export const mediaCatalog: MediaCatalogRecord[] = [')

    for record in records:
        lines.append('  {')
        lines.append(f"    id: {json.dumps(record['id'])},")
        lines.append(f"    title: {json.dumps(record['title'])},")
        lines.append(f"    slug: {json.dumps(record['slug'])},")
        lines.append(f"    type: {json.dumps(record['type'])},")
        lines.append(f"    path: {json.dumps(record['path'])},")
        lines.append(f"    isDuplicate: {'true' if record['isDuplicate'] else 'false'},")
        lines.append(f"    checksum: {json.dumps(record['checksum'])},")
        lines.append(f"    role: {json.dumps(record['role'])},")
        lines.append(f"    exerciseSlugs: {json.dumps(record['exerciseSlugs'])},")
        lines.append('  },')

    lines.append(']')
    TS_OUTPUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')


def write_manifest(records: list[dict]) -> None:
    manifest = {
        'generated_at': __import__('datetime').datetime.now().isoformat(),
        'source': str(DOCS_MEDIA_ROOT),
        'images_total': sum(1 for r in records if r['type'] == 'image'),
        'videos_total': sum(1 for r in records if r['type'] == 'video'),
        'unique_videos': sum(1 for r in records if r['type'] == 'video' and not r['isDuplicate']),
        'duplicate_videos': sum(1 for r in records if r['type'] == 'video' and r['isDuplicate']),
        'records': records,
    }
    MANIFEST_OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')


def main() -> None:
    records = build_records()
    write_ts(records)
    write_manifest(records)
    print(f'Generated {len(records)} media records')
    print(f'- TS: {TS_OUTPUT}')
    print(f'- Manifest: {MANIFEST_OUTPUT}')


if __name__ == '__main__':
    main()
