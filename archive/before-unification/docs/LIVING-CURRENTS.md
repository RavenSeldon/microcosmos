# Living currents — first playable season

**Historical prototype.** The current default is the six-world synthesis described in
[FIRST-ORBIT.md](FIRST-ORBIT.md). This document records the preceding three-world build.

15 November 2026. This supersedes the old four-action/six-round contract for the default experience.
Ben authorized implementation after the review, then clarified: “You can build over the game …
a more relational than a constitutional experience … more vibes than actual mental calculations.”

## The experience

Notice a world, invite a neighbour, watch water return, and give the relationship time to work.
The three original planet designs remain, alongside the cosmogram, dark sky and delicate filaments.
Names and emotional descriptions take the place of the combat dashboard. Listening is selection,
not a resource expenditure. No timers advance the simulation between player actions.

An invitation establishes a persistent, bidirectional relationship. Neighbours share only spare
clean water. Their connection also carries used water toward Verdance, including through another
neighbour when there is a route. A closed triangle offers spare routing capacity; it does not award
a friendship bonus. A connection can rest and be re-established. An offered gift redistributes
real water from the basin, which protects its own community first.

The dry spell is announced beforehand. Shortages are visible and recoverable. There is no loss
screen, station exposure, enemy classification, moral score, or permanent punishment. A shared
dawn is a first-season milestone, not a declaration that the world will remain healthy forever.

## What the water actually does

The engine tracks clean water in the basin/worlds and used water at each world. World needs are
3, 2 and 1 per moment. The basin community consumes 1; a further shared reserve of 4 is protected
from ordinary world deliveries. Gifts leave at least 5 before the basin community drinks.
Connected Sanctum can hold additional reserve. Neighbours share surplus only above their own need
plus a two-unit buffer. A connection carries at most three used units per moment, across all paths.

Verdance cleans up to seven units using external sunlight; one evaporates when processing occurs.
The rest returns to the basin for the next moment. The basin is capped at 28; overflow leaves the
system. A 16-moment season brings 3 rain normally, 0 on moments 7–9, and 5 on moments 10–12.
After the first season, Ember needs six during moments 5–12 of each season. Dry weather lasts
through moment 12; returning rain falls on moments 13–15. The next two quiet moments are simulated
for qualitative care requests, so a player gets warning before shortage. No surprise dice or
hidden traits are involved.

Every moment balances: previous stored water + rain − evaporation/overflow = new stored water.
The optional ledger exposes the exact amounts. Used water is not destroyed by consumption, and
recovered water cannot be spent twice in the same moment. The visible travelling lights reflect
recorded transfers, not invented economic activity. They are a short summary of that moment,
not a real-time simulation of processing order or travel duration. An amber halo and a plain
request identify a world that will need care if the next moments pass without intervention.

Shared dawn requires moment 12 or later, at least two connections, and three consecutive moments
with everyone's needs met, basin at least 8 and basin stock not declining. It remains a historical
achievement if later choices destabilize the garden.

## Scope and honest limitations

This is a gentle introductory season followed by a more demanding long summer, with three fixed
roles. It is not a campaign or a deep economy. Connecting early is intentionally a strong path
through the introduction. In the later summer, passive play with all three connections leaves
Ember short; two timely gifts prevent that shortage without depriving another community. Distinct personalities,
negotiation, further planet roles and new systems are not implemented. The voices are authored
feedback, not autonomous minds. This change does not establish that the game produces flow states;
only actual players can judge that.

The old experiment is at `challenge.html`, reached through the guide. Its six original worlds,
conditional threats, refined Strike and simulation results remain separate. The 2D archive remains
at `/play/` in the release. Neither supplies success metrics for the new experience.

## Verification

- 94 Node tests pass, including all original golden regressions.
- New tests cover 6,000 mixed-action water-balance steps, storage bounds, non-mutating transitions,
  autonomous seasonal survival, recovery after neglect, released links, alternate routes, replay,
  action validation, protected basin needs, and a later summer where attention changes the outcome.
- Browser: completed the first season through shared dawn; checked persisted reload, exact undo,
  restart/undo, dialog Escape/focus restoration, desktop layout and a 390 × 844 phone viewport.
- Browser: entered the long summer, observed an advance care request, and responded with two gifts
  through the last dry moment. The returning rain was announced next; the original 3D archive opens.
- Phone viewport has no horizontal overflow; advance control stays reachable while scrolling.
- WebGL-free HTML controls and reduced-motion behavior are implemented. A real phone, assistive
  technology, and human enjoyment have not been validated. No performance benchmark is claimed.

Local saving replays a versioned, validated action journal. Undo does the same. Sound is off until
explicitly enabled; it uses synthesized notes with no external assets or requests. No accounts,
backend, analytics or external services were added.
