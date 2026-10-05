/**
 * Test de humo sin navegador: simula una carrera de 4 coches
 * (3 IA + 1 "bot" con acelerador fijo) y valida que el núcleo
 * matemático funciona: sin NaN, progreso creciente, vueltas y ranking.
 */
import { WaypointSystem } from '../src/gameplay/WaypointSystem.js';
import { VehicleController } from '../src/gameplay/VehicleController.js';
import { AIDriver } from '../src/gameplay/AIDriver.js';
import { RaceManager } from '../src/gameplay/RaceManager.js';
import { EventBus } from '../src/core/EventBus.js';
import { TRACKS } from '../src/data/tracks.js';
import { CARS, computeStats } from '../src/data/cars.js';
import { CHARACTERS } from '../src/data/characters.js';
import { RIVALS } from '../src/data/drivers.js';

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log('  ✔', msg);
  else {
    failures++;
    console.error('  ✘ FALLO:', msg);
  }
};

for (const track of Object.values(TRACKS)) {
  console.log(`\n=== Pista: ${track.name} ===`);
  const wp = new WaypointSystem(track.points, { halfWidth: track.halfWidth });
  check(wp.totalLen > 400 && wp.totalLen < 4000, `longitud plausible (${wp.totalLen.toFixed(0)} m)`);
  check(Number.isFinite(wp.totalLen), 'longitud finita');

  const nearest = wp.nearest(wp.points[100], 0, wp.count);
  check(nearest.index === 100, `búsqueda global de nodo más cercano (idx ${nearest.index})`);

  const events = new EventBus();
  const cars = [];
  const ais = [];

  RIVALS.forEach((r, i) => {
    const v = new VehicleController({
      def: CARS[r.carId],
      character: CHARACTERS[r.characterId],
      waypoints: wp,
    });
    v.driver = { id: r.id, name: r.name, isPlayer: false };
    v.place(wp.totalLen - 10 - i * 9, i % 2 === 0 ? 2.4 : -2.4);
    cars.push(v);
    ais.push(new AIDriver(v, { skill: r.skill, topMul: 0.98, rubber: 0.1, aggression: r.aggression, reaction: 0.1 }));
  });

  const player = new VehicleController({
    def: CARS.vector_gt,
    character: CHARACTERS.ren_eje,
    waypoints: wp,
    isPlayer: true,
  });
  player.driver = { id: 'player', name: 'TÚ', isPlayer: true };
  player.place(wp.totalLen - 10 - 3 * 9, -2.4);
  cars.push(player);

  const race = new RaceManager({ vehicles: cars, totalLaps: 2, events });

  let goFired = false;
  let lapsSeen = 0;
  let finishedCount = 0;
  events.on('go', () => (goFired = true));
  events.on('lap', () => lapsSeen++);
  events.on('finished', () => finishedCount++);

  const dt = 1 / 60;
  const steps = 60 * 150; // hasta 150 s simulados
  let allDone = false;
  for (let s = 0; s < steps; s++) {
    const racing = race.phase !== 'countdown';
    const ctx = { racing, clock: race.clock, time: s * dt, playerDist: player.raceDist, cars };
    for (const ai of ais) ai.update(dt, ctx);
    // "jugador" automático: gas a fondo, la IA de dirección sigue la spline
    const fake = new AIDriver(player, { skill: 0.95, topMul: 1, rubber: 0, aggression: 0.5, reaction: 0, lineOffset: 0 });
    fake.update(dt, ctx);
    for (const v of cars) v.update(dt);
    race.tick(dt);

    for (const v of cars) {
      if (!Number.isFinite(v.pos.x) || !Number.isFinite(v.pos.z) || !Number.isFinite(v.speed)) {
        check(false, `valores finitos en ${v.driver.id} (paso ${s})`);
        s = steps;
        break;
      }
      const near = wp.nearest(v.pos, v.idx);
      if (Math.abs(near.lateral) > wp.halfWidth + 2.6) {
        check(false, `${v.driver.id} dentro de muros (lateral ${near.lateral.toFixed(2)})`);
        s = steps;
        break;
      }
    }
    if (finishedCount === cars.length) {
      allDone = true;
      break;
    }
  }

  check(goFired, 'cuenta atrás termina en GO');
  check(lapsSeen >= 2, `se registran vueltas (${lapsSeen} eventos de vuelta)`);
  check(finishedCount >= 1, `alguien termina la carrera (${finishedCount} finalizados)`);
  check(allDone, 'todos los coches terminan 2 vueltas en menos de 150 s');
  check(race.order.length === 4, 'ranking con 4 participantes');
  check(race.order[0].finished, 'el líder tiene tiempo de meta');

  // stats combinadas
  const st = computeStats(CARS.pulsar_x, CHARACTERS.kai_volt);
  check(st.topSpeed > CARS.pulsar_x.stats.topSpeed, 'modificador de Kai aumenta vel. máxima');
  const st2 = computeStats(CARS.bastion, CHARACTERS.mara_muro);
  check(st2.resistance > 1, 'modificador defensivo de Mara presente');
}

console.log(failures === 0 ? '\n✅ SMOKE TEST: TODO OK' : `\n❌ SMOKE TEST: ${failures} fallos`);
process.exit(failures === 0 ? 0 : 1);
