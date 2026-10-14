# Logo upload

How sellers put **their own logo** into the newsletter header without raw URL fiddling or oversized mail attachments.
Audience: non-technical field sellers. English only.
**Status: shipped** (Brand upload + HTML export optimize through v0.2.x). Preview mouse-resize remains optional polish.

No backend. No `.env`. Client-side only. MIT / static-host friendly.

Related: `file-management.md` (document size, recovery quota), `block-content-editing.md`, `design-system.md`.

## Goals

- Upload from device (click / drag-drop) → logo appears in preview.
- Seller controls **display size** in the layout; aspect ratio stays locked when scaling.
- Keep a **master** asset in the document (sharp preview / future print-oriented export).
- **HTML export** optimizes for email weight from the **current display size**.
- Replace existing logo only after confirm; bad replace is undoable via editor undo (and Clear / demo reset).
- No seller-facing raw URL/base64 field as the primary path.
- Works on desktop + iPad; MIT-only if a library is needed.

## Non-goals

- Full DAM / multi-asset library.
- Server-side image CDN.
- Hard rule that logos must be tiny marketing stamps — display size is seller-owned; intake/export caps protect the app and mail weight.
- Body-block images (reuse pipeline later).
- PDF logo path before PDF product unlock; master is kept so PDF *can* use higher res later.

## Two sizes: master vs display

| | Master (stored) | Display (layout) |
| --- | --- | --- |
| What | Inlined source bytes (data URL) or https URL | How large it **looks** in the header |
| Fields | `logo.src`, `naturalWidth/Height` | `heightPx`, `widthPx` (aspect-locked) |
| Who sets | Upload | Seller: Brand height field and/or future preview mouse resize |
| HTML export | Source for encode | **Target box** for scale + compress |
| Future PDF | Prefer master (or 2–3× display) | Layout still uses display box |

**Soft guidance only:** many logos look fine around ~48–200 px on the long edge in the 600 px email column. Hint/default, not a hard maximum.

## Caps

**Intake (master, at upload):**

| Stage | Soft | Hard | Behavior |
| --- | --- | --- | --- |
| Input file size | ~1.5 MB | ~8 MB | Soft: may downscale master with notice. Hard: refuse |
| Input megapixels | — | ~25 MP | Downscale master before store |
| Master max edge after intake | — | ~1600 px (tune) | Storage safety only |

**HTML export (derivative in exported HTML):**

| Stage | Target | Hard | Behavior |
| --- | --- | --- | --- |
| Export pixel box | display size × ~1–2 (retina) | sane upper clamp | Scale master → box |
| Export binary | ≤ ~100 KB | ≤ ~200 KB | Quality ladder / format choice |

Optimize for **mail weight at HTML export**, driven by **display size**. Do **not** force a fixed 200×200 product maximum.

## Format strategy

**Accept on input:** `image/png`, `image/jpeg`, `image/webp`, `image/gif` (first frame if animated), `image/svg+xml`. Reject PDF/PSD/TIFF/HEIC with a plain message (HEIC: clear error in v1; optional wasm later only if demanded).

**HTML export output:**

| Source | Output |
| --- | --- |
| Photo-like / many colors | JPEG quality ladder into display box |
| Flat logo + alpha | PNG; if over hard budget, flatten + JPEG with warning |
| Small safe SVG | May stay SVG; else rasterize to PNG at export box |

**Storage:** one master `src` + display metrics in the document. Export derivative is generated at export time; do not require writing it back into `logo.src`. Persistence via IndexedDB (`file-management.md`).

## Pipelines

### Upload / replace

```text
File picked / dropped
  → if logo.src already set → confirm replace
  → validate type + hard intake size
  → decode; measure natural dimensions
  → if over intake ceiling: downscale master with notice
  → store master on logo.src; set natural + initial display size
  → undo snapshot of previous LogoConfig
  → snackbar
```

### Display resize

Brand height field (shipped). Optional later: preview mouse drag, aspect locked, coalesce undo on pointer up; master unchanged. Export HTML has **no** resize handles.

### HTML export

```text
renderExport / download HTML
  → master + current display box
  → scale to export pixel box
  → encode under email binary targets
  → inject derivative into exported <img>
  → editor session keeps master
```

### Replace confirmation

```text
Title: Replace logo?
Body:  A logo is already set. Replace it with the new file?
[ Replace ]   [ Cancel ]
```

### Undo

Header Undo restores previous newsletter snapshot including prior `logo.*`. Clear logo and reset-to-demo remain secondary paths. No separate logo-version gallery.

## Brand tab UX

```text
Logo
[ preview thumbnail ]
[ Upload logo ]  [ Replace… ]  [ Clear ]
Display height   Alt text   Logo link
```

- Drag-drop on Brand zone.
- Success copy may note Undo is available.
- No block-edit modal for logo.

## Data model

```text
LogoConfig {
  src                 // master data URL or https
  heightPx, widthPx   // display box
  naturalWidth, naturalHeight
  lockAspectRatio     // true by default
  href?, alt?
}
```

Preview: master `src` with display width/height. HTML export may substitute an export-time derivative while writing display attrs.

Seed / demo: CloudLib logo embed on seed; reset-to-demo restores it. Empty-document path may start with empty `src`.

## Technology

**Tier 0 (shipped path):** file input + drag/drop, decode, Canvas encode — no heavy dependency on first paint.

**Later only if metrics fail:** small MIT helper or lazy-loaded WASM codecs (license recorded; feature-detect + fallback). WebP not preferred for email export.

## Security

- Sanitize or rasterize SVG (no script / foreignObject / external refs).
- No `innerHTML` mount of SVG.
- Revoke object URLs after pipeline.
- No server upload.

## Testing

- Tiny PNG with transparency; large photo; wide/tall logos; small SVG; unsupported type; optional HEIC friendly error.
- Upload keeps master within intake caps; display independent.
- Replace without confirm does not overwrite.
- Undo restores previous logo config.
- HTML export respects export caps and display box attrs.
- Re-export after display size change changes derivative without re-upload.

## Locks

- No server image API.
- No hard rule that display logos must be ≤200×200 — seller chooses display size.
- Master retained (within intake safety caps); HTML gets export-time optimized derivative from display.
- Replace requires confirm when a logo already exists.
- Bad replace → normal **Undo**.
- No seller-facing URL/base64 primary field.
- Future PDF may keep higher resolution from master.
- Tier 0 Canvas first; small safe SVGs may export as SVG.
