# CLAUDE.md — training-app

> Inherits rules from `~/workspace/personal/CLAUDE.md` and `~/.claude/CLAUDE.md`.

## Context
Personal training PWA with multi-routine tracking and device-level active-routine lock.
Product language is Spanish.

## Repo
- GitHub: `julioccv13/training-app`
- Path: `~/workspace/personal/training app/`
- Deploy: GitHub Pages (`.github/workflows/deploy-pages.yml`)

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
- `src/lib/helpers.ts`: e1RM logic and utilities

## Product behavior
- Device remembers selected routine
- Routine switch requests confirmation when lock is enabled
- Tracking flow is routine -> day -> sets
- Media is query-only support (not coupled to workout steps)
- Dynamic objective support via e1RM (Brzycki) from historical sets
- On workout save, target weight is auto-updated when enough valid e1RM data exists

## Paths
- Docs: `~/workspace/personal/docs/training app/`
- Docs/media source: `~/workspace/personal/docs/training app/media`
- Task logs: `~/workspace/personal/docs/training app/tasks/`
- Canonical docs folders: `documentos/`, `grabaciones/`, `transcripciones/`, `varios/`

## Commands
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Maintenance
- Add routines from code in `src/data/seedRoutine.ts`
- Edit/create routines from app tab `Rutinas`
- e1RM dinamico: revisar logica en `src/lib/helpers.ts` y uso en `src/App.tsx`
- Media local sync + catalog generation via `scripts/generate_media_catalog.py`

## Audio and transcript workflow
- `media/` is app media, not the meeting-recordings folder.
- Meeting or voice recordings belong in `~/workspace/personal/docs/training app/grabaciones/`.
- If Julio mentions an audio, recording, meeting, or transcript without a full path, search `grabaciones/` first.
- If more than one plausible file matches, present the options and ask which one to use.
- Save transcripts in `~/workspace/personal/docs/training app/transcripciones/<source-base>.md`.
- Save summaries in `~/workspace/personal/docs/training app/varios/<source-base>-resumen.md`.

## Testing focus
- routine switch confirmation behavior
- routine/day CRUD and tracking integrity
- logs separation by routine
- e1RM estimation appears only with enough valid data (>=3 sets, 1-10 reps)
- saving workout auto-updates `targetWeight` from suggested e1RM load when eligible
- media local search
- internet media search + save URL into library

## Validation checklist
- `npm run lint`
- `npm run build`
- Verify routine lock confirmation on routine switch
- Verify logs are partitioned by routine
- Verify e1RM appears with >=3 valid sets and suggested load can be applied
- Verify save session auto-updates objective weight when e1RM data is sufficient
- Verify media internet search and save URL flow

Context resilience and global policies: see `~/.claude/CLAUDE.md`.
