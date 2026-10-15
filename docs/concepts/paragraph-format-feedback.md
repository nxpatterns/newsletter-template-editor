# Paragraph editor visual clone

Concept for making the Paragraph lite editor show the same visual truth as the email preview body copy, with commit-on-save preview updates and optional format inspect chrome.

Audience: non-technical field sellers. English only.

Related: `block-content-editing.md` (paragraph lite kit, edit modal), `email-colors.md` (theme tokens), `AGENTS.md` (classes in source, inline only at export).

This document **replaces** the earlier optional “toolbar active state / format status line” draft and the failed 2026-10-14 attempt log. It does **not** reopen closed v0.2.3 kit bugs.

---

## Problem

Sellers edit paragraph rich text in a surface that is already `contenteditable` with real HTML from the mark tree, but it **looks like a plain textarea** (app form chrome, incomplete type/color fidelity).

Consequences:

- Appearance (lead, callout, fine, …), theme colors, and link styling are hard to judge without opening **Code** (debug) or reading the iframe preview.
- Today the iframe preview **live-updates while typing**. The left preview never stays on the pre-edit state, so sellers cannot compare **before vs after** while the modal is open.
- Code view answers “what markup is this?” — not “what will the reader see?”

The gap is **visual fidelity and edit/commit UX**, not a missing second document model.

---

## Goals

- Inside the paragraph edit modal, the writing surface is a **visual clone** of how that paragraph body renders in the email preview (type roles, theme colors, links, spacing).
- App shell / modal chrome / toolbar keep **fixed editor UI colors**. Only the editor surface adopts **document theme** tokens.
- While the paragraph modal is open, the **main email preview stays frozen** on the snapshot from modal open (before). The modal shows the working draft (after). **Save** commits draft → session → preview; **Cancel** discards draft; preview was never dirtied.
- Sellers can still **undo/redo** inside the paragraph editor while drafting.
- Optional **Info** inspect mode explains Appearance / Color (and related marks) without requiring Code view.
- Optional **email width** control sizes the clone to the mail content width without locking modal geometry.
- Stay inside the lite kit: JSON mark tree, theme tokens only, no free hex, no TipTap-in-iframe, no Material.

## Non-goals

- Freezing live preview for **non-WYSIWYG** blocks (hero, benefits, CTA, plain fields, …). Those keep **live preview while typing** as shipped.
- Pixel-identity with every mail client, dark-mode inversion edge cases, or export-inlined HTML inside the editor.
- Full mail layout (header, chapter bands, neighbors) inside the modal — only the paragraph body clone. Context remains the iframe beside the modal.
- Making Code view seller-primary.
- Replacing the mark tree or introducing a heavy editor framework only for skin/chrome.
- Changing export / inliner rules.
- Yellow per-glyph “mark highlighters” as the primary affordance (Info mode uses calm borders/labels).

---

## Scope: which blocks freeze preview

| Surface | Preview while modal open | Commit |
| --- | --- | --- |
| **Paragraph** (only WYSIWYG / lite rich-text editor today) | **Frozen** at open snapshot | **Save** writes draft into session and refreshes preview |
| All other block inspectors (plain / structured fields) | **Live** updates while editing (unchanged) | Save / Cancel as today |

Rationale: simple blocks mostly change strings; size and color come from the block/theme, not from in-text marks. Live preview is enough. Paragraph is the only place where **in-text appearance** is the product; the modal clone carries that burden, so the iframe can stay on “before” for comparison.

If a second WYSIWYG lite surface appears later (e.g. brand name / legal notice), it should follow the **same freeze-until-save** rule. Do not invent a third model.

---

## Visual clone (render truth)

### Principle

The editor surface must use the **same render truth** as preview body copy for paragraph content:

- Same classed HTML produced from the mark tree (`richDocToHtml` / paragraph render path).
- Same CSS source of truth as email body paragraph styles (shared `email-css` / document theme slots — not a one-off “approx” stylesheet that drifts).
- Editor-only flags (`forEditor: true`) may add editing affordances (selection, link hit targets) but must **not** change seller-visible type size, color roles, or link look relative to preview.

### What the clone includes

- Semantic size tokens (`body`, `lead`, `callout`, `fine`, `caption`) at preview scale.
- Theme text colors (span + paragraph base color cascade as in the kit).
- Link styling (ice/accent, underline on hover/focus only, spacing).
- Bold / italic / strike / mono / sup / sub as in preview.
- Paragraph spacing consistent with `.paragraph-body` in mail CSS.
- Background of the **writing surface** from the content/paragraph slot of the **current document theme** (so Glacier vs a future light theme both read correctly). Not the app panel background painted as “body text on gray textarea.”

### What the clone excludes

- Surrounding email chrome (header, legal, other blocks).
- Export-only inlining (`style="…"` baked for clients).
- Forcing the whole modal or app into newsletter colors.

### Width and scale

- Modal remains freely draggable/resizable (existing geometry persistence). Do **not** lock the seller into a fixed window size.
- Provide a control (button) **“Email width”** (i18n label TBD) that sets the **clone content width** to the mail content column width (same measure the preview uses for the body column).
- After that, the seller may still widen/narrow the modal; the clone may grow with the modal or keep the email width with horizontal margin — product default: apply email width to the content box, leave modal chrome free.
- Goal is comparable line wraps to the iframe paragraph, not a straitjacket.

---

## Draft model and preview freeze

### While paragraph modal is open

1. On open: capture **block snapshot** (already required for Cancel) and keep the **session/preview** on that committed state (or explicitly pin preview to snapshot — implementation detail, same UX).
2. All typing and toolbar actions update a **local draft** `RichDoc` inside the modal/editor only.
3. Local **undo/redo** (already shipped) operates on that draft.
4. Main email preview **does not** re-render from draft keystrokes.
5. Seller sees: **iframe = before**, **modal clone = after**.

### Save

- Commit draft → paragraph block in session → preview refresh → close modal (same intentional exit rules: not backdrop).
- Clear or supersede any **draft cache** for this block (see below) after successful save.

### Cancel / Escape

- Discard in-memory draft; session/preview already match pre-open snapshot (no restore churn if freeze was correct).
- Close modal. Do **not** auto-write draft into the document.

### Intermediate draft cache (unsaved exit)

Sellers may want to leave the modal without Save but keep work for later:

- Provide an explicit **stash / remember draft** action (copy TBD; not the same as Save). Implementation may use `localStorage` (or equivalent client persistence). **No env files; no secrets.**
- Stash stores enough to restore the draft `RichDoc` for that block id (and document identity if multiple docs exist later), plus a simple timestamp/label.
- Stash does **not** mutate the newsletter document or preview.
- On **Cancel** after stash: exit with document unchanged; cache retained.
- On **Cancel** without stash: draft gone (unless product later adds “auto-stash on cancel” — default is **explicit stash only** to avoid surprise).
- When opening the paragraph editor for a block that has a **newer stashed draft** than the committed block:
  - Confirm dialog: restore previous unsaved changes? **Yes / No**.
  - Yes → load stash into local draft (preview still frozen on committed block until Save).
  - No → keep committed content; offer to drop stash or keep it for a later open (product default: discard stash on No to avoid zombie prompts — document the choice in implementation notes).

This lowers Save pressure without turning every Cancel into a silent document write.

---

## Info inspect mode

Optional toggle on the paragraph toolbar (name: **Info** or i18n equivalent).

### Behavior

- **Off (default):** clone only; no annotation chrome.
- **On:** read-only overlays that show structure:
  - Each paragraph node (`p`): calm border/outline plus labels for **Appearance** (size token if relevant at paragraph level) and **base Color** when set.
  - Inline runs with size/color/marks: calm outline or chips for active roles (e.g. `Callout · Italic`, `Accent`, `Link`) so seed phrases that are span-level callouts are visible — paragraph-only frames are not enough.
- Labels use seller i18n (`rt.size.*`, `rt.color.*`, mark names), not raw token ids alone.
- Does not change the mark tree, selection behavior for normal editing more than necessary, or export HTML.

### Hard rule

Inspect chrome must **never** serialize into `RichDoc` / `richDocFromEditorRoot`. Prefer overlay layer or non-serializable markers stripped on parse. Toggle on/off must round-trip an identical document.

### Relation to Code view

- **Clone** = what the reader sees.
- **Info** = which kit roles are applied.
- **Code** = debug / classed HTML, selectable, not editable (unchanged role).

---

## Toolbar active state (later, optional)

Classic “caret → pressed Bold/Italic, Appearance select shows current token” remains a **follow-up**, not the foundation of this concept.

If revisited:

- Small isolated change after clone + freeze are stable.
- No hover-first global `selectionchange` design that previously broke live preview (and would be less critical once preview is frozen, but still can break caret/input).
- Do not re-apply the reverted 2026-10-14 patch as-is.

---

## Editing shell locks (still hold)

- Structure first; JSON mark tree; classed HTML in app/preview; inline only at export.
- No free hex outside Colors tab / theme swatches.
- Clear formatting keeps links; confirm before clear.
- Modal exit intentional only (Cancel / Save / Escape) — not backdrop.
- Lite toolbar only in the edit modal, never inside the preview iframe.
- Paragraph local undo/redo independent of shell document undo while the modal is open.

### Lock change vs prior concept text

`block-content-editing.md` currently describes edit modals with **live preview while typing** in general. This concept **narrows** that:

- **Paragraph (WYSIWYG):** preview updates on **Save** only (frozen while open).
- **Other blocks:** live preview while typing **unchanged**.

When implementing, update `block-content-editing.md` with a short cross-reference so the two docs do not contradict.

---

## Technical sketch (implementation guidance)

Surface focus: `paragraph-lite-editor.component.*`, paragraph block session wiring, edit-modal open/save/cancel, shared email paragraph CSS.

### Clone skin

- Stop relying on `ed-textarea` look as the primary reading surface.
- Bind editor root classes/CSS variables to **current document colors** and paragraph body rules from the shared email stylesheet (or a generated subset used by both preview and editor).
- Keep `contenteditable` + existing serialize/parse paths.

### Draft and freeze

- Stop pushing paragraph `docChange` into the live session on every keystroke (or push only to a draft channel the preview ignores).
- Save: single commit path existing modal Save already owns; ensure preview refresh runs then.
- Cancel: drop draft; no session write.
- Open: ensure preview shows committed block (if a previous bug left draft in session, fix by snapshot discipline).

### Stash

- Key by document + block id; store JSON `RichDoc` (+ meta).
- Confirm on open when stash exists and differs from committed.
- No server round-trip required for v1.

### Email width button

- Sets content max-width / width on the clone scroller to the mail column constant used by the renderer.
- Does not reset modal position unless needed to keep the dialog on-screen.

### Info mode

- Overlay or stripped markers; tests that parse(serialize(doc)) ignores info chrome.
- i18n for all labels.

### What not to do

- Do not repaint `innerHTML` from parent on every draft keystroke in a way that destroys caret (existing local-edit guards stay).
- Do not freeze preview for plain blocks “for consistency.”
- Do not change app-wide theme to Glacier.
- Do not treat stash as Save.

---

## Acceptance criteria

- Seed paragraph with italic + callout (and theme colors/links): seller recognizes formatting **in the editor surface** without Code view, at parity with preview body styling for that block.
- Open paragraph edit: change text/marks extensively → iframe paragraph **unchanged** until Save.
- Save → iframe matches modal clone for that block; session holds new `RichDoc`.
- Cancel after edits (no stash) → iframe and session match pre-open; draft gone.
- Undo/redo inside editor still works on the draft before Save.
- Stash → Cancel → reopen → confirm restore Yes loads draft into modal; preview still committed until Save.
- Email width control sets clone to mail content width; modal can still be resized freely afterward.
- Info on: paragraph and span roles labeled; Info off: clean clone; Save with Info on does not persist inspect chrome into JSON/HTML export.
- Hero / benefits / other blocks: live preview while editing **unchanged**.
- No new marks; no free colors; EN/DE strings for new chrome; tests green per release gate.
- Code view remains read-only debug.

---

## Rollout suggestion

1. **Shared visual truth** on `.rt-editor` (theme + paragraph CSS). Manual QA vs iframe body.
2. **Draft-local + preview freeze** for paragraph only; Save/Cancel paths; update `block-content-editing.md` lock sentence.
3. **Email width** button.
4. **Stash + restore confirm**.
5. **Info** inspect mode (paragraph frames first, then span labels if still needed).
6. Optional toolbar active state in a separate change.

Ship each step only if paragraph typing, paste, link, appearance, clear, undo/redo, and Save/Cancel remain solid.

---

## Open product choices

- Exact i18n labels: Email width, Info, Stash / Remember draft, restore confirm copy.
- Auto-stash on Cancel vs explicit stash only (default in this doc: **explicit**).
- On restore **No**: discard stash vs keep for later (default in this doc: **discard**).
- Clone background: always content slot vs match exact parent `td` class behind paragraph in preview.
- Whether brand/legal lite kit later inherits freeze+clone automatically (recommended: yes when those surfaces become WYSIWYG).

---

## Superseded approach

An earlier draft of this file proposed **toolbar `is-active` state** and a **format status line** (caret/hover probes) as the primary fix. A same-day implementation was **reverted uncommitted** after live preview/layout breakage. That approach is **not** the foundation anymore.

Useful residue only:

- Active toolbar state may return later as polish.
- Any probe/listener work must stay isolated and must not fight input or commit paths.

---

## Summary

The paragraph editor should be an **operable visual clone** of preview body copy for that block, using **shared render/CSS truth**, with **document draft local to the modal** and **iframe frozen until Save** so sellers can compare before/after. Other blocks keep live preview. App chrome colors stay fixed. Optional email-width, draft stash/restore, and Info inspect complete the seller UX without making Code view the answer and without expanding the mark kit.
