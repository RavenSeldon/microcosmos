// P3: each learning world must teach what its text says. If a rule change breaks a lesson, this fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withParams } from '../src/params.ts';
import { HIDE, signal, strike, listen, playSequence } from '../src/engine.ts';
import { evaluateSequence } from '../src/evaluate.ts';
import { solve, solveDawn } from '../src/search.ts';
import { SCENARIOS } from '../web/scenarios.ts';
import { endingOf } from '../web/view.ts';

const P = withParams({ preemption: 'threat', strikeMode: 'jam-once' });
const S = Object.fromEntries(SCENARIOS.map((s) => [s.id, s.world]));
const ending = (w: any, acts: number[]) => endingOf(evaluateSequence(w, P, acts).ledger).ending;
const H = HIDE;

test('The River: doing nothing collapses the basin; one SIGNAL to B, then hiding, reaches Shared Dawn through relays', () => {
  assert.equal(ending(S.river, [H, H, H, H, H, H]), 'long-night');
  assert.equal(ending(S.river, [signal(1), H, H, H, H, H]), 'shared-dawn');
  const r = playSequence(S.river, P, [signal(1), H]).records;
  assert.ok(r[1].events.some((e) => e.type === 'signal' && e.from === 1 && e.result === 'accepted'), 'B passes the offer on');
  assert.equal(solve(S.river, P).passiveWins, false);
});

test('Two Lights: listening shows A holds too little in round 1; asking D after listening reaches Shared Dawn', () => {
  assert.equal(ending(S.listening, [H, H, H, H, H, H]), 'long-night');
  const heard = playSequence(S.listening, P, [listen(0)]).records[1].listen!;
  assert.ok(heard.reserve < 2, `A holds ${heard.reserve}`);
  assert.equal(playSequence(S.listening, P, [signal(0)]).records[1].signalResp, 'lacks');
  assert.equal(ending(S.listening, [listen(0), signal(3), H, H, H, H]), 'shared-dawn');
});

test('The Threat: doing nothing leaves C in distress (Fragile Peace); striking E reaches Shared Dawn, which needs a strike', () => {
  const t1 = playSequence(S.threat, P, [H]).records[1];
  assert.ok(t1.events.some((e) => e.type === 'threat' && e.from === 4 && e.to === 2), 'E threatens C after round 1');
  assert.equal(ending(S.threat, [H, H, H, H, H, H]), 'fragile-peace');
  assert.notEqual(playSequence(S.threat, P, [H, signal(2)]).records[2].signalResp, 'accepted', 'an offer to C does not save it here');
  const struck = playSequence(S.threat, P, [listen(2), strike(4)]).records[2];
  assert.ok(struck.events.some((e) => e.type === 'lapse' && e.result === 'interrupted'));
  assert.deepEqual(struck.attackers, [4], 'E hits back once');
  assert.equal(ending(S.threat, [listen(2), strike(4), H, H, H, H]), 'shared-dawn');
  const d = solveDawn(S.threat, P);
  assert.ok(d.dawn && !d.dawnWithoutThird);
});

test('Lessons are claims about the world, and the world bears them out', () => {
  // The River's lesson says every ship is of the relaying kind (Reciprocal).
  assert.ok(S.river.family.every((f: string) => f === 'R'));
  // The Threat's lesson says every Shared Dawn in it needs a strike (checked above with solveDawn);
  // no lesson may speak about the player's own moves, since it shows however the world was played.
  for (const s of SCENARIOS) assert.doesNotMatch(s.lesson, /\byou (stopped|struck|listened|asked|paid)\b/i);
});
