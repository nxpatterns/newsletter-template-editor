import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a single message and replaces on second show', () => {
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
});
