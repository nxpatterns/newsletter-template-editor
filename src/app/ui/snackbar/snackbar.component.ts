import { Component, HostListener, inject } from '@angular/core';
import { SnackbarService } from './snackbar.service';

@Component({
  selector: 'app-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrl: './snackbar.component.scss',
})
export class SnackbarComponent {
  protected readonly snackbar = inject(SnackbarService);

  protected dismiss(): void {
    this.snackbar.dismiss();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.snackbar.message()) {
      this.snackbar.dismiss();
    }
  }
}
