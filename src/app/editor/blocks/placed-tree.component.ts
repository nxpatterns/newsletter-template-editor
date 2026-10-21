import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  output,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import type { Block, FramePart } from '../../../core';
import { LocaleService } from '../../i18n/locale.service';
import { NewsletterSession, type EditorPanelTab } from '../newsletter-session.service';
import { PanelJump } from '../panel/panel-jump.service';
import { PANEL_TAB_ICONS } from '../panel/panel-tab-icons';
import { blockTypeHue, blockTypeIcon, type BlockTypeHue } from './block-catalog';
import {
  buildOverview,
  FRAME_PART_INFO,
  hasMissing,
  leafCount,
  shownLeafCount,
  type JumpTarget,
  type OverviewGroup,
  type OverviewNode,
  type RouteStep,
} from './overview-tree';

/** UI-only open/closed branches (localStorage), shared by every template; never exported. */
export const TREE_COLLAPSED_KEY = 'newsletter-template-editor.tree-collapsed.v1';
const DEFAULT_COLLAPSED = ['head', 'foot'];
/** Chapter ids pile up across templates; keep the newest ones only. */
const MAX_STORED = 200;

/** Below this canvas width the columns stack and every branch is drawn as an elbow. */
const STACK_REM = 34;

const TAB_NAME_KEYS: Record<EditorPanelTab, string> = {
  placed: 'panel.tab.placed.full',
  catalog: 'panel.tab.catalog.full',
  campaign: 'panel.tab.campaign',
  brand: 'panel.tab.brand',
  legal: 'panel.tab.legal',
  social: 'panel.tab.social.full',
  colors: 'panel.tab.colors',
};

/** Where a whole group or the links branch is edited (the status line names the tabs). */
const GROUP_TARGETS: Record<string, JumpTarget> = {
  head: { tab: 'brand', testId: 'brand-fields' },
  foot: { tab: 'legal', testId: 'legal-fields' },
  links: { tab: 'legal', testId: 'legal-links' },
};

interface StatusLine {
  name: string;
  route: string;
  tab: EditorPanelTab;
  /** Set for header/footer; blocks go to the list instead. */
  target: JumpTarget | null;
  blockId: string | null;
}

/**
 * Read-only org chart of the newsletter: header, content and footer as columns with drawn branches.
 * Nothing is edited here; the status line says where each part is edited and jumps there.
 */
@Component({
  selector: 'app-placed-tree',
  imports: [NgTemplateOutlet],
  templateUrl: './placed-tree.component.html',
  styleUrl: './placed-tree.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacedTreeComponent {
  protected readonly i18n = inject(LocaleService);
  protected readonly session = inject(NewsletterSession);
  private readonly jump = inject(PanelJump);

  /** Emits the block to select when the user wants to edit it in the list. */
  readonly openList = output<string | null>();

  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');
  private readonly lines = viewChild<ElementRef<SVGSVGElement>>('lines');

  protected readonly groups = computed(() =>
    buildOverview(this.session.blocks(), this.session.globals()),
  );
  /** Header and footer start closed; content, chapters and links start open. */
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly collapsed = signal<ReadonlySet<string>>(this.readCollapsed());
  /** Node the pointer or focus is on; the status line describes it. */
  protected readonly pointed = signal<string | null>(null);

  protected readonly status = computed((): StatusLine | null => {
    const id = this.pointed() ?? this.session.selectedBlockId();
    return id ? this.describe(id) : null;
  });

  protected readonly leafCount = leafCount;
  protected readonly hasMissing = hasMissing;

  constructor() {
    afterRenderEffect({
      write: () => {
        this.groups();
        this.collapsed();
        this.i18n.locale();
        this.drawLines();
      },
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const el = this.canvas()?.nativeElement.closest('.tree-pane');
      if (!el || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => this.drawLines());
      ro.observe(el);
      destroyRef.onDestroy(() => ro.disconnect());
    });

    effect(() => this.writeCollapsed(this.collapsed()));

    // A block picked in the preview opens its branch, so the highlight is never hidden.
    // The selection a template opens with must not undo the stored branch state.
    let initial = true;
    effect(() => {
      const id = this.session.selectedBlockId();
      if (initial) {
        initial = false;
        return;
      }
      if (!id) return;
      const chapter = this.chapterOf(id);
      this.collapsed.update((set) => {
        if (!set.has('body') && (!chapter || !set.has(chapter))) return set;
        const next = new Set(set);
        next.delete('body');
        if (chapter) next.delete(chapter);
        return next;
      });
    });
  }

  protected isOpen(id: string): boolean {
    return !this.collapsed().has(id);
  }

  protected toggle(id: string): void {
    this.pointed.set(id);
    this.collapsed.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected point(id: string): void {
    this.pointed.set(id);
  }

  protected onPointer(event: Event): void {
    const id = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-node]')?.dataset[
      'node'
    ];
    if (id && id !== 'root' && id !== this.pointed()) this.pointed.set(id);
  }

  protected selectBlock(id: string): void {
    this.pointed.set(id);
    this.session.selectBlock(id);
  }

  protected openStatus(s: StatusLine): void {
    if (s.target) this.jump.go(s.target);
    else this.openList.emit(s.blockId);
  }

  protected groupMeta(g: OverviewGroup): string {
    if (g.id === 'body')
      return this.i18n.t('tree.count.blocks', { n: this.session.blocks().length });
    return this.i18n.t('tree.count.shown', { n: shownLeafCount(g), total: leafCount(g) });
  }

  protected tabName(tab: EditorPanelTab): string {
    return this.i18n.t(TAB_NAME_KEYS[tab]);
  }

  protected tabIcon(tab: EditorPanelTab): readonly string[] {
    return PANEL_TAB_ICONS[tab];
  }

  protected partGlyph(part: FramePart): string {
    return FRAME_PART_INFO[part].glyph;
  }

  protected partTab(part: FramePart): EditorPanelTab {
    return FRAME_PART_INFO[part].target.tab;
  }

  protected partLabel(part: FramePart): string {
    return this.i18n.t(FRAME_PART_INFO[part].labelKey);
  }

  protected blockLabel(type: Block['type']): string {
    return this.i18n.t(`block.${type}`);
  }

  protected icon(type: Block['type']): string {
    return blockTypeIcon(type);
  }

  protected hue(type: Block['type']): BlockTypeHue {
    return blockTypeHue(type);
  }

  private readCollapsed(): ReadonlySet<string> {
    if (!this.browser) return new Set(DEFAULT_COLLAPSED);
    try {
      const raw = localStorage.getItem(TREE_COLLAPSED_KEY);
      if (raw === null) return new Set(DEFAULT_COLLAPSED);
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set(DEFAULT_COLLAPSED);
      return new Set(parsed.filter((x): x is string => typeof x === 'string' && x.length < 120));
    } catch {
      return new Set(DEFAULT_COLLAPSED);
    }
  }

  private writeCollapsed(set: ReadonlySet<string>): void {
    if (!this.browser) return;
    try {
      localStorage.setItem(TREE_COLLAPSED_KEY, JSON.stringify([...set].slice(-MAX_STORED)));
    } catch {
      // quota / private mode
    }
  }

  private route(steps: readonly RouteStep[]): string {
    return steps
      .map((s) => (s.n ? `${s.n} ${this.i18n.t(s.key)}` : this.i18n.t(s.key)))
      .join(' › ');
  }

  private findNode(id: string): OverviewNode | null {
    const walk = (nodes: readonly OverviewNode[]): OverviewNode | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.kind !== 'part') {
          const hit = walk(n.children);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(this.groups());
  }

  private chapterOf(blockId: string): string | null {
    const body = this.groups().find((g) => g.id === 'body');
    for (const n of body?.children ?? []) {
      if (n.kind === 'block' && n.children.some((c) => c.id === blockId)) return n.id;
    }
    return null;
  }

  private describe(id: string): StatusLine | null {
    const n = this.findNode(id);
    if (!n) return null;
    const list = `${this.i18n.t('panel.tab.placed.full')} › ${this.i18n.t('placed.view.list')}`;
    switch (n.kind) {
      case 'part': {
        const info = FRAME_PART_INFO[n.part];
        return {
          name: this.partLabel(n.part),
          route: this.route(info.route),
          tab: info.target.tab,
          target: info.target,
          blockId: null,
        };
      }
      case 'block':
        return {
          name: this.blockLabel(n.block.type),
          route: list,
          tab: 'placed',
          target: null,
          blockId: n.id,
        };
      case 'links':
        return {
          name: this.i18n.t('tree.links'),
          route: this.route([{ key: 'panel.tab.legal' }, { key: 'legal.groupLinks' }]),
          tab: 'legal',
          target: GROUP_TARGETS['links'],
          blockId: null,
        };
      case 'group':
        if (n.id === 'body')
          return {
            name: this.i18n.t('tree.group.body'),
            route: list,
            tab: 'placed',
            target: null,
            blockId: null,
          };
        return {
          name: this.i18n.t(`tree.group.${n.id}`),
          route: n.tabs.map((t) => this.tabName(t)).join(', '),
          tab: n.tabs[0],
          target: GROUP_TARGETS[n.id],
          blockId: null,
        };
    }
  }

  /** Draws the branches: elbows from the root to the columns, then elbows down each column; thinner toward the tips. */
  private drawLines(): void {
    const cv = this.canvas()?.nativeElement;
    const svg = this.lines()?.nativeElement;
    if (!cv || !svg) return;
    const box = cv.getBoundingClientRect();
    const rem = parseFloat(getComputedStyle(cv.ownerDocument.documentElement).fontSize) || 16;
    const paneWidth = cv.closest('.tree-pane')?.getBoundingClientRect().width ?? box.width;
    const stacked = paneWidth < STACK_REM * rem;
    const rel = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        l: r.left - box.left,
        t: r.top - box.top,
        b: r.bottom - box.top,
        cx: r.left + r.width / 2 - box.left,
        cy: r.top + r.height / 2 - box.top,
      };
    };
    svg.setAttribute('width', String(cv.scrollWidth));
    svg.setAttribute('height', String(cv.scrollHeight));
    const paths: string[] = [];
    cv.querySelectorAll<HTMLElement>('[data-parent]').forEach((el) => {
      const parentEl = cv.querySelector(`[data-node="${CSS.escape(el.dataset['parent'] ?? '')}"]`);
      if (!parentEl) return;
      const p = rel(parentEl);
      const c = rel(el);
      const depth = Number(el.dataset['depth'] ?? 1);
      const width = Math.max(1.2, 3 - (depth - 1) * 0.6).toFixed(1);
      let d: string;
      if (!stacked && depth === 1) {
        const ym = p.b + (c.t - p.b) / 2;
        d = `M${p.cx} ${p.b} V${ym} H${c.cx} V${c.t}`;
      } else {
        const x0 = p.l + 10;
        const r = Math.min(7, Math.max(0, c.cy - p.b));
        d = `M${x0} ${p.b} V${c.cy - r} Q${x0} ${c.cy} ${x0 + r} ${c.cy} H${c.l}`;
      }
      const hue = el.dataset['hue'];
      paths.push(
        `<path d="${d}" stroke-width="${width}"${hue ? ` stroke-opacity="0.65" style="stroke:${hue}"` : ''}/>`,
      );
    });
    svg.innerHTML = paths.join('');
  }
}
