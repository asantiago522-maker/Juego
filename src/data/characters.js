/**
 * Personajes: arquetipo, historia breve y modificadores de stats.
 */
export const CHARACTERS = {
  kai_volt: {
    id: 'kai_volt',
    name: 'Kai "Volt"',
    archetype: 'Corredor Veloz',
    color: '#ffdf3f',
    story:
      'Piloto de pruebas fugado del circuito corporativo Skyline. Dicen que nadie le ha visto frenar… y nadie ha vivido para contarlo.',
    mods: { topSpeed: 1.05, handling: 0.94 },
    chips: ['+ Vel. máxima', '− Manejo'],
  },
  mara_muro: {
    id: 'mara_muro',
    name: 'Mara "Muro"',
    archetype: 'Corredora Defensiva',
    color: '#ff5470',
    story:
      'Ex escolta de convoyes en la Autovía Fantasma. Nadie la saca de su trazada; los que lo intentan acaban en el guardarraíl.',
    mods: { mass: 1.3, resistance: 1.6, accel: 1.04 },
    chips: ['Resiste choques', 'Mejor salida'],
  },
  ren_eje: {
    id: 'ren_eje',
    name: 'Ren "Eje"',
    archetype: 'Corredor Equilibrado',
    color: '#4dff88',
    story:
      'Mecánico de barrio que construyó su propio coche pieza a pieza. Sin puntos débiles: la constancia es su arma.',
    mods: { topSpeed: 1.02, accel: 1.02, handling: 1.02 },
    chips: ['+ Todo (leve)'],
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);

/** Avatares SVG procedurales (cascos neón). */
export function avatarSVG(id, color = '#00e5ff') {
  const common = `<circle cx="48" cy="48" r="45" fill="#0b0722" stroke="${color}" stroke-width="2.5" opacity="0.95"/>`;
  let inner = '';
  if (id === 'kai_volt') {
    inner = `
      <path d="M20 60 Q24 22 48 18 Q72 22 76 60 L66 66 L30 66 Z" fill="#181238" stroke="${color}" stroke-width="2"/>
      <path d="M28 46 L68 46 L64 56 L32 56 Z" fill="${color}" opacity="0.9"/>
      <polygon points="52,20 42,38 50,38 40,58 58,34 49,34" fill="#fff" opacity="0.9"/>`;
  } else if (id === 'mara_muro') {
    inner = `
      <path d="M18 58 Q18 20 48 17 Q78 20 78 58 L78 68 L18 68 Z" fill="#181238" stroke="${color}" stroke-width="2"/>
      <rect x="26" y="42" width="44" height="12" fill="${color}" opacity="0.9"/>
      <rect x="22" y="60" width="52" height="8" fill="#2a2050" stroke="${color}" stroke-width="1.5"/>
      <path d="M40 20 L48 30 L56 20" fill="none" stroke="${color}" stroke-width="2.5"/>`;
  } else {
    inner = `
      <path d="M22 58 Q22 24 48 20 Q74 24 74 58 L66 66 L30 66 Z" fill="#181238" stroke="${color}" stroke-width="2"/>
      <path d="M30 45 Q48 52 66 45 L63 55 Q48 60 33 55 Z" fill="${color}" opacity="0.9"/>
      <circle cx="48" cy="30" r="4" fill="${color}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">${common}${inner}</svg>`;
}
