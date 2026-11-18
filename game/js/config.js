// Port Solano — shared configuration and data.
// Original city, characters, vehicles and story. No borrowed assets.
export const SAVE_KEY = 'portsolano-save-v1';
export const WORLD = {
  half: 170,            // playable half-extent on x and z (city core)
  roadHalf: 6,          // half width of a road
  roads: [-120, -60, 0, 60, 120], // avenue x positions and street z positions
  pierZ: 150,           // deck starts here (south edge)
  seaZ: 178,            // water starts here
  pierX: 60,            // Pier 9 centre x
};
export const PALETTE = {
  skyDay: 0x87c5e8, skySunset: 0xff9a52, fogDay: 0x9fd0e8,
  asphalt: 0x2e3138, sidewalk: 0x9a938a, curb: 0x6f6a62,
  sand: 0xd8c49a, deck: 0x8a6a44, sea: 0x1d6f8f, seaDeep: 0x155a75,
  grass: 0x5da24a,
};
export const BUILDING_COLORS = [
  0xe86a6a, 0xf2a541, 0x4fa8e0, 0x7bc47f, 0xd97fb8, 0x8f7fd9,
  0xe8e0c8, 0x5ec8c0, 0xf07f4f, 0x9ab85e, 0xc9a0dc, 0x6fb7ff,
];
export const SHOP_NAMES = [
  'TACO SOL', 'PIER CAFE', 'NEON NAILS', 'SOLANO MART', 'BURGER BAY',
  'LAUNDRY 24', 'SURF SHOP', 'DONUT DOCK', 'PIZZA PORT', 'FLOWER CO',
  'TATTOO INK', 'VINYL VICE', 'JUICE JOINT', 'BIKE BARN', 'GOLD PAWN',
];
export const CAR_DEFS = [
  { name: 'Solano Taxi', body: 0xf2c230, taxi: true, top: 2.6, len: 4.4, max: 34 },
  { name: 'Civic Runabout', body: 0x4fa8e0, top: 2.4, len: 4.0, max: 30 },
  { name: 'Bay Cruiser', body: 0x8a4fd9, top: 2.8, len: 4.8, max: 28 },
  { name: 'Comet GT', body: 0xe03a3a, top: 2.2, len: 4.3, max: 46, sport: true },
  { name: 'Dock Hauler', body: 0x5e7a4a, top: 3.0, len: 5.2, max: 24 },
  { name: 'Sunset Coupe', body: 0xf07f4f, top: 2.3, len: 4.2, max: 38, sport: true },
  { name: 'Harbor Van', body: 0xd8d3c0, top: 3.2, len: 5.0, max: 26 },
  { name: 'Night Falcon', body: 0x1c2733, top: 2.2, len: 4.4, max: 44, sport: true },
];
export const PED_SHIRTS = [0xe84a4a, 0x3a7bd5, 0x3ad57a, 0xf2c230, 0x9a5fd0, 0xffffff, 0x222222, 0xff8ac2];
export const PED_SKINS = [0xf2c89b, 0xc98d5f, 0x8a5a33, 0xffd9b0, 0x6e4423];
export const PED_HAIRS = [0x1a1a1a, 0x5a3a1a, 0xd8b25e, 0x8a8a8a, 0x3a2a1a];
// Missions: chained story. Each stage is a beacon to reach.
export const MISSIONS = [
  {
    id: 1, title: 'First Fare', reward: 150,
    intro: 'Rico Vega needs cash. Pick up the fare waiting on Harbor Ave, then drop them at the Night Market.',
    stages: [
      { label: 'Pick up the passenger on Harbor Ave', pos: [30, 0, -58], action: 'pickup', radius: 4 },
      { label: 'Drop the passenger at the Night Market', pos: [-58, 0, 58], action: 'dropoff', radius: 4 },
    ],
  },
  {
    id: 2, title: 'Hot Wheels', reward: 300,
    intro: 'A buyer wants a Comet GT, no questions asked. Steal the red Comet GT parked by the marina and bring it to the lockup.',
    stages: [
      { label: 'Steal the red Comet GT by the marina', pos: [118, 0, 118], action: 'steal', radius: 5 },
      { label: 'Deliver the Comet GT to the lockup', pos: [-118, 0, -118], action: 'deliver', radius: 5 },
    ],
  },
  {
    id: 3, title: 'The Drop', reward: 500,
    intro: 'One last job. Grab the package from the warehouse yard and run it to Pier 9 before the boat leaves.',
    stages: [
      { label: 'Collect the package at the warehouse yard', pos: [-118, 0, 118], action: 'pickup', radius: 4 },
      { label: 'Deliver the package to Pier 9', pos: [60, 0, 166], action: 'dropoff', radius: 5 },
    ],
  },
];
export const PACKAGE_SPOTS = [
  [-114, -114], [114, -114], [-114, 114], [114, 114],
  [0, -114], [-114, 0], [114, 0], [0, 114],
];
export const PACKAGE_REWARD = 25;
export const WANTED_MAX = 5;
// Story bible: who Rico Vega is, what each mission means, district names.
// Pure data — the missions module reads the briefing lines for its banners.
export const STORY = {
  hero: 'Rico Vega, 27 — ex-taxi driver, broke after the cab company folded. Fast hands, faster mouth, still owes rent on a room above the Night Market.',
  fixer: 'Mara Solano runs the docks and the Night Market stalls. She finds Rico the jobs nobody else wants.',
  districts: [
    'Downtown — glass towers and neon over Harbor Ave',
    'The Night Market — stalls, food smoke and late deals',
    'Marina Row — yachts, red Comet GTs and bad ideas',
    'Pier 9 — containers, cranes and the last boat out',
    'Sunset Beach — umbrellas, joggers and the long way home',
  ],
  briefings: [
    'Mara: "One fare, Rico. Pick up the passenger on Harbor Ave and drop them at the Night Market. Drive like you mean it."',
    'Mara: "A buyer wants a red Comet GT, no questions asked. It is parked by the marina. Bring it to the lockup on the north side."',
    'Mara: "Last job. Grab the package from the warehouse yard and run it to Pier 9 before the boat leaves. Do not open it."',
  ],
  outro: 'All three jobs done. Mara pays in full, and Port Solano finally feels like Rico\u2019s city. Free roam — packages still pay $25 a pop.',
};
// Deterministic RNG (mulberry32) so the city is identical every load.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
export function fmtMoney(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
