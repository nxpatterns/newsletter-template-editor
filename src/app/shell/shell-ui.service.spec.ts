import { TestBed } from '@angular/core/testing';
import {
  PANEL_WIDTH_MAX_RATIO,
  PANEL_WIDTH_MIN_PX,
  ShellUiService,
} from './shell-ui.service';

describe('ShellUiService', () => {
  let shell: ShellUiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    shell = TestBed.inject(ShellUiService);
  });

  it('clamps panel width between min and 50% of viewport', () => {
    const viewport = 1200;
    const max = Math.floor(viewport * PANEL_WIDTH_MAX_RATIO);
    expect(shell.clampWidth(100, viewport)).toBe(PANEL_WIDTH_MIN_PX);
    expect(shell.clampWidth(9000, viewport)).toBe(max);
    expect(shell.clampWidth(400, viewport)).toBe(400);
  });

  it('persists width via setPanelWidthPx', () => {
    shell.setPanelWidthPx(420);
    expect(shell.panelWidthPx()).toBe(420);
  });
});
