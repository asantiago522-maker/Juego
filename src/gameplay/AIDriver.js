import { clamp, normAngle } from '../utils/math.js';

/**
 * Conductor IA: persigue un punto de la línea de carrera con lookahead,
 * frena según la curvatura próxima, esquiva rivales, aplica rubber-banding
 * y se recupera si se queda atascado.
 */
export class AIDriver {
  constructor(vehicle, opts = {}) {
    this.v = vehicle;
    this.wp = vehicle.wp;
    this.skill = opts.skill ?? 1; // multiplicador de velocidad de paso por curva
    this.topMul = opts.topMul ?? 1; // multiplicador de velocidad punta (dificultad)
    this.rubber = opts.rubber ?? 0.09; // intensidad del rubber-banding
    this.aggression = opts.aggression ?? 0.5;
    this.reaction = opts.reaction ?? 0.2; // segundos de reacción tras el GO
    this.lineOffset = opts.lineOffset ?? 0;
    this.phase = Math.random() * 10;
    this.stuckT = 0;
  }

  update(dt, ctx) {
    const v = this.v;
    const st = v.stats;

    if (!ctx.racing) {
      v.controls.throttle = 0;
      v.controls.steer = 0;
      return;
    }
    if (ctx.clock < this.reaction) {
      v.controls.throttle = 0;
      return;
    }

    const L = this.wp.totalLen;

    // Rubber-banding: alcanza si va muy atrás, afloja si abre mucha ventaja.
    const gap = (ctx.playerDist - v.raceDist) / L;
    let rb = 1 + clamp(gap, -0.8, 0.8) * this.rubber * 2.2;
    rb = clamp(rb, 0.88, 1.16);
    let topEff = st.topSpeed * this.topMul * rb;
    if (v.finishedFlag) topEff = Math.min(topEff, 17);

    // Punto objetivo por delante, con desplazamiento lateral (línea + evitar rivales).
    const look = 7 + Math.abs(v.speed) * 0.34;
    const smp = this.wp.pointAtDistance(v.raceDist + look);
    let off =
      this.lineOffset * 0.5 +
      Math.sin(ctx.time * 0.7 + this.phase) * 0.5 * Math.max(0.15, 1.05 - this.skill);

    const nr = this.wp.normals[v.idx];
    for (const other of ctx.cars) {
      if (other === v) continue;
      const dx = other.pos.x - v.pos.x;
      const dz = other.pos.z - v.pos.z;
      const fwd = dx * Math.sin(v.heading) + dz * Math.cos(v.heading);
      if (fwd > 0 && fwd < 16) {
        const lat = dx * nr.x + dz * nr.z;
        if (Math.abs(lat) < 3.6) {
          off += -Math.sign(lat || 1) * (3.6 - Math.abs(lat)) * (0.35 + 0.35 * this.aggression);
        }
      }
    }
    const maxOff = this.wp.halfWidth - 1.6;
    off = clamp(off, -maxOff, maxOff);

    const target = smp.point.clone().addScaledVector(smp.normal, off);

    // Dirección hacia el objetivo.
    const tdx = target.x - v.pos.x;
    const tdz = target.z - v.pos.z;
    const desired = Math.atan2(tdx, tdz);
    const diff = normAngle(desired - v.heading);
    v.controls.steer = clamp(diff * 2.4, -1, 1);

    // Velocidad deseada según curvatura próxima.
    const curv = this.wp.curvatureAhead[v.idx];
    const maxLat = st.handling * 13.5 * this.skill;
    let vDes = curv > 1e-4 ? Math.sqrt(maxLat / curv) : 1e9;
    vDes = Math.min(vDes, topEff);
    if (v.finishedFlag) vDes = Math.min(vDes, 16);

    v.controls.throttle = clamp((vDes - v.speed) * 0.5, -1, 1);
    v.controls.drift = false;

    // Recuperación si se queda atascado.
    if (Math.abs(v.speed) < 1.5) {
      this.stuckT += dt;
      if (this.stuckT > 2.5) {
        const smp2 = this.wp.pointAtDistance(Math.max(0, v.raceDist));
        v.pos.copy(smp2.point);
        v.heading = Math.atan2(smp2.dir.x, smp2.dir.z);
        v.speed = 0;
        this.stuckT = 0;
      }
    } else {
      this.stuckT = 0;
    }
  }
}
