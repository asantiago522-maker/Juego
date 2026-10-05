import * as THREE from 'three';
import { el } from '../ui/dom.js';
import { CHARACTER_LIST, avatarSVG } from '../data/characters.js';
import { CAR_LIST, computeStats, STAT_MAX } from '../data/cars.js';
import { createShowroomScene, disposeScene } from '../render/SceneFactory.js';
import { createCar } from '../render/CarModels.js';
import { MainMenuState } from './MainMenuState.js';
import { TrackSelectState } from './TrackSelectState.js';

const STAT_LABELS = [
  ['topSpeed', 'Vel. Máxima'],
  ['accel', 'Aceleración'],
  ['handling', 'Manejo'],
  ['weight', 'Peso'],
];

/**
 * Selección de personaje + coche, con vista previa 3D giratoria del coche
 * y barras de estadísticas combinadas.
 */
export class CharacterSelectState {
  constructor(game, { next = 'menu' } = {}) {
    this.game = game;
    this.next = next;
    this.charIndex = Math.max(0, CHARACTER_LIST.findIndex((c) => c.id === game.save.selection.characterId));
    this.carIndex = Math.max(0, CAR_LIST.findIndex((c) => c.id === game.save.selection.carId));
    if (this.charIndex < 0) this.charIndex = 0;
    if (this.carIndex < 0) this.carIndex = 0;
    this.spinKick = 0;
  }

  enter() {
    const g = this.game;
    const built = createShowroomScene();
    this.scene = built.scene;
    this.platform = built.platform;
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(5.4, 3.1, 7.4);
    this.camera.lookAt(0, 0.8, 0);

    this._onResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    };
    g.events.on('resize', this._onResize);

    this.carHolder = new THREE.Group();
    this.carHolder.position.y = 0.22;
    this.scene.add(this.carHolder);
    this._mountCar();

    // ----- UI -----
    this.root = el('div', 'screen');
    this.root.innerHTML = `
      <div class="brand-small">NEON<span>RUSH</span></div>
      <h2 class="screen-title" style="font-size:26px;">GARAJE · SELECCIÓN</h2>
      <div class="select-layout">
        <div class="panel" id="charPanel"><h2>PILOTO</h2></div>
        <div class="panel car-panel" id="carPanel"><h2>COCHE</h2></div>
      </div>
      <div class="confirm-bar"><b>ENTER</b> confirmar · <b>←→</b> cambiar coche · <b>↑↓</b> cambiar piloto · <b>ESC</b> volver</div>
    `;
    g.scenes.uiEl.appendChild(this.root);

    this.charPanel = this.root.querySelector('#charPanel');
    this.carPanel = this.root.querySelector('#carPanel');
    this._buildCharCards();
    this._buildCarPanel();
  }

  _mountCar() {
    // retira el coche anterior
    while (this.carHolder.children.length) {
      const c = this.carHolder.children[0];
      this.carHolder.remove(c);
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    }
    const car = CAR_LIST[this.carIndex];
    const visual = createCar(car, { accent: CHARACTER_LIST[this.charIndex].color });
    this.carHolder.add(visual.group);
  }

  _buildCharCards() {
    this.charPanel.querySelectorAll('.char-card').forEach((n) => n.remove());
    this.charCards = CHARACTER_LIST.map((c, i) => {
      const card = el('div', 'char-card' + (i === this.charIndex ? ' selected' : ''));
      card.innerHTML = `
        <div class="avatar">${avatarSVG(c.id, c.color)}</div>
        <div>
          <div class="c-name">${c.name}</div>
          <div class="c-arch" style="color:${c.color}">${c.archetype}</div>
          <div class="c-story">${c.story}</div>
          <div class="chips">${c.chips.map((ch) => `<span class="chip">${ch}</span>`).join('')}</div>
        </div>`;
      card.addEventListener('mouseenter', () => {
        if (this.charIndex !== i) {
          this.charIndex = i;
          this._refresh();
        }
      });
      card.addEventListener('click', () => {
        this.charIndex = i;
        this._refresh();
      });
      this.charPanel.appendChild(card);
      return card;
    });
  }

  _buildCarPanel() {
    this.carPanel.querySelectorAll('.car-info').forEach((n) => n.remove());
    const info = el('div', 'car-info');
    const car = CAR_LIST[this.carIndex];
    info.innerHTML = `
      <div class="car-name" style="color:${car.colorCss}">${car.name}</div>
      <div class="car-tag" style="color:${car.colorCss}">${car.tag}</div>
      <div class="car-desc">${car.desc}</div>
      <div class="stats-wrap"></div>
    `;
    const wrap = info.querySelector('.stats-wrap');
    const stats = computeStats(car, CHARACTER_LIST[this.charIndex]);
    for (const [key, label] of STAT_LABELS) {
      const raw = key === 'weight' ? car.stats.weight * ((CHARACTER_LIST[this.charIndex].mods.mass) ?? 1) : stats[key];
      const pct = Math.min(100, Math.round((raw / STAT_MAX[key]) * 100));
      const row = el('div', 'stat-row');
      row.innerHTML = `
        <span class="s-label">${label}</span>
        <div class="stat-bar"><div class="stat-fill" style="width:${pct}%"></div></div>
        <span class="s-val">${key === 'weight' ? raw.toFixed(1) : Math.round(raw)}</span>`;
      wrap.appendChild(row);
    }
    this.carPanel.appendChild(info);

    if (!this.switchEl) {
      this.switchEl = el('div', 'car-switch', `◀ <b>←→</b> CAMBIAR COCHE ▶`);
      this.carPanel.appendChild(this.switchEl);
    }
  }

  _refresh() {
    this.charCards.forEach((c, i) => c.classList.toggle('selected', i === this.charIndex));
    this._buildCarPanel();
    this._mountCar();
  }

  _confirm() {
    const g = this.game;
    g.audio.uiOk();
    g.save.setSelection({
      characterId: CHARACTER_LIST[this.charIndex].id,
      carId: CAR_LIST[this.carIndex].id,
    });
    if (this.next === 'track') g.scenes.change(new TrackSelectState(g, { mode: 'quick' }));
    else g.scenes.change(new MainMenuState(g));
  }

  update(dt) {
    const input = this.game.input;
    const dv = input.navRepeat('up', dt) - input.navRepeat('down', dt);
    if (dv !== 0) {
      this.charIndex = (((this.charIndex - dv) % CHARACTER_LIST.length) + CHARACTER_LIST.length) % CHARACTER_LIST.length;
      this.game.audio.uiMove();
      this._refresh();
    }
    const dh = input.navRepeat('right', dt) - input.navRepeat('left', dt);
    if (dh !== 0) {
      this.carIndex = (((this.carIndex + dh) % CAR_LIST.length) + CAR_LIST.length) % CAR_LIST.length;
      this.spinKick = 2.4;
      this.game.audio.uiMove();
      this._refresh();
    }
    if (input.pressed('ok')) this._confirm();
    if (input.pressed('cancel')) {
      this.game.audio.uiBack();
      this.game.scenes.change(new MainMenuState(this.game));
    }
  }

  render(dt) {
    this.spinKick = Math.max(0, this.spinKick - dt * 1.4);
    this.carHolder.rotation.y += dt * (0.55 + this.spinKick);
    this.game.renderer.render(this.scene, this.camera);
  }

  exit() {
    this.game.events.off('resize', this._onResize);
    this.root.remove();
    disposeScene(this.scene);
  }
}
