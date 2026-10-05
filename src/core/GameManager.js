/** Bucle principal del juego: input -> update -> render. */
export class GameManager {
  constructor(game, initialState) {
    this.game = game;
    game.manager = this;
    game.scenes.set(initialState);
    this.last = performance.now();
    this._frame = this._frame.bind(this);
    requestAnimationFrame(this._frame);
  }

  _frame(now) {
    requestAnimationFrame(this._frame);
    let dt = (now - this.last) / 1000;
    this.last = now;
    dt = Math.min(dt, 0.05);

    const g = this.game;
    g.input.update();
    const st = g.scenes.current;
    if (st) {
      st.render(dt);
      if (!g.scenes.transitioning) st.update(dt);
    }
    g.input.endFrame();
  }
}
