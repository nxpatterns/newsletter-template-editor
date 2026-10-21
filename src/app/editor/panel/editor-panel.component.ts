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
import { PANEL_TAB_ICONS as ICONS } from './panel-tab-icons';
import {
  type EditorPanelTab,
  NewsletterSession,
} from '../newsletter-session.service';

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
