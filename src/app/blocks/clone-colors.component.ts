import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  COLOR_MODES,
  COLOR_ROLES,
  slotsOf,
  contrastRatio,
  isBrandColorRole,
  parseHexColor,
  resolveGeneralColors,
  resolveSlot,
  slotContrastIssue,
  slotOverride,
  TEXT_CONTRAST_MIN,
  type ColorMode,
  type ColorRole,
} from '../../core/colors';
import { CLONE_BLOCK_ID } from '../../core/own-blocks/clone';
import { colorTargetOf } from '../../core/parts/colors';
import { LocaleService } from '../i18n/locale.service';
import { ClearableInputDirective } from '../ui/clearable-input.directive';
import { BlockEditorService } from './block-editor.service';
import { formatRatio, freeSlotLabel, slotLabel } from './block-editor-text';

/** General colors a block color can follow; the brand star colors belong to the Brand tab. */
const PICKABLE_ROLES: readonly ColorRole[] = COLOR_ROLES.filter((r) => !isBrandColorRole(r));

interface SlotRowVm {
  key: string;
  label: string;
  hex: string;
  /** Role it follows; null for a fixed value. */
  role: ColorRole | null;
  fixed: string | null;
  /** Hard to read in a set: one line each. */
  warnings: string[];
}

interface PickerPreview {
  mode: ColorMode;
  bg: string;
  ratio: number;
  ok: boolean;
}

/**
 * Colors of a copy (decision 51, variant B): each color follows a role of the template it is used
 * in, or is fixed. The glass picker shows each role in Dark and Light of the source template.
 */
@Component({
  selector: 'app-clone-colors',
  imports: [ClearableInputDirective],
  templateUrl: './clone-colors.component.html',
  styleUrl: './clone-colors.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloneColorsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly editor = inject(BlockEditorService);
  protected readonly modes = COLOR_MODES;

  /**
   * Free blocks: only the colors of one part (`<part id>.…`) or `background` for the block itself.
   * Null shows every color (clone mode).
   */
  readonly prefix = input<string | null>(null);

  /** Slot whose picker is open. */
  protected readonly open = signal<string | null>(null);

  private readonly target = computed(() => {
    const block = this.editor.block();
    return block ? colorTargetOf(block) : { id: CLONE_BLOCK_ID, type: '' };
  });

  private readonly defs = computed(() => {
    const prefix = this.prefix();
    const all = slotsOf(this.target());
    return prefix === null ? all : all.filter((d) => d.key === prefix || d.key.startsWith(`${prefix}.`));
  });
  private readonly colors = computed(() => this.editor.work.newsletter().globals.colors);

  /** Both sets of the source template, for the role swatches. */
  protected readonly sets = computed(() => ({
    dark: resolveGeneralColors(this.colors(), 'dark'),
    light: resolveGeneralColors(this.colors(), 'light'),
  }));

  protected readonly roles = PICKABLE_ROLES;

  protected readonly rows = computed((): SlotRowVm[] => {
    const colors = this.colors();
    const target = this.target();
    const mode = this.editor.previewMode();
    return this.defs().map((def) => {
      const o = slotOverride(colors, mode, CLONE_BLOCK_ID, def.key);
      const fixed = o && 'hex' in o ? o.hex : null;
      const warnings = COLOR_MODES.flatMap((m) => {
        const issue = slotContrastIssue(colors, m, target, def.key);
        return issue
          ? [this.i18n.t('blockEditor.colors.hardToRead', { set: this.setName(m), ratio: formatRatio(issue.ratio, this.i18n.locale()), min: formatRatio(issue.min, this.i18n.locale()) })]
          : [];
      });
      return {
        key: def.key,
        label: target.slots ? freeSlotLabel(this.i18n, def.key) : slotLabel(this.i18n, target.type, def.key),
        hex: resolveSlot(colors, mode, target, def.key).hex,
        role: fixed ? null : (o && 'role' in o ? o.role : def.role),
        fixed,
        warnings,
      };
    });
  });

  /** Fixed value of the open slot on the surface it sits on, in both sets. */
  protected readonly preview = computed((): PickerPreview[] => {
    const key = this.open();
    const row = this.rows().find((r) => r.key === key);
    const def = this.defs().find((s) => s.key === key);
    if (!row?.fixed || !def) return [];
    return COLOR_MODES.map((mode) => {
      const bg = resolveSlot(this.colors(), mode, this.target(), def.on ?? 'background').hex;
      const ratio = contrastRatio(row.fixed!, bg);
      return { mode, bg, ratio, ok: ratio >= TEXT_CONTRAST_MIN };
    });
  });

  protected openRow = computed(() => this.rows().find((r) => r.key === this.open()) ?? null);

  protected isText(key: string): boolean {
    return this.defs().find((s) => s.key === key)?.kind === 'text';
  }

  protected toggle(key: string): void {
    this.open.update((k) => (k === key ? null : key));
  }

  protected roleName(role: ColorRole): string {
    return this.i18n.t(`colors.role.${role}`);
  }

  protected setName(mode: ColorMode): string {
    return this.i18n.t(`blockEditor.set.${mode}`);
  }

  protected follows(row: SlotRowVm): string {
    return row.fixed
      ? this.i18n.t('blockEditor.colors.fixedValue', { hex: row.fixed.toUpperCase() })
      : this.i18n.t('blockEditor.colors.follows', { role: this.roleName(row.role!) });
  }

  protected formatRatio(ratio: number): string {
    return formatRatio(ratio, this.i18n.locale());
  }

  /** Following the type's own default role is stored as "nothing set". */
  protected pickRole(key: string, role: ColorRole): void {
    const def = this.defs().find((s) => s.key === key);
    this.editor.setColor(key, def?.role === role ? null : { role });
  }

  /** "Fixed": starts from the color it shows now, so nothing jumps. */
  protected makeFixed(row: SlotRowVm): void {
    if (row.fixed) return;
    this.editor.setColor(row.key, { hex: row.hex });
  }

  protected makeRole(row: SlotRowVm): void {
    if (!row.fixed) return;
    this.editor.setColor(row.key, null);
  }

  protected onHex(key: string, event: Event): void {
    const hex = parseHexColor((event.target as HTMLInputElement).value);
    if (hex) this.editor.setColor(key, { hex });
  }
}
