# The Dark Microcosmos — G1d: One Retaliation per STRIKE

Run of 15 November 2026 · the last simulation gate before play · earlier results untouched

**Rule (Ben, 15 Nov 2026).** A STRIKE stops the target's network action for the round and touches no
water. Exposure +3. The struck district may hit the station once, in that round, under its existing
policy. An old grievance never triggers a later attack. Exposure-based attacks and fresh strikes
still do. SIGNAL acceptance is unchanged: a struck district refuses, and Preemptive districts refuse
a station that has struck anyone.

Matched seeds: development 1–500; fresh held-out 400001–400500, first run here and now used.
67 tests pass, including four regression tests for repeat attacks and grievance persistence.

## Result for the conditional protector

It strikes only when the target has refused and the basin is safe.

| | Standing retaliation (G1c) | One response (G1d) | G1d, held-out |
|---|---:|---:|---:|
| Shared Dawn | 25.4% | 29.4% | 35.2% |
| Lost station | 36.8% | 28.2% | 24.8% |
| Lost basin | 42.4% | 48.0% | 45.0% |
| Distress rounds per world | 0.34 | 0.32 | 0.25 |
| Shared Dawn against the best cooperative bot | −8.2 (−11.1 to −5.3) | −4.2 (−7.3 to −1.1) | −6.6 (−9.6 to −3.6) |

For reference under G1d: best cooperative bot 33.6% Shared Dawn (held-out 41.8%), defuse by signal
32.0%, plain cooperation 29.2%.

With full knowledge, Shared Dawn needs a strike in 1.6% of worlds (held-out 2.2%), up from 0.4%.

## Against the Five Questions

| Question | Answer |
|---|---|
| Does conditional protection become more viable? | Yes. The gap to the best cooperative bot roughly halves, and it now matches plain cooperation. It is still behind the best cooperative bot. |
| Does removing perpetual retaliation address station losses? | Partly: 36.8% to 28.2%. Each strike still costs a hit, and a strike from exposure 1 lands on 4, where Preemptive districts attack unprovoked. |
| Are districts protected without neglecting the basin? | Mostly. Basin losses rise from 42.4% to 48.0%, about level with the best cooperative bot's 46.4%. |
| Do prevented attacks reduce hardship? | Slightly for this policy (0.34 to 0.32 distress rounds). The always-strike policy has the lowest distress of all, 0.11. |
| Does STRIKE sometimes improve on SIGNAL or HIDE? | With full knowledge, in 1.6% to 2.2% of worlds. For the bots, not yet on average. |

No correctness defect was found. The playable now uses this rule.
