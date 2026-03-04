# Training App (PWA)

PWA mobile-first para iPhone (Safari + Add to Home Screen) con rutina editable de 4 dias, registro local de entrenamiento y reproduccion de videos/imagenes.

## Objetivo
- Usar material multimedia desde `~/workspace/personal/docs/training app`
- Mantener rutina editable (CRUD completo)
- Guardar sets/reps/peso/RPE/notas en almacenamiento local del telefono
- Desplegar gratis con GitHub Pages

## Stack
- React 19 + Vite 7 + TypeScript
- `vite-plugin-pwa` para manifest + service worker
- `localStorage` para persistencia (sin backend)

## Estructura principal
- `src/types/`: contratos de dominio
- `src/data/`: semilla de rutina y catalogo de media
- `src/lib/`: utilidades de storage y helpers
- `public/media/`: videos e imagenes servidos estaticamente
- `docs/`: arquitectura, operaciones y organizacion de media

## Requisitos
- Node.js 24+
- npm 11+

## Instalacion
```bash
npm install
```

## Desarrollo local
```bash
npm run dev
```

## Calidad
```bash
npm run lint
npm run build
```

## Deploy a GitHub Pages
1. Crear repo `julioccv13/training-app` (SSH).
2. Push a `main`.
3. En GitHub > Settings > Pages:
   - Source: GitHub Actions.
4. El workflow `.github/workflows/deploy-pages.yml` publica automaticamente en cada push a `main`.

URL esperada:
- `https://julioccv13.github.io/training-app/`

## Uso en iPhone
1. Abrir la URL en Safari.
2. Compartir > Add to Home Screen.
3. Abrir desde el icono como app standalone.

## Persistencia y backup
- Keys de storage:
  - `training_app:v1:routine`
  - `training_app:v1:media`
  - `training_app:v1:logs`
  - `training_app:v1:settings`
- Desde Ajustes:
  - Exportar JSON
  - Importar JSON
  - Reset total

## Notas sobre media
- La fuente original esta en `~/workspace/personal/docs/training app/media`.
- En el repo se publica copia en `public/media/`.
- Duplicados exactos se mantienen en `videos/archive/duplicates` para trazabilidad.

## Referencias
- Arquitectura: `docs/ARCHITECTURE.md`
- Operacion: `docs/OPERATIONS.md`
- Organizacion media: `docs/MEDIA_ORGANIZATION.md`
