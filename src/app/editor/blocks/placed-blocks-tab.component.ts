import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import type { Block } from '../../../core';
import { dismissNewerVersion, newerVersionOf, updatePlacedToVersion } from '../../../core/own-blocks/clone';
import { LocaleService } from '../../i18n/locale.service';
import { MenuIconComponent } from '../../shell/menu-icon.component';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { NewsletterSession } from '../newsletter-session.service';
import { OwnBlockLibrary } from '../own-block-library.service';
import type { PlacedView } from '../panel/panel-routes';
import { blockTypeHue, blockTypeIcon, type BlockTypeHue } from './block-catalog';
import { PlacedTreeComponent } from './placed-tree.component';
import { SaveOwnBlockDialogComponent } from './save-own-block-dialog.component';

/** Room the row menu needs below its row before it opens upwards instead, in px. */
const MENU_ROOM_PX = 200;
/** How long "Undo" stays after "Update" (mockup R2). */
const UNDO_MS = 8000;

@Component({
  selector: 'app-placed-blocks-tab',
  imports: [CdkDropList, CdkDrag, CdkDragHandle, PlacedTreeComponent, MenuIconComponent, SaveOwnBlockDialogComponent],
  templateUrl: './placed-blocks-tab.component.html',
  styleUrl: './placed-blocks-tab.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class PlacedBlocksTabComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly ownBlocks = inject(OwnBlockLibrary);
  private readonly router = inject(Router);
  private readonly snackbar = inject(SnackbarService);

  private readonly rootEl = viewChild<ElementRef<HTMLElement>>('placedRoot');

  protected readonly view = this.session.placedView;

  /** Block whose row menu ⋯ is open. */
  protected readonly menuFor = signal<string | null>(null);
  /** The open menu sits above its row: too little room below it in the list. */
  protected readonly menuUp = signal(false);
  /** Placed block shown in the "Save as own block" dialog. */
  protected readonly saveOwn = signal<{ id: string; name: string } | null>(null);

  /** Mutable snapshot for CDK drop-list typing (session stays immutable). */
  protected readonly listData = computed((): Block[] => [...this.session.blocks()]);

  constructor() {
    void this.ownBlocks.refresh();
    effect(() => {
      const id = this.session.selectedBlockId();
      if (!id) return;
      queueMicrotask(() => this.scrollSelectedIntoView(id));
    });
  }

  protected setView(view: PlacedView): void {
    this.session.setPlacedView(view);
  }

  /** From the tree: switch to the list, where blocks are edited, with the block selected. */
  protected openInList(id: string | null): void {
    this.setView('list');
    if (id) this.session.selectBlock(id);
  }

  /** An own block shows its own name; one deleted from the library keeps the type name. */
  protected label(block: Block): string {
    const own = block.own ? this.ownBlocks.entry(block.own.blockId) : undefined;
    return own?.block.name ?? this.blockLabel(block.type);
  }

  protected blockLabel(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected hue(type: Block['type']): BlockTypeHue {
    return blockTypeHue(type);
  }

  protected ownEntry(id: string): boolean {
    return !!this.ownBlocks.entry(id);
  }

  /** Newer version of this placed own block's source waiting for "Update" (decision 50), or null. */
  protected newerVersion(block: Block): number | null {
    const entry = block.own ? this.ownBlocks.entry(block.own.blockId) : undefined;
    return entry?.latest ? newerVersionOf(block, entry.block.versionCount) : null;
  }

  /** Decision 52: texts stay, layout and colors from the new version; ↶ or "Undo" takes it back. */
  protected updateToNewer(block: Block): void {
    const entry = block.own ? this.ownBlocks.entry(block.own.blockId) : undefined;
    const content = entry?.latest;
    if (!entry || !content) return;
    const ref = { blockId: entry.block.id, version: entry.block.versionCount };
    this.session.applyChange((n) => updatePlacedToVersion(n, { id: block.id, content, ref }));
    const after = this.session.newsletter();
    this.snackbar.show(this.i18n.t('placed.newer.done', { name: entry.block.name, n: ref.version }), 'info', UNDO_MS, {
      label: this.i18n.t('action.undo'),
      run: () => {
        // Only while nothing else changed the template since.
        if (this.session.newsletter() === after) this.session.undo();
      },
    });
  }

  /** "Later": hidden until an even newer version comes. */
  protected laterNewer(block: Block, version: number): void {
    this.session.applyChange((n) => dismissNewerVersion(n, { id: block.id, version }));
  }

  protected toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    if (this.menuFor() === id) {
      this.closeMenu();
      return;
    }
    const pane = this.rootEl()?.nativeElement.querySelector('.placed-list-pane');
    const row = (event.currentTarget as HTMLElement).closest('.placed-item');
    if (pane && row) {
      const below = pane.getBoundingClientRect().bottom - row.getBoundingClientRect().bottom;
      const above = row.getBoundingClientRect().top - pane.getBoundingClientRect().top;
      this.menuUp.set(below < MENU_ROOM_PX && above > below);
    }
    this.menuFor.set(id);
  }

  protected closeMenu(): void {
    this.menuFor.set(null);
  }

  protected onDocClick(event: MouseEvent): void {
    if (!this.menuFor()) return;
    const panel = this.rootEl()?.nativeElement.querySelector('.placed-menu');
    if (!panel?.contains(event.target as Node)) this.closeMenu();
  }

  protected menuEdit(id: string): void {
    this.closeMenu();
    this.session.openBlockEditor(id);
  }

  protected menuSaveOwn(block: Block): void {
    this.closeMenu();
    this.saveOwn.set({ id: block.id, name: this.label(block) });
  }

  protected menuOpenEditor(ownId: string): void {
    this.closeMenu();
    void this.router.navigate(['/blocks', ownId], { queryParams: { from: this.session.routeId() } });
  }

  protected menuRemove(id: string): void {
    this.closeMenu();
    this.session.removeBlock(id);
  }

  protected onDrop(event: CdkDragDrop<Block[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const next = this.listData();
    moveItemInArray(next, event.previousIndex, event.currentIndex);
    this.session.reorderBlocks(next.map((b) => b.id));
  }

  private scrollSelectedIntoView(id: string): void {
    const root = this.rootEl()?.nativeElement;
    if (!root) return;
    const el = root.querySelector(
      `[data-testid="placed-item-${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}
