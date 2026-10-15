import {
  canvasToDataUrl,
  dataUrlByteLength,
  drawScaled,
  isAcceptedLogoFile,
  LOGO_INTAKE_HARD_BYTES,
  LogoPipelineError,
  loadImage,
  readFileAsDataUrl,
} from '../logo/logo-pipeline';
import { EMAIL_CONTENT_WIDTH_PX } from '../render/utils';

/** Gmail cuts the message ("[Message clipped]") once the HTML part passes ~102 KB. */
export const GMAIL_CLIP_BYTES = 102 * 1024;

export function isEmbeddedSrc(src: string): boolean {
  return /^data:/i.test(src.trim());
}

/** Gmail and Outlook show no SVG, linked or embedded. */
export function isSvgSrc(src: string): boolean {
  const s = src.trim().toLowerCase();
  return s.startsWith('data:image/svg') || /\.svg(?:[?#].*)?$/.test(s);
}

/** Short format label of a data URL (PNG, JPG, SVG, …); '' for links. */
export function embeddedFormat(src: string): string {
  const m = /^data:image\/([a-z0-9.+-]+)/i.exec(src.trim());
  if (!m) return '';
  const t = m[1].toLowerCase();
  return t === 'jpeg' ? 'JPG' : t === 'svg+xml' ? 'SVG' : t.toUpperCase();
}

export function embeddedFileBytes(src: string): number {
  return isEmbeddedSrc(src) ? dataUrlByteLength(src) : 0;
}

export interface EmailSizeReport {
  /** Whole HTML as sent (UTF-8 bytes). */
  totalBytes: number;
  /** Part of it taken by data: URLs. */
  embeddedBytes: number;
}

export function emailSizeReport(html: string): EmailSizeReport {
  const enc = new TextEncoder();
  let embeddedBytes = 0;
  for (const m of html.matchAll(/data:[^"'\s)]+/g)) embeddedBytes += m[0].length;
  return { totalBytes: enc.encode(html).length, embeddedBytes };
}

export interface EmailImageIntake {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

function hasAlpha(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
}

/**
 * Embed a user file in the email: shrink to the 600px column, PNG only when it has
 * transparency, otherwise the smaller of JPG and PNG. SVG and GIF become raster images.
 */
export async function intakeEmailImageFile(file: File): Promise<EmailImageIntake> {
  if (!isAcceptedLogoFile(file)) {
    throw new LogoPipelineError('unsupported_type', 'Use PNG, JPEG, WebP, GIF, or SVG');
  }
  if (file.size > LOGO_INTAKE_HARD_BYTES) {
    throw new LogoPipelineError('too_large', 'File is too large to process in the browser');
  }
  const img = await loadImage(await readFileAsDataUrl(file));
  const nw = img.naturalWidth || EMAIL_CONTENT_WIDTH_PX;
  const nh = img.naturalHeight || Math.round(EMAIL_CONTENT_WIDTH_PX * 0.625);
  const box =
    nw > EMAIL_CONTENT_WIDTH_PX
      ? { width: EMAIL_CONTENT_WIDTH_PX, height: Math.max(1, Math.round((nh * EMAIL_CONTENT_WIDTH_PX) / nw)) }
      : { width: nw, height: nh };
  const canvas = drawScaled(img, box.width, box.height);
  const png = canvasToDataUrl(canvas, 'image/png');
  let src = png;
  if (!hasAlpha(canvas)) {
    const jpg = canvasToDataUrl(canvas, 'image/jpeg', 0.8);
    if (dataUrlByteLength(jpg) < dataUrlByteLength(png)) src = jpg;
  }
  return { src, naturalWidth: box.width, naturalHeight: box.height };
}
