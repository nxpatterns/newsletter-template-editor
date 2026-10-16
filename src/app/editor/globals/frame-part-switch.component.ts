import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { isFramePartShown, type FramePart } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession } from '../newsletter-session.service';

/** Show/hide switch for one header or footer part, placed in a group title. */
@Component({
  selector: 'app-frame-part-switch',
  template: `
    <label class="ed-switch" [attr.title]="i18n.t(nameKey())">
      @if (textKey(); as key) {
        <span [textContent]="i18n.t(key)"></span>
      }
      <input
        type="checkbox"
        role="switch"
        [attr.data-testid]="'frame-part-' + part()"
        [attr.aria-label]="i18n.t(nameKey())"
        [checked]="shown()"
        (change)="session.setFramePartShown(part(), $any($event.target).checked)"
      />
      <span class="ed-switch-track" aria-hidden="true"></span>
    </label>
  `,
  host: { class: 'frame-part-switch' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FramePartSwitchComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);

  readonly part = input.required<FramePart>();
  /** Optional visible text next to the track (e.g. "Top" when a group has two switches). */
  readonly textKey = input<string>();

  protected readonly nameKey = computed(() => `frame.part.${this.part()}`);
  protected readonly shown = computed(() => isFramePartShown(this.session.globals(), this.part()));
}
