// Offensive-action comparison (experiment only): one branch test per candidate, plus search checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import type { World } from '../src/world.ts';
import { playSequence, HIDE, strike, listen } from '../src/engine.ts';
import { solve, bruteForceWins } from '../src/search.ts';

const T = (m: any) => withParams({ preemption: 'threat', strikeMode: m });
function world(family: Family[], over: Partial<World> = {}): World {
  const row = [5, 9, 5, 5, 5, 5];
  return { seed: 0, supply: 80, needs: Array.from({ length: 7 }, () => row.slice()), reserve0: [5, 5, 5, 5, 5, 5], family,
    priority: [0, 1, 2, 3, 4, 5], relayOrder: [0, 1, 2, 3, 4, 5].map((d) => [0, 1, 2, 3, 4, 5].filter((x) => x !== d)), ...over };
}
const W = () => world(['P', 'E', 'E', 'E', 'E', 'E']); // A threatens B in round 1

test('jam: interdiction stops the threat and touches no water; the jammed Preemptive district answers', () => {
  for (const m of ['jam', 'jam-soft']) {
    const r = playSequence(W(), T(m), [HIDE, strike(0)]).records[2];
    assert.equal(r.conflict.interrupted, 1);
    assert.equal(r.destroyed, 0);
    assert.equal(r.river[0], 5); // A still draws its need
    assert.equal(r.river[1], 9); // B untouched
    assert.deepEqual(r.attackers, [0]);
  }
});

test('jam-soft: a Preemptive bystander does not hold it against the station; under jam it does', () => {
  // A (Preemptive) threatens B; C is also Preemptive. The station jams A, hides twice, then signals D (exposure 2).
  const w = world(['P', 'E', 'P', 'E', 'E', 'E'], { priority: [0, 1, 2, 3, 4, 5] });
  const acts = [HIDE, strike(0), HIDE, HIDE, 6 + 3];
  const hard = playSequence(w, T('jam'), acts).records[5].attackers;
  const soft = playSequence(w, T('jam-soft'), acts).records[5].attackers;
  assert.ok(hard.length === 1);          // someone hits: the station "has struck"
  assert.deepEqual(soft, [0]);           // only the jammed district, which holds the grievance
});

test('shield: the station takes the blow: 1 integrity, no water lost, the target untouched', () => {
  const r = playSequence(W(), T('shield'), [HIDE, strike(1)]).records[2];
  assert.equal(r.conflict.absorbed, 1);
  assert.equal(r.integrity, 2);
  assert.equal(r.destroyed, 0);
  assert.equal(r.river[1], 9);
  assert.equal(r.exposure, 2);
});

test('reveal: needs an earlier LISTEN; a district shown to be short has its threat withdrawn for good', () => {
  const thin = () => world(['P', 'E', 'E', 'E', 'E', 'E'], { reserve0: [5, 0, 5, 5, 5, 5] });
  const unheard = playSequence(thin(), T('reveal'), [HIDE, strike(1)]).records[2];
  assert.equal(unheard.conflict.executed, 1); // no LISTEN first: the reveal does nothing
  const run = playSequence(thin(), T('reveal'), [listen(1), strike(1), HIDE, HIDE, HIDE, HIDE]);
  assert.equal(run.records[2].conflict.cancelled, 1);
  assert.equal(run.records[2].conflict.executed, 0);
  assert.equal(run.records.slice(2).reduce((n, r) => n + r.conflict.threatsIssued, 0), 0); // never threatened again
});

test('reveal: a district shown to hold 8 or more conserves for two rounds and resents the station', () => {
  const w = world(['E', 'R', 'E', 'E', 'E', 'E'], { reserve0: [5, 10, 5, 5, 5, 5] });
  const run = playSequence(w, withParams({ preemption: 'threat', strikeMode: 'reveal', autonomous: false }), [listen(1), strike(1), HIDE]);
  assert.equal(run.records[2].river[1], 5);   // 9 needed, 4 from reserve
  assert.equal(run.records[2].upheld[1], true);
  assert.deepEqual(run.records[2].attackers, [1]); // Reciprocal with a grievance, station at exposure 3
});

test('search agrees with brute force under every candidate (three-round game, 15 seeds each)', () => {
  for (const m of ['jam', 'jam-soft', 'shield', 'reveal']) {
    const p = withParams({ rounds: 3 }, T(m));
    for (let seed = 1; seed <= 15; seed++) { const w = makeWorld(seed, p); assert.equal(solve(w, p).wins, bruteForceWins(w, p), `${m} seed ${seed}`); }
  }
});

test('G1c: the Shared Dawn search agrees with brute force (three-round game, 2 modes x 20 seeds)', async () => {
  const { solveDawn } = await import('../src/search.ts');
  const { initState, historyRound, cloneState, step, kindOf } = await import('../src/engine.ts');
  for (const m of ['strike', 'jam']) {
    const p = withParams({ rounds: 3 }, T(m));
    for (let seed = 1; seed <= 20; seed++) {
      const w = makeWorld(seed, p);
      let dawn = false, noThird = false, survive = false;
      const rec = (s: any, clean: boolean, usedK: boolean) => {
        for (let a = 0; a < 19; a++) {
          const c = cloneState(s); step(w, p, c, a, null);
          if (c.status === 'lost') continue;
          const cl = clean && !c.depConsec.some((x: number) => x > 0), k = usedK || kindOf(a) === 'K';
          if (c.status === 'won') { survive = true; if (cl) { dawn = true; if (!k) noThird = true; } } else rec(c, cl, k);
        }
      };
      const s0 = initState(w, p); historyRound(w, p, s0); rec(s0, true, false);
      const r = solveDawn(w, p);
      assert.deepEqual([r.survivable, r.dawn, r.dawnWithoutThird], [survive, dawn, noThird], `${m} seed ${seed}`);
    }
  }
});

// ---- G1d: one retaliation per STRIKE ---------------------------------------------------------
const ONCE = T('jam-once');
test('G1d: the struck district hits back once, in that round, and an old grievance never triggers another attack', () => {
  // A (Preemptive) threatens B. R2 strike A: A answers at once. R3 hide. R4 signal D: exposure 3, still targetable.
  const run = playSequence(W(), ONCE, [HIDE, strike(0), HIDE, 6 + 3, HIDE, HIDE]);
  assert.deepEqual(run.records.slice(1).map((r) => r.attackers.length), [0, 1, 0, 0, 0, 0]);
  assert.deepEqual(run.records.slice(1).map((r) => r.exposure), [0, 3, 1, 3, 1, 0]);
  assert.equal(run.final.integrity, 2);
  // Under the uncapped rule the same game is hit again in round 4.
  assert.equal(playSequence(W(), T('jam'), [HIDE, strike(0), HIDE, 6 + 3]).records[4].attackers.length, 1);
});

test('G1d: a second STRIKE earns a second response; Extractive never responds', () => {
  const two = playSequence(W(), ONCE, [HIDE, strike(0), HIDE, HIDE, strike(0), HIDE]);
  assert.deepEqual(two.records.slice(1).map((r) => r.attackers.length), [0, 1, 0, 0, 1, 0]);
  assert.equal(playSequence(W(), ONCE, [strike(1)]).records[1].attackers.length, 0); // B is Extractive
});

test('G1d: the grievance persists where it should: the struck district refuses offers, and a Preemptive one refuses the station', () => {
  const w = world(['P', 'R', 'P', 'E', 'E', 'E']);
  const run = playSequence(w, withParams({ preemption: 'threat', strikeMode: 'jam-once', autonomous: false }), [strike(1), HIDE, HIDE, 6 + 1, HIDE, 6 + 2]);
  assert.equal(run.records[4].signalResp, 'declined'); // B was struck
  assert.equal(run.records[6].signalResp, 'declined'); // C is Preemptive and the station has struck someone
});

test('G1d: exposure-based attacks remain: a Preemptive district still hits a station at exposure 4', () => {
  const run = playSequence(world(['E', 'E', 'P', 'E', 'E', 'E']), withParams({ preemption: 'threat', strikeMode: 'jam-once', autonomous: false }), [6 + 0, 6 + 1]);
  assert.equal(run.records[2].exposure, 4);
  assert.deepEqual(run.records[2].attackers, [2]);
});

test('G1d: search agrees with brute force (three-round game, 20 seeds)', () => {
  const p = withParams({ rounds: 3 }, ONCE);
  for (let seed = 1; seed <= 20; seed++) { const w = makeWorld(seed, p); assert.equal(solve(w, p).wins, bruteForceWins(w, p)); }
});
