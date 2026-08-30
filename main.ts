// Wiring only: pointer events in, frames out. The clock lives here so that
// src/game/model.ts can stay a pure function of (state, event) and be played
// to an ending by the tests without a browser.

import { CONFIG } from "./src/game/config";
import { createInitialState, resolve } from "./src/game/model";
import { createRenderer } from "./src/render";

/** How long an ending sits before the opening mole rises again. */
const ENDING_MS = 2600;

const field = document.querySelector<HTMLElement>("#field");
if (field) {
  const render = createRenderer(document);
  const origin = performance.now();
  const elapsed = (): number => performance.now() - origin;

  let state = createInitialState(CONFIG, Math.floor(Math.random() * 2 ** 31));
  let endingAt: number | null = null;

  // pointerdown, not click: the strike should land when the finger does, and
  // this is the same path for mouse, pen and touch.
  field.addEventListener("pointerdown", (event) => {
    const hole = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-hole]");
    if (!hole?.dataset.hole) return;
    event.preventDefault();
    state = resolve(state, { type: "strike", hole: Number(hole.dataset.hole), atMs: elapsed() }, CONFIG);
    render(state, CONFIG);
  });

  const frame = (): void => {
    const atMs = elapsed();
    state = resolve(state, { type: "tick", atMs }, CONFIG);

    // An ending is not a dead end: after a beat the game returns to a single
    // mole waiting in the centre, which is the same invitation it opened with.
    // That is the whole restart affordance, and it needs no button and no word.
    if (state.phase === "won" || state.phase === "lost") {
      endingAt ??= atMs;
      if (atMs - endingAt > ENDING_MS) {
        state = resolve(state, { type: "restart", atMs }, CONFIG);
        endingAt = null;
      }
    } else {
      endingAt = null;
    }

    render(state, CONFIG);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}
