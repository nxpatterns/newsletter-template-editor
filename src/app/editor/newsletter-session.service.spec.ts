import { TestBed } from '@angular/core/testing';
import { NewsletterSession } from './newsletter-session.service';

describe('NewsletterSession', () => {
  let session: NewsletterSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    session = TestBed.inject(NewsletterSession);
  });

  it('seeds with hero/paragraph/divider/cta blocks', () => {
    expect(session.blocks().length).toBe(4);
    expect(session.blocks().map((b) => b.type)).toEqual([
      'hero',
      'paragraph',
      'divider',
      'cta-button',
    ]);
  });

  it('adds a block and selects it for inspector', () => {
    session.addBlock('paragraph');
    expect(session.blocks().length).toBe(5);
    expect(session.selectedBlock()?.type).toBe('paragraph');
    expect(session.panelTab()).toBe('inspector');
  });

  it('updates block fields immutably', () => {
    const hero = session.blocks().find((b) => b.type === 'hero');
    expect(hero).toBeTruthy();
    session.updateBlock(hero!.id, { label: 'Acme' });
    const next = session.blocks().find((b) => b.id === hero!.id);
    expect(next?.type === 'hero' && next.label).toBe('Acme');
  });

  it('moves blocks and removes them', () => {
    const firstId = session.blocks()[0].id;
    const secondId = session.blocks()[1].id;
    session.moveBlock(firstId, 1);
    expect(session.blocks()[0].id).toBe(secondId);
    session.removeBlock(secondId);
    expect(session.blocks().some((b) => b.id === secondId)).toBe(false);
  });

  it('updates globals brand and colors', () => {
    session.updateGlobals({ accentColor: '#112233' });
    session.updateBrand({ starsText: '★' });
    expect(session.globals().accentColor).toBe('#112233');
    expect(session.globals().brand.starsText).toBe('★');
  });
});
