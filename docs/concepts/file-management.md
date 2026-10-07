# File management

Concept for how operators open, name, keep, and export newsletter work in this editor.
Audience: non-technical field sellers. English only.
**Status: agreed (decisions locked 2026-10-07). Implement only after explicit go.**

This is **priority zero** before more structured-field / WYSIWYG work.
No backend. No `.env`. Client-side only. MIT / static-host friendly.

---

## Problem we are solving

### What failed in the old Dogan editor

- Toolbar mixed **version identity**, **save semantics**, **preview toggles**, and **export** in one crowded row.
- Controls like “Speichern”, a free “Versionsname” field, a version `<select>`, and poorly labelled actions felt like a catastrophe to sellers.
- Missing the only question that matters when a name already exists:

> Do you want to **overwrite** the loaded template, or **save under a new name**?

- HTML and PDF export **worked**, but buttons were easy to miss and labels did not say *what* you get.
- Server-backed version list + Puppeteer PDF are **not** available in this MIT static product.

### What exists today (v0.1.7)

- One `localStorage` key (`nte:newsletter:v1`) holding a single `StoredEnvelope` (newsletter JSON + `savedAt`).
- Header **Save** = write that slot + snackbar; **Reset** = seed CloudLib demo again.
- `globals.exportFileNamePrefix` (default `CloudLib-Listmonk`) already exists for filename stems.
- Renderer: `renderExport()` (sync) + **`renderExportOptimized()`** (async logo crush for HTML downloads).
- Logo upload in Brand tab (master embed + display size); replace/clear via **app confirm dialog** (`ConfirmDialogService`) — reuse this for Save overwrite / dirty guards (no `window.confirm`).
- No Open/Save-as-to-disk, no multi-draft library, no HTML download menu yet; recovery still localStorage-only (logo embeds make **IndexedDB recovery urgent** in the first file-management slices).

---

## Goals

- Sellers think in **named templates on their machine**, not “localStorage blobs”.
- One clear place for **file / export** actions: header **overflow (hamburger) menu**, far right (after locale).
- Export filenames follow the **current template display name** (after rename, use the new name).
- Never silently overwrite a differently named draft without an explicit choice.
- Autosave may protect against browser crash; it must **not** replace conscious “this is my file”.
- Stay pure client-side; degrade gracefully on Safari / iOS / Firefox where File System Access is weak or absent.

## Non-goals

- Multi-user cloud sync, accounts, or a newsletter CMS backend.
- Server-side PDF (Puppeteer) in the default product path.
- Git-style version DAG or branch UI for sellers.
- Teaching ListMonk’s template/body split as the primary mental model in the chrome (power users still get the right downloads).

---

## Core model: what is a “document”?

### Source of truth

| Layer | Role | First-class? |
| --- | --- | --- |
| **Newsletter JSON** (`Newsletter`) | Editable document. Schema-versioned. Includes globals + blocks. Logo may embed base64. | **Yes — primary file** |
| **Working session meta** | Display name, dirty flag, optional last disk path/handle, last export stem, `savedAt` | Yes (session + optional library index) |
| **ListMonk shell HTML** | Generated from JSON | Export artifact |
| **ListMonk body HTML** | Generated from JSON | Export artifact |
| **Full standalone HTML** | Generated from JSON (share / archive / print-friendly) | Export artifact |
| **PDF** | Raster/layout snapshot of preview-quality HTML | Export artifact (see PDF section) |
| **Browser autosave slot** | Crash recovery only | Not a “file” sellers manage |

**Rule:** JSON is always recoverable truth. HTML/PDF are **outputs**. Never edit export HTML back into the model as the normal path (import JSON only for round-trip).

### Display name vs file stem

- **Display name** — what the seller sees in the UI (may contain spaces, punctuation, local scripts). Editable.
- **File stem** — always derived for downloads via `sanitizeFileStem(displayName | prefix)` (never trust raw user text as a path segment).
- **Export prefix** (`globals.exportFileNamePrefix`) — Campaign field for ListMonk pair stems when set.

**Default display name (seed / reset demo)** — locked:

```text
CloudLib-EU-Example-Newsletter-Template
```

(Already ASCII + hyphens; matches stem rules without further mangling.)

**Casual export filenames:**

```text
{sanitizeFileStem(displayName)}.html
```

**ListMonk pair:**

```text
{sanitizeFileStem(prefix || displayName)}-template.html
{sanitizeFileStem(prefix || displayName)}-body.html
```

### File stem sanitization (locked approach)

Goal: safe, portable names on Windows/macOS/iOS/Android Downloads folders and mail attachments — without requiring sellers to understand encoding.

Pipeline (pure helper, unit-tested):

1. **NFKC normalize** the string (compatibility decomposition).
2. **Script / diacritic fold to Latin ASCII where practical:**
   - German (and similar): `ä→ae`, `ö→oe`, `ü→ue`, `Ä→Ae`, `ß→ss`, …
   - Turkish: `ı/I → i`, `İ → I` then lower rules carefully; `ş→s`, `ğ→g`, `ç→c`, …
   - Serbian/Croatian Latin: `č→c`, `ć→c`, `š→s`, `ž→z`, `đ→dj`, …
   - Use a small explicit map for common European letters + `String#normalize('NFD')` + strip combining marks as a general Latin fallback.
3. **Non-Latin scripts (Chinese, Arabic, Cyrillic-as-primary, etc.):**
   - **Do not** invent wrong “phonetic English” by guessing.
   - After folding, any remaining code point outside `[A-Za-z0-9]` becomes a separator candidate.
   - If the stem would be **empty** or only separators (e.g. pure CJK/Arabic name): fall back to
     `Newsletter-Template` plus a short **stable suffix** from a hash of the original display name (e.g. 6 hex chars) so two different Chinese titles do not both become the same file:
     `Newsletter-Template-a3f2c1`.
   - Optional later (not v1): a tiny optional transliteration library — only if sellers demand readable Latin from CJK; license must stay MIT.
4. **Separators:** whitespace and runs of punctuation/`_` → single `-`. No spaces in the stem.
5. **Casing:** **Pascal-ish path segments** — split on `-`, capitalize each ASCII segment’s first letter, rest lower (or keep existing Camel inside segment if already mixed). Example: `q4 offer hotels` → `Q4-Offer-Hotels`. All-caps acronyms of length 2–4 may stay upper if detected simply; do not over-engineer.
6. **Strip** leading/trailing `-`, collapse `--` → `-`.
7. **Forbid** path characters: `/\?%*:|"<>` and control chars — already removed by the ASCII filter.
8. **Length cap:** ~80 characters for the stem (OS/email-safe); truncate on a `-` boundary when possible.
9. **Empty after all that** → `Newsletter-Template`.

**Display name is never silently rewritten** in the UI — only the download stem is sanitized. Sellers can keep `Müller Q4` on screen; file becomes `Mueller-Q4.html`.

Exact pairing labels remain plain language in the menu (see Menu IA).

---

## Mental model for sellers

```text
I am working on ONE current template.
It has a name.
I can rename it.
I can export the current template as HTML or PDF (name follows).
I can keep copies under other names / on disk without losing the one I have open.
The app may remember my last work when I reopen the browser — that is recovery, not my filing cabinet.
```

Avoid: multiple primary verbs that all mean “persist something somewhere” (`Aktualisieren`, `Mit Name`, `Speichern`, `Download` mixed without a dialog).

---

## Session state (proposed)

Extend beyond bare `Newsletter` with a thin **document session** (still client-only):

| Field | Meaning |
| --- | --- |
| `newsletter` | Current JSON |
| `displayName` | Seller-facing name |
| `dirty` | True after edits since last **explicit** save (disk or named library entry) |
| `autosavedAt` | Last crash-recovery write |
| `lastExplicitSaveAt` | Last Save / Save as / library write |
| `origin` | `seed` \| `autosave` \| `library` \| `disk` |
| `libraryId` | If bound to a named library entry |
| `diskFileName` | Last downloaded / opened file name if known |
| `fileHandle` | Optional File System Access handle when available (not serializable to JSON; keep in memory + IndexedDB if we adopt handles later) |

`dirty` must flip on content edits; rename-only may be dirty for library binding but not for “content lost” warnings — decide in implementation: **prefer dirty on rename too** so Save is never ambiguous.

---

## Persistence layers

### Crash recovery (localStorage / IndexedDB)

- Keep a single **recovery** slot (migrate today’s `nte:newsletter:v1`).
- Write debounced on edit (e.g. 500–1000 ms) **without** snackbar spam.
- On load: restore recovery if present; show name in header.
- Recovery is **not** multi-version history.

**Quota risk:** base64 logos + long HTML-ish fields can blow past ~5 MB localStorage. Prefer **IndexedDB** for recovery envelope once logo upload ships (or sooner). Concept dependency: `logo-upload.md`.

### Named library (optional v1 slice)

In-browser list of named drafts (IndexedDB), each:

- `id`, `displayName`, `updatedAt`, `newsletter` (or pointer)

UX:

- Open from library
- Save (overwrite bound entry if named + confirm if needed)
- Save as (new name → new entry)
- Delete entry

This replaces the old server version `<select>` with something that stays offline.

**Decision (2026-10-07):** **In-browser library (IndexedDB) + disk export/open in v1**, plus crash recovery. Do not rebuild the old select+name+save row. Library is the seller-facing “named versions”; disk JSON is portability/backup.

### Disk files (explicit)

| Action | Behavior |
| --- | --- |
| **Download project (JSON)** | Always available. Blob download of envelope + name + schema. |
| **Open project (JSON)** | `<input type=file accept=…>` + parse/migrate. If current `dirty`, confirm discard/export first. |
| **Save to disk (FSA)** | Where `showSaveFilePicker` exists: write JSON; keep handle for true Save. Fallback = download. |
| **Open from disk (FSA)** | Where `showOpenFilePicker` exists; else file input. |

Never require FSA for core workflows.

---

## Save semantics (the dialog we missed)

When the user chooses **Save** / **Save as** / closes with dirty / opens another file:

### If unbound or “Save as”

- Ask for **name** (prefill current display name).
- Create new library entry and/or download JSON under that stem.
- Bind session to that name; clear dirty.

### If bound to an existing name

Show a clear choice dialog (plain language, two primary actions + cancel):

```text
Title: Save template
Body:  “{displayName}” already exists as the current template.
[ Overwrite ]   [ Save under a new name… ]   [ Cancel ]
```

- **Overwrite** — write library entry / disk handle; snackbar “Saved “{name}””.
- **Save under a new name…** — name field → new identity; leave old entry untouched.
- **Cancel** — no write.

Do **not** split this into mysterious toolbar buttons. One Save affordance → smart dialog when needed.

### Header Save button vs menu

**Decision (2026-10-07):**

- Toolbar: **Undo / Redo only** (remove Save and Reset icons from the toolbar).
- Hamburger (**rightmost** control, after locale): **all** file + export + reset-to-demo.
- One Save meaning only — the menu item runs the overwrite / save-as dialog pipeline.

---

## Header chrome and hamburger menu

### Placement

Far **right** of the header, **after** the locale switch (or immediately before locale if locale must stay outermost — **prefer menu as rightmost control** so “files/export” is a stable corner).

```text
[ Brand ]     [ Undo Redo ]     [ DE | EN ]  [ ☰ ]
```

Follow design-system: toolbar flex-wrap; menu panel dismiss control top-end if it is a sheet on mobile.

### Menu information architecture (proposed)

```text
☰ Menu
├── Current template
│   ├── Name: {displayName}          (inline rename or “Rename…”)
│   ├── Save
│   ├── Save as…
│   ├── Open…                        (from in-browser library — see below)
│   └── ───
│   └── Export as HTML…              (choice dialog; no PDF in v1)
├── Project
│   ├── Download project file (.json)
│   └── Open project file (.json)    (from disk — see below)
└── Danger zone
    └── Reset to demo template…
```

### Why two different “Open” entries (not one)

Sellers have **two places** drafts can live. Mixing them in one picker caused the old Dogan confusion.

| Menu item | What it opens | Where data lives | When to use |
| --- | --- | --- | --- |
| **Open…** (under Current template) | A **named draft from the in-app library** | IndexedDB in this browser profile | Day-to-day: “the version I saved last Tuesday in the editor” |
| **Open project file (.json)** (under Project) | A **file from disk / Downloads / USB / mail attachment** | User’s filesystem | Portability: hand off to a colleague, backup, other device, other browser |

Same idea as “Open recent document” vs “Open file…” in office apps — not two competing save systems.

- Library Open → modal list (`displayName` + `updatedAt`, Open / Delete).
- Project Open → file picker (`accept` application/json / `.json`), parse envelope, dirty confirm first.
- **Download project file** is the inverse of Project Open (export the JSON source).
- Do **not** merge into one dialog in v1.

**Export as HTML…** always opens a **short choice dialog** (never silent multi-download):

```text
Export as HTML
○ Full email (single file) — share / archive / open in browser
○ ListMonk pair (template + body) — paste into ListMonk
[ Download ]
```

**Decision (2026-10-07):** always ask; no one-click default that hides the second path.
Old product auto-downloaded shell + body with fixed CloudLib filenames; that surprised people. Named, chosen, explained.

**Export as PDF…** — **not in v1 menu.** Deferred until a good client-side approach exists (no Puppeteer, no backend). Do not show a dead menu item.

### Naming on export

1. Start from **current display name** (after rename, that string wins).
2. If display name empty → fall back to `exportFileNamePrefix` → fall back to `newsletter`.
3. Sanitize to file stem.
4. Optionally append short date for PDF only if we want sortability — **default no date** so re-export replaces cleanly in Downloads; sellers who want versions change the **name**.

**Tricky case:** user renames in header but does not Save. Export **still** uses the name currently shown (export is about the working copy, not last library write).

**Tricky case:** ListMonk pair + custom prefix. If prefix is set and differs from display name, prefer:

- Full HTML / PDF → **display name**
- ListMonk pair → **prefix** if non-empty, else display name  

Document this in UI hints so it is not magic.

---

## PDF without a backend

Old stack: `POST /api/pdf` + Puppeteer. **Out of scope** for static MIT build.

### Options

| Approach | Pros | Cons |
| --- | --- | --- |
| **A. Browser print** (`window.print` on preview HTML) | Zero deps; best native quality | User must pick “Save as PDF”; inconsistent chrome; harder autofile name |
| **B. Client library** (e.g. html2canvas + jsPDF) | One-click download | Heavy; CSS/email table fidelity often poor; dark backgrounds tricky |
| **C. Embed print-friendly window + guided UI** | Honest UX; name suggestion copied | Not one pure blob download everywhere |
| **D. Defer PDF** | Focus HTML + JSON first | Sellers lose a loved button |

**Decision (2026-10-07):** **Omit PDF from the product menu for now.** HTML + JSON + library only. Revisit later with a dedicated client approach if needed.  
Do **not** reintroduce a Node/Puppeteer PDF service into this repo.  
Do **not** ship a placeholder PDF item that confuses sellers.

---

## Dirty navigation guards

Before: Open, Reset to demo, load library entry, browser tab close:

- If `dirty` → confirm: Stay / Discard / Save first (Save runs normal pipeline).
- `beforeunload` when dirty (browser-native).

---

## Relationship to existing Save / Reset

| Today | Future |
| --- | --- |
| Save icon → localStorage + snackbar | Save → recovery write + optional library/disk overwrite flow + snackbar |
| Reset → seed + snackbar | Move under menu only; confirm if dirty; still available for demo |
| No export | Hamburger HTML export (choice dialog); no PDF v1 |
| Single slot | Recovery + **IndexedDB library** + disk JSON |

Autosave recovery should **not** toast on every keystroke.

---

## i18n and copy principles

- Menu labels plain: “Export as HTML”, not “Download artifacts”.
- Prefer verbs sellers use: Save, Save as, Open, Export, Rename, Reset demo.
- DE/EN via existing catalogs; no raw HTML words in seller-facing export names unless technical ListMonk dialog needs them — then “ListMonk template (shell)” / “ListMonk body”.

---

## Testing (minimum when implementing)

- BDD: menu opens; Export HTML downloads a blob whose name contains sanitized display name.
- Rename then export → new stem.
- Dirty Open → confirm path.
- Save overwrite vs save-as leaves two library entries when library exists.
- Recovery restore after reload.
- Quota / large logo: graceful error snackbar (coord with logo concept).
- No page scroll jump when menu opens (shell locks).

---

## Implementation slices (after approval only)

Suggested order (small PRs):

1. Document session: `displayName`, `dirty`; show name in header; debounced recovery.
2. IndexedDB **library** CRUD + migrate off single localStorage-only mental model (recovery may move to IDB early).
3. Hamburger shell + menu IA; strip Save/Reset from toolbar (Undo/Redo only); design-system note.
4. Save / Save as / Open dialogs (overwrite vs new name) bound to library.
5. HTML export choice dialog (full vs ListMonk pair) + filename helper + snackbar.
6. Disk JSON download/open (portability) + dirty guards + `beforeunload`.
7. No PDF slice until a later concept revision.
8. Coordinate logo embed quota with `logo-upload.md`.

---

## Decisions locked (2026-10-07)

| Topic | Choice |
| --- | --- |
| Named drafts | **IndexedDB library + disk JSON** in v1 (+ crash recovery) |
| Toolbar | **Undo / Redo only** |
| File / export / reset | **Hamburger, rightmost** (after locale) |
| HTML export | **Always short dialog:** Full email **or** ListMonk pair |
| PDF | **Omit menu item** until a solid client solution exists |
| Reset | Menu only, with dirty confirm |
| IndexedDB | **Now** (library requires it; helps logo quota later) |

### Locked product facts (not open)

- **`exportFileNamePrefix`:** already a Campaign-tab field (default `CloudLib-Listmonk` in seed/defaults). **Keep it.** Naming rules:
  - Full HTML (and future PDF): **display name** of the current template.
  - ListMonk pair files: use **prefix if non-empty**, else display name, then sanitize (`…-template.html` / `…-body.html`).
- **Library “list UI”** means only *how Open presents saved named drafts* in the browser library (IndexedDB) — not a second product concept. Default for v1: **modal picker** (searchable list of `displayName` + `updatedAt`, Open / Delete). Not a permanent side-rail of files. Disk JSON remains separate menu items.

### Locked at review (2026-10-07, post v0.1.7)

- Default seed `displayName`: **`CloudLib-EU-Example-Newsletter-Template`**.
- File stems: **`sanitizeFileStem`** as specified above (no spaces; Latin fold; non-Latin → hash suffix fallback).
- Library Open and Project JSON Open: **two separate menu entries** (explained above).
- Recovery migration `nte:newsletter:v1` → IndexedDB envelope **approved** (include `displayName`, `libraryId`, newsletter, timestamps).

### Still open (minor — at implement)

- Save-as overwrite dialog could offer explicit “Save under new name” in one step (Save as menu exists).

### Deferred (separate concept later)

- Undo/Redo **hover labels** (what would undo/redo): requires labeled history entries — not file-management scope; schedule after structure-first slices.

---

## Locks

- No backend file API / no Puppeteer in this product.
- JSON is source of truth; HTML is export; PDF not offered until revisited.
- No old-style multi-button save row (`Aktualisieren` / `mit Name` chaos).
- Overwrite vs new name is always an explicit choice when it matters.
- Export uses the **currently shown** template name.
- Hamburger (rightmost) holds file + HTML export + reset; toolbar is undo/redo only.
- HTML export always asks Full vs ListMonk pair.
- v1 library lives in IndexedDB; disk JSON is backup/portability.
- Spec before code; update this doc if product decisions change.

---

## Related

- `docs/sessions/next-session.md` — priority zero handoff
- `docs/concepts/logo-upload.md` — binary size vs recovery quota
- `docs/concepts/block-content-editing.md` — structure-first editing
- `docs/concepts/design-system.md` — header, snackbar, dismiss rules
- Code today: `src/core/persist/storage.ts`, `src/core/render/index.ts` (`renderExport`), `src/app/app.html` header toolbar
