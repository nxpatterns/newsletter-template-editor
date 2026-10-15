# Paragraph editor visual clone

Shipped concept (v0.2.4): the Paragraph lite editor is a visual clone of email body copy, with draft-local editing and preview freeze until Save.

Audience: non-technical field sellers. English only.

Related: `block-content-editing.md`, `email-colors.md`, `AGENTS.md`.

---

## Shipped behavior

### Visual clone

- Editor surface (`.rt-editor.rt-clone`) uses the same type/color/link rules as preview body copy via `paragraphEditorSurfaceCss(globals)` injected into `document.head` (survives Angular encapsulation and contenteditable `innerHTML`).
- Theme tokens: content background, body/primary/accent/gold/dim text, Georgia stack, size tokens, ice links.
- App chrome colors stay fixed. Clone frame matches preview **selected block** turquoise (`#20d4c8`).

### Preview freeze (paragraph only)

- Typing and toolbar updates a **local draft** (`setParagraphEditDraft`); newsletter/iframe stay on the open snapshot.
- **Save** flushes debounce, commits draft once, refreshes preview, clears stash.
- **Cancel** drops draft; preview was never dirtied.
- Other blocks keep **live preview while typing**.

### Toolbar chrome (shipped)

| Control | Behavior |
| --- | --- |
| Bold / Italic / Strike / Sup / Sub / Mono | Model-range toggle (`toggleMarkOnDoc`); second click removes mark; plain text and spaces preserved |
| Appearance | Semantic size on selection (`applySizeOnDoc`); body clears size |
| Color | Selection → span color (`applyColorOnDoc`); caret → paragraph base (`applyParagraphBaseColorOnDoc`). Token `heading` seller label **Primary** / **Primär** |
| Link | Apply/replace/remove; strips `javascript:` |
| Clear | Drops style marks; **keeps links** |
| Undo / Redo | Local history; selection bookmark restored after repaint |
| Email width | 600px clone column; modal may grow |
| i (Info) | Inspect outlines + paragraph labels; never serializes into `RichDoc` |
| Zwischen speichern / Save draft | Explicit stash to `localStorage`; restore confirm Yes/No on reopen |
| Code | Read-only classed HTML |

### Mark pipeline (locked)

Prefer **JSON range ops** over `contenteditable` `extractContents` for mark surgery (nesting, lost spaces, failed toggle-off). Path: selection bookmark → `richDocFromEditorRoot` → model helper → `commitDoc` repaint + restore bookmark.

Helpers in `src/core/richtext/model.ts`: `toggleMarkOnDoc`, `applySizeOnDoc`, `applyColorOnDoc`, `applyParagraphBaseColorOnDoc`, `applyLinkOnDoc`, `clearMarksOnDoc`, `toggleMonoOnDoc` (alias).

---

## Non-goals (still)

- Freezing non-WYSIWYG blocks
- Toolbar `is-active` caret chrome (optional later; do not revive the 2026-10-14 selectionchange attempt)
- TipTap-in-iframe / free hex / full mail layout in the modal

---

## Acceptance (regression)

- Seed italic+callout+primary color recognizable in editor without Code view
- Paragraph edit does not live-update iframe until Save
- Mono on → off keeps spaces (`internationale Plattform`, not glued)
- Every boolean mark toggles off on second apply
- Info labels both class-only and `data-rt-color` spans
- Stash restore Yes/No; Save clears stash
- Unit: `paragraph lite kit mark operations` in `richtext.spec.ts`
