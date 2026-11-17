# Archive

`before-unification/` is the tree as it stood on 16 November 2026, before the three
implementations were replaced by one game. Nothing here is built, linked or deployed.

| What | Where | Notes |
|---|---|---|
| The original Dark Microcosmos (six rounds, station, hidden policies, LISTEN / SIGNAL / STRIKE / HIDE), its 2D page and 3D page | `src/engine.ts` and friends, `web/`, `web3d/main.ts`, `web3d/challenge.html` | Research record: `RESULTS*.md`, `SPEC.md`, `test/golden/`, `out/` |
| Living Currents (three worlds) | `src/circulation.ts` | `docs/LIVING-CURRENTS.md` |
| The First Orbit (six worlds, repeating seasons) | `src/constellation.ts`, `src/arenas.ts`, `web3d/garden.ts` | `docs/FIRST-ORBIT.md` |

Its 106 tests still pass: `npm run test:archive`. The design history that led here is in
`docs/design-history/`. What was carried forward and what was left behind, and why, is in
`docs/MICROCOSMOS.md`.
