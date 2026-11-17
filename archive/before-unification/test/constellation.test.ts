import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_ARENA, assertArena } from '../src/arenas.ts';
import { initialConstellation, advance, pairs, totalWater, replayConstellation, unavailable, activeAt, isLinked, bypassEdge, needs, weatherAt } from '../src/constellation.ts';
import type { Choice, Constellation } from '../src/constellation.ts';

const rest: Choice = { type: 'rest' };
function run(plan: Record<number, Choice>, until = 18) {
  let s = initialConstellation(); const history: Constellation[] = [];
  for (let beat = 1; beat <= until; beat++) { s = advance(s, plan[beat] ?? rest); history.push(s); }
  return { s, history };
}
const solo: Record<number, Choice> = { 4: { type: 'ability', world: 2 }, 7: { type: 'ability', world: 2 }, 8: { type: 'mediate' }, 10: { type: 'ability', world: 2 }, 11: { type: 'ability', world: 3 }, 16: { type: 'ability', world: 3 } };
const sparse: Record<number, Choice> = { 1: { type: 'connect', edge: 5 }, 8: { type: 'mediate' }, 10: { type: 'ability', world: 3 } };
const network: Record<number, Choice> = { 1: { type: 'connect', edge: 5 }, 2: { type: 'connect', edge: 0 }, 3: { type: 'connect', edge: 10 }, 4: { type: 'connect', edge: 13 } };
const shortage = (s: Constellation) => s.last!.unmet.reduce((x, y) => x + y, s.last!.basinUnmet);

test('orbit: water is conserved and inputs stay immutable through 2,000 varied legal decisions', () => {
  let seed = 42;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  let s = initialConstellation();
  for (let step = 0; step < 2000; step++) {
    const choices: Choice[] = [rest, { type: 'mediate' }, { type: 'interrupt' },
      ...FIRST_ARENA.worlds.flatMap((_, world) => [{ type: 'ability' as const, world }, { type: 'care' as const, world }]),
      ...pairs().flatMap((_, edge) => [{ type: 'connect' as const, edge }, { type: 'release' as const, edge }])];
    const legal = choices.filter(c => !unavailable(s, c)), snapshot = structuredClone(s);
    const next = advance(s, legal[random() % legal.length]);
    assert.deepEqual(s, snapshot);
    assert.equal(totalWater(next), totalWater(s) + next.last!.rain - next.last!.loss);
    assert.equal(next.last!.after, totalWater(next));
    assert.ok(next.basin >= 0 && next.basin <= FIRST_ARENA.basin.capacity);
    next.clean.forEach((n, d) => assert.ok(Number.isInteger(n) && n >= 0 && n <= FIRST_ARENA.worlds[d].capacity));
    assert.ok(next.used.every(n => Number.isInteger(n) && n >= 0));
    assert.ok(next.last!.transfers.every(t => Number.isInteger(t.amount) && t.amount > 0 && t.from !== t.to));
    s = next;
  }
});

test('orbit: a season can succeed without any alliance; cooperation reduces the required interventions', () => {
  for (const plan of [solo, sparse, network]) {
    const { s, history } = run(plan);
    assert.equal(s.dawn, true);
    assert.ok(history.every(s => shortage(s) === 0));
  }
  assert.equal(run(solo).s.links.filter(Boolean).length, 0);
  assert.equal(run(sparse).s.links.filter(Boolean).length, 1);
  assert.ok(Object.keys(sparse).length < Object.keys(solo).length);
  assert.ok(run(network).s.basin > run(sparse).s.basin);
});

test('orbit: passive play creates recoverable pressure, announced by a two-moment forecast', () => {
  const { history, s } = run({});
  const first = history.findIndex(s => shortage(s) > 0);
  assert.ok(first >= 2 && first < 12);
  const warned = history[first - 2];
  assert.ok(shortage(advance(advance(warned, rest), rest)) > 0);
  assert.equal(s.dawn, false);
  let recovering = s;
  for (let beat = 19; beat <= 36; beat++) {
    const plan = network[beat - 18] ?? rest;
    recovering = advance(recovering, unavailable(recovering, plan) ? rest : plan);
  }
  assert.equal(recovering.dawn, true);
  assert.equal(shortage(recovering), 0);
});

test('orbit: port limits and a private world’s single connection make topology a choice', () => {
  let s = advance(initialConstellation(), { type: 'connect', edge: 4 }); // Obsidian–Unobserved
  assert.match(unavailable(s, { type: 'connect', edge: 8 })!, /no free port/);
  assert.throws(() => advance(s, { type: 'connect', edge: 8 }), /no free port/);
  s = advance(s, { type: 'release', edge: 4 });
  assert.equal(unavailable(s, { type: 'connect', edge: 8 }), null);
  const next = advance(s, { type: 'connect', edge: 8 });
  assert.equal(next.links[8], true);
});

test('orbit: each world’s special rhythm has a distinct, finite effect', () => {
  const baseline = initialConstellation();
  baseline.used = [6, 6, 6, 6, 6, 6];
  const ordinary = advance(baseline, rest);
  const results = FIRST_ARENA.worlds.map((_, world) => advance(baseline, { type: 'ability', world }));
  assert.equal(results[0].last!.loss, ordinary.last!.loss + 1, 'shelter consumes stored water');
  assert.ok(results[1].last!.recovered > ordinary.last!.recovered, 'wetlands expand processing');
  assert.ok(results[2].used[2] < ordinary.used[2], 'forge improves its own recovery');
  assert.ok(results[3].clean[3] < ordinary.clean[3], 'Sanctum releases its reserve');
  assert.equal(results[4].bypass.length, 1, 'Prism opens a temporary path');
  assert.ok(results[5].last!.rain < ordinary.last!.rain && results[5].used[5] < ordinary.used[5], 'Unobserved trades mist for recovery');
  for (let d = 0; d < results.length; d++) {
    let s = results[d]; assert.equal(activeAt(s, d), true);
    assert.match(unavailable(s, { type: 'ability', world: d })!, /already active/);
    s = advance(advance(s, rest), rest);
    assert.equal(activeAt(s, d), false);
  }
});

test('orbit: bypass previews identify the actual recipient and expire without permanent port use', () => {
  let s = initialConstellation();
  const edge = bypassEdge(s, 4)!;
  s = advance(s, { type: 'ability', world: 4 });
  assert.equal(s.bypass[0].edge, edge); assert.equal(s.links[edge], false); assert.equal(isLinked(s, edge), true);
  s = advance(advance(s, rest), rest);
  assert.equal(isLinked(s, edge), false);
  assert.equal(s.links.filter(Boolean).length, 0);
});

test('orbit: an announced dispute offers restraint, intervention, connection or accepting harm', () => {
  const threatened = run({}, 7).s;
  assert.deepEqual(threatened.threat, { from: 0, to: 2, due: 8 });
  const passive = advance(threatened, rest), mediated = advance(threatened, { type: 'mediate' });
  assert.equal(passive.last!.loss, mediated.last!.loss + 2);
  assert.equal(mediated.threat, null);
  assert.ok(mediated.last!.transfers.some(t => t.from === 2 && t.to === 'basin' && t.amount === 2));
  const connected = advance(threatened, { type: 'connect', edge: 1 });
  assert.equal(connected.threat, null); assert.equal(connected.last!.loss, mediated.last!.loss);
  assert.ok(connected.last!.words.some(w => w.includes('protected by a shared current')));
  const interrupted = advance(threatened, { type: 'interrupt' });
  assert.equal(interrupted.last!.loss, mediated.last!.loss);
  assert.match(unavailable(interrupted, { type: 'connect', edge: 1 })!, /needs time/);
});

test('orbit: a shelter protects neighbours; interrupting closes the source’s actual connections', () => {
  let s = run({ 1: { type: 'connect', edge: 1 } }, 7).s;
  s.threat = { from: 4, to: 2, due: 8 };
  const sheltered = advance(s, { type: 'ability', world: 0 });
  assert.ok(sheltered.last!.words.some(w => w.includes('protected by a shelter')));
  assert.equal(sheltered.last!.loss, 2, 'one water for shelter, one for basin, none spilled');
  s.threat = { from: 0, to: 2, due: 8 };
  const stopped = advance(s, { type: 'interrupt' });
  assert.equal(stopped.links[1], false);
  let healed = advance(advance(stopped, rest), rest);
  assert.equal(healed.grievance[0] < healed.beat + 1, true);
});

test('orbit: invitations respect backlog and remembered exchange survives a released current', () => {
  const s = initialConstellation(); s.used[1] = 9;
  assert.match(unavailable(s, { type: 'connect', edge: 5 })!, /backlog/);
  let connected = advance(initialConstellation(), { type: 'connect', edge: 5 });
  connected = advance(connected, rest);
  assert.ok(connected.memory[5] > 0);
  const released = advance(connected, { type: 'release', edge: 5 });
  assert.equal(released.memory[5], connected.memory[5]); assert.equal(released.links[5], false);
});

test('orbit: priority care preserves the basin’s protected reserve and never overfills a world', () => {
  const s = initialConstellation(); s.basin = FIRST_ARENA.basin.reserve + FIRST_ARENA.basin.need;
  assert.match(unavailable(s, { type: 'care', world: 2 })!, /remaining water/);
  s.basin++; s.clean[2] = FIRST_ARENA.worlds[2].capacity - 1;
  const gifted = advance(s, { type: 'care', world: 2 });
  assert.equal(gifted.last!.transfers.find(t => t.from === 'basin' && t.to === 2)!.amount, 1);
  assert.equal(gifted.last!.basinUnmet, 0);
});

test('orbit: save replay, undo and action validation preserve exact decisions', () => {
  const journal = Array.from({ length: 18 }, (_, i) => solo[i + 1] ?? rest);
  const s = replayConstellation(JSON.parse(JSON.stringify(journal)));
  assert.deepEqual(s, run(solo).s);
  const undo = replayConstellation(journal.slice(0, -1));
  assert.deepEqual(advance(undo, journal.at(-1)!), s);
  for (const bad of [null, {}, { type: 'ability', world: 6 }, { type: 'connect', edge: 15 }, { type: 'care', world: NaN }, { type: 'interrupt' }]) assert.throws(() => replayConstellation([bad as Choice]));
  assert.throws(() => replayConstellation([{ type: 'ability', world: 2 }, { type: 'ability', world: 2 }]), /already active/);
});

test('orbit: rosters and seasons come from the arena, including repeated archetypes', () => {
  for (const n of [3, 8, 16]) {
    const a = structuredClone(FIRST_ARENA);
    a.id = `test-${n}`; a.encounter = null;
    a.worlds = Array.from({ length: n }, (_, d) => ({ ...FIRST_ARENA.worlds[d % 6], id: `world-${d}` }));
    assertArena(a);
    let s = initialConstellation(a);
    assert.equal(pairs(a).length, n * (n - 1) / 2);
    for (let beat = 1; beat <= 24; beat++) {
      const prior = totalWater(s); s = advance(s, rest, a);
      assert.equal(totalWater(s), prior + s.last!.rain - s.last!.loss);
      assert.equal(s.clean.length, n); assert.equal(s.last!.unmet.length, n);
    }
    assert.equal(needs(s, s.beat + 1, a).length, n);
    assert.throws(() => advance(s, rest), /Arena and save/);
  }
  const broken = structuredClone(FIRST_ARENA); broken.worlds[1].id = broken.worlds[0].id;
  assert.throws(() => initialConstellation(broken), /roster/);
  assert.equal(weatherAt(9), 'dry'); assert.equal(weatherAt(13), 'rain'); assert.equal(weatherAt(19), 'gentle');
});
