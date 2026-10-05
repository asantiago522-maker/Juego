import { POINTS } from './drivers.js';

/** Definición del torneo: 3 carreras consecutivas. */
export const TOURNAMENT = {
  id: 'copa_neon',
  name: 'Copa Neón',
  trackIds: ['skyline', 'serpentina', 'autovia'],
  lapsPerRace: 3,
  points: POINTS,
};
