// The voices are guidance, so they must be true. A world may only say what holds for it at that
// moment under the rules, one voice speaks at a time, and nothing is said twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_ARENA as A } from '../src/arenas.ts';
import { newGame, advance, outlook, strainLine, renewAt, needAt, skyAt } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
import { whisper } from '../src/whispers.ts';
import type { Whisper } from '../src/whispers.ts';
import { sensible, legal, id } from '../scripts/strategies.ts';

const rest: Choice = { type: 'rest' };
function truthful(w: Whisper, g: Game) {
  assert.ok(w.text.length > 20 && w.text.length < 240, w.id);
  const who = w.who;
  if (w.id === 'hello') { assert.equal(g.beat, 0); assert.ok(typeof who === 'number' && A.worlds[who].renew[skyAt(1, A)] < A.worlds[who].need, 'the first speaker does use more than it renews'); }
  if (w.id === 'threat') { assert.ok(g.threat && who === g.threat.from); assert.match(w.text, new RegExp(A.worlds[g.threat!.to].short)); }
  if (w.id === 'thirst') assert.ok(typeof who === 'number' && outlook(g, rest, 2, A).short.includes(who), 'the forecast agrees');
  if (w.id === 'strain') assert.ok(typeof who === 'number' && g.used[who] >= strainLine(who, A));
  if (w.id === 'dormant') assert.ok(g.last!.events.some(e => e.kind === 'dormant'));
  if (w.id === 'spill') assert.ok(g.last!.events.some(e => e.kind === 'spill' && e.world === who));
  if (w.id === 'seized') assert.ok(g.last!.events.some(e => e.kind === 'seized' && e.other === who) && g.grudge.some(Boolean));
  if (w.id === 'served') assert.ok(g.last!.events.some(e => e.kind === 'served' && e.world === who));
  if (w.id === 'first-current') assert.ok(g.last!.events.some(e => e.kind === 'link'));
  if (w.id === 'forge-season') {
    assert.equal(who, id('ember')); assert.equal(skyAt(g.beat + 1, A), 'dark');
    const stoked = advance(g, { type: 'ability', world: id('ember') }, A);
    assert.equal(renewAt(stoked, id('ember'), stoked.beat + 1, A), 2 * renewAt(g, id('ember'), g.beat + 2, A), 'stoking does double it');
  }
  if (w.id === 'return') { assert.equal(skyAt(g.beat + 1, A), 'return'); assert.ok(renewAt(g, id('verdance'), g.beat + 1, A) > needAt(g, id('verdance'), g.beat + 1, A)); }
  if (w.id === 'dark-near') assert.ok(g.beat + 1 >= A.dark[0] - 1 && g.beat + 1 <= A.dark[0]);
  if (w.id === 'quiet') { const o = outlook(g, rest, 2, A); assert.ok(!g.threat && !o.short.length && !o.dormant.length && !o.spill.length && !o.night); assert.ok(A.worlds.every((_, d) => !g.dormant[d] && g.used[d] < strainLine(d, A)), 'room to breathe is never announced over a strained holding'); }
}
function journey(plan: (g: Game) => Choice) {
  let g = newGame(A); const heard = new Set<string>(), said: { id: string; at: number }[] = [];
  const hear = (sel = -1) => { const w = whisper(g, heard, sel, A); if (w) { assert.ok(!heard.has(w.id), 'nothing is said twice'); truthful(w, g); heard.add(w.id); said.push({ id: w.id, at: g.beat + 1 }); } };
  hear(); hear(2);
  while (!g.outcome) { g = advance(g, plan(g), A); hear(); }
  assert.equal(whisper(g, heard, -1, A), null, 'no voice after the journey ends');
  return { g, said };
}

test('the voices say only what is true, one at a time, each once: an attentive journey', () => {
  const { g, said } = journey(x => sensible(x));
  assert.equal(g.outcome, 'dawn');
  const ids = said.map(s => s.id);
  for (const k of ['hello', 'foresight', 'first-current', 'served', 'dark-near', 'forge-season', 'return', 'dawn-terms']) assert.ok(ids.includes(k), `heard: ${k}`);
  assert.ok(said.length <= A.length + 2, 'never more than one voice a moment');
});

test('a neglected journey is warned before each harm, by the world it will happen to', () => {
  let firstThirst = 0, g0 = newGame(A); while (!firstThirst && !g0.outcome) { g0 = advance(g0, rest, A); if (g0.last!.unmet.some(Boolean)) firstThirst = g0.beat; }
  const { g, said } = journey(() => rest);
  assert.equal(g.outcome, 'night');
  const at = (k: string) => said.find(s => s.id === k)?.at ?? 0;
  assert.ok(at('thirst') > 0 && at('thirst') <= firstThirst, 'thirst is foretold no later than the moment it happens');
  assert.ok(at('strain') > 0 && at('threat') > 0 && at('dormant') > 0, 'strain, the reaching and the first dormancy are each named');
  assert.ok(at('strain') < at('dormant'));
});

test('random play never draws a false or repeated voice', () => {
  for (let t = 0; t < 40; t++) { let x = t * 2654435 + 11; const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1e6) / 1e6; };
    journey(g => { const L = legal(g); return r() < 0.5 ? rest : L[Math.floor(r() * L.length)]; }); }
});
