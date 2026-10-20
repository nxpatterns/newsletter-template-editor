import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Line icons of the header menus (24px grid, same stroke as the panel tabs). */
const MENU_ICONS = {
  blank: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5', 'M12 11v6', 'M9 14h6'],
  folder: ['M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'],
  rename: ['M4 20h4L19 9l-4-4L4 16z', 'M14 6l4 4'],
  saveAs: ['M5 4h11l3 3v13H5z', 'M8 4v5h7V4', 'M8 20v-6h8v6'],
  download: ['M12 4v11', 'M7 10l5 5 5-5', 'M5 20h14'],
  upload: ['M12 15V4', 'M7 9l5-5 5 5', 'M5 20h14'],
  reset: ['M4 12a8 8 0 1 0 2.3-5.7', 'M4 4v4h4'],
} as const;

export type MenuIconName = keyof typeof MENU_ICONS;

@Component({
  selector: 'app-menu-icon',
  template: `
    <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      @for (d of paths(); track $index) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: contents;
    }

    .menu-icon {
      display: block;
      width: 1.05rem;
      height: 1.05rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuIconComponent {
  readonly name = input.required<MenuIconName>();
  protected readonly paths = computed(() => MENU_ICONS[this.name()]);
}
