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

## Post-deploy checks
- App carga sin 404.
- `Inicio` muestra rutina activa, ultimo dia entrenado y siguiente dia sugerido.
- Selector de rutina funciona.
- Cambio de rutina pide confirmacion (si lock activo).
- `Entreno` carga el dia elegido y muestra la imagen del ejercicio.
- Tracking guarda logs en rutina activa.
- e1RM aparece por ejercicio despues de 3+ sets validos (1-10 reps).
- Al guardar sesion, `targetWeight` se actualiza automaticamente en ejercicios elegibles.
- Si la app esta instalada como PWA, verificar tambien que no haya cache vieja del service worker.

## Add routine from code
Archivo: `src/data/seedRoutine.ts`

- Agregar rutina en `seedRoutineBundle.routines`.
- Agregar dias en `seedRoutineBundle.days` con `routineId`.
- Agregar ejercicios en `seedRoutineBundle.exercises` con `routineId` y `dayId`.

Luego:
```bash
npm run lint
npm run build
```

## Modify routine from app
UI actual:
- Solo se mantiene seleccion de rutina activa desde `Inicio`.
- El lock de rutina se controla desde `Ajustes`.
- La edicion estructural de rutinas queda fuera del flujo principal y debe hacerse por codigo hasta nueva simplificacion.
- El ajuste de `targetWeight` por e1RM ocurre automatico al guardar una sesion en `Entreno`.

## Media update
- Local exercise cards versionadas:
  - carpeta: `public/media/images/exercise-cards/`
  - catalogo: `src/data/exerciseCardCatalog.ts`
- La resolucion de imagenes ahora debe priorizar media local por `slug`.
- Si aparecen imagenes incorrectas en la app publicada, revisar cache del PWA y estado persistido antes de tocar el catalogo.

## Backup
Pestaña `Ajustes`:
- Exportar JSON
- Importar JSON
- Reset total
