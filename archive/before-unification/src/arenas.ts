// An arena is data, not a second engine. IDs belong to saves; array positions belong to a scene.
export type Archetype = 'shelter' | 'wetland' | 'forge' | 'reservoir' | 'prism' | 'shifter';
export interface PlanetDefinition {
  id: string; name: string; short: string; theme: number; archetype: Archetype;
  need: number; capacity: number; initial: number; reclaim: number; ports: number;
  reserve: number; gift: string; voice: string; ability: string; effect: string;
}
export interface ArenaDefinition {
  id: string; version: number; name: string; subtitle: string; worlds: PlanetDefinition[];
  seasonLength: number; dry: [number, number]; rain: [number, number]; heat: [number, number];
  rainfall: { gentle: number; dry: number; rain: number }; basin: { initial: number; capacity: number; reserve: number; need: number };
  encounter: { moment: number; from: string; to: string } | null;
}
export const FIRST_ARENA: ArenaDefinition = {
  id: 'first-orbit', version: 1, name: 'The First Orbit', subtitle: 'Six worlds · one shared existence',
  seasonLength: 18, dry: [9, 12], rain: [13, 16], heat: [7, 12],
  rainfall: { gentle: 1, dry: 0, rain: 5 }, basin: { initial: 14, capacity: 42, reserve: 3, need: 1 },
  encounter: { moment: 7, from: 'obsidian', to: 'ember' },
  worlds: [
    { id: 'obsidian', name: 'Obsidian Dusk', short: 'Obsidian', theme: 0, archetype: 'shelter', need: 2, capacity: 8, initial: 5, reclaim: 1, ports: 2, reserve: 2,
      gift: 'Protective, slow to trust. Shields its neighbours when you ask; keeps a generous reserve before sharing.',
      voice: '“A boundary can be a kindness. Tell me what we are protecting.”', ability: 'Raise a shelter', effect: 'Protect this world and its neighbours for three moments. Uses one of its stored water.' },
    { id: 'verdance', name: 'Verdance', short: 'Verdance', theme: 1, archetype: 'wetland', need: 2, capacity: 7, initial: 4, reclaim: 5, ports: 2, reserve: 1,
      gift: 'Abundant, with limits. Its wetlands can clean neighbours’ water, but a backlog makes it decline new currents.',
      voice: '“Send it back. I can make something living of it.”', ability: 'Let the wetlands bloom', effect: 'Clean three more water per moment for three moments. The growing wetlands also drink one more.' },
    { id: 'ember', name: 'Ember Glass', short: 'Ember', theme: 2, archetype: 'forge', need: 3, capacity: 9, initial: 6, reclaim: 2, ports: 2, reserve: 0,
      gift: 'Restless and generous with surplus. Its forge renews water; hot weather makes this world thirstier.',
      voice: '“I have more in me. Give me something worth burning for.”', ability: 'Stoke the forge', effect: 'Recover three more water per moment for three moments. Running hotter also needs one more water.' },
    { id: 'sanctum', name: 'Still Sanctum', short: 'Sanctum', theme: 3, archetype: 'reservoir', need: 1, capacity: 12, initial: 8, reclaim: 1, ports: 2, reserve: 3,
      gift: 'Patient, not inexhaustible. Holds a deeper reserve; can open it to everyone, even without an alliance.',
      voice: '“I kept this for a difficult day. Perhaps this is that day.”', ability: 'Open the stores', effect: 'Return up to three spare water to the basin each moment for three moments. Sanctum keeps only what it needs.' },
    { id: 'prism', name: 'Prism Reach', short: 'Prism', theme: 4, archetype: 'prism', need: 2, capacity: 7, initial: 4, reclaim: 1, ports: 2, reserve: 1,
      gift: 'Inventive and outward-looking. Its currents carry more water; a temporary bypass can reach beyond occupied ports.',
      voice: '“There is usually another way through.”', ability: 'Open a bypass', effect: 'Offer a temporary current to an unlinked world for three moments. It can exceed the usual port limit.' },
    { id: 'unobserved', name: 'The Unobserved', short: 'Unobserved', theme: 5, archetype: 'shifter', need: 2, capacity: 8, initial: 5, reclaim: 1, ports: 1, reserve: 1,
      gift: 'Private, changeable. Keeps one close connection. Collects mist under gentle skies; reclaims more water in the dry.',
      voice: '“You can know me without making me stay the same.”', ability: 'Change its rhythm', effect: 'For three moments, swap mist collection for stronger local recovery—or recovery for mist collection.' },
  ],
};
// Future arenas register here. Travel, simultaneous galaxies and cross-arena trade are not implied.
export const ARENAS: readonly ArenaDefinition[] = [FIRST_ARENA];

export function assertArena(a: ArenaDefinition) {
  const n = a.worlds.length;
  const integer = (v: number, min = 0) => Number.isSafeInteger(v) && v >= min;
  if (!a.id || !integer(a.version, 1) || n < 3 || n > 16 || new Set(a.worlds.map(w => w.id)).size !== n) throw new Error('Invalid arena roster');
  if (!integer(a.seasonLength, 4) || [a.dry, a.rain, a.heat].some(([lo, hi]) => !integer(lo, 1) || hi < lo || hi > a.seasonLength)) throw new Error('Invalid arena seasons');
  if (Object.values(a.rainfall).some(v => !integer(v)) || Object.values(a.basin).some(v => !integer(v)) || a.basin.initial > a.basin.capacity || a.basin.reserve > a.basin.capacity) throw new Error('Invalid arena water');
  for (const w of a.worlds) if (!w.id || !integer(w.theme) || w.theme > 5 || !integer(w.need, 1) || !integer(w.capacity, w.need) || !integer(w.initial) || w.initial > w.capacity || !integer(w.reclaim) || !integer(w.ports, 1) || w.ports >= n || !integer(w.reserve) || !['shelter', 'wetland', 'forge', 'reservoir', 'prism', 'shifter'].includes(w.archetype)) throw new Error('Invalid planet definition');
  if (a.encounter && (!integer(a.encounter.moment, 1) || a.encounter.moment > a.seasonLength || a.encounter.from === a.encounter.to || [a.encounter.from, a.encounter.to].some(id => !a.worlds.some(w => w.id === id)))) throw new Error('Invalid arena encounter');
}
