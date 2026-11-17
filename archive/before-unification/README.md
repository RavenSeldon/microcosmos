# Dark Microcosmos · Living Currents

Six individual worlds, one shared existence. **The First Orbit** combines the original planetary
archetypes with a circular water economy, persistent relationships, and time to think.

## Play locally

```sh
npm install
npm run world
```

Open Vite's local address. Choose a world to listen for free, then make one decision or **Let it
flow**. Nothing advances while you think. Each world has a distinct three-moment ability; most
panels show that ability and one suggested invitation. Other choices remain available on request.

- **Obsidian Dusk** protects neighbours and keeps cautious reserves.
- **Verdance** renews water in wetlands with finite processing capacity.
- **Ember Glass** can intensify its forge, at the cost of greater thirst.
- **Still Sanctum** holds reserves and can open them to the whole basin.
- **Prism Reach** carries wider currents and offers temporary bypasses.
- **The Unobserved** changes with the weather and keeps one close connection.

Every world recovers some water independently. Alliances share spare water and processing capacity,
subject to ports and each world's willingness. A disagreement is announced before it happens;
restraint, connection, protection, intervention and accepting the consequence are possible paths.
A season can succeed without an alliance. Cooperation offers resilience without a moral score.

The eighteen-moment season repeats with your relationships intact. Shortages can recover. A shared
dawn marks a stable recovery after the first season. Progress saves locally; undo is available;
sound is opt-in. Exact accounting is behind **Look beneath the surface**. Earlier three-world
save data is kept separately. Nothing is published by running or building the game.

See [the rules, verified paths and limitations](docs/FIRST-ORBIT.md). This is a playable synthesis,
not evidence of human enjoyment or a finished campaign.

## Original experiment

The guide links to `challenge.html`: the original six-world, six-round 3D Dark Forest game and
learning worlds. Its engine and historical golden results are unchanged. The original 2D game
still builds with `npm run web`; a release serves it at `/play/`. `SPEC.md` describes that earlier
game. The three-world economy remains in `src/circulation.ts` with its tests and historical notes.

## Build and verify

```sh
npm test                 # 106 tests, including original regressions
npm run world-build      # both 3D entry pages → dist3d/
npm run release          # both games + fonts + per-file receipt + deterministic zip
```

The current local release is `site-2026-11-16-orbit`. See [deployment notes](deploy/DEPLOY.md).
No release has been pushed or deployed in this iteration.

## Code and expansion

| Path | Purpose |
|---|---|
| `src/arenas.ts` | Versioned arena definitions, roster, distinct archetypes and future arena registry |
| `src/constellation.ts` | Player-paced economy, abilities, invitations, disputes, recovery and replay |
| `web3d/garden.ts`, `garden.css` | Contextual decisions, qualitative forecasts, local saves, undo and sound |
| `web3d/world.ts`, `themes.ts`, `layout.ts` | Shared planet renderer, original six designs, scalable rings and multi-system geometry |
| `test/constellation.test.ts` | Water conservation, agency, alternative successful paths, recovery and arena sizing |
| `web3d/challenge.html`, `main.ts`, `src/engine.ts` | Preserved original game |
| `src/circulation.ts`, `test/circulation.test.ts` | Preceding three-world prototype and regressions |
| `docs/EXPANSION.md` | What supports additional worlds/arenas, and what remains unbuilt |
| `test/golden/`, `RESULTS*.md`, `out/` | Earlier research records, not results for the new game |

The original simulation commands (`sweeps`, `report`, `g1a`, `g1b`, `replay`) still refer to the
Dark Forest experiment. Additional arenas use the new definition/engine contract; there is only
one playable arena today. Multi-system travel and cross-arena economics remain future design work.
