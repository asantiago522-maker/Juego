import * as THREE from 'three';
import { clamp } from '../utils/math.js';

/**
 * Modelos low-poly procedimentales. Cada coche se construye a partir de
 * cajas con materiales emisivos neón. `create` devuelve un objeto con el
 * grupo 3D y una función update() que sincroniza el visual con la física.
 */
function bodyMaterials(car) {
  const paintColor = new THREE.Color(car.colorHex).multiplyScalar(0.55);
  return {
    paint: new THREE.MeshStandardMaterial({ color: paintColor, metalness: 0.7, roughness: 0.32 }),
    trim: new THREE.MeshBasicMaterial({ color: car.colorHex, toneMapped: false }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0a0f1e, metalness: 0.9, roughness: 0.12 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0c0a14, roughness: 0.9 }),
    white: new THREE.MeshBasicMaterial({ color: 0xf8f4ff, toneMapped: false }),
  };
}

const DIMS = {
  vector: { w: 2.1, h: 0.55, l: 4.4, cab: [1.5, 0.5, 2.0, -0.3] },
  pulsar: { w: 2.0, h: 0.42, l: 4.9, cab: [1.3, 0.4, 1.6, -0.6] },
  bastion: { w: 2.5, h: 0.8, l: 4.1, cab: [1.9, 0.55, 1.8, -0.2] },
};

export function createCar(car, opts = {}) {
  const accent = opts.accent || '#ffffff';
  const d = DIMS[car.modelId] || DIMS.vector;
  const M = bodyMaterials(car);

  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  // carrocería
  const body = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.l), M.paint);
  body.position.y = 0.5 + d.h / 2;
  bodyGroup.add(body);

  // cabina
  const cab = new THREE.Mesh(new THREE.BoxGeometry(...d.cab.slice(0, 3)), M.glass);
  cab.position.set(0, 0.5 + d.h + d.cab[1] / 2 - 0.02, d.cab[3]);
  bodyGroup.add(cab);

  // franjas neón laterales
  const stripGeo = new THREE.BoxGeometry(0.06, 0.12, d.l * 0.82);
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(stripGeo, M.trim);
    strip.position.set(side * (d.w / 2 + 0.02), 0.62, 0);
    bodyGroup.add(strip);
  }

  // barra trasera (piloto) y faros delanteros
  const tail = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.86, 0.14, 0.1), M.trim);
  tail.position.set(0, 0.72, -d.l / 2 - 0.02);
  bodyGroup.add(tail);
  for (const side of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.1), M.white);
    hl.position.set(side * d.w * 0.3, 0.72, d.l / 2 + 0.02);
    bodyGroup.add(hl);
  }

  // franja de techo con el color del piloto
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.03, d.l * 0.6),
    new THREE.MeshBasicMaterial({ color: accent, toneMapped: false })
  );
  stripe.position.set(0, 0.5 + d.h + 0.03, 0);
  bodyGroup.add(stripe);

  // alerón para el veloz
  if (car.modelId === 'pulsar') {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(d.w * 0.95, 0.08, 0.5), M.paint);
    wing.position.set(0, 1.12, -d.l / 2 + 0.2);
    bodyGroup.add(wing);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.12), M.dark);
      post.position.set(side * d.w * 0.38, 0.95, -d.l / 2 + 0.2);
      bodyGroup.add(post);
    }
  }

  // ruedas
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  const steerWheels = [];
  const wz = d.l * 0.33;
  const wx = d.w / 2 + 0.05;
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new THREE.Mesh(wheelGeo, M.dark);
    w.position.set(sx * wx, 0.42, sz * wz);
    group.add(w);
    wheels.push(w);
    if (sz === 1) steerWheels.push(w);
  }

  // resplandor bajo el coche (underglow)
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(d.w * 1.7, d.l * 1.15),
    new THREE.MeshBasicMaterial({
      color: car.colorHex,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.075;
  group.add(glow);

  // sombra falsa
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(Math.max(d.w, d.l) * 0.62, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  return {
    group,
    update(dt, v) {
      group.position.set(v.pos.x, 0, v.pos.z);
      group.rotation.y = v.heading;
      // balanceo y cabeceo suaves
      bodyGroup.rotation.z = -v.steerVis * 0.07;
      bodyGroup.rotation.x = clamp(-v.accelSmooth * 0.006, -0.05, 0.05);
      // ruedas
      const spin = (v.speed * dt) / 0.42;
      for (const w of wheels) w.rotation.x += spin;
      for (const w of steerWheels) w.rotation.y = v.steerVis * 0.42;
    },
  };
}
