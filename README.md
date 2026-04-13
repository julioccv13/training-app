# Training App (PWA)

PWA mobile-first para iPhone (Safari + Add to Home Screen) con flujo guiado de entrenamiento: abres la app, ves la rutina activa, qué hiciste la última vez y qué día sigue.

## Objetivo
- Mostrar al abrir la app la rutina activa, el ultimo dia entrenado y el siguiente dia sugerido.
- Permitir cambiar la rutina activa del dispositivo con confirmacion si el lock esta activo.
- Registrar sets/reps/peso/notas por rutina y por dia.
- Mostrar por ejercicio la ultima carga registrada, el peso sugerido por e1RM y una imagen explicativa fija.
- Incluir rutinas base preconfiguradas.

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
1. En `Inicio`, revisa la rutina activa, el ultimo dia entrenado y el dia sugerido.
2. Abre el dia sugerido o cualquier otro dia disponible de la rutina.
3. En `Entreno`, registra sets/reps/peso con referencia al ultimo peso usado y al peso sugerido por e1RM.
4. Guarda la sesion del dia para que la portada actualice automaticamente el siguiente paso.
5. Usa `Ajustes` para unidades, escala, lock, backup e importacion.

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

## Rutinas desde la app
- La app mantiene cambio de rutina activa desde la UI.
- La edicion simple de rutinas queda pendiente como mejora futura; por ahora la gestion estructural sigue siendo por codigo.

## Imagenes de ejercicios
- La app resuelve una imagen principal por ejercicio.
- Si no existe una coincidencia local, intenta buscar automaticamente una referencia en Openverse o Wikimedia Commons y la guarda como media externa.
- El backup conserva estas referencias para no volver a buscarlas en cada dispositivo.

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
