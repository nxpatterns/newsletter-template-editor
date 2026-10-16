import { createBlock, type EventBlock } from '../types';
import { eventPlace, eventSheet, eventTimeRange, googleCalendarHref } from './event';

function event(patch: Partial<EventBlock> = {}): EventBlock {
  const b = createBlock('event');
  if (b.type !== 'event') throw new Error('type');
  return { ...b, date: '2026-11-12', start: '10:00', end: '10:30', timezone: 'Europe/Berlin', ...patch };
}

describe('event formatting', () => {
  it('builds the calendar sheet in the block language', () => {
    expect(eventSheet(event({ locale: 'de' }))).toEqual({ month: 'NOV', day: '12', weekday: 'Donnerstag' });
    expect(eventSheet(event({ locale: 'en' }))).toEqual({ month: 'NOV', day: '12', weekday: 'Thursday' });
    expect(eventSheet(event({ date: '' })).day).toBe('');
  });

  it('writes time and place per language', () => {
    expect(eventTimeRange(event({ locale: 'de' }))).toBe('10:00 bis 10:30 Uhr');
    expect(eventTimeRange(event({ locale: 'en' }))).toBe('10:00 – 10:30');
    expect(eventTimeRange(event({ locale: 'de', end: '' }))).toBe('10:00 Uhr');
    expect(eventPlace(event({ locationMode: 'online', location: 'Microsoft Teams' }))).toBe('Online, Microsoft Teams');
    expect(eventPlace(event({ locationMode: 'onsite', location: 'Hall 3' }))).toBe('Hall 3');
  });
});

describe('googleCalendarHref', () => {
  it('fills title, local times with the time zone, place and the sign-up link', () => {
    const href = googleCalendarHref(event({ title: 'Info & Q&A', location: 'Teams', href: 'https://example.com/a' }));
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Info & Q&A');
    expect(url.searchParams.get('dates')).toBe('20261112T100000/20261112T103000');
    expect(url.searchParams.get('ctz')).toBe('Europe/Berlin');
    expect(url.searchParams.get('location')).toBe('Online, Teams');
    expect(url.searchParams.get('details')).toBe('https://example.com/a');
  });

  it('takes one hour without an end time and the whole day without a start time', () => {
    expect(new URL(googleCalendarHref(event({ start: '23:30', end: '' }))).searchParams.get('dates')).toBe(
      '20261112T233000/20261113T003000',
    );
    expect(new URL(googleCalendarHref(event({ start: '', end: '' }))).searchParams.get('dates')).toBe('20261112/20261113');
    expect(googleCalendarHref(event({ date: 'soon' }))).toBe('');
  });
});
