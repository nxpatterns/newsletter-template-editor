import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { colorSlotsOf, setBlockColor } from '../../../core';
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

  describe('general colors as group cards', () => {
    const cards = () => Array.from(host.querySelectorAll<HTMLElement>('.general-card'));
    const rolesIn = (card: HTMLElement) =>
      Array.from(card.querySelectorAll<HTMLElement>('[data-testid^="color-general-hex-"]')).map((el) =>
        el.getAttribute('data-testid')!.replace('color-general-hex-', ''),
      );

    it('shows several cards, each with at least one color', () => {
      expect(cards().length).toBeGreaterThan(1);
      for (const card of cards()) expect(rolesIn(card).length).toBeGreaterThan(0);
    });

    it('puts every general color into exactly one card', () => {
      const all = cards().flatMap(rolesIn);
      expect(new Set(all).size).toBe(all.length);
      expect(all.length).toBe(host.querySelectorAll('[data-testid^="color-general-hex-"]').length);
      expect(all.length).toBeGreaterThanOrEqual(10);
    });

    it('changing a color inside a card marks it as changed and the reset button restores it', () => {
      const before = session.palette().accent;
      type('color-general-hex-accent', '#112233');
      expect(q('color-general-reset-accent')).not.toBeNull();
      click('color-general-reset-accent');
      expect(session.palette().accent).toBe(before);
      expect(q('color-general-reset-accent')).toBeNull();
    });
  });

  describe('colors of the blocks in use (Current Blocks)', () => {
    const accordions = () => q('colors-block-accordions');
    const sectionIds = () =>
      Array.from(accordions()?.querySelectorAll<HTMLElement>('[data-testid^="colors-acc-"]') ?? []).map((el) =>
        el.getAttribute('data-testid')!.replace('colors-acc-', ''),
      );
    const slotRows = (id: string) => host.querySelectorAll(`[data-testid^="color-slot-${id}."]`);
    const own = (id: string, key: string, hex: string) => {
      session.updateColors((c) => setBlockColor(c, id, key, { hex }));
      fixture.detectChanges();
    };

    it('lists exactly the placed blocks, in the order of the newsletter', () => {
      expect(sectionIds()).toEqual(session.blocks().map((b) => b.id));
    });

    it('follows the newsletter when a block is added or removed', () => {
      const before = session.blocks().length;
      session.addBlock('divider');
      fixture.detectChanges();
      const added = session.selectedBlock()!;
      expect(sectionIds().length).toBe(before + 1);
      expect(sectionIds()).toContain(added.id);
      session.removeBlock(added.id);
      fixture.detectChanges();
      expect(sectionIds().length).toBe(before);
      expect(sectionIds()).not.toContain(added.id);
    });

    it('offers the color slots that belong to the block type', () => {
      click(`colors-acc-${firstBlock().id}`);
      const expected = colorSlotsOf('stat-box').length;
      expect(expected).toBeGreaterThan(0);
      expect(slotRows(firstBlock().id).length).toBe(expected);
    });

    it('opens and closes one block without touching the others', () => {
      const [a, b] = session.blocks();
      const expanded = (id: string) => q(`colors-acc-${id}`)!.getAttribute('aria-expanded');
      expect(expanded(a.id)).toBe('false');
      click(`colors-acc-${a.id}`);
      expect(expanded(a.id)).toBe('true');
      expect(expanded(b.id)).toBe('false');
      click(`colors-acc-${a.id}`);
      expect(expanded(a.id)).toBe('false');
    });

    it('selects the block in the preview when its section is clicked', () => {
      const target = session.blocks().find((b) => b.type === 'stat-box')!;
      click(`colors-acc-${target.id}`);
      expect(session.selectedBlockId()).toBe(target.id);
    });

    it('marks a block with its own colors and leaves the other blocks unmarked', () => {
      const id = firstBlock().id;
      const other = session.blocks().find((b) => b.id !== id)!;
      expect(q(`color-block-reset-${id}`)!.hasAttribute('disabled')).toBe(true);
      own(id, 'number', '#445566');
      own(id, 'label', '#556677');
      expect(host.querySelector(`[data-testid="colors-acc-${id}"] .colors-own-meta`)).not.toBeNull();
      expect(host.querySelector(`[data-testid="colors-acc-${other.id}"] .colors-own-meta`)).toBeNull();
      expect(q(`color-block-reset-${id}`)!.hasAttribute('disabled')).toBe(false);
    });

    it('resets all own colors of one block and keeps those of another block', () => {
      const [a, b] = session.blocks().filter((x) => x.type === 'stat-box' || x.type === 'hero');
      own(a.id, colorSlotsOf(a.type)[0].key, '#445566');
      own(b.id, colorSlotsOf(b.type)[0].key, '#778899');
      click(`color-block-reset-${a.id}`);
      expect(session.globals().colors.dark.blocks[a.id]).toBeUndefined();
      expect(session.globals().colors.dark.blocks[b.id]).toBeDefined();
    });

    it('changes one slot through the hex field and resets just that slot', () => {
      const id = firstBlock().id;
      click(`colors-acc-${id}`);
      click(`color-slot-open-${id}.number`);
      type(`color-slot-hex-${id}.number`, '#abcdef');
      expect(session.globals().colors.dark.blocks[id]['number']).toBeDefined();
      click(`color-slot-reset-${id}.number`);
      expect(session.globals().colors.dark.blocks[id]).toBeUndefined();
    });

    it('keeps block colors separate for light and dark', () => {
      const id = firstBlock().id;
      own(id, 'number', '#445566');
      click('colors-mode-light');
      expect(session.globals().colors.light.blocks[id]).toBeUndefined();
      expect(host.querySelector(`[data-testid="colors-acc-${id}"] .colors-own-meta`)).toBeNull();
      click('colors-mode-dark');
      expect(host.querySelector(`[data-testid="colors-acc-${id}"] .colors-own-meta`)).not.toBeNull();
    });

    it('counts warnings of the blocks in the block section header', () => {
      const id = firstBlock().id;
      const total = () =>
        Number(host.querySelector('[data-testid="colors-acc-blocks"] .colors-warn-count')?.textContent?.replace(/\D/g, '') || 0);
      const mine = () => host.querySelector(`[data-testid="colors-acc-${id}"] .colors-warn-count`);
      own(id, 'label', '#ffffff');
      const before = total();
      expect(mine()).toBeNull();
      own(id, 'label', '#0c1628');
      expect(mine()).not.toBeNull();
      expect(total()).toBe(before + 1);
    });

    it('starts without any contrast warning in dark and light', () => {
      for (const mode of ['dark', 'light']) {
        click(`colors-mode-${mode}`);
        expect(host.querySelector('.colors-warn-count')).toBeNull();
        expect(host.querySelector('[data-testid^="color-general-warn-"]')).toBeNull();
      }
    });

    it('shows no block list for an empty newsletter', async () => {
      await session.startNew('blank', 'en');
      fixture.detectChanges();
      expect(accordions()).toBeNull();
      expect(q('colors-acc-blocks')).not.toBeNull();
    });
  });
});
