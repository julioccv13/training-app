# Media Organization

## Source
`~/workspace/personal/docs/training app`

## Applied structure
`~/workspace/personal/docs/training app/media`
- `images/reference/`
- `videos/exercises/`
- `videos/archive/duplicates/`
- `videos/raw/`
- `media_manifest.json`

## Rules applied
- Se movieron originales WhatsApp a rutas normalizadas.
- Videos renombrados en ingles con prefijo numerico + slug descriptivo.
- Duplicados exactos detectados por SHA-256 se movieron a `archive/duplicates`.
- Se mantuvo trazabilidad en `media_manifest.json`.
- El catalogo de app se genera automaticamente con:
  - `role=single|multi|reference`
  - mapeo inicial de `exerciseSlugs` para asociaciones sugeridas

## Current inventory
- 8 imagenes de referencia
- 33 videos totales
- 28 videos unicos
- 5 duplicados exactos

## Project publish copy
Para despliegue, la app usa copia de esta estructura en:
- `~/workspace/personal/training app/public/media`

## Catalog generation
Desde el repo:
```bash
python3 scripts/generate_media_catalog.py
```

Esto actualiza:
- `src/data/mediaCatalog.ts`
- `~/workspace/personal/docs/training app/media/media_manifest.json`
