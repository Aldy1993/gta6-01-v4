// Port Solano — save / load progress to localStorage.
import { SAVE_KEY } from './config.js';
export function defaultSave() {
  return { money: 40, mission: 0, stage: 0, packages: [], wanted: 0, bestSpeed: 0, played: 0 };
}
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    const d = defaultSave();
    return {
      money: typeof s.money === 'number' ? s.money : d.money,
      mission: typeof s.mission === 'number' ? s.mission : 0,
      stage: typeof s.stage === 'number' ? s.stage : 0,
      packages: Array.isArray(s.packages) ? s.packages.filter((n) => Number.isInteger(n)) : [],
      wanted: 0, bestSpeed: typeof s.bestSpeed === 'number' ? s.bestSpeed : 0,
      played: typeof s.played === 'number' ? s.played : 0,
    };
  } catch (e) { return defaultSave(); }
}
export function storeSave(G) {
  try {
    const s = {
      money: Math.round(G.player.money), mission: G.missionIndex, stage: G.missionStage,
      packages: G.packages.filter((p) => p.taken).map((p) => p.id),
      bestSpeed: Math.round(G.player.bestSpeed || 0), played: Math.round(G.elapsed || 0),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch (e) {}
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
