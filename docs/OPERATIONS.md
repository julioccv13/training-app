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
- Selector de rutina funciona.
- Cambio de rutina pide confirmacion (si lock activo).
- Tracking guarda logs en rutina activa.
- e1RM aparece por ejercicio despues de 3+ sets validos (1-10 reps).
- Al guardar sesion, `targetWeight` se actualiza automaticamente en ejercicios elegibles.
- Media local y externa se visualiza.

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
Pestaña `Rutinas`:
- Seleccionar rutina activa (con confirmacion por lock).
- Editar nombre/descripcion de rutina activa.
- Crear rutina desde cero.
- Agregar/editar/eliminar dias.
- Agregar/editar/eliminar ejercicios.
- El ajuste de `targetWeight` por e1RM ocurre automatico al guardar una sesion en `Track`.

## Media update
- Local: sync + regenerate catalog.
- External: buscar en `Media`, guardar URL en biblioteca.

## Backup
Pestaña `Ajustes`:
- Exportar JSON
- Importar JSON
- Reset total
