# Block content editing

Concept for how operators edit block and brand content in the newsletter template editor.
Audience: non-technical field sellers. English only.
Source of truth remains JSON blocks + globals; HTML is always **generated**.

Related: `email-colors.md` (mail colors), `block-editor-and-demo-page.md` (own blocks), `file-management.md`, `logo-upload.md`, `design-system.md`, `AGENTS.md` (email CSS rule).

## Goals

- Sellers never need to write or understand HTML for routine edits.
- Preview stays trustworthy: what they change in the modal is what the mail shows.
- Prefer **structured fields** over free-form rich text.
- When rich text is required, use a **constrained lite kit** (semantic tokens, theme colors only).
- Heavy WYSIWYG libraries are a last resort (license must be MIT/BSD-compatible; no TipTap inside the email iframe).

## Non-goals

- Full word-processor editing inside the preview iframe.
- Arbitrary HTML authoring for every field.
- Free hex / free px sizing in the seller kit. The block editor (`block-editor-and-demo-page.md`) uses the same kit and does not unlock it.
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
- Modal: larger dialog (drag header, resize corner; geometry per block type in localStorage), footer **Cancel** / **Save**.
- **Live preview while typing** for structured/plain block fields (hero, benefits, CTA, …).
- **Paragraph (WYSIWYG only):** main email preview stays frozen on the open snapshot until **Save**; the modal editor is a visual clone of body copy.
- Cancel restores the block snapshot from modal open and drops undo entries created during that edit (paragraph draft is discarded; preview was frozen).
- Save commits live field edits and any paragraph draft, then closes.
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

## Seller vocabulary (EN / DE)

Every address field uses one of these terms, with a placeholder and a helper line. No "URL", "Label", "href" or "Alt-Text" in the UI.

| Term | Means | Saved field |
| --- | --- | --- |
| Image address / Bildadresse | Where the picture is stored | `src` |
| Link target / Linkziel | Where a click leads (web, email, phone); normalized on blur | `href`, `*Href` |
| Link text / Linktext | Words the reader clicks | `*Label` |
| Image description / Bildbeschreibung | Text when images are blocked; required | `alt` |
| Caption / Bildunterschrift | Visible line under the picture | `caption` |

Saved field names stay HTML-like on purpose; i18n keys and test ids use the terms (`linkTarget`, `imageDescription`, `image-address`).

## Global fields (not blocks, same rules)

| Area | Approach |
| --- | --- |
| Campaign | Plain: preheader, subject (preview), font preset, export prefix |
| Brand | Stars: symbol + count, 0 hides header and footer row. Name: parts `{ text, color }` plus size S/M/L and bold (schema v4, `migrate-v4.ts` converts old HTML spans) |
| Logo | Shared image picker (link or file), image description, link target, height (`logo-upload.md`) |
| Colors | Colors tab only — defaults and slots (`email-colors.md`). No free hex in block inspectors or the text kit |
| Legal | Mostly plain labels/URLs; notice may later reuse the lite kit |

## Per-block editing model

### divider

- Enum: style (`thin` | `two-tone` | `ornament` | `glow` | `spacer-only`); `two-tone` was `secondary-double` before schema v3.
- Token: `background` (`content` | `page`), stores the token name, never a color. Not visible with `thin`.
- Number: height when spacer-only.
- Lines span the full row width (no side padding). Ornament and glow add 10px above and below; glow steps are mixed from the link color and the background at render time.
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
| Size | Toolbar label **Size** / **Größe**; T-shirt tokens below |
| Theme color | **One** Color control: non-collapsed selection → span color; collapsed caret → paragraph base color. Swatches only — no free hex. Tokens (`RICH_COLOR_TOKENS` in `src/core/richtext/model.ts`): `body` · `head` · `link` · `accent` · `dim`; labels "Body text", "Headings", "Links and numbers", "Accent", "Muted text" (`rt.color.*`). The tokens equal the color roles of the same name (`ColorRole`); they replaced the earlier names `standard` / `primary` / `secondary` with the color model (commit `d679942`, 2026-10-17), in code and UI alike |
| Link | Selection = default label; URL field; open target (see links). Apply **replaces** the selection (no duplicate text) |
| Mono | Monospace face mark |

**Not allowed:** underline as a mark; arbitrary font-family per span; free font-size px; free hex.

#### Size tokens

T-shirt sizes, smallest to largest; labels equal the ids (no translation). Classes `rt-size-{token}`; `m` is normal text and is never stored as a mark.

| Token | Font size / line height |
| --- | --- |
| `xs` | 12 / 18 px |
| `s` | 14 / 22 px |
| `m` | 17 / 30 px (normal paragraph text) |
| `l` | 20 / 32 px |
| `xl` | 26 / 36 px |

The block editor (`block-editor-and-demo-page.md`) may later redefine how large each token renders. The kit keeps these token names.

#### Links

- Apply to selected text (label prefilled from selection; editable). Click an existing link in the editor to edit it.
- URL required for a real link; strip `javascript:` and empty hrefs.
- **Open target:** default `_blank` (+ `rel="noopener noreferrer"` on render). Optional same-tab `_self` for browser-view edge cases. Native mail clients often ignore target; still useful for “view in browser”.
- **Chrome / email CSS:** ice-blue / accent link color; **no underline at rest**; underline on `:hover` / `:focus-visible`; light spacing so links do not glue to adjacent words.
- Link appearance comes from theme/link slot; applying paragraph base color must **not** clobber link styling.

#### Paragraph-level base color

Allowed and useful: each **paragraph node** (`p`) may set a **base text color** from the theme swatches above (`body`, `head`, `link`, `accent`, `dim`).

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
- Implementation: `contenteditable` display + **model range mark ops** (`toggleMarkOnDoc`, `applySizeOnDoc`, `applyColorOnDoc`, …) + serialize (`richDocFromEditorRoot` / `richDocToHtml`). Selection bookmarks survive repaint/undo.
- Local **undo/redo** inside the paragraph editor (toolbar + ⌘/Ctrl+Z); independent of shell document undo while the modal is open.
- Read-only **Code** view: classed HTML produced by the model (selectable to copy; not editable; no paste into code).
- Preview freeze until Save (draft local to the modal); other blocks keep live preview.
- Email-width, Info (`i`), intermediate draft stash (shipped).

### chapter-band

- Plain: `title` (newlines → `<br>` at render).
- Legacy `titleHtml` migrates via `normalizeChapterBandBlock`.

### pull-quote

- Plain: `quote` multi-line; italic via CSS (`.pull-quote`), not seller HTML.
- Legacy `html` migrates via `normalizePullQuoteBlock` / `plainMultilineFromHtml`.
- Seller label **Pull quote** (Zitat). Always the accent-bar layout, no byline.
- A stored `pull-quote` with `name`, `role` or `src` set (saved while both blocks briefly shared this type) normalizes to `testimonial`.

### testimonial

- Seller label **Customer quote** (Kundenstimme). Own type, never shares data or markup with `pull-quote`.
- Plain: `quote`, `name`, `role` (role and company), `imageMode` `none|photo|logo`, `src`, `alt` (required when a picture is set). Normalized by `normalizeTestimonialBlock`.
- Renders centered (`.testimonial-quote`) with a small round photo (logo not rounded), bold name and role below. No byline table when name, role and picture are all empty.

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

### image

- Fields: `src` (https link or data: URL), `alt` (required in the editor), `href`, `caption`, `width` (`full` 600px | `text` 504px | `small` 252px).
- Shared picker (`app-image-picker`, also used for the logo): paste a link or drop a file. A file can only be embedded (no server); it is shrunk to 600px, PNG only with transparency, else the smaller of JPG/PNG.
- Embedded images and SVG get a warning: Gmail shows no data: URLs, classic Outlook neither, and neither shows SVG. A meter shows the exported HTML size against Gmail's ~102 KB clipping limit.
- Export skips an image block without `src`; the preview shows a dashed placeholder.

### image-text

- Fields: `src`, `alt` (required), `href` like the image block (no caption); `body` (RichDoc, paragraph editor and draft/save flow); `side` `left|right`, `imageWidth` `third` 160px | `half` 242px, `valign` `top|middle`.
- Editor: one page, picker in compact mode (`[compact]`), then the layout switches, then the text.
- Email: two table columns plus a 20px gutter. Below 600px they stack via media query. An image on the right uses `dir="rtl"` on the table, so the image comes first in the source and sits above the text on phones. Classic Outlook ignores the media query and keeps two columns.
- Export without `src` keeps the text as a plain paragraph.

### contact

- Seller label **Contact person** (Ansprechpartner).
- Fields: `src`, `alt` (required when a photo is set), `intro`, `name`, `role`, `phone`, `email`, `buttonLabel`, `href`. All optional; empty fields leave their row out.
- Phone renders as a `tel:` link, email as `mailto:` (both untracked); the button reuses the CTA button styling.
- Email: round photo column on the left (no photo, no column); below 600px it stacks, photo above.

### video

- Seller label **Video preview** (Video-Vorschau).
- Fields: `src`, `alt` (always required), `href` (YouTube, Vimeo or a 3D tour; tidied on blur), `title`, `duration` (optional).
- Email: full-width linked thumbnail, then a play row: round play cell in the link color (slot `play`), title as a link, `· duration`. No overlay on the picture (not reliable in email clients). Export skips the picture without `src`.

### teasers

- Seller label **Teasers** (Teaser).
- Fields: `columns` `2|3`, `items[]` with `src`, `alt` (required when a picture is set), `title`, `text`, `linkText`, `href`.
- Editor: row editor like the link list (one teaser open, add / remove / reorder, at least one stays); compact shared picker per teaser.
- Email: rows of `columns` cells (242px with a 20px gutter, or 157px with 16px); below 600px every teaser stacks. Picture and link text both use the link target.

### event

- Seller label **Event** (Termin).
- Fields: `title`, `date` (YYYY-MM-DD), `start` / `end` (HH:MM), `timezone` (IANA, defaults to the browser zone, else Europe/Berlin), `locationMode` `online|onsite`, `location`, `buttonLabel`, `href`, `calendar` (on/off), `calendarLabel`, `locale` (`de|en`, set from the app language at creation; month, weekday and time words).
- Email: calendar sheet left (month in the link color, slot `month`; big day, weekday), then title, "10:00 bis 10:30 Uhr · Online, Teams", the button and an outlined "Add to calendar" link. Stacks below 600px.
- "Add to calendar" is a Google Calendar link built from the fields (`action=TEMPLATE`, local times with `ctz`; no start = all day, no end = one hour). A downloadable .ics would need hosting.

### Footer social row (Legal tab, not a block)

- `legal.social`: one link target per network; the list mirrors `public/icons/social/<id>.svg` (a BDD scenario keeps both in sync). Only filled networks render, in the fixed order of `SOCIAL_NETWORKS`.
- Preview: the SVGs recolored to the heading color (`head`), as data URLs.
- Export: icons are burned to PNG (48px for 24px display) in the heading color at export time and referenced as `assetBaseUrl/<id>-<color>.png`; the download is a ZIP with the HTML and `social/*.png` to upload there. `assetBaseUrl` (export dialog, "Image address") is stored with the newsletter.
- Without an image address the export warns and the footer uses text links ("LinkedIn · YouTube"), which work in every inbox.

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

- Theme color swatches only (the text kit tokens above).
- Size tokens where size is offered (`xs` | `s` | `m` | `l` | `xl`).
- Sanitizer + show-suspicious-characters + clear formatting from day one on any kit surface that accepts paste.
- Modal only; never an editor inside the preview iframe.
- Angular CDK for overlay / focus / a11y — not as a text engine.

## Modal UX for dense blocks

- Responsive body; dialog width ~720px class.
- Group fields with short plain-language labels and one-line hints where sellers err (currency, period, href).
- Field help under labels uses distinct help styling (not the same chrome as labels).
- Live preview on input; Cancel / Save as shipped.
- Undo/Redo remain global in the app header (usable above the modal).

## Status

Everything in this document is shipped: structured fields for all blocks, row editors, the paragraph lite kit, class-based email CSS with the export inliner, the email color model (`email-colors.md`), file management and logo upload.

Still open, only if needed: reuse the kit on brand name or legal notice. Own blocks and free blocks: `block-editor-and-demo-page.md`.

## Locks

- No TipTap (or any editor) inside the preview iframe.
- No Material.
- No free hex pickers outside the Colors tab / theme swatches.
- JSON remains the document model; editors write fields/marks; renderers emit classed HTML; **export inlines** CSS for clients.
- MIT-compatible dependencies only if a library is introduced.
- Semantic size token names stay stable even if a future block editor remaps their pixel sizes.
