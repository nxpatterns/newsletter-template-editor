import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import type { Block, Globals } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { blockTypeIcon } from '../blocks/block-catalog';
import { NewsletterSession } from '../newsletter-session.service';

type CampaignColorKey = Extract<
  keyof Globals,
  'accentColor' | 'goldColor' | 'bodyTextColor' | 'headingColor' | 'pageBgColor' | 'contentBgColor'
>;

interface PaletteToken {
  key: CampaignColorKey;
  labelKey: string;
  testId: string;
}

/** UI-only open accordion ids (localStorage). Never part of project export. */
const OPEN_PREFS_KEY = 'newsletter-template-editor.colors-open.v2';
/** Legacy key from first section prefs — ignored after v2. */
const LEGACY_SECTION_KEY = 'newsletter-template-editor.colors-sections.v1';

/** Display-only slot rows for structure preview (not wired to the model yet). */
const SHELL_SLOTS: Record<'header' | 'footer', readonly string[]> = {
  header: [
    'colors.slot.header.surface',
    'colors.slot.header.stars',
    'colors.slot.header.viewInBrowser',
    'colors.slot.header.brandName',
  ],
  footer: [
    'colors.slot.footer.surface',
    'colors.slot.footer.notice',
    'colors.slot.footer.rule',
    'colors.slot.footer.stars',
    'colors.slot.footer.company',
    'colors.slot.footer.link',
  ],
};

const BLOCK_SLOTS: Record<Block['type'], readonly string[]> = {
  divider: ['colors.slot.divider.line', 'colors.slot.divider.accentLead', 'colors.slot.divider.accentTail'],
  hero: ['colors.slot.hero.label', 'colors.slot.hero.headline'],
  paragraph: ['colors.slot.paragraph.body'],
  'chapter-band': ['colors.slot.chapter.surface', 'colors.slot.chapter.title'],
  'pull-quote': ['colors.slot.pullQuote.bar', 'colors.slot.pullQuote.text'],
  'stat-box': [
    'colors.slot.stat.surface',
    'colors.slot.stat.number',
    'colors.slot.stat.label',
    'colors.slot.stat.divider',
    'colors.slot.stat.geo',
  ],
  'benefits-list': [
    'colors.slot.benefits.chevron',
    'colors.slot.benefits.item',
    'colors.slot.benefits.rowRule',
  ],
  'price-box': [
    'colors.slot.price.surface',
    'colors.slot.price.border',
    'colors.slot.price.topBar',
    'colors.slot.price.badgeBg',
    'colors.slot.price.badgeText',
    'colors.slot.price.strike',
    'colors.slot.price.amount',
    'colors.slot.price.currency',
    'colors.slot.price.period',
    'colors.slot.price.details',
    'colors.slot.price.fine',
  ],
  'cta-button': ['colors.slot.cta.buttonBg', 'colors.slot.cta.buttonText'],
  'cta-link-list': [
    'colors.slot.ctaLinks.arrow',
    'colors.slot.ctaLinks.label',
    'colors.slot.ctaLinks.intro',
    'colors.slot.ctaLinks.link',
    'colors.slot.ctaLinks.rowRule',
  ],
};

@Component({
  selector: 'app-colors-fields',
  templateUrl: './colors-fields.component.html',
  styleUrl: './colors-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorsFieldsComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  protected readonly paletteTokens: readonly PaletteToken[] = [
    { key: 'accentColor', labelKey: 'colors.accent', testId: 'g-accent' },
    { key: 'goldColor', labelKey: 'colors.gold', testId: 'g-gold' },
    { key: 'bodyTextColor', labelKey: 'colors.bodyText', testId: 'g-body' },
    { key: 'headingColor', labelKey: 'colors.heading', testId: 'g-heading' },
    { key: 'pageBgColor', labelKey: 'colors.pageBg', testId: 'g-page-bg' },
    { key: 'contentBgColor', labelKey: 'colors.contentBg', testId: 'g-content-bg' },
  ];

  protected readonly headerSlots = SHELL_SLOTS.header;
  protected readonly footerSlots = SHELL_SLOTS.footer;

  /**
   * All Colors-tab accordion ids that are open.
   * Default: empty (everything closed). User toggles are persisted in localStorage.
   */
  private readonly openIds = signal<ReadonlySet<string>>(this.readOpenIds());

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

  /** Open/close nested block accordion and scroll the preview to that block. */
  protected onBlockAccClick(blockId: string): void {
    this.toggle(`block-${blockId}`);
    this.session.selectBlock(blockId, { revealInPanel: false, scrollPreview: true });
  }

  protected blockLabel(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected slotsFor(type: Block['type']): readonly string[] {
    return BLOCK_SLOTS[type] ?? [];
  }

  protected onColor(key: CampaignColorKey, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.session.updateGlobals({ [key]: value }, 'coalesce');
  }

  protected onFieldBlur(): void {
    this.session.endCoalesce();
  }

  private readOpenIds(): ReadonlySet<string> {
    if (!isPlatformBrowser(this.platformId)) return new Set();
    try {
      const raw = localStorage.getItem(OPEN_PREFS_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set();
      const ids = parsed.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length < 120);
      return new Set(ids);
    } catch {
      return new Set();
    }
  }

  private writeOpenIds(next: ReadonlySet<string>): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(OPEN_PREFS_KEY, JSON.stringify([...next]));
      // Drop legacy section prefs so an old palette:true cannot surprise later code paths.
      localStorage.removeItem(LEGACY_SECTION_KEY);
    } catch {
      // quota / private mode
    }
  }
}
