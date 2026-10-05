# AGENTS.md

> Read this file FIRST in every session. It tells you what this project is,
> how things work, and where to look — so you never have to guess.

## Project in One Sentence

Newsletter Template Editor for Listmonk with an example CloudLib.EU template.

## Absolute rule — secrets and env

**No env files in this repo. Ever.** Not `.env`, not `.env.example`, not “gitignored local” files.

## Documentation

General: Do not use numbering in (sub)section titles.
Every document must be written in ENGLISH only.

### Session notes

Long analysis, trade-offs, and agreed decisions from agent/human work sessions are written to disk so they can be followed without scrolling chat history.

- **Directory:** `docs/sessions/`
- **Filename pattern:** `YYYY-MM-DD--HH-MM--Short-Title.md`
  - Date and time (local machine time)
  - `HH-MM` is the approximate start of the session write (24h).
  - `File Example:` like `2026-09-30--09-03--Stack-Analysis-Session.md`
- **When to create a file:** when the user asks to “write it into the session file” or similar, put the substance in `docs/sessions/…` and keep the chat reply brief with the path.
