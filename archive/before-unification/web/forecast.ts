// What the player can know about a move before making it, sorted into three kinds:
//   known        follows from the public rules alone; will happen
//   conditional  will happen only if a hidden answer goes one way
//   unknown      cannot be predicted from anything the player has seen
//
// Built ONLY from public information: the public history (which includes the player's own LISTEN
// results and the replies to their offers). The hidden families, needs and reserves never reach
// this module. test/forecast.test.ts checks that two worlds with the same public history and
// different hidden policies give identical forecasts, and that every "known" claim comes true.
//
// The sentences describe the rules the playable build uses: conditional threats (G1b), refined
// STRIKE with one response per strike (G1d). If those rules change, this module must change too.
import type { Params } from '../src/params.ts';
import type { PublicRound } from '../src/bots.ts';
import { know } from '../src/bots.ts';
import { kindOf, targetOf, HIDE } from '../src/engine.ts';
import { letter } from '../src/roster.ts';

export interface Preview {
  title: string;
  known: string[];
  conditional: string[];
  unknown: string[];
  basin: { certain: number; upTo: number; note: string };
  exposure: { before: number; after: number; targetable: boolean; full: boolean };
}

export interface Situation {
  round: number;            // round about to be played
  exposure: number;
  integrity: number;
  lastFlow: number;
  shortStreak: boolean;     // last round was short and counted: one more ends the game
  threat: { from: number; to: number } | null;
  struckByStation: boolean[];
  stationHasStruck: boolean;
  lastReply: ('accepted' | 'lacks' | 'declined' | null)[];
  heard: ({ need: number; reserve: number; round: number } | null)[];
  inAgreement: boolean[];
}

export function situation(history: PublicRound[], p: Params): Situation {
  const last = history[history.length - 1];
  const round = last.round + 1;
  const k = know({ round, exposure: last.exposure, integrity: last.integrity, basinMin: p.basinMin, history });
  const n = last.band.length;
  const struckByStation = new Array(n).fill(false);
  for (const h of history) if (h.action >= 0 && kindOf(h.action) === 'K') struckByStation[targetOf(h.action)] = true;
  return {
    round, exposure: last.exposure, integrity: last.integrity, lastFlow: last.flow,
    shortStreak: last.round > 0 && last.flow < p.basinMin, threat: k.threat,
    struckByStation, stationHasStruck: struckByStation.some(Boolean), lastReply: k.reply, heard: k.listened, inAgreement: k.inAgreement,
  };
}

const clampX = (x: number, p: Params) => Math.max(0, Math.min(p.exposure.max, x));

export function preview(a: number, history: PublicRound[], p: Params): Preview {
  const s = situation(history, p);
  const kind = kindOf(a), d = targetOf(a), D = d >= 0 ? letter(d) : '';
  const known: string[] = [], conditional: string[] = [], unknown: string[] = [];
  const delta = kind === 'L' ? p.exposure.listen : kind === 'G' ? p.exposure.signal : kind === 'K' ? p.exposure.strike : p.exposure.hide;
  const after = clampX(s.exposure + delta, p);
  const ex = { before: s.exposure, after, targetable: after >= p.exposure.targetable, full: after >= p.exposure.max };
  let basin = { certain: 0, upTo: 0, note: 'Your move does not change the river.' };
  let title = '';

  if (kind === 'L') {
    title = `Listen to ${D}`;
    known.push(`You learn how much ${D} needs this round and how much it holds in reserve.`);
    known.push('Nobody can tell you listened: exposure stays where it is.');
  } else if (kind === 'G') {
    title = `Ask ${D} to conserve`;
    if (s.struckByStation[d]) {
      known.push(`${D} will not agree: you struck it.`);
      basin = { certain: 0, upTo: 0, note: `${D} will not agree, so nothing changes in the river.` };
    } else {
      const h = s.heard[d];
      if (h && h.reserve < p.signal.capacityMin) conditional.push(`${D} held only ${h.reserve} when you listened in round ${h.round}. It will probably say it has too little to agree.`);
      else if (h) conditional.push(`${D} held ${h.reserve} when you listened in round ${h.round}, enough to agree if it chooses to.`);
      conditional.push(`If ${D} agrees, it lives on its reserve instead of the river for two rounds: the basin gets up to +${p.signal.cover} each round.`);
      if (s.lastReply[d] === 'declined') conditional.push(`${D} declined last time you asked.`);
      if (s.stationHasStruck) conditional.push('Some kinds of world refuse any station that has struck anyone.');
      if (s.threat && s.threat.to === d) conditional.push(`If ${D} agrees, its draw falls and ${letter(s.threat.from)}'s threat against it should lapse.`);
      unknown.push(`Whether ${D} agrees: that depends on what kind of world it is, which you cannot see.`);
      basin = { certain: 0, upTo: p.signal.cover, note: `Up to +${p.signal.cover} if ${D} agrees.` };
    }
  } else if (kind === 'K') {
    title = `Strike ${D}`;
    known.push(`${D} cannot act on the network this round. Its water is not touched.`);
    if (s.threat && s.threat.from === d) known.push(`This stops ${D}'s threat against ${letter(s.threat.to)}: the attack cannot happen this round. (If ${letter(s.threat.to)} had stopped drawing heavily anyway, it would have lapsed without you.)`);
    if (s.threat && s.threat.to === d) known.push(`This does not protect ${D}: the threat against it depends on ${D}'s own draw.`);
    known.push(`${D} will refuse your offers from now on.`);
    conditional.push(`${D} may hit your station back once, this round: −1 integrity. Some kinds of world never hit back.`);
    conditional.push('Some kinds of world refuse any station that has struck anyone.');
    if (!(s.threat && s.threat.from === d)) unknown.push(`What ${D} would have done on the network this round.`);
  } else {
    title = 'Hide';
    known.push(`Your station goes dark: exposure ${s.exposure} → ${after}.`);
    known.push('You change nothing else this round.');
    if (s.threat) known.push(`${letter(s.threat.from)}'s threat against ${letter(s.threat.to)} resolves without you.`);
  }

  if (kind !== 'H') {
    if (after !== s.exposure) known.push(`Exposure ${s.exposure} → ${after}${ex.targetable && s.exposure < p.exposure.targetable ? ': your station becomes visible to the others' : ''}.`);
    if (ex.full) conditional.push(`At exposure ${p.exposure.max}, some kinds of world fire on your station unprovoked: −1 integrity.`);
  }
  if (s.shortStreak) unknown.push('The basin was short last round. Whether it is short again depends on every ship, not only your move.');
  return { title, known, conditional, unknown, basin, exposure: ex };
}

// The standing threat, if any, stated as plainly as the rules allow.
export function threatLine(history: PublicRound[], p: Params): string | null {
  const s = situation(history, p);
  if (!s.threat) return null;
  const X = letter(s.threat.from), Y = letter(s.threat.to);
  return `${X} threatens ${Y}. If ${Y} is still drawing heavily after your move, ${X} strikes it: ${Y} loses up to ${p.strike.prevent} of its draw and ${p.strike.destroy} water is destroyed.`;
}
