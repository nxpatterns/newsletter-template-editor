# Current blocks tree

A read-only overview tree for the "Aktuelle Bausteine" tab, next to today's list.

- Round 1 (superseded): `docs/mockups/current-blocks-tree/r1-tree-variants.html`, a tree with all list functions.
- Round 2 (current): `docs/mockups/current-blocks-tree/r2-overview-variants.html`, variants A, B, C.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Default view | List. A two-option switch (Liste, Baum) sits at the top of the tab. |
| 2 | Purpose of the tree | Overview only, read-only. All editing stays in the list (blocks) and in the dedicated tabs (header, footer, colors). |
| 3 | Look | Must not look like the list: drawn branches like a mind map. |
| 4 | Header and footer | Shown in the tree, collapsed by default; when opened, their parts appear in mail order. |
| 5 | Where to edit | Every header and footer part tells the user where it is edited (tab and group); a jump opens that place. |
| 6 | Variant | B, org chart. Built in `placed-tree.component`; below 34rem the columns stack. |
| 7 | Jump | The status line names the place; "Open" switches the tab, opens the group and lets it glow. Blocks go to the list with the block selected. |
| 8 | Remembered view | Per browser (`placed-view.v1`); first start is the list. |
| 9 | Inbox branch | Not shown for now. |
| 10 | Branch state | Open and closed branches are remembered per browser (`tree-collapsed.v1`). |
| 11 | Status line | Changes only when a branch is picked (click, tap, keyboard), never on hover. |
| 12 | Arrival | Light edge A on the status line plus button fill 1 (mockups r3, r4); reduced motion fades only. |

## Levels

Newsletter > Header, Content, Footer > parts or blocks. Chapter blocks group the blocks that follow them. Header and footer parts in mail order:

| Group | Part | Edited in |
| --- | --- | --- |
| Header | Stars | Brand, 1 Stars (switch "top") |
| Header | Brand name | Brand, 2 Brand name |
| Header | Logo | Brand, 3 Logo |
| Header | View in browser | Brand, 4 View in browser |
| Footer | Notice | Legal, Sender |
| Footer | Social icons | Social Media |
| Footer | Stars | Brand, 1 Stars (switch "bottom") |
| Footer | Company line | Legal, Sender |
| Footer > Links | Privacy, Imprint, Unsubscribe, View in browser | Legal, Links (unsubscribe and view-in-browser targets come from Listmonk) |

Hidden parts show dimmed with "aus"; a hidden required part (imprint, unsubscribe) shows a warning. With the parts model, a block node may later expand into its content parts by role; the tree stays read-only.

## Variants

- **A Mind map**: root left, branches to the right as curves. Tricks: branches taper toward the tips, branch color = block type, collapsed branches show a count bubble, chapters after the first start collapsed above 20 blocks, fit to width (zoom down to 70 %). Each header and footer part carries a signpost tag (tab icon, tab, group number); a click opens an info card with a jump to the tab.
- **B Org chart**: root on top, Header, Content and Footer as columns. Tricks: leaves stack under their parent instead of spreading sideways, elbow lines, each column names the tabs it is edited in, a status line at the bottom names the exact place on hover or tap.
- **C Two lenses**: indented tree with drawn elbows, two columns when wide. A switch changes the lens: "Aufbau" shows the mail, "Wo bearbeiten" shows the same parts sorted by tab and group. A click opens the path to the editing place right under the node.

Below 30rem all three fall back to the indented tree with drawn elbows.
