// Exhaustive search over every action sequence for one seed, with full knowledge of the world.
// This is an upper bound on what any player could do, not what a player can do from observation.
import type { Params } from './params.ts';
import type { World } from './world.ts';
import type { State } from './engine.ts';
import { initState, historyRound, cloneState, step, stateKey, kindOf, HIDE } from './engine.ts';
import { DISTRICTS, ACTIONS } from './roster.ts';

interface Node {
  wins: number;        // winning completions from here (out of ACTIONS^remaining)
  minStrikes: number;  // fewest STRIKEs in any winning completion (Infinity if none)
  minSignals: number;  // fewest SIGNALs in any winning completion
  minActive: number;   // fewest SIGNALs + STRIKEs in any winning completion
}

export interface Solved extends Node {
  total: number;       // ACTIONS^rounds
  states: number;      // distinct states visited
  passiveWins: boolean; // does doing nothing (HIDE x rounds) win?
}

export function solve(w: World, p: Params): Solved {
  const memo = new Map<string, Node>();
  const LOST: Node = { wins: 0, minStrikes: Infinity, minSignals: Infinity, minActive: Infinity };

  function visit(s: State): Node {
    const key = stateKey(s);
    const hit = memo.get(key);
    if (hit) return hit;
    const node: Node = { wins: 0, minStrikes: Infinity, minSignals: Infinity, minActive: Infinity };
    // LISTEN changes nothing in the world, so all LISTENs share one child (weight DISTRICTS).
    // Except under REVEAL, where which district was heard matters: then every action is tried.
    const collapse = p.strikeMode !== 'reveal';
    for (let a = collapse ? DISTRICTS - 1 : 0; a < ACTIONS; a++) {
      const weight = collapse && a === DISTRICTS - 1 ? DISTRICTS : 1;
      const c = cloneState(s);
      step(w, p, c, a, null);
      let child: Node;
      if (c.status === 'lost') child = LOST;
      else if (c.status === 'won') child = { wins: 1, minStrikes: 0, minSignals: 0, minActive: 0 };
      else child = visit(c);
      if (child.wins === 0) continue;
      const k = kindOf(a);
      node.wins += weight * child.wins;
      node.minStrikes = Math.min(node.minStrikes, child.minStrikes + (k === 'K' ? 1 : 0));
      node.minSignals = Math.min(node.minSignals, child.minSignals + (k === 'G' ? 1 : 0));
      node.minActive = Math.min(node.minActive, child.minActive + (k === 'K' || k === 'G' ? 1 : 0));
    }
    memo.set(key, node);
    return node;
  }

  const s0 = initState(w, p);
  historyRound(w, p, s0);
  const root = visit(s0);
  return { ...root, total: ACTIONS ** p.rounds, states: memo.size, passiveWins: root.minActive === 0 };
}

// Reference implementation without the LISTEN shortcut or memo, for testing `solve` on small cases.
export function bruteForceWins(w: World, p: Params): number {
  let wins = 0;
  function rec(s: State) {
    for (let a = 0; a < ACTIONS; a++) {
      const c = cloneState(s);
      step(w, p, c, a, null);
      if (c.status === 'won') wins++;
      else if (c.status === 'ongoing') rec(c);
    }
  }
  const s0 = initState(w, p);
  historyRound(w, p, s0);
  rec(s0);
  return wins;
}

// One winning action list using only actions that pass `allowed`, or null if none exists.
// Used to produce a witness for any claim of the form "this seed can be won without X".
export function findWin(w: World, p: Params, allowed: (a: number) => boolean): number[] | null {
  const dead = new Set<string>();
  function rec(s: State, path: number[]): number[] | null {
    const key = stateKey(s);
    if (dead.has(key)) return null;
    for (const a of [HIDE, 0, ...Array.from({ length: 2 * DISTRICTS }, (_, k) => DISTRICTS + k)]) { // HIDE, one LISTEN, SIGNALs, STRIKEs
      if (!allowed(a)) continue;
      const c = cloneState(s);
      step(w, p, c, a, null);
      if (c.status === 'won') return [...path, a];
      if (c.status === 'ongoing') {
        const found = rec(c, [...path, a]);
        if (found) return found;
      }
    }
    dead.add(key);
    return null;
  }
  const s0 = initState(w, p);
  historyRound(w, p, s0);
  return rec(s0, []);
}

// G1c: is Shared Dawn reachable, and does it need the third action or a SIGNAL?
// Shared Dawn = survive all rounds with no district ever in distress (provisional threshold).
// Distress this round shows up as depConsec > 0, so no engine state is added; the memo key carries
// a "still clean" flag alongside the state key.
export interface DawnSolved { survivable: boolean; dawn: boolean; dawnWithoutThird: boolean; dawnWithoutSignal: boolean }
export function solveDawn(w: World, p: Params): DawnSolved {
  if (p.strikeMode === 'reveal') throw new Error('solveDawn does not support REVEAL');
  function run(allowed: (a: number) => boolean, needClean: boolean): boolean {
    const memo = new Map<string, boolean>();
    function visit(s: State): boolean {
      const key = stateKey(s);
      const hit = memo.get(key);
      if (hit !== undefined) return hit;
      let ok = false;
      for (let a = DISTRICTS - 1; a < ACTIONS && !ok; a++) { // one LISTEN stands for all
        if (!allowed(a)) continue;
        const c = cloneState(s);
        step(w, p, c, a, null);
        if (c.status === 'lost') continue;
        if (needClean && c.depConsec.some((x) => x > 0)) continue; // a district went into distress: no longer a Shared Dawn line
        ok = c.status === 'won' ? true : visit(c);
      }
      memo.set(key, ok);
      return ok;
    }
    const s0 = initState(w, p);
    historyRound(w, p, s0);
    return visit(s0);
  }
  const all = () => true;
  const dawn = run(all, true);
  return {
    survivable: run(all, false), dawn,
    dawnWithoutThird: dawn && run((a) => kindOf(a) !== 'K', true),
    dawnWithoutSignal: dawn && run((a) => kindOf(a) !== 'G', true),
  };
}
