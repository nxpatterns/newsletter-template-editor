import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmDialogService, type ChoiceDialogRequest } from './confirm-dialog.service';

const CHOICE: ChoiceDialogRequest = {
  title: 'T',
  body: 'You want to open ABC, but XY still has unsaved changes.',
  bodyParts: [
    { text: 'You want to open ' },
    { text: 'ABC', chip: 'name' },
    { text: ', but ' },
    { text: 'XY', chip: 'dirty' },
    { text: ' still has unsaved changes.' },
  ],
  altLabel: 'Discard',
  altHint: 'alt hint',
  confirmLabel: 'Save',
  confirmHint: 'save hint',
  cancelLabel: 'Cancel',
  cancelHint: 'cancel hint',
};

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let service: ConfirmDialogService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ConfirmDialogService);
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
  });

  const el = <T extends Element = HTMLElement>(sel: string) => fixture.nativeElement.querySelector(sel) as T | null;
  const all = (sel: string) => [...fixture.nativeElement.querySelectorAll(sel)] as HTMLElement[];
  const show = () => fixture.detectChanges();
  const tone = () => el('.confirm-dialog')?.getAttribute('data-tone');

  describe('head shows the kind of dialog', () => {
    it('choice is a warning', () => {
      void service.choose(CHOICE);
      show();
      expect(tone()).toBe('warning');
      expect(el('.confirm-tone-tile svg')).not.toBeNull();
      expect(el('[data-testid="confirm-tone"]')?.textContent?.trim()).not.toBe('');
    });

    it('prompt is info', () => {
      void service.prompt({ title: 'T', inputLabel: 'L', initialValue: '', confirmLabel: 'OK', cancelLabel: 'C' });
      show();
      expect(tone()).toBe('info');
    });

    it('plain confirm is info', () => {
      void service.confirm({ title: 'T', body: 'B', confirmLabel: 'OK', cancelLabel: 'C' });
      show();
      expect(tone()).toBe('info');
      expect(el('.confirm-dialog')?.getAttribute('role')).toBe('dialog');
    });

    it('danger confirm is danger', () => {
      void service.confirm({ title: 'T', body: 'B', confirmLabel: 'Delete', cancelLabel: 'C', danger: true });
      show();
      expect(tone()).toBe('danger');
    });

    it('irreversible confirm is danger and an alert dialog', () => {
      void service.confirm({ title: 'T', body: 'B', confirmLabel: 'OK', cancelLabel: 'C', warning: true });
      show();
      expect(tone()).toBe('danger');
      expect(el('.confirm-dialog')?.getAttribute('role')).toBe('alertdialog');
    });

    it('an explicit tone wins', () => {
      void service.confirm({ title: 'T', body: 'B', confirmLabel: 'OK', cancelLabel: 'C', danger: true, tone: 'warning' });
      show();
      expect(tone()).toBe('warning');
    });

    it('each tone has its own icon and label', () => {
      const seen = new Map<string, { icon: string; label: string }>();
      for (const t of ['info', 'warning', 'danger'] as const) {
        void service.confirm({ title: 'T', body: 'B', confirmLabel: 'OK', cancelLabel: 'C', tone: t });
        show();
        seen.set(t, {
          icon: el('.confirm-tone-icon')!.innerHTML,
          label: el('[data-testid="confirm-tone"]')!.textContent!.trim(),
        });
      }
      expect(new Set([...seen.values()].map((v) => v.icon)).size).toBe(3);
      expect(new Set([...seen.values()].map((v) => v.label)).size).toBe(3);
    });
  });

  describe('choice layout', () => {
    beforeEach(() => {
      void service.choose(CHOICE);
      show();
    });

    it('buttons carry only their short labels, never the explanations', () => {
      const text = (id: string) => el(`[data-testid="${id}"]`)!.textContent!.trim();
      expect(text('confirm-alt')).toBe(CHOICE.altLabel);
      expect(text('confirm-ok')).toBe(CHOICE.confirmLabel);
      expect(text('confirm-cancel')).toBe(CHOICE.cancelLabel);
      for (const btn of all('.confirm-foot button')) {
        expect(btn.children.length).toBe(0);
        for (const hint of [CHOICE.altHint, CHOICE.confirmHint, CHOICE.cancelHint]) {
          expect(btn.textContent).not.toContain(hint);
        }
      }
    });

    it('explanations sit in one list above the buttons, discard, save, cancel', () => {
      const list = el('[data-testid="confirm-outcomes"]')!;
      expect(list.closest('footer')).toBeNull();
      const rows = all('[data-testid="confirm-outcomes"] li');
      expect(rows.map((li) => li.lastElementChild!.textContent)).toEqual([
        CHOICE.altHint,
        CHOICE.confirmHint,
        CHOICE.cancelHint,
      ]);
    });

    it('footer order is cancel, discard, save', () => {
      expect(all('.confirm-foot button').map((b) => b.dataset['testid'])).toEqual([
        'confirm-cancel',
        'confirm-alt',
        'confirm-ok',
      ]);
    });

    it('names both templates as chips, the unsaved one marked', () => {
      const chips = all('.confirm-text .confirm-name');
      expect(chips.map((c) => c.textContent)).toEqual(['ABC', 'XY']);
      expect(chips[0].classList.contains('confirm-name--dirty')).toBe(false);
      expect(chips[1].classList.contains('confirm-name--dirty')).toBe(true);
      expect(el('.confirm-text')!.textContent).toBe(CHOICE.body);
    });
  });

  it('without explanations there is no outcome list', () => {
    void service.choose({ ...CHOICE, altHint: undefined, confirmHint: undefined, cancelHint: undefined });
    show();
    expect(el('[data-testid="confirm-outcomes"]')).toBeNull();
  });

  describe('each button resolves its own answer', () => {
    for (const [id, answer] of [
      ['confirm-cancel', 'cancel'],
      ['confirm-alt', 'alt'],
      ['confirm-ok', 'confirm'],
    ] as const) {
      it(`${id} → ${answer}`, async () => {
        const result = service.choose(CHOICE);
        show();
        el<HTMLButtonElement>(`[data-testid="${id}"]`)!.click();
        await expect(result).resolves.toBe(answer);
      });
    }
  });
});
