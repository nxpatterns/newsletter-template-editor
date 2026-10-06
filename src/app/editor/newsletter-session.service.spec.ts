import { TestBed } from '@angular/core/testing';
import { NewsletterSession } from './newsletter-session.service';

describe('NewsletterSession', () => {
  let session: NewsletterSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    session = TestBed.inject(NewsletterSession);
  });

  it('seeds the full CloudLib campaign document', () => {
    expect(session.blocks().length).toBeGreaterThanOrEqual(12);
    expect(session.blocks()[0]?.type).toBe('hero');
    expect(session.blocks().some((b) => b.type === 'price-box')).toBe(true);
    expect(session.blocks().some((b) => b.type === 'cta-link-list')).toBe(true);
    expect(session.globals().campaignSubject).toContain('Betrieb');
  });

  it('starts on the placed-blocks tab', () => {
    expect(session.panelTab()).toBe('placed');
  });

  it('adds a block and keeps the placed tab with selection', () => {
    const before = session.blocks().length;
    session.addBlock('paragraph');
    expect(session.blocks().length).toBe(before + 1);
    expect(session.selectedBlock()?.type).toBe('paragraph');
    expect(session.panelTab()).toBe('placed');
  });

  it('selectBlock stays on the placed tab', () => {
    session.setPanelTab('catalog');
    const id = session.blocks()[0].id;
    session.selectBlock(id);
    expect(session.selectedBlockId()).toBe(id);
    expect(session.panelTab()).toBe('placed');
  });

  it('openBlockEditor sets editing id', () => {
    const id = session.blocks()[0].id;
    session.openBlockEditor(id);
    expect(session.editingBlockId()).toBe(id);
    expect(session.selectedBlockId()).toBe(id);
    session.closeBlockEditor();
    expect(session.editingBlockId()).toBeNull();
  });

  it('reorders blocks by id list', () => {
    const ids = session.blocks().map((b) => b.id);
    const reversed = [...ids].reverse();
    session.reorderBlocks(reversed);
    expect(session.blocks().map((b) => b.id)).toEqual(reversed);
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

  it('undo/redo restores discrete mutations', () => {
    expect(session.canUndo()).toBe(false);
    const before = session.blocks().length;
    session.addBlock('divider');
    expect(session.canUndo()).toBe(true);
    expect(session.blocks().length).toBe(before + 1);
    session.undo();
    expect(session.blocks().length).toBe(before);
    expect(session.canRedo()).toBe(true);
    session.redo();
    expect(session.blocks().length).toBe(before + 1);
  });

  it('coalesces text edits into one undo step', () => {
    const hero = session.blocks().find((b) => b.type === 'hero');
    expect(hero).toBeTruthy();
    const original = hero!.type === 'hero' ? hero!.label : '';
    session.updateBlock(hero!.id, { label: 'A' }, 'coalesce');
    session.updateBlock(hero!.id, { label: 'AB' }, 'coalesce');
    session.updateBlock(hero!.id, { label: 'ABC' }, 'coalesce');
    session.endCoalesce();
    const mid = session.blocks().find((b) => b.id === hero!.id);
    expect(mid?.type === 'hero' && mid.label).toBe('ABC');
    session.undo();
    const restored = session.blocks().find((b) => b.id === hero!.id);
    expect(restored?.type === 'hero' && restored.label).toBe(original);
  });
});
