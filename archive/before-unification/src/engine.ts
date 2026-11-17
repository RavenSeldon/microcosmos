import type { Params } from './params.ts';
import type { World } from './world.ts';
import { DISTRICTS as N, LETTERS, assertRoster } from './roster.ts';

// ---- Actions -------------------------------------------------------------------------------
// With N = DISTRICTS (six today): 0..N-1 LISTEN d · N..2N-1 SIGNAL d · 2N..3N-1 STRIKE d · 3N HIDE
export const HIDE = 3 * N;
export const listen = (d: number) => d;
export const signal = (d: number) => N + d;
export const strike = (d: number) => 2 * N + d;
export const kindOf = (a: number): 'L' | 'G' | 'K' | 'H' => (a < N ? 'L' : a < 2 * N ? 'G' : a < 3 * N ? 'K' : 'H');
export const targetOf = (a: number) => (a === HIDE ? -1 : a % N);
export function actionName(a: number): string {
  const k = kindOf(a);
  return k === 'H' ? 'HIDE' : `${k === 'L' ? 'LISTEN' : k === 'G' ? 'SIGNAL' : 'STRIKE'} ${LETTERS[targetOf(a)]}`;
}

// ---- State ---------------------------------------------------------------------------------
export type Cause = 'station' | 'basin' | 'district';

export interface State {
  round: number;               // next round to resolve (1..rounds); rounds+1 when finished
  exposure: number;
  integrity: number;
  playerHasStruck: boolean;
  basinConsec: number;
  basinBuffer: number;
  reserve: number[];
  grievPlayer: number[];       // strikes received from the player; permanent
  agreement: number[];         // rounds of conservation agreement remaining
  catchup: number[];           // extra extraction a struck district attempts this round
  depConsec: number[];         // consecutive rounds of serious unmet need
  debt: number[];              // district this one will strike back (-1 = none)
  everAccepted: boolean[];     // has entered any agreement
  relayed: number[];           // bitmask of districts this one has already relayed a signal to
  struckByDistrict: boolean[]; // has ever been struck by another district
  lastRiver: number[];         // river water actually taken last round (drives the public band)
  struckSomeoneLast: boolean[];
  threatFrom: number;          // G1b: district with a threat pending (-1 = none)
  threatTo: number;            // G1b: its target
  heard: number;               // comparison (REVEAL only): bitmask of districts the station has listened to
  shielded: number;            // comparison (REVEAL only): bitmask of districts revealed as needy; not threatened again
  status: 'ongoing' | 'won' | 'lost';
  causes: Cause[];
}

export interface NetEvent {
  // 'threat' and 'lapse' exist only under the G1b rule (params.preemption = 'threat').
  type: 'signal' | 'strike' | 'threat' | 'lapse';
  from: number;
  to: number;
  result?: 'accepted' | 'lacks' | 'declined' | 'cancelled' | 'interrupted';
  reason?: 'retaliation' | 'preemption' | 'relay' | 'threat';
}

// G1b accounting: what happened on the network in one round, by cause.
export interface Conflict {
  threatsIssued: number;   // a threat was made public this round
  executed: number;        // a threatened strike went ahead
  cancelled: number;       // the target was no longer a heavy extractor, so the threat lapsed
  interrupted: number;     // the attacker could not act (the station struck it), so the threat lapsed
  retaliation: number;     // a struck district struck back
  provoked: number;        // a Preemptive district struck a district that had struck someone
  unprovoked: number;      // baseline rule only: an immediate strike on a heavy extractor, no warning
  absorbed: number;        // comparison only: a district strike the station took on itself (SHIELD)
}
const noConflict = (): Conflict => ({ threatsIssued: 0, executed: 0, cancelled: 0, interrupted: 0, retaliation: 0, provoked: 0, unprovoked: 0, absorbed: 0 });

// Full ledger of one resolved round. `PUBLIC_KEYS` lists what the player may see.
export interface RoundRecord {
  round: number;
  action: number;              // -1 for the history round
  listen?: { need: number; reserve: number };          // private to the player
  signalResp?: 'accepted' | 'lacks' | 'declined';      // private to the player
  events: NetEvent[];          // public district-to-district events
  attackers: number[];         // public: districts that hit the station this round
  upheld: (boolean | null)[];  // public: agreement kept (true), broken (false), none (null)
  band: number[];              // public: 0 low, 1 medium, 2 high
  distress: boolean[];         // public: serious unmet need this round
  flow: number;                // public: exact basin flow
  river: number[];             // hidden exact withdrawals
  need: number[];              // hidden
  unmet: number[];             // hidden
  reserveAfter: number[];      // hidden
  destroyed: number;           // hidden (part of the water ledger)
  exposure: number;
  integrity: number;
  // --- G1a accounting (recording only; nothing below feeds back into the rules) ---
  reserveBefore: number[];     // reserve entering the round
  cover: number[];             // drawn from reserve under an agreement (a chosen use of storage)
  emergency: number[];         // drawn from reserve because river intake fell short of need
  stored: number[];            // river water put into reserve (refill, catch-up)
  inert: boolean;              // true for rounds evaluated after the playable game had already ended
  conflict: Conflict;          // G1b accounting
}

export function initState(w: World, p: Params): State {
  const n = p.districts;
  assertRoster(n);
  const s: State = {
    round: 1,
    exposure: 0,
    integrity: p.integrity,
    playerHasStruck: false,
    basinConsec: 0,
    basinBuffer: p.failure.basinBuffer,
    reserve: w.reserve0.slice(),
    grievPlayer: new Array(n).fill(0),
    agreement: new Array(n).fill(0),
    catchup: new Array(n).fill(0),
    depConsec: new Array(n).fill(0),
    debt: new Array(n).fill(-1),
    everAccepted: new Array(n).fill(false),
    relayed: new Array(n).fill(0),
    struckByDistrict: new Array(n).fill(false),
    lastRiver: new Array(n).fill(0),
    struckSomeoneLast: new Array(n).fill(false),
    threatFrom: -1,
    threatTo: -1,
    heard: 0,
    shielded: 0,
    status: 'ongoing',
    causes: [],
  };
  return s;
}

export function cloneState(s: State): State {
  return {
    round: s.round,
    exposure: s.exposure,
    integrity: s.integrity,
    playerHasStruck: s.playerHasStruck,
    basinConsec: s.basinConsec,
    basinBuffer: s.basinBuffer,
    reserve: s.reserve.slice(),
    grievPlayer: s.grievPlayer.slice(),
    agreement: s.agreement.slice(),
    catchup: s.catchup.slice(),
    depConsec: s.depConsec.slice(),
    debt: s.debt.slice(),
    everAccepted: s.everAccepted.slice(),
    relayed: s.relayed.slice(),
    struckByDistrict: s.struckByDistrict.slice(),
    lastRiver: s.lastRiver.slice(),
    struckSomeoneLast: s.struckSomeoneLast.slice(),
    threatFrom: s.threatFrom,
    threatTo: s.threatTo,
    heard: s.heard,
    shielded: s.shielded,
    status: s.status,
    causes: s.causes.slice(),
  };
}

// Everything that can influence the future. Two states with equal keys have identical futures.
export function stateKey(s: State): string {
  let k = `${s.round}|${s.exposure}|${s.integrity}|${s.playerHasStruck ? 1 : 0}|${s.basinConsec}|${s.basinBuffer}`;
  for (let d = 0; d < s.reserve.length; d++) {
    k += `|${s.reserve[d]},${s.grievPlayer[d] > 0 ? 1 : 0},${s.agreement[d]},${s.catchup[d]},${s.depConsec[d]},${s.debt[d]},${
      s.everAccepted[d] ? 1 : 0
    },${s.relayed[d]},${s.struckByDistrict[d] ? 1 : 0},${s.lastRiver[d]},${s.struckSomeoneLast[d] ? 1 : 0}`;
  }
  return `${k}|${s.threatFrom},${s.threatTo}|${s.heard},${s.shielded}`;
}

const bandOf = (river: number, p: Params) => (river <= p.bands.lowMax ? 0 : river >= p.bands.highMin ? 2 : 1);

// ---- Extraction and the water ledger -------------------------------------------------------
// Shared by the history round and play rounds. `strikes[d]` = strikes landing on d this round.
// What a district intends to take from the river this round, before strikes and before the river
// runs short. Pure: reads state, changes nothing. Extraction and threat resolution both use it, so
// "planned withdrawal" means the same thing in each.
export function planOf(w: World, p: Params, s: State, d: number, need: number): { cover: number; upheld: boolean | null; planned: number } {
  let cover = 0;
  let upheld: boolean | null = null;
  if (s.agreement[d] > 0) {
    const secondRound = s.agreement[d] < p.signal.duration;
    if (w.family[d] === 'E' && secondRound && s.reserve[d] < p.signal.extractiveDefectBelow) {
      upheld = false; // defects: resumes ordinary extraction this round
    } else {
      cover = Math.min(p.signal.cover, need, s.reserve[d]);
      upheld = true;
    }
  }
  if (upheld === true) return { cover, upheld, planned: need - cover };
  // Baseline withdrawal: need, reserve pressure, previous events. Never the hidden family.
  const room = p.reserve.max - s.reserve[d];
  const wanted = (s.reserve[d] < p.reserve.comfort ? p.reserve.refill : 0) + s.catchup[d];
  return { cover, upheld, planned: need + Math.max(0, Math.min(room, wanted)) };
}

function extract(w: World, p: Params, s: State, needs: number[], strikes: number[], rec: RoundRecord | null) {
  const n = p.districts;
  let available = w.supply;
  let destroyedTotal = 0;
  const unmetArr = new Array(n).fill(0);
  const catchupNext = new Array(n).fill(0);

  for (let d = 0; d < n; d++) {
    const need = needs[d];
    const reserveBefore = s.reserve[d];
    const pl = planOf(w, p, s, d, need);
    const cover = pl.cover;
    const upheld = pl.upheld;
    if (upheld === false) s.agreement[d] = 0;
    let planned = pl.planned;
    planned = Math.min(planned, available); // the river cannot give more than it carries

    let river = planned;
    let prevented = 0;
    let destroyed = 0;
    for (let k = 0; k < strikes[d]; k++) {
      const pv = Math.min(p.strike.prevent, river);
      river -= pv;
      prevented += pv;
      destroyed += Math.min(p.strike.destroy, pv);
    }
    available -= river + destroyed;
    destroyedTotal += destroyed;

    const needLeft = need - cover;
    const met = Math.min(needLeft, river);
    s.reserve[d] = s.reserve[d] - cover + (river - met);
    let unmet = needLeft - met;
    const draw = Math.min(unmet, s.reserve[d]); // emergency draw on reserves
    s.reserve[d] -= draw;
    unmet -= draw;

    unmetArr[d] = unmet;
    catchupNext[d] = Math.min(p.strike.catchup, prevented);
    s.lastRiver[d] = river;
    if (rec) {
      rec.river[d] = river;
      rec.need[d] = need;
      rec.unmet[d] = unmet;
      rec.band[d] = bandOf(river, p);
      rec.distress[d] = unmet >= p.seriousUnmet;
      rec.upheld[d] = upheld;
      rec.reserveAfter[d] = s.reserve[d];
      rec.reserveBefore[d] = reserveBefore;
      rec.cover[d] = cover;
      rec.emergency[d] = draw;
      rec.stored[d] = river - met;
    }
  }
  for (let d = 0; d < n; d++) {
    s.catchup[d] = catchupNext[d];
    if (s.agreement[d] > 0) s.agreement[d]--;
  }
  if (rec) {
    rec.flow = available;
    rec.destroyed = destroyedTotal;
  }
  return { flow: available, unmet: unmetArr, destroyed: destroyedTotal };
}

export function blankRecord(p: Params, round: number, action: number): RoundRecord {
  const n = p.districts;
  return {
    round,
    action,
    events: [],
    attackers: [],
    upheld: new Array(n).fill(null),
    band: new Array(n).fill(0),
    distress: new Array(n).fill(false),
    flow: 0,
    river: new Array(n).fill(0),
    need: new Array(n).fill(0),
    unmet: new Array(n).fill(0),
    reserveAfter: new Array(n).fill(0),
    destroyed: 0,
    exposure: 0,
    integrity: 0,
    reserveBefore: new Array(n).fill(0),
    cover: new Array(n).fill(0),
    emergency: new Array(n).fill(0),
    stored: new Array(n).fill(0),
    inert: false,
    conflict: noConflict(),
  };
}

// The scripted history round: extraction only. Gives the player something to read in round one.
export function historyRound(w: World, p: Params, s: State): RoundRecord {
  const rec = blankRecord(p, 0, -1);
  extract(w, p, s, w.needs[0], new Array(p.districts).fill(0), rec);
  rec.exposure = s.exposure;
  rec.integrity = s.integrity;
  return rec;
}

// ---- Responses to offers -------------------------------------------------------------------
function respondToPlayer(w: World, p: Params, s: State, d: number): 'accepted' | 'lacks' | 'declined' {
  if (s.reserve[d] < p.signal.capacityMin) return 'lacks';
  if (s.grievPlayer[d] > 0) return 'declined';
  const f = w.family[d];
  if (f === 'R') return 'accepted';
  if (f === 'E') return s.reserve[d] >= p.signal.extractiveAcceptReserve ? 'accepted' : 'declined';
  return s.playerHasStruck ? 'declined' : 'accepted'; // Preemptive: no deals with a station that has struck anyone
}

function respondToDistrict(w: World, p: Params, s: State, d: number): 'accepted' | 'lacks' | 'declined' {
  if (s.reserve[d] < p.signal.capacityMin) return 'lacks';
  const f = w.family[d];
  if (f === 'R') return 'accepted';
  if (f === 'E') return s.reserve[d] >= p.signal.extractiveAcceptReserve ? 'accepted' : 'declined';
  return s.struckByDistrict[d] ? 'declined' : 'accepted';
}

// ---- One round -----------------------------------------------------------------------------
// Resolution order: player action -> one autonomous district event -> extraction -> attacks on
// the station -> failure checks. Mutates `s`. No random draws.
export function step(w: World, p: Params, s: State, a: number, rec: RoundRecord | null = null): void {
  if (s.status !== 'ongoing') throw new Error('step() on a finished run');
  resolve(w, p, s, a, rec, false);
}

// G1a fixed-horizon evaluation. Resolves one more round AFTER the playable game has ended: the
// station takes no action and its exposure stays where it was; districts, the river and the
// network carry on. The game's result (`status`, `causes`) is never changed by an inert round.
// Used only to give every policy the same six-round window for counting consequences.
export function stepInert(w: World, p: Params, s: State, rec: RoundRecord | null = null): void {
  if (s.status === 'ongoing') throw new Error('stepInert() on a game still in play');
  if (s.round > p.rounds) throw new Error('stepInert() past the final round');
  if (rec) rec.inert = true;
  resolve(w, p, s, -1, rec, true);
}

function resolve(w: World, p: Params, s: State, a: number, rec: RoundRecord | null, inert: boolean): void {
  const n = p.districts;
  const needs = w.needs[s.round];
  const strikes = new Array(n).fill(0);
  const struckSomeoneNow = new Array(n).fill(false);
  let playerStruck = -1;
  let shieldOn = -1;
  const mode = p.strikeMode ?? 'strike';

  // 1. Player action (none in an inert round)
  const kind = inert ? 'none' : kindOf(a);
  const t = inert ? -1 : targetOf(a);
  if (kind === 'none') {
    // no station action; exposure unchanged
  } else if (kind === 'L') {
    if (rec) rec.listen = { need: needs[t], reserve: s.reserve[t] };
    s.exposure += p.exposure.listen;
    if (mode === 'reveal') s.heard |= 1 << t;
  } else if (kind === 'G') {
    s.exposure += p.exposure.signal;
    const resp = respondToPlayer(w, p, s, t);
    if (resp === 'accepted') {
      s.agreement[t] = p.signal.duration;
      s.everAccepted[t] = true;
    }
    if (rec) rec.signalResp = resp;
  } else if (kind === 'K' && mode === 'strike') {
    s.exposure += p.exposure.strike;
    strikes[t]++;
    s.grievPlayer[t]++;
    s.playerHasStruck = true;
    s.agreement[t] = 0; // a strike voids any agreement with the target
    playerStruck = t;
  } else if (kind === 'K' && (mode === 'jam' || mode === 'jam-soft' || mode === 'jam-once')) {
    // Interdiction: the target loses its network action this round. No water is touched.
    s.exposure += p.exposure.strike;
    s.grievPlayer[t]++;
    if (mode !== 'jam-soft') s.playerHasStruck = true; // still decides who accepts offers
    playerStruck = t;
  } else if (kind === 'K' && mode === 'shield') {
    s.exposure += p.shieldExposure ?? 2;
    shieldOn = t;
  } else if (kind === 'K' && mode === 'reveal') {
    const rv = p.reveal ?? { needyBelow: 4, hoardFrom: 8, exposure: 3 };
    s.exposure += rv.exposure;
    if (s.heard & (1 << t)) {
      if (s.reserve[t] < rv.needyBelow) {
        // Shown to be in real need: a standing threat against it is withdrawn, and none is made again.
        s.shielded |= 1 << t;
        if (s.threatTo === t) {
          if (rec) { rec.events.push({ type: 'lapse', from: s.threatFrom, to: t, result: 'cancelled' }); rec.conflict.cancelled++; }
          s.threatFrom = -1; s.threatTo = -1;
        }
      } else if (s.reserve[t] >= rv.hoardFrom) {
        // Shown to be sitting on a full reserve: it conserves for two rounds, and resents the station.
        s.agreement[t] = p.signal.duration;
        s.grievPlayer[t]++;
      }
    }
  } else {
    s.exposure += p.exposure.hide;
  }
  s.exposure = Math.max(0, Math.min(p.exposure.max, s.exposure));

  // 2. The network. Baseline (v0.3): at most one autonomous district-to-district event per round,
  //    taken by the first district in priority order with something to do.
  //    G1b adds (a) the conditional threat and (b) an experiment-only mode with separate lanes.
  const conflict = rec ? rec.conflict : noConflict();
  if (p.autonomous) {
    const threatRule = p.preemption === 'threat';
    const isolated = p.slots === 'isolated';
    const used = { hostile: false, threat: false, relay: false };
    const free = (lane: 'hostile' | 'threat' | 'relay') => (isolated ? !used[lane] : !used.hostile && !used.threat && !used.relay);
    const acted = new Array(n).fill(false);
    const land = (from: number, to: number) => {
      if (to === shieldOn) { // SHIELD: the station takes the blow
        if (s.integrity > 0) s.integrity--;
        conflict.absorbed++;
        return;
      }
      strikes[to]++;
      struckSomeoneNow[from] = true;
      s.struckByDistrict[to] = true;
      if (w.family[to] !== 'E') s.debt[to] = from;
    };

    // 2a. A threat made public last round resolves now, after the station has acted.
    if (s.threatFrom >= 0) {
      const from = s.threatFrom, to = s.threatTo;
      s.threatFrom = -1;
      s.threatTo = -1;
      const stillHeavy = planOf(w, p, s, to, needs[to]).planned >= p.bands.highMin;
      if (!stillHeavy) {
        conflict.cancelled++;
        if (rec) rec.events.push({ type: 'lapse', from, to, result: 'cancelled' });
      } else if (from === playerStruck) {
        conflict.interrupted++;
        if (rec) rec.events.push({ type: 'lapse', from, to, result: 'interrupted' });
      } else {
        land(from, to);
        used.hostile = true; // the threatened strike is this round's hostile act
        acted[from] = true;
        conflict.executed++;
        if (rec) rec.events.push({ type: 'strike', from, to, reason: 'threat' });
      }
    }

    // 2b. Districts in priority order. Each does at most one thing, its first preference, and only
    //     if that lane is free.
    for (const d of w.priority) {
      if (!free('hostile') && !free('threat') && !free('relay')) break;
      if (d === playerStruck || acted[d]) continue; // a district struck by the station loses its network action this round
      const f = w.family[d];

      if (s.debt[d] >= 0 && f !== 'E') {
        if (!free('hostile')) continue;
        const to = s.debt[d];
        s.debt[d] = -1;
        land(d, to);
        used.hostile = true;
        conflict.retaliation++;
        if (rec) rec.events.push({ type: 'strike', from: d, to, reason: 'retaliation' });
      } else if (f === 'P') {
        let target = -1;
        for (const x of w.priority) if (x !== d && s.struckSomeoneLast[x]) { target = x; break; }
        if (target >= 0) {
          if (!free('hostile')) continue;
          land(d, target);
          used.hostile = true;
          conflict.provoked++;
          if (rec) rec.events.push({ type: 'strike', from: d, to: target, reason: 'preemption' });
          continue;
        }
        let best = -1;
        for (const x of w.priority) {
          if (x === d || s.lastRiver[x] < p.bands.highMin || s.shielded & (1 << x)) continue;
          if (best < 0 || s.lastRiver[x] > s.lastRiver[best]) best = x;
        }
        if (best < 0) continue;
        if (threatRule) {
          // G1b: say so first. The strike follows next round only if the target is still heavy.
          if (!free('threat') || s.threatFrom >= 0) continue;
          s.threatFrom = d;
          s.threatTo = best;
          used.threat = true;
          conflict.threatsIssued++;
          if (rec) rec.events.push({ type: 'threat', from: d, to: best });
        } else {
          if (!free('hostile')) continue;
          land(d, best);
          used.hostile = true;
          conflict.unprovoked++;
          if (rec) rec.events.push({ type: 'strike', from: d, to: best, reason: 'preemption' });
        }
      } else if (f === 'R' && s.everAccepted[d] && s.grievPlayer[d] === 0) {
        if (!free('relay')) continue;
        for (const x of w.relayOrder[d]) {
          if (s.relayed[d] & (1 << x) || s.agreement[x] > 0) continue;
          s.relayed[d] |= 1 << x;
          const result = respondToDistrict(w, p, s, x);
          if (result === 'accepted') {
            s.agreement[x] = p.signal.duration;
            s.everAccepted[x] = true;
          }
          used.relay = true;
          if (rec) rec.events.push({ type: 'signal', from: d, to: x, result, reason: 'relay' });
          break;
        }
      }
    }
  }

  // 3. Extraction
  const { flow, unmet } = extract(w, p, s, needs, strikes, rec);

  // 4. Attacks on the station resolve in the same round as the action that provoked them
  if (s.exposure >= p.exposure.targetable) {
    let hits = 0;
    for (const d of w.priority) {
      if (hits >= p.maxStationHitsPerRound) break;
      const f = w.family[d];
      // G1d: the chance to hit back belongs to this round's STRIKE, not to a standing grievance.
      const attacks = mode === 'jam-once'
        ? (f === 'P' && s.exposure >= p.exposure.max) || (f !== 'E' && d === playerStruck)
        : (f === 'P' && (s.exposure >= p.exposure.max || s.playerHasStruck || s.grievPlayer[d] > 0)) || (f === 'R' && s.grievPlayer[d] > 0);
      if (attacks) {
        hits++;
        if (rec) rec.attackers.push(d);
      }
    }
    s.integrity -= inert ? Math.min(hits, Math.max(0, s.integrity)) : hits; // inert: a wrecked station cannot go below 0
  }

  // 5. Failure checks
  const causes: Cause[] = [];
  if (s.integrity <= 0) causes.push('station');

  const deficit = Math.max(0, p.basinMin - flow);
  if (p.failure.basinRule === 'consecutive') {
    s.basinConsec = deficit > 0 ? s.basinConsec + 1 : 0;
    if (s.basinConsec >= p.failure.basinConsecutive) causes.push('basin');
  } else {
    s.basinBuffer -= deficit;
    if (s.basinBuffer < 0) causes.push('basin');
  }

  let deprived = false;
  for (let d = 0; d < n; d++) {
    s.depConsec[d] = unmet[d] >= p.seriousUnmet ? s.depConsec[d] + 1 : 0;
    if (s.depConsec[d] >= p.failure.districtConsecutive) deprived = true;
    s.struckSomeoneLast[d] = struckSomeoneNow[d];
  }
  if (deprived) causes.push('district');

  if (rec) {
    rec.exposure = s.exposure;
    rec.integrity = s.integrity;
  }
  if (!inert) {
    if (causes.length) {
      s.status = 'lost';
      s.causes = causes;
    } else if (s.round >= p.rounds) {
      s.status = 'won';
    }
  }
  s.round++;
}

// ---- Convenience: play a fixed action list ---------------------------------------------------
export interface Run {
  status: 'won' | 'lost' | 'ongoing';
  causes: Cause[];
  records: RoundRecord[]; // records[0] is the history round
  final: State;
}

export function playSequence(w: World, p: Params, actions: number[]): Run {
  const s = initState(w, p);
  const records = [historyRound(w, p, s)];
  for (const a of actions) {
    if (s.status !== 'ongoing') break;
    const rec = blankRecord(p, s.round, a);
    step(w, p, s, a, rec);
    records.push(rec);
  }
  return { status: s.status, causes: s.causes, records, final: s };
}
