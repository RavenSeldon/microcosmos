// A small, open-information economy. Presentation uses feelings; this ledger stays literal.
// Clean water, used water, external rain and losses are accounted for independently.
export const WORLDS = [
  { name: 'Ember Glass', short: 'Ember', theme: 2, need: 3, capacity: 7, gift: 'A warm, thirsty world. Its used water can nourish a return current.' },
  { name: 'Verdance', short: 'Verdance', theme: 1, need: 2, capacity: 6, gift: 'Living wetlands clean used water and return it to the commons.' },
  { name: 'Still Sanctum', short: 'Sanctum', theme: 3, need: 1, capacity: 10, gift: 'A quiet world with room to hold water, and share it when a neighbour needs it.' },
] as const;
export const PAIRS = [[0, 1], [1, 2], [0, 2]] as const;
export type Action = { type: 'connect' | 'release'; edge: number } | { type: 'care'; world: number } | { type: 'rest' };
export type Place = number | 'basin';
export interface Transfer { from: Place; to: Place; amount: number; kind: 'clean' | 'used' }
export interface Cycle {
  rain: number; recovered: number; loss: number; unmet: number[]; basinUnmet: number;
  transfers: Transfer[]; words: string[]; before: number; after: number;
}
export interface Garden {
  cycle: number; basin: number; clean: number[]; used: number[]; links: boolean[];
  memory: number[]; stable: number; dawn: boolean; last: Cycle | null;
}
export const initialGarden = (): Garden => ({ cycle: 0, basin: 18, clean: [5, 4, 7], used: [0, 0, 0], links: [false, false, false], memory: [0, 0, 0], stable: 0, dawn: false, last: null });
export const waterIn = (s: Garden) => s.basin + s.clean.reduce((a, b) => a + b, 0) + s.used.reduce((a, b) => a + b, 0);
export function needsAt(cycle: number): number[] {
  const moment = ((Math.max(1, cycle) - 1) % 16) + 1;
  return [cycle > 16 && moment >= 5 && moment <= 12 ? 6 : 3, 2, 1];
}
export function season(cycle: number): 'rain' | 'dry' | 'gentle' {
  const c = ((Math.max(1, cycle) - 1) % 16) + 1;
  return cycle <= 16
    ? c >= 7 && c <= 9 ? 'dry' : c >= 10 && c <= 12 ? 'rain' : 'gentle'
    : c >= 7 && c <= 12 ? 'dry' : c >= 13 && c <= 15 ? 'rain' : 'gentle';
}
export function validAction(a: unknown): a is Action {
  if (!a || typeof a !== 'object') return false;
  const x = a as Action;
  return x.type === 'rest' || ((x.type === 'connect' || x.type === 'release') && Number.isInteger(x.edge) && x.edge >= 0 && x.edge < 3)
    || (x.type === 'care' && Number.isInteger(x.world) && x.world >= 0 && x.world < 3);
}

// A shortest route to Verdance, with shared per-cycle channel capacity. A third friendship
// supplies another way home when the direct route is full; it is never a morality bonus.
function pathToWetlands(from: number, links: boolean[], room: number[]): number[] | null {
  const queue = [{ node: from, path: [] as number[] }], seen = new Set([from]);
  for (const item of queue) {
    if (item.node === 1) return item.path;
    PAIRS.forEach(([a, b], edge) => {
      const to = a === item.node ? b : b === item.node ? a : -1;
      if (to >= 0 && links[edge] && room[edge] > 0 && !seen.has(to)) {
        seen.add(to); queue.push({ node: to, path: [...item.path, edge] });
      }
    });
  }
  return null;
}

export function tend(previous: Garden, action: Action): Garden {
  if (!validAction(action)) throw new Error('Unknown garden action');
  const s: Garden = structuredClone(previous);
  s.cycle++;
  const weather = season(s.cycle);
  const needs = needsAt(s.cycle);
  const r: Cycle = { rain: weather === 'dry' ? 0 : weather === 'rain' ? 5 : 3, recovered: 0, loss: 0,
    unmet: [0, 0, 0], basinUnmet: 0, transfers: [], words: [], before: waterIn(previous), after: 0 };
  s.basin += r.rain;
  const send = (from: Place, to: Place, amount: number, kind: Transfer['kind'] = 'clean') => {
    if (amount > 0) r.transfers.push({ from, to, amount, kind });
  };
  if (action.type === 'connect' && !s.links[action.edge]) {
    s.links[action.edge] = true;
    const [a, b] = PAIRS[action.edge];
    r.words.push(`${WORLDS[a].short} and ${WORLDS[b].short} begin sharing a current.`);
  } else if (action.type === 'release' && s.links[action.edge]) {
    s.links[action.edge] = false;
    const [a, b] = PAIRS[action.edge];
    r.words.push(`The current between ${WORLDS[a].short} and ${WORLDS[b].short} rests. Their water stays with them.`);
  } else if (action.type === 'care') {
    const d = action.world;
    const gift = Math.min(3, Math.max(0, s.basin - 5), WORLDS[d].capacity - s.clean[d]);
    s.basin -= gift; s.clean[d] += gift; send('basin', d, gift);
    r.words.push(gift ? `You give ${WORLDS[d].short} a little breathing room.` : s.clean[d] >= WORLDS[d].capacity ? `${WORLDS[d].short} already holds all it can keep. Your water stays in the basin.` : `There is no spare water to give just now. The basin keeps enough for its own community.`);
  }
  // The seventh community has a real need, met before any withdrawals. This unit leaves
  // the water system (evaporation); shortages never manufacture negative water.
  const basinDrink = Math.min(1, s.basin); s.basin -= basinDrink;
  r.loss += basinDrink; r.basinUnmet = 1 - basinDrink;
  // A shared reserve is protected. Round-robin deliveries avoid privileging the first world.
  const targets = WORLDS.map((w, d) => Math.min(w.capacity, needs[d] + 2));
  if (s.links[1] || s.links[2]) targets[2] = 8;
  const supplied = [0, 0, 0];
  for (let pass = 0; pass < 10 && s.basin > 4; pass++) {
    for (let k = 0; k < 3 && s.basin > 4; k++) {
      const d = (k + s.cycle) % 3;
      if (s.clean[d] < targets[d]) { s.clean[d]++; s.basin--; supplied[d]++; }
    }
  }
  supplied.forEach((n, d) => send('basin', d, n));
  // Neighbours share only their surplus, never the water they need themselves.
  PAIRS.forEach(([a, b], edge) => {
    if (!s.links[edge]) return;
    for (const [from, to] of [[a, b], [b, a]]) {
      const amount = Math.min(2, Math.max(0, s.clean[from] - needs[from] - 2), Math.max(0, needs[to] + 1 - s.clean[to]));
      s.clean[from] -= amount; s.clean[to] += amount; send(from, to, amount);
    }
  });
  WORLDS.forEach((w, d) => {
    const drink = Math.min(needs[d], s.clean[d]);
    s.clean[d] -= drink; s.used[d] += drink; r.unmet[d] = needs[d] - drink;
  });
  const room = [3, 3, 3];
  for (const d of [0, 2]) {
    for (let attempt = 0; attempt < 2 && s.used[d] > 0; attempt++) {
      const path = pathToWetlands(d, s.links, room);
      if (!path) break;
      const amount = Math.min(s.used[d], ...path.map((e) => room[e]));
      s.used[d] -= amount; s.used[1] += amount;
      let from = d;
      for (const edge of path) {
        const [a, b] = PAIRS[edge], to = from === a ? b : a;
        room[edge] -= amount; send(from, to, amount, 'used'); from = to;
      }
    }
  }
  // Sun-powered wetlands process at most seven units. One evaporates when processing runs;
  // the remainder returns to the basin and is available NEXT cycle, not twice this cycle.
  const processed = Math.min(7, s.used[1]);
  s.used[1] -= processed;
  const evaporation = Math.min(1, processed);
  r.loss += evaporation; r.recovered = processed - evaporation;
  s.basin += r.recovered; send(1, 'basin', r.recovered);
  if (s.basin > 28) { r.loss += s.basin - 28; s.basin = 28; }
  PAIRS.forEach(([a, b], edge) => {
    if (s.links[edge] && r.transfers.some((t) => (t.from === a && t.to === b) || (t.from === b && t.to === a))) s.memory[edge]++;
  });
  const comfortable = !r.unmet.some(Boolean) && !r.basinUnmet && s.basin >= 8;
  s.stable = comfortable && s.basin >= previous.basin ? s.stable + 1 : 0;
  s.dawn ||= s.cycle >= 12 && s.stable >= 3 && s.links.filter(Boolean).length >= 2;
  if (r.unmet.some(Boolean)) r.words.push(`${WORLDS.filter((_, d) => r.unmet[d] > 0).map((w) => w.short).join(' and ')} could not drink enough. A return current or a little care can help.`);
  else if (weather === 'dry') r.words.push('The rain is quiet. Stored water and returning currents carry the worlds.');
  else if (r.recovered >= 5) r.words.push('Water finds its way home through Verdance. The basin receives what the worlds have returned.');
  else r.words.push(s.used.some(Boolean) ? 'Verdance returns what it can. More used water is waiting for a way home.' : 'Verdance returns what it can. The water has a way home.');
  if (s.dawn && !previous.dawn) r.words.push('A shared dawn. After the dry spell, the worlds have found a rhythm that holds.');
  if (s.cycle === 16) r.words.push('A longer summer is coming. Ember will need more water; its neighbours will need care too.');
  if (needs[0] > 3 && needsAt(previous.cycle)[0] === 3) r.words.push('Ember’s hot season has begun. It drinks more until the rain returns.');
  r.after = waterIn(s); s.last = r;
  return s;
}

export function replayGarden(actions: Action[]): Garden {
  return actions.reduce(tend, initialGarden());
}
