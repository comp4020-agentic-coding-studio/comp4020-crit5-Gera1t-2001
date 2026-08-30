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
  throw new Error("planWave not implemented");
}

export function createInitialState(config: GameConfig, seed: number): GameState {
  throw new Error("createInitialState not implemented");
}

export function resolve(state: GameState, event: GameEvent, config: GameConfig): GameState {
  throw new Error("resolve not implemented");
}
