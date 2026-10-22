# Design system

Living specs for chrome UI. **Spec before code** for every new chrome element (snackbar, dialog, upload zone, stepper, …). Do not reverse-engineer layout from image2colors.com → that snackbar path is a warning; chrome **structure** (header/footer bars) may follow it.

Rules:

- Spec lives here (or a linked file under `docs/concepts/`), not only in component comments.
- No ship without tests (BDD at minimum; device lab later where relevant).
- **This document** is English only; no numbering in section titles.
- **Product UI** is bilingual: `en` (default) + `de`, locale persisted — copy in the app goes through i18n keys (see guidelines). Specs here describe behaviour/placement, not DE/EN string tables.

### Stable dismiss controls (UX lock)

For anything the user can close (snackbar, modal, drawer, future stacked toasts, …):

- Put the dismiss control in a **fixed corner of that surface** — default **top-end (top-right in LTR)**.
- Position must **not** depend on message length, line wrap, or content height.
- Same family of surfaces must share the **same inset / size**, so when several appear (or replace each other), the user can dismiss with repeated clicks **without moving the pointer**.
- Content must leave a reserved gutter so text never sits under the control.

---

## Tokens (app chrome)

Source of truth for names and values: `src/styles.scss`. The table lists the core tokens; the file also holds the glass tokens (`--ds-glass-*`, blurred translucent surfaces with a gradient top edge) and the dialog head gradient (`--ds-modal-head-bg`).

| Token | Value | Use |
| --- | --- | --- |
| `--ds-bg-page` | `#060b14` | App page background |
| `--ds-bg-panel` | `#0c1628` | Panels, chrome bars |
| `--ds-border` | `#1a3050` | Subtle borders |
| `--ds-accent` | `#7ecfff` | Focus, links, accents |
| `--ds-text` | `#e8f4ff` | Primary text |
| `--ds-text-muted` | `#7a9ab8` | Secondary text |
| `--ds-success` | `#3dd68c` | Success snackbar accent |
| `--ds-danger` | `#ff6b7a` | Error snackbar accent |
| `--ds-header-min-height` | `3.5rem` | Header bar min height (desktop) |
| `--ds-footer-height` | `2.75rem` | Footer bar height (content; safe-area extra) |
| `--ds-panel-width` | `21rem` | Side panel width when docked |
| `--ds-work-min-height` | `37.5rem` | Assumed min useful work-area height (~600px) for panel tab sizing |
| `--ds-side-by-side-min` | `60rem` | Min viewport width for preview ‖ panel docked |
| `--ds-safe-top` | `env(safe-area-inset-top, 0px)` | Notch |
| `--ds-safe-bottom` | `env(safe-area-inset-bottom, 0px)` | Home indicator |
| `--ds-radius` | `0.25rem` | Controls, snackbar, chrome (email iframe unchanged) |
| `--ds-z-footer` | `40` | Footer chrome |
| `--ds-z-header` | `40` | Header chrome |
| `--ds-z-panel-overlay` | `45` | Side panel when undocked overlay |
| `--ds-z-snackbar` | `50` | Above footer, below modal |
| `--ds-z-modal` | `60` | Legal / future dialogs |

---

## App shell layout

### Intent

Viewport-locked chrome (image2colors-style header/footer). One intentional scroll owner per region. Kill double page + preview scrollbars. Room for a right **side panel** and the **language menu** without reflowing the shell.

### Height model

```text
html, body, app-root → height 100%; overflow: hidden (no page scrollbar)
.app-shell → display: grid; height: 100dvh; overflow: clip
             grid-template-rows: auto minmax(0, 1fr) auto
```

| Region | Grid row | Scroll |
| --- | --- | --- |
| Header | `auto` | none |
| Main / work | `minmax(0, 1fr)` | none on the row itself; children own scroll |
| Footer | `auto` | none |

Use `100dvh` with `100vh` fallback. `overflow: clip` on the shell (not only `hidden`) so programmatic `scrollIntoView` cannot scroll the shell.

### Main / work area

```text
.work-area → height 100%; min-height: 0; display: grid
  wide (≥ --ds-side-by-side-min):  columns minmax(0,1fr) var(--ds-panel-width)
  narrow:                          columns minmax(0,1fr)  (panel overlays)
```

| Pane | Role | Scroll |
| --- | --- | --- |
| Preview | iframe `srcdoc` email document, `height: 100%`, `min-height: 0` | **Only** email document scroll (iframe) |
| Side panel | Block list, catalog and settings tabs | **Target: none** — split into tabs so content fits assumed min work height |

Do **not** give the preview host `overflow: auto` and a tall iframe (`min(80vh)` etc.) — that reintroduces double scrollbars.

### Side panel behaviour

- **Wide:** docked right column; collapsible.
- **Narrow:** not stacked under the preview. **Show/hide overlay/drawer** over the preview (`--ds-z-panel-overlay`).
- **Collapse rail:** always-visible leftmost column inside the side panel (`side-panel-rail`) with a **prominent ice-blue `»` toggle** (high contrast, not muted chrome). The rail stays when the panel body is collapsed so sellers can still find the control.
- **Mobile default:** when no stored collapse preference exists and the viewport is below `--ds-side-by-side-min`, start **collapsed**.
- **Resize:** user-draggable left edge. Width clamped from `--ds-panel-width` (min, `21rem` / 336px default) to **50% of the browser viewport width**. Persist open width in `localStorage` (`newsletter-template-editor.side-panel-width.v1`). Resize handle is hidden while collapsed.
- **Tabs:** Current blocks, All blocks, Campaign, Brand, Colors, Legal, Social (seven; short labels such as "Current" and "All" where space is tight). Tab chrome uses connected tab shapes (not plain button chips). Emergency overflow on short viewports may use panel scroll as exception.
- **Field chrome sizes:** user-resized heights (e.g. Campaign inbox preview textarea) persist in `localStorage` (`newsletter-template-editor.field-heights.v1`).

### Catalog drag into preview

- **All blocks** is a palette: drag into the email preview; plain click is inert.
- Payload: custom MIME `application/x-nte-catalog-type` only (never `text/plain` — browsers would hand it to the address bar / new-tab search).
- **Drop zones (stable geometry):**
  - Pointer **inside** `table.email-container` (600px presentation column) → nearest `tr.nte-block` by Y → **Insert here** (gold gap, neighbor rows shift apart, label pill).
  - Pointer **outside** that column → **Insert at end** floating chip.
  - Do **not** resolve via `event.target.closest('tr.nte-block')` (nested tables + transform gaps cause flicker).
- Insert chrome color: gold `#f5c518` (distinct from selected-block turquoise `#20d4c8`).
- Escape / drop outside app → cancel; catalog card return pulse. Successful insert scrolls the new block into view.
- Implementation: `preview-dnd.ts` (`resolveDropAtPoint`), `catalog-drag.service.ts`, `editor.page.ts`, `PREVIEW_EDITOR_CHROME` in `shell.ts`.

### Header

Inspired by image2colors header bar (brand left, actions right), editor-specific content:

```text
Editor:      [ ⌂ title · template name · save state ]  [ Undo / Redo ]  [ Save ⌘S ] [ Export HTML ] [ ☰ menu ]  [ 🌐 language ]
Start page:  [ title ]                                                   [ ☰ start menu ]                     [ 🌐 language ]
```

- One bar on iPad/desktop when space allows; toolbar **flex-wrap**s on narrow widths (not a second permanent toolbar row unless wrap requires it).
- Shell/work layout uses **CSS Grid**; header action cluster uses **Flexbox** + wrap.
- Editor: the title links back to the start page; next to it the template name and the save state ("Not saved" / "Saved"). Toolbar: **Undo / Redo**, then **Save** (with shortcut) and **Export HTML** as buttons, then the ☰ menu (`file-management.md`). The **language menu** is rightmost on every page.
- No theme toggle for the app chrome (Glacier dark only). The email Dark / Light color set is chosen in the Colors tab (`email-colors.md`), not in app chrome.
- Safe-area: `padding-top: var(--ds-safe-top)`.

### Footer

```text
[ ]   HOME · IMPRESSUM · PRIVACY · ABOUT   [ version ]
```

- Structure like image2colors: 3-column grid `1fr auto 1fr`; links centered; version bottom-right.
- **Impressum** / **Privacy** → modal dialogs (adapted copy; Privacy has **no analytics / no GoatCounter**).
- **About** → **routed page** `/about` (SEO / Search Console). Same shell chrome.
- Version: `APP_VERSION` (`aria-label` application version); `data-testid="app-version"`.
- Height: `var(--ds-footer-height)` + `padding-bottom: var(--ds-safe-bottom)`.
- Footer is in normal shell grid flow (not `position: fixed`), so snackbar offset still uses the same token math.

### Product rule (editability)

Every newsletter building block and every shell field (brand, logo, colors, legal lines, preheader, …) is data-driven and editable via UI later. Renderer must not hardcode CloudLib-only chrome. Layout does not embed locked content.

### Mobile summary

- Same shell grid; no document scroll.
- Email scrolls inside iframe only.
- Panel: overlay toggle when undocked.
- Toolbar wraps; locale stays reachable (header end).

### Tests (shell)

- BDD: home title; footer version; snackbar fixed above footer; **document/body does not scroll** (overflow hidden / scrollY stays 0 with tall preview).
- BDD: About route shows About content; Impressum/Privacy open a dialog.
- BDD: language menu present in the header; switching changes chrome strings.

### Implementation map

- Spec: this section
- Shell: `src/app/app.*`
- Editor work area: `src/app/pages/editor/`
- About: `src/app/pages/about/`
- Legal modal: `src/app/ui/legal-modal/`
- Tokens: `src/styles.scss`

---

## App footer (version)

- **Placement:** footer bar, version label **end** (right in LTR).
- **Content:** `APP_VERSION` string (e.g. `v0.1.0` locally, tag name on Pages builds).
- **Behavior:** does not scroll away; part of shell grid.
- **A11y:** plain text; `aria-label` application version.

---

## Snackbar

### Intent

Short, professional feedback after user actions (Save, export, errors). Must be obvious on desktop, iPad, and phone without stealing focus from the editor or jumping the page scroll.

### Placement

- **Viewport:** `position: fixed` — **never** in normal document flow (no layout shift, no scroll-to-bottom).
- **Horizontal:** **full viewport width** (edge to edge), same visual weight as modal headers — not a small floating chip.
- **Vertical:** bottom of the **visual viewport**, **above** the version footer:

```text
bottom = var(--ds-footer-height) + var(--ds-safe-bottom)
```

- Docked directly on the footer: no gap, so no slit of page background shows between bar and footer.
- One message on screen; up to ten are kept (`SNACKBAR_MAX_KEPT`) and can be paged with ‹ / ›.

### Anatomy

- Surface: dialog-head gradient `--ds-modal-head-bg`. Text `--ds-modal-head-color`.
- Row, left to right: tone chip (icon + label), message (start-aligned, may wrap), optional action (e.g. Undo), pager `‹ 2 / 3 ›` when more than one is kept, dismiss ×.
- Tone uses status colors only (`--ds-accent` info, `--ds-success`, `--ds-danger`), never block-type tints.
- **Timer line** along the top edge, glowing in the tone color: depletes left→right over the auto-dismiss duration. Each kept message has its own line, so paging back shows its real remaining time.
- Role: `status` for info/success (polite); `alert` for error (assertive).

### States

| State | Behavior |
| --- | --- |
| hidden | not rendered |
| enter | fade + slight rise (~150–200ms), reduced-motion → instant opacity |
| visible | auto-dismiss timer default **3s** (later UI-configurable); timers of all kept messages **and** the progress animation pause on hover/focus and resume with remaining time |
| leave | remove when timer ends or dismiss; the next kept message takes its place |
| new message | shown at once; older ones stay reachable by paging (max ten kept, oldest dropped) |

### Motion

- Prefer `transform` + `opacity` only.
- Honor `prefers-reduced-motion: reduce` (no translate, opacity only or instant).

### Interaction

- Does **not** move focus from the control that triggered it (toolbar buttons keep focus).
- Dismiss: timer, Escape (when snackbar is showing), or dismiss button.
- Clicks on snackbar do not scroll the page.

### Mobile / safe area

- Always account for `safe-area-inset-bottom`.
- Must remain fully visible above virtual keyboard when possible; if visualViewport shrinks, bottom offset still uses footer + safe area (no covering by home indicator).
- Touch target for dismiss ≥ 44×44 CSS px.

### Anti-patterns (image-to-colors lessons)

- Do not pin snackbar in a scrolling column that pushes content.
- Do not hide under ads bars, notches, or footers.
- Do not ship without a BDD scenario for show/message/placement intent.
- Do not copy ad-hoc z-index wars — use design tokens only.

### Tests (required)

- BDD: action (e.g. Save) → snackbar visible with expected text; snackbar is fixed / not causing scroll jump (document scrollY unchanged).
- Unit: kept-message limit, paging, per-message timers, pause/resume, default durations.

### Implementation map

- Spec: this file
- Service: `src/app/ui/snackbar/snackbar.service.ts`
- Component: `src/app/ui/snackbar/snackbar.component.*`
- Host: root `App` template (one outlet)

---

## Language menu (UI locale)

Product: **English (default)** and **German** today; more languages show as "Coming soon" until their catalog exists (`PLANNED_LOCALES` in `src/app/i18n/languages.ts`). Choice stored in `localStorage` and restored on load. Runtime switch, not a build per locale.

### Placement and look

- **Header, rightmost** on every page. Trigger: globe plus the active language.
- Opens a glass dropdown in the same family as the ☰ menus: eyebrow, title, sections "Available" and "Coming soon". Each entry shows the name in its own language (endonym) and in the current UI language. No country flags for languages.
- A search field appears from `LANGUAGE_SEARCH_MIN` (8) languages on.
- Each endonym renders with its own `lang` and `dir` attributes.

### Behaviour

- Changing the language updates chrome strings at once and sets `document.documentElement.lang`.
- Does **not** rewrite newsletter content in the preview.
- Invalid stored values fall back to `en`. Storage key: `newsletter-template-editor.locale.v1`.
- The factory reset keeps the language.

### Implementation map

- Menu: `src/app/shell/language-menu.component.*`
- Languages and planned list: `src/app/i18n/languages.ts`
- Catalogs and service: `src/app/i18n/`
- Guidelines: `docs/guidelines/angular-implementation-guidelines.md` (Internationalisation)

---

## Legal dialogs and About

| Item | Surface | Notes |
| --- | --- | --- |
| Impressum | Modal (`<dialog>`) | Includes operator data + Buy me a coffee; tech blurb for this editor |
| Privacy | Modal | localStorage prefs only; **explicitly no analytics** |
| About | Route `/about` | Short product blurb; MIT; repo link; no community hub page |

Modals: focus trap via native dialog; Escape/backdrop close; titled with `aria-labelledby`.

### Pages SPA note

Production `baseHref` is `/newsletter-template-editor/`. Deploy must ship a `404.html` that is a copy of `index.html` so deep links like `/about` resolve on GitHub Pages.

---

## Reset dialog

Mockup R4 variant B (`docs/mockups/block-editor/r4-reset-dialog.html`), decisions 63 to 67 in `block-editor-and-demo-page.md`.

- Same glass dialog as the confirm dialog (it reuses `confirm-dialog.component.scss`): danger tone, eyebrow "Delete", close X top-end, width up to 33rem, body scrolls.
- Order: lead sentence, save box (accent; success after saving with file name and contents; danger with `role="alert"` when saving failed; "Selected: …" line, amber line when the selection changed since saving), "What should be deleted?" with "All | None", list of kinds (checkbox, icon tile, label, one-line description, count pill red while checked), "The app language is kept.", hints, amber acknowledge box, footer Cancel and Delete.
- Phones (≤ 40rem): sheet from the bottom, save button under its text, Delete above Cancel.
- Start page message after the reload: success or danger box above the title, close X in the fixed top-end corner, "Open backup…" when a file was saved.
- Implementation: `src/app/shell/reset/`, start page message in `src/app/pages/start/`.

## Future chrome (stubs only — specify before build)

- Library row secondary line: date/time + app version (`createdWithAppVersion`, not stored yet; see `file-management.md`)
- Block editor page and demo page (`block-editor-and-demo-page.md`)
