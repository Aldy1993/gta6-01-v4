// Port Solano — live minimap: player, police (red), mission target (gold),
// traffic (white), packages (green), sea and pier.
import { WORLD } from './config.js';
import { missionTarget } from './missions.js';

export function drawMinimap(G) {
  const c = G.minimapCtx;
  if (!c) return;
  const S = 168, half = WORLD.half + 30;
  const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
  c.clearRect(0, 0, S, S);
  // base
  c.fillStyle = '#20262e'; c.fillRect(0, 0, S, S);
  // sea
  const [, seaY] = toMap(0, WORLD.seaZ);
  c.fillStyle = '#1d6f8f'; c.fillRect(0, seaY, S, S - seaY);
  // pier deck
  const [dx0, dy0] = toMap(-170, WORLD.pierZ);
  const [dx1, dy1] = toMap(170, WORLD.pierZ + 28);
  c.fillStyle = '#8a6a44'; c.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  // roads
  c.strokeStyle = '#3a4048'; c.lineWidth = 5; c.lineCap = 'round';
  for (const x of WORLD.roads) {
    const [mx, my0] = toMap(x, -170); const [, my1] = toMap(x, 180);
    c.beginPath(); c.moveTo(mx, my0); c.lineTo(mx, my1); c.stroke();
  }
  for (const z of WORLD.roads) {
    const [mx0, my] = toMap(-170, z); const [mx1] = toMap(170, z);
    c.beginPath(); c.moveTo(mx0, my); c.lineTo(mx1, my); c.stroke();
  }
  // blocks
  c.fillStyle = '#2c333c';
  for (let i = 0; i < WORLD.roads.length - 1; i++) {
    for (let j = 0; j < WORLD.roads.length - 1; j++) {
      const [x0, z0] = toMap(WORLD.roads[i] + 8, WORLD.roads[j] + 8);
      const [x1, z1] = toMap(WORLD.roads[i + 1] - 8, WORLD.roads[j + 1] - 8);
      c.fillRect(x0, z0, x1 - x0, z1 - z0);
    }
  }
  // packages (green dots)
  c.fillStyle = '#7dff5e';
  for (const p of G.packages) {
    if (p.taken) continue;
    const [mx, my] = toMap(p.x, p.z);
    c.beginPath(); c.arc(mx, my, 2.5, 0, Math.PI * 2); c.fill();
  }
  // traffic (tiny white dots)
  c.fillStyle = '#dddddd';
  for (const t of G.traffic) {
    const [mx, my] = toMap(t.x, t.z);
    c.fillRect(mx - 1, my - 1, 2, 2);
  }
  // mission target (gold diamond, pulsing)
  const t = missionTarget(G);
  if (t) {
    const [mx, my] = toMap(t.x, t.z);
    const r = 5 + Math.sin(G.elapsed * 5) * 1.5;
    c.fillStyle = '#ffd23e';
    c.beginPath();
    c.moveTo(mx, my - r); c.lineTo(mx + r, my); c.lineTo(mx, my + r); c.lineTo(mx - r, my);
    c.closePath(); c.fill();
    c.strokeStyle = '#000'; c.lineWidth = 1; c.stroke();
  }
  // police (red dots)
  c.fillStyle = '#ff3333';
  for (const cop of G.police) {
    const [mx, my] = toMap(cop.x, cop.z);
    c.beginPath(); c.arc(mx, my, 3.5, 0, Math.PI * 2); c.fill();
  }
  // player (white triangle, rotated by heading)
  const [px, py] = toMap(G.player.x, G.player.z);
  c.save();
  c.translate(px, py);
  c.rotate(G.player.heading);
  c.fillStyle = '#ffffff';
  c.strokeStyle = '#000'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(0, -7); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath();
  c.fill(); c.stroke();
  c.restore();
  // north tick + border
  c.fillStyle = '#fff'; c.font = 'bold 11px Arial'; c.fillText('N', S - 14, 13);
  c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
  c.strokeRect(1, 1, S - 2, S - 2);
}
