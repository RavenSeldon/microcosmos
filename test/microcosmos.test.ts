// What the rules of The Dark Microcosmos guarantee. Passing these says the simulation does what the
// design claims. It does not say the game is fun; only people playing can say that.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIRST_ARENA as A, assertArena } from '../src/arenas.ts';
import type { ArenaDef } from '../src/arenas.ts';
import { newGame, advance, replay, unavailable, validChoice, pairs, edgeOf, totalWater, outlook, needAt, strainLine, conditionOf, mediationReason } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
import { foresee, tell, ending, recount } from '../src/telling.ts';
import { play, fixed, legal, sensible, feasibleNetworks, wireAndRest, W, P, id, E } from '../scripts/strategies.ts';
import { verdict } from '../scripts/witnesses.ts';

const rest: Choice = { type: 'rest' };
const rnd = (seed: number) => { let x = seed | 0 || 1; return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e6) / 1e6; }; };
const json = (name: string) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
function books(g: Game, a: ArenaDef) {
  const m = g.last!;
  assert.equal(m.before + m.rain + m.mist - m.drunk - m.spilled - m.cost, m.after, 'water in and out balances');
  assert.equal(m.after, totalWater(g));
  a.worlds.forEach((w, d) => { assert.ok(g.clean[d] >= 0 && g.clean[d] <= w.store + 1, `clean within store: ${w.id} ${g.clean[d]}`); assert.ok(g.used[d] >= 0 && g.used[d] <= w.hold, `used within holding: ${w.id}`); });
  assert.ok(g.basin >= 0 && g.basin <= a.basin.capacity && g.reeds >= 0 && g.reeds <= a.basin.hold);
}

test('water is conserved, stores stay in bounds, and a moment never changes the state it came from', () => {
  let steps = 0;
  for (let t = 0; t < 250; t++) {
    const r = rnd(t * 9973 + 5); let g = newGame(A);
    while (!g.outcome) { const before = JSON.stringify(g), L = legal(g), c = L[Math.floor(r() * L.length)]; const next = advance(g, c, A); assert.equal(JSON.stringify(g), before); books(next, A); g = next; steps++; }
  }
  assert.ok(steps > 3000);
});

test('doing nothing ends in the long night, late, with warning', () => {
  let g = newGame(A), warned = 0, thirst = 0, asleep = 0;
  while (!g.outcome) {
    const o = outlook(g, rest, 2, A); if (!warned && o.short.length) warned = g.beat + 1;
    g = advance(g, rest, A);
    if (!thirst && g.last!.unmet.some(Boolean)) thirst = g.beat; if (!asleep && g.dormant.some(Boolean)) asleep = g.beat;
  }
  assert.equal(g.outcome, 'night');
  assert.ok(g.beat >= A.dark[0] + 3, `the night falls at moment ${g.beat}, not early`);
  assert.ok(warned > 0 && warned <= thirst, 'the forecast names the first thirst before it happens');
  assert.ok(g.beat - asleep >= 2, 'at least two moments pass between the first dormancy and the end');
  assert.ok(g.beat - warned >= 4, 'at least four moments pass between the first warning and the end');
});

test('no arrangement of currents carries the journey to dawn by itself', () => {
  const nets = feasibleNetworks(); let dawn = 0, peace = 0;
  for (const set of nets) { const o = wireAndRest(set).outcome; if (o === 'dawn') dawn++; if (o === 'peace') peace++; }
  assert.ok(nets.length > 500);
  assert.equal(dawn, 0, 'every static network needs at least one later adaptation');
  assert.ok(peace > nets.length / 2, 'but most networks do get the orbit through the dark');
});

test('several different ways of playing reach a shared dawn', () => {
  const J = json('./journeys.json') as Record<string, { rule: string; outcome: string; actions: Choice[] }>;
  const opened = (cs: Choice[]) => cs.filter(c => c.type === 'connect').length;
  const touches = (cs: Choice[], w: string) => cs.some(c => (c.type === 'connect' && P[c.edge].includes(id(w))) || (c.type === 'ability' && c.target === id(w)));
  for (const key of ['any', 'two-currents', 'one-current', 'no-tending', ...W.map(w => `without-${w.id}`)]) {
    const j = J[key]; assert.ok(j, key);
    const t = play(fixed(j.actions));
    assert.equal(t.outcome, 'dawn', `${key}: ${j.rule}`); assert.equal(t.unmet, 0, `${key}: no world went thirsty`);
    assert.ok(j.actions.filter(c => c.type === 'rest').length >= 6, `${key}: at least a third of the journey is quiet`);
  }
  assert.ok(opened(J['two-currents'].actions) <= 2); assert.ok(opened(J['one-current'].actions) <= 1);
  assert.ok(!J['no-tending'].actions.some(c => c.type === 'care'));
  for (const w of W) assert.ok(!touches(J[`without-${w.id}`].actions, w.id), `no world is indispensable: dawn without any current to ${w.short}`);
});

test('an attentive, short-sighted player reaches dawn and spends most of the journey at rest', () => {
  const cs: Choice[] = []; const t = play(g => { const c = sensible(g); cs.push(c); return c; });
  assert.equal(t.outcome, 'dawn');
  assert.ok(cs.filter(c => c.type === 'rest').length >= 9, `rests: ${cs.filter(c => c.type === 'rest').length}`);
});

test('every kind of choice has a situation, reached by play, where it is strictly the best thing to do', () => {
  const Wt = json('./witnesses.json') as Record<string, { prefix: Choice[]; choice: Choice; margin: number }>;
  for (const kind of ['rest', 'connect', 'release', 'care', 'mediate', ...W.map(w => `ability:${w.id}`)]) {
    const w = Wt[kind]; assert.ok(w, `a witness exists for ${kind}`);
    const g = replay(w.prefix, A); assert.equal(g.outcome, null);
    const v = verdict(g);
    assert.equal(v.kind, kind, `${kind} is the best kind of choice at moment ${g.beat + 1}`);
    assert.ok(v.margin > 0, `${kind} beats every other kind (margin ${v.margin})`);
  }
});

test('a thirsty world reaches for a comfortable one; each answer does what it says', () => {
  let g = newGame(A); while (!g.threat && !g.outcome) g = advance(g, rest, A);
  assert.ok(g.threat, 'neglect produces a dispute'); const { from, to } = g.threat!;
  assert.ok(g.last!.unmet[from] > 0 && g.clean[from] < needAt(g, from, g.beat + 1, A), 'the reaching world is thirsty and cannot cover its next need');
  assert.equal(edgeOf(from, to, A) >= 0 && !g.links[edgeOf(from, to, A)], true); assert.ok(g.clean[to] - needAt(g, to, g.beat + 1, A) >= 3, 'the other is comfortable');
  const taken = advance(g, rest, A); assert.ok(taken.last!.events.some(e => e.kind === 'seized')); assert.equal(taken.last!.cost, 1, 'one water is lost in a seizure');
  assert.match(unavailable(taken, { type: 'connect', edge: edgeOf(from, to, A) }, A)!, /not forgotten/, 'a seizure closes that current for the journey');
  const given = advance(g, { type: 'mediate' }, A); assert.ok(given.last!.events.some(e => e.kind === 'mediated')); assert.equal(given.last!.cost, 0); assert.ok(!given.last!.events.some(e => e.kind === 'seized'));
  const joined = advance(g, { type: 'connect', edge: edgeOf(from, to, A) }, A); assert.ok(joined.last!.events.some(e => e.kind === 'settled'));
});

test('a shelter turns a seizure away, and Obsidian gives nothing to a stranger', () => {
  const ob = id('obsidian'), sa = id('sanctum');
  // Play until a world reaches for Sanctum while Obsidian shares a current with Sanctum.
  let g = advance(newGame(A), { type: 'connect', edge: E('obsidian', 'sanctum') }, A); while (!(g.threat && g.threat.to === sa) && !g.outcome) g = advance(g, rest, A);
  assert.ok(g.threat && g.threat.to === sa, 'reached in play, not constructed');
  const s = advance(g, { type: 'ability', world: ob }, A); assert.ok(s.last!.events.some(e => e.kind === 'sheltered')); assert.ok(!s.last!.events.some(e => e.kind === 'seized')); assert.equal(s.last!.cost, 1, 'sealing costs one water and nothing else is lost');
  assert.ok(s.known.includes('obsidian.vault'));
  // A stranger reaching for Obsidian itself: mediation is refused, in Obsidian's words.
  const stranger = A.worlds.map((_, d) => d).find(d => d !== ob && d !== sa)!;
  const h: Game = { ...newGame(A), threat: { from: stranger, to: ob } };
  assert.match(mediationReason(h, A)!, /never exchanged/);
});

test('thirst twice running means dormancy; water wakes a world; dormant moments deepen the night', () => {
  let g = newGame(A); while (!g.dormant.some(Boolean) && !g.outcome) g = advance(g, rest, A);
  const d = g.dormant.findIndex(Boolean); assert.ok(d >= 0); assert.equal(conditionOf(g, d, A), 'dormant'); assert.ok(g.night >= 1);
  assert.equal(needAt(g, d, g.beat + 1, A) > 0, true); const next = advance(g, rest, A); assert.equal(next.last!.unmet[d], 0, 'a dormant world draws nothing');
  let h = g, woke = false; for (let i = 0; i < 3 && !woke && !h.outcome; i++) { h = advance(h, { type: 'care', world: d }, A); woke = h.last!.events.some(e => e.kind === 'woke' && e.world === d); }
  assert.ok(woke || h.outcome, 'tending wakes a dormant world when the basin has water to send');
});

test('dawn asks for more than surviving: no dormancy, no late thirst, no holding near its limit', () => {
  const J = json('./journeys.json'); const dawn = replay(J.any.actions, A); assert.equal(dawn.outcome, 'dawn');
  assert.ok(A.worlds.every((_, d) => dawn.used[d] < strainLine(d, A) && !dawn.dormant[d])); assert.ok(dawn.calm >= 3);
  assert.equal(ending(dawn, A)!.title, 'A shared dawn.');
  const five = feasibleNetworks().find(s => s.length === 5)!, t = wireAndRest(five); assert.equal(t.outcome, 'peace');
  assert.ok(ending(t.g, A)!.why.length >= 2, 'a fragile peace says what was left unresolved');
  assert.throws(() => advance(dawn, rest, A), /ended/);
});

test('what a choice is said to change is what the rules then do', () => {
  let checked = 0, eased = 0;
  for (let t = 0; t < 40; t++) {
    const r = rnd(t * 31337 + 3); let g = newGame(A);
    while (!g.outcome) {
      for (const c of legal(g).filter(() => r() < 0.25)) {
        const f = foresee(g, c, A), base = outlook(g, rest, 3, A), o = outlook(g, c, 3, A);
        const same = (k: 'short' | 'dormant' | 'spill' | 'strained') => [...base[k]].sort().join() === [...o[k]].sort().join();
        if (f.change === 0 && /changes nothing/.test(f.text)) assert.ok(same('dormant') && same('spill') && base.night === o.night && base.seized <= o.seized, 'the pressure forecast lists no change');
        for (const w of A.worlds) if (new RegExp(`${w.short}[^.;]*would go thirsty`).test(f.text)) assert.ok(o.short.length > 0);
        const m = /^Three moments on, (\w+) has (\d+) (less|more) used water waiting/.exec(f.text);
        if (m) { const d = A.worlds.findIndex(w => w.short === m[1]); let x = g, y = g; for (let i = 0; i < 3 && !x.outcome; i++) x = advance(x, rest, A); for (let i = 0; i < 3 && !y.outcome; i++) y = advance(y, i ? rest : c, A);
          assert.equal(Math.abs(y.used[d] - x.used[d]), Number(m[2]), 'the stated difference in used water is exact'); assert.equal(y.used[d] < x.used[d], m[3] === 'less'); eased++; }
        checked++;
      }
      const L = legal(g); g = advance(g, r() < 0.6 ? rest : L[Math.floor(r() * L.length)], A);
    }
  }
  assert.ok(checked > 500); assert.ok(eased > 20, 'the quieter forecast line is exercised');
});

test('what is learned is learned by seeing it, once, and carries into the next journey', () => {
  let g = newGame(A); assert.deepEqual(g.known, []);
  g = advance(g, rest, A); assert.ok(g.known.includes('unobserved.mist') && g.last!.learned.includes('unobserved.mist'), 'mist is seen on the first open-sky moment');
  g = advance(g, rest, A); assert.ok(!g.last!.learned.includes('unobserved.mist'), 'and not announced twice');
  while (g.beat < A.dark[0]) g = advance(g, rest, A);
  assert.ok(['verdance.dark', 'ember.heat', 'unobserved.dark'].every(k => g.known.includes(k)), 'the dark shows what each world becomes in it');
  const again = newGame(A, g.known); assert.deepEqual(again.known, g.known);
  const all = new Set(A.worlds.flatMap(w => w.traits.map(t => t.id))); for (const k of g.known) assert.ok(all.has(k));
});

test('saved journeys replay exactly, and impossible or malformed choices are refused', () => {
  const J = json('./journeys.json'); const a = replay(J['two-currents'].actions, A), b = replay(J['two-currents'].actions, A); assert.deepEqual(a, b);
  for (const bad of [null, {}, { type: 'strike' }, { type: 'connect' }, { type: 'connect', edge: 99 }, { type: 'care', world: -1 }, { type: 'ability', world: 2, target: 2 }]) assert.equal(validChoice(bad, A), false);
  assert.throws(() => replay([{ type: 'mediate' }], A), /No one is reaching/);
  const un = id('unobserved'), full = advance(newGame(A), { type: 'connect', edge: edgeOf(un, id('verdance'), A) }, A);
  assert.match(unavailable(full, { type: 'connect', edge: edgeOf(un, id('ember'), A) }, A)!, /no free port/);
  assert.match(unavailable(newGame(A), { type: 'ability', world: id('prism') }, A)!, /Choose where/);
  const r = recount(J.any.actions, A); assert.equal(r.game.outcome, 'dawn'); assert.ok(r.points.length > 0 && r.points.every(p => p.moment >= 1 && p.moment <= A.length));
  assert.ok(tell(r.game.last!, r.game, A).length > 0);
});

test('expansion scaffold: arenas of 3, 8 and 16 worlds run and conserve water (sizing only, not balance)', () => {
  for (const n of [3, 8, 16]) {
    const worlds = Array.from({ length: n }, (_, i) => ({ ...A.worlds[i % A.worlds.length], id: `w${i}`, traits: [] }));
    const arena: ArenaDef = { ...A, id: `fixture-${n}`, worlds }; assertArena(arena);
    assert.equal(pairs(arena).length, (n * (n - 1)) / 2);
    pairs(arena).forEach(([x, y], e) => assert.equal(edgeOf(x, y, arena), e));
    const r = rnd(n * 7 + 1); let g = newGame(arena), steps = 0;
    while (!g.outcome && steps < 40) { const opts: Choice[] = [rest, { type: 'connect', edge: Math.floor(r() * pairs(arena).length) }, { type: 'care', world: Math.floor(r() * n) }, { type: 'ability', world: Math.floor(r() * n), target: Math.floor(r() * n) }, { type: 'ability', world: Math.floor(r() * n) }];
      const c = opts[Math.floor(r() * opts.length)]; g = advance(g, unavailable(g, c, arena) ? rest : c, arena); books(g, arena); steps++; }
    assert.ok(steps >= 4);
  }
  assert.throws(() => assertArena({ ...A, worlds: A.worlds.slice(0, 2) }), /roster/);
});

test('all remix arenas validate, conserve water, and reach dawn; medals reflect run performance', async () => {
  const { ARENAS } = await import('../src/arenas.ts');
  const { medalsOf, RESONANCE_GOAL } = await import('../src/telling.ts');
  assert.ok(ARENAS.length >= 4);
  for (const arena of ARENAS) {
    assertArena(arena);
    const r = rnd(arena.id.length * 131 + 7); let g = newGame(arena);
    while (!g.outcome) {
      const P2 = pairs(arena);
      const opts: Choice[] = [rest, { type: 'connect', edge: Math.floor(r() * P2.length) }, { type: 'care', world: Math.floor(r() * arena.worlds.length) }];
      const c = opts[Math.floor(r() * opts.length)];
      g = advance(g, unavailable(g, c, arena) ? rest : c, arena);
      books(g, arena);
    }
  }
  const J = json('./journeys.json') as Record<string, { actions: Choice[] }>;
  const pure = medalsOf(J['no-tending'].actions, A);
  assert.equal(pure.find(m => m.id === 'dawn')!.status, 'earned');
  assert.equal(pure.find(m => m.id === 'pure-network')!.status, 'earned');
  assert.equal(pure.find(m => m.id === 'resonant')!.status, 'earned');
  const one = medalsOf(J['one-current'].actions, A);
  assert.equal(one.find(m => m.id === 'dawn')!.status, 'earned');
  assert.equal(one.find(m => m.id === 'resonant')!.status, 'missed', `one-current resonance stays below ${RESONANCE_GOAL}`);
});
