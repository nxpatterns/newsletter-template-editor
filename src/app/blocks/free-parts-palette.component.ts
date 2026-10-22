import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { createBlock, type Block, } from '../../core';
import type { SlotColor } from '../../core/colors';
import type { InsertKind } from '../../core/parts/operations';
import { CATALOG_TYPES, blockTypeHue, blockTypeIcon } from '../editor/blocks/block-catalog';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { OwnBlockLibrary, type OwnBlockEntry } from '../editor/own-block-library.service';
import { LocaleService } from '../i18n/locale.service';
import { BlockEditorService } from './block-editor.service';

/** Drag data of a part tile: the part kind, `own:<id>` or `builtin:<type>`. */
export const NTE_PART_MIME = 'application/x-nte-part';

/** Part tiles with their icon (24 × 24, centered, stroked). */
export const PART_TILES: Readonly<Record<InsertKind | 'block', string>> = {
  section: 'M3.5 5.5h17v13h-17zM3.5 9.5h17',
  columns: 'M3.5 7h17v10h-17z',
  column: 'M4 5h7v14H4zM13 5h7v14h-7z',
  box: 'M6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  list: 'M9 7h11M9 12h11M9 17h11M4.5 7v.01M4.5 12v.01M4.5 17v.01',
  text: 'M5 6h14M12 6v13M9 19h6',
  image: 'M4 5h16v14H4zM4 15l4.5-4.5 4 4 2.5-2.5L20 17M15.5 9.5v.1',
  button: 'M3.5 8.5h17v7h-17zM8.5 12h7',
  icon: 'M12 4.5l2.3 4.8 5.2.7-3.8 3.6.9 5.2-4.6-2.5-4.6 2.5.9-5.2-3.8-3.6 5.2-.7z',
  divider: 'M4 12h16M9 7.5h6M9 16.5h6',
  spacer: 'M12 4v16M8.5 7.5 12 4l3.5 3.5M8.5 16.5 12 20l3.5-3.5',
  block: 'M4 6h16v12H4zM8 10h8M8 14h5',
};

const STRUCTURE: readonly (InsertKind | 'block')[] = ['section', 'columns', 'column', 'box', 'list'];
const CONTENT: readonly (InsertKind | 'block')[] = ['text', 'image', 'button', 'icon', 'divider', 'spacer', 'block'];

/**
 * Parts tab of a free block (mockup R1, decision 43): structure and content parts, the user's
 * own blocks, and the keyboard way (decision 36). Click or Enter inserts after the marked part;
 * a tile can also be dragged into the preview.
 */
@Component({
  selector: 'app-free-parts-palette',
  imports: [NgTemplateOutlet],
  templateUrl: './free-parts-palette.component.html',
  styleUrl: './free-parts-palette.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreePartsPaletteComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly editor = inject(BlockEditorService);
  private readonly library = inject(OwnBlockLibrary);
  private readonly session = inject(NewsletterSession);

  protected readonly structure = STRUCTURE;
  protected readonly content = CONTENT;
  protected readonly icons = PART_TILES;
  protected readonly builtIns = CATALOG_TYPES;
  /** The list of built-in blocks to embed is open. */
  protected readonly builtInOpen = signal(false);

  /** Own blocks with a version, except the one being edited (cycles, decision 38). */
  protected readonly own = computed((): OwnBlockEntry[] =>
    this.library.entries().filter((e) => !!e.latest && e.block.id !== this.editor.blockId()),
  );

  constructor() {
    void this.library.refresh();
  }

  protected tile(kind: InsertKind | 'block'): void {
    if (kind === 'block') {
      this.builtInOpen.update((v) => !v);
      return;
    }
    this.editor.insert(kind);
  }

  protected embedBuiltIn(type: Block['type']): void {
    this.builtInOpen.set(false);
    this.editor.insertBlock({ block: createBlock(type, this.session.blockDefaultTexts()) });
  }

  protected embedOwn(entry: OwnBlockEntry): void {
    const input = ownEmbed(entry);
    if (input) this.editor.insertBlock(input);
  }

  protected onDragStart(event: DragEvent, data: string): void {
    const dt = event.dataTransfer;
    if (!dt) return;
    dt.effectAllowed = 'copy';
    dt.setData(NTE_PART_MIME, data);
    dt.setData('text/plain', data);
  }

  protected iconOf(kind: string): string {
    return PART_TILES[kind as InsertKind | 'block'] ?? '';
  }

  protected label(type: string): string {
    return this.i18n.t(`block.${type}`);
  }

  protected typeIcon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected hue(entry: OwnBlockEntry): string {
    return blockTypeHue(entry.block.baseType ?? 'free').a;
  }

  protected ownHint(entry: OwnBlockEntry): string {
    return this.i18n.t('blockEditor.ownHint', { n: entry.block.versionCount });
  }
}

/** An own block as an embedded part: its newest version, which records the version (decision 38). */
export function ownEmbed(entry: OwnBlockEntry): { block: Block; colors: Record<string, SlotColor> } | null {
  const latest = entry.latest;
  if (!latest) return null;
  return {
    block: { ...structuredClone(latest.block), own: { blockId: entry.block.id, version: entry.block.versionCount } } as Block,
    colors: { ...latest.colors },
  };
}
