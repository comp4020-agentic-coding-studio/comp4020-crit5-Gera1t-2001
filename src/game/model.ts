// The whole game rule set, as a pure reducer. Nothing in this file may import
// a DOM type or read a clock: time arrives as `atMs` on every event, and
// randomness is threaded through `seed`. That is what lets the contract tests
// in spec/crit5.test.ts run a whole game to its ending without a browser.

import type { GameConfig, WaveConfig } from "./config";
import { decoyCount } from "./config";

export type Phase = "armed" | "playing" | "won" | "lost";
export type TargetKind = "mole" | "decoy";

export type Target = {
  /** Unique per spawn. What makes a repeated strike on the same target a no-op. */
  readonly id: number;
  readonly hole: number;
  readonly kind: TargetKind;
  /** When this target retreats. Infinity for the opening mole, which waits forever. */
  readonly downAt: number;
  /** Already resolved by a strike. Stays on screen for its hit animation, but is inert. */
  readonly struck: boolean;
};

export type Loss = {
  /** The hole that caused it: feedback belongs next to the thing that took the life. */
  readonly hole: number;
  readonly cause: "retreated" | "decoy";
  readonly atMs: number;
};

export type GameState = {
  readonly phase: Phase;
  readonly lives: number;
  /** 1-based. Index into config.waves is `wave - 1`. */
  readonly wave: number;
  readonly targets: readonly Target[];
  /** This wave's kinds, decided up front so the no-two-adjacent-decoys rule is checkable. */
  readonly wavePlan: readonly TargetKind[];
  readonly spawnedThisWave: number;
  readonly resolvedThisWave: number;
  readonly nextSpawnAt: number;
  readonly losses: readonly Loss[];
  readonly nowMs: number;
  readonly seed: number;
  readonly nextId: number;
};

export type GameEvent =
  | { readonly type: "strike"; readonly hole: number; readonly atMs: number }
  | { readonly type: "tick"; readonly atMs: number }
  | { readonly type: "restart"; readonly atMs: number };

/**
 * Lays out one wave's kinds. Decoys substitute for moles (never add to them),
 * and no two decoys may be adjacent: adjacent spawns are exactly the ones that
 * overlap on screen once exposureMs > onsetMs, so forbidding adjacency is what
 * guarantees every concurrent set contains at least one mole. Without it, an
 * all-decoy pair is an event that demands nothing and leaks action density.
 */
export function planWave(wave: WaveConfig, seed: number): { plan: readonly TargetKind[]; seed: number } {
  const decoys = decoyCount(wave);
  const moles = wave.targets - decoys;
  // Decoys go into the gaps around the moles, at most one per gap, which is
  // what makes adjacency impossible rather than merely unlikely. There are
  // moles + 1 gaps, so a wave asking for more decoys than that is infeasible;
  // the shortfall shows up as a failing count assertion in spec/crit5.test.ts
  // rather than as a silently crowded wave.
  const gaps = moles + 1;
  const { picked, seed: nextSeed } = pickDistinct(Math.min(decoys, gaps), gaps, seed);
  const decoyGaps = new Set(picked);

  const plan: TargetKind[] = [];
  for (let gap = 0; gap < gaps; gap += 1) {
    if (decoyGaps.has(gap)) plan.push("decoy");
    if (gap < moles) plan.push("mole");
  }
  return { plan, seed: nextSeed };
}

export function createInitialState(config: GameConfig, seed: number): GameState {
  return {
    phase: "armed",
    lives: config.startingLives,
    wave: 1,
    // One mole, already up, waiting forever. downAt: Infinity is why "no timer
    // runs and no life can be lost before the first input" needs no guard —
    // the retreat branch simply never fires. It lives in the data, not in an
    // `if` someone could later delete.
    targets: [
      {
        id: 0,
        hole: config.openingHole,
        kind: "mole",
        downAt: Number.POSITIVE_INFINITY,
        struck: false,
      },
    ],
    wavePlan: [],
    spawnedThisWave: 0,
    resolvedThisWave: 0,
    nextSpawnAt: 0,
    losses: [],
    nowMs: 0,
    seed,
    nextId: 1,
  };
}

export function resolve(state: GameState, event: GameEvent, config: GameConfig): GameState {
  switch (event.type) {
    case "restart":
      return createInitialState(config, nextRandom(state.seed).seed);
    case "strike":
      return strike(state, event.hole, event.atMs, config);
    case "tick":
      return tick(state, event.atMs, config);
  }
}

// --- internals -------------------------------------------------------------

/** mulberry32, threaded rather than stateful so the whole reducer stays pure. */
function nextRandom(seed: number): { value: number; seed: number } {
  const advanced = (seed + 0x6d2b79f5) | 0;
  let t = advanced;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, seed: advanced };
}

function pickDistinct(count: number, from: number, seed: number): { picked: number[]; seed: number } {
  const pool = Array.from({ length: from }, (_, index) => index);
  const picked: number[] = [];
  let current = seed;
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const roll = nextRandom(current);
    current = roll.seed;
    picked.push(pool.splice(Math.floor(roll.value * pool.length), 1)[0]);
  }
  return { picked, seed: current };
}

function pickHole(holeCount: number, occupied: ReadonlySet<number>, seed: number): { hole: number; seed: number } {
  const free: number[] = [];
  for (let hole = 0; hole < holeCount; hole += 1) if (!occupied.has(hole)) free.push(hole);
  if (free.length === 0) return { hole: 0, seed };
  const roll = nextRandom(seed);
  return { hole: free[Math.floor(roll.value * free.length)], seed: roll.seed };
}

function prune(losses: readonly Loss[], atMs: number, config: GameConfig): readonly Loss[] {
  return losses.filter((loss) => atMs - loss.atMs < config.lossVisibleMs);
}

function beginWave(base: GameState, waveNumber: number, atMs: number, config: GameConfig): GameState {
  const { plan, seed } = planWave(config.waves[waveNumber - 1], base.seed);
  return {
    ...base,
    phase: "playing",
    wave: waveNumber,
    targets: [],
    wavePlan: plan,
    spawnedThisWave: 0,
    resolvedThisWave: 0,
    // Wave 1 starts the instant the opening mole is hit; later waves get a beat.
    nextSpawnAt: atMs + (waveNumber === 1 ? 0 : config.waveGapMs),
    seed,
    nowMs: atMs,
  };
}

function strike(state: GameState, hole: number, atMs: number, config: GameConfig): GameState {
  if (state.phase === "armed") {
    const opening = state.targets.find((target) => target.hole === hole);
    return opening ? beginWave(state, 1, atMs, config) : state;
  }
  if (state.phase !== "playing") return state;

  // An already-struck target is not found here, which is the whole of the
  // idempotency rule: a second tap on the same decoy resolves to nothing.
  const hit = state.targets.find((target) => target.hole === hole && !target.struck);
  if (!hit) return { ...state, nowMs: atMs };

  const targets = state.targets.map((target) =>
    target.id === hit.id ? { ...target, struck: true } : target,
  );
  const resolvedThisWave = state.resolvedThisWave + 1;

  if (hit.kind === "mole") {
    return { ...state, targets, resolvedThisWave, nowMs: atMs };
  }

  const lives = state.lives - 1;
  const losses: readonly Loss[] = [...state.losses, { hole, cause: "decoy", atMs }];
  if (lives <= 0) {
    return { ...state, phase: "lost", lives: 0, targets: [], losses, resolvedThisWave, nowMs: atMs };
  }
  return { ...state, targets, lives, losses, resolvedThisWave, nowMs: atMs };
}

function tick(state: GameState, atMs: number, config: GameConfig): GameState {
  if (state.phase !== "playing") return { ...state, nowMs: atMs };

  const wave = config.waves[state.wave - 1];
  let lives = state.lives;
  let resolvedThisWave = state.resolvedThisWave;
  const losses: Loss[] = [...state.losses];
  const standing: Target[] = [];

  for (const target of state.targets) {
    if (atMs < target.downAt) {
      standing.push(target);
      continue;
    }
    // Struck targets were already counted when they were hit; they are only
    // still here so their hit animation can finish.
    if (target.struck) continue;
    resolvedThisWave += 1;
    if (target.kind === "mole") {
      lives -= 1;
      losses.push({ hole: target.hole, cause: "retreated", atMs });
    }
  }

  if (lives <= 0) {
    return {
      ...state,
      phase: "lost",
      lives: 0,
      targets: [],
      losses: prune(losses, atMs, config),
      resolvedThisWave,
      nowMs: atMs,
    };
  }

  let seed = state.seed;
  let nextId = state.nextId;
  let spawnedThisWave = state.spawnedThisWave;
  let nextSpawnAt = state.nextSpawnAt;

  while (
    spawnedThisWave < state.wavePlan.length &&
    atMs >= nextSpawnAt &&
    standing.filter((target) => !target.struck).length < wave.maxConcurrent
  ) {
    const occupied = new Set(standing.map((target) => target.hole));
    const chosen = pickHole(config.holeCount, occupied, seed);
    seed = chosen.seed;
    standing.push({
      id: nextId,
      hole: chosen.hole,
      kind: state.wavePlan[spawnedThisWave],
      downAt: atMs + wave.exposureMs,
      struck: false,
    });
    nextId += 1;
    spawnedThisWave += 1;
    nextSpawnAt += wave.onsetMs;
  }

  const waveFinished = resolvedThisWave >= state.wavePlan.length && standing.length === 0;
  if (waveFinished) {
    const carried: GameState = { ...state, lives, seed, nextId, losses: prune(losses, atMs, config) };
    return state.wave >= config.waveCount
      ? { ...carried, phase: "won", targets: [], nowMs: atMs }
      : beginWave(carried, state.wave + 1, atMs, config);
  }

  return {
    ...state,
    lives,
    targets: standing,
    losses: prune(losses, atMs, config),
    spawnedThisWave,
    resolvedThisWave,
    nextSpawnAt,
    seed,
    nextId,
    nowMs: atMs,
  };
}
