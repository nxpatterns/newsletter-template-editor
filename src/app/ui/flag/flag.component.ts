import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Country flags drawn as inline SVG (Windows renders no flag emoji). Simplified for small sizes. */
export type FlagCode = 'de' | 'at' | 'ch' | 'uk' | 'us' | 'ca' | 'au' | 'nz' | 'ie';

/** Five-point star with radius 1 around 0,0. */
const STAR = '0,-1 .225,-.309 .951,-.309 .363,.118 .588,.809 0,.382 -.588,.809 -.363,.118 -.951,-.309 -.225,-.309';

interface Star {
  x: number;
  y: number;
  r: number;
}

const AU_STARS: Star[] = [
  { x: 15, y: 22.5, r: 4 },
  { x: 45.5, y: 23.5, r: 2.5 },
  { x: 37.5, y: 13.5, r: 2.5 },
  { x: 45.5, y: 5.5, r: 2.5 },
  { x: 51.5, y: 11.5, r: 2.5 },
  { x: 47.5, y: 16, r: 1.5 },
];

const NZ_STARS: Star[] = [
  { x: 45, y: 23.5, r: 3 },
  { x: 38, y: 13, r: 2.5 },
  { x: 44.5, y: 5, r: 2.5 },
  { x: 51, y: 11, r: 2.5 },
];

/** US canton: alternating rows of 6 and 5 dots. */
const US_STARS = Array.from({ length: 9 }, (_, row) =>
  Array.from({ length: row % 2 ? 5 : 6 }, (_, col) => ({ x: (row % 2 ? 12.6 : 6.3) + col * 12.6, y: 5.4 * (row + 1) })),
).flat();

const US_STRIPES = [0, 2, 4, 6, 8, 10, 12].map((i) => (i * 100) / 13);

@Component({
  selector: 'app-flag',
  template: `
    <svg [attr.viewBox]="viewBox()" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      @switch (code()) {
        @case ('de') {
          <rect width="5" height="1" fill="#000" />
          <rect y="1" width="5" height="1" fill="#dd0000" />
          <rect y="2" width="5" height="1" fill="#ffce00" />
        }
        @case ('at') {
          <rect width="3" height="2" fill="#c8102e" />
          <rect y="0.667" width="3" height="0.667" fill="#fff" />
        }
        @case ('ch') {
          <rect width="32" height="32" fill="#da291c" />
          <rect x="13" y="6" width="6" height="20" fill="#fff" />
          <rect x="6" y="13" width="20" height="6" fill="#fff" />
        }
        @case ('ie') {
          <rect width="1" height="2" fill="#169b62" />
          <rect x="1" width="1" height="2" fill="#fff" />
          <rect x="2" width="1" height="2" fill="#ff883e" />
        }
        @case ('ca') {
          <rect width="40" height="20" fill="#fff" />
          <rect width="10" height="20" fill="#d52b1e" />
          <rect x="30" width="10" height="20" fill="#d52b1e" />
          <polygon
            fill="#d52b1e"
            points="20,3 21.2,5.6 22.6,5 22.1,8 24.3,6.4 24.8,7.6 26.6,7.2 26,9.2 27,9.8 23.4,12.6 23.8,13.8 20.4,13.4 20.5,16.5 19.5,16.5 19.6,13.4 16.2,13.8 16.6,12.6 13,9.8 14,9.2 13.4,7.2 15.2,7.6 15.7,6.4 17.9,8 17.4,5 18.8,5.6"
          />
        }
        @case ('us') {
          <rect width="190" height="100" fill="#fff" />
          @for (y of usStripes; track y) {
            <rect [attr.y]="y" width="190" height="7.7" fill="#b22234" />
          }
          <rect width="76" height="53.9" fill="#3c3b6e" />
          @for (s of usStars; track $index) {
            <circle [attr.cx]="s.x" [attr.cy]="s.y" r="1.6" fill="#fff" />
          }
        }
        @default {
          <!-- uk, au, nz: Union Jack, full size or as canton -->
          <rect width="60" height="30" fill="#012169" />
          <svg viewBox="0 0 60 30" [attr.width]="code() === 'uk' ? 60 : 30" [attr.height]="code() === 'uk' ? 30 : 15">
            <rect width="60" height="30" fill="#012169" />
            <path d="M0,0 60,30M60,0 0,30" stroke="#fff" stroke-width="6" />
            <path d="M0,0 60,30M60,0 0,30" stroke="#c8102e" stroke-width="2" />
            <path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10" />
            <path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6" />
          </svg>
          @if (code() === 'au') {
            @for (s of auStars; track $index) {
              <polygon [attr.points]="star" fill="#fff" [attr.transform]="'translate(' + s.x + ' ' + s.y + ') scale(' + s.r + ')'" />
            }
          }
          @if (code() === 'nz') {
            @for (s of nzStars; track $index) {
              <polygon
                [attr.points]="star"
                fill="#c8102e"
                stroke="#fff"
                stroke-width="0.25"
                [attr.transform]="'translate(' + s.x + ' ' + s.y + ') scale(' + s.r + ')'"
              />
            }
          }
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex: none;
      inline-size: 1.5rem;
      block-size: 1rem;
      border-radius: 2px;
      overflow: hidden;
      /* Light edge: dark stripes (black in DE) must not melt into the dark UI. */
      box-shadow: 0 0 0 1px rgb(255 255 255 / 35%);
    }

    :host(.flag--square) {
      inline-size: 1rem;
    }

    svg {
      display: block;
      inline-size: 100%;
      block-size: 100%;
    }
  `,
  host: { '[class.flag--square]': "code() === 'ch'", '[attr.data-flag]': 'code()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagComponent {
  readonly code = input.required<FlagCode>();

  protected readonly star = STAR;
  protected readonly auStars = AU_STARS;
  protected readonly nzStars = NZ_STARS;
  protected readonly usStars = US_STARS;
  protected readonly usStripes = US_STRIPES;

  protected viewBox(): string {
    switch (this.code()) {
      case 'de':
        return '0 0 5 3';
      case 'at':
      case 'ie':
        return '0 0 3 2';
      case 'ch':
        return '0 0 32 32';
      case 'ca':
        return '0 0 40 20';
      case 'us':
        return '0 0 190 100';
      default:
        return '0 0 60 30';
    }
  }
}
