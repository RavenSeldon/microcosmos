# Expansion: More Planets, More Systems

## Current relational engine (16 November 2026)

`src/arenas.ts` now supplies a versioned `ArenaDefinition`, a roster of `PlanetDefinition` records,
and an `ARENAS` registry. `src/constellation.ts` takes an arena explicitly; links, stores, weather,
abilities, encounters, forecasts and replay derive from that definition. Saves use arena ID and
rules version. The UI takes its roster and renderer count from the selected definition.

One arena is playable. Registering another definition is scaffolding, not a claim of balanced new
content. Tests run 3-, 8- and 16-world fixtures through the engine and check sizing and conservation.
All original six archetypes remain available; adding a new archetype needs an explicit ability,
voice, consent behaviour and tests. Repeated themes now clone body shader uniforms per world;
camera fit grows with ring radius. The existing `cosmosLayout` still provides multi-ring geometry.

Travel, arena selection, cross-arena transfers and simultaneous galaxy turns are not implemented.
They remain separate design choices. See [the playable scope](FIRST-ORBIT.md).

## Original Dark Forest engine scaffold

The notes below describe the preserved `challenge.html` engine, which still uses its six-district
contract. They do not constrain the new arena-driven engine.

**Original status: scaffolded, not built.** This build plays one system of six planet-ships. The code has
been arranged so that a larger system, or several systems, is a change in known places rather
than a rewrite. Nothing below has been designed, tuned or tested as gameplay.

Ben's instruction (2026-11-15): *"Let's also make the planets playable so we can make room for
expansions by adding more planets or even separate systems. Don't build that system just
scaffold it so it can be built later please <3"*

## What Is in Place

| Piece | Where | What it does today |
|---|---|---|
| Roster | `src/roster.ts` | `DISTRICTS = 6`, `LETTERS` (room for 16), `ACTIONS = 3·N + 1`, `assertRoster(n)` |
| Action encoding | `src/engine.ts` | LISTEN `0..N−1`, SIGNAL `N..2N−1`, STRIKE `2N..3N−1`, HIDE `3N`, all derived from `N` |
| Guard | `initState` → `assertRoster` | Any world whose size is not `DISTRICTS` throws with a pointer to this file |
| Search and bots | `src/search.ts`, `src/bots.ts` | Loop bounds, the LISTEN collapse weight and `total` use `DISTRICTS` and `ACTIONS` |
| Ledger and conflict | `src/ledger.ts`, `src/conflict.ts` | Recognise a strike with `kindOf(a) === 'K'`, not a hard-coded range |
| Names | `web/scene.ts`, `web/view.ts`, `scripts/replay.ts` | Letters come from `letter(d)` / `LETTERS` |
| Ring layout | `web3d/layout.ts` | `ringRadius(n)`, `planetPositions(n)`: n planets evenly spaced, at least 6.6 planet radii apart |
| Renderer | `web3d/world.ts` | `createWorld(host, reduced, events, count)`; every position, the hit spheres and the basin gauge scale from `count` |
| Several systems | `web3d/layout.ts` → `cosmosLayout()` | Places several rings side by side without overlap. **Unused.** |
| Tests | `test/layout.test.ts` | Six planets land where they always have; 3 to 16 planets never overlap; several systems never overlap; the roster refuses 8 |

## Touchpoints for a Larger System (One Ring, N ≠ 6)

1. **Roster.** Change `DISTRICTS`. The guard then admits the new size and refuses six.
2. **Worlds.** `src/world.ts` already sizes every hidden draw (needs, reserves, families,
   priority, relay orders) from `p.districts`. That parameter and `DISTRICTS` must agree; the
   guard in `initState` refuses a world where they do not.
3. **Tuned numbers.** Every number in `src/params.ts` was measured at six: supply, basin minimum,
   signal cover, strike damage, exposure steps. A larger ring changes the river's arithmetic. Each
   must be re-measured with the G1 harness before anything is called balanced.
4. **The golden baseline.** `test/golden/baseline-v0.3.json` is frozen at six. A new size needs its
   own baseline; the old one stays as it is.
5. **Search cost.** Exhaustive search grows as `(3N + 1)^6`. At N = 8 that is 25⁶ ≈ 244 million
   leaves before memoisation. The end-of-game "with full knowledge" lines may need a time budget or
   an offline table.
6. **Keyboard.** Ships are chosen with letters A–F and moves with L, S, K, H. From the eighth ship
   on, letters collide (H, K, L). Ships past F need another scheme (number keys already work to 9).
7. **Themes.** There are six planet designs. With more ships, designs repeat. The shared renderer
   now gives each ship independent body shader uniforms; additional designs remain art work.
8. **HUD.** The ship row is a six-column grid; the status column assumes six labels. Both need
   another layout past about eight.
9. **Learning worlds.** `web/scenarios.ts` builds six-ship worlds by hand. They stay six-ship worlds.

## Touchpoints for Several Systems

`cosmosLayout()` can place several rings in one scene, and that is all that exists. Every question
of how systems relate is open, and each is a design decision for Ben, not an implementation detail:

- Does each system have its own basin, or do they share water?
- Does the player keep one station, travel between systems, or hold one in each?
- Can a ship in one system threaten, strike or relay to a ship in another?
- Is a round simultaneous across systems, or does the player attend to one at a time?
- How does the end-of-game reveal and the omniscient "what was possible" search work across
  systems, when one system already takes about a sixth of a second to search in Node (measured: 126–179 ms over three worlds)?

Until these are answered, the engine's `State` describes exactly one system, and the renderer
draws exactly one ring.

## What Not to Assume

- That gameplay at N ≠ 6 is balanced, fun or even survivable. Nothing has been measured.
- That `cosmosLayout()` reflects a design. It is a geometry helper so the renderer does not paint
  itself into a corner.
- That a forecast sentence written for six ships stays true for more. The leak and truth tests in
  `test/forecast.test.ts` must pass at the new size before it ships.
