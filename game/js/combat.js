// Port Solano — on-foot combat: punch + pistol, simple hit feedback.
import * as THREE from 'three';
import { clamp } from './config.js';

export function punch(G) {
  if (G.player.cooldown > 0 || G.player.inCar) return;
  G.player.cooldown = 0.45;
  G.player.punchAnim = 0.35;
  G.audio.punch();
  // nearest ped within 2.2m in front takes the hit
  const px = G.player.x, pz = G.player.z;
  const fx = Math.sin(G.player.heading), fz = Math.cos(G.player.heading);
  let best = null, bestD = 2.4;
  for (const p of G.peds) {
    const dx = p.x - px, dz = p.z - pz;
    const d = Math.hypot(dx, dz);
    if (d < bestD && (dx * fx + dz * fz) > 0) { best = p; bestD = d; }
  }
  if (best) {
    best.panic = 4;
    G.player.wanted = clamp(G.player.wanted + 1, 0, 5);
    G.message('You decked a pedestrian! The cops noticed.', 3);
    G.ensurePoliceSoon = true;
  }
  // punch a cop car? no — only peds. Punching near a cop also draws heat.
  for (const c of G.police) {
    if (Math.hypot(c.x - px, c.z - pz) < 3) {
      G.player.wanted = clamp(G.player.wanted + 1, 0, 5);
      G.ensurePoliceSoon = true;
    }
  }
}

export function shoot(G) {
  if (G.player.cooldown > 0 || G.player.inCar) return;
  if (G.player.ammo <= 0) {
    G.message('Out of ammo — find a new piece (pick up packages to earn cash).', 2.5);
    G.player.cooldown = 0.3;
    return;
  }
  G.player.cooldown = 0.4;
  G.player.ammo -= 1;
  G.player.shotAnim = 0.2;
  G.audio.shot();
  // tracer line from player toward facing
  const fx = Math.sin(G.player.heading), fz = Math.cos(G.player.heading);
  const from = new THREE.Vector3(G.player.x, 1.4, G.player.z);
  const to = new THREE.Vector3(G.player.x + fx * 30, 1.4, G.player.z + fz * 30);
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe14d }));
  G.scene.add(line);
  G.tracers.push({ line, ttl: 0.12 });
  // hit: nearest ped or cop within a narrow cone up to 30m
  let best = null, bestD = 30;
  const consider = (x, z) => {
    const dx = x - G.player.x, dz = z - G.player.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.5 || d > 30) return;
    const dot = (dx * fx + dz * fz) / d;
    if (dot > 0.985 && d < bestD) { bestD = d; best = { x, z }; }
  };
  for (const p of G.peds) consider(p.x, p.z);
  for (const c of G.police) consider(c.x, c.z);
  if (best) {
    for (const p of G.peds) {
      if (Math.hypot(p.x - best.x, p.z - best.z) < 0.5) { p.panic = 6; break; }
    }
    // gunfire scares everyone nearby
    for (const p of G.peds) {
      if (Math.hypot(p.x - G.player.x, p.z - G.player.z) < 14) p.panic = Math.max(p.panic, 3);
    }
    G.player.wanted = clamp(G.player.wanted + 2, 0, 5);
    G.ensurePoliceSoon = true;
    G.message('Shots fired! Wanted level up.', 3);
  }
}

export function stepCombat(G, dt) {
  if (G.player.cooldown > 0) G.player.cooldown -= dt;
  if (G.player.punchAnim > 0) G.player.punchAnim -= dt;
  if (G.player.shotAnim > 0) G.player.shotAnim -= dt;
  for (let i = G.tracers.length - 1; i >= 0; i--) {
    const t = G.tracers[i];
    t.ttl -= dt;
    if (t.ttl <= 0) { G.scene.remove(t.line); t.line.geometry.dispose(); G.tracers.splice(i, 1); }
  }
}
