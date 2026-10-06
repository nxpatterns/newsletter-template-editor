import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { LocaleService } from '../../i18n/locale.service';
import { ShellUiService } from '../../shell/shell-ui.service';
import { CatalogTabComponent } from '../blocks/catalog-tab.component';
import { PlacedBlocksTabComponent } from '../blocks/placed-blocks-tab.component';
import { BrandFieldsComponent } from '../globals/brand-fields.component';
import { CampaignFieldsComponent } from '../globals/campaign-fields.component';
import { ColorsFieldsComponent } from '../globals/colors-fields.component';
import { LegalFieldsComponent } from '../globals/legal-fields.component';
import {
  type EditorPanelTab,
  NewsletterSession,
} from '../newsletter-session.service';

const TABS: { value: EditorPanelTab; labelKey: string; line2Key?: string }[] = [
  { value: 'placed', labelKey: 'panel.tab.placed.l1', line2Key: 'panel.tab.placed.l2' },
  { value: 'catalog', labelKey: 'panel.tab.catalog.l1', line2Key: 'panel.tab.catalog.l2' },
  { value: 'campaign', labelKey: 'panel.tab.campaign' },
  { value: 'brand', labelKey: 'panel.tab.brand' },
  { value: 'colors', labelKey: 'panel.tab.colors' },
  { value: 'legal', labelKey: 'panel.tab.legal' },
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
  ],
  templateUrl: './editor-panel.component.html',
  styleUrl: './editor-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPanelComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  protected readonly shellUi = inject(ShellUiService);
  protected readonly tabs = TABS;

  protected onTabChange(value: string | undefined): void {
    if (!value) return;
    if (this.tabs.some((t) => t.value === value)) {
      this.session.setPanelTab(value as EditorPanelTab);
    }
  }
}
