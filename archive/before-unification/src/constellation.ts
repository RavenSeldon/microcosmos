import { FIRST_ARENA, assertArena } from './arenas.ts';
import type { ArenaDefinition } from './arenas.ts';
import type { Transfer } from './circulation.ts';

export type Choice = { type: 'rest' | 'mediate' | 'interrupt' } | { type: 'connect' | 'release'; edge: number } | { type: 'care' | 'ability'; world: number };
export interface Moment {
  rain: number; loss: number; recovered: number; unmet: number[]; basinUnmet: number;
  transfers: Transfer[]; words: string[]; before: number; after: number;
}
export interface Constellation {
  arena: string; version: number; beat: number; basin: number; clean: number[]; used: number[];
  links: boolean[]; memory: number[]; active: number[]; grievance: number[];
  bypass: { edge: number; until: number }[]; threat: { from: number; to: number; due: number } | null;
  settled: number; dawn: boolean; last: Moment | null;
}
export function pairs(a = FIRST_ARENA): [number, number][] {
  return a.worlds.flatMap((_, i) => a.worlds.slice(i + 1).map((__, k) => [i, i + k + 1] as [number, number]));
}
export function initialConstellation(a = FIRST_ARENA): Constellation {
  assertArena(a);
  const zeros = () => a.worlds.map(() => 0);
  return { arena: a.id, version: a.version, beat: 0, basin: a.basin.initial, clean: a.worlds.map(w => w.initial), used: zeros(),
    links: pairs(a).map(() => false), memory: pairs(a).map(() => 0), active: zeros(), grievance: zeros(), bypass: [], threat: null, settled: 0, dawn: false, last: null };
}
export const totalWater = (s: Constellation) => s.basin + s.clean.reduce((x, y) => x + y, 0) + s.used.reduce((x, y) => x + y, 0);
export const position = (beat: number, a = FIRST_ARENA) => ((Math.max(1, beat) - 1) % a.seasonLength) + 1;
const within = (v: number, span: [number, number]) => v >= span[0] && v <= span[1];
export function weatherAt(beat: number, a = FIRST_ARENA): 'gentle' | 'dry' | 'rain' {
  const p = position(beat, a); return within(p, a.dry) ? 'dry' : within(p, a.rain) ? 'rain' : 'gentle';
}
export const activeAt = (s: Constellation, d: number, beat = s.beat + 1) => s.active[d] >= beat;
export function needs(s: Constellation, beat = s.beat + 1, a = FIRST_ARENA) {
  return a.worlds.map((w, d) => w.need + (w.archetype === 'forge' && within(position(beat, a), a.heat) ? 1 : 0)
    + (activeAt(s, d, beat) && ['forge', 'wetland'].includes(w.archetype) ? 1 : 0));
}
export function isLinked(s: Constellation, e: number, beat = s.beat + 1) { return s.links[e] || s.bypass.some(b => b.edge === e && b.until >= beat); }
export function validChoice(x: unknown, a = FIRST_ARENA): x is Choice {
  if (!x || typeof x !== 'object') return false;
  const c = x as Choice;
  return ['rest', 'mediate', 'interrupt'].includes(c.type)
    || ((c.type === 'connect' || c.type === 'release') && Number.isInteger(c.edge) && c.edge >= 0 && c.edge < pairs(a).length)
    || ((c.type === 'care' || c.type === 'ability') && Number.isInteger(c.world) && c.world >= 0 && c.world < a.worlds.length);
}
export function invitationReason(s: Constellation, edge: number, a = FIRST_ARENA, bypass = false): string | null {
  const p = pairs(a), ends = p[edge];
  if (!ends) return 'That route is outside this arena.';
  if (isLinked(s, edge)) return 'This current is already open.';
  for (const d of ends) {
    const w = a.worlds[d];
    if (s.grievance[d] >= s.beat + 1) return `${w.short} needs time after the interruption.`;
    if (!bypass && p.filter(([x, y], e) => (x === d || y === d) && isLinked(s, e)).length >= w.ports) return `${w.short} has no free port. Rest a current first.`;
    if (w.archetype === 'wetland' && s.used[d] > 8) return `${w.short} wants to clear its backlog first.`;
    if (w.archetype === 'shelter' && s.clean[d] < 2 && !p.some(([x, y], e) => (x === d || y === d) && s.memory[e] > 0)) return `${w.short} wants a little reserve before opening up.`;
  }
  return null;
}
export function bypassEdge(s: Constellation, d: number, a = FIRST_ARENA): number | undefined {
  return pairs(a).map(([x, y], e) => ({ e, other: x === d ? y : y === d ? x : -1 }))
    .filter(x => x.other >= 0 && !invitationReason(s, x.e, a, true))
    .sort((x, y) => s.clean[x.other] - s.clean[y.other] || x.e - y.e)[0]?.e;
}
// No hidden dice. Previews and controls use the same eligibility rules as the engine.
export function unavailable(s: Constellation, c: Choice, a = FIRST_ARENA): string | null {
  if (!validChoice(c, a)) return 'Unknown choice.';
  if (c.type === 'connect') return invitationReason(s, c.edge, a);
  if (c.type === 'release') return isLinked(s, c.edge) ? null : 'That current is already resting.';
  if (c.type === 'care') return s.basin <= a.basin.reserve + a.basin.need ? 'The basin needs its remaining water.' : s.clean[c.world] >= a.worlds[c.world].capacity ? 'This world’s stores are full.' : null;
  if (c.type === 'ability') {
    if (activeAt(s, c.world)) return 'This rhythm is already active.';
    const w = a.worlds[c.world];
    if (w.archetype === 'shelter' && s.clean[c.world] < 1) return 'The shelter needs one stored water.';
    if (w.archetype === 'prism' && bypassEdge(s, c.world, a) === undefined) return 'No unlinked neighbour can receive a bypass.';
  }
  if (c.type === 'mediate' || c.type === 'interrupt') {
    if (!s.threat) return 'There is no announced disruption.';
    if (c.type === 'mediate' && s.clean[s.threat.to] < 2) return `${a.worlds[s.threat.to].short} cannot spare the two water needed to demonstrate restraint.`;
  }
  return null;
}

export function advance(previous: Constellation, c: Choice, a = FIRST_ARENA): Constellation {
  if (previous.arena !== a.id || previous.version !== a.version) throw new Error('Arena and save do not match');
  const reason = unavailable(previous, c, a); if (reason) throw new Error(reason);
  const s = structuredClone(previous), p = pairs(a), n = a.worlds.length;
  s.beat++; s.bypass = s.bypass.filter(b => b.until >= s.beat);
  const r: Moment = { rain: a.rainfall[weatherAt(s.beat, a)], loss: 0, recovered: 0, unmet: a.worlds.map(() => 0), basinUnmet: 0, transfers: [], words: [], before: totalWater(s), after: 0 };
  const send = (from: Transfer['from'], to: Transfer['to'], amount: number, kind: Transfer['kind'] = 'clean') => { if (amount) r.transfers.push({ from, to, amount, kind }); };
  const returnClean = (d: number, amount: number) => { s.clean[d] -= amount; s.basin += amount; send(d, 'basin', amount); };
  if (c.type === 'connect') { s.links[c.edge] = true; const [x, y] = p[c.edge]; r.words.push(`${a.worlds[x].short} and ${a.worlds[y].short} agree to share a current.`); }
  if (c.type === 'release') { s.links[c.edge] = false; s.bypass = s.bypass.filter(b => b.edge !== c.edge); r.words.push('The current rests. Its history remains; its ports are free.'); }
  if (c.type === 'ability') {
    const d = c.world, w = a.worlds[d]; s.active[d] = s.beat + 2;
    if (w.archetype === 'shelter') { s.clean[d]--; r.loss++; }
    if (w.archetype === 'prism') { const e = bypassEdge(previous, d, a)!; s.bypass.push({ edge: e, until: s.beat + 2 }); r.words.push(`Prism opens a bypass to ${a.worlds[p[e].find(x => x !== d)!].short}. It lasts three moments.`); }
    else r.words.push(`${w.short}: ${w.ability.toLowerCase()}. This rhythm lasts three moments.`);
  }
  if (c.type === 'mediate') { returnClean(s.threat!.to, 2); r.words.push(`${a.worlds[s.threat!.to].short} returns two stored water. The show of restraint settles the threat.`); s.threat = null; }
  if (c.type === 'interrupt') {
    const d = s.threat!.from; s.grievance[d] = s.beat + 2;
    p.forEach(([x, y], e) => { if (x === d || y === d) s.links[e] = false; });
    s.bypass = s.bypass.filter(b => !p[b.edge].includes(d));
    r.words.push(`You stop the disruption. ${a.worlds[d].short} closes its currents and declines invitations for three moments.`); s.threat = null;
  }
  const demand = needs(s, s.beat, a);
  // An announced action resolves only on the following player-paced beat.
  if (s.threat && s.threat.due <= s.beat) {
    const { from, to } = s.threat;
    const linked = p.some(([x, y], e) => isLinked(s, e, s.beat) && [x, y].includes(from) && [x, y].includes(to));
    const sheltered = a.worlds.some((w, d) => w.archetype === 'shelter' && activeAt(s, d, s.beat) && (d === to || p.some(([x, y], e) => isLinked(s, e, s.beat) && [x, y].includes(d) && [x, y].includes(to))));
    if (linked || sheltered) r.words.push(`${a.worlds[to].short} is protected by a ${linked ? 'shared current' : 'shelter'}. The threat passes.`);
    else { const spill = Math.min(2, s.clean[to]); s.clean[to] -= spill; r.loss += spill; r.words.push(`${a.worlds[from].short} disrupts ${a.worlds[to].short}: ${spill} stored water lost. The world can recover.`); }
    s.threat = null;
  }
  // Shifters either catch external mist or reclaim more. Flipping has a visible tradeoff.
  const recovering = a.worlds.map((w, d) => w.archetype === 'shifter' && ((weatherAt(s.beat, a) === 'dry') !== activeAt(s, d, s.beat)));
  a.worlds.forEach((w, d) => { if (w.archetype === 'shifter' && !recovering[d] && weatherAt(s.beat, a) !== 'dry') r.rain += 1; });
  s.basin += r.rain;
  if (c.type === 'care') {
    const d = c.world, gift = Math.min(3, Math.max(0, s.basin - a.basin.reserve - a.basin.need), a.worlds[d].capacity - s.clean[d]);
    s.basin -= gift; s.clean[d] += gift; send('basin', d, gift); r.words.push(`You give ${a.worlds[d].short} priority for a little water from the basin.`);
  }
  a.worlds.forEach((w, d) => { if (w.archetype === 'reservoir' && activeAt(s, d, s.beat)) returnClean(d, Math.min(3, Math.max(0, s.clean[d] - demand[d]))); });
  const drink = Math.min(a.basin.need, s.basin); s.basin -= drink; r.loss += drink; r.basinUnmet = a.basin.need - drink;
  const target = a.worlds.map((w, d) => Math.min(w.capacity, demand[d] + (w.archetype === 'reservoir' && !activeAt(s, d, s.beat) ? 5 : 1)));
  const supplied = a.worlds.map(() => 0);
  for (let pass = 0; pass < Math.max(...target) && s.basin > a.basin.reserve; pass++) for (let k = 0; k < n && s.basin > a.basin.reserve; k++) {
    const d = (k + s.beat) % n;
    if (s.clean[d] < target[d]) { s.clean[d]++; s.basin--; supplied[d]++; }
  }
  supplied.forEach((amount, d) => send('basin', d, amount));
  p.forEach(([x, y], e) => {
    if (!isLinked(s, e, s.beat)) return;
    for (const [from, to] of [[x, y], [y, x]]) {
      const amount = Math.min(2, Math.max(0, s.clean[from] - demand[from] - a.worlds[from].reserve), Math.max(0, demand[to] + 1 - s.clean[to]));
      s.clean[from] -= amount; s.clean[to] += amount; send(from, to, amount);
    }
  });
  a.worlds.forEach((_, d) => { const take = Math.min(demand[d], s.clean[d]); s.clean[d] -= take; s.used[d] += take; r.unmet[d] = demand[d] - take; });
  const room = p.map(([x, y]) => [x, y].some(d => a.worlds[d].archetype === 'prism') ? 5 : 3);
  const capacity = a.worlds.map((w, d) => w.reclaim + (recovering[d] ? 2 : 0) + (activeAt(s, d, s.beat) && ['wetland', 'forge'].includes(w.archetype) ? 3 : 0));
  const process = (d: number, amount: number) => {
    s.used[d] -= amount; capacity[d] -= amount; r.recovered += amount;
    const local = Math.min(amount, Math.max(0, target[d] - s.clean[d])); s.clean[d] += local;
    const spare = amount - local; s.basin += spare; send(d, 'basin', spare);
  };
  // Local recovery works without alliances. Surplus processing can serve connected worlds.
  a.worlds.forEach((_, d) => process(d, Math.min(s.used[d], capacity[d])));
  for (let k = 0; k < n; k++) {
    const origin = (s.beat + k) % n;
    for (let attempt = 0; attempt < p.length && s.used[origin] > 0; attempt++) {
      const queue = [{ d: origin, path: [] as number[] }], seen = new Set([origin]);
      let route: typeof queue[number] | undefined;
      for (const item of queue) {
        if (item.d !== origin && capacity[item.d] > 0) { route = item; break; }
        p.forEach(([x, y], e) => { const to = x === item.d ? y : y === item.d ? x : -1;
          if (to >= 0 && !seen.has(to) && isLinked(s, e, s.beat) && room[e] > 0) { seen.add(to); queue.push({ d: to, path: [...item.path, e] }); }
        });
      }
      if (!route) break;
      const amount = Math.min(s.used[origin], capacity[route.d], ...route.path.map(e => room[e]));
      s.used[origin] -= amount; s.used[route.d] += amount;
      let from = origin;
      for (const e of route.path) { const to = p[e].find(d => d !== from)!; room[e] -= amount; send(from, to, amount, 'used'); from = to; }
      process(route.d, amount);
    }
  }
  p.forEach(([x, y], e) => { if (r.transfers.some(t => (t.from === x && t.to === y) || (t.from === y && t.to === x))) s.memory[e]++; });
  if (s.basin > a.basin.capacity) { r.loss += s.basin - a.basin.capacity; s.basin = a.basin.capacity; }
  const encounter = a.encounter;
  if (encounter && position(s.beat, a) === encounter.moment) {
    const from = a.worlds.findIndex(w => w.id === encounter.from), to = a.worlds.findIndex(w => w.id === encounter.to);
    if (!p.some(([x, y], e) => isLinked(s, e, s.beat) && [x, y].includes(from) && [x, y].includes(to))) {
      s.threat = { from, to, due: s.beat + 1 };
      r.words.push(`${a.worlds[from].short} fears ${a.worlds[to].short}’s growing demand. It will disrupt that world’s stores next moment unless something changes.`);
    }
  }
  const calm = !r.unmet.some(Boolean) && !r.basinUnmet && s.basin >= a.basin.reserve + a.basin.need;
  s.settled = calm ? s.settled + 1 : 0;
  s.dawn ||= s.beat >= a.seasonLength && s.settled >= 3;
  if (r.unmet.some(Boolean)) r.words.push(`${a.worlds.filter((_, d) => r.unmet[d]).map(w => w.short).join(' and ')} went short. Recovery, reserves or a different route can help.`);
  if (r.basinUnmet) r.words.push('The basin community went short. Returning water will help it recover.');
  if (!r.words.length) r.words.push(weatherAt(s.beat, a) === 'dry' ? 'Under a quiet sky, reserves and returning water carry the orbit.' : 'The worlds keep their own rhythms. Water returns; the orbit breathes.');
  if (s.dawn && !previous.dawn) r.words.push('A shared dawn. You carried every community into a steadier rhythm.');
  r.after = totalWater(s); s.last = r; return s;
}
export function replayConstellation(actions: Choice[], a = FIRST_ARENA) { return actions.reduce((s, c) => advance(s, c, a), initialConstellation(a)); }
