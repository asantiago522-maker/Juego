/**
 * Audio 100% procedimental con Web Audio: música synthwave secuenciada,
 * motor del coche y SFX de UI/carrera. Sin assets externos.
 */
const noteFreq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

const MUSIC = {
  menu: {
    bpm: 82,
    bass: [45, null, null, null, 41, null, null, null, 43, null, null, null, 40, null, null, null],
    arp: [69, 72, 76, 79, 76, 72, 69, 72, 65, 69, 72, 77, 72, 69, 65, 64],
    hat: false,
  },
  race: {
    bpm: 128,
    bass: [45, 45, null, 45, 43, 43, null, 43, 41, 41, null, 41, 43, 43, null, 43],
    arp: [69, 72, 76, 81, 79, 76, 72, 76, 67, 71, 74, 79, 76, 74, 71, 74],
    hat: true,
  },
};

export class AudioManager {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.currentMusic = null;
    this.pendingMusic = null;
    this.seqTimer = null;
    this.step = 0;
    this.nextTime = 0;
    this.engine = null;
    this.crashCooldown = 0;
  }

  /** Crea/reanuda el AudioContext. Requiere gesto del usuario. */
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (this.pendingMusic && !this.seqTimer) {
      const kind = this.pendingMusic;
      this.pendingMusic = null;
      this.playMusic(kind);
    }
    return true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.game.save.settings;
    this.musicGain.gain.value = (s.music ?? 0.6) * 0.5;
    this.sfxGain.gain.value = s.sfx ?? 0.8;
  }

  // ---------- SFX ----------
  _blip(freq, dur = 0.08, type = 'square', vol = 0.3, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  uiMove() { this._blip(520, 0.05, 'square', 0.18); }
  uiOk() { this._blip(660, 0.07, 'square', 0.25); this._blip(990, 0.12, 'square', 0.2, 0.06); }
  uiBack() { this._blip(330, 0.09, 'square', 0.22); }
  count(go) {
    if (go) this._blip(880, 0.42, 'square', 0.4);
    else this._blip(440, 0.16, 'square', 0.32);
  }
  lapChime() { this._blip(660, 0.09, 'triangle', 0.3); this._blip(990, 0.16, 'triangle', 0.3, 0.09); }
  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => this._blip(f, 0.22, 'square', 0.26, i * 0.13));
  }
  crash() {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.crashCooldown < 220) return;
    this.crashCooldown = now;
    const t = this.ctx.currentTime;
    const len = 0.18;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t);
  }

  // ---------- motor del jugador ----------
  startEngine() {
    if (!this.ensure()) return;
    if (this.engine) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'square';
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(g).connect(this.sfxGain);
    osc.start();
    osc2.start();
    this.engine = { osc, osc2, filter, g };
  }

  setEngine(ratio, throttle, on) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    const r = Math.max(0, Math.min(1, ratio));
    const target = on ? 0.045 + r * 0.1 + Math.max(0, throttle) * 0.02 : 0;
    this.engine.g.gain.setTargetAtTime(target, t, 0.08);
    const freq = 52 + r * 165 + Math.max(0, throttle) * 12;
    this.engine.osc.frequency.setTargetAtTime(freq, t, 0.05);
    this.engine.osc2.frequency.setTargetAtTime(freq * 0.5, t, 0.05);
    this.engine.filter.frequency.setTargetAtTime(300 + r * 900, t, 0.1);
  }

  stopEngine() {
    if (!this.engine) return;
    const { osc, osc2, g } = this.engine;
    const t = this.ctx.currentTime;
    g.gain.setTargetAtTime(0, t, 0.05);
    osc.stop(t + 0.4);
    osc2.stop(t + 0.4);
    this.engine = null;
  }

  // ---------- música ----------
  playMusic(kind) {
    if (this.currentMusic === kind && this.seqTimer) return;
    if (!this.ctx) {
      this.pendingMusic = kind;
      this.currentMusic = kind;
      return;
    }
    this.stopMusic();
    this.currentMusic = kind;
    const pat = MUSIC[kind];
    if (!pat) return;
    this.stepDur = 60 / pat.bpm / 4; // semicorcheas
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.seqTimer = setInterval(() => this._schedule(pat), 110);
  }

  _schedule(pat) {
    if (!this.ctx) return;
    while (this.nextTime < this.ctx.currentTime + 0.35) {
      const i = this.step % 16;
      const t = this.nextTime;
      const bass = pat.bass[i];
      if (bass) this._note(bass, t, this.stepDur * 3.2, 'sawtooth', 0.32, 240);
      const arp = pat.arp[i];
      if (arp && this.step % 2 === 0) this._note(arp, t, this.stepDur * 1.6, 'square', 0.1, 1800);
      if (pat.hat && this.step % 2 === 1) this._hat(t);
      this.nextTime += this.stepDur;
      this.step++;
    }
  }

  _note(midi, when, dur, type, vol, cutoff) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = noteFreq(midi);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(f).connect(g).connect(this.musicGain);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  _hat(when) {
    const len = 0.04;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(f).connect(g).connect(this.musicGain);
    src.start(when);
  }

  stopMusic() {
    if (this.seqTimer) clearInterval(this.seqTimer);
    this.seqTimer = null;
    this.currentMusic = null;
  }
}
