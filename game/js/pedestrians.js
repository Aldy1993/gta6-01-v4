// Port Solano — pedestrians: varied walkers on sidewalks and crossings.
import * as THREE from 'three';
import { WORLD, PED_SHIRTS, PED_SKINS, PED_HAIRS, rng, clamp } from './config.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color }); }

export function buildPedMesh(R) {
  const g = new THREE.Group();
  const skin = PED_SKINS[Math.floor(R() * PED_SKINS.length)];
  const shirt = PED_SHIRTS[Math.floor(R() * PED_SHIRTS.length)];
  const hair = PED_HAIRS[Math.floor(R() * PED_HAIRS.length)];
  const tall = 1.6 + R() * 0.35;
  const scale = tall / 1.75;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.24), lam(0x2a3444));
  legs.position.y = 0.4; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.62, 0.3), lam(shirt));
  torso.position.y = 1.1; g.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), lam(skin));
  armL.position.set(-0.36, 1.05, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.36; g.add(armR);
  g.userData.armL = armL; g.userData.armR = armR;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), lam(skin));
  head.position.y = 1.6; g.add(head);
  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lam(hair));
  hairM.position.y = 1.68; hairM.scale.set(1, 0.7, 1); g.add(hairM);
  if (R() > 0.6) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 10),
      lam([0xe84a4a, 0x2a7fd2, 0xf2c230][Math.floor(R() * 3)]));
    hat.position.y = 1.82; g.add(hat);
  }
  if (R() > 0.75) {
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.12), lam(0x8a4fd9));
    bag.position.set(0, 1.15, -0.24); g.add(bag);
  }
  g.scale.setScalar(scale);
  return g;
}

export function spawnPedestrians(scene, count) {
  const R = rng(9911);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = buildPedMesh(R);
    const road = WORLD.roads[Math.floor(R() * WORLD.roads.length)];
    const side = R() > 0.5 ? 1 : -1;
    const vertical = R() > 0.5;
    const along = -155 + R() * 295;
    const x = vertical ? road + side * 8.2 : along;
    const z = vertical ? along : road + side * 8.2;
    if (z > 140) continue;
    mesh.position.set(x, 0, z);
    const heading = vertical ? (side > 0 ? Math.PI : 0) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    mesh.rotation.y = heading + (R() - 0.5) * 0.4;
    scene.add(mesh);
    peds.push({
      mesh, x, z, heading: mesh.rotation.y, speed: 1.0 + R() * 0.9,
      vertical, side, road, panic: 0, phase: R() * Math.PI * 2,
      wander: 0, target: null, id: 'ped' + i,
    });
  }
  return peds;
}

export function spawnMarketCrowd(scene, count) {
  // Shoppers milling around the Night Market stalls (-58, 52).
  const R = rng(31337);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = buildPedMesh(R);
    const x = -70 + R() * 26, z = 46 + R() * 14;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = R() * Math.PI * 2;
    scene.add(mesh);
    peds.push({
      mesh, x, z, heading: mesh.rotation.y, speed: 0.7 + R() * 0.6,
      vertical: false, side: 1, road: 0, panic: 0, phase: R() * Math.PI * 2,
      wander: 1 + R() * 3, target: null, id: 'market' + i,
      mode: 'plaza', anchorX: -58, anchorZ: 52, anchorR: 14,
    });
  }
  return peds;
}

export function spawnJoggers(scene, count) {
  // Fast runners looping the pier promenade.
  const R = rng(606);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const mesh = buildPedMesh(R);
    const x = -60 + R() * 120, z = 152 + R() * 10;
    mesh.position.set(x, 0, z);
    mesh.rotation.y = R() * Math.PI * 2;
    scene.add(mesh);
    peds.push({
      mesh, x, z, heading: mesh.rotation.y, speed: 3.0 + R() * 0.8,
      vertical: false, side: 1, road: 0, panic: 0, phase: R() * Math.PI * 2,
      wander: 2 + R() * 3, target: null, id: 'jog' + i,
      mode: 'plaza', anchorX: 0, anchorZ: 158, anchorR: 55,
    });
  }
  return peds;
}

export function stepPedestrians(peds, playerPos, dt, time) {
  for (const p of peds) {
    if (p.panic > 0) {
      p.panic -= dt;
      // flee away from the player
      const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
      const d = Math.hypot(dx, dz) || 1;
      p.heading = Math.atan2(dx / d, dz / d);
      p.x += (dx / d) * 3.2 * dt; p.z += (dz / d) * 3.2 * dt;
    } else if (p.mode === 'plaza') {
      // drift around the market anchor, pausing to browse stalls
      p.wander -= dt;
      if (p.wander <= 0) {
        p.wander = 1.5 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2, r = Math.random() * p.anchorR;
        p.target = [p.anchorX + Math.sin(a) * r, p.anchorZ + Math.cos(a) * r];
        if (p.target) p.heading = Math.atan2(p.target[0] - p.x, p.target[1] - p.z);
      }
      if (p.target) {
        const dx = p.target[0] - p.x, dz = p.target[1] - p.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.4) { p.x += (dx / d) * p.speed * dt; p.z += (dz / d) * p.speed * dt; }
      }
    } else {
      // stroll along the sidewalk; occasionally pick a new stretch
      p.wander -= dt;
      if (p.wander <= 0) {
        p.wander = 4 + Math.random() * 6;
        if (Math.random() < 0.25) p.heading += Math.PI; // turn around
      }
      const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
      p.x += fx * p.speed * dt; p.z += fz * p.speed * dt;
      if (p.vertical) {
        if (p.z > 148 || p.z < -162) p.heading += Math.PI;
      } else if (p.x > 162 || p.x < -162) p.heading += Math.PI;
    }
    p.x = clamp(p.x, -168, 168); p.z = clamp(p.z, -168, 176);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    // walk swing
    const swing = Math.sin(time * 6 + p.phase) * 0.45;
    p.mesh.userData.armL.rotation.x = swing;
    p.mesh.userData.armR.rotation.x = -swing;
    p.mesh.position.y = Math.abs(Math.sin(time * 6 + p.phase)) * 0.04;
  }
}
