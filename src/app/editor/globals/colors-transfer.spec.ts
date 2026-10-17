import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { setBlockColor } from '../../../core';
import { SnackbarService } from '../../ui/snackbar/snackbar.service';
import { NewsletterSession } from '../newsletter-session.service';
import { ColorsFieldsComponent } from './colors-fields.component';

describe('ColorsFieldsComponent: copy and take over colors', () => {
  let fixture: ComponentFixture<ColorsFieldsComponent>;
  let session: NewsletterSession;
  let snackbar: SnackbarService;
  let host: HTMLElement;

  const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  const click = (testId: string) => {
    q(testId)!.click();
    fixture.detectChanges();
  };
  const own = (id: string, key: string, hex: string) => {
    session.updateColors((c) => setBlockColor(c, id, key, { hex }));
    fixture.detectChanges();
  };
  const blocks = () => session.globals().colors.dark.blocks;
  const chapters = () => session.blocks().filter((b) => b.type === 'chapter-band');

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    session = TestBed.inject(NewsletterSession);
    snackbar = TestBed.inject(SnackbarService);
    while (chapters().length < 3) session.addBlock('chapter-band');
    fixture = TestBed.createComponent(ColorsFieldsComponent);
    host = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('offers copying only for block types used more than once', () => {
    const single = session.blocks().find((b) => session.blocks().filter((x) => x.type === b.type).length === 1)!;
    expect(q(`color-block-copy-${single.id}`)).toBeNull();
    const [a] = chapters();
    expect(q(`color-block-copy-${a.id}`)!.hasAttribute('disabled')).toBe(true);
    own(a.id, 'title', '#f4d35e');
    expect(q(`color-block-copy-${a.id}`)!.hasAttribute('disabled')).toBe(false);
  });

  it('copies directly when the others have no own colors, and undo restores them', () => {
    const [a, b, c] = chapters();
    own(a.id, 'title', '#f4d35e');
    click(`color-block-copy-${a.id}`);
    expect(q('colors-copy-dialog')).toBeNull();
    expect(blocks()[b.id]).toEqual(blocks()[a.id]);
    expect(blocks()[c.id]).toEqual(blocks()[a.id]);
    snackbar.runAction();
    expect(blocks()[b.id]).toBeUndefined();
    expect(blocks()[a.id]).toEqual({ title: { hex: '#f4d35e' } });
  });

  it('asks before replacing own colors of the others; cancel changes nothing', () => {
    const [a, b] = chapters();
    own(a.id, 'title', '#f4d35e');
    own(b.id, 'background', '#2a9d8f');
    click(`color-block-copy-${a.id}`);
    expect(q('colors-copy-dialog')).not.toBeNull();
    click('colors-copy-cancel');
    expect(blocks()[b.id]).toEqual({ background: { hex: '#2a9d8f' } });
    click(`color-block-copy-${a.id}`);
    click('colors-copy-apply');
    expect(blocks()[b.id]).toEqual({ title: { hex: '#f4d35e' } });
  });

  it('uses a fixed block value as general color after asking, and the block follows it again', () => {
    const [a, b] = chapters();
    own(a.id, 'title', '#f4d35e');
    click(`colors-acc-${a.id}`);
    click(`color-slot-open-${a.id}.title`);
    click(`color-slot-promote-${a.id}.title`);
    expect(q('colors-dialog')).not.toBeNull();
    expect(q('colors-dialog-affects')).not.toBeNull();
    click('colors-dialog-apply');
    expect(session.palette().accent).toBe('#f4d35e');
    expect(blocks()[a.id]).toBeUndefined();
    expect(blocks()[b.id]).toBeUndefined();
  });

  it('offers no take-over for a color that follows a general color', () => {
    const [a] = chapters();
    click(`colors-acc-${a.id}`);
    click(`color-slot-open-${a.id}.title`);
    expect(q(`color-slot-promote-${a.id}.title`)).toBeNull();
  });
});
