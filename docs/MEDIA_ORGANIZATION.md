# Media Organization

## Local source
`~/workspace/personal/docs/training app/media`

## Project publish path
`~/workspace/personal/training app/public/media`

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
