import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { LocaleService } from '../../i18n/locale.service';
import { BlocksTabComponent } from '../blocks/blocks-tab.component';
import { BrandFieldsComponent } from '../globals/brand-fields.component';
import { CampaignFieldsComponent } from '../globals/campaign-fields.component';
import { ColorsFieldsComponent } from '../globals/colors-fields.component';
import { LegalFieldsComponent } from '../globals/legal-fields.component';
import { MergeFieldsComponent } from '../globals/merge-fields.component';
import { BlockInspectorComponent } from '../inspector/block-inspector.component';
import {
  type EditorPanelTab,
  NewsletterSession,
} from '../newsletter-session.service';

const TABS: { value: EditorPanelTab; labelKey: string }[] = [
  { value: 'blocks', labelKey: 'panel.tab.blocks' },
  { value: 'inspector', labelKey: 'panel.tab.inspector' },
  { value: 'campaign', labelKey: 'panel.tab.campaign' },
  { value: 'brand', labelKey: 'panel.tab.brand' },
  { value: 'colors', labelKey: 'panel.tab.colors' },
  { value: 'legal', labelKey: 'panel.tab.legal' },
  { value: 'merge', labelKey: 'panel.tab.merge' },
];

@Component({
  selector: 'app-editor-panel',
  imports: [
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabContent,
    BlocksTabComponent,
    BlockInspectorComponent,
    CampaignFieldsComponent,
    BrandFieldsComponent,
    ColorsFieldsComponent,
    LegalFieldsComponent,
    MergeFieldsComponent,
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
