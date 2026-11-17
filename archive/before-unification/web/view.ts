// G1.5 playable: everything the player reads, as plain data. No DOM here, so it runs in Node tests.
//
// Leak rule: these functions take only what a player is allowed to see (PublicRound: the public
// record plus the station's own results). Hidden state reaches the page only through `reveal()`,
// which is called once the game is over.
import type { Params } from '../src/params.ts';
import type { World } from '../src/world.ts';
import type { PublicRound } from '../src/bots.ts';
import { kindOf, targetOf, actionName } from '../src/engine.ts';
import type { Ledger } from '../src/ledger.ts';
import { LETTERS } from '../src/roster.ts';

export const NAME = LETTERS;
export const BAND = ['low', 'medium', 'heavy'];

export type Tone = 'you' | 'calm' | 'warn' | 'harm' | 'basin';
export interface Line { tone: Tone; text: string }

// One round, in the order it resolved.
export function narrate(r: PublicRound, basinMin: number, shortBefore: boolean): Line[] {
  const out: Line[] = [];
  const N = (d: number) => NAME[d];

  if (r.action >= 0) {
    const k = kindOf(r.action), t = targetOf(r.action);
    if (k === 'L' && r.listen) out.push({ tone: 'you', text: `You listened to ${N(t)}. It needs ${r.listen.need} this round and holds ${r.listen.reserve} in reserve.` });
    if (k === 'G') {
      const reply = r.signalResp === 'accepted' ? 'It agreed, and will draw on its reserve this round and next.'
        : r.signalResp === 'lacks' ? 'It cannot: its reserve is too low.' : 'It declined.';
      out.push({ tone: 'you', text: `You asked ${N(t)} to conserve. ${reply}` });
    }
    if (k === 'K') out.push({ tone: 'you', text: `You struck ${N(t)}. It cannot act on the network this round.` });
    if (k === 'H') out.push({ tone: 'you', text: `You hid. Exposure is now ${r.exposure}.` });
  }

  for (const e of r.events) {
    if (e.type === 'threat') out.push({ tone: 'warn', text: `${N(e.from)} threatens ${N(e.to)}. It will strike next round if ${N(e.to)} is still drawing heavily.` });
    else if (e.type === 'lapse' && e.result === 'cancelled') out.push({ tone: 'calm', text: `${N(e.from)}'s threat against ${N(e.to)} lapsed: ${N(e.to)} is no longer drawing heavily.` });
    else if (e.type === 'lapse') out.push({ tone: 'calm', text: `Your strike stopped ${N(e.from)} from carrying out its threat against ${N(e.to)}.` });
    else if (e.type === 'strike' && e.reason === 'threat') out.push({ tone: 'harm', text: `${N(e.from)} carried out its threat and struck ${N(e.to)}.` });
    else if (e.type === 'strike' && e.reason === 'retaliation') out.push({ tone: 'harm', text: `${N(e.from)} struck back at ${N(e.to)}.` });
    else if (e.type === 'strike') out.push({ tone: 'harm', text: `${N(e.from)} struck ${N(e.to)}, which had attacked another district.` });
    else if (e.type === 'signal') {
      const tail = e.result === 'accepted' ? 'which agreed' : e.result === 'lacks' ? 'which has too little in reserve' : 'which declined';
      out.push({ tone: 'calm', text: `${N(e.from)} passed the offer on to ${N(e.to)}, ${tail}.` });
    }
  }

  r.upheld.forEach((u, d) => { if (u === false) out.push({ tone: 'warn', text: `${N(d)} broke its agreement and went back to the river.` }); });
  for (const d of r.attackers) out.push({ tone: 'harm', text: `${N(d)} hit your station. Integrity ${Math.max(0, r.integrity)} of 3.` });
  r.distress.forEach((x, d) => { if (x) out.push({ tone: 'harm', text: `${N(d)} could not meet its need this round.` }); });

  const short = r.flow < basinMin;
  let basin = `The basin received ${r.flow}. It needs ${basinMin}.`;
  if (short) basin += ` Short by ${basinMin - r.flow}.`;
  if (short && r.round > 0 && !shortBefore) basin += ' One more short round in a row and it collapses.';
  out.push({ tone: short ? 'basin' : 'calm', text: basin });
  return out;
}

// ---- Endings ---------------------------------------------------------------------------------
export type Ending = 'shared-dawn' | 'fragile-peace' | 'long-night';
export interface EndingView { ending: Ending; title: string; why: string; detail: string[] }

// Shared Dawn threshold is a PROVISIONAL placeholder (SPEC.md section 9): survived, and no district
// was ever in distress. Ben has deferred ending thresholds.
export function endingOf(L: Ledger): EndingView {
  const detail: string[] = [];
  const t = L.totals;
  detail.push(t.hardship === 0 ? 'No district went short.' : `Districts went short by ${t.hardship} unit${t.hardship === 1 ? '' : 's'} in all, across ${t.distressRounds} round${t.distressRounds === 1 ? '' : 's'} of distress.`);
  detail.push(`Stored water across the network changed by ${t.reserveChange >= 0 ? '+' : '−'}${Math.abs(t.reserveChange)} (${t.agreementDraw} drawn under agreements, ${t.emergencyDraw} in emergencies).`);
  const empty = L.district.reserveFinal.map((x, d) => (x === 0 ? NAME[d] : '')).filter(Boolean);
  if (empty.length) detail.push(`${empty.join(', ')} ${empty.length === 1 ? 'ends' : 'end'} with nothing stored.`);
  detail.push(L.destroyed === 0 ? 'No water was destroyed.' : `${L.destroyed} units of water were destroyed in ${L.conflict.strikes} strike${L.conflict.strikes === 1 ? '' : 's'} between districts.`);
  detail.push(`The basin fell short by ${L.basin.harm} in all over six rounds.`);
  if (t.catchupOutstanding + t.agreementRoundsOutstanding + L.conflict.threatOutstanding > 0) detail.push('Some things are unfinished: a threat, a promise or a debt of water carries past round six.');

  if (L.legacy.outcome === 'lost') {
    const c = L.legacy.causes;
    const why = c.includes('station') ? 'Your station was destroyed.' : c.includes('basin') ? 'The basin went short two rounds running and collapsed.' : 'A district went without two rounds running.';
    if (L.legacy.endedRound < L.roundsEvaluated) detail.unshift(`It ended in round ${L.legacy.endedRound}. The figures below include the rounds the world ran on without you.`);
    return { ending: 'long-night', title: 'The Long Night', why, detail };
  }
  if (t.distressRounds === 0) return { ending: 'shared-dawn', title: 'Shared Dawn', why: 'The station and the basin survived, and no district was ever in distress.', detail };
  return { ending: 'fragile-peace', title: 'Fragile Peace', why: 'The station and the basin survived, but a district went through distress along the way.', detail };
}

// ---- The reveal (hidden state; only after the game ends) --------------------------------------
const FAMILY: Record<string, { name: string; note: string }> = {
  R: { name: 'Reciprocal', note: 'Agrees whenever it has the reserve. Struck, it hits back once and refuses you afterwards.' },
  E: { name: 'Extractive', note: 'Agrees only with 8 or more in reserve. Never attacks you.' },
  P: { name: 'Preemptive', note: 'Threatens heavy extractors. Attacks you at exposure 4. Struck, it hits back once. Refuses you once you have struck anyone.' },
};
export function reveal(w: World): { letter: string; family: string; note: string; startReserve: number }[] {
  return w.family.map((f, d) => ({ letter: NAME[d], family: FAMILY[f].name, note: FAMILY[f].note, startReserve: w.reserve0[d] }));
}

export function possible(p: Params, s: { wins: number; total: number; passiveWins: boolean; minStrikes: number }, line: number[] | null): string[] {
  const out: string[] = [];
  if (s.wins === 0) { out.push('With full knowledge of this world, no sequence of six actions survives it. It could not be won.'); return out; }
  const share = (100 * s.wins) / s.total;
  out.push(`With full knowledge, ${s.wins.toLocaleString('en')} of ${s.total.toLocaleString('en')} possible games survive this world (${share < 0.1 ? 'under 0.1' : share.toFixed(1)}%).`);
  out.push(s.passiveWins ? 'Doing nothing at all would have survived.' : 'Doing nothing would have lost.');
  out.push(s.minStrikes === 0 ? 'It can be survived without a single strike.' : `Every surviving game uses at least ${s.minStrikes} strike${s.minStrikes === 1 ? '' : 's'}.`);
  if (line) out.push(`One surviving game: ${line.map(actionName).join(' · ')}.`);
  return out;
}

export const runCode = (seed: number, actions: number[]) => `world ${seed}: ${actions.map(actionName).join(', ')}`;
