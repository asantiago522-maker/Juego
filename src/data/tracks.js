/**
 * Pistas definidas por puntos de control [x, z] (bucle cerrado).
 * La malla, los waypoints y la línea de carrera se generan proceduralmente.
 */
export const TRACKS = {
  skyline: {
    id: 'skyline',
    name: 'Circuito Skyline',
    tag: 'Rápida · Curvones amplios',
    desc: 'El óvalo urbano de la megaciudad. Rectas larguísimas y curvas de apoyo a fondo bajo las torres de neón.',
    halfWidth: 8.5,
    theme: { edge: 0x00e5ff, accent: 0xff2ec4, windows: '#00e5ff' },
    sunAz: 0.35,
    points: [
      [0, -210], [150, -195], [245, -110], [258, 10], [205, 120], [90, 168],
      [-40, 180], [-160, 150], [-242, 60], [-250, -70], [-172, -168], [-60, -205],
    ],
  },
  serpentina: {
    id: 'serpentina',
    name: 'Serpentina Ámbar',
    tag: 'Técnica · Horquillas',
    desc: 'Carretera de montaña traicionera con doble horquilla interior. Aquí gana el que mejor frena, no el que más corre.',
    halfWidth: 7.5,
    theme: { edge: 0xffb300, accent: 0xff2ec4, windows: '#ffb300' },
    sunAz: 2.4,
    points: [
      [0, -215], [148, -186], [232, -96], [168, -30], [52, -64], [-10, 4],
      [46, 82], [170, 64], [236, 142], [150, 224], [8, 248], [-142, 218],
      [-236, 124], [-248, 2], [-236, -124], [-148, -206],
    ],
  },
  autovia: {
    id: 'autovia',
    name: 'Autovía Fantasma',
    tag: 'Mixta · Chicane final',
    desc: 'La autopista abandonada donde duerme la niebla. Rectas etéreas y una chicane final que decide campeonatos.',
    halfWidth: 8.5,
    theme: { edge: 0xb388ff, accent: 0x00e5ff, windows: '#b388ff' },
    sunAz: -1.2,
    points: [
      [0, -150], [170, -158], [300, -110], [345, 10], [290, 130], [160, 150],
      [70, 225], [-90, 248], [-255, 196], [-320, 60], [-300, -70], [-190, -128],
    ],
  },
};

export const TRACK_LIST = Object.values(TRACKS);
