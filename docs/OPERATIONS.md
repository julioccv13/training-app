# Operations

## Local run
```bash
npm install
npm run dev
```

## Validation
```bash
npm run lint
npm run build
```

## Deploy
Push a `main` dispara `.github/workflows/deploy-pages.yml`.

## Post-deploy check
- URL carga sin 404 en assets
- Navegacion tabs funciona
- Guardado local persiste al recargar
- Video de ejercicio reproduce
- Add to Home Screen disponible en iPhone Safari

## Updating media
1. Actualizar carpeta fuente en `~/workspace/personal/docs/training app/media`.
2. Copiar a proyecto:
```bash
rsync -a --delete '~/workspace/personal/docs/training app/media/' 'public/media/'
```
3. Regenerar catalogo + manifiesto:
```bash
python3 scripts/generate_media_catalog.py
```
4. Ejecutar lint/build y publicar.

## Policy for multi-exercise videos
- No se eliminan.
- Se marcan como `multi`.
- Se pueden asociar a varios ejercicios.
- En entrenamiento, los `single` tienen prioridad como guia principal.

## Backup policy
Antes de cambios grandes de rutina:
- Exportar backup JSON desde la app.
- Guardar copia local con fecha.
