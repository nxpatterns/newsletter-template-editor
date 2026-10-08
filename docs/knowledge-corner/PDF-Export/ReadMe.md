# Client-side PDF export: field notes

A practical field guide for **developers** and **product managers** who need a "Download / Export as PDF" feature in a web app - any app, not only email or newsletters.

It compresses hard-won lessons from building a **frontend-only**, MIT, static-hosted editor (no PDF microservice). Use it so you do not rediscover the same traps in the same order.

**Audience:** engineers implementing print/PDF; PMs deciding fidelity vs. one-click download vs. mobile; agents and humans reading for decision trees.

**Not a library tutorial.** Prefer contracts, failure modes, and product language over API trivia that rots.

---

## Why this is harder than it looks

Users say: "Just export PDF."

What they mean is usually a bundle of incompatible wishes:

| Wish | Hidden cost |
| --- | --- |
| Looks exactly like the screen | Screen CSS ≠ print CSS; DPI, colour, fonts, chrome |
| One click, file in Downloads | Needs a **Blob** (bytes). Browser print gives a **dialog**, not a Blob |
| Selectable text, small file | Needs a **layout engine** that understands your HTML/CSS - or you rebuild layout |
| Same bytes on every device | Needs controlled fonts + engine (often **server** or second renderer) |
| Works on iPhone | iOS has no honest "Save as PDF" parallel to desktop Chrome |
| Free, MIT, no backend | Rules out Puppeteer-in-the-repo and most commercial SDKs |

**First principle (client-side):**

> No mainstream MIT browser library lays out *arbitrary* HTML/CSS into a high-fidelity **vector** PDF the way the browser's own print pipeline does. Everything else **repaints** a subset of CSS, **rasterizes** pixels, or forces you to **describe layout twice**.

If you remember only one sentence, remember that.

---

## Product questions before technology

Answer these in writing. Skipping them is how teams ship jsPDF in week one and rewrite in month three.

### What is the PDF *for*?

| Role | Good enough bar | Bad fit |
| --- | --- | --- |
| **Proof** ("show the client") | Looks right on desktop; slight font variance OK | Bit-identical CI archives |
| **Archive** ("file it") | Stable enough over months; searchable nice | Weekly redesign of CSS |
| **Deliverable** ("contract attachment") | Controlled fonts, stable layout, often server | Pure `window.print` dialog |
| **Print shop** | CMYK, bleed, marks - specialist tools | Browser PDF |

### Do you need a Blob?

- **Yes** (attach to mail API, upload, zip, silent download with your filename): browser print alone is not enough unless the *user* saves from the dialog.
- **No** (user is present and can use the system print sheet): guided **Save as PDF** is often the best quality/cost trade.

### Who owns fidelity?

| Owner | Implication |
| --- | --- |
| **Browser** | Best CSS fidelity; worst control (headers, fonts, dialog UX) |
| **Your second renderer** | Best control; permanent drift vs. the on-screen UI |
| **Server (Chromium)** | Best "same HTML → same PDF" for teams that can run infra |
| **Rasterizer** | Best "screenshot honesty"; worst text/search/size |

### Frontend-only vs server rendering

```text
                    Need identical PDF on every device?
                              │
              ┌───────────────┴───────────────┐
              no                              yes
              │                               │
     Can you run a server?              Fonts + engine locked
              │                         (Chromium headless or
     ┌────────┴────────┐                 commercial stack)
     no               yes
     │                 │
 Client paths      Server path
 (below)           (below)
```

**Frontend-only (static host, MIT, no Node PDF worker)**

- Allowed: `window.print`, client libraries (jsPDF, pdfmake, html2canvas-pro, ...), Web Worker pure JS.
- Forbidden in spirit if you promised "no backend": hiding Puppeteer behind a "tiny" API still creates ops, auth, cost, and abuse surface.
- Honest PM line: "Desktop Save as PDF; mobile best-effort."

**Server rendering (Playwright / Puppeteer / dedicated PDF service)**

- Strengths: one Chromium, your HTML, your CSS, optional font embedding, Blob/stream to the client, CI can regenerate goldens.
- Costs: host, queue, timeouts, URL allowlists, HTML injection, multi-tenant isolation, cold starts.
- Still not magic: you must feed **print-ready HTML** (or a dedicated template). Dumping a live SPA with login cookies is a different product.

**Hybrid**

- Server for "official" PDF; client print for quick proof.
- Or: client generates HTML; server only prints that HTML string (smaller attack surface than full page capture).

Pick the hybrid **on purpose**. Accidental hybrids ("print on desktop, jsPDF on mobile") need two test matrices.

---

## The three client architectures

Name them clearly so PMs and engineers share vocabulary.

### Path A - Browser print (guided Save as PDF)

**Mechanism:** build a **print document** → show it in a controlled browsing context → `print()` → user chooses Save as PDF / printer.

**Strengths**

- Zero or near-zero dependencies
- Real vector text (when the engine does)
- Full browser CSS for *that* document (tables, your inline styles, system fonts)
- Matches "what the browser already knows how to paint"

**Weaknesses**

- No silent Blob; filename is best-effort (`<title>` / host title)
- Browser headers/footers (URL, date, page numbers) unless margins starve them
- Dialog UX differs by OS; iOS is a different product surface
- Fonts = whatever is installed (Georgia on Mac ≠ Linux CI)
- You do not control duplex, tray, or "user cancelled"

**When to choose:** proof/archive for present users; static MIT apps; HTML already table- or document-shaped.

### Path B - Raster PDF (screenshot → images in a PDF shell)

**Mechanism:** paint DOM to canvas (html2canvas-pro, modern-screenshot, ...) → slice pages → `jsPDF.addImage` / pdf-lib embed.

**Strengths**

- One-click Blob and filename under app control
- Can look "exactly like pixels on screen" (when the painter is faithful)

**Weaknesses**

- Text is pixels: fat files, no search, blurry small type unless scale is high
- WebKit canvas area limits → tiling is mandatory at 2×, not optional
- Page breaks cut through lines unless you tile on **structural** boundaries
- Maintenance and CVE surface (especially if you take the `html()` kitchen sink)
- Worst fit for **text-heavy** documents (articles, newsletters, contracts)

**When to choose:** labelled fallback ("Image PDF"); canvas-native UIs; never as the only path for long prose without a PM-visible quality warning.

### Path C - Second layout engine (declarative PDF)

**Mechanism:** map your domain model to jsPDF primitives, pdfmake doc definition, PDFKit, etc. - **not** "HTML in, PDF out."

**Strengths**

- Real text, small files, stable across devices if you embed fonts
- Blob + filename
- Testable without a browser print dialog

**Weaknesses**

- You maintain **two** layouts forever (UI HTML vs PDF)
- Font licensing (you cannot ship Georgia/Arial as TTF just because CSS names them)
- Bundle weight (fonts + engine)
- Tables, wrapping, and "make it look like the email" become a project

**When to choose:** contractual deliverables, invoices, certificates, regulated archives.

### Path S - Server Chromium (for completeness)

**Mechanism:** queue HTML (or URL) → headless Chrome `page.pdf()` → store or stream.

**Strengths:** best "same HTML" fidelity under your control; automation-friendly.

**Weaknesses:** infra; security; still need print CSS; not free for static-only products.

---

## Path A deep dive (where most "simple" apps die)

If you choose browser print, treat it as a **mini product**, not a one-liner `window.print()`.

### Never print the live UI by accident

| Bad source | Why |
| --- | --- |
| The visible app shell | Sidebars, buttons, toasts, dark theme chrome |
| An editor canvas with handles | Selection outlines, drag ghosts, `position: absolute` tools |
| "Export HTML" that still contains server template tokens | Literal `{{ TrackView }}` in the PDF title/body |
| A `display: none` iframe "to hide it" | **Firefox prints blank** |

**Rule:** print a **dedicated document** built for print (or a resolved copy of your export HTML), not the interactive surface.

### Dedicated document checklist

- Real `<title>` for Save-as-PDF filename hints (sanitised stem)
- No editor-only classes or scripts
- No template language left unresolved
- Print CSS: colour adjust, page size/margins, break rules, hide preheaders/noise
- Links: decide real URLs vs `#` vs hide service rows
- Images: inlined or same-origin; CORS kills canvas *and* can stall print

### Offscreen carrier (iframe)

**Do**

- Same-origin document (`srcdoc` or blob URL you control)
- Keep the iframe **in the layout tree**: fixed off-canvas, opacity 0, not `display: none`
- `aria-hidden="true"`, `tabindex="-1"`
- Create the iframe **eagerly** at service start; await initial `about:blank` `load` once
- Call `print()` only after the **srcdoc navigation** `load` (or equivalent ready)
- Prefer **one persistent** iframe for the app session

**Do not**

- Destroy the iframe on a timer when the sheet might still be open (classic "iOS iframe print is broken" report was often **lifecycle**, not platform impossibility)
- Rely on **host** `afterprint` when you called `iframe.contentWindow.print()` - printing events fire on the **printed document's window**, not ancestors
- Call `contentWindow.focus()` "to help print" - it strands keyboard users in an invisible frame; engines do not need it
- Bind `afterprint` immediately after assigning `srcdoc` - you may still hold the **old** `Window`; bind **after** `load`

### Session lifecycle (service-shaped)

A robust client print service roughly needs:

```text
printing flag ── set synchronously before any await
session seq   ── ignore stale afterprint / timers
produceHtml() ── owned inside the service (covers slow logo/work)
srcdoc load   ── timeout (e.g. 5s), reject cleans up
afterprint    ── on iframe window, finish session
fallback timer ── long (60s+), only unsticks if afterprint never comes
finally       ── on failure: restore title, clear flag, clear timer
```

**In-flight guard:** second "Export" while a sheet is open must no-op (resolve void) or disable Confirm. Chrome will ignore or throw on re-entrant `print()`.

**Promise semantics:** `print()` may block until the dialog closes (Chromium/Firefox-ish) or return immediately (Safari-ish). **Never** drive "success" UI off that promise. Use the `printing` flag for busy state. There is no reliable "user saved the PDF" signal.

**Accepted edge:** if the user leaves Safari's sheet open longer than the fallback, a second job can navigate the iframe under the open sheet. Session tokens stop **title/flag corruption**; they do not freeze the first sheet. Document as v1-accepted or make the fallback several minutes (cheap).

### Filename

- Set **both** print-document `<title>` and temporarily the **host** `document.title` to the same sanitised stem; restore host title when the session finishes.
- Which one Save-as-PDF uses is engine-dependent - dual set is cheap insurance.
- Sanitisers often fold case and punctuation (`CloudLib Q4` → something like `Cloudlib-Q4`). Tests must expect the **folded** form.
- Optional fields (`campaignSubject?: string`): never `.trim()` without null checks; pass through helpers that accept `string | null | undefined`.

### Print CSS that actually matters

**Colour**

```css
html {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
```

Without this, many engines "save ink" and drop dark backgrounds. Historical quirk: some engines still refused **body** backgrounds even with `exact` - lab it; design white-paper + coloured **column** if body is unreliable.

**Page**

```css
@page {
  size: A4;    /* or omit for locale default; support varies */
  margin: 0;   /* often suppresses browser header/footer chrome in Chromium */
}
```

Zero margin means pages 2+ may start at the physical edge (padding on the first box does not repeat as a page margin). Fine for screen PDF proof; rough for physical printers - say so in PM copy.

**Breaks**

```css
/* WRONG if you have one outer wrapper <tr> around the whole document:
   tr { break-inside: avoid; }
   → browser may treat the entire doc as one unbreakable row (blank page 1, then forced break).
*/

/* RIGHT: scope to the rows you actually want to keep together */
table.email-container > tbody > tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

HTML parsers insert `tbody`. Nested tables inside a cell usually need no extra rule. Rows taller than a page **will** break anyway; engines fragment tables differently - lab Chrome vs Firefox.

**Cascade order**

If base CSS sets `body { background: ... !important }` and print CSS sets white `!important` with the same specificity, **source order wins**. Put print rules **after** base rules in the print document. Unit-test string order.

**White paper vs full-bleed dark**

| Choice | Seller gets | Watch-outs |
| --- | --- | --- |
| Full-bleed brand colour | Preview-like pages | Toner cost if printed; body bg may not paint → white strip on last page |
| White paper + brand column | Familiar "document on paper" | Need selectors that beat outer wrappers; column colours still need `exact` |

These couple with header/footer strategy: full-bleed often wants `margin: 0` anyway (headers "free"); white paper can still use `margin: 0` with inner padding.

### Touch and mobile (PM-critical)

| Platform | Reality |
| --- | --- |
| Desktop Chrome / Edge | Save as PDF is normal |
| Desktop Safari / Firefox | Dialogs differ; headers toggles buried |
| Android Chrome | Often has Save as PDF; good field-sales path |
| iOS Safari | No desktop-like destination; Share → Save to Files / print-sheet Share; pinch-out flows on older iOS |
| iPad | May pretend to be Mac in UA; prefer pointer/hover media over naive UA |

**Product options**

- **Guide:** menu everywhere; platform-specific short copy
- **Warn:** "Best on desktop"
- **Hide on coarse pointer:** zero iOS lab dependency; loses Android PDF
- **Top-level tab on touch:** Blob URL page + Safari share PDF - popup blockers, leaves the app

**Desktop-first** is a valid lock. Write it down so criteria tables do not claim "works everywhere" while UX is desktop-shaped.

### Accessibility

- Offscreen iframe: `aria-hidden`, out of tab order
- Do not steal focus into it
- Confirm button disabled while `printing`
- Dialog copy must not assume "Save as PDF" wording on every OS

---

## Path B and C traps (short)

### jsPDF `html()`

- Clones into the **host** DOM; your document `<head>` CSS often does not apply; host app styles can leak
- Goes through html2canvas (or global override); shadows/gradients often die in the PDF shim
- Text can be real PDF text (not always a pure screenshot - do not spread the myth either way without checking your version)
- Pin modern versions; never pass raw user strings into `addJS` / AcroForm / annotation APIs (injection CVEs have happened)
- Dynamic `import()` so the first third-party runtime is not on the critical path

### html2canvas vs html2canvas-pro vs foreignObject screenshots

- Upstream html2canvas 1.4.x is effectively frozen - avoid new work
- html2canvas-pro: actively maintained fork; better modern colour functions; still a **repaint** model
- modern-screenshot / html-to-image: browser paints via SVG foreignObject → pixels; WebKit first-draw misses and CORS are common

If Path B is a **WebKit fallback**, prefer the painter that fails less on WebKit - do not pick the smallest package by gzip alone.

### pdfmake / primitives

- You are rewriting layout
- Standard 14 fonts are WinAnsi-ish; Turkish, emoji, many scripts need embeds
- Microsoft core fonts in CSS stacks ≠ license to embed TTF in the app
- OFL metric-compatible families (e.g. Gelasio/Tinos/Arimo class) if you must embed

### html2pdf.js style wrappers

- Often pin old html2canvas and slice pages aggressively
- "Works on my demo" ≠ works on your table email

---

## Server rendering notes

When Path S is allowed:

- Prefer **HTML string in** over **URL fetch** of a logged-in SPA (auth, CSRF, third-party scripts)
- Use the same print CSS as client Path A when sharing templates
- `page.pdf({ printBackground: true or false, preferCSSPageSize: true })` - know what you are proving
- Queue + timeout + max HTML size + sanitisation
- Multi-tenant: no shared filesystem paths for user HTML
- CI goldens: freeze Chromium version

Playwright `page.pdf()` in CI is a **Chromium** proxy. It does not certify Safari or Firefox print. Useful; not sufficient.

---

## Fonts, CI, and "why does CI PDF look different?"

| Context | Expectation |
| --- | --- |
| User macOS/Windows with Georgia installed | Brand serif may match design |
| Linux CI image | Often **no** Georgia → fallback serif; **not a test failure** for Path A |
| Path C with embedded OFL | CI can match if you ship the same files |

Do not install proprietary Microsoft fonts into CI to "fix" Path A. That confuses licensing and still will not match every user laptop.

If legal/design requires identical glyphs worldwide, you have left Path A's comfort zone (embed or server).

---

## Testing strategy

### String / unit tests (print HTML factory)

Assert on the **string** (or DOM parse), not spies on same-module internal calls (ESM locals are not spyable reliably):

- No leftover template tokens
- No editor chrome markers
- Expected `<title>` stem (folded)
- Print CSS present and **after** base CSS
- Break selector scoped correctly
- Optional `data-render-mode="print"` on a root node for non-export modes only (keep pure export HTML byte-clean if another system consumes it)
- If preview also gains `data-render-mode="preview"`, update snapshots/BDD in the **same** change

### Service tests

- In-flight: second call resolves void
- Load timeout restores title and clears flag
- Session token ignores stale timer
- Eager iframe: first print not blank

### Device lab (minimum desktop gate example)

| Check |
| --- |
| Brand colours with `print-color-adjust` |
| Paper choice (white vs full-bleed) looks intentional |
| Headers/footers acceptable with your `@page` margins |
| Filename sensible |
| First open has CSS (no "print twice") |
| Breaks do not blank page 1 via outer wrapper row |
| Focus not trapped; title restore timing on Safari |
| Double export safe |
| Failure paths do not stick the menu disabled |

Mobile/Android/iOS: separate matrix; do not block desktop ship if product is desktop-first - but then **say** desktop-first.

---

## Security and abuse (all paths)

| Risk | Mitigation |
| --- | --- |
| HTML injection into print doc | Treat as privileged HTML pipeline; escape user fields |
| jsPDF annotation/JS injection | Pin versions; never pass raw input into dangerous APIs |
| Server URL print | Allowlist; no file://; authz |
| Huge images / infinite pages | Size caps; timeouts |
| Pixel tracking in "print HTML" | Strip trackers in print mode |

---

## Licensing quick map (non-exhaustive, verify yourself)

| Approach | Typical license posture |
| --- | --- |
| Browser print | No library |
| jsPDF, pdfmake, pdf-lib forks | Often MIT - still read current NOTICE |
| html2canvas / pro | MIT - check maintenance |
| MuPDF.js | AGPL - usually incompatible with closed SaaS without policy |
| Commercial viewers/exporters | Paid terms |

Font files are a **separate** license from JS libraries. CSS `font-family: Georgia` uses the user's installed font; embedding Georgia.ttf in your repo is another matter.

---

## Decision table (PM + tech lead)

| Constraint | Lean toward |
| --- | --- |
| Static host, MIT, no backend | Path A guided print |
| Must attach PDF bytes to API | Path B (honest quality) or C or S |
| Text-heavy marketing email / article | A or C - not B as primary |
| Invoice / certificate | C or S |
| "Looks like our Angular theme" | A on a dedicated doc, or S - not jsPDF `html()` on the live app root |
| Field sales on Android | A with guide copy; lab Android Chrome |
| Field sales on iPhone only | A with Share copy, or hide, or top-level tab - budget UX research |
| Pixel-perfect multi-device | S or C with embedded fonts |

---

## Anti-patterns checklist

- `window.print()` on the SPA root "because it is one line"
- `display: none` print iframe
- Printing unresolved CMS/email template tokens
- Bare `tr { break-inside: avoid }` on a full-page wrapper row
- Host `afterprint` for iframe print
- 2 second timer to "cleanup" on Safari
- Success toast "PDF saved" after `print()` returns
- jsPDF `html()` as default for long text without a quality review
- Shipping html2pdf that pins dead html2canvas
- Promising iOS parity with desktop without a lab note
- Installing proprietary fonts in CI to chase Path A goldens
- Re-opening architecture every sprint instead of locking Path + three product locks (paper, mobile, one API)

---

## Suggested lock set (copy into your ADR)

When your team is ready to stop debating:

1. **Architecture lock:** A / B / C / S (and what is forbidden)
2. **Paper lock:** full-bleed vs white + column; `@page` margins; page size
3. **Mobile lock:** desktop-first or not; guide / warn / hide / tab
4. **API lock:** one function builds print HTML; one service prints it; nothing else

Everything else is implementation detail under those locks.

---

## Mental model for agents and future readers

When asked to "add PDF export":

1. Ask role of PDF (proof / archive / deliverable) and Blob requirement.
2. Ask frontend-only vs server allowed.
3. Propose Path A/B/C/S with one sentence each and a recommendation.
4. If Path A: insist on dedicated document, persistent offscreen iframe, print CSS, session lifecycle, desktop-first honesty.
5. If Path B: demand quality label and tiling plan.
6. If Path C: demand font plan and drift tests against UI.
7. If Path S: demand threat model and queue design.
8. Refuse success toasts that lie.
9. Write lab gates before the menu item ships.

---

## Glossary

| Term | Meaning |
| --- | --- |
| **Blob PDF** | Bytes you can download/upload without the print dialog |
| **Print document** | HTML built only for printing/PDF, not the live UI |
| **Guided print** | UI that tells the user how to Save as PDF on their OS |
| **Raster PDF** | PDF whose pages are images |
| **Second renderer** | Domain → PDF layout separate from HTML UI |
| **print-color-adjust** | CSS hint to keep backgrounds in print |
| **Session token** | Monotonic id so stale timers cannot finish the wrong job |

---

## Provenance

Distilled from a real frontend-only newsletter/template editor effort (static MIT app, table-based HTML email, no Puppeteer in-repo), including multi-pass review of print-service lifecycle (iframe load races, `afterprint` target window, in-flight guards, Safari timer behaviour, scoped `break-inside`, CI font expectations).

Re-verify library versions, CVE IDs, and WebKit bug statuses when you implement - this document teaches **shape**, not eternal pin numbers.

---

## One-line gift

**If you can live with a print dialog, let the browser lay out a dedicated print document; if you need a Blob, pay for raster quality loss, a second layout, or a server - and never pretend those three are the same feature.**
