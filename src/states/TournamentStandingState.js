import { el } from '../ui/dom.js';
import { MenuList } from '../ui/MenuList.js';
import { TOURNAMENT } from '../data/tournament.js';
import { TRACKS } from '../data/tracks.js';
import { RIVALS } from '../data/drivers.js';
import { MainMenuState } from './MainMenuState.js';
import { TournamentIntroState } from './TournamentIntroState.js';

function driverLabel(id) {
  if (id === 'player') return { name: 'TÚ', color: '#ffffff' };
  const r = RIVALS.find((x) => x.id === id);
  return r ? { name: r.name, color: r.color } : { name: id, color: '#888' };
}

/** Clasificación final del torneo. */
export class TournamentStandingState {
  constructor(game) {
    this.game = game;
  }

  enter() {
    const g = this.game;
    const t = g.save.tournament || { points: {}, history: [] };

    // ordenar: puntos desc, luego suma de posiciones asc, luego última carrera
    const ids = Object.keys(t.points);
    const lastRace = t.history[t.history.length - 1];
    const rows = ids
      .map((id) => ({
        id,
        pts: t.points[id],
        sumPos: t.history.reduce((acc, h) => acc + (h.positions[id] ?? 9), 0),
        lastPos: lastRace ? lastRace.positions[id] ?? 9 : 9,
      }))
      .sort(
        (a, b) => b.pts - a.pts || a.sumPos - b.sumPos || a.lastPos - b.lastPos
      );

    const champion = rows[0];
    const champLabel = driverLabel(champion.id);
    const playerWon = champion.id === 'player';

    this.root = el('div', 'screen');
    this.root.innerHTML = `
      <div class="brand-small">NEON<span>RUSH</span></div>
      <h2 class="screen-title amber" style="font-size:26px;">${TOURNAMENT.name.toUpperCase()} · CLASIFICACIÓN FINAL</h2>
      <div class="champ-banner">🏆 CAMPEÓN: ${champLabel.name}${playerWon ? ' · ¡ERES TÚ!' : ''}</div>
    `;

    const table = el('table', 'result-table');
    let html = `<tr><th>POS</th><th>PILOTO</th>`;
    TOURNAMENT.trackIds.forEach((tid, i) => {
      html += `<th>C${i + 1} · ${TRACKS[tid].name.split(' ')[0].toUpperCase()}</th>`;
    });
    html += `<th>TOTAL</th></tr>`;

    rows.forEach((row, i) => {
      const d = driverLabel(row.id);
      html += `<tr class="${row.id === 'player' ? 'me' : ''} ${i === 0 ? 'champ' : ''}">
        <td><span class="pos-badge p${i + 1}">${i + 1}</span></td>
        <td><span class="driver-cell" style="color:${d.color}"><span class="dot"></span>${d.name}</span></td>`;
      t.history.forEach((h) => {
        const p = h.positions[row.id] ?? '—';
        const pts = p !== '—' ? TOURNAMENT.points[p - 1] : 0;
        html += `<td class="time-cell">${p}º <span style="color:var(--faint)">(${pts})</span></td>`;
      });
      html += `<td class="pts-cell" style="font-size:18px;">${row.pts}</td></tr>`;
    });
    table.innerHTML = html;
    this.root.appendChild(table);

    const holder = el('div');
    this.root.appendChild(holder);
    this.menu = new MenuList(holder, [
      { id: 'repeat', label: 'Repetir torneo' },
      { id: 'menu', label: 'Menú principal' },
    ], g, {
      onActivate: (item) => {
        if (item.id === 'repeat') g.scenes.change(new TournamentIntroState(g));
        else g.scenes.change(new MainMenuState(g));
      },
    });

    this.root.insertAdjacentHTML('beforeend', `<div class="hintbar"><b>↑↓</b> elegir · <b>ENTER</b> continuar</div>`);
    g.scenes.uiEl.appendChild(this.root);
    g.audio.fanfare();
  }

  update(dt) {
    this.menu.update(this.game.input, dt);
  }

  render() {
    /* fondo congelado */
  }

  exit() {
    this.root.remove();
  }
}
