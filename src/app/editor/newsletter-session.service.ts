import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import {
  createBlock,
  loadOrSeed,
  resetToSeed,
  saveNewsletter,
  seedNewsletter,
  type Block,
  type Globals,
  type Newsletter,
} from '../../core';
import { LocaleService } from '../i18n/locale.service';
import { SnackbarService } from '../ui/snackbar/snackbar.service';

export type EditorPanelTab =
  | 'blocks'
  | 'inspector'
  | 'campaign'
  | 'brand'
  | 'colors'
  | 'legal'
  | 'merge';

@Injectable({ providedIn: 'root' })
export class NewsletterSession {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly snackbar = inject(SnackbarService);
  private readonly i18n = inject(LocaleService);

  private readonly newsletterSignal = signal<Newsletter>(seedNewsletter());
  private readonly selectedBlockIdSignal = signal<string | null>(null);
  private readonly panelTabSignal = signal<EditorPanelTab>('blocks');

  readonly newsletter = this.newsletterSignal.asReadonly();
  readonly selectedBlockId = this.selectedBlockIdSignal.asReadonly();
  readonly panelTab = this.panelTabSignal.asReadonly();

  readonly selectedBlock = computed((): Block | null => {
    const id = this.selectedBlockIdSignal();
    if (!id) return null;
    return this.newsletterSignal().blocks.find((b) => b.id === id) ?? null;
  });

  readonly blocks = computed(() => this.newsletterSignal().blocks);
  readonly globals = computed(() => this.newsletterSignal().globals);

  hydrateFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const loaded = loadOrSeed(seedNewsletter);
    this.newsletterSignal.set(loaded);
    saveNewsletter(loaded);
    this.ensureSelection(loaded);
  }

  save(): void {
    saveNewsletter(this.newsletterSignal());
    this.snackbar.success(this.i18n.t('snackbar.saved'));
  }

  resetSeed(): void {
    const next = resetToSeed(seedNewsletter);
    this.newsletterSignal.set(next);
    this.ensureSelection(next);
    this.snackbar.success(this.i18n.t('snackbar.reset'));
  }

  setPanelTab(tab: EditorPanelTab): void {
    this.panelTabSignal.set(tab);
  }

  selectBlock(id: string | null): void {
    this.selectedBlockIdSignal.set(id);
    if (id) this.panelTabSignal.set('inspector');
  }

  addBlock(type: Block['type']): void {
    const block = createBlock(type);
    this.newsletterSignal.update((n) => ({ ...n, blocks: [...n.blocks, block] }));
    this.selectedBlockIdSignal.set(block.id);
    this.panelTabSignal.set('inspector');
  }

  removeBlock(id: string): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      blocks: n.blocks.filter((b) => b.id !== id),
    }));
    if (this.selectedBlockIdSignal() === id) {
      const remaining = this.newsletterSignal().blocks;
      this.selectedBlockIdSignal.set(remaining[0]?.id ?? null);
    }
  }

  moveBlock(id: string, direction: -1 | 1): void {
    this.newsletterSignal.update((n) => {
      const index = n.blocks.findIndex((b) => b.id === id);
      if (index < 0) return n;
      const target = index + direction;
      if (target < 0 || target >= n.blocks.length) return n;
      const blocks = [...n.blocks];
      const [item] = blocks.splice(index, 1);
      blocks.splice(target, 0, item);
      return { ...n, blocks };
    });
  }

  updateBlock(id: string, patch: object): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      blocks: n.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)),
    }));
  }

  updateGlobals(patch: Partial<Globals>): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      globals: { ...n.globals, ...patch },
    }));
  }

  updateBrand(patch: Partial<Globals['brand']>): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      globals: { ...n.globals, brand: { ...n.globals.brand, ...patch } },
    }));
  }

  updateLogo(patch: Partial<Globals['logo']>): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      globals: { ...n.globals, logo: { ...n.globals.logo, ...patch } },
    }));
  }

  updateLegal(patch: Partial<Globals['legal']>): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      globals: { ...n.globals, legal: { ...n.globals.legal, ...patch } },
    }));
  }

  updateSample(key: string, value: string): void {
    this.newsletterSignal.update((n) => ({
      ...n,
      globals: {
        ...n.globals,
        personalization: {
          ...n.globals.personalization,
          samples: { ...n.globals.personalization.samples, [key]: value },
        },
      },
    }));
  }

  private ensureSelection(n: Newsletter): void {
    const current = this.selectedBlockIdSignal();
    if (current && n.blocks.some((b) => b.id === current)) return;
    this.selectedBlockIdSignal.set(n.blocks[0]?.id ?? null);
  }
}
