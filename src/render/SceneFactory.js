import * as THREE from 'three';
import { buildTrack } from './TrackBuilder.js';
import { sunTexture } from './textures.js';

function addStars(scene, count = 420) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.42;
    const r = 900 + Math.random() * 260;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) * 0.6 + 40;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x9f8fff,
    size: 1.7,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.8,
    fog: false,
  });
  scene.add(new THREE.Points(geo, mat));
}

function addSun(scene, azimuth, color = '#ff2ec4') {
  const tex = sunTexture(color);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false })
  );
  const r = 920;
  sprite.position.set(Math.sin(azimuth) * r, 120, Math.cos(azimuth) * r);
  sprite.scale.set(430, 430, 1);
  scene.add(sprite);
}

/** Escena de carrera completa para una pista dada. */
export function createRaceScene(track, wp) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0518);
  scene.fog = new THREE.Fog(0x0a0518, 70, 460);

  scene.add(new THREE.HemisphereLight(0x6a5cff, 0x1a0b2e, 1.0));
  const sun = new THREE.DirectionalLight(0xff71c4, 0.85);
  sun.position.set(Math.sin(track.sunAz) * 100, 60, Math.cos(track.sunAz) * 100);
  scene.add(sun);

  // suelo y rejilla synthwave
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1600, 48),
    new THREE.MeshBasicMaterial({ color: 0x07041c })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.08;
  scene.add(ground);
  const grid = new THREE.GridHelper(2200, 110, track.theme.edge, 0x1c1245);
  grid.position.y = -0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  scene.add(grid);

  addStars(scene);
  addSun(scene, track.sunAz);
  buildTrack(scene, track, wp);

  return { scene };
}

/** Escena del garaje/showroom para la selección de coche. */
export function createShowroomScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x08051a);
  scene.fog = new THREE.Fog(0x08051a, 25, 90);

  scene.add(new THREE.HemisphereLight(0x7f6fff, 0x120a26, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(6, 10, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2ec4, 0.9);
  rim.position.set(-8, 5, -8);
  scene.add(rim);

  const grid = new THREE.GridHelper(120, 60, 0x7c4dff, 0x1a1040);
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.9, 0.22, 40),
    new THREE.MeshStandardMaterial({ color: 0x141030, roughness: 0.5, metalness: 0.6 })
  );
  platform.position.y = 0.11;
  scene.add(platform);
  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.75, 0.06, 8, 60),
    new THREE.MeshBasicMaterial({ color: 0x00e5ff, toneMapped: false })
  );
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = 0.22;
  scene.add(rimRing);

  addStars(scene, 220);

  return { scene, platform };
}

/** Fondo del menú principal: horizonte synthwave estático con deriva suave. */
export function createMenuScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0518);
  scene.fog = new THREE.Fog(0x0a0518, 40, 380);

  scene.add(new THREE.HemisphereLight(0x6a5cff, 0x1a0b2e, 0.8));

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(1200, 40),
    new THREE.MeshBasicMaterial({ color: 0x07041c })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const grid = new THREE.GridHelper(1600, 80, 0xff2ec4, 0x1c1245);
  grid.position.y = 0.02;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  addStars(scene, 300);
  addSun(scene, 0.1, '#ff2ec4');

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2000);
  return { scene, camera };
}

/** Libera geometrías y materiales de una escena. */
export function disposeScene(scene) {
  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
  scene.clear();
}
