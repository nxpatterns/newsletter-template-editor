import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { COLOR_MODES, renderBlockPreview, type ColorMode } from '../../core';
import { LAYOUT_FIELDS } from '../../core/own-blocks/clone';
import { BlockInspectorComponent } from '../editor/inspector/block-inspector.component';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { BlockChecksComponent, countFindings } from './block-checks.component';
import { BlockEditorFlow } from './block-editor-flow.service';
import { BlockEditorService } from './block-editor.service';
import { CloneColorsComponent } from './clone-colors.component';

/** Parts of a free block (step 5); in clone mode they are shown locked. */
const PARTS: readonly { key: string; icon: string }[] = [
  { key: 'row', icon: 'M3.5 7h17v10h-17z' },
  { key: 'column', icon: 'M4 5h7v14H4zM13 5h7v14h-7z' },
  { key: 'text', icon: 'M5 6h14M12 6v13M9 19h6' },
  { key: 'image', icon: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5v.1' },
  { key: 'button', icon: 'M3.5 8.5h17v7h-17zM8.5 12h7' },
  { key: 'spacer', icon: 'M12 4v16M8.5 7.5 12 4l3.5 3.5M8.5 16.5 12 20l3.5-3.5' },
];

/**
 * Block editor (`/blocks/<id>?from=<template id>`), layout B "like the editor": preview on the
 * left, a side panel with Parts, Properties and Check on the right. Clone mode: the structure of
 * the built-in type stays; starting texts, the type's layout options and colors change.
 */
@Component({
  selector: 'app-block-editor-page',
  imports: [Tabs, TabList, Tab, TabPanel, TabContent, BlockInspectorComponent, CloneColorsComponent, BlockChecksComponent],
  // The shared block fields edit the block's own one-block document, never the template.
  providers: [{ provide: NewsletterSession, useFactory: () => inject(BlockEditorService).work }],
  templateUrl: './block-editor.page.html',
  styleUrl: './block-editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:beforeunload)': 'onBeforeUnload($event)' },
})
export class BlockEditorPage {
  protected readonly i18n = inject(LocaleService);
  protected readonly editor = inject(BlockEditorService);
  private readonly flow = inject(BlockEditorFlow);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly modes = COLOR_MODES;
  protected readonly parts = PARTS;

  private readonly params = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: null },
  );

  protected readonly findingCount = computed(() => countFindings(this.editor));

  /** Properties split like mockup R1: starting texts, then the layout options of the type (decision 31). */
  protected readonly hasTexts = computed(() => this.editor.baseType() !== 'divider');
  protected readonly hasLayout = computed(() => {
    const type = this.editor.baseType();
    return !!type && !!LAYOUT_FIELDS[type]?.length;
  });

  protected readonly typeLabel = computed(() => {
    const type = this.editor.baseType();
    return type ? this.i18n.t(`block.${type}`) : '';
  });

  protected readonly previewSrcdoc = computed((): SafeHtml | null => {
    if (this.editor.status() !== 'ready') return null;
    return this.sanitizer.bypassSecurityTrustHtml(
      renderBlockPreview(this.editor.work.newsletter(), {
        before: this.i18n.t('blockEditor.preview.before'),
        after: this.i18n.t('blockEditor.preview.after'),
        name: this.editor.name().trim() || this.typeLabel(),
        type: this.typeLabel(),
        locked: this.i18n.t('blockEditor.locked'),
      }),
    );
  });

  constructor() {
    // Reload or deep link: open exactly the block behind the address.
    effect(() => {
      const id = this.params();
      if (!id) return;
      const query = this.route.snapshot.queryParamMap;
      void this.editor.open(id, { from: query.get('from'), type: query.get('type') }).then(() => {
        if (this.params() !== id || this.editor.status() !== 'missing') return;
        void this.router.navigateByUrl('/missing-block', { skipLocationChange: true });
      });
    });
  }

  /** Route guard: unsaved changes ask "save draft, discard or stay". */
  allowLeave(): Promise<boolean> {
    return this.flow.allowLeave();
  }

  /** Reload or closing the tab with unsaved block changes: the browser asks first. */
  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.editor.hasChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  protected setTab(tab: string | undefined): void {
    if (tab === 'parts' || tab === 'props' || tab === 'checks') this.editor.setTab(tab);
  }

  protected setMode(mode: ColorMode): void {
    this.editor.setPreviewMode(mode);
  }

  protected modeLabel(mode: ColorMode): string {
    return this.i18n.t(`blockEditor.set.${mode}`);
  }
}
