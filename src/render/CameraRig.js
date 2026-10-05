import * as THREE from 'three';
import { clamp } from '../utils/math.js';

/** Cámara de persecución suave con FOV dinámico según velocidad. */
export class CameraRig {
  constructor(aspect) {
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 2200);
    this._look = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._init = false;
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(dt, v) {
    this._fwd.set(Math.sin(v.heading), 0, Math.cos(v.heading));
    const dist = 8.5 + Math.abs(v.speed) * 0.07;
    this._desired
      .copy(v.pos)
      .addScaledVector(this._fwd, -dist)
      .add(new THREE.Vector3(0, 4.3, 0));

    const k = 1 - Math.exp(-5.5 * dt);
    if (!this._init) {
      this.camera.position.copy(this._desired);
      this._look.copy(v.pos);
      this._init = true;
    } else {
      this.camera.position.lerp(this._desired, k);
      this._target.copy(v.pos).add(new THREE.Vector3(0, 1.4, 0));
      this._look.lerp(this._target, 1 - Math.exp(-8 * dt));
    }
    this._target.copy(this._look).addScaledVector(this._fwd, 4);
    this.camera.lookAt(this._target);

    const fovT = 68 + 14 * clamp(Math.abs(v.speed) / v.stats.topSpeed, 0, 1);
    this.camera.fov += (fovT - this.camera.fov) * k;
    this.camera.updateProjectionMatrix();
  }
}
