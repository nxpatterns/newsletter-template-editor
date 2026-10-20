import { SNACKBAR_MAX_KEPT, SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the newest message on top of older ones', () => {
    const svc = new SnackbarService();
    svc.success('Saved');
    expect(svc.message()?.text).toBe('Saved');
    expect(svc.message()?.tone).toBe('success');

    svc.info('Next');
    expect(svc.message()?.text).toBe('Next');
    expect(svc.message()?.tone).toBe('info');
  });

  it('auto-dismisses after duration', () => {
    const svc = new SnackbarService();
    svc.info('Hello', 1000);
    expect(svc.message()).not.toBeNull();
    vi.advanceTimersByTime(1000);
    expect(svc.message()).toBeNull();
  });

  it('pause freezes remaining time and resume continues', () => {
    const svc = new SnackbarService();
    svc.info('Hello', 1000);
    vi.advanceTimersByTime(400);
    svc.pauseTimer();
    expect(svc.timerPaused()).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(svc.message()).not.toBeNull();
    svc.resumeTimer();
    expect(svc.timerPaused()).toBe(false);
    vi.advanceTimersByTime(599);
    expect(svc.message()).not.toBeNull();
    vi.advanceTimersByTime(2);
    expect(svc.message()).toBeNull();
  });

  it('dismiss clears current message', () => {
    const svc = new SnackbarService();
    svc.error('Boom');
    svc.dismiss();
    expect(svc.message()).toBeNull();
  });

  it('defaults to a 3s auto-dismiss window', () => {
    const svc = new SnackbarService();
    svc.success('Saved');
    expect(svc.message()?.durationMs).toBe(3000);
    vi.advanceTimersByTime(2999);
    expect(svc.message()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(svc.message()).toBeNull();
  });

  it('keeps up to ten older messages reachable, never more', () => {
    expect(SNACKBAR_MAX_KEPT).toBe(10);
    const svc = new SnackbarService();
    for (let i = 1; i <= SNACKBAR_MAX_KEPT + 1; i++) svc.info(`M${i}`, 8000);
    expect(svc.messages().length).toBe(SNACKBAR_MAX_KEPT);
    expect(svc.messages()[0].text).toBe('M2');
    expect(svc.position()).toBe(SNACKBAR_MAX_KEPT);
  });

  it('pages between kept messages and follows a new one', () => {
    const svc = new SnackbarService();
    svc.info('A', 8000);
    svc.info('B', 8000);
    svc.showOlder();
    expect(svc.message()?.text).toBe('A');
    expect(svc.position()).toBe(1);
    svc.showOlder();
    expect(svc.message()?.text).toBe('A');
    svc.showNewer();
    expect(svc.message()?.text).toBe('B');
    svc.showOlder();
    svc.info('C', 8000);
    expect(svc.message()?.text).toBe('C');
  });

  it('dismissing the shown message reveals the next kept one', () => {
    const svc = new SnackbarService();
    svc.info('A', 8000);
    svc.info('B', 8000);
    svc.dismiss();
    expect(svc.message()?.text).toBe('A');
    svc.dismiss();
    expect(svc.message()).toBeNull();
  });

  it('runs each kept message on its own timer', () => {
    const svc = new SnackbarService();
    svc.info('Undo A', 8000);
    vi.advanceTimersByTime(1000);
    svc.success('Saved');
    vi.advanceTimersByTime(3000);
    expect(svc.message()?.text).toBe('Undo A');
    vi.advanceTimersByTime(3999);
    expect(svc.message()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(svc.message()).toBeNull();
  });

  it('pause holds all kept messages, including one that arrives while paused', () => {
    const svc = new SnackbarService();
    svc.info('A', 1000);
    svc.pauseTimer();
    svc.info('B', 1000);
    vi.advanceTimersByTime(5000);
    expect(svc.messages().length).toBe(2);
    svc.resumeTimer();
    vi.advanceTimersByTime(1000);
    expect(svc.message()).toBeNull();
  });

  it('runAction closes only the shown message', () => {
    const svc = new SnackbarService();
    const run = vi.fn();
    svc.info('A', 8000);
    svc.show('B', 'info', 8000, { label: 'Undo', run });
    svc.runAction();
    expect(run).toHaveBeenCalledOnce();
    expect(svc.message()?.text).toBe('A');
  });
});
