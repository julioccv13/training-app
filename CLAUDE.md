# CLAUDE.md — training-app

## Context
Personal training app built as a PWA for iPhone Safari with offline-friendly local storage.

## Tech stack
- React + Vite + TypeScript
- PWA: `vite-plugin-pwa`
- Storage: `localStorage` only (no backend)

## Key folders
- `src/types/`: app contracts and entities
- `src/data/`: seed routine and media catalog
- `src/lib/`: storage and helper utilities
- `public/media/`: images/videos served by GitHub Pages
- `docs/`: architecture, media policy, operations

## Product behavior
- Editable 4-day routine (days + exercises CRUD)
- Workout logs stored on-device
- Exercise media assignment and playback
- Backup export/import in JSON

## Deploy notes
- Vite base path is `/training-app/` (GitHub Pages)
- Workflow: `.github/workflows/deploy-pages.yml`

## Commands
```bash
npm install
npm run dev
npm run lint
npm run build
```

## Testing focus
- CRUD day/exercise
- workout session save/reload
- media assignment and video playback
- backup export/import
