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

/** Section accordions whose open state is UI-only (localStorage, never exported). */
type SectionId = 'palette' | 'blocks';

interface PaletteToken {
  key: CampaignColorKey;
  labelKey: string;
  testId: string;
}

interface SectionPrefs {
  palette: boolean;
  blocks: boolean;
}

const SECTION_PREFS_KEY = 'newsletter-template-editor.colors-sections.v1';

const DEFAULT_SECTIONS: SectionPrefs = {
  palette: true,
  blocks: false,
};

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

  /** Persisted section open flags (palette / blocks). */
  private readonly sections = signal<SectionPrefs>(this.readSections());

  /** Ephemeral nested accordion ids (shell rows, individual blocks). */
  private readonly openIds = signal<ReadonlySet<string>>(new Set());

  protected isSectionOpen(id: SectionId): boolean {
    return this.sections()[id];
  }

  protected toggleSection(id: SectionId): void {
    this.sections.update((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      this.writeSections(next);
      return next;
    });
  }

  protected isOpen(id: string): boolean {
    return this.openIds().has(id);
  }

  protected toggle(id: string): void {
    this.openIds.update((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  private readSections(): SectionPrefs {
    if (!isPlatformBrowser(this.platformId)) return { ...DEFAULT_SECTIONS };
    try {
      const raw = localStorage.getItem(SECTION_PREFS_KEY);
      if (!raw) return { ...DEFAULT_SECTIONS };
      const parsed = JSON.parse(raw) as Partial<SectionPrefs>;
      return {
        palette: typeof parsed.palette === 'boolean' ? parsed.palette : DEFAULT_SECTIONS.palette,
        blocks: typeof parsed.blocks === 'boolean' ? parsed.blocks : DEFAULT_SECTIONS.blocks,
      };
    } catch {
      return { ...DEFAULT_SECTIONS };
    }
  }

  private writeSections(next: SectionPrefs): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(SECTION_PREFS_KEY, JSON.stringify(next));
    } catch {
      // quota / private mode
    }
  }
}
