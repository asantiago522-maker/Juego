const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Cambios de escena con fade out/in.
 * Cada estado implementa enter() / update(dt) / render(dt) / exit().
 */
export class SceneManager {
  constructor(game, fadeEl, uiEl) {
    this.game = game;
    this.fadeEl = fadeEl;
    this.uiEl = uiEl;
    this.current = null;
    this.transitioning = false;
  }

  /** Arranque en frío, sin fade. */
  set(state) {
    this.current = state;
    state.enter();
  }

  async change(state) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.fadeEl.classList.add('visible');
    await wait(320);
    if (this.current) this.current.exit();
    this.current = state;
    state.enter();
    this.fadeEl.classList.remove('visible');
    await wait(320);
    this.transitioning = false;
  }
}
