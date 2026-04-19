# Media Organization

## Local source
`~/workspace/personal/docs/training app/media`

## Project publish path
`~/workspace/personal/training app/public/media`

## Exercise cards added on 2026-04-13
- Source zip used: `~/Downloads/exercise_cards_zip.zip`
- Published folder: `public/media/images/exercise-cards/`
- Catalog file: `src/data/exerciseCardCatalog.ts`
- Matching rule: one PNG per exercise `slug`
- Current intent: these local cards should replace incorrect external search results in the training view

## Local media update
1. Actualiza archivos en `docs/.../media`.
2. Sincroniza al proyecto:
```bash
rsync -a --delete '~/workspace/personal/docs/training app/media/' 'public/media/'
```
3. Regenera catalogo:
```bash
python3 scripts/generate_media_catalog.py
```
4. Valida y publica.

## Media model in app
- `origin=local`: archivos versionados en repo.
- `origin=external`: recursos guardados por URL desde internet.
- `role=single|multi|reference`: clasificacion para consulta.
- Exercise cards added from the zip use `origin=local` and `role=single`.

## Internet search
- Proveedores actuales:
  - Openverse
  - Wikimedia Commons
- Se guarda URL, thumbnail, licencia y atribucion cuando existe.

## Pin manual to repo
Para dejar un recurso externo permanente:
1. Descargarlo manualmente con licencias permitidas.
2. Guardarlo en `public/media/`.
3. Actualizar catalogo/metadata.
4. Commit + deploy.

## Current troubleshooting note
- Aunque las imagenes locales ya estan desplegadas en Pages, si un usuario no las ve dentro de la app:
  - revisar caché del PWA instalado
  - revisar `localStorage` persistido
  - revisar si una referencia externa vieja sigue ganando en resolucion
