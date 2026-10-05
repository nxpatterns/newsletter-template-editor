import { defaultGlobals } from './brand/defaults';
import { createBlock, CURRENT_SCHEMA_VERSION, type Newsletter } from './types';

/** Small CloudLib-flavored seed — proves render pipeline only. */
export function seedNewsletter(): Newsletter {
  const hero = createBlock('hero');
  if (hero.type === 'hero') {
    hero.label = 'CloudLib.EU';
    hero.headlineHtml = 'Newsletter template editor';
  }

  const paragraph = createBlock('paragraph');
  if (paragraph.type === 'paragraph') {
    paragraph.html =
      'MIT-licensed block editor for ListMonk-style HTML email. Demo brand is CloudLib.EU — fully overridable via config.';
  }

  const cta = createBlock('cta-button');
  if (cta.type === 'cta-button') {
    cta.text = 'Visit CloudLib.EU';
    cta.href = 'https://cloudlib.eu';
  }

  const divider = createBlock('divider');

  const globals = defaultGlobals();
  globals.preheader = 'CloudLib newsletter demo — customize every token.';
  globals.campaignSubject = 'CloudLib.EU — Newsletter demo';

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    globals,
    blocks: [hero, paragraph, divider, cta],
  };
}
