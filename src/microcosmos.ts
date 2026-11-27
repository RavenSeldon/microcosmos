// The Dark Microcosmos: the rules. One journey is `length` moments under three skies: gathering,
// the dark, the return. Nothing here is random and nothing is hidden from the forecast: the same
// function that resolves a moment is the one the page uses to look ahead.
//
// Water is either clean (in the basin or a world's store) or used (in a world's holding). A world
// uses clean water each moment; renewing turns used water back into clean. Water enters only as
// rain and mist, and leaves only as the basin community's own use, spills, and what a seizure or a
// shelter costs. Every moment records those so the books can be checked (see `Moment`).
import { FIRST_ARENA, assertArena } from './arenas.ts';
import type { ArenaDef, Sky } from './arenas.ts';

export type Place = number | 'basin';
export interface Transfer { from: Place; to: Place; amount: number; kind: 'clean' | 'used' }
export type Choice =
  | { type: 'rest' | 'mediate' }
  | { type: 'connect' | 'release'; edge: number }
  | { type: 'care'; world: number }
  | { type: 'ability'; world: number; target?: number };
export type EventKind = 'link' | 'unlink' | 'ability' | 'gift' | 'short' | 'dormant' | 'woke' | 'spill' | 'threat' | 'seized' | 'mediated' | 'sheltered' | 'settled' | 'answered' | 'parked' | 'served' | 'resonance';
export interface GameEvent { kind: EventKind; world: number; other?: number; amount?: number }
export interface Moment {
  sky: Sky; rain: number; mist: number; drunk: number; spilled: number; cost: number;   // in, in, out, out, out
  renewed: number; resonance: number; unmet: number[]; basinUnmet: number; transfers: Transfer[]; events: GameEvent[];
  learned: string[]; before: number; after: number;
}
export type Outcome = 'dawn' | 'peace' | 'night';
export type Condition = 'steady' | 'strained' | 'dormant';
export interface Game {
  arena: string; version: number; beat: number; basin: number; reeds: number; clean: number[]; used: number[];
  streak: number[]; dormant: boolean[]; active: number[]; links: boolean[]; memory: number[]; grudge: boolean[];
  bypass: { edge: number; until: number }[]; threat: { from: number; to: number } | null; quiet: number;
  night: number; calm: number; resonance: number; known: string[]; outcome: Outcome | null; last: Moment | null;
}

const pairCache = new WeakMap<ArenaDef, [number, number][]>();
function pairsOf(a: ArenaDef) { let p = pairCache.get(a); if (!p) { p = a.worlds.flatMap((_, i) => a.worlds.slice(i + 1).map((__, k) => [i, i + k + 1] as [number, number])); pairCache.set(a, p); } return p; }
export const pairs = (a: ArenaDef = FIRST_ARENA): [number, number][] => pairsOf(a).map(([x, y]) => [x, y]);
// Edges are numbered row by row over the upper triangle, so the index can be computed directly.
export function edgeOf(x: number, y: number, a: ArenaDef = FIRST_ARENA) {
  if (x === y) return -1; const n = a.worlds.length, i = Math.min(x, y), j = Math.max(x, y);
  return i * n - (i * (i + 1)) / 2 + (j - i - 1);
}
export function newGame(a: ArenaDef = FIRST_ARENA, known: string[] = []): Game {
  assertArena(a);
  const zero = () => a.worlds.map(() => 0);
  return { arena: a.id, version: a.version, beat: 0, basin: a.basin.initial, reeds: 0, clean: a.worlds.map(w => w.initial), used: a.worlds.map(w => w.initialUsed ?? 0), streak: zero(),
    dormant: a.worlds.map(() => false), active: zero(), links: pairs(a).map(() => false), memory: pairs(a).map(() => 0), grudge: pairs(a).map(() => false), bypass: [], threat: null,
    quiet: -9, night: 0, calm: 0, resonance: 0, known: [...known], outcome: null, last: null };
}
export const totalWater = (g: Game) => g.basin + g.reeds + g.clean.reduce((x, y) => x + y, 0) + g.used.reduce((x, y) => x + y, 0);
export const skyAt = (beat: number, a: ArenaDef = FIRST_ARENA): Sky => beat < a.dark[0] ? 'gathering' : beat <= a.dark[1] ? 'dark' : 'return';
export const activeAt = (g: Game, d: number, beat = g.beat + 1) => g.active[d] >= beat;
export const isLinked = (g: Game, e: number, beat = g.beat + 1) => g.links[e] || g.bypass.some(b => b.edge === e && b.until >= beat);
export const strainLine = (d: number, a: ArenaDef = FIRST_ARENA) => a.worlds[d].hold - 2;
export function conditionOf(g: Game, d: number, a: ArenaDef = FIRST_ARENA): Condition {
  return g.dormant[d] ? 'dormant' : g.used[d] >= strainLine(d, a) || g.streak[d] > 0 ? 'strained' : 'steady';
}
export function needAt(g: Game, d: number, beat = g.beat + 1, a: ArenaDef = FIRST_ARENA) {
  const w = a.worlds[d];
  const raw = w.need + (skyAt(beat, a) === 'dark' ? w.heat : 0) + (activeAt(g, d, beat) && (w.archetype === 'wetland' || w.archetype === 'forge') ? 1 : 0);
  return Math.max(1, raw - (w.archetype !== 'shelter' && sheltered(g, d, beat, a) ? 1 : 0));
}
// A raised shelter covers the sheltering world and every world it shares a current with: nothing
// can be taken from any of them, and the neighbours (not the sheltering world itself) use one less.
export function sheltered(g: Game, d: number, beat = g.beat + 1, a: ArenaDef = FIRST_ARENA) {
  return a.worlds.some((w, s) => w.archetype === 'shelter' && !g.dormant[s] && activeAt(g, s, beat) && (s === d || isLinked(g, edgeOf(s, d, a), beat)));
}
// What a world can renew this moment. Blooming and stoking double what the sky allows, so they are
// strong in season and weak out of it. The shifter lives by the other sky while its rhythm is changed.
export function renewAt(g: Game, d: number, beat = g.beat + 1, a: ArenaDef = FIRST_ARENA) {
  const w = a.worlds[d], on = activeAt(g, d, beat), sky = skyAt(beat, a);
  if (w.archetype === 'shifter') return w.renew[on ? other(sky) : sky];
  return w.renew[sky] * (on && (w.archetype === 'wetland' || w.archetype === 'forge') ? 2 : 1);
}
const other = (s: Sky): Sky => s === 'dark' ? 'gathering' : 'dark';
export function mistAt(g: Game, d: number, beat = g.beat + 1, a: ArenaDef = FIRST_ARENA) {
  const w = a.worlds[d], sky = skyAt(beat, a);
  if (g.dormant[d]) return 0;
  return w.archetype === 'shifter' && activeAt(g, d, beat) ? (sky === 'dark' ? 0 : w.mist[other(sky)]) : w.mist[sky];
}
const linksOf = (g: Game, d: number, a: ArenaDef, beat = g.beat + 1) => pairsOf(a).flatMap(([x, y], e) => (x === d || y === d) && isLinked(g, e, beat) ? [e] : []);

export function validChoice(x: unknown, a: ArenaDef = FIRST_ARENA): x is Choice {
  if (!x || typeof x !== 'object') return false;
  const c = x as { type?: unknown; edge?: unknown; world?: unknown; target?: unknown }, n = a.worlds.length;
  const idx = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < max;
  if (c.type === 'rest' || c.type === 'mediate') return true;
  if (c.type === 'connect' || c.type === 'release') return idx(c.edge, pairsOf(a).length);
  if (c.type === 'care') return idx(c.world, n);
  if (c.type === 'ability') return idx(c.world, n) && (c.target === undefined || (idx(c.target, n) && c.target !== c.world));
  return false;
}
// Why a world would decline a current right now, or null. The page shows this sentence as written.
export function invitationReason(g: Game, edge: number, a: ArenaDef = FIRST_ARENA, bypass = false): string | null {
  const ends = pairsOf(a)[edge];
  if (!ends) return 'That route is outside this arena.';
  if (isLinked(g, edge)) return 'This current is already open.';
  if (g.grudge[edge]) return `${a.worlds[ends[1]].short} and ${a.worlds[ends[0]].short} have not forgotten what was taken.`;
  for (const d of ends) {
    const w = a.worlds[d], o = ends[0] === d ? ends[1] : ends[0];
    if (g.dormant[d]) return `${w.short} is dormant. It needs water before it can answer.`;
    if (!bypass && linksOf(g, d, a).length >= w.ports) return `${w.short} has no free port. Rest one of its currents first.`;
    if (w.archetype === 'wetland' && g.used[d] > w.hold / 2) return `${w.short} wants to clear its own holding first.`;
    if (w.archetype === 'shelter' && !bypass && g.clean[d] < needAt(g, d, g.beat + 1, a) + 2 && !g.memory[edgeOf(d, o, a)]) return `${w.short} will not open to a stranger while its own reserve is thin.`;
  }
  return null;
}
// Whether the world being reached for would give freely instead, and if not, why. Each answers in character.
export function mediationReason(g: Game, a: ArenaDef = FIRST_ARENA): string | null {
  if (!g.threat) return 'No one is reaching for another’s water.';
  const { from, to } = g.threat, w = a.worlds[to];
  if (w.archetype === 'shelter' && !g.memory[edgeOf(from, to, a)]) return `${w.short} gives nothing to a world it has never exchanged with.`;
  if (g.clean[to] - needAt(g, to, g.beat + 1, a) < 2) return `${w.short} has too little left to give.`;
  return null;
}
// Tending a world: the basin community sends it clean water and carries used water back to its reed beds.
export function careOf(g: Game, d: number, a: ArenaDef = FIRST_ARENA, basin = g.basin) {
  const w = a.worlds[d];
  return { give: Math.min(3, Math.max(0, basin - a.basin.reserve - a.basin.need), Math.max(0, w.need + w.heat + w.keep + 1 - g.clean[d])), take: Math.min(2, g.used[d], a.basin.hold - g.reeds) };
}
export function unavailable(g: Game, c: Choice, a: ArenaDef = FIRST_ARENA): string | null {
  if (g.outcome) return 'This journey has ended.';
  if (!validChoice(c, a)) return 'Unknown choice.';
  if (c.type === 'connect') return invitationReason(g, c.edge, a);
  if (c.type === 'release') return g.links[c.edge] ? null : 'No lasting current runs there.';
  if (c.type === 'care') return careOf(g, c.world, a).give + careOf(g, c.world, a).take ? null : 'The basin has nothing to give this world, and nothing to take from it.';
  if (c.type === 'ability') {
    const w = a.worlds[c.world];
    if (g.dormant[c.world]) return `${w.short} is dormant.`;
    if (activeAt(g, c.world)) return 'This is already under way.';
    if (w.archetype === 'shelter' && g.clean[c.world] < 1) return 'Sealing the vaults needs one stored water.';
    if (w.archetype === 'prism') return c.target === undefined ? 'Choose where the bypass should reach.' : invitationReason(g, edgeOf(c.world, c.target, a), a, true);
    if (c.target !== undefined) return 'Only a bypass has a destination.';
  }
  if (c.type === 'mediate') {
    if (!g.threat) return 'No one is reaching for another’s water.';
    return mediationReason(g, a);
  }
  return null;
}

export function advance(previous: Game, c: Choice, a: ArenaDef = FIRST_ARENA): Game {
  if (previous.arena !== a.id || previous.version !== a.version) throw new Error('Arena and journey do not match');
  const reason = unavailable(previous, c, a); if (reason) throw new Error(reason);
  const g: Game = { ...previous, clean: [...previous.clean], used: [...previous.used], streak: [...previous.streak], dormant: [...previous.dormant], active: [...previous.active],
    links: [...previous.links], memory: [...previous.memory], grudge: [...previous.grudge], bypass: previous.bypass.map(b => ({ ...b })), threat: previous.threat && { ...previous.threat }, known: [...previous.known], last: null };
  const p = pairsOf(a), W = a.worlds, n = W.length;
  g.beat++; g.bypass = g.bypass.filter(b => b.until >= g.beat);
  const sky = skyAt(g.beat, a);
  const m: Moment = { sky, rain: a.rain[sky], mist: 0, drunk: 0, spilled: 0, cost: 0, renewed: 0, resonance: 0, unmet: W.map(() => 0), basinUnmet: 0, transfers: [], events: [], learned: [], before: totalWater(g), after: 0 };
  const send = (from: Place, to: Place, amount: number, kind: Transfer['kind'] = 'clean') => { if (amount > 0) m.transfers.push({ from, to, amount, kind }); };
  const ev = (kind: EventKind, world: number, other?: number, amount?: number) => m.events.push({ kind, world, ...(other === undefined ? {} : { other }), ...(amount === undefined ? {} : { amount }) });
  const learn = (id: string) => { if (!g.known.includes(id)) { g.known.push(id); m.learned.push(id); } };
  const linked = (x: number, y: number) => { const e = edgeOf(x, y, a); return e >= 0 && isLinked(g, e, g.beat); };
  const idOf = (t: string) => W.findIndex(w => w.archetype === t);

  // 1. The player's one choice.
  if (c.type === 'connect') { g.links[c.edge] = true; const [x, y] = p[c.edge]; ev('link', x, y); for (const d of [x, y]) { if (W[d].archetype === 'shelter') learn(`${W[d].id}.trust`); if (W[d].archetype === 'shifter') learn(`${W[d].id}.one`); } }
  if (c.type === 'release') { g.links[c.edge] = false; ev('unlink', p[c.edge][0], p[c.edge][1]); }
  if (c.type === 'ability') {
    const d = c.world, w = W[d]; g.active[d] = g.beat + 2; ev('ability', d, c.target);
    if (w.archetype === 'shelter') { g.clean[d]--; m.cost++; if (linksOf(g, d, a, g.beat).length) learn(`${w.id}.vault`); }
    if (w.archetype === 'prism') { g.bypass.push({ edge: edgeOf(d, c.target!, a), until: g.beat + 2 }); learn(`${w.id}.bypass`); }
  }
  if (c.type === 'mediate') {
    const { from, to } = g.threat!, give = Math.min(3, g.clean[to] - needAt(g, to, g.beat, a) - 1, W[from].store - g.clean[from]);
    g.clean[to] -= give; g.clean[from] += give; send(to, from, give); ev('mediated', from, to, give); g.memory[edgeOf(from, to, a)]++; g.threat = null;
  }
  const demand = W.map((_, d) => g.dormant[d] ? 0 : needAt(g, d, g.beat, a));

  // 2. The sky: rain falls on the basin; mist is gathered for it.
  W.forEach((w, d) => { const mist = mistAt(g, d, g.beat, a); if (mist) { m.mist += mist; learn(`${w.id}.mist`); } });
  g.basin += m.rain + m.mist;
  if (c.type === 'care') {
    const d = c.world, { give, take } = careOf(g, d, a);
    g.basin -= give; g.clean[d] += give; send('basin', d, give); g.used[d] -= take; g.reeds += take; send(d, 'basin', take, 'used'); ev('gift', d, undefined, give + take);
  }
  // An announced seizure happens now unless the player has changed something: a current between the
  // two, the thirsty world tended or given to, or a shelter over the other.
  if (g.threat) {
    const { from, to } = g.threat, guard = idOf('shelter');
    if (linked(from, to)) ev('settled', from, to);
    else if (g.dormant[from] || g.clean[from] >= demand[from]) ev('answered', from, to);
    else if (sheltered(g, to, g.beat, a)) { ev('sheltered', from, to); learn(`${W[guard].id}.vault`); }
    else { const take = Math.min(2, g.clean[to]), lost = Math.min(1, take); g.clean[to] -= take; g.clean[from] += take - lost; m.cost += lost; send(to, from, take - lost); ev('seized', from, to, take); g.grudge[edgeOf(from, to, a)] = true; }
    g.threat = null;
  }
  W.forEach((w, d) => { if (w.archetype === 'reservoir' && activeAt(g, d, g.beat) && !g.dormant[d]) { const out = Math.min(3, Math.max(0, g.clean[d] - demand[d])); g.clean[d] -= out; g.basin += out; send(d, 'basin', out); } });

  // 3. The basin community drinks first, then the basin tops each waking world up to what it likes to keep.
  const drink = Math.min(a.basin.need, g.basin); g.basin -= drink; m.drunk = drink; m.basinUnmet = a.basin.need - drink;
  const want = W.map((w, d) => Math.min(w.store, needAt(g, d, g.beat, a) + (w.archetype === 'reservoir' && activeAt(g, d, g.beat) ? 0 : w.keep)));
  const fed = W.map(() => 0), wakes = sky === 'return';   // returning rain reaches dormant worlds too
  for (let pass = 0; pass < Math.max(...want) && g.basin > a.basin.reserve; pass++) for (let k = 0; k < n && g.basin > a.basin.reserve; k++) {
    const d = (k + g.beat) % n;
    if ((!g.dormant[d] || wakes) && g.clean[d] < want[d]) { g.clean[d]++; g.basin--; fed[d]++; }
  }
  fed.forEach((amount, d) => send('basin', d, amount));
  // 4. Neighbours share what lies above their own need and reserve.
  p.forEach(([x, y], e) => {
    if (!isLinked(g, e, g.beat)) return;
    for (const [from, to] of [[x, y], [y, x]]) {
      if (g.dormant[from]) continue;
      const amount = Math.min(2, Math.max(0, g.clean[from] - demand[from] - W[from].reserve), Math.max(0, needAt(g, to, g.beat, a) + 1 - g.clean[to]));
      if (amount) { g.clean[from] -= amount; g.clean[to] += amount; send(from, to, amount); if (W[from].archetype === 'forge') learn(`${W[from].id}.open`); if (W[from].archetype === 'reservoir') learn(`${W[from].id}.reserve`); }
    }
  });
  // 5. A dormant world wakes once it holds a moment's need.
  W.forEach((_, d) => { if (g.dormant[d] && g.clean[d] >= needAt(g, d, g.beat, a)) { g.dormant[d] = false; g.streak[d] = 0; demand[d] = needAt(g, d, g.beat, a); ev('woke', d); } });
  // 7. Each waking world uses what it needs. What it used stays in its holding until renewed.
  W.forEach((_, d) => {
    const take = Math.min(demand[d], g.clean[d]); g.clean[d] -= take; g.used[d] += take; m.unmet[d] = demand[d] - take;
    if (m.unmet[d]) { g.streak[d]++; ev('short', d, undefined, m.unmet[d]); } else if (!g.dormant[d]) g.streak[d] = 0;
  });
  // 8. Renewal: each world first, then spare capacity serves neighbours along open currents.
  const room = p.map(([x, y]) => Math.max(W[x].channel, W[y].channel));
  const capacity = W.map((_, d) => g.dormant[d] ? 0 : renewAt(g, d, g.beat, a));
  const renew = (d: number, amount: number) => {
    g.used[d] -= amount; capacity[d] -= amount; m.renewed += amount;
    const own = Math.min(amount, Math.max(0, want[d] - g.clean[d])); g.clean[d] += own; g.basin += amount - own; send(d, 'basin', amount - own);
  };
  W.forEach((_, d) => renew(d, Math.min(g.used[d], capacity[d])));
  const route = (origin: number, accepts: (d: number) => number): { d: number; path: number[] } | undefined => {
    const queue = [{ d: origin, path: [] as number[] }], seen = new Set([origin]);
    for (const item of queue) {
      if (item.d !== origin && accepts(item.d) > 0) return item;
      p.forEach(([x, y], e) => { const to = x === item.d ? y : y === item.d ? x : -1;
        if (to >= 0 && !seen.has(to) && isLinked(g, e, g.beat) && room[e] > 0 && !g.dormant[to]) { seen.add(to); queue.push({ d: to, path: [...item.path, e] }); } });
    }
  };
  const carry = (origin: number, r: { d: number; path: number[] }, amount: number) => {
    g.used[origin] -= amount; g.used[r.d] += amount; let from = origin;
    for (const e of r.path) { const to = p[e][0] === from ? p[e][1] : p[e][0]; room[e] -= amount; send(from, to, amount, 'used'); if (amount > 3) learn(`${W[idOf('prism')]?.id}.wide`); from = to; }
  };
  const servedBy = W.map(() => new Set<number>()), relayHit = new Set<number>();
  for (let k = 0; k < n; k++) {
    const origin = (g.beat + k) % n;
    for (let tries = 0; tries < p.length && g.used[origin] > 0; tries++) {
      const r = route(origin, d => capacity[d]); if (!r) break;
      const amount = Math.min(g.used[origin], capacity[r.d], ...r.path.map(e => room[e]));
      carry(origin, r, amount); renew(r.d, amount); ev('served', r.d, origin, amount);
      servedBy[r.d].add(origin);
      if (r.path.length >= 2 && !relayHit.has(r.d)) { relayHit.add(r.d); m.resonance++; g.resonance++; ev('resonance', r.d, origin, r.path.length); }
      if (W[r.d].archetype === 'wetland') learn(`${W[r.d].id}.sky`);
    }
  }
  servedBy.forEach((origins, d) => { if (origins.size >= 2) { m.resonance++; g.resonance++; ev('resonance', d, undefined, origins.size); } });
  { const back = Math.min(g.reeds, a.basin.renew[sky]); g.reeds -= back; g.basin += back; m.renewed += back; }
  // 9. A world about to spill can rest the excess in a neighbouring cistern. It stays strained:
  //    the cistern keeps water from being lost, it does not renew it.
  W.forEach((w, d) => {
    if (w.archetype === 'reservoir') return;
    const excess = g.used[d] - (w.hold - 1); if (excess <= 0) return;   // only what would otherwise spill
    const r = route(d, t => W[t].archetype === 'reservoir' ? W[t].hold - 4 - g.used[t] : 0);
    if (!r || r.path.length !== 1) return;
    const amount = Math.min(excess, W[r.d].hold - 4 - g.used[r.d], room[r.path[0]]);
    if (amount > 0) { carry(d, r, amount); ev('parked', d, r.d, amount); learn(`${W[r.d].id}.cistern`); }
  });
  // 10. A full holding spills. That water has left the orbit.
  W.forEach((w, d) => { const over = g.used[d] - w.hold; if (over > 0) { g.used[d] = w.hold; m.spilled += over; ev('spill', d, undefined, over); } });
  if (g.basin > a.basin.capacity) { m.spilled += g.basin - a.basin.capacity; g.basin = a.basin.capacity; }
  p.forEach(([x, y], e) => { if (m.transfers.some(t => (t.from === x && t.to === y) || (t.from === y && t.to === x))) g.memory[e]++; });
  // 11. Two thirsty moments in a row and a world goes dormant: it stops drawing, renewing and sharing.
  W.forEach((w, d) => {
    if (!g.dormant[d] && g.streak[d] >= 2) { g.dormant[d] = true; g.active[d] = 0; ev('dormant', d); }
    if (g.beat === a.dark[0]) { if (w.archetype === 'wetland') learn(`${w.id}.dark`); if (w.archetype === 'forge') learn(`${w.id}.heat`); if (w.archetype === 'shifter') learn(`${w.id}.dark`); }
    if (g.used[d] >= strainLine(d, a) && (w.id === 'obsidian' || w.id === 'prism')) learn(`${w.id}.slow`);
    if (g.used[d] >= strainLine(d, a) && w.archetype === 'forge') learn(`${w.id}.cold`);
  });
  g.calm = m.basinUnmet || m.unmet.some(Boolean) ? 0 : g.calm + 1;
  // 12. A world that went thirsty, cannot cover its next need, and has no current to a comfortable
  //     world announces that it will take from that world.
  if (!g.threat && g.beat < a.length && g.beat - g.quiet >= 3) {
    const thirsty = W.map((_, d) => d).filter(d => m.unmet[d] && !g.dormant[d] && g.clean[d] < needAt(g, d, g.beat + 1, a)).sort((x, y) => m.unmet[y] - m.unmet[x] || x - y);
    for (const from of thirsty) {
      const spare = (d: number) => g.clean[d] - needAt(g, d, g.beat + 1, a);
      const to = W.map((_, d) => d).filter(d => d !== from && !g.dormant[d] && !linked(from, d) && spare(d) >= 3).sort((x, y) => spare(y) - spare(x) || x - y)[0];
      if (to !== undefined) { g.threat = { from, to }; g.quiet = g.beat; ev('threat', from, to); if (W[to].archetype === 'reservoir') learn(`${W[to].id}.coveted`); break; }
    }
  }
  // 13. How the journey ends. Every moment a world spends dormant, and every moment the basin
  //     community itself goes without, deepens the night; at `nightfall` the journey is lost.
  const asleep = g.dormant.filter(Boolean).length;
  g.night += asleep + (m.basinUnmet ? 1 : 0);
  if (g.night >= a.nightfall) g.outcome = 'night';
  else if (g.beat >= a.length) g.outcome = asleep === 0 && g.calm >= 3 && W.every((_, d) => g.used[d] < strainLine(d, a)) ? 'dawn' : 'peace';
  m.after = totalWater(g); g.last = m; return g;
}
export function replay(actions: Choice[], a: ArenaDef = FIRST_ARENA, known: string[] = []) { return actions.reduce((g, c) => advance(g, c, a), newGame(a, known)); }

// Looking ahead: what happens over the next quiet moments if the player does `first` and then rests.
export interface Outlook { short: number[]; dormant: number[]; spill: number[]; strained: number[]; seized: boolean; night: boolean; moments: number }
export function outlook(g: Game, first: Choice, moments = 3, a: ArenaDef = FIRST_ARENA): Outlook {
  const o: Outlook = { short: [], dormant: [], spill: [], strained: [], seized: false, night: false, moments: 0 };
  let s = g; const add = (xs: number[], d: number) => { if (!xs.includes(d)) xs.push(d); };
  for (let i = 0; i < moments && !s.outcome; i++) {
    s = advance(s, i === 0 ? first : { type: 'rest' }, a); o.moments++;
    for (const e of s.last!.events) { if (e.kind === 'short') add(o.short, e.world); if (e.kind === 'dormant') add(o.dormant, e.world); if (e.kind === 'spill') add(o.spill, e.world); if (e.kind === 'seized') o.seized = true; }
  }
  a.worlds.forEach((_, d) => { if (!s.dormant[d] && s.used[d] >= strainLine(d, a)) o.strained.push(d); });
  o.night = s.outcome === 'night'; return o;
}
