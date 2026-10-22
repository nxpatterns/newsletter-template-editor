import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CTA_LINK_ICONS, intakeEmailImageFile, LogoPipelineError, type FreeBlock, type RichDoc } from '../../core';
import { activeDesign, walkNodes, type ContentPart, type LayoutNode } from '../../core/parts/model';
import { addListItem, mapFreeBlock, moveListItem, removeListItem, setContent } from '../../core/parts/operations';
import { ImagePickerComponent } from '../editor/image-picker/image-picker.component';
import { ParagraphLiteEditorComponent } from '../editor/inspector/paragraph-lite-editor.component';
import { NewsletterSession } from '../editor/newsletter-session.service';
import { LocaleService } from '../i18n/locale.service';
import { ClearableInputDirective } from '../ui/clearable-input.directive';
import { SnackbarService } from '../ui/snackbar/snackbar.service';

/** One content part as a field group; `item` is set for the content of a collection item. */
interface FieldVm {
  key: string;
  part: ContentPart;
  label: string;
  item: { collection: string; item: string } | null;
}

interface ListVm {
  key: string;
  collection: string;
  label: string;
  items: { id: string; fields: FieldVm[] }[];
}

type Group = { kind: 'field'; field: FieldVm } | { kind: 'list'; list: ListVm };

/**
 * Content of a free block (words, images, buttons, icons): in the block editor for the selected
 * part, in the template's edit modal for the whole block. Design stays in the block editor.
 * Every change is `setContent` and friends from `src/core/parts` on the shared session.
 */
@Component({
  selector: 'app-free-content-fields',
  imports: [NgTemplateOutlet, ParagraphLiteEditorComponent, ImagePickerComponent, ClearableInputDirective],
  templateUrl: './free-content-fields.component.html',
  styleUrl: './free-content-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FreeContentFieldsComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly snackbar = inject(SnackbarService);

  readonly block = input.required<FreeBlock>();
  /** Only the content of this part (and what is inside it); null = all of the block. */
  readonly part = input<string | null>(null);

  protected readonly icons = CTA_LINK_ICONS;
  protected readonly busy = signal<string | null>(null);
  protected readonly iconOpen = signal<string | null>(null);

  protected readonly groups = computed((): Group[] => {
    const block = this.block();
    const parts = new Map(block.content.parts.map((p) => [p.id, p]));
    const root = this.part();
    let nodes: readonly LayoutNode[] = activeDesign(block).children;
    if (root) {
      let hit: LayoutNode | null = null;
      walkNodes(nodes, (n) => {
        if (!hit && (n.id === root || (n.kind === 'columns' && n.columns.some((c) => c.id === root)))) hit = n;
      });
      nodes = hit ? [hit] : [];
    }
    const out: Group[] = [];
    const seen = new Set<string>();
    const visit = (list: readonly LayoutNode[]) => {
      for (const n of list) {
        if (n.kind === 'list') {
          const c = block.content.collections.find((x) => x.id === n.collection);
          if (!c || seen.has(c.id)) continue;
          seen.add(c.id);
          out.push({
            kind: 'list',
            list: {
              key: `list-${c.id}`,
              collection: c.id,
              label: this.i18n.t('blockEditor.part.list'),
              items: c.items.map((item) => ({
                id: item.id,
                fields: item.parts.map((p) => this.field(p, { collection: c.id, item: item.id })),
              })),
            },
          });
          continue;
        }
        if ('part' in n) {
          const p = parts.get(n.part);
          if (p && !seen.has(p.id)) {
            seen.add(p.id);
            out.push({ kind: 'field', field: this.field(p, null) });
          }
        }
        if (n.kind === 'columns') n.columns.forEach((c) => visit(c.children));
        if (n.kind === 'section' || n.kind === 'box') visit(n.children);
      }
    };
    visit(nodes);
    return out;
  });

  private field(part: ContentPart, item: FieldVm['item']): FieldVm {
    const role = part.kind === 'text' ? this.i18n.t(`blockEditor.role.${part.role}`) : this.i18n.t(`blockEditor.part.${part.kind}`);
    return { key: `${item?.item ?? 'b'}-${part.id}`, part, label: role, item };
  }

  private apply(fn: Parameters<typeof mapFreeBlock>[2], history: 'immediate' | 'coalesce' = 'coalesce'): void {
    const id = this.block().id;
    this.session.applyChange((n) => mapFreeBlock(n, id, fn), history);
  }

  protected set(f: FieldVm, patch: Record<string, unknown>, history: 'immediate' | 'coalesce' = 'coalesce'): void {
    this.apply((d) => setContent(d, f.part.id, patch, f.item ?? undefined), history);
  }

  protected onText(f: FieldVm, key: string, event: Event): void {
    this.set(f, { [key]: (event.target as HTMLInputElement).value });
  }

  protected onDoc(f: FieldVm, doc: RichDoc): void {
    this.set(f, { doc });
  }

  protected endEdit(): void {
    this.session.endCoalesce();
  }

  protected async onImageFile(f: FieldVm, file: File): Promise<void> {
    this.busy.set(f.key);
    try {
      const { src } = await intakeEmailImageFile(file);
      this.set(f, { src }, 'immediate');
    } catch (err) {
      const code = err instanceof LogoPipelineError ? err.code : 'decode_failed';
      this.snackbar.error(this.i18n.t(code === 'unsupported_type' ? 'image.errType' : code === 'too_large' ? 'image.errSize' : 'image.errGeneric'));
    } finally {
      this.busy.set(null);
    }
  }

  protected pickIcon(f: FieldVm, glyph: string): void {
    this.set(f, { glyph }, 'immediate');
    this.iconOpen.set(null);
  }

  protected addItem(list: ListVm, after: string): void {
    this.apply((d) => addListItem(d, list.collection, after), 'immediate');
  }

  protected removeItem(list: ListVm, item: string): void {
    this.apply((d) => removeListItem(d, list.collection, item), 'immediate');
  }

  protected moveItem(list: ListVm, item: string, delta: -1 | 1): void {
    this.apply((d) => moveListItem(d, list.collection, item, delta), 'immediate');
  }

  protected embedLabel(part: ContentPart): string {
    if (part.kind !== 'block') return '';
    return this.i18n.t(`block.${part.block.type}`);
  }

  protected asAny(p: ContentPart): Record<string, string> {
    return p as unknown as Record<string, string>;
  }
}
