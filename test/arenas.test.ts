// Every arena is the same law under a different sky. Each must be winnable, and in each, neglect
// must lose: otherwise an arena is either a wall or a gift. Balance beyond that is for playtesting.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ARENAS, arenaById, FIRST_ARENA, assertArena } from '../src/arenas.ts';
import { newGame, advance, replay, totalWater } from '../src/microcosmos.ts';
import type { Choice } from '../src/microcosmos.ts';
import { medalsOf } from '../src/telling.ts';

const lines = JSON.parse(readFileSync(new URL('./arena-journeys.json', import.meta.url), 'utf8')) as Record<string, { version: number; actions: Choice[] }>;

test('every arena has a recorded journey that reaches a shared dawn', () => {
  for (const A of ARENAS) {
    const line = lines[A.id]; assert.ok(line, `${A.id} has a recorded dawn (run node scripts/arenas.ts)`);
    assert.equal(line.version, A.version, `${A.id}: recorded for this version of the arena`);
    const g = replay(line.actions, A); assert.equal(g.outcome, 'dawn', A.id);
    assert.ok(medalsOf(line.actions, A).some(m => m.id === 'dawn' && m.status === 'earned'));
  }
});

test('in every arena, doing nothing ends in the long night, and not before the dark', () => {
  for (const A of ARENAS) {
    let g = newGame(A); const start = totalWater(g);
    while (!g.outcome) g = advance(g, { type: 'rest' }, A);
    assert.equal(g.outcome, 'night', `${A.id}: neglect loses`);
    assert.ok(g.beat > A.dark[0], `${A.id}: the night falls at moment ${g.beat}, after the dark begins at ${A.dark[0]}`);
    assert.ok(start > 0);
  }
});

test('arena ids are unique, versions are set, and an unknown id falls back to the First Orbit', () => {
  assert.equal(new Set(ARENAS.map(a => a.id)).size, ARENAS.length);
  for (const A of ARENAS) assertArena(A);
  assert.equal(arenaById('no-such-arena'), FIRST_ARENA);
});
