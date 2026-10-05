/**
 * Dirección de carrera: cuenta atrás, cronómetro, vueltas por checkpoints
 * secuenciales (anti-atajo), clasificación en vivo y detección de meta.
 */
export class RaceManager {
  constructor({ vehicles, totalLaps, events }) {
    this.totalLaps = totalLaps;
    this.events = events;
    this.phase = 'countdown'; // countdown | racing | finished
    this.count = 3.3;
    this.clock = 0;
    this.entries = vehicles.map((v) => ({
      v,
      cpPassed: 0,
      cpNext: v.wp.totalLen / 8,
      lap: 0,
      lapStart: 0,
      lastLap: null,
      bestLap: null,
      timeMs: null,
      finished: false,
    }));
    this.order = [...this.entries];
    this._sig = '';
  }

  entryOf(vehicle) {
    return this.entries.find((e) => e.v === vehicle);
  }

  tick(dt) {
    if (this.phase === 'countdown') {
      const prev = Math.ceil(this.count);
      this.count -= dt;
      const cur = Math.ceil(this.count);
      if (cur < prev && cur > 0) this.events.emit('count', cur);
      if (this.count <= 0) {
        this.phase = 'racing';
        this.clock = 0;
        this.events.emit('go');
      }
      this._updateOrder();
      return;
    }

    this.clock += dt;
    const L = this.entries[0].v.wp.totalLen;

    for (const e of this.entries) {
      if (e.finished) continue;
      const v = e.v;
      while (v.raceDist >= e.cpNext) {
        e.cpPassed++;
        e.cpNext += L / 8;
      }
      const lap = Math.floor(e.cpPassed / 8);
      if (lap > e.lap) {
        e.lap = lap;
        const lapTime = (this.clock - e.lapStart) * 1000;
        e.lastLap = lapTime;
        if (e.bestLap == null || lapTime < e.bestLap) e.bestLap = lapTime;
        e.lapStart = this.clock;
        this.events.emit('lap', { entry: e, lap });
        if (lap >= this.totalLaps) {
          e.finished = true;
          v.finishedFlag = true;
          e.timeMs = this.clock * 1000;
          this.events.emit('finished', { entry: e });
        }
      }
    }
    this._updateOrder();
  }

  _updateOrder() {
    const ord = [...this.entries].sort((a, b) => {
      if (a.finished && b.finished) return a.timeMs - b.timeMs;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.v.raceDist - a.v.raceDist;
    });
    const sig = ord.map((e) => e.v.driver.id).join(',');
    if (sig !== this._sig) {
      this._sig = sig;
      this.order = ord;
      this.events.emit('order', ord);
    }
  }
}
