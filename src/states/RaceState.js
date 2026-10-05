import * as THREE from 'three';
import { el } from '../ui/dom.js';
import { MenuList } from '../ui/MenuList.js';
import { WaypointSystem } from '../gameplay/WaypointSystem.js';
import { VehicleController } from '../gameplay/VehicleController.js';
import { AIDriver } from '../gameplay/AIDriver.js';
import { RaceManager } from '../gameplay/RaceManager.js';
import { createRaceScene, disposeScene } from '../render/SceneFactory.js';
import { createCar } from '../render/CarModels.js';
import { CameraRig } from '../render/CameraRig.js';
import { HUD } from '../ui/HUD.js';
import { TRACKS } from '../data/tracks.js';
import { CARS } from '../data/cars.js';
import { CHARACTERS } from '../data/characters.js';
import { RIVALS, DIFFICULTY, POINTS } from '../data/drivers.js';
import { TOURNAMENT } from '../data/tournament.js';
import { RaceResultsState } from './RaceResultsState.js';
import { MainMenuState } from './MainMenuState.js';
import { clamp, normAngle } from '../utils/math.js';

/**
 * Estado de carrera: orquesta física, IA, dirección de carrera,
 * cámara, HUD, audio y transición a resultados.
 */
export class RaceState {
  constructor(game, config) {
    this.game = game;
    this.config = config; // { mode:'quick'|'tournament', trackId?, raceIndex?, laps? }
    if (config.mode === 'tournament') {
      this.trackId = TOURNAMENT.trackIds[config.raceIndex];
      this.totalLaps = TOURNAMENT.lapsPerRace;
    } else {
      this.trackId = config.trackId;
      this.totalLaps = config.laps ?? game.save.settings.laps;
    }
  }

  enter() {
    const g = this.game;
    this.track = TRACKS[this.trackId];
    this.wp = new WaypointSystem(this.track.points, { halfWidth: this.track.halfWidth });
    this.scene = createRaceScene(this.track, this.wp).scene;

    // ----- parrilla: 3 rivales + jugador (último) -----
    const diff = DIFFICULTY[g.save.settings.difficulty] ?? DIFFICULTY.normal;
    this.cars = [];
    this.ais = [];
    const gridDist = (i) => this.wp.totalLen - 10 - i * 9;
    const gridLat = [2.6, -2.6, 2.6, -2.6];

    RIVALS.forEach((r, i) => {
      const veh = new VehicleController({
        def: CARS[r.carId],
        character: CHARACTERS[r.characterId],
        waypoints: this.wp,
      });
      veh.driver = { id: r.id, name: r.name, color: r.color, isPlayer: false, carName: CARS[r.carId].name };
      veh.place(gridDist(i), gridLat[i]);
      veh.visual = createCar(CARS[r.carId], { accent: r.color });
      this.scene.add(veh.visual.group);
      this.cars.push(veh);
      this.ais.push(
        new AIDriver(veh, {
          skill: r.skill * diff.corner,
          topMul: diff.top,
          rubber: diff.rubber,
          aggression: r.aggression,
          reaction: 0.08 + Math.random() * 0.24,
          lineOffset: i % 2 === 0 ? 1.7 : -1.7,
        })
      );
    });

    const sel = g.save.selection;
    const playerCar = CARS[sel.carId];
    const playerChar = CHARACTERS[sel.characterId];
    this.player = new VehicleController({
      def: playerCar,
      character: playerChar,
      waypoints: this.wp,
      isPlayer: true,
    });
    this.player.driver = {
      id: 'player',
      name: 'TÚ',
      color: '#ffffff',
      isPlayer: true,
      carName: playerCar.name,
    };
    this.player.place(gridDist(3), gridLat[3]);
    this.player.visual = createCar(playerCar, { accent: playerChar.color });
    this.scene.add(this.player.visual.group);
    this.cars.push(this.player);

    // muros: SFX al golpear (si es el jugador o está cerca)
    for (const v of this.cars) {
      v.onWallHit = () => {
        if (v.isPlayer) g.audio.crash();
      };
    }

    this.race = new RaceManager({ vehicles: this.cars, totalLaps: this.totalLaps, events: g.events });
    this.cam = new CameraRig(window.innerWidth / window.innerHeight);
    this.hud = new HUD(g.scenes.uiEl, this.wp, this.track, this.cars);

    // ----- eventos de carrera -----
    this.unsubs = [
      g.events.on('count', (n) => {
        this.hud.countdown(n);
        g.audio.count(false);
      }),
      g.events.on('go', () => {
        this.hud.countdown(0);
        g.audio.count(true);
        g.audio.startEngine();
      }),
      g.events.on('lap', ({ entry, lap }) => {
        if (!entry.v.isPlayer) return;
        if (lap >= this.totalLaps) return; // ya hay mensaje de meta
        g.audio.lapChime();
        if (lap === this.totalLaps - 1) this.hud.message('¡ÚLTIMA VUELTA!', '');
        else this.hud.message(`VUELTA ${lap + 1}/${this.totalLaps}`, '');
      }),
      g.events.on('finished', ({ entry }) => {
        if (entry.v.isPlayer) this._playerFinished();
      }),
    ];

    // ----- pausa -----
    this.paused = false;
    this.pauseOverlay = null;

    // ----- estado de frame -----
    this.timeScale = 1;
    this.finishTimer = null;
    this.exiting = false;
    this.time = 0;
    this.wrongWayT = 0;

    this._onResize = () => this.cam.resize(window.innerWidth / window.innerHeight);
    g.events.on('resize', this._onResize);

    g.audio.playMusic('race');
    this.cam.update(0.016, this.player);
  }

  _playerFinished() {
    const g = this.game;
    this.hud.message('¡META!', '');
    g.audio.fanfare();
    this.timeScale = 0.35;
    this.finishTimer = 1.25;
  }

  // ------------------------------------------------------------------
  update(dt) {
    const g = this.game;
    if (this.exiting) return;

    if (g.input.pressed('pause') && this.finishTimer == null) {
      this._togglePause();
    }
    if (this.paused) {
      this.pauseMenu.update(g.input, dt);
      return;
    }

    this.time += dt;
    const sdt = dt * this.timeScale;
    const racing = this.race.phase !== 'countdown';

    // ----- control del jugador -----
    if (racing && this.finishTimer == null) {
      const target = g.input.steer;
      this.player.controls.steer += (target - this.player.controls.steer) * Math.min(1, dt * 9);
      this.player.controls.throttle = g.input.throttle;
      this.player.controls.drift = g.input.drift;
    } else {
      this.player.controls.throttle = 0;
      this.player.controls.drift = false;
    }

    // ----- IA -----
    const ctx = {
      racing,
      clock: this.race.clock,
      time: this.time,
      playerDist: this.player.raceDist,
      cars: this.cars,
    };
    for (const ai of this.ais) ai.update(sdt, ctx);

    // ----- física -----
    for (const v of this.cars) v.update(sdt);
    this._resolveCollisions();

    // ----- dirección de carrera -----
    this.race.tick(sdt);

    // ----- sentido contrario -----
    let wrongWay = false;
    if (racing && this.finishTimer == null) {
      const dir = this.wp.dirs[this.player.idx];
      const fwd = Math.sin(this.player.heading) * dir.x + Math.cos(this.player.heading) * dir.z;
      if (fwd < -0.2 && Math.abs(this.player.speed) > 3) {
        this.wrongWayT += dt;
        if (this.wrongWayT > 0.8) wrongWay = true;
      } else {
        this.wrongWayT = 0;
      }
    }

    // ----- cámara, audio, visuales, HUD -----
    this.cam.update(dt, this.player);
    g.audio.setEngine(
      Math.abs(this.player.speed) / this.player.stats.topSpeed,
      this.player.controls.throttle,
      racing && this.finishTimer == null
    );
    for (const v of this.cars) v.visual.update(sdt, v);

    this.hud.update({
      race: this.race,
      player: this.player,
      entry: this.race.entryOf(this.player),
      totalLaps: this.totalLaps,
      wrongWay,
    });

    // ----- fin de carrera (cámara lenta y resultados) -----
    if (this.finishTimer != null) {
      this.finishTimer -= dt;
      if (this.finishTimer <= 0) this._goToResults();
    }
  }

  _resolveCollisions() {
    const cars = this.cars;
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i];
        const b = cars[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d2 = dx * dx + dz * dz;
        const minD = 3.1;
        if (d2 >= minD * minD || d2 < 1e-6) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const nz = dz / d;
        const overlap = minD - d;
        const ma = a.stats.mass * (a.stats.resistance ?? 1);
        const mb = b.stats.mass * (b.stats.resistance ?? 1);
        const wa = mb / (ma + mb);
        const wb = ma / (ma + mb);
        a.pos.x -= nx * overlap * wa;
        a.pos.z -= nz * overlap * wa;
        b.pos.x += nx * overlap * wb;
        b.pos.z += nz * overlap * wb;
        const impact = Math.abs(a.speed - b.speed);
        a.speed *= 0.992;
        b.speed *= 0.992;
        if ((a.isPlayer || b.isPlayer) && impact > 5) this.game.audio.crash();
      }
    }
  }

  _togglePause() {
    const g = this.game;
    this.paused = !this.paused;
    if (this.paused) {
      g.audio.uiMove();
      this.pauseOverlay = el('div', 'overlay');
      this.pauseOverlay.innerHTML = `<h2>PAUSA</h2>`;
      const holder = el('div');
      this.pauseOverlay.appendChild(holder);
      this.pauseMenu = new MenuList(
        holder,
        [
          { id: 'resume', label: 'Reanudar' },
          { id: 'restart', label: 'Reiniciar carrera' },
          { id: 'quit', label: this.config.mode === 'tournament' ? 'Abandonar (se guarda el torneo)' : 'Salir al menú' },
        ],
        g,
        {
          onActivate: (item) => {
            if (item.id === 'resume') this._togglePause();
            else if (item.id === 'restart') {
              g.scenes.change(new RaceState(g, this.config));
            } else {
              g.audio.playMusic('menu');
              g.scenes.change(new MainMenuState(g));
            }
          },
        }
      );
      this.rootHolder = this.pauseOverlay;
      g.scenes.uiEl.appendChild(this.pauseOverlay);
    } else {
      g.audio.uiBack();
      if (this.pauseOverlay) this.pauseOverlay.remove();
      this.pauseOverlay = null;
    }
  }

  _goToResults() {
    const g = this.game;
    this.exiting = true;

    const order = this.race.order.map((e, i) => ({
      position: i + 1,
      driverId: e.v.driver.id,
      name: e.v.driver.name,
      color: e.v.driver.color,
      isPlayer: e.v.isPlayer,
      carName: e.v.def.name,
      timeMs: e.timeMs,
      bestLapMs: e.bestLap,
    }));

    const playerEntry = this.race.entryOf(this.player);
    const result = {
      order,
      trackId: this.trackId,
      trackName: this.track.name,
      mode: this.config.mode,
      playerPos: order.find((o) => o.isPlayer).position,
      playerBestLap: playerEntry.bestLap,
    };

    g.save.recordBestLap(this.trackId, playerEntry.bestLap);

    if (this.config.mode === 'tournament') {
      const t = g.save.tournament;
      for (const o of order) {
        t.points[o.driverId] = (t.points[o.driverId] || 0) + (POINTS[o.position - 1] || 0);
      }
      t.history.push({
        trackId: this.trackId,
        positions: Object.fromEntries(order.map((o) => [o.driverId, o.position])),
      });
      t.raceIndex++;
      g.save.setTournament(t);
    }

    g.audio.playMusic('menu');
    g.scenes.change(new RaceResultsState(g, { result, config: this.config }));
  }

  render() {
    this.game.renderer.render(this.scene, this.cam.camera);
  }

  exit() {
    const g = this.game;
    for (const u of this.unsubs) u();
    g.events.off('resize', this._onResize);
    g.audio.stopEngine();
    if (this.pauseOverlay) this.pauseOverlay.remove();
    this.hud.dispose();
    disposeScene(this.scene);
  }
}
