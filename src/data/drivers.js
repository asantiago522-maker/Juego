/** Rivales IA del juego (fijos en todas las carreras). */
export const RIVALS = [
  {
    id: 'vega',
    name: 'Vega',
    characterId: 'kai_volt',
    carId: 'pulsar_x',
    skill: 1.0,
    aggression: 0.85,
    color: '#ff2d78',
    style: 'Agresiva · Velocista',
  },
  {
    id: 'nyx',
    name: 'Nyx',
    characterId: 'ren_eje',
    carId: 'vector_gt',
    skill: 0.96,
    aggression: 0.55,
    color: '#7c4dff',
    style: 'Calculadora · Constante',
  },
  {
    id: 'bruno',
    name: 'Bruno',
    characterId: 'mara_muro',
    carId: 'bastion',
    skill: 0.92,
    aggression: 0.3,
    color: '#ff9f1c',
    style: 'Defensivo · Imparable',
  },
];

/** Niveles de dificultad de la IA. */
export const DIFFICULTY = {
  facil: { label: 'Fácil', corner: 0.86, top: 0.9, rubber: 0.05 },
  normal: { label: 'Normal', corner: 0.95, top: 0.98, rubber: 0.09 },
  dificil: { label: 'Difícil', corner: 1.05, top: 1.06, rubber: 0.13 },
};

export const DIFFICULTY_ORDER = ['facil', 'normal', 'dificil'];

/** Puntos por posición de llegada (1º, 2º, 3º, 4º). */
export const POINTS = [10, 7, 5, 3];
