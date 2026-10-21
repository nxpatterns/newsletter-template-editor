# Block editor and demo page

Concept for two new product areas: a **block editor** (users change or create their own blocks) and a **demo page** (users publish their own newsletters for others to see).
Status: concept only, agreed in discussion on 2026-10-21. Nothing implemented. Mockups come after review.
Audience: non-technical sellers and marketing people first, designers second. English only.

Related: `src/core/colors/model.ts` (implemented color levels), `email-colors.md` (color product rules), `block-content-editing.md` (edit modal, lite kit, render pipeline), `file-management.md` (storage, start page, menus), `design-system.md` (app look), `AGENTS.md` (email CSS rule).

## Goals

- Become a de facto standard for building newsletters: reliable output, trust first, revenue second.
- Let users adapt a built-in block, or build a completely new one, without writing HTML.
- Keep every block usable in any template, with checked contrast and readability in Light and Dark.
- Everything that costs us nothing to run stays free. Only things with running cost (cloud) are paid.
- Prepare a public demo page as the first step toward a later marketplace.

## Non-goals (now)

- Implementation of either area. This document only fixes entry points, model and decisions.
- What exactly the block editor can edit, field by field. Separate chapter. The coarse scope for clones that mockups need is decision 31.
- Backend, login, accounts, moderation, cloud sync. Required for the demo page and paid sync, planned later.
- Marketplace and payments.
- PDF export. Planned later.

## Wider use than newsletters

The block editor turns the app into a general document builder whose output is **email-safe HTML** or **PDF** (PDF Export later). Planned uses beyond newsletters:

| Use | Example | Export |
| --- | --- | --- |
| Newsletter | Sales campaign | Email HTML (today), Listmonk |
| CV | A student writes a CV with own blocks | HTML, later PDF |
| Blog post | Article for LinkedIn or Medium; header and footer of the email hidden | Platform-friendly HTML / Markdown / text |
| Teaser mail | Same blog post sent as a short newsletter with "read more" | Email HTML |
| Academic article | Professor sends a math article with highlighted code to students | PDF, other media, email |

Consequence: blocks must not assume "email" as the only target. The render pipeline stays JSON → classes → export step, with one export step per target. Hiding email header and footer is already part of this direction.

Inspiration source for rich article elements (callouts, highlighters, code blocks) exists in the user's separate `esa` workspace (LaTeX / Lua / PDF). Read-only reference if the user grants access; never modified from here.

## Kinds of blocks

| Kind | Origin | Renderer | Colors |
| --- | --- | --- | --- |
| Built-in block | Ships with the app | Own renderer and own tests per type (rule unchanged) | Block defaults of the chosen template |
| Adapted block (clone) | Copy of a built-in block, changed where change is allowed | Renderer of the original type | Default colors of the chosen template |
| Free block | Created from scratch in the block editor | One shared, well-tested renderer for composed blocks | Own default colors, mapped to roles |

A built-in block is never changed in place. "Adjust" on a built-in block always means "copy and edit".

### Free blocks are composed, never coded

- Built only from fixed parts via drag and drop: row, column, text, image, button, spacer, and further parts later (callout, code, highlight, formula).
- Modern layout is allowed in the editor (for example columns). The shared renderer for free blocks emits what old mail clients understand (nested tables with classes); the existing inliner step then bakes the styles in. The inliner itself does not change layout.
- Text uses the existing WYSIWYG lite kit. Nothing beyond it should be needed.
- **No custom HTML and no scripts, ever.** This is a hard rule, not a temporary limit.
- Own blocks can contain other own blocks (nesting), so a user can build a library of parts.

Why: only composed blocks can be guaranteed to render in mail clients and can be checked automatically.

### Every editor action is an operation on the model

The free block is a JSON tree of known parts. Every block editor action is a named, pure operation on that model in `src/core` (`(document, input) -> document`), and the UI only calls these operations: clone a built-in block, create an empty free block, add / move / remove a part, set a part property, set a color with its role, mark a color as fixed, save a draft, publish a version, rename, delete, insert an own block, update an inserted block to a newer version, mark a check finding as intended, export and import as a file. Block quality checks live in the same core check function as the newsletter checks. This keeps everything testable without the UI.

## Color model for own blocks

Extends the binding order of the implemented color model in `src/core/colors/model.ts` (block standard colors < general colors < per-block overrides, two sets per template: Light and Dark). A block color is either linked to a role (`{ role }`) or fixed (`{ hex }`). Product rules: `email-colors.md`.

- Adapted block: follows the default colors of the template it is used in, exactly like the original. Exception: "Save as own block" from a placed block carries that block's own colors (decision 34).
- Free block: the designer sets its own default colors. Each color gets a **role** (background, text, accent, and the other roles the general colors already use).
- Used in another template, a free block follows that template's colors by role by default. Only colors the designer deliberately marked as **fixed** stay fixed.
- A fixed color wins over the target template's general colors and loses to a per-block override (decision 19). Technically it is a default on the per-block level, not a new level (decision 35).
- Block editor function **"create a new template for this block"**: an empty template that contains only this block, with general colors taken from the block's own defaults (decision 20).

## Quality checks

The block editor checks and tells the user, in plain words, at least:

- contrast between text and background (WCAG AA), in Light and Dark,
- font size too small,
- missing image description,
- link text that says nothing
- and other common accessibility or content issues

Checks run while editing and again when an own block is inserted into another template, against that template's colors. They warn; they do not block saving. A finding can also be intentional (for example a dark teaser in a light template): the user marks it as **intended** on the placed block. The mark is stored in the document, the finding stays visible as "accepted", and it returns when the relevant colors change.

## Library, drafts and storage

- Saved own blocks appear in the block panel through a toggle **"Built-in | Own"** (DE "Mitgeliefert | Eigene", decision 32) inside the existing "All blocks" tab. No eighth tab. Dragging into the newsletter works the same from both lists.
- Own blocks keep the tint of their original type plus a fixed "own" mark. Free blocks get one shared neutral tint plus the mark. The rule "one tint = one block type" stays readable.
- **Drafts are visible only on the block edit page.** No limit on the number of drafts; the browser's storage limit is the only bound.
  - Drafts are never deleted automatically. The list is sorted by last change, has a search by name, and offers a manual action "delete drafts older than ...".
  - Browser storage is not durable everywhere: Safari deletes a site's IndexedDB and localStorage after seven days of browser use without a visit to that site. The app requests persistent storage (`navigator.storage.persist()`) and offers the free file export prominently; later cloud sync covers the rest.
- Insertion records the block's version. Later changes to an own block reach older templates only when the user asks for it.
- Storage today: IndexedDB, behind a repository interface like `template-repository.token.ts`, so cloud accounts can replace it later.
- IDs: every stored object (template, own block, block version, draft) gets a UUIDv7 from one injected ID source. Timestamp plus cryptographic randomness makes IDs globally unique without a backend; the server's unique constraint is the final check at the first sync. Tenant and owner are fields, empty locally and filled at the first sync after login, never part of the ID. Block ids inside one document may stay short and local.
- Factory reset and cleared browser data also delete all own blocks and drafts. The reset dialog must say so. The reset dialog lists one checkbox per kind of data, each with a count: templates, own blocks, block drafts, current working draft, view settings. All are checked by default, since the entry means "reset everything". The existing acknowledge step stays, plus a button "Save everything as a file first". The app language is not part of the list and stays.

## Cost model

| Feature | Price | Reason |
| --- | --- | --- |
| Editing and saving locally | Free | No running cost for us |
| Save own blocks as a file, open on another machine | Free | No running cost; builds trust before cloud |
| Cloud sync of blocks and drafts across machines | Paid, later | We pay for cloud |
| Publishing on the demo page | Free, needs an account | Later |
| Selling on the marketplace | Later, by invitation | Grows out of the demo page |

Cloud sells convenience, not access. Users store sensitive data; trust must be earned technically as well as humanly.

## Entry points

### Block editor

| Place | Entry | Note |
| --- | --- | --- |
| "All blocks" tile | Small "Adjust" control on each tile | Not a ✎: ✎ already means "edit this block's content" in the placed list and preview, and tiles are draggable |
| "Current blocks" tab row (DE "Aktuelle Bausteine") | "Save as own block" | Turns per-block color overrides into a clean own block (decision 34) |
| Colors tab warning | Link "edit the block type instead" | Today's warning text promises that a change applies to all blocks of that type. With clones this is no longer true; text and flow change (decision 33) |
| Start page, "Start new" section | Tile "New block" next to the blank template | Works without an open template |
| Start menu | Entry "New block" | Same |
| Footer | None | The block editor does not belong in the footer |

Route: its own address (for example `/blocks/:id`), plus an overview of own blocks and drafts (decision 30). Header behaves like the About page today: "Back to" plus the template name, with the template kept as a draft. Opened without a template, the preview uses neutral colors; opened from the editor, it uses the current template's colors, switchable Light / Dark.

### Demo page

| Place | Entry | Note |
| --- | --- | --- |
| Start page | Section or tile "Demos" | Read access |
| Start menu | Entry "Demos" | Read access |
| Footer | Link "Demos" | The only footer addition |
| Editor "⋮" menu | "Show on demo page" next to export | Needs login; shown in mockups, hidden in the app until login exists (not greyed out) |

## Demo page

- Users publish their own newsletters (later also blocks). Published means public.
- Publishing needs an account. Login must exist first.
- Responsibility for published content lies with the publisher. We need the ability to take a publication offline on abuse.
- The demo page is the first step toward the marketplace: when a publication gets many views or likes, we can invite its designer to sell on the marketplace. "Earn and let earn."
- Demo page and marketplace share one gallery route; newsletters first, blocks later.

## Naming

- The current start tiles "Demovorlage Deutsch / Englisch" are start help, not demos. Rename to **"Beispielvorlage Deutsch / Englisch"** (EN: "Example template"), so "Demos" clearly means the new page.
- New term in the UI: "Own blocks" (DE: "Eigene Bausteine").

## Risks and notes

- **Scripts in email do not run.** No common mail client executes JavaScript; it is stripped or ignored and can trigger spam filters. There is no "control through our own JS" in an exported mail. The "no scripts" rule is therefore also an export requirement, not only a security choice.
- **Open and click measurement** is settled by decision 29 (Listmonk's own tracking). Background: Apple Mail Privacy Protection preloads images through proxies, Gmail loads images through its own proxy, and many clients block images by default, so image requests count fetches, not reads. For the block editor this only means image addresses stay data in the model.

- Free blocks plus non-email targets (CV, blog, PDF) widen the product a lot. Mockups should still lead with the newsletter case, since that is the main audience.

## Decisions from the discussion

Numbers refer to the questions in the 2026-10-21 thread.

| No. | Question | Decision |
| --- | --- | --- |
| 1 | Clone or new type | Both: adapt a built-in block or create a free block from scratch; start page tile and menu entry for the latter |
| 2 | Global or per template | Library for all templates; insertion records the version; updates only on request |
| 3 | Colors in the block editor | Adapted: template default colors. Free: own default colors with roles, checked for accessibility |
| 4 | Visual mark | Tint of the original type plus an "own" mark |
| 5 | Own tab or toggle | Toggle in the existing tab (label: decision 32) |
| 6 | Control on the tile | Not a ✎; own control "Adjust" |
| 7 | Without an open template | Yes, start page and start menu |
| 8 | Drafts | Only on the block edit page, unlimited, cloud later |
| 9 | Payment | Local free; cloud sync paid later |
| 10 | Who sees the demo page | Public; publishing needs an account; takedown on abuse |
| 11 | Demo page and marketplace | Demo page is the first step; marketplace by invitation later |
| 12 | Start tiles | Keep, they are start help; rename |
| 13 | Free block parts | Fixed parts, drag and drop, columns allowed and exported as tables, no HTML, no scripts |
| 14 | Colors in another template | Roles, follows the target template by default; plus "create a new template for this block" |
| 15 | "New block" on the start page | Tile in "Start new" plus start menu entry; revisit after user feedback |
| 16 | Blocks as a file | Yes, free |
| 17 | Publishing before login exists | In mockups only, hidden in the app |
| 18 | New name for start tiles | "Beispielvorlage" |
| 19 | Fixed color in a free block | Wins over the target template's general colors, loses to a per-block override; recorded in `email-colors.md` |
| 20 | "Create a new template for this block" | Empty template with only this block |
| 21 | Free block parts in the first version | Row, column, text, image, button, spacer; callout and code later |
| 22 | New export targets (CV PDF, articles) | Separate export chapter; blocks must not block it |
| 23 | File format for own blocks | Same envelope as the project file, with a type field |
| 24 | IDs | UUIDv7 from one injected ID source; tenant as a field |
| 25 | Reset dialog | One checkbox per kind of data with counts, all checked, "save as file first" |
| 26 | Intentional warnings | Markable as intended per placed block |
| 27 | Drafts | Never auto-deleted; sort, search, manual cleanup; persistent storage request |
| 28 | Editor actions | Pure operations on the JSON model in `src/core` |
| 29 | Open and click measurement | Use Listmonk's own tracking (`{{ TrackView }}` in the template, links already wrapped with `TrackLink` at export); per person or totals only is Listmonk's "individual subscriber tracking" setting. No own image IDs; images never expire, only raw request logs are deleted after 14 days. Block editor: image addresses stay data in the model. |
| 30 | Overview of own blocks and drafts | Yes, an overview page (for example `/blocks`); otherwise drafts have no home. |
| 31 | What a clone can edit | Starting texts, the existing layout options of the type, colors as roles; structure locked. |
| 32 | Toggle label in the "All" tab | "Built-in \| Own" (DE "Mitgeliefert \| Eigene"), where "Built-in" lists only shipped blocks. |
| 33 | "Adjust" from the Colors tab warning | Offer "replace all blocks of this type in this template with the copy", on by default; rewrite the warning text accordingly. |
| 34 | Colors on "Save as own block" | Colors equal to a general color become role links; all others become fixed. |
| 35 | Level of a fixed color | A default on the per-block level; same effect, no new level in the model. |
| 36 | Keyboard alternative to drag and drop | Yes, required (select, arrow keys, insert menu). |
| 37 | Block editor on phones | View and manage only on phones; editing from tablet width up. |
| 38 | Nested own blocks | Same as insertion into templates, version recorded, update on request; cycles blocked. |
| 39 | Frame of the new template for a block | Header, footer and legal parts included; otherwise the legal check fails at once. |

## Mockup scope

Every screen in Light and Dark, German first, in the existing glass and gradient look of the editor and the About page (`design-system.md`), block tints as in the "All blocks" tab.

States each screen must show where they apply: empty, in progress, unsaved change when leaving, draft saved, version published, check warnings in Light and Dark, finding marked as intended ("accepted"), error (storage full, invalid import file, persistent storage refused, Safari storage notice).

Order:

1. Block editor page, free block: layout with parts palette, canvas, properties, preview Light / Dark, check list, name and version, "Save draft" and "Publish". Adding parts by drag and drop and by keyboard. Undo and redo.
2. Clone mode: entry through "Adjust" on a tile in "All blocks", same page with locked areas.
3. Block panel: toggle built-in / own, tint plus "own" mark, empty state, "newer version" hint and update action in "Current blocks", "Save as own block".
4. Colors: role picker with the "fixed" mark, check finding with "mark as intended".
5. Overview of own blocks and drafts (sort, search, rename, delete, export, "delete drafts older than ..."), plus the "New block" tile on the start page and the start menu entry.
6. Reset dialog.
7. Demo page: entry points and a gallery skeleton, last.

Reset dialog wording (EN; DE in the mockup):

> **Reset everything?**
> This data is deleted from this browser. This cannot be undone.
> [x] Templates (12) · [x] Own blocks (3) · [x] Block drafts (5) · [x] Current working draft · [x] View settings
> The app language is kept.
> [Save everything as a file first] [Cancel] [Delete selected]

## Open questions

None. Decisions 30 to 39 accepted the recommendations on 2026-10-21; mockups may still change them.
