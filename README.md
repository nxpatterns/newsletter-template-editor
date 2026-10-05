# Newsletter Template Editor

MIT-licensed editor for **ListMonk-style HTML email**.

Demo brand: **CloudLib Newsletter** (config defaults only — fully overridable, not a locked shell).

Live demo: [nxpatterns.github.io/newsletter-template-editor](https://nxpatterns.github.io/newsletter-template-editor/)

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

## Deploy

Deploy is automatic on push to `main` (GitHub Actions → GitHub Pages).

Manual run from the Actions tab: workflow **Deploy to GitHub Pages**, or:

```bash
gh workflow run deploy.yml --ref main
gh run watch
```

Repo settings: **Pages → Source = GitHub Actions**.  
If deploy fails with a Pages 404, see `docs/knowledge-corner/GitHub-Deployments/ReadMe.md`.

## Stack

- Angular 22+ (standalone, zoneless, SCSS)
- `@angular/aria` + `@angular/cdk`
- Domain core: pure TS renderer + localStorage
- Tests: Vitest + playwright-bdd
- Hosting: GitHub Actions → GitHub Pages
