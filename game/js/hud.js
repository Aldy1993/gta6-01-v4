// Port Solano — HUD: money, mission, wanted stars, speed, packages, messages.
import { fmtMoney } from './config.js';
import { missionText, missionDistance, packagesTaken, currentMission } from './missions.js';

export function buildHud(G) {
  const hud = {};
  const ids = ['money', 'mission', 'mission-dist', 'wanted', 'speed', 'speed-unit',
    'packages', 'message', 'objective', 'ammo', 'clock', 'hint', 'station'];
  for (const id of ids) hud[id] = document.getElementById(id);
  hud.stars = [];
  const starRow = document.getElementById('wanted');
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('span');
    s.className = 'star'; s.textContent = '★';
    starRow.appendChild(s); hud.stars.push(s);
  }
  return hud;
}

export function updateHud(G) {
  const h = G.hud, p = G.player;
  if (!h.money) return;
  h.money.textContent = fmtMoney(p.money);
  const m = currentMission(G);
  h.mission.textContent = missionText(G);
  h['mission-dist'].textContent = m ? missionDistance(G) + ' m' : '—';
  for (let i = 0; i < 5; i++) h.stars[i].classList.toggle('lit', i < p.wanted);
  const kmh = Math.round(Math.abs(p.speed || 0) * 3.6);
  h.speed.textContent = p.inCar ? kmh : '0';
  h['speed-unit'].textContent = p.inCar ? 'km/h' : (p.onFoot ? 'on foot' : 'km/h');
  h.packages.textContent = 'PKG ' + packagesTaken(G) + '/8';
  h.station.textContent = G.radio ? G.radio.currentName() + '  (R to change)' : 'RADIO OFF';
  h.ammo.textContent = p.inCar ? '—' : ('Ammo ' + p.ammo + '  •  F punch  •  Click shoot');
  const mins = Math.floor(G.elapsed / 60), secs = Math.floor(G.elapsed % 60);
  h.clock.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  if (G.messageText && G.messageUntil > G.elapsed) {
    h.message.textContent = G.messageText;
    h.message.style.opacity = '1';
  } else h.message.style.opacity = '0';
  h.objective.textContent = m ? ('Reward ' + fmtMoney(m.reward)) : 'Free roam';
  h.hint.textContent = p.inCar
    ? 'W/S drive  •  A/D steer  •  E exit car  •  H horn  •  Space brake'
    : 'WASD move  •  Shift run  •  E enter car  •  F punch  •  Click shoot  •  P pause';
}

export function showStart(G) {
  document.getElementById('start-screen').classList.remove('hidden');
  document.getElementById('pause-screen').classList.add('hidden');
}
export function hideStart(G) {
  document.getElementById('start-screen').classList.add('hidden');
}
export function showPause(G, on) {
  document.getElementById('pause-screen').classList.toggle('hidden', !on);
  document.getElementById('pause-stats').textContent =
    'Cash ' + fmtMoney(G.player.money) + '   •   Missions done ' + G.missionIndex + '/3' +
    '   •   Packages ' + packagesTaken(G) + '/8   •   Wanted ' + G.player.wanted + '★';
}
export function bindButtons(G) {
  const startBtn = document.getElementById('start-btn');
  startBtn.addEventListener('click', () => { G.audio.ensure(); G.audio.click(); G.startGame(); });
  document.getElementById('resume-btn').addEventListener('click', () => { G.audio.click(); G.togglePause(false); });
  document.getElementById('restart-btn').addEventListener('click', () => {
    G.audio.click(); G.resetRun(true);
  });
  document.getElementById('newgame-btn').addEventListener('click', () => {
    G.audio.click(); G.resetRun(false);
  });
  document.getElementById('mute-btn').addEventListener('click', (e) => {
    G.audio.enabled = !G.audio.enabled;
    e.target.textContent = G.audio.enabled ? 'Sound: ON' : 'Sound: OFF';
  });
}
