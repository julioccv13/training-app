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

IMAGE_META_BY_REL = {
    'rutina-principal/upper-body/01_dominadas_asistidas.jpeg': {
        'title': 'Rutina Principal Upper Body - Dominadas Asistidas',
        'slug': 'rutina-principal-upper-body-dominadas-asistidas',
        'exerciseSlugs': ['principal-dominadas-asistidas-opcional'],
    },
    'rutina-principal/upper-body/02_remo_alto_hammer.jpeg': {
        'title': 'Rutina Principal Upper Body - Remo Alto Hammer',
        'slug': 'rutina-principal-upper-body-remo-alto-hammer',
        'exerciseSlugs': ['principal-remo-alto-hammer-opcional'],
    },
    'rutina-principal/upper-body/03_remo_cerrado_polea_sentado.jpeg': {
        'title': 'Rutina Principal Upper Body - Remo Cerrado Polea Sentado',
        'slug': 'rutina-principal-upper-body-remo-cerrado-polea-sentado',
        'exerciseSlugs': ['principal-remo-sentado-maquina'],
    },
    'rutina-principal/upper-body/04_jalon_en_polea_al_pecho.jpeg': {
        'title': 'Rutina Principal Upper Body - Jalon En Polea Al Pecho',
        'slug': 'rutina-principal-upper-body-jalon-en-polea-al-pecho',
        'exerciseSlugs': ['principal-jalon-en-maquina'],
    },
    'rutina-principal/upper-body/05_curl_de_biceps_en_maquina_inclinada.jpeg': {
        'title': 'Rutina Principal Upper Body - Curl De Biceps En Maquina Inclinada',
        'slug': 'rutina-principal-upper-body-curl-de-biceps-en-maquina-inclinada',
        'exerciseSlugs': ['principal-curl-de-biceps-en-maquina'],
    },
    'rutina-principal/upper-body/06_curl_de_biceps_en_maquina_predicador.jpeg': {
        'title': 'Rutina Principal Upper Body - Curl De Biceps En Maquina Predicador',
        'slug': 'rutina-principal-upper-body-curl-de-biceps-en-maquina-predicador',
        'exerciseSlugs': ['principal-curl-de-biceps-en-maquina'],
    },
    'rutina-principal/upper-body/07_curl_de_muneca_en_maquina_o_polea.jpeg': {
        'title': 'Rutina Principal Upper Body - Curl De Muneca En Maquina O Polea',
        'slug': 'rutina-principal-upper-body-curl-de-muneca-en-maquina-o-polea',
        'exerciseSlugs': ['principal-curl-de-muneca-opcional'],
    },
    'rutina-principal/upper-body/08_rotacion_interna_de_hombro_en_polea.jpeg': {
        'title': 'Rutina Principal Upper Body - Rotacion Interna De Hombro En Polea',
        'slug': 'rutina-principal-upper-body-rotacion-interna-de-hombro-en-polea',
        'exerciseSlugs': ['principal-rotacion-interna-opcional'],
    },
    'rutina-principal/upper-body/09_rotacion_externa_de_hombro_en_polea.jpeg': {
        'title': 'Rutina Principal Upper Body - Rotacion Externa De Hombro En Polea',
        'slug': 'rutina-principal-upper-body-rotacion-externa-de-hombro-en-polea',
        'exerciseSlugs': ['principal-rotacion-externa-opcional'],
    },
    'rutina-principal/upper-body/10_elevaciones_laterales_maquina.jpeg': {
        'title': 'Rutina Principal Upper Body - Elevaciones Laterales Maquina',
        'slug': 'rutina-principal-upper-body-elevaciones-laterales-maquina',
        'exerciseSlugs': ['principal-elevaciones-laterales-maquina'],
    },
    'rutina-principal/upper-body/11_press_inclinado_en_maquina.jpeg': {
        'title': 'Rutina Principal Upper Body - Press Inclinado En Maquina',
        'slug': 'rutina-principal-upper-body-press-inclinado-en-maquina',
        'exerciseSlugs': ['principal-press-inclinado-en-maquina'],
    },
    'rutina-principal/upper-body/12_press_de_pecho_sentado_maquina.jpeg': {
        'title': 'Rutina Principal Upper Body - Press De Pecho Sentado Maquina',
        'slug': 'rutina-principal-upper-body-press-de-pecho-sentado-maquina',
        'exerciseSlugs': ['principal-press-de-pecho-sentado-en-maquina'],
    },
    'rutina-principal/upper-body/13_aperturas_pectoral_maquina_pec_deck.jpeg': {
        'title': 'Rutina Principal Upper Body - Aperturas Pectoral Maquina Pec Deck',
        'slug': 'rutina-principal-upper-body-aperturas-pectoral-maquina-pec-deck',
        'exerciseSlugs': ['principal-aperturas-pectoral-opcional'],
    },
    'rutina-principal/upper-body/14_press_de_hombro_en_maquina.jpeg': {
        'title': 'Rutina Principal Upper Body - Press De Hombro En Maquina',
        'slug': 'rutina-principal-upper-body-press-de-hombro-en-maquina',
        'exerciseSlugs': ['principal-press-de-hombro-opcional'],
    },
    'rutina-principal/upper-body/15_fondos_asistidos.jpeg': {
        'title': 'Rutina Principal Upper Body - Fondos Asistidos',
        'slug': 'rutina-principal-upper-body-fondos-asistidos',
        'exerciseSlugs': ['principal-fondos-asistidos-opcional'],
    },
    'rutina-principal/upper-body/16_extension_de_triceps_en_maquina_o_polea.jpeg': {
        'title': 'Rutina Principal Upper Body - Extension De Triceps En Maquina O Polea',
        'slug': 'rutina-principal-upper-body-extension-de-triceps-en-maquina-o-polea',
        'exerciseSlugs': ['principal-extension-de-triceps-opcional'],
    },
    'rutina-principal/upper-body/17_pushdown_de_triceps_en_polea.jpeg': {
        'title': 'Rutina Principal Upper Body - Pushdown De Triceps En Polea',
        'slug': 'rutina-principal-upper-body-pushdown-de-triceps-en-polea',
        'exerciseSlugs': ['principal-pushdown-de-triceps-en-polea'],
    },
    'rutina-principal/lower-body/01_aduccion_de_cadera_maquina.jpeg': {
        'title': 'Rutina Principal Lower Body - Aduccion De Cadera Maquina',
        'slug': 'rutina-principal-lower-body-aduccion-de-cadera-maquina',
        'exerciseSlugs': ['principal-aduccion-de-cadera-en-maquina'],
    },
    'rutina-principal/lower-body/02_prensa_inclinada.jpeg': {
        'title': 'Rutina Principal Lower Body - Prensa Inclinada',
        'slug': 'rutina-principal-lower-body-prensa-inclinada',
        'exerciseSlugs': ['principal-prensa-inclinada'],
    },
    'rutina-principal/lower-body/03_hack_squat_con_apoyo_lumbar.jpeg': {
        'title': 'Rutina Principal Lower Body - Hack Squat Con Apoyo Lumbar',
        'slug': 'rutina-principal-lower-body-hack-squat-con-apoyo-lumbar',
        'exerciseSlugs': ['principal-hack-squat-opcional'],
    },
    'rutina-principal/lower-body/04_extension_de_rodilla_maquina.jpeg': {
        'title': 'Rutina Principal Lower Body - Extension De Rodilla Maquina',
        'slug': 'rutina-principal-lower-body-extension-de-rodilla-maquina',
        'exerciseSlugs': ['principal-extension-de-rodilla-en-maquina'],
    },
    'rutina-principal/lower-body/05_extension_lumbar_en_banco_horizontal.jpeg': {
        'title': 'Rutina Principal Lower Body - Extension Lumbar En Banco Horizontal',
        'slug': 'rutina-principal-lower-body-extension-lumbar-en-banco-horizontal',
        'exerciseSlugs': ['principal-extension-lumbar-opcional'],
    },
    'rutina-principal/lower-body/06_extension_lumbar_en_banco_horizontal_2.jpeg': {
        'title': 'Rutina Principal Lower Body - Extension Lumbar En Banco Horizontal 2',
        'slug': 'rutina-principal-lower-body-extension-lumbar-en-banco-horizontal-2',
        'exerciseSlugs': ['principal-extension-lumbar-opcional'],
    },
    'rutina-principal/lower-body/07_aduccion_de_cadera_maquina_2.jpeg': {
        'title': 'Rutina Principal Lower Body - Aduccion De Cadera Maquina 2',
        'slug': 'rutina-principal-lower-body-aduccion-de-cadera-maquina-2',
        'exerciseSlugs': ['principal-aduccion-de-cadera-en-maquina'],
    },
    'rutina-principal/lower-body/08_abduccion_de_cadera_maquina.jpeg': {
        'title': 'Rutina Principal Lower Body - Abduccion De Cadera Maquina',
        'slug': 'rutina-principal-lower-body-abduccion-de-cadera-maquina',
        'exerciseSlugs': ['principal-abduccion-de-cadera-en-maquina'],
    },
    'rutina-principal/lower-body/09_flexion_de_rodilla_sentado_maquina.jpeg': {
        'title': 'Rutina Principal Lower Body - Flexion De Rodilla Sentado Maquina',
        'slug': 'rutina-principal-lower-body-flexion-de-rodilla-sentado-maquina',
        'exerciseSlugs': ['principal-curl-femoral-sentado-en-maquina'],
    },
    'rutina-principal/lower-body/10_extension_de_rodilla_maquina_2.jpeg': {
        'title': 'Rutina Principal Lower Body - Extension De Rodilla Maquina 2',
        'slug': 'rutina-principal-lower-body-extension-de-rodilla-maquina-2',
        'exerciseSlugs': ['principal-extension-de-rodilla-en-maquina'],
    },
    'rutina-principal/lower-body/11_prensa_inclinada_2.jpeg': {
        'title': 'Rutina Principal Lower Body - Prensa Inclinada 2',
        'slug': 'rutina-principal-lower-body-prensa-inclinada-2',
        'exerciseSlugs': ['principal-prensa-inclinada'],
    },
    'rutina-principal/lower-body/12_hip_thrust_en_maquina.jpeg': {
        'title': 'Rutina Principal Lower Body - Hip Thrust En Maquina',
        'slug': 'rutina-principal-lower-body-hip-thrust-en-maquina',
        'exerciseSlugs': ['principal-hip-thrust-opcional'],
    },
    'rutina-principal/lower-body/13_crunch_abdominal_sentado_maquina.jpeg': {
        'title': 'Rutina Principal Lower Body - Crunch Abdominal Sentado Maquina',
        'slug': 'rutina-principal-lower-body-crunch-abdominal-sentado-maquina',
        'exerciseSlugs': ['principal-crunch-abdominal-sentado-en-maquina'],
    },
}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def title_case_slug(slug: str) -> str:
    return ' '.join(part.capitalize() for part in slug.replace('-', ' ').split())


def normalize_slug(value: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def parse_reference_image_meta(path: Path) -> dict:
    relative = path.relative_to(DOCS_MEDIA_ROOT / 'images' / 'reference')
    rel = relative.as_posix()

    generic_match = re.fullmatch(r'reference_(\d+)\.jpeg', relative.name)
    if generic_match:
        index = generic_match.group(1).zfill(2)
        return {
            'id': f'ref-image-{index}',
            'title': f'Reference {index}',
            'slug': f'reference-{index}',
            'exerciseSlugs': [],
        }

    if rel in IMAGE_META_BY_REL:
        meta = IMAGE_META_BY_REL[rel]
        return {
            'id': f"ref-image-{meta['slug']}",
            'title': meta['title'],
            'slug': meta['slug'],
            'exerciseSlugs': meta['exerciseSlugs'],
        }

    stem = re.sub(r'^\d+_', '', path.stem)
    parts = [normalize_slug(part) for part in relative.with_suffix('').parts]
    slug = '-'.join(part for part in parts if part)
    return {
        'id': f'ref-image-{slug}',
        'title': title_case_slug(stem.replace('_', '-')),
        'slug': slug,
        'exerciseSlugs': [],
    }


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

    images = sorted((DOCS_MEDIA_ROOT / 'images' / 'reference').rglob('*.jpeg'))
    for path in images:
        rel = path.relative_to(DOCS_MEDIA_ROOT).as_posix()
        meta = parse_reference_image_meta(path)
        records.append(
            {
                'id': meta['id'],
                'title': meta['title'],
                'slug': meta['slug'],
                'type': 'image',
                'path': f'media/{rel}',
                'isDuplicate': False,
                'checksum': sha256(path),
                'role': 'reference',
                'exerciseSlugs': meta['exerciseSlugs'],
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
