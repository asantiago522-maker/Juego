import { WaypointSystem } from '../src/gameplay/WaypointSystem.js';
import { VehicleController } from '../src/gameplay/VehicleController.js';
import { AIDriver } from '../src/gameplay/AIDriver.js';
import { RaceManager } from '../src/gameplay/RaceManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { TRACKS } from '../src/data/tracks.js';
import { CARS } from '../src/data/cars.js';
import { CHARACTERS } from '../src/data/characters.js';
import { RIVALS } from '../src/data/drivers.js';

const track = TRACKS[process.argv[2] || 'serpentina'];
const wp = new WaypointSystem(track.points, { halfWidth: track.halfWidth });
console.log('pista', track.name, 'L=', wp.totalLen.toFixed(0));

// estadísticas de curvatura
const curvs = [...wp.curvature].sort((a, b) => b - a);
console.log('curvatura máx:', curvs[0].toFixed(4), '→ radio mín', (1 / curvs[0]).toFixed(1), 'm');
console.log('curvatura p95:', curvs[Math.floor(wp.count * 0.05)].toFixed(4));
const aheads = [...wp.curvatureAhead].sort((a, b) => a - b);
console.log('curvAhead mediana:', aheads[Math.floor(wp.count / 2)].toFixed(4));

const events = new EventBus();
const cars = [];
const ais = [];
RIVALS.forEach((r, i) => {
  const v = new VehicleController({ def: CARS[r.carId], character: CHARACTERS[r.characterId], waypoints: wp });
  v.driver = { id: r.id, isPlayer: false };
  v.place(wp.totalLen - 10 - i * 9, i % 2 === 0 ? 2.4 : -2.4);
  cars.push(v);
  ais.push(new AIDriver(v, { skill: r.skill, topMul: 0.98, rubber: 0.1, aggression: r.aggression, reaction: 0.1 }));
});
const player = new VehicleController({ def: CARS.vector_gt, character: CHARACTERS.ren_eje, waypoints: wp, isPlayer: true });
player.driver = { id: 'player', isPlayer: true };
player.place(wp.totalLen - 37, -2.4);
cars.push(player);
const race = new RaceManager({ vehicles: cars, totalLaps: 2, events });

let wallHits = 0;
for (const v of cars) v.onWallHit = () => wallHits++;

const dt = 1 / 60;
let logT = 0;
const playerAI = new AIDriver(player, { skill: 0.95, topMul: 1, rubber: 0, aggression: 0.5, reaction: 0, lineOffset: 0 });
let offtrackFrames = 0;
for (let s = 0; s < 60 * 150; s++) {
  const racing = race.phase !== 'countdown';
  const ctx = { racing, clock: race.clock, time: s * dt, playerDist: player.raceDist, cars };
  for (const ai of ais) ai.update(dt, ctx);
  playerAI.update(dt, ctx);
  for (const v of cars) {
    v.update(dt);
    if (v.offtrack) offtrackFrames++;
  }
  race.tick(dt);
  logT += dt;
  if (logT >= 20) {
    logT = 0;
    const row = cars
      .map((v) => `${v.driver.id.padEnd(6)} lap=${(v.raceDist / wp.totalLen).toFixed(2)} v=${v.speed.toFixed(1)} off=${v.offtrack ? 1 : 0}`)
      .join(' | ');
    console.log(`t=${(s * dt).toFixed(0).padStart(3)}s ${row} wallHits=${wallHits}`);
  }
  if (race.entries.every((e) => e.finished)) break;
}
console.log('frames offtrack:', offtrackFrames, 'wallHits:', wallHits);
const fin = race.entries.filter((e) => e.finished);
for (const e of fin) console.log('finish', e.v.driver.id, (e.timeMs / 1000).toFixed(1) + 's', 'bestLap', (e.bestLap / 1000).toFixed(1) + 's');
