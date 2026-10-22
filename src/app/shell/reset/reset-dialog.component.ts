import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import {
  availableKinds,
  isEverything,
  selectedKinds,
  type ResetInventory,
  type ResetKind,
} from '../../../core/reset/reset-kinds';
import { LocaleService } from '../../i18n/locale.service';
import { describeKinds } from './kind-text';
import { ResetDialogService } from './reset-dialog.service';

interface KindRow {
  kind: ResetKind;
  /** Line icon paths (24px grid). */
  icon: readonly string[];
  label: string;
  detail: string;
  /** Shown as a pill; null for kinds that are one thing (working draft, view settings). */
  count: number | null;
}

interface Hint {
  key: string;
  text: string;
  warn: boolean;
}

type SaveState = { status: 'idle' } | { status: 'ok'; file: string; kinds: ResetKind[] } | { status: 'err' };

/** SVG instead of text glyphs, so every icon sits exactly in the middle of its tile. */
const ICONS: Record<ResetKind, readonly string[]> = {
  templates: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M9 13h6M9 17h4'],
  ownBlocks: ['M12 3l9 9-9 9-9-9z'],
  blockDrafts: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
  workingDraft: ['M4 12a8 8 0 1 0 2.3-5.7', 'M4 4v4h4'],
  viewSettings: ['M4 7h10M18 7h2M16 5v4', 'M4 17h4M12 17h8M10 15v4'],
};

/**
 * Reset dialog, variant B of mockup R4: each kind of data with icon, a one-line description and
 * its count, all checked; the save box on top saves only the checked kinds.
 */
@Component({
  selector: 'app-reset-dialog',
  templateUrl: './reset-dialog.component.html',
  styleUrls: ['../../ui/confirm-dialog/confirm-dialog.component.scss', './reset-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ResetDialogComponent {
  protected readonly dialog = inject(ResetDialogService);
  protected readonly i18n = inject(LocaleService);

  private readonly cancelBtn = viewChild<ElementRef<HTMLButtonElement>>('cancelBtn');

  protected readonly openVisual = signal(false);
  private readonly selected = signal<ReadonlySet<ResetKind>>(new Set());
  protected readonly acknowledged = signal(false);
  protected readonly saving = signal(false);
  protected readonly saveState = signal<SaveState>({ status: 'idle' });
  private closing = false;

  private readonly inventory = computed(() => this.dialog.pending()?.inventory ?? null);
  private readonly available = computed(() => {
    const inv = this.inventory();
    return inv ? availableKinds(inv) : [];
  });
  protected readonly checked = computed(() => selectedKinds(this.available(), this.selected()));
  protected readonly everything = computed(() => isEverything(this.available(), this.selected()));
  protected readonly canDelete = computed(() => this.checked().length > 0 && this.acknowledged());
  protected readonly deleteLabel = computed(() => this.i18n.t(this.everything() ? 'reset.deleteAll' : 'reset.deleteSelected'));

  protected readonly rows = computed((): KindRow[] => {
    const inv = this.inventory();
    if (!inv) return [];
    return this.available().map((kind) => ({
      kind,
      icon: ICONS[kind],
      label: this.i18n.t(`reset.kind.${kind}`),
      detail: this.detail(kind, inv),
      count: this.count(kind, inv),
    }));
  });

  /** "Selected: everything" or the checked kinds (decision 67). */
  protected readonly selectedLine = computed(() => {
    const kinds = this.checked();
    const what = !kinds.length
      ? this.i18n.t('reset.selectedNone')
      : this.everything()
        ? this.i18n.t('reset.selectedAll')
        : kinds.map((k) => this.i18n.t(`reset.kind.${k}`)).join(', ');
    return this.i18n.t('reset.selected', { what });
  });

  protected readonly savedSummary = computed(() => {
    const s = this.saveState();
    return s.status === 'ok' ? describeKinds(this.i18n, this.countsOf(s.kinds)) : '';
  });

  protected readonly selectionChanged = computed(() => {
    const s = this.saveState();
    return s.status === 'ok' && s.kinds.join() !== this.checked().join();
  });

  protected readonly hints = computed((): Hint[] => {
    const inv = this.inventory();
    if (!inv) return [];
    const on = new Set(this.checked());
    const has = new Set(this.available());
    const out: Hint[] = [];
    const add = (key: string, warn = false, params?: Record<string, string>) =>
      out.push({ key, text: this.i18n.t(key, params), warn });
    if (!has.size) add('reset.hint.nothing');
    else if (!on.size) add('reset.hint.none');
    if (on.has('ownBlocks') && has.has('templates') && !on.has('templates')) add('reset.hint.templatesKeepCopies');
    if (on.has('ownBlocks') && has.has('blockDrafts') && !on.has('blockDrafts')) add('reset.hint.draftsStandalone');
    const work = inv.workingDraft;
    if (work && on.has('workingDraft') && work.dirty) add('reset.hint.unsavedLost', true, { name: work.displayName });
    if (work?.libraryId && on.has('templates') && !on.has('workingDraft')) add('reset.hint.workUnbound');
    return out;
  });

  constructor() {
    effect(() => {
      const p = this.dialog.pending();
      if (p) {
        this.closing = false;
        this.selected.set(new Set(availableKinds(p.inventory)));
        this.acknowledged.set(false);
        this.saving.set(false);
        this.saveState.set({ status: 'idle' });
        requestAnimationFrame(() => this.openVisual.set(true));
        queueMicrotask(() => this.cancelBtn()?.nativeElement.focus());
      } else {
        this.openVisual.set(false);
      }
    });
  }

  protected isChecked(kind: ResetKind): boolean {
    return this.selected().has(kind);
  }

  protected toggle(kind: ResetKind, event: Event): void {
    const on = (event.target as HTMLInputElement).checked;
    this.selected.update((set) => {
      const next = new Set(set);
      if (on) next.add(kind);
      else next.delete(kind);
      return next;
    });
  }

  protected selectAll(on: boolean): void {
    this.selected.set(new Set(on ? this.available() : []));
  }

  protected onAcknowledge(event: Event): void {
    this.acknowledged.set((event.target as HTMLInputElement).checked);
  }

  protected async saveFile(): Promise<void> {
    const p = this.dialog.pending();
    const kinds = this.checked();
    if (!p || !kinds.length || this.saving()) return;
    this.saving.set(true);
    const file = await p.save(kinds).catch(() => null);
    this.saving.set(false);
    this.saveState.set(file ? { status: 'ok', file, kinds } : { status: 'err' });
  }

  protected onDelete(): void {
    if (!this.canDelete()) return;
    const s = this.saveState();
    this.beginClose({
      kinds: this.checked(),
      everything: this.everything(),
      backupFile: s.status === 'ok' ? s.file : null,
    });
  }

  protected onCancel(): void {
    this.beginClose(null);
  }

  protected onEscape(): void {
    if (this.dialog.pending()) this.beginClose(null);
  }

  private beginClose(result: Parameters<ResetDialogService['complete']>[0]): void {
    if (this.closing) return;
    this.closing = true;
    this.openVisual.set(false);
    setTimeout(() => this.dialog.complete(result), 200);
  }

  private countsOf(kinds: readonly ResetKind[]): Partial<Record<ResetKind, number>> {
    const inv = this.inventory();
    if (!inv) return {};
    return Object.fromEntries(kinds.map((k) => [k, k === 'workingDraft' || k === 'viewSettings' ? 1 : (this.count(k, inv) ?? 0)]));
  }

  private count(kind: ResetKind, inv: ResetInventory): number | null {
    if (kind === 'templates') return inv.templates > 0 ? inv.templates : null;
    if (kind === 'ownBlocks') return inv.ownBlocks;
    if (kind === 'blockDrafts') return inv.blockDrafts;
    return null;
  }

  private detail(kind: ResetKind, inv: ResetInventory): string {
    const locale = this.i18n.locale();
    switch (kind) {
      case 'templates':
        if (!inv.templates) return this.i18n.t('reset.detail.demosOnly');
        return this.i18n.t(inv.hiddenDemos ? 'reset.detail.templatesAndDemos' : 'reset.detail.templates');
      case 'ownBlocks':
        return this.i18n.t('reset.detail.ownBlocks');
      case 'blockDrafts': {
        const date = inv.oldestDraftAt
          ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(inv.oldestDraftAt))
          : '';
        return this.i18n.t('reset.detail.blockDrafts', { date });
      }
      case 'workingDraft': {
        const work = inv.workingDraft;
        if (!work) return '';
        if (work.dirty) return this.i18n.t('reset.detail.workDirty', { name: work.displayName });
        const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(work.savedAt));
        return this.i18n.t('reset.detail.workSaved', { name: work.displayName, date });
      }
      case 'viewSettings':
        return this.i18n.t('reset.detail.viewSettings');
    }
  }
}
