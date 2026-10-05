const CONFETTI_COLORS = [
  '#FFDD00',
  '#FFB700',
  '#FF6B6B',
  '#A8E6CF',
  '#6C5CE7',
  '#74B9FF',
  '#FDCB6E',
  '#FF9F43',
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnConfetti(anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 18; i += 1) {
    const el = document.createElement('span');
    const angle = rand(0, Math.PI * 2);
    const distance = rand(45, 115);
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - rand(35, 70);
    const rotation = rand(-200, 200);
    const duration = rand(650, 950);
    const delay = rand(0, 90);
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#FFDD00';
    const isCircle = Math.random() > 0.55;

    el.style.position = 'fixed';
    el.style.left = `${cx + rand(-10, 10)}px`;
    el.style.top = `${cy}px`;
    el.style.width = isCircle ? '5px' : `${Math.round(rand(4, 7))}px`;
    el.style.height = isCircle ? '5px' : `${Math.round(rand(8, 14))}px`;
    el.style.borderRadius = isCircle ? '50%' : '1px';
    el.style.background = color;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '9999';
    el.style.animationName = 'bmc-confetti-burst';
    el.style.animationDuration = `${Math.round(duration)}ms`;
    el.style.animationDelay = `${Math.round(delay)}ms`;
    el.style.animationFillMode = 'forwards';
    el.style.animationTimingFunction = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
    el.style.setProperty('--tx', `${Math.round(tx)}px`);
    el.style.setProperty('--ty', `${Math.round(ty)}px`);
    el.style.setProperty('--r', `${Math.round(rotation)}deg`);

    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), Math.round(duration + delay + 80));
  }
}

function spawnHeart(anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'bmc-heart';
  el.textContent = '🫶';
  el.style.position = 'fixed';
  el.style.left = `${rect.left + rect.width / 2}px`;
  el.style.top = `${rect.top}px`;
  el.style.zIndex = '9999';
  document.body.appendChild(el);
  window.setTimeout(() => el.remove(), 1350);
}

/** Confetti + heart on hover (image2colors parity). */
export function celebrateBmc(anchor: HTMLElement): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  spawnConfetti(anchor);
  spawnHeart(anchor);
}
