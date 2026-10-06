# Newsletter Template Editor

MIT-licensed editor for **ListMonk-style HTML email**.

Demo template: **CloudLib Newsletter** (config defaults only — fully overridable, not a locked shell).

Live demo: [nxpatterns.github.io/newsletter-template-editor](https://nxpatterns.github.io/newsletter-template-editor/)

App version is shown **bottom-right** in the footer (local `vX.Y.Z` from `package.json`, release builds use the git tag).

## Requirements

- Node.js 22+ (CI uses 24)
- npm 11+

## Setup

```bash
npm install
```

First time only, install the Playwright browser used by BDD:

```bash
npx playwright install chromium
```

## Run locally

```bash
npm start
```

Open [http://localhost:4200/](http://localhost:4200/).

## Test

Unit tests (Vitest via Angular):

```bash
npm test
```

One-shot (no watch):

```bash
npm test -- --watch=false
```

Browser BDD (playwright-bdd; starts `ng serve` on port 4173):

```bash
npm run test:bdd
```

## Build

```bash
npm run build
```

Production output: `dist/newsletter-template-editor/browser`  
(`baseHref` `/newsletter-template-editor/` for GitHub Pages).

`prestart` / `prebuild` write `src/environments/app-version.ts` from `package.json` (or `APP_VERSION` env).

## Release and deploy

**Doc-only and normal `main` pushes do not deploy.**  
Pages updates only on version tags `v*` (same idea as image-to-colors).

### Cut a release (recommended)

1. On GitHub → **Actions** → **Release Preparation** → Run workflow on `main`.
2. Choose bump: `patch` / `minor` / `major`, or `set` + version `X.Y.Z`.
3. Workflow bumps `package.json`, commits `chore(release): vX.Y.Z`, pushes tag `vX.Y.Z`.
4. Tag push triggers **Release Deployment** (tests → build → GitHub Pages).

### Manual tag (optional)

```bash
# after version is correct in package.json
node scripts/write-app-version.mjs
git add package.json package-lock.json src/environments/app-version.ts
git commit -m "chore(release): v0.1.0"
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin main --tags
```

### Manual deploy without a new tag

Actions → **Release Deployment** → `workflow_dispatch` (uses `package.json` version for the footer).

Repo settings: **Pages → Source = GitHub Actions**.  
Pages 404 troubleshooting: `docs/knowledge-corner/GitHub-Deployments/ReadMe.md`.

UI chrome specs (snackbar, footer): `docs/concepts/design-system.md`.

## Stack

- Angular 22+ (standalone, zoneless, SCSS)
- `@angular/aria` + `@angular/cdk`
- Domain core: pure TS renderer + localStorage
- Design system snackbar (bottom-center, above footer)
- Tests: Vitest + playwright-bdd
- Hosting: GitHub Actions → GitHub Pages (**tag releases only**)
