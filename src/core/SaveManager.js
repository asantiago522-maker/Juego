const KEY = 'neonrush_save_v1';

/** Persistencia en localStorage: ajustes, selección, torneo y mejores tiempos. */
export class SaveManager {
  constructor() {
    this.data = this._load();
  }

  _defaults() {
    return {
      settings: { music: 0.6, sfx: 0.8, laps: 3, difficulty: 'normal' },
      selection: { characterId: 'ren_eje', carId: 'vector_gt' },
      tournament: null, // { raceIndex, points:{driverId:pts}, history:[{trackId, positions:{}}] }
      bestTimes: {}, // trackId -> mejor vuelta (ms)
    };
  }

  _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return this._defaults();
      const parsed = JSON.parse(raw);
      const def = this._defaults();
      return {
        settings: { ...def.settings, ...(parsed.settings || {}) },
        selection: { ...def.selection, ...(parsed.selection || {}) },
        tournament: parsed.tournament || null,
        bestTimes: parsed.bestTimes || {},
      };
    } catch {
      return this._defaults();
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* almacenamiento no disponible */
    }
  }

  get settings() {
    return this.data.settings;
  }

  setSetting(k, v) {
    this.data.settings[k] = v;
    this.save();
  }

  get selection() {
    return this.data.selection;
  }

  setSelection(sel) {
    this.data.selection = { ...this.data.selection, ...sel };
    this.save();
  }

  get tournament() {
    return this.data.tournament;
  }

  setTournament(t) {
    this.data.tournament = t;
    this.save();
  }

  /** Devuelve true si se ha batido el récord. */
  recordBestLap(trackId, ms) {
    if (ms == null) return false;
    const prev = this.data.bestTimes[trackId];
    if (prev == null || ms < prev) {
      this.data.bestTimes[trackId] = ms;
      this.save();
      return true;
    }
    return false;
  }

  bestLap(trackId) {
    return this.data.bestTimes[trackId] ?? null;
  }

  reset() {
    this.data = this._defaults();
    this.save();
  }
}
