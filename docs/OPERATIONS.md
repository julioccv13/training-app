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
3. Si cambia catalogo, regenerar `src/data/mediaCatalog.ts`.
4. Ejecutar lint/build y publicar.

## Backup policy
Antes de cambios grandes de rutina:
- Exportar backup JSON desde la app.
- Guardar copia local con fecha.
