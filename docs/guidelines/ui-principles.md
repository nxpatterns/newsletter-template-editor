# UI Principles

Read this before any UI work. The users are non-technical sales and marketing people. Tokens and component specs live in `docs/concepts/design-system.md`.

## Words

- No info text inside buttons. Short labels; explanations go outside, as a helper line under the field or a sentence above the buttons.
- Plain words, no jargon. Seller-facing field names: Image address (src), Link target (href), Link text, Image description (alt, required), Caption. Never "URL", "Label" or "Alt text" in the UI.
- Address fields get a placeholder plus a helper line; `https://` is added on blur.
- Greetings are gender-neutral by default.

## Inputs

- Every single-line text input gets a clear X. Not for multiline, date, time or number fields.
- Delete is an X at the top right, with an 8 second undo.

## Color meaning

- A single tint means "block type". Never reuse a block-type tint for another concept.
- Other concepts use other signals: demo templates use flag stripes, saved templates a neutral icon, groups numbers, color-group cards steel blue, sage, sand and mauve. Status uses the status tokens (info, success, danger).

## Consistent style

- Menus, snackbar and dialogs share one style: glass surface, gradient header, icon tiles.
- Dialogs: header icon by type (info blue, warning amber, danger red), a box that states the consequences, short button labels.
- New chrome elements get a spec in `design-system.md` before code.

## Change management

- Mirror an existing pattern in the app before inventing a new one.
- Prefer small changes over overhauls. Never remove features or styles to meet a limit.

## Motion

- Every animation has a reduced-motion fallback (for example a glow instead of a shake). Test both: `reducedMotion: 'reduce'` and `'no-preference'`.
