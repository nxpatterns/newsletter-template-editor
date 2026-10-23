# Block editor and demo page

Concept for two new product areas: a **block editor** (users change or create their own blocks) and a **demo page** (users publish their own newsletters for others to see).
Status: concept accepted (decisions 1 to 82), mockups R1 to R5 done. Implementation started 2026-10-22 in this order: storage base (built), reset dialog (built), available width in the render context (built), clone mode (built), free blocks, overview of own blocks, renaming the start tiles (done early), demo page last.
Audience: non-technical sellers and marketing people first, designers second. English only.

Related: `src/core/colors/model.ts` (implemented color levels), `email-colors.md` (color product rules), `block-content-editing.md` (edit modal, lite kit, render pipeline), `file-management.md` (storage, start page, menus), `design-system.md` (app look), `AGENTS.md` (email CSS rule).

## Goals

- Become a de facto standard for building newsletters: reliable output, trust first, revenue second.
- Let users adapt a built-in block, or build a completely new one, without writing HTML.
- Keep every block usable in any template, with checked contrast and readability in Light and Dark.
- Everything that costs us nothing to run stays free. Only things with running cost (cloud) are paid.
- Prepare a public demo page as the first step toward a later marketplace.

## Non-goals (now)

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

- Built only from fixed parts via drag and drop (see Parts model), further parts later (callout, code, highlight, formula).
- Modern layout is allowed in the editor (for example columns). The shared renderer for free blocks emits what old mail clients understand (nested tables with classes); the existing inliner step then bakes the styles in. The inliner itself does not change layout.
- Text uses the existing WYSIWYG lite kit. Nothing beyond it should be needed.
- **No custom HTML and no scripts, ever.** This is a hard rule, not a temporary limit.
- Own blocks can contain other own blocks (nesting), so a user can build a library of parts.

Why: only composed blocks can be guaranteed to render in mail clients and can be checked automatically.

### Every editor action is an operation on the model

The free block is a JSON tree of known parts. Every block editor action is a named, pure operation on that model in `src/core` (`(document, input) -> document`), and the UI only calls these operations: clone a built-in block, create an empty free block, add / move / remove a part, set a part property, set a color with its role, mark a color as fixed, save a draft, publish a version, rename, duplicate, delete, insert an own block, update an inserted block to a newer version, mark a check finding as intended, export and import as a file. Block quality checks live in the same core check function as the newsletter checks. This keeps everything testable without the UI.

## Parts model

Decisions 40 to 47. Goal: every sensible email block can be built from parts, including all built-in blocks, and a block can get a new design without touching its content.

### Content and design are separate

- **Content**: flat content parts plus collections (decision 75). Each part has a stable id, a kind (text, image, button, …) and a **role** (headline, body, call to action, image, price, badge, name, …). Only words, addresses, numbers and dates. A collection has items, each item a set of parts keyed by role; a List part places a whole collection.
- **Design**: a layout tree (sections, columns, boxes, lists) that **places** content parts by id, plus every style property: sizes, colors as roles, spacing, alignment, order, column ratios.
- A block has one content and one or more designs, one of them active. A new design over the same content is a **design proposal**; the user picks one. A check fails when a content part is neither placed nor deliberately hidden, so a redesign cannot lose content.
- Built-in blocks fit the same shape: their fields are content parts with roles, their current look is their default design.

### Inheritance

For font, base text size, text color, link color and alignment the nearest value wins: part → block design → template (Campaign font, general colors) → app standard. Unset means inherit. A font is always a stack with a safe fallback, because Gmail and classic Outlook ignore web fonts; the check warns when the first font is not a system font.

### Finite scales

Every style property picks from a small scale, so every design stays email-safe and checkable, and proposals have a finite space to choose from.

| Scale | Values |
| --- | --- |
| Text size | `xs` 12, `s` 14, `m` 17, `l` 20, `xl` 26, `2xl` 32, `3xl` 40, `4xl` 48 (px) |
| Spacing | 0, 4, 8, 12, 16, 24, 32, 48 |
| Radius | none, 4, 8, 16, round |
| Border width | 0, 1, 2, 4 |
| Line height | tight, normal, loose |
| Font | inherit, presets, custom stack |
| Colors | roles, or fixed (decisions 19, 35) |
| Font weight | normal, bold |
| Letter spacing | none, wide 1, wider 2 (px) |
| Width | full, 3/4, 2/3, 1/2, 1/3, 1/4 of the available width (decision 76) |
| Column ratios | 2 columns: 1:1, 1:2, 2:1, 1:3, 3:1; 3 columns: 1:1:1, 2:1:1, 1:2:1, 1:1:2; 4 columns: 1:1:1:1 |
| Column gap | spacing scale, default 16 |
| Padding | vertical and horizontal, each from the spacing scale |
| Icon size | s 16, m 24, l 32, xl 48 (px) |
| Button size | s: text `s`, padding 12 / 16; m: text `m`, padding 12 / 24; l: text `l`, padding 16 / 32 (vertical / horizontal, px) |
| Bleed | full canvas (600) or content width (504) |

Values beyond the first seven rows are best-guess starting values (decision 81) and are replaced by measured ones; stored blocks keep token names, never px, so changing a value later needs no migration.

### Parts

Every part has box properties: padding, background (role), border (sides, width, role), radius, alignment, width.

| Part | Content | Design |
| --- | --- | --- |
| Section | parts | box properties |
| Columns | 1 to 4 columns | ratio from the ratio list, gap, vertical alignment, order, stack on phones yes or no, stacked order natural or reversed (decision 77) |
| Box | parts | box properties |
| List | one collection; items share one item design | stacked or grid of 2 or 3, gap; at least one item |
| Text | rich text (lite kit), placeholders, name-or-fallback piece (decision 80) | font, size, weight, italic, uppercase, letter spacing, line height, alignment, color role |
| Image | image address, image description, link target | width from the width list (decision 76), radius, alignment, border |
| Button | link text, link target (web, mail, phone) | filled, outline or text link; size, full width, radius, colors |
| Icon | one glyph from the fixed email-safe set | size, color role, optional circle |
| Divider | none | style, thickness, width, color roles |
| Spacer | none | height |
| Built-in block | an embedded built-in block | its own settings |

A **Date** part (formatted month, day, weekday, time range) and a calendar link come later. Until then the event block stays a built-in block and can be embedded as a whole; so does the Greeting block (decision 80).

### Coverage and limits

- With these parts and the size scale, all built-in blocks can be rebuilt except the two logic blocks, Event and Greeting (decision 80), which are embedded as a whole. **Gate:** before free blocks ship, every other built-in block is rebuilt as a design over its own content and renders equivalent HTML (its own step after step 5).
- **Floors (decision 82, values to be checked in practice and may change).** Widths are resolved px at the 600 px canvas; the phone width is 320 px.
  - Minimum resolved width per part: Text 120, Button 120, Image 48 (content images 120), Icon its size plus padding, embedded built-in block 280. Dropping or resizing below the floor is refused with a plain explanation, because the result breaks in classic Outlook.
  - Depth: Columns inside Columns at most once; own blocks inside own blocks at most 3 levels deep (decision 38 still blocks cycles).
  - Accessibility: body text at least `s` 14 px, small print (captions, footer, legal) at least `xs` 12 px; tap targets for buttons at least 44 px high, icon links at least 24 × 24 px (WCAG 2.2 target size); body text not `tight`; contrast WCAG AA as in Quality checks. These checks warn, they do not block saving.
- Email limits for every design: tables, `bgcolor`, padding and borders; width up to 600 px; up to 4 columns (3 recommended); radius degrades to square in classic Outlook; stacking below 600 px by media query (classic Outlook keeps columns). Not in v1: background images (Outlook needs VML), visibility only on mobile or desktop. Never: scripts, forms, video.

### Gate steps

Decisions 84 to 86. Each step is its own fresh thread; step 1 comes first, steps 2 to 9 and then 11 run one after another because they all touch `src/core/parts/`, step 10 comes last. Event and Greeting stay built-in.

| Step | Blocks | Size |
| --- | --- | --- |
| 1. Comparison harness | Converter registry (built-in block to content plus default design); script renders the **export** of each block twice (old renderer, parts) at 640 and 320 px (640, because the phone rules start at max-width 600 px), Light and Dark, onto one side by side overview page in `docs/sessions/cache/`; automatic check only for equal texts and links; first block Paragraph | M |
| 2. Text blocks | Hero, Chapter band, Pull quote, CTA button | M |
| 3. Divider | All 5 styles plus page background (glow and ornament need mixed colors) | M |
| 4. Images | Image, Image and text (widths, side, vertical alignment) | M |
| 5. Video | Video (play field as icon with circle) | S |
| 6. People | Testimonial (3 image modes), Contact | M |
| 7. Numbers | Stat box, Price box (strike-through, mixed sizes in one line) | M |
| 8. Lists | Benefits list, CTA link list (List part) | M |
| 9. Teasers | Teasers with 2 and 3 columns | M |
| 11. Model gaps from the gate | Found in steps 2 and 3: a full width band (section `bleed: full`) gets no phone padding (Chapter band); the pull quote bar gets its width (border scale) and its color as two separate settings, color by default the link color; a button text gets an uppercase option; a slot color can mix two roles (glow steps and ornament hairlines of the Divider); a column can take the width of its content (ornament glyph between two lines); a narrower part can keep its width on phones (two-tone Divider). Found in step 4: each column of a columns part gets its own vertical alignment (Image and text keeps the image at the top while the text sits in the middle); Image and text without a picture gives the text the full width (the built-in falls back to a plain paragraph). Found in step 5: an icon can carry a link (the Video play glyph links to the video); a link in a text part can be underlined and is wrapped with TrackLink in the export like button and image links (the Video title link); the Video play row needs the content width column from step 3 (the icon column takes `1:3` until then, so the title wraps earlier on phones). Found in step 6: an image gets a size in px (Testimonial photo 44 px, Contact photo 72 px) or a height (Testimonial logo 36 px high, width from its aspect ratio), since a share of the column misses both (photo 43 and 66 px, logo 132 px, and on phones the shares shrink further); the Testimonial byline needs the content width column from step 3 to center picture and name as a pair (a centered half or three quarters width sits left of the middle on phones); the Contact phone and email links need the underline from step 5, and its button the uppercase option from step 2 plus a 13 px text with the 12 / 24 px padding of size `m`. Found in step 7: a box gets a top line of its own next to its frame (Price box: 3 px accent on top, 1 px line around; until then two nested boxes draw 2 px accent above the 1 px line); padding can differ per side (Stat box extras: 24 px after the hairline, none on the right; until then 12 px on both sides, since 24 px on both push the box past a 320 px phone); the Price box badge needs the content width column from step 3 and must keep it on phones (a quarter width share grows to the full width there); an inline size of normal text inside a larger text (`m` means "inherit" today, so the 16 px currency takes `l` raised by `sup`, about 17 px, and the period `s`); a light weight (the period is 300, the scale has normal and bold); a line height of 1 (the 42 px stat number and the 38 px price take tight). Found in step 8: the Benefits list glyph column needs the content width column from step 3 (until then `1:3`, so the text starts at a quarter of the width instead of after 25 px); a list part draws a line only between its items, with no item padding above the first and below the last (CTA link list; until then every item draws its padding and a line below it, the block padding shrinks to 8 px so the top stays at 20 px, and the last item keeps its line); the CTA link list links need the underline and TrackLink from step 5; a fixed gap after an inline glyph (the 8 px after the CTA link glyph is a space). Requested by the maintainer (2026-10-23): in the block editor the Stat box number gets a selectable font size from the fixed text size scale, no free px. Converters can already bind slots to other roles (`Converted.colors`); the quote bar uses that once it has its own slot | S |
| 10. Close the gate | A test checks that every built-in type except Event and Greeting has a converter; mark the gate done here | S |

Each step adds its screenshots to the overview and waits for the maintainer's OK.

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
- Storage base (built 2026-10-22):
  - `src/core/id/uuid-v7.ts`: the UUIDv7 source (RFC 9562, ids sort by creation within one source); the app injects it as `ID_SOURCE`. New templates get UUIDv7 ids; saved templates with older ids are deleted once on the upgrade to database version 2 (beta, decided 2026-10-22), and the working draft stays as unsaved work.
  - `src/core/own-blocks/model.ts`: own block, version (immutable, numbered per block) and draft (at most one per block, standalone when its block is gone). Every record carries `tenantId` and `ownerId`, null locally; templates may carry them as optional fields. Block content is a placeholder type until clone mode and the parts model give it a shape.
  - `src/core/own-blocks/operations.ts`: create, save draft, publish version, rename, duplicate, delete, delete drafts older than. Pure functions with time and id source passed in; each returns a change set.
  - `src/core/own-blocks/block-repository.ts`: `BlockRepository` applies a change set in one transaction; IndexedDB implementation in the `nte-docs` database (version 2 adds the stores `ownBlocks`, `blockVersions`, `blockDrafts`), injected as `BLOCK_REPOSITORY`.
  - Persistent storage is requested once, on the first save, never at app start, because Firefox asks the user (`StoragePersistence`).
- Reset dialog (built 2026-10-22): `src/app/shell/reset/` (dialog, service, start page message) and `src/core/reset/` (kinds, backup file, `AppDataStore` that counts, reads, deletes and restores all stores in one transaction each). Deleted demos come back with "Templates". A backup opens again through "Open from file…" in the start menu; existing rows and an existing working draft are kept. The dialog cannot tell a cancelled browser download from a finished one, so "Not saved" appears only when writing the file fails.
- Factory reset and cleared browser data also delete all own blocks and drafts. The reset dialog must say so. The reset dialog lists one checkbox per kind of data, each with a count: templates, own blocks, block drafts, current working draft, view settings. Kinds without data are hidden. All are checked by default, since the entry means "reset everything"; the rows are independent, and whatever the user unchecks stays. The existing acknowledge step stays, plus a button "Save selected as a file" that saves only the checked kinds, with a line "Selected: everything" (or the checked kinds) under it. The delete button reads "Delete everything" while everything is checked, otherwise "Delete selected", and stays disabled until the acknowledge box is ticked. The app language is not part of the list and stays. Design: decisions 63 to 67, mockup `docs/mockups/block-editor/r4-reset-dialog.html`.

## Clone mode (built 2026-10-22)

Decisions 31, 32, 40, 49 to 55, 68; mockups R1 (layout B, "Kopie") and R2.

- Content: `src/core/own-blocks/clone.ts`. A clone is `{ kind: 'clone', block, colors }`: the built-in block with its starting texts and layout options, plus the colors set in the copy as `{ role }` or `{ hex }`, one choice for Light and Dark (decision 51). Pure operations: new copy, working document, set a color, place an own block (records `own: { blockId, version }` on the placed block, decision 2), replace the placed blocks of the type (texts and images stay, layout fields of `LAYOUT_FIELDS` and the colors come from the copy, decision 49).
- Saving: `saveBlockWork` in `operations.ts` stores a draft ("Save draft", ⌘S) or the next version ("Save as own block", later "Save new version") in one transaction; the block is created on its first save under the id its address already has.
- Editing: the block editor edits a one-block document in its own `NewsletterSession` (`SESSION_KEEPS_WORKING_DRAFT` false), so the shared block fields work unchanged and the template's working draft and undo stay untouched. The copy's colors sit on the block level of both sets, where a placed block keeps its own colors.
- Page: `/blocks/<id>?from=<template id>` (`src/app/blocks/`). "Adjust" opens `/blocks/<new id>?from=…&type=<type>`; nothing is stored before the first save, then `type` leaves the address. Header part in the app header: way back, name, "Copy of …" pill in the type's tint with the "own" mark, save state, undo, redo, the two save buttons. Preview with Dark | Light and "… block before / after …", tags for name and type, badge "Structure locked". Tabs: Parts (locked in clone mode), Properties (two groups as in R1: starting texts, then the layout options of the type = `LAYOUT_FIELDS`, both from the shared block inspector with `part="texts"` / `part="layout"`; colors with the glass picker "Role | Fixed"), Check (contrast in Light and Dark, image descriptions, link texts; `src/core/checks/block-checks.ts`).
- Unsaved means the content or name differs from what was opened or saved; leaving asks "Save draft / Discard / Cancel"; a reload asks the browser.
- After the first version, when the editor's open template has placed blocks of the type, the dialog offers to replace them, off by default (decision 49).
- Block panel: "Built-in | Own" toggle in "All blocks", "Adjust" on built-in cards, own cards with name, "own" mark, "Copy of … · version n" and "Edit"; own cards without a version cannot be dragged yet. Current blocks shows an own block's name and the "own" mark.
- Not in this step: "Save as own block" from a placed row and the newer-version notice (R2), the Colors tab entry (decision 33), "New block" and free blocks (step 5), the overview (step 6).

## New block entry points (built 2026-10-22)

Decisions 15, 48, 54, 83; mockups R2 (Own list) and R3 variant C (start page, start menu).

- "All blocks" tab, "Own" list: dashed tile "New block" first, also in the empty state; it opens `/blocks/<new id>?from=<template id>&type=free`. Free own blocks are draggable like copies, with the striped icon and "Free block · version n".
- Start page: tile "New block" fourth under "Start new"; start menu: section "Blocks" with the entry "New block". Both open `/blocks/<new id>?type=free` without a template.
- Inserting places the newest version (`placeOwnBlock`); preview and export render the free block at the available width of the render context.
- Left out until their feature exists: the link "Open from file …" in the empty Own list comes with the file export of own blocks; the start menu entry "Manage own blocks" and the link "Manage all" in the Own list come with the overview page.

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
| "All blocks" tab, "Own" list | Tile "New block" | Free block from inside the editor (decision 48) |
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
- Addresses follow the editor scheme (`src/app/editor/panel/panel-routes.ts`): `/demos` is the gallery, `/demos/<id>` one publication. Once blocks can be published, each kind gets its own address like an editor tab (`/demos/newsletters`, `/demos/blocks`) and `/demos` redirects. A withdrawn, blocked or unknown publication shows the not found page in a publication variant (decision 69).
- Gallery: cards with preview, title, publisher, language, date, views and likes; search, language and sort "Newest | Most popular" (decisions 70, 72). Single view: preview Light / Dark and desktop / phone, "Use as template" (free copy into this browser, no login) and "Report" (decision 71). Publishing: dialog from the editor ⋮ menu (decision 73).
- Design: mockup `docs/mockups/block-editor/r5-demo-page.html`, variant A (grid of cards) chosen (decision 74).

## Naming

- The start tiles are start help, not demos. They are named **"Beispielvorlage Deutsch / Englisch"** (EN: "Example template German / English"), formerly "Demovorlage", so "Demos" clearly means the new page. Done 2026-10-22.
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
| 21 | Free block parts in the first version | Row, column, text, image, button, spacer; callout and code later. Extended by decision 43 |
| 22 | New export targets (CV PDF, articles) | Separate export chapter; blocks must not block it |
| 23 | File format for own blocks | Same envelope as the project file, with a type field |
| 24 | IDs | UUIDv7 from one injected ID source; tenant as a field |
| 25 | Reset dialog | One checkbox per kind of data with counts, all checked, "save as file first"; refined by decisions 63 to 67 |
| 26 | Intentional warnings | Markable as intended per placed block |
| 27 | Drafts | Never auto-deleted; sort, search, manual cleanup; persistent storage request |
| 28 | Editor actions | Pure operations on the JSON model in `src/core` |
| 29 | Open and click measurement | Use Listmonk's own tracking (`{{ TrackView }}` in the template, links already wrapped with `TrackLink` at export); per person or totals only is Listmonk's "individual subscriber tracking" setting. No own image IDs; images never expire, only raw request logs are deleted after 14 days. Block editor: image addresses stay data in the model. |
| 30 | Overview of own blocks and drafts | Yes, an overview page (for example `/blocks`); otherwise drafts have no home. |
| 31 | What a clone can edit | Starting texts, the existing layout options of the type, colors as roles; structure locked in v1. With the parts model a clone later becomes a new design over the built-in content |
| 32 | Toggle label in the "All" tab | "Built-in \| Own" (DE "Mitgeliefert \| Eigene"), where "Built-in" lists only shipped blocks. |
| 33 | "Adjust" from the Colors tab warning | Offer "replace all blocks of this type in this template with the copy", on by default; rewrite the warning text accordingly. |
| 34 | Colors on "Save as own block" | Colors equal to a general color become role links; all others become fixed. |
| 35 | Level of a fixed color | A default on the per-block level; same effect, no new level in the model. |
| 36 | Keyboard alternative to drag and drop | Yes, required (select, arrow keys, insert menu). |
| 37 | Block editor on phones | View and manage only on phones; editing from tablet width up. |
| 38 | Nested own blocks | Same as insertion into templates, version recorded, update on request; cycles blocked. |
| 39 | Frame of the new template for a block | Header, footer and legal parts included; otherwise the legal check fails at once. |
| 40 | Address of the block editor | `/blocks/<id>`; `?from=<template id>` when opened from a template (back link, preview colors); a reload opens the same block |
| 41 | Content and design | Separate: content parts with id and role; design places them and holds all styles |
| 42 | Inheritance | Part → block → template for font, size, colors, alignment; fonts as stacks with fallback |
| 43 | Parts in v1 | Section, Columns, Box, List, Text, Image, Button, Icon, Divider, Spacer, embedded built-in block; Date later |
| 44 | Text size scale | Add `2xl` 32, `3xl` 40, `4xl` 48 |
| 45 | Gate for free blocks | All built-in blocks rebuildable as designs with equivalent HTML |
| 46 | Several designs per block | One active; design proposals use this; UI later |
| 47 | Excluded in v1 | Background images, visibility only on mobile or desktop |
| 48 | Free block from inside the editor | Tile "New block" first in the "Own" list of the "All blocks" tab |
| 49 | Replace placed blocks after "Adjust" | On save, offer "replace all blocks of this type in this template with the copy", off by default |
| 50 | Block panel design (mockup R2, step 3) | Variant A: toggle without counts, "own" pill next to the name, newer-version notice directly under the placed row, "Save as own block" in a new ⋯ row menu |
| 51 | Colors design (mockup R2, step 4) | Variant B: glass picker "Role \| Fixed" showing each role in Light and Dark, findings collected at the top of the block, accepted ones in a collapsible group with an optional reason |
| 52 | "Update" to a newer version | The user's texts stay; layout and colors come from the new version. Undone with the editor's undo (↶) like any other change |
| 53 | Placed block after "Save as own block" | Replaced by the new own block, on by default; it looks the same |
| 54 | Tint of free blocks | Shared neutral tint plus a striped icon, so it does not read as the divider type |
| 55 | "Fixed" mark | Neutral pill, not the warning color |
| 56 | Overview design (mockup R3, step 5) | Variant C: table with one row per block (preview, name, status, used in, changed), filter chips "All \| With draft \| No version yet \| Draft older than 90 days", multi-select for "Save as file" and "Delete" |
| 57 | Ways to the overview | Start menu entry, link "Manage all" in the "Own" list of the "All blocks" tab, and a start page section "Own blocks" with the latest four, shown only when own blocks exist |
| 58 | Deleting an own block that templates use | Templates keep their copy and get no more newer-version notices; 8 second undo |
| 59 | Import of a block that already exists in another version | Keep both; the imported one gets " (2)" appended to its name |
| 60 | "Delete drafts older than ..." | Choices 30 days, 90 days, 6 months, 1 year; default 90 days; saved versions stay; 8 second undo |
| 61 | Phones (extends decision 37) | Replaced by decision 83 |
| 62 | Duplicate an own block | Yes, in the row menu ⋯; added to the editor operations |
| 63 | Reset dialog design (mockup R4, step 6) | Variant B: each kind of data with icon, a one-line description and its count; "All \| None" above the list; the save box at the top |
| 64 | Delete button label | "Delete everything" (DE "Alles löschen") only while everything is checked (the default), otherwise "Delete selected"; enabled only after "I understand ..." is ticked |
| 65 | Coupling between kinds | None. Everything is checked by default and the user unchecks what to keep; drafts of deleted own blocks stay as standalone drafts when "Block drafts" is unchecked |
| 66 | Kinds without data | Hidden; what does not exist cannot be reset |
| 67 | Content of the save file | Only the checked kinds ("Save selected as a file"); under the button a line "Selected: everything" (DE "Aktuell: Alles angehakt") or the checked kinds |
| 68 | Address of a block that no longer exists | The app's not found page in a block variant ("This is not the block you are looking for"), offering "How about a new block?" next to the way back; same pattern as a deleted template |
| 69 | Address of the demo page | `/demos` for the gallery, `/demos/<id>` for one publication; later `/demos/newsletters` and `/demos/blocks` like the editor tabs, `/demos` then redirects; a withdrawn or blocked publication shows the not found page in its own variant, as in decision 68 |
| 70 | Gallery card | Preview, title, publisher, language, date, views and likes; liking needs login |
| 71 | Single publication view | Preview Light / Dark and desktop / phone; "Use as template" (DE "Als Vorlage übernehmen") creates a copy as a new template in this browser, free; "Report" (DE "Melden") for takedown on abuse |
| 72 | Search and filter | Search, language, sort "Newest \| Most popular" (DE "Neueste \| Beliebteste"); topics or industries later |
| 73 | Publishing | "Show on demo page" in the editor ⋮ menu opens a dialog: title, description, language, note "public for everyone", checkbox "I am responsible for the content"; without login, login comes first. Shown in mockup R5 |
| 74 | Demo page design (mockup R5, step 7) | Variant A: grid of equal cards, search, language and sort in a glass bar above; a click on a card opens `/demos/<id>` |
| 75 | Content with lists (extends decision 41) | Content holds flat parts and collections. A collection has items, and each item is a set of parts keyed by role. A List part places a collection and sets the item design once. The "nothing lost" check counts every item of a placed collection as placed. |
| 76 | Width in nested layouts | The render context carries the available width in px. Columns pass each child its share (ratio, gap, padding). Images and fixed cells take their px from it, so the fixed 600, 504, 252 and 88 px values in the renderers go. Width choices are a fixed list (full, 3/4, 2/3, 1/2, 1/3, 1/4 of the available width); percent of column is removed. |
| 77 | Columns on phones | Each Columns part has "stack on phones": yes (default) or no. Stacked order is natural or reversed only. The check warns when a non-stacking column is narrower than about 120 px at 320 px phone width. |
| 78 | Missing scales | Name the scales before the first own block is stored: column ratios, image width, icon and button size, weight (normal or bold), padding (vertical and horizontal), bleed (full canvas or content width). Values: decision 81. |
| 79 | Small export fixes | Yes: the document language follows the template language instead of a fixed "en"; the open-tracking pixel moves to the top of the body so Gmail clipping cannot cut it off; the dark-mode color block resolves its CSS variables at export. One small task in its own thread. |
| 80 | Greeting with name or fallback (decision 4 of the email completeness review) | Amended 2026-10-22: "B plus piece". The Greeting block stays a built-in block of its own with its name switch, exactly as before; nothing is converted. In addition, a "name or fallback" piece can be placed in any text (lite kit), for example a closing line "… [Name oder Werte Geschäftspartner]". Greeting and Event are the two built-in logic blocks: embeddable as a whole, not rebuilt from parts. A name that is an email address or a generic role mailbox counts as no name. |
| 81 | Scale values (decision 78) | Start with best-guess values (Finite scales table), measured values replace them later. Stored blocks keep token names only. |
| 82 | Floors for nesting and accessibility | Minimum widths per part, depth limits and accessibility minimums as in Coverage and limits. Starting values, to be checked in practice; they may change. Width floors refuse the drop, accessibility findings warn. |
| 83 | Phones (replaces decision 61) | Nothing is left out on phones: "New block" and "Edit" are shown there as well. Phone optimizations follow later as their own topic |
| 84 | Meaning of "equivalent HTML" in the gate (decision 45) | Neither byte nor pixel equal; small differences are fine. Screenshots of the export side by side, reviewed together with the maintainer; email clients have top priority, the preview iframe is not compared |
| 85 | Built-in renderers after the gate | Stay; the gate is a proof. Switching built-in blocks to content plus default design is a later step of its own |
| 86 | Built-in values outside the scales (for example teaser gap 20 px, video gap 10 px) | The built-in block moves to the nearest scale value; the scales are not extended for it |

## Mockups and states

Mockups R1 to R5 are in `docs/mockups/block-editor/`, Light and Dark, German first.

States the implementation must cover where they apply: empty, in progress, unsaved change when leaving, draft saved, version published, check warnings in Light and Dark, finding marked as intended ("accepted"), error (storage full, invalid import file, persistent storage refused, Safari storage notice).

Reset dialog wording (EN; DE in the mockup):

> **Reset everything?**
> This data is deleted from this browser. This cannot be undone.
> [Save selected as a file] Selected: everything
> [x] Templates (12) · [x] Own blocks (3) · [x] Block drafts (5) · [x] Current working draft · [x] View settings
> The app language is kept.
> [x] I understand that this cannot be undone.
> [Cancel] [Delete everything]

## Open questions

None. Decisions 30 to 74 were accepted on 2026-10-21, decisions 75 to 83 on 2026-10-22, decisions 84 to 86 on 2026-10-23.
