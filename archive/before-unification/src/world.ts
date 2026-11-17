import type { Params, Family } from './params.ts';
import { stream, int, shuffled } from './rng.ts';

// Everything fixed before round one. Hidden from the player except through observation.
export interface World {
  seed: number;
  supply: number;        // river units entering the network each round
  needs: number[][];     // needs[0] = the scripted history round; needs[1..rounds] = play rounds
  reserve0: number[];
  family: Family[];
  priority: number[];    // seed-shuffled order used for the autonomous slot and attack order; independent of family
  relayOrder: number[][]; // per district: the order in which it would relay signals to others
}

const STREAM = { baseNeed: 1, shocks: 2, reserve: 3, family: 4, priority: 5, relay: 6 };

export function makeWorld(seed: number, p: Params, familyOverride?: Family[]): World {
  const n = p.districts;
  const rb = stream(seed, STREAM.baseNeed);
  const rs = stream(seed, STREAM.shocks);
  const rr = stream(seed, STREAM.reserve);
  const rf = stream(seed, STREAM.family);
  const rp = stream(seed, STREAM.priority);
  const rl = stream(seed, STREAM.relay);

  const base = Array.from({ length: n }, () => int(rb, p.need.min, p.need.max));
  const needs: number[][] = [];
  for (let t = 0; t <= p.rounds; t++) {
    needs.push(base.map((b) => Math.max(1, b + p.need.shocks[Math.floor(rs() * p.need.shocks.length)])));
  }
  const supply = p.supplyMode === 'fixed' ? p.supply : p.basinMin + base.reduce((x, y) => x + y, 0) + p.slack;
  const reserve0 = Array.from({ length: n }, () => int(rr, p.reserve.min, p.reserve.max));

  const total = p.mix.R + p.mix.E + p.mix.P;
  const family: Family[] = Array.from({ length: n }, () => {
    const x = rf() * total;
    return x < p.mix.R ? 'R' : x < p.mix.R + p.mix.E ? 'E' : 'P';
  });

  const priority = shuffled(rp, n);
  const relayOrder = Array.from({ length: n }, (_, d) => shuffled(rl, n).filter((x) => x !== d));
  return { seed, supply, needs, reserve0, family: familyOverride ?? family, priority, relayOrder };
}
