import * as THREE from 'three';
import { GameManager } from './core/GameManager.js';
import { SceneManager } from './core/SceneManager.js';
import { EventBus } from './core/EventBus.js';
import { InputManager } from './core/InputManager.js';
import { AudioManager } from './core/AudioManager.js';
import { SaveManager } from './core/SaveManager.js';
import { SplashState } from './states/SplashState.js';

// ---------- renderer ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

// ---------- servicios globales ----------
const game = {
  renderer,
  events: new EventBus(),
  input: new InputManager(),
  save: new SaveManager(),
};
game.audio = new AudioManager(game);
game.scenes = new SceneManager(game, document.getElementById('fade'), document.getElementById('ui'));

game.input.attach();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  game.events.emit('resize', {
    width: window.innerWidth,
    height: window.innerHeight,
    aspect: window.innerWidth / window.innerHeight,
  });
});

// El audio solo puede arrancar tras un gesto del usuario.
const unlock = () => game.audio.ensure();
window.addEventListener('keydown', unlock);
window.addEventListener('pointerdown', unlock);

// ---------- arranque ----------
new GameManager(game, new SplashState(game));
