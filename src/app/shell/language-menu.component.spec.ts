import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LANGUAGE_SEARCH_MIN, PLANNED_LANGUAGES, PLANNED_LOCALES } from '../i18n/languages';
import { LocaleService } from '../i18n/locale.service';
import { LOCALE_STORAGE_KEY } from '../i18n/types';
import { LanguageMenuComponent } from './language-menu.component';

/** Enough planned languages to cross the search threshold, including right-to-left ones. */
const MANY = ['fr', 'it', 'es', 'tr', 'ar', 'he', 'nl', 'pt', 'pl', 'ja'];

describe('LanguageMenuComponent', () => {
  let fixture: ComponentFixture<LanguageMenuComponent>;

  function setup(planned: readonly string[]): void {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLANNED_LANGUAGES, useValue: planned }] });
    fixture = TestBed.createComponent(LanguageMenuComponent);
    fixture.detectChanges();
  }

  const el = <T extends Element = HTMLElement>(sel: string) => fixture.nativeElement.querySelector(sel) as T | null;
  const all = (sel: string) => [...fixture.nativeElement.querySelectorAll(sel)] as HTMLElement[];
  const openMenu = () => {
    el<HTMLButtonElement>('[data-testid="locale-menu-trigger"]')!.click();
    fixture.detectChanges();
  };
  const key = (k: string) => {
    el('[data-testid="locale-menu-panel"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    fixture.detectChanges();
  };
  const search = (q: string) => {
    const input = el<HTMLInputElement>('[data-testid="locale-search"]')!;
    input.value = q;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  afterEach(() => fixture?.destroy());

  it('lists active languages as buttons and planned ones as disabled rows', () => {
    setup(PLANNED_LOCALES);
    openMenu();
    expect(all('button[role="menuitemradio"]').map((b) => b.dataset['testid']).sort()).toEqual(['locale-de', 'locale-en']);
    const soon = all('[aria-disabled="true"]');
    expect(soon.map((r) => r.dataset['testid']).sort()).toEqual(['locale-soon-es', 'locale-soon-fr', 'locale-soon-it', 'locale-soon-tr']);
    expect(soon.every((r) => r.tagName !== 'BUTTON' && !r.hasAttribute('tabindex'))).toBe(true);
  });

  it('hides the search field below the threshold', () => {
    setup(PLANNED_LOCALES);
    expect(2 + PLANNED_LOCALES.length).toBeLessThan(LANGUAGE_SEARCH_MIN);
    openMenu();
    expect(el('[data-testid="locale-search"]')).toBeNull();
  });

  it('shows the search field from the threshold on', () => {
    setup(MANY.slice(0, LANGUAGE_SEARCH_MIN - 2));
    openMenu();
    expect(el('[data-testid="locale-search"]')).not.toBeNull();
  });

  it('filters both groups and reports when nothing matches', () => {
    setup(MANY);
    openMenu();
    search('fr');
    expect(all('[role="menuitemradio"]').map((r) => r.dataset['testid'])).toEqual(['locale-soon-fr']);
    search('deu');
    expect(all('[role="menuitemradio"]').map((r) => r.dataset['testid'])).toEqual(['locale-de']);
    search('zzzz');
    expect(all('[role="menuitemradio"]')).toHaveLength(0);
    expect(el('[data-testid="locale-search-empty"]')).not.toBeNull();
  });

  it('writes right-to-left names right to left', () => {
    setup(MANY);
    openMenu();
    expect(el('[data-testid="locale-soon-ar"] [lang="ar"]')?.getAttribute('dir')).toBe('rtl');
    expect(el('[data-testid="locale-soon-he"] [lang="he"]')?.getAttribute('dir')).toBe('rtl');
    expect(el('[data-testid="locale-soon-fr"] [lang="fr"]')?.getAttribute('dir')).toBe('ltr');
  });

  it('switches the language and closes', () => {
    setup(PLANNED_LOCALES);
    openMenu();
    el<HTMLButtonElement>('[data-testid="locale-de"]')!.click();
    fixture.detectChanges();
    expect(TestBed.inject(LocaleService).locale()).toBe('de');
    expect(el('[data-testid="locale-menu-panel"]')).toBeNull();
    openMenu();
    expect(el('[data-testid="locale-de"]')?.getAttribute('aria-checked')).toBe('true');
    expect(el('[data-testid="locale-en"]')?.getAttribute('aria-checked')).toBe('false');
  });

  it('moves focus only between choosable entries and the search field', () => {
    setup(MANY);
    openMenu();
    const input = el<HTMLInputElement>('[data-testid="locale-search"]')!;
    input.focus();
    const order: (string | undefined)[] = [];
    for (let i = 0; i < 3; i++) {
      key('ArrowDown');
      order.push((document.activeElement as HTMLElement).dataset['testid']);
    }
    // Search, then the two active languages, then back to the search field: planned rows are skipped.
    expect(order.slice(0, 2).sort()).toEqual(['locale-de', 'locale-en']);
    expect(order[2]).toBe('locale-search');
    key('End');
    expect((document.activeElement as HTMLElement).getAttribute('role')).toBe('menuitemradio');
    key('Home');
    expect(document.activeElement).toBe(input);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    setup(PLANNED_LOCALES);
    openMenu();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(el('[data-testid="locale-menu-panel"]')).toBeNull();
    expect(document.activeElement).toBe(el('[data-testid="locale-menu-trigger"]'));
  });
});
