# AGENTS.md

> Read this file FIRST in every session. It tells you what this project is,
> how things work, and where to look — so you never have to guess.

## Project in One Sentence

Newsletter Template Editor for Listmonk with an example CloudLib.EU template.

## Absolute rule — secrets and env

**No env files in this repo. Ever.** Not `.env`, not `.env.example`, not “gitignored local” files.

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
- One task, one fresh session. Start each new independent task in a fresh thread/session with small context; never keep feeding a long session. Decisions live in project memory and repo docs, not chat history.

If a session starts burning many steps on something that should be a two-edit change, you are doing it wrong — simplify and finish.


## Task size and workflow

State the size in your first reply; the maintainer may override it.

| Size | Scope | Before building | Tests |
| --- | --- | --- | --- |
| S | text, label, color, spacing, removing an element, bug in one file | nothing; state the key assumption in one line; no mockups | affected tests only |
| M | new element in an existing style | assumptions plus at most 5 numbered questions, each with a recommendation; ask once "mockups or build directly?" (default: build directly) | affected and new tests; harden the new ones |
| L | new pattern or feature | numbered questions, concept doc, then 3 mockup variants; build only after explicit OK | affected and new tests; full hardening |

- UI work: read `docs/guidelines/ui-principles.md` first.
- Hardening = `--repeat-each 40` plus a negative check against a deliberately broken app, only for tests new or changed in the task.
- Run affected tests with a quiet reporter (failures only). CI/CD runs the full suite before every deployment.
- BDD port: env var `BDD_PORT` (default 4173), set inline. Use another free port when another BDD run may be active.
- Threads: a new task or area gets a new thread; follow-ups in the same area stay in the existing one. Say when a fresh context would be better.

## Commits and branches

- Commit freely on your own branch named `YYYY-MM-DD--HH-MM--short-task-slug` (local time), e.g. `2026-10-21--14-20--bdd-port`. Rename an auto-created worktree branch with `git branch -m`.
- Never commit on `main`. Never push. No pull requests before v1.0.
- When the task is done, name the branch and say it is ready to merge; the maintainer merges.
- Git-ignored files (`docs/sessions/`, `.claude/settings.local.json`) do not travel with a branch; write them in the main checkout.

## Documentation

General: Do not use numbering in (sub)section titles.
Language: see **Absolute rule — English only** above.

### Session notes

Long analysis, trade-offs, and agreed decisions from agent/human work sessions are written to disk so they can be followed without scrolling chat history.

- **Directory:** `docs/sessions/cache`
- **Filename pattern:** `YYYY-MM-DD--HH-MM--Short-Title.md`
  - Date and time (local machine time)
  - `HH-MM` is the approximate start of the session write (24h).
  - `File Example:` like `2026-09-30--09-03--Stack-Analysis-Session.md`
- **When to create a file:** when the user asks to “write it into the session file” or similar, put the substance in `docs/sessions/cache…` and keep the chat reply brief with the path.
