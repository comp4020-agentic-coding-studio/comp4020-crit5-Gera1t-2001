import { describe, expect, it } from "vitest";
import { CONFIG, decoyCount } from "../src/game/config";
import {
  type GameState,
  type Target,
  createInitialState,
  planWave,
  resolve,
} from "../src/game/model";

// C5 "A game" — https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/05-game/
//
// See spec/README.md for which spec lines are mechanically checkable and which
// are settled only by four people playing it cold. Everything here runs against
// the pure reducer in src/game/model.ts, with no DOM and no clock — a whole game
// can be played to its ending in a few milliseconds, which is why the "can it be
// won / can it be lost" lines below are testable at all.

function playingState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: "playing",
    lives: 5,
    wave: 1,
    targets: [],
    wavePlan: ["mole"],
    spawnedThisWave: 1,
    resolvedThisWave: 0,
    nextSpawnAt: Number.POSITIVE_INFINITY,
    losses: [],
    nowMs: 1000,
    seed: 1,
    nextId: 10,
    ...overrides,
  };
}

const decoyAt = (hole: number): Target => ({
  id: 7,
  hole,
  kind: "decoy",
  downAt: 3000,
  struck: false,
});

const moleAt = (hole: number): Target => ({
  id: 8,
  hole,
  kind: "mole",
  downAt: 3000,
  struck: false,
});

// ---------------------------------------------------------------------------
// THE FOCUSED TEST
//
// Striking a decoy is the only place in this game where a deliberate player
// ACTION produces a loss (the retreat penalty punishes inaction, which makes it
// a timer behaviour). The whole no-tutorial design hangs on one link: one wrong
// action, exactly one life visibly gone, no forgiveness. That link breaks in
// both directions — double-charging turns the lesson into a swindle, and
// charging nothing on a repeat strike silently reinstates the free-first-mistake
// rule the design explicitly rules out. It is also the rule most exposed to a
// real bug, because pointer events arrive in bursts and a 60px target gets
// double-tapped by any unsteady hand.
// ---------------------------------------------------------------------------

describe("C5 focused: striking a decoy costs exactly one life, once", () => {
  it("costs exactly one life — not two, not zero", () => {
    const before = playingState({ targets: [decoyAt(3)] });
    const after = resolve(before, { type: "strike", hole: 3, atMs: 1100 }, CONFIG);
    expect(after.lives).toBe(before.lives - 1);
  });

  it("costs nothing the second time the same decoy is struck", () => {
    const first = resolve(
      playingState({ targets: [decoyAt(3)] }),
      { type: "strike", hole: 3, atMs: 1100 },
      CONFIG,
    );
    const second = resolve(first, { type: "strike", hole: 3, atMs: 1150 }, CONFIG);
    expect(second.lives).toBe(first.lives);
  });

  it("survives a burst of strikes on one decoy — a double-tap is not two mistakes", () => {
    // What an unsteady finger on a 60px target actually produces. Asserting the
    // lives delta across the burst, not the number of events the model saw.
    let state = playingState({ targets: [decoyAt(3)] });
    const livesBefore = state.lives;
    for (const atMs of [1100, 1108, 1116, 1124, 1140]) {
      state = resolve(state, { type: "strike", hole: 3, atMs }, CONFIG);
    }
    expect(state.lives).toBe(livesBefore - 1);
  });

  it("records the loss at the hole that caused it, so feedback can sit there", () => {
    // The player learns the rule by seeing WHERE the life went. A loss with no
    // hole attached would render in the wrong place and teach nothing.
    const after = resolve(
      playingState({ targets: [decoyAt(6)] }),
      { type: "strike", hole: 6, atMs: 1100 },
      CONFIG,
    );
    const loss = after.losses.find((l) => l.cause === "decoy");
    expect(loss?.hole).toBe(6);
  });

  it("charges nothing for a decoy the player correctly left alone", () => {
    // Ignoring a decoy must stay free, or 'look before you strike' stops being
    // the right move and the two mechanics no longer pull against each other.
    const before = playingState({ targets: [decoyAt(3)] });
    const after = resolve(before, { type: "tick", atMs: 4000 }, CONFIG);
    expect(after.lives).toBe(before.lives);
  });
});

// ---------------------------------------------------------------------------
// Supporting rules
// ---------------------------------------------------------------------------

describe("C5: the opening screen costs nothing until the player acts", () => {
  it("a full minute of waiting in the armed phase costs no life and starts no wave", () => {
    let state = createInitialState(CONFIG, 1);
    expect(state.phase).toBe("armed");
    for (let atMs = 0; atMs < 60_000; atMs += 250) {
      state = resolve(state, { type: "tick", atMs }, CONFIG);
    }
    expect(state.lives).toBe(CONFIG.startingLives);
    expect(state.phase).toBe("armed");
    expect(state.wave).toBe(1);
  });

  it("striking the opening mole is what starts the game", () => {
    const armed = createInitialState(CONFIG, 1);
    const started = resolve(
      armed,
      { type: "strike", hole: CONFIG.openingHole, atMs: 500 },
      CONFIG,
    );
    expect(started.phase).toBe("playing");
    expect(started.lives).toBe(CONFIG.startingLives);
  });

  it("striking anywhere else in the armed phase does nothing at all", () => {
    const armed = createInitialState(CONFIG, 1);
    const elsewhere = (CONFIG.openingHole + 1) % CONFIG.holeCount;
    const after = resolve(armed, { type: "strike", hole: elsewhere, atMs: 500 }, CONFIG);
    expect(after.phase).toBe("armed");
    expect(after.lives).toBe(CONFIG.startingLives);
  });
});

describe("C5: what does and does not cost a life", () => {
  it("a mole that retreats unhit costs exactly one life", () => {
    const before = playingState({ targets: [moleAt(2)] });
    const after = resolve(before, { type: "tick", atMs: 3000 }, CONFIG);
    expect(after.lives).toBe(before.lives - 1);
    expect(after.losses.find((l) => l.cause === "retreated")?.hole).toBe(2);
  });

  it("a mole struck before it retreats costs nothing", () => {
    const before = playingState({ targets: [moleAt(2)] });
    const hit = resolve(before, { type: "strike", hole: 2, atMs: 1100 }, CONFIG);
    const later = resolve(hit, { type: "tick", atMs: 4000 }, CONFIG);
    expect(later.lives).toBe(before.lives);
  });

  it("striking an empty hole costs nothing", () => {
    const before = playingState({ targets: [moleAt(2)] });
    const after = resolve(before, { type: "strike", hole: 5, atMs: 1100 }, CONFIG);
    expect(after.lives).toBe(before.lives);
  });
});

// ---------------------------------------------------------------------------
// Structural rules that protect the teaching design.
//
// These two matter more than the bounds checks: they guard the mechanism by
// which the player learns the decoy rule at all.
// ---------------------------------------------------------------------------

describe("C5 structural: the first decoy is met alone", () => {
  it("wave 1 has no decoys, so the first lesson is only 'hit the mole'", () => {
    expect(decoyCount(CONFIG.waves[0])).toBe(0);
  });

  it("wave 2 introduces exactly one decoy", () => {
    expect(decoyCount(CONFIG.waves[1])).toBe(1);
  });

  for (let index = 0; index < 5; index++) {
    it(`wave ${index + 1} can only ever show one target at a time`, () => {
      // Asserting the relationship that MAKES concurrency 1 true, not the
      // maxConcurrent field, which is only a declaration of intent. If exposure
      // ever exceeded the onset gap, targets would overlap whatever the field
      // said, and the teaching decoy could share the screen with a mole.
      const wave = CONFIG.waves[index];
      expect(wave.exposureMs).toBeLessThan(wave.onsetMs);
      expect(wave.maxConcurrent).toBe(1);
    });
  }
});

describe("C5 structural: no concurrent set is all decoys", () => {
  it("planWave never places two decoys back to back, at any wave or seed", () => {
    // Adjacent spawns are exactly the ones that overlap on screen once exposure
    // exceeds the onset gap, so 'no two adjacent decoys' is what guarantees
    // every concurrent pair contains a mole. An all-decoy pair would be an
    // event demanding no action, leaking the action density the late waves
    // depend on.
    for (const wave of CONFIG.waves) {
      for (let seed = 1; seed <= 40; seed++) {
        const { plan } = planWave(wave, seed);
        expect(plan.length).toBe(wave.targets);
        expect(plan.filter((kind) => kind === "decoy").length).toBe(decoyCount(wave));
        for (let i = 1; i < plan.length; i++) {
          expect(
            plan[i] === "decoy" && plan[i - 1] === "decoy",
            `wave of ${wave.targets} seed ${seed}: decoys adjacent at ${i - 1},${i}`,
          ).toBe(false);
        }
      }
    }
  });

  it("waves 6 onward genuinely overlap, so concurrency 2 is real and not nominal", () => {
    for (let index = 5; index < CONFIG.waves.length; index++) {
      const wave = CONFIG.waves[index];
      expect(wave.exposureMs).toBeGreaterThan(wave.onsetMs);
      // Two onsets, never three: a third would need exposure past twice the gap.
      expect(wave.exposureMs).toBeLessThan(wave.onsetMs * 2);
      expect(wave.onsetMs).toBeGreaterThanOrEqual(CONFIG.minOnsetMs);
    }
  });
});

// ---------------------------------------------------------------------------
// The spec's "it can be lost" line, played out end to end.
// ---------------------------------------------------------------------------

type Strategy = (state: GameState) => readonly number[];

function playToEnding(strategy: Strategy, seed: number): GameState {
  let state = resolve(
    createInitialState(CONFIG, seed),
    { type: "strike", hole: CONFIG.openingHole, atMs: 0 },
    CONFIG,
  );
  for (let atMs = 0; atMs < 300_000 && state.phase === "playing"; atMs += 16) {
    state = resolve(state, { type: "tick", atMs }, CONFIG);
    for (const hole of strategy(state)) {
      state = resolve(state, { type: "strike", hole, atMs }, CONFIG);
    }
    expect(state.lives).toBeGreaterThanOrEqual(0);
    expect(state.lives).toBeLessThanOrEqual(CONFIG.startingLives);
  }
  return state;
}

const hitEverything: Strategy = (s) => s.targets.filter((t) => !t.struck).map((t) => t.hole);
const hitOnlyMoles: Strategy = (s) =>
  s.targets.filter((t) => !t.struck && t.kind === "mole").map((t) => t.hole);
const hitNothing: Strategy = () => [];

describe("C5: play ends somewhere — a win, a loss, or a finish", () => {
  it("is winnable: a player who hits every mole and no decoy reaches the end intact", () => {
    const ending = playToEnding(hitOnlyMoles, 12345);
    expect(ending.phase).toBe("won");
    expect(ending.lives).toBe(CONFIG.startingLives);
  });

  it("is losable by inaction: a player who never strikes runs out of lives", () => {
    const ending = playToEnding(hitNothing, 12345);
    expect(ending.phase).toBe("lost");
    expect(ending.lives).toBe(0);
  });

  it("is losable by recklessness: a player who strikes everything runs out too", () => {
    // This is the half that makes the two mechanics a real tension. If hitting
    // everything survived, 'look before you strike' would cost the player
    // nothing to ignore.
    const ending = playToEnding(hitEverything, 12345);
    expect(ending.phase).toBe("lost");
    expect(ending.lives).toBe(0);
  });

  it("always terminates, whatever the seed", () => {
    for (const seed of [1, 2, 3, 99, 4242]) {
      expect(playToEnding(hitOnlyMoles, seed).phase).toBe("won");
      expect(playToEnding(hitNothing, seed).phase).toBe("lost");
    }
  });
});
