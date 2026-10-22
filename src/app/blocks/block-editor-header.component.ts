import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { blockTypeHue } from '../editor/blocks/block-catalog';
import { LocaleService } from '../i18n/locale.service';
import { ClearableInputDirective } from '../ui/clearable-input.directive';
import { BlockEditorService } from './block-editor.service';
import { BlockEditorFlow } from './block-editor-flow.service';

/**
 * The block editor's part of the app header (mockup R1, layout B): on the left the way back, the
 * block name and its state; on the right undo, redo and the two save buttons.
 */
@Component({
  selector: 'app-block-editor-header',
  imports: [RouterLink, ClearableInputDirective],
  templateUrl: './block-editor-header.component.html',
  styleUrl: './block-editor-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class BlockEditorHeaderComponent {
  readonly part = input.required<'lead' | 'actions'>();

  protected readonly i18n = inject(LocaleService);
  protected readonly editor = inject(BlockEditorService);
  protected readonly flow = inject(BlockEditorFlow);
  protected readonly saveShortcut = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '') ? '⌘S' : 'Ctrl+S';

  protected readonly backPath = computed(() => this.editor.source()?.backPath ?? ['/']);

  /** Tint of the original type (decision 4). */
  protected readonly hue = computed(() => {
    const type = this.editor.baseType();
    return type ? blockTypeHue(type).a : 'var(--ds-accent)';
  });

  protected readonly typeLabel = computed(() => {
    const type = this.editor.baseType();
    return type ? this.i18n.t(`block.${type}`) : '';
  });

  protected readonly stateText = computed(() => {
    const s = this.editor.saveState();
    if (s.kind === 'version') return this.i18n.t('blockEditor.state.version', { n: s.number });
    return this.i18n.t(`blockEditor.state.${s.kind}`);
  });

  /** ⌘S saves the draft; undo and redo act on the block, never the template. One part listens. */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.part() !== 'actions' || !(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const work = this.editor.work;
    if (key === 's') {
      event.preventDefault();
      void this.flow.saveDraft();
      return;
    }
    if (key === 'z' && !event.shiftKey) {
      if (!work.canUndo()) return;
      event.preventDefault();
      work.undo();
      return;
    }
    if ((key === 'z' && event.shiftKey) || key === 'y') {
      if (!work.canRedo()) return;
      event.preventDefault();
      work.redo();
    }
  }

  protected onName(event: Event): void {
    this.editor.setName((event.target as HTMLInputElement).value);
  }

  /** Enter in the name field ends the rename, like leaving the field. */
  protected onNameEnter(event: Event): void {
    (event.target as HTMLInputElement).blur();
  }
}
