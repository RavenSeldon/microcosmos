// Presentation must describe the actual journey, including its difficult moments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, advance } from '../src/microcosmos.ts';
import type { Choice } from '../src/microcosmos.ts';
import { scoreMoment, momentTitle } from '../web3d/feedback.ts';
import { recount } from '../src/telling.ts';

const journeys = JSON.parse(readFileSync(new URL('./journeys.json', import.meta.url), 'utf8')) as Record<string, {actions: Choice[]}>;
test('the visual score preserves every recorded exchange and finishes before controls unlock', () => {
  let moments = 0, transfers = 0;
  for (const actions of [...Object.values(journeys).map(j => j.actions), Array.from({length: 18}, (): Choice => ({type: 'rest'}))]) {
    let g = newGame();
    for (const action of actions) {
      if (g.outcome) break;
      g = advance(g, action); const m = g.last!, before = JSON.stringify(m), score = scoreMoment(m);
      assert.deepEqual(score.passages.map(p => p.transfer), m.transfers, 'no invented, omitted or reordered water');
      score.passages.forEach(p => { assert.ok(p.at >= 0 && p.duration > 0 && p.at + p.duration <= score.duration); transfers++; });
      score.accents.forEach(a => assert.ok(a.at >= 0 && a.at + 430 <= score.duration));
      assert.equal(JSON.stringify(m), before, 'presentation leaves the resolved state untouched');
      if (m.events.some(e => e.kind === 'dormant')) assert.equal(momentTitle(m), 'A world falls quiet');
      moments++;
    }
  }
  assert.ok(moments > 100 && transfers > 100);
});
test('a shelter turning point is one clean sentence', () => {
  const r = recount([{type: 'ability', world: 0}]);
  assert.ok(r.points.some(p => p.text === 'Obsidian seals its vaults.'));
});
