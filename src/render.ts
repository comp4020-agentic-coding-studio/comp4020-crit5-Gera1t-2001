// The only module that touches the DOM. It reads state and writes classes;
// it never decides anything. Every rule lives in src/game/model.ts.

import type { GameConfig } from "./game/config";
import type { GameState } from "./game/model";

/** How long the opening mole waits before it starts leaning out of its hole. */
const BECKON_AFTER_MS = 2200;

const lossKey = (hole: number, atMs: number): string => `${hole}@${atMs}`;

export function createRenderer(root: ParentNode): (state: GameState, config: GameConfig) => void {
  const holes = Array.from(root.querySelectorAll<HTMLElement>("[data-hole]"));
  const marks = holes.map((hole) => hole.querySelector<HTMLElement>(".mark"));
  const pips = Array.from(root.querySelectorAll<HTMLElement>(".pip"));
  const lives = root.querySelector<HTMLElement>("#lives");
  const shown = new Set<string>();

  return function render(state: GameState, config: GameConfig): void {
    document.body.classList.toggle("is-won", state.phase === "won");
    document.body.classList.toggle("is-lost", state.phase === "lost");

    for (let index = 0; index < pips.length; index += 1) {
      pips[index].classList.toggle("is-spent", index >= state.lives);
    }
    lives?.setAttribute("aria-label", `${state.lives} of ${config.startingLives} lives remaining`);

    for (let hole = 0; hole < holes.length; hole += 1) {
      const element = holes[hole];
      const target = state.targets.find((candidate) => candidate.hole === hole);
      const armed = state.phase === "armed" && target !== undefined;

      element.classList.toggle("is-up", target !== undefined);
      element.classList.toggle("is-mole", target?.kind === "mole");
      element.classList.toggle("is-decoy", target?.kind === "decoy");
      element.classList.toggle("is-struck", target?.struck === true);
      element.classList.toggle("is-armed", armed);
      element.classList.toggle("is-beckon", armed && state.nowMs > BECKON_AFTER_MS);
    }

    // Losses are transient; the model prunes them once they have had their time
    // on screen, so `shown` follows that rather than growing for the session.
    const live = new Set(state.losses.map((loss) => lossKey(loss.hole, loss.atMs)));
    for (const key of shown) if (!live.has(key)) shown.delete(key);

    for (const loss of state.losses) {
      const key = lossKey(loss.hole, loss.atMs);
      if (shown.has(key)) continue;
      shown.add(key);
      const mark = marks[loss.hole];
      if (!mark) continue;
      // Re-trigger the animation even when the same hole loses twice in a row.
      mark.classList.remove("is-retreat", "is-decoy");
      void mark.offsetWidth;
      mark.classList.add(loss.cause === "decoy" ? "is-decoy" : "is-retreat");
    }
  };
}
