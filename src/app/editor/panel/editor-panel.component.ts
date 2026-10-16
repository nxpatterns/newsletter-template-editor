import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { LocaleService } from '../../i18n/locale.service';
import { CatalogTabComponent } from '../blocks/catalog-tab.component';
import { PlacedBlocksTabComponent } from '../blocks/placed-blocks-tab.component';
import { BrandFieldsComponent } from '../globals/brand-fields.component';
import { CampaignFieldsComponent } from '../globals/campaign-fields.component';
import { ColorsFieldsComponent } from '../globals/colors-fields.component';
import { LegalFieldsComponent } from '../globals/legal-fields.component';
import { SocialFieldsComponent } from '../globals/social-fields.component';
import {
  type EditorPanelTab,
  NewsletterSession,
} from '../newsletter-session.service';

/** Stroke icon paths (24×24 viewBox) for the tab bar. */
const ICONS = {
  placed: [
    'M5 4h14a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z',
    'M5 11h14a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1z',
    'M5 17h8a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1z',
  ],
  catalog: [
    'M5.5 4h4A1.5 1.5 0 0 1 11 5.5v4A1.5 1.5 0 0 1 9.5 11h-4A1.5 1.5 0 0 1 4 9.5v-4A1.5 1.5 0 0 1 5.5 4z',
    'M14.5 4h4A1.5 1.5 0 0 1 20 5.5v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 13 9.5v-4A1.5 1.5 0 0 1 14.5 4z',
    'M5.5 13h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 9.5 20h-4A1.5 1.5 0 0 1 4 18.5v-4A1.5 1.5 0 0 1 5.5 13z',
    'M16.5 13.5v6M13.5 16.5h6',
  ],
  campaign: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M4 7l8 6 8-6'],
  brand: ['M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6L12 16.4 6.9 19.1l1-5.6-4.1-4 5.7-.8z'],
  legal: ['M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
  social: [
    'M3.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    'M15.5 6a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    'M15.5 18a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
    'M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6',
  ],
  colors: [
    'M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z',
    'M7.5 11h.01M10 7h.01M14.5 7h.01',
  ],
} satisfies Record<EditorPanelTab, string[]>;

/** Short label on the tab; `fullKey` names it for tooltip and screen readers. */
const TABS: { value: EditorPanelTab; labelKey: string; fullKey?: string; icon: string[] }[] = [
  { value: 'placed', labelKey: 'panel.tab.placed', fullKey: 'panel.tab.placed.full', icon: ICONS.placed },
  { value: 'catalog', labelKey: 'panel.tab.catalog', fullKey: 'panel.tab.catalog.full', icon: ICONS.catalog },
  { value: 'campaign', labelKey: 'panel.tab.campaign', icon: ICONS.campaign },
  { value: 'brand', labelKey: 'panel.tab.brand', icon: ICONS.brand },
  { value: 'legal', labelKey: 'panel.tab.legal', icon: ICONS.legal },
  { value: 'social', labelKey: 'panel.tab.social', fullKey: 'panel.tab.social.full', icon: ICONS.social },
  { value: 'colors', labelKey: 'panel.tab.colors', icon: ICONS.colors },
];

@Component({
  selector: 'app-editor-panel',
  imports: [
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabContent,
    PlacedBlocksTabComponent,
    CatalogTabComponent,
    CampaignFieldsComponent,
    BrandFieldsComponent,
    ColorsFieldsComponent,
    LegalFieldsComponent,
    SocialFieldsComponent,
  ],
  templateUrl: './editor-panel.component.html',
  styleUrl: './editor-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPanelComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly tabs = TABS;

  protected onTabChange(value: string | undefined): void {
    if (!value) return;
    if (this.tabs.some((t) => t.value === value)) {
      this.session.setPanelTab(value as EditorPanelTab);
    }
  }
}
