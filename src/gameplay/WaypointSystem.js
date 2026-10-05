import * as THREE from 'three';
import { clamp, mod } from '../utils/math.js';

/**
 * Sistema de waypoints de pista.
 * A partir de puntos de control genera una spline Catmull-Rom cerrada y
 * la muestrea en nodos equidistantes con dirección, normal lateral,
 * distancia acumulada y curvatura (para frenada de la IA).
 */
export class WaypointSystem {
  constructor(controlPoints, { halfWidth = 8, samples = 720 } = {}) {
    this.halfWidth = halfWidth;
    const vecs = controlPoints.map((p) => new THREE.Vector3(p[0], 0, p[1]));
    this.curve = new THREE.CatmullRomCurve3(vecs, true, 'catmullrom', 0.5);

    this.count = samples;
    this.points = [];
    this.cumDist = [];
    let prev = null;
    let acc = 0;
    for (let i = 0; i < samples; i++) {
      const p = this.curve.getPointAt(i / samples);
      if (prev) acc += p.distanceTo(prev);
      this.cumDist.push(acc);
      this.points.push(p);
      prev = p;
    }
    this.totalLen = acc + this.points[0].distanceTo(prev);
    this.spacing = this.totalLen / this.count;

    // Direcciones y normales (laterales) por nodo.
    this.dirs = [];
    this.normals = [];
    for (let i = 0; i < samples; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % samples];
      const d = new THREE.Vector3().subVectors(b, a);
      d.y = 0;
      d.normalize();
      this.dirs.push(d);
      this.normals.push(new THREE.Vector3(d.z, 0, -d.x));
    }

    // Curvatura por nodo (ángulo entre direcciones / distancia).
    this.curvature = new Array(samples).fill(0);
    for (let i = 0; i < samples; i++) {
      const d1 = this.dirs[(i - 1 + samples) % samples];
      const d2 = this.dirs[i];
      const ang = Math.acos(THREE.MathUtils.clamp(d1.dot(d2), -1, 1));
      this.curvature[i] = ang / this.spacing;
    }

    // Curvatura máxima en la ventana de frenada por delante (~48 m).
    const win = Math.max(4, Math.round(48 / this.spacing));
    this.curvatureAhead = new Array(samples);
    for (let i = 0; i < samples; i++) {
      let m = 0;
      for (let k = 0; k < win; k++) {
        const c = this.curvature[(i + k) % samples];
        if (c > m) m = c;
      }
      this.curvatureAhead[i] = m;
    }
  }

  indexAtDistance(d) {
    d = mod(d, this.totalLen);
    return Math.round(d / this.spacing) % this.count;
  }

  /** Punto interpolado sobre la línea de carrera a una distancia dada. */
  pointAtDistance(d) {
    const dd = mod(d, this.totalLen);
    const f = dd / this.spacing;
    const i = Math.floor(f) % this.count;
    const j = (i + 1) % this.count;
    const tt = clamp(f - Math.floor(f), 0, 1);
    const point = new THREE.Vector3().lerpVectors(this.points[i], this.points[j], tt);
    const dir = new THREE.Vector3().lerpVectors(this.dirs[i], this.dirs[j], tt).normalize();
    const normal = new THREE.Vector3(dir.z, 0, -dir.x);
    return { point, dir, normal, index: i };
  }

  /**
   * Nodo más cercano a `pos` buscando en una ventana alrededor de `hint`.
   * Devuelve índice, desplazamiento lateral con signo y distancia².
   */
  nearest(pos, hint = 0, windowSize = 42) {
    let best = 0;
    let bd = Infinity;
    const n = this.count;
    for (let o = -windowSize; o <= windowSize; o++) {
      const i = mod(hint + o, n);
      const p = this.points[i];
      const dx = pos.x - p.x;
      const dz = pos.z - p.z;
      const d = dx * dx + dz * dz;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    const p = this.points[best];
    const nr = this.normals[best];
    const lateral = (pos.x - p.x) * nr.x + (pos.z - p.z) * nr.z;
    return { index: best, lateral, dist2: bd };
  }
}
