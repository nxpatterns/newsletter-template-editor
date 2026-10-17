import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import {
  blockOverrideCount,
  COLOR_MODES,
  COLOR_ROLES,
  colorSlotsOf,
  contrastRatio,
  copyBlockColors,
  copyConflicts,
  FRAME_TARGETS,
  isBrandColorRole,
  isOutdatedOverride,
  makeReadable,
  overridesOfRole,
  parseHexColor,
  promotableRole,
  promoteToGeneral,
  resetAllGeneralColors,
  resetBlockColor,
  resetBlockColors,
  resetGeneralColor,
  resolveGeneralColors,
  resolveSlot,
  sameBlockColors,
  sameTypeTargets,
  setBlockColor,
  setColorMode,
  setGeneralColor,
  slotContrastIssue,
  slotOverride,
  TEXT_CONTRAST_MIN,
  type Block,
  type ColorMode,
  type ColorRole,
  type ColorsConfig,
  type ColorTarget,
  type ContrastIssue,
  type SlotRef,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import type { GroupHue } from '../../ui/group-accordion/group-accordion.component';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { blockTypeHue, blockTypeIcon, type BlockTypeHue } from '../blocks/block-catalog';
import { NewsletterSession } from '../newsletter-session.service';

/** How long "Undo" stays offered after copying or taking over colors. */
const UNDO_MS = 8000;

/** UI-only open accordion ids (localStorage). Never part of project export. */
const OPEN_PREFS_KEY = 'newsletter-template-editor.colors-open.v3';

const GROUPS: readonly { titleKey: string; roles: readonly ColorRole[] }[] = [
  { titleKey: 'colors.group.background', roles: ['page', 'content', 'surface'] },
  { titleKey: 'colors.group.text', roles: ['body', 'head', 'dim'] },
  { titleKey: 'colors.group.accent', roles: ['link', 'accent', 'btn', 'btnText'] },
  { titleKey: 'colors.group.line', roles: ['line'] },
];

/** General text colors and the general surface each one is read on. */
const GENERAL_PAIRS: Readonly<Partial<Record<ColorRole, ColorRole>>> = {
  body: 'content',
  head: 'content',
  dim: 'content',
  link: 'content',
  accent: 'content',
  btnText: 'btn',
};

interface SlotRowVm {
  id: string;
  targetId: string;
  key: string;
  label: string;
  hex: string;
  /** Name of the general color it follows; absent for a fixed value of its own. */
  followsLabel: string | null;
  hasOverride: boolean;
  /** Current general color when the block still uses an older fixed value. */
  outdatedGeneral: string | null;
  issue: ContrastIssue | null;
  /** General color this fixed value can become ("use as general color"); null when not offered. */
  promoteRole: ColorRole | null;
}

/** Header and footer are own group cards: flat muted hues that no block type uses. */
const FRAME_CARDS: Readonly<Record<string, { icon: string; card: GroupHue }>> = {
  header: { icon: '⌂', card: 'blue' },
  footer: { icon: '⌄', card: 'green' },
};

interface SectionVm {
  id: string;
  /** Block-type hue of a block; null for header and footer. */
  hue: BlockTypeHue | null;
  /** Group card hue of header and footer; null for a block. */
  card: GroupHue | null;
  target: ColorTarget;
  label: string;
  icon: string;
  index: number | null;
  ownCount: number;
  warnCount: number;
  rows: SlotRowVm[];
  /** Blocks of this type in the newsletter, this one included; 0 for header and footer. */
  sameTypeCount: number;
  /** Copying this block's colors to the others of its type would change something. */
  copyChanges: boolean;
}

interface GeneralVm {
  role: ColorRole;
  label: string;
  hex: string;
  changed: boolean;
  issue: { fg: string; bg: string; ratio: number; onRole: ColorRole } | null;
}

interface PendingChange {
  role: ColorRole;
  from: string;
  to: string;
  refs: SlotRef[];
  choice: 'keep' | 'all';
  /** Set when a fixed block value becomes the general color ("use as general color"). */
  source?: { target: ColorTarget; key: string; block: string };
}

interface PendingCopy {
  source: ColorTarget;
  block: string;
  type: string;
  count: number;
  refs: SlotRef[];
}

@Component({
  selector: 'app-colors-fields',
  imports: [NgTemplateOutlet],
  templateUrl: './colors-fields.component.html',
  styleUrls: ['./colors-fields.component.scss', './colors-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorsFieldsComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly snackbar = inject(SnackbarService);

  protected readonly modes = COLOR_MODES;
  /** Roles a block color can follow; the brand colors are set in the Brand tab. */
  protected readonly roles = COLOR_ROLES.filter((r) => !isBrandColorRole(r));
  protected readonly groups = GROUPS;

  protected readonly mode = computed(() => this.session.globals().colors.mode);

  /** The role editor of one block color that is open (`<targetId>.<key>`). */
  protected readonly editing = signal<string | null>(null);
  protected readonly pending = signal<PendingChange | null>(null);
  protected readonly pendingCopy = signal<PendingCopy | null>(null);

  private readonly openIds = signal<ReadonlySet<string>>(this.readOpenIds());

  protected readonly general = computed((): GeneralVm[] => {
    const colors = this.session.globals().colors;
    const set = resolveGeneralColors(colors);
    return COLOR_ROLES.map((role) => {
      const onRole = GENERAL_PAIRS[role];
      const ratio = onRole ? contrastRatio(set[role], set[onRole]) : null;
      return {
        role,
        label: this.i18n.t(`colors.role.${role}`),
        hex: set[role],
        changed: colors[colors.mode].general[role] !== undefined,
        issue: onRole && ratio !== null && ratio < TEXT_CONTRAST_MIN ? { fg: set[role], bg: set[onRole], ratio, onRole } : null,
      };
    });
  });

  protected readonly generalByRole = computed(() => new Map(this.general().map((g) => [g.role, g])));

  protected readonly sections = computed((): { frame: SectionVm[]; blocks: SectionVm[] } => {
    const colors = this.session.globals().colors;
    const m = colors.mode;
    const blockTargets = this.blockTargets();
    const build = (
      target: ColorTarget,
      label: string,
      icon: string,
      index: number | null,
      hue: BlockTypeHue | null,
      card: GroupHue | null,
    ): SectionVm => {
      const others = index === null ? [] : sameTypeTargets(target, blockTargets);
      const rows = colorSlotsOf(target.type).map((def): SlotRowVm => {
        const r = resolveSlot(colors, m, target, def.key);
        const o = slotOverride(colors, m, target.id, def.key);
        return {
          id: `${target.id}.${def.key}`,
          targetId: target.id,
          key: def.key,
          label: this.slotLabel(target.type, def.key),
          hex: r.hex,
          followsLabel: r.role ? this.i18n.t(`colors.role.${r.role}`) : null,
          hasOverride: !!o,
          outdatedGeneral: isOutdatedOverride(colors, m, target, def.key)
            ? resolveGeneralColors(colors, m)[def.role]
            : null,
          issue: slotContrastIssue(colors, m, target, def.key),
          promoteRole: this.offeredRole(promotableRole(colors, m, target, def.key)),
        };
      });
      return {
        id: index === null ? `frame-${target.id}` : `block-${target.id}`,
        hue,
        card,
        target,
        label,
        icon,
        index,
        ownCount: blockOverrideCount(colors, m, target.id),
        warnCount: rows.filter((r) => r.issue).length,
        rows,
        sameTypeCount: others.length ? others.length + 1 : 0,
        copyChanges: others.some((o) => !sameBlockColors(colors, m, target.id, o.id)),
      };
    };
    return {
      frame: FRAME_TARGETS.map((t) =>
        build(t, this.i18n.t(`colors.frame.${t.id}`), FRAME_CARDS[t.id].icon, null, null, FRAME_CARDS[t.id].card),
      ),
      blocks: this.session
        .blocks()
        .map((b: Block, i) =>
          build({ id: b.id, type: b.type }, this.i18n.t(`block.${b.type}`), blockTypeIcon(b.type), i + 1, blockTypeHue(b.type), null),
        ),
    };
  });

  protected readonly totalOwn = computed(() => {
    const s = this.sections();
    return [...s.frame, ...s.blocks].reduce((n, x) => n + x.ownCount, 0);
  });
  protected readonly totalWarn = computed(() => {
    const s = this.sections();
    return [...s.frame, ...s.blocks].reduce((n, x) => n + x.warnCount, 0) + this.general().filter((g) => g.issue).length;
  });

  protected readonly pendingRows = computed(() => {
    const p = this.pending();
    if (!p) return [];
    const colors = this.session.globals().colors;
    return p.refs.map((r) => {
      const o = slotOverride(colors, colors.mode, r.target.id, r.key);
      return { label: this.placeLabel(r), hex: o && 'hex' in o ? o.hex : '' };
    });
  });

  /** "Use as general color": how far the change reaches and which places become hard to read. */
  protected readonly promoteInfo = computed(() => {
    const p = this.pending();
    if (!p?.source) return null;
    const { target: src, key: srcKey } = p.source;
    const colors = this.session.globals().colors;
    const m = colors.mode;
    const next = promoteToGeneral(colors, src, srcKey, p.refs, p.choice === 'keep');
    const users = new Set<string>();
    let places = 0;
    const unreadable: string[] = [];
    for (const target of this.allTargets()) {
      for (const def of colorSlotsOf(target.type)) {
        const self = target.id === src.id && def.key === srcKey;
        const r = resolveSlot(colors, m, target, def.key);
        if (!self && r.source === 'general' && r.role === p.role) {
          places++;
          users.add(target.id);
        }
        if (slotContrastIssue(next, m, target, def.key) && !slotContrastIssue(colors, m, target, def.key)) {
          unreadable.push(this.placeLabel({ target, key: def.key }));
        }
      }
    }
    const before = resolveGeneralColors(colors, m);
    const after = resolveGeneralColors(next, m);
    for (const [fg, bg] of Object.entries(GENERAL_PAIRS) as [ColorRole, ColorRole][]) {
      if (fg !== p.role && bg !== p.role) continue;
      if (contrastRatio(after[fg], after[bg]) < TEXT_CONTRAST_MIN && contrastRatio(before[fg], before[bg]) >= TEXT_CONTRAST_MIN) {
        unreadable.unshift(this.roleLabel(fg));
      }
    }
    return { places, blocks: users.size, unreadable };
  });

  protected readonly copyRows = computed(() => {
    const p = this.pendingCopy();
    if (!p) return [];
    const colors = this.session.globals().colors;
    return p.refs.map((r) => ({ label: this.placeLabel(r), hex: resolveSlot(colors, colors.mode, r.target, r.key).hex }));
  });

  protected modeLabel(mode: ColorMode): string {
    return this.i18n.t(`colors.mode.${mode}`);
  }

  protected isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  protected toggle(id: string): void {
    this.openIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this.writeOpenIds(next);
      return next;
    });
  }

  /** Open/close a block accordion and scroll the preview to that block. */
  protected onBlockClick(section: SectionVm): void {
    this.toggle(section.id);
    this.session.selectBlock(section.target.id, { revealInPanel: false, scrollPreview: true });
  }

  protected setMode(mode: ColorMode): void {
    this.editing.set(null);
    this.session.updateColors((c) => setColorMode(c, mode));
  }

  // General colors

  protected onGeneralInput(role: ColorRole, event: Event): void {
    const hex = parseHexColor((event.target as HTMLInputElement).value);
    // While nothing was adjusted individually the preview follows the picker live.
    if (hex && !this.refsOf(role).length) this.session.updateColors((c) => setGeneralColor(c, role, hex), 'coalesce');
  }

  protected onGeneralCommit(role: ColorRole, event: Event): void {
    const input = event.target as HTMLInputElement;
    const hex = parseHexColor(input.value);
    const current = this.generalByRole().get(role)?.hex ?? '';
    if (!hex) {
      input.value = current;
      return;
    }
    this.session.endCoalesce();
    const refs = this.refsOf(role);
    if (!refs.length || hex === current) {
      this.session.updateColors((c) => setGeneralColor(c, role, hex));
      return;
    }
    this.pending.set({ role, from: current, to: hex, refs, choice: 'keep' });
  }

  protected resetGeneral(role: ColorRole): void {
    this.session.updateColors((c) => resetGeneralColor(c, role));
  }

  protected resetAllGeneral(): void {
    this.session.updateColors((c) => resetAllGeneralColors(c));
  }

  protected fixGeneral(g: GeneralVm): void {
    const issue = g.issue;
    if (!issue) return;
    this.session.updateColors((c) => setGeneralColor(c, g.role, makeReadable(issue.fg, issue.bg)));
  }

  protected choose(choice: 'keep' | 'all'): void {
    this.pending.update((p) => (p ? { ...p, choice } : p));
  }

  protected applyPending(): void {
    const p = this.pending();
    if (!p) return;
    const keep = p.choice === 'keep';
    const src = p.source;
    if (src) {
      this.applyWithUndo(
        (c) => promoteToGeneral(c, src.target, src.key, p.refs, keep),
        this.i18n.t('colors.promote.done', { role: this.roleLabel(p.role), hex: p.to.toUpperCase() }),
      );
    } else {
      this.session.updateColors((c) => setGeneralColor(c, p.role, p.to, p.refs, keep));
    }
    this.pending.set(null);
  }

  protected cancelPending(): void {
    this.pending.set(null);
  }

  protected pendingBlockCount(): number {
    return new Set(this.pending()?.refs.map((r) => r.target.id)).size;
  }

  // Block colors

  protected toggleEditor(id: string): void {
    this.editing.update((cur) => (cur === id ? null : id));
  }

  protected pickRole(row: SlotRowVm, role: ColorRole): void {
    this.session.updateColors((c) => setBlockColor(c, row.targetId, row.key, { role }));
  }

  protected onSlotInput(row: SlotRowVm, event: Event): void {
    const hex = parseHexColor((event.target as HTMLInputElement).value);
    if (hex) this.session.updateColors((c) => setBlockColor(c, row.targetId, row.key, { hex }), 'coalesce');
  }

  protected onSlotCommit(row: SlotRowVm, event: Event): void {
    const input = event.target as HTMLInputElement;
    const hex = parseHexColor(input.value);
    if (!hex) {
      input.value = row.hex;
      return;
    }
    this.session.endCoalesce();
    this.session.updateColors((c) => setBlockColor(c, row.targetId, row.key, { hex }));
  }

  protected resetSlot(row: SlotRowVm): void {
    this.session.updateColors((c) => resetBlockColor(c, row.targetId, row.key));
  }

  protected resetBlock(section: SectionVm): void {
    this.session.updateColors((c) => resetBlockColors(c, section.target.id));
  }

  /** Ask before using a fixed block value as the general color (always, it reaches every block). */
  protected askPromote(section: SectionVm, row: SlotRowVm): void {
    const role = row.promoteRole;
    if (!role) return;
    const source = { target: section.target, key: row.key, block: this.targetName(section.target) };
    const refs = this.refsOf(role).filter((r) => !(r.target.id === section.target.id && r.key === row.key));
    const from = this.generalByRole().get(role)?.hex ?? '';
    this.pending.set({ role, from, to: row.hex, refs, choice: 'keep', source });
  }

  /** Give all blocks of this type the colors of `section`; asks first when that replaces their own colors. */
  protected askCopy(section: SectionVm): void {
    const colors = this.session.globals().colors;
    const pending: PendingCopy = {
      source: section.target,
      block: this.targetName(section.target),
      type: section.label,
      count: section.sameTypeCount - 1,
      refs: copyConflicts(colors, colors.mode, section.target, this.blockTargets()),
    };
    if (pending.refs.length) this.pendingCopy.set(pending);
    else this.runCopy(pending);
  }

  protected applyCopy(): void {
    const p = this.pendingCopy();
    if (p) this.runCopy(p);
    this.pendingCopy.set(null);
  }

  protected cancelCopy(): void {
    this.pendingCopy.set(null);
  }

  private runCopy(p: PendingCopy): void {
    const targets = this.blockTargets();
    this.applyWithUndo(
      (c) => copyBlockColors(c, p.source, targets),
      this.i18n.t('colors.copy.done', { n: p.count, type: p.type }),
    );
  }

  /** One history step plus a message whose "Undo" restores the colors as they were before. */
  private applyWithUndo(fn: (colors: ColorsConfig) => ColorsConfig, text: string): void {
    const before = this.session.globals().colors;
    this.session.updateColors(fn);
    const after = this.session.globals().colors;
    if (after === before) return;
    this.snackbar.show(text, 'info', UNDO_MS, {
      label: this.i18n.t('action.undo'),
      run: () => {
        // Only while nothing else changed the colors since.
        if (this.session.globals().colors === after) this.session.updateColors(() => before);
      },
    });
  }

  protected fixSlot(row: SlotRowVm): void {
    const issue = row.issue;
    if (!issue) return;
    this.session.updateColors((c) => setBlockColor(c, row.targetId, row.key, { hex: makeReadable(issue.fg, issue.bg) }));
  }

  protected contrastText(fg: string, bg: string, ratio: number, cause: string): string {
    const num = (n: number) => n.toFixed(1).replace('.', this.i18n.locale() === 'de' ? ',' : '.');
    return this.i18n.t('colors.contrast.text', {
      fg: fg.toUpperCase(),
      bg: bg.toUpperCase(),
      ratio: num(ratio),
      min: num(TEXT_CONTRAST_MIN),
      cause,
    });
  }

  protected issueCause(issue: ContrastIssue): string {
    return this.i18n.t(`colors.contrast.${issue.cause}`);
  }

  protected roleLabel(role: ColorRole): string {
    return this.i18n.t(`colors.role.${role}`);
  }

  protected modeName(): string {
    return this.modeLabel(this.mode());
  }

  private refsOf(role: ColorRole): SlotRef[] {
    const colors = this.session.globals().colors;
    return overridesOfRole(colors, colors.mode, this.allTargets(), role);
  }

  private blockTargets(): ColorTarget[] {
    return this.session.blocks().map((b) => ({ id: b.id, type: b.type }));
  }

  private allTargets(): ColorTarget[] {
    return [...FRAME_TARGETS, ...this.blockTargets()];
  }

  /** Only general colors this tab edits can be taken over from a block. */
  private offeredRole(role: ColorRole | null): ColorRole | null {
    return role && this.roles.includes(role) ? role : null;
  }

  /** "Kapitel 2", or "Kopfbereich" for the frame. */
  private targetName(target: ColorTarget): string {
    if (FRAME_TARGETS.some((f) => f.id === target.id)) return this.i18n.t(`colors.frame.${target.id}`);
    const index = this.session.blocks().findIndex((b) => b.id === target.id);
    return `${this.i18n.t(`block.${target.type}`)} ${index + 1}`;
  }

  private placeLabel(ref: SlotRef): string {
    return `${this.targetName(ref.target)} · ${this.slotLabel(ref.target.type, ref.key)}`;
  }

  private slotLabel(type: string, key: string): string {
    const specific = `colors.slot.${type}.${key}`;
    const label = this.i18n.t(specific);
    return label === specific ? this.i18n.t(`colors.slot.${key}`) : label;
  }

  private readOpenIds(): ReadonlySet<string> {
    const defaults = new Set(['general', 'blocks']);
    if (!isPlatformBrowser(this.platformId)) return defaults;
    try {
      const raw = localStorage.getItem(OPEN_PREFS_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return defaults;
      return new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 120));
    } catch {
      return defaults;
    }
  }

  private writeOpenIds(next: ReadonlySet<string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(OPEN_PREFS_KEY, JSON.stringify([...next]));
    } catch {
      // quota / private mode
    }
  }
}
