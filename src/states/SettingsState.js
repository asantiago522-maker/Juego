import { el } from '../ui/dom.js';
import { DIFFICULTY, DIFFICULTY_ORDER } from '../data/drivers.js';
import { MainMenuState } from './MainMenuState.js';

const LAPS_OPTIONS = [2, 3, 5];

/** Pantalla de ajustes: volúmenes, vueltas, dificultad y borrado de progreso. */
export class SettingsState {
  constructor(game) {
    this.game = game;
    this.index = 0;
    this.armDelete = false;
  }

  enter() {
    const g = this.game;
    this.root = el('div', 'screen');
    this.root.innerHTML = `<h2 class="screen-title">AJUSTES</h2>`;
    this.list = el('div', 'settings-list');
    this.root.appendChild(this.list);
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="hintbar"><b>↑↓</b> fila · <b>←→</b> cambiar · <b>ESC</b> volver</div>`
    );
    g.scenes.uiEl.appendChild(this.root);
    this._build();
  }

  _build() {
    const g = this.game;
    const s = g.save.settings;
    const volBars = (v) => {
      const n = Math.round(v * 10);
      let out = '<span class="volbar">';
      for (let i = 0; i < 10; i++) out += `<i class="${i < n ? 'on' : ''}"></i>`;
      return out + '</span>';
    };

    this.rows = [
      {
        id: 'music',
        name: 'Música',
        value: volBars(s.music),
        left: () => g.save.setSetting('music', Math.max(0, Math.round((s.music - 0.1) * 10) / 10)),
        right: () => g.save.setSetting('music', Math.min(1, Math.round((s.music + 0.1) * 10) / 10)),
      },
      {
        id: 'sfx',
        name: 'Efectos (SFX)',
        value: volBars(s.sfx),
        left: () => g.save.setSetting('sfx', Math.max(0, Math.round((s.sfx - 0.1) * 10) / 10)),
        right: () => g.save.setSetting('sfx', Math.min(1, Math.round((s.sfx + 0.1) * 10) / 10)),
      },
      {
        id: 'laps',
        name: 'Vueltas (Carrera Rápida)',
        value: `${s.laps} vueltas`,
        left: () => {
          const i = LAPS_OPTIONS.indexOf(s.laps);
          g.save.setSetting('laps', LAPS_OPTIONS[(i - 1 + LAPS_OPTIONS.length) % LAPS_OPTIONS.length]);
        },
        right: () => {
          const i = LAPS_OPTIONS.indexOf(s.laps);
          g.save.setSetting('laps', LAPS_OPTIONS[(i + 1) % LAPS_OPTIONS.length]);
        },
      },
      {
        id: 'difficulty',
        name: 'Dificultad IA',
        value: DIFFICULTY[s.difficulty]?.label ?? 'Normal',
        left: () => {
          const i = DIFFICULTY_ORDER.indexOf(s.difficulty);
          g.save.setSetting('difficulty', DIFFICULTY_ORDER[(i - 1 + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length]);
        },
        right: () => {
          const i = DIFFICULTY_ORDER.indexOf(s.difficulty);
          g.save.setSetting('difficulty', DIFFICULTY_ORDER[(i + 1) % DIFFICULTY_ORDER.length]);
        },
      },
      {
        id: 'reset',
        name: 'Borrar progreso',
        value: this.armDelete ? '¿SEGURO? PULSA →' : '—',
        left: () => { this.armDelete = false; },
        right: () => {
          if (!this.armDelete) {
            this.armDelete = true;
          } else {
            g.save.reset();
            g.audio.applyVolumes();
            this.armDelete = false;
          }
        },
      },
    ];

    this.list.innerHTML = '';
    this.rowEls = this.rows.map((row, i) => {
      const r = el('div', 'setting-row' + (i === this.index ? ' selected' : ''));
      r.innerHTML = `<span class="s-name">${row.name}</span><span class="s-ctl"><span class="s-val">${row.value}</span></span>`;
      this.list.appendChild(r);
      return r;
    });
  }

  _refresh() {
    this.rowEls.forEach((r, i) => r.classList.toggle('selected', i === this.index));
  }

  update(dt) {
    const input = this.game.input;
    const d = input.navRepeat('down', dt) - input.navRepeat('up', dt);
    if (d !== 0) {
      this.armDelete = false;
      this.index = (((this.index + d) % this.rows.length) + this.rows.length) % this.rows.length;
      this.game.audio.uiMove();
      this._build();
    }
    let changed = false;
    const l = input.navRepeat('left', dt);
    const r = input.navRepeat('right', dt);
    if (l > 0) { this.rows[this.index].left(); changed = true; }
    if (r > 0) { this.rows[this.index].right(); changed = true; }
    if (input.pressed('ok') && this.rows[this.index].id === 'reset') {
      this.rows[this.index].right();
      changed = true;
    }
    if (changed) {
      this.game.audio.uiMove();
      this.game.audio.applyVolumes();
      this._build();
    }
    if (input.pressed('cancel')) {
      this.game.audio.uiBack();
      this.game.scenes.change(new MainMenuState(this.game));
    }
  }

  render() {
    /* fondo estático del menú anterior ya sustituido: renderiza negro */
  }

  exit() {
    this.root.remove();
  }
}
