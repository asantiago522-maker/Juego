import * as THREE from 'three';
import { checkerTexture, windowsTexture } from './textures.js';
import { rand, randInt } from '../utils/math.js';

/** Cinta triangular cerrada a partir de los nodos de la pista. */
function ribbonGeometry(wp, offset, width, y) {
  const n = wp.count;
  const pos = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) {
    const p = wp.points[i];
    const nr = wp.normals[i];
    const lo = offset + width / 2;
    const ro = offset - width / 2;
    pos[i * 6] = p.x + nr.x * lo;
    pos[i * 6 + 1] = y;
    pos[i * 6 + 2] = p.z + nr.z * lo;
    pos[i * 6 + 3] = p.x + nr.x * ro;
    pos[i * 6 + 4] = y;
    pos[i * 6 + 5] = p.z + nr.z * ro;
  }
  const idx = [];
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = ((i + 1) % n) * 2;
    const d = ((i + 1) % n) * 2 + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Construye la pista completa: asfalto, bordes neón, línea central
 * discontinua, meta, postes de luz y edificios decorativos.
 */
export function buildTrack(scene, track, wp) {
  const theme = track.theme;
  const hw = wp.halfWidth;

  // asfalto
  const road = new THREE.Mesh(
    ribbonGeometry(wp, 0, hw * 2, 0.02),
    new THREE.MeshStandardMaterial({
      color: 0x16122b,
      roughness: 0.85,
      metalness: 0.15,
      emissive: 0x0a0620,
      emissiveIntensity: 0.35,
    })
  );
  scene.add(road);

  // bordes neón
  const edgeMat = new THREE.MeshBasicMaterial({ color: theme.edge, toneMapped: false });
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(ribbonGeometry(wp, side * (hw + 0.35), 0.4, 0.06), edgeMat);
    scene.add(edge);
  }

  // línea central discontinua
  const centerPts = [];
  for (let i = 0; i <= wp.count; i++) {
    const p = wp.points[i % wp.count];
    centerPts.push(new THREE.Vector3(p.x, 0.08, p.z));
  }
  const centerGeo = new THREE.BufferGeometry().setFromPoints(centerPts);
  const center = new THREE.Line(
    centerGeo,
    new THREE.LineDashedMaterial({
      color: theme.accent,
      dashSize: 2.6,
      gapSize: 3.6,
      transparent: true,
      opacity: 0.6,
    })
  );
  center.computeLineDistances();
  scene.add(center);

  // línea de meta
  const meta = new THREE.Mesh(
    new THREE.PlaneGeometry(hw * 2, 2.6),
    new THREE.MeshBasicMaterial({ map: checkerTexture(12, 2), toneMapped: false })
  );
  meta.rotation.x = -Math.PI / 2;
  const p0 = wp.points[0];
  const d0 = wp.dirs[0];
  meta.position.set(p0.x, 0.09, p0.z);
  meta.rotation.z = -Math.atan2(d0.x, d0.z);
  scene.add(meta);

  // pórtico de meta
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x11101f, roughness: 0.6 });
  const beamMat = new THREE.MeshBasicMaterial({ color: theme.edge, toneMapped: false });
  const nr0 = wp.normals[0];
  for (const side of [-1, 1]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), poleMat);
    pole.position.set(p0.x + nr0.x * side * (hw + 1), 3.5, p0.z + nr0.z * side * (hw + 1));
    scene.add(pole);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(hw * 2 + 2.8, 0.35, 0.35), beamMat);
  beam.position.set(p0.x, 7, p0.z);
  // alinea el eje X del dintel con la normal lateral de la pista
  beam.rotation.y = Math.atan2(-nr0.z, nr0.x);
  scene.add(beam);

  // postes de luz
  const tipMat = new THREE.MeshBasicMaterial({ color: theme.edge, toneMapped: false });
  const postGeo = new THREE.BoxGeometry(0.18, 2.8, 0.18);
  const tipGeo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  for (let i = 0; i < wp.count; i += 7) {
    const side = (i / 7) % 2 === 0 ? 1 : -1;
    const p = wp.points[i];
    const nr = wp.normals[i];
    const x = p.x + nr.x * side * (hw + 1.4);
    const z = p.z + nr.z * side * (hw + 1.4);
    const post = new THREE.Mesh(postGeo, poleMat);
    post.position.set(x, 1.4, z);
    scene.add(post);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(x, 2.95, z);
    scene.add(tip);
  }

  // edificios con ventanas neón
  const winTex = windowsTexture(theme.windows, track.points.length);
  const winTexB = windowsTexture(theme.windows === '#00e5ff' ? '#ff2ec4' : '#00e5ff', track.points.length * 3);
  const buildingMats = [
    new THREE.MeshBasicMaterial({ map: winTex }),
    new THREE.MeshBasicMaterial({ map: winTexB }),
  ];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < wp.count; i += 6) {
    if (Math.random() < 0.45) continue;
    const dist = Math.min(wp.cumDist[i], wp.totalLen - wp.cumDist[i]);
    if (dist < 55) continue; // zona de meta despejada
    const side = Math.random() < 0.5 ? 1 : -1;
    const p = wp.points[i];
    const nr = wp.normals[i];
    const off = hw + 12 + Math.random() * 42;
    const wdt = rand(7, 15);
    const hgt = rand(9, 38);
    const dpt = rand(7, 15);
    const b = new THREE.Mesh(boxGeo, buildingMats[randInt(0, buildingMats.length - 1)]);
    b.scale.set(wdt, hgt, dpt);
    b.position.set(p.x + nr.x * side * off, hgt / 2 - 0.1, p.z + nr.z * side * off);
    const dir = wp.dirs[i];
    b.rotation.y = Math.atan2(dir.x, dir.z);
    scene.add(b);
  }
}
