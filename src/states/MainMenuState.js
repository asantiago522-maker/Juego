import { el } from '../ui/dom.js';
import { MenuList } from '../ui/MenuList.js';
import { createMenuScene, disposeScene } from '../render/SceneFactory.js';
import { TOURNAMENT } from '../data/tournament.js';
import { CharacterSelectState } from './CharacterSelectState.js';
import { SettingsState } from './SettingsState.js';
import { TournamentIntroState } from './TournamentIntroState.js';
import { RaceState } from './RaceState.js';

/** Menú principal con fondo synthwave animado. */
export class MainMenuState {
  constructor(game) {
    this.game = game;
    this.t = 0;
  }

  enter() {
    const g = this.game;
    const built = createMenuScene();
    this.scene = built.scene;
    this.camera = built.camera;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 7, 26);
    this.camera.lookAt(0, 3, 0);

    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };
    g.events.on('resize', this._onResize);

    this.root = el('div', 'screen');
    this.root.innerHTML = `
      <div class="brand-small">NEON<span>RUSH</span></div>
      <h1 class="logo" style="font-size:min(7vw,58px); margin-bottom:4px;">NEON<span>RUSH</span></h1>
      <div class="logo-line" style="margin-bottom:26px;"></div>
    `;
    this.menuHolder = el('div');
    this.root.appendChild(this.menuHolder);
    this.root.insertAdjacentHTML(
      'beforeend',
      `<div class="hintbar"><b>↑↓</b> navegar · <b>ENTER</b> seleccionar · <b>ESC</b> salir</div>
       <div class="version-tag">v1.0 · COPA NEÓN</div>`
    );
    g.scenes.uiEl.appendChild(this.root);

    this._buildMenu();
    g.audio.playMusic('menu');
  }

  _buildMenu() {
    const g = this.game;
    const t = g.save.tournament;
    const tourActive = t && t.raceIndex < TOURNAMENT.trackIds.length;

    const items = [
      { id: 'quick', label: 'Carrera Rápida', sub: 'vs 3 rivales' },
      {
        id: 'tournament',
        label: tourActive ? 'Continuar Torneo' : 'Torneo',
        sub: tourActive ? `${TOURNAMENT.name} · Carrera ${Math.min(t.raceIndex + 1, 3)}/3` : TOURNAMENT.name,
      },
      { id: 'garage', label: 'Garaje / Selección', sub: 'pilotos y coches' },
      { id: 'settings', label: 'Ajustes' },
      { id: 'exit', label: 'Salir' },
    ];

    this.menu = new MenuList(this.menuHolder, items, g, {
      onActivate: (item) => this._activate(item.id),
    });
  }

  _activate(id) {
    const g = this.game;
    switch (id) {
      case 'quick':
        g.scenes.change(new CharacterSelectState(g, { next: 'track' }));
        break;
      case 'tournament': {
        const t = g.save.tournament;
        if (t && t.raceIndex < TOURNAMENT.trackIds.length) {
          g.scenes.change(
            new RaceState(g, { mode: 'tournament', raceIndex: t.raceIndex })
          );
        } else {
          g.scenes.change(new TournamentIntroState(g));
        }
        break;
      }
      case 'garage':
        g.scenes.change(new CharacterSelectState(g, { next: 'menu' }));
        break;
      case 'settings':
        g.scenes.change(new SettingsState(g));
        break;
      case 'exit':
        this._showExit();
        break;
    }
  }

  _showExit() {
    const g = this.game;
    g.audio.uiBack();
    const ov = el('div', 'overlay');
    ov.innerHTML = `
      <h2>¡HASTA LA PRÓXIMA!</h2>
      <p style="color:var(--dim); letter-spacing:1px;">Puedes cerrar esta pestaña para salir del juego.</p>
    `;
    const back = el('button', 'big-btn');
    back.textContent = 'VOLVER';
    back.addEventListener('click', () => ov.remove());
    ov.appendChild(back);
    this.root.appendChild(ov);
    window.setTimeout(() => {
      try { window.close(); } catch { /* no-op */ }
    }, 60);
  }

  update(dt) {
    this.t += dt;
    this.menu.update(this.game.input, dt);
  }

  render(dt) {
    // deriva suave de cámara
    this.camera.position.x = Math.sin(this.t * 0.12) * 3.5;
    this.camera.position.y = 7 + Math.sin(this.t * 0.2) * 0.6;
    this.camera.lookAt(0, 3, 0);
    this.game.renderer.render(this.scene, this.camera);
  }

  exit() {
    this.game.events.off('resize', this._onResize);
    this.root.remove();
    disposeScene(this.scene);
  }
}
