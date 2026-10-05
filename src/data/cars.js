/**
 * Definición de coches (data-driven).
 * stats: topSpeed m/s, accel m/s², handling rad/s, weight factor de masa.
 */
export const CARS = {
  vector_gt: {
    id: 'vector_gt',
    name: 'Vector GT',
    modelId: 'vector',
    tag: 'Equilibrado',
    desc: 'Un clásico del circuito neón: fiable en cualquier trazada, sin sorpresas.',
    colorHex: 0x00e5ff,
    colorCss: '#00e5ff',
    stats: { topSpeed: 46, accel: 16, handling: 2.0, weight: 1.0 },
  },
  pulsar_x: {
    id: 'pulsar_x',
    name: 'Púlsar X',
    modelId: 'pulsar',
    tag: 'Velocidad pura',
    desc: 'Un misil sobre ruedas. Devora las rectas, pero exige manos finas en las curvas.',
    colorHex: 0xff2ec4,
    colorCss: '#ff2ec4',
    stats: { topSpeed: 55, accel: 19, handling: 1.65, weight: 0.8 },
  },
  bastion: {
    id: 'bastion',
    name: 'Bastión',
    modelId: 'bastion',
    tag: 'Tanque defensivo',
    desc: 'Pesado, estable e inamovible. Los choques los ganan otros; él los sobrevive.',
    colorHex: 0xffb300,
    colorCss: '#ffb300',
    stats: { topSpeed: 39, accel: 13, handling: 2.35, weight: 1.45 },
  },
};

export const CAR_LIST = Object.values(CARS);

/** Referencias para normalizar las barras de estadísticas. */
export const STAT_MAX = { topSpeed: 60, accel: 22, handling: 2.7, weight: 1.7 };

/**
 * Stats finales = coche × modificadores del personaje.
 */
export function computeStats(car, character) {
  const m = (character && character.mods) || {};
  return {
    topSpeed: car.stats.topSpeed * (m.topSpeed ?? 1),
    accel: car.stats.accel * (m.accel ?? 1),
    handling: car.stats.handling * (m.handling ?? 1),
    mass: car.stats.weight * (m.mass ?? 1),
    resistance: m.resistance ?? 1,
  };
}
