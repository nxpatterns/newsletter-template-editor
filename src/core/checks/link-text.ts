/** Link texts that say nothing about the target (compared trimmed, lower case, without end marks). */
const VAGUE_LINK_TEXTS = new Set([
  'hier',
  'hier klicken',
  'klicken sie hier',
  'klick hier',
  'mehr',
  'link',
  'click here',
  'click',
  'here',
  'more',
]);

export function isVagueLinkText(text: string): boolean {
  return VAGUE_LINK_TEXTS.has(text.trim().toLowerCase().replace(/[.!:…»›→]+$/u, '').trim());
}
