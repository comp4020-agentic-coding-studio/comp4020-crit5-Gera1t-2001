# Process log — C5 "A game"

One entry per commit, written after that commit exists and shipped with the
next one. Source material for PROCESS.md; not a substitute for it.

---

## 2026-08-30 19:53 — harness carried forward from C4

- **Tag:** `[harness]`
- **What happened:** Starting a new deliverable repo means the accumulated
  `CLAUDE.md` has to move across, but the template's own boilerplate had also
  changed between C4 and C5 — it now delegates detail to `spec/README.md` and
  `reflections/README.md` rather than carrying it inline.
- **What I did instead of the obvious thing:** Not a copy. Diffed C4's
  `CLAUDE.md` against the current template's, kept the template's new, shorter
  framing, and re-attached only the rules that survive a change of brief. Two
  sections were dropped on purpose: the Vite/`AudioContext` HMR findings and
  the multiple-mode-pages notes, both of which describe C4's instrument and
  would be dead weight — or worse, misleading — in a game.
- **How I knew it was right:** Read both files end to end before merging rather
  than diffing mechanically, and confirmed the dropped sections named C4
  artefacts specifically (`fade.html`, `keep.html`, `src/audio/mapping`) that do
  not exist in this repo.
- **Citation:** [`7dcdc95`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Gera1t-2001/commit/7dcdc95)

---

## 2026-08-30 20:19 — contract tests first, deliberately red

- **Tag:** `[discarded]`
- **What happened:** The brief I set for the game said late waves should get
  harder by raising the proportion of decoys rather than by shortening exposure,
  so that pressure fell on judgement rather than reaction speed. Designing
  against that, I reasoned that risk would peak near a 0.5 decoy ratio, because
  the frequency of mixed (mole, decoy) pairs peaks there.
- **What I did instead of the obvious thing:** Rather than build against my own
  reasoning, I had an independent agent try to refute it. It refuted the half I
  was most confident in. `2r(1-r)` does peak at 0.5, but that is the frequency
  of mixed pairs, not the hazard they carry; hazard has an interior peak only if
  a mixed pair costs more than two moles, which is false here. The real result
  is stronger and worse for the design: writing capacity utilisation as
  `rho = [R - r(R - d)] / I`, `d(rho)/dr = -(R - d)/I`, which is negative
  whenever rejecting a decoy is cheaper than striking a mole. Ignoring a decoy
  is free in this game, so raising the ratio *removes* work. And the decision to
  give the decoy a distinct silhouette — taken for colourblind safety — is
  exactly the decision that minimises the cost of rejecting one, so the two
  choices were mutually exclusive as stated. The decoy ratio was demoted to a
  pacing and teaching knob capped near 0.45, and difficulty was moved onto onset
  interval and genuine overlap.
- **How I knew it was right:** The refutation is arithmetic, not opinion, and it
  reproduces on paper. It also predicted a second bug I had already shipped into
  the approved plan: after widening the onset interval to 700 ms to keep the
  game off reaction-speed territory, exposure no longer exceeded the gap at wave
  6 (1000 ms vs 1000 ms), so the "up to 2 targets at once" lever produced zero
  overlap and did nothing. Both levers had been quietly disabled at once. The
  wave table now asserts `exposureMs > onsetMs` for waves 6+ as a test rather
  than a hope.
- **Citation:** [`b90650c`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Gera1t-2001/commit/b90650c)
- **Curated prompt:** "Is the claim correct? If it is wrong, say exactly where.
  Be adversarial about the arithmetic — I specifically want you to try to
  refute my claim."

---

## 2026-08-30 20:26 — reducer implemented, and the green checked for falseness

- **Tag:** `[harness]`
- **What happened:** `spec/crit5.test.ts` went from 16 failing to 24 passing on
  the first implementation attempt. Every assertion I had written to protect the
  teaching design passed at once, which is the shape a false green takes.
- **What I did instead of the obvious thing:** Rather than accept it, I applied
  CLAUDE.md's rule that a green needs a demonstration the sensor responds to a
  *deliberate change* — a known-good case is not enough, because a broken sensor
  passes that too. Broke the rule in each direction separately: dropped the
  `!struck` filter from the strike lookup, and separately charged two lives per
  decoy instead of one.
- **How I knew it was right:** Each break turned red exactly the assertions that
  name that failure and no others — the idempotency break took the two repeat-
  strike tests, the double-charge took the "costs exactly one life" tests. A
  suite that went red on everything, or on the wrong things, would have meant
  the tests were coupled rather than focused. Both edits reverted and re-checked
  green.
- **Citation:** [`10a8433`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Gera1t-2001/commit/10a8433)

---

## 2026-08-30 20:38 — the interface, and three things only a render showed

- **Tag:** `[judgement]`
- **What happened:** `pnpm check` was green with 41 passing tests against an
  interface that was visibly broken. Screenshotting the built page at both
  marking viewports showed every target rendered half a body-width to the right
  of its own hole, and the lives row aligned to the board's left edge instead of
  its centre. The hole's `::after` halo, positioned with `inset`, stayed put and
  showed exactly how far off the target was.
- **What I did instead of the obvious thing:** The centring used
  `left: 50%` with the independent `translate: -50% 0` property, alongside a
  `transform` used for the rise and a keyframe animation also writing
  `transform`. Rather than debug which of the three was winning, I removed the
  interaction: centring is now `left: 16%; right: 16%`, and `transform` is left
  to do exactly one job. Also raised the cell size cap after seeing the board sit
  in the middle of a mostly empty 1920x1080 viewport — the C1 failure mode
  recorded in CLAUDE.md.
- **How I knew it was right:** Not by looking. Drove the built page over CDP and
  read `getBoundingClientRect` directly: 95x95 CSS px at 390x844, against a 60px
  floor. Then auto-played a full run in the browser — first decoy at 14.0s with
  zero moles on screen (the "first decoy is met alone" requirement, confirmed at
  runtime rather than only in config), max 2 targets up at once, never more than
  1 decoy at once, and `is-won` at 107.6s with no lives lost.
- **Citation:** [`96ad39d`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Gera1t-2001/commit/96ad39d)
- **Curated prompt:** (none — this came from looking at the render, not from a
  prompt)

---

## 2026-08-30 20:32 — the harness killed itself, and it looked like a page bug

- **Tag:** `[routine]`
- **What happened:** Re-running the CDP driver at the phone viewport exited 144
  with no output, which read as the driver failing against the page.
- **What I did instead of the obvious thing:** Treated the red as a claim about
  the harness first, per CLAUDE.md. It was: the command began
  `pkill -f "remote-debugging-port=9333"`, and that pattern matches the calling
  shell's own command line, because the string appears in it. The script killed
  itself before reaching the page. Fixed by using a fresh port per run instead
  of pattern-killing.
- **How I knew it was right:** `pgrep -af "remote-debugging-port"` returned only
  the grep's own shell and no browser, and the same script ran clean on a new
  port seconds later.
- **Citation:** (no commit — tooling, not repo state)

---

## 2026-08-30 20:41 — contract documented, card replaced

- **Tag:** `[routine]`
- **What happened:** `spec/README.md` needed the week's contract table, and
  `public/card.png` was still the template's placeholder.
- **What I did instead of the obvious thing:** Generated the card from the
  running game at 1200x630 rather than drawing one, so the link preview is the
  actual opening screen and cannot drift from what ships.
- **How I knew it was right:** `pnpm check` green; card verified as
  1200x630 PNG and viewed before installing.
- **Citation:** [`5b8b369`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Gera1t-2001/commit/5b8b369)

---

## 2026-08-30 20:54 — PROCESS.md drafted, then cut by 60%

- **Tag:** `[judgement]`
- **What happened:** Drafted PROCESS.md from this log on request. The first
  draft ran to 805 words across three moments, which felt proportionate to the
  work.
- **What I did instead of the obvious thing:** Checked the course's stated
  lengths instead of assuming, and the template's own PROCESS.md wording (which
  says "three or four for an assignment") had led me toward an assignment-sized
  file. The assessment page is explicit that a *crit week's* PROCESS.md runs to
  **150–300 words** — 400–600 is the assignment figure — and that badly
  overshooting can itself lose marks, since scoping the response is part of
  responding to the brief. Cut to 299 words, keeping all three moments but
  reducing each to what only I can tell a reader: the call made and how I knew
  it held. Screenshots stayed, since images are explicitly excluded from the
  count and carry the verification better than prose.
- **How I knew it was right:** Counted with images, citation links and headings
  excluded (299). `pnpm check:evidence` passes every citation.
- **Citation:** [`7bdf4fd`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-Gera1t-2001/commit/7bdf4fd)
- **Curated prompt:** "写一下 process.md"
