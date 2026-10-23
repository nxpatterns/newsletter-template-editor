import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  cloneContentFromPlaced,
  placedColorChoices,
  replacePlacedWithOwn,
} from '../../../core/own-blocks/clone';
import { freeSlotLabel, slotLabel } from '../../blocks/block-editor-text';
import { LocaleService } from '../../i18n/locale.service';
import { ClearableInputDirective } from '../../ui/clearable-input.directive';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { ID_SOURCE } from '../id-source.token';
import { NewsletterSession } from '../newsletter-session.service';
import { OwnBlockLibrary } from '../own-block-library.service';

interface ColorRow {
  key: string;
  label: string;
  hex: string;
  detail: string;
  tag: string;
  follows: boolean;
}

/**
 * "Save as own block" from a placed row (decisions 34, 53): the block becomes the first version of
 * a new own block; with the checkbox on, this one placed block is replaced by it and looks the same.
 */
@Component({
  selector: 'app-save-own-block-dialog',
  imports: [ClearableInputDirective],
  templateUrl: './save-own-block-dialog.component.html',
  styleUrls: ['../../ui/confirm-dialog/confirm-dialog.component.scss', './save-own-block-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'close()',
  },
})
export class SaveOwnBlockDialogComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly session = inject(NewsletterSession);
  private readonly library = inject(OwnBlockLibrary);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);
  private readonly newId = inject(ID_SOURCE);

  /** Id of the placed block. */
  readonly blockId = input.required<string>();
  /** Name the block shows in the list; the starting name of the own block. */
  readonly blockName = input.required<string>();
  readonly closed = output<void>();

  private readonly nameInput = viewChild<ElementRef<HTMLInputElement>>('nameInput');

  protected readonly openVisual = signal(false);
  protected readonly name = signal('');
  protected readonly replace = signal(true);
  protected readonly busy = signal(false);

  protected readonly rows = computed((): ColorRow[] => {
    const n = this.session.newsletter();
    const block = n.blocks.find((b) => b.id === this.blockId());
    if (!block) return [];
    return placedColorChoices(n, block.id).map((c) => {
      const role = 'role' in c.color ? this.i18n.t(`colors.role.${c.color.role}`) : null;
      return {
        key: c.key,
        label: block.type === 'free' ? freeSlotLabel(this.i18n, c.key) : slotLabel(this.i18n, block.type, c.key),
        hex: c.hex,
        detail: role ? this.i18n.t('saveOwn.sameAs', { role }) : this.i18n.t('saveOwn.ownHex', { hex: c.hex.toUpperCase() }),
        tag: role ? this.i18n.t('saveOwn.follows', { role }) : this.i18n.t('saveOwn.fixed'),
        follows: !!role,
      };
    });
  });

  constructor() {
    afterNextRender(() => {
      this.name.set(this.blockName());
      requestAnimationFrame(() => this.openVisual.set(true));
      const el = this.nameInput()?.nativeElement;
      if (el) {
        el.value = this.blockName();
        el.focus();
        el.select();
      }
    });
  }

  protected onName(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onReplace(event: Event): void {
    this.replace.set((event.target as HTMLInputElement).checked);
  }

  protected close(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected async save(open: boolean): Promise<void> {
    const content = cloneContentFromPlaced(this.session.newsletter(), this.blockId());
    if (!content || this.busy()) return;
    const name = this.name().trim() || this.blockName();
    this.busy.set(true);
    try {
      const record = await this.library.save(null, { id: this.newId(), name, content, publish: true });
      if (this.replace()) {
        const ref = { blockId: record.block.id, version: record.block.versionCount };
        this.session.applyChange((n) => replacePlacedWithOwn(n, { id: this.blockId(), content, ref }));
      }
      this.snackbar.success(this.i18n.t('saveOwn.saved', { name: record.block.name }));
      this.busy.set(false);
      this.closed.emit();
      if (open) {
        void this.router.navigate(['/blocks', record.block.id], { queryParams: { from: this.session.routeId() } });
      }
    } catch {
      this.busy.set(false);
      this.snackbar.error(this.i18n.t('saveOwn.failed'));
    }
  }
}
