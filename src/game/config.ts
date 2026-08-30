// Every tunable number in the game lives here. Changing difficulty is meant to
// be a one-line edit to the WAVES table below, because every probability the
// table was designed against is a guess until it has been playtested.
//
// Difficulty architecture, and why it is not the obvious one:
//
// The obvious lever is the decoy ratio -- raise it and the game gets harder.
// It does not. Ignoring a decoy is free and correct, so a decoy the eye can
// reject cheaply is not a threat, it is a hole that needs no action. Raising
// the ratio therefore mostly REMOVES things the player must act on. Writing
// capacity utilisation as rho = [R - r(R - d)] / I (R = time to strike, d =
// time to reject a decoy, I = onset interval), d(rho)/dr = -(R - d)/I, which
// is negative whenever rejecting is cheaper than striking. Our decoy differs
// from the mole in silhouette precisely so that rejecting is cheap, so the
// ratio is anti-difficulty here by roughly 2-4x.
//
// So `decoyRatio` is a PACING AND TEACHING knob, capped near 0.45. Difficulty
// is carried by:
//   1. onsetMs (I) shrinking -- the pressure is triage ("A has 300ms left, B
//      just rose, which is the mole, which first?"), not motor speed, which is
//      why MIN_ONSET_MS exists as a floor and why two moles never co-onset.
//   2. concurrency, guaranteed to be real: from wave 6, exposureMs > onsetMs,
//      so consecutive targets genuinely overlap. Waves 1-5 keep
//      exposureMs < onsetMs, so exactly one target is up at a time.
//
// Wave 2's single decoy MUST appear alone. That is load-bearing, not a
// difficulty choice: if the teaching decoy overlapped a mole, the player could
// blame the lost life on the mole they missed and never learn the rule.

export type WaveConfig = {
  /** Total targets spawned this wave. Decoys SUBSTITUTE for moles, never add to them. */
  readonly targets: number;
  /** Fraction of `targets` that are decoys. Decoy count is round(targets * decoyRatio). */
  readonly decoyRatio: number;
  /** T: how long a target stays up before retreating. */
  readonly exposureMs: number;
  /** I: gap between one target rising and the next. Overlap is exposureMs - onsetMs. */
  readonly onsetMs: number;
  /** Ceiling on targets up at once. Held to what the T/I relationship actually produces. */
  readonly maxConcurrent: number;
};

export type GameConfig = {
  readonly startingLives: number;
  readonly waveCount: number;
  readonly holeCount: number;
  /** The hole the opening mole waits in. Centre reads as subject, not ornament. */
  readonly openingHole: number;
  /** Below this, triage collapses into a reaction test. Derived from ~0.85x a strike. */
  readonly minOnsetMs: number;
  /** How long a lost-life marker stays on screen next to the target that caused it. */
  readonly lossVisibleMs: number;
  /** Pause between a wave ending and the next one starting. */
  readonly waveGapMs: number;
  readonly waves: readonly WaveConfig[];
};

export const CONFIG: GameConfig = {
  startingLives: 5,
  waveCount: 10,
  holeCount: 9,
  openingHole: 4,
  minOnsetMs: 420,
  lossVisibleMs: 900,
  waveGapMs: 1200,
  waves: [
    // n   ratio  T(ms)  I(ms)  maxC
    { targets: 6, decoyRatio: 0.0, exposureMs: 1200, onsetMs: 1450, maxConcurrent: 1 },
    { targets: 6, decoyRatio: 0.17, exposureMs: 1200, onsetMs: 1450, maxConcurrent: 1 },
    { targets: 8, decoyRatio: 0.25, exposureMs: 1150, onsetMs: 1400, maxConcurrent: 1 },
    { targets: 9, decoyRatio: 0.33, exposureMs: 1100, onsetMs: 1350, maxConcurrent: 1 },
    { targets: 9, decoyRatio: 0.33, exposureMs: 1050, onsetMs: 1300, maxConcurrent: 1 },
    { targets: 11, decoyRatio: 0.36, exposureMs: 1000, onsetMs: 650, maxConcurrent: 2 },
    { targets: 13, decoyRatio: 0.38, exposureMs: 975, onsetMs: 620, maxConcurrent: 2 },
    { targets: 15, decoyRatio: 0.4, exposureMs: 950, onsetMs: 580, maxConcurrent: 2 },
    { targets: 17, decoyRatio: 0.41, exposureMs: 900, onsetMs: 540, maxConcurrent: 2 },
    { targets: 21, decoyRatio: 0.43, exposureMs: 850, onsetMs: 500, maxConcurrent: 2 },
  ],
};

/** Decoys substitute for moles, so this is the whole of the composition rule. */
export function decoyCount(wave: WaveConfig): number {
  return Math.round(wave.targets * wave.decoyRatio);
}
