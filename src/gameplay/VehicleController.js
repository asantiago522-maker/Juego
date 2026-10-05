import * as THREE from 'three';
import { clamp, mod } from '../utils/math.js';
import { computeStats } from '../data/cars.js';

const BRAKE_DECEL = 34;
const MAX_REVERSE = 12;

/**
 * Física arcade de un coche: aceleración, freno/marcha atrás, giro
 * dependiente de velocidad, derrape opcional, penalización fuera de pista
 * y muros que devuelven el coche al asfalto. Todo en el plano XZ.
 */
export class VehicleController {
  constructor({ def, character, waypoints, isPlayer = false }) {
    this.def = def;
    this.character = character;
    this.wp = waypoints;
    this.isPlayer = isPlayer;
    this.stats = computeStats(def, character);
    this.driver = null;

    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.speed = 0;
    this.steerVis = 0;
    this.accelSmooth = 0;
    this._prevSpeed = 0;

    this.controls = { throttle: 0, steer: 0, drift: false };

    this.idx = 0;
    this.lateral = 0;
    this.offtrack = false;
    this.raceDist = 0; // metros recorridos desde la línea de salida (negativo en parrilla)
    this.lastS = 0;
    this.wallCooldown = 0;
    this.finishedFlag = false;
    this.onWallHit = null;
    this.visual = null;
  }

  /** Coloca el coche a `distance` metros de la meta (por detrás) y `lateral` desplazado. */
  place(distance, lateral) {
    const d = mod(distance, this.wp.totalLen);
    const s = this.wp.pointAtDistance(d);
    this.pos.copy(s.point).addScaledVector(s.normal, lateral);
    this.heading = Math.atan2(s.dir.x, s.dir.z);
    this.idx = s.index;
    this.lastS = d;
    this.raceDist = d - this.wp.totalLen;
    this.speed = 0;
    this._prevSpeed = 0;
  }

  update(dt) {
    if (dt <= 0) return;
    const st = this.stats;
    const c = this.controls;

    const cap = this.offtrack ? st.topSpeed * 0.45 : st.topSpeed;

    // --- aceleración / freno ---
    if (c.throttle > 0) {
      this.speed += st.accel * c.throttle * dt * Math.max(0.06, 1 - this.speed / cap);
    } else if (c.throttle < 0) {
      if (this.speed > 0.6) {
        this.speed += BRAKE_DECEL * c.throttle * dt;
        if (this.speed < 0) this.speed = 0;
      } else {
        this.speed = Math.max(-MAX_REVERSE, this.speed + st.accel * 0.5 * c.throttle * dt);
      }
    }

    // --- fricción / arrastre ---
    // Fuera de pista: penalización fuerte. Dentro: arrastre leve para que
    // la velocidad punta venga dictada por las stats del coche.
    const dragK = this.offtrack ? 1.7 : 0.02;
    this.speed -= this.speed * dragK * dt;
    if (!this.offtrack) this.speed -= Math.sign(this.speed) * 0.25 * dt;
    if (c.throttle === 0 && Math.abs(this.speed) < 0.08) this.speed = 0;

    // derrape: frena un poco y gira más
    if (c.drift && Math.abs(this.speed) > 5) {
      this.speed -= this.speed * 0.85 * dt;
    }

    if (this.speed > cap) this.speed = Math.max(cap, this.speed - 22 * dt);
    if (this.speed < -MAX_REVERSE) this.speed = -MAX_REVERSE;

    // --- giro ---
    const spd = Math.abs(this.speed);
    const speedFactor =
      clamp(spd / 9, 0, 1) * (1.12 - 0.4 * clamp(spd / st.topSpeed, 0, 1));
    let yaw = c.steer * st.handling * speedFactor;
    if (c.drift && spd > 5) yaw *= 1.55;
    if (this.speed < 0) yaw = -yaw;
    this.heading += yaw * dt;

    // --- movimiento ---
    const dx = Math.sin(this.heading);
    const dz = Math.cos(this.heading);
    this.pos.x += dx * this.speed * dt;
    this.pos.z += dz * this.speed * dt;

    // --- restricciones de pista ---
    const near = this.wp.nearest(this.pos, this.idx);
    this.idx = near.index;
    this.lateral = near.lateral;
    const hw = this.wp.halfWidth;
    this.offtrack = Math.abs(near.lateral) > hw - 0.9;

    const wallLimit = hw + 2.2;
    if (Math.abs(near.lateral) > wallLimit) {
      const sign = Math.sign(near.lateral);
      const p = this.wp.points[near.index];
      const n = this.wp.normals[near.index];
      this.pos.x = p.x + n.x * sign * wallLimit;
      this.pos.z = p.z + n.z * sign * wallLimit;
      if (this.wallCooldown <= 0 && Math.abs(this.speed) > 4) {
        this.speed *= 0.86;
        this.wallCooldown = 0.25;
        if (this.onWallHit) this.onWallHit(this);
      }
    }
    this.wallCooldown -= dt;

    // --- progreso de carrera (continuo, con detección de cruce de meta) ---
    const s = this.wp.cumDist[this.idx];
    let ds = s - this.lastS;
    const L = this.wp.totalLen;
    if (ds > L / 2) ds -= L;
    else if (ds < -L / 2) ds += L;
    this.raceDist += ds;
    this.lastS = s;

    // --- suavizados visuales ---
    this.steerVis += (c.steer - this.steerVis) * Math.min(1, dt * 10);
    const accel = (this.speed - this._prevSpeed) / Math.max(dt, 1e-4);
    this.accelSmooth += (accel - this.accelSmooth) * Math.min(1, dt * 5);
    this._prevSpeed = this.speed;
  }

  get speedKmh() {
    return Math.round(Math.abs(this.speed) * 3.6);
  }
}
