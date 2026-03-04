# AGENTS.md — training-app

## Owner
- GitHub: `julioccv13`
- Repo: `julioccv13/training-app`

## Project goal
Mobile-first PWA for iPhone browser usage with:
- 4-day editable training routine
- Local workout logging (sets/reps/weight/RPE/rest/notes)
- Media catalog (images/videos) from `~/workspace/personal/docs/training app`
- Media roles: `single`, `multi`, `reference` with multi-exercise associations

## Paths
- Repo root: `~/workspace/personal/training app`
- Source docs/media: `~/workspace/personal/docs/training app/media`
- Task logs: `~/workspace/personal/docs/training app/tasks`

## Rules
- Git provider: GitHub only (`gh`, SSH only)
- Do not change or create branches unless Julio explicitly asks
- Commit messages: short and simple English
- Keep no secrets or personal sensitive data in repo

## Deploy
- Target: GitHub Pages
- Build: `npm run build`
- Publish: `.github/workflows/deploy-pages.yml`

## Validation checklist
- `npm run lint`
- `npm run build`
- Smoke test in iPhone Safari or responsive browser
- Verify single/multi video behavior in workout screen
