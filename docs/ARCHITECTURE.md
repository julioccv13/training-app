# Architecture

## Overview
La app es una SPA/PWA con estado local en navegador, sin backend.

## Core entities
- `TrainingDay`: dia editable de rutina
- `Exercise`: ejercicio editable, ligado a un dia
- `MediaItem`: imagen/video con `role` y asignacion muchos-a-muchos con ejercicios
- `WorkoutLog`: registro historico por ejercicio
- `AppSettings`: unidad de peso y schema version

## State model
- `routine`: dias + ejercicios
- `media`: catalogo de archivos y asignaciones
- `logs`: historial de sesiones
- `settings`: preferencias globales

Todos persistidos en `localStorage`.

## Data flow
1. Carga inicial: storage -> semilla si no existe.
2. Edicion de rutina/media/logs: actualiza estado React.
3. Persistencia: efectos `useEffect` guardan en `localStorage`.
4. Export/import: serializa/deserializa estado completo en JSON.

## Media strategy
- Archivos estaticos servidos desde `public/media`.
- URL final resuelta con `import.meta.env.BASE_URL` para compatibilidad GitHub Pages.
- Videos con `playsInline` para Safari iOS.
- Roles de media:
  - `single`: guia principal de ejercicio.
  - `multi`: biblioteca secundaria (compilados/circuitos/variaciones).
  - `reference`: imagenes de apoyo.
- Asignacion:
  - cada `MediaItem` mantiene `exerciseIds[]` para asociarse a varios ejercicios.
  - en vista de entrenamiento se prioriza `single`; `multi` se muestra como biblioteca relacionada.

## Compatibility and migration
- Se mantiene la misma key de storage.
- Datos antiguos con `exerciseId` se migran automaticamente a `exerciseIds[]`.
- Se impone `schemaVersion=2` en settings para reflejar el modelo nuevo.

## PWA
- `vite-plugin-pwa` genera manifest + service worker.
- Cache de assets estaticos relevantes (incluyendo mp4 bajo limite de tamano).
- Modo de registro: `autoUpdate`.

## Constraints
- Sin sincronizacion nube.
- Datos dependen del almacenamiento del dispositivo.
- Cambiar de navegador/dispositivo requiere backup manual (export/import).
