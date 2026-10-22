import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LocaleService } from '../i18n/locale.service';
import { ConfirmDialogService, type DialogTextPart } from '../ui/confirm-dialog/confirm-dialog.service';
import { BlockEditorService } from './block-editor.service';

/**
 * The block editor's steps that ask something: saving (and then offering to replace the blocks
 * of this type, decision 49) and leaving with unsaved changes.
 */
@Injectable({ providedIn: 'root' })
export class BlockEditorFlow {
  private readonly editor = inject(BlockEditorService);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly i18n = inject(LocaleService);
  private readonly router = inject(Router);

  async saveDraft(): Promise<boolean> {
    if (!this.editor.canSaveDraft()) return false;
    const record = await this.editor.save(false);
    if (record) this.settleAddress();
    return !!record;
  }

  /** "Save as own block" / "Save new version"; the first version offers to replace placed blocks. */
  async publish(): Promise<boolean> {
    if (!this.editor.canPublish()) return false;
    const first = !this.editor.hasVersion();
    const record = await this.editor.save(true);
    if (!record) return false;
    this.settleAddress();
    if (first) await this.offerReplace();
    return true;
  }

  /**
   * Before leaving the page: true when it is fine to go (nothing unsaved, draft saved, or
   * discarded). Saving here stores a draft, never a version.
   */
  async allowLeave(): Promise<boolean> {
    if (this.editor.status() !== 'ready' || !this.editor.hasChanges()) return true;
    const block = this.editor.name().trim() || this.i18n.t('blockEditor.cloneName', { type: '' });
    const target = this.editor.source()?.name ?? this.i18n.t('blockEditor.startPage');
    const body = this.i18n.t('blockEditor.leaveBody', { target });
    const choice = await this.confirm.choose({
      title: this.i18n.t('blockEditor.leaveTitle'),
      body,
      bodyParts: this.parts(body, target),
      tone: 'warning',
      confirmLabel: this.i18n.t('blockEditor.saveDraft'),
      confirmHint: this.i18n.t('blockEditor.leaveHintSave', { name: block }),
      altLabel: this.i18n.t('file.discard'),
      altHint: this.i18n.t('blockEditor.leaveHintDiscard'),
      cancelLabel: this.i18n.t('modal.cancel'),
      cancelHint: this.i18n.t('blockEditor.leaveHintCancel', { target }),
    });
    if (choice === 'cancel') return false;
    if (choice === 'alt') return true;
    return !!(await this.editor.save(false));
  }

  /** After the first save the block exists: the address drops "new copy of type …". */
  private settleAddress(): void {
    void this.router.navigate([], { queryParams: { type: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Decision 49: offered after the first version, off by default; only for the open template. */
  private async offerReplace(): Promise<void> {
    const count = this.editor.replaceableCount();
    const source = this.editor.source();
    const type = this.editor.baseType();
    if (!count || !source || !type) return;
    let replace = false;
    const typeLabel = this.i18n.t(`block.${type}`);
    const done = await this.confirm.confirm({
      title: this.i18n.t('blockEditor.replaceTitle', { type: typeLabel }),
      body: this.i18n.t('blockEditor.replaceBody'),
      tone: 'info',
      option: {
        label: this.i18n.t(count === 1 ? 'blockEditor.replaceOptionOne' : 'blockEditor.replaceOption', { n: count, type: typeLabel, template: source.name, name: this.editor.name() }),
        checked: false,
        onChange: (on) => (replace = on),
      },
      note: this.i18n.t('blockEditor.replaceNote'),
      confirmLabel: this.i18n.t('modal.done'),
      cancelLabel: this.i18n.t('modal.cancel'),
    });
    if (done && replace) this.editor.replaceInTemplate();
  }

  private parts(text: string, name: string): DialogTextPart[] {
    const at = text.indexOf(name);
    if (at < 0) return [{ text }];
    const parts: DialogTextPart[] = [{ text: text.slice(0, at) }, { text: name, chip: 'name' }, { text: text.slice(at + name.length) }];
    return parts.filter((p) => p.text);
  }
}
