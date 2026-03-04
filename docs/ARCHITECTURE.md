# Architecture

## Overview
SPA/PWA sin backend. Todo el estado se guarda localmente en el dispositivo.

## Core entities
- `Routine`: metadatos de rutina.
- `RoutineDay`: dias por rutina.
- `RoutineExercise`: ejercicios por dia y rutina.
- `WorkoutLog`: historial de sesiones ligado a `routineId`.
- `MediaItem`: biblioteca local/externa de imagenes y videos.
- `AppSettings`: preferencias + lock de rutina por dispositivo.

## State model
- `routineBundle`: `{ routines, days, exercises }`
- `media`: catalogo de media local + externos por URL
- `logs`: sesiones registradas
- `settings`: unidades, schema y rutina activa

Persistencia en `localStorage` con keys:
- `training_app:v1:routine`
- `training_app:v1:media`
- `training_app:v1:logs`
- `training_app:v1:settings`

## Device routine lock
- La rutina activa se persiste en `settings.selectedRoutineId`.
- Si `routineLockEnabled=true`, al cambiar rutina se exige confirmacion.
- Esto evita mezclar tracking accidentalmente en el dispositivo.

## Tracking flow
1. Seleccionar rutina activa.
2. Seleccionar dia de esa rutina.
3. Registrar sets.
4. Guardar log con `routineId/routineName/dayId/exerciseId`.

## Media flow
- Media no participa en el flujo de tracking.
- Se consulta en pestaña `Media`.
- Busqueda local por texto/filtros.
- Busqueda internet via Openverse + Wikimedia.
- Guardado externo como URL/metadatos.

## Compatibility and migration
- `schemaVersion=3`.
- Migracion soportada:
  - modelo antiguo de una rutina (`days/exercises`) -> `routineBundle` con `routine-default`
  - logs antiguos sin `routineId` -> asignados a rutina detectada/default
  - settings antiguos -> se completan campos nuevos de lock

## Constraints
- Sin sincronizacion cloud.
- Estado por navegador/dispositivo.
- Media externa depende de disponibilidad del proveedor.
