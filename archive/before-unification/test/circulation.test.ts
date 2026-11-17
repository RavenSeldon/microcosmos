import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialGarden, tend, replayGarden, waterIn, validAction, season, WORLDS } from '../src/circulation.ts';
import type { Action } from '../src/circulation.ts';

test('circulation: water balances across rain, use, gifts, sharing, recovery and overflow', () => {
  let seed = 91;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let run = 0; run < 60; run++) {
    let s = initialGarden();
    for (let i = 0; i < 100; i++) {
      const k = random() % 10;
      const a: Action = k < 3 ? { type: 'connect', edge: k } : k < 6 ? { type: 'release', edge: k - 3 } : k < 9 ? { type: 'care', world: k - 6 } : { type: 'rest' };
      const before = structuredClone(s), next = tend(s, a), r = next.last!;
      assert.deepEqual(s, before, 'a choice must not mutate its input');
      assert.equal(waterIn(next), waterIn(s) + r.rain - r.loss);
      for (let d = 0; d < 3; d++) {
        assert.ok(next.clean[d] >= 0 && next.clean[d] <= WORLDS[d].capacity);
        assert.ok(next.used[d] >= 0);
      }
      assert.ok(next.basin >= 0 && next.basin <= 28);
      assert.ok(r.transfers.every((t) => Number.isInteger(t.amount) && t.amount > 0));
      s = next;
    }
  }
});

test('circulation: lasting connections carry a first season without repeated commands', () => {
  const actions: Action[] = [{ type: 'connect', edge: 0 }, { type: 'connect', edge: 1 }, { type: 'connect', edge: 2 }];
  let s = replayGarden(actions);
  for (let i = 0; i < 9; i++) {
    s = tend(s, { type: 'rest' });
    assert.deepEqual(s.last!.unmet, [0, 0, 0]);
    assert.equal(s.last!.basinUnmet, 0);
  }
  assert.equal(s.cycle, 12); assert.equal(s.dawn, true);
  assert.deepEqual(s.links, [true, true, true]);
  assert.ok(s.basin >= 18);
});

test('circulation: missed opportunities cause visible need but can be repaired', () => {
  let s = initialGarden();
  for (let i = 0; i < 12; i++) s = tend(s, { type: 'rest' });
  assert.ok(s.last!.unmet.some(Boolean)); assert.equal(s.dawn, false);
  for (let edge = 0; edge < 3; edge++) s = tend(s, { type: 'connect', edge });
  for (let i = 0; i < 20; i++) s = tend(s, { type: 'rest' });
  assert.deepEqual(s.last!.unmet, [0, 0, 0]); assert.equal(s.dawn, true);
});

test('circulation: releasing a current really changes the economy; replay supports exact undo', () => {
  const actions: Action[] = [{ type: 'connect', edge: 0 }, { type: 'connect', edge: 1 }];
  const before = replayGarden(actions), waiting = tend(before, { type: 'rest' });
  const released = tend(before, { type: 'release', edge: 0 });
  assert.ok(released.used[0] > waiting.used[0]);
  assert.ok(released.last!.recovered < waiting.last!.recovered);
  assert.deepEqual(replayGarden([...actions, { type: 'rest' }]), waiting);
  assert.deepEqual(replayGarden(actions), before);
});

test('circulation: care never takes the basin community’s protected water', () => {
  const s = initialGarden(); s.basin = 1; s.cycle = 6; s.clean = [0, 0, 0];
  const next = tend(s, { type: 'care', world: 0 });
  assert.equal(next.last!.basinUnmet, 0);
  assert.ok(!next.last!.transfers.some((t) => t.from === 'basin'));
  assert.equal(waterIn(next), waterIn(s) - next.last!.loss);
});

test('circulation: a second path can carry water after a direct path fills', () => {
  const s = initialGarden(); s.links = [true, true, false]; s.used[0] = 7;
  const direct = tend(s, { type: 'rest' }), loop = tend(s, { type: 'connect', edge: 2 });
  assert.ok(loop.used[0] < direct.used[0]);
  assert.ok(loop.last!.transfers.some((t) => t.from === 0 && t.to === 2 && t.kind === 'used'));
});

test('circulation: saved actions are validated and weather is predictable', () => {
  for (const x of [null, {}, { type: 'care', world: -1 }, { type: 'connect', edge: 3 }, { type: 'care', world: '1' }, { type: 'strike' }]) assert.equal(validAction(x), false);
  assert.equal(validAction({ type: 'rest' }), true);
  assert.equal(season(6), 'gentle'); assert.equal(season(7), 'dry'); assert.equal(season(9), 'dry'); assert.equal(season(10), 'rain');
  assert.throws(() => tend(initialGarden(), { type: 'connect', edge: 9 }), /Unknown/);
});

test('circulation: a later summer asks for timely care even with every connection established', () => {
  let quiet = initialGarden(), attentive = initialGarden();
  let quietShort = 0, attentiveShort = 0;
  for (let moment = 1; moment <= 32; moment++) {
    const ordinary: Action = moment <= 3 ? { type: 'connect', edge: moment - 1 } : { type: 'rest' };
    quiet = tend(quiet, ordinary);
    attentive = tend(attentive, moment === 27 || moment === 28 ? { type: 'care', world: 0 } : ordinary);
    quietShort += quiet.last!.unmet.reduce((a, b) => a + b, 0);
    attentiveShort += attentive.last!.unmet.reduce((a, b) => a + b, 0);
  }
  assert.ok(quietShort > 0, 'automating the connections alone must not erase the later challenge');
  assert.equal(attentiveShort, 0, 'two timely gifts should get every community through without shortage');
  assert.equal(attentive.last!.basinUnmet, 0);
  assert.deepEqual(quiet.last!.unmet, [0, 0, 0], 'a missed request is still recoverable');
});

test('circulation: the quiet two-moment outlook warns before the summer shortage', () => {
  let s = initialGarden();
  for (let moment = 1; moment <= 26; moment++) s = tend(s, moment <= 3 ? { type: 'connect', edge: moment - 1 } : { type: 'rest' });
  assert.deepEqual(s.last!.unmet, [0, 0, 0]);
  const next = tend(s, { type: 'rest' }), later = tend(next, { type: 'rest' });
  assert.deepEqual(next.last!.unmet, [0, 0, 0]);
  assert.ok(later.last!.unmet[0] > 0);
  assert.equal(season(28), 'dry'); assert.equal(season(29), 'rain');
});
