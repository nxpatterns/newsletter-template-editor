# Block content editing

Concept for how operators edit block and brand content in the newsletter template editor.
Audience: non-technical field sellers. English only.
Source of truth remains JSON blocks + globals; HTML is always generated.

Related: `email-colors.md` (mail colors), `file-management.md`, `logo-upload.md`, `design-system.md`.

## Goals

- Sellers never need to write or understand HTML for routine edits.
- Preview stays trustworthy: what they change in the modal is what the mail shows.
- Prefer **structured fields** over free-form rich text.
- Heavy WYSIWYG libraries are a last resort (license must be MIT/BSD-compatible; no TipTap inside the email iframe).

## Non-goals

- Full word-processor editing inside the preview iframe.
- Arbitrary HTML authoring for every field.
- Server-side document conversion.
- Email color editing outside the Colors tab (see `email-colors.md`).

## Editing shell (shipped)

- Select block in list or preview → highlight only.
- Edit opens only via ✎ (list or preview) → shared **edit modal**.
- Modal: larger dialog, live preview while typing, footer **Cancel** / **Save**.
- Cancel restores the block snapshot from modal open and drops undo entries created during that edit.
- Save keeps live edits and closes.
- Escape and backdrop act as Cancel.

## Principle: structure first, rich text second

Most “HTML pain” comes from **wrong model shape** (one blob field where several plain fields belong).
Fix the model before introducing a text editor.

| Level | When | Example |
| --- | --- | --- |
| Plain string / number / enum | Default for labels, amounts, URLs, toggles | CTA text, divider style, currency |
| List of plain strings or row objects | Repeatable lines | Benefits, CTA link rows |
| Constrained rich text | Rare: a few words bold/italic/color from theme | Brand name spans, legal notice emphasis |
| Full HTML textarea | Escape hatch only, advanced | Temporary legacy / power users |

## Global fields (not blocks, same rules)

| Area | Approach |
| --- | --- |
| Campaign | Plain: preheader, subject (preview), font preset, export prefix |
| Brand | Plain stars line; brand name may later get **light** marks (family/size/weight/color on selection) |
| Logo | File upload → master embed + display size (`logo-upload.md`). No seller-facing raw URL/base64 field |
| Colors | Colors tab only — semantic campaign tokens today; full slot system per `email-colors.md` (concept). No free hex in block inspectors |
| Legal | Mostly plain labels/URLs; notice may later share the same light rich-text kit as brand name |

## Per-block editing model

### divider

- Enum: style (`thin` | `accent-double` | `spacer-only`).
- Number: height when spacer-only.
- No rich text.

### hero

- Plain: `label`.
- Headline: start as plain or single-line with optional **light** marks later (bold/italic only). Avoid free HTML textarea long-term.
- Renderer owns layout; colors from document color system / globals.

### paragraph

- Body: multi-line plain text first; optional light marks (bold/italic/link) later if sellers need emphasis.
- Do not advertise raw HTML as the primary path.

### chapter-band

- Title: plain string (or light marks later). Drop “HTML” from the seller-facing label.

### pull-quote

- Quote body: plain multi-line; optional italic default in renderer rather than user HTML.

### stat-box

- Plain: `number`, `label`.
- Regions: plain multi-line or short text; avoid HTML for line breaks if `<br>` can be derived from newlines.

### benefits-list

- Structured: one benefit per line → `items: string[]`.
- Keep this pattern; UI can later become a small list editor (add/remove/reorder rows) instead of a textarea.

### cta-button

- Plain: `text`, `href`.
- No rich text on the button label (email buttons stay simple).

### cta-link-list

- Replace JSON textarea with **row editor**: each row = label, intro, link text, href.
- Add / remove / reorder rows in the modal.
- Advanced JSON is not seller-facing.
- **Next structure-first implementation item.**

### price-box (shipped structured fields)

Atomic fields (v0.2.2+):

| Field | Role | Example |
| --- | --- | --- |
| `badge` | Offer chip | Special offer |
| `currency` | Symbol or code | € $ CHF ₺ or custom |
| `amount` | Main price number/text | 99 |
| `periodLabel` | Unit / period | netto / Jahr |
| `strikeEnabled` | Optional | on/off |
| `strikeAmount` / `strikeLabel` | Was-price | 199 / Was |
| `details` | Plain supporting line | No auto-renew |
| `fine` | Plain fine print | Limited availability |

Renderer composes typography and colors. Legacy `mainPriceHtml` / `strike` migrate via `normalize-newsletter`.

## Light rich-text kit (if needed later)

Shared mini-toolbar for a **small** set of surfaces only (brand name, legal notice, maybe hero headline):

- Allowed: bold, italic, optional link, color **from theme swatches only** (Accent, Highlight, Heading, Body — no free hex picker in the text kit).
- Font family/size/weight only where product already allows system-safe stacks.
- Storage: either a tiny mark tree or a severely sanitized HTML subset produced by the kit — never round-trip arbitrary paste from Word without sanitization.
- Implementation preference order:
  1. Structured fields (no editor).
  2. `contenteditable` + explicit commands + sanitize on save (no dependency).
  3. MIT/BSD editor (e.g. TipTap/ProseMirror) **only in the modal**, never in the iframe, only if (2) fails product needs.
- Angular CDK: use for overlay, focus trap, a11y — not as a text engine.

## Modal UX for dense blocks

- Responsive body; dialog width ~720px class.
- Group fields with short plain-language labels and one-line hints where sellers err (currency, period, href).
- Live preview on input; Cancel / Save as shipped.
- Undo/Redo remain global in the app header (usable above the modal).

## Implementation order

1. **cta-link-list** row editor (kill JSON UI) — **next**.
2. Plain-label cleanup (remove “HTML” from seller copy where fields are plain).
3. Benefits list editor (optional polish).
4. Light rich-text kit only for brand name / legal notice if still required.
5. Email colors — separate large track; only from `email-colors.md` when scheduled.

Already shipped (do not re-open as “next”): file management v1, logo upload, price-box field split.

## Locks

- No TipTap (or any editor) inside the preview iframe.
- No Material.
- No duplicate free color pickers outside the Colors tab.
- JSON remains the document model; editors write fields, renderers write HTML.
- MIT-compatible dependencies only if a library is introduced.
