import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { Block } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { CatalogDragService } from '../../pages/editor/catalog-drag.service';
import { NTE_CATALOG_MIME } from '../../pages/editor/preview-dnd';
import { ID_SOURCE } from '../id-source.token';
import { NewsletterSession } from '../newsletter-session.service';
import { OwnBlockLibrary, type OwnBlockEntry } from '../own-block-library.service';
import { blockTypeBadgeKey, blockTypeHue, blockTypeIcon, CATALOG_TYPES, type BlockTypeHue } from './block-catalog';

/** Which list the All blocks tab shows (decision 32): built-in blocks or own blocks. */
export type CatalogList = 'built' | 'own';

/** UI-only choice (localStorage), never part of a template. */
const LIST_KEY = 'newsletter-template-editor.catalog-list.v1';

@Component({
  selector: 'app-catalog-tab',
  templateUrl: './catalog-tab.component.html',
  styleUrl: './catalog-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly catalogDrag = inject(CatalogDragService);
  protected readonly ownBlocks = inject(OwnBlockLibrary);
  private readonly session = inject(NewsletterSession);
  private readonly router = inject(Router);
  private readonly newId = inject(ID_SOURCE);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly types = CATALOG_TYPES;

  protected readonly list = signal<CatalogList>(this.readList());

  /** Card that just cancelled (type, or own block id) — drives the return pulse on that card. */
  protected readonly cancelledKey = signal<string | null>(null);
  private cancelPulseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.ownBlocks.refresh();
  }

  protected setList(list: CatalogList): void {
    this.list.set(list);
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(LIST_KEY, list);
    } catch {
      // quota / private mode
    }
  }

  protected label(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected hint(type: Block['type']): string {
    return this.i18n.t(`block.${type}.hint`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected hue(type: Block['type'] | null): BlockTypeHue {
    return blockTypeHue(type ?? 'divider');
  }

  /** Optional footer badge (e.g. Paragraph: "Lite WYSIWYG"); empty for most types. */
  protected badge(type: Block['type']): string {
    const key = blockTypeBadgeKey(type);
    return key ? this.i18n.t(key) : '';
  }

  /** Block type an own card shows and drags: the copied type, or `free` for a free block. */
  protected ownType(entry: OwnBlockEntry): Block['type'] | null {
    return entry.block.kind === 'free' ? 'free' : entry.block.baseType;
  }

  /** "Copy of Price box · version 3", "Free block · version 1", or "no version yet" while it only has a draft. */
  protected ownLine(entry: OwnBlockEntry): string {
    const type = entry.block.baseType;
    const from =
      entry.block.kind === 'free'
        ? this.i18n.t('catalog.own.free')
        : type
          ? this.i18n.t('catalog.own.copyOf', { type: this.label(type) })
          : '';
    const version = entry.latest
      ? this.i18n.t('catalog.own.version', { n: entry.block.versionCount })
      : this.i18n.t('catalog.own.noVersion');
    return from ? `${from} · ${version}` : version;
  }

  /** "Adjust" (decision 6): a new copy of the built-in type opens in the block editor. */
  protected adjust(type: Block['type']): void {
    void this.router.navigate(['/blocks', this.newId()], { queryParams: { from: this.session.routeId(), type } });
  }

  /** "New block" (decision 48): a new free block opens in the block editor. */
  protected newBlock(): void {
    void this.router.navigate(['/blocks', this.newId()], {
      queryParams: { from: this.session.routeId(), type: 'free' },
    });
  }

  protected editOwn(entry: OwnBlockEntry): void {
    void this.router.navigate(['/blocks', entry.block.id], { queryParams: { from: this.session.routeId() } });
  }

  /** Catalog cards are palette items: drag into the preview. Click is intentionally inert. */
  protected onDragStart(type: Block['type'], event: DragEvent, ownBlockId: string | null = null): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    // Custom MIME only — text/plain would leak into Chrome address bar / new-tab search.
    dt.setData(NTE_CATALOG_MIME, type);
    dt.effectAllowed = 'copy';
    this.catalogDrag.begin(type, ownBlockId);
    this.cancelledKey.set(null);
  }

  protected onDragEnd(key: string, event: DragEvent): void {
    const result = this.catalogDrag.end();
    // Escape, drop outside the app, or drop on browser chrome → cancelled.
    const dropEffect = event.dataTransfer?.dropEffect ?? 'none';
    if (result === 'cancelled' || dropEffect === 'none') {
      this.pulseCancel(key);
    }
  }

  private pulseCancel(key: string): void {
    if (this.cancelPulseTimer) clearTimeout(this.cancelPulseTimer);
    this.cancelledKey.set(key);
    this.cancelPulseTimer = setTimeout(() => {
      this.cancelledKey.set(null);
      this.cancelPulseTimer = null;
    }, 420);
  }

  private readList(): CatalogList {
    if (!isPlatformBrowser(this.platformId)) return 'built';
    try {
      return localStorage.getItem(LIST_KEY) === 'own' ? 'own' : 'built';
    } catch {
      return 'built';
    }
  }
}
