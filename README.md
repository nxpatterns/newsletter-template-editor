# Newsletter Template Editor

MIT-licensed newsletter template editor for ListMonk-style HTML email.

Demo brand: **CloudLib.EU** (fully customizable via config — not a locked shell).

## Development

```bash
npm install
npm start
```

App: `http://localhost:4200/`

## Build

```bash
npm run build
```

Production build uses `baseHref` `/newsletter-template-editor/` for GitHub Pages:

`https://nxpatterns.github.io/newsletter-template-editor/`

## Test

```bash
npm test
```

## Stack

- Angular 22+ (standalone, zoneless, SCSS)
- Static deploy via GitHub Actions → GitHub Pages
- Persistence: localStorage (planned)
