# The spec

Every deliverable's spec — what the markers consider when they judge whether
your work matches what was required — is published on the course website, and
this repo's name tells you which one applies: the course API maps repo prefixes
to deliverables, and the `start` course skill walks your agent through pulling
the right one. The brief poses the problem; the spec is the fixed contract. Read
both on the site before you plan or build.

The checks in this directory come in two kinds:

## Invariants (shipped, always on)

`invariants.test.ts` asserts things that are true of any good website, however
you build it and whatever the week's brief asks: a navigation landmark, exactly
one top-level heading, a document language, a real title, a meta description, an
`og:image` card, a mobile viewport, and alt text on images. They run against the
**built** site (`dist/`), so they check what actually ships. Keep them green;
don't delete them.

The description and the card are what a link to your site looks like when
someone shares it. The card check is presence only: a path that doesn't resolve
shows up in the course gallery, not as a red check, so look at the deployed head
when you add pages.

## Your spec tests (yours to write)

Turning the week's published spec into tests is your work, not the template's.
Some spec lines are mechanically checkable — assert those here, in your own test
file alongside the supplied ones (any `spec/*.test.ts` runs with `pnpm check`).
Some lines only a person can judge; leave those to the crit. There is no minimum
count: select the checks that protect your work's real promises, and test the
**contracts** — what the page must do, not how you built it — so the tests
survive a change of approach, or of stack.

Two kinds end up in here, and they have different lifespans:

- **contract tests** answer this week's published spec. They retire with the
  brief they answer, so they stay behind when the week does.
- **sensors** assert a standard you hold the agent to whatever the brief is. A
  sensor is harness, the same as a rule in `CLAUDE.md`, so it comes with you
  into next week's repo. Catching a recurring failure once and wiring it into
  `check` is the skilled move; re-prompting until it passes is the routine one.

By the end of semester the sensors you've accumulated are the clearest record
you have of what you've taught yourself to check for — worth citing in
`PROCESS.md` the week each one lands.

A green suite here is backpressure, not a mark: your tutor verifies what you
deployed against the published spec at the crit, and keeping your own tests
green is how you arrive with no surprises.

## C5 "A game" — the contract

| Spec line | |
|---|---|
| deployed and live at its public Pages URL | mechanically checkable — by CI and the sweep, not by this suite |
| it can be lost: a wrong move is possible, and play ends somewhere | mechanically checkable — `spec/crit5.test.ts` plays whole games with three strategies: hitting only moles reaches `won`, never striking reaches `lost`, striking everything also reaches `lost` |
| it teaches itself: no instructions anywhere, on screen or off | **eyes-only** — no assertion can tell a name from an instruction, or know whether an opening screen reads as an invitation |
| a stranger can pick it up and reach an ending inside five minutes | partly checkable — an auto-played clean run reaches the win ending at ~108s, so the budget fits twice over. Whether a *stranger* gets there is **hands-only**: four people, cold |
| one rule under a focused automated test | mechanically checkable — the decoy rule, in `spec/crit5.test.ts` (see below) |
| one change came from playing the finished game | **process evidence**, not a test — see `process-log.md` and `PROCESS.md` |
| the repo shows the process | mechanically checkable — `pnpm check:evidence` |
| you can account for how you directed the work | **conversation-only** — the crit |

### The focused rule, and why that one

**Striking a decoy costs exactly one life, and striking the same decoy again
costs nothing.**

The retreat penalty punishes *inaction*, which makes it a timer behaviour. The
decoy strike is the only place in the game where a deliberate player action
produces a loss — the spec's "a wrong move is possible". The no-tutorial design
hangs on a single link: one wrong action, exactly one life visibly gone, no
forgiveness. Both directions break it. Charging twice turns the lesson into a
swindle; charging nothing on a repeat strike silently reinstates the
free-first-mistake rule the design rules out. It is also the rule most exposed
to a real bug, since pointer events arrive in bursts and a 60px target gets
double-tapped by any unsteady hand.

That test was checked for falseness rather than trusted: breaking idempotency
and, separately, double-charging each turned red exactly the assertions naming
that failure, and nothing else.

### Two structural tests that guard the teaching, not the difficulty

- **Waves 1–5 cannot show two targets at once**, asserted as
  `exposureMs < onsetMs` rather than by reading the `maxConcurrent` field, which
  is only a declaration. If the teaching decoy ever shared the screen with a
  mole, the player could blame the lost life on the mole they missed and never
  learn the rule. Confirmed at runtime too: the first decoy appears with zero
  moles on screen.
- **`planWave` never places two decoys back to back**, at any wave or seed.
  Adjacent spawns are exactly the ones that overlap once exposure exceeds the
  onset gap, so this is what stops a concurrent pair from ever being all decoys —
  an event that would demand no action at all.

### A note on what the decoy ratio does not do

The obvious difficulty lever is the decoy proportion, and it does not work here.
Ignoring a decoy is free and correct, so a decoy the eye can cheaply reject is
not a threat but a hole needing no action; raising the ratio removes work. With
capacity utilisation `rho = [R - r(R - d)] / I`, `d(rho)/dr = -(R - d)/I`, which
is negative whenever rejecting is cheaper than striking — and the decision to
give the decoy a distinct silhouette is exactly what makes rejecting cheap. So
the ratio is capped near 0.45 and treated as a pacing and teaching knob;
difficulty rides on onset interval and genuine overlap instead. `src/game/config.ts`
carries the derivation.
