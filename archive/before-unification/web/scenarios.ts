// Three authored learning worlds. Each teaches one idea and was checked with the solver
// (test/scenarios.test.ts) to teach what it claims. Their hidden policies are revealed at the end,
// like any other world's.
import type { World } from '../src/world.ts';

export interface Scenario {
  id: string;
  title: string;
  brief: string;                 // shown before round 1
  goal: string;
  hints: Record<number, string>; // round -> coaching line
  lesson: string;                // shown at the end, however the world was played: a claim about the world, never about the player's moves
  world: World;
}

const relay = [0, 1, 2, 3, 4, 5].map((d) => [0, 1, 2, 3, 4, 5].filter((x) => x !== d).map((x, i, a) => a[(i + d) % a.length]));
const flat = (row: number[]) => Array.from({ length: 7 }, () => row.slice());

export const SCENARIOS: Scenario[] = [
  {
    id: 'river',
    title: 'The River',
    brief: 'Six ships draw from one river. The basin below lives on what is left, and it needs 30 a round. Right now it receives 27. Two short rounds in a row and it collapses.',
    goal: 'Keep the basin at 30 or more.',
    hints: {
      1: 'B is drawing heavily. Select B, choose Signal, and commit: you are asking it to live on its reserve for two rounds.',
      2: 'Watch the gold lines. A ship that agrees passes the offer on to another ship, one per round.',
      3: 'You can hide now. The agreements are doing the work.',
    },
    lesson: 'Every ship in this world is of a kind that, once it has agreed and unless you have struck it, passes the offer on to another ship, one a round. Cooperation can spread through the network without you. In other worlds only some ships do this, and you cannot see which.',
    world: { seed: 0, supply: 30 + 32 - 3, needs: flat([5, 9, 5, 4, 5, 4]), reserve0: [6, 10, 6, 6, 6, 6], family: ['R', 'R', 'R', 'R', 'R', 'R'], priority: [0, 1, 2, 3, 4, 5], relayOrder: relay },
  },
  {
    id: 'listening',
    title: 'Two Lights',
    brief: 'A and D both draw heavily, and from here they look the same. Only one has water stored to spare. A dry spell begins in round 2 and lasts three rounds.',
    goal: 'Find the ship that can help, and ask it.',
    hints: {
      1: 'Select A or D and Listen. Listening is silent: nobody knows you did it.',
      2: 'The dry spell starts now. Look at what you learned, then ask the ship that has something to give.',
    },
    lesson: 'How hard a ship draws says nothing about whether it can help. Listening shows what it holds, and the forecast changes with what you learn.',
    world: { seed: 0, supply: 30 + 35 + 1, needs: Array.from({ length: 7 }, (_, t) => [9, 4, 5 + (t >= 2 && t <= 4 ? 3 : 0), 9, 4, 4]), reserve0: [0, 6, 6, 10, 6, 6], family: ['R', 'E', 'E', 'R', 'E', 'E'], priority: [0, 1, 2, 3, 4, 5], relayOrder: relay },
  },
  {
    id: 'threat',
    title: 'The Threat',
    brief: 'E watches the others closely. C is drawing heavily because it has almost nothing stored, and E may take that as a threat.',
    goal: 'Keep every ship out of distress.',
    hints: {
      1: 'Nothing is wrong yet. Listen to C if you like, and watch for a red dashed arrow.',
      2: 'E threatens C. Asking C to conserve works only if C agrees, and you cannot know whether it will. A Strike on E is certain to stop the attack, and E may hit you back once.',
      3: 'Threats can lapse on their own when the target stops drawing heavily. Watch whether this one does.',
    },
    lesson: 'A threat you can see coming can be stopped with certainty by striking the ship that makes it, at a price: it may hit back, and it refuses you afterwards. In this world, every way of keeping all six ships out of distress needed that strike.',
    world: { seed: 0, supply: 30 + 32 + 4, needs: [[5, 4, 9, 5, 5, 4], [5, 4, 9, 5, 5, 4], [5, 4, 9, 5, 5, 4], ...Array.from({ length: 4 }, () => [5, 4, 5, 5, 5, 4])], reserve0: [6, 6, 0, 6, 6, 6], family: ['E', 'E', 'E', 'E', 'P', 'E'], priority: [4, 0, 1, 2, 3, 5], relayOrder: relay },
  },
];
