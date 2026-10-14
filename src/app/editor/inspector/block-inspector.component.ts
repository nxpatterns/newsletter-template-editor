import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
} from '@angular/core';
import {
  CTA_LINK_ICONS,
  emptyBenefitsListItem,
  emptyCtaLinkListItem,
  type BenefitsListBlock,
  type BenefitsListItem,
  type CtaLinkListBlock,
  type CtaLinkListItem,
  type DividerBlock,
  type RichDoc,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { PersistHeightDirective } from '../../ui/persist-height.directive';
import { NewsletterSession } from '../newsletter-session.service';
import { ParagraphLiteEditorComponent } from './paragraph-lite-editor.component';

type IconPickerKind = 'cta' | 'benefit';

@Component({
  selector: 'app-block-inspector',
  imports: [PersistHeightDirective, ParagraphLiteEditorComponent],
  templateUrl: './block-inspector.component.html',
  styleUrl: './block-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockInspectorComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly listIcons = CTA_LINK_ICONS;

  /** Which row icon grid is open (null = closed). */
  protected iconPicker: { kind: IconPickerKind; index: number } | null = null;

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.row-icon-wrap')) {
      this.iconPicker = null;
    }
  }

  protected onText(id: string, key: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.session.updateBlock(id, { [key]: value } as never, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }

  protected onParagraphBody(id: string, body: RichDoc): void {
    this.session.updateBlock(id, { body } as never, 'coalesce');
  }

  protected onDividerStyle(id: string, event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DividerBlock['style'];
    this.session.updateBlock(id, { style: value }, 'immediate');
  }

  protected onDividerHeight(id: string, event: Event): void {
    const heightPx = Number((event.target as HTMLInputElement).value);
    if (!Number.isFinite(heightPx)) return;
    this.session.updateBlock(id, { heightPx }, 'coalesce');
  }

  protected onBool(id: string, key: string, event: Event): void {
    const value = (event.target as HTMLInputElement).checked;
    this.session.updateBlock(id, { [key]: value } as never, 'immediate');
  }

  protected ctaRowLabel(index: number): string {
    return `${this.i18n.t('field.ctaLinkRow')} ${index + 1}`;
  }

  protected benefitRowLabel(index: number): string {
    return `${this.i18n.t('field.benefitRow')} ${index + 1}`;
  }

  protected isIconPickerOpen(kind: IconPickerKind, index: number): boolean {
    return this.iconPicker?.kind === kind && this.iconPicker.index === index;
  }

  protected toggleIconPicker(kind: IconPickerKind, index: number, event: Event): void {
    event.stopPropagation();
    this.iconPicker =
      this.iconPicker?.kind === kind && this.iconPicker.index === index
        ? null
        : { kind, index };
  }

  protected pickCtaIcon(blockId: string, index: number, icon: string, event: Event): void {
    event.stopPropagation();
    this.patchCtaItem(blockId, index, { icon }, 'immediate');
    this.iconPicker = null;
  }

  protected pickBenefitIcon(blockId: string, index: number, icon: string, event: Event): void {
    event.stopPropagation();
    this.patchBenefitItem(blockId, index, { icon }, 'immediate');
    this.iconPicker = null;
  }

  protected onCtaItemText(
    blockId: string,
    index: number,
    key: keyof Pick<CtaLinkListItem, 'label' | 'intro' | 'linkText' | 'href'>,
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.patchCtaItem(blockId, index, { [key]: value }, 'coalesce');
  }

  protected onBenefitText(blockId: string, index: number, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.patchBenefitItem(blockId, index, { text: value }, 'coalesce');
  }

  protected addCtaItem(blockId: string): void {
    const block = this.ctaBlock(blockId);
    if (!block) return;
    this.session.updateBlock(
      blockId,
      { items: [...block.items, emptyCtaLinkListItem()] },
      'immediate',
    );
    this.iconPicker = null;
  }

  protected removeCtaItem(blockId: string, index: number): void {
    const block = this.ctaBlock(blockId);
    if (!block || block.items.length <= 1) return;
    const items = block.items.filter((_, i) => i !== index);
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.iconPicker = null;
  }

  protected moveCtaItem(blockId: string, index: number, delta: -1 | 1): void {
    const block = this.ctaBlock(blockId);
    if (!block) return;
    const target = index + delta;
    if (target < 0 || target >= block.items.length) return;
    const items = block.items.slice();
    const [row] = items.splice(index, 1);
    items.splice(target, 0, row);
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.iconPicker = null;
  }

  protected addBenefitItem(blockId: string): void {
    const block = this.benefitsBlock(blockId);
    if (!block) return;
    this.session.updateBlock(
      blockId,
      { items: [...block.items, emptyBenefitsListItem()] },
      'immediate',
    );
    this.iconPicker = null;
  }

  protected removeBenefitItem(blockId: string, index: number): void {
    const block = this.benefitsBlock(blockId);
    if (!block || block.items.length <= 1) return;
    const items = block.items.filter((_, i) => i !== index);
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.iconPicker = null;
  }

  protected moveBenefitItem(blockId: string, index: number, delta: -1 | 1): void {
    const block = this.benefitsBlock(blockId);
    if (!block) return;
    const target = index + delta;
    if (target < 0 || target >= block.items.length) return;
    const items = block.items.slice();
    const [row] = items.splice(index, 1);
    items.splice(target, 0, row);
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.iconPicker = null;
  }

  private ctaBlock(blockId: string): CtaLinkListBlock | null {
    const block = this.session.newsletter().blocks.find((b) => b.id === blockId);
    return block?.type === 'cta-link-list' ? block : null;
  }

  private benefitsBlock(blockId: string): BenefitsListBlock | null {
    const block = this.session.newsletter().blocks.find((b) => b.id === blockId);
    return block?.type === 'benefits-list' ? block : null;
  }

  private patchCtaItem(
    blockId: string,
    index: number,
    patch: Partial<CtaLinkListItem>,
    mode: 'coalesce' | 'immediate',
  ): void {
    const block = this.ctaBlock(blockId);
    if (!block || index < 0 || index >= block.items.length) return;
    const items = block.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.session.updateBlock(blockId, { items }, mode);
  }

  private patchBenefitItem(
    blockId: string,
    index: number,
    patch: Partial<BenefitsListItem>,
    mode: 'coalesce' | 'immediate',
  ): void {
    const block = this.benefitsBlock(blockId);
    if (!block || index < 0 || index >= block.items.length) return;
    const items = block.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.session.updateBlock(blockId, { items }, mode);
  }
}
