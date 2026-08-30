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
