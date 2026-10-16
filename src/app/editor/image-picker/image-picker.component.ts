import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { embeddedFileBytes, embeddedFormat, isEmbeddedSrc, isSvgSrc } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { EmailSizeMeterComponent } from './email-size-meter.component';

export interface ImageSize {
  width: number;
  height: number;
}

type LoadState = 'loading' | 'ok' | 'error';

/**
 * Picture-first image source: paste a link (works everywhere) or drop/choose a file
 * (embedded; the parent decides how to encode it). Used by the Image block and the logo.
 */
@Component({
  selector: 'app-image-picker',
  imports: [EmailSizeMeterComponent, NgTemplateOutlet],
  host: { '[class.is-compact]': 'compact()' },
  templateUrl: './image-picker.component.html',
  styleUrl: './image-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImagePickerComponent {
  protected readonly i18n = inject(LocaleService);

  readonly src = input.required<string>();
  readonly busy = input(false);
  /** Field id prefix, so two pickers never share label targets. */
  readonly idPrefix = input('img');
  /** Small thumbnail with the address beside it, for editors that hold more than the image. */
  readonly compact = input(false);

  readonly fileChosen = output<File>();
  readonly urlCommitted = output<string>();
  readonly removed = output<void>();
  readonly loaded = output<ImageSize>();

  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly dragOver = signal(false);
  protected readonly size = signal<ImageSize | null>(null);
  /** Restarts at "loading" whenever the source changes. */
  protected readonly state = linkedSignal<string, LoadState>({
    source: () => this.src(),
    computation: () => 'loading',
  });

  protected readonly embedded = computed(() => isEmbeddedSrc(this.src()));
  protected readonly svg = computed(() => isSvgSrc(this.src()));
  protected readonly insecure = computed(() => /^http:\/\//i.test(this.src().trim()));
  protected readonly linkValue = computed(() => (this.embedded() ? '' : this.src()));

  protected readonly chip = computed(() => {
    const st = this.state();
    if (st === 'loading') return { tone: 'info', text: this.i18n.t('image.status.loading') };
    if (st === 'error') return { tone: 'warn', text: this.i18n.t('image.status.error') };
    const s = this.size();
    const dims = s ? `${s.width} × ${s.height}` : '';
    if (!this.embedded()) return { tone: 'ok', text: this.i18n.t('image.status.online', { size: dims }) };
    const kb = Math.max(1, Math.round(embeddedFileBytes(this.src()) / 1024));
    return {
      tone: 'warn',
      text: this.i18n.t('image.status.embedded', { format: embeddedFormat(this.src()), size: dims, kb }),
    };
  });

  protected onImgLoad(event: Event): void {
    const img = event.target as HTMLImageElement;
    const size = { width: img.naturalWidth, height: img.naturalHeight };
    this.size.set(size);
    this.state.set('ok');
    this.loaded.emit(size);
  }

  protected onImgError(): void {
    this.size.set(null);
    this.state.set('error');
  }

  protected pickFile(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const el = event.target as HTMLInputElement;
    const file = el.files?.[0];
    el.value = '';
    if (file) this.fileChosen.emit(file);
  }

  protected onDragOver(event: DragEvent): void {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.dragOver.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileChosen.emit(file);
  }

  protected commitUrl(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    if (!value || value === this.src()) return;
    this.urlCommitted.emit(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
  }
}
