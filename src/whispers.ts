// The guidance, spoken from inside the world. A world says what it needs when it needs it; the
// Seventh Basin (the community whose water the player keeps) says the rest. At most one line at a
// time, each said once. Every line is checked against the rules in test/whispers.test.ts: a world
// may only say what is true of it at that moment. No DOM here.
import { FIRST_ARENA } from './arenas.ts';
import type { ArenaDef } from './arenas.ts';
import { outlook, strainLine, activeAt, skyAt } from './microcosmos.ts';
import type { Game, GameEvent } from './microcosmos.ts';

export interface Whisper { id: string; who: number | 'basin'; text: string }

export function whisper(g: Game, heard: ReadonlySet<string>, selected = -1, a: ArenaDef = FIRST_ARENA): Whisper | null {
  if (g.outcome) return null;
  const W = a.worlds, name = (d: number) => W[d].short, next = g.beat + 1, m = g.last;
  const first = (kind: GameEvent['kind']) => m?.events.find(e => e.kind === kind);
  const of = (archetype: string) => W.findIndex(w => w.archetype === archetype);
  const o = outlook(g, { type: 'rest' }, 2, a), darkLength = a.dark[1] - a.dark[0] + 1;
  const lines: (() => Whisper | null)[] = [
    // Before the first moment: who is speaking, and that listening is free.
    () => { const d = W.findIndex(w => w.renew[skyAt(1, a)] < w.need && w.archetype === 'forge'); const who = d >= 0 ? d : W.findIndex(w => w.renew[skyAt(1, a)] < w.need);
      return g.beat === 0 && selected < 0 && who >= 0 ? { id: 'hello', who, text: 'Each moment I use more water than I can make clean under this sky. Choose a world to hear it. Listening costs nothing.' } : null; },
    () => g.beat === 0 && selected >= 0 ? { id: 'foresight', who: 'basin', text: 'Choose one small change, then watch us answer. The forecast compares the next three moments with waiting; the water ledger holds the detail.' } : null,
    // Urgent things first.
    () => g.threat ? { id: 'threat', who: g.threat.from, text: `I am thirsty, and ${name(g.threat.to)} has plenty. Next moment I take from its stores, and some will be lost in the taking. Answer me before then.` } : null,
    () => { const e = first('dormant'); return e ? { id: 'dormant', who: 'basin', text: `${name(e.world)} went thirsty twice running and has gone dormant. Water wakes it. Each moment a world sleeps, the night gathers; at ${a.nightfall} the journey is lost.` } : null; },
    () => { const e = first('seized'); return e ? { id: 'seized', who: e.other!, text: `${name(e.world)} took from me. I will not open a current to it again this journey.` } : null; },
    () => { const e = first('spill'); return e ? { id: 'spill', who: e.world, text: 'My holding overflowed. What spilled has left the orbit for good.' } : null; },
    () => { const d = o.short.find(x => !g.dormant[x]); return d !== undefined ? { id: 'thirst', who: d, text: 'I will go thirsty within two moments if nothing changes. Twice running, and I go dormant.' } : null; },
    () => { const d = W.findIndex((_, x) => !g.dormant[x] && g.used[x] >= strainLine(x, a)); return d >= 0 ? { id: 'strain', who: d, text: 'My holding is nearly full. I can clean some used water myself. A neighbour along a current, or your reed beds if you tend me, can help make room.' } : null; },
    // The sky.
    () => next === a.dark[0] - 1 || next === a.dark[0] ? { id: 'dark-near', who: 'basin', text: `The sky is closing. ${darkLength} moments without rain are coming. Each world will live on what it holds and what can be renewed.` } : null,
    () => { const d = of('forge'); return d >= 0 && g.beat >= a.dark[0] && next <= a.dark[1] - 1 && !g.dormant[d] && !activeAt(g, d) ? { id: 'forge-season', who: d, text: 'The dark is my season. Stoke the forge now and I renew twice as much. What I do not need, I renew for whoever shares a current with me.' } : null; },
    () => { const d = of('wetland'); return d >= 0 && next === a.dark[1] + 1 && !g.dormant[d] ? { id: 'return', who: d, text: 'Rain is coming back, and my wetlands with it. Send me what you have used.' } : null; },
    () => next === a.dark[1] + 2 ? { id: 'dawn-terms', who: 'basin', text: 'For a shared dawn: every world awake at the end, no thirst in the last three moments, and no holding nearly full.' } : null,
    // What the player has just done, and what it showed.
    () => { const e = first('link'); return e ? { id: 'first-current', who: e.world, text: 'A current is open. Watch it: gold light is used water going out to be renewed, blue is clean water being shared.' } : null; },
    () => { const e = first('served'); return e ? { id: 'served', who: e.world, text: `I made clean what ${name(e.other!)} could not. That is what a current is for.` } : null; },
    // Room to breathe.
    () => g.beat === 2 ? { id: 'undo', who: 'basin', text: 'Any moment can be taken back. Nothing here punishes trying.' } : null,
    () => g.beat >= 3 && !g.threat && !o.short.length && !o.dormant.length && !o.spill.length && !o.night && W.every((_, d) => !g.dormant[d] && g.used[d] < strainLine(d, a)) ? { id: 'quiet', who: 'basin', text: 'There is room to breathe. Let a moment flow. When the sky and water are settled, the currents can work until something needs you.' } : null,
  ];
  for (const line of lines) { const w = line(); if (w && !heard.has(w.id)) return w; }
  return null;
}
