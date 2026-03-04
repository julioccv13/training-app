# CLAUDE.md — training-app

## Context
Personal training PWA with multi-routine tracking and device-level active-routine lock.

## Tech stack
- React + Vite + TypeScript
- PWA: `vite-plugin-pwa`
- Storage: `localStorage`

## Domain model
- `Routine`, `RoutineDay`, `RoutineExercise`
- `WorkoutLog` partitioned by `routineId`
- `MediaItem` with `origin=local|external`
- `AppSettings` includes `selectedRoutineId` and lock settings

## Key files
- `src/data/seedRoutine.ts`: seeds + migrations + normalization
- `src/lib/mediaSearch.ts`: Openverse/Wikimedia search
- `src/App.tsx`: routines, tracking, media UI
- `src/types/training.ts`: contracts

## Product behavior
- Device remembers selected routine
- Routine switch requests confirmation when lock is enabled
- Tracking flow is routine -> day -> sets
- Media is query-only support (not coupled to workout steps)
- Dynamic objective support via e1RM (Brzycki) from historical sets
- On workout save, target weight is auto-updated when enough valid e1RM data exists

## Commands
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Testing focus
- routine switch confirmation behavior
- routine/day CRUD and tracking integrity
- logs separation by routine
- e1RM estimation appears only with enough valid data (>=3 sets, 1-10 reps)
- saving workout auto-updates `targetWeight` from suggested e1RM load when eligible
- media local search
- internet media search + save URL into library
