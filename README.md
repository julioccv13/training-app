# Training App (PWA)

PWA mobile-first para iPhone (Safari + Add to Home Screen) con rutinas multiples, tracking por dia y biblioteca de media desacoplada del flujo de entrenamiento.

## Objetivo
- Permitir varias rutinas en un mismo dispositivo.
- Recordar la rutina activa del dispositivo y pedir confirmacion antes de cambiarla.
- Registrar sets/reps/peso/RPE/notas por rutina y por dia.
- Mantener media local y externa para consulta rapida.

## Stack
- React 19 + Vite 7 + TypeScript
- `vite-plugin-pwa` (manifest + service worker)
- `localStorage` (sin backend)

## Estructura principal
- `src/types/`: tipos de dominio (rutinas, logs, media)
- `src/data/seedRoutine.ts`: semilla, migraciones y normalizacion de estado
- `src/lib/`: helpers, storage y busqueda internet de media
- `src/App.tsx`: flujo principal de UI
- `public/media/`: media local versionada
- `scripts/`: utilidades de mantenimiento
- `docs/`: arquitectura y operacion

## Instalar y correr
```bash
npm install
npm run dev
```

## Validacion
```bash
npm run lint
npm run build
```

## Flujo de uso (app)
1. En `Rutinas`, selecciona la rutina activa del dispositivo.
2. Si cambias a otra rutina, la app pedira confirmacion (lock por dispositivo).
3. Edita dias y ejercicios desde `Rutinas`.
4. Registra entrenamiento en `Track` seleccionando dia.
5. Consulta media en `Media` (local + internet).

## Objetivos dinamicos con e1RM
- La app calcula e1RM por ejercicio desde logs de la rutina activa.
- Formula base implementada (Brzycki): `1RM = peso / (1.0278 - 0.0278 * reps)`.
- Solo considera sets validos de `1` a `10` reps.
- Requiere al menos `3` sets validos para mostrar una estimacion estable.
- Usa mediana de hasta los `12` sets validos mas recientes para robustez.
- Con ese e1RM estima peso sugerido para el ejercicio segun `targetReps` (primer numero), redondeado por unidad (`kg=0.5`, `lb=1`).
- Al guardar sesion (`Track > Guardar sesion del dia`), la app actualiza automaticamente `targetWeight` con el peso sugerido para los ejercicios del dia que tengan datos suficientes.

## Bloqueo de rutina por dispositivo
- La rutina activa se guarda en `localStorage`.
- Al cambiarla, solicita confirmacion cuando el lock esta activo.
- El lock se puede activar/desactivar en `Ajustes`.

## Agregar rutinas desde codigo
Archivo: `src/data/seedRoutine.ts`

1. En `seedRoutineBundle.routines`, agrega una nueva rutina.
2. En `seedRoutineBundle.days`, agrega dias con `routineId`.
3. En `seedRoutineBundle.exercises`, agrega ejercicios con `routineId` y `dayId`.
4. Ejecuta:
```bash
npm run lint
npm run build
```
5. Commit + push para desplegar.

## Crear/editar rutinas desde la app
- `Rutinas > Crear rutina desde cero`.
- Edita nombre/descripcion de la rutina activa.
- Agrega/edita/elimina dias.
- Agrega/edita/elimina ejercicios por dia.

## Media: local + internet
- Busqueda local por nombre/tags/proveedor/url.
- Busqueda internet en Openverse + Wikimedia Commons.
- Resultado externo se guarda como URL en biblioteca (sin descargar binario al navegador).

## Dejar media externa permanente en el repo (pin manual)
- Opcion manual por codigo: descargar el recurso y versionarlo en `public/media/`.
- Luego agregar/actualizar metadatos en catalogo y publicar.
- Recomendado documentar licencia y atribucion del recurso.

## Backup
Desde `Ajustes`:
- Exportar JSON
- Importar JSON
- Reset total

## Deploy GitHub Pages
- Workflow: `.github/workflows/deploy-pages.yml`
- URL: `https://julioccv13.github.io/training-app/`
