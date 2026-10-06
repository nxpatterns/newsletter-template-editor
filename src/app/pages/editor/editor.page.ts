import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { renderPreview } from '../../../core';
import { EditorPanelComponent } from '../../editor/panel/editor-panel.component';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { ShellUiService } from '../../shell/shell-ui.service';

@Component({
  selector: 'app-editor-page',
  imports: [EditorPanelComponent],
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPage {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly session = inject(NewsletterSession);
  protected readonly shellUi = inject(ShellUiService);
  protected readonly i18n = inject(LocaleService);

  protected readonly resizing = signal(false);

  protected readonly previewSrcdoc = computed((): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(renderPreview(this.session.newsletter())),
  );

  constructor() {
    afterNextRender(() => this.session.hydrateFromStorage());
  }

  protected onResizePointerDown(event: PointerEvent): void {
    if (this.shellUi.panelCollapsed()) return;
    if (event.button !== 0) return;
    event.preventDefault();
    this.resizing.set(true);
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);
  }

  protected onResizePointerMove(event: PointerEvent): void {
    if (!this.resizing()) return;
    const nextWidth = window.innerWidth - event.clientX;
    this.shellUi.setPanelWidthPx(nextWidth);
  }

  protected onResizePointerUp(event: PointerEvent): void {
    if (!this.resizing()) return;
    this.resizing.set(false);
    const handle = event.currentTarget as HTMLElement;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  }
}
