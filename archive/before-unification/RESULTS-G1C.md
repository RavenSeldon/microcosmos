# The Dark Microcosmos — G1c: Outcome Alignment

Run of 15 November 2026 · the trimmed G1c Ben approved ("Go") · earlier results untouched

Shared Dawn (survive, with no district ever in distress) is the measured outcome. Old STRIKE against
refined STRIKE (stops the target's network action; water untouched), both under the G1b threat rule.
Development seeds 1–500; fresh held-out seeds 300001–300500, first run here and now used.
62 tests pass. The Shared Dawn search is checked against brute force.

## Full knowledge: is a strike ever needed for Shared Dawn?

| | Old STRIKE | Refined STRIKE | Refined, held-out |
|---|---:|---:|---:|
| Worlds where Shared Dawn is reachable | 97.4% | 95.8% | 97.4% |
| Reachable only with a strike | 2.0% | 0.4% | 2.2% |
| Reachable only with a SIGNAL | 30.8% | 73.0% | 70.6% |

Shared Dawn is nearly always available, and nearly always without a strike. The refined STRIKE is
needed no more often than the old one; on development seeds it is needed less, because the old
strike also pushed water to the basin.

## Observation-limited policies under the refined STRIKE

| Policy | Survives | Shared Dawn | Lost basin | Lost station | Shared Dawn against the best cooperative bot |
|---|---:|---:|---:|---:|---:|
| Informed mixed, no listen (best cooperative) | 50.8% | 33.6% | 46.4% | 3.8% | reference |
| Defuse by signal | 43.2% | 32.0% | 55.0% | 1.8% | −1.6 (−5.5 to +2.3) |
| Protect when the basin is safe (conditional) | 27.8% | 25.4% | 42.4% | 36.8% | −8.2 (−11.1 to −5.3) |
| Defuse: signal, else strike | 24.2% | 24.2% | 50.8% | 34.0% | −9.4 (−12.6 to −6.2) |
| Defuse by strike | 15.8% | 15.8% | 71.2% | 23.6% | −17.8 (−21.5 to −14.1) |

Held-out seeds agree (conditional policy −13.0, interval −16.3 to −9.7).

## Reading

1. **Making Shared Dawn the goal does not give STRIKE a job.** Even the conditional policy, which
   strikes only when the target has refused and the basin is safe, reaches Shared Dawn less often
   than cooperating.
2. **For the conditional policy the killer is the station, not the basin.** Its basin losses are no
   worse than the cooperative bot's (42.4% against 46.4%). Its station losses are 36.8% against 3.8%.
3. **Why.** The district making a threat is always Preemptive. Struck, it hits the station in the
   same round, and again in every later round the station is targetable. Cooperating afterwards
   means signalling, which makes the station targetable. One strike therefore taxes every later offer.
4. **So the lever the evidence points at is retaliation, not the basin clock.** v0.4's own wording
   for the refined STRIKE was "retaliation remains possible and conditional". As implemented it is
   certain and permanent.

## Not Decided

- Whether retaliation after an interdiction should be limited (once, or only that round), and how.
- Whether a rare STRIKE (needed in about 0.4% to 2.2% of worlds) is acceptable as it stands, to be
  judged by people playing and not by bots.

The playable now uses the refined STRIKE and states Shared Dawn as the best ending. The original
STRIKE remains behind its switch. Outputs: `out/g1c-dev.json`, `out/g1c-heldout.json`.
