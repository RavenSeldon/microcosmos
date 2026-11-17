// A resolved round as four beats, in the order the engine resolved it:
//   1 your action · 2 responses (replies, the network) · 3 the water · 4 consequences
// Built from the public round only. The renderer animates these; the HUD lists them.
import type { PublicRound } from '../src/bots.ts';
import { kindOf, targetOf } from '../src/engine.ts';
import { letter } from '../src/roster.ts';

export type BeatKind = 'listen' | 'offer' | 'strike' | 'hide' | 'reply' | 'threat' | 'lapse' | 'interrupted' | 'net-strike' | 'relay' | 'flow' | 'hit' | 'broken' | 'distress' | 'basin';
export interface Beat { phase: 1 | 2 | 3 | 4; kind: BeatKind; from: number | 'station' | 'river'; to: number | 'station' | 'basin'; text: string; good?: boolean }
export const PHASES = ['Your move', 'Responses', 'The water', 'Consequences'];

export function beatsOf(r: PublicRound, before: { flow: number; integrity: number }, basinMin: number): Beat[] {
  const out: Beat[] = [];
  const L = letter;
  if (r.action >= 0) {
    const k = kindOf(r.action), d = targetOf(r.action);
    if (k === 'L') out.push({ phase: 1, kind: 'listen', from: 'station', to: d, text: `You listened to ${L(d)}.` });
    if (k === 'G') out.push({ phase: 1, kind: 'offer', from: 'station', to: d, text: `You asked ${L(d)} to conserve.` });
    if (k === 'K') out.push({ phase: 1, kind: 'strike', from: 'station', to: d, text: `You struck ${L(d)}.` });
    if (k === 'H') out.push({ phase: 1, kind: 'hide', from: 'station', to: 'station', text: 'You went dark.' });
    if (k === 'L' && r.listen) out.push({ phase: 2, kind: 'reply', from: d, to: 'station', text: `${L(d)} needs ${r.listen.need} and holds ${r.listen.reserve}.`, good: true });
    if (k === 'G' && r.signalResp) {
      const t = r.signalResp === 'accepted' ? `${L(d)} agreed.` : r.signalResp === 'lacks' ? `${L(d)} has too little stored to agree.` : `${L(d)} declined.`;
      out.push({ phase: 2, kind: 'reply', from: d, to: 'station', text: t, good: r.signalResp === 'accepted' });
    }
  }
  for (const e of r.events) {
    if (e.type === 'threat') out.push({ phase: 2, kind: 'threat', from: e.from, to: e.to, text: `${L(e.from)} threatens ${L(e.to)}.` });
    else if (e.type === 'lapse' && e.result === 'interrupted') out.push({ phase: 2, kind: 'interrupted', from: e.from, to: e.to, text: `${L(e.from)}'s attack on ${L(e.to)} was stopped.`, good: true });
    else if (e.type === 'lapse') out.push({ phase: 2, kind: 'lapse', from: e.from, to: e.to, text: `${L(e.from)}'s threat against ${L(e.to)} lapsed.`, good: true });
    else if (e.type === 'strike') out.push({ phase: 2, kind: 'net-strike', from: e.from, to: e.to, text: e.reason === 'threat' ? `${L(e.from)} struck ${L(e.to)}, as it threatened.` : e.reason === 'retaliation' ? `${L(e.from)} struck back at ${L(e.to)}.` : `${L(e.from)} struck ${L(e.to)}.`, good: false });
    else if (e.type === 'signal') out.push({ phase: 2, kind: 'relay', from: e.from, to: e.to, text: `${L(e.from)} passed the offer to ${L(e.to)}: ${e.result === 'accepted' ? 'it agreed' : e.result === 'lacks' ? 'it has too little' : 'it declined'}.`, good: e.result === 'accepted' });
  }
  const dFlow = r.flow - before.flow;
  out.push({ phase: 3, kind: 'flow', from: 'river', to: 'basin', text: `The basin received ${r.flow} (${dFlow >= 0 ? '+' : '−'}${Math.abs(dFlow)} on last round). It needs ${basinMin}.`, good: r.flow >= basinMin });
  for (const d of r.attackers) out.push({ phase: 4, kind: 'hit', from: d, to: 'station', text: `${L(d)} hit your station: integrity ${Math.max(0, r.integrity)} of 3.`, good: false });
  r.upheld.forEach((u, d) => { if (u === false) out.push({ phase: 4, kind: 'broken', from: d, to: d, text: `${L(d)} broke its agreement.`, good: false }); });
  r.distress.forEach((x, d) => { if (x) out.push({ phase: 4, kind: 'distress', from: d, to: d, text: `${L(d)} could not meet its need.`, good: false }); });
  out.push({ phase: 4, kind: 'basin', from: 'river', to: 'basin', text: r.flow < basinMin ? `The basin is short by ${basinMin - r.flow}.` : 'The basin holds.', good: r.flow >= basinMin });
  return out;
}
