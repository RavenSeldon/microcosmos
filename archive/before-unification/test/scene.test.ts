// V0: the scene description. The leak test for everything visual lives here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { playSequence, HIDE, signal, listen } from '../src/engine.ts';
import { toPublic, THREAT_BOTS } from '../src/bots.ts';
import { evaluateBot } from '../src/evaluate.ts';
import { buildScene, THEMES } from '../web/scene.ts';
import { mulberry32 } from '../src/rng.ts';

const P = withParams({ preemption: 'threat', strikeMode: 'jam-once' });
const O = { rounds: 6, basinMin: 30, integrityMax: 3, exposureMax: 4, targetable: 2 };
const sceneOf = (seed: number, acts: number[], p = P, fam?: Family[]) => buildScene(seed, playSequence(makeWorld(seed, p, fam), p, acts).records.map(toPublic), O);

test('leak: the same public history gives the same scene whatever the hidden policies are (200 worlds x 3 assignments)', () => {
  // A passive station and no network events: the public record cannot depend on policy, so neither may the scene.
  const quiet = withParams({ preemption: 'threat', strikeMode: 'jam-once', autonomous: false });
  for (let seed = 1; seed <= 200; seed++) {
    const ref = JSON.stringify(sceneOf(seed, [HIDE, HIDE, HIDE], quiet));
    for (const f of ['R', 'E', 'P'] as Family[]) assert.equal(JSON.stringify(sceneOf(seed, [HIDE, HIDE, HIDE], quiet, [f, f, f, f, f, f])), ref, `seed ${seed} ${f}`);
  }
});

test('leak: a scene is a pure function of the world number and the public history (300 games)', () => {
  // Rebuild the history from JSON, keeping only the public fields, and the scene must not change.
  for (let seed = 1; seed <= 300; seed++) {
    const ev = evaluateBot(makeWorld(seed, P), P, Object.values(THREAT_BOTS)[seed % Object.keys(THREAT_BOTS).length]);
    const pub = ev.records.filter((r) => !r.inert).map(toPublic);
    const copy = JSON.parse(JSON.stringify(pub));
    for (const h of copy) for (const k of ['river', 'need', 'unmet', 'reserveAfter', 'reserveBefore', 'cover', 'emergency', 'stored', 'destroyed', 'conflict']) assert.ok(!(k in h));
    assert.deepEqual(buildScene(seed, copy, O), buildScene(seed, pub, O));
  }
});

test('leak: which planet-ship a district is drawn as does not track its policy (2,000 worlds)', () => {
  // Count theme by family. If the design carried policy, some cell would be far from the others.
  const count: Record<string, number[]> = { R: new Array(THEMES).fill(0), E: new Array(THEMES).fill(0), P: new Array(THEMES).fill(0) };
  for (let seed = 1; seed <= 2000; seed++) {
    const w = makeWorld(seed, P);
    const sc = sceneOf(seed, []);
    sc.systems.forEach((s, d) => count[w.family[d]][s.theme]++);
  }
  for (const f of ['R', 'E', 'P']) {
    const total = count[f].reduce((a, b) => a + b, 0);
    for (const c of count[f]) assert.ok(Math.abs(c / total - 1 / THEMES) < 0.03, `${f}: ${count[f].join(' ')}`);
  }
});

test('content: a threat, an offer and a listen each appear as a typed link', () => {
  let found = 0;
  for (let seed = 1000; seed < 1100 && !found; seed++) {
    const run = playSequence(makeWorld(seed, P), P, [HIDE]);
    const th = run.records[1].events.find((e) => e.type === 'threat');
    if (!th) continue;
    found = seed;
    const sc = buildScene(seed, run.records.map(toPublic), O);
    assert.deepEqual(sc.links.filter((l) => l.kind === 'threat'), [{ kind: 'threat', from: th.from, to: th.to }]);
    assert.ok(sc.systems[th.to].threatened && sc.systems[th.from].threatening);
  }
  assert.ok(found);
  assert.deepEqual(sceneOf(5, [signal(2)]).links.filter((l) => l.from === 'station'), [{ kind: 'offer', from: 'station', to: 2 }]);
  const heard = sceneOf(5, [listen(3)]);
  assert.deepEqual(heard.links.filter((l) => l.from === 'station'), [{ kind: 'listen', from: 'station', to: 3 }]);
  assert.equal(heard.systems[3].heard!.round, 1);
});

test('content: station and basin read straight from the public record; every world gets six ships, all six designs', () => {
  const r = mulberry32(9);
  for (let i = 0; i < 100; i++) {
    const seed = 1 + Math.floor(r() * 5000);
    const sc = sceneOf(seed, [signal(0), signal(1)]);
    assert.equal(sc.systems.length, 6);
    assert.equal(sc.station.exposure, 4);
    assert.equal(sc.station.targetable, true);
    assert.equal(sc.basin.short, sc.basin.flow < 30);
    sc.systems.forEach((s) => assert.ok(s.theme >= 0 && s.theme < THEMES && s.bandTrail.length === 3));
    assert.equal(new Set(sc.systems.map((s) => s.theme)).size, 6);
  }
});
