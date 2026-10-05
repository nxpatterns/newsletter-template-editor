# Design system

Living specs for chrome UI. **Spec before code** for every new chrome element (snackbar, dialog, upload zone, stepper, …). Do not reverse-engineer layout from image-to-colors — that snackbar path is a warning.

Rules:

- Spec lives here (or a linked file under `docs/concepts/`), not only in component comments.
- No ship without tests (BDD at minimum; device lab later where relevant).
- English only; no numbering in section titles.

---

## Tokens (app chrome)

| Token | Value | Use |
| --- | --- | --- |
| `--ds-bg-page` | `#060b14` | App page background |
| `--ds-bg-panel` | `#0c1628` | Panels, snackbar surface |
| `--ds-border` | `#1a3050` | Subtle borders |
| `--ds-accent` | `#7ecfff` | Focus, links, accents |
| `--ds-text` | `#e8f4ff` | Primary text |
| `--ds-text-muted` | `#7a9ab8` | Secondary text |
| `--ds-success` | `#3dd68c` | Success snackbar accent |
| `--ds-danger` | `#ff6b7a` | Error snackbar accent |
| `--ds-footer-height` | `2.5rem` | Reserved bottom chrome (version footer) |
| `--ds-snackbar-gap` | `0.75rem` | Gap between snackbar bottom and footer top |
| `--ds-safe-bottom` | `env(safe-area-inset-bottom, 0px)` | Home indicator / notch |
| `--ds-radius` | `0.5rem` | Controls, snackbar |
| `--ds-z-footer` | `40` | Version footer |
| `--ds-z-snackbar` | `50` | Above footer, below future modal |

---

## App footer (version)

- **Placement:** fixed bottom strip; version label **bottom-right** inside the strip.
- **Content:** `APP_VERSION` string (e.g. `v0.1.0` locally, tag name on Pages builds).
- **Height:** `var(--ds-footer-height)` + safe-area padding.
- **Behavior:** does not scroll away; main content pads bottom so nothing is hidden under it.
- **A11y:** plain text; `aria-label="Application version"`.

---

## Snackbar

### Intent

Short, professional feedback after user actions (Save, Reset seed, export, errors). Must be obvious on desktop, iPad, and phone without stealing focus from the editor or jumping the page scroll.

### Placement

- **Viewport:** `position: fixed` — **never** in normal document flow (no layout shift, no scroll-to-bottom).
- **Horizontal:** centered (`left: 50%` + `translateX(-50%)`), max-width ~min(28rem, calc(100vw - 2rem)).
- **Vertical:** bottom of the **visual viewport**, **above** the version footer:

```text
bottom = var(--ds-footer-height) + var(--ds-snackbar-gap) + var(--ds-safe-bottom)
```

- Stack sits above footer on all breakpoints; if multiple messages, stack upward with `0.5rem` gap (newest on top or single-slot replace — v0 uses **single slot**, replace-in-place).

### Anatomy

- Surface: `--ds-bg-panel`, border `--ds-border`, radius `--ds-radius`, light shadow.
- Optional leading status bar/dot: success | info | error (color tokens).
- Message text (one line preferred; wrap up to 3 lines).
- Optional dismiss control (icon button, aria-label “Dismiss”).
- Role: `status` for info/success (polite); `alert` for error (assertive). Also mirror via CDK `LiveAnnouncer` when useful.

### States

| State | Behavior |
| --- | --- |
| hidden | `aria-hidden`, not focusable, no pointer events |
| enter | fade + slight rise (~150–200ms), reduced-motion → instant opacity |
| visible | auto-dismiss timer (default **4s** info/success, **6s** error); timer pauses on hover/focus |
| leave | fade out (~150ms) then remove |
| replaced | new message replaces current without stacking (v0) |

### Motion

- Prefer `transform` + `opacity` only.
- Honor `prefers-reduced-motion: reduce` (no translate, opacity only or instant).

### Interaction

- Does **not** move focus from the control that triggered it (toolbar buttons keep focus).
- Dismiss: timer, Escape (when snackbar is showing), or dismiss button.
- Clicks on snackbar do not scroll the page.

### Mobile / safe area

- Always account for `safe-area-inset-bottom`.
- Must remain fully visible above virtual keyboard when possible; if visualViewport shrinks, bottom offset still uses footer + gap + safe area (no covering by home indicator).
- Touch target for dismiss ≥ 44×44 CSS px.

### Anti-patterns (image-to-colors lessons)

- Do not pin snackbar in a scrolling column that pushes content.
- Do not hide under ads bars, notches, or footers.
- Do not ship without a BDD scenario for show/message/placement intent.
- Do not copy ad-hoc z-index wars — use design tokens only.

### Tests (required)

- BDD: action (e.g. Save) → snackbar visible with expected text; snackbar is fixed / not causing scroll jump (document scrollY unchanged).
- Unit (optional): service queues replace semantics + default durations.

### Implementation map

- Spec: this file
- Service: `src/app/ui/snackbar/snackbar.service.ts`
- Component: `src/app/ui/snackbar/snackbar.component.*`
- Host: root `App` template (one outlet)

---

## Future chrome (stubs only — specify before build)

- Dialog / modal
- Block list + inspector layout
- Export download feedback (uses snackbar)
- Drag handles / reorder
