// Port Solano — main: game state, loop, player control, camera, wiring.
import * as THREE from 'three';
import { WORLD, CAR_DEFS, PALETTE, clamp, lerp, fmtMoney } from './config.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { loadSave, storeSave, clearSave } from './save.js';
import { buildWorld, isOnRoad } from './world.js';
import { makeCar, driveCar, spawnParkedCars } from './vehicles.js';
import { spawnTraffic, stepTraffic, spawnTaxi, spawnDeliveryVans } from './traffic.js';
import { buildPedMesh, spawnPedestrians, spawnMarketCrowd, spawnJoggers, stepPedestrians } from './pedestrians.js';
import { spawnPolice, stepPolice, decayWanted, ensurePoliceCount } from './police.js';
import { initMissions, stepMissions, missionTarget, packagesTaken } from './missions.js';
import { punch, shoot, stepCombat } from './combat.js';
import { buildHud, updateHud, showStart, hideStart, showPause, bindButtons } from './hud.js';
import { drawMinimap } from './minimap.js';
import { setupShot, finalizeShot, SHOT_NAMES } from './shots.js';
import { Radio } from './radio.js';
import { rng } from './config.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const G = {
  scene: null, camera: null, renderer: null, world: null,
  input: new Input(), audio: new AudioEngine(),
  player: null, traffic: [], peds: [], police: [], cars: [],
  taxi: null, comet: null, passengerPed: null,
  missionIndex: 0, missionStage: 0, missionDone: false, missionDist: 0,
  packages: [], beacon: null, packageCarried: false,
  elapsed: 0, started: false, paused: false, frozen: false,
  shot: null, sunset: false, autopilot: null, steps: 0,
  tracers: [], wantedTimer: 0, policeTimer: 0, saveTimer: 0, hudTimer: 0,
  camYaw: 0, camFree: 0, messageText: '', messageUntil: 0, saveSoon: false,
  ensurePoliceSoon: false, minimapCtx: null, hud: null, dayT: 0.12,
};
window.__PORT_SOLANO__ = G;
G.radio = new Radio(G.audio);

G.message = (text, dur) => { G.messageText = text; G.messageUntil = G.elapsed + (dur || 3); };
G.setCamera = (x, y, z, lx, ly, lz) => {
  G.camera.position.set(x, y, z);
  G.camera.lookAt(lx, ly, lz);
};
G.applyLighting = () => {
  const sunset = G.sunset;
  G.scene.background = new THREE.Color(sunset ? PALETTE.skySunset : PALETTE.skyDay);
  G.scene.fog = new THREE.Fog(sunset ? 0xe88a4a : PALETTE.fogDay, 120, 420);
  G.sun.color.setHex(sunset ? 0xffb36b : 0xfff2d8);
  G.sun.intensity = sunset ? 1.1 : 1.6;
  G.sun.position.set(sunset ? -120 : 80, sunset ? 26 : 120, sunset ? -40 : 60);
  G.hemi.intensity = sunset ? 0.55 : 0.85;
};

function buildPlayerMesh() {
  const g = new THREE.Group();
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.8, 0.26), lam(0x1e2a3a));
  legs.position.y = 0.4; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.62, 0.32), lam(0x0e7490)); // teal jacket
  torso.position.y = 1.12; g.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), lam(0x0e7490));
  armL.position.set(-0.38, 1.05, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.38; g.add(armR);
  g.userData.armL = armL; g.userData.armR = armR;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), lam(0xf2c89b));
  head.position.y = 1.62; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), lam(0x1a1a1a));
  hair.position.y = 1.7; hair.scale.set(1, 0.65, 1); g.add(hair);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.1, 10), lam(0xe84a4a));
  cap.position.y = 1.84; g.add(cap);
  return g;
}

function init() {
  const errBox = document.getElementById('webgl-error');
  try {
    G.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    errBox.textContent = 'WebGL is not available in this browser, so Port Solano cannot start.';
    errBox.classList.remove('hidden');
    return false;
  }
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  document.getElementById('game').appendChild(G.renderer.domElement);
  G.scene = new THREE.Scene();
  G.scene.background = new THREE.Color(PALETTE.skyDay);
  G.scene.fog = new THREE.Fog(PALETTE.fogDay, 120, 420);
  G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  G.camera.position.set(20, 4, -60);
  G.hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.85);
  G.scene.add(G.hemi);
  G.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
  G.sun.position.set(80, 120, 60);
  G.scene.add(G.sun);
  G.world = buildWorld(G.scene);
  G.minimapCtx = document.getElementById('minimap').getContext('2d');
  G.hud = buildHud(G);
  bindButtons(G);

  // player
  const save = loadSave();
  const mesh = buildPlayerMesh();
  mesh.position.set(20, 0, -48);
  G.scene.add(mesh);
  G.player = {
    mesh, x: 20, z: -48, heading: Math.PI / 2, speed: 0,
    inCar: false, onFoot: true, car: null, money: save.money,
    wanted: 0, ammo: 24, cooldown: 0, punchAnim: 0, shotAnim: 0, bestSpeed: save.bestSpeed || 0,
  };
  G.camYaw = G.player.heading;
  // vehicles
  G.taxi = spawnTaxi(G.scene);
  G.cars.push(G.taxi);
  G.comet = makeCar(CAR_DEFS[3], 118, 118, Math.PI, { parked: true, id: 'comet' });
  G.scene.add(G.comet.mesh);
  G.cars.push(G.comet);
  const parked = spawnParkedCars(G.scene, 14);
  G.cars.push(...parked);
  G.traffic = spawnTraffic(G.scene, 16);
  G.traffic.push(...spawnDeliveryVans(G.scene));
  G.peds = spawnPedestrians(G.scene, 26);
  G.peds.push(...spawnMarketCrowd(G.scene, 8));
  G.peds.push(...spawnJoggers(G.scene, 4));
  // mission 1 passenger waiting on Harbor Ave
  const pr = rng(555);
  G.passengerPed = buildPedMesh(pr);
  G.passengerPed.position.set(30, 0, -58);
  G.passengerPed.rotation.y = Math.PI;
  G.scene.add(G.passengerPed);
  initMissions(G, save);
  G.message('Welcome to Port Solano, Rico. Mission 1: First Fare — pick up the passenger.', 6);
  window.addEventListener('resize', () => {
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
    G.renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return true;
}

function collideCircle(x, z, r) {
  for (const c of G.world.colliders) {
    const dx = x - c.x, dz = z - c.z;
    if (Math.abs(dx) < c.hw + r && Math.abs(dz) < c.hd + r) {
      const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
      if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hw + r);
      else z = c.z + Math.sign(dz || 1) * (c.hd + r);
    }
  }
  return [x, z];
}

function nearestCar(maxD) {
  const p = G.player;
  let best = null, bestD = maxD;
  const consider = (car) => {
    if (car === p.car) return;
    if (!car.parked && Math.abs(car.speed || 0) > 3) return;
    const d = Math.hypot(car.x - p.x, car.z - p.z);
    if (d < bestD) { best = car; bestD = d; }
  };
  for (const c of G.cars) consider(c);
  for (const c of G.traffic) consider(c);
  return best;
}

function enterCar(car) {
  const p = G.player;
  if (!car) return;
  const ti = G.traffic.indexOf(car);
  if (ti >= 0) G.traffic.splice(ti, 1);
  if (!G.cars.includes(car)) G.cars.push(car);
  car.parked = false;
  p.inCar = true; p.onFoot = false; p.car = car; p.speed = 0;
  p.x = car.x; p.z = car.z; p.heading = car.heading;
  p.mesh.visible = false;
  G.audio.doorSlam();
  if (!car.stolen && car.id !== 'taxi') {
    car.stolen = true;
    p.wanted = clamp(p.wanted + 1, 0, 5);
    G.message('You stole the ' + car.def.name + '! Wanted level up.', 3);
    G.ensurePoliceSoon = true;
  } else {
    G.message('Driving the ' + car.def.name + '.', 2);
  }
}

function exitCar() {
  const p = G.player, car = p.car;
  if (!car) return;
  const rx = Math.cos(car.heading), rz = -Math.sin(car.heading);
  p.x = car.x + rx * 2.4; p.z = car.z + rz * 2.4;
  [p.x, p.z] = collideCircle(p.x, p.z, 0.5);
  p.inCar = false; p.onFoot = true; p.car = null; p.speed = 0;
  p.heading = car.heading;
  p.mesh.visible = true;
  p.mesh.position.set(p.x, 0, p.z);
  car.speed = 0;
  G.audio.doorSlam();
}

function stepPlayer(dt) {
  const p = G.player, inp = G.input;
  const auto = G.autopilot;
  if (p.inCar && p.car) {
    const car = p.car;
    let throttle = 0, steer = 0;
    if (auto) { throttle = auto.throttle; steer = auto.steer; }
    else {
      throttle = inp.axis('KeyS', 'KeyW') + inp.axis('ArrowDown', 'ArrowUp');
      steer = inp.axis('KeyA', 'KeyD') + inp.axis('ArrowLeft', 'ArrowRight');
      if (inp.down('Space')) { car.speed *= Math.max(0, 1 - dt * 4); throttle = 0; }
    }
    driveCar(car, clamp(throttle, -1, 1), clamp(steer, -1, 1), dt);
    if (Math.abs(car.steer) > 0.4 && Math.abs(car.speed) > 18) G.audio.skid();
    [car.x, car.z] = collideCircle(car.x, car.z, 1.4);
    car.x = clamp(car.x, -168, 168); car.z = clamp(car.z, -166, 176);
    car.mesh.position.set(car.x, 0, car.z);
    p.x = car.x; p.z = car.z; p.heading = car.heading; p.speed = car.speed;
    p.bestSpeed = Math.max(p.bestSpeed, Math.abs(car.speed));
    G.audio.setEngine(Math.abs(car.speed) / (car.def.max || 30), true);
    if (inp.hit('KeyH')) G.audio.horn();
    if (inp.hit('KeyE')) exitCar();
  } else {
    let mx = 0, mz = 0;
    if (!auto) {
      const f = inp.axis('KeyS', 'KeyW') + inp.axis('ArrowDown', 'ArrowUp');
      const s = inp.axis('KeyA', 'KeyD') + inp.axis('ArrowLeft', 'ArrowRight');
      const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
      const rx = Math.cos(G.camYaw), rz = -Math.sin(G.camYaw);
      mx = fx * f + rx * s; mz = fz * f + rz * s;
    } else { mx = Math.sin(p.heading); mz = Math.cos(p.heading); }
    const len = Math.hypot(mx, mz);
    const run = inp.down('ShiftLeft') || inp.down('ShiftRight');
    const spd = len > 0 ? (run ? 7 : 4.2) : 0;
    if (len > 0) {
      mx /= len; mz /= len;
      const target = Math.atan2(mx, mz);
      let dh = target - p.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      p.heading += clamp(dh, -8 * dt, 8 * dt);
      p.x += mx * spd * dt; p.z += mz * spd * dt;
      p.speed = spd;
    } else p.speed = 0;
    [p.x, p.z] = collideCircle(p.x, p.z, 0.5);
    p.x = clamp(p.x, -168, 168); p.z = clamp(p.z, -166, 176);
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    const swing = Math.sin(G.elapsed * (run ? 11 : 7)) * (p.speed > 0 ? 0.5 : 0);
    p.mesh.userData.armL.rotation.x = swing;
    p.mesh.userData.armR.rotation.x = -swing;
    p.mesh.position.y = p.speed > 0 ? Math.abs(Math.sin(G.elapsed * (run ? 11 : 7))) * 0.05 : 0;
    if (p.punchAnim > 0) p.mesh.userData.armR.rotation.x = -1.4;
    G.audio.setEngine(0, false);
    if (inp.hit('KeyE')) { const car = nearestCar(4.5); if (car) enterCar(car); }
    if (inp.hit('KeyF')) punch(G);
    if (inp.mouseClicked) shoot(G);
  }
}

function updateCamera(dt) {
  const p = G.player;
  const inp = G.input;
  if (inp.mouseDX !== 0) { G.camYaw += inp.mouseDX * 0.0032; G.camFree = 2.5; }
  if (G.camFree > 0) G.camFree -= dt;
  else {
    let dh = p.heading - G.camYaw;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    G.camYaw += dh * Math.min(1, dt * 2.2);
  }
  const dist = p.inCar ? 10.5 : 7;
  const height = p.inCar ? 4.2 : 3.0;
  const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw);
  const cx = p.x - fx * dist, cz = p.z - fz * dist;
  G.camera.position.set(cx, height, cz);
  G.camera.lookAt(p.x + fx * 6, 1.6, p.z + fz * 6);
}

function updateSky(dt) {
  // Slow day cycle in free play only (shot mode keeps its staged light).
  if (G.shot) return;
  G.dayT = (G.dayT + dt / 480) % 1;
  const t = G.dayT;
  const day = { bg: 0x87c5e8, fog: 0x9fd0e8, sun: 0xfff2d8, si: 1.6, hi: 0.85 };
  const dusk = { bg: 0xff9a52, fog: 0xe88a4a, sun: 0xffb36b, si: 1.1, hi: 0.55 };
  const night = { bg: 0x0d1526, fog: 0x101a2e, sun: 0x8fb2ff, si: 0.3, hi: 0.35 };
  let a, b, f;
  if (t < 0.45) { a = day; b = day; f = 0; }
  else if (t < 0.6) { a = day; b = dusk; f = (t - 0.45) / 0.15; }
  else if (t < 0.75) { a = dusk; b = night; f = (t - 0.6) / 0.15; }
  else if (t < 0.9) { a = night; b = night; f = 0; }
  else { a = night; b = day; f = (t - 0.9) / 0.1; }
  const mix = (ca, cb) => {
    const A = new THREE.Color(ca), B = new THREE.Color(cb);
    return A.lerp(B, f);
  };
  G.scene.background = mix(a.bg, b.bg);
  G.scene.fog.color.copy(mix(a.fog, b.fog));
  G.sun.color.copy(mix(a.sun, b.sun));
  G.sun.intensity = lerp(a.si, b.si, f);
  G.hemi.intensity = lerp(a.hi, b.hi, f);
}

function animateAmbient(dt) {
  const w = G.world;
  for (const cl of w.clouds) {
    cl.position.x += dt * 0.9;
    if (cl.position.x > 250) cl.position.x = -250;
  }
  w.buoys.forEach((b, i) => { b.position.y = 0.1 + Math.sin(G.elapsed * 1.3 + i * 1.7) * 0.16; });
  w.ships.forEach((s, i) => { s.rotation.z = Math.sin(G.elapsed * 0.5 + i) * 0.012; });
  if (w.neonGlow) w.neonGlow.material.opacity = 0.14 + Math.sin(G.elapsed * 3.1) * 0.07;
  if (w.lighthouseBeam) w.lighthouseBeam.rotation.y = G.elapsed * 0.5;
}

function step(dt) {
  if (!G.started || G.paused || G.frozen) { G.input.endFrame(); return; }
  G.elapsed += dt;
  const inp = G.input;
  if (inp.hit('KeyP') || inp.hit('Escape')) { G.togglePause(); inp.endFrame(); return; }
  if (inp.hit('KeyR')) { const name = G.radio.toggle(); G.message('Radio: ' + name, 2); }
  G.radio.update();
  updateSky(dt);
  animateAmbient(dt);
  stepPlayer(dt);
  stepTraffic(G.traffic, G.player.car, dt, G.elapsed);
  stepPedestrians(G.peds, G.player, dt, G.elapsed);
  G.policeTimer -= dt;
  if (G.ensurePoliceSoon || G.policeTimer <= 0) {
    ensurePoliceCount(G);
    G.policeTimer = 0.5; G.ensurePoliceSoon = false;
  }
  stepPolice(G.police, G.player, dt, G.elapsed);
  decayWanted(G, dt);
  stepMissions(G, dt);
  stepCombat(G, dt);
  // save every 10s when dirty
  G.saveTimer += dt;
  if (G.saveSoon && G.saveTimer > 10) { storeSave(G); G.saveSoon = false; G.saveTimer = 0; }
  G.hudTimer -= dt;
  if (G.hudTimer <= 0) { updateHud(G); drawMinimap(G); G.hudTimer = 0.12; }
  if (!G.frozen) updateCamera(dt);
  inp.endFrame();
}

G.startGame = () => {
  G.audio.ensure();
  G.radio.start();
  hideStart(G);
  G.started = true; G.paused = false;
  G.input.requestLock();
  G.message('Mission 1: First Fare — pick up the passenger on Harbor Ave.', 5);
  updateHud(G); drawMinimap(G);
};
G.togglePause = (force) => {
  const next = force !== undefined ? force : !G.paused;
  if (!G.started || G.frozen) return;
  G.paused = next;
  showPause(G, next);
  if (next) storeSave(G);
  if (document.pointerLockElement) document.exitPointerLock();
};
G.resetRun = (wipe) => {
  if (wipe) clearSave();
  location.reload();
};

function loop() {
  requestAnimationFrame(loop);
  if (!G.frozen) {
    const dt = Math.min(0.05, G.clock.getDelta());
    step(dt);
  }
  G.renderer.render(G.scene, G.camera);
}

function boot() {
  if (!init()) return;
  G.clock = new THREE.Clock();
  if (shotName && SHOT_NAMES.includes(shotName)) {
    hideStart(G);
    setupShot(G, shotName);
    const n = G.steps || 200;
    for (let i = 0; i < n; i++) step(1 / 60);
    finalizeShot(G, shotName);
    updateHud(G); drawMinimap(G);
    G.renderer.render(G.scene, G.camera);
    requestAnimationFrame(loop);
    return;
  }
  showStart(G);
  updateHud(G); drawMinimap(G);
  requestAnimationFrame(loop);
}
boot();
