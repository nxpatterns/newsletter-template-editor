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

## Open questions

1. Which variant? Recommendation: A, plus the "Wo bearbeiten" lens from C as a second view.
2. May the tree jump to the editing place (tab switch, target group glows)? It changes nothing, so the tree stays read-only. Recommendation: yes.
3. Clicking a block in the tree: only highlight it in the preview, or also offer "In der Liste öffnen"? Recommendation: both; the click highlights, the info card offers the jump.
4. Remember the last chosen view (list or tree) per user? Recommendation: yes, the first start is always the list.
5. Show the inbox branch (subject, preview text, edited in Kampagne) as a fourth branch? Recommendation: not now.
