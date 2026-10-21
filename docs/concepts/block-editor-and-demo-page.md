# Block editor and demo page

Concept for two new product areas: a **block editor** (users change or create their own blocks) and a **demo page** (users publish their own newsletters for others to see).
Status: concept only, agreed in discussion on 2026-10-21. Nothing implemented. Mockups come after review.
Audience: non-technical sellers and marketing people first, designers second. English only.

Related: `email-colors.md` (color levels), `block-content-editing.md` (edit modal, lite kit, render pipeline), `file-management.md` (storage, start page, menus), `docs/sessions/cache/2026-10-17--17-48--Block-Editor-and-Color-Concept.md` (earlier notes), `AGENTS.md` (email CSS rule).

## Goals

- Become a de facto standard for building newsletters: reliable output, trust first, revenue second.
- Let users adapt a built-in block, or build a completely new one, without writing HTML.
- Keep every block usable in any template, with checked contrast and readability in Light and Dark.
- Everything that costs us nothing to run stays free. Only things with running cost (cloud) are paid.
- Prepare a public demo page as the first step toward a later marketplace.

## Non-goals (now)

- Implementation of either area. This document only fixes entry points, model and open questions.
- What exactly the block editor can edit (field by field). Separate chapter.
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
- Modern layout is allowed in the editor (for example columns). Export turns it into what old mail clients understand (nested tables), per the existing inliner step.
- Text uses the existing WYSIWYG lite kit. Nothing beyond it should be needed.
- **No custom HTML and no scripts, ever.** This is a hard rule, not a temporary limit.
- Own blocks can contain other own blocks (nesting), so a user can build a library of parts.

Why: only composed blocks can be guaranteed to render in mail clients and can be checked automatically.

## Color model for own blocks

Extends the binding order in `email-colors.md` (block defaults < general colors < per-block overrides, per template, Light and Dark).

- Adapted block: follows the default colors of the template it is used in, exactly like the original.
- Free block: the designer sets its own default colors. Each color gets a **role** (background, text, accent, and the other roles the general colors already use).
- Used in another template, a free block follows that template's colors by role by default. Only colors the designer deliberately marked as **fixed** stay fixed.
- Whether a fixed color sits above the general colors needs a decision in the color concept (see open questions).
- Block editor function **"create a new template for this block"**: start a template whose general colors come from the block's own defaults. Needs its own thought (see open questions).

## Quality checks

The block editor checks and tells the user, in plain words, at least:

- contrast between text and background (WCAG AA), in Light and Dark,
- font size too small,
- missing image description,
- link text that says nothing
- and other common accessibility or content issues

Checks run while editing and again when an own block is inserted into another template, against that template's colors. They warn; they do not block saving. That could be also intentional, depending on the desired user experience. (E.g. Dark Teaser in light template)

## Library, drafts and storage

- Saved own blocks appear in the block panel through a toggle **"All | Own"** inside the existing "All blocks" tab. No eighth tab. Dragging into the newsletter works the same from both lists.
- Own blocks keep the tint of their original type plus a fixed "own" mark. Free blocks get one shared neutral tint plus the mark. The rule "one tint = one block type" stays readable.
- **Drafts are visible only on the block edit page.** No limit on the number of drafts; the browser's storage limit is the only bound. We could consider adding a cleanup mechanism for old drafts if storage becomes an issue and provide a search functionality to find specific drafts quickly, if the list is long.
- Insertion records the block's version. Later changes to an own block reach older templates only when the user asks for it.
- Storage today: IndexedDB, behind a repository interface like `template-repository.token.ts`, so cloud accounts can replace it later.
- Factory reset and cleared browser data also delete all own blocks and drafts. The reset dialog must say so. The reset dialog could contain a list of checkbuttons for the user to confirm which types of data they want to delete. Default all of them are checked.
  - Question: What types of data (list) should be included in the reset dialog and whether the default selection of all checked is the best user experience.

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
| "Placed blocks" row | "Save as own block" | Turns per-block color overrides into a clean own block |
| Colors tab warning | Link "edit the block type instead" | The warning already points there |
| Start page, "Start new" section | Tile "New block" next to the blank template | Works without an open template |
| Start menu | Entry "New block" | Same |
| Footer | None | The block editor does not belong in the footer |

Route: its own address (for example `/blocks/:id`). Header behaves like the About page today: "Back to template" with the template kept as a draft. Opened without a template, the preview uses neutral colors; opened from the editor, it uses the current template's colors, switchable Light / Dark.

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
- **Open tracking via images is unresolved** (see open questions). Images loaded from our server reveal that a mail was opened, but: Apple Mail Privacy Protection preloads images through proxies, so open rates are heavily distorted; Gmail loads images through its own proxy; many clients block images by default. Legally, a tracking pixel in DE / EU usually requires consent (GDPR, § 25 TDDDG). Image hosting would also change the export from user-provided image addresses to our server.

User:

```plaintext
If each image gets a unique URL (ULID, etc.), which is requested when the mail client loads it, we can track these requests. That means the opening of the newsletter can at least be measured, even if actual reading cannot be guaranteed. The decisive question is: Do proxies load images automatically, without user interaction? Normally, they are not allowed to do so, right?

Please also not forget: user privacy is of immense importance to us. Customer data is always treated with the utmost confidentiality. But just as important here is that we gain a kind of metric that shows which content is actually opened and read, without violating users' privacy. This is necessary so that we can continue to offer our users ever better services. If we track anything, we are not tracking customers, customer data, etc.; rather, we are tracking how efficiently our own system is functioning and we are allowed to do so legally, ethically and responsibly. You must keep this in mind before drawing any inappropriate, absurd, or incorrect conclusions or proposing measures. Sometimes you drive me crazy, and sometimes I get the impression that you think I might be a potential criminal. Please stop doing that.  
```

- Free blocks plus non-email targets (CV, blog, PDF) widen the product a lot. Mockups should still lead with the newsletter case, since that is the main audience.

## Decisions from the discussion

Numbers refer to the questions in the 2026-10-21 thread.

| No. | Question | Decision |
| --- | --- | --- |
| 1 | Clone or new type | Both: adapt a built-in block or create a free block from scratch; start page tile and menu entry for the latter |
| 2 | Global or per template | Library for all templates; insertion records the version; updates only on request |
| 3 | Colors in the block editor | Adapted: template default colors. Free: own default colors with roles, checked for accessibility |
| 4 | Visual mark | Tint of the original type plus an "own" mark |
| 5 | Own tab or toggle | Toggle "All / Own" in the existing tab |
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

## Open questions

1. Does a fixed color in a free block win over the target template's general colors, and does it lose to a per-block override? Recommendation: yes to both; requires an update of `email-colors.md`.
2. "Create a new template for this block": empty template with only this block, or the current template with its general colors replaced by the block's defaults? Recommendation: empty template; replacing colors of an existing template is too surprising.
3. Which parts does a free block offer in the first version? Recommendation: row, column, text, image, button, spacer; callout and code later.
4. Are new export targets (CV PDF, LinkedIn / Medium article) part of the block editor chapter or a separate export chapter? Recommendation: separate chapter; blocks only must not block it.
5. File format for saving own blocks: same envelope as the project file, or its own? Recommendation: same envelope with a type field.
6. Open tracking: whether and how to measure opens, given proxy preloading (Apple, Gmail) and the consent requirement (GDPR, § 25 TDDDG). Not decided; separate chapter with legal review.
