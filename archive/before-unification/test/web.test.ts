// G1.5: the words and endings the playable shows. The page itself is checked in a real browser
// (scripts/check-web.sh); these tests cover the pure layer underneath it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withParams } from '../src/params.ts';
import type { Family } from '../src/params.ts';
import type { World } from '../src/world.ts';
import { makeWorld } from '../src/world.ts';
import { playSequence, HIDE, signal, strike, listen } from '../src/engine.ts';
import { toPublic, THREAT_BOTS } from '../src/bots.ts';
import { evaluateSequence, evaluateBot } from '../src/evaluate.ts';
import { narrate, endingOf, runCode, reveal } from '../web/view.ts';

const P = withParams({ preemption: 'threat' });
const QUIET = withParams({ preemption: 'threat', autonomous: false });
function world(family: Family[], over: Partial<World> = {}): World {
  const row = [5, 9, 5, 5, 5, 5];
  return { seed: 0, supply: 80, needs: Array.from({ length: 7 }, () => row.slice()), reserve0: [5, 5, 5, 5, 5, 5], family,
    priority: [0, 1, 2, 3, 4, 5], relayOrder: [0, 1, 2, 3, 4, 5].map((d) => [0, 1, 2, 3, 4, 5].filter((x) => x !== d)), ...over };
}
const text = (w: World, acts: number[], i: number) => narrate(toPublic(playSequence(w, P, acts).records[i]), 30, false).map((l) => l.text);

test('words: a threat, its execution, its cancellation and its interruption each read plainly', () => {
  const w = world(['P', 'E', 'E', 'E', 'E', 'E']);
  assert.ok(text(w, [HIDE], 1).includes('A threatens B. It will strike next round if B is still drawing heavily.'));
  assert.ok(text(w, [HIDE, HIDE], 2).includes('A carried out its threat and struck B.'));
  assert.ok(text(w, [HIDE, strike(0)], 2).includes('Your strike stopped A from carrying out its threat against B.'));
  assert.ok(text(world(['P', 'R', 'E', 'E', 'E', 'E']), [HIDE, signal(1)], 2).includes("A's threat against B lapsed: B is no longer drawing heavily."));
});

test('words: the station\'s own actions and the basin line', () => {
  const w = world(['E', 'E', 'E', 'E', 'E', 'E']);
  assert.equal(text(w, [listen(1)], 1)[0], 'You listened to B. It needs 9 this round and holds 5 in reserve.');
  assert.equal(text(w, [signal(1)], 1)[0], 'You asked B to conserve. It declined.');
  assert.equal(text(w, [HIDE], 1).at(-1), 'The basin received 46. It needs 30.');
});

test('endings: quiet survival is Shared Dawn, survival with distress is Fragile Peace, collapse is The Long Night', () => {
  const calm = world(['E', 'E', 'E', 'E', 'E', 'E']);
  assert.equal(endingOf(evaluateSequence(calm, QUIET, [HIDE, HIDE, HIDE, HIDE, HIDE, HIDE]).ledger).ending, 'shared-dawn');
  const thin = world(['E', 'E', 'E', 'E', 'E', 'E'], { reserve0: [0, 0, 5, 5, 5, 5] });
  const fragile = endingOf(evaluateSequence(thin, QUIET, [strike(1), HIDE, HIDE, HIDE, HIDE, HIDE]).ledger);
  assert.equal(fragile.ending, 'fragile-peace');
  const dry = endingOf(evaluateSequence(world(['E', 'E', 'E', 'E', 'E', 'E'], { supply: 60 }), QUIET, [HIDE, HIDE]).ledger);
  assert.equal(dry.ending, 'long-night');
  assert.equal(dry.why, 'The basin went short two rounds running and collapsed.');
});

test('leak: nothing a player reads during play names a hidden policy (all threat bots, 150 worlds)', () => {
  const names = reveal(makeWorld(1, P)).map((r) => r.family).concat(['Reciprocal', 'Extractive', 'Preemptive']);
  for (let seed = 1; seed <= 150; seed++) {
    const w = makeWorld(seed, P);
    for (const bot of Object.values(THREAT_BOTS)) {
      for (const r of evaluateBot(w, P, bot).records.filter((x) => !x.inert)) {
        const pub = toPublic(r);
        for (const k of ['river', 'need', 'unmet', 'reserveAfter', 'reserveBefore', 'cover', 'emergency', 'stored', 'destroyed', 'conflict']) assert.ok(!(k in pub), `public round carries ${k}`);
        for (const l of narrate(pub, 30, false)) for (const n of names) assert.ok(!l.text.includes(n));
      }
    }
  }
});

test('words: a run code names the world and every action', () => {
  assert.equal(runCode(1006, [signal(5), HIDE, listen(0)]), 'world 1006: SIGNAL F, HIDE, LISTEN A');
});
