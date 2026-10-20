import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NewsletterSession } from '../editor/newsletter-session.service';
import {
  ConfirmDialogService,
  type ChoiceDialogRequest,
  type ChoiceResult,
} from '../ui/confirm-dialog/confirm-dialog.service';
import { type LeaveTarget, type LeaveTargetInfo, UnsavedGuardService } from './unsaved-guard.service';

describe('UnsavedGuardService', () => {
  let guard: UnsavedGuardService;
  let confirm: ConfirmDialogService;
  let session: {
    dirty: ReturnType<typeof signal<boolean>>;
    libraryId: ReturnType<typeof signal<string | null>>;
    displayName: () => string;
    discardChanges: ReturnType<typeof vi.fn>;
    saveToLibrary: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorage.clear();
    session = {
      dirty: signal(true),
      libraryId: signal<string | null>('xy'),
      displayName: () => 'Newsletter XY',
      discardChanges: vi.fn(async () => undefined),
      saveToLibrary: vi.fn(async () => true),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: NewsletterSession, useValue: session }] });
    guard = TestBed.inject(UnsavedGuardService);
    confirm = TestBed.inject(ConfirmDialogService);
  });

  /** Ask, capture the dialog request, answer it; returns the request and the guard result. */
  async function ask(
    next: LeaveTarget | undefined,
    target: LeaveTargetInfo | undefined,
    answer: ChoiceResult,
    onCancel?: () => void,
  ): Promise<{ req: ChoiceDialogRequest; ok: boolean }> {
    const result = guard.allowLeave(next, target, onCancel);
    await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('choice'));
    const req = confirm.pending() as unknown as ChoiceDialogRequest;
    confirm.completeChoice(answer);
    return { req, ok: await result };
  }

  it('lets through without a question when nothing is unsaved', async () => {
    session.dirty.set(false);
    await expect(guard.allowLeave('open', { id: 'abc', name: 'ABC' })).resolves.toBe(true);
    expect(confirm.pending()).toBeNull();
  });

  const CASES: { label: string; next?: LeaveTarget; target?: LeaveTargetInfo; targetChip?: string }[] = [
    { label: 'open another saved template', next: 'open', target: { id: 'abc', name: 'Newsletter ABC' }, targetChip: 'Newsletter ABC' },
    { label: 'reopen the same template', next: 'open', target: { id: 'xy', name: 'Newsletter XY' } },
    { label: 'open a file', next: 'open', target: { name: 'issue-42.json' }, targetChip: 'issue-42.json' },
    { label: 'start a new template', next: 'new' },
    { label: 'go to the start page', next: 'home' },
    { label: 'default (route guard)', next: undefined },
  ];

  for (const c of CASES) {
    describe(c.label, () => {
      it('asks a warning question naming the templates, with an explanation per button', async () => {
        const { req } = await ask(c.next, c.target, 'cancel');
        expect(req.tone).toBe('warning');
        const chips = (req.bodyParts ?? []).filter((p) => p.chip);
        expect([...new Set(chips.filter((p) => p.chip === 'dirty').map((p) => p.text))]).toEqual(['Newsletter XY']);
        expect(chips.filter((p) => p.chip === 'name').map((p) => p.text)).toEqual(c.targetChip ? [c.targetChip] : []);
        expect((req.bodyParts ?? []).map((p) => p.text).join('')).toBe(req.body);
        expect(req.body).not.toMatch(/\{(name|target|want|then)\}/);
        for (const hint of [req.altHint, req.confirmHint, req.cancelHint]) {
          expect(hint).toBeTruthy();
          expect(hint).not.toMatch(/\{(name|target|want|then)\}/);
        }
        expect(req.altHint).toContain('Newsletter XY');
        expect(req.confirmHint).toContain('Newsletter XY');
        if (c.targetChip) {
          expect(req.altHint).toContain(c.targetChip);
          expect(req.confirmHint).toContain(c.targetChip);
        }
        for (const label of [req.altLabel, req.confirmLabel, req.cancelLabel]) {
          expect(label).not.toContain('Newsletter');
          expect(label.split(/\s+/).length).toBe(1);
        }
      });

      it('Cancel stops and reports the cancel', async () => {
        const onCancel = vi.fn();
        const { ok } = await ask(c.next, c.target, 'cancel', onCancel);
        expect(ok).toBe(false);
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(session.discardChanges).not.toHaveBeenCalled();
        expect(session.saveToLibrary).not.toHaveBeenCalled();
      });

      it('Discard drops the changes and continues', async () => {
        const onCancel = vi.fn();
        const { ok } = await ask(c.next, c.target, 'alt', onCancel);
        expect(ok).toBe(true);
        expect(session.discardChanges).toHaveBeenCalledTimes(1);
        expect(session.saveToLibrary).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
      });

      it('Save stores the changes and continues', async () => {
        const onCancel = vi.fn();
        const { ok } = await ask(c.next, c.target, 'confirm', onCancel);
        expect(ok).toBe(true);
        expect(session.saveToLibrary).toHaveBeenCalledTimes(1);
        expect(session.discardChanges).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
      });
    });
  }

  it('the question text differs per case', async () => {
    const bodies = new Set<string>();
    for (const c of CASES.slice(0, 5)) bodies.add((await ask(c.next, c.target, 'cancel')).req.body);
    expect(bodies.size).toBe(5);
  });

  describe('never saved before', () => {
    beforeEach(() => session.libraryId.set(null));

    it('Save asks for a name, then stores it as new', async () => {
      const result = guard.allowLeave('new');
      await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('choice'));
      confirm.completeChoice('confirm');
      await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('prompt'));
      confirm.completePrompt('Autumn');
      await expect(result).resolves.toBe(true);
      expect(session.saveToLibrary).toHaveBeenCalledWith({ asNew: true, name: 'Autumn' });
    });

    it('cancelling the name prompt stops, but is not the Cancel answer', async () => {
      const onCancel = vi.fn();
      const result = guard.allowLeave('new', {}, onCancel);
      await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('choice'));
      confirm.completeChoice('confirm');
      await vi.waitFor(() => expect(confirm.pending()?.mode).toBe('prompt'));
      confirm.completePrompt(null);
      await expect(result).resolves.toBe(false);
      expect(session.saveToLibrary).not.toHaveBeenCalled();
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  it('a failed save does not continue', async () => {
    session.saveToLibrary.mockResolvedValueOnce(false);
    const { ok } = await ask('open', { id: 'abc', name: 'ABC' }, 'confirm');
    expect(ok).toBe(false);
  });
});
