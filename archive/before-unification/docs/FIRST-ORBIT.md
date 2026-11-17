# Dark Microcosmos · Living Currents — The First Orbit

16 November 2026. The default experience now integrates six original planetary designs with
player-paced, persistent relationships and a real return-water economy. Ben asked to preserve
individuality, voluntary collaboration, player agency, rhythm, and room for additional arenas.

## What is playable

An eighteen-moment season, followed by repeating seasons with the same relationships and reserves.
No clock advances between decisions. Selecting a world is free. Most world panels expose a
signature action and one viable suggested invitation; alternative neighbours and reserve gifts
sit behind “Other possibilities.” All legal alternatives remain selectable. A decision gets a
short visual/audio beat; undo is available even during it. Sound is opt-in.

All six worlds recover water locally. Linked worlds share only clean water above their own need
and individual reserve, and route used water toward spare processing capacity. Each ordinary
current carries up to three used water per moment; Prism's carry five. Local processing happens
before network processing; recovered water fills the processor's buffer, then returns to the
basin. It cannot be consumed twice in the same moment. The basin has its own community and a
protected reserve. External rainfall/mist and actual evaporation, overflow and disruption losses
are tracked separately. The ledger exposes the balance without putting arithmetic on the main UI.

| Archetype | Individual behaviour | Three-moment ability |
|---|---|---|
| Obsidian Dusk | Keeps two spare water before sharing; wants a reserve or a history of exchange before a new invitation | Shelter itself and current neighbours from disruption; costs one stored water |
| Verdance | Extra wetland processing; refuses new currents while its used-water backlog exceeds eight | Expand processing by three and need by one per moment |
| Ember Glass | Shares freely above its own need; thirst increases during the hot passage | Expand processing by three and need by one per moment |
| Still Sanctum | Holds a deeper clean-water buffer and a larger sharing reserve | Open stores to the common basin, up to three per moment, keeping its own need |
| Prism Reach | Wider channels, with capacity five | A previewed temporary bypass to an unlinked eligible world, beyond port limits |
| The Unobserved | One close connection; catches mist in wet/gentle weather and reclaims more in dry weather | Invert that weather response for three moments, trading fresh supply against local recovery |

The activation moment is the first of the three moments. The UI then shows the remaining two.
Ordinary worlds have two ports; Unobserved has one. A bypass also occupies ports while active,
but can temporarily exceed their limits. Resting a current preserves its record of real exchange.
Memory affects Obsidian's willingness to reconnect; it is not a universal friendship bonus.

## Disagreement and agency

The authored first-orbit encounter occurs on moment seven of each season if Obsidian and Ember
do not already share a direct current. Obsidian fears Ember's increased demand and announces a
store disruption for the next moment. The player can:

- Mediate: Ember voluntarily returns two stored water, if it has them; no water is destroyed.
- Connect the two worlds: a direct current settles the announced threat, subject to invitation rules.
- Use a shelter that covers the target: the disruption is blocked.
- Interrupt: stop the announced action, but its source closes its connections and declines
  invitations for three moments, including the intervention moment.
- Let it happen: up to two of Ember's stored water is lost; recovery remains possible.

These are deterministic, visible rules. There are no hidden personality families or probabilistic
negotiations in this prototype. Capacities, reserves, backlog and temporary grievances constrain
consent. Distinct voices are authored feedback, not autonomous minds. This deliberately retains
a narrow slice of Dark Forest's protective decisions rather than importing its full exposure,
retaliation and hidden-policy system. The original remains available at `challenge.html`.

## Challenge without a mandatory social solution

A shared dawn requires at least eighteen moments and three consecutive moments with every need
met and the basin above its protected reserve. It does not require any links or a moral score.
It records a recovery milestone, not a promise that there was no earlier hardship or that later
seasons are solved. Shortages have no terminal game-over state.

Regression examples for this authored first season (moment → action):

- **No alliances:** 4, 7, 10 → Ember's forge; 8 → mediate; 11, 16 → Sanctum's stores. Rest otherwise.
- **One alliance:** 1 → Ember–Verdance; 8 → mediate; 10 → Sanctum's stores. Rest otherwise.
- **Broader network:** 1 → Ember–Verdance; 2 → Obsidian–Verdance; 3 → Ember–Prism;
  4 → Sanctum–Unobserved. Rest otherwise.

All three reach dawn with no shortages. The broader network finishes with a larger basin reserve.
The one-alliance reserve intervention also works at moments 9, 11 or 12: it is not a single exact
button timing. Passive play goes short beginning at the dispute, and can recover later after
opening useful routes. Forecasts simulate the next two quiet moments, giving advance care cues.
An ability preview also warns if any world would immediately go short under that choice.

## Durability and boundaries

The arena definition owns IDs, version, roster, archetypes, weather, initial stores and encounter.
Save keys include arena ID and rules version; journals are replayed through the same eligibility
checks as live play. Invalid saves are backed up before replacement, and new progress stays in
memory if device storage fails. The previous three-world garden's key is untouched. Undo replays
the journal; a fresh start can be undone immediately. Saved journals are capped at 4,000 decisions.

There is one playable arena. Additional arenas can register without changing the rules engine;
3-, 8- and 16-world configurations are tested for array sizing and water conservation, not balance.
The renderer scales its ring and camera, and repeated visual themes have independent body shader
uniforms. Existing `cosmosLayout` remains geometry scaffolding for multiple systems. No travel,
cross-arena economy, simultaneous galaxy simulation or arena selection UI is claimed.

## Verification

- 106 tests pass: original game/garden regressions plus twelve new orbit tests.
- 2,000 varied legal orbit decisions conserve water, respect storage bounds and preserve inputs.
- Tests cover independent/sparse/network paths, forecast warnings, recovery, ports, signature
  abilities, bypass expiry, negotiation, shelter, intervention, memory, save replay and undo.
- Browser: played the sparse-alliance season to dawn; reloaded saved state; undid the dawn moment;
  inspected the disagreement dialogue and selected-world controls.
- Phone viewport: 390 × 844, no horizontal overflow; six world controls and fixed advance button
  remain reachable; selecting a world brings its readable choices into view.
- Full static release is built with all local asset references and per-file hashes checked.

The code does not establish human enjoyment or a flow state. This remains one authored encounter
and a repeating seasonal economy, not a finished campaign. Long-run variety, balance across new
arenas, real-device performance and assistive-technology use need further playtesting.
