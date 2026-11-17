# Expansion: More Worlds, More Arenas

**Working today:** one arena, `first-orbit`, six worlds.

**Scaffolded, not built:**

| Piece | Where | State |
|---|---|---|
| Arena as data | `src/arenas.ts` (`ArenaDef`, `WorldDef`, `ARENAS`) | The rules read an arena and nothing else. Roster size 3 to 16, checked by `assertArena` |
| Rules independent of roster | `src/microcosmos.ts` | Tested at 3, 8 and 16 worlds for sizing and conservation only. Nothing about balance |
| Stable identifiers | world `id`, trait `id`, arena `id` + `version` | Saves are keyed by arena id and version; what the player has learned is keyed by trait id |
| Ring layout for any count | `web3d/layout.ts` | 3 to 16 planets never overlap (`test/layout.test.ts`) |
| Several systems in one scene | `web3d/layout.ts` → `cosmosLayout()` | Geometry only. Unused |

**To add a world to an arena:** a `WorldDef` with its own numbers, voice and traits. A new
*archetype* also needs its behaviour written into the rules (ability, willingness, what reveals
its traits) and tests. There are six planet designs; a seventh world reuses one until a new
design is drawn.

**To add an arena:** register an `ArenaDef`. Then re-run `npm run strategies` against it and tune:
every number in the First Orbit was tuned for six worlds and this sky. There is no arena picker
in the page.

**Open design questions (Ben's):** what joins arenas (travel, shared water, nothing); whether
what is learned about an archetype carries between arenas; whether journeys vary within an arena.
