/**
 * Input unificado: teclado + mando (Gamepad API) -> acciones virtuales.
 * Acciones: up, down, left, right, ok, cancel, pause, accelerate, brake, drift.
 */
const KEYMAP = {
  ArrowUp: ['up', 'accelerate'],
  KeyW: ['up', 'accelerate'],
  ArrowDown: ['down', 'brake'],
  KeyS: ['down', 'brake'],
  ArrowLeft: ['left'],
  KeyA: ['left'],
  ArrowRight: ['right'],
  KeyD: ['right'],
  Enter: ['ok'],
  Space: ['ok', 'drift'],
  Escape: ['cancel', 'pause'],
  ShiftLeft: ['drift'],
  ShiftRight: ['drift'],
};

const PAD_BUTTONS = {
  0: ['ok', 'drift'],
  1: ['cancel', 'pause'],
  2: ['ok'],
  9: ['pause'],
  7: ['accelerate'],
  6: ['brake'],
  12: ['up'],
  13: ['down'],
  14: ['left'],
  15: ['right'],
};

export class InputManager {
  constructor() {
    this.heldSet = new Set();
    this.pressedSet = new Set();
    this.pressedAny = false;
    this.steerAxis = 0;
    this.gasAxis = 0;
    this.brakeAxis = 0;
    this._padPrev = [];
    this._axisHeld = {};
    this._nav = {};
  }

  attach() {
    window.addEventListener('keydown', (e) => {
      const acts = KEYMAP[e.code];
      if (!acts) return;
      e.preventDefault();
      if (e.repeat) return;
      for (const a of acts) {
        this.heldSet.add(a);
        this.pressedSet.add(a);
      }
      this.pressedAny = true;
    });
    window.addEventListener('keyup', (e) => {
      const acts = KEYMAP[e.code];
      if (!acts) return;
      for (const a of acts) this.heldSet.delete(a);
    });
    window.addEventListener('blur', () => {
      this.heldSet.clear();
      this._axisHeld = {};
    });
  }

  /** Se llama una vez por frame, antes de los updates de los estados. */
  update() {
    let pad = null;
    if (navigator.getGamepads) {
      const pads = navigator.getGamepads();
      if (pads) for (const p of pads) if (p && p.connected) { pad = p; break; }
    }
    this._pollPad(pad);
  }

  _pollPad(pad) {
    if (!pad) {
      this._padPrev = [];
      return;
    }
    const b = pad.buttons.map((x) => x.pressed || x.value > 0.5);
    const prev = this._padPrev;
    for (const idx of Object.keys(PAD_BUTTONS)) {
      const i = Number(idx);
      const acts = PAD_BUTTONS[idx];
      if (b[i] && !prev[i]) {
        for (const a of acts) {
          this.heldSet.add(a);
          this.pressedSet.add(a);
        }
        this.pressedAny = true;
      } else if (!b[i] && prev[i]) {
        for (const a of acts) this.heldSet.delete(a);
      }
    }
    this._padPrev = b;

    const ax = pad.axes[0] || 0;
    const ay = pad.axes[1] || 0;
    this.steerAxis = Math.abs(ax) > 0.16 ? ax : 0;
    this.gasAxis = pad.buttons[7] ? pad.buttons[7].value : 0;
    this.brakeAxis = pad.buttons[6] ? pad.buttons[6].value : 0;

    this._edgeAxis('left', ax < -0.55);
    this._edgeAxis('right', ax > 0.55);
    this._edgeAxis('up', ay < -0.55);
    this._edgeAxis('down', ay > 0.55);
  }

  _edgeAxis(act, on) {
    const was = this._axisHeld[act];
    if (on && !was) {
      this.heldSet.add(act);
      this.pressedSet.add(act);
      this.pressedAny = true;
    } else if (!on && was) {
      this.heldSet.delete(act);
    }
    this._axisHeld[act] = on;
  }

  held(a) {
    return this.heldSet.has(a);
  }

  pressed(a) {
    return this.pressedSet.has(a);
  }

  /** Eje de dirección continuo [-1, 1]. */
  get steer() {
    if (Math.abs(this.steerAxis) > 0.01) return this.steerAxis;
    return (this.held('left') ? -1 : 0) + (this.held('right') ? 1 : 0);
  }

  /** Acelerador [-1 (freno/marcha atrás) .. 1]. */
  get throttle() {
    const gas = Math.max(this.held('accelerate') ? 1 : 0, this.gasAxis);
    const brake = Math.max(this.held('brake') ? 1 : 0, this.brakeAxis);
    return Math.max(-1, Math.min(1, gas - brake));
  }

  get drift() {
    return this.held('drift');
  }

  /**
   * Repetición automática para navegación de menús.
   * Devuelve el nº de pasos de navegación que tocan este frame.
   */
  navRepeat(action, dt) {
    if (this.pressed(action)) {
      this._nav[action] = { t: 0, next: 0.45 };
      return 1;
    }
    if (this.held(action)) {
      const s = this._nav[action];
      if (!s) return 0;
      s.t += dt;
      let steps = 0;
      while (s.t >= s.next) {
        steps++;
        s.next += 0.13;
      }
      return steps;
    }
    delete this._nav[action];
    return 0;
  }

  endFrame() {
    this.pressedSet.clear();
    this.pressedAny = false;
  }
}
