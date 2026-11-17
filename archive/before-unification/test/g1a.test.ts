// G1a acceptance tests: the consequence ledger and the fixed six-round evaluation.
// Each test names the acceptance criterion from the G1 Decision Record it answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BASE, withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import type { World } from '../src/world.ts';
import { playSequence, HIDE, signal, strike, initState, historyRound, stepInert } from '../src/engine.ts';
import { BOTS, playBot } from '../src/bots.ts';
import { evaluateBot, evaluateSequence } from '../src/evaluate.ts';
import { analyse, range } from '../src/analysis.ts';
import { mulberry32 } from '../src/rng.ts';

function handWorld(family: Family[], over: Partial<World> = {}): World {
  const row = [6, 5, 5, 5, 5, 5];
  return {
    seed: 0, supply: 70, needs: Array.from({ length: 7 }, () => row.slice()), reserve0: [5, 5, 5, 5, 5, 5], family,
    priority: [0, 1, 2, 3, 4, 5], relayOrder: [0, 1, 2, 3, 4, 5].map((d) => [0, 1, 2, 3, 4, 5].filter((x) => x !== d)), ...over,
  };
}
const ALL = (f: Family): Family[] => [f, f, f, f, f, f];
const QUIET = withParams({ autonomous: false });
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const randomActions = (seed: number) => { const r = mulberry32(seed); return Array.from({ length: 6 }, () => Math.floor(r() * 19)); };
// A six-action list always reaches the end of the game or loses first, so it is always long enough.

// ---- Criterion: "Original seeds remain reproducible" / "baseline rules and results unchanged" ----
const golden = JSON.parse(readFileSync(new URL('./golden/baseline-v0.3.json', import.meta.url), 'utf8'));

test('legacy: search and bot summary for seeds 1-25 is identical to the pre-G1a golden record', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(analyse(BASE, range(1, 25)))), golden.summary);
});

test('legacy: every bot plays the same actions to the same result as before G1a (60 seeds)', () => {
  for (const [name, bot] of Object.entries(BOTS)) {
    for (let seed = 1; seed <= 60; seed++) {
      const r = playBot(makeWorld(seed, BASE), BASE, bot);
      assert.deepEqual([r.won, r.causes.join('+'), r.actions.join(',')], golden.runs[name][seed - 1], `${name} seed ${seed}`);
    }
  }
});

test('legacy: the fixed-horizon evaluator reports the same game result as ordinary play (all bots, 300 seeds)', () => {
  for (const [name, bot] of Object.entries(BOTS)) {
    for (let seed = 1; seed <= 300; seed++) {
      const w = makeWorld(seed, BASE);
      const plain = playBot(w, BASE, bot);
      const ev = evaluateBot(w, BASE, bot);
      assert.equal(ev.ledger.legacy.outcome, plain.won ? 'won' : 'lost', `${name} seed ${seed}`);
      assert.deepEqual(ev.ledger.legacy.causes, plain.causes);
      assert.deepEqual(ev.actions, plain.actions);
      assert.equal(ev.ledger.legacy.endedRound, plain.actions.length);
    }
  }
});

// ---- Criterion: "Every unit of water is accounted for" ----------------------------------------
test('water: river, reserve transfers, destruction and flow all balance, inert rounds included (3,000 runs)', () => {
  for (let seed = 1; seed <= 3000; seed++) {
    const w = makeWorld(seed, BASE);
    const ev = evaluateSequence(w, BASE, randomActions(seed + 11));
    for (const r of ev.records) {
      assert.equal(sum(r.river) + r.destroyed + r.flow, w.supply, `river ledger, seed ${seed} round ${r.round}`);
      for (let d = 0; d < 6; d++) {
        // Where a district's need was met from: river (what it took, less what it stored), agreement
        // draw, emergency draw; the rest is unmet.
        assert.equal(r.river[d] - r.stored[d] + r.cover[d] + r.emergency[d] + r.unmet[d], r.need[d], `need, seed ${seed} round ${r.round} district ${d}`);
        assert.equal(r.reserveBefore[d] - r.cover[d] - r.emergency[d] + r.stored[d], r.reserveAfter[d], `reserve, seed ${seed} round ${r.round} district ${d}`);
        assert.ok(r.stored[d] >= 0 && r.cover[d] >= 0 && r.emergency[d] >= 0);
      }
    }
    // Round to round: what a district ends one round with is what it starts the next with.
    for (let i = 1; i < ev.records.length; i++) assert.deepEqual(ev.records[i].reserveBefore, ev.records[i - 1].reserveAfter);
  }
});

// ---- Criterion: "The cumulative hardship ledger equals the sum of the per-round records" -------
test('ledger: every total equals an independent sum over the six round records (1,000 runs)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const w = makeWorld(seed, BASE);
    const { ledger: L, records } = evaluateSequence(w, BASE, randomActions(seed + 23));
    const rounds = records.slice(1);
    for (let d = 0; d < 6; d++) {
      assert.equal(L.district.hardship[d], sum(rounds.map((r) => r.unmet[d])));
      assert.equal(L.district.agreementDraw[d], sum(rounds.map((r) => r.cover[d])));
      assert.equal(L.district.emergencyDraw[d], sum(rounds.map((r) => r.emergency[d])));
      // Stock and flow agree over the whole horizon.
      assert.equal(L.district.reserveFinal[d] - L.district.reserveInitial[d], L.district.stored[d] - L.district.agreementDraw[d] - L.district.emergencyDraw[d]);
    }
    assert.equal(L.basin.harm, sum(rounds.map((r) => Math.max(0, BASE.basinMin - r.flow))));
    assert.equal(L.destroyed, sum(rounds.map((r) => r.destroyed)));
    assert.equal(L.totals.hardship, sum(L.district.hardship));
    assert.equal(L.station.damage, BASE.integrity - L.station.finalIntegrity);
    assert.ok(L.station.finalIntegrity >= 0);
  }
});

// ---- Criterion: "Every policy has a comparable six-round evaluation window" --------------------
test('window: every bot is evaluated over exactly six rounds, and inert rounds are exactly those after the game ended (300 seeds)', () => {
  let early = 0;
  for (const [name, bot] of Object.entries(BOTS)) {
    for (let seed = 1; seed <= 300; seed++) {
      const ev = evaluateBot(makeWorld(seed, BASE), BASE, bot);
      assert.equal(ev.records.length, 7, `${name} seed ${seed}`); // history + six
      assert.equal(ev.ledger.roundsEvaluated, 6);
      ev.records.slice(1).forEach((r, i) => assert.equal(r.inert, i + 1 > ev.ledger.legacy.endedRound, `${name} seed ${seed} round ${i + 1}`));
      if (ev.ledger.legacy.endedRound < 6) early++;
    }
  }
  assert.ok(early > 0, 'the suite must include games that ended early, or this test proves nothing');
});

test('window: an inert round never changes the game result, and cannot run on a live game or past round six', () => {
  const w = handWorld(ALL('E'), { supply: 60 });
  const s = initState(w, QUIET);
  historyRound(w, QUIET, s);
  assert.throws(() => stepInert(w, QUIET, s)); // game still in play
  const ev = evaluateSequence(w, QUIET, [HIDE, HIDE]);
  assert.deepEqual(ev.ledger.legacy, { outcome: 'lost', causes: ['basin'], endedRound: 2 });
});

// ---- Hand-computed tables ----------------------------------------------------------------------
test('table: a game lost in round two is still accounted for through round six', () => {
  // River 60, total need 31: flow 29 every round, a 1-unit shortfall each round. The game ends at
  // round two; the world carries on. Basin harm over six rounds = 6 x 1 = 6.
  const { ledger: L } = evaluateSequence(handWorld(ALL('E'), { supply: 60 }), QUIET, [HIDE, HIDE]);
  assert.deepEqual(L.basin.flows, [29, 29, 29, 29, 29, 29]);
  assert.equal(L.basin.harm, 6);
  assert.equal(L.basin.shortRounds, 6);
  assert.equal(L.totals.hardship, 0);
  assert.equal(L.station.damage, 0);
});

test('table: hardship, forced reserve use and destruction from one strike', () => {
  // A enters round one with reserve 1 (it refilled in the history round).
  // R1 struck: plans 7, takes 2, 4 short, 1 from reserve -> 3 unmet. 2 destroyed. flow 70-27-2 = 41.
  // R2: refill 1 + catch-up 3: takes 10, stores 4. flow 35. After that it takes 6 a round.
  const w = handWorld(ALL('E'), { reserve0: [0, 5, 5, 5, 5, 5] });
  const { ledger: L } = evaluateSequence(w, QUIET, [strike(0), HIDE, HIDE, HIDE, HIDE, HIDE]);
  assert.equal(L.legacy.outcome, 'won');
  assert.equal(L.district.hardship[0], 3);
  assert.equal(L.district.emergencyDraw[0], 1);
  assert.equal(L.district.agreementDraw[0], 0);
  assert.equal(L.district.stored[0], 4);
  assert.deepEqual([L.district.reserveInitial[0], L.district.reserveFinal[0]], [1, 4]);
  assert.equal(L.destroyed, 2);
  assert.equal(L.basin.harm, 0);
  assert.deepEqual(L.basin.flows, [41, 35, 39, 39, 39, 39]);
});

test('table: an agreement is recorded as a chosen draw on reserve, not as hardship', () => {
  // R1 SIGNAL A (Reciprocal, reserve 5): covers 4, then 1; reserve 5 -> 1 -> 0. R3 on: refills 1 a round.
  const { ledger: L } = evaluateSequence(handWorld(ALL('R')), QUIET, [signal(0), HIDE, HIDE, HIDE, HIDE, HIDE]);
  assert.equal(L.district.agreementDraw[0], 5);
  assert.equal(L.district.emergencyDraw[0], 0);
  assert.equal(L.district.hardship[0], 0);
  assert.deepEqual([L.district.reserveInitial[0], L.district.reserveFinal[0]], [5, 4]); // 0 after R2, +1 in each of R3-R6
  assert.equal(L.district.stored[0], 4);
});

// ---- Criterion: "Final-round agreements and strikes preserve their outstanding obligations" ----
test('obligations: a round-six agreement leaves one committed round and the reserve it can still draw', () => {
  // R6 SIGNAL A: covers 4 this round (reserve 5 -> 1). One agreement round is still owed; it can draw at most 1.
  const { ledger: L } = evaluateSequence(handWorld(ALL('R')), QUIET, [HIDE, HIDE, HIDE, HIDE, HIDE, signal(0)]);
  assert.equal(L.legacy.outcome, 'won');
  assert.equal(L.obligations.agreementRounds[0], 1);
  assert.equal(L.obligations.agreementDrawCommitted[0], 1);
  assert.equal(L.district.reserveFinal[0], 1);
  assert.equal(L.totals.agreementRoundsOutstanding, 1);
});

test('obligations: a round-six strike leaves catch-up extraction owed', () => {
  // R6 STRIKE A: 5 prevented, so A will attempt 3 units of catch-up in a round that never comes.
  // Its reserve covered the gap (5 -> 0): no hardship, but the resilience is gone.
  const { ledger: L } = evaluateSequence(handWorld(ALL('E')), QUIET, [HIDE, HIDE, HIDE, HIDE, HIDE, strike(0)]);
  assert.equal(L.legacy.outcome, 'won');
  assert.equal(L.obligations.catchup[0], 3);
  assert.equal(L.totals.catchupOutstanding, 3);
  assert.equal(L.district.hardship[0], 0);
  assert.equal(L.district.emergencyDraw[0], 5);
  assert.equal(L.district.reserveFinal[0], 0);
});

test('obligations: nothing is owed after a quiet game', () => {
  const { ledger: L } = evaluateSequence(handWorld(ALL('E')), QUIET, [HIDE, HIDE, HIDE, HIDE, HIDE, HIDE]);
  assert.equal(L.totals.catchupOutstanding + L.totals.agreementRoundsOutstanding + L.totals.agreementDrawCommitted, 0);
});

test('regression: playSequence and the evaluator agree on the played rounds (500 runs)', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const w = makeWorld(seed, BASE);
    const acts = randomActions(seed + 5);
    const plain = playSequence(w, BASE, acts);
    const ev = evaluateSequence(w, BASE, acts);
    assert.equal(JSON.stringify(ev.records.slice(0, plain.records.length)), JSON.stringify(plain.records));
  }
});
