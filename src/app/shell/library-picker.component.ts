import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { LibraryEntry } from '../../core/persist/idb-docs';
import { LocaleService } from '../i18n/locale.service';

export type LibrarySort = 'date-desc' | 'date-asc' | 'name-asc';

@Component({
  selector: 'app-library-picker',
  templateUrl: './library-picker.component.html',
  styleUrl: './library-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class LibraryPickerComponent {
  protected readonly i18n = inject(LocaleService);

  readonly open = input(false);
  readonly rows = input<LibraryEntry[]>([]);

  readonly closed = output<void>();
  readonly picked = output<string>();
  readonly deleted = output<string>();

  protected readonly query = signal('');
  protected readonly sort = signal<LibrarySort>('date-desc');
  protected readonly openVisual = signal(false);

  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    let list = [...this.rows()];
    if (q) {
      list = list.filter((r) => r.displayName.toLowerCase().includes(q));
    }
    const s = this.sort();
    list.sort((a, b) => {
      if (s === 'name-asc') return a.displayName.localeCompare(b.displayName);
      if (s === 'date-asc') return a.updatedAt.localeCompare(b.updatedAt);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.query.set('');
        this.sort.set('date-desc');
        requestAnimationFrame(() => this.openVisual.set(true));
      } else {
        this.openVisual.set(false);
      }
    });
  }

  protected onEscape(): void {
    if (this.open()) this.requestClose();
  }

  protected requestClose(): void {
    this.openVisual.set(false);
    window.setTimeout(() => this.closed.emit(), 180);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value as LibrarySort);
  }

  protected pick(id: string): void {
    this.picked.emit(id);
  }

  protected remove(id: string, event: Event): void {
    event.stopPropagation();
    this.deleted.emit(id);
  }

  protected formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleString(this.i18n.locale() === 'de' ? 'de-AT' : 'en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }
}
