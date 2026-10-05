import { el, drawTrackThumb } from '../ui/dom.js';
import { TRACK_LIST } from '../data/tracks.js';
import { formatTime } from '../utils/math.js';
import { MainMenuState } from './MainMenuState.js';
import { RaceState } from './RaceState.js';

/** Selección de pista para Carrera Rápida. */
export class TrackSelectState {
  constructor(game, { mode = 'quick' } = {}) {
    this.game = game;
    this.mode = mode;
    this.index = 0;
  }

  enter() {
    const g = this.game;
    this.root = el('div', 'screen');
    this.root.innerHTML = `<h2 class="screen-title" style="font-size:26px;">ELIGE PISTA</h2>`;
    this.grid = el('div', 'track-grid');
    this.root.appendChild(this.grid);
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="hintbar"><b>←→</b> elegir · <b>ENTER</b> correr · <b>ESC</b> volver · Vueltas: <b>${g.save.settings.laps}</b></div>`
    );
    g.scenes.uiEl.appendChild(this.root);

    this.cards = TRACK_LIST.map((track, i) => {
      const best = g.save.bestLap(track.id);
      const card = el('div', 'track-card' + (i === this.index ? ' selected' : ''));
      const cssColor = '#' + track.theme.edge.toString(16).padStart(6, '0');
      card.innerHTML = `
        <canvas class="thumb" width="292" height="160"></canvas>
        <div class="t-name">${track.name}</div>
        <div class="t-tag" style="color:${cssColor}">${track.tag}</div>
        <div class="t-desc">${track.desc}</div>
        <div class="t-meta">
          <span>RÉCORD VUELTA: ${best ? formatTime(best) : '—'}</span>
        </div>`;
      drawTrackThumb(card.querySelector('canvas'), track, cssColor);
      card.addEventListener('mouseenter', () => {
        if (this.index !== i) {
          this.index = i;
          this._refresh();
        }
      });
      card.addEventListener('click', () => this._go(i));
      this.grid.appendChild(card);
      return card;
    });
  }

  _refresh() {
    this.cards.forEach((c, i) => c.classList.toggle('selected', i === this.index));
  }

  _go(i) {
    const g = this.game;
    g.audio.uiOk();
    g.scenes.change(
      new RaceState(g, {
        mode: 'quick',
        trackId: TRACK_LIST[i].id,
        laps: g.save.settings.laps,
      })
    );
  }

  update(dt) {
    const input = this.game.input;
    const d = input.navRepeat('right', dt) - input.navRepeat('left', dt);
    if (d !== 0) {
      this.index = (((this.index + d) % TRACK_LIST.length) + TRACK_LIST.length) % TRACK_LIST.length;
      this.game.audio.uiMove();
      this._refresh();
    }
    if (input.pressed('ok')) this._go(this.index);
    if (input.pressed('cancel')) {
      this.game.audio.uiBack();
      this.game.scenes.change(new MainMenuState(this.game));
    }
  }

  render() {
    /* mantiene el último frame del garaje como fondo */
  }

  exit() {
    this.root.remove();
  }
}
