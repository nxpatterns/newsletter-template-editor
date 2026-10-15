# Email colors

Concept for how sellers control colors of the **email document** (preview iframe / export), not the editor app chrome.
Audience: field sellers. English only.
**Status: concept only — not implemented in code yet.** Implement only when chosen as a session goal; this file is the contract.

Source of truth remains structured document data; HTML colors are always resolved at render time.

Related: `block-content-editing.md`, `design-system.md` (app chrome only), `file-management.md` (save / library / project transfer).

## Goals

- One place to edit email colors: the **Colors** tab.
- Campaign-level palette stays small and reusable (semantic names).
- Every color the renderer uses for mail header, footer, and each **placed** block type is editable — no permanent hidden hardcode once this lands.
- A slot may follow a **semantic campaign color** or a **fixed hex**.
- Multiple placements of the **same block definition** share one style (synced).
- Different look + content → **clone** the definition (future **Custom blocks**).
- Two built-in start worlds: **Dark example** and **Light example**. One active world per document — not a parallel light/dark product toggle, and **not** light/dark per block.
- Sellers switch example **from the top of the Colors tab**.
- Reset restores the **active example** originals.
- Sellers can **save, load, export, and import** named color themes (colors only), separate from full template transfer.
- Save / library / project transfer always carry the color state needed for this document (see Persistence).
- Color theme files and projects are **forward- and backward-tolerant** via versioned envelopes and normalize-on-load.
- Color edits participate in normal **Undo / Redo**.
- Architecture stays open for **AI-generated themes/blocks** and a future **marketplace**.

## Non-goals

- Changing editor app header/footer/chrome colors (`design-system.md`).
- Per-instance color forks without cloning a definition (no silent override matrix in v1).
- **Per-block light/dark dual palettes** (each block does not store two worlds).
- Free hex pickers inside the block content inspector.
- Seller-facing dual theme (one mail that is simultaneously light and dark via `prefers-color-scheme` as a product feature). Export may still emit client-protection meta/CSS; that is engineering, not a second palette UI.
- CSS class names or raw slot ids as seller-visible labels.
- A global theme toggle in the **app header** that flips editor chrome.
- Materializing color maps for block types **not** present in the document.

## Product model

### Campaign palette

Named semantic tokens, always visible at the top of Colors (compact layout):

| Token id (internal) | Seller label direction (EN) | Current globals field |
| --- | --- | --- |
| `standard` | Standard | `standardColor` |
| `primary` | Primary | `primaryColor` |
| `secondary` | Secondary | `secondaryColor` |
| `accent` | Accent | `accentColor` |
| `pageBg` | Page background | `pageBgColor` |
| `contentBg` | Content background | `contentBgColor` |

Layout: about **three swatches per row** when width allows, wrapping by space, sensible minimum control size.

### Seller labels vs internal ids

- **Slot ids** and **token ids** are stable English machine keys for code, JSON, AI, and packages. Never primary UI copy.
- Every campaign token, mail shell slot, and block slot uses **semantic i18n labels** (DE/EN).
- Accordions use human names (“Price box”, “Mail header”), optionally with a short placement hint — not `price.strike`.

### Color value

Every component slot stores:

- `{ mode: 'token', token: <campaign token id> }` — follows the campaign palette when that token changes.
- `{ mode: 'hex', hex: '#rrggbb' }` — frozen custom color.

Renderer: one helper `resolveColor(value, palette) → hex`.

UI per slot: semantic label + swatch + hex field + way to **link to a campaign color** or use custom hex.

### Block definition style (shared)

Style is keyed by **block definition**:

- Built-in catalog type (e.g. system `price-box`), or
- Future **custom block** id (cloned recipe with its own name).

Same definition twice in the document → **one shared style** (synced). Two Colors accordions (instance order) bind the same controls; short hint that changes apply to all placements of this block.

Different colors → **clone** definition → save under a new name (Custom blocks).

### Built-in examples (start worlds)

| Example id | Role |
| --- | --- |
| `cloudlib-dark` | Default on app/demo start — current Glacier look |
| `cloudlib-light` | Light counterpart preset (to be authored) |

Each example bundles:

- Full campaign palette
- Default slot map for mail header, mail footer, and every system block type

Document stores `activeExampleId` (which built-in world Reset and **new-block defaults** refer to). Applying a user/marketplace/AI theme does not redefine Reset unless product later adds “reset to last named theme”; default Reset stays **built-in example originals**.

**One world per document.** New blocks take defaults from the **active** example only. There is no second stored palette per block for the other example.

## Where the seller switches Dark ↔ Light

**Primary control: top of the Colors tab** — always visible before the campaign grid.

```text
Colors
  Theme starter:  ( Dark example )  ( Light example )   ← segmented control
  [ Reset to original ]
  …
```

Behavior:

- App / new demo document starts on **Dark example**.
- Seller selects **Light example** (or Dark again).
- **Confirm** dialog (app modal): applying replaces campaign palette and **styles for definitions currently in the document** (plus shell) from that example; current color tweaks in the open world will be overwritten.
- On confirm: one history step (undo restores previous full color snapshot for this document).
- Active selection is visible at a glance.
- No second control in the app header required.

**Reset to original** always reapplies the **currently active** built-in example (if Light is active, Reset is Light originals) for palette, shell, and **used** definition styles only.

## Colors tab structure

Order top → bottom:

```text
Colors
  Theme starter: Dark example | Light example    // confirm on change
  Color themes: Save… / Open… / Export… / Import…   // named themes + files
  [ Reset to original ]

  Campaign palette              // compact semantic grid

  Mail header                   // always-on accordion
  Mail footer                   // always-on accordion

  ── Blocks in this email ──
  Accordion per block instance, document order
```

Rules:

- Mail header / footer: email shell in the iframe only; always listed under campaign palette.
- **Block list: only instances present in `blocks[]`; order = document order.** Never invent extra block types in this list because the app knows defaults for unused catalog types.
- Same definition → synced style across instance accordions.
- Editor app chrome: out of scope.

### Undo / Redo

- Color commits use the existing newsletter session history.
- Picker drag: coalesce; blur / pointer-up ends coalesce.
- Reset, example switch, theme apply/import: one undo step each (snapshot before).

### Reset

| Action | Effect |
| --- | --- |
| Reset to original | Reapply **active built-in example** campaign + shell + styles for **used** system definitions |
| Reset one accordion group | Reapply that group’s slots from active built-in example |

## Persistence (save, library, project)

Colors live **inside** the newsletter document. There is no separate “remember to save colors” step.

### What is always stored with the document

| Always | Only when used |
| --- | --- |
| Campaign palette (all semantic tokens) | `styles.byDefinitionId` entries for definitions that appear **at least once** in `blocks[]` |
| Shell styles (header + footer) | — |
| `activeExampleId` | — |

Also stored as today: block content, logo master, legal, campaign fields, etc. (see file-management).

### Lifecycle rules

- **Save / Save as / library write / crash recovery / export current template:** write the color state above (palette + shell + **used** definition styles only). Do not embed full catalog color maps for unused block types.
- **Add a block** whose definition has no style entry yet: copy defaults from the **active built-in example** for that definition into `styles.byDefinitionId`, then seller may edit.
- **Remove the last instance** of a definition: drop that definition’s style entry on the next normalize/save (no orphan styles required).
- **“Missing slots”** means missing **color fields** on palette, shell, or a **used** definition (e.g. older file, newer app added `price.badgeText`). It does **not** mean missing blocks and must **not** add blocks to the document or extra rows under “Blocks in this email”.
- Fill missing slots from the **active example** defaults for that definition/shell only.
- Built-in example hex values for **already shipped slot ids** must not change silently in a way that rewrites existing documents; new defaults apply to **new** slot ids or to new documents. Prefer materializing used maps so round-trips stay stable across machines and app builds.
- Migrate today’s six `globals.*Color` fields into `palette` on first normalize after this feature ships; do not leave a permanent dual model.

### Project transfer vs color-only files

| Action | Scope |
| --- | --- |
| **Export current template** (file menu) | Full document envelope including color state above. One file = the open template. Seller-facing label: no “.json” jargon. |
| **Open exported template** | Restores newsletter **and** colors together. |
| **Export colors** (Colors tab) | Color-theme file only (palette + shell + used definition styles + metadata). No block content. |
| **Import colors** | Apply a color-theme file onto the **current** document (confirm). |

v1 transfer is **current template only**. Multi-select / “all library entries” export-import is a **later** file-management slice (not part of colors v1).

### Color theme file envelope

```text
{
  kind: 'nte-color-theme'
  schemaVersion: number
  name: string
  exportedAt: iso
  createdWithAppVersion?: string    // package/app version that wrote the file
  activeExampleId?: string
  palette: { … campaign tokens … }
  styles: {
    shell: { header: {…}, footer: {…} }
    byDefinitionId: { 'system:price-box': {…}, … }  // used / theme-relevant defs only
  }
}
```

Rules:

- **Unknown keys** in a newer file: preserve on load when possible; ignore safely if not.
- **Missing slots** vs current app: fill from active example defaults for that shell/definition; **do not** add unused block types.
- **Import info dialog** (app modal): plain-language summary that some newer color fields were filled with defaults. Prefer counts or short group names; no raw slot ids.
- **Extra slots** for unknown block types: keep under their definition keys for a later build.
- Same normalize family as document load (`normalizeColorTheme` / `normalizeNewsletter`).

### Opening an old project (no color chapter yet)

1. Map legacy `globals.*Color` → palette.
2. Set `activeExampleId` default `cloudlib-dark` if absent.
3. Materialize shell + styles for definitions present in `blocks[]` from that example (then overlay any future partial data).
4. Info modal when defaults were filled.
5. Next save writes the full document color contract above.

## Slot inventory (current renderer reality)

Internal **slot ids** below; UI shows **semantic labels only**. Dark example / current code seed values; Light example has its own defaults. Inventory lists **what can be colored**, not what must appear in every document’s Colors list.

### Mail header (shell)

| Slot id | Seller label direction |
| --- | --- |
| `header.surface` | Header background |
| `header.stars` | Stars line |
| `header.viewInBrowser` | View-in-browser link |
| `header.brandName` | Brand wordmark (see Brand name note) |

### Mail footer (shell)

| Slot id | Seller label direction |
| --- | --- |
| `footer.surface` | Footer background |
| `footer.notice` | Notice text |
| `footer.rule` | Divider line |
| `footer.stars` | Footer stars |
| `footer.company` | Company line |
| `footer.link` | Footer links |

### divider

| Slot id | Seller label direction |
| --- | --- |
| `divider.line` | Line |
| `divider.twoToneStart` | Two-tone line (start) |
| `divider.twoToneEnd` | Two-tone line (end) |
| `divider.ornament` | Ornament diamond (Accent) |
| `divider.glow` | Glow line (Secondary mixed into the background) |

### hero

| Slot id | Seller label direction |
| --- | --- |
| `hero.label` | Label |
| `hero.headline` | Headline |

### paragraph

| Slot id | Seller label direction |
| --- | --- |
| `paragraph.body` | Body text |

Inline HTML colors inside content remain until structure/light-marks remove them. Base slot colors unstyled text only.

### chapter-band

| Slot id | Seller label direction |
| --- | --- |
| `chapter.surface` | Band background |
| `chapter.title` | Title |

### pull-quote

| Slot id | Seller label direction |
| --- | --- |
| `pullQuote.bar` | Accent bar |
| `pullQuote.text` | Quote text |

### stat-box

| Slot id | Seller label direction |
| --- | --- |
| `stat.surface` | Box background |
| `stat.number` | Number |
| `stat.label` | Label |
| `stat.divider` | Inner divider |
| `stat.geo` | Regions text |

### benefits-list

| Slot id | Seller label direction |
| --- | --- |
| `benefits.chevron` | Bullet mark |
| `benefits.item` | Item text |
| `benefits.rowRule` | Row line |

### price-box

| Slot id | Seller label direction |
| --- | --- |
| `price.surface` | Box background |
| `price.border` | Border |
| `price.topBar` | Top bar |
| `price.badgeBg` | Badge background |
| `price.badgeText` | Badge text |
| `price.strike` | Previous price |
| `price.amount` | Price amount |
| `price.currency` | Currency |
| `price.period` | Period / unit |
| `price.details` | Details |
| `price.fine` | Fine print |

### cta-button

| Slot id | Seller label direction |
| --- | --- |
| `cta.buttonBg` | Button background |
| `cta.buttonText` | Button text |

### cta-link-list

| Slot id | Seller label direction |
| --- | --- |
| `ctaLinks.arrow` | Arrow |
| `ctaLinks.label` | Label |
| `ctaLinks.intro` | Intro text |
| `ctaLinks.link` | Link |
| `ctaLinks.rowRule` | Row line |

### Brand name note

`brand.nameHtml` is still multi-span HTML. Do not block email-colors on full decomposition; expose clean shell slots first; brand multi-stop colors follow structured marks later.

## Custom blocks (future)

Working name: **Custom blocks**. Catalog section beside system blocks.

```text
BlockRecipe {
  id
  name
  basedOn: system type | other recipe
  content: structured fields
  appearance: { colors: Record<slotId, ColorValue> }
  schemaVersion
}
```

Instances link by `definitionId` so Colors sync stays true. Clone → edit → save as new name.

When a document uses custom definitions, **project transfer must include those recipes** (or the installable package they came from). Detail when Custom blocks is scheduled — do not invent a second color system.

## Extensibility: AI themes, new blocks, marketplace

- **Everything colored is data:** palette + slot maps + definition keys — never only code hardcodes.
- **Stable kind + schemaVersion** on documents, color themes, block recipes, and later packages.
- **definitionKey** namespace, e.g. `system:price-box`, `custom:<uuid>`, `marketplace:…`, `ai:…`.
- **Slot registry per block type:** declared slot ids + default ColorValues + i18n label keys. Colors UI is driven by **registry + doc instances**, not a closed hard-coded accordion list alone.
- **Validate + normalize on every boundary** (open template, import theme, install package, apply AI result).
- **AI output = same JSON shapes** the editor already understands.
- Marketplace listing metadata stays outside the render model.

## Data shape (implementation direction)

```text
Newsletter
  activeExampleId
  globals.palette                 // campaign tokens (migrate from *Color fields)
  styles.shell.header / footer
  styles.byDefinitionId           // only definitions present in blocks[]
  blocks[]                        // each references definitionKey
```

Named themes in IDB store the color-theme envelope body + displayName.

- `normalizeNewsletter` / `normalizeColorTheme` fill missing **slots** on used maps; never inject unused blocks.
- Renderer reads only resolved hex via `resolveColor`.

## Export HTML / client CSS

- Emit resolved inline colors from the single chosen world.
- Keep or slim `color-scheme` client protection without a second seller palette.
- Media-query strategy must not fight an intentional light example; decide at implement time against the active world.

## Locks

- Colors tab owns email color UX (starter switch, named themes, shell + block slots).
- One active example per document; no per-block light/dark dual storage.
- No free hex in block content inspector for these slots.
- Sellers see semantic labels only; ids stay internal.
- Shared style per definition; fork via custom block clone/save.
- Reset = active built-in example originals for palette, shell, and **used** definitions.
- Example switch and destructive theme apply = confirm modal.
- **Colors list for blocks = instances in the document only.**
- **Persist palette + shell always; definition styles only for used definitions.**
- New block → defaults from active example for that definition.
- Project / save round-trip carries that color state so another machine matches look + content.
- Color export is colors-only; full template transfer is file-management “export current template”.
- Import of older/partial theme or project files: fill missing **slots** + info modal; no phantom blocks.
- Slot ids stable; registries extend without renaming old ids.
- MIT-only deps; no Material.
- Tests: resolveColor; normalize missing/extra slots; used-only style maps; two-instance sync; import dialog; example switch undo; legacy globals → palette migrate; add-block gets defaults; remove last instance drops style.

## Suggested delivery slices

- Model: palette + ColorValue + shell/definition maps + example presets + normalize (used-only + legacy globals migrate).
- Renderer resolves all current hardcodes.
- Colors tab: starter Dark/Light + confirm; compact campaign grid; header/footer + instance accordions; labels i18n.
- Reset + undo.
- Named theme save/load (library) + export/import files; ensure save/library/project already carry document colors.
- Light example content.
- Later: Custom blocks; AI/marketplace packages; multi-template library transfer (file-management).

## Open product copy only

- Final DE/EN strings for “Dark example” / “Light example”, theme library names, import info modal wording.
- Final name for Custom blocks catalog tab.
- Whether File menu duplicates Color export/import or Colors tab alone is enough for v1.
