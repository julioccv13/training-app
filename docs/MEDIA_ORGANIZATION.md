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
- Videos renombrados con prefijo numerico + slug de ejercicio.
- Duplicados exactos detectados por SHA-256 se movieron a `archive/duplicates`.
- Se mantuvo trazabilidad en `media_manifest.json`.

## Current inventory
- 8 imagenes de referencia
- 33 videos totales
- 28 videos unicos
- 5 duplicados exactos

## Project publish copy
Para despliegue, la app usa copia de esta estructura en:
- `~/workspace/personal/training app/public/media`
