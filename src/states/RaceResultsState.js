import { el } from '../ui/dom.js';
import { MenuList } from '../ui/MenuList.js';
import { formatTime } from '../utils/math.js';
import { POINTS } from '../data/drivers.js';
import { TOURNAMENT } from '../data/tournament.js';
import { RaceState } from './RaceState.js';
import { TrackSelectState } from './TrackSelectState.js';
import { MainMenuState } from './MainMenuState.js';
import { TournamentStandingState } from './TournamentStandingState.js';

/** Resultados de una carrera (y puntos acumulados si es torneo). */
export class RaceResultsState {
  constructor(game, { result, config }) {
    this.game = game;
    this.result = result;
    this.config = config;
  }

  enter() {
    const g = this.game;
    const r = this.result;
    const isTour = r.mode === 'tournament';

    this.root = el('div', 'screen');
    this.root.innerHTML = `
      <div class="brand-small">NEON<span>RUSH</span></div>
      <h2 class="screen-title" style="font-size:24px;">${r.trackName.toUpperCase()} · RESULTADO</h2>
      ${isTour ? `<div class="subtitle">${TOURNAMENT.name} · Carrera ${Math.min((g.save.tournament?.raceIndex ?? 1), 3)} de 3</div>` : ''}
    `;

    // tabla de resultados
    const table = el('table', 'result-table');
    let html = `<tr><th>POS</th><th>PILOTO</th><th>COCHE</th><th>TIEMPO</th><th>MEJOR VUELTA</th>${isTour ? '<th>PTS</th>' : ''}</tr>`;
    for (const o of r.order) {
      const pts = isTour ? POINTS[o.position - 1] : null;
      html += `
        <tr class="${o.isPlayer ? 'me' : ''}">
          <td><span class="pos-badge p${o.position}">${o.position}</span></td>
          <td><span class="driver-cell" style="color:${o.color}"><span class="dot"></span>${o.name}</span></td>
          <td style="color:var(--dim)">${o.carName}</td>
          <td class="time-cell">${o.timeMs != null ? formatTime(o.timeMs) : '—'}</td>
          <td class="time-cell" style="color:var(--dim)">${formatTime(o.bestLapMs)}</td>
          ${isTour ? `<td class="pts-cell">+${pts}</td>` : ''}
        </tr>`;
    }
    table.innerHTML = html;
    this.root.appendChild(table);

    // puntos ganados
    if (isTour) {
      const me = r.order.find((o) => o.isPlayer);
      const earned = POINTS[me.position - 1];
      const chip = el('div', 'points-chip', `HAS GANADO ${earned} PUNTOS`);
      this.root.appendChild(chip);
    }

    // botones
    const holder = el('div');
    this.root.appendChild(holder);
    const items = isTour ? this._tournamentButtons(g) : [
      { id: 'retry', label: 'Reintentar' },
      { id: 'tracks', label: 'Elegir otra pista' },
      { id: 'menu', label: 'Menú principal' },
    ];
    this.menu = new MenuList(holder, items, g, { onActivate: (it) => this._activate(it.id) });

    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="hintbar"><b>↑↓</b> elegir · <b>ENTER</b> continuar</div>`
    );
    g.scenes.uiEl.appendChild(this.root);
  }

  _tournamentButtons(g) {
    const t = g.save.tournament;
    const done = t.raceIndex >= TOURNAMENT.trackIds.length;
    if (done) {
      return [{ id: 'standing', label: 'Ver clasificación final' }];
    }
    return [{ id: 'next', label: `Siguiente carrera (${t.raceIndex + 1}/3)` }];
  }

  _activate(id) {
    const g = this.game;
    switch (id) {
      case 'retry':
        g.scenes.change(new RaceState(g, this.config));
        break;
      case 'tracks':
        g.scenes.change(new TrackSelectState(g));
        break;
      case 'menu':
        g.scenes.change(new MainMenuState(g));
        break;
      case 'next':
        g.scenes.change(new RaceState(g, { mode: 'tournament', raceIndex: g.save.tournament.raceIndex }));
        break;
      case 'standing':
        g.scenes.change(new TournamentStandingState(g));
        break;
    }
  }

  update(dt) {
    this.menu.update(this.game.input, dt);
  }

  render() {
    /* fondo congelado de la carrera anterior */
  }

  exit() {
    this.root.remove();
  }
}
