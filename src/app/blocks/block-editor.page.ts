import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { activeColors, COLOR_MODES, createBlock, renderBlockPreview, type Block, type ColorMode } from '../../core';
import { activeDesign, findNode, isContainer, walkNodes, type LayoutNode } from '../../core/parts/model';
import { locate, type InsertKind, type QuickStart, type Where } from '../../core/parts/operations';
import { OwnBlockLibrary } from '../editor/own-block-library.service';
import { FreePartPropsComponent } from './free-part-props.component';
import { FreePartsPaletteComponent, NTE_PART_MIME, ownEmbed } from './free-parts-palette.component';
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
  imports: [
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabContent,
    BlockInspectorComponent,
    CloneColorsComponent,
    BlockChecksComponent,
    FreePartsPaletteComponent,
    FreePartPropsComponent,
  ],
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
  private readonly library = inject(OwnBlockLibrary);

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
    if (type === 'free') return this.i18n.t('blockEditor.freeKind');
    return type ? this.i18n.t(`block.${type}`) : '';
  });

  protected readonly previewSrcdoc = computed((): SafeHtml | null => {
    if (this.editor.status() !== 'ready') return null;
    const free = this.editor.isFree();
    const doc = this.editor.work.newsletter();
    return this.sanitizer.bypassSecurityTrustHtml(
      renderBlockPreview(
        doc,
        {
          before: this.i18n.t('blockEditor.preview.before'),
          after: this.i18n.t('blockEditor.preview.after'),
          name: this.editor.name().trim() || this.typeLabel(),
          type: this.typeLabel(),
          locked: free ? undefined : this.i18n.t('blockEditor.locked'),
        },
        free ? { selected: null, empty: this.emptyHtml(activeColors(doc.globals.colors).body) } : undefined,
      ),
    );
  });

  // ---- Free blocks: preview selection, drop places and keys (decision 36). ----

  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');
  /** Bumped on every frame load, so the selection is drawn into the new document. */
  private readonly frameVersion = signal(0);
  protected readonly showParts = signal(false);

  /** Empty block (mockup R1): a short text and three quick starts. */
  private emptyHtml(color: string): string {
    const t = (k: string) => escapeText(this.i18n.t(k));
    const quick = (q: QuickStart) => `<button type="button" data-quick="${q}">${t(`blockEditor.quick.${q}`)}</button>`;
    return `<div class="nte-empty" style="color:${color}"><h2>${t('blockEditor.empty.title')}</h2><p>${t('blockEditor.empty.text')}</p><small>${t('blockEditor.empty.quick')}</small>${quick('twoColumns')}${quick('imageText')}${quick('textButton')}</div>`;
  }

  private frameDoc(): Document | null {
    return this.frame()?.nativeElement.contentDocument ?? null;
  }

  protected onFrameLoad(): void {
    const doc = this.frameDoc();
    if (!doc || !this.editor.isFree()) return;
    doc.addEventListener('click', (e) => this.onFrameClick(e));
    doc.addEventListener('dragover', (e) => this.onFrameDragOver(e));
    doc.addEventListener('dragleave', (e) => {
      if (!e.relatedTarget) this.clearDrop();
    });
    doc.addEventListener('drop', (e) => this.onFrameDrop(e));
    doc.addEventListener('keydown', (e) => this.onStageKey(e));
    this.frameVersion.update((v) => v + 1);
  }

  /** Selection and "show parts" drawn into the frame without reloading it. */
  private readonly drawSelection = effect(() => {
    const selected = this.editor.selectedPart();
    const show = this.showParts();
    this.frameVersion();
    const doc = this.frameDoc();
    if (!doc?.body) return;
    doc.body.classList.toggle('nte-show-parts', show);
    doc.querySelectorAll('[data-part-selected]').forEach((el) => el.removeAttribute('data-part-selected'));
    doc.querySelectorAll('.nte-tag--part').forEach((el) => el.remove());
    if (!selected) return;
    const el = doc.querySelector(`[data-part="${CSS.escape(selected)}"], [data-column="${CSS.escape(selected)}"]`);
    if (!el) return;
    el.setAttribute('data-part-selected', 'true');
    const tag = doc.createElement('span');
    tag.className = 'nte-tag nte-tag--part';
    tag.textContent = this.partName(el);
    el.appendChild(tag);
  });

  private partName(el: Element): string {
    if (el.hasAttribute('data-column')) return this.i18n.t('blockEditor.part.column');
    return this.i18n.t(`blockEditor.part.${el.getAttribute('data-part-kind') ?? 'box'}`);
  }

  private onFrameClick(e: MouseEvent): void {
    const t = e.target as Element | null;
    if (t?.closest('a')) e.preventDefault();
    const quick = t?.closest('[data-quick]')?.getAttribute('data-quick') as QuickStart | null | undefined;
    if (quick) {
      this.editor.quickStart(quick);
      return;
    }
    const el = t?.closest('[data-part]:not([data-part="root"]), [data-column]');
    const id = el?.getAttribute('data-part') ?? el?.getAttribute('data-column') ?? null;
    this.editor.selectPart(id, id ? 'props' : undefined);
  }

  /** Where a drop at the pointer goes, and the line that shows it. */
  private dropAt(e: DragEvent): { where: Where; el: Element | null; edge: 'top' | 'bottom' } | null {
    const data = this.editor.free();
    if (!data) return null;
    const design = activeDesign(data);
    const t = e.target as Element | null;
    const el = t?.closest('[data-part]:not([data-part="root"]), [data-column]') ?? null;
    if (!el) return { where: { parent: null, index: design.children.length }, el: null, edge: 'bottom' };
    const rect = el.getBoundingClientRect();
    const share = (e.clientY - rect.top) / Math.max(1, rect.height);
    const column = el.getAttribute('data-column');
    if (column) {
      const col = this.columnChildren(column);
      return { where: { parent: column, index: col }, el, edge: 'bottom' };
    }
    const id = el.getAttribute('data-part')!;
    const node = findNode(design.children, id);
    if (node && isContainer(node) && node.kind !== 'columns' && share > 0.25 && share < 0.75) {
      const list = node.kind === 'list' ? node.item : node.children;
      return { where: { parent: node.id, index: list.length }, el, edge: 'bottom' };
    }
    const place = locate(data, id);
    if (!place) return null;
    return share < 0.5 ? { where: place, el, edge: 'top' } : { where: { parent: place.parent, index: place.index + 1 }, el, edge: 'bottom' };
  }

  private columnChildren(columnId: string): number {
    const data = this.editor.free();
    let count = 0;
    if (data) {
      walkNodes(activeDesign(data).children, (n: LayoutNode) => {
        if (n.kind === 'columns') count = n.columns.find((c) => c.id === columnId)?.children.length ?? count;
      });
    }
    return count;
  }

  private onFrameDragOver(e: DragEvent): void {
    if (!e.dataTransfer?.types.includes(NTE_PART_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const drop = this.dropAt(e);
    if (drop) this.showDrop(drop.el, drop.edge);
  }

  private showDrop(el: Element | null, edge: 'top' | 'bottom'): void {
    const doc = this.frameDoc();
    if (!doc) return;
    let line = doc.querySelector<HTMLElement>('.nte-drop');
    if (!line) {
      line = doc.createElement('div');
      line.className = 'nte-drop';
      line.setAttribute('data-testid', 'block-drop-line');
      line.appendChild(doc.createElement('span'));
      doc.body.appendChild(line);
    }
    const target = el ?? doc.querySelector('[data-part="root"]');
    if (!target) return;
    const r = target.getBoundingClientRect();
    const win = doc.defaultView!;
    line.style.left = `${r.left + win.scrollX + 8}px`;
    line.style.width = `${Math.max(24, r.width - 16)}px`;
    line.style.top = `${(edge === 'top' ? r.top : r.bottom) + win.scrollY - 2}px`;
    line.firstElementChild!.textContent = this.i18n.t('blockEditor.dropHere');
  }

  private clearDrop(): void {
    this.frameDoc()?.querySelector('.nte-drop')?.remove();
  }

  private onFrameDrop(e: DragEvent): void {
    const data = e.dataTransfer?.getData(NTE_PART_MIME);
    if (!data) return;
    e.preventDefault();
    const drop = this.dropAt(e);
    this.clearDrop();
    if (!drop) return;
    if (data.startsWith('own:')) {
      const entry = this.library.entry(data.slice(4));
      const input = entry ? ownEmbed(entry) : null;
      if (input) this.editor.insertBlock(input, drop.where);
    } else if (data.startsWith('builtin:')) {
      this.editor.insertBlock({ block: createBlock(data.slice(8) as Block['type'], this.editor.work.blockDefaultTexts()) }, drop.where);
    } else {
      this.editor.insert(data as InsertKind, drop.where);
    }
  }

  /** Every part and column in reading order, for selection by arrow keys. */
  private partOrder(): string[] {
    const data = this.editor.free();
    const out: string[] = [];
    if (!data) return out;
    const visit = (nodes: readonly LayoutNode[]) => {
      for (const n of nodes) {
        out.push(n.id);
        if (n.kind === 'columns') {
          for (const c of n.columns) {
            out.push(c.id);
            visit(c.children);
          }
        }
        if (n.kind === 'section' || n.kind === 'box') visit(n.children);
        if (n.kind === 'list') visit(n.item);
      }
    };
    visit(activeDesign(data).children);
    return out;
  }

  /** Keys on the preview: arrows select, Alt + arrows move, Delete removes, Escape selects the block. */
  protected onStageKey(e: KeyboardEvent): void {
    if (!this.editor.isFree()) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const selected = this.editor.selectedPart();
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey) {
      e.preventDefault();
      this.editor.moveSelected(e.key === 'ArrowUp' ? -1 : 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const order = this.partOrder();
      if (!order.length) return;
      const i = selected ? order.indexOf(selected) : -1;
      const next = e.key === 'ArrowDown' ? Math.min(order.length - 1, i + 1) : Math.max(0, i < 0 ? order.length - 1 : i - 1);
      this.editor.selectPart(order[next]!);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
      e.preventDefault();
      this.editor.removeSelected();
    } else if (e.key === 'Escape') {
      this.editor.selectPart(null);
    }
  }

  constructor() {
    // Reload or deep link: open exactly the block behind the address.
    effect(() => {
      const id = this.params();
      if (!id) return;
      const query = this.route.snapshot.queryParamMap;
      // Untracked: open() reads the language, and a language switch must not reopen (and wipe) the block.
      void untracked(() => this.editor.open(id, { from: query.get('from'), type: query.get('type'), replace: query.get('replace') })).then(() => {
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

const escapeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
