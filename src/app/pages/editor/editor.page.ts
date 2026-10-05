import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { renderPreview } from '../../../core';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { LocaleService } from '../../i18n/locale.service';
import { ShellUiService } from '../../shell/shell-ui.service';

@Component({
  selector: 'app-editor-page',
  templateUrl: './editor.page.html',
  styleUrl: './editor.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorPage {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly session = inject(NewsletterSession);
  protected readonly shellUi = inject(ShellUiService);
  protected readonly i18n = inject(LocaleService);

  protected readonly previewSrcdoc = computed((): SafeHtml =>
    this.sanitizer.bypassSecurityTrustHtml(renderPreview(this.session.newsletter())),
  );

  constructor() {
    afterNextRender(() => this.session.hydrateFromStorage());
  }
}
