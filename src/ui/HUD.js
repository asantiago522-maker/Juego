import { el } from './dom.js';
import { formatTime, ordinal } from '../utils/math.js';

/** HUD de carrera: posición, vueltas, tiempos, velocímetro, minimapa y mensajes. */
export class HUD {
  constructor(uiEl, wp, track, cars) {
    this.wp = wp;
    this.track = track;
    this.cars = cars;
    this._cache = {};

    this.root = el('div', 'hud');
    this.root.innerHTML = `
      <div class="hud-pos"><span class="p-big">--</span><span class="p-total">/${cars.length}</span></div>
      <div class="hud-time">
        <div class="t-main">0:00.000</div>
        <div class="t-sub">ÚLTIMA --:--.--- · MEJOR --:--.---</div>
      </div>
      <div class="hud-lap"><div class="l-label">VUELTA</div><div class="l-val">1/3</div></div>
      <div class="hud-track-name">${track.name.toUpperCase()}</div>
      <div class="hud-speed">
        <div class="spd-num">0</div>
        <div class="spd-unit">KM/H</div>
        <div class="spd-bar"><i style="width:0%"></i></div>
      </div>
      <canvas id="minimap" width="152" height="152"></canvas>
      <div class="hud-msg"></div>
    `;
    uiEl.appendChild(this.root);

    this.posEl = this.root.querySelector('.p-big');
    this.timeEl = this.root.querySelector('.t-main');
    this.lapSubEl = this.root.querySelector('.t-sub');
    this.lapEl = this.root.querySelector('.l-val');
    this.spdEl = this.root.querySelector('.spd-num');
    this.spdBar = this.root.querySelector('.spd-bar i');
    this.msgEl = this.root.querySelector('.hud-msg');
    this.mapCanvas = this.root.querySelector('#minimap');
    this.mapCtx = this.mapCanvas.getContext('2d');

    this._buildMinimap();
  }

  _buildMinimap() {
    const pts = this.wp.points;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    }
    const pad = 16;
    const W = 152, H = 152;
    const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxZ - minZ));
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    this.mapX = (x) => W / 2 + (x - cx) * scale;
    this.mapZ = (z) => H / 2 + (z - cz) * scale;

    this.mapPath = new Path2D();
    this.mapPath.moveTo(this.mapX(pts[0].x), this.mapZ(pts[0].z));
    for (let i = 2; i < pts.length; i += 2) {
      this.mapPath.lineTo(this.mapX(pts[i].x), this.mapZ(pts[i].z));
    }
    this.mapPath.closePath();
  }

  _setText(node, text, key) {
    if (this._cache[key] !== text) {
      this._cache[key] = text;
      node.textContent = text;
    }
  }

  update({ race, player, entry, totalLaps, wrongWay }) {
    // posición
    const posIdx = race.order.findIndex((e) => e === entry);
    this._setText(this.posEl, ordinal(posIdx + 1), 'pos');

    // tiempos
    this._setText(this.timeEl, formatTime(race.clock * 1000), 'time');
    this._setText(
      this.lapSubEl,
      `ÚLTIMA ${formatTime(entry.lastLap)} · MEJOR ${formatTime(entry.bestLap)}`,
      'lapsub'
    );

    // vueltas
    const lap = Math.min(entry.lap + 1, totalLaps);
    this._setText(this.lapEl, `${lap}/${totalLaps}`, 'lap');

    // velocidad
    const kmh = player.speedKmh;
    this._setText(this.spdEl, String(kmh), 'spd');
    const ratio = Math.min(1, Math.abs(player.speed) / player.stats.topSpeed);
    const pct = `${Math.round(ratio * 100)}%`;
    if (this._cache.spdBar !== pct) {
      this._cache.spdBar = pct;
      this.spdBar.style.width = pct;
    }

    // mensaje de sentido contrario
    if (wrongWay && this._cache.wrong !== true) {
      this._cache.wrong = true;
      this.msgEl.className = 'hud-msg warn show';
      this.msgEl.textContent = '¡SENTIDO CONTRARIO!';
    } else if (!wrongWay && this._cache.wrong === true) {
      this._cache.wrong = false;
      this.msgEl.className = 'hud-msg';
    }

    this._drawMinimap(player);
  }

  _drawMinimap(player) {
    const ctx = this.mapCtx;
    ctx.clearRect(0, 0, 152, 152);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke(this.mapPath);

    for (const v of this.cars) {
      const x = this.mapX(v.pos.x);
      const z = this.mapZ(v.pos.z);
      ctx.beginPath();
      ctx.arc(x, z, v.isPlayer ? 5 : 3.6, 0, Math.PI * 2);
      ctx.fillStyle = v.isPlayer ? '#ffffff' : v.driver.color;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (v.isPlayer) {
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  /** Mensaje central animado. */
  message(text, cls = '') {
    this.msgEl.className = 'hud-msg';
    void this.msgEl.offsetWidth; // reinicia la animación
    this.msgEl.textContent = text;
    this.msgEl.className = `hud-msg show ${cls}`;
  }

  countdown(n) {
    if (n > 0) {
      this.message(String(n), 'count hold');
    } else {
      this.message('¡GO!', 'go');
    }
  }

  dispose() {
    this.root.remove();
  }
}
