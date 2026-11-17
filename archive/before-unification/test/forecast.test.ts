// P1: forecasts. They may use only what the player can see, and what they call "known" must happen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { playSequence, HIDE, signal, strike, kindOf, targetOf } from '../src/engine.ts';
import { toPublic, THREAT_BOTS } from '../src/bots.ts';
import { evaluateBot } from '../src/evaluate.ts';
import { ACTIONS } from '../src/roster.ts';
import { preview, situation } from '../web/forecast.ts';
import { beatsOf } from '../web/beats.ts';
import { mulberry32 } from '../src/rng.ts';

const P = withParams({ preemption: 'threat', strikeMode: 'jam-once' });
const QUIET = withParams({ preemption: 'threat', strikeMode: 'jam-once', autonomous: false });
const all = (h: any[], p = P) => Array.from({ length: ACTIONS }, (_, a) => preview(a, h, p));

test('leak: identical public history gives identical forecasts whatever the hidden policies (200 worlds x 3 assignments x 19 actions)', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const pub = (f?: Family[]) => playSequence(makeWorld(seed, QUIET, f), QUIET, [HIDE, HIDE]).records.map(toPublic);
    const ref = JSON.stringify(all(pub(), QUIET));
    for (const f of ['R', 'E', 'P'] as Family[]) assert.equal(JSON.stringify(all(pub([f, f, f, f, f, f]), QUIET)), ref, `seed ${seed} ${f}`);
  }
});

test('leak: a forecast is a pure function of the public history (300 games, every round)', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const bot = Object.values(THREAT_BOTS)[seed % Object.keys(THREAT_BOTS).length];
    const recs = evaluateBot(makeWorld(seed, P), P, bot).records.filter((r) => !r.inert);
    for (let i = 1; i <= recs.length; i++) {
      const pub = recs.slice(0, i).map(toPublic);
      assert.deepEqual(all(JSON.parse(JSON.stringify(pub))), all(pub));
    }
  }
});

test('truth: every forecast claim marked known comes true in the engine (2,000 random games)', () => {
  let threatsStopped = 0, refusals = 0;
  for (let seed = 1; seed <= 2000; seed++) {
    const w = makeWorld(seed, P), r = mulberry32(seed * 7 + 1);
    const acts: number[] = [];
    let run = playSequence(w, P, acts);
    while (run.final.status === 'ongoing') {
      const a = Math.floor(r() * ACTIONS);
      const pub = run.records.map(toPublic);
      const f = preview(a, pub, P), s = situation(pub, P);
      acts.push(a);
      run = playSequence(w, P, acts);
      const rec = run.records[run.records.length - 1];
      assert.equal(rec.exposure, f.exposure.after, `exposure, seed ${seed}`);
      const k = kindOf(a), d = targetOf(a);
      if (k === 'L') assert.ok(rec.listen && rec.listen.need >= 1);
      if (k === 'G' && f.known.some((x) => x.includes('will not agree: you struck it'))) { assert.notEqual(rec.signalResp, 'accepted'); refusals++; }
      if (k === 'G' && rec.signalResp === 'accepted') assert.ok(rec.cover[d] <= f.basin.upTo);
      if (k === 'K') {
        assert.ok(!rec.events.some((e) => e.from === d && e.type !== 'lapse'), `struck district acted, seed ${seed}`);
        if (s.threat && s.threat.from === d) {
          // Stopped: no threatened strike lands. Reported as 'interrupted', or as 'cancelled' when it would have lapsed anyway.
          assert.ok(!rec.events.some((e) => e.type === 'strike' && e.reason === 'threat'));
          assert.ok(rec.events.some((e) => e.type === 'lapse' && e.from === s.threat!.from));
          threatsStopped++;
        }
      }
      if (k === 'H') assert.equal(rec.signalResp, undefined);
    }
  }
  assert.ok(threatsStopped > 20 && refusals > 20, `too few cases exercised: ${threatsStopped} stopped threats, ${refusals} refusals`);
});

test('beats: in resolution order, every network event shown, one water beat (1,000 games)', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const recs = evaluateBot(makeWorld(seed, P), P, Object.values(THREAT_BOTS)[seed % 8]).records.filter((r) => !r.inert);
    for (let i = 1; i < recs.length; i++) {
      const b = beatsOf(toPublic(recs[i]), { flow: recs[i - 1].flow, integrity: recs[i - 1].integrity }, 30);
      for (let j = 1; j < b.length; j++) assert.ok(b[j].phase >= b[j - 1].phase);
      assert.equal(b.filter((x) => x.kind === 'flow').length, 1);
      assert.equal(b.filter((x) => ['threat', 'lapse', 'interrupted', 'net-strike', 'relay'].includes(x.kind)).length, recs[i].events.length);
      assert.equal(b.filter((x) => x.kind === 'hit').length, recs[i].attackers.length);
    }
  }
});

test('forecast wording: a SIGNAL to a district you struck is known to fail; a STRIKE on the attacker is known to stop the threat', () => {
  let checked = 0;
  for (let seed = 1000; seed < 1400 && checked < 1; seed++) {
    const run = playSequence(makeWorld(seed, P), P, [HIDE]);
    const th = run.records[1].events.find((e) => e.type === 'threat');
    if (!th) continue;
    const pub = run.records.map(toPublic);
    assert.ok(preview(strike(th.from), pub, P).known.some((x) => x.startsWith(`This stops`)));
    const after = playSequence(makeWorld(seed, P), P, [HIDE, strike(th.from)]).records.map(toPublic);
    assert.ok(preview(signal(th.from), after, P).known[0].includes('will not agree'));
    checked++;
  }
  assert.equal(checked, 1);
});
