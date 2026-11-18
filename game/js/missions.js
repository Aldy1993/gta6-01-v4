// Port Solano — story missions (3 chained) + the Solano Packages side gig.
import * as THREE from 'three';
import { MISSIONS, PACKAGE_SPOTS, PACKAGE_REWARD, STORY, fmtMoney } from './config.js';

export function makeBeacon(scene, color) {
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(
    new THREE.CylinderGeometry(1.7, 1.7, 14, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: color || 0xffd23e, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
  );
  cyl.position.y = 7; g.add(cyl);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.15, 8, 32),
    new THREE.MeshBasicMaterial({ color: color || 0xffd23e }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.25; g.add(ring);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshBasicMaterial({ color: color || 0xffd23e }));
  core.position.y = 1.2; g.add(core);
  g.userData.ring = ring; g.userData.core = core;
  g.visible = false;
  scene.add(g);
  return g;
}

export function initMissions(G, save) {
  G.missionIndex = Math.min(save.mission || 0, MISSIONS.length);
  G.missionStage = save.stage || 0;
  G.missionDone = G.missionIndex >= MISSIONS.length;
  G.beacon = makeBeacon(G.scene, 0xffd23e);
  G.passenger = null; // ped riding along in mission 1
  G.packageCarried = false;
  G.packages = PACKAGE_SPOTS.map(([x, z], i) => ({
    id: i, x, z, taken: (save.packages || []).includes(i), mesh: null,
  }));
  for (const p of G.packages) {
    if (p.taken) continue;
    const m = new THREE.Group();
    const boxM = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshLambertMaterial({ color: 0xc98a2e }));
    boxM.position.y = 0.6; m.add(boxM);
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.2),
      new THREE.MeshBasicMaterial({ color: 0x5a3a10 }));
    tape.position.y = 0.6; m.add(tape);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.25 }));
    glow.position.y = 0.6; m.add(glow);
    m.position.set(p.x, 0, p.z);
    G.scene.add(m);
    p.mesh = m;
  }
  updateBeacon(G);
}

export function currentMission(G) {
  if (G.missionDone || G.missionIndex >= MISSIONS.length) return null;
  return MISSIONS[G.missionIndex];
}
export function currentStage(G) {
  const m = currentMission(G);
  return m ? m.stages[G.missionStage] : null;
}
export function missionTarget(G) {
  const s = currentStage(G);
  return s ? { x: s.pos[0], z: s.pos[2], label: s.label, action: s.action, radius: s.radius } : null;
}
export function updateBeacon(G) {
  const t = missionTarget(G);
  if (!t) { G.beacon.visible = false; return; }
  G.beacon.visible = true;
  G.beacon.position.set(t.x, 0, t.z);
}

export function missionText(G) {
  const m = currentMission(G);
  if (!m) return 'All missions complete — free roam, Rico. Packages still pay $25.';
  const s = m.stages[G.missionStage];
  return 'Mission ' + m.id + ' — ' + m.title + ': ' + s.label;
}
export function missionDistance(G) {
  const t = missionTarget(G);
  if (!t) return 0;
  return Math.round(Math.hypot(t.x - G.player.x, t.z - G.player.z));
}

// Called every step: beacon arrival, package pickup, stage completion.
export function stepMissions(G, dt) {
  const t = missionTarget(G);
  if (t) {
    const d = Math.hypot(t.x - G.player.x, t.z - G.player.z);
    G.missionDist = Math.round(d);
    const inComet = !!(G.player.car && G.player.car.id === 'comet');
    const gated = (t.action === 'steal' || t.action === 'deliver') && !inComet;
    if (!gated && d < t.radius) completeStage(G, t);
  }
  // side gig packages
  for (const p of G.packages) {
    if (p.taken || !p.mesh) continue;
    const d = Math.hypot(p.x - G.player.x, p.z - G.player.z);
    if (d < 2.6) {
      p.taken = true;
      G.scene.remove(p.mesh); p.mesh = null;
      G.player.money += PACKAGE_REWARD;
      G.audio.pickup();
      const n = G.packages.filter((q) => q.taken).length;
      G.message('Package collected! +' + fmtMoney(PACKAGE_REWARD) + '  (PKG ' + n + '/8)', 3);
      G.saveSoon = true;
    } else {
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.position.y = Math.sin(G.elapsed * 2 + p.id) * 0.15;
    }
  }
  // beacon pulse
  if (G.beacon.visible) {
    const s = 1 + Math.sin(G.elapsed * 4) * 0.12;
    G.beacon.userData.ring.scale.set(s, s, 1);
    G.beacon.userData.core.position.y = 1.2 + Math.sin(G.elapsed * 3) * 0.35;
  }
}

function completeStage(G, t) {
  const m = currentMission(G);
  if (!m) return;
  if (t.action === 'pickup' && G.missionIndex === 0 && G.missionStage === 0) {
    G.message('Passenger aboard. Drive them to the Night Market.', 3.5);
    G.audio.pickup();
    if (G.passengerPed) { G.scene.remove(G.passengerPed); G.passengerPed = null; }
  } else if (t.action === 'steal') {
    G.message('That Comet GT is yours now — get it to the lockup!', 3.5);
    G.audio.pickup();
  } else if (t.action === 'pickup') {
    G.packageCarried = true;
    G.message('Package secured. Run it to Pier 9!', 3.5);
    G.audio.pickup();
  }
  G.missionStage += 1;
  if (G.missionStage >= m.stages.length) {
    G.player.money += m.reward;
    G.audio.cash();
    G.message('Mission complete: ' + m.title + '  +' + fmtMoney(m.reward), 5);
    G.missionIndex += 1; G.missionStage = 0;
    if (G.missionIndex >= MISSIONS.length) {
      G.missionDone = true;
      G.message('All missions complete! Port Solano is yours, Rico.', 6);
    } else {
      const next = MISSIONS[G.missionIndex];
      G.message('New mission: ' + next.title + ' — ' + next.intro, 6);
      if (STORY.briefings[G.missionIndex]) {
        G.message(STORY.briefings[G.missionIndex], 7);
      }
    }
    if (G.missionIndex >= MISSIONS.length) {
      G.message(STORY.outro, 7);
    }
    G.saveSoon = true;
  }
  updateBeacon(G);
}

export function packagesTaken(G) { return G.packages.filter((p) => p.taken).length; }
