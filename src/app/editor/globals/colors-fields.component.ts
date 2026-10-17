import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import {
  blockOverrideCount,
  COLOR_MODES,
  COLOR_ROLES,
  colorSlotsOf,
  contrastRatio,
  FRAME_TARGETS,
  isOutdatedOverride,
  makeReadable,
  overridesOfRole,
  parseHexColor,
  resetAllGeneralColors,
  resetBlockColor,
  resetBlockColors,
  resetGeneralColor,
  resolveGeneralColors,
  resolveSlot,
  setBlockColor,
  setColorMode,
  setGeneralColor,
  slotContrastIssue,
  slotOverride,
  TEXT_CONTRAST_MIN,
  type Block,
  type ColorMode,
  type ColorRole,
  type ColorTarget,
  type ContrastIssue,
  type SlotRef,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { blockTypeIcon } from '../blocks/block-catalog';
import { NewsletterSession } from '../newsletter-session.service';

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
}

interface SectionVm {
  id: string;
  target: ColorTarget;
  label: string;
  icon: string;
  index: number | null;
  ownCount: number;
  warnCount: number;
  rows: SlotRowVm[];
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
}

@Component({
  selector: 'app-colors-fields',
  imports: [NgTemplateOutlet],
  templateUrl: './colors-fields.component.html',
  styleUrl: './colors-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorsFieldsComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  protected readonly modes = COLOR_MODES;
  protected readonly roles = COLOR_ROLES;
  protected readonly groups = GROUPS;

  protected readonly mode = computed(() => this.session.globals().colors.mode);

  /** The role editor of one block color that is open (`<targetId>.<key>`). */
  protected readonly editing = signal<string | null>(null);
  protected readonly pending = signal<PendingChange | null>(null);

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
    const build = (target: ColorTarget, label: string, icon: string, index: number | null): SectionVm => {
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
        };
      });
      return {
        id: `block-${target.id}`,
        target,
        label,
        icon,
        index,
        ownCount: blockOverrideCount(colors, m, target.id),
        warnCount: rows.filter((r) => r.issue).length,
        rows,
      };
    };
    return {
      frame: FRAME_TARGETS.map((t) =>
        build(t, this.i18n.t(`colors.frame.${t.id}`), t.id === 'header' ? '⌂' : '⌄', null),
      ),
      blocks: this.session
        .blocks()
        .map((b: Block, i) => build({ id: b.id, type: b.type }, this.i18n.t(`block.${b.type}`), blockTypeIcon(b.type), i + 1)),
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
      const label = FRAME_TARGETS.some((f) => f.id === r.target.id)
        ? this.i18n.t(`colors.frame.${r.target.id}`)
        : this.i18n.t(`block.${r.target.type}`);
      return {
        label: `${label} · ${this.slotLabel(r.target.type, r.key)}`,
        hex: o && 'hex' in o ? o.hex : '',
      };
    });
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
  protected onBlockClick(section: SectionVm, isBlock: boolean): void {
    this.toggle(section.id);
    if (isBlock) this.session.selectBlock(section.target.id, { revealInPanel: false, scrollPreview: true });
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
    this.session.updateColors((c) => setGeneralColor(c, p.role, p.to, p.refs, p.choice === 'keep'));
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
    const s = this.sections();
    return overridesOfRole(colors, colors.mode, [...s.frame, ...s.blocks].map((x) => x.target), role);
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
