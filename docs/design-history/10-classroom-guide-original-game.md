# A Classroom Guide to the Original Game (Astra, 16 November 2026)

> **This describes the archived six-round game** (the Station, LISTEN / SIGNAL / STRIKE / HIDE, hidden
> policies), reconstructed by Astra from `SPEC.md` and `RESULTS-G1C.md` without access to the live
> folder. It is kept as the model for how plainly the game should explain itself. The guide to the
> game that is played today is `docs/GUIDE.md`, and its teaching is spoken inside the game by the
> worlds themselves (`src/whispers.ts`).

# THE DARK MICROCOSMOS

A classroom game guide · How to play, what happens, and why your choices matter

Imagine six little towns sharing one river. Each town needs water to survive. But there's a seventh community at the very end of the river, and it needs water too.

Some towns are friendly. Some are selfish. Some get frightened and attack their neighbours.

You are the Station, a mysterious caretaker watching over the entire world. You cannot control the towns directly. You can only listen, negotiate, intervene, or hide.

Your job is to help everyone survive six rounds.

The trick? Saving the river isn't enough if the towns suffer, and helping the towns isn't enough if the river runs dry.

Source note: I recovered the project's implemented rule specification and its November 15, 2026 evaluation, including the newer STRIKE rules. I couldn't inspect the live `~/Root/Microcosmos` folder directly, so this describes the latest documented mechanics rather than claiming to verify every current screen or subsequent code change.&#x20;

SPEC(1).md

RESULTS-G1C.md



## Chapter 1: Meet your world

Teaching diagram, not the game's actual map. Six districts take water from a shared supply; the basin depends on what remains. The letters identify districts, not their physical positions.

Here are the world's important numbers.

| Game element         | What it means                                                 |
| -------------------- | ------------------------------------------------------------- |
| 6 districts          | Towns A, B, C, D, E and F                                     |
| 6 rounds             | Six chances to guide the world                                |
| 1 action per round   | You cannot solve every problem at once                        |
| River water          | The shared supply everyone depends on                         |
| Basin minimum: 30    | At least 30 water units should reach the downstream community |
| District reserves    | Emergency water stored by each town, maximum 10               |
| Station integrity: 3 | Your caretaker has three health points                        |
| Exposure: 0–4        | How visible and vulnerable your Station is                    |

The river brings the same amount of water each round within a particular game, but different games can have different supplies.

The towns get to use water before the basin receives the remainder.

## Chapter 2: Your four magical actions

You have four choices. Each consumes your single action for that round.

LISTEN — Learn a town's needs

Choose one district. You learn exactly how much water it needs this round and how much emergency water it has saved.

Exposure: +0 · Doesn't change water or town behaviour

Like asking a friend, "What do you need, and how much have you saved?"

SIGNAL — Ask for cooperation

Ask a district to use its stored water instead of taking so much from the river. If it agrees, it can use up to four units from reserves in each of two rounds.

Exposure: +2 · May save up to 4 river units per round

Like asking a friend, "Could you use some water from your tank, so our neighbours downstream have enough?"

STRIKE — Stop a dangerous action

In the newer playable rules, this interrupts the chosen district's network action for the round. It does not directly take or destroy water.

Exposure: +3 · Retaliation risk

Like stopping a bully from carrying out a planned attack. But the bully might become angry with you.

HIDE — Keep yourself safe

Reduce your exposure by two, down to a minimum of zero. You don't negotiate or inspect anyone, and you don't directly change water consumption.

Exposure: −2 · Helps protect your Station

Like switching off your flashlight when someone dangerous is looking for you.

Important STRIKE correction: The original v0.3 version stopped up to five units of extraction, destroyed two units when fully applied, left the rest in the river and created catch-up demand in the next round. That older water-changing STRIKE is retained behind a configuration switch. The G1c playable uses the newer interruption-based version instead.&#x20;

RESULTS-G1C.md



## Chapter 3: The towns have secret personalities

Each district belongs to one of three groups. The game chooses these secretly before play begins.

Reciprocal — The helpers

Usually accepts a SIGNAL if it has at least two reserve units and hasn't been struck by your Station.

A successful agreement can inspire it to invite another district to cooperate. But it may retaliate when attacked.

Extractive — The self-interested towns

Accepts an agreement only when it has at least eight reserve units and hasn't been struck by your Station.

It may break the second round of its agreement if its reserve falls below six. It doesn't initiate network actions.

Preemptive — The frightened defenders

Can agree to cooperate, provided it has at least two reserve units and your Station has never struck anyone.

It may attack other districts because it perceives a threat, even when they haven't directly attacked it.

In the documented default setup, each district has a 40% chance of being Reciprocal, 35% Extractive and 25% Preemptive. The choices are independent: one world could contain several helpers, while another might have very few.

The secret is that you cannot tell a town's personality from how much water it takes. Its water needs, reserves and events affect extraction, but its hidden family mainly determines how it responds to cooperation and threats.

## Chapter 4: Follow the water

Every town starts with a base water need of 3–8 units per round. Its need can change by −1, 0 or +1 in a particular round.

When a district's reserve is below four, it also tries to take one extra unit from the river to refill its stores.

The districts draw water in order from A to F. If the supply runs out, later districts can be left short. Stored reserves can help meet a shortfall, but a town may still experience unmet need.

The fundamental rule is:

\\[ \text{River supply}=\text{water taken}+\text{water destroyed}+\text{basin flow} \\]

A classroom water experiment

Suppose, for illustration, the river has 66 units and the six towns together need 37, with no refill or network interference.

Without an agreement

37 used · 29 to basin

29 is below the safe minimum of 30

With an accepted SIGNAL saving 4 river units

33 used · 33 to basin

33 reaches the basin — enough this round

River water used by towns

Water reaching basin

Illustrative arithmetic, not an actual saved game turn. The four saved river units are replaced by water from the cooperating district's reserves.

This shows why SIGNAL can be powerful. But it also reveals the cost: the agreeing town has spent four units of its emergency savings. Saving the basin today can leave that town more vulnerable tomorrow.

## Chapter 5: The towns can act without you

Microcosmos is a living network. Your actions aren't the only events.

Each round, at most one district-to-district event occurs automatically. Eligible districts are considered in a fixed priority order chosen when the world is generated.

The event can be:

1. Retaliation: A Reciprocal or Preemptive district that was attacked by another district may strike back once.
2. Preemption: A Preemptive district can strike a recent attacker, or otherwise target a heavy extractor.
3. Relay: A cooperating Reciprocal district can invite another district to join a conservation agreement.

Retaliation takes priority over preemption, which takes priority over relay. The first eligible actor takes the event slot.

These events may change water outcomes as well. The original specification gives district-to-district strikes destructive water effects; the later revision specifically changes the player's STRIKE.

This means a SIGNAL can have consequences beyond the town you targeted. One cooperative agreement might start a chain of agreements across the network.

The friendship chain — an illustrative example

Station

Town B

Town E

Town A

You SIGNAL Town B. It accepts. Because it is Reciprocal, it may later invite E. If E is also an eligible Reciprocal town, cooperation might spread further.

This is a possible chain, not a guaranteed outcome or a sequence that happens all in one round.

## Chapter 6: Your Station can be attacked

Your Station starts with three health points and zero exposure.

Try the exposure rules

Choose a current exposure and an action to see how visible your Station becomes. This is a teaching calculator, not the live game.

Current exposure

0 / 4

LISTEN (+0)

SIGNAL (+2)

STRIKE (+3)

HIDE (−2)

Exposure after action

# 2 / 4

Targetable

Attack possible, not guaranteed

Apply and try another roundReset

In the documented attack rules, Preemptive districts can attack when exposure reaches four or when the Station has struck someone. Reciprocal districts attack the Station if they hold a grievance against it. Extractive districts do not initiate Station attacks.

At most one Station hit lands per round, costing one health point. The Station is destroyed at zero.

One important development caveat: G1c found that striking a threatening district could provoke repeated attacks whenever the Station was targetable. A later G1d correction proposed limiting retaliation from an intervention to one same-round opportunity, with grievances still remembered. I cannot verify that G1d was implemented in the current build, so the stricter G1c behaviour is the last confirmed tested version.&#x20;

RESULTS-G1C.md



## Chapter 7: How a round actually works

1. Look at last round's clues.

   Check basin flow, town withdrawal bands, agreements, attacks and distress.
2. Choose one action.

   LISTEN, SIGNAL, STRIKE or HIDE. For the first three, choose a target district.
3. The network acts.

   A town may retaliate, preempt another town or relay a conservation offer. Your STRIKE can interrupt its selected target's network action.
4. Water is distributed.

   Towns draw what they need, refill reserves where applicable, use agreement or emergency reserves, and leave the remaining river water for the basin.
5. The Station faces possible attacks.

   Exposure and grievances determine whether an attack may occur. Health is reduced if one lands.
6. The world checks for failure.

   If the world survives, the game continues to the next round. After round six, you get your ending.

Before the first playable round, the game also generates a history round of water extraction. It provides clues about the world; any basin shortfall in this history round does not count as an actual losing round.

All the apparent randomness is fixed when the world is generated from a seed. If you replay the same world with the same actions, you get the same outcome. The simulation doesn't secretly roll fresh dice during each turn.

## Chapter 8: How to win — and how to lose

There are three documented ways to fail.

| Failure                  | What happens                                                                      |
| ------------------------ | --------------------------------------------------------------------------------- |
| The basin collapses      | Fewer than 30 units reach the basin for two consecutive rounds                    |
| The Station is destroyed | Its three health points are all lost                                              |
| A district is deprived   | The same town has serious unmet need (at least 2 units) in two consecutive rounds |

You survive the traditional game if you complete all six rounds without triggering these losses.

But the newer project also measures a better outcome: Shared Dawn.

SHARED DAWN

You survive all six rounds and no district experiences serious distress even once.

This is stronger than the original survival condition, which permits a single round of serious distress provided it isn't repeated in the next round.

Consider a world where the basin survives and the Station is intact, but Town C has suffered a terrible water shortage in round four. The original game might call this a win. It would not qualify for Shared Dawn.

The evaluation also records finer consequences: the total amount of basin water missing across the game, each district's unmet need, stored water consumed voluntarily or in emergencies, water destroyed, remaining obligations and Station damage.

Importantly, a district ending with no reserves is not automatically a loss. The game distinguishes being out of savings from actually having unmet needs.&#x20;

SPEC(1).md



## Chapter 9: What clues do children get?

Players aren't intended to see everything. The challenge is learning from imperfect information.

| You can observe                         | What remains hidden                          |
| --------------------------------------- | -------------------------------------------- |
| Exact previous basin flow               | A district's secret personality              |
| Previous low, medium or high withdrawal | Exact extraction, unless separately revealed |
| Who signalled or struck whom            | The full chain of future choices             |
| Which agreements succeeded or failed    | How every town will respond in future        |
| Serious distress and Station hits       | Exact current needs/reserves without LISTEN  |

The withdrawal bands are:

LOW

0–3

water units

MEDIUM

4–7

water units

HIGH

8+

water units

A refusal to SIGNAL is also a clue. If the town says it lacks capacity, its reserve is below the acceptance threshold. If it declines, it is refusing for another reason.

But a refusal does not prove whether a town is Extractive or Preemptive. One clue alone may not tell the whole story.

## Chapter 10: A first classroom playthrough

Imagine that you are playing and have just seen the opening history.

Round 1: The basin received only 29 units. Town B has a high withdrawal band. You decide to SIGNAL B because an accepted agreement might protect the river.

B accepts. The agreement can cover up to four water units from reserves in this round and the next. Your exposure rises from zero to two.

Other districts still act, so you must examine the resolution before deciding whether the basin is now safe.

Round 2: Your Station is visible at exposure two. Rather than becoming even more exposed, you choose HIDE.

Exposure returns to zero. B's agreement may still be active, so its cooperation could continue even though you used your action to protect yourself.

Round 3: The river is still under pressure, but another district has accepted a relayed agreement. You look at the new withdrawal bands and decide whether a further SIGNAL would help or whether LISTEN is worth the turn.

Rounds 4–6: You continue balancing cooperation, reserve depletion, Station safety and downstream water. The towns may attack or assist each other without asking permission.

At the end, you check whether the basin survived, the Station remained intact, and every district avoided serious distress.

This is a teaching scenario, not a guaranteed winning replay.

## Chapter 11: The secret strategy lesson

The simulation's tested strategies reveal something interesting about the design.

How simple computer players performed

Shared Dawn rate over 500 development worlds, November 15 G1c; these are tested bots, not guaranteed human outcomes.

0%10%20%30%40%Cooperate and manage riskDefuse with SIGNALIntervene conditionallyDefuse with STRIKE

The numbers do not mean the best strategy is solved. They show how the tested computer policies performed, without seeing the world's hidden state.

But they do suggest three useful lessons for students. Cooperation can spread through the network and is often powerful. Hiding matters because repeatedly exposing the Station is dangerous. Striking carries a large risk and, in the tested version, rarely outperforms negotiation.

A crucial limitation is that LISTEN currently costs a full turn, and its information often isn't sufficiently useful to justify that cost. A declined SIGNAL already provides some diagnostic information while also offering the possibility of immediate cooperation.

These are genuine balance findings, not moral rules that the game has proved about real societies.&#x20;

RESULTS-G1C.md

RESULTS.md



## Chapter 12: Why the game can still feel confusing

Here's the central problem with the presentation you've described.

The 3D celestial world is visually compelling, but the playable interaction currently lives separately on a 2D surface. Many consequences are summarized after an action rather than visibly happening in the world.

A child should be able to watch a SIGNAL travel from the Station to Town B, see B's reserves decrease, see less water drawn from the river, and see the basin receive the resulting water. Right now, that cause-and-effect relationship is difficult to experience directly.

Similarly, a STRIKE should visibly stop a planned network action, with any retaliation occurring as a separate, understandable event.

Those richer interactions, intent previews, visual water flows and staged animations are proposed interface improvements, not mechanics I can verify as already present.

The game's calculation engine is doing more work than the player's eyes can currently follow.

## A one-page classroom cheat sheet

| Question                         | Answer                                                                |
| -------------------------------- | --------------------------------------------------------------------- |
| Who am I?                        | The Station, caretaker of a shared river                              |
| Who lives here?                  | Six independent districts and a downstream basin community            |
| What do I do?                    | Choose one of four actions each round                                 |
| How long do I have?              | Six rounds                                                            |
| What does LISTEN do?             | Reveals a town's need and reserves                                    |
| What does SIGNAL do?             | Requests a two-round water-saving agreement                           |
| What does STRIKE do?             | Interrupts a town's network action, with retaliation risk             |
| What does HIDE do?               | Makes the Station less exposed                                        |
| Why do the towns fight?          | They follow hidden reciprocal, extractive or preemptive policies      |
| Can kindness spread?             | Yes, through relayed agreements                                       |
| Can I lose by being too helpful? | Yes, if repeated exposure leaves the Station vulnerable               |
| What is the best ending?         | Shared Dawn: survive all six rounds without serious district distress |

The most important distinction is between the game's mechanical objective and its interesting human question.

Mechanically, you're trying to maintain enough downstream water while keeping six districts and your Station safe under incomplete information.

But the question underneath is much more interesting:

Can you protect an entire world when you have very little power, incomplete knowledge, and only six opportunities to act?

That is the game Microcosmos is already trying to be. Making those choices visible, understandable and satisfying is the next challenge.

不二 — Not Two.&#x20;