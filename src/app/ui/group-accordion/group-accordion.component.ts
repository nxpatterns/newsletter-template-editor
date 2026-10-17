import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { GroupOpenState } from './group-open-state.service';

/** Muted group hues from styles.scss (--group-hue-*); never a block-type color. */
export type GroupHue = 'blue' | 'green' | 'gold' | 'mauve' | 'clay' | 'lavender';

let nextUid = 0;

/**
 * Collapsible group card (Campaign, Brand): starts closed, open state remembered per tab.
 * Extra head controls (e.g. frame part switches) go in with the `groupHead` attribute.
 */
@Component({
  selector: 'app-group-accordion',
  templateUrl: './group-accordion.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ed-group group-card group-acc',
    '[class.is-open]': 'open()',
    '[style.--card-hue]': "'var(--group-hue-' + hue() + ')'",
  },
})
export class GroupAccordionComponent {
  private readonly openState = inject(GroupOpenState);

  /** Panel tab the group lives in; open state is stored per tab. */
  readonly tab = input.required<string>();
  readonly groupId = input.required<string>();
  readonly hue = input.required<GroupHue>();
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly index = input<number>();

  protected readonly uid = `group-acc-${nextUid++}`;
  protected readonly open = computed(() => this.openState.isOpen(this.tab(), this.groupId()));

  protected toggle(): void {
    this.openState.toggle(this.tab(), this.groupId());
  }
}
