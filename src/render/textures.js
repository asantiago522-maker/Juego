import * as THREE from 'three';

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Sol synthwave: disco con degradado y franjas horizontales. */
export function sunTexture(color = '#ff2ec4') {
  return makeCanvas(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#fff7e8');
    g.addColorStop(0.35, '#ffd166');
    g.addColorStop(0.7, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // franjas retro en la mitad inferior
    ctx.globalCompositeOperation = 'destination-out';
    for (let y = h * 0.52, i = 0; y < h; y += 6 + i * 2.4, i++) {
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, y, w, 2.4 + i * 0.8);
    }
  });
}

/** Banda a cuadros para la línea de meta. */
export function checkerTexture(cols = 12, rows = 2) {
  return makeCanvas(cols * 16, rows * 16, (ctx, w, h) => {
    const cw = w / cols;
    const ch = h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#f2f2f2' : '#111017';
        ctx.fillRect(i * cw, j * ch, cw, ch);
      }
    }
  });
}

/** Fachada de edificio con ventanas encendidas (estilo neón). */
export function windowsTexture(color = '#00e5ff', seed = 1) {
  return makeCanvas(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#0a0818';
    ctx.fillRect(0, 0, w, h);
    let s = seed * 7919;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const cols = 6;
    const rows = 14;
    const cw = w / cols;
    const ch = h / rows;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const r = rnd();
        if (r > 0.62) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.25 + rnd() * 0.7;
        } else {
          ctx.fillStyle = '#141030';
          ctx.globalAlpha = 1;
        }
        ctx.fillRect(i * cw + 1.5, j * ch + 2, cw - 3, ch - 4);
      }
    }
    ctx.globalAlpha = 1;
  });
}
