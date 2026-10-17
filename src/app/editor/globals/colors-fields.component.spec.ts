import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { setBlockColor } from '../../../core';
import { NewsletterSession } from '../newsletter-session.service';
import { ColorsFieldsComponent } from './colors-fields.component';

describe('ColorsFieldsComponent', () => {
  let fixture: ComponentFixture<ColorsFieldsComponent>;
  let session: NewsletterSession;
  let host: HTMLElement;

  const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const type = (testId: string, value: string) => {
    const el = q(testId) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };
  const click = (testId: string) => {
    q(testId)!.click();
    fixture.detectChanges();
  };
  const firstBlock = () => session.blocks().find((b) => b.type === 'stat-box')!;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    session = TestBed.inject(NewsletterSession);
    fixture = TestBed.createComponent(ColorsFieldsComponent);
    host = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('changes a general color directly when no block overrode it', () => {
    type('color-general-hex-accent', '#112233');
    expect(q('colors-dialog')).toBeNull();
    expect(session.palette().accent).toBe('#112233');
  });

  it('ignores an invalid color code and keeps the old value', () => {
    const before = session.palette().accent;
    type('color-general-hex-accent', 'rot');
    expect(session.palette().accent).toBe(before);
  });

  it('asks before touching blocks that fixed their own value, and keeps them by default', () => {
    const id = firstBlock().id;
    session.updateColors((c) => setBlockColor(c, id, 'number', { hex: '#445566' }));
    fixture.detectChanges();
    type('color-general-hex-link', '#778899');
    expect(q('colors-dialog')).not.toBeNull();
    expect((q('colors-dialog-keep') as HTMLInputElement).checked).toBe(true);
    click('colors-dialog-apply');
    expect(session.palette().link).toBe('#778899');
    expect(session.globals().colors.dark.blocks[id]['number']).toEqual({ hex: '#445566' });
    expect(q('colors-dialog')).toBeNull();
  });

  it('replaces individual values when asked to use the new color everywhere', () => {
    const id = firstBlock().id;
    session.updateColors((c) => setBlockColor(c, id, 'number', { hex: '#445566' }));
    fixture.detectChanges();
    type('color-general-hex-link', '#778899');
    click('colors-dialog-all');
    click('colors-dialog-apply');
    expect(session.globals().colors.dark.blocks[id]).toBeUndefined();
  });

  it('cancelling the question changes nothing', () => {
    const id = firstBlock().id;
    session.updateColors((c) => setBlockColor(c, id, 'number', { hex: '#445566' }));
    fixture.detectChanges();
    const before = session.palette().link;
    type('color-general-hex-link', '#778899');
    click('colors-dialog-cancel');
    expect(session.palette().link).toBe(before);
  });

  it('shows the outdated hint and takes over the general color on request', () => {
    const id = firstBlock().id;
    session.updateColors((c) => setBlockColor(c, id, 'number', { hex: '#445566' }));
    fixture.detectChanges();
    expect(q(`color-slot-outdated-${id}.number`)).not.toBeNull();
    click(`color-slot-take-${id}.number`);
    expect(session.globals().colors.dark.blocks[id]).toBeUndefined();
    expect(q(`color-slot-outdated-${id}.number`)).toBeNull();
  });

  it('warns at the affected color and makes it readable', () => {
    const id = firstBlock().id;
    session.updateColors((c) => setBlockColor(c, id, 'label', { hex: '#0c1628' }));
    fixture.detectChanges();
    expect(q(`color-slot-warn-${id}.label`)).not.toBeNull();
    click(`color-slot-fix-${id}.label`);
    expect(q(`color-slot-warn-${id}.label`)).toBeNull();
  });

  it('switching the mode shows the other set', () => {
    click('colors-mode-light');
    expect(session.globals().colors.mode).toBe('light');
    expect(session.palette().page).toBe('#e9eff6');
  });
});
