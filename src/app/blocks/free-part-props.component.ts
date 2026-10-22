import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FONT_PRESETS } from '../../core';
import { MIN_WIDTH_PX, narrowestLeaf } from '../../core/parts/layout';
import { activeDesign, findNode, TEXT_ROLES, type FreeBlockData, type LayoutNode, type TextRole } from '../../core/parts/model';
import { setBlockStyle, setColumnCount, setContent, setPartProps, TEXT_ROLE_STYLE } from '../../core/parts/operations';
import {
  ALIGNS,
  BLEEDS,
  BORDER_SIDES,
  BORDER_WIDTHS,
  BUTTON_SIZES,
  ICON_SIZES,
  LETTER_SPACINGS,
  LINE_HEIGHTS,
  RADII,
  ratiosFor,
  SPACE_PX,
  SPACES,
  TEXT_SIZE_PX,
  TEXT_SIZES,
  VALIGNS,
  WIDTHS,
} from '../../core/parts/scales';
import { BUTTON_VARIANTS, DIVIDER_LINES, LIST_LAYOUTS } from '../../core/parts/model';
import { LocaleService } from '../i18n/locale.service';
import { CloneColorsComponent } from './clone-colors.component';
import { BlockEditorService } from './block-editor.service';
import { FreeContentFieldsComponent } from './free-content-fields.component';

/** "Inherit" in a select: the part takes the block's (or the template's) value (decision 42). */
const INHERIT = '';

interface Option {
  value: string;
  label: string;
}

/** One design property: a segmented row (few options) or a select (many). */
interface Control {
  key: string;
  label: string;
  options: Option[];
  value: string;
  select: boolean;
  set: (value: string) => void;
}

interface Toggle {
  key: string;
  label: string;
  on: boolean;
  set: (on: boolean) => void;
}

/**
 * Properties of the selected part of a free block (mockup R1, tab "Eigenschaften"): its content,
 * its design as tokens of the finite scales, and its colors (role or fixed). Without a selection
 * it shows the block-wide look. Every change is a pure operation from `src/core/parts`.
 */
@Component({
  selector: 'app-free-part-props',
  imports: [NgTemplateOutlet, FreeContentFieldsComponent, CloneColorsComponent],
  templateUrl: './free-part-props.component.html',
  styleUrl: './free-part-props.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreePartPropsComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly editor = inject(BlockEditorService);

  protected readonly block = computed(() => this.editor.free());

  protected readonly node = computed((): LayoutNode | null => {
    const b = this.block();
    const id = this.editor.selectedPart();
    if (!b || !id) return null;
    const design = activeDesign(b);
    const hit = findNode(design.children, id);
    if (hit) return hit;
    // A column: its row.
    let row: LayoutNode | null = null;
    const scan = (nodes: readonly LayoutNode[]) => {
      for (const n of nodes) {
        if (n.kind === 'columns' && n.columns.some((c) => c.id === id)) row = n;
        if (n.kind === 'columns') n.columns.forEach((c) => scan(c.children));
        if (n.kind === 'section' || n.kind === 'box') scan(n.children);
        if (n.kind === 'list') scan(n.item);
      }
    };
    scan(design.children);
    return row;
  });

  /** "Gewählt: Text „Frühjahr am See“". */
  protected readonly title = computed(() => {
    const n = this.node();
    if (!n) return this.i18n.t('blockEditor.props.block');
    return this.i18n.t(`blockEditor.part.${n.kind}`);
  });

  /** Colors of the selected part, or the block background. */
  protected readonly colorPrefix = computed(() => this.node()?.id ?? 'background');

  private opt(values: readonly string[], label: (v: string) => string): Option[] {
    return values.map((v) => ({ value: v, label: label(v) }));
  }

  private word(group: string, v: string): string {
    return this.i18n.t(`blockEditor.val.${group}.${v}`);
  }

  private inherit(): Option {
    return { value: INHERIT, label: this.i18n.t('blockEditor.val.inherit') };
  }

  private props(id: string, patch: Record<string, unknown>): void {
    this.editor.updateFree((d) => setPartProps(d, id, patch));
  }

  private control(key: string, options: Option[], value: string | undefined, set: (v: string) => void, select = options.length > 5): Control {
    return { key, label: this.i18n.t(`blockEditor.prop.${key}`), options, value: value ?? INHERIT, select, set };
  }

  /** Text size with its px, e.g. "M · 17". */
  private sizeLabel = (v: string) => `${v.toUpperCase()} · ${TEXT_SIZE_PX[v as keyof typeof TEXT_SIZE_PX]}`;
  private spaceLabel = (v: string) => `${SPACE_PX[v as keyof typeof SPACE_PX]} px`;

  private fontOptions(): Option[] {
    return [this.inherit(), ...Object.entries(FONT_PRESETS).map(([k, f]) => ({ value: k, label: f.label }))];
  }

  protected readonly design = computed((): { controls: Control[]; toggles: Toggle[] } => {
    const b = this.block();
    const n = this.node();
    if (!b) return { controls: [], toggles: [] };
    const set = (key: string) => (v: string) => (n ? this.props(n.id, { [key]: v || undefined }) : this.editor.updateFree((d) => setBlockStyle(d, { [key]: v || undefined })));
    const controls: Control[] = [];
    const toggles: Toggle[] = [];
    if (!n) {
      const s = activeDesign(b).style;
      controls.push(this.control('font', this.fontOptions(), s.font, set('font'), true));
      controls.push(this.control('size', [this.inherit(), ...this.opt(TEXT_SIZES, this.sizeLabel)], s.size, set('size'), true));
      controls.push(this.control('lineHeight', [this.inherit(), ...this.opt(LINE_HEIGHTS, (v) => this.word('lineHeight', v))], s.lineHeight, set('lineHeight')));
      controls.push(this.control('padV', this.opt(SPACES, this.spaceLabel), s.padV ?? 'l', set('padV'), true));
      controls.push(this.control('padH', this.opt(SPACES, this.spaceLabel), s.padH ?? '2xl', set('padH'), true));
      controls.push(this.control('align', [this.inherit(), ...this.opt(ALIGNS, (v) => this.word('align', v))], s.align, set('align')));
      return { controls, toggles };
    }
    const toggle = (key: string, on: boolean, apply: (on: boolean) => void) => toggles.push({ key, label: this.i18n.t(`blockEditor.prop.${key}`), on, set: apply });
    const flag = (key: string) => (on: boolean) => this.props(n.id, { [key]: on || undefined });
    switch (n.kind) {
      case 'text': {
        const part = b.content.parts.find((p) => p.id === n.part);
        if (part?.kind === 'text') {
          controls.push(
            this.control('role', this.opt(TEXT_ROLES, (v) => this.i18n.t(`blockEditor.role.${v}`)), part.role, (v) => this.setRole(n.id, n.part, v as TextRole), true),
          );
        }
        controls.push(this.control('font', this.fontOptions(), n.font, set('font'), true));
        controls.push(this.control('size', [this.inherit(), ...this.opt(TEXT_SIZES, this.sizeLabel)], n.size, set('size'), true));
        controls.push(this.control('weight', [this.inherit(), ...this.opt(['normal', 'bold'], (v) => this.word('weight', v))], n.weight, set('weight')));
        controls.push(this.control('lineHeight', [this.inherit(), ...this.opt(LINE_HEIGHTS, (v) => this.word('lineHeight', v))], n.lineHeight, set('lineHeight')));
        controls.push(this.control('letterSpacing', this.opt(LETTER_SPACINGS, (v) => this.word('letterSpacing', v)), n.letterSpacing ?? 'none', set('letterSpacing')));
        toggle('italic', !!n.italic, flag('italic'));
        toggle('uppercase', !!n.uppercase, flag('uppercase'));
        break;
      }
      case 'image':
        controls.push(this.control('imageWidth', this.opt(WIDTHS, (v) => this.word('width', v)), n.width ?? 'full', set('width'), false));
        controls.push(this.control('radius', this.opt(RADII, (v) => this.word('radius', v)), n.radius ?? 'none', set('radius')));
        break;
      case 'button':
        controls.push(this.control('variant', this.opt(BUTTON_VARIANTS, (v) => this.word('variant', v)), n.variant ?? 'filled', set('variant')));
        controls.push(this.control('buttonSize', this.opt(BUTTON_SIZES, (v) => v.toUpperCase()), n.size ?? 'm', set('size')));
        controls.push(this.control('radius', this.opt(RADII, (v) => this.word('radius', v)), n.radius ?? 'none', set('radius')));
        toggle('fullWidth', !!n.fullWidth, flag('fullWidth'));
        break;
      case 'icon':
        controls.push(this.control('iconSize', this.opt(ICON_SIZES, (v) => v.toUpperCase()), n.size ?? 'm', set('size')));
        toggle('circle', !!n.circle, flag('circle'));
        break;
      case 'divider':
        controls.push(this.control('line', this.opt(DIVIDER_LINES, (v) => this.word('line', v)), n.line ?? 'solid', set('line')));
        controls.push(this.control('thickness', this.opt(['1', '2', '4'], (v) => `${v} px`), n.thickness ?? '1', set('thickness')));
        break;
      case 'spacer':
        controls.push(this.control('height', this.opt(SPACES, this.spaceLabel), n.height, set('height'), true));
        break;
      case 'columns': {
        const count = n.columns.length;
        controls.push(this.control('columns', this.opt(['1', '2', '3', '4'], (v) => v), String(count), (v) => this.editor.updateFree((d) => setColumnCount(d, n.id, Number(v)))));
        if (count > 1) controls.push(this.control('ratio', this.opt(ratiosFor(count), (v) => v), n.ratio, set('ratio'), false));
        controls.push(this.control('gap', this.opt(SPACES, this.spaceLabel), n.gap ?? 'm', set('gap'), true));
        controls.push(this.control('valign', this.opt(VALIGNS, (v) => this.word('valign', v)), n.valign ?? 'top', set('valign')));
        toggle('stack', n.stack !== false, (on) => this.props(n.id, { stack: on ? undefined : false, ...(on ? {} : { reversed: undefined }) }));
        if (n.stack !== false) toggle('reversed', !!n.reversed, flag('reversed'));
        break;
      }
      case 'list':
        controls.push(this.control('layout', this.opt(LIST_LAYOUTS, (v) => this.word('layout', v)), n.layout ?? 'stack', set('layout')));
        controls.push(this.control('gap', this.opt(SPACES, this.spaceLabel), n.gap ?? 'm', set('gap'), true));
        break;
      case 'section':
        controls.push(this.control('bleed', this.opt(BLEEDS, (v) => this.word('bleed', v)), n.bleed ?? 'content', set('bleed')));
        break;
      default:
        break;
    }
    return { controls, toggles };
  });

  /** Box properties every part has (padding, background, border, radius, alignment, width). */
  protected readonly box = computed((): { controls: Control[]; toggles: Toggle[] } => {
    const n = this.node();
    if (!n || n.kind === 'spacer') return { controls: [], toggles: [] };
    const set = (key: string) => (v: string) => this.props(n.id, { [key]: v && v !== '0' && v !== 'none' && v !== 'full' ? v : undefined });
    const controls: Control[] = [
      this.control('padV', this.opt(SPACES, this.spaceLabel), n.padV ?? '0', set('padV'), true),
      this.control('padH', this.opt(SPACES, this.spaceLabel), n.padH ?? '0', set('padH'), true),
      this.control('align', this.opt(ALIGNS, (v) => this.word('align', v)), n.align ?? 'left', (v) => this.props(n.id, { align: v === 'left' ? undefined : v })),
    ];
    if (n.kind !== 'image') controls.push(this.control('width', this.opt(WIDTHS, (v) => this.word('width', v)), n.width ?? 'full', set('width'), false));
    if (n.kind !== 'button' && n.kind !== 'divider') {
      controls.push(this.control('border', this.opt(BORDER_WIDTHS, (v) => (v === '0' ? this.word('radius', 'none') : `${v} px`)), n.border ?? '0', set('border')));
      if (n.border && n.border !== '0') controls.push(this.control('borderSides', this.opt(BORDER_SIDES, (v) => this.word('sides', v)), n.borderSides ?? 'all', (v) => this.props(n.id, { borderSides: v === 'all' ? undefined : v })));
      if (n.kind !== 'image') controls.push(this.control('radius', this.opt(RADII, (v) => this.word('radius', v)), n.radius ?? 'none', set('radius')));
    }
    const toggles: Toggle[] =
      n.kind === 'button' || n.kind === 'icon'
        ? []
        : [{ key: 'bg', label: this.i18n.t('blockEditor.prop.bg'), on: !!n.bg, set: (on) => this.props(n.id, { bg: on || undefined }) }];
    return { controls, toggles };
  });

  /** Floors of decision 82 after a share change: say which part got too narrow. */
  protected readonly narrow = computed(() => {
    const b = this.block();
    const hit = b ? narrowestLeaf(b) : null;
    return hit ? this.i18n.t('blockEditor.refuse.tooNarrow', { width: hit.width, min: hit.min }) : '';
  });

  protected readonly floors = MIN_WIDTH_PX;

  /** A new role brings the role's look (sizes stay tokens); the colors follow the role's default. */
  private setRole(nodeId: string, partId: string, role: TextRole): void {
    this.editor.updateFree((d: FreeBlockData) => {
      const withRole = setContent(d, partId, { role });
      const reset = { font: undefined, size: undefined, weight: undefined, italic: undefined, uppercase: undefined, letterSpacing: undefined, lineHeight: undefined };
      return setPartProps(withRole, nodeId, { ...reset, ...TEXT_ROLE_STYLE[role] });
    });
  }

  protected onSelect(c: Control, event: Event): void {
    c.set((event.target as HTMLSelectElement).value);
  }

  protected onToggle(t: Toggle, event: Event): void {
    t.set((event.target as HTMLInputElement).checked);
  }
}
