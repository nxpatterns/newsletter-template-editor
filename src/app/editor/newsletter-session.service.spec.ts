import { TestBed } from '@angular/core/testing';
import { LocaleService } from '../i18n/locale.service';
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

  it('new blocks start with texts in the active language; placed blocks keep theirs', () => {
    const locale = TestBed.inject(LocaleService);
    locale.setLocale('de');
    session.addBlock('greeting');
    const greeting = session.selectedBlock();
    expect(greeting?.type === 'greeting' && greeting.text).toBe('Werte Geschäftspartner');
    expect(greeting?.type === 'greeting' && greeting.useName).toBe(false);
    session.addBlock('stat-box');
    expect(session.selectedBlock()?.type === 'stat-box' && session.selectedBlock()).toMatchObject({ number: '1.000+' });
    locale.setLocale('en');
    session.addBlock('greeting');
    expect(session.selectedBlock()).toMatchObject({ text: 'Dear business partner' });
    expect(session.blocks().find((b) => b.id === greeting?.id)).toMatchObject({ text: 'Werte Geschäftspartner' });
  });

  it('insertBlockAt can keep the catalog tab open', () => {
    session.setPanelTab('catalog');
    const before = session.blocks().length;
    const id = session.insertBlockAt('divider', 0, { revealInPanel: false });
    expect(session.blocks().length).toBe(before + 1);
    expect(session.blocks()[0].id).toBe(id);
    expect(session.selectedBlockId()).toBe(id);
    expect(session.panelTab()).toBe('catalog');
  });

  it('insertBlockAt clamps index and can insert in the middle', () => {
    const ids = session.blocks().map((b) => b.id);
    const mid = Math.min(2, ids.length);
    const created = session.insertBlockAt('paragraph', mid, { revealInPanel: false });
    expect(session.blocks()[mid].id).toBe(created);
    expect(session.blocks()[mid].type).toBe('paragraph');

    const endId = session.insertBlockAt('divider', 9999, { revealInPanel: false });
    expect(session.blocks().at(-1)?.id).toBe(endId);
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
    session.saveBlockEditor();
    expect(session.editingBlockId()).toBeNull();
  });

  it('saveBlockEditor requests preview scroll back to the edited block', () => {
    const cta = session.blocks().find((b) => b.type === 'cta-link-list');
    expect(cta).toBeTruthy();
    const tokenBefore = session.previewScrollToken();
    session.openBlockEditor(cta!.id);
    session.updateBlock(
      cta!.id,
      {
        items: [
          {
            icon: '→',
            label: 'Edited title',
            intro: 'Desc',
            linkText: '',
            href: '',
          },
        ],
      },
      'coalesce',
    );
    session.saveBlockEditor();
    expect(session.editingBlockId()).toBeNull();
    expect(session.previewScrollBlockId()).toBe(cta!.id);
    expect(session.previewScrollToken()).toBeGreaterThan(tokenBefore);
  });

  it('updates cta-link-list rows without dropping icons', () => {
    const cta = session.blocks().find((b) => b.type === 'cta-link-list');
    expect(cta).toBeTruthy();
    session.updateBlock(cta!.id, {
      items: [
        {
          icon: '★',
          label: 'Book',
          intro: 'We call',
          linkText: 'Go',
          href: 'https://example.com',
        },
        {
          icon: '•',
          label: 'Reply',
          intro: '',
          linkText: '',
          href: '',
        },
      ],
    });
    const next = session.blocks().find((b) => b.id === cta!.id);
    expect(next?.type).toBe('cta-link-list');
    if (next?.type === 'cta-link-list') {
      expect(next.items.length).toBe(2);
      expect(next.items[0].icon).toBe('★');
      expect(next.items[1].label).toBe('Reply');
    }
  });

  it('cancelBlockEditor restores the block snapshot', () => {
    const hero = session.blocks().find((b) => b.type === 'hero');
    expect(hero).toBeTruthy();
    const original = hero!.type === 'hero' ? hero!.label : '';
    expect(session.canUndo()).toBe(false);
    session.openBlockEditor(hero!.id);
    session.updateBlock(hero!.id, { label: 'TEMP' }, 'coalesce');
    expect(session.canUndo()).toBe(true);
    session.cancelBlockEditor();
    const restored = session.blocks().find((b) => b.id === hero!.id);
    expect(restored?.type === 'hero' && restored.label).toBe(original);
    expect(session.editingBlockId()).toBeNull();
    expect(session.canUndo()).toBe(false);
  });

  it('paragraph draft does not mutate newsletter until save', () => {
    const para = session.blocks().find((b) => b.type === 'paragraph');
    expect(para).toBeTruthy();
    if (para?.type !== 'paragraph') return;
    const original = JSON.stringify(para.body);
    session.openBlockEditor(para.id);
    session.setParagraphEditDraft(para.id, [
      { type: 'p', children: [{ type: 'text', text: 'Draft only — not in preview yet' }] },
    ]);
    const mid = session.blocks().find((b) => b.id === para.id);
    expect(mid?.type === 'paragraph' && JSON.stringify(mid.body)).toBe(original);
    session.saveBlockEditor();
    const saved = session.blocks().find((b) => b.id === para.id);
    expect(saved?.type === 'paragraph' && saved.body[0]?.children[0]?.type === 'text').toBe(true);
    if (saved?.type === 'paragraph' && saved.body[0]?.children[0]?.type === 'text') {
      expect(saved.body[0].children[0].text).toContain('Draft only');
    }
  });

  it('paragraph draft is dropped on cancel without changing newsletter', () => {
    const para = session.blocks().find((b) => b.type === 'paragraph');
    expect(para).toBeTruthy();
    if (para?.type !== 'paragraph') return;
    const original = JSON.stringify(para.body);
    session.openBlockEditor(para.id);
    session.setParagraphEditDraft(para.id, [
      { type: 'p', children: [{ type: 'text', text: 'Should vanish on cancel' }] },
    ]);
    session.cancelBlockEditor();
    const after = session.blocks().find((b) => b.id === para.id);
    expect(after?.type === 'paragraph' && JSON.stringify(after.body)).toBe(original);
  });

  it('save flushes registered paragraph draft callback before commit', () => {
    const para = session.blocks().find((b) => b.type === 'paragraph');
    expect(para).toBeTruthy();
    if (para?.type !== 'paragraph') return;
    let flushed = false;
    session.openBlockEditor(para.id);
    session.registerParagraphDraftFlush(() => {
      flushed = true;
      session.setParagraphEditDraft(para.id, [
        { type: 'p', children: [{ type: 'text', text: 'From flush' }] },
      ]);
    });
    session.saveBlockEditor();
    expect(flushed).toBe(true);
    const saved = session.blocks().find((b) => b.id === para.id);
    expect(
      saved?.type === 'paragraph' &&
        saved.body[0]?.children[0]?.type === 'text' &&
        saved.body[0].children[0].text === 'From flush',
    ).toBe(true);
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
    session.updateGlobals({ secondaryColor: '#112233' });
    session.updateBrand({ stars: { symbol: '✦', count: 3 } });
    expect(session.globals().secondaryColor).toBe('#112233');
    expect(session.globals().brand.stars).toEqual({ symbol: '✦', count: 3 });
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
