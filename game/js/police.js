// Port Solano — police AI + wanted level.
import * as THREE from 'three';
import { CAR_DEFS, WANTED_MAX, clamp } from './config.js';
import { makeCar, buildCarMesh } from './vehicles.js';

const POLICE_DEF = { name: 'Solano PD Interceptor', body: 0x111111, top: 2.4, len: 4.5, max: 42 };

export function spawnPolice(scene, x, z, heading) {
  const car = makeCar(POLICE_DEF, x, z, heading || 0, { police: true, id: 'pd' + Math.floor(Math.random() * 1e6) });
  car.siren = 0;
  scene.add(car.mesh);
  return car;
}

export function wantedFor(count) { return clamp(count, 0, WANTED_MAX); }

// Chase: steer toward the player, ram speed a touch below the player's top
// speed so escapes stay possible. Light bar flashes red/blue.
export function stepPolice(cops, player, dt, time) {
  for (const c of cops) {
    const dx = player.x - c.x, dz = player.z - c.z;
    const dist = Math.hypot(dx, dz) || 1;
    const targetHeading = Math.atan2(dx, dz);
    let dh = targetHeading - c.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.heading += clamp(dh, -1.6 * dt, 1.6 * dt);
    const desired = dist > 14 ? 34 : 20;
    c.speed += (desired - c.speed) * Math.min(1, dt * 0.8);
    // light ramming when very close
    if (dist < 6) c.speed = Math.min(c.speed + 6 * dt, 38);
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    c.x = clamp(c.x, -168, 168); c.z = clamp(c.z, -168, 178);
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
    // flashing light bar
    const on = Math.sin(time * 10) > 0;
    const red = c.mesh.userData.lightRed, blue = c.mesh.userData.lightBlue;
    if (red && blue) {
      red.material.color.setHex(on ? 0xff2222 : 0x550000);
      blue.material.color.setHex(on ? 0x111155 : 0x2266ff);
      red.material.needsUpdate = true; blue.material.needsUpdate = true;
    }
    c.dist = dist;
  }
}

// Wanted heat decays only when the player is far from every cop.
export function decayWanted(G, dt) {
  if (G.player.wanted <= 0 || G.police.length === 0) return;
  const near = G.police.some((c) => (c.dist || 999) < 70);
  if (!near) {
    G.wantedTimer += dt;
    if (G.wantedTimer > 6) {
      G.player.wanted -= 1;
      G.wantedTimer = 0;
      G.message('You lost the heat. Wanted level dropped.', 3);
    }
  } else G.wantedTimer = 0;
}

export function ensurePoliceCount(G) {
  const want = Math.min(G.player.wanted, 3);
  while (G.police.length < want) {
    const a = Math.random() * Math.PI * 2;
    const px = G.player.x + Math.sin(a) * 55, pz = G.player.z + Math.cos(a) * 55;
    const cop = spawnPolice(G.scene, clamp(px, -160, 160), clamp(pz, -160, 170), 0);
    G.police.push(cop);
  }
  while (G.police.length > want) {
    const c = G.police.pop();
    G.scene.remove(c.mesh);
  }
  G.audio.siren(G.police.length > 0);
}
