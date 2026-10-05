# Angular Implementation Guidelines

Stack for **this** repo: Angular **22.2+**, zoneless, standalone, signals, SCSS, Angular Aria, Angular CDK, TypeScript strict, Vitest, playwright-bdd.

You write NEW code. Everything must be correct from the first line. Apply every rule below.  
If a rule conflicts with the task, say so in one sentence and ask. Do not silently deviate.  
Do not add dependencies, change tooling, or make architectural choices that are not specified here or in the living plan. Present options and wait.  
Do not add comments unless the logic is non-obvious. Never add comments that restate the code.

**Read with:**

| Doc | Role |
| --- | --- |
| `AGENTS.md` | Project one-liner, no-env rule, session/docs conventions |
| `docs/sessions/implementation-plan.md` | Roadmap and hard product rules |
| `docs/sessions/next-session.md` | Current slice only |
| `docs/concepts/design-system.md` | Chrome UI specs (tokens, snackbar, footer, shell layout) |
| `docs/knowledge-corner/GitHub-Deployments/ReadMe.md` | Pages deploy pitfalls |

**Repository docs** (markdown under `docs/`, `AGENTS.md`, README): **English only**. No numbering in documentation section titles.  
**Product UI**: **German + English**, default **English**, user choice **persisted** (see Internationalisation).

---

## Single responsibility (highest priority)

One unit, one reason to change. Applies to files, classes, functions, templates, and stylesheets.

- One exported class per file. One component per file.
- A component does exactly one of:
  - **Container**: gets data (injects services), holds view state, passes it down. Little or no markup of its own.
  - **Presentational**: inputs in, outputs out. No service injection except UI-only ones (e.g. `DOCUMENT`, CDK helpers, `SnackbarService` for display). No business/domain rules.
- **Domain / email logic** lives in `src/core/` as pure TypeScript (or thin Angular services that call pure functions). Never put ListMonk HTML rules, brand tokens, or render logic in components.
- A service has one domain responsibility. If its name needs "and" or "Manager"/"Helper"/"Utils", split it.
- Pure logic (formatting, mapping, validation, HTML render helpers) goes into standalone pure functions so it can be tested without TestBed.
- Functions do one thing, take few parameters (3 max; otherwise pass an object), and avoid boolean flag parameters.

Recommended size limits (split before exceeding, exceptions possible):

| Artifact | Limit |
| --- | --- |
| Component class | 150 lines |
| Component template | 100 lines |
| Component SCSS | 80 lines |
| Service | 200 lines |
| Function | 30 lines |

When a template section has its own inputs and could be named, extract a child component.  
When a component has more than about 5 inputs, ask whether it does more than one job.

---

## Project structure (this repository)

**Do not invent a foreign monorepo layout.** Fit code into what we already use and grow it deliberately.

```text
src/
  app/                 # Angular application shell + routes
    i18n/              # locale service + en/de catalogs (runtime UI strings)
    ui/                # Reusable chrome widgets (snackbar, …)
    *.ts|html|scss     # Root shell for now; split into feature folders when 3b lands
  core/                # Framework-agnostic domain (newsletter JSON → email HTML)
    brand/
    render/
    persist/
    types, seed, …
  environments/        # Generated app-version only (no secrets, no .env files)
  styles.scss          # Global tokens / reset (see design-system.md)
  main.ts
tests/
  bdd/                 # playwright-bdd features + steps
scripts/               # version write/bump, release helpers
docs/
  concepts/            # design-system and product concepts
  guidelines/          # this file
  knowledge-corner/    # operational knowledge (e.g. Pages deploy)
  sessions/            # local session notes (often gitignored)
.github/workflows/     # tag deploy + release prep
```

Rules:

- **Group by feature when editor UI grows**, under `src/app/` (e.g. `src/app/editor/`, `src/app/preview/`). Prefer feature folders over type-only folders (`components/`, `services/` dumping grounds).
- **`src/core/` is domain**, not “Angular CoreModule”. No HTTP interceptors or auth here unless the product gains them later — keep pure TS.
- **`src/app/ui/`** holds shared chrome used by the shell (and later features). Put something here only when at least two call sites need it, or it is clearly global chrome (snackbar).
- Features (when they exist) import from `core/` and `app/ui/`. Features do not import each other; promote shared pieces instead.
- CLI default file naming, kebab-case. Co-locate: `x.ts`, `x.html`, `x.scss`, `x.spec.ts`. External template/style files (not inline), except trivial test templates.
- Barrel `index.ts` only at a real public boundary (e.g. `src/core/index.ts`), not every folder.
- Prefer short relative imports within a feature. Path aliases only if already configured in `tsconfig` — do not add aliases casually.
- **No `.env` / env files ever** (`AGENTS.md`). Version comes from `scripts/write-app-version.mjs` → `src/environments/app-version.ts`. Build-time `APP_VERSION` env is OK in CI only.

---

## Components

- Standalone only. No NgModules. Do not set `standalone: true` (default).
- Zoneless. No `zone.js`, no `NgZone`, no reliance on zone-patched async. State the template reads must be signals (or signal-based APIs).
- `ChangeDetectionStrategy.OnPush` always.
- Use `inject()`, never constructor injection for DI.
- Use `input()`, `input.required()`, `output()`, `model()`, `viewChild()`, `viewChildren()`, `contentChild()`. Never `@Input`, `@Output`, `@ViewChild`, `@HostBinding`, `@HostListener` for new code — put host bindings/listeners in the `host` metadata object.
- Mark injected services, inputs, outputs, and signals `readonly`.
- Visibility: `protected` for template-only members, `private` for internals, `public` only for real API.
- Derived state: `computed()`. Writable derived that resets with inputs: `linkedSignal()`.
- `effect()` only for side effects outside the signal graph (DOM glue, logging, storage bridges). Never use `effect` to set other signals — use `computed` / `linkedSignal`.
- No logic in constructors beyond field init / registering `afterNextRender`. Prefer signals, `computed`, `resource` / router resources over ritual `ngOnInit`.
- No manual `subscribe()` in components. If RxJS is unavoidable, `toSignal()` or `takeUntilDestroyed()`.
- Never mutate inputs. Update signals with `.set()` / `.update()` immutably.
- No `any`. No non-null assertion `!` to silence the compiler. Prefer `unknown` + narrowing.

### Error boundaries (Angular 22.2+)

- Use **error boundaries** for try/catch-style handling in templates around fallible UI regions (editor panes, lazy islands, third-party embeds).
- Fail a **region**, not the whole app, when a child throws during render or a bound operation fails.
- Pair with an explicit error UI (message + recovery action). Do not leave a blank hole.
- Check current `angular.dev` API before writing; do not invent directive/component names from memory.
- Domain/render errors in `src/core` stay normal TypeScript throws/results — boundaries wrap **Angular views**, not pure functions.

---

## Templates

### Control flow

- Only built-in control flow: `@if`, `@else`, `@for`, `@switch` / `@case` / `@default`, `@defer`, `@let`.
- Never `*ngIf`, `*ngFor`, `[ngSwitch]` for new code.
- `@for` always has `track` with a stable id (`track item.id`). Primitives: `track item`. Last resort: `track $index`. Use `@empty` when useful.
- `@let` for expressions used more than once (no getters for template convenience).
- `@defer` for heavy / below-the-fold UI; provide `@placeholder` / `@loading` when layout would jump.

### Bindings

- No function calls in templates except signal reads (and approved pipes). Everything else is `computed()` or a pure pipe.
- No complex expressions; more than one operator → `computed()`.
- Prefer `class.x` / `style.x` over `[ngClass]` / `[ngStyle]`.
- No `$any()`.

### Text content

- Prefer explicit bindings for dynamic text via the i18n API (see Internationalisation), e.g.:

```html
<h1 [textContent]="i18n.t('shell.title')"></h1>
```

- No new hardcoded user-visible chrome strings in templates or TypeScript once the i18n module exists. Until the first i18n slice lands, do not pile on more English-only literals in new UI — batch strings into keys.

---

## State, data, and services

- Signals are the default state primitive. RxJS only for genuine streams and library boundaries.
- Services: `providedIn: 'root'` for app-wide; component `providers` for instance scope.
- Expose state as readonly signals (`asReadonly()`). Mutations only via named methods on the owner.
- **This app is static-first** (GitHub Pages). No backend assumed. Persistence v0 = `localStorage` via `src/core/persist`. Do not add HTTP clients “just in case”.
- When HTTP appears later: `httpResource()` / `resource()` for reads; `HttpClient` in services for writes; functional interceptors/guards only.
- Model loading / error / empty states explicitly in the UI.
- Map any external DTO to domain types at the boundary. Components speak **domain** (`Newsletter`, blocks), not transport shapes.
- Forms: prefer **Signal Forms** (v22) for new forms when the editor inspector lands. Check `angular.dev` for current signatures; do not guess. No new template-driven forms.

### Router and router resources (Angular 22.2+)

- Lazy `loadComponent` / `loadChildren` when routes multiply beyond the shell.
- Prefer **signal-based route data loading** (router resources / resource-style route APIs in 22.2+) over legacy class resolvers and manual subscribe-to-params patterns.
- Route params via component input binding where applicable; typed route data.
- Keep the shell simple until Phase 3b needs real routes; do not add empty feature-route scaffolding.

---

## Accessibility, Angular Aria, and CDK

- Native HTML first (`button`, `a`, `input`, `dialog`, …). Never `div` + click as a button.
- Pattern widgets (listbox, menu, tabs, toolbar, …): **Angular Aria** first. Do not hand-roll keyboard/ARIA that Aria already covers. Look up APIs on angular.dev.
- **CDK** for: overlay/positioning, focus trap/monitor, live announcer, scrolling/virtual scroll, drag-drop, breakpoints, clipboard, portal.
- **No Angular Material** unless explicitly decided (not in stack).
- Every control has an accessible name; icon-only buttons need `aria-label`.
- Visible `:focus-visible` styles. Never `outline: none` without a replacement.
- Contrast ≥ 4.5:1 for text. Honor `prefers-reduced-motion` (see design-system snackbar).
- Full keyboard use; no positive `tabindex`.

Chrome placement and motion: **`docs/concepts/design-system.md`** is authoritative (snackbar bottom-center above footer, version footer, future shell layout). Spec before code for new chrome.

---

## SCSS

- Component styles in the component `.scss` (default encapsulation). Stay near the size limit; extract mixins/tokens rather than growing files.
- **Design tokens** live as CSS custom properties. Source of truth for names/values: `docs/concepts/design-system.md` and global `src/styles.scss` (or future `src/styles/` partials).
- No magic hex/spacing in components once a token exists — use `var(--ds-…)`.
- When shared SCSS grows, introduce `src/styles/abstracts/` (`_tokens`, `_mixins`, …) with `@use` / `@forward` only (never `@import`).
- Nesting depth max 3. Prefer a class on the element over long descendant chains.
- Never `::ng-deep`. Never `!important`.
- Prefer logical properties (`margin-inline`, `padding-block`, …).
- Layout with flexbox/grid/`gap`. Set `:host { display: … }` explicitly.
- Style states via native pseudos / ARIA attributes (`:disabled`, `:focus-visible`, `[aria-expanded='true']`).

---

## Internationalisation

### Product decision (locked)

| Concern | Rule |
| --- | --- |
| Locales | `en` (default), `de` |
| Default | **English** on first visit / unknown stored value |
| Switching | Runtime in the app (no full page rebuild / no separate deploy per locale) |
| Persistence | Store locale in `localStorage` (same privacy model as newsletter draft); restore on load |
| `lang` / a11y | Update `document.documentElement.lang` when locale changes |
| Repo docs | Stay English-only (`AGENTS.md`) — not the same as product UI |

### Architecture (fit this repo)

- Own a small **locale service** under `src/app/` (e.g. `src/app/i18n/`): current locale signal, `setLocale`, load/persist, `t(key, params?)`.
- Message catalogs as static typed maps or JSON imported by the bundle (fine for two locales on Pages). No `.env`. No network fetch required for v0.
- Prefer **runtime dictionaries + signals** over Angular build-time `$localize` multi-build (build-time i18n fights in-app language toggle).
- Library (Transloco / ngx-translate / custom): choose explicitly when implementing the first i18n slice; MIT-friendly only. Do not add a lib “in passing” during unrelated work.
- **Email body content** (newsletter blocks, brand HTML, ListMonk export) is **author content**, not UI chrome — not auto-translated by the locale switcher. Optional later: UI labels inside the editor only.
- Seed/demo copy may stay bilingual or EN-first in data; do not couple renderer output language to UI locale unless product asks for it.

### String rules (from first i18n-aware UI change)

- Every user-visible chrome string is a **semantic key**: `area.element[.state]` (e.g. `shell.title`, `action.save`, `snackbar.saved`).
- One key = one full sentence/phrase. **No** concatenating translated fragments. Use params: `t('blocks.count', { count })`.
- Translate also: `aria-label`, `title`, `placeholder`, `alt`, snackbar messages, dialog copy, empty states.
- Do not translate: icon ligature names, pure numbers/symbols, CSS class names, technical ids, `APP_VERSION`.
- Dates/numbers in UI: locale-aware formatting when shown as chrome (not inside email HTML unless specified).
- BDD: assert via stable `data-testid` / roles where possible; when asserting text, cover at least **default English**; add a DE scenario when the switcher ships.

### Language switcher chrome

- Spec placement in `docs/concepts/design-system.md` before coding (likely header/toolbar or footer-adjacent; must not break layout scroll rules).
- Persist immediately on change; announce via live region / snackbar optional, not required for v0.

---

## TypeScript

- Keep `strict` and Angular `strictTemplates`. Do not weaken them.
- `interface` for object shapes; `type` for unions/utilities. Prefer string-literal unions over `enum`.
- `readonly` / `as const` by default; immutable updates.
- Prefer `unknown` to `any`. Narrow with guards. Assertions only at validated boundaries.
- Named exports only (unless a tool forces default).
- Domain types for the newsletter live under `src/core` and stay framework-free.

---

## Testing

- **Unit:** Vitest via `ng test`. Co-locate `*.spec.ts`.
  - Pure `src/core` functions: plain unit tests, no TestBed.
  - Components: behaviour via DOM + public API; zoneless → `await fixture.whenStable()`.
- **BDD:** playwright-bdd under `tests/bdd/` (`createBdd` only; see implementation plan conventions). `npm run test:bdd`.
- Prefer Aria/CDK harnesses when they exist.
- Every bug fix ships with a failing-first test when practical.
- Chrome elements (snackbar, layout): BDD coverage required per design-system rules.

---

## Performance and security

- Lazy-load routes when the tree grows. `@defer` for heavy widgets.
- CDK virtual scroll for long block lists when needed.
- **Sanitization:** never `bypassSecurityTrust*` for untrusted input.  
  **Allowed exception (this product):** email HTML produced solely by `src/core` renderers may be bound into the preview iframe via a documented trusted path (e.g. `bypassSecurityTrustHtml` on `srcdoc`). Never pipe user-raw HTML or `outerHTML` round-trips into that path (see implementation-plan hard rules).
- No secrets in the client bundle. No `.env` files.
- Before adding a dependency: licence must allow MIT-friendly OSS use; stop and report if unclear or commercial-only.

---

## Domain-specific rules (newsletter)

These override generic web-app habits when they conflict:

- JSON blocks + brand/globals = source of truth; HTML is **generated** export only.
- Never treat free HTML as edit source (no DOMParser / outerHTML as model).
- Brand only via config (CloudLib demo defaults OK; no CloudLib hardcoded in render logic).
- `escapeAttr` must not break `{{ TrackLink "url" }}` (raw quotes inside the expression).
- Table email HTML, inline styles, dark-mode meta/`bgcolor`/classes preserved.
- Preheader immediately after `<body>` in export shell.
- Dual render modes: `preview` vs `export` (ListMonk tokens only in export where required).

---

## Definition of done

Before returning code, verify:

- Each file has one responsibility and is within size limits (or an exception was agreed).
- No `any`, no legacy structural directives for new UI, no decorator inputs/outputs/host in new code, no manual `subscribe` in components.
- `@for` has `track`. Interactive elements are native or Aria-based, labelled, keyboard operable.
- SCSS uses design tokens; no `::ng-deep`, no `!important`.
- Domain rules above still hold; renderer tests cover TrackLink / brand isolation when render code changes.
- Specs exist for new chrome (design-system) and new logic (unit and/or BDD).
- New user-visible chrome uses i18n keys (en + de) once `src/app/i18n` exists; locale default `en` and persistence respected.
- `npm test -- --watch=false` green for touched areas; BDD green when UI behaviour changed.
- No drive-by dependency or tooling changes.
