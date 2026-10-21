import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { LOCALES } from '../i18n/catalogs';
import { LANGUAGE_SEARCH_MIN, languageEntries, matchesLanguage, PLANNED_LANGUAGES } from '../i18n/languages';
import { LocaleService } from '../i18n/locale.service';
import type { Locale } from '../i18n/types';
import { MenuIconComponent } from './menu-icon.component';

/** Header language menu: active languages come from the catalogs, planned ones are listed but cannot be chosen. */
@Component({
  selector: 'app-language-menu',
  imports: [MenuIconComponent],
  templateUrl: './language-menu.component.html',
  styleUrl: './language-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class LanguageMenuComponent {
  protected readonly i18n = inject(LocaleService);
  private readonly planned = inject(PLANNED_LANGUAGES);
  private readonly injector = inject(Injector);

  private readonly root = viewChild<ElementRef<HTMLElement>>('root');
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly open = signal(false);
  protected readonly query = signal('');

  private readonly entries = computed(() => languageEntries(this.i18n.locale(), LOCALES, this.planned));
  protected readonly showSearch = computed(() => this.entries().length >= LANGUAGE_SEARCH_MIN);
  private readonly visible = computed(() => {
    const q = this.showSearch() ? this.query() : '';
    return this.entries().filter((e) => matchesLanguage(e, q));
  });
  protected readonly available = computed(() => this.visible().filter((e) => e.active));
  protected readonly soon = computed(() => this.visible().filter((e) => !e.active));

  protected toggle(event: Event): void {
    event.stopPropagation();
    if (this.open()) {
      this.open.set(false);
      return;
    }
    this.query.set('');
    this.open.set(true);
    afterNextRender(
      () => {
        const panel = this.panel()?.nativeElement;
        const target =
          panel?.querySelector<HTMLElement>('[data-search]') ??
          panel?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]:not([aria-disabled])');
        target?.focus();
      },
      { injector: this.injector },
    );
  }

  protected choose(code: string): void {
    this.i18n.setLocale(code as Locale);
    this.close(true);
  }

  protected onQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  /** Arrow keys, Home and End move between the search field and the languages that can be chosen. */
  protected onKeydown(event: KeyboardEvent): void {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    const stops = [...panel.querySelectorAll<HTMLElement>('[data-search], button[role="menuitemradio"]')];
    if (!stops.length) return;
    event.preventDefault();
    const i = stops.indexOf(document.activeElement as HTMLElement);
    const n = stops.length;
    const next =
      event.key === 'Home' ? 0 : event.key === 'End' ? n - 1 : event.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n;
    stops[next].focus();
  }

  protected onEscape(): void {
    if (this.open()) this.close(true);
  }

  protected onDocClick(event: Event): void {
    const el = this.root()?.nativeElement;
    if (!el || !this.open()) return;
    if (!el.contains(event.target as Node)) this.close(false);
  }

  private close(refocus: boolean): void {
    this.open.set(false);
    if (refocus) this.trigger()?.nativeElement.focus();
  }
}
