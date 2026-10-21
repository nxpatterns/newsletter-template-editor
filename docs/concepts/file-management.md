# File management

How sellers open, name, keep, and export newsletter work in this editor.
Audience: non-technical field sellers. English only.
**Status: shipped** (library, crash recovery, HTML export, template file, start page, factory reset). Items marked *not built* are planned. Update this doc when product decisions change.

No backend. No `.env`. Client-side only. MIT / static-host friendly.

Related: `email-colors.md` (colors inside the document), `block-editor-and-demo-page.md` (own blocks, drafts, IDs, reset dialog extension), `logo-upload.md` (embed size / quota), `design-system.md` (chrome), `block-content-editing.md`.

## Goals

- Sellers think in **named templates on their machine**, not storage internals.
- **Save** and **Export HTML** are header buttons; every other file action sits in the ☰ menu next to them.
- Export filenames follow the **current template display name** (after rename, use the new name).
- Never silently overwrite a differently named draft without an explicit choice.
- Autosave may protect against browser crash; it must **not** replace conscious “this is my file”.
- Stay pure client-side; degrade gracefully where File System Access is weak or absent.
- Moving work to another machine uses **Save template as file** / **Load template file** (full document including colors).

## Non-goals

- Multi-user cloud sync, accounts, or a newsletter CMS backend.
- Server-side PDF (Puppeteer) in the default product path.
- Git-style version DAG or branch UI for sellers.
- Teaching ListMonk’s template/body split as the primary mental model in the chrome (power users still get the right downloads).
- Multi-template bulk export/import in v1 (deferred — see Later).

## Document model

| Layer | Role | First-class? |
| --- | --- | --- |
| **Newsletter JSON** (`Newsletter`) | Editable document. Schema-versioned. Globals + blocks + colors. Logo may embed base64. | **Yes — primary** |
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

Held by `src/app/editor/newsletter-session.service.ts`:

| Field | Meaning |
| --- | --- |
| `newsletter` | Current JSON |
| `displayName` | Seller-facing name |
| `dirty` | True after edits since the last save |
| `libraryId` | Library entry the session is bound to, if any |

Not built: separate autosave / explicit-save timestamps, last disk file name, File System Access handle.

## Persistence layers

### Crash recovery (IndexedDB)

- Single recovery slot (legacy `nte:newsletter:v1` localStorage migrated once).
- Debounced write on edit **without** snackbar spam.
- Recovery is not multi-version history.
- Large logo embeds require IndexedDB (not localStorage alone).

### Named library (IndexedDB)

Each entry:

- `id`, `displayName`, `updatedAt`, `newsletter`, optional `pinnedAt` (pinned to the top of the start page; overwriting keeps the pin, a copy starts unpinned)
- *Not built:* `createdWithAppVersion`, the app version that last wrote the entry, to show next to date/time in the library list. Not a template version the seller manages.

UX: Open from library (modal), Save / Save as, Delete with confirm (on the start page with Undo in the snackbar).

### Disk transfer (explicit)

| Menu action (seller copy) | Behavior |
| --- | --- |
| **Save template as file (.json)** | Download one envelope for the **open** template. Always available. |
| **Load template file…** | File picker → parse/migrate. If current `dirty`, ask first. |

Never require File System Access for core workflows. FSA Save/Open may exist as progressive enhancement; fallback remains download + file input.

## Project file envelope

```text
{
  kind: 'nte-project'
  schemaVersion: number          // document data shape
  displayName: string
  libraryId: string | null
  newsletter: Newsletter         // includes colors
  exportedAt: iso
}
```

- **v1 = current template only** (not the whole library).
- Open accepts: `nte-project` envelope, legacy recovery-style `{ newsletter }`, or bare `Newsletter`.
- Always run `normalizeNewsletter` on open.
- Colors travel inside `newsletter` (`email-colors.md`), so another machine shows the same look.
- *Not built:* `createdWithAppVersion` (app version that wrote the file), metadata for support only, not a second schema. Files without it must still open.
- Own blocks (planned) use the same envelope with a type field (`block-editor-and-demo-page.md`).
- `schemaVersion` stays the data-contract version; sellers never manage it.

## Save semantics

- **Save** (header button, ⌘/Ctrl+S): bound to a library entry → overwrites it directly; not bound → asks for a name (Save as).
- **Save as…** (menu): asks for a name, prefilled with the current display name, and creates a new library entry; the session binds to it and is clean.
- Save vs Save as is the explicit choice between overwrite and new name. No row of mysterious save buttons.
- The header shows the state next to the template name: "Not saved", "Saved", or "Changes discarded".

## Start page and editor addresses

- `/` is the start page on every app launch: tiles **Blank newsletter** (first), **Demo template German**, **Demo template English** (to be renamed "Example template", `block-editor-and-demo-page.md`); a **Continue** card for unsaved work (never saved, or unsaved changes); **Recently used** = saved library entries, pinned first, then newest first; pin, unpin and delete with Undo.
- Blank = no blocks, house style (brand, logo, colors, legal footer) and texts in the app language. Demos always open as a fresh copy; the originals are never changed.
- `/edit/:id` is the editor for library entry `id` (UUID); `/edit/draft` is a newsletter not saved yet. Reload reopens exactly that newsletter. Save as / Open… replace the address. Unknown id → start page with a short notice.
- Leaving the editor for the start page with unsaved changes asks **Save / Discard / Cancel**. Discard returns a saved newsletter to its saved version and drops a never-saved draft.
- Storage sits behind one `TemplateRepository` (`core/persist/template-repository.ts`, IndexedDB today); components never talk to IndexedDB directly.

### Header vs menu

- Header (editor): title back to the start page, template name and save state, **Undo / Redo**, **Save**, **Export HTML**, ☰ menu. The language menu is rightmost (`design-system.md`).
- Start page: ☰ start menu instead of the file menu.

## Menu IA

```text
☰ Menu (editor)
├── This template: {displayName} · Not saved / Saved
│   ├── Rename…
│   └── Save as…
├── Other template
│   └── Open…                          (in-browser library)
├── Backup as file
│   ├── Save template as file (.json)
│   └── Load template file…
└── Reset everything to defaults…      (danger)

☰ Start menu (start page)
├── Start new: Blank newsletter, demo templates
├── Saved templates (recent) · Open…
└── Reset everything to defaults…
```

Labels are the shipped EN strings (`file.*`, `startMenu.*`, `reset.*`). The template file label shows "(.json)"; the earlier rule "no file extension in labels" is not applied there. Internally the envelope stays `kind: 'nte-project'`.

### Factory reset

"Reset everything to defaults…" deletes templates, the working draft and view settings after an acknowledge step ("I understand that this cannot be undone."); the app language stays (`src/app/shell/factory-reset.service.ts`). The planned extension with one checkbox per kind of data is in `block-editor-and-demo-page.md`.

### Why two different Open entries

| Menu item | Opens | Where data lives |
| --- | --- | --- |
| **Open…** | Named draft from **this browser’s library** | IndexedDB |
| **Load template file…** | File from disk / USB / mail | Filesystem |

Do **not** merge into one dialog in v1.

### Library picker

- Modal: search, sort by date/name, scroll list, Open / Delete.
- Each row shows **display name** and **updated date/time**. *Not built:* app version next to it (`createdWithAppVersion`).
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

With social links in the footer and an image address set, the download is a ZIP: the HTML plus `social/*.png` to upload there (`block-content-editing.md`, footer social row).

### PDF

**Not in the menu** until an explicit unlock (lab + concept patch). Session work under `docs/sessions/analysen/pdf-export`. No Puppeteer in this product. No dead placeholder menu item.

## Dirty navigation guards

Before Open, load library entry, load template file, start page choices and leaving the editor for the start page:

- If `dirty` → Save / Discard / Cancel (in-app dialog, never `window.confirm`).
- `beforeunload` when dirty.

## i18n and copy

- Plain verbs: Save, Save as, Open, Export, Rename, Start.
- Shipped transfer labels (DE/EN catalogs):

| Key | EN |
| --- | --- |
| `file.downloadProject` | Save template as file (.json) |
| `file.openProject` | Load template file… |
| `file.projectDownloaded` | Template exported |
| `file.projectOpened` | Template opened |

## Testing (minimum)

- Menu opens; HTML export blob name contains sanitized display name.
- Rename then export → new stem.
- Dirty Open → confirm path.
- Save overwrite vs save-as leaves two library entries when appropriate.
- Recovery restore after reload.
- Template file save / load round-trip preserves newsletter and colors.
- Quota / large logo: graceful error (coord with logo concept).
- No page scroll jump when menu opens.

## Later (not now)

- **Accounts and cloud storage:** sellers from other companies sign in and keep their templates in the cloud. Add a cloud `TemplateRepository` next to the IndexedDB one; ids are already UUIDs, so entries can move between the two. ID and tenant rules for all stored objects: `block-editor-and-demo-page.md` (decision 24).

- Export **all** saved library templates, or a **multi-select** of them; import all or selected. Same mental model as current transfer, wider scope.
- Optional FSA “true Save” polish where supported.
- `createdWithAppVersion` on library entries and template files, shown in the library list.
- PDF menu after product unlock path in next-session / pdf-export sessions.

## Locks

- No backend file API / no Puppeteer in this product.
- JSON is source of truth; HTML is export; PDF not offered until revisited.
- No old-style multi-button save row.
- Overwrite vs new name is always an explicit choice when it matters.
- Export uses the **currently shown** template name.
- Header has Undo / Redo, Save and Export HTML; the ☰ menu holds rename, save as, open, template file and reset.
- HTML export always asks Full vs ListMonk pair.
- Library lives in IndexedDB; disk transfer is portability/backup.
- **v1 disk transfer = current template only.**
- `schemaVersion` is the data contract; an app version field, once added, stays separate from it.
- Library list shows date/time.
- Transfer includes the document colors (`email-colors.md`).
- Spec before code; update this doc if product decisions change.
