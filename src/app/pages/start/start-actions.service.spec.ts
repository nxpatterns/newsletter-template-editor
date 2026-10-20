import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NewsletterSession } from '../../editor/newsletter-session.service';
import { ConfirmDialogService, type ChoiceResult } from '../../ui/confirm-dialog/confirm-dialog.service';
import { StartActionsService } from './start-actions.service';

describe('StartActionsService unsaved-changes nudge', () => {
  let actions: StartActionsService;
  let confirm: ConfirmDialogService;
  let navigate: ReturnType<typeof vi.fn>;
  let session: {
    dirty: ReturnType<typeof signal<boolean>>;
    libraryId: ReturnType<typeof signal<string | null>>;
    displayName: () => string;
    routeId: () => string;
    discardChanges: ReturnType<typeof vi.fn>;
    saveToLibrary: ReturnType<typeof vi.fn>;
    openLibraryEntry: ReturnType<typeof vi.fn>;
    startNew: ReturnType<typeof vi.fn>;
    hydrateFromStorage: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    navigate = vi.fn(async () => true);
    session = {
      dirty: signal(true),
      libraryId: signal<string | null>('xy'),
      displayName: () => 'Newsletter XY',
      routeId: () => session.libraryId() ?? 'draft',
      discardChanges: vi.fn(async () => undefined),
      saveToLibrary: vi.fn(async () => true),
      openLibraryEntry: vi.fn(async () => true),
      startNew: vi.fn(async () => undefined),
      hydrateFromStorage: vi.fn(async () => true),
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: NewsletterSession, useValue: session },
        { provide: Router, useValue: { navigate } },
      ],
    });
    actions = TestBed.inject(StartActionsService);
    confirm = TestBed.inject(ConfirmDialogService);
  });

  /** Open another saved template and answer the unsaved-changes question. */
  async function openAndAnswer(answer: ChoiceResult): Promise<void> {
    const done = actions.openSaved('abc');
    await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('choice'));
    confirm.completeChoice(answer);
    await done;
  }

  it('Cancel stays on the start page and nudges the not-saved card', async () => {
    await openAndAnswer('cancel');
    expect(actions.draftNudge()).toBe(1);
    expect(session.openLibraryEntry).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('Discard drops the changes and opens the template without a nudge', async () => {
    await openAndAnswer('alt');
    expect(actions.draftNudge()).toBe(0);
    expect(session.discardChanges).toHaveBeenCalled();
    expect(session.openLibraryEntry).toHaveBeenCalledWith('abc');
    expect(navigate).toHaveBeenCalled();
  });

  it('Save stores the changes and opens the template without a nudge', async () => {
    await openAndAnswer('confirm');
    expect(actions.draftNudge()).toBe(0);
    expect(session.saveToLibrary).toHaveBeenCalled();
    expect(session.openLibraryEntry).toHaveBeenCalledWith('abc');
    expect(navigate).toHaveBeenCalled();
  });

  describe('starting a new template', () => {
    async function startAndAnswer(answer: ChoiceResult): Promise<void> {
      const done = actions.startNew('demo', 'de');
      await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('choice'));
      confirm.completeChoice(answer);
      await done;
    }

    it('Cancel nudges and starts nothing', async () => {
      await startAndAnswer('cancel');
      expect(actions.draftNudge()).toBe(1);
      expect(session.startNew).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    for (const answer of ['alt', 'confirm'] as const) {
      it(`${answer} starts the new template without a nudge`, async () => {
        await startAndAnswer(answer);
        expect(actions.draftNudge()).toBe(0);
        expect(session.startNew).toHaveBeenCalledWith('demo', 'de');
        expect(navigate).toHaveBeenCalled();
      });
    }
  });

  it('nothing unsaved: opens at once, no question, no nudge', async () => {
    session.dirty.set(false);
    await actions.openSaved('abc');
    expect(confirm.pending()).toBeNull();
    expect(actions.draftNudge()).toBe(0);
    expect(navigate).toHaveBeenCalled();
  });

  describe('the template that holds the unsaved changes', () => {
    for (const dirty of [true, false]) {
      it(`continues it without a question (${dirty ? 'with' : 'without'} changes)`, async () => {
        session.dirty.set(dirty);
        await actions.openSaved('xy');
        expect(confirm.pending()).toBeNull();
        expect(session.hydrateFromStorage).toHaveBeenCalled();
        expect(session.openLibraryEntry).not.toHaveBeenCalled();
        expect(session.discardChanges).not.toHaveBeenCalled();
        expect(session.saveToLibrary).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(['/edit', 'xy']);
        expect(actions.draftNudge()).toBe(0);
      });
    }
  });

  it('every Cancel counts, so the card shakes again', async () => {
    await openAndAnswer('cancel');
    await openAndAnswer('cancel');
    expect(actions.draftNudge()).toBe(2);
  });
});
