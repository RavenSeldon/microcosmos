Worked for 1m 28s

### THE DARK MICROCOSMOS

G1 DECISION RECORD · v0.4 EXPERIMENTAL PLAN

I accept the correction. Harm accounting comes first, alone.

The objection is decisive: we cannot evaluate whether cooperation is beneficial, violence is protective, or listening is worthwhile until the game reliably measures the consequences those actions impose on every community.

The appropriate governing principle is:

Do not reward compassion by definition. Model consequences faithfully, then discover which strategies protect the interconnected worlds.

I also withdraw my earlier decision to use a cumulative buffer of six. It was an experimental placeholder, not a justified design parameter.

### My five decisions

| Open question           | Decision                                                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. STRIKE               | Retain, but defer redesign. Its intended role is exceptional protective interdiction, with an observable warning before the player must act.  |
| 2. LISTEN               | Retain provisionally. Test the cheapest information-leak ablation before introducing forecasts or tailored agreements.                        |
| 3. Basin rule           | Prefer cumulative harm as a candidate, but do not fix the buffer. Sweep thresholds after harm accounting is corrected.                        |
| 4. District deprivation | Prioritize immediately. Track cumulative unmet essential need, reserve depletion, and terminal conditions.                                    |
| 5. Relay                | Keep conditionally. Test a one-hop relay cap against the existing unlimited relay mechanism. Do not select a winner before comparing results. |

Only decision 4 authorizes an immediate gameplay-mechanics revision. The others define the subsequent experiments.

The five principles are compatible with the canon: collaboration should be broadly advantageous, offensive action should sometimes be justified, uncertainty should remain meaningful, and no community should disappear from the accounting simply because it is not represented by the player.

### Implementation authorization: G1a — Harm first

I would give the implementer the following precise instructions.

Change no action mechanics, policy probabilities, relay rules, or basin thresholds yet. First make the existing model account for its consequences correctly.

### Required accounting

Each world must produce a complete six-round record, including:

| Quantity               | Definition                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------- |
| District hardship      | Cumulative unmet essential need for each district, after reserve use               |
| Basin harm             | Sum of downstream deficits across all six rounds                                   |
| Reserve depletion      | Initial and final reserve for every district, plus actual withdrawals from storage |
| Water destruction      | Total physical resource loss caused by strikes                                     |
| Unresolved obligations | Outstanding catch-up extraction and agreement commitments at the end               |
| Station harm           | Damage received and final integrity                                                |

The accounting must distinguish using a reserve from harming a community. Spending stored resources to prevent shared harm can be a reasonable cooperative choice. However, an agreement that simply exhausts a district's resilience cannot be called costless.

I would retain the existing win/loss result as a clearly labelled legacy outcome while the new accounting is evaluated. Do not introduce an arbitrary terminal-reserve failure threshold yet.

### Fixed-horizon evaluation

The simulator should always produce six rounds of consequences, even when a game would ordinarily end early.

For evaluation, after terminal failure the station performs no further actions, while autonomous district activity and resource accounting continue. The original playable game can still stop immediately.

This gives us a common horizon for comparing hardship across strategies.

For the final round, record both actual reserve consumption and unresolved future commitments. This avoids treating an R6 agreement or strike as having no future cost, without inventing a seventh player turn.

### Acceptance tests

The G1a implementation should pass these checks:

* Every unit of water is accounted for, including river withdrawals, reserve transfers, destroyed resources, and downstream flow.

* The cumulative hardship ledger equals the sum of the underlying per-round records.

* Every policy has a comparable six-round evaluation window.

* Final-round agreements and strikes preserve their outstanding obligations.

* Original seeds remain reproducible.

* The baseline rules and results remain available unchanged for comparison.

One implementation caution: if accumulated hardship is added to the simulator state, update its cloning, serialization, and memoization keys wherever that information affects future decisions or terminal evaluation.

### The order after G1a

* G1a — Harm and terminal accounting

    Implement and test the ledger alone. No behavioural changes.

* G1b — Relay and basin ablations

    Compare unlimited relay with one-hop relay. Sweep cumulative-deficit thresholds instead of assuming six. Evaluate player leverage, decision depth, harm, and success together.

* G1c — Three LISTEN ablations

    First remove the refusal's explanation, then test information persistence, then test tailored agreements if necessary. Isolate each change on matched seeds.

* G1d — Protective STRIKE

    Add one-round-ahead public telegraphing and test whether an informed strike can prevent a harmful network action. Include at least one authored scenario where force is useful and another where it is a mistake. Report the actual frequency in generated worlds rather than quietly tuning it to a desired percentage.

* G1.5 — Human playtest and mechanics freeze

    Build the simple 2D interface, test with human players, then freeze the mechanics before undertaking production 3D work.

There is one important distinction between a balancing target and a test outcome. We can deliberately author encounters that teach protective force, but shouldn't claim that a certain natural frequency of justifiable violence has been discovered. It is partly determined by the distribution of worlds we choose to generate.

And for the held-out suite, use a separate, untouched seed range. The original calibration seeds 1–150 should remain identified as development data.

### Final direction

I want to protect three qualities simultaneously:

#如實: The simulation should tell the truth about its own resource accounting and assumptions.

#愛: Cooperation should often work because it creates better shared outcomes, not because the rules secretly award points for benevolence.

#PLAY: Listening, signalling, striking, and hiding should each lead to interesting decisions under different circumstances.

There is no reason to rush to the cosmic visuals before these are proven. But there is equally no reason to turn this into an indefinitely expanding research exercise. Once the corrected mechanics support an engaging, understandable six-round game, we build the celestial world.

Decision: authorize G1a now. Keep the other four decisions provisional until the harm-accounting results are available.

No need to expand the scope further.

Many worlds. One shared existence. No action without consequence.

道 · 愛 · 不二
