// Expansion scaffold: the layout must hold for systems other than the one played today.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planetPositions, ringRadius, PLANET, cosmosLayout } from '../web3d/layout.ts';

const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test('layout: six planets sit exactly where the renderer always put them (radius 10, A at the top)', () => {
  const p = planetPositions(6);
  assert.equal(ringRadius(6), 10);
  assert.deepEqual(p[0].map((x) => Math.round(x * 1e6) / 1e6), [0, 0, -10]);
});

test('layout: any system from 3 to 16 planets keeps ships at least 6 radii apart', () => {
  for (let n = 3; n <= 16; n++) {
    const p = planetPositions(n);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) assert.ok(dist(p[i], p[j]) >= 6 * PLANET - 1e-9, `n=${n} ${i}-${j}`);
  }
});

test('layout: several systems never overlap one another (scaffold)', () => {
  for (let k = 2; k <= 5; k++) {
    const slots = cosmosLayout(Array.from({ length: k }, (_, i) => ({ id: `s${i}`, planets: 6 })));
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) assert.ok(dist(slots[i].centre, slots[j].centre) > 2 * (ringRadius(6) + 3 * PLANET), `k=${k}`);
  }
});
