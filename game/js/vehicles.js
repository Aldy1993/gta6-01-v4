// Port Solano — vehicles: car mesh factory, police livery, arcade driving.
import * as THREE from 'three';
import { CAR_DEFS, rng, clamp } from './config.js';

function lam(color) { return new THREE.MeshLambertMaterial({ color }); }
function basic(color) { return new THREE.MeshBasicMaterial({ color }); }

export function buildCarMesh(def, opts) {
  const o = opts || {};
  const g = new THREE.Group();
  const bodyCol = o.police ? 0x111111 : def.body;
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, def.len), lam(bodyCol));
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, def.len * 0.45), lam(0x1c2733));
  cabin.position.set(0, 1.25, -def.len * 0.05); g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.4, def.len * 0.4),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ef, transparent: true, opacity: 0.85 }));
  glass.position.set(0, 1.3, -def.len * 0.05); g.add(glass);
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = lam(0x141414);
  const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.32, 8);
  const hubMat = lam(0xaaaaaa);
  const wy = 0.38, wx = 1.0, wz = def.len / 2 - 0.7;
  for (const [sx, sz] of [[-wx, wz], [wx, wz], [-wx, -wz], [wx, -wz]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(sx, wy, sz); g.add(w);
    const h = new THREE.Mesh(hubGeo, hubMat);
    h.rotation.z = Math.PI / 2; h.position.set(sx, wy, sz); g.add(h);
  }
  // headlights + taillights
  const hl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), basic(0xfff6c0));
  hl.position.set(0, 0.7, def.len / 2 + 0.02); g.add(hl);
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), basic(0xff2222));
  tl.position.set(0, 0.7, -def.len / 2 - 0.02); g.add(tl);
  if (def.taxi || o.taxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.5), basic(0xffe14d));
    sign.position.set(0, 1.75, 0); g.add(sign);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, def.len * 0.9), basic(0x111111));
    stripe.position.y = 0.72; g.add(stripe);
  }
  if (o.police) {
    // white doors band + light bar
    const band = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.42, def.len * 0.55), lam(0xf5f5f0));
    band.position.y = 0.7; g.add(band);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), lam(0x222222));
    bar.position.set(0, 1.68, 0); g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.5), basic(0xff2222));
    red.position.set(-0.32, 1.7, 0); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.24, 0.5), basic(0x2266ff));
    blue.position.set(0.32, 1.7, 0); g.add(blue);
    g.userData.lightRed = red; g.userData.lightBlue = blue;
  }
  g.userData.def = def;
  return g;
}

export function makeCar(def, x, z, heading, opts) {
  const mesh = buildCarMesh(def, opts || {});
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading || 0;
  return {
    def, mesh, x, z, heading: heading || 0,
    speed: 0, steer: 0, police: !!(opts && opts.police),
    taxi: !!(def.taxi || (opts && opts.taxi)),
    parked: !!(opts && opts.parked), id: (opts && opts.id) || '',
    flash: 0, stuck: 0,
  };
}

// Arcade car physics: throttle, brake/reverse, steering scales with speed.
export function driveCar(car, throttle, steerInput, dt, opts) {
  const o = opts || {};
  const maxSpeed = (car.def.max || 30) * (o.boost || 1);
  const accel = 16, brake = 30, drag = 0.55, reverseMax = 12;
  if (throttle > 0) car.speed += accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 0.5) car.speed -= brake * dt;
    else car.speed -= accel * 0.6 * dt;
  }
  car.speed -= car.speed * drag * dt;
  car.speed = clamp(car.speed, -reverseMax, maxSpeed);
  if (Math.abs(car.speed) < 0.05 && throttle === 0) car.speed = 0;
  const steerTarget = steerInput * clamp(Math.abs(car.speed) / 8, 0, 1) * 0.55;
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  car.heading += car.steer * (car.speed >= 0 ? 1 : -1) * dt * (Math.abs(car.speed) > 0.1 ? 1 : 0) * 1.9;
  const fx = Math.sin(car.heading), fz = Math.cos(car.heading);
  car.x += fx * car.speed * dt;
  car.z += fz * car.speed * dt;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  // body lean + wheel spin feel
  car.mesh.rotation.z = -car.steer * 0.06 * Math.min(1, Math.abs(car.speed) / 10);
  return car.speed;
}

export function spawnParkedCars(scene, count) {
  const R = rng(777);
  const cars = [];
  const spots = [];
  for (let i = 0; i < count; i++) {
    const road = WORLD_ROADS[Math.floor(R() * WORLD_ROADS.length)];
    const along = -150 + R() * 290;
    const side = R() > 0.5 ? 1 : -1;
    const vertical = R() > 0.5;
    const x = vertical ? road + side * 4.4 : along;
    const z = vertical ? along : road + side * 4.4;
    if (Math.abs(x) > 165 || z > 145 || z < -165) continue;
    if (spots.some(([sx, sz]) => (sx - x) * (sx - x) + (sz - z) * (sz - z) < 64)) continue;
    spots.push([x, z]);
    const def = CAR_DEFS[Math.floor(R() * CAR_DEFS.length)];
    const heading = vertical ? (side > 0 ? Math.PI : 0) : (side > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(def, x, z, heading, { parked: true, id: 'park' + i });
    scene.add(car.mesh);
    cars.push(car);
  }
  return cars;
}
const WORLD_ROADS = [-120, -60, 0, 60, 120];
