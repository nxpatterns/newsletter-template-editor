import type { EventBlock, EventLocale } from '../types';

const INTL_LOCALE: Record<EventLocale, string> = { de: 'de-DE', en: 'en-GB' };

const WORDS: Record<EventLocale, { until: string; oclock: string; online: string }> = {
  de: { until: ' bis ', oclock: ' Uhr', online: 'Online' },
  en: { until: ' – ', oclock: '', online: 'Online' },
};

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseDate(date: string): Date | null {
  const m = DATE_RE.exec(date.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar sheet parts: "NOV", "12", "Donnerstag" (empty strings for a missing date). */
export function eventSheet(b: Pick<EventBlock, 'date' | 'locale'>): { month: string; day: string; weekday: string } {
  const d = parseDate(b.date);
  if (!d) return { month: '', day: '', weekday: '' };
  const loc = INTL_LOCALE[b.locale] ?? 'en-GB';
  const month = new Intl.DateTimeFormat(loc, { month: 'short', timeZone: 'UTC' })
    .format(d)
    .replace(/\.$/, '')
    .toUpperCase();
  const weekday = new Intl.DateTimeFormat(loc, { weekday: 'long', timeZone: 'UTC' }).format(d);
  return { month, day: String(d.getUTCDate()), weekday };
}

/** "10:00 bis 10:30 Uhr" / "10:00 – 10:30"; empty when there is no start time. */
export function eventTimeRange(b: Pick<EventBlock, 'start' | 'end' | 'locale'>): string {
  const w = WORDS[b.locale] ?? WORDS.en;
  const start = b.start.trim();
  if (!TIME_RE.test(start)) return '';
  const end = b.end.trim();
  return TIME_RE.test(end) ? `${start}${w.until}${end}${w.oclock}` : `${start}${w.oclock}`;
}

/** "Online, Microsoft Teams" or the place as typed. */
export function eventPlace(b: Pick<EventBlock, 'locationMode' | 'location' | 'locale'>): string {
  const loc = b.location.trim();
  if (b.locationMode !== 'online') return loc;
  const online = (WORDS[b.locale] ?? WORDS.en).online;
  return loc ? `${online}, ${loc}` : online;
}

function stamp(d: Date, time: string): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const [hh, mm] = time.split(':');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${hh}${mm}00`;
}

function dayStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}

/**
 * Google Calendar "add event" link from the fields. Times stay local wall-clock time in
 * `timezone` (ctz); no start time = all-day; no end time = one hour after the start.
 */
export function googleCalendarHref(b: EventBlock): string {
  const d = parseDate(b.date);
  if (!d) return '';
  let dates: string;
  const start = b.start.trim();
  if (TIME_RE.test(start)) {
    let end = b.end.trim();
    let endDay = d;
    if (!TIME_RE.test(end) || end <= start) {
      const [h, m] = start.split(':').map(Number);
      const total = h * 60 + m + 60;
      if (total >= 24 * 60) endDay = new Date(d.getTime() + 86_400_000);
      const t = total % (24 * 60);
      end = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    }
    dates = `${stamp(d, start)}/${stamp(endDay, end)}`;
  } else {
    dates = `${dayStamp(d)}/${dayStamp(new Date(d.getTime() + 86_400_000))}`;
  }
  const q: [string, string][] = [
    ['action', 'TEMPLATE'],
    ['text', b.title.trim()],
    ['dates', dates],
    ['ctz', b.timezone.trim() || 'Europe/Berlin'],
  ];
  const place = eventPlace(b);
  if (place) q.push(['location', place]);
  if (b.href.trim()) q.push(['details', b.href.trim()]);
  return `https://calendar.google.com/calendar/render?${q.map(([k, v]) => `${k}=${k === 'dates' ? v : encodeURIComponent(v)}`).join('&')}`;
}
