/** Helpers DOM mínimos. */
export function el(tag, className = '', html = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html) node.innerHTML = html;
  return node;
}

export function screenRoot(uiEl, className = '') {
  const root = el('div', `screen ${className}`.trim());
  uiEl.appendChild(root);
  return root;
}

/** Dibuja la silueta de una pista en un canvas (para miniaturas). */
export function drawTrackThumb(canvas, track, colorCss) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0620';
  ctx.fillRect(0, 0, w, h);

  const pts = track.points;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  const pad = 18;
  const scale = Math.min((w - pad * 2) / (maxX - minX), (h - pad * 2) / (maxZ - minZ));
  const cx = (minX + maxX) / 2;
  const cz = (minZ + maxZ) / 2;
  const px = (x) => w / 2 + (x - cx) * scale;
  const pz = (z) => h / 2 + (z - cz) * scale;

  // trazado suave (curva cerrada con midpoints)
  ctx.beginPath();
  const n = pts.length;
  ctx.moveTo(px((pts[0][0] + pts[1][0]) / 2), pz((pts[0][1] + pts[1][1]) / 2));
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    const q = pts[(i + 1) % n];
    ctx.quadraticCurveTo(px(p[0]), pz(p[1]), px((p[0] + q[0]) / 2), pz((p[1] + q[1]) / 2));
  }
  ctx.closePath();
  ctx.strokeStyle = colorCss;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = colorCss;
  ctx.shadowBlur = 10;
  ctx.stroke();

  // punto de meta
  const m0 = pts[0];
  const m1 = pts[1];
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(px((m0[0] + m1[0]) / 2), pz((m0[1] + m1[1]) / 2), 4, 0, Math.PI * 2);
  ctx.fill();
}
