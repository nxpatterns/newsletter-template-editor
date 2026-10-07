import type { LogoConfig } from '../types';

/** Intake: refuse files above this (bytes). */
export const LOGO_INTAKE_HARD_BYTES = 8 * 1024 * 1024;
/** Soft intake: may shrink master edge. */
export const LOGO_INTAKE_SOFT_BYTES = 1.5 * 1024 * 1024;
/** Master max edge after intake (storage safety, not design max). */
export const LOGO_MASTER_MAX_EDGE = 1600;
/** HTML export binary target / hard. */
export const LOGO_EXPORT_TARGET_BYTES = 100 * 1024;
export const LOGO_EXPORT_HARD_BYTES = 200 * 1024;
/** Display size clamps (generous max — not a 200px product rule). */
export const LOGO_DISPLAY_MIN_PX = 16;
export const LOGO_DISPLAY_MAX_PX = 480;
/** Default display height for new uploads. */
export const LOGO_DEFAULT_DISPLAY_HEIGHT = 48;
/** Export raster = display × this (retina). */
export const LOGO_EXPORT_RETINA = 2;

const ACCEPT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export type LogoPipelineErrorCode =
  | 'unsupported_type'
  | 'too_large'
  | 'decode_failed'
  | 'encode_failed';

export class LogoPipelineError extends Error {
  constructor(
    readonly code: LogoPipelineErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LogoPipelineError';
  }
}

export function isAcceptedLogoFile(file: File): boolean {
  if (file.type && ACCEPT_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg)$/.test(name);
}

export function clampDisplayHeight(heightPx: number): number {
  if (!Number.isFinite(heightPx)) return LOGO_DEFAULT_DISPLAY_HEIGHT;
  return Math.min(LOGO_DISPLAY_MAX_PX, Math.max(LOGO_DISPLAY_MIN_PX, Math.round(heightPx)));
}

/** Keep aspect; height drives width when natural size known. */
export function displaySizeFromHeight(
  heightPx: number,
  naturalWidth?: number,
  naturalHeight?: number,
): { heightPx: number; widthPx?: number } {
  const h = clampDisplayHeight(heightPx);
  if (naturalWidth && naturalHeight && naturalHeight > 0) {
    return { heightPx: h, widthPx: Math.max(1, Math.round((h * naturalWidth) / naturalHeight)) };
  }
  return { heightPx: h };
}

export function scaleToMaxEdge(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const edge = Math.max(w, h);
  if (edge <= maxEdge) return { width: Math.round(w), height: Math.round(h) };
  const scale = maxEdge / edge;
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new LogoPipelineError('decode_failed', 'Could not read file'));
    };
    reader.onerror = () => reject(new LogoPipelineError('decode_failed', 'Could not read file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new LogoPipelineError('decode_failed', 'Could not decode image'));
    img.src = src;
  });
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  type: 'image/png' | 'image/jpeg',
  quality?: number,
): string {
  try {
    return canvas.toDataURL(type, quality);
  } catch {
    throw new LogoPipelineError('encode_failed', 'Could not encode image');
  }
}

function drawScaled(img: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new LogoPipelineError('encode_failed', 'Canvas unavailable');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function dataUrlByteLength(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

export interface IntakeResult {
  logo: LogoConfig;
  /** True if master pixels were reduced for storage safety. */
  masterShrunk: boolean;
  inputBytes: number;
  masterBytes: number;
}

/**
 * Build a LogoConfig master from a user file (browser only).
 * Does not decide replace UX — caller confirms first.
 */
export async function intakeLogoFile(file: File, previous?: LogoConfig): Promise<IntakeResult> {
  if (!isAcceptedLogoFile(file)) {
    throw new LogoPipelineError('unsupported_type', 'Use PNG, JPEG, WebP, GIF, or SVG');
  }
  if (file.size > LOGO_INTAKE_HARD_BYTES) {
    throw new LogoPipelineError('too_large', 'File is too large to process in the browser');
  }

  const inputBytes = file.size;
  const rawUrl = await readFileAsDataUrl(file);
  const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

  if (isSvg) {
    // Keep SVG text as master when reasonably small; else rasterize at intake max edge.
    if (inputBytes <= 50 * 1024) {
      const img = await loadImage(rawUrl);
      const nw = img.naturalWidth || 183;
      const nh = img.naturalHeight || 150;
      const display = displaySizeFromHeight(
        previous?.heightPx || LOGO_DEFAULT_DISPLAY_HEIGHT,
        nw,
        nh,
      );
      return {
        logo: {
          src: rawUrl,
          heightPx: display.heightPx,
          widthPx: display.widthPx,
          href: previous?.href,
          alt: previous?.alt || file.name.replace(/\.[^.]+$/, ''),
          lockAspectRatio: true,
          naturalWidth: nw,
          naturalHeight: nh,
        },
        masterShrunk: false,
        inputBytes,
        masterBytes: dataUrlByteLength(rawUrl),
      };
    }
  }

  const img = await loadImage(rawUrl);
  let nw = img.naturalWidth || 1;
  let nh = img.naturalHeight || 1;
  let masterShrunk = false;
  let src = rawUrl;

  const needsShrink =
    Math.max(nw, nh) > LOGO_MASTER_MAX_EDGE || inputBytes > LOGO_INTAKE_SOFT_BYTES;
  if (needsShrink) {
    const box = scaleToMaxEdge(nw, nh, LOGO_MASTER_MAX_EDGE);
    const canvas = drawScaled(img, box.width, box.height);
    // Prefer PNG for logos with possible alpha; JPEG if huge photo-like.
    const asPng = canvasToDataUrl(canvas, 'image/png');
    const asJpeg = canvasToDataUrl(canvas, 'image/jpeg', 0.85);
    src = dataUrlByteLength(asPng) <= dataUrlByteLength(asJpeg) * 1.15 ? asPng : asJpeg;
    nw = box.width;
    nh = box.height;
    masterShrunk = true;
  }

  const display = displaySizeFromHeight(
    previous?.heightPx || LOGO_DEFAULT_DISPLAY_HEIGHT,
    nw,
    nh,
  );

  return {
    logo: {
      src,
      heightPx: display.heightPx,
      widthPx: display.widthPx,
      href: previous?.href,
      alt: previous?.alt || file.name.replace(/\.[^.]+$/, ''),
      lockAspectRatio: true,
      naturalWidth: nw,
      naturalHeight: nh,
    },
    masterShrunk,
    inputBytes,
    masterBytes: dataUrlByteLength(src),
  };
}

/**
 * Email-weight logo: scale master to display box (× retina) and compress.
 * Preview keeps master; only HTML export should use the result.
 */
export async function optimizeLogoForHtmlExport(logo: LogoConfig): Promise<LogoConfig> {
  if (!logo?.src) return logo;
  if (logo.src.startsWith('http://') || logo.src.startsWith('https://')) {
    // Hosted URL — leave as-is; layout attrs only.
    return logo;
  }

  const display = displaySizeFromHeight(logo.heightPx, logo.naturalWidth, logo.naturalHeight);
  const exportW = Math.min(
    LOGO_MASTER_MAX_EDGE,
    Math.max(1, Math.round((display.widthPx || display.heightPx) * LOGO_EXPORT_RETINA)),
  );
  const exportH = Math.min(
    LOGO_MASTER_MAX_EDGE,
    Math.max(1, Math.round(display.heightPx * LOGO_EXPORT_RETINA)),
  );

  // Tiny safe SVG: keep if under ~50KB payload.
  if (logo.src.startsWith('data:image/svg+xml') && dataUrlByteLength(logo.src) <= 50 * 1024) {
    return { ...logo, heightPx: display.heightPx, widthPx: display.widthPx };
  }

  try {
    const img = await loadImage(logo.src);
    const canvas = drawScaled(img, exportW, exportH);

    let best = canvasToDataUrl(canvas, 'image/png');
    let bestBytes = dataUrlByteLength(best);

    for (const q of [0.85, 0.75, 0.65, 0.55]) {
      const jpg = canvasToDataUrl(canvas, 'image/jpeg', q);
      const b = dataUrlByteLength(jpg);
      if (b < bestBytes) {
        best = jpg;
        bestBytes = b;
      }
      if (bestBytes <= LOGO_EXPORT_TARGET_BYTES) break;
    }

    // If still huge, shrink box further.
    if (bestBytes > LOGO_EXPORT_HARD_BYTES) {
      const smaller = scaleToMaxEdge(exportW, exportH, Math.max(64, Math.floor(Math.max(exportW, exportH) * 0.6)));
      const c2 = drawScaled(img, smaller.width, smaller.height);
      const jpg = canvasToDataUrl(c2, 'image/jpeg', 0.6);
      if (dataUrlByteLength(jpg) < bestBytes) {
        best = jpg;
        bestBytes = dataUrlByteLength(jpg);
      }
    }

    return {
      ...logo,
      src: best,
      heightPx: display.heightPx,
      widthPx: display.widthPx,
      naturalWidth: exportW,
      naturalHeight: exportH,
    };
  } catch {
    // Fall back to master with display metrics — still valid HTML.
    return { ...logo, heightPx: display.heightPx, widthPx: display.widthPx };
  }
}
