import { el, drawTrackThumb } from '../ui/dom.js';
import { TOURNAMENT } from '../data/tournament.js';
import { TRACKS } from '../data/tracks.js';
import { RIVALS } from '../data/drivers.js';
import { CHARACTERS, avatarSVG } from '../data/characters.js';
import { CARS } from '../data/cars.js';
import { MainMenuState } from './MainMenuState.js';
import { RaceState } from './RaceState.js';

/** Presentación del torneo: calendario, rivales y reglas. */
export class TournamentIntroState {
  constructor(game) {
    this.game = game;
  }

  enter() {
    const g = this.game;
    this.root = el('div', 'screen');
    this.root.innerHTML = `<h2 class="screen-title amber">${TOURNAMENT.name.toUpperCase()}</h2>`;

    const wrap = el('div', 'tourney-wrap');

    // calendario
    const cal = el('div', 'panel tourney-col');
    cal.innerHTML = `<h2>CALENDARIO · 3 CARRERAS</h2>`;
    TOURNAMENT.trackIds.forEach((id, i) => {
      const track = TRACKS[id];
      const cssColor = '#' + track.theme.edge.toString(16).padStart(6, '0');
      const row = el('div', 'rival-row');
      row.style.gap = '16px';
      row.innerHTML = `
        <canvas class="thumb" width="120" height="66" style="width:120px;height:66px;background:#0a0620;"></canvas>
        <div>
          <div class="r-name">CARRERA ${i + 1} · ${track.name.toUpperCase()}</div>
          <div class="r-sub">${track.tag} · ${TOURNAMENT.lapsPerRace} vueltas</div>
        </div>`;
      drawTrackThumb(row.querySelector('canvas'), track, cssColor);
      cal.appendChild(row);
    });
    cal.insertAdjacentHTML(
      'beforeend',
      `<div class="rule-box" style="margin-top:10px;"><b>PUNTUACIÓN</b><br/>
       1º = ${TOURNAMENT.points[0]} pts · 2º = ${TOURNAMENT.points[1]} pts · 3º = ${TOURNAMENT.points[2]} pts · 4º = ${TOURNAMENT.points[3]} pts<br/>
       Gana quien sume más puntos al final de las 3 carreras.</div>`
    );
    wrap.appendChild(cal);

    // rivales
    const riv = el('div', 'panel tourney-col');
    riv.innerHTML = `<h2>RIVALES</h2>`;
    for (const r of RIVALS) {
      const ch = CHARACTERS[r.characterId];
      const row = el('div', 'rival-row');
      row.innerHTML = `
        <div class="avatar">${avatarSVG(ch.id, r.color)}</div>
        <div>
          <div class="r-name" style="color:${r.color}">${r.name.toUpperCase()}</div>
          <div class="r-sub">${ch.name} · ${CARS[r.carId].name} · ${r.style}</div>
        </div>`;
      riv.appendChild(row);
    }
    riv.insertAdjacentHTML(
      'beforeend',
      `<div class="rule-box" style="margin-top:10px;"><b>TU GARAJE</b><br/>
       ${CHARACTERS[g.save.selection.characterId].name} con el ${CARS[g.save.selection.carId].name}.<br/>
       Puedes cambiarlo en el Garaje antes de empezar.</div>`
    );
    wrap.appendChild(riv);

    this.root.appendChild(wrap);

    const btn = el('button', 'big-btn');
    btn.textContent = 'EMPEZAR TORNEO';
    btn.addEventListener('click', () => this._start());
    this.root.appendChild(btn);
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="hintbar"><b>ENTER</b> empezar · <b>ESC</b> volver</div>`
    );
    g.scenes.uiEl.appendChild(this.root);
    this.btn = btn;
    g.audio.playMusic('menu');
  }

  _start() {
    const g = this.game;
    g.audio.uiOk();
    const points = { player: 0 };
    for (const r of RIVALS) points[r.id] = 0;
    g.save.setTournament({ raceIndex: 0, points, history: [] });
    g.scenes.change(new RaceState(g, { mode: 'tournament', raceIndex: 0 }));
  }

  update(dt) {
    const input = this.game.input;
    if (input.pressed('ok')) {
      this._start();
    } else if (input.pressed('cancel')) {
      this.game.audio.uiBack();
      this.game.scenes.change(new MainMenuState(this.game));
    }
  }

  render() {
    /* fondo persistente */
  }

  exit() {
    this.root.remove();
  }
}
