# Current blocks tree

Tree view for the "Aktuelle Bausteine" tab, next to today's list. Mockups: `docs/mockups/current-blocks-tree/tree-variants.html` (variants A, B, C in one file).

## Goals

- Tree is the default view; a two-option switch (Baum, Liste) sits at the top of the tab and is remembered per user.
- The tree does everything the list does today: select (synced with the preview), reorder by drag, move up and down, edit, delete with undo, block-type tint, position number, empty state hint.
- It scales to long newsletters (40+ blocks) and uses a wider sidebar when there is one.

## Levels

| Level | Today | With the parts model (decisions 40 to 47) |
| --- | --- | --- |
| 1 | Groups: Header, Content, Footer | unchanged |
| 2 | Blocks in Content; frame parts in Header and Footer (switch on or off, required parts warn) | unchanged; own blocks appear like built-in blocks |
| 3 | Fields of a built-in block, named by role (Headline, Text, Image, Button) | Content parts with roles, same rows; built-in fields already are content parts with roles (decision 41) |

- The newsletter itself is not a row; it would only add indentation.
- The sidebar shows **content parts, flat, by role**, never the design tree (sections, columns, boxes). The layout tree belongs to the block editor. This caps the sidebar at three levels even for nested own blocks: an embedded own block shows as one part row with a link to open it.
- A list part shows as one row with its count ("List, 4 items"), not one row per item.
- Frame parts are not block types, so they get a neutral steel glyph, never a block tint.

## Variants

- **A Outline**: explorer-style tree. Collapsing, indentation guides with the selected branch highlighted, actions on hover or selection only, the position number turns into the grip on hover, density switch, sticky group headers, notices bubble up into collapsed parents, full keyboard control.
- **B Chapters**: like A, plus every chapter block becomes a collapsible section (the mail stays a flat order; dragging a chapter takes its blocks along; deleting a chapter keeps its blocks). Hoisting (focus on one chapter with breadcrumbs), search that keeps ancestors of matches, counters on collapsed nodes, a minimap rail with one tick per block in its type color.
- **C Wide**: at 34rem and more, two columns: blocks left, the selected block's parts right as a mind-map branch. Header and footer parts as chips in wrapping rows instead of long lists. Narrow sidebars get the normal tree with parts.

## Open questions

1. Which variant? Recommendation: B as the base (chapters are the natural outline of a long mail), with C's two columns only when the sidebar is wide.
2. Show header and footer in the tree? Recommendation: yes, collapsed by default; editing still happens in the Brand, Legal and Social tabs, the pencil jumps there.
3. Show fields (level 3) today, before the parts model ships? Recommendation: yes, collapsed by default; the pencil opens the block dialog at that field.
4. Keep the up and down buttons? Recommendation: only on the selected row, plus Alt+arrow keys; drag stays the main way.
5. Notices from block checks (for example missing image description): show them in the tree now? Recommendation: yes, as soon as the check exists; the tree only shows what the checks return.
