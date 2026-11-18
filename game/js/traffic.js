// Port Solano — AI traffic: cars cruising the avenues and streets.
import * as THREE from 'three';
import { WORLD, CAR_DEFS, rng, clamp } from './config.js';
import { makeCar } from './vehicles.js';

export function spawnTraffic(scene, count) {
  const R = rng(4242);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const def = CAR_DEFS[Math.floor(R() * CAR_DEFS.length)];
    const vertical = R() > 0.5;
    const road = WORLD.roads[Math.floor(R() * WORLD.roads.length)];
    const lane = (R() > 0.5 ? 3 : -3); // right-hand lane
    const along = -155 + R() * 300;
    const x = vertical ? road + lane : along;
    const z = vertical ? along : road + lane;
    if (z > 140) continue;
    const dir = R() > 0.5 ? 1 : -1;
    const heading = vertical ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = makeCar(def, x, z, heading, { id: 'traffic' + i });
    car.speed = 8 + R() * 6;
    car.cruise = car.speed;
    car.vertical = vertical; car.dir = dir; car.lane = lane; car.road = road;
    car.wait = 0;
    scene.add(car.mesh);
    cars.push(car);
  }
  return cars;
}

export function stepTraffic(cars, playerCar, dt, time) {
  for (const c of cars) {
    if (c.wait > 0) { c.wait -= dt; continue; }
    // slow down if another car is close ahead
    let blocked = false;
    for (const o of cars) {
      if (o === c) continue;
      const dx = o.x - c.x, dz = o.z - c.z;
      const ahead = c.vertical ? dz * c.dir : dx * c.dir;
      const side = c.vertical ? Math.abs(dx) : Math.abs(dz);
      if (ahead > 0 && ahead < 9 && side < 2.4) { blocked = true; break; }
    }
    if (!blocked && playerCar) {
      const dx = playerCar.x - c.x, dz = playerCar.z - c.z;
      const ahead = c.vertical ? dz * c.dir : dx * c.dir;
      const side = c.vertical ? Math.abs(dx) : Math.abs(dz);
      if (ahead > 0 && ahead < 10 && side < 2.6) blocked = true;
    }
    const target = blocked ? 0 : c.cruise;
    c.speed += (target - c.speed) * Math.min(1, dt * 1.5);
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
    c.x += fx * c.speed * dt; c.z += fz * c.speed * dt;
    // wrap around the city edge, pick a new road
    if (c.vertical) {
      if (c.z > 148 || c.z < -168) {
        c.z = c.dir > 0 ? -165 : 145;
        const nr = WORLD.roads[Math.floor(Math.random() * WORLD.roads.length)];
        c.road = nr; c.x = nr + c.lane;
      }
    } else if (c.x > 168 || c.x < -168) {
      c.x = c.dir > 0 ? -165 : 165;
      const nr = WORLD.roads[Math.floor(Math.random() * WORLD.roads.length)];
      c.road = nr; c.z = nr + c.lane;
    }
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
  }
}

// A stopped taxi the player starts next to (mission 1 flavour).
export function spawnTaxi(scene) {
  const def = CAR_DEFS[0];
  const car = makeCar(def, 24, -52, Math.PI / 2, { id: 'taxi', parked: true, taxi: true });
  scene.add(car.mesh);
  return car;
}

// Harbor delivery vans on fixed loops along the avenues.
export function spawnDeliveryVans(scene) {
  const R = rng(2024);
  const vans = [];
  const def = CAR_DEFS[6]; // Harbor Van
  for (let i = 0; i < 3; i++) {
    const road = WORLD.roads[1 + Math.floor(R() * 3)];
    const lane = R() > 0.5 ? 3 : -3;
    const along = -140 + R() * 280;
    const dir = R() > 0.5 ? 1 : -1;
    const car = makeCar(def, road + lane, along, dir > 0 ? 0 : Math.PI, { id: 'van' + i });
    car.speed = 9 + R() * 3;
    car.cruise = car.speed;
    car.vertical = true; car.dir = dir; car.lane = lane; car.road = road;
    car.wait = 0;
    scene.add(car.mesh);
    vans.push(car);
  }
  return vans;
}
