# The Dark Microcosmos — G1b: Conditional Threat, Slot Isolation, Leverage Regression

Run of 14–15 November 2026 · `RESULTS.md` and `RESULTS-G1A.md` are untouched

## Read This First

- **One rule changed, behind a switch.** `preemption: 'threat'` replaces the immediate unwarned
  strike on a heavy extractor with a public, conditional threat, as Ben specified. With the switch
  off the engine is the v0.3 baseline, and the golden tests still pass.
- **Separate lanes are an experiment, not a proposal.** They exist to measure a scheduling artefact.
  The playable uses v0.3's one shared network slot.
- **Seeds.** Development 1–500. Fresh held-out 200001–200500, first run here and now used.
- 50 tests pass (37 earlier, 13 new).

## Findings

**1. The threat rule halves network conflict, mostly without the player.**
With the station inert, district-on-district strikes fall from 4.30 to 2.10 per world (held-out
1.98). Unwarned strikes fall from 2.44 to 0. Of 1.81 threats per world, 0.97 are carried out, 0.64
lapse by themselves because the target is no longer a heavy extractor a round later, and 0.20 are
still pending after round six. So a warning does reduce violence here: the condition is re-checked
and often no longer holds.

**2. The player's defusal adds a little.**
Reading threats and signalling the threatened district raises cancelled threats from 0.75 to 0.96
per world and lowers strikes from 1.39 to 1.07. The win rate moves by +1.2 points (−1.3 to +3.7),
which is not distinguishable from zero.

**3. The slot artefact was the whole of G1a's "cooperation reduces destruction".**
Under the baseline rule, cooperation lowered district strikes from 4.30 to 3.49. With relays and
hostile acts in separate lanes it does not: 4.30 against 4.31. That finding in `RESULTS-G1A.md` §3
was scheduling, not behaviour. Under the threat rule about half of the reduction survives the same
test (2.62 to 2.21 with lanes, against 2.10 to 1.39 shared).

**4. Leverage holds.**

| | Baseline | G1b rule | G1b rule, held-out |
|---|---:|---:|---:|
| Rescuable worlds | 91.2% | 85.8% | 85.6% |
| Doing nothing wins | 8.2% | 14.0% | 14.0% |
| Unwinnable | 0.6% | 0.2% | 0.4% |
| One move suffices, rescuable worlds | 72.6% | 85.8% | 87.9% |

The last row moved the wrong way: with full knowledge, a single move now decides more worlds.

**5. Cooperation costs the districts less.**
Against doing nothing, the plain cooperative policy now adds 0.69 units of district hardship
(baseline 1.40; held-out 0.47) while still cutting basin harm by 3.88.

**6. STRIKE is still not a useful option.** This is the design constraint the rule does not yet meet.

| Policy under the G1b rule | Legacy wins | Threats interrupted | Station damage |
|---|---:|---:|---:|
| Cooperate, hide when exposed | 42.0% | 0.00 | 0.00 |
| Defuse by signal | 43.2% | 0.00 | 0.35 |
| Defuse by strike | 16.0% | 0.76 | 1.81 |
| Guard: strike threats only | 3.0% | 0.91 | 1.96 |

Interdiction works mechanically: the strike stops the attack. It loses anyway, by 26.0 points
against plain cooperation (−29.9 to −22.1; held-out −28.6). STRIKE is required in 0.7% of rescuable
worlds (held-out 0.0%). Three things in the rules cause this:

- A station strike does to the attacker exactly what the attack would have done to the target: 5
  units prevented, 2 destroyed. Harm is moved, not avoided.
- The attacker is Preemptive by definition, so it hits the station in the same round and in every
  later round the station is targetable.
- Once the station has struck anyone, Preemptive districts refuse every offer.

**7. An opening LISTEN looks valuable under this rule, and is not.**
It gains 9.6 points over plain cooperation (4.9 to 14.3). Spending the first turn doing nothing
gains 8.6 (3.9 to 13.3). LISTEN against waiting: +1.0 (−0.9 to +2.9). The gain is timing, since no
threat is visible in round one. The information still adds nothing detectable.

## Assumptions Added in G1b

Each is tagged **[A]** in `SPEC.md` §9. Ben's five-point rule is tagged **[S]**.

- Issuing a threat uses the round's one network slot. A threatened strike that goes ahead is that
  round's network act. A lapse is not an act.
- One threat can be pending at a time.
- "Planned withdrawal" is what the target intends to take before strikes and before the river runs
  short.
- "The attacker can act" means the station did not strike it this round.
- A STRIKE on the target does not cancel the threat, because the test is its planned withdrawal.
- Retaliation, and a Preemptive strike on a district that itself struck someone, stay immediate and
  unwarned (1.03 and 0.09 per world).
- A threat made in round six is recorded as pending.

## Provisional Ending Threshold Used by the Playable

Ending thresholds are deferred. The playable needs one to run, so it uses a placeholder:
**Shared Dawn** means the station and basin survive and no district was ever in distress (2 or more
units of need unmet in a round). Any other survival is **Fragile Peace**. Under the G1b rule the
plain cooperative bot survives in 42.0% of worlds, and 69.5% of those survivals are Shared Dawn.

## Tables

Generated by `node scripts/report-g1b.ts` from `out/g1b-*.json`. Do not edit below this line by hand.

<!-- TABLES -->

### Table 1. Leverage regression (full-knowledge search)

| Configuration | Unwinnable | Doing nothing wins | Rescuable | STRIKE required | Winnable with no SIGNAL | One move suffices |
|---|---:|---:|---:|---:|---:|---:|
| Immediate preemption, one shared slot (v0.3 baseline) | 0.6% | 8.2% | 91.2% | 0.9% | 57.7% | 72.6% |
| Conditional threat, one shared slot (G1b rule) | 0.2% | 14.0% | 85.8% | 0.7% | 67.8% | 85.8% |
| Immediate preemption, separate lanes (experiment) | 0.8% | 8.2% | 91.0% | 1.1% | 57.8% | 76.0% |
| Conditional threat, separate lanes (experiment) | 0.2% | 9.8% | 90.0% | 0.7% | 66.7% | 87.1% |
| Conditional threat, one shared slot, held-out seeds 200001-200500 | 0.4% | 14.0% | 85.6% | 0.0% | 72.9% | 87.9% |

### Table 2. Network conflict per world over six rounds — Immediate preemption, one shared slot (v0.3 baseline)

| Policy | Legacy wins | Threats | Executed | Cancelled | Interrupted | Still pending | Retaliation | Provoked | Unwarned | All district strikes | Worlds with none | Station strikes | Water destroyed | District hardship | Basin harm | Station damage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 8.2% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.76 | 0.10 | 2.44 | 4.30 | 23.2% | 0.00 | 8.61 | 2.66 | 12.33 | 0.00 |
| cooperate, hide when exposed | 37.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.22 | 0.12 | 2.16 | 3.49 | 30.2% | 0.00 | 6.95 | 4.06 | 8.84 | 0.00 |
| defuse by signal | 37.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.22 | 0.12 | 2.16 | 3.49 | 30.2% | 0.00 | 6.95 | 4.06 | 8.84 | 0.00 |
| defuse by strike | 37.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.22 | 0.12 | 2.16 | 3.49 | 30.2% | 0.00 | 6.95 | 4.06 | 8.84 | 0.00 |
| defuse: signal, else strike | 46.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.16 | 0.12 | 2.14 | 3.41 | 30.2% | 0.00 | 6.76 | 4.42 | 8.13 | 0.80 |
| guard: strike threats only | 8.2% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.76 | 0.10 | 2.44 | 4.30 | 23.2% | 0.00 | 8.61 | 2.66 | 12.33 | 0.00 |
| informed mixed, no listen | 46.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.16 | 0.12 | 2.14 | 3.41 | 30.2% | 0.00 | 6.76 | 4.42 | 8.13 | 0.80 |
| alternate strike | 5.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.69 | 0.13 | 2.59 | 4.41 | 19.2% | 1.52 | 11.64 | 4.28 | 13.41 | 2.19 |

### Table 2. Network conflict per world over six rounds — Conditional threat, one shared slot (G1b rule)

| Policy | Legacy wins | Threats | Executed | Cancelled | Interrupted | Still pending | Retaliation | Provoked | Unwarned | All district strikes | Worlds with none | Station strikes | Water destroyed | District hardship | Basin harm | Station damage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 14.0% | 1.81 | 0.97 | 0.64 | 0.00 | 0.20 | 1.03 | 0.09 | 0.00 | 2.10 | 35.2% | 0.00 | 4.20 | 1.11 | 11.80 | 0.00 |
| cooperate, hide when exposed | 42.0% | 1.74 | 0.79 | 0.75 | 0.00 | 0.20 | 0.54 | 0.06 | 0.00 | 1.39 | 44.6% | 0.00 | 2.77 | 1.80 | 7.92 | 0.00 |
| defuse by signal | 43.2% | 1.86 | 0.67 | 0.96 | 0.00 | 0.23 | 0.35 | 0.05 | 0.00 | 1.07 | 51.0% | 0.00 | 2.12 | 1.55 | 7.85 | 0.35 |
| defuse by strike | 16.0% | 2.13 | 0.48 | 0.71 | 0.76 | 0.19 | 0.24 | 0.07 | 0.00 | 0.78 | 55.4% | 1.19 | 3.91 | 1.46 | 10.24 | 1.81 |
| defuse: signal, else strike | 23.6% | 1.96 | 0.52 | 0.90 | 0.32 | 0.23 | 0.21 | 0.08 | 0.00 | 0.80 | 56.4% | 0.64 | 2.85 | 1.15 | 9.19 | 1.98 |
| guard: strike threats only | 3.0% | 2.49 | 0.56 | 0.83 | 0.91 | 0.19 | 0.34 | 0.08 | 0.00 | 0.97 | 49.2% | 1.37 | 4.68 | 0.91 | 12.46 | 1.96 |
| informed mixed, no listen | 50.8% | 1.73 | 0.75 | 0.78 | 0.00 | 0.19 | 0.45 | 0.07 | 0.00 | 1.27 | 46.6% | 0.00 | 2.52 | 1.95 | 7.61 | 1.06 |
| alternate strike | 5.4% | 1.77 | 1.04 | 0.43 | 0.07 | 0.23 | 1.23 | 0.15 | 0.00 | 2.42 | 24.4% | 1.90 | 8.61 | 3.24 | 14.58 | 2.72 |

### Table 2. Network conflict per world over six rounds — Immediate preemption, separate lanes (experiment)

| Policy | Legacy wins | Threats | Executed | Cancelled | Interrupted | Still pending | Retaliation | Provoked | Unwarned | All district strikes | Worlds with none | Station strikes | Water destroyed | District hardship | Basin harm | Station damage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 8.2% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.76 | 0.10 | 2.44 | 4.30 | 23.2% | 0.00 | 8.61 | 2.66 | 12.33 | 0.00 |
| cooperate, hide when exposed | 36.0% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.89 | 0.13 | 2.29 | 4.31 | 22.0% | 0.00 | 8.55 | 5.49 | 8.89 | 0.00 |
| defuse by signal | 36.0% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.89 | 0.13 | 2.29 | 4.31 | 22.0% | 0.00 | 8.55 | 5.49 | 8.89 | 0.00 |
| defuse by strike | 36.0% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.89 | 0.13 | 2.29 | 4.31 | 22.0% | 0.00 | 8.55 | 5.49 | 8.89 | 0.00 |
| defuse: signal, else strike | 46.6% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.91 | 0.13 | 2.28 | 4.31 | 21.8% | 0.00 | 8.50 | 6.11 | 8.10 | 0.81 |
| guard: strike threats only | 8.2% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.76 | 0.10 | 2.44 | 4.30 | 23.2% | 0.00 | 8.61 | 2.66 | 12.33 | 0.00 |
| informed mixed, no listen | 46.6% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.91 | 0.13 | 2.28 | 4.31 | 21.8% | 0.00 | 8.50 | 6.11 | 8.10 | 0.81 |
| alternate strike | 5.4% | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 1.69 | 0.13 | 2.59 | 4.41 | 19.2% | 1.52 | 11.64 | 4.28 | 13.41 | 2.19 |

### Table 2. Network conflict per world over six rounds — Conditional threat, separate lanes (experiment)

| Policy | Legacy wins | Threats | Executed | Cancelled | Interrupted | Still pending | Retaliation | Provoked | Unwarned | All district strikes | Worlds with none | Station strikes | Water destroyed | District hardship | Basin harm | Station damage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 9.8% | 2.13 | 1.22 | 0.70 | 0.00 | 0.21 | 1.21 | 0.19 | 0.00 | 2.62 | 35.2% | 0.00 | 5.25 | 1.35 | 11.52 | 0.00 |
| cooperate, hide when exposed | 43.4% | 2.26 | 1.05 | 0.98 | 0.00 | 0.22 | 1.00 | 0.16 | 0.00 | 2.21 | 36.4% | 0.00 | 4.34 | 3.13 | 7.60 | 0.00 |
| defuse by signal | 42.0% | 2.46 | 0.94 | 1.25 | 0.00 | 0.28 | 0.79 | 0.15 | 0.00 | 1.88 | 40.2% | 0.00 | 3.69 | 2.88 | 7.56 | 0.40 |
| defuse by strike | 10.2% | 2.72 | 0.66 | 0.91 | 0.88 | 0.27 | 0.24 | 0.05 | 0.00 | 0.96 | 48.6% | 1.44 | 4.72 | 2.16 | 10.14 | 2.11 |
| defuse: signal, else strike | 14.0% | 2.68 | 0.80 | 1.17 | 0.41 | 0.30 | 0.40 | 0.08 | 0.00 | 1.28 | 41.6% | 0.85 | 4.19 | 2.39 | 9.01 | 2.28 |
| guard: strike threats only | 3.0% | 2.69 | 0.65 | 0.90 | 0.91 | 0.22 | 0.35 | 0.07 | 0.00 | 1.08 | 49.2% | 1.37 | 4.90 | 0.97 | 12.34 | 1.96 |
| informed mixed, no listen | 53.2% | 2.29 | 1.02 | 1.02 | 0.00 | 0.25 | 0.94 | 0.17 | 0.00 | 2.13 | 36.8% | 0.00 | 4.15 | 3.57 | 7.21 | 0.96 |
| alternate strike | 5.4% | 2.03 | 1.24 | 0.50 | 0.09 | 0.20 | 1.38 | 0.26 | 0.00 | 2.87 | 24.4% | 1.90 | 9.52 | 3.43 | 14.21 | 2.72 |

### Table 2. Network conflict per world over six rounds — Conditional threat, one shared slot, held-out seeds 200001-200500

| Policy | Legacy wins | Threats | Executed | Cancelled | Interrupted | Still pending | Retaliation | Provoked | Unwarned | All district strikes | Worlds with none | Station strikes | Water destroyed | District hardship | Basin harm | Station damage |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 14.0% | 1.66 | 0.86 | 0.64 | 0.00 | 0.15 | 0.99 | 0.12 | 0.00 | 1.98 | 40.6% | 0.00 | 3.96 | 1.03 | 11.48 | 0.00 |
| cooperate, hide when exposed | 46.4% | 1.60 | 0.69 | 0.75 | 0.00 | 0.15 | 0.48 | 0.09 | 0.00 | 1.26 | 52.0% | 0.00 | 2.49 | 1.50 | 7.34 | 0.00 |
| defuse by signal | 46.8% | 1.67 | 0.57 | 0.92 | 0.00 | 0.19 | 0.32 | 0.08 | 0.00 | 0.97 | 58.6% | 0.00 | 1.90 | 1.31 | 7.07 | 0.30 |
| defuse by strike | 17.8% | 1.93 | 0.41 | 0.72 | 0.63 | 0.17 | 0.20 | 0.06 | 0.00 | 0.67 | 61.2% | 1.07 | 3.46 | 1.25 | 9.60 | 1.65 |
| defuse: signal, else strike | 24.6% | 1.78 | 0.44 | 0.84 | 0.30 | 0.20 | 0.18 | 0.06 | 0.00 | 0.69 | 62.2% | 0.64 | 2.64 | 1.15 | 8.59 | 1.89 |
| guard: strike threats only | 4.0% | 2.22 | 0.52 | 0.77 | 0.78 | 0.15 | 0.37 | 0.07 | 0.00 | 0.96 | 51.4% | 1.23 | 4.37 | 0.93 | 12.18 | 1.76 |
| informed mixed, no listen | 53.4% | 1.56 | 0.63 | 0.78 | 0.00 | 0.15 | 0.40 | 0.10 | 0.00 | 1.13 | 54.0% | 0.00 | 2.24 | 1.55 | 6.96 | 0.98 |
| alternate strike | 6.2% | 1.60 | 0.96 | 0.42 | 0.05 | 0.17 | 1.22 | 0.15 | 0.00 | 2.33 | 27.6% | 1.91 | 8.46 | 2.98 | 14.19 | 2.71 |

### Table 3. Bot win rate on rescuable worlds

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | defuse by signal | defuse by strike | defuse: signal, else strike | guard: strike threats only | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Immediate preemption, one shared slot (v0.3 baseline) | 0.0% | 0.2% | 5.7% | 5.9% | 33.8% | 7.9% | 34.9% | 14.5% | 43.4% | 42.5% | 33.8% | 33.8% | 43.4% | 0.0% | 4.2% |
| Conditional threat, one shared slot (G1b rule) | 0.0% | 0.2% | 6.1% | 6.5% | 36.6% | 8.4% | 47.8% | 21.9% | 48.3% | 52.4% | 40.3% | 15.4% | 24.0% | 0.9% | 4.9% |
| Immediate preemption, separate lanes (experiment) | 0.0% | 0.2% | 5.7% | 5.9% | 32.1% | 7.9% | 35.2% | 14.3% | 43.5% | 45.3% | 32.1% | 32.1% | 43.5% | 0.0% | 4.4% |
| Conditional threat, separate lanes (experiment) | 0.0% | 0.2% | 5.8% | 6.2% | 40.2% | 8.0% | 46.7% | 23.1% | 50.9% | 54.4% | 38.9% | 9.6% | 13.8% | 0.9% | 4.9% |
| Conditional threat, one shared slot, held-out seeds 200001-200500 | 0.0% | 0.0% | 6.3% | 4.0% | 39.7% | 7.5% | 50.9% | 29.7% | 50.7% | 52.6% | 40.9% | 17.3% | 24.3% | 0.5% | 5.1% |

### Table 4. Cooperation against doing nothing in the same world, 95% intervals

| Configuration | Policy | District hardship | Basin harm | Stored water | Water destroyed |
|---|---|---:|---:|---:|---:|
| Immediate preemption, one shared slot (v0.3 baseline) | cooperate, hide when exposed | +1.40 (+1.13 to +1.67) | −3.50 (−3.84 to −3.15) | −6.25 (−6.86 to −5.64) | −1.66 (−1.98 to −1.33) |
| Immediate preemption, one shared slot (v0.3 baseline) | defuse by signal | +1.40 (+1.13 to +1.67) | −3.50 (−3.84 to −3.15) | −6.25 (−6.86 to −5.64) | −1.66 (−1.98 to −1.33) |
| Immediate preemption, one shared slot (v0.3 baseline) | defuse by strike | +1.40 (+1.13 to +1.67) | −3.50 (−3.84 to −3.15) | −6.25 (−6.86 to −5.64) | −1.66 (−1.98 to −1.33) |
| Conditional threat, one shared slot (G1b rule) | cooperate, hide when exposed | +0.69 (+0.52 to +0.87) | −3.88 (−4.23 to −3.54) | −7.44 (−8.09 to −6.79) | −1.43 (−1.70 to −1.17) |
| Conditional threat, one shared slot (G1b rule) | defuse by signal | +0.44 (+0.26 to +0.62) | −3.95 (−4.31 to −3.60) | −7.63 (−8.28 to −6.97) | −2.08 (−2.38 to −1.77) |
| Conditional threat, one shared slot (G1b rule) | defuse by strike | +0.35 (+0.18 to +0.53) | −1.56 (−1.89 to −1.22) | −5.48 (−6.14 to −4.81) | −0.29 (−0.62 to +0.04) |
| Immediate preemption, separate lanes (experiment) | cooperate, hide when exposed | +2.83 (+2.54 to +3.12) | −3.44 (−3.78 to −3.10) | −6.88 (−7.53 to −6.22) | −0.06 (−0.12 to +0.00) |
| Immediate preemption, separate lanes (experiment) | defuse by signal | +2.83 (+2.54 to +3.12) | −3.44 (−3.78 to −3.10) | −6.88 (−7.53 to −6.22) | −0.06 (−0.12 to +0.00) |
| Immediate preemption, separate lanes (experiment) | defuse by strike | +2.83 (+2.54 to +3.12) | −3.44 (−3.78 to −3.10) | −6.88 (−7.53 to −6.22) | −0.06 (−0.12 to +0.00) |
| Conditional threat, separate lanes (experiment) | cooperate, hide when exposed | +1.78 (+1.53 to +2.03) | −3.92 (−4.26 to −3.57) | −8.90 (−9.63 to −8.16) | −0.91 (−1.12 to −0.69) |
| Conditional threat, separate lanes (experiment) | defuse by signal | +1.53 (+1.29 to +1.78) | −3.96 (−4.32 to −3.60) | −9.07 (−9.80 to −8.35) | −1.56 (−1.82 to −1.29) |
| Conditional threat, separate lanes (experiment) | defuse by strike | +0.81 (+0.60 to +1.02) | −1.38 (−1.72 to −1.04) | −5.66 (−6.36 to −4.95) | −0.53 (−0.77 to −0.28) |
| Conditional threat, one shared slot, held-out seeds 200001-200500 | cooperate, hide when exposed | +0.47 (+0.28 to +0.65) | −4.14 (−4.49 to −3.79) | −8.24 (−8.93 to −7.54) | −1.46 (−1.73 to −1.20) |
| Conditional threat, one shared slot, held-out seeds 200001-200500 | defuse by signal | +0.28 (+0.09 to +0.46) | −4.41 (−4.77 to −4.04) | −8.62 (−9.33 to −7.92) | −2.05 (−2.35 to −1.75) |
| Conditional threat, one shared slot, held-out seeds 200001-200500 | defuse by strike | +0.22 (+0.06 to +0.38) | −1.88 (−2.23 to −1.53) | −6.29 (−7.02 to −5.56) | −0.50 (−0.80 to −0.20) |
