# Email colors

Concept for how sellers control colors of the **email document** (preview iframe / export), not the editor app chrome.
Audience: field sellers. English only.
Source of truth remains structured document data; HTML colors are always resolved at render time.

Related: `block-content-editing.md` (structure first), `design-system.md` (app chrome only), `file-management.md` (project library / file menu).

## Goals

- One place to edit email colors: the **Colors** tab.
- Campaign-level palette stays small and reusable (semantic names).
- Every color the renderer currently uses for mail header, footer, and each block type is editable — no permanent hidden hardcode once this lands.
- A slot may follow a **semantic campaign color** or a **fixed hex**.
- Multiple placements of the **same block definition** share one style (synced).
- Different look + content → **clone** the definition, save under a new name (future **Custom blocks** catalog).
- Two built-in start worlds: **Dark example** and **Light example**. One active world per document — not a parallel light/dark product toggle.
- Sellers can switch example **from the Colors tab** (primary control).
- Reset restores the **active example** originals (Dark start → Dark originals; Light start → Light originals).
- Sellers can **save, load, export, and import** named color themes (colors only), separate from full project files.
- Full **project export** always includes the complete color state (and later custom definitions).
- Color theme files are **forward- and backward-tolerant** via versioned envelopes and normalize-on-import.
- Color edits participate in normal **Undo / Redo**.
- Architecture stays open for **AI-generated themes/blocks** and a future **marketplace** of templates and pro themes.

## Non-goals

- Changing editor app header/footer/chrome colors (`design-system.md`).
- Per-instance color forks without cloning a definition (no silent override matrix in v1).
- Free hex pickers inside the block content inspector (text/structure stay there).
- Seller-facing dual theme (one mail that is simultaneously light and dark via `prefers-color-scheme` as a product feature). Export may still emit client-protection meta/CSS; that is engineering, not a second palette UI.
- CSS class names (`text-price-strike`, …) or raw slot ids as seller-visible labels.
- A global theme toggle in the **app header** that only flips editor chrome (out of scope and confusing).

## Product model

### Campaign palette

Named semantic tokens, always visible at the top of Colors (compact layout):

| Token id (internal) | Seller label direction (EN) | Current globals field |
| --- | --- | --- |
| `accent` | Accent | `accentColor` |
| `highlight` | Highlight | `goldColor` |
| `body` | Body text | `bodyTextColor` |
| `heading` | Heading | `headingColor` |
| `pageBg` | Page background | `pageBgColor` |
| `contentBg` | Content background | `contentBgColor` |

Layout: denser than today’s stacked pairs — target about **three swatches per row** when width allows, wrapping by available space, with a sensible minimum control size.

### Seller labels vs internal ids

- **Slot ids** and **token ids** are stable English machine keys for code, JSON, AI, and marketplace packages. Never shown as primary UI copy.
- **Every** campaign token, mail shell slot, and block slot uses **semantic i18n labels** (DE/EN), same idea as today’s “Accent” / “Highlight”.
- Accordions use human names (“Price box”, “Mail header”), optionally with a short placement hint when useful — not `price.strike`.

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

Document stores `activeExampleId` (which built-in world Reset refers to). Applying a **user/marketplace/AI theme** does not redefine Reset unless product later adds “reset to last named theme”; default Reset stays **built-in example originals**.

## Where the seller switches Dark ↔ Light

**Primary control: top of the Colors tab** — always visible before the campaign grid.

```text
Colors
  Theme starter:  ( Dark example )  ( Light example )   ← segmented control or equivalent
  [ Reset to original ]
  …
```

Behavior:

- App / new demo document starts on **Dark example** (today’s seed).
- Seller opens **Colors** and selects **Light example** (or Dark again).
- **Confirm** dialog (existing app modal pattern): applying replaces campaign palette and definition styles from that example; current color tweaks in the open world will be overwritten.
- On confirm: one history step (undo restores previous full color snapshot).
- Active selection is visible at a glance (which starter is current).
- No requirement for a second control in the app header. Optional later shortcut is fine; Colors remains the source of truth for “which email world”.

**Reset to original** always reapplies the **currently active** built-in example (if you started or last confirmed Light, Reset is Light originals).

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

- Mail header / footer: email shell in the iframe only; always listed under campaign palette (accordions).
- Block list: only instances present in the doc; order = `blocks[]`.
- Same definition → synced style across instance accordions.
- Editor app chrome: out of scope.

### Undo / Redo

- Color commits use the existing newsletter session history.
- Picker drag: coalesce; blur / pointer-up ends coalesce.
- Reset, example switch, theme apply/import: one undo step each (snapshot before).

### Reset

| Action | Effect |
| --- | --- |
| Reset to original | Reapply **active built-in example** campaign + system definition styles |
| Reset one accordion group | Reapply that group’s slots from active built-in example |

## Named color themes (save / load / export / import)

Sellers manage **colors only** as first-class artifacts, parallel to project files but narrower.

### In-browser library (named)

- Save current email color state under a **display name** (local library, same spirit as template library).
- Open / apply a saved named theme onto the current document (confirm if it overwrites current colors).
- Rename / delete in a small picker (patterns from file-management library modal where sensible).

### Files

| Action | Scope |
| --- | --- |
| **Export colors** | Download a color-theme file (palette + shell + definition styles + metadata). No block content body; not a full project. |
| **Import colors** | Open a color-theme file and apply onto the current document (confirm). |
| **Export project** | Full project envelope **including** complete color state (and later custom block defs used by the doc). One file to move a whole job. |
| **Open project** | Restores newsletter **and** colors together. |

Export/import entry points live in the Colors tab (File menu may mirror later; Colors is enough for v1 of the feature).

### Color theme file envelope

Versioned, kind-tagged JSON (illustrative):

```text
{
  kind: 'nte-color-theme'
  schemaVersion: number
  name: string
  exportedAt: iso
  activeExampleId?: string
  palette: { … campaign tokens … }
  styles: {
    shell: { header: {…}, footer: {…} }
    byDefinitionId: { 'system:price-box': {…}, … }
  }
  // optional future:
  // meta: { author, tags, marketplaceId, aiPromptRef }
  // extensions preserved on round-trip when possible
}
```

Rules:

- **Unknown keys** in a newer file: preserve on load when possible; ignore safely if not.
- **Missing slots** vs current app (older file or older pack): fill from **active example defaults** (or system defaults).
- **Import info dialog** (app modal, not `window.alert`): plain-language summary that some newer color fields were not in the file and were filled with defaults; seller can change them later. Prefer counts or short group names; do not dump raw slot ids.
- **Extra slots** for unknown block types (future AI/marketplace blocks): keep under their definition keys so a later build that understands them can use them.
- Same normalize path family as document load (`normalizeColorTheme` shared ideas with `normalizeNewsletter`).

### Project file relationship

- Project export = superset (document + colors + …).
- Color export = colors subset only.
- Opening an old project without the new color chapter: normalize fills defaults (same as missing slots).

## Slot inventory (current renderer reality)

Internal **slot ids** below; UI shows **semantic labels only**. Dark example / current code seed values; Light example has its own defaults.

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
| `divider.accentLead` | Accent segment (start) |
| `divider.accentTail` | Accent segment (end) |

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

## Custom blocks (future, design now)

Working name: **Custom blocks** (DE label at UI time). Catalog section beside system blocks.

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

Prefer instances linked by `definitionId` so Colors sync stays true. Clone → edit → save as new name.

## Extensibility: AI themes, new blocks, marketplace

The same contracts must support growth without rewriting seller mental models.

### Principles

- **Everything colored is data:** palette + slot maps + definition keys — never only code hardcodes.
- **Stable kind + schemaVersion** on documents, color themes, block recipes, and later marketplace packages.
- **definitionKey** namespace, e.g. `system:price-box`, `custom:<uuid>`, `marketplace:<publisher>/<id>@<ver>`, `ai:<session>/<id>` — renderer and Colors UI resolve through a registry.
- **Slot registry per block type:** declared list of slot ids + default ColorValues + i18n label keys. New block types (human or AI) register slots; Colors accordion is **driven by registry + doc instances**, not a closed hard-coded list alone.
- **Themes are portable packages:** color-theme files are the thin theme unit; full **template packages** (future) add blocks, copy, logo refs, recipes.
- **Validate + normalize on every boundary** (open project, import theme, install marketplace item, apply AI result): missing slots → defaults; unknown slots/types → keep payload; seller-safe summary modal when defaults were filled or parts were skipped.
- **AI output = same JSON shapes** the editor already understands (theme envelope and/or recipes). No parallel AI-only color system.
- **Marketplace listing metadata** (price, license, preview) stays outside the render model; the installable artifact still uses `nte-color-theme` / project / recipe kinds.

### Future package sketch (not implemented now)

```text
MarketplacePackage or AiBundle {
  kind: 'nte-template-pack' | …
  schemaVersion
  themes[]: color-theme envelopes
  blocks[]: BlockRecipe
  document?: Newsletter seed
  assets?: …
}
```

Installing applies through the same normalize/import pipelines as local files.

## Data shape (implementation direction)

```text
Newsletter
  activeExampleId
  globals.palette                 // campaign tokens
  styles.shell.header / footer
  styles.byDefinitionId           // definitionKey → slot map
  blocks[]                        // each references definitionKey
```

Named themes in IDB (or equivalent) store the color-theme envelope body + displayName.

- `normalizeNewsletter` / `normalizeColorTheme` fill missing slots from active example.
- Renderer reads only resolved hex via `resolveColor`.

## Export HTML / client CSS

- Emit resolved inline colors from the single chosen world.
- Keep or slim `color-scheme` client protection without a second seller palette.
- Media-query strategy must not fight an intentional light example; decide at implement time against the active world.

## Locks

- Colors tab owns email color UX (starter switch, named themes, shell + block slots).
- No free hex in block content inspector for these slots.
- Sellers see semantic labels only; ids stay internal.
- Shared style per definition; fork via custom block clone/save.
- Reset = active built-in example originals.
- Example switch and destructive theme apply = confirm modal.
- Project export includes full colors; color export is colors-only.
- Import of older/partial theme files: defaults + info modal.
- Slot ids stable; registries extend without renaming old ids.
- MIT-only deps; no Material.
- Tests: resolveColor, normalize missing/extra slots, two-instance sync, import dialog path, example switch undo.

## Suggested delivery slices

- Model: palette + ColorValue + shell/definition maps + example presets + normalize.
- Renderer resolves all current hardcodes.
- Colors tab: starter Dark/Light + confirm; compact campaign grid; header/footer + instance accordions; labels i18n.
- Reset + undo.
- Named theme save/load (library) + export/import files + project envelope includes colors.
- Light example content.
- Later: Custom blocks; AI/marketplace packages on the same envelopes.

## Open product copy only

- Final DE/EN strings for “Dark example” / “Light example”, theme library names, import info modal wording.
- Final name for Custom blocks catalog tab.
- Whether File menu duplicates Color export/import or Colors tab alone is enough for v1.
