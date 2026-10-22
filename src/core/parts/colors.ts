import type { ColorTarget } from '../colors/edit';
import type { ColorRole } from '../colors/model';
import type { ColorSlotDef } from '../colors/slots';
import type { Block } from '../types';
import { activeDesign, type FreeBlockData, type LayoutNode, type TextRole } from './model';

/**
 * Color slots of a free block, derived from its active design: the block background plus one
 * slot per colored property of a part (`<part id>.<what>`). They work exactly like the slots of
 * a built-in type: a role follows the template, a fixed value stays (decisions 14, 19, 35).
 */

/** Default role of a text by what it is. */
export const TEXT_ROLE_COLOR: Readonly<Record<TextRole, ColorRole>> = {
  headline: 'head',
  subline: 'head',
  body: 'body',
  label: 'accent',
  badge: 'accent',
  price: 'head',
  name: 'head',
  quote: 'head',
  small: 'dim',
};

/** Root cell of a free block; carries the block background like `.content-bg` of built-in blocks. */
export const FREE_ROOT_CLASS = 'fb-root';
export const nodeClass = (id: string): string => `fn-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

const sel = (id: string, rest = '') => `.${nodeClass(id)}${rest}`;

/** Text roles of the leaves a design shows, for the default color of a text slot. */
type RoleOf = (part: string, listId: string | null) => TextRole;

function nodeSlots(nodes: readonly LayoutNode[], on: string, roleOf: RoleOf, listId: string | null, out: ColorSlotDef[]): void {
  for (const n of nodes) {
    let surface = on;
    if (n.bg && n.kind !== 'button' && n.kind !== 'icon') {
      surface = `${n.id}.bg`;
      out.push({ key: surface, role: 'surface', kind: 'fill', css: [{ sel: sel(n.id), prop: 'background-color' }], attr: true });
    }
    if (n.border && n.border !== '0' && n.kind !== 'button' && n.kind !== 'divider') {
      out.push({ key: `${n.id}.border`, role: 'line', kind: 'line', css: [{ sel: sel(n.id), prop: 'border-color' }] });
    }
    switch (n.kind) {
      case 'section':
      case 'box':
        nodeSlots(n.children, surface, roleOf, listId, out);
        break;
      case 'columns':
        for (const c of n.columns) nodeSlots(c.children, surface, roleOf, listId, out);
        break;
      case 'list':
        nodeSlots(n.item, surface, roleOf, n.collection, out);
        break;
      case 'text':
        out.push({
          key: `${n.id}.text`,
          role: TEXT_ROLE_COLOR[roleOf(n.part, listId)],
          kind: 'text',
          on: surface,
          css: [{ sel: sel(n.id, ' .fp-p'), prop: 'color' }],
        });
        break;
      case 'button': {
        const variant = n.variant ?? 'filled';
        if (variant === 'filled') {
          out.push({ key: `${n.id}.fill`, role: 'btn', kind: 'fill', css: [{ sel: sel(n.id, ' .fp-btn-cell'), prop: 'background-color' }], attr: true });
        }
        if (variant === 'outline') {
          out.push({ key: `${n.id}.border`, role: 'btn', kind: 'line', css: [{ sel: sel(n.id, ' .fp-btn-cell'), prop: 'border-color' }] });
        }
        out.push({
          key: `${n.id}.text`,
          role: variant === 'filled' ? 'btnText' : 'link',
          kind: 'text',
          on: variant === 'filled' ? `${n.id}.fill` : surface,
          css: [{ sel: sel(n.id, ' a.fp-btn-link'), prop: 'color' }],
        });
        break;
      }
      case 'icon':
        if (n.circle) {
          out.push({ key: `${n.id}.circle`, role: 'surface', kind: 'fill', css: [{ sel: sel(n.id, ' .fp-icon-cell'), prop: 'background-color' }], attr: true });
        }
        out.push({ key: `${n.id}.icon`, role: 'link', kind: 'mark', css: [{ sel: sel(n.id, ' .fp-icon'), prop: 'color' }] });
        break;
      case 'divider':
        out.push({ key: `${n.id}.line`, role: 'line', kind: 'line', css: [{ sel: sel(n.id, ' .fp-divider'), prop: 'border-top-color' }] });
        break;
      default:
        break;
    }
  }
}

/** Every color slot of a free block; `on` points to the nearest colored surface. */
export function freeColorSlots(data: FreeBlockData): ColorSlotDef[] {
  const roles = new Map<string, TextRole>();
  for (const p of data.content.parts) if (p.kind === 'text') roles.set(p.id, p.role);
  const listRoles = new Map<string, Map<string, TextRole>>();
  for (const c of data.content.collections) {
    const m = new Map<string, TextRole>();
    for (const item of c.items) for (const p of item.parts) if (p.kind === 'text') m.set(p.id, p.role);
    listRoles.set(c.id, m);
  }
  // Inside a list the leaf names a part of the item by its id there (shared by every item).
  const roleOf: RoleOf = (part, listId) => (listId ? listRoles.get(listId)?.get(part) : roles.get(part)) ?? 'body';
  const out: ColorSlotDef[] = [
    { key: 'background', role: 'content', kind: 'fill', css: [{ sel: `.${FREE_ROOT_CLASS}`, prop: 'background-color' }], attr: true },
  ];
  nodeSlots(activeDesign(data).children, 'background', roleOf, null, out);
  return out;
}

/** The color target of a placed block; free blocks carry their own slots. */
export function colorTargetOf(block: Block): ColorTarget {
  return block.type === 'free' ? { id: block.id, type: block.type, slots: freeColorSlots(block) } : { id: block.id, type: block.type };
}
