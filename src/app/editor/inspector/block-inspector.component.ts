import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  Injector,
  signal,
} from '@angular/core';
import {
  BENEFIT_DEFAULT_ICON,
  CTA_LINK_ICONS,
  detectLinkKind,
  normalizeLinkTarget,
  fontStack,
  emptyBenefitsListItem,
  emptyCtaLinkListItem,
  type BenefitsListBlock,
  type BenefitsListItem,
  type CtaLinkListBlock,
  type CtaLinkListItem,
  type DividerBackground,
  type DividerBlock,
  DIVIDER_STYLES,
  IMAGE_TEXT_SIDES,
  TESTIMONIAL_IMAGE_MODES,
  TEASER_COLUMNS,
  EVENT_LOCATION_MODES,
  emptyTeaserItem,
  type TeaserItem,
  type TeasersBlock,
  IMAGE_TEXT_VALIGNS,
  IMAGE_TEXT_WIDTHS,
  IMAGE_WIDTHS,
  intakeEmailImageFile,
  LogoPipelineError,
  RICH_COLOR_TOKENS,
  RICH_SIZE_TOKENS,
  type RichDoc,
} from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';
import { ParagraphLiteEditorComponent } from './paragraph-lite-editor.component';
import { ImagePickerComponent } from '../image-picker/image-picker.component';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { ClearableInputDirective } from '../../ui/clearable-input.directive';

type IconPickerKind = 'cta' | 'benefit' | 'benefit-all';
type RowKind = 'cta' | 'benefit' | 'teaser';

@Component({
  selector: 'app-block-inspector',
  imports: [ClearableInputDirective, ParagraphLiteEditorComponent, ImagePickerComponent, CdkDropList, CdkDrag, CdkDragHandle],
  host: {
    // Email look for the styled fields (font + theme colors from Campaign settings).
    '[style.--em-font]': 'emailFont()',
    '[style.--em-accent]': 'session.palette().accent',
    '[style.--em-head]': 'session.palette().head',
    '[style.--em-link]': 'session.palette().link',
    '[style.--em-body]': 'session.palette().body',
    '[style.--em-content]': 'session.palette().content',
  },
  templateUrl: './block-inspector.component.html',
  styleUrl: './block-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlockInspectorComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly listIcons = CTA_LINK_ICONS;
  protected readonly dividerStyles = DIVIDER_STYLES;
  protected readonly dividerBackgrounds: readonly DividerBackground[] = ['content', 'page'];
  protected readonly imageWidths = IMAGE_WIDTHS;
  protected readonly imageTextSides = IMAGE_TEXT_SIDES;
  protected readonly imageTextWidths = IMAGE_TEXT_WIDTHS;
  protected readonly imageTextValigns = IMAGE_TEXT_VALIGNS;
  protected readonly richSizes = RICH_SIZE_TOKENS;
  protected readonly testimonialImageModes = TESTIMONIAL_IMAGE_MODES;
  protected readonly teaserColumns = TEASER_COLUMNS;
  protected readonly eventLocationModes = EVENT_LOCATION_MODES;
  /** IANA zones for the event time-zone suggestions (empty where the browser cannot list them). */
  protected readonly timeZones: readonly string[] = listTimeZones();
  protected readonly richColors = RICH_COLOR_TOKENS;
  protected readonly imageBusy = signal(false);
  private readonly snackbar = inject(SnackbarService);
  protected readonly emailFont = computed(() => fontStack(this.session.globals()));
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Link list: the one row whose fields are open (null = all collapsed). */
  protected openCtaRow: number | null = 0;
  /** Teasers: the one teaser whose fields are open (null = all collapsed). */
  protected openTeaserRow: number | null = 0;

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

  /** Greeting preview name (Campaign personalization sample, not sent). */
  protected onSampleName(event: Event): void {
    this.session.updateSample('name', (event.target as HTMLInputElement).value, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }

  /**
   * Paragraph WYSIWYG: draft only — preview freezes until modal Save.
   * (Other blocks still live-update via updateBlock.)
   */
  protected onParagraphBody(id: string, body: RichDoc): void {
    this.session.setParagraphEditDraft(id, body);
  }

  protected setDividerStyle(id: string, style: DividerBlock['style']): void {
    this.session.updateBlock(id, { style }, 'immediate');
  }

  protected setImageSrc(id: string, src: string): void {
    this.session.updateBlock(id, { src }, 'immediate');
  }

  /** A file can only be embedded (no server to host it): shrunk to the email width first. */
  protected async onImageFile(id: string, file: File): Promise<void> {
    this.imageBusy.set(true);
    try {
      const { src } = await intakeEmailImageFile(file);
      this.setImageSrc(id, src);
    } catch (err) {
      const code = err instanceof LogoPipelineError ? err.code : 'decode_failed';
      this.snackbar.error(
        this.i18n.t(code === 'unsupported_type' ? 'image.errType' : code === 'too_large' ? 'image.errSize' : 'image.errGeneric'),
      );
    } finally {
      this.imageBusy.set(false);
    }
  }

  protected setDividerBackground(id: string, background: DividerBackground): void {
    this.session.updateBlock(id, { background }, 'immediate');
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

  protected toggleCtaRow(index: number): void {
    this.openCtaRow = this.openCtaRow === index ? null : index;
    this.iconPicker = null;
  }

  /** i18n key of the link type the address looks like, for the hint chip. */
  protected linkKindKey(href: string): string | null {
    const kind = detectLinkKind(href);
    return kind ? `rt.linkForm.type.${kind}` : null;
  }

  /** "info@x.de" or "+49 30 …" become mailto:/tel: so the email link works. */
  protected onCtaLinkTargetBlur(blockId: string, index: number): void {
    this.session.endCoalesce();
    const href = this.ctaBlock(blockId)?.items[index]?.href ?? '';
    const built = normalizeLinkTarget(href);
    if (built) this.patchCtaItem(blockId, index, { href: built }, 'immediate');
  }

  protected onLinkTargetBlur(blockId: string): void {
    this.session.endCoalesce();
    const block = this.session.newsletter().blocks.find((b) => b.id === blockId);
    if (!block || !('href' in block) || typeof block.href !== 'string') return;
    const built = normalizeLinkTarget(block.href);
    if (built) this.session.updateBlock(blockId, { href: built }, 'immediate');
  }

  /** Icon most lines use; what the "icon for all lines" button shows. */
  protected sharedBenefitIcon(items: readonly BenefitsListItem[]): string {
    const counts = new Map<string, number>();
    let best = BENEFIT_DEFAULT_ICON;
    let bestCount = 0;
    for (const item of items) {
      const icon = item.icon || BENEFIT_DEFAULT_ICON;
      const n = (counts.get(icon) ?? 0) + 1;
      counts.set(icon, n);
      if (n > bestCount) {
        best = icon;
        bestCount = n;
      }
    }
    return best;
  }

  protected pickAllBenefitIcons(blockId: string, icon: string, event: Event): void {
    event.stopPropagation();
    const block = this.benefitsBlock(blockId);
    if (!block) return;
    this.session.updateBlock(blockId, { items: block.items.map((item) => ({ ...item, icon })) }, 'immediate');
    this.iconPicker = null;
  }

  /** Enter in a benefit line adds a new line right below it. */
  protected onBenefitEnter(blockId: string, index: number, event: Event): void {
    event.preventDefault();
    const block = this.benefitsBlock(blockId);
    if (!block) return;
    this.session.endCoalesce();
    const items = block.items.slice();
    items.splice(index + 1, 0, { icon: this.sharedBenefitIcon(block.items), text: '' });
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.focusLater(`[data-testid="benefit-text-${index + 1}"]`);
  }

  /** ⋮⋮ handles: drag with the mouse, or ArrowUp / ArrowDown on the keyboard. */
  protected onRowHandleKey(kind: RowKind, blockId: string, index: number, event: KeyboardEvent): void {
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    if (kind === 'cta') this.moveCtaItem(blockId, index, delta);
    else if (kind === 'teaser') this.moveTeaserItem(blockId, index, delta);
    else this.moveBenefitItem(blockId, index, delta);
    const row = kind === 'cta' ? 'cta-link-row' : kind === 'teaser' ? 'teaser-row' : 'benefit-row';
    this.focusLater(`[data-testid="${row}-${index + delta}"] .row-drag`);
  }

  protected dropCtaItem(blockId: string, event: CdkDragDrop<unknown>): void {
    this.moveCtaItem(blockId, event.previousIndex, event.currentIndex - event.previousIndex);
  }

  protected dropBenefitItem(blockId: string, event: CdkDragDrop<unknown>): void {
    this.moveBenefitItem(blockId, event.previousIndex, event.currentIndex - event.previousIndex);
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
    this.openCtaRow = block.items.length;
    this.iconPicker = null;
    this.focusLater(`#insp-cta-label-${block.items.length}`);
  }

  protected removeCtaItem(blockId: string, index: number): void {
    const block = this.ctaBlock(blockId);
    if (!block || block.items.length <= 1) return;
    const items = block.items.filter((_, i) => i !== index);
    this.session.updateBlock(blockId, { items }, 'immediate');
    if (this.openCtaRow === index) this.openCtaRow = null;
    else if (this.openCtaRow !== null && this.openCtaRow > index) this.openCtaRow--;
    this.iconPicker = null;
  }

  protected moveCtaItem(blockId: string, index: number, delta: number): void {
    const block = this.ctaBlock(blockId);
    if (!block) return;
    const items = moveItem(block.items, index, delta);
    if (!items) return;
    this.session.updateBlock(blockId, { items }, 'immediate');
    const target = index + delta;
    const open = this.openCtaRow;
    if (open === index) this.openCtaRow = target;
    else if (open !== null && delta > 0 && open > index && open <= target) this.openCtaRow = open - 1;
    else if (open !== null && delta < 0 && open < index && open >= target) this.openCtaRow = open + 1;
    this.iconPicker = null;
  }

  protected addBenefitItem(blockId: string): void {
    const block = this.benefitsBlock(blockId);
    if (!block) return;
    const item = { ...emptyBenefitsListItem(), icon: this.sharedBenefitIcon(block.items) };
    this.session.updateBlock(blockId, { items: [...block.items, item] }, 'immediate');
    this.iconPicker = null;
    this.focusLater(`[data-testid="benefit-text-${block.items.length}"]`);
  }

  protected removeBenefitItem(blockId: string, index: number): void {
    const block = this.benefitsBlock(blockId);
    if (!block || block.items.length <= 1) return;
    const items = block.items.filter((_, i) => i !== index);
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.iconPicker = null;
  }

  protected moveBenefitItem(blockId: string, index: number, delta: number): void {
    const block = this.benefitsBlock(blockId);
    if (!block) return;
    const items = moveItem(block.items, index, delta);
    if (!items) return;
    this.session.updateBlock(blockId, { items }, 'immediate');
    this.iconPicker = null;
  }

  protected toggleTeaserRow(index: number): void {
    this.openTeaserRow = this.openTeaserRow === index ? null : index;
  }

  protected onTeaserText(
    blockId: string,
    index: number,
    key: keyof Pick<TeaserItem, 'alt' | 'title' | 'text' | 'linkText' | 'href'>,
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement).value;
    this.patchTeaser(blockId, index, { [key]: value }, 'coalesce');
  }

  protected onTeaserLinkBlur(blockId: string, index: number): void {
    this.session.endCoalesce();
    const built = normalizeLinkTarget(this.teasersBlock(blockId)?.items[index]?.href ?? '');
    if (built) this.patchTeaser(blockId, index, { href: built });
  }

  protected async onTeaserImageFile(blockId: string, index: number, file: File): Promise<void> {
    this.imageBusy.set(true);
    try {
      const { src } = await intakeEmailImageFile(file);
      this.patchTeaser(blockId, index, { src });
    } catch (err) {
      const code = err instanceof LogoPipelineError ? err.code : 'decode_failed';
      this.snackbar.error(
        this.i18n.t(code === 'unsupported_type' ? 'image.errType' : code === 'too_large' ? 'image.errSize' : 'image.errGeneric'),
      );
    } finally {
      this.imageBusy.set(false);
    }
  }

  protected addTeaserItem(blockId: string): void {
    const block = this.teasersBlock(blockId);
    if (!block) return;
    this.session.updateBlock(blockId, { items: [...block.items, emptyTeaserItem()] }, 'immediate');
    this.openTeaserRow = block.items.length;
    this.focusLater(`#insp-teaser-title-${block.items.length}`);
  }

  protected removeTeaserItem(blockId: string, index: number): void {
    const block = this.teasersBlock(blockId);
    if (!block || block.items.length <= 1) return;
    this.session.updateBlock(blockId, { items: block.items.filter((_, i) => i !== index) }, 'immediate');
    if (this.openTeaserRow === index) this.openTeaserRow = null;
    else if (this.openTeaserRow !== null && this.openTeaserRow > index) this.openTeaserRow--;
  }

  protected dropTeaserItem(blockId: string, event: CdkDragDrop<unknown>): void {
    this.moveTeaserItem(blockId, event.previousIndex, event.currentIndex - event.previousIndex);
  }

  protected moveTeaserItem(blockId: string, index: number, delta: number): void {
    const block = this.teasersBlock(blockId);
    if (!block) return;
    const items = moveItem(block.items, index, delta);
    if (!items) return;
    this.session.updateBlock(blockId, { items }, 'immediate');
    const target = index + delta;
    const open = this.openTeaserRow;
    if (open === index) this.openTeaserRow = target;
    else if (open !== null && delta > 0 && open > index && open <= target) this.openTeaserRow = open - 1;
    else if (open !== null && delta < 0 && open < index && open >= target) this.openTeaserRow = open + 1;
  }

  protected patchTeaser(
    blockId: string,
    index: number,
    patch: Partial<TeaserItem>,
    mode: 'coalesce' | 'immediate' = 'immediate',
  ): void {
    const block = this.teasersBlock(blockId);
    if (!block || index < 0 || index >= block.items.length) return;
    const items = block.items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    this.session.updateBlock(blockId, { items }, mode);
  }

  private teasersBlock(blockId: string): TeasersBlock | null {
    const block = this.session.newsletter().blocks.find((b) => b.id === blockId);
    return block?.type === 'teasers' ? block : null;
  }

  private focusLater(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
    });
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

function listTimeZones(): readonly string[] {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    return [];
  }
}

/** Copy of `items` with one entry moved by `delta`; null when that is a no-op or out of range. */
function moveItem<T>(items: readonly T[], index: number, delta: number): T[] | null {
  const target = index + delta;
  if (!delta || index < 0 || index >= items.length || target < 0 || target >= items.length) return null;
  const next = items.slice();
  const [row] = next.splice(index, 1);
  next.splice(target, 0, row);
  return next;
}

/** The usable href for a typed address, or null when it is already fine or not recognizable. */
