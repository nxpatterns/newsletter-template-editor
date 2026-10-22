import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { blockFindings, type BlockFinding } from '../../core/checks/block-checks';
import { makeReadable, type ColorMode } from '../../core/colors';
import { CLONE_BLOCK_ID } from '../../core/own-blocks/clone';
import type { Block } from '../../core/types';
import { LocaleService } from '../i18n/locale.service';
import { BlockEditorService } from './block-editor.service';
import { formatRatio, slotLabel } from './block-editor-text';

/** Types with image fields and with link texts: only those get the matching "fine" line. */
const IMAGE_TYPES: ReadonlySet<Block['type']> = new Set(['image', 'image-text', 'contact', 'video', 'testimonial', 'teasers']);
const LINK_TYPES: ReadonlySet<Block['type']> = new Set(['cta-button', 'contact', 'event', 'cta-link-list', 'teasers']);

interface FindingVm {
  id: string;
  mode: ColorMode | null;
  title: string;
  detail: string;
  action: string;
  run: () => void;
}

/** Number of findings of the block in the editor, for the tab badge. */
export function countFindings(editor: BlockEditorService): number {
  return editor.block() ? blockFindings(editor.work.newsletter(), CLONE_BLOCK_ID).length : 0;
}

/** "Check" tab of the block editor: findings in Light and Dark; they warn, never block saving. */
@Component({
  selector: 'app-block-checks',
  templateUrl: './block-checks.component.html',
  styleUrl: './block-checks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockChecksComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly editor = inject(BlockEditorService);

  private readonly type = computed(() => this.editor.baseType());
  private readonly findings = computed(() => blockFindings(this.editor.work.newsletter(), CLONE_BLOCK_ID));

  protected readonly items = computed((): FindingVm[] => this.findings().map((f, i) => this.toVm(f, i)));

  /** What was checked and is fine. */
  protected readonly fine = computed((): string[] => {
    const f = this.findings();
    const type = this.type();
    const out: string[] = [];
    if (!f.some((x) => x.kind === 'contrast')) out.push(this.i18n.t('blockEditor.checks.okContrast'));
    if (type && IMAGE_TYPES.has(type) && !f.some((x) => x.kind === 'missingAlt')) out.push(this.i18n.t('blockEditor.checks.okAlt'));
    if (type && LINK_TYPES.has(type) && !f.some((x) => x.kind === 'vagueLink')) out.push(this.i18n.t('blockEditor.checks.okLinks'));
    return out;
  });

  protected setName(mode: ColorMode): string {
    return this.i18n.t(`blockEditor.set.${mode}`);
  }

  private toVm(f: BlockFinding, i: number): FindingVm {
    const toFields = () => this.editor.setTab('props');
    const type = this.type() ?? '';
    if (f.kind === 'contrast') {
      const locale = this.i18n.locale();
      return {
        id: `${f.kind}-${f.mode}-${f.slot}`,
        mode: f.mode,
        title: this.i18n.t('blockEditor.checks.contrastTitle', { name: slotLabel(this.i18n, type, f.slot) }),
        detail: this.i18n.t('blockEditor.checks.contrastDetail', {
          fg: f.fg.toUpperCase(),
          bg: f.bg.toUpperCase(),
          ratio: formatRatio(f.ratio, locale),
          min: formatRatio(f.min, locale),
        }),
        action: this.i18n.t('colors.contrast.fix'),
        run: () => this.editor.setColor(f.slot, { hex: makeReadable(f.fg, f.bg, f.min) }),
      };
    }
    if (f.kind === 'missingAlt') {
      return {
        id: `${f.kind}-${f.part ?? f.item ?? 0}-${i}`,
        mode: null,
        title: this.i18n.t('blockEditor.checks.altTitle'),
        detail: this.i18n.t('blockEditor.checks.altDetail'),
        action: this.i18n.t(f.part ? 'blockEditor.checks.toPart' : 'blockEditor.checks.toField'),
        run: f.part ? () => this.editor.selectPart(f.part!, 'props') : toFields,
      };
    }
    if (f.kind === 'vagueLink') {
      return {
        id: `${f.kind}-${f.part ?? f.field}-${f.item ?? 0}`,
        mode: null,
        title: this.i18n.t('blockEditor.checks.linkTitle', { text: f.text }),
        detail: this.i18n.t('blockEditor.checks.linkDetail'),
        action: this.i18n.t(f.part ? 'blockEditor.checks.toPart' : 'blockEditor.checks.toField'),
        run: f.part ? () => this.editor.selectPart(f.part!, 'props') : toFields,
      };
    }
    return this.freeVm(f, i);
  }

  /** Findings only free blocks have; the action selects the part (decision 82). */
  private freeVm(f: Exclude<BlockFinding, { kind: 'contrast' | 'missingAlt' | 'vagueLink' }>, i: number): FindingVm {
    const part = 'part' in f ? f.part : null;
    const params: Record<string, string | number> = {
      px: 'px' in f ? f.px : 0,
      min: 'min' in f ? f.min : 0,
      font: f.kind === 'webFont' ? f.font : '',
    };
    return {
      id: `${f.kind}-${part ?? ('content' in f ? f.content : '')}-${i}`,
      mode: null,
      title: this.i18n.t(`blockEditor.checks.${f.kind}Title`, params),
      detail: this.i18n.t(`blockEditor.checks.${f.kind}Detail`, params),
      action: this.i18n.t(part ? 'blockEditor.checks.toPart' : 'blockEditor.checks.toField'),
      run: part ? () => this.editor.selectPart(part, 'props') : () => this.editor.setTab('props'),
    };
  }
}
