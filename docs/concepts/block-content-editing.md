# Block content editing

Concept for how operators edit block and brand content in the newsletter template editor.
Audience: non-technical field sellers. English only.
Source of truth remains JSON blocks + globals; HTML is always **generated**.

Related: `email-colors.md` (mail colors), `file-management.md`, `logo-upload.md`, `design-system.md`, `AGENTS.md` (email CSS rule).

## Goals

- Sellers never need to write or understand HTML for routine edits.
- Preview stays trustworthy: what they change in the modal is what the mail shows.
- Prefer **structured fields** over free-form rich text.
- When rich text is required, use a **constrained lite kit** (semantic tokens, theme colors only).
- Heavy WYSIWYG libraries are a last resort (license must be MIT/BSD-compatible; no TipTap inside the email iframe).

## Non-goals

- Full word-processor editing inside the preview iframe.
- Arbitrary HTML authoring for every field.
- Free hex / free px sizing in the seller kit (paid **block editor** product later may unlock that; out of scope here).
- Server-side document conversion.
- Email color *definition* outside the Colors tab (see `email-colors.md`).
- Lists inside paragraph rich text (use benefits / other blocks).
- Underline (conflicts with links in email).

## Render pipeline (locked)

Applies to all blocks, including paragraph rich text:

1. **Document model** = JSON (structured fields and/or a small mark tree).
2. **App / preview HTML** = semantic **classes** + shared stylesheet (`email-css.ts` / `emailDocumentCss`). Preview may keep a `<style>` block.
3. **Export HTML** = same markup, then **CSS inliner** bakes class rules onto element `style` / `bgcolor` where email clients require it (`inlineEmailCss` in `renderExport`). Inlining is an export step, not an authoring style.

Do not hand-author long layout `style="…"` strings in renderer source. See `AGENTS.md`.

Git anchor: export inliner landed as `feat(render): implement CSS inliner for email HTML export…` (`8c16678` on `main`).

## Editing shell (shipped)

- Select block in list or preview → highlight only.
- Edit opens only via ✎ (list or preview) → shared **edit modal**.
- Modal: larger dialog (drag header, resize corner; geometry per block type in localStorage), live preview while typing, footer **Cancel** / **Save**.
- Cancel restores the block snapshot from modal open and drops undo entries created during that edit.
- Save keeps live edits and closes.
- Escape acts as Cancel. **Backdrop click does not dismiss** — exit must be intentional (Cancel / Save / Escape).
- Open focus: Cancel is focused **once** when a given edit session opens; typing must not re-steal focus.

## Principle: structure first, rich text second

Most “HTML pain” comes from **wrong model shape** (one blob field where several plain fields belong).
Fix the model before introducing a text editor.

| Level | When | Example |
| --- | --- | --- |
| Plain string / number / enum | Default for labels, amounts, URLs, toggles | CTA text, divider style, currency |
| List of plain strings or row objects | Repeatable lines | Benefits, CTA link rows |
| Constrained rich text (lite kit) | Paragraph body (primary); later brand name / legal notice if needed | Semantic size + theme color + inline marks |
| Full HTML textarea | Escape hatch only, advanced | Temporary legacy / power users |

## Global fields (not blocks, same rules)

| Area | Approach |
| --- | --- |
| Campaign | Plain: preheader, subject (preview), font preset, export prefix |
| Brand | Plain stars line; brand name may later reuse the lite kit |
| Logo | File upload → master embed + display size (`logo-upload.md`). No seller-facing raw URL/base64 field |
| Colors | Colors tab only — defaults and slots (`email-colors.md`). No free hex in block inspectors or the text kit |
| Legal | Mostly plain labels/URLs; notice may later reuse the lite kit |

## Per-block editing model

### divider

- Enum: style (`thin` | `accent-double` | `spacer-only`).
- Number: height when spacer-only.
- No rich text.

### hero

- Plain: `label`, `headline` (storage; newlines → `<br>` at render).
- Italic look is renderer/CSS (`hero-headline`), not seller HTML. Optional **light** marks later if product needs partial bold.
- Legacy `headlineHtml` migrates via `normalizeHeroBlock` / `plainFromHtml`.
- Layout and colors from document color system / globals.

### paragraph

**First full lite rich-text surface.** Block type name stays **Paragraph** (semantic product name). Sellers do not edit raw HTML.

#### Document shape

- One paragraph **block** holds a small rich document: ordered **paragraph nodes** (`p`), each with inline **spans** + **marks**.
- **Hard Enter** → new paragraph node (rendered as a real `<p>`, not fake spacing-only hacks).
- **Soft break** → explicit **`<br>`** inside a paragraph node (allowed; e.g. tight line breaks). Prefer real `p` nodes for normal newsletter copy.
- No lists, tables, or images inside this kit.

#### Inline marks (selection)

| Mark | Notes |
| --- | --- |
| Bold | Legacy seed `<strong>` / bold → this mark |
| Italic | |
| Strikethrough | |
| Superscript | Best-effort in email clients |
| Subscript | Best-effort in email clients |
| Appearance (semantic size) | Toolbar label **Appearance** / **Darstellung**; see size tokens below |
| Theme color | **One** Color control: non-collapsed selection → span color; collapsed caret → paragraph base color. Swatches only — no free hex |
| Link | Selection = default label; URL field; open target (see links). Apply **replaces** the selection (no duplicate text) |
| Mono | Monospace face mark |

**Not allowed:** underline as a mark; arbitrary font-family per span; free font-size px; free hex.

#### Semantic size tokens

Stable role names (i18n labels separate). Map to CSS classes / Colors-tab sizing later. Multiple spans in one block may share the same token (tokens are **roles**, not unique IDs).

| Token | Role |
| --- | --- |
| `body` | Default body copy |
| `lead` | Slightly larger lead / bridge line |
| `callout` | Strong in-body highlight (seed “large line”) |
| `fine` | Smaller supporting line |
| `caption` | Smallest caption-scale line |

Paid **block editor** (future product): operators may redefine how large each token renders (and more). Seller kit still speaks these token names. Do not design that product here.

#### Links

- Apply to selected text (label prefilled from selection; editable). Click an existing link in the editor to edit it.
- URL required for a real link; strip `javascript:` and empty hrefs.
- **Open target:** default `_blank` (+ `rel="noopener noreferrer"` on render). Optional same-tab `_self` for browser-view edge cases. Native mail clients often ignore target; still useful for “view in browser”.
- **Chrome / email CSS:** ice-blue / accent link color; **no underline at rest**; underline on `:hover` / `:focus-visible`; light spacing so links do not glue to adjacent words.
- Link appearance comes from theme/link slot; applying paragraph base color must **not** clobber link styling.

#### Paragraph-level base color

Allowed and useful: each **paragraph node** (`p`) may set a **base text color** from theme swatches (e.g. Body, Heading, Accent, Highlight).

Cascade (high wins):

1. Explicit **span** marks that own color (including link slot styling)
2. Span semantic-size defaults **only if** they define a color (usually they do not)
3. **Paragraph node** base color
4. Block / Colors-tab paragraph slot
5. Global body text color

Changing a paragraph’s base color must **not** overwrite existing span marks (bold/italic/strike/sup/sub/size/link/span-color). It only fills the “unmarked color” layer for that `p`.

#### Sanitizer and clean-text (shipped)

Product-strength feature, not a polish pass:

- On paste: multi-line plain text becomes a structured `RichDoc` (`plainTextToRichDoc`); empty browser `<p><br></p>` rows are dropped by `compactDoc`.
- On clean / export: strip invisible / bidi / BOM / zero-width / soft-hyphen junk; normalize NBSP to space; fancy dashes/quotes → ASCII where policy says so.
- Keep only plaintext code points plus allowed structure/marks.
- **Clear formatting** — drops style marks (bold/italic/strike/sup/sub/mono/size/color) and paragraph base color; **keeps links**; may clean AI junk as a side effect. Confirm dialog before clear.
- **AI watermark UX:** live status line under help (`rt-ai-status`, prominent `--found` state) with count; dedicated **Remove AI Chars** button (preserves marks and links). No Sample AI product button; no DOM-tearing “highlight” toggle.
- Fixture for tests/manual paste: `src/core/richtext/fixtures/ai-watermark-sample.*` (docs/fixtures is a convenience copy only).

#### Storage and migration

- Preferred storage: **mark tree** in JSON on the paragraph block (not a free HTML string as source of truth).
- Renderer walks the tree → classed HTML for preview; export inlines CSS.
- Legacy field `html`: migrate on load (`normalizeParagraphBlock`). Known seed patterns map cleanly (`<strong>` → bold, `<em>` → italic, `<br>` → soft break or split, theme-ish colors → nearest swatch when possible, large inline size → `callout`, etc.). Original CloudLib seed should not rely on unknown tags after migration; unknown markup becomes plain text (no silent keep of raw HTML).

#### Editor chrome

- Lite toolbar in the **edit modal** only (never inside the preview iframe).
- Implementation: `contenteditable` + commands + mark tree serialize (`richDocFromEditorRoot` / `richDocToHtml`); selection captured before toolbar selects so Appearance/Color/Link re-apply reliably.
- Local **undo/redo** inside the paragraph editor (toolbar + ⌘/Ctrl+Z); independent of shell document undo while the modal is open.
- Read-only **Code** view: classed HTML produced by the model (selectable to copy; not editable; no paste into code).
- Live preview as shipped for other blocks.

### chapter-band

- Plain: `title` (newlines → `<br>` at render).
- Legacy `titleHtml` migrates via `normalizeChapterBandBlock`.

### pull-quote

- Plain: `quote` multi-line; italic via CSS (`.pull-quote`), not seller HTML.
- Legacy `html` migrates via `normalizePullQuoteBlock` / `plainMultilineFromHtml`.

### stat-box

- Plain: `number`, `label`, `geo` (seller label **Extras** — optional side text: regions, notes, …; multi-line; newlines → `<br>`).
- Inspector extras help sits under the label (`.ed-field-help`, not label-styled). Textarea default tall (`rows` 7); height persists via `appPersistHeight="stat.geo"`.
- Legacy `geoHtml` migrates via `normalizeStatBoxBlock`.

### benefits-list

- **Row editor** (shipped): each row = icon + text (same email-safe icon grid as CTA link list).
- Add / remove / reorder; at least one row remains.
- Legacy `items: string[]` migrates via `normalizeBenefitsListBlock` (default icon `›`).
- Email look stays benefits-style (larger type / spacing) — editor chrome mirrors the link-list row UI.

### cta-button

- Plain: `text`, `href`.
- No rich text on the button label (email buttons stay simple).

### cta-link-list

- **Row editor** (shipped): each row = icon, label (title), intro (optional description), link text + href (optional link).
- Icon: single email-safe glyph from a fixed ~30-character picker grid (no free text / emoji free-for-all).
- Add / remove / reorder rows in the modal; at least one row always remains.
- Advanced JSON is not seller-facing.

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

## Light rich-text kit (shared)

**Primary surface:** paragraph block (above).

**Later reuse (same kit, smaller mark subset if needed):** brand name, legal notice, maybe hero headline.

Rules shared by all kit surfaces:

- Theme color swatches only (aligned with Colors tab / campaign tokens).
- Semantic size tokens where size is offered (`body` | `lead` | `callout` | `fine` | `caption`).
- Sanitizer + show-suspicious-characters + clear formatting from day one on any kit surface that accepts paste.
- Modal only; never an editor inside the preview iframe.
- Angular CDK for overlay / focus / a11y — not as a text engine.

## Modal UX for dense blocks

- Responsive body; dialog width ~720px class.
- Group fields with short plain-language labels and one-line hints where sellers err (currency, period, href).
- Field help under labels uses distinct help styling (not the same chrome as labels).
- Live preview on input; Cancel / Save as shipped.
- Undo/Redo remain global in the app header (usable above the modal).

## Implementation order

1. **cta-link-list** row editor (kill JSON UI) — **done** (icon + structured rows).
2. Plain-label cleanup (remove “HTML” from seller copy) — **done**.
3. Benefits list editor — **done**.
4. Hero / chapter / quote / stat **plain-up** — **done** (paragraph deferred to lite kit).
5. **Paragraph lite rich-text kit** (model + modal editor + sanitize + migrate seed `html`) — **done** (core on disk).
6. Reuse kit on brand name / legal notice only if still required.
7. Email colors data model — separate large track; `email-colors.md` when scheduled (paragraph size/color tokens plug into slots).
8. Paid block editor product — explicitly **out of scope** until scheduled.

Already shipped (do not re-open as “next”): file management v1, logo upload, price-box field split, class-based email CSS + export inliner.

## Locks

- No TipTap (or any editor) inside the preview iframe.
- No Material.
- No free hex pickers outside the Colors tab / theme swatches.
- JSON remains the document model; editors write fields/marks; renderers emit classed HTML; **export inlines** CSS for clients.
- MIT-compatible dependencies only if a library is introduced.
- Semantic size token names stay stable even if a future block editor remaps their pixel sizes.
