import {
  clampDisplayHeight,
  displaySizeFromHeight,
  isAcceptedLogoFile,
  LOGO_DISPLAY_MAX_PX,
  LOGO_DISPLAY_MIN_PX,
  scaleToMaxEdge,
} from './logo-pipeline';

describe('logo-pipeline geometry', () => {
  it('scales down to max edge keeping aspect', () => {
    expect(scaleToMaxEdge(800, 800, 400)).toEqual({ width: 400, height: 400 });
    expect(scaleToMaxEdge(1600, 800, 800)).toEqual({ width: 800, height: 400 });
  });

  it('does not upscale under max edge', () => {
    expect(scaleToMaxEdge(100, 50, 800)).toEqual({ width: 100, height: 50 });
  });

  it('clamps display height', () => {
    expect(clampDisplayHeight(8)).toBe(LOGO_DISPLAY_MIN_PX);
    expect(clampDisplayHeight(9999)).toBe(LOGO_DISPLAY_MAX_PX);
    expect(clampDisplayHeight(120)).toBe(120);
  });

  it('derives width from height and natural aspect', () => {
    expect(displaySizeFromHeight(120, 800, 800)).toEqual({ heightPx: 120, widthPx: 120 });
    expect(displaySizeFromHeight(100, 200, 100)).toEqual({ heightPx: 100, widthPx: 200 });
  });

  it('accepts common logo file types by mime or extension', () => {
    expect(isAcceptedLogoFile(new File([], 'a.png', { type: 'image/png' }))).toBe(true);
    expect(isAcceptedLogoFile(new File([], 'a.SVG', { type: '' }))).toBe(true);
    expect(isAcceptedLogoFile(new File([], 'a.pdf', { type: 'application/pdf' }))).toBe(false);
  });
});
