// Observation-limited bots. A bot sees only what a player would see: the public part of every
// past round, plus its own LISTEN results and SIGNAL replies. It never sees families, exact
// withdrawals, needs or reserves it has not listened for.
import type { Params } from './params.ts';
import type { World } from './world.ts';
import type { RoundRecord, NetEvent, Cause } from './engine.ts';
import { initState, historyRound, blankRecord, step, kindOf, targetOf, listen, signal, strike, HIDE } from './engine.ts';
import { mulberry32 } from './rng.ts';
import { ACTIONS } from './roster.ts';

export interface PublicRound {
  round: number;
  flow: number;
  band: number[];
  distress: boolean[];
  events: NetEvent[];
  attackers: number[];
  upheld: (boolean | null)[];
  // the player's own action and private results
  action: number;
  listen?: { need: number; reserve: number };
  signalResp?: 'accepted' | 'lacks' | 'declined';
  // the station's own condition after the round (the player always knows this)
  exposure: number;
  integrity: number;
}

export interface Obs {
  round: number;      // round about to be played, 1..rounds
  exposure: number;
  integrity: number;
  basinMin: number;
  history: PublicRound[]; // history[0] is the scripted history round
}

export type Bot = (o: Obs) => number;

export function toPublic(r: RoundRecord): PublicRound {
  return {
    round: r.round, flow: r.flow, band: r.band.slice(), distress: r.distress.slice(), events: r.events.slice(),
    attackers: r.attackers.slice(), upheld: r.upheld.slice(), action: r.action, listen: r.listen, signalResp: r.signalResp,
    exposure: r.exposure, integrity: r.integrity,
  };
}

// ---- What a careful player could reconstruct from the public record --------------------------
export interface Know {
  band: number[];
  listened: ({ need: number; reserve: number; round: number } | null)[];
  reply: ('accepted' | 'lacks' | 'declined' | null)[];
  inAgreement: boolean[];   // believed active for the round about to be played
  hitStation: boolean[];
  struckOther: boolean[];
  attackedLastRound: boolean;
  prevShort: boolean;
  threat: { from: number; to: number } | null; // G1b: a threat made public last round, resolving this round
}

export function know(o: Obs): Know {
  const n = o.history[0].band.length;
  const k: Know = {
    band: o.history[o.history.length - 1].band, listened: new Array(n).fill(null), reply: new Array(n).fill(null),
    inAgreement: new Array(n).fill(false), hitStation: new Array(n).fill(false), struckOther: new Array(n).fill(false),
    attackedLastRound: false, prevShort: false, threat: null,
  };
  const until = new Array(n).fill(0); // last round an agreement is expected to cover
  for (const h of o.history) {
    if (h.action >= 0) {
      const t = targetOf(h.action);
      const kind = kindOf(h.action);
      if (kind === 'L' && h.listen) k.listened[t] = { ...h.listen, round: h.round };
      if (kind === 'G' && h.signalResp) { k.reply[t] = h.signalResp; if (h.signalResp === 'accepted') until[t] = h.round + 1; }
      if (kind === 'K') until[t] = 0;
    }
    for (const e of h.events) {
      if (e.type === 'strike') k.struckOther[e.from] = true;
      if (e.type === 'signal' && e.result === 'accepted') until[e.to] = h.round + 1;
    }
    for (const d of h.attackers) k.hitStation[d] = true;
    h.upheld.forEach((u, d) => { if (u === false) until[d] = 0; });
  }
  const last = o.history[o.history.length - 1];
  k.attackedLastRound = last.attackers.length > 0;
  const th = last.events.find((e) => e.type === 'threat');
  if (th) k.threat = { from: th.from, to: th.to };
  k.prevShort = last.round > 0 && last.flow < o.basinMin;
  for (let d = 0; d < n; d++) k.inAgreement[d] = until[d] >= o.round;
  return k;
}

// Highest public band among districts passing `ok`; ties go to the lowest index (index carries no information).
function highest(k: Know, ok: (d: number) => boolean): number {
  let best = -1;
  for (let d = 0; d < k.band.length; d++) if (ok(d) && (best < 0 || k.band[d] > k.band[best])) best = d;
  return best;
}

// ---- The bots --------------------------------------------------------------------------------
export const hideAlways: Bot = () => HIDE;

export const strikeEvery: Bot = (o) => strike(highest(know(o), () => true));

// LISTEN once, then STRIKE on even rounds and HIDE on odd ones.
export const alternateStrike: Bot = (o) => {
  const k = know(o);
  if (o.round === 1) return listen(highest(k, () => true));
  return o.round % 2 === 0 ? strike(highest(k, () => true)) : HIDE;
};

// Strike only after seeing a shortfall; otherwise stay hidden or listen.
export const reactiveStrike: Bot = (o) => {
  const k = know(o);
  if (o.history[o.history.length - 1].flow < o.basinMin) return strike(highest(k, () => true));
  if (o.exposure >= 2) return HIDE;
  const d = highest(k, (x) => !k.listened[x]);
  return d >= 0 ? listen(d) : HIDE;
};

const signalTarget = (k: Know) => highest(k, (d) => !k.inAgreement[d] && k.reply[d] !== 'declined' && k.reply[d] !== 'lacks');

// SIGNAL the heaviest extractor, HIDE whenever targetable. Never listens.
export const coopFirst: Bot = (o) => {
  const k = know(o);
  if (o.exposure >= 2) return HIDE;
  const d = signalTarget(k);
  return d >= 0 ? signal(d) : HIDE;
};

// SIGNAL every round and never hide.
export const coopLoud: Bot = (o) => {
  const k = know(o);
  const d = signalTarget(k);
  return d >= 0 ? signal(d) : HIDE;
};

// LISTEN before every offer; only SIGNAL a district known to have the reserves to accept.
export const listenThenSignal: Bot = (o) => {
  const k = know(o);
  if (o.exposure >= 2) return HIDE;
  const fresh = (d: number) => k.listened[d] !== null && o.round - k.listened[d]!.round <= 2;
  const poor = (d: number) => fresh(d) && k.listened[d]!.reserve < 2;
  const d = highest(k, (x) => !k.inAgreement[x] && k.reply[x] !== 'declined' && k.reply[x] !== 'lacks' && !poor(x));
  if (d < 0) return HIDE;
  return fresh(d) ? signal(d) : listen(d);
};

// Uses everything: listens first, offers where an offer can work, and strikes only in an
// emergency and only a district it believes can absorb the blow (declined despite capacity,
// or known reserves of 5+). With useListen = false it is the same policy minus the opening LISTEN,
// which isolates what the LISTEN is worth.
function makeInformed(useListen: boolean): Bot {
  return (o) => {
    const k = know(o);
    if (useListen && o.round === 1) return listen(highest(k, () => true));
    const emergency = k.prevShort;
    if (o.exposure >= 2 && !emergency) return HIDE;
    if (emergency) {
      const absorb = highest(k, (d) => !k.inAgreement[d] && (k.reply[d] === 'declined' || (k.listened[d]?.reserve ?? 0) >= 5) && k.reply[d] !== 'accepted');
      const offer = signalTarget(k);
      if (offer >= 0 && (k.listened[offer]?.reserve ?? 2) >= 2 && k.reply[offer] !== 'declined') return signal(offer);
      if (absorb >= 0) return strike(absorb);
      return offer >= 0 ? signal(offer) : HIDE;
    }
    const d = signalTarget(k);
    if (d < 0) return HIDE;
    if (k.listened[d] && k.listened[d]!.reserve < 2) {
      const other = highest(k, (x) => x !== d && !k.inAgreement[x] && k.reply[x] === null && !(k.listened[x] && k.listened[x]!.reserve < 2));
      return other >= 0 ? signal(other) : HIDE;
    }
    return signal(d);
  };
}
export const informedMixed = makeInformed(true);
export const informedNoListen = makeInformed(false);

// "cooperate, hide when exposed" with one opening LISTEN on the heaviest extractor; it skips that
// district if the LISTEN shows it cannot accept.
export const listenOnceThenCoop: Bot = (o) => {
  const k = know(o);
  if (o.round === 1) return listen(highest(k, () => true));
  if (o.exposure >= 2) return HIDE;
  const d = highest(k, (x) => !k.inAgreement[x] && k.reply[x] !== 'declined' && k.reply[x] !== 'lacks' && !(k.listened[x] && k.listened[x]!.reserve < 2));
  return d >= 0 ? signal(d) : HIDE;
};

export function randomBot(seed: number): Bot {
  const r = mulberry32(seed);
  return () => Math.floor(r() * ACTIONS);
}

// ---- G1b: policies that read threats ---------------------------------------------------------
// Kept in a separate registry so the baseline bot list, and every baseline output, stays as it was.
const canOffer = (k: Know, x: number) => !k.inAgreement[x] && k.reply[x] !== 'declined' && k.reply[x] !== 'lacks';

// Threat pending: ask the threatened district to conserve. Otherwise plain cooperation.
export const defuseBySignal: Bot = (o) => {
  const k = know(o);
  if (k.threat && canOffer(k, k.threat.to)) return signal(k.threat.to);
  return coopFirst(o);
};
// Threat pending: strike the district making it. Otherwise plain cooperation.
export const defuseByStrike: Bot = (o) => {
  const k = know(o);
  return k.threat ? strike(k.threat.from) : coopFirst(o);
};
// Threat pending: offer if an offer can work, strike the attacker if the target has already refused.
export const defuseEither: Bot = (o) => {
  const k = know(o);
  if (k.threat) return canOffer(k, k.threat.to) ? signal(k.threat.to) : strike(k.threat.from);
  return informedNoListen(o);
};
// Force only: strike whoever threatens, hide when targetable, otherwise listen. Never signals.
export const guardOnly: Bot = (o) => {
  const k = know(o);
  if (k.threat) return strike(k.threat.from);
  if (o.exposure >= 2) return HIDE;
  const d = highest(k, (x) => !k.listened[x]);
  return d >= 0 ? listen(d) : HIDE;
};

export const BOTS: Record<string, Bot> = {
  'hide x6 (do nothing)': hideAlways,
  'strike every round': strikeEvery,
  'alternate strike': alternateStrike,
  'reactive strike': reactiveStrike,
  'cooperate, hide when exposed': coopFirst,
  'cooperate loudly': coopLoud,
  'listen once, then cooperate': listenOnceThenCoop,
  'listen before every offer': listenThenSignal,
  'informed mixed, no listen': informedNoListen,
  'informed mixed': informedMixed,
};

// ---- Offensive-action comparison ---------------------------------------------------------------
// The third action means different things under different strikeMode settings; these bots use it
// the way each variant intends.
// SHIELD: stand in front of whoever is threatened. Otherwise plain cooperation.
export const shieldThreatened: Bot = (o) => {
  const k = know(o);
  return k.threat ? strike(k.threat.to) : coopFirst(o);
};
// REVEAL: listen to the two heaviest extractors first; reveal a threatened district known to be
// short, or a district known to be sitting on 8 or more; otherwise defuse by signal.
export const listenThenReveal: Bot = (o) => {
  const k = know(o);
  const revealed = new Set(o.history.filter((h) => h.action >= 12 && h.action < 18).map((h) => targetOf(h.action)));
  if (k.threat) {
    const x = k.threat.to;
    if (k.listened[x] && k.listened[x]!.reserve < 4 && !revealed.has(x)) return strike(x);
    if (canOffer(k, x)) return signal(x);
  }
  if (o.exposure >= 2) return HIDE;
  const hoard = highest(k, (d) => !!k.listened[d] && k.listened[d]!.reserve >= 8 && !k.inAgreement[d] && !revealed.has(d));
  if (hoard >= 0) return strike(hoard);
  if (o.round <= 2) { const d = highest(k, (x) => !k.listened[x]); if (d >= 0) return listen(d); }
  return coopFirst(o);
};

export const THREAT_BOTS: Record<string, Bot> = {
  ...BOTS,
  'defuse by signal': defuseBySignal,
  'defuse by strike': defuseByStrike,
  'defuse: signal, else strike': defuseEither,
  'guard: strike threats only': guardOnly,
};
// G1c: a conditional policy. The basin comes first: if it was short last round, play the emergency
// policy. Otherwise, with a threat standing, offer to the target if an offer can still work, and
// strike the attacker only when the target has already refused or said it cannot.
export const protectWhenSafe: Bot = (o) => {
  const k = know(o);
  if (k.threat && !k.prevShort) return canOffer(k, k.threat.to) ? signal(k.threat.to) : strike(k.threat.from);
  return informedNoListen(o);
};

export const ALT_BOTS: Record<string, Bot> = {
  ...THREAT_BOTS,
  'protect when the basin is safe': protectWhenSafe,
  'shield the threatened': shieldThreatened,
  'listen, then reveal': listenThenReveal,
};

// ---- Harness ---------------------------------------------------------------------------------
export interface BotRun {
  won: boolean;
  causes: Cause[];
  actions: number[];
  records: RoundRecord[];
  harm: number;          // total unmet need across the six districts, in units
  distressRounds: number; // district-rounds of serious unmet need
  integrity: number;
  strikes: number;
  signals: number;
}

export function playBot(w: World, p: Params, bot: Bot): BotRun {
  const s = initState(w, p);
  const records = [historyRound(w, p, s)];
  const history = [toPublic(records[0])];
  const actions: number[] = [];
  while (s.status === 'ongoing') {
    const a = bot({ round: s.round, exposure: s.exposure, integrity: s.integrity, basinMin: p.basinMin, history });
    const rec = blankRecord(p, s.round, a);
    step(w, p, s, a, rec);
    records.push(rec);
    history.push(toPublic(rec));
    actions.push(a);
  }
  let harm = 0, distressRounds = 0;
  for (const r of records.slice(1)) { harm += r.unmet.reduce((x, y) => x + y, 0); distressRounds += r.distress.filter(Boolean).length; }
  return {
    won: s.status === 'won', causes: s.causes, actions, records, harm, distressRounds, integrity: s.integrity,
    strikes: actions.filter((a) => kindOf(a) === 'K').length, signals: actions.filter((a) => kindOf(a) === 'G').length,
  };
}
