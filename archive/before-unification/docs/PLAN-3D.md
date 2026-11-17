# The Dark Microcosmos — Plan for the 3D World

Draft of 15 November 2026 · a proposal, nothing here is decided

## What Exists

- A deterministic engine (`src/`), 67 tests, six result documents.
- A playable 2D page (`web/`) on the current rules: conditional threats, refined STRIKE, one
  retaliation per strike, three endings.
- No person has played it yet.

## The Reference

maitrism.com describes itself as a navigable cosmos: 104 characters as stars across thirteen star
systems, laid out along strange attractors, joined by lines whose style says what kind of claim each
is. Its background colour is #05060B, the same void this project already uses. I could read its
description but not see it render, so the plan takes the idea and not the look: **position means
something, lines are typed, and you travel through it.**

## Principle

The engine does not change. The 3D world is a second renderer over the same game, beside the 2D one.

```
src/ engine  ->  web/view.ts  ->  web/scene.ts  ->  web3d/ (three.js)     the world
   (rules)       (sentences)      (what to draw)     web/   (HTML)        the fallback and the controls
```

`scene.ts` is the new piece: a plain description of what should be on screen, built only from what
the player may see. Both renderers read it. Because it is plain data, it can be tested without a
browser: two worlds with the same public history and different hidden policies must produce the
same scene. That is the leak test for the visuals.

## The Space

Three depths, as in the first design document: cosmos, communication, consequence.

| Layer | What it is | What it encodes |
|---|---|---|
| Far field | A few thousand points, drawn once | Nothing. Atmosphere only, and it must stay that way. |
| The six systems | Each district is a small cloud of points on an attractor curve | Draw (brightness and turn rate), distress, agreement. The shape is a shared motif, seeded apart from policy. |
| Filaments | Curves between systems, with light moving along them | Typed, as on maitrism.com: dashed for a threat, solid for a strike, dotted for an offer, a thin sweep for listening. |
| The station | A point at the centre with a halo | Exposure is the halo's size; integrity is its segments. |
| The basin | A contour disc below the ring | Last round's flow as a level against a marked minimum. |

Travel: a constrained orbit, and a tap on a system flies the camera to it. Close up, the system
fills the view and shows what you know about it. That gives the nested-worlds idea without six
separate interiors.

## Keeping the Game Clear

- **Controls stay HTML.** The status strip, the four actions and the record of what happened sit over
  the canvas, reusing the 2D components. On a phone they become a bottom sheet.
- **A round plays out in the order it resolved:** your action, the network, the river, attacks on
  you, the basin. About two seconds, skippable, and absent under reduced motion.
- **Every animation is an event.** Nothing moves that the engine did not record.
- **Meaning never rests on colour alone.** Line style and shape carry it, as in the 2D page.
- **The 2D page remains** as the fallback for no WebGL, reduced motion and screen readers.

## Weight

- three.js, tree-shaken, with no textures and no models: points, lines and two small shaders.
- Target under 400 KB compressed for the whole page. The 2D page is 51 KB uncompressed today.
- One draw call per layer where possible. Pixel ratio capped at 2. Rendering pauses when nothing
  is moving.
- Targets to confirm on devices you name: 60 frames a second on a laptop, 30 on a mid-range phone.

## Steps

| Step | Builds | Done when |
|---|---|---|
| V0 | `scene.ts` and its tests; Vite and three.js set up; a static ring of six systems | The scene leak test passes; the ring renders on phone and desktop |
| V1 | Selecting, the four actions, a full game playable in 3D | A fixed game ends the same way in 2D and 3D |
| V2 | Round choreography: filaments, strike fracture, threat pulse | Each animation maps to one recorded event; skip and reduced motion work |
| V3 | Fly-to-system close view; endings as states of the world; the reveal | The three endings look different without reading text |
| V4 | Performance, accessibility, fallback, static build for hosting | Measured on the named devices; existing sites untouched |

## Status

**V0 built, 15 November 2026.** `web/scene.ts` with five tests, three of them leak tests. `web3d/`
renders the ring, six planet-ships, typed links, the station, the axis, and the basin with contour
ground and the cosmogram.

**Planet-ships (Ben, 15 Nov 2026)** replace the first attractor clouds. Six designs in
`web3d/themes.ts`: Obsidian Dusk (darkness, gilt contours), Verdance (jungle, bioluminescent),
Ember Glass (fiery sky, rain on glass, lava), Still Sanctum, Prism Reach, The Unobserved. All share
an equatorial trench and a dish; each has its own superstructure. One shader serves all six. Which
district gets which design comes from the world number, and a test checks it does not track policy.
How hard a ship draws shows as one, two or three cyan threads down to the basin. Checked in headless Chrome at 1280 x 800 and 390 x 780 with software
rendering; not yet seen on a real phone or measured for frame rate. Script 138 KB compressed, plus
the cosmogram (39 KB compressed).

Reference images are in `docs/references/`. The spatial technique follows `~/Root/rushi` (attractors
by Runge-Kutta, additive points, one draw per system), read with Ben's permission and not modified;
no code was copied.

**P0–P3 built, 15 November 2026** (from the forwarded review *Gameplay Review · Interaction Design ·
#PLAY FIRST*, which recommends greenlighting P0–P3 and deferring P4). The 3D world is now the game;
this covers V1 and the event-driven part of V2.

| Step | Built | Checked by |
|---|---|---|
| P0 playable planets | Click a planet, a ship button or A–F; arm Listen / Signal / Strike / Hide (L S K H); commit with Enter; Esc cancels; one full six-round game | Headless Chrome under the release CSP, desktop and phone; same engine path as the 2D page (`web/game.ts` replays actions through `src/engine.ts`) |
| P1 forecast | Basin bar with the move's possible gain hatched; exposure pips with the change hatched; Will / If / Unknown lines; threat card; dashed preview line to the target | `test/forecast.test.ts`: identical forecast across hidden families (200 worlds × 3 × 19 actions); every "Will" line comes true over 2,000 random games |
| P2 four beats | Your move → responses → water → consequences, 750 ms each, Space or Skip ends it, reduced motion applies at once; the HUD changes only when the consequences land | Beats built from the public round only (`web/beats.ts`), order tested |
| P3 learning worlds | The River (signal and relays), Two Lights (listening), The Threat (credible threat, protective strike); then seeded free play | `test/scenarios.test.ts`: the solver confirms each teaches what its text claims; lessons may not speak about the player's own moves |

The ending names the counterfactual for what it is: *"With full knowledge, which you did not have."*
Not done: a real phone, frame rate, focus trapping inside the two dialogs, and any human playtest.
Labels can sit behind the story panel on a phone. P4 (doctrines, contracts, a daily world, ghost
replay, two actions per round) is deferred, as the review recommends.

Expansion to more planets or several systems is scaffolded, not built: see `docs/EXPANSION.md`.

## Alongside, Not After

Put the 2D page in front of a few people now. The 3D world will not fix a loop that is dull or
unclear, and it is cheaper to learn that from the page that already exists.

## Decisions for Ben

Answered: the reference images (supplied), `~/Root/rushi` (read only, permitted), hosting
(benamuwo.me/microcosmos).

Open:
1. Does this world carry the Maitrism seal and palette, or its own identity?
2. Which devices count as the test laptop and the test phone?
3. P4, after playtesting: which of doctrines, contracts, a daily world, a one-decision replay, two
   actions per round.
4. For expansion: every question listed under "Several Systems" in `docs/EXPANSION.md`.
