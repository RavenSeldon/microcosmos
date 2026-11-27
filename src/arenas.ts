// An arena is data: who lives there, what the sky does, how much water there is. The rules in
// microcosmos.ts read it and nothing else. IDs belong to saves; array positions belong to a scene.
export type Sky = 'gathering' | 'dark' | 'return';
export type Archetype = 'shelter' | 'wetland' | 'forge' | 'reservoir' | 'prism' | 'shifter';
export interface Trait { id: string; text: string }   // shown only once play has revealed it
export interface WorldDef {
  id: string; name: string; short: string; theme: number; archetype: Archetype;
  need: number; heat: number;            // water used each moment; extra during the dark
  store: number; initial: number;        // clean water it can hold; what it starts with
  hold: number; initialUsed?: number;    // used water it can hold before it spills; optional starting backlog
  renew: Record<Sky, number>;            // used water it can make clean each moment, by sky
  mist: Record<Sky, number>;             // fresh water it gathers for the basin, by sky
  ports: number; reserve: number; keep: number; channel: number;
  voice: string; nature: string; ability: string; effect: string; traits: Trait[];
}
export interface ArenaDef {
  id: string; version: number; name: string; subtitle: string; worlds: WorldDef[];
  length: number; dark: [number, number];             // the journey; the moments without rain
  nightfall: number;                                  // dormant world-moments the orbit can bear before the long night
  rain: Record<Sky, number>;
  // The basin community: its shared clean water, what it keeps back, what it uses, and the reed beds
  // where it can take in a tended world's used water (`hold`) and renew it slowly (`renew`).
  basin: { initial: number; capacity: number; reserve: number; need: number; hold: number; renew: Record<Sky, number> };
}
const flat = (n: number): Record<Sky, number> => ({ gathering: n, dark: n, return: n });
export const FIRST_ARENA: ArenaDef = {
  id: 'first-orbit', version: 2, name: 'The First Orbit', subtitle: 'Six worlds · one basin · one passage through the dark',
  length: 18, dark: [7, 12], nightfall: 6, rain: { gathering: 1, dark: 0, return: 3 },
  basin: { initial: 10, capacity: 30, reserve: 3, need: 1, hold: 6, renew: { gathering: 1, dark: 1, return: 2 } },
  worlds: [
    { id: 'obsidian', name: 'Obsidian Dusk', short: 'Obsidian', theme: 0, archetype: 'shelter',
      need: 2, heat: 0, store: 9, initial: 5, hold: 8, renew: flat(1), mist: flat(0), ports: 2, reserve: 3, keep: 3, channel: 3,
      voice: '“A boundary can be a kindness. Tell me what we are protecting.”',
      nature: 'Guarded and exact. It keeps more than it needs, and opens slowly.',
      ability: 'Raise a shelter', effect: 'For three moments nothing can be taken from Obsidian or from any world it shares a current with, and each of those neighbours uses one less water. Sealing costs Obsidian one stored water.',
      traits: [
        { id: 'obsidian.trust', text: 'Opens a current only while it holds a reserve, or with a world it has already exchanged water with.' },
        { id: 'obsidian.vault', text: 'Its shelter covers its neighbours too: they use less while it holds, and nothing can be taken from them.' },
        { id: 'obsidian.slow', text: 'Renews little of its own water. Left alone, what it has used piles up.' },
      ] },
    { id: 'verdance', name: 'Verdance', short: 'Verdance', theme: 1, archetype: 'wetland',
      need: 2, heat: 0, store: 7, initial: 3, hold: 8, renew: { gathering: 5, dark: 1, return: 5 }, mist: flat(0), ports: 2, reserve: 1, keep: 1, channel: 3,
      voice: '“Send it back. I can make something living of it.”',
      nature: 'Abundant under an open sky. Generous, until it is asked for too much at once.',
      ability: 'Let the wetlands bloom', effect: 'For three moments Verdance renews twice what the sky allows it, and drinks one more.',
      traits: [
        { id: 'verdance.sky', text: 'Under rain and gentle skies its wetlands renew far more than Verdance uses. Neighbours can send their used water here.' },
        { id: 'verdance.dark', text: 'In the dark the wetlands slow to a trickle. Verdance then needs help itself.' },
        { id: 'verdance.backlog', text: 'Declines a new current while more than half its holding is full.' },
      ] },
    { id: 'ember', name: 'Ember Glass', short: 'Ember', theme: 2, archetype: 'forge',
      need: 2, heat: 1, store: 8, initial: 4, hold: 8, renew: { gathering: 1, dark: 4, return: 1 }, mist: flat(0), ports: 2, reserve: 0, keep: 1, channel: 3,
      voice: '“I have more in me. Give me something worth burning for.”',
      nature: 'Restless. Gives away whatever it is not using this very moment.',
      ability: 'Stoke the forge', effect: 'For three moments Ember renews twice what the sky allows it, and drinks one more.',
      traits: [
        { id: 'ember.heat', text: 'The dark is its season: the forge renews far more, and Ember drinks more.' },
        { id: 'ember.cold', text: 'Outside the dark its forge barely turns. What it has used piles up.' },
        { id: 'ember.open', text: 'Keeps no reserve from a neighbour. It shares down to its own need.' },
      ] },
    { id: 'sanctum', name: 'Still Sanctum', short: 'Sanctum', theme: 3, archetype: 'reservoir',
      need: 1, heat: 0, store: 12, initial: 9, hold: 10, renew: flat(1), mist: flat(0), ports: 2, reserve: 4, keep: 5, channel: 3,
      voice: '“I kept this for a difficult day. Perhaps this is that day.”',
      nature: 'Patient. It needs little and holds a great deal, which others notice.',
      ability: 'Open the stores', effect: 'For three moments Sanctum returns up to three stored water a moment to the basin, keeping only what it needs.',
      traits: [
        { id: 'sanctum.cistern', text: 'A neighbour whose holding is nearly full can rest its used water in Sanctum’s cisterns until someone can renew it.' },
        { id: 'sanctum.coveted', text: 'When a world goes thirsty with no current to Sanctum, Sanctum’s stores are what it reaches for.' },
        { id: 'sanctum.reserve', text: 'Shares with a neighbour only what lies above a deep reserve.' },
      ] },
    { id: 'prism', name: 'Prism Reach', short: 'Prism', theme: 4, archetype: 'prism',
      need: 2, heat: 0, store: 7, initial: 3, hold: 8, renew: flat(1), mist: flat(0), ports: 2, reserve: 1, keep: 1, channel: 5,
      voice: '“There is usually another way through.”',
      nature: 'Outward-looking. Better at reaching others than at tending itself.',
      ability: 'Open a bypass', effect: 'For three moments a current runs between Prism and a world you choose, beyond anyone’s usual limit.',
      traits: [
        { id: 'prism.wide', text: 'Its currents are wider: they carry five used water a moment where others carry three.' },
        { id: 'prism.bypass', text: 'A bypass needs no free port at either end, and leaves no commitment behind.' },
        { id: 'prism.slow', text: 'Renews little of its own water. Left alone, what it has used piles up.' },
      ] },
    { id: 'unobserved', name: 'The Unobserved', short: 'Unobserved', theme: 5, archetype: 'shifter',
      need: 2, heat: 0, store: 8, initial: 4, hold: 8, renew: { gathering: 1, dark: 3, return: 1 }, mist: { gathering: 1, dark: 0, return: 1 }, ports: 1, reserve: 1, keep: 1, channel: 3,
      voice: '“You can know me without making me stay the same.”',
      nature: 'Private and changeable. It keeps one current at most.',
      ability: 'Change its rhythm', effect: 'For three moments The Unobserved lives as it does under the other sky: gathering mist where it would renew, or renewing where it would gather mist.',
      traits: [
        { id: 'unobserved.mist', text: 'Under open skies it gathers mist: fresh water for the basin, whether or not anyone is connected to it.' },
        { id: 'unobserved.dark', text: 'In the dark there is no mist. It turns inward and renews more than it uses.' },
        { id: 'unobserved.one', text: 'Keeps a single current. Choosing its one neighbour is choosing for the whole journey, unless that current rests.' },
      ] },
  ],
};
export const LONG_DARK: ArenaDef = {
  ...FIRST_ARENA,
  id: 'long-dark', version: 1, name: 'The Long Dark',
  subtitle: 'Eight moments without rain · Ember and The Unobserved carry the orbit',
  dark: [6, 13], rain: { gathering: 2, dark: 0, return: 3 },
  basin: { ...FIRST_ARENA.basin, initial: 12 },
};

export const DRY_RETURN: ArenaDef = {
  ...FIRST_ARENA,
  id: 'dry-return', version: 1, name: 'The Dry Return',
  subtitle: 'Rain barely returns after the dark · build a true closed loop',
  rain: { gathering: 2, dark: 0, return: 1 },
  basin: { ...FIRST_ARENA.basin, initial: 12 },
};

export const FRACTURED_ORBIT: ArenaDef = {
  ...FIRST_ARENA,
  id: 'fractured-orbit', version: 2, name: 'The Fractured Orbit',
  subtitle: 'Backlog is already rising at moment one · wire fast before the dark hits',
  // The starting backlog adds eleven water to the orbit. With the basin at 12 that made neglect
  // safer here than anywhere (passive play reached a fragile peace). At 9, neglect brings the
  // long night at moment 12, as the subtitle promises, and attentive play still reaches dawn.
  basin: { ...FIRST_ARENA.basin, initial: 9 },
  worlds: FIRST_ARENA.worlds.map(w =>
    w.id === 'ember' ? { ...w, initialUsed: 4 }
      : w.id === 'obsidian' ? { ...w, initialUsed: 4 }
        : w.id === 'prism' ? { ...w, initialUsed: 3 }
          : w),
};

export const ARENAS: readonly ArenaDef[] = [FIRST_ARENA, LONG_DARK, DRY_RETURN, FRACTURED_ORBIT];
export const arenaById = (id: string): ArenaDef => ARENAS.find(a => a.id === id) ?? FIRST_ARENA;
export const ARCHETYPES: readonly Archetype[] = ['shelter', 'wetland', 'forge', 'reservoir', 'prism', 'shifter'];

export function assertArena(a: ArenaDef) {
  const n = a.worlds.length, int = (v: number, min = 0) => Number.isSafeInteger(v) && v >= min;
  if (!a.id || !int(a.version, 1) || n < 3 || n > 16 || new Set(a.worlds.map(w => w.id)).size !== n) throw new Error('Invalid arena roster');
  if (!int(a.nightfall, 1) || !int(a.length, 6) || !int(a.dark[0], 2) || a.dark[1] < a.dark[0] || a.dark[1] >= a.length) throw new Error('Invalid arena sky');
  if (Object.values(a.rain).some(v => !int(v)) || [a.basin.initial, a.basin.capacity, a.basin.reserve, a.basin.need, a.basin.hold, ...Object.values(a.basin.renew)].some(v => !int(v)) || a.basin.initial > a.basin.capacity || a.basin.reserve >= a.basin.capacity) throw new Error('Invalid arena water');
  for (const w of a.worlds) {
    const skies = [...Object.values(w.renew), ...Object.values(w.mist)];
    if (!w.id || !int(w.theme) || !int(w.need, 1) || !int(w.heat) || !int(w.store, w.need + w.heat) || !int(w.initial) || w.initial > w.store || !int(w.hold, 3)
      || (w.initialUsed !== undefined && (!int(w.initialUsed) || w.initialUsed > w.hold))
      || skies.some(v => !int(v)) || !int(w.ports, 1) || w.ports >= n || !int(w.reserve) || !int(w.keep, 1) || !int(w.channel, 1) || !ARCHETYPES.includes(w.archetype)) throw new Error(`Invalid world: ${w.id}`);
  }
}
