// G1b tests: the conditional threat (Ben's five-point rule, 14 Nov 2026) and the lane experiment.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import type { World } from '../src/world.ts';
import { playSequence, HIDE, signal, strike } from '../src/engine.ts';
import { evaluateSequence } from '../src/evaluate.ts';
import { solve, bruteForceWins } from '../src/search.ts';
import { THREAT_BOTS, BOTS } from '../src/bots.ts';
import { evaluateBot } from '../src/evaluate.ts';
import { mulberry32 } from '../src/rng.ts';

const THREAT = withParams({ preemption: 'threat' });
const THREAT_ISOLATED = withParams({ preemption: 'threat', slots: 'isolated' });
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const randomActions = (seed: number) => { const r = mulberry32(seed); return Array.from({ length: 6 }, () => Math.floor(r() * 19)); };

// Hand world. A is Preemptive and first in priority. B needs 9 a round (high band, >= 8); the
// rest need 5. Reserves 5 (at comfort, nobody refills). River 80.
function world(family: Family[], over: Partial<World> = {}): World {
  const row = [5, 9, 5, 5, 5, 5];
  return {
    seed: 0, supply: 80, needs: Array.from({ length: 7 }, () => row.slice()), reserve0: [5, 5, 5, 5, 5, 5], family,
    priority: [0, 1, 2, 3, 4, 5], relayOrder: [0, 1, 2, 3, 4, 5].map((d) => [0, 1, 2, 3, 4, 5].filter((x) => x !== d)), ...over,
  };
}
const kinds = (r: { events: { type: string; result?: string; reason?: string }[] }) => r.events.map((e) => [e.type, e.result ?? e.reason ?? ''].join(':'));

test('rule 1-2: a Preemptive district that sees a heavy extractor issues a public threat and does not strike', () => {
  const run = playSequence(world(['P', 'E', 'E', 'E', 'E', 'E']), THREAT, [HIDE]);
  assert.deepEqual(run.records[1].events, [{ type: 'threat', from: 0, to: 1 }]);
  assert.equal(run.records[1].river[1], 9); // B was not struck
  assert.equal(run.records[1].destroyed, 0);
  assert.deepEqual([run.final.threatFrom, run.final.threatTo], [0, 1]);
});

test('rule 3: next round, if the target still plans a heavy withdrawal, the strike proceeds', () => {
  // R2: B plans 9 (>= 8). Struck: loses 5, takes 4; 2 destroyed.
  const run = playSequence(world(['P', 'E', 'E', 'E', 'E', 'E']), THREAT, [HIDE, HIDE]);
  assert.deepEqual(run.records[2].events, [{ type: 'strike', from: 0, to: 1, reason: 'threat' }]);
  assert.equal(run.records[2].river[1], 4);
  assert.equal(run.records[2].destroyed, 2);
  assert.equal(run.records[2].conflict.executed, 1);
});

test('rule 3: the threat lapses by itself if the target is no longer heavy', () => {
  // B needs 9 in the history round and round 1, then 6 in round 2: planned 6 < 8.
  const needs = [[5, 9, 5, 5, 5, 5], [5, 9, 5, 5, 5, 5], [5, 6, 5, 5, 5, 5], [5, 6, 5, 5, 5, 5], [5, 6, 5, 5, 5, 5], [5, 6, 5, 5, 5, 5], [5, 6, 5, 5, 5, 5]];
  const run = playSequence(world(['P', 'E', 'E', 'E', 'E', 'E'], { needs }), THREAT, [HIDE, HIDE]);
  assert.equal(kinds(run.records[2])[0], 'lapse:cancelled');
  assert.equal(run.records[2].river[1], 6);
  assert.equal(run.records[2].conflict.cancelled, 1);
});

test('rule 4: an accepted SIGNAL to the target brings its withdrawal down and the threat is cancelled', () => {
  // B is Reciprocal with reserve 5: accepts, covers 4 of 9 from reserve, plans 5 < 8.
  const run = playSequence(world(['P', 'R', 'E', 'E', 'E', 'E']), THREAT, [HIDE, signal(1)]);
  assert.equal(run.records[2].signalResp, 'accepted');
  assert.equal(kinds(run.records[2])[0], 'lapse:cancelled');
  assert.equal(run.records[2].river[1], 5);
  assert.equal(run.records[2].destroyed, 0);
  assert.equal(run.records[2].conflict.executed, 0);
});

test('rule 4: a refused SIGNAL does not stop the strike', () => {
  // B is Extractive with reserve 5 (< 8): declines. Still plans 9.
  const run = playSequence(world(['P', 'E', 'E', 'E', 'E', 'E']), THREAT, [HIDE, signal(1)]);
  assert.equal(run.records[2].signalResp, 'declined');
  assert.deepEqual(run.records[2].events, [{ type: 'strike', from: 0, to: 1, reason: 'threat' }]);
});

test('rule 4: a STRIKE on the attacker interrupts the threat, at the usual price', () => {
  // The station strikes A. A cannot act, so B is not struck. A is Preemptive and the station has
  // now struck someone at exposure 3, so A hits the station in the same round.
  const run = playSequence(world(['P', 'E', 'E', 'E', 'E', 'E']), THREAT, [HIDE, strike(0)]);
  assert.equal(kinds(run.records[2])[0], 'lapse:interrupted');
  assert.equal(run.records[2].river[1], 9);        // B untouched
  assert.equal(run.records[2].river[0], 0);        // A lost its 5
  assert.equal(run.records[2].conflict.interrupted, 1);
  assert.deepEqual(run.records[2].attackers, [0]);
  assert.equal(run.records[2].integrity, 2);
});

test('rule 4: a STRIKE on the target does not cancel the threat, because the test is its planned withdrawal', () => {
  // B still plans 9, so A strikes too: B loses 5 to the station and its remaining 4 to A.
  const run = playSequence(world(['P', 'E', 'E', 'E', 'E', 'E']), THREAT, [HIDE, strike(1)]);
  assert.equal(run.records[2].conflict.executed, 1);
  assert.equal(run.records[2].river[1], 0);
  assert.equal(run.records[2].destroyed, 4);
});

test('rule 5: every threat ends as exactly one of executed, cancelled, interrupted or still pending (4,000 runs, both lane modes)', () => {
  for (const p of [THREAT, THREAT_ISOLATED]) {
    for (let seed = 1; seed <= 2000; seed++) {
      const { ledger: L } = evaluateSequence(makeWorld(seed, p), p, randomActions(seed + 3));
      const c = L.conflict;
      assert.equal(c.threatsIssued, c.executed + c.cancelled + c.interrupted + c.threatOutstanding, `seed ${seed}`);
      assert.equal(c.unprovoked, 0, 'the G1b rule never strikes a heavy extractor without warning');
      assert.equal(c.strikes, c.executed + c.retaliation + c.provoked);
    }
  }
});

test('rule 5: a threat issued in round six is recorded as outstanding', () => {
  // B is quiet until the last two rounds: need 5, then 9 in round 5 (seen) so A threatens in round 6.
  const needs = [[5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5], [5, 5, 5, 5, 5, 5], [5, 9, 5, 5, 5, 5], [5, 9, 5, 5, 5, 5]];
  const { ledger: L } = evaluateSequence(world(['P', 'E', 'E', 'E', 'E', 'E'], { needs }), THREAT, [HIDE, HIDE, HIDE, HIDE, HIDE, HIDE]);
  assert.equal(L.conflict.threatsIssued, 1);
  assert.equal(L.conflict.threatOutstanding, 1);
  assert.equal(L.conflict.strikes, 0);
});

test('sweep: water and reserves balance under the G1b rule, and runs replay identically (1,500 runs)', () => {
  for (let seed = 1; seed <= 1500; seed++) {
    const p = seed % 2 ? THREAT : THREAT_ISOLATED;
    const w = makeWorld(seed, p);
    const acts = randomActions(seed + 17);
    const ev = evaluateSequence(w, p, acts);
    for (const r of ev.records) {
      assert.equal(sum(r.river) + r.destroyed + r.flow, w.supply);
      for (let d = 0; d < 6; d++) {
        assert.equal(r.river[d] - r.stored[d] + r.cover[d] + r.emergency[d] + r.unmet[d], r.need[d]);
        assert.equal(r.reserveBefore[d] - r.cover[d] - r.emergency[d] + r.stored[d], r.reserveAfter[d]);
      }
      const hostile = r.events.filter((e) => e.type === 'strike').length;
      const threats = r.events.filter((e) => e.type === 'threat').length;
      const relays = r.events.filter((e) => e.type === 'signal').length;
      assert.ok(hostile <= 1 && threats <= 1 && relays <= 1);
      if (p === THREAT) assert.ok(hostile + threats + relays <= 1, 'shared slot: one network act per round (a lapse is not an act)');
    }
    assert.equal(JSON.stringify(evaluateSequence(makeWorld(seed, p), p, acts).records), JSON.stringify(ev.records));
  }
});

test('sweep: the search still agrees with brute force once a pending threat is part of the state (30 seeds x 2 modes)', () => {
  for (const base of [THREAT, THREAT_ISOLATED]) {
    const p = withParams({ rounds: 3 }, base);
    for (let seed = 1; seed <= 30; seed++) {
      const w = makeWorld(seed, p);
      assert.equal(solve(w, p).wins, bruteForceWins(w, p), `seed ${seed}`);
    }
  }
});

test('lanes: with separate lanes a relay and a hostile act can happen in the same round; with one shared slot they cannot', () => {
  let together = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const p = withParams({ slots: 'isolated' });
    const ev = evaluateBot(makeWorld(seed, p), p, BOTS['cooperate, hide when exposed']);
    for (const r of ev.records) if (r.events.some((e) => e.type === 'strike') && r.events.some((e) => e.type === 'signal')) together++;
    const shared = evaluateBot(makeWorld(seed, BASE), BASE, BOTS['cooperate, hide when exposed']);
    for (const r of shared.records) assert.ok(r.events.length <= 1);
  }
  assert.ok(together > 0);
});

test('bots: under the baseline rule there are never threats, so the threat-reading bots reduce to their fallbacks (100 seeds)', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const w = makeWorld(seed, BASE);
    const a = evaluateBot(w, BASE, THREAT_BOTS['defuse by signal']);
    const b = evaluateBot(w, BASE, BOTS['cooperate, hide when exposed']);
    assert.deepEqual(a.actions, b.actions);
    assert.equal(a.ledger.conflict.threatsIssued, 0);
  }
});
