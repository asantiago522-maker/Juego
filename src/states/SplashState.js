import * as THREE from 'three';
import { el } from '../ui/dom.js';
import { MainMenuState } from './MainMenuState.js';

/** Pantalla de entrada: logo animado + salto con cualquier tecla. */
export class SplashState {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.done = false;
  }

  enter() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05030f);
    this.camera = new THREE.PerspectiveCamera(60, 1, 1, 10);

    this.root = el('div', 'screen');
    this.root.innerHTML = `
      <div class="logo-sub">ARC RACING PRESENTA</div>
      <h1 class="logo">NEON<span>RUSH</span></h1>
      <div class="logo-line"></div>
      <div class="press">PULSA CUALQUIER TECLA PARA CONTINUAR</div>
    `;
    this.root.addEventListener('click', () => this.finish());
    this.game.scenes.uiEl.appendChild(this.root);

    this.game.audio.playMusic('menu');
    this.timer = setTimeout(() => this.finish(), 3800);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timer);
    this.game.scenes.change(new MainMenuState(this.game));
  }

  update(dt) {
    this.t += dt;
    if (this.t > 0.7 && this.game.input.pressedAny) this.finish();
  }

  render() {
    this.game.renderer.render(this.scene, this.camera);
  }

  exit() {
    this.root.remove();
  }
}
