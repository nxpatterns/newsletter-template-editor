# Logo upload

Concept for letting sellers put **their own logo** into the newsletter header without raw URL fiddling, giant attachments, or mail-client rage.
Audience: non-technical field sellers. English only.
**Status: agreed (decisions locked 2026-10-07). Implement only after explicit go — after or alongside file-management slices as scheduled.**

No backend. No `.env`. Client-side only. MIT / static-host friendly.
Depends on / feeds into `docs/concepts/file-management.md` (document size, recovery quota).

---

## Problem we are solving

### Product need

Sellers design **their** template. The brand tab today is **URL-only** (`logo.src` string). That fails when:

- They have a file on disk / iPad Photos, not a hosted URL.
- The “URL” is a 5 MB PNG from the marketing drive.
- Gmail / Outlook punish heavy HTML (large base64 images inflate MIME size ~33% over binary).

### What the old Dogan editor did

- File picker → `FileReader.readAsDataURL` → store data URL on `logo.src`.
- Probe natural width/height; keep aspect with `heightPx`.
- **No** max-size gate, **no** recompression, **no** dimension cap beyond display height.
- Toast showed KB + pixel size only after the fact.
- Default logo fetched as SVG and inlined as `data:image/svg+xml;base64,…`.

Useful pattern (picker + data URL + dims). Missing: **protect the user from themselves**.

### What exists today (v0.1.6)

```ts
interface LogoConfig {
  src: string;          // URL or (future) data URL
  heightPx: number;     // display height in email (16–200)
  href?: string;
  alt?: string;
  lockAspectRatio: boolean;
  naturalWidth?: number;
  naturalHeight?: number;
  widthPx?: number;
}
```

Brand tab fields: src, href, alt, height. Renderer emits `<img src="…">` in the shell header.
Seed default `src: ''` (empty until set).

---

## Goals

- Upload from device (click / drag-drop) → logo appears in preview.
- Seller controls **display size** in the layout (preview + Brand fields); aspect ratio stays locked when scaling.
- Keep a **master** asset in the document (good enough for sharp preview / future print-oriented export).
- **HTML export** is where email-weight optimization happens: rasterize/scale from master to the **current display size** (with a modest retina factor if useful), then compress.
- Replace existing logo only after confirm; bad replace is undoable via normal editor undo (and Clear / demo reset where applicable).
- Keep URL paste as power-user escape hatch (hosted CDN logo).
- Works on desktop + iPad; MIT-only if a library is needed.

## Non-goals

- Full DAM / multi-asset library.
- Server-side image CDN.
- Hard product rule that logos must be “small marketing stamps only” — sellers may want a large header mark; layout and export budgets handle weight, not moralizing.
- Body-block images in the first slice (reuse pipeline later).
- Shipping PDF logo path before PDF itself returns (see file-management); design master so PDF *can* use higher res later.

---

## Two sizes: master vs display

| | Master (stored) | Display (layout) |
| --- | --- | --- |
| What | Decoded/inlined source bytes (data URL or https URL) | How large it **looks** in the header |
| Fields | `logo.src`, `naturalWidth/Height` | `heightPx`, `widthPx` (aspect-locked) |
| Who sets | Upload / URL | Seller: Brand number fields **and/or** mouse resize on preview |
| HTML export | Source for encode | **Target box** for scale + compress |
| Future PDF | Prefer master (or 2–3× display) for print sharpness | Page layout still uses display box |

**Example:** upload 800×800 → master stays ~800×800 (within intake caps). Seller drags preview to **120×120** display. HTML export encodes a ~120×120 (or 2× = 240×240) derivative into the mail. Document JSON still holds the master + display numbers so they can enlarge again without re-upload.

**Soft guidance only (not a lock):** many logos look fine around a modest box (e.g. on the order of ~48–200 px on the long edge in the 600 px email column). That is a **hint / default**, not a hard maximum. Seller may go larger; export still optimizes to whatever display size they chose.

---

## Constraints unique to HTML email

| Constraint | Why it matters |
| --- | --- |
| Base64 expands ~4/3 | Large masters must not be dumped raw into HTML if display is small |
| Gmail / Outlook weight | Optimize **at HTML export** from display size |
| Outlook quirks | Prefer PNG/JPEG in heavy export paths; small safe SVG OK |
| Browser RAM / IndexedDB | Master still needs an **intake** ceiling so one 50 MB file cannot crash the tab |

**Intake caps (master, at upload — not the same as HTML output):**

| Stage | Soft | Hard | Behavior |
| --- | --- | --- | --- |
| Input file size | ~1.5 MB | ~8 MB | Soft: may downscale master slightly with notice. Hard: refuse process |
| Input megapixels | — | ~25 MP | Downscale master before store to avoid OOM |
| Master max edge after intake | — | ~1600 px (tune) | Ceiling only to protect storage — **not** a design rule that logos must be tiny |

**HTML export caps (derivative baked into exported HTML):**

| Stage | Target | Hard | Behavior |
| --- | --- | --- | --- |
| Export pixel box | display size × ~1–2 (retina) | sane upper clamp if display was set absurdly large | Scale master → box |
| Export binary | ≤ ~100 KB | ≤ ~200 KB | Quality ladder / format choice; warn if still huge |

**Decision (2026-10-07, revised same day):** optimize for **mail weight at HTML export**, driven by **display size**. Do **not** force a fixed 200×200 product maximum. Intake caps protect the app; display is seller-owned.

---

## Format strategy

### Accept on input

- `image/png`, `image/jpeg`, `image/webp`, `image/gif` (first frame only if animated — freeze).
- `image/svg+xml` — special path (see SVG).
- Reject: PDF, PSD, TIFF, HEIC unless we later add WASM decoders. On reject: plain message + “export a PNG or JPEG from your design tool”.

**HEIC note (iPhone):** common failure. Phase 1: clear error. Phase 2 optional: wasm decoder only if sellers demand it.

### Prefer on HTML export (email-safe derivative)

| Source | HTML export output |
| --- | --- |
| Photo-like / many colors | JPEG quality ladder into display box |
| Flat logo + alpha | PNG into display box; if still over hard budget, flatten + JPEG with warning |
| Small safe SVG | May stay SVG if under size/safety rules; else rasterize to PNG at export box |

**Decision (2026-10-07):**  
- Small safe SVG may remain SVG in HTML export.  
- Else rasterize to the **export pixel box derived from current display size** (optional 2× for sharpness).

### Storage rules

- Document holds **one master** `src` + display metrics — not a permanent dual “original + email derivative” pair on disk inside JSON.
- HTML derivative is **generated at export** (and may be ephemeral); do not require writing it back into `logo.src` (preview keeps master + CSS/layout size).
- IndexedDB for persistence (see file-management); localStorage alone is not enough for large masters.

---

## Pipelines

### Upload / replace (intake)

```text
File picked / dropped
  → if logo.src already set → confirm replace (see below)
  → validate type + hard intake size
  → decode; measure natural dimensions
  → if over intake megapixel/edge ceiling: downscale **master** with notice (app safety only)
  → store master as data URL on logo.src
  → set naturalWidth/Height; set initial display height/width (preserve aspect; sensible default height e.g. 48–80, not a hard max)
  → push undo entry (previous LogoConfig snapshot)
  → snackbar (loaded / replaced + dimensions)
```

### Preview display resize (seller)

```text
Mouse drag on logo chrome in preview (and/or Brand height field)
  → lockAspectRatio true (default)
  → update heightPx + widthPx proportionally
  → min/max display clamps only for sanity (e.g. min ~16 px; max so header does not explode — generous, not “must be ≤200”)
  → coalesce undo while dragging; commit on pointer up
  → master src unchanged
```

Preview interaction: host `contentDocument` only (existing chrome pattern). Export HTML has **no** resize handles.

### HTML export (optimize here)

```text
renderExport / download HTML
  → read master + current display box
  → scale to export pixel box (display × 1–2)
  → encode under email binary targets
  → inject derivative into exported HTML <img> (width/height attrs match display)
  → document master left as-is in the editor session
```

### Future PDF (when product offers it again)

- Layout box = display size.
- Image bits = **master** (or higher multiple of display) so print stays sharp.
- No requirement to crush to email byte budget.

### User-visible messages

- Intake downscale (rare): “File was huge; we stored a smaller master so the app stays stable.”
- Replace confirm: see below.
- Export-time crush can be silent or one snackbar (“HTML logo optimized to N KB”) — prefer light touch; heavy warnings only on failure.
- Hard refuse: file type / over hard intake / encode failure.

### Replace confirmation

If `logo.src` is non-empty and user uploads or picks a new file:

```text
Title: Replace logo?
Body:  A logo is already set. Replace it with the new file?
[ Replace ]   [ Cancel ]
```

- **Replace** → intake pipeline; undo stack keeps previous `LogoConfig`.
- **Cancel** → no change; file picker result discarded.

Same idea when switching from embed → URL or Clear (Clear may be softer: confirm only if embed is large / non-demo).

### Undo / “I regret the last upload”

| Action | What happens |
| --- | --- |
| **Undo** (header) | Restores previous newsletter snapshot, including prior `logo.*` (src + display size). Standard session undo — **primary** recovery. |
| **Redo** | Re-applies the replace. |
| **Clear logo** | Empties src (confirm if needed); undo restores. |
| **Reset to demo template** | Whole seed including CloudLib logo (destructive; already menu danger zone). |
| Multi-step | Only one undo level of “logo history” is needed beyond normal undo stack depth — do **not** build a separate logo-version gallery unless undo proves insufficient. |

Upload/replace must call the same history path as other globals (`HistoryMode` immediate), so one Undo undoes a bad logo without undoing unrelated text if we snapshot correctly (full newsletter snapshot already does).

**No** silent keep of “last three logos” in side storage unless undo stack is later proven too coarse.

---

## Implementation technology ladder

Prefer the lightest tool that meets the budget on real devices (including iPad).

### Tier 0 — no dependency (try first)

- `input[type=file]` + drag/drop zone in Brand tab.
- `createImageBitmap` / `HTMLImageElement` decode.
- `canvas` (or `OffscreenCanvas` where available) draw + `canvas.toBlob('image/jpeg' | 'image/png', quality)`.
- SVG: read as text; if small and safe, `data:image/svg+xml;base64,…`; else draw into canvas via Image.

**Pros:** zero license surface, small bundle.  
**Cons:** canvas quality/resampling varies; EXIF orientation sometimes wrong on older Safari; less control than libav/squoosh.

### Tier 1 — focused MIT helper (if Tier 0 fails tests)

- Small orientation fix / resize helper only if needed.
- Avoid large “image studio” apps.

### Tier 2 — WASM codec (only if required)

When Tier 0 cannot hit size/quality targets or HEIC becomes mandatory:

| WASM option | Role | Notes |
| --- | --- | --- |
| **Squoosh-style codecs** (mozjpeg / oxipng wasm, Apache/MIT-ish per codec) | Better JPEG/PNG compression than canvas | Bundle weight; need careful lazy load |
| **libwebp wasm** | WebP output | Email support for WebP still uneven → **not** preferred for export |
| **ImageMagick wasm** | Swiss army knife | Heavy; last resort |
| **heic-to** / similar | iPhone photos | Optional; license check required |

**Rules if WASM is introduced:**

- Lazy-load only on upload path (dynamic `import()`), not on first paint.
- One codec path documented in this file.
- MIT/BSD/Apache only; record license in repo attribution.
- Feature-detect + fallback message if wasm fails to instantiate.
- Still enforce same product caps.

**Decision (2026-10-07):** implement **Tier 0 (Canvas) end-to-end** with BDD fixtures (small PNG, large PNG, tiny SVG, absurd 5 MB photo). Add WASM **only** if measurements fail on target devices.

---

## UX placement

### Brand tab (primary)

```text
Logo
[ preview thumbnail — shows master at display size ]
[ Upload logo ]  [ Use URL instead ]  [ Clear ]
Display size (height; width follows aspect)   Alt text   Link URL
```

- **Upload logo** — file picker; replace confirm if src set.
- Drag-drop on Brand zone and/or preview logo hit-target.
- **Preview mouse resize** — corner/edge handle, aspect locked; updates `heightPx`/`widthPx` only.
- **Use URL instead** — secondary; confirm if replacing embed.
- **Clear** — empty src; undoable.
- Brand height field stays in sync with preview drag.

### Feedback

- Intake: short progress only if decode/downscale is slow.
- Replace: modal confirm, not only snackbar.
- Success: compact (“Logo replaced — Undo available”).
- HTML export optimize: optional snackbar; errors assertive.
- No block-edit modal for logo.

### Accessibility

- Thumbnail `alt` mirrors logo alt or “Logo preview”.
- File input labelled; drop zone keyboard activatable (button triggers picker).

---

## Data model impact

`LogoConfig` stays the layout + master pointer:

- `src` — master (data URL or https)
- `heightPx` / `widthPx` — **display** box (aspect locked when resizing)
- `naturalWidth` / `naturalHeight` — master pixel size after intake
- `lockAspectRatio: true` by default for mouse + field coupling

Preview renderer: `<img src=master>` with display width/height CSS (as today).
HTML export renderer: may substitute an **export-time** `src` derivative while writing width/height from display — preview path unchanged.

Optional later: `originalFileName`, `sourceKind`.

### Persistence

- Master embeds → IndexedDB (file-management).
- Quota warning if document too heavy; suggest smaller master or hosted URL.

---

## Security / safety

- Strip SVG of script, foreignObject, external refs if we inline SVG text (sanitize or rasterize).
- Do not use `innerHTML` to mount SVG; Image/blob URLs or sanitized data URL only.
- Object URLs revoked after pipeline.
- No server upload = no retention risk on our infra (static demo).

---

## Testing plan

Fixtures under e.g. `public/test-fixtures/logo/` or BDD assets:

- Tiny PNG logo with transparency.
- Large photographic PNG/JPEG > 2 MB.
- Wide logo (e.g. 3000×400) and tall logo.
- Small SVG, huge SVG path soup.
- Unsupported type (e.g. `.txt` renamed).
- Optional: HEIC expect friendly error.

Assertions:

- After upload, master retained (within intake caps); display size independent.
- Preview drag keeps aspect; undo restores previous logo config.
- Replace without confirm does not overwrite.
- HTML export img byte weight respects export caps and matches display box attrs.
- Changing display size and re-export changes derivative size without re-upload.

Device lab later: iPad Safari upload from Photos.

---

## Implementation slices (after approval only)

1. Brand tab upload zone + replace confirm + undoable session write (master intake).
2. `src/core/logo/` intake + **export optimize** helpers (Canvas tier 0).
3. Preview logo resize chrome (aspect lock) wired to `heightPx`/`widthPx`.
4. HTML `renderExport` path injects optimized derivative from display box.
5. i18n + BDD (replace confirm, undo, export weight).
6. WASM only if export metrics fail.

---

## Decisions locked (2026-10-07, revised)

| Topic | Choice |
| --- | --- |
| Tech ladder | **Tier 0 Canvas first**; WASM only after failed metrics |
| Master vs display | **Master in document**; display size seller-owned; aspect locked on resize |
| When to crush for email | **HTML export**, from current display size (not “must be 200×200”) |
| Soft size idea ~200×200 | **Hint/default only**, not a hard product max |
| Intake caps | Protect tab/storage (~8 MB hard, edge ceiling) — separate from design freedom |
| HTML export binary | ~100 KB target / ~200 KB hard (tune with measurements) |
| SVG export | Small safe SVG OK; else rasterize to export box |
| Replace | **Confirm** if logo already set |
| Regret last upload | **Editor Undo** restores previous `LogoConfig`; Clear / demo reset as backup |
| Future PDF | Use master (high res) in layout box; not email crush |

### Locked product facts (not open)

- **Demo / seed logo:** base64 SVG on `CLOUDLIB_CAMPAIGN_V1.globals.logo.src`. Reset-to-demo restores it. `defaultLogo()` empty src is empty-document only.

### Still open (minor)

- Exact display min/max clamps for mouse resize (generous max).
- Export retina factor 1× vs 2× default.
- Transparency flatten threshold on export.
- HEIC error-only v1.
- Generic `optimizeImageForEmail(master, box)` API name for later body images.

---

## Locks

- No server image API.
- No hard rule that display logos must be ≤200×200 — seller chooses display size.
- Master retained (within intake safety caps); HTML gets an export-time optimized derivative sized from display.
- Replace requires confirm when a logo already exists.
- Bad replace → normal **Undo** (full previous logo config).
- Preview mouse resize keeps aspect ratio.
- Future PDF may keep higher resolution from master.
- Tier 0 Canvas first; small safe SVGs may export as SVG.
- Spec before code.

---

## Related

- `docs/concepts/file-management.md` — document size, export HTML weight, recovery storage
- `docs/concepts/block-content-editing.md` — Brand/logo row in globals table
- `docs/concepts/design-system.md` — upload zone / snackbar chrome (add section when UI is specified)
- Old reference: Dogan `pickImage` in `editor/src/ui/inspector.ts` (data URL, no optimize)
- Code today: `LogoConfig` in `src/core/types.ts`, Brand tab `brand-fields.component.*`, shell logo render in `src/core/render/shell.ts`
