// Evidence for the design claims in docs/MICROCOSMOS.md. Run: node scripts/strategies.ts
// It plays the First Orbit many ways and prints what happened. Nothing here is used by the game.
import { FIRST_ARENA as A } from '../src/arenas.ts';
import { newGame, advance, unavailable, pairs, edgeOf, strainLine } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
export const P = pairs(A), W = A.worlds, N = W.length;
export const id = (name: string) => W.findIndex(w => w.id === name);
export const E = (x: string, y: string) => edgeOf(id(x), id(y), A);
const sum = (xs: number[]) => xs.reduce((x, y) => x + y, 0);
export interface Tally { events: Record<string, number>; outcome: string; ended: number; unmet: number; spilled: number; dormantMoments: number; acts: number; strainedEnd: number; g: Game }
export function play(plan: (g: Game) => Choice): Tally {
  let g = newGame(A), unmet = 0, spilled = 0, dm = 0, acts = 0; const events: Record<string, number> = {};
  while (!g.outcome) { let c = plan(g); if (unavailable(g, c, A)) c = { type: 'rest' }; if (c.type !== 'rest') acts++; g = advance(g, c, A); unmet += sum(g.last!.unmet); spilled += g.last!.spilled; dm += g.dormant.filter(Boolean).length; for (const e of g.last!.events) if (!['served', 'gift', 'link', 'unlink', 'ability'].includes(e.kind)) events[e.kind] = (events[e.kind] ?? 0) + 1; }
  return { events, outcome: g.outcome, ended: g.beat, unmet, spilled, dormantMoments: dm, acts, strainedEnd: W.filter((_, d) => g.used[d] >= strainLine(d, A)).length, g };
}
export const fixed = (cs: Choice[]) => (g: Game): Choice => cs[g.beat] ?? { type: 'rest' };
export const show = (t: Tally) => `${t.outcome.padEnd(5)} ended@${String(t.ended).padStart(2)} acts ${String(t.acts).padStart(2)} unmet ${String(t.unmet).padStart(3)} spilled ${String(t.spilled).padStart(2)} dormant-moments ${String(t.dormantMoments).padStart(2)} strained-at-end ${t.strainedEnd} | used ${t.g.used.join(',')} clean ${t.g.clean.join(',')} basin ${t.g.basin}`;
export function legal(g: Game, allow: (c: Choice) => boolean = () => true): Choice[] {
  const out: Choice[] = [{ type: 'rest' }, { type: 'mediate' }];
  P.forEach((_, e) => out.push({ type: 'connect', edge: e }, { type: 'release', edge: e }));
  W.forEach((w, d) => { out.push({ type: 'care', world: d }); if (w.archetype === 'prism') W.forEach((_, t) => { if (t !== d) out.push({ type: 'ability', world: d, target: t }); }); else out.push({ type: 'ability', world: d }); });
  return out.filter(c => allow(c) && !unavailable(g, c, A));
}
const tier = (o: string | null) => o === 'dawn' ? 2 : o === 'peace' ? 1 : 0;
// Beam search for a good line of play under a restriction. Not exhaustive: it shows that a line exists.
export function search(allow: (c: Choice, g: Game, cs: Choice[]) => boolean, width = 400, actCost = 3) {
  type Node = { g: Game; cs: Choice[]; unmet: number; spilled: number; dm: number; acts: number };
  const value = (x: Node) => (x.g.outcome ? tier(x.g.outcome) * 1000 - (x.g.outcome === 'night' ? 500 : 0) : 1000) - x.unmet * 12 - x.spilled * 6 - x.dm * 25 - x.acts * actCost
    - sum(W.map((_, d) => Math.max(0, x.g.used[d] - strainLine(d, A) + 2))) * 3 + (x.g.basin + sum(x.g.clean)) * 0.05;
  let beam: Node[] = [{ g: newGame(A), cs: [], unmet: 0, spilled: 0, dm: 0, acts: 0 }], done: Node[] = [];
  for (let b = 0; b < A.length && beam.length; b++) {
    const next: Node[] = [];
    for (const x of beam) for (const c of legal(x.g, c => allow(c, x.g, x.cs))) {
      const g = advance(x.g, c, A);
      const y = { g, cs: [...x.cs, c], unmet: x.unmet + sum(g.last!.unmet), spilled: x.spilled + g.last!.spilled, dm: x.dm + g.dormant.filter(Boolean).length, acts: x.acts + (c.type === 'rest' ? 0 : 1) };
      (g.outcome ? done : next).push(y);
    }
    next.sort((p, q) => value(q) - value(p)); beam = next.slice(0, width);
  }
  done.sort((p, q) => value(q) - value(p));
  return done[0];
}
// A sensible, short-sighted player: tries each legal choice, rests for a few moments after it, and
// keeps whichever leaves the orbit in the best shape. It never plans around the sky. It stands in
// for an attentive first journey, and it is the fixed continuation used to compare two choices.
export function sensible(g: Game, look = 3, allow: (c: Choice) => boolean = () => true): Choice {
  let best: Choice = { type: 'rest' }, bestV = -1e9;
  for (const c of legal(g, allow)) {
    let s = g, v = c.type === 'rest' ? 0 : -2;
    for (let i = 0; i < look && !s.outcome; i++) { s = advance(s, i ? { type: 'rest' } : c, A); v -= sum(s.last!.unmet) * 12 + s.last!.spilled * 6 + s.last!.events.filter(e => e.kind === 'dormant').length * 25 + s.last!.events.filter(e => e.kind === 'seized').length * 8; }
    v -= sum(W.map((_, d) => Math.max(0, s.used[d] - strainLine(d, A) + 1))) * 3; v += s.outcome === 'dawn' ? 200 : s.outcome === 'night' ? -500 : 0;
    if (v > bestV) { bestV = v; best = c; }
  }
  return best;
}
export const score = (t: Tally) => (t.outcome === 'dawn' ? 2000 : t.outcome === 'peace' ? 1000 : 0) - t.unmet * 12 - t.spilled * 6 - t.dormantMoments * 10 - t.strainedEnd * 40 - t.acts * 3;   // a quiet journey is worth something
export function finish(g0: Game, first: Choice | null): Tally {
  let g = g0, unmet = 0, spilled = 0, dm = 0, acts = 0, i = 0; const events: Record<string, number> = {};
  while (!g.outcome) { const c = i++ === 0 && first ? first : sensible(g); if (c.type !== 'rest') acts++; g = advance(g, c, A); unmet += sum(g.last!.unmet); spilled += g.last!.spilled; dm += g.dormant.filter(Boolean).length; }
  return { events, outcome: g.outcome, ended: g.beat, unmet, spilled, dormantMoments: dm, acts, strainedEnd: W.filter((_, d) => g.used[d] >= strainLine(d, A)).length, g };
}
export const name = (c: Choice): string => c.type === 'connect' || c.type === 'release' ? `${c.type === 'connect' ? 'link' : 'rest-current'} ${W[P[c.edge][0]].short}–${W[P[c.edge][1]].short}` : c.type === 'care' ? `gift ${W[c.world].short}` : c.type === 'ability' ? `${W[c.world].short}:ability${c.target !== undefined ? '→' + W[c.target].short : ''}` : c.type;
export const line = (cs: Choice[]) => cs.map((c, i) => c.type === 'rest' ? '' : `${i + 1} ${name(c)}`).filter(Boolean).join('; ');
function rnd(seed: number) { let x = seed | 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e6) / 1e6; }; }
export function feasibleNetworks(max = 5) {
  const out: number[][] = [], ports = W.map(() => 0);
  const rec = (start: number, set: number[]) => { out.push(set.slice()); if (set.length === max) return; for (let e = start; e < P.length; e++) { const [x, y] = P[e]; if (ports[x] < W[x].ports && ports[y] < W[y].ports) { ports[x]++; ports[y]++; set.push(e); rec(e + 1, set); set.pop(); ports[x]--; ports[y]--; } } };
  rec(0, []); return out;
}
// Connect a set of currents as early as each world will accept, then only rest.
export function wireAndRest(set: number[]) { return play(g => { const e = set.find(e => !g.links[e] && !unavailable(g, { type: 'connect', edge: e }, A)); return e === undefined ? { type: 'rest' } : { type: 'connect', edge: e }; }); }

if (import.meta.url === `file://${process.argv[1]}`) {
  { const t = play(() => ({ type: 'rest' })); console.log('PASSIVE            ', show(t), JSON.stringify(t.events)); }
  const nets = feasibleNetworks(), by: Record<number, Record<string, number>> = {};
  for (const set of nets) { const t = wireAndRest(set); ((by[set.length] ??= {})[t.outcome] ??= 0); by[set.length][t.outcome]++; }
  console.log('WIRE AND REST (links: outcomes)', JSON.stringify(by));
  for (const [label, pRest] of [['random, half rests', .5], ['random, never rests', 0], ['random, mostly rests', .8]] as const) {
    const tally: Record<string, number> = {};
    for (let t = 0; t < 1000; t++) { const r = rnd(t * 7919 + 13); const res = play(g => { const L = legal(g); return r() < pRest ? { type: 'rest' } : L[Math.floor(r() * L.length)]; }); tally[res.outcome] = (tally[res.outcome] ?? 0) + 1; }
    console.log(label.padEnd(20), JSON.stringify(tally));
  }
  { const t = play(g => sensible(g)); console.log('SENSIBLE PLAYER    ', show(t), JSON.stringify(t.events)); }
  // Disputes reached by careless play: which answer leads to the best journey when a sensible player takes over?
  { const seen = new Set<string>(), wins: Record<string, number> = {}, sole: Record<string, number> = {}; let states = 0;
    for (let t = 0; t < 1500; t++) { const r = rnd(t * 104729 + 7); let g = newGame(A);
      while (!g.outcome) { if (g.threat) { const key = JSON.stringify([g.beat, g.clean, g.used, g.links, g.threat, g.basin]); if (!seen.has(key)) { seen.add(key); states++;
            const { from, to } = g.threat, sh = id('obsidian'); const opts: [string, Choice][] = [['let it happen', { type: 'rest' }], ['mediate', { type: 'mediate' }], ['tend the thirsty world', { type: 'care', world: from }], ['open a current between them', { type: 'connect', edge: edgeOf(from, to, A) }], ['shelter', { type: 'ability', world: sh }], ['open the stores', { type: 'ability', world: id('sanctum') }]];
            const res = opts.filter(([, c]) => !unavailable(g, c, A)).map(([n, c]) => [n, score(finish(g, c))] as [string, number]); const top = Math.max(...res.map(x => x[1])); const best = res.filter(x => x[1] === top);
            for (const [n] of best) wins[n] = (wins[n] ?? 0) + 1; if (best.length === 1) sole[best[0][0]] = (sole[best[0][0]] ?? 0) + 1; } }
        const L = legal(g); g = advance(g, r() < 0.75 ? { type: 'rest' } : L[Math.floor(r() * L.length)], A); } }
    console.log(`DISPUTES: ${states} distinct situations. Best answer (ties counted for each):`, JSON.stringify(wins), '| strictly best:', JSON.stringify(sole)); }
  const no = (w: string) => (c: Choice) => !(c.type === 'connect' && P[c.edge].includes(id(w))) && !(c.type === 'ability' && c.target === id(w));
  const styles: [string, string, (c: Choice, g: Game, cs: Choice[]) => boolean][] = [
    ['any', 'anything allowed', () => true],
    ['two-currents', 'at most two currents ever opened', (c, g, cs) => c.type !== 'connect' || cs.filter(x => x.type === 'connect').length < 2],
    ['one-current', 'one current ever opened', (c, g, cs) => c.type !== 'connect' || cs.filter(x => x.type === 'connect').length < 1],
    ['no-tending', 'the basin never tends a world', c => c.type !== 'care'],
    ['no-abilities', 'no world uses its ability', c => c.type !== 'ability'],
    ['no-currents', 'no lasting current at all', c => c.type !== 'connect'],
    ...W.map(w => [`without-${w.id}`, `no current or bypass ever touches ${w.short}`, no(w.id)] as [string, string, (c: Choice) => boolean]),
  ];
  const journeys: Record<string, { rule: string; outcome: string; actions: Choice[] }> = {};
  for (const [key, label, allow] of styles) { const best = search(allow, Number(process.argv[2] ?? 300)); const t = play(fixed(best.cs)); journeys[key] = { rule: label, outcome: t.outcome, actions: best.cs };
    console.log(`BEST: ${label}`.padEnd(52), show(t).slice(0, 96), JSON.stringify(t.events), '\n     ', line(best.cs)); }
  if (process.argv.includes('--write')) { const { writeFileSync } = await import('node:fs'); writeFileSync(new URL('../test/journeys.json', import.meta.url), JSON.stringify(journeys, null, 1)); console.log('wrote test/journeys.json'); }
}
