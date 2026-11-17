// Run with: npm test   (node --test test/*.test.ts)
// Three kinds of test: hand-computed tables (expected values worked out by hand, in the comments),
// property sweeps over thousands of random runs, and one case per rule branch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BASE, withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import type { World } from '../src/world.ts';
import { playSequence, HIDE, listen, signal, strike, initState, historyRound, step, blankRecord } from '../src/engine.ts';
import { solve, bruteForceWins } from '../src/search.ts';
import { playBot, BOTS } from '../src/bots.ts';
import { mulberry32 } from '../src/rng.ts';

// A hand-built world: six districts, need 6/5/5/5/5/5 every round (total 31), reserves 5 each
// (at or above the comfort level of 4, so nobody refills), river 70. Break-even flow = 70 - 31 = 39.
function handWorld(family: Family[], over: Partial<World> = {}): World {
  const row = [6, 5, 5, 5, 5, 5];
  return {
    seed: 0, supply: 70, needs: Array.from({ length: 7 }, () => row.slice()), reserve0: [5, 5, 5, 5, 5, 5], family,
    priority: [0, 1, 2, 3, 4, 5], relayOrder: [0, 1, 2, 3, 4, 5].map((d) => [0, 1, 2, 3, 4, 5].filter((x) => x !== d)), ...over,
  };
}
const ALL = (f: Family): Family[] => [f, f, f, f, f, f];
const QUIET = withParams({ autonomous: false });

// ---- Hand-computed tables --------------------------------------------------------------------
test('table: doing nothing leaves the river at break-even', () => {
  const run = playSequence(handWorld(ALL('E')), QUIET, [HIDE, HIDE]);
  assert.deepEqual(run.records.map((r) => r.flow), [39, 39, 39]);
});

test('table: STRIKE is +3 now, then the district claws back 4 next round', () => {
  // Round 1, strike A (need 6): planned 6, prevented 5, takes 1, 2 destroyed.
  //   flow = 70 - (1 + 25) - 2 = 42  (+3 against 39). A is short 5, covers it from its reserve (5 -> 0).
  // Round 2: A has reserve 0 (< 4) so it wants refill 1 + catch-up 3: takes 6 + 4 = 10.
  //   flow = 70 - (10 + 25) = 35  (-4). A's reserve ends at 4.
  const run = playSequence(handWorld(ALL('E')), QUIET, [strike(0), HIDE]);
  assert.equal(run.records[1].flow, 42);
  assert.equal(run.records[1].river[0], 1);
  assert.equal(run.records[1].destroyed, 2);
  assert.equal(run.records[1].unmet[0], 0);
  assert.equal(run.records[1].reserveAfter[0], 0);
  assert.equal(run.records[2].flow, 35);
  assert.equal(run.records[2].river[0], 10);
  assert.equal(run.records[2].reserveAfter[0], 4);
});

test('table: an accepted SIGNAL is +4, then +1 as the reserve runs dry, then -1 while it refills', () => {
  // Round 1: A covers min(4, need 6, reserve 5) = 4 from reserve, takes 2. flow = 70 - 27 = 43. Reserve 1.
  // Round 2: covers min(4, 6, 1) = 1, takes 5. flow = 40. Reserve 0.
  // Round 3: agreement over, reserve 0 < 4 so refill +1: takes 7. flow = 38.
  const run = playSequence(handWorld(ALL('R')), QUIET, [signal(0), HIDE, HIDE]);
  assert.equal(run.records[1].signalResp, 'accepted');
  assert.deepEqual(run.records.slice(1).map((r) => r.flow), [43, 40, 38]);
  assert.deepEqual(run.records.slice(1).map((r) => r.upheld[0]), [true, true, null]);
});

test('table: a strike on a district with almost no reserve causes serious unmet need', () => {
  // A starts at reserve 0. History round: it refills (+1), so it enters round 1 with reserve 1.
  // Round 1: still below comfort, plans 6 + 1 = 7, loses 5, takes 2. Need 6 -> 4 short,
  // 1 covered by the last of its reserve -> 3 units unmet (>= 2 = serious).
  const run = playSequence(handWorld(ALL('E'), { reserve0: [0, 5, 5, 5, 5, 5] }), QUIET, [strike(0)]);
  assert.equal(run.records[0].reserveAfter[0], 1);
  assert.equal(run.records[1].unmet[0], 3);
  assert.equal(run.records[1].distress[0], true);
});

test('table: exposure moves L 0 / SIGNAL +2 / STRIKE +3 / HIDE -2 and stays within 0..4', () => {
  const run = playSequence(handWorld(ALL('E')), QUIET, [listen(0), signal(0), strike(1), HIDE, HIDE, HIDE]);
  assert.deepEqual(run.records.slice(1).map((r) => r.exposure), [0, 2, 4, 2, 0, 0]);
});

// ---- One case per rule branch ----------------------------------------------------------------
test('branch: who accepts a SIGNAL', () => {
  const reply = (w: World, actions: number[]) => playSequence(w, QUIET, actions).records.at(-1)!.signalResp;
  assert.equal(reply(handWorld(ALL('R')), [signal(0)]), 'accepted');
  assert.equal(reply(handWorld(ALL('R'), { reserve0: [0, 5, 5, 5, 5, 5] }), [signal(0)]), 'lacks'); // reserve 1 after the history round, below 2
  assert.equal(reply(handWorld(ALL('E')), [signal(0)]), 'declined'); // Extractive with reserve 5 (< 8)
  assert.equal(reply(handWorld(ALL('E'), { reserve0: [8, 5, 5, 5, 5, 5] }), [signal(0)]), 'accepted'); // cheap for it
  assert.equal(reply(handWorld(ALL('P')), [signal(0)]), 'accepted'); // Preemptive, station has never struck
  assert.equal(reply(handWorld(['P', 'E', 'E', 'E', 'E', 'E']), [strike(1), HIDE, HIDE, signal(0)]), 'declined'); // station has struck someone
});

test('branch: a struck Reciprocal district declines later offers', () => {
  const run = playSequence(handWorld(['R', 'E', 'E', 'E', 'E', 'E'], { reserve0: [9, 5, 5, 5, 5, 5] }), QUIET, [strike(0), HIDE, HIDE, signal(0)]);
  assert.equal(run.records[4].signalResp, 'declined');
});

test('branch: who attacks the station', () => {
  const hits = (w: World, actions: number[]) => playSequence(w, QUIET, actions).records.slice(1).map((r) => r.attackers.length);
  assert.deepEqual(hits(handWorld(ALL('P')), [signal(0)]), [0]);              // exposure 2, no strike history: safe
  assert.deepEqual(hits(handWorld(ALL('P')), [signal(0), signal(1)]), [0, 1]); // exposure 4: Preemptive attacks
  assert.deepEqual(hits(handWorld(ALL('E')), [strike(0), strike(1)]), [0, 0]); // Extractive never attacks
  assert.deepEqual(hits(handWorld(['R', 'E', 'E', 'E', 'E', 'E']), [strike(0), HIDE, signal(1)]), [1, 0, 1]); // grudge, whenever targetable
  assert.deepEqual(hits(handWorld(['E', 'P', 'E', 'E', 'E', 'E']), [strike(0)]), [1]); // a Preemptive bystander reacts to any strike
});

test('branch: retaliation resolves in the same round, so a round-six strike is not free', () => {
  const w = handWorld(['R', 'R', 'R', 'E', 'E', 'E'], { reserve0: [9, 9, 9, 9, 9, 9] });
  // Each strike on a Reciprocal district is answered at once (exposure 3). Two HIDEs bring exposure
  // back to 0 before the next. Third hit lands in round 6: integrity 3 -> 0.
  const run = playSequence(w, QUIET, [strike(0), HIDE, HIDE, strike(1), HIDE, strike(2)]);
  assert.deepEqual(run.records.slice(1).map((r) => r.integrity), [2, 2, 2, 1, 1, 0]);
  assert.equal(run.status, 'lost');
  assert.deepEqual(run.causes, ['station']);
  assert.equal(run.records.at(-1)!.round, 6);
});

test('branch: one HIDE from exposure 4 leaves the station targetable', () => {
  // Found while writing the test above: strike, hide, strike, hide leaves exposure at 2, and a
  // district holding a grievance attacks whenever the station is targetable.
  const w = handWorld(['R', 'R', 'R', 'E', 'E', 'E'], { reserve0: [9, 9, 9, 9, 9, 9] });
  const run = playSequence(w, QUIET, [HIDE, strike(0), HIDE, strike(1), HIDE]);
  assert.deepEqual(run.records.slice(1).map((r) => r.exposure), [0, 3, 1, 4, 2]);
  assert.deepEqual(run.records.slice(1).map((r) => r.attackers.length), [0, 1, 0, 1, 1]);
  assert.equal(run.status, 'lost');
});

test('branch: Extractive breaks the second round of an agreement when its reserve drops below 6', () => {
  // Reserve 8 -> accepts; covers 4 in round 1 (reserve 4, below 6) -> defects in round 2.
  const run = playSequence(handWorld(ALL('E'), { reserve0: [8, 5, 5, 5, 5, 5] }), QUIET, [signal(0), HIDE]);
  assert.deepEqual([run.records[1].upheld[0], run.records[2].upheld[0]], [true, false]);
});

test('branch: basin failure rules', () => {
  // River 60 against total need 31 gives flow 29 every round: a 1-unit shortfall each round.
  const w = handWorld(ALL('E'), { supply: 60 });
  const consecutive = playSequence(w, QUIET, [HIDE, HIDE, HIDE]);
  assert.equal(consecutive.status, 'lost');
  assert.equal(consecutive.records.at(-1)!.round, 2); // second shortfall in a row
  const cumulative = playSequence(w, withParams({ autonomous: false, failure: { basinRule: 'cumulative', basinBuffer: 3 } }), [HIDE, HIDE, HIDE, HIDE, HIDE]);
  assert.equal(cumulative.status, 'lost');
  assert.equal(cumulative.records.at(-1)!.round, 4); // deficits 1+1+1 use the buffer of 3; the fourth breaks it
});

test('table: catch-up blunts a second strike on the same district', () => {
  // A enters round 1 with reserve 1 (see above). Round 1: 3 units unmet, reserve 0, catch-up 3 queued.
  // Round 2, struck again: plans 6 + refill 1 + catch-up 3 = 10, loses 5, takes 5. Only 1 unit unmet.
  // So with v0.3's numbers a single attacker cannot deprive a district two rounds running.
  const run = playSequence(handWorld(ALL('E'), { reserve0: [0, 5, 5, 5, 5, 5] }), QUIET, [strike(0), strike(0)]);
  assert.deepEqual([run.records[1].unmet[0], run.records[2].unmet[0]], [3, 1]);
  assert.deepEqual([run.records[1].distress[0], run.records[2].distress[0]], [true, false]);
  assert.equal(run.status, 'ongoing');
});

test('branch: district deprivation needs two serious rounds in a row', () => {
  // To reach the branch at all the strike has to be heavier than v0.3's: here it prevents up to 12.
  // Round 1: plans 7, takes 0, 6 short, 1 from reserve -> 5 unmet. Round 2: plans 10, takes 0 -> 6 unmet.
  const heavy = withParams({ autonomous: false, strike: { prevent: 12 } });
  const w = handWorld(ALL('E'), { reserve0: [0, 5, 5, 5, 5, 5] });
  const twice = playSequence(w, heavy, [strike(0), strike(0)]);
  assert.deepEqual(twice.causes, ['district']);
  assert.equal(twice.records.at(-1)!.round, 2);
  const spaced = playSequence(w, heavy, [strike(0), HIDE, strike(0)]);
  assert.equal(spaced.status, 'ongoing'); // serious, fine, serious: never two in a row
});

test('branch: a Reciprocal district that accepts relays the offer onward', () => {
  // A accepts, then uses the round's one autonomous slot to signal B, who also accepts.
  // Flow = 70 - (A takes 2) - (B takes 5 - 4 = 1) - 20 = 47.
  const run = playSequence(handWorld(ALL('R')), BASE_FIXED, [signal(0)]);
  assert.deepEqual(run.records[1].events, [{ type: 'signal', from: 0, to: 1, result: 'accepted', reason: 'relay' }]);
  assert.equal(run.records[1].flow, 47);
});

test('branch: Preemptive strikes a high extractor, and a Reciprocal victim strikes back once', () => {
  // B needs 9 (high band, >= 8). A is Preemptive and has the first slot.
  const needs = Array.from({ length: 7 }, () => [5, 9, 5, 5, 5, 5]);
  const w = handWorld(['P', 'R', 'E', 'E', 'E', 'E'], { needs, supply: 80 });
  const run = playSequence(w, BASE_FIXED, [HIDE, HIDE]);
  assert.deepEqual(run.records[1].events, [{ type: 'strike', from: 0, to: 1, reason: 'preemption' }]);
  assert.deepEqual(run.records[2].events, [{ type: 'strike', from: 1, to: 0, reason: 'retaliation' }]);
});
const BASE_FIXED = withParams({ autonomous: true });

// ---- Property sweeps -------------------------------------------------------------------------
function randomActions(seed: number, n: number) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => Math.floor(r() * 19));
}

test('sweep: water is conserved and every quantity stays in range (3,000 random runs, both failure rules)', () => {
  for (const rule of ['consecutive', 'cumulative'] as const) {
    const p = withParams({ failure: { basinRule: rule } });
    for (let seed = 1; seed <= 1500; seed++) {
      const w = makeWorld(seed, p);
      const run = playSequence(w, p, randomActions(seed + 7, 6));
      for (const r of run.records) {
        const taken = r.river.reduce((x, y) => x + y, 0);
        assert.equal(taken + r.destroyed + r.flow, w.supply, `ledger, seed ${seed} round ${r.round}`);
        assert.ok(r.flow >= 0);
        assert.ok(r.exposure >= 0 && r.exposure <= p.exposure.max);
        assert.ok(r.integrity <= p.integrity);
        r.reserveAfter.forEach((x) => assert.ok(x >= 0 && x <= p.reserve.max, `reserve ${x}`));
        r.unmet.forEach((x) => assert.ok(x >= 0));
        assert.ok(r.events.length <= 1, 'at most one autonomous event per round');
      }
    }
  }
});

test('sweep: the same seed and actions replay identically (500 runs)', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const acts = randomActions(seed, 6);
    const a = JSON.stringify(playSequence(makeWorld(seed, BASE), BASE, acts));
    const b = JSON.stringify(playSequence(makeWorld(seed, BASE), BASE, acts));
    assert.equal(a, b);
  }
});

test('sweep: baseline extraction does not leak the hidden family (300 worlds x 4 assignments)', () => {
  // With a passive station and no network events, the public record must be identical whatever
  // families the districts hold. Any difference would let a player read policy off the bands.
  for (let seed = 1; seed <= 300; seed++) {
    const pub = (fam?: Family[]) =>
      JSON.stringify(playSequence(makeWorld(seed, QUIET, fam), QUIET, [HIDE, HIDE, HIDE, HIDE, HIDE, HIDE]).records.map((r) => [r.flow, r.band, r.distress]));
    const ref = pub();
    for (const f of ['R', 'E', 'P'] as Family[]) assert.equal(pub(ALL(f)), ref, `seed ${seed} family ${f}`);
  }
});

test('sweep: the history round is identical under any family assignment, network on (300 worlds)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const h = (fam?: Family[]) => {
      const w = makeWorld(seed, BASE, fam);
      return JSON.stringify(historyRound(w, BASE, initState(w, BASE)));
    };
    assert.equal(h(ALL('P')), h(ALL('R')));
  }
});

test('sweep: the memoised search agrees with brute force on a three-round game (40 seeds, 6,859 sequences each)', () => {
  const p = withParams({ rounds: 3 });
  for (let seed = 1; seed <= 40; seed++) {
    const w = makeWorld(seed, p);
    assert.equal(solve(w, p).wins, bruteForceWins(w, p), `seed ${seed}`);
  }
});

test('sweep: no bot ever sees a hidden field, and every bot finishes every game (200 seeds)', () => {
  const hidden = ['river', 'need', 'unmet', 'reserveAfter', 'destroyed'];
  for (let seed = 1; seed <= 200; seed++) {
    const w = makeWorld(seed, BASE);
    for (const [name, bot] of Object.entries(BOTS)) {
      const spy = (o: any) => {
        for (const h of o.history) for (const k of hidden) assert.ok(!(k in h), `${name} saw ${k}`);
        return bot(o);
      };
      const r = playBot(w, BASE, spy);
      assert.ok(r.actions.length >= 1 && r.actions.length <= 6);
      r.actions.forEach((a) => assert.ok(Number.isInteger(a) && a >= 0 && a <= 18, `${name} played ${a}`));
    }
  }
});

test('regression: step() refuses to run on a finished game', () => {
  const w = handWorld(ALL('E'), { supply: 60 });
  const s = initState(w, QUIET);
  historyRound(w, QUIET, s);
  step(w, QUIET, s, HIDE, blankRecord(QUIET, 1, HIDE));
  step(w, QUIET, s, HIDE, blankRecord(QUIET, 2, HIDE));
  assert.equal(s.status, 'lost');
  assert.throws(() => step(w, QUIET, s, HIDE));
});
