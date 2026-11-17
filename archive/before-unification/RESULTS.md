# The Dark Microcosmos — What the Headless Simulator Says

Run of 14 November 2026 · rules per `SPEC.md` · numbers from Design Synthesis v0.3, taken as provisional

## Read This First

- **These results describe one candidate rule set.** v0.3 left the district policies, the network
  scheduling and several thresholds open. I filled them with the simplest rules I could and tagged
  each one **[A]** in `SPEC.md`. A different fill could move every number below.
- **Two kinds of evidence, not to be mixed.** The *search* tries all 47,045,881 action sequences per
  world with full knowledge of the hidden state. It says what is possible. The *bots* see only what
  a player would see. They say what is achievable from observation by simple policies.
- **Suite sizes.** 500 worlds at baseline, 300 per variation. Differences between variations smaller
  than about 8 points are not distinguishable at these sizes. Paired comparisons of two bots on the
  same worlds are tighter and are reported with intervals.
- **"Rescuable"** means a world where doing nothing loses and some sequence wins. It is the set of
  worlds where the player's choices decide the outcome.

## Summary

1. **Leverage is high once the river is sized per world.** 91.2% of worlds are rescuable. With one
   fixed river for every world, 38.7% are unwinnable and 17.0% win themselves.
2. **STRIKE is almost never needed, and no tested policy profits from it.** It is required in 0.9%
   of rescuable worlds. No striking bot wins more than 5.9% of them; plain cooperation wins 33.8%.
3. **LISTEN shows no detectable value as written.** Adding an opening LISTEN changes the win rate by +1.8
   points (interval −2.9 to +6.5) on one policy and −0.2 (−5.0 to +4.6) on another.
4. **District deprivation almost never happens.** No policy bot loses a district in any
   configuration. Random play does in at most 0.05% of runs.
5. **The consecutive-shortfall rule opens strike-only wins.** 57.7% of rescuable worlds can be won
   without a single SIGNAL; under a cumulative-deficit rule that falls to 21.9%.
6. **One right move usually decides the game.** With full knowledge, a single SIGNAL or STRIKE is
   enough in 72.6% of rescuable worlds.

## 1. Leverage

v0.3's central acceptance test: how often can the player's actions change the outcome compared with
doing nothing?

| River | Unwinnable | Doing nothing wins | Rescuable |
|---|---:|---:|---:|
| Sized per world, one unit short of break-even (baseline) | 0.6% | 8.2% | 91.2% |
| Fixed at 60 for every world | 38.7% | 17.0% | 44.3% |

The fixed river fails because total need varies widely between worlds, so most worlds are either
hopeless or safe before round one. Sizing the river to each world's need fixes this. Scarcity is
then one dial: one unit scarcer gives 94.0% rescuable but 3.3% unwinnable; one unit looser gives
70.0% rescuable and 30.0% that win themselves (Table 1).

Possible is not the same as findable. In a rescuable world, 3.8% of all sequences win on average,
random play wins 4.2% of the time, and the best bot wins 43.4%. Whether a person does better than
the bots is a question for the playable build.

## 2. Cooperation Against Force

This is the number I suggested publishing: in how many worlds is cooperation not enough?

| Among rescuable worlds (baseline, 456) | Share |
|---|---:|
| Winnable with no STRIKE | 99.1% |
| STRIKE required | 0.9% (seeds 32, 81, 218, 246) |
| Winnable with no SIGNAL | 57.7% |
| SIGNAL required | 42.3% |

Across the eight sized-river configurations, STRIKE is required in 0.4% to 2.2% of rescuable worlds.

What the bots achieve on rescuable worlds at baseline:

| Policy | Wins |
|---|---:|
| Strike every round | 0.2% |
| Random play | 4.2% |
| Alternate strike and hide | 5.7% |
| Strike after a shortfall | 5.9% |
| Signal every round, never hide | 7.9% |
| Signal the heaviest extractor, hide when targetable | 33.8% |
| The same, plus acting in emergencies | 43.4% |

Paired on the same 500 worlds, plain cooperation beats alternate striking by 32.0 points (interval
27.2 to 36.8).

Three readings:

- **v0.3's own test passes.** "If perpetual striking wins most seeds, we have not implemented our
  intended game." It wins 0.2%.
- **The opposite failure is present.** v0.1 required that STRIKE be real, "with an actual tactical
  benefit under some conditions". Here plain cooperation with hiding beats every striking policy in
  all nine configurations, including a hostile mix of 20 / 40 / 40 (27.2% against 1.5%). None of the
  variations produced a kind of world in which a tested policy should reach for it.
- **Strike-only wins exist, and the bots do not find them.** Full knowledge finds them in 57.7% of
  rescuable worlds by choosing the target and the round exactly. The striking bots choose targets by
  band and win at most 5.9%. Whether a cleverer observation-based policy could find those lines is
  untested.

HIDE earns its place. Signalling every round without hiding loses the station in 71.8% of worlds.

## 3. LISTEN

v0.3's second acceptance test: how much better do policies perform when they use LISTEN intelligently?

| Paired comparison, 500 worlds | Difference | 95% interval |
|---|---:|---:|
| One opening LISTEN added to plain cooperation | +1.8 points | −2.9 to +6.5 |
| One opening LISTEN added to the emergency policy | −0.2 points | −5.0 to +4.6 |
| LISTEN before every offer, against plain cooperation | −16.8 points | −21.1 to −12.5 |

A refused SIGNAL already reports "lacks capacity" or "declines". That is most of what LISTEN
reveals, and the SIGNAL might have been accepted. LISTEN's only advantage is zero exposure, and one
HIDE repays a SIGNAL's exposure in full.

LISTEN does appear to help when districts do not relay offers: about 11 points on plain cooperation
in the hub-only variation (32.6% against 21.3%, Table 4, not a paired test). So its value depends on
a rule I assumed.

## 4. The Failure Rules

**The consecutive rule ignores depth.** A strike moves water in time: +3 now, −3 to −4 next round.
Two shortfalls in a row lose; alternating ones do not.

| Basin rule | Rescuable worlds winnable with no SIGNAL | Alternate-strike bot |
|---|---:|---:|
| Two consecutive shortfalls (v0.3) | 57.7% | 5.7% |
| Cumulative deficit, buffer 6 | 21.9% | 0.0% |
| Cumulative deficit, buffer 3 | 5.5% | 0.0% |

Seed 5 shows the mechanism. `STRIKE A, HIDE, HIDE, HIDE, HIDE, HIDE` wins. The districts' own
strikes on each other then produce flows of 30, 30, 27, 30, 27, 30: short every second round, never
twice running. Replay it with `node scripts/replay.ts 5 "STRIKE A, HIDE, HIDE, HIDE, HIDE, HIDE"`.

The cumulative rule does not close this line by itself. Its total deficit is exactly 6, and collapse
requires more than the buffer, so it still wins at a buffer of 6 and loses at a buffer of 5. The
win also leaves District A with 2 units of unmet need and District F with an empty reserve, which
the win condition does not look at. (Both points were raised in external review of this run and
confirmed here.)

**District deprivation is all but unreachable.** v0.3 added it to stop the basin being saved by
sacrificing districts. Under v0.3's own numbers no policy bot ever triggers it, and random play does
in at most 0.05% of runs (Table 6, where that rounds to 0.0% or 0.1%). A strike prevents at most 5 units,
reserves absorb the gap, and next round's catch-up means a second strike leaves only 1 unit unmet
(test: `catch-up blunts a second strike on the same district`). The rule is in the code and does
almost nothing.

## 5. The Network

| | Hub only | With district events |
|---|---:|---:|
| Plain cooperation, rescuable worlds | 21.3% | 33.8% |
| One move suffices (full knowledge) | 49.8% | 72.6% |

The gain comes from relay: a Reciprocal district that accepts keeps offering agreements to others,
one per round. One SIGNAL to the right district can carry the game. That makes cooperation
contagious, which suits the theme, and it also reduces many worlds to a single decision.
Relay is my assumption, not v0.3's.

## 6. Where the Simulator Corrected My Review

| What I said | What the simulator shows |
|---|---|
| Alternating strikes beat the consecutive rule. | Half right. The arithmetic holds (57.7% against 21.9%), but a simple alternating bot wins only 5.7%: retaliation and deficits larger than 3 stop it. I overstated how exploitable it is. |
| SIGNAL may dominate LISTEN as a probe. | Held. |
| Seven failure conditions will raise unwinnable worlds. | Wrong. District deprivation almost never fires; 0.6% of worlds are unwinnable. |
| The player's leverage shrinks among seven actors. | Wrong at a sized river (91.2% rescuable). True at a fixed river (44.3%). |
| An accepted SIGNAL is worth far more than a STRIKE. | Held, and more strongly than the +8 against 0 arithmetic suggested. |

## 7. Against v0.3's G1 Gate

"Meaningful player leverage, verified resource accounting, and no universally dominant strategy."

| Criterion | Result |
|---|---|
| Meaningful leverage | Met at a sized river. Not met at a fixed river. |
| Verified resource accounting | Met. Water conserved on 3,000 random runs; 23 tests pass. |
| No universally dominant strategy | Met in the narrow sense: the best bot wins 46.4% of all worlds. Not met in spirit: cooperation with hiding beats every striking policy in every configuration. |
| LISTEN improves informed play | Not shown. The intervals include zero and cannot rule out a gain of up to about 6 points. |

## 8. What I Would Change, in Order

These are options. Each is yours to decide.

1. **Keep the per-world river.** Without it the other results do not matter.
2. **Decide what STRIKE is for.** Today the share of worlds that need it is about 1%. If the game is
   meant to hold "a difficult protective intervention", that share has to be chosen and built: for
   example more worlds where no district has the reserves to cooperate, plus something observable
   that tells the player when a strike is safe.
3. **Give LISTEN something a refused SIGNAL does not give.** Otherwise remove it.
4. **Replace or repair the district-deprivation rule.** A cumulative count of unmet need per district
   would fire; the consecutive count does not.
5. **Choose the basin rule knowingly.** Cumulative deficit removes most strike-only wins. Unwinnable
   worlds go from 0.6% to 2.0% at a buffer of 6, which is a handful of worlds either way.
6. **Limit relay**, for example to one relay per district, if one move deciding 72.6% of worlds is too few.

## 9. What This Cannot Tell You

- Whether a person can read the bands and events well enough to beat 43%.
- Whether six rounds feel like enough. With full knowledge they are more than enough; the difficulty
  is knowing, not acting.
- Whether it is fun.
- Anything about the philosophy. The outcomes follow from authored rules, most of them mine.
- Harm comparisons between bots. Total unmet need is reported in Table 3, but losing runs end early,
  so the totals are not comparable across policies.

## Tables

Generated by `node scripts/report.ts` from `out/*.json`. Do not edit below this line by hand.

<!-- TABLES -->

### Table 1. Leverage: what the player can change, by configuration

| Configuration | Seeds | Unwinnable | Doing nothing wins | Rescuable (doing nothing loses, some sequence wins) |
|---|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 500 | 0.6% | 8.2% | 91.2% |
| Basin fails on cumulative deficit (buffer 6) | 300 | 2.0% | 9.7% | 88.3% |
| Cumulative deficit, buffer 3 | 300 | 7.3% | 1.0% | 91.7% |
| No district-to-district events (hub only) | 300 | 2.7% | 8.3% | 89.0% |
| Family mix 60 / 25 / 15 (R / E / P) | 300 | 0.3% | 7.0% | 92.7% |
| Family mix 20 / 40 / 40 (R / E / P) | 300 | 1.7% | 7.7% | 90.7% |
| River one unit scarcer (slack -2) | 300 | 3.3% | 2.7% | 94.0% |
| River one unit looser (slack 0) | 300 | 0.0% | 30.0% | 70.0% |
| Fixed river of 60 for every world (uncalibrated) | 300 | 38.7% | 17.0% | 44.3% |

### Table 2. Which actions the rescuable worlds need (full-knowledge search)

| Configuration | Rescuable seeds | Winnable with no STRIKE | STRIKE required | Winnable with no SIGNAL | SIGNAL required | Mean share of all sequences that win |
|---|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 456 | 99.1% | 0.9% | 57.7% | 42.3% | 3.8% |
| Basin fails on cumulative deficit (buffer 6) | 265 | 99.2% | 0.8% | 21.9% | 78.1% | 3.0% |
| Cumulative deficit, buffer 3 | 275 | 97.8% | 2.2% | 5.5% | 94.5% | 1.5% |
| No district-to-district events (hub only) | 267 | 98.9% | 1.1% | 55.4% | 44.6% | 3.2% |
| Family mix 60 / 25 / 15 (R / E / P) | 278 | 98.2% | 1.8% | 66.5% | 33.5% | 6.5% |
| Family mix 20 / 40 / 40 (R / E / P) | 272 | 99.6% | 0.4% | 53.7% | 46.3% | 1.6% |
| River one unit scarcer (slack -2) | 282 | 98.2% | 1.8% | 33.3% | 66.7% | 2.4% |
| River one unit looser (slack 0) | 210 | 99.5% | 0.5% | 82.4% | 17.6% | 4.6% |
| Fixed river of 60 for every world (uncalibrated) | 133 | 93.2% | 6.8% | 37.6% | 62.4% | 3.0% |

### Table 3. Observation-limited bots at baseline (500 seeds)

| Bot | Wins, all seeds | Wins, rescuable seeds | Lost station | Lost basin | Lost district | Mean unmet need (units) | Mean strikes | Mean signals |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| hide x6 (do nothing) | 8.2% | 0.0% | 0.0% | 91.8% | 0.0% | 1.53 | 0.00 | 0.00 |
| strike every round | 0.2% | 0.2% | 76.6% | 68.6% | 0.0% | 4.98 | 2.85 | 0.00 |
| alternate strike | 5.4% | 5.7% | 24.0% | 72.4% | 0.0% | 3.01 | 1.52 | 0.00 |
| reactive strike | 6.0% | 5.9% | 43.8% | 50.2% | 0.0% | 4.43 | 2.03 | 0.00 |
| cooperate, hide when exposed | 37.4% | 33.8% | 0.0% | 62.6% | 0.0% | 3.36 | 0.00 | 2.36 |
| cooperate loudly | 8.4% | 7.9% | 71.8% | 28.0% | 0.0% | 3.19 | 0.00 | 3.96 |
| listen once, then cooperate | 39.2% | 34.9% | 0.0% | 60.8% | 0.0% | 3.04 | 0.00 | 2.13 |
| listen before every offer | 20.6% | 14.5% | 0.0% | 79.4% | 0.0% | 2.31 | 0.00 | 0.74 |
| informed mixed, no listen | 46.4% | 43.4% | 1.0% | 53.2% | 0.0% | 3.72 | 0.00 | 2.93 |
| informed mixed | 46.2% | 42.5% | 0.8% | 53.6% | 0.0% | 3.39 | 0.03 | 2.40 |
| random (mean of 20) | 4.9% | 4.2% | 53.7% | 64.4% | 0.0% | 2.56 | 1.11 | 1.14 |

### Table 4. Bot win rate on rescuable seeds, by configuration

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 0.0% | 0.2% | 5.7% | 5.9% | 33.8% | 7.9% | 34.9% | 14.5% | 43.4% | 42.5% | 4.2% |
| Basin fails on cumulative deficit (buffer 6) | 0.0% | 0.0% | 0.0% | 0.0% | 41.1% | 6.8% | 44.5% | 17.7% | 44.2% | 44.5% | 3.3% |
| Cumulative deficit, buffer 3 | 0.0% | 0.4% | 0.0% | 0.0% | 18.9% | 5.5% | 22.2% | 5.8% | 19.6% | 24.0% | 1.6% |
| No district-to-district events (hub only) | 0.0% | 0.4% | 4.5% | 6.7% | 21.3% | 7.1% | 32.6% | 10.1% | 36.0% | 39.7% | 3.4% |
| Family mix 60 / 25 / 15 (R / E / P) | 0.0% | 0.4% | 8.6% | 6.5% | 38.8% | 15.1% | 46.8% | 22.7% | 51.1% | 51.8% | 7.1% |
| Family mix 20 / 40 / 40 (R / E / P) | 0.0% | 0.0% | 1.5% | 1.1% | 27.2% | 1.5% | 26.5% | 8.5% | 36.0% | 32.0% | 1.7% |
| River one unit scarcer (slack -2) | 0.0% | 0.0% | 2.8% | 3.2% | 22.0% | 6.0% | 23.4% | 8.9% | 25.5% | 24.8% | 2.8% |
| River one unit looser (slack 0) | 0.0% | 0.0% | 5.2% | 6.7% | 44.8% | 6.7% | 46.2% | 22.4% | 60.0% | 55.7% | 5.0% |
| Fixed river of 60 for every world (uncalibrated) | 0.0% | 0.0% | 2.3% | 4.5% | 30.8% | 4.5% | 27.1% | 16.5% | 32.3% | 34.6% | 3.8% |

### Table 5. Bot win rate on all seeds, by configuration

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 8.2% | 0.2% | 5.4% | 6.0% | 37.4% | 8.4% | 39.2% | 20.6% | 46.4% | 46.2% | 4.9% |
| Basin fails on cumulative deficit (buffer 6) | 9.7% | 0.3% | 0.0% | 0.3% | 45.0% | 9.3% | 48.3% | 25.0% | 47.7% | 48.3% | 4.6% |
| Cumulative deficit, buffer 3 | 1.0% | 0.3% | 0.0% | 0.3% | 18.0% | 5.7% | 21.3% | 6.3% | 19.0% | 23.0% | 1.7% |
| No district-to-district events (hub only) | 8.3% | 0.3% | 4.0% | 6.3% | 24.0% | 7.0% | 33.7% | 13.3% | 36.7% | 40.7% | 3.9% |
| Family mix 60 / 25 / 15 (R / E / P) | 7.0% | 0.3% | 8.0% | 6.3% | 41.7% | 15.0% | 48.7% | 27.0% | 53.3% | 54.0% | 7.3% |
| Family mix 20 / 40 / 40 (R / E / P) | 7.7% | 0.0% | 1.7% | 1.3% | 31.3% | 1.7% | 31.7% | 14.3% | 39.3% | 36.0% | 2.1% |
| River one unit scarcer (slack -2) | 2.7% | 0.0% | 2.7% | 3.0% | 23.3% | 5.7% | 24.3% | 11.0% | 26.7% | 26.0% | 2.9% |
| River one unit looser (slack 0) | 30.0% | 0.7% | 5.7% | 11.0% | 58.3% | 10.3% | 62.0% | 43.0% | 70.0% | 68.3% | 8.2% |
| Fixed river of 60 for every world (uncalibrated) | 17.0% | 0.7% | 3.0% | 10.7% | 30.7% | 6.0% | 28.7% | 24.3% | 31.3% | 32.3% | 4.6% |

### Table 7. Fewest SIGNALs or STRIKEs in any winning line, rescuable seeds (full-knowledge search)

| Configuration | One | Two | Three | Four or more |
|---|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 72.6% | 24.1% | 3.1% | 0.2% |
| Basin fails on cumulative deficit (buffer 6) | 69.1% | 22.6% | 6.8% | 1.5% |
| Cumulative deficit, buffer 3 | 45.1% | 35.6% | 16.0% | 3.3% |
| No district-to-district events (hub only) | 49.8% | 44.6% | 4.9% | 0.7% |
| Family mix 60 / 25 / 15 (R / E / P) | 86.0% | 13.3% | 0.4% | 0.4% |
| Family mix 20 / 40 / 40 (R / E / P) | 58.5% | 35.7% | 5.5% | 0.4% |
| River one unit scarcer (slack -2) | 56.0% | 36.9% | 6.7% | 0.4% |
| River one unit looser (slack 0) | 88.6% | 10.5% | 1.0% | 0.0% |
| Fixed river of 60 for every world (uncalibrated) | 53.4% | 26.3% | 15.8% | 4.5% |

### Table 6. How often each bot loses a district to deprivation, by configuration

| Configuration | hide x6 (do nothing) | strike every round | alternate strike | reactive strike | cooperate, hide when exposed | cooperate loudly | listen once, then cooperate | listen before every offer | informed mixed, no listen | informed mixed | random (mean of 20) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Baseline (v0.3 numbers, consecutive rule) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Basin fails on cumulative deficit (buffer 6) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.1% |
| Cumulative deficit, buffer 3 | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| No district-to-district events (hub only) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Family mix 60 / 25 / 15 (R / E / P) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| Family mix 20 / 40 / 40 (R / E / P) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| River one unit scarcer (slack -2) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| River one unit looser (slack 0) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.1% |
| Fixed river of 60 for every world (uncalibrated) | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% |
