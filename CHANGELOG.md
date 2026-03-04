# Changelog

## 2026-03-04
- Synced project media with renamed English video files from docs source.
- Added media roles (`single`, `multi`, `reference`) and multi-exercise associations (`exerciseIds[]`).
- Implemented migration support for old media records with `exerciseId`.
- Updated workout UI to prioritize `single` guide videos and show `multi` related library clips.
- Added media catalog generator script: `scripts/generate_media_catalog.py`.
- Updated technical/operations docs for new media policy and workflow.

## 2026-03-03
- Initial project scaffolding with React + Vite + TypeScript.
- Implemented workout app with 4-day editable routine.
- Added local logging for sets/reps/weight/RPE/rest/notes.
- Added media catalog and assignment workflow.
- Organized docs media into structured folders with duplicate archive.
- Added PWA config and GitHub Pages deployment workflow.
- Added AGENTS.md and CLAUDE.md for project context.
