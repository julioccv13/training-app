# Changelog

## 2026-03-04 (e1RM update)
- Added dynamic e1RM estimation per exercise from routine logs using Brzycki equation.
- Added robust e1RM aggregation (median of recent valid sets, 1-10 reps, minimum 3 samples).
- Added suggested target load projection from e1RM and target reps.
- Added UI actions to apply suggested load into exercise `targetWeight`.
- Added automatic `targetWeight` update on session save using current e1RM suggestions.
- Updated README, CLAUDE, AGENTS, and docs for e1RM behavior and validation.

## 2026-03-04
- Added multi-routine architecture (`routines/days/exercises`) with migration support.
- Added device-level active routine persistence and confirmation lock on routine switch.
- Simplified tracking flow to routine -> day -> sets logging.
- Decoupled media from workout tracking screens.
- Added media local search filters and internet search integration (Openverse + Wikimedia).
- Added external media save-by-URL flow for reusable library references.
- Updated docs, AGENTS, CLAUDE, and operations guidance for code-driven and in-app routine updates.

## 2026-03-04 (earlier)
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
