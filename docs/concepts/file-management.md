# File management

How sellers open, name, keep, and export newsletter work in this editor.
Audience: non-technical field sellers. English only.
**Status: shipped through v0.2.2** for library, recovery, HTML export, and single-template project transfer. Update this doc when product decisions change.

No backend. No `.env`. Client-side only. MIT / static-host friendly.

Related: `email-colors.md` (colors inside the document), `logo-upload.md` (embed size / quota), `design-system.md` (chrome), `block-content-editing.md`.

## Goals

- Sellers think in **named templates on their machine**, not storage internals.
- One place for file / export actions: header **overflow (hamburger) menu**, far right (after locale).
- Export filenames follow the **current template display name** (after rename, use the new name).
- Never silently overwrite a differently named draft without an explicit choice.
- Autosave may protect against browser crash; it must **not** replace conscious “this is my file”.
- Stay pure client-side; degrade gracefully where File System Access is weak or absent.
- Moving work to another machine uses **export current template** / **open exported template** (full document including colors when colors ship).

## Non-goals

- Multi-user cloud sync, accounts, or a newsletter CMS backend.
- Server-side PDF (Puppeteer) in the default product path.
- Git-style version DAG or branch UI for sellers.
- Teaching ListMonk’s template/body split as the primary mental model in the chrome (power users still get the right downloads).
- Multi-template bulk export/import in v1 (deferred — see Later).

## Document model

| Layer | Role | First-class? |
| --- | --- | --- |
| **Newsletter JSON** (`Newsletter`) | Editable document. Schema-versioned. Globals + blocks (+ future color chapter). Logo may embed base64. | **Yes — primary** |
| **Working session meta** | Display name, dirty flag, library binding, timestamps, optional last file name | Yes |
| **ListMonk shell / body HTML**, **full HTML** | Generated outputs | Export artifacts |
| **PDF** | Deferred until product unlock | Not offered in menu yet |
| **Browser recovery slot** | Crash recovery only | Not a seller “file” |

**Rule:** JSON is recoverable truth. HTML/PDF are **outputs**. Normal round-trip is open/export **template** files, not edit export HTML back into the model.

### Display name vs file stem

- **Display name** — what the seller sees (spaces, punctuation, local scripts allowed). Editable.
- **File stem** — derived via `sanitizeFileStem` for downloads (never trust raw user text as a path segment).
- **Export prefix** (`globals.exportFileNamePrefix`) — Campaign field for ListMonk pair stems when set.

**Default display names (start page):**

```text
CloudLib-EU-Example-Newsletter-Template      (demo German)
CloudLib-EU-Example-Newsletter-Template-EN   (demo English)
New newsletter / Neuer Newsletter            (blank, app language)
```

**Casual export filenames:** `{sanitizeFileStem(displayName)}.html`

**ListMonk pair:**

```text
{sanitizeFileStem(prefix || displayName)}-template.html
{sanitizeFileStem(prefix || displayName)}-body.html
```

### File stem sanitization

Pipeline (pure helper, unit-tested):

1. NFKC normalize.
2. Script / diacritic fold to Latin ASCII where practical (German, Turkish, common European maps; NFD + strip combining marks as fallback).
3. Non-Latin primary scripts: remaining non-`[A-Za-z0-9]` → separators; if stem empty → `Newsletter-Template` + short stable hash suffix of the original display name.
4. Whitespace and punctuation runs → single `-`. No spaces in the stem.
5. Pascal-ish segments on `-` (e.g. `q4 offer hotels` → `Q4-Offer-Hotels`).
6. Strip leading/trailing `-`, collapse `--`.
7. Forbid path/control characters (already removed by ASCII filter).
8. Length cap ~80 characters; truncate on `-` when possible.
9. Empty → `Newsletter-Template`.

**Display name is never silently rewritten** in the UI — only the download stem is sanitized.

## Mental model

```text
I am working on ONE current template.
It has a name.
I can rename it.
I can export it as HTML (name follows).
I can export this template to move it to another computer or browser.
I can keep copies under other names in this browser’s library.
The app may remember my last work when I reopen the browser — that is recovery, not my filing cabinet.
```

## Session state

| Field | Meaning |
| --- | --- |
| `newsletter` | Current JSON |
| `displayName` | Seller-facing name |
| `dirty` | True after edits since last explicit save (prefer dirty on rename too) |
| `autosavedAt` | Last crash-recovery write |
| `lastExplicitSaveAt` | Last Save / Save as / library write |
| `origin` | `seed` \| `autosave` \| `library` \| `disk` |
| `libraryId` | If bound to a named library entry |
| `diskFileName` | Last downloaded / opened file name if known |
| `fileHandle` | Optional FSA handle in memory only when available |

## Persistence layers

### Crash recovery (IndexedDB)

- Single recovery slot (legacy `nte:newsletter:v1` localStorage migrated once).
- Debounced write on edit **without** snackbar spam.
- Recovery is not multi-version history.
- Large logo embeds require IndexedDB (not localStorage alone).

### Named library (IndexedDB)

Each entry:

- `id`, `displayName`, `updatedAt`, `newsletter`
- **`createdWithAppVersion`** — app/package version that last wrote this entry (e.g. `0.2.2`). Shown in the Open library list next to date/time. Not a “template version” the seller manages; rename does not clear it — refresh on each successful library write from the running app.

UX: Open from library (modal), Save / Save as, Delete with irreversible confirm.

### Disk transfer (explicit)

| Menu action (seller copy) | Behavior |
| --- | --- |
| **Export current template** | Download one envelope for the **open** template. Always available. No “.json” in the label. |
| **Open exported template** | File picker → parse/migrate. If current `dirty`, confirm discard first. |

Never require File System Access for core workflows. FSA Save/Open may exist as progressive enhancement; fallback remains download + file input.

## Project file envelope

```text
{
  kind: 'nte-project'
  schemaVersion: number          // document data shape
  createdWithAppVersion: string  // app that wrote the file (package version)
  displayName: string
  libraryId: string | null
  newsletter: Newsletter         // includes colors once email-colors ships
  exportedAt: iso
}
```

- **v1 = current template only** (not the whole library).
- Open accepts: `nte-project` envelope, legacy recovery-style `{ newsletter }`, or bare `Newsletter`.
- Always run `normalizeNewsletter` on open.
- When email-colors ships: envelope carries palette + shell + **used** definition styles inside `newsletter` (see `email-colors.md`). Content-only sellers still get matching colors on another machine via this file.
- `createdWithAppVersion` is metadata for support and the library list — not a second schema. Older files without it: omit or show “unknown” in UI; still open if schema normalize succeeds.
- `schemaVersion` stays the data-contract version; sellers never manage it.

## Save semantics

### Unbound or Save as

- Ask for **name** (prefill current display name).
- Create new library entry; bind session; clear dirty.

### Bound to an existing name

```text
Title: Save template
Body:  “{displayName}” already exists as the current template.
[ Overwrite ]   [ Save under a new name… ]   [ Cancel ]
```

Do **not** split this into mysterious toolbar buttons. One Save affordance → smart dialog when needed.

## Start page and editor addresses

- `/` is the start page on every app launch: tiles **Blank newsletter** (first), **Demo template German**, **Demo template English**; a **Continue** card for unsaved work (never saved, or unsaved changes); **Recently used** = saved library entries, newest first.
- Blank = no blocks, house style (brand, logo, colors, legal footer) and texts in the app language. Demos always open as a fresh copy; the originals are never changed.
- `/edit/:id` is the editor for library entry `id` (UUID); `/edit/draft` is a newsletter not saved yet. Reload reopens exactly that newsletter. Save as / Open… replace the address. Unknown id → start page with a short notice.
- Leaving the editor for the start page with unsaved changes asks **Save / Discard / Cancel**. Discard returns a saved newsletter to its saved version and drops a never-saved draft.
- Storage sits behind one `TemplateRepository` (`core/persist/template-repository.ts`, IndexedDB today); components never talk to IndexedDB directly.

### Header vs menu

- Header (editor only): **Start** (icon + label), then **Undo / Redo**.
- Hamburger (**rightmost**, after locale): Start page, then all file + export.

## Hamburger menu IA

```text
☰ Menu
├── Current template
│   ├── Name: {displayName}          (Rename…)
│   ├── Save
│   ├── Save as…
│   ├── Open…                        (in-browser library)
│   └── Export as newsletter template (HTML)…
├── Transfer
│   ├── Export current template
│   └── Open exported template…
└── (top) Start page
```

Section label **Transfer** (or keep “Project” if copy already shipped — prefer **Transfer** when next touching i18n so sellers do not hear “project/JSON”). Implementation may still use `kind: 'nte-project'` internally.

### Why two different Open entries

| Menu item | Opens | Where data lives |
| --- | --- | --- |
| **Open…** | Named draft from **this browser’s library** | IndexedDB |
| **Open exported template…** | File from disk / USB / mail | Filesystem |

Do **not** merge into one dialog in v1.

### Library picker

- Modal: search, sort by date/name, scroll list, Open / Delete.
- Each row shows **display name**, **updated date/time**, and **app version** that last saved it (`createdWithAppVersion`), e.g. to the right of the timestamp: `v0.2.2`.
- Delete copy must state the action is irreversible.

### HTML export

Always a short choice dialog (never silent multi-download):

```text
Export as HTML
○ One complete HTML file — Roundcube / share / archive
○ Two files for Listmonk — template + body
[ Download ]
```

Naming:

1. Start from **current display name** (shown name wins even if not library-saved yet).
2. Empty name → `exportFileNamePrefix` → fallback stem.
3. Full HTML → display name stem. ListMonk pair → prefix if non-empty, else display name.
4. No date suffix by default.

### PDF

**Not in the menu** until an explicit unlock (lab + concept patch). Session work under `docs/sessions/pdf-export/`. No Puppeteer in this product. No dead placeholder menu item.

## Dirty navigation guards

Before Open, load library entry, open exported template, start page choices and leaving the editor for the start page:

- If `dirty` → Save / Discard / Cancel (in-app dialog, never `window.confirm`).
- `beforeunload` when dirty.

## i18n and copy

- Plain verbs: Save, Save as, Open, Export, Rename, Start.
- No “.json” in seller-facing labels.
- Preferred transfer labels (DE/EN catalogs):

| Key role | EN | DE |
| --- | --- | --- |
| Export current | Export current template | Aktuelle Vorlage exportieren |
| Open exported | Open exported template… | Exportierte Vorlage öffnen… |
| Snackbar exported | Template exported | Vorlage exportiert |
| Snackbar opened | Template opened | Vorlage geöffnet |

## Testing (minimum)

- Menu opens; HTML export blob name contains sanitized display name.
- Rename then export → new stem.
- Dirty Open → confirm path.
- Save overwrite vs save-as leaves two library entries when appropriate.
- Recovery restore after reload.
- Export current template / open round-trip preserves newsletter (and colors once implemented).
- Library row can show app version when field present.
- Quota / large logo: graceful error (coord with logo concept).
- No page scroll jump when menu opens.

## Later (not now)

- **Accounts and cloud storage:** sellers from other companies sign in and keep their templates in the cloud. Add a cloud `TemplateRepository` next to the IndexedDB one; ids are already UUIDs, so entries can move between the two.

- Export **all** saved library templates, or a **multi-select** of them; import all or selected. Same mental model as current transfer, wider scope.
- Optional FSA “true Save” polish where supported.
- PDF menu after product unlock path in next-session / pdf-export sessions.

## Locks

- No backend file API / no Puppeteer in this product.
- JSON is source of truth; HTML is export; PDF not offered until revisited.
- No old-style multi-button save row.
- Overwrite vs new name is always an explicit choice when it matters.
- Export uses the **currently shown** template name.
- Hamburger (rightmost) holds Start page + file + HTML export + transfer; header has Start plus undo/redo.
- HTML export always asks Full vs ListMonk pair.
- Library lives in IndexedDB; disk transfer is portability/backup.
- **v1 disk transfer = current template only.**
- Envelope stores `createdWithAppVersion` (app build), distinct from `schemaVersion`.
- Library list shows date/time and app version when known.
- Seller labels: no file-extension jargon.
- When colors ship: transfer includes document color state per `email-colors.md`.
- Spec before code; update this doc if product decisions change.
