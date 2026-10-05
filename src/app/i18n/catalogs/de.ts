import type { MessageCatalog } from '../types';

export const DE: MessageCatalog = {
  'shell.title': 'Newsletter Template Editor',
  'shell.subtitle': 'ListMonk-HTML-E-Mail · Demo-Marke CloudLib.EU',
  'action.save': 'Speichern',
  'action.reset': 'Demo zurücksetzen',
  'action.panelToggle': 'Seitenpanel ein-/ausblenden',
  'action.locale': 'Sprache wechseln',
  'locale.en': 'EN',
  'locale.de': 'DE',
  'footer.impressum': 'Impressum',
  'footer.privacy': 'Datenschutz',
  'footer.about': 'Über',
  'footer.version': 'Anwendungsversion',
  'snackbar.saved': 'Newsletter lokal gespeichert',
  'snackbar.reset': 'Demo-Seed wiederhergestellt',
  'snackbar.dismiss': 'Schließen',
  'panel.placeholder': 'Seitenpanel (Blöcke & Inspector) — folgt als Nächstes.',
  'panel.hint': 'Bei breiten Screens angedockt; bei schmalen als Overlay.',
  'preview.label': 'E-Mail-Vorschau',
  'modal.close': 'Schließen',
  'impressum.title': 'Impressum',
  'impressum.intro':
    'Das ist ein Hobbyprojekt von Ing. E. Buelbuel BSc. und dient der Demonstration von Webtechnologien. Es ist kein kommerzielles Projekt und es werden keine Produkte oder Dienstleistungen angeboten. Ich finanziere es aktuell ganz aus der eigenen Tasche.',
  'impressum.coffee':
    'Falls Ihnen die Webseite gefällt und Sie mich unterstützen möchten, können Sie mir gerne einen Kaffee spendieren:',
  'impressum.thanks': 'Haben Sie vielen herzlichen Dank!',
  'impressum.techTitle': 'Technologien',
  'impressum.techBody':
    'Das ist eine clientseitige Webanwendung zum Erstellen von ListMonk-tauglichen HTML-E-Mail-Vorlagen. Die Demo läuft im Browser (Angular). Newsletter-Entwurf und UI-Einstellungen bleiben auf Ihrem Gerät in localStorage, solange Sie nicht selbst Dateien exportieren.',
  'impressum.legalTitle': 'Angaben gemäß § 5 TMG, § 5 ECG und § 25 MedienG',
  'impressum.operator': 'Betreiber & Medieninhaber:',
  'impressum.operatorLines':
    'Fa. Ing. E. Buelbuel BSc.\nnxpatterns@gmail.com\nÖsterreichische GISA-Zahl: 28698869\nUID: ATU68196579',
  'impressum.represented': 'Vertreten durch:',
  'impressum.representedLines':
    'Rössner & Miel Wirtschaftstreuhandges.m.b.H\nKienmayergasse 19, 1140 Wien\nTel - 01 / 9827210\nFax - 01 / 982721018',
  'impressum.courtLines':
    'Firmenbuchnummer FN 115771 b\nHandelsgericht Wien\nKammer der Wirtschaftstreuhänder\nATU 16069607',
  'impressum.creditsTitle': 'Open-Source-Hinweise',
  'impressum.creditsBody':
    'Angular — MIT-Lizenz\nhttps://angular.dev\n\nPlaywright / playwright-bdd — Apache-2.0 / MIT je nach Paket',
  'privacy.title': 'Datenschutz',
  'privacy.prefsTitle': 'Lokale UI-Einstellungen (Browser-Speicher)',
  'privacy.prefsIntro':
    'Damit Ihre letzten UI-Einstellungen und der Newsletter-Entwurf beim nächsten Besuch wiederhergestellt werden, speichert diese Anwendung kleine Objekte in Ihrem Browser über die Web Storage API (localStorage).',
  'privacy.key':
    'Speicher-Schlüssel (Beispiele): newsletter-template-editor.locale.v1 und der Entwurfsschlüssel des Editors.',
  'privacy.stored':
    'Was gespeichert werden kann: UI-Sprache, Newsletter-JSON-Entwurf (Blöcke + Globals) und ähnliche Editor-Präferenzen — keine Zahlungsdaten und keine Analytics-Identifikatoren.',
  'privacy.notStored':
    'Was diese App nicht serverseitig speichert: keine Uploads an ein Backend (die statische Demo hat keines), kein Fingerprinting, kein IP-Logging durch diese Client-App.',
  'privacy.where':
    'Wo die Daten liegen: ausschließlich auf Ihrem Gerät, in diesem Browserprofil. Die statische Demo überträgt diese Daten nicht an unsere Server.',
  'privacy.remove':
    'Löschen: Websitedaten für diese Origin in den Browser-Einstellungen löschen oder die Schlüssel unter DevTools → Application → Local Storage entfernen.',
  'privacy.necessary':
    'Dieser Speicher dient ausschließlich dazu, das Werkzeug so vorzufinden, wie Sie es verlassen haben. Sie können die Daten jederzeit wie oben beschrieben entfernen.',
  'privacy.analyticsTitle': 'Analytics',
  'privacy.analyticsBody':
    'Diese Anwendung verwendet keine Analytics-Dienste, keine Tracking-Cookies, kein Fingerprinting und keine Drittanbieter-Messung (einschließlich GoatCounter oder Ähnlichem).',
  'about.title': 'Über',
  'about.lead':
    'Freier MIT-Editor für ListMonk-taugliche HTML-E-Mail-Vorlagen. Blockbasierte Newsletter im Browser bauen, sicher vorschauen und Shell-/Body-HTML für ListMonk exportieren.',
  'about.demo':
    'Die öffentliche Demo startet mit CloudLib.EU-Glacier-Defaults. Marke, Farben, Logo und Legal-Footer sind Konfiguration — nicht im Renderer fest verdrahtet.',
  'about.local':
    'Local-first: Entwürfe liegen im Browser-Speicher. Für die statische GitHub-Pages-Demo ist kein Konto nötig.',
  'about.repo': 'Quellcode und Issues:',
  'about.repoUrl': 'https://github.com/nxpatterns/newsletter-template-editor',
  'about.back': 'Zurück zum Editor',
};
