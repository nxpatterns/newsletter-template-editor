# AGENTS.md

> Read this file FIRST in every session. It tells you what this project is,
> how things work, and where to look — so you never have to guess.

## Project in One Sentence

Newsletter Template Editor for Listmonk with an example CloudLib.EU template.

## Absolute rule — secrets and env

**No env files in this repo. Ever.** Not `.env`, not `.env.example`, not “gitignored local” files.

## Absolute rule — English only

**All project documents are written in English only** — including `AGENTS.md`, README, docs under `docs/`, session notes, comments in docs, and any new markdown you create.

Exception only when the user explicitly names another language for a specific artifact. Chat with the user may follow their language; repo documents do not.

## Absolute rule — release gate

**Before every release (version bump, tag, or deploy trigger): run the full local test suite and only proceed if it is green.**

Required locally, in order:

1. `npm test -- --watch=false`
2. `npm run test:bdd`

Do not tag, push a release commit, or rely on CI alone if either command fails or was skipped. CI is confirmation, not the first time the suite runs.

## Absolute rule — tests are signal-driven

**Never add fixed waits in tests** (`waitForTimeout`, `sleep`, `setTimeout`). Wait only on a real signal: a web-first assertion, an event, or a deterministic app state (e.g. `reducedMotion: 'reduce'` instead of waiting out animations). A flaky test is a bug; fix the cause, never pad the timing.

## Absolute rule — build after substantive changes

**After substantive code changes: verify the project builds before calling the work done.**

Run a local compile (`ng build` / the project’s usual build) and fix failures first. Do not treat unit/BDD runs or a running dev server as a substitute when TypeScript or imports may have broken. Skip only for trivial non-compile edits (copy-only i18n, comments) when clearly no graph change.

## Absolute rule — email styles: classes in source, inline only at HTML export

**Author newsletter markup with CSS/SCSS classes. Do not hand-write layout/typography as long `style="…"` strings in renderer source.**

- **App / renderer source / preview:** semantic classes + a real stylesheet (or generated CSS from one definition). Preview may keep a `<style>` block.
- **HTML export only:** if email clients require it, **bake** styles in at export time (CSS inliner → element `style` attributes; `bgcolor` where needed). Inlining is an export pipeline step, not a coding style for block templates.
- **Allowed exceptions in source:** minimal attributes email hard-requires even before inlining (e.g. `bgcolor` dual-write with class-driven background) — never dump full per-row layout CSS inline “because email”.
- **Do not** regress fixed blocks (e.g. benefits list) back to per-cell inline layout dumps.

When touching `src/core/render/`, prefer classes in `email-css.ts` / shared email CSS. Export runs `inlineEmailCss` / `inlineEmailCssFragment` in `renderExport` — do not copy-paste layout styles into every `render*` function.

## Absolute rule — effort matches the task

**Spend the minimum work that correctly finishes the request. Cheap tasks must stay cheap.**

- Match depth to scope. Swapping two buttons, renaming a label, or a one-line fix = open the relevant file(s), change it, done. No architecture tour, no multi-file archaeology, no long plans, no parallel research agents.
- Do not re-derive known project context. This file, nearby code, and the failing signal (test name, stack frame, screenshot) are enough for small work.
- One narrow path beats broad exploration. Prefer the direct file/symbol over repo-wide searches “just in case.”
- Stop when the ask is satisfied. Extra refactors, docs, releases, or “while I’m here” cleanups need an explicit user request.
- Tool calls are cost. Batch only what you need; do not fan out reads, greps, or shell commands that cannot change the answer for a trivial edit.

If a session starts burning many steps on something that should be a two-edit change, you are doing it wrong — simplify and finish.

## Documentation

General: Do not use numbering in (sub)section titles.
Language: see **Absolute rule — English only** above.

### Session notes

Long analysis, trade-offs, and agreed decisions from agent/human work sessions are written to disk so they can be followed without scrolling chat history.

- **Directory:** `docs/sessions/`
- **Filename pattern:** `YYYY-MM-DD--HH-MM--Short-Title.md`
  - Date and time (local machine time)
  - `HH-MM` is the approximate start of the session write (24h).
  - `File Example:` like `2026-09-30--09-03--Stack-Analysis-Session.md`
- **When to create a file:** when the user asks to “write it into the session file” or similar, put the substance in `docs/sessions/…` and keep the chat reply brief with the path.
