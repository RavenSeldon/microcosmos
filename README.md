# The Dark Microcosmos

Six worlds, one basin, one passage through the dark. One game.

Each world uses water every moment and can renew only part of what it uses. For eighteen moments
(an open sky, the dark, the rain's return) you make one choice at a time, or let it flow. Bring
every world through awake, with what they used made clean again.

## Play

```sh
npm install
npm run play        # open the address Vite prints
```

Choose a world to hear it out (free). Drag between planets to preview a current, then commit it;
or use **Shape a current** and the world names. Previewing and cancelling cost nothing.
Forecasts show how the next three moments differ from waiting. **Let it flow** passes one moment; **Let the currents work** passes quiet moments
and stops before something needs you. Every moment can be undone. The journey saves on the device. Sound is optional and off initially; there is no timing test.
On narrow screens, the worlds stay above a separately scrolling panel. The basin welcomes new
players; written guidance is optional and separate from music. A new voice pauses auto-flow so
you can read it, listen to its world, or simply make your next choice.

## Read

| File | What it holds |
|---|---|
| `docs/MICROCOSMOS.md` | The rules as implemented, what was unified and left behind, the evidence, and what is not established |
| `docs/GUIDE.md` | A classroom guide to the game as it is played now |
| `PROJECT-LOG.md` | What is done (with evidence), what remains, decisions of record, where to resume |
| `docs/EXPANSION.md` | What supports more worlds and arenas, and what is not built |
| `docs/design-history/` | The design documents that led here |
| `archive/README.md` | The three earlier implementations, kept and not built |

## Verify

```sh
npm test               # 22 tests: economy, endings, strategies, witnesses, saves, feedback, voices
npm run strategies     # plays the arena many ways and prints what happened (several minutes)
npm run witnesses      # re-finds a situation where each kind of choice is strictly best
npm run test:archive   # the archived implementations' 106 tests
npm run build          # the page → dist/
npm run release        # dist/ + per-file receipt + deterministic zip → dist-release/
```

## Code

| Path | Purpose |
|---|---|
| `src/arenas.ts` | The arena as data: worlds, sky, water. One arena today |
| `src/microcosmos.ts` | The rules. Deterministic; the forecast uses the same function that resolves a moment |
| `src/whispers.ts` | The guidance, spoken by the worlds: one true line at a time, each once |
| `src/telling.ts` | Every sentence about what happened, what would happen, and how it ended. No DOM |
| `web3d/game.ts`, `game.css`, `index.html` | The page: input, instruments, saving, undo, sound |
| `web3d/feedback.ts`, `sound.ts` | Recorded exchanges become a short visual beat and six optional musical voices |
| `web3d/world.ts`, `themes.ts`, `layout.ts`, `scene.ts` | The renderer and the six planet designs |
| `scripts/strategies.ts`, `scripts/witnesses.ts` | Evidence for the design claims; write `test/journeys.json` and `test/witnesses.json` |
| `test/` | What the rules guarantee |
| `deploy/` | Hosting at benamuwo.me/microcosmos. Nothing is deployed |

## Working Here Together

Several agents and Ben work in this folder. Before changing anything: read `PROJECT-LOG.md`, run
`npm test`, and do not commit or push (Ben does). If you change a rule or a number, re-run
`npm run strategies -- 250 --write` and `npm run witnesses`, then `npm test`, and record what
changed in `PROJECT-LOG.md`. Passing tests do not show the game is fun.
