import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { LocaleService } from '../../i18n/locale.service';

export type LegalModalKind = 'impressum' | 'privacy' | null;

@Component({
  selector: 'app-legal-modal',
  templateUrl: './legal-modal.component.html',
  styleUrl: './legal-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalModalComponent {
  protected readonly i18n = inject(LocaleService);

  readonly kind = input<LegalModalKind>(null);
  readonly closed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const kind = this.kind();
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;
      if (kind) {
        if (!dialog.open) dialog.showModal();
      } else if (dialog.open) {
        dialog.close();
      }
    });
  }

  protected titleKey(): string {
    return this.kind() === 'privacy' ? 'privacy.title' : 'impressum.title';
  }

  protected onDialogClose(): void {
    this.closed.emit();
  }

  protected requestClose(): void {
    this.dialogRef()?.nativeElement.close();
  }
}
