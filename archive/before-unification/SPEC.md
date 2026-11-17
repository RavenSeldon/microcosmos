# The Dark Microcosmos — Rule Specification as Implemented

**Status: provisional.** This is one candidate instantiation of Design Synthesis v0.3, written so the
headless simulator has no undefined state transition. It is not a frozen specification.

Every rule carries a tag:

- **[S] Settled** — stated in v0.3. Implemented as written.
- **[A] Assumed** — v0.3 left this open ("the exact agent policies and event scheduling belong in the
  headless specification"). I chose something simple and declared it. Each one is yours to overrule.

All numbers live in `src/params.ts`. Changing a number there changes it everywhere.

## 1. The World

| Rule | Tag |
|---|---|
| Six districts, six rounds, one station action per round. | S |
| Each district has a hidden policy family: Reciprocal, Extractive or Preemptive. | S |
| Families are drawn independently per district with weights 40 / 35 / 25 (R / E / P). | A |
| Each district has a base need of 3–8 units per round, plus a per-round shock of −1, 0, 0 or +1. | A |
| Each district starts with a reserve of 0–10 units. Reserves are capped at 10. | A |
| The river carries a fixed number of units into the network every round. | A |
| The river is sized per world: basin minimum (30) + that world's total base need + `slack`. Baseline slack is −1. | A |
| The basin minimum is 30. | S (illustrative in v0.3) |
| Station integrity starts at 3. | S |
| A seed-shuffled priority order decides who gets the autonomous slot and who attacks first. It is drawn from its own random stream, so it cannot correlate with family or position. | A |

**Why the river is sized per world.** With one fixed river for every world, total need varies so much
between worlds that most are decided before the player moves. `RESULTS.md` shows both.

**Randomness.** All random draws happen at world generation, each purpose from an independent stream.
Round resolution draws nothing. The same seed and the same actions always produce the same record.

## 2. What the Player Sees

| Observation | Tag |
|---|---|
| Exact basin flow of the previous round. | S |
| A withdrawal band per district for the previous round: low (≤ 3), medium (4–7), high (≥ 8). | S for the bands, A for the thresholds |
| Every district-to-district signal or strike, with sender and recipient. | S |
| Which districts hit the station. | S |
| Whether each agreement was upheld or broken. | S |
| Which districts suffered serious unmet need ("distress"). | S |
| Round one starts with one scripted history round: extraction only, no actions. Its shortfall, if any, does not count toward failure. | S for the history round, A for not counting it |
| LISTEN reveals the target's current need and reserve. Never its family. | S |
| A refused SIGNAL says whether the district lacks capacity or declines. | S |

## 3. Baseline Extraction

| Rule | Tag |
|---|---|
| Baseline withdrawal depends on need, reserve pressure and previous events. Never on family. | S |
| A district takes its need from the river. | A |
| Reserve pressure: a district whose reserve is below 4 takes 1 extra unit to refill. | A |
| Previous events: a district struck last round attempts catch-up this round (see §5). | S |
| Districts draw in fixed order A to F. If the river runs dry, later districts get less. This is rare. | A |

A test confirms the family cannot be read from the public record of a passive game
(`sweep: baseline extraction does not leak the hidden family`).

## 4. The Four Actions

**Resolution order each round [A]:** station action → at most one autonomous district event →
extraction → attacks on the station → failure checks.

### LISTEN (exposure +0) [S]
Reveals the target's need this round and its current reserve. Changes nothing in the world.

### SIGNAL (exposure +2) [S]
Requests a conservation agreement. If accepted, the district covers up to 4 units of its need from
reserves instead of the river, this round and next [S]. It cannot cover more than its need or more
than it holds [A].

Who accepts [A]:

| Family | Accepts when |
|---|---|
| Any | Never if its reserve is below 2: it replies "lacks capacity". |
| Any | Never if the station has struck it: it replies "declines". |
| Reciprocal | Otherwise always. |
| Extractive | Only if its reserve is 8 or more (cooperation is cheap for it). |
| Preemptive | Only if the station has never struck anyone. |

An Extractive district breaks the second round of an agreement if its reserve has fallen below 6 [A].
This is what "whether an agreement was upheld" reports.

### STRIKE (exposure +3) [S]
Prevents up to 5 units of the target's extraction this round. 2 of the prevented units are destroyed;
the rest stays in the river [S]. So a full strike is worth +3 to the basin this round.

- The struck district covers any gap from its reserve if it can [A].
- Next round it attempts up to 3 units of catch-up extraction [S], on top of any refill [A].
- The strike creates a permanent grievance [S] and voids any agreement with the target [A].
- A district struck by the station loses its autonomous network action that round [A].

**Water ledger.** Every round: river = water taken by districts + water destroyed + basin flow.
A test checks this on 3,000 random runs.

### HIDE (exposure −2) [S]
No other effect.

### Exposure [S]
Starts at 0, bounded 0–4, never decays. At 2 or above the station is targetable.

## 5. Attacks on the Station

Attacks resolve in the same round as the action that provoked them [S]. When exposure is 2 or more [S]:

| Family | Attacks when | Tag |
|---|---|---|
| Preemptive | Exposure is 4, or the station has ever struck anyone. | A |
| Reciprocal | It holds a grievance against the station. | A |
| Extractive | Never. | A |

At most one hit lands per round, costing 1 integrity [A]. Attacks continue every round the condition
holds.

## 6. The Living Network

At most one autonomous district-to-district event per round [S]. Districts are checked in priority
order; the first with something to do takes the slot [A]. In order of preference [A]:

1. **Retaliation.** A Reciprocal or Preemptive district struck by another district strikes back once.
2. **Preemption.** A Preemptive district strikes a district that struck someone last round; failing
   that, the heaviest extractor in the high band.
3. **Relay.** A Reciprocal district that has entered an agreement, and holds no grievance against the
   station, signals one further district it has not yet asked.

A district-to-district strike has the same water effects as a station strike. A relayed signal is
accepted on the same rules as §4, except that a Preemptive district declines if another district has
ever struck it.

Extractive districts never initiate network events.

## 7. Ending

| Rule | Tag |
|---|---|
| Station destroyed: integrity reaches 0. | S |
| Basin collapse: two consecutive rounds with flow below 30. | S |
| District deprivation: any district has serious unmet need two rounds running. | S |
| "Serious" means 2 or more units of need unmet in a round, after reserves. | A |
| Win: round six resolves with none of the above. | S |
| Alternative basin rule, off by default: each round's deficit is added up; collapse when the total exceeds a buffer of 6. A total of exactly 6 survives. | A (proposed in review) |

## 8. G1a Accounting (Added 14 November 2026; No Rule Above Changed)

The ledger and the fixed six-round evaluation record consequences. They do not feed back into play,
and the win or loss in §7 is reported unchanged as the legacy outcome.

| Definition | Tag |
|---|---|
| District hardship: unmet need per district after reserve use, summed over six rounds. | S (Decision Record) |
| "Essential need" is all need. The record does not define a non-essential part. | A |
| Basin harm: sum of deficits below the basin minimum over six rounds. The history round is excluded. | S for the sum, A for the exclusion |
| Reserve use is split into agreement draws (chosen) and emergency draws (forced by a shortfall). Neither is hardship. | S |
| Initial reserve is the reserve entering round one, after the history round. | A |
| Water destruction: units lost to strikes by the station or by districts. | S |
| Unresolved obligations: catch-up extraction still owed, agreement rounds still running, and the most reserve those rounds can still draw (4 per round, capped by the final reserve). | S for recording them, A for the cap |
| Station harm: integrity lost, final integrity, final exposure. | S |
| Fixed horizon: after the playable game ends, rounds continue to six with the station taking no action. | S |
| An inert station keeps its exposure, and districts may still hit it until integrity reaches 0. | A |
| No terminal-reserve failure threshold exists. | S |

## 9. G1b: the Conditional Threat (Added 15 November 2026; Behind a Switch)

With `preemption: 'threat'` the second preference in §6 changes. Everything else is as above. With
the switch absent, §6 applies unchanged and the baseline reproduces.

| Rule | Tag |
|---|---|
| Trigger: a Preemptive district that sees another district in the high band may issue a public threat, by the existing priority order, in place of striking. | S (Ben, 14 Nov 2026) |
| Warning: the threat names attacker and target, and resolves next round. It is a public event. | S |
| Resolution: after the station's next action, if the target's planned withdrawal is still in the high band and the attacker can act, the strike goes ahead. Otherwise the threat lapses. | S |
| Intervention: an accepted SIGNAL lowers the target's withdrawal; a STRIKE on the attacker stops it acting. Neither changes any other rule. | S |
| Accounting: threats issued, executed, cancelled, interrupted and still pending are recorded separately. | S |
| Issuing a threat uses the round's one network slot. An executed threat is that round's network act. A lapse is not an act. | A |
| One threat can be pending at a time. | A |
| Planned withdrawal is what the target intends to take before strikes and before any river shortage. | A |
| The attacker "can act" unless the station struck it this round. | A |
| A STRIKE on the target does not cancel the threat. | A (follows from "planned") |
| Retaliation, and a Preemptive strike on a district that struck someone last round, remain immediate and unwarned. | A (unchanged from §6) |
| A threat made in round six is recorded as pending. | A |
| `slots: 'isolated'` gives hostile acts, threats and relays one lane each. Experiment only. | A |

**Endings (provisional placeholder, used only by the playable).** Victory is survival through six
resolved rounds [S]. Shared Dawn: survived, and no district was ever in distress. Fragile Peace: any
other survival. The Long Night: the basin collapsed, the station was destroyed, or a district was
lost. The Shared Dawn threshold is a placeholder [A]; Ben has deferred ending thresholds.

## 10. What This Specification Does Not Settle

- Whether these assumed policies are the ones you want. They are the simplest I could write that give
  each family a distinct response to offers and threats.
- The family mix. It decides how often cooperation works. `RESULTS.md` reports three mixes.
- Any number marked illustrative in v0.3.
