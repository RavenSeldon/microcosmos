// Print a winning line for a seed under a restriction, as a string `replay` accepts.
//   node scripts/witness.ts 12 nostrike     (also: nosignal, any)
import { BASE } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { findWin } from '../src/search.ts';
import { kindOf, actionName } from '../src/engine.ts';

const seed = Number(process.argv[2] ?? 1);
const mode = process.argv[3] ?? 'any';
const allowed = (a: number) => (mode === 'nostrike' ? kindOf(a) !== 'K' : mode === 'nosignal' ? kindOf(a) !== 'G' : true);
const line = findWin(makeWorld(seed, BASE), BASE, allowed);
console.log(line ? line.map(actionName).join(', ') : `no winning line for seed ${seed} under "${mode}"`);
