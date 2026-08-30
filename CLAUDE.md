# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

---

Everything below this line is carried forward from earlier deliverables in this
course. Rules specific to a past prototype have been dropped; what remains is
what held true regardless of what was being built.

## Verifying what you actually shipped

- **`pnpm check` does not prove the page looks right.** Typecheck, build, lint
  and the spec suite all pass on a page with a dead black band filling most of
  the viewport --- that exact bug shipped once and was caught only by looking at
  a real render
  ([`c8392bd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit1-Gera1t-2001/commit/c8392bdf8319d94e85433d576f15c5d19e99ecb7)).
- **Look at the built page at both marking viewports** --- 1920×1080 and
  390×844 --- not at whatever size the dev server window happens to be. A page
  can look fine at its natural content height while leaving most of a desktop
  viewport empty. The `agent-browser` CLI is the supported way to do this.
- **If the sandbox has no root and no browser**, a Chromium/Playwright shell can
  still be gotten without sudo: `apt-get download <pkg>` then
  `dpkg-deb -x <pkg>.deb .` to unpack the `.deb`s (fonts, missing shared libs
  such as `libnspr4`) into a local prefix, point the right env vars at it, and
  run Playwright against that. The working recipe, verified in an earlier repo:

  ```sh
  # One-time: the Playwright chromium in ~/.cache is missing three libs.
  mkdir -p ~/.local/chrome-libs && cd ~/.local/chrome-libs
  apt-get download libnspr4 libnss3 libasound2t64
  for d in *.deb; do dpkg-deb -x "$d" .; done

  # Every time:
  export LD_LIBRARY_PATH="$HOME/.local/chrome-libs/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH"
  CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
  pnpm build && pnpm preview --port 4173   # note the port it actually binds
  $CHROME --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --virtual-time-budget=6000 --window-size=1920,1080 \
    --screenshot=/tmp/desktop.png "http://localhost:<port>/"
  ```

- **Serve over HTTP, never `file://`.** A module script will not load from
  `file://` — the page renders as unstyled markup with no interface at all,
  which looks like a catastrophic bug and is only the protocol. `pnpm preview`
  also matches how GitHub Pages actually serves the site.
- **Check which port `pnpm preview` bound.** It silently moves to the next free
  port when 4173 is taken — including by a preview left running from another
  week's repo. Screenshotting the wrong port produces a perfect-looking render
  of last week's prototype.
- **If a state can be reached by a URL, verify it with a URL.** A second
  screenshot at a different address is cheaper and more reliable than driving a
  browser. On a site of pages that means one screenshot per page, at both
  viewports; for anything stateful, prefer encoding the state in the URL (a hash
  or a query) so that it stays screenshottable at all. A state you can only
  reach by clicking is a state you will stop checking.
- **Old-headless `--screenshot` does not report scroll position reliably when
  the URL carries a section fragment.** In an earlier prototype a screenshot of
  an in-page anchor came back as a uniform dark rectangle and looked exactly
  like a page that had failed to build its interface. It had not ---
  `--dump-dom` on the same URL showed every element present. In-page anchors are
  ordinary in a site of prose and links, so screenshot the plain page URL, and
  reach for `--dump-dom` before concluding that anything is missing.
- **A screenshot is evidence of what rendered, not of why.** When one looks
  wrong, get a second, independent reading — `--dump-dom`, a computed value, a
  test — before changing code. Two of the three "bugs" found by screenshot in
  an earlier repo were real; the third was the tool.
- **A red from a harness you wrote ten minutes ago is a claim about the
  harness.** The same rule as the screenshots, and it generalises past them: a
  CDP script driving the page reported a clean `FAIL: Back did not restore the
  closed set`, and the button it was supposedly testing was innocent. An `Enter`
  dispatched as `keyDown`/`keyUp` without the accompanying `char` event never
  makes Chrome synthesise the activation click, so nothing was ever pressed and
  the page under test never changed. That failure is **indistinguishable from a
  genuinely broken control** --- same output, same shape, same confidence.
  Before believing an ad-hoc sensor's red, make it report a case you already
  know is good: had the script asserted "the button fires at all" first, it
  would have named its own fault instead of the code's.
- **A false green needs a different demonstration, and it is the one to reach
  for.** The bullet above defends against a false red, and it is triggered by
  the red itself. Nothing triggers a false green: the sensor says the thing you
  hoped, so there is no moment where you stop and attribute it. That happened
  once when `Page.navigate` kept serving a cached bundle straight through
  `Network.setCacheDisabled`, and three consecutive measurements reported "no
  change" after a real change. Showing the sensor reports a *known-good case*
  does not catch that; a cached page passes the known-good case perfectly.
  **Show instead that the sensor responds to a deliberate change** --- edit the
  value, confirm the number moves, put it back; or read the identity of what
  was loaded (the bundle name, a version string) rather than only its
  behaviour. Two different demonstrations, and only the second one catches a
  stale read. A false green is the more dangerous of the two, because "nothing
  moved" is exactly what a fix that did not work looks like.
- **Cache-bust every CDP navigation.** `Page.navigate` to an
  already-visited URL reuses the cached bundle, and `Network.setCacheDisabled`
  did not stop it. A measurement then describes the *previous* build and
  reports "no change" after a change --- the same harness fault as a false red,
  pointing the other way, and harder to notice because "nothing moved" is what
  a broken fix looks like. Append a unique query (`/?b=${process.hrtime.bigint()}`)
  and confirm the loaded bundle name before believing any measurement of an
  edit.
- **Measure the property that is actually at risk.** A dormant layer was once
  tuned against the *shortest* leg of something, then shipped with the
  *thinnest* one rendering sub-pixel --- a different object, invisible at the
  phone viewport, and the fix for the first problem had made every element
  sub-pixel too. Two different failure modes are not the same failure, and
  looking at the render will not tell them apart; only per-element numbers
  will.
- **Say plainly what wasn't checked.** If a change was only verified by
  `pnpm check` and not by looking at a real render, say so instead of implying
  full verification. That gap is what let the viewport bug above ship in the
  first place.
- **A live sensor plus a real stimulus can still produce a null result, if the
  system under test was never started.** Verifying what Vite's HMR does to a
  live `AudioContext` took three probes. The first: `touch main.ts` with the
  HMR websocket connected --- no frames. The second: a genuine content change
  to `main.ts` --- still no frames. Both times the socket had returned
  `{"type":"connected"}`, so the sensor was provably live, and the second
  stimulus was provably real. The null was neither. **Vite only tracks modules
  a client has actually requested**, and nothing had ever loaded the page, so
  `main.ts` was not in the module graph and changing it affected nothing. After
  `fetch`ing `/` and `/main.ts` first, the same edit produced
  `{"type":"full-reload"}` immediately. Proving the sensor live is not the same
  as proving the *precondition* met --- when a null result arrives from a
  known-good sensor, the next question is whether the thing being measured was
  ever running.

## Assert what a value means, not how it is spelled

A test that compares a URL string, a formatted figure, or a DOM text literal is
asserting a **serialisation**, not a fact. It goes red when the spelling changes
for a reason the test does not care about — and, worse, it goes green when the
spelling happens to match while the meaning is wrong. Assert through whatever
function gives the value its meaning:

- A parsed/decoded structure (a `Set`, an object) against its expected value,
  never the raw serialised string against another string --- a string
  comparison *appears* to work, right up until the one case where the canonical
  form differs.
- The model's number, with `toBeCloseTo` against the underlying computation ---
  never the formatted string the readout happens to render.
- The identity of a DOM node, never a count of nodes. A count passes when the
  right *number* of wrong things is present, which is exactly the failure a tab
  order or a scroll target can have.

The tell: if you are about to write a string, a number-as-text, or a count into
an expectation, stop and ask what function turns that spelling back into the
thing it means. Assert on that instead. If no such function exists, that is
usually the bug --- the meaning has nowhere to live.

## Model choice for delegated work

- **Coding and execution** --- writing code, running checks, git operations ---
  default to whichever model the main session is already running. Don't spin up
  a subagent with a model override just to make a small edit or run a command.
- **Ideas, design discussion, and open-ended brainstorming**: when weighing a
  non-trivial choice (a design direction, an ambiguous trade-off, "what should
  this look like"), consult an Opus subagent to think it through or give a
  second opinion before settling on an approach, instead of only reasoning it
  out inline.
- **Review and verification that calls for real judgement** --- code review, or
  looking at a rendered page --- also goes to an Opus subagent, the way the
  viewport-fill bug was actually caught: `pnpm check` alone didn't see it, a
  dedicated Opus review pass did
  ([`c8392bd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit1-Gera1t-2001/commit/c8392bdf8319d94e85433d576f15c5d19e99ecb7)).

## Process Logging (for PROCESS.md / COMP4020)

### Language rule

Chat with the human may happen in any language, but every file committed to this
repo --- code, comments, commit messages, this CLAUDE.md, `process-log.md`,
`PROCESS.md`, `reflections/*.md` --- must be written in English.

### Logging rule

Log **after** the commit it describes, as part of preparing the **next** one ---
never before, because a commit's own hash doesn't exist until it exists, and a
citation to a commit that doesn't exist yet is not a citation. In practice: make
commit N; before commit N+1 is created, append N's entry to `process-log.md`
(create the file if it doesn't exist), citing N's real hash; that entry then
ships as part of N+1's diff. One entry per commit, no exceptions, even for a
trivial one. Never judge whether a commit is "significant enough" to log; the
commit itself is the trigger, not a guess about its importance. A session or
context window is not an observable event the way a commit is, and a single
session can span several commits (or a single piece of work can span several
sessions via context-window compaction) --- anchoring to the commit avoids both
a blurred multi-task entry and a task split across dangling half-entries.

This replaced a log-**before** rule that sounds cleaner but asks for the
impossible: citing a hash before it exists. Every real attempt at it in this
repo produced either a placeholder citation or --- twice, the same night --- a
commit made with no log entry at all, because there was nothing yet to write
one against. Log-after-with-a-real-hash removes the impossible step rather than
asking for more discipline against it.

Backstop: if a session (or context window) ends with a commit that has no log
entry yet, or with uncommitted work, or with a decision that never produced a
commit at all --- a rule change still under discussion, a review pass, a
rejected approach --- write the entry(ies) before ending, in the same format;
mark a no-commit decision `(no commit)`.

Tag each entry as one of:

- `[routine]` --- re-prompted until it passed; nothing structural changed
- `[harness]` --- a rule was added to CLAUDE.md, or a check/test was wired in,
  because of a recurring mistake
- `[discarded]` --- a plausible-looking output was rejected in favor of a
  different approach
- `[judgement]` --- a non-obvious scoping/design call was made

### Log entry format

Structure each entry around the four things a PROCESS.md moment needs, so it can
be lifted almost directly later:

- **Date/time:**
- **Tag:**
- **What happened:** the problem, or what the agent got wrong (1-2 sentences)
- **What I did instead of the obvious thing:** the call made, and why it beat
  the obvious one (1-2 sentences)
- **How I knew it was right:** the check run, the viewport looked at, what was
  read before accepting the diff
- **Citation:** the exact commit hash or range (run `git log -1 --format=%h`
  after committing), OR the CLAUDE.md diff, OR the check name that went
  red → green
- **Curated prompt (if relevant):** the human's prompt that produced this
  commit, trimmed to the essential ask --- not a full transcript

Don't inflate routine work into a bigger-sounding tag. If nothing this session
qualifies as harness/discarded/judgement, `[routine]` is the honest answer.

### PROCESS.md rule

Never write directly to PROCESS.md during normal work. Only touch it when
explicitly asked to "update PROCESS.md" or "draft PROCESS.md from the log". When
asked:

1. Pull entries tagged `[harness]`, `[discarded]`, `[judgement]` from
   process-log.md --- prioritize `[harness]` first.
2. Choose the number of moments to match the deliverable:
   - **Assignment (A1/A2/A3):** 3-4 moments, 400-600 words total (check the
     specific brief for its exact word/moment count).
   - **Weekly crit prototype:** fewer moments is fine --- 1-2 is enough if
     that's genuinely what the week produced. Don't pad a quiet week to hit an
     assignment-sized count.
3. Write each moment following the repo's PROCESS.md template exactly: what
   happened → what I did instead of the obvious thing → how I knew it was
   right → citation (commit hash/range as a clickable link pointing at the
   repo's commit or compare URL, or a CLAUDE.md change, or a check that went
   red → green).
4. Verify every citation resolves before finishing --- run
   `pnpm check:evidence` and fix any broken links.
