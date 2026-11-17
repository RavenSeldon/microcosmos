// Every sentence the player reads about what happened, what would happen, and how it ended. No DOM,
// so the claims can be tested against the rules (test/microcosmos.test.ts).
import { FIRST_ARENA } from './arenas.ts';
import type { ArenaDef, Sky } from './arenas.ts';
import { advance, newGame, outlook, pairs, strainLine, skyAt, isLinked } from './microcosmos.ts';
import type { Choice, Game, GameEvent, Moment, Outcome } from './microcosmos.ts';

const list = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;
export const SKY_NAME: Record<Sky, string> = { gathering: 'The gathering', dark: 'The dark', return: 'The return' };

export function skyNote(g: Game, a: ArenaDef = FIRST_ARENA): string {
  const next = g.beat + 1;
  if (g.outcome) return 'The journey is over.';
  if (next === a.dark[0]) return 'The dark begins now. No rain until it lifts.';
  if (next === a.dark[0] - 1) return 'One more moment of open sky before the dark.';
  if (next === a.dark[1] + 1) return 'The dark has lifted. Rain returns.';
  if (next === a.dark[1]) return 'The last moment of the dark.';
  if (next === a.length) return 'The last moment of the journey.';
  return skyAt(next, a) === 'dark' ? 'No rain falls. The orbit lives on what it holds and renews.' : skyAt(next, a) === 'return' ? 'Rain falls again. What was used can be made clean.' : 'Open sky. A little rain, and mist where it gathers.';
}

function abilityLine(e: GameEvent, a: ArenaDef) {
  const w = a.worlds[e.world];
  switch (w.archetype) {
    case 'shelter': return `${w.short} seals its vaults. For three moments nothing can be taken from it or its neighbours, and its neighbours use less.`;
    case 'wetland': return `${w.short} lets its wetlands bloom for three moments.`;
    case 'forge': return `${w.short} stokes the forge for three moments.`;
    case 'reservoir': return `${w.short} opens its stores to the basin for three moments.`;
    case 'prism': return `${w.short} opens a bypass to ${a.worlds[e.other!].short} for three moments.`;
    default: return `${w.short} changes its rhythm for three moments.`;
  }
}
// What happened in a moment, in the order it happened.
export function tell(m: Moment, g: Game, a: ArenaDef = FIRST_ARENA): string[] {
  const n = (d: number) => a.worlds[d].short, out: string[] = [];
  const of = (k: GameEvent['kind']) => m.events.filter(e => e.kind === k);
  for (const e of of('link')) out.push(`${n(e.world)} and ${n(e.other!)} open a current.`);
  for (const e of of('unlink')) out.push(`The current between ${n(e.world)} and ${n(e.other!)} rests. Its ports are free.`);
  for (const e of of('ability')) out.push(abilityLine(e, a));
  for (const e of of('gift')) out.push(e.amount ? `The basin community tends ${n(e.world)}.` : `The basin community had nothing to give ${n(e.world)}.`);
  for (const e of of('mediated')) out.push(`${n(e.other!)} gives ${e.amount} water to ${n(e.world)} freely. Nothing is taken.`);
  for (const e of of('settled')) out.push(`${n(e.world)} and ${n(e.other!)} share a current now. There is nothing to take.`);
  for (const e of of('answered')) out.push(`${n(e.world)}’s thirst was answered. It leaves ${n(e.other!)} alone.`);
  for (const e of of('sheltered')) out.push(`${n(e.world)} reaches for ${n(e.other!)} and finds the vaults sealed.`);
  for (const e of of('seized')) out.push(`${n(e.world)} takes ${e.amount} water from ${n(e.other!)}; one is lost in the taking. They will not open a current to each other again this journey.`);
  for (const e of of('woke')) out.push(`${n(e.world)} wakes.`);
  const servers = [...new Set(of('served').map(e => e.world))];
  for (const s of servers) out.push(`${n(s)} renews what ${list([...new Set(of('served').filter(e => e.world === s).map(e => n(e.other!)))])} sent.`);
  for (const e of of('parked')) out.push(`${n(e.world)} rests ${e.amount} used water in ${n(e.other!)}’s cisterns instead of spilling it.`);
  const short = of('short').filter(e => !of('dormant').some(x => x.world === e.world));
  if (short.length) out.push(`${list(short.map(e => n(e.world)))} went thirsty.`);
  for (const e of of('dormant')) out.push(`${n(e.world)} went thirsty again and has gone dormant. It will wake when it holds water.`);
  for (const e of of('spill')) out.push(`${n(e.world)}’s holding overflowed: ${e.amount} used water spilled out of the orbit.`);
  if (m.basinUnmet) out.push('The basin community itself went without.');
  for (const e of of('threat')) out.push(`${n(e.world)} is thirsty and shares no current with ${n(e.other!)}. Next moment it will take from ${n(e.other!)}’s stores unless something changes.`);
  if (!out.length) out.push(m.sky === 'dark' ? 'The orbit holds through the dark. Nothing asks for you.' : 'Water goes out and comes back. Nothing asks for you.');
  return out;
}
export function learnedLines(m: Moment, a: ArenaDef = FIRST_ARENA): string[] {
  return m.learned.map(id => a.worlds.flatMap(w => w.traits.filter(t => t.id === id).map(t => `${w.short}: ${t.text}`))[0]).filter(Boolean);
}

// What a choice would change over the next three moments, compared with letting them pass.
// Built from the rules themselves, so it cannot promise what the rules will not do.
export interface Foresight { text: string; change: number }   // change > 0 helps, < 0 harms, 0 neither
export function foresee(g: Game, c: Choice, a: ArenaDef = FIRST_ARENA): Foresight {
  const base = outlook(g, { type: 'rest' }, 3, a), o = outlook(g, c, 3, a), n = (d: number) => a.worlds[d].short;
  const gone = (x: number[], y: number[]) => x.filter(d => !y.includes(d)), good: string[] = [], bad: string[] = [];
  const say = (ds: number[], one: string, many: string, into: string[]) => { if (ds.length) into.push(`${list(ds.map(n))} ${ds.length === 1 ? one : many}`); };
  if (base.night && !o.night) good.push('the long night does not fall');
  if (!base.night && o.night) bad.push('the long night would fall');
  say(gone(base.dormant, o.dormant), 'stays awake', 'stay awake', good); say(gone(o.dormant, base.dormant), 'would go dormant', 'would go dormant', bad);
  say(gone(base.short, o.short).filter(d => !base.dormant.includes(d) || o.dormant.includes(d)), 'does not go thirsty', 'do not go thirsty', good); say(gone(o.short, base.short), 'would go thirsty', 'would go thirsty', bad);
  say(gone(base.spill, o.spill), 'does not spill', 'do not spill', good); say(gone(o.spill, base.spill), 'would spill', 'would spill', bad);
  say(gone(base.strained, o.strained), 'comes out of strain', 'come out of strain', good); say(gone(o.strained, base.strained).filter(d => !o.spill.includes(d)), 'would become strained', 'would become strained', bad);
  if (base.seized && !o.seized) good.push('nothing is taken');
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (!good.length && !bad.length) {
    // Nothing crosses a line within three moments. Say the quieter truth instead: how much used
    // water would be waiting at each world with this choice, against waiting without it.
    const after = (first: Choice) => { let s = g; for (let i = 0; i < 3 && !s.outcome; i++) s = advance(s, i ? { type: 'rest' } : first, a); return s.used; };
    const without = after({ type: 'rest' }), withIt = after(c), diff = a.worlds.map((_, d) => withIt[d] - without[d]);
    const part = (sign: number, word: string) => { const ds = a.worlds.map((_, d) => d).filter(d => diff[d] * sign > 0).sort((x, y) => (diff[y] - diff[x]) * sign).slice(0, 2); return ds.length ? `${list(ds.map(d => `${n(d)} has ${Math.abs(diff[d])} ${word}`))} used water waiting` : ''; };
    const less = part(-1, 'less'), more = part(1, 'more'), net = diff.reduce((x, y) => x + y, 0);
    if (!less && !more) return { text: 'This changes nothing within three moments.', change: 0 };
    return { text: `Three moments on, ${[less, more].filter(Boolean).join('; ')}.`, change: net < 0 ? 0.5 : net > 0 ? -0.5 : 0.25 };
  }
  const first = good.length ? cap(`${good.join('; ')}.`) : '', second = bad.length ? (good.length ? `But ${bad.join('; ')}.` : cap(`${bad.join('; ')}.`)) : '';
  return { text: [first, second].filter(Boolean).join(' '), change: good.length - bad.length };
}

export interface Ending { outcome: Outcome; title: string; why: string[]; firstDormant: number }
export interface TurningPoint { moment: number; text: string }
export function recount(actions: Choice[], a: ArenaDef = FIRST_ARENA, known: string[] = []) {
  const n = (d: number) => a.worlds[d].short, points: TurningPoint[] = []; let g = newGame(a, known), firstDormant = 0, firstDormantWorld = -1, firstLink = false, firstThirst = false, spilled = 0, learned = 0;
  const slept: Record<number, number> = {};
  for (const c of actions) {
    g = advance(g, c, a); const m = g.last!, at = g.beat; learned += m.learned.length; spilled += m.spilled;
    for (const e of m.events) {
      if (e.kind === 'link' && !firstLink) { firstLink = true; points.push({ moment: at, text: `The first current: ${n(e.world)} and ${n(e.other!)}.` }); }
      if (e.kind === 'ability') points.push({ moment: at, text: abilityLine(e, a).replace(/ for three moments\.|\. For three moments.*$/, '.') });
      if (e.kind === 'short' && !firstThirst) { firstThirst = true; points.push({ moment: at, text: `The first thirst: ${n(e.world)}.` }); }
      if (e.kind === 'dormant') { if (!firstDormant) { firstDormant = at; firstDormantWorld = e.world; } slept[e.world] = at; points.push({ moment: at, text: `${n(e.world)} went dormant.` }); }
      if (e.kind === 'woke') points.push({ moment: at, text: `${n(e.world)} woke${slept[e.world] ? ` after ${at - slept[e.world]} ${at - slept[e.world] === 1 ? 'moment' : 'moments'}` : ''}.` });
      if (e.kind === 'seized') points.push({ moment: at, text: `${n(e.world)} took from ${n(e.other!)}. One water was lost and a current between them was closed for good.` });
      if (e.kind === 'mediated') points.push({ moment: at, text: `${n(e.other!)} gave to ${n(e.world)} freely.` });
      if (e.kind === 'sheltered') points.push({ moment: at, text: `A shelter turned ${n(e.world)} away from ${n(e.other!)}.` });
      if (e.kind === 'settled') points.push({ moment: at, text: `A new current settled what ${n(e.world)} wanted from ${n(e.other!)}.` });
    }
  }
  const p = pairs(a), bonds = p.flatMap(([x, y], e) => g.links[e] ? [{ text: `${n(x)} and ${n(y)}`, shared: g.memory[e] }] : []).sort((x, y) => y.shared - x.shared);
  return { game: g, points, bonds, spilled, learned, firstDormant, firstDormantWorld };
}
export function ending(g: Game, a: ArenaDef = FIRST_ARENA): Ending | null {
  if (!g.outcome) return null;
  const n = (d: number) => a.worlds[d].short, all = a.worlds.map((_, d) => d);
  if (g.outcome === 'dawn') return { outcome: 'dawn', title: 'A shared dawn.', firstDormant: 0, why: ['Every world is awake.', 'No one went thirsty as the journey closed.', 'No holding is near its limit. There is room to keep renewing.'] };
  if (g.outcome === 'night') return { outcome: 'night', title: 'The long night.', firstDormant: 0, why: [`Worlds lay dormant for ${g.night} moments in all, and the orbit could bear ${a.nightfall - 1}.`, 'Each moment a world spent dormant deepened the night. It did not fall at once.'] };
  const why: string[] = [], asleep = all.filter(d => g.dormant[d]), strained = all.filter(d => !g.dormant[d] && g.used[d] >= strainLine(d, a));
  if (asleep.length) why.push(`${list(asleep.map(n))} ${asleep.length === 1 ? 'is' : 'are'} still dormant.`);
  if (strained.length) why.push(`${list(strained.map(n))} ended with more used water than ${strained.length === 1 ? 'it' : 'they'} could renew.`);
  if (g.calm < 3) why.push('There was thirst in the last three moments.');
  return { outcome: 'peace', title: 'A fragile peace.', firstDormant: 0, why: ['The orbit came through the dark, but not whole.', ...why] };
}
export const linkedTo = (g: Game, d: number, a: ArenaDef = FIRST_ARENA) => pairs(a).flatMap(([x, y], e) => (x === d || y === d) && isLinked(g, e) ? [{ edge: e, other: x === d ? y : x }] : []);
