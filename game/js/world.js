// Port Solano — the city: roads, sidewalks, buildings, shops, harbor, sea.
// All geometry is procedural boxes/planes/cylinders built from a seeded RNG.
import * as THREE from 'three';
import { WORLD, PALETTE, BUILDING_COLORS, SHOP_NAMES, rng, clamp } from './config.js';

function mat(color, opts) {
  return new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {}));
}
function box(w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  return m;
}
function litWindows(group, w, h, d, x, y, z, seed) {
  // One canvas texture per face: a grid of windows, some lit, some dark.
  // Far cheaper than one mesh per window.
  const r = rng(seed);
  const cols = Math.max(2, Math.floor(w / 6));
  const rows = Math.max(3, Math.floor(h / 5));
  const c = document.createElement('canvas');
  c.width = cols * 24; c.height = rows * 32;
  const g = c.getContext('2d');
  g.fillStyle = '#20242e'; g.fillRect(0, 0, c.width, c.height);
  for (let cx = 0; cx < cols; cx++) {
    for (let ry = 0; ry < rows; ry++) {
      g.fillStyle = r() > 0.45 ? '#ffe9a8' : '#2a3550';
      g.fillRect(cx * 24 + 5, ry * 32 + 6, 14, 20);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(w * 0.92, h * 0.92);
  const m = new THREE.MeshBasicMaterial({ map: tex });
  const front = new THREE.Mesh(geo, m);
  front.position.set(x, y, z + d / 2 + 0.06);
  group.add(front);
  const back = new THREE.Mesh(geo, m);
  back.position.set(x, y, z - d / 2 - 0.06);
  back.rotation.y = Math.PI;
  group.add(back);
  // side faces too, so corner views are never blank walls
  const sideGeo = new THREE.PlaneGeometry(d * 0.92, h * 0.92);
  const left = new THREE.Mesh(sideGeo, m);
  left.position.set(x - w / 2 - 0.06, y, z);
  left.rotation.y = -Math.PI / 2;
  group.add(left);
  const right = new THREE.Mesh(sideGeo, m);
  right.position.set(x + w / 2 + 0.06, y, z);
  right.rotation.y = Math.PI / 2;
  group.add(right);
}

export function buildWorld(scene) {
  const W = { colliders: [], lamps: [], neon: null, ships: [], beaconSpots: [], clouds: [], buoys: [], neonGlow: null, lighthouseBeam: null };
  const R = rng(20261119);
  const half = WORLD.half;

  // --- ground base (grass; stops at the shoreline so the sea shows) ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 440), mat(PALETTE.grass));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.05, -40);
  scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(400, 26), mat(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.0, 185);
  scene.add(sand);

  // --- asphalt: avenues (along z) and streets (along x) ---
  for (const x of WORLD.roads) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(12, half * 2 + 20), mat(PALETTE.asphalt));
    road.rotation.x = -Math.PI / 2; road.position.set(x, 0.01, -10);
    scene.add(road);
  }
  for (const z of WORLD.roads) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(half * 2 + 20, 12), mat(PALETTE.asphalt));
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, z);
    scene.add(road);
  }
  // centre dashes
  const dashGeo = new THREE.PlaneGeometry(0.5, 3);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf2d95e });
  for (const x of WORLD.roads) {
    for (let z = -160; z <= 140; z += 8) {
      if (WORLD.roads.some((rz) => Math.abs(z - rz) < 9)) continue;
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.rotation.x = -Math.PI / 2; d.position.set(x, 0.03, z); scene.add(d);
    }
  }
  for (const z of WORLD.roads) {
    for (let x = -160; x <= 160; x += 8) {
      if (WORLD.roads.some((rx) => Math.abs(x - rx) < 9)) continue;
      const d = new THREE.Mesh(dashGeo, dashMat);
      d.rotation.x = -Math.PI / 2; d.rotation.z = Math.PI / 2; d.position.set(x, 0.03, z); scene.add(d);
    }
  }
  // --- sidewalks (raised strips beside every road) ---
  const walkMat = mat(PALETTE.sidewalk);
  for (const x of WORLD.roads) {
    for (const s of [-9.5, 9.5]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.18, half * 2 + 20), walkMat);
      w.position.set(x + s, 0.09, -10); scene.add(w);
    }
  }
  for (const z of WORLD.roads) {
    for (const s of [-9.5, 9.5]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 20, 0.18, 4.5), walkMat);
      w.position.set(0, 0.09, z + s); scene.add(w);
    }
  }
  // --- zebra crossings at every intersection ---
  const stripeGeo = new THREE.PlaneGeometry(1.6, 5.4);
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
  for (const x of WORLD.roads) {
    for (const z of WORLD.roads) {
      for (let i = -2; i <= 2; i++) {
        const s = new THREE.Mesh(stripeGeo, stripeMat);
        s.rotation.x = -Math.PI / 2; s.position.set(x + i * 2.4, 0.04, z - 8.4); scene.add(s);
        const s2 = new THREE.Mesh(stripeGeo, stripeMat);
        s2.rotation.x = -Math.PI / 2; s2.position.set(x + i * 2.4, 0.04, z + 8.4); scene.add(s2);
      }
    }
  }

  // --- buildings: one per block quadrant, colorful facades + lit windows ---
  const blockCentres = [];
  for (let i = 0; i < WORLD.roads.length - 1; i++) {
    for (let j = 0; j < WORLD.roads.length - 1; j++) {
      blockCentres.push([(WORLD.roads[i] + WORLD.roads[i + 1]) / 2, (WORLD.roads[j] + WORLD.roads[j + 1]) / 2]);
    }
  }
  let shopIdx = 0;
  for (const [bx, bz] of blockCentres) {
    if (bz > 132) continue; // harbor strip stays open
    const bw = 26 + R() * 10, bd = 26 + R() * 10;
    const bh = 10 + R() * R() * 42;
    const col = BUILDING_COLORS[Math.floor(R() * BUILDING_COLORS.length)];
    const b = box(bw, bh, bd, col, bx, bh / 2, bz);
    scene.add(b); W.colliders.push({ x: bx, z: bz, hw: bw / 2, hd: bd / 2 });
    // roof rim + rooftop box
    scene.add(box(bw + 0.8, 0.7, bd + 0.8, 0x3a3f4a, bx, bh + 0.35, bz));
    if (R() > 0.5) scene.add(box(6, 3, 6, 0x555c66, bx + bw / 5, bh + 2, bz - bd / 5));
    litWindows(scene, bw, bh, bd, bx, bh / 2, bz, Math.floor(R() * 1e9));
    // shopfront on the street-facing side for ground-floor blocks
    if (R() > 0.45) {
      const name = SHOP_NAMES[shopIdx++ % SHOP_NAMES.length];
      const awningCol = [0xe84a4a, 0x2a9d8f, 0xf2a541, 0x4fa8e0][Math.floor(R() * 4)];
      const front = bz < 0 ? 1 : -1;
      const awn = box(Math.min(16, bw - 4), 0.5, 4, awningCol, bx, 4.4, bz + front * (bd / 2 + 1.6));
      scene.add(awn);
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(15, bw - 5), 3.2),
        new THREE.MeshBasicMaterial({ color: 0xbfe8ff }));
      glass.position.set(bx, 2.2, bz + front * (bd / 2 + 0.08));
      if (front < 0) glass.rotation.y = Math.PI;
      scene.add(glass);
      const sign = makeTextBoard(name, awningCol);
      sign.position.set(bx, 5.6, bz + front * (bd / 2 + 0.3));
      if (front < 0) sign.rotation.y = Math.PI;
      scene.add(sign);
    }
  }

  // --- street lamps, hydrants, palms, road signs ---
  const lampPole = mat(0x2f333a);
  for (const x of WORLD.roads) {
    for (let z = -150; z <= 130; z += 40) {
      const px = x + 8.2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 6), lampPole);
      pole.position.set(px, 3.5, z); scene.add(pole);
      const arm = box(2.2, 0.15, 0.15, 0x2f333a, px - 1, 6.9, z); scene.add(arm);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      bulb.position.set(px - 2, 6.8, z); scene.add(bulb);
      W.lamps.push(bulb);
    }
  }
  for (let i = 0; i < 26; i++) {
    const hx = WORLD.roads[Math.floor(R() * 5)] + (R() > 0.5 ? 9 : -9);
    const hz = -150 + R() * 280;
    const hyd = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.9, 8), mat(0xd23a2e));
    body.position.y = 0.45; hyd.add(body);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), mat(0xd23a2e));
    cap.position.y = 0.95; hyd.add(cap);
    hyd.position.set(hx, 0, hz); scene.add(hyd);
  }
  for (let i = 0; i < 40; i++) {
    const px = WORLD.roads[Math.floor(R() * 5)] + (R() > 0.5 ? 11.5 : -11.5);
    const pz = -155 + R() * 290;
    if (pz > 132) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 6, 6), mat(0x8a6a44));
    trunk.position.y = 3; trunk.rotation.z = (R() - 0.5) * 0.2; palm.add(trunk);
    for (let f = 0; f < 6; f++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.4, 4), mat(0x2f9e4f));
      const a = (f / 6) * Math.PI * 2;
      leaf.position.set(Math.cos(a) * 1.2, 6.2, Math.sin(a) * 1.2);
      leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
      palm.add(leaf);
    }
    palm.position.set(px, 0, pz); scene.add(palm);
  }
  // road signs: STOP / one-way / Pier 9 arrow
  const signSpots = [[-60, -60, 'STOP'], [60, 0, 'PIER 9 →'], [0, 60, 'ONE WAY'], [-120, 120, 'HARBOR']];
  for (const [sx, sz, txt] of signSpots) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), mat(0x888888));
    pole.position.y = 1.3; g.add(pole);
    const board = makeTextBoard(txt, 0x1d4ed8, 0xffffff);
    board.position.y = 2.9; g.add(board);
    g.position.set(sx + 8.5, 0, sz + 8.5); scene.add(g);
  }

  // --- NIGHT MARKET neon board (downtown plaza) ---
  const neon = new THREE.Group();
  const neonBack = box(16, 4.4, 0.4, 0x14101f, 0, 0, 0);
  neon.add(neonBack);
  const neonText = makeTextBoard('NIGHT MARKET', 0xff2e88, 0xffffff, 3.2);
  neonText.position.z = 0.3; neon.add(neonText);
  const neonGlow = new THREE.Mesh(new THREE.PlaneGeometry(17, 5.4),
    new THREE.MeshBasicMaterial({ color: 0xff2e88, transparent: true, opacity: 0.18 }));
  neonGlow.position.z = -0.4; neon.add(neonGlow);
  neon.position.set(-58, 7.5, 44);
  scene.add(neon); W.neon = neon; W.neonGlow = neonGlow;
  // market stalls under it
  for (let i = 0; i < 4; i++) {
    const sx = -70 + i * 8;
    scene.add(box(5, 2.4, 3.4, [0xe84a4a, 0x2a9d8f, 0xf2a541, 0x7bc47f][i], sx, 1.2, 52));
    scene.add(box(5.6, 0.3, 4, 0xffffff, sx, 2.7, 52));
  }

  // --- harbor: wooden pier deck, bollards, lamps, containers, cranes ---
  const deck = new THREE.Mesh(new THREE.BoxGeometry(340, 0.5, 30), mat(PALETTE.deck));
  deck.position.set(0, 0.25, WORLD.pierZ + 14); scene.add(deck);
  // plank lines
  for (let x = -160; x <= 160; x += 8) {
    scene.add(box(0.3, 0.1, 28, 0x6e4f2a, x, 0.52, WORLD.pierZ + 14));
  }
  for (let x = -150; x <= 150; x += 30) {
    const bol = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 8), mat(0x222222));
    bol.position.set(x, 1.0, WORLD.pierZ + 27); scene.add(bol);
  }
  for (let x = -140; x <= 140; x += 40) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6, 6), mat(0x2f333a));
    pole.position.set(x, 3, WORLD.pierZ + 24); scene.add(pole);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    lamp.position.set(x, 6.1, WORLD.pierZ + 24); scene.add(lamp);
    W.lamps.push(lamp);
  }
  // Pier 9 sign arch
  const arch = new THREE.Group();
  arch.add(box(1, 7, 1, 0x2f333a, -4, 3.5, 0));
  arch.add(box(1, 7, 1, 0x2f333a, 4, 3.5, 0));
  const archBoard = makeTextBoard('PIER 9', 0x0e7490, 0xffffff, 2.4);
  archBoard.position.y = 7; arch.add(archBoard);
  arch.position.set(WORLD.pierX, 0.5, WORLD.pierZ + 22);
  scene.add(arch);
  // containers stacks
  const contCols = [0xd23a2e, 0x2a7fd2, 0x3a9d4f, 0xf2a541, 0x8a4fd9];
  const contSpots = [[-120, 158], [-100, 160], [110, 158], [130, 160], [-40, 162], [140, 150]];
  for (let i = 0; i < contSpots.length; i++) {
    const [cx, cz] = contSpots[i];
    const stack = 1 + (i % 2);
    for (let s = 0; s < stack; s++) {
      scene.add(box(10, 2.6, 3, contCols[(i + s) % contCols.length], cx, 1.8 + s * 2.7, cz));
    }
    W.colliders.push({ x: cx, z: cz, hw: 5.2, hd: 1.8 });
  }
  // cranes
  for (const cx of [-80, 100]) {
    const crane = new THREE.Group();
    crane.add(box(1.6, 26, 1.6, 0xf2a541, 0, 13, 0));
    crane.add(box(18, 1.4, 1.4, 0xf2a541, 6, 25, 0));
    crane.add(box(4, 3, 4, 0x333333, 0, 26.5, 0));
    crane.position.set(cx, 0.5, WORLD.pierZ + 8);
    scene.add(crane);
  }
  // --- sea + ships ---
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), mat(PALETTE.sea));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.4, WORLD.seaZ + 130);
  scene.add(sea);
  const sea2 = new THREE.Mesh(new THREE.PlaneGeometry(900, 60),
    new THREE.MeshBasicMaterial({ color: 0x2a8fb5, transparent: true, opacity: 0.5 }));
  sea2.rotation.x = -Math.PI / 2; sea2.position.set(0, -0.2, WORLD.seaZ + 12);
  scene.add(sea2);
  const shipDefs = [[-40, 215, 0.5], [90, 240, -0.3], [10, 275, 0.15]];
  for (const [sx, sz, rot] of shipDefs) {
    const ship = new THREE.Group();
    const hull = box(16, 5, 42, 0x223344, 0, 2, 0); ship.add(hull);
    ship.add(box(14, 2, 40, 0xd23a2e, 0, 5.2, 0));
    ship.add(box(8, 6, 10, 0xe8e0c8, 0, 8, -12));
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 5, 8), mat(0xf2a541));
    funnel.position.set(0, 9, -6); ship.add(funnel);
    ship.position.set(sx, -0.4, sz); ship.rotation.y = rot;
    scene.add(ship); W.ships.push(ship);
  }
  // moored boat near pier
  const boat = new THREE.Group();
  boat.add(box(4, 1.6, 10, 0xffffff, 0, 0.8, 0));
  boat.add(box(3, 1.4, 4, 0x2a7fd2, 0, 2, -2));
  boat.position.set(WORLD.pierX + 18, -0.2, WORLD.pierZ + 40);
  scene.add(boat); W.ships.push(boat);

  // --- beach: umbrellas + towels on the sand south of the pier ---
  const umbrellaCols = [0xe84a4a, 0x2a7fd2, 0xf2c230, 0x7bc47f, 0xd97fb8, 0xff8a3d];
  for (let i = 0; i < 6; i++) {
    const ux = -120 + i * 48 + (R() - 0.5) * 10;
    const uz = 192 + R() * 14;
    const umb = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6, 6), mat(0xe8e0c8));
    pole.position.y = 1.3; umb.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.0, 8), mat(umbrellaCols[i]));
    top.position.y = 2.8; umb.add(top);
    const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6),
      new THREE.MeshBasicMaterial({ color: umbrellaCols[(i + 2) % 6] }));
    towel.rotation.x = -Math.PI / 2; towel.rotation.z = R() * 1.2;
    towel.position.set(1.8, 0.06, 1.2); umb.add(towel);
    umb.position.set(ux, 0, uz);
    scene.add(umb);
  }
  // --- marina: dock fingers + moored boats + bobbing buoys ---
  for (const [dx, len] of [[-40, 26], [100, 20]]) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, len), mat(PALETTE.deck));
    finger.position.set(dx, 0.2, WORLD.pierZ + 30 + len / 2);
    scene.add(finger);
    const mb = new THREE.Group();
    mb.add(box(3.4, 1.4, 9, 0xffffff, 0, 0.7, 0));
    mb.add(box(2.6, 1.2, 3.4, [0xe84a4a, 0x2a7fd2][dx < 0 ? 0 : 1], 0, 1.8, -1.5));
    mb.position.set(dx + 5, -0.2, WORLD.pierZ + 34 + len / 2);
    scene.add(mb); W.ships.push(mb);
  }
  for (let i = 0; i < 10; i++) {
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 6), mat(0xff6a00));
    const bx = -150 + i * 32 + R() * 8, bz = WORLD.seaZ + 26 + R() * 40;
    buoy.position.set(bx, 0.1, bz);
    scene.add(buoy); W.buoys.push(buoy);
  }
  // --- drifting clouds ---
  for (let i = 0; i < 8; i++) {
    const cl = new THREE.Group();
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    for (let j = 0; j < 3; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(5 + R() * 5, 8, 6), cm);
      puff.position.set(j * 6 - 6, R() * 1.5, R() * 3);
      puff.scale.y = 0.45;
      cl.add(puff);
    }
    cl.position.set(-220 + R() * 440, 55 + R() * 25, -180 + R() * 320);
    scene.add(cl); W.clouds.push(cl);
  }
  // --- lighthouse at the west end of the pier ---
  const light = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.2, 3, 10), mat(0x8a8f96));
  base.position.y = 1.5; light.add(base);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.8, 16, 10), mat(0xf5f5f0));
  tower.position.y = 11; light.add(tower);
  const band1 = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.55, 2.2, 10), mat(0xd23a2e));
  band1.position.y = 7; light.add(band1);
  const band2 = band1.clone(); band2.position.y = 14.5; light.add(band2);
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 8),
    new THREE.MeshLambertMaterial({ color: 0x223344, transparent: true, opacity: 0.85 }));
  lampRoom.position.y = 20; light.add(lampRoom);
  const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(1.0, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lampBulb.position.y = 20; light.add(lampBulb);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(26, 1.1, 1.1),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.22, depthWrite: false }));
  beam.position.set(14, 20, 0);
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 0; beamPivot.add(beam);
  light.add(beamPivot);
  light.position.set(-152, 0.5, WORLD.pierZ + 12);
  scene.add(light);
  W.lighthouseBeam = beamPivot;
  W.colliders.push({ x: -152, z: WORLD.pierZ + 12, hw: 4.5, hd: 4.5 });
  return W;
}

// Canvas-texture sign board (no external images).
const boardCache = new Map();
export function makeTextBoard(text, bg, fg, scale) {
  const key = text + '|' + bg + '|' + fg;
  let tex = boardCache.get(key);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#' + bg.toString(16).padStart(6, '0'); g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#' + (fg === undefined ? 0xffffff : fg).toString(16).padStart(6, '0');
    g.font = 'bold 56px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 68);
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    boardCache.set(key, tex);
  }
  const s = scale || 1;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(7 * s, 1.75 * s),
    new THREE.MeshBasicMaterial({ map: tex, transparent: false }));
  return m;
}
export function isOnRoad(x, z) {
  const onAvenue = WORLD.roads.some((rx) => Math.abs(x - rx) < WORLD.roadHalf + 2);
  const onStreet = WORLD.roads.some((rz) => Math.abs(z - rz) < WORLD.roadHalf + 2);
  return onAvenue || onStreet;
}
export function clampToCity(x, z) {
  return [clamp(x, -WORLD.half, WORLD.half), clamp(z, -WORLD.half, WORLD.pierZ + 26)];
}
