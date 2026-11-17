# THE DARK MICROCOSMOS

G1a REVIEW · DESIGN DECISIONS · #PLAY FIRST

My decision: preserve the consequences, reduce the ambient violence, and make cooperation more genuinely productive. Then get this game into human hands.

The G1a results are valuable. All 37 tests pass, the baseline remains reproducible, and the held-out results broadly replicate. But the most interesting discovery is that our current world is harsher than we intended.

A cooperative strategy reduces basin harm by 3.50 units, while consuming an additional 6.25 units of stored water and increasing district hardship by 1.40 units. Meanwhile, the network produces an average of 4.30 district-on-district strikes over six rounds, even when the player does nothing.&#x20;

RESULTS-G1A.md

RESULTS-G1A.md



That suggests a world where cooperation means asking already vulnerable communities to sacrifice themselves amid almost constant conflict.

That's not the compassionate dark forest I want us to build.

And importantly, it doesn't sound particularly fun.

## 1. The three decisions

| Question                                     | Decision                                                                                                                            | Why                                                                                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Is cooperation better?                       | Make it generally advantageous, but never automatically optimal.                                                                    | Cooperation should reduce destruction, improve trust, and sometimes preserve resources—not merely transfer hardship between communities. |
| Should victory consider the districts?       | Yes, through meaningful endings rather than numerous instant-failure conditions.                                                    | Protecting the basin while impoverishing every upstream district should not produce the same ending as genuinely shared survival.        |
| Is the network's existing violence intended? | No. Reduce unprovoked aggression substantially, but preserve credible threats, retaliation, and occasional protective intervention. | Conflict should create tension because it matters, not become background noise.                                                          |

These decisions replace the relevant provisional design intentions. They do not establish that the revised mechanics are already balanced.

## 2. Make winning simple, but endings interesting

I would keep the basic objective unchanged:

Survive all six rounds. Keep the Seventh Basin alive.

No complicated scoring formula. No additional resource currencies. No moral-purity meter.

However, the ending should reflect what happened throughout the network.

Shared Dawn

The station and basin survive, and the districts remain sufficiently resilient. Cooperation helped create a sustainable outcome.

Fragile Peace

The station and basin survive, but significant hardship, depleted reserves, or unresolved obligations remain.

The Long Night

The basin collapses or the station is destroyed. The final reveal shows what happened and what was still possible.

A district ending with zero reserve should not automatically invalidate a win. Reserves exist to be used, especially during crises.

Instead, distinguish voluntary sacrifice, actual unmet need, and ongoing vulnerability. The exact thresholds for Shared Dawn remain to be calibrated.

This gives players something to aspire to beyond simply surviving, without making a difficult situation feel unwinnable.

## 3. Fix the source of the violence

The current assumed Preemptive policy attacks the heaviest extractor in the high band, even without a preceding hostile act. That creates recurring violence, destroys water, and disproportionately harms districts that have spent reserves cooperating.&#x20;

SPEC(1).md



I would replace that behaviour with telegraphed escalation.

A frightened district can publicly threaten another district before attacking it. The player then has an understandable decision:

- LISTEN to understand the apparent threat.
- SIGNAL to attempt de-escalation.
- STRIKE to interrupt an imminent attack.
- HIDE to avoid exposure and accept the consequences.

No fifth action is necessary.

A preemptive district should respond to credible observed threats rather than treating high extraction alone as sufficient reason to attack. Its warning gives the player a fair opportunity to intervene.

This changes the emotional rhythm of the game. A strike becomes a dramatic event, not an ambient particle effect.

And a player choosing STRIKE against a genuinely imminent threat can feel clever rather than punished for using one of the available buttons.

## 4. Give cooperation a real dividend

We should preserve the fact that cooperation has costs. That is one of the G1a model's strongest corrections.

But a cooperative agreement should also be capable of creating a benefit neither district could achieve independently.

The simplest starting mechanism is avoided destruction: successfully negotiated agreements can prevent threatened conflict, preserving water that would otherwise have been destroyed and reducing the need for emergency reserve spending.

We don't need to invent new water supplies, upgrades, trade markets, or technological systems.

The network already has the ingredients for a positive-sum interaction: fewer destructive strikes, fewer retaliatory cycles, and conserved resources.

One caution: current cooperation can also reduce strikes simply by using the single autonomous network-event slot. That scheduling artefact must be separated from genuine behavioural de-escalation in the next experiment.&#x20;

RESULTS-G1A.md



## 5. The play experience we're aiming for

THE DARK MICROCOSMOS · ROUND 04

District E threatens District B.

Escalation imminent

District E believes B's withdrawals threaten its survival. You know B has been extracting heavily, but you don't know whether its need is genuine.

ONE TURN · FOUR CHOICES

Do you investigate? Attempt reconciliation? Disable the attacker? Or preserve your own safety?

That's the kind of moment I want players to remember.

Sometimes SIGNAL averts the attack. Sometimes the offer is refused. Sometimes STRIKE is the only effective immediate intervention. Sometimes the public threat is a bluff, and listening exposes it.

We should not predetermine those outcomes for the sake of teaching a moral lesson. They must follow from the explicit rules.

## 6. The shortest path to something fun

I would deliberately shorten our process now.

1. G1b — One focused balancing pass

   Test telegraphed escalation against the existing Preemptive rule. Isolate the network-slot effect, compare one-hop versus unlimited relay, and sweep basin thresholds.

   Keep the existing G1a ledger, avoid changing all parameters simultaneously, and use a fresh held-out seed range.
2. G1.5 — Make it playable in 2D

   Build six visible nodes, public activity cues, four action controls, a six-round clock, and the three endings. Use the same deterministic engine.

   This is the highest-priority milestone. We need people making decisions, not another elaborate design document.
3. G1.6 — Test actual enjoyment

   Observe whether players understand their choices, feel responsible for outcomes, voluntarily replay, and find reasons to use each action.

   If LISTEN or STRIKE still feels unnecessary, change or simplify the mechanic before progressing.
4. G2 — Build the celestial masterpiece

   Translate the proven game into the gold-filament, dark-void, nested-cosmos visual language from the five references. Preserve the small, lightweight mechanics underneath.

The first playable should arrive before any further large-scale research expansion. We have enough evidence to build a useful prototype now.

## Final design direction

DESIGN DECISION · G1b

# A forest worth saving.

The universe is dangerous, but not because everyone is evil.

Worlds are frightened, resource-constrained, and unable to see one another clearly.

Cooperation is often the strongest response because shared survival is possible. Yet sometimes mercy requires protection, and sometimes protection requires force.

Your task is not to be perfectly peaceful.

Your task is to understand enough to act well.

Every world contains another. No world survives alone.

Authorize G1b as a small, bounded balancing experiment, followed immediately by the ugly playable prototype. Keep the current baseline and G1a outputs intact. Do not freeze the revised gameplay until human playtesting.

The highest standard is no longer the number of tests or the elegance of the simulated policy. It is whether someone plays six rounds, sees the consequences unfold across that magnificent little universe, and thinks:

"I want to try that again. I think I understand something I missed."

That is #PLAY, and it belongs beside the rest of the canon.

如實 · 道 · 愛 · 不二