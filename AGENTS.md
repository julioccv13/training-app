# AGENTS.md — training-app

## Owner
- GitHub: `julioccv13`
- Repo: `julioccv13/training-app`

## Project goal
PWA de entrenamiento para iPhone con:
- Rutinas multiples seleccionables en dispositivo
- Confirmacion al cambiar rutina activa (device lock)
- Tracking por rutina y por dia
- Biblioteca media desacoplada del tracking
- Busqueda local + busqueda internet de media (URLs externas)

## Paths
- Repo root: `~/workspace/personal/training app`
- Docs/media source: `~/workspace/personal/docs/training app/media`
- Task logs: `~/workspace/personal/docs/training app/tasks`

## Rules
- GitHub only (`gh`) using SSH
- No branch changes unless explicitly requested
- Short, simple commit messages in English
- No secrets in repository

## Maintenance
- Add routines from code in `src/data/seedRoutine.ts`
- Edit/create routines from app tab `Rutinas`
- Media local sync + catalog generation via `scripts/generate_media_catalog.py`

## Deploy
- GitHub Pages via `.github/workflows/deploy-pages.yml`

## Validation checklist
- `npm run lint`
- `npm run build`
- Verify routine lock confirmation on routine switch
- Verify logs are partitioned by routine
- Verify media internet search and save URL flow
