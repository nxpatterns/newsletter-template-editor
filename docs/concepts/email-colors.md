# Email colors

How users control the colors of the **email document** (preview and export), not the editor app chrome (`design-system.md`).
Status: shipped (schema v5 and later). The code is the reference; this file keeps the product rules and points to it.
Audience: non-technical sellers and marketing people. English only.

Related: `block-editor-and-demo-page.md` (colors of own blocks), `block-content-editing.md` (rich-text color tokens), `file-management.md` (colors travel inside the document).

## Where the truth lives

| Topic | Source |
| --- | --- |
| Model: two sets, three levels, roles, standard colors | `src/core/colors/model.ts` (header comment) |
| Every editable color of every block, its role, contrast pair and CSS target | `src/core/colors/slots.ts` (`BLOCK_COLOR_SLOTS`) |
| Edit operations, resolving, contrast findings | `src/core/colors/edit.ts` |
| Copy to all blocks of a type, take a block color as general color | `src/core/colors/transfer.ts` |
| Contrast math and "make readable" | `src/core/colors/contrast.ts` |
| Renderer side (colors to CSS / `bgcolor`) | `src/core/render/colors.ts` |
| Seller labels (DE / EN) | `colors.*` keys in `src/app/i18n/catalogs/` |

## Model in short

- Every template has **two color sets: Dark and Light**. `colors.mode` names the set that is edited, previewed and exported. Edits apply only to the current template and the current set.
- Each set has **three levels**, lowest first: standard colors of the blocks (fixed in code), general colors of the template, colors set directly in a block. A higher level wins.
- A color inside a block is either **linked to a general color** (`{ role }`) or a **fixed own value** (`{ hex }`).
- Overrides are stored per placed block (by block id), not per block type. "Apply to all {n} '{type}'" copies them once to the other blocks of that type; blocks added later start with the standard colors.

## Product rules

- One place for email colors: the **Colors** tab. No free hex in block content editors or the text kit; the text kit offers only the theme tokens `body`, `head`, `link`, `accent`, `dim`.
- Every color of every **used** block is editable, with no bans (a dark element in a light newsletter is allowed). The block list in the Colors tab shows only blocks present in the document, in document order.
- Users see semantic labels only, never slot keys or role ids. Slot keys and role ids are stable machine keys; new ones are added, old ones are never renamed.
- Contrast warnings sit at the affected color and say which pair, measured vs required value, and whether the color is inherited or own. Warnings never block.
- Changing a general color that some blocks overrode asks what to do with them ("use the new color everywhere" or "keep individual adjustments", the latter preselected).
- A block whose own color differs from a changed general color says so and offers "use the general color".
- Taking a block color as a general color always confirms, with reach and contrast information.
- Every color change is one normal undo step; dragging a picker coalesces.
- Colors are part of the document: save, library, recovery and template file always carry them.

## Planned

- **Own blocks:** free blocks map their colors to roles and may mark some as fixed. A fixed color wins over the target template's general colors and loses to a per-block override. Details: `block-editor-and-demo-page.md`.
- **Color themes as files** (colors only, separate from the template file): not built. Specify before building.
