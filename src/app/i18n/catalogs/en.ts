import type { MessageCatalog } from '../types';

export const EN: MessageCatalog = {
  'shell.title': 'Newsletter Template Editor',
  'shell.subtitle': 'ListMonk-style HTML email · demo brand CloudLib.EU',
  'action.save': 'Save',
  'action.reset': 'Reset seed',
  'action.panelToggle': 'Toggle side panel',
  'action.locale': 'Switch language',
  'locale.en': 'EN',
  'locale.de': 'DE',
  'footer.impressum': 'Impressum',
  'footer.privacy': 'Privacy',
  'footer.about': 'About',
  'footer.version': 'Application version',
  'snackbar.saved': 'Newsletter saved locally',
  'snackbar.reset': 'Demo seed restored',
  'snackbar.dismiss': 'Dismiss',
  'panel.placeholder': 'Side panel (blocks & inspector) — coming next.',
  'panel.hint': 'Docked on wide screens; overlay toggle on narrow ones.',
  'preview.label': 'Email preview',
  'modal.close': 'Close',
  'impressum.title': 'Legal Notice',
  'impressum.intro':
    'This is a hobby project by Ing. E. Buelbuel BSc. and serves as a demonstration of web technologies. It is not a commercial project and no products or services are offered. I am currently funding it entirely out of my own pocket.',
  'impressum.coffee':
    'If you enjoy the website and would like to support me, feel free to buy me a coffee:',
  'impressum.thanks': 'Thank you very much!',
  'impressum.techTitle': 'Technologies',
  'impressum.techBody':
    'This is a client-side web application for authoring ListMonk-style HTML email templates. The demo runs in your browser (Angular). Newsletter draft and UI preferences stay on your device via localStorage unless you export files yourself.',
  'impressum.legalTitle': 'Information pursuant to § 5 TMG, § 5 ECG, and § 25 MedienG',
  'impressum.operator': 'Operator & Media Owner:',
  'impressum.operatorLines':
    'Fa. Ing. E. Buelbuel BSc.\nnxpatterns@gmail.com\nAustrian GISA number: 28698869\nUID: ATU68196579',
  'impressum.represented': 'Represented by:',
  'impressum.representedLines':
    'Rössner & Miel Wirtschaftstreuhandges.m.b.H\nKienmayergasse 19, 1140 Vienna\nTel - 01 / 9827210\nFax - 01 / 982721018',
  'impressum.courtLines':
    'Company registration number FN 115771 b\nCommercial Court Vienna\nChamber of Tax Consultants\nATU 16069607',
  'impressum.creditsTitle': 'Open Source Credits',
  'impressum.creditsBody':
    'Angular — MIT License\nhttps://angular.dev\n\nPlaywright / playwright-bdd — Apache-2.0 / MIT as applicable',
  'privacy.title': 'Privacy',
  'privacy.prefsTitle': 'Local UI preferences (browser storage)',
  'privacy.prefsIntro':
    'To restore your last UI choices and newsletter draft on the next visit, this application stores small objects in your browser via the Web Storage API (localStorage).',
  'privacy.key': 'Storage keys (examples): newsletter-template-editor.locale.v1 and the newsletter draft key used by the editor.',
  'privacy.stored':
    'What may be stored: UI locale, newsletter JSON draft (blocks + globals you edit), and similar editor preferences — never payment data and never analytics identifiers.',
  'privacy.notStored':
    'What is not stored by this app on servers: no images uploaded to a backend (there is none in the static demo), no fingerprints, no IP logging by this client app.',
  'privacy.where':
    'Where it lives: only on your device, in this browser profile. The static demo does not transmit this data to our servers.',
  'privacy.remove':
    'How to remove it: clear site data for this origin in your browser settings, or delete the keys under DevTools → Application → Local Storage.',
  'privacy.necessary':
    'This storage is used solely to keep the tool usable the way you left it. You can wipe it at any time as described above.',
  'privacy.analyticsTitle': 'Analytics',
  'privacy.analyticsBody':
    'This application does not use analytics services, tracking cookies, fingerprinting, or third-party measurement (including GoatCounter or similar).',
  'about.title': 'About',
  'about.lead':
    'Free MIT editor for ListMonk-style HTML email templates. Build block-based newsletters in the browser, preview them safely, and export shell/body HTML for ListMonk.',
  'about.demo':
    'The public demo ships with CloudLib.EU Glacier defaults. Brand, colors, logo, and legal footer are configuration — not locked into the renderer.',
  'about.local':
    'Local-first: drafts live in your browser storage. No account required for the static GitHub Pages demo.',
  'about.repo': 'Source code and issues:',
  'about.repoUrl': 'https://github.com/nxpatterns/newsletter-template-editor',
  'about.back': 'Back to editor',
};
