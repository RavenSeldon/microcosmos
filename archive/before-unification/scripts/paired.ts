// Paired comparison of two bots on the same seeds (baseline rules): how many seeds each wins alone.
//   node scripts/paired.ts "cooperate, hide when exposed" "listen once, then cooperate" [seeds=500] [first seed=1]
import { BASE } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { BOTS, playBot } from '../src/bots.ts';

const [a, b] = [process.argv[2], process.argv[3]];
const n = Number(process.argv[4] ?? 500);
const first = Number(process.argv[5] ?? 1); // e.g. 100001 for the held-out range
let onlyA = 0, onlyB = 0, both = 0, neither = 0;
for (let seed = first; seed < first + n; seed++) {
  const w = makeWorld(seed, BASE);
  const ra = playBot(w, BASE, BOTS[a]).won, rb = playBot(w, BASE, BOTS[b]).won;
  if (ra && rb) both++; else if (ra) onlyA++; else if (rb) onlyB++; else neither++;
}
const diff = (onlyB - onlyA) / n;
const se = Math.sqrt(onlyA + onlyB - (onlyB - onlyA) ** 2 / n) / n;
console.log(`seeds ${first}..${first + n - 1} · both win ${both} · only "${a}" ${onlyA} · only "${b}" ${onlyB} · neither ${neither}`);
console.log(`"${b}" minus "${a}": ${(100 * diff).toFixed(1)} points, 95% interval ${(100 * (diff - 1.96 * se)).toFixed(1)} to ${(100 * (diff + 1.96 * se)).toFixed(1)}`);
