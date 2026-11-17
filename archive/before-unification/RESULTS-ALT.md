# The Dark Microcosmos — Offensive-Action Comparison

Run of 15 November 2026 · experiment only · nothing here changes the playable or any earlier result

All five variants run under the G1b threat rule on the same development seeds, 1–300. Each candidate
sits behind `strikeMode` and is tagged **[A]**: every response rule below is my assumption.

| Variant | What the third action does |
|---|---|
| STRIKE | As in G1b: cuts 5 units of the target's draw, destroys 2, stops its network action. |
| Interdiction | Stops the target's network action this round. No water touched, no catch-up. Exposure +3, grievance. |
| Interdiction, soft | The same, but only the jammed district holds it against the station. |
| SHIELD | The station takes any district strike aimed at the target this round: 1 integrity, no water lost. Exposure +2. |
| REVEAL | Needs an earlier LISTEN. Reserve under 4: a standing threat is withdrawn and none is made again. Reserve 8 or more: the district conserves for two rounds and resents the station. Otherwise nothing. Exposure +3. |

## Result

| Policy (variant) | Survives | Shared Dawn | Lost station | Lost basin | Distress rounds per world |
|---|---:|---:|---:|---:|---:|
| Cooperate, hide when exposed | 41.0% | 29.0% | 0.0% | 59.0% | 0.36 |
| Defuse by signal | 43.7% | 33.3% | 2.0% | 54.3% | 0.33 |
| Strike the attacker (STRIKE) | 15.7% | 14.0% | 37.7% | 64.3% | 0.24 |
| Strike the attacker (interdiction) | 15.3% | 15.3% | 22.7% | 69.7% | 0.12 |
| Strike the attacker (interdiction, soft) | 15.3% | 15.3% | 22.7% | 69.3% | 0.12 |
| Shield the threatened (SHIELD) | 16.3% | 16.3% | 17.0% | 72.3% | 0.13 |
| Listen, then reveal (REVEAL) | 39.3% | 32.0% | 5.0% | 56.0% | 0.17 |

With full knowledge, the third action is required in 1.2% of rescuable worlds as STRIKE and in 0.0%
under every candidate.

## Reading

1. **Interdiction does what it was designed to do.** It halves district distress (0.24 to 0.12 rounds
   per world) and destroys no water. It still loses by 25.7 points (−30.6 to −20.7), the same as the
   old STRIKE.
2. **The protectors lose on the basin, not on retaliation.** 64% to 72% of their games end in basin
   collapse. A turn spent protecting a district is a turn not spent relieving the basin, and the
   basin fails after two short rounds.
3. **So the fault is not in the action.** Survival depends only on the basin and the station. A
   district being struck is not something the win condition measures, so no action that prevents it
   can pay for the turn it costs.
4. **REVEAL is the only candidate that holds its own** (−4.3 points against defuse by signal, −10.7
   to +2.1). Its hoarder branch forces conservation, which helps the basin. That is why it competes,
   not because disclosure is powerful in itself.
5. **Softening retaliation changed nothing measurable.**

## What Would Have to Change for Any Protective Action to Matter

One of these, none of which is decided:

- District harm counts toward the outcome (the deferred ending and deprivation questions).
- The basin clock gives room for a second kind of move (the deferred basin-threshold question).
- The protective action also relieves the basin.

Outputs: `out/alt-*.json`, `out/alt-endings.json`. Tests: `test/alt.test.ts`.
