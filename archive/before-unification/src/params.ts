// Every number in the model lives here. Tags: [S] = stated in Design Synthesis v0.3,
// [A] = assumption made to fill a gap v0.3 left open. See SPEC.md for the reasoning.

export type Family = 'R' | 'E' | 'P'; // Reciprocal, Extractive, Preemptive [S]

export interface Params {
  rounds: number;        // [S] 6
  districts: number;     // [S] 6
  supplyMode: 'fixed' | 'relative'; // [A] fixed: `supply` units every seed. relative: basinMin + that world's total base need + `slack`
  supply: number;        // [A] river units entering the network each round (fixed mode)
  slack: number;         // [A] relative mode: how far above (+) or below (-) break-even the river runs
  basinMin: number;      // [S] 30 (illustrative in v0.3)
  integrity: number;     // [S] 3
  exposure: { listen: number; signal: number; strike: number; hide: number; max: number; targetable: number }; // [S]
  strike: { prevent: number; destroy: number; catchup: number }; // [S] 5 / 2 / 3
  signal: {
    cover: number;                 // [S] up to 4 units per round from reserves
    duration: number;              // [S] up to two rounds
    capacityMin: number;           // [A] reserve below this => "lacks capacity"
    extractiveAcceptReserve: number; // [A] Extractive accepts only when cooperation is cheap for it
    extractiveDefectBelow: number;   // [A] Extractive drops round two of an agreement below this reserve
  };
  need: { min: number; max: number; shocks: number[] };   // [A]
  reserve: { min: number; max: number; comfort: number; refill: number }; // [A]
  bands: { lowMax: number; highMin: number };             // [A] low <= lowMax, high >= highMin
  seriousUnmet: number;  // [A] unmet units in one round that count as "serious"
  failure: {
    basinRule: 'consecutive' | 'cumulative'; // [S] consecutive; 'cumulative' is the proposed alternative
    basinConsecutive: number;   // [S] 2
    basinBuffer: number;        // [A] only used by the cumulative rule
    districtConsecutive: number; // [S] 2
  };
  mix: Record<Family, number>;  // [A] draw weights for each district's hidden family
  autonomous: boolean;          // [S] at most one district-to-district event per round
  maxStationHitsPerRound: number; // [A]
  // --- G1b (optional; absent = the v0.3 baseline behaviour, so baseline outputs are unchanged) ---
  preemption?: 'immediate' | 'threat'; // 'threat' [S, Ben 14 Nov 2026]: a public, conditional threat replaces the immediate unprovoked strike
  slots?: 'shared' | 'isolated';       // 'isolated' [A, experiment only]: hostile acts, threats and relays no longer compete for one slot
  // --- Offensive-action comparison (optional; absent = the original STRIKE). All [A], experiment only. ---
  //  'jam'       the third action stops the target's network action this round and nothing else:
  //              no water cut, none destroyed, no catch-up. Otherwise treated exactly like a strike.
  //  'jam-soft'  as 'jam', but only the jammed district holds it against the station.
  //  'shield'    the station takes any district strike aimed at the target this round: 1 integrity, no water lost.
  //  'reveal'    publishes the target's need and reserve; needs an earlier LISTEN to that district.
  //  'jam-once'  G1d [S, Ben 15 Nov 2026]: as 'jam', but the struck district may hit the station once, in
  //              that round only. An old grievance never triggers a later attack. Offers are refused as before.
  strikeMode?: 'strike' | 'jam' | 'jam-soft' | 'jam-once' | 'shield' | 'reveal';
  reveal?: { needyBelow: number; hoardFrom: number; exposure: number }; // defaults 4 / 8 / 3
  shieldExposure?: number;             // default 2
}

export const BASE: Params = {
  rounds: 6,
  districts: 6,
  supplyMode: 'relative',
  supply: 60,
  slack: -1,
  basinMin: 30,
  integrity: 3,
  exposure: { listen: 0, signal: 2, strike: 3, hide: -2, max: 4, targetable: 2 },
  strike: { prevent: 5, destroy: 2, catchup: 3 },
  signal: { cover: 4, duration: 2, capacityMin: 2, extractiveAcceptReserve: 8, extractiveDefectBelow: 6 },
  need: { min: 3, max: 8, shocks: [-1, 0, 0, 1] },
  reserve: { min: 0, max: 10, comfort: 4, refill: 1 },
  bands: { lowMax: 3, highMin: 8 },
  seriousUnmet: 2,
  failure: { basinRule: 'consecutive', basinConsecutive: 2, basinBuffer: 6, districtConsecutive: 2 },
  mix: { R: 0.4, E: 0.35, P: 0.25 },
  autonomous: true,
  maxStationHitsPerRound: 1,
};

type Patch = { [K in keyof Params]?: Params[K] extends object ? Partial<Params[K]> : Params[K] };

export function withParams(patch: Patch, base: Params = BASE): Params {
  const out: any = structuredClone(base);
  for (const [k, v] of Object.entries(patch)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) out[k] = { ...out[k], ...(v as object) };
    else out[k] = v;
  }
  return out as Params;
}
