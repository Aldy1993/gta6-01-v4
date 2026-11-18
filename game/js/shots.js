// Port Solano — deterministic ?shot= staging for screenshots.
// The sim is stepped synchronously in a loop BEFORE the first painted frame
// (headless virtual time only advances a few frames), then the camera and
// subjects are frozen so the composition is exact and the speedometer reads
// real simulated speed, not zero.
import { WORLD, MISSIONS, clamp } from './config.js';
import { updateBeacon } from './missions.js';

export const SHOT_NAMES = ['cover', 'chase', 'street', 'mission'];

function putPlayerInCar(G, car, x, z, heading) {
  car.x = x; car.z = z; car.heading = heading; car.speed = 0; car.parked = false;
  car.mesh.position.set(x, 0, z); car.mesh.rotation.y = heading;
  G.player.inCar = true; G.player.onFoot = false; G.player.car = car;
  G.player.x = x; G.player.z = z; G.player.heading = heading; G.player.speed = 0;
  G.player.mesh.visible = false;
}

export function setupShot(G, name) {
  G.shot = name;
  G.autopilot = { throttle: 1, steer: 0 };
  if (name === 'cover') {
    G.sunset = true;
    G.applyLighting();
    const car = G.taxi;
    putPlayerInCar(G, car, 0, -80, 0); // avenue x=0, heading +z (south, downtown)
    G.player.money = 1250;
    G.missionIndex = 0; G.missionStage = 1; updateBeacon(G);
    G.steps = 300;
  } else if (name === 'chase') {
    G.sunset = false;
    const car = G.comet;
    putPlayerInCar(G, car, 0, -60, 0);
    G.player.money = 2840;
    G.player.wanted = 3;
    G.missionIndex = 1; G.missionStage = 1; updateBeacon(G);
    G.steps = 260;
  } else if (name === 'street') {
    G.sunset = false;
    G.player.inCar = false; G.player.onFoot = true; G.player.car = null;
    G.player.x = -52; G.player.z = 44; G.player.heading = Math.PI; // facing north up the sidewalk
    G.player.mesh.visible = true;
    G.player.mesh.position.set(G.player.x, 0, G.player.z);
    G.player.money = 640;
    G.missionIndex = 0; G.missionStage = 0; updateBeacon(G);
    G.steps = 120;
  } else if (name === 'mission') {
    G.sunset = false;
    G.player.inCar = false; G.player.onFoot = true; G.player.car = null;
    G.player.x = 60; G.player.z = 156; G.player.heading = 0; // facing the sea (+z)
    G.player.mesh.visible = true;
    G.player.mesh.position.set(G.player.x, 0, G.player.z);
    G.player.money = 3120;
    G.packageCarried = true;
    G.missionIndex = 2; G.missionStage = 1; updateBeacon(G);
    G.steps = 60;
  }
  G.started = true;
  G.paused = false;
}

// After the synchronous steps: pin subjects into the frame, then freeze.
export function finalizeShot(G, name) {
  const p = G.player;
  if (name === 'cover' || name === 'chase') {
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const cx = p.x - fx * 13, cz = p.z - fz * 13;
    G.setCamera(cx, 4.6, cz, p.x + fx * 12, 1.6, p.z + fz * 12);
  }
  if (name === 'chase') {
    // Two interceptors ahead of the player, inside the frame, facing him.
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const rx = Math.cos(p.heading), rz = -Math.sin(p.heading);
    const spots = [
      [p.x + fx * 14 + rx * 4.5, p.z + fz * 14 + rz * 4.5],
      [p.x + fx * 21 - rx * 4.5, p.z + fz * 21 - rz * 4.5],
    ];
    G.police.forEach((cop, i) => {
      if (i >= spots.length) return;
      cop.x = spots[i][0]; cop.z = spots[i][1];
      cop.heading = Math.atan2(p.x - cop.x, p.z - cop.z);
      cop.speed = 12;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.heading;
    });
  }
  if (name === 'street') {
    // Cluster pedestrians on the sidewalk ahead of Rico, inside the frame.
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    const rx = Math.cos(p.heading), rz = -Math.sin(p.heading);
    const spots = [
      [4, 1.5], [7, -1.2], [9, 2.0], [11, -0.5], [6, 3.2], [13, 1.0],
    ];
    G.peds.slice(0, 6).forEach((ped, i) => {
      const [fwd, side] = spots[i];
      ped.x = p.x + fx * fwd + rx * side;
      ped.z = p.z + fz * fwd + rz * side;
      ped.heading = p.heading + Math.PI + (i % 2 === 0 ? 0.5 : -0.4);
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
    });
    const fx2 = Math.sin(p.heading), fz2 = Math.cos(p.heading);
    G.setCamera(p.x - fx2 * 7, 3.0, p.z - fz2 * 7, p.x + fx2 * 10, 1.5, p.z + fz2 * 10);
  }
  if (name === 'mission') {
    const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
    G.setCamera(p.x - fx * 8, 3.4, p.z - fz * 8, p.x + fx * 22, 2.0, p.z + fz * 22);
  }
  G.frozen = true;
  G.autopilot = null;
  G.messageText = '';
  G.messageUntil = 0;
}
