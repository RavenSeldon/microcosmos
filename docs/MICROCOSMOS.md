# The Dark Microcosmos: Rules, Evidence, Limits

16 November 2026. One game. This replaces the three earlier implementations, which are kept in
`archive/before-unification/` and are no longer built or linked.

Basis: Ben's brief (*"Make a small decision, see a meaningful response, discover a new
possibility"*), the review of the First Orbit build, the reply that set the order of work, and
Ben's instruction: *"I don't want to build game modes on top of the existing game … we should
focus on integrating the things that work into one unified game that is the base Dark
Microcosmos, then leave behind the things that don't work fully and intentionally."*

## The Game in One Paragraph

Six worlds share one basin for eighteen moments: six under an open sky (the gathering), six with
no rain (the dark), six as rain comes back (the return). Every world uses water each moment and
can renew only part of what it uses; the rest waits in its holding. Each moment the player makes
one choice or lets it flow. The aim is a **shared dawn**: every world awake at the end, no thirst
in the last three moments, and no holding near its limit.

## The Loop

Notice a changing condition → understand it (listening is free; every choice shows what it would
change over the next three moments) → make one adjustment → watch the worlds answer → let the
currents work until something else needs you.

## Rules (as implemented in `src/microcosmos.ts`; numbers in `src/arenas.ts`)

**Water.** Clean water sits in the basin and in each world's store. Used water sits in each
world's holding. Water enters only as rain and mist. It leaves only as the basin community's own
use (1 a moment), spills, and what a shelter or a seizure costs. The books balance every moment.

**A moment, in order.** The player's choice · rain and mist · tending · an announced seizure ·
the basin feeds each waking world up to what it likes to keep · neighbours share spare water ·
dormant worlds with water wake · each world uses what it needs · each world renews what it can,
then spare renewal serves neighbours along currents (several hops, limited per current) · a world
about to spill may rest the excess in a neighbouring cistern · full holdings spill · conditions
update · a thirsty world may announce a seizure · the ending is checked.

**Conditions.** *Steady*; *strained* (holding within two of full, or thirsty last moment);
*dormant* (thirsty two moments running: it stops using, renewing and sharing, and wakes when it
holds a moment's need). Returning rain reaches dormant worlds; in the dark only tending, a
neighbour or a gift does.

**The six worlds.**

| World | Renews (open sky / dark) | Its own character | Ability (three moments) |
|---|---|---|---|
| Obsidian Dusk | 1 / 1, uses 2 | Keeps a deep reserve; opens a current only while it holds one, or to a world it has exchanged with; gives nothing to a stranger | Shelter: nothing can be taken from it or its neighbours, and its neighbours use one less. Costs it one water |
| Verdance | 5 / 1, uses 2 | The open-sky renewer; slows to a trickle in the dark; declines new currents while its holding is over half full | Bloom: renews twice what the sky allows; uses one more |
| Ember Glass | 1 / 4, uses 2 (3 in the dark) | The dark's renewer; keeps no reserve from a neighbour | Stoke: renews twice what the sky allows; uses one more |
| Still Sanctum | 1 / 1, uses 1 | Large stores and deep cisterns; shares only above a reserve; what thirsty strangers reach for | Open the stores: up to three water a moment to the basin |
| Prism Reach | 1 / 1, uses 2 | Wide currents (five a moment where others carry three) | Bypass: a temporary current to a world the player chooses, beyond port limits |
| The Unobserved | 1 / 3, uses 2 | One port; gathers mist for the basin under open skies, connected or not | Change its rhythm: live as under the other sky |

Abilities double what the sky allows, so each is strong in its season and weak out of it.

**The player's choices.** Let it flow · open a current · rest a current · ask the basin to tend a
world (up to three clean water in, up to two used water out to the basin's reed beds) · a world's
ability · during a dispute, ask the comfortable world to give freely.

**Disputes.** They are not scheduled. A world that went thirsty, cannot cover its next need, and
has no current to a comfortable world announces it will take two water from that world next
moment (one is lost in the taking, and the two will not open a current again that journey). It
does not happen if, by then, they share a current, the thirsty world can cover its need, or a
shelter covers the other. Obsidian refuses to give to a stranger; Sanctum gives while it has two
to spare.

**Discovery.** How a world behaves under each sky is written under that world only after the
player has seen it happen, and stays known in later journeys. Warnings are never hidden: the
forecast, costs and announced seizures are always shown.

**Endings.** *The long night*: worlds spent six moments dormant between them (a moment the basin
community goes without counts too). The count is shown from the first dormant moment. *A shared
dawn*: as above. *A fragile peace*: the journey completed with something unresolved, which the
ending names. The ending lists what turned the journey and which currents endured, and offers to
go back to before the first dormancy.

## What Was Unified, and What Was Left Behind

Kept, from the original Dark Microcosmos: the six planet designs and renderer, the Seventh Basin
as the shared stake, announced conditional threats, a protective action (the shelter), the
honesty rule that a forecast may only say what the rules will do, the three ending names, and
learning a world by watching it. From Living Currents and the First Orbit: persistent currents,
circulating water, free listening, no clock, arena-as-data, ports, signature abilities, journal
saves and undo.

Left behind on purpose: the station, exposure and integrity; hidden policy families and the
omniscient reveal; LISTEN as a spent action; HIDE; **STRIKE / interrupt** (in every version it
was dominated by a gentler answer; G1b, G1d and the First Orbit review all found this);
repeating seasons; the scheduled Obsidian–Ember grievance; the separate 2D page, the challenge
page and the three-world garden as public entries.

## Evidence (`npm test`, 22 tests; `npm run strategies`)

| Claim | Evidence |
|---|---|
| Water is conserved and bounded | 250 random journeys, every moment checked |
| Neglect loses, late and with warning | Doing nothing: first forecast warning before the first thirst at moment 7, first dormancy at 9, long night at 12 |
| No arrangement of currents wins by itself | All 573 port-feasible sets of up to five currents, opened and then left alone: 0 reach dawn; 5-current sets all reach a fragile peace |
| Several distinct ways to dawn | Recorded journeys reach dawn with: anything (8 choices), at most two currents (8), one current (11), no tending (5), no abilities (9), and with no current ever touching each world in turn (7 to 12). Each has at least six quiet moments |
| No world is indispensable | The six "without" journeys above |
| Not every way works | With no lasting current at all the best found is a fragile peace |
| Every choice matters somewhere reachable | For each of the 11 kinds of choice, a situation reached by play where that kind is strictly best with the same player finishing the journey (`test/witnesses.json`, re-verified by the test) |
| Disputes have no universal answer | 1,346 disputes reached by careless play; strictly best answer: tend 401, open the stores 265, mediate 153, let it happen 130, shelter 122, open a current 45 |
| Quiet success exists | A short-sighted attentive player reaches dawn with 7 choices and 11 rests |
| Forecasts are true | Pressure forecasts compare listed outcomes with resting; they do not claim every water movement is unchanged |
| Random play does not win | 1,000 random journeys resting half the time: 1% dawn, 72% fragile peace, 28% long night |

"Best found" lines come from a beam search and a greedy player, not exhaustive search: they show
that a line exists, not that none is better.

## Checked in a Browser

Headless Chrome, 1440 × 900 and 390 × 844, built page: opened a current from the panel, passed a
moment with Space, ran "Let the currents work" (it passed moments 3 to 6 and stopped before the
dark), undo, reload (journey kept), begin again and undo it, the water ledger, a dispute, a long
night ending with "go back", a dawn ending, reduced motion. No console errors, no horizontal
overflow. On the phone layout the worlds stay fixed above the controls.

## Not Established

- Whether it is fun, absorbing or the right difficulty. No person has played it.
- A real phone, touch feel, frame rate, screen readers. The dialogs use the native `<dialog>`;
  focus order inside the panel has not been audited.
- Replay value. There is one arena and it is deterministic: a player who finds a five-choice
  dawn can repeat it. Variation between journeys (other skies, other arenas) is not built.
- Balance beyond this arena. The 3-, 8- and 16-world fixtures test sizing and conservation only.
- Not built yet: worlds making offers of their own, journey variation, or animation of every
  internal economy step. The renderer still carries unused code for the old four-beat staging.
- The tending action is a general fallback and a greedy player leans on it. It may need a
  narrower role after playtesting.

## 0.7.1 — Gesture and response

The rules, arena balance, save format and eighteen-moment journey are unchanged. This pass takes
responsiveness and distinct voices from the inspirations, without adding a timing test or score.

- Drag between planets, or choose **Shape a current** and a destination by name. A dashed preview
  shows the route; its consequences and any blocked-port reason appear before committing. Choose
  an existing lasting current to rest it. Escape/cancel is free. Prism's bypass uses the same
  destination preview, including on a phone. Empty-space dragging still orbits the camera.
- Each moment has a short visual beat: action accent, recorded transfers in their original order,
  then wake/dormancy/spill accents. This is a presentation of the resolved record, not a second
  simulation or an animation of every internal rule. Every transfer appears exactly once.
- Optional procedural sound gives the six designs distinct registers, envelopes and overtones,
  with discovery and ending phrases. Off initially. No information requires hearing it.
- The latest moment keeps a short account, prioritising danger; **Read this moment** gives the full
  account and discoveries. Other possibilities and field notes are folded until wanted.
- Auto-flow stops on inspection, dialogs, route previews and leaving the tab. Closing a dialog
  allows deliberate resumption; it does not restart automatically. Undo cancels pending feedback.
- On narrow screens, the worlds stay fixed above independently scrolling controls. The water
  ledger remains available, and water pips have numeric accessible names. Reduced motion skips
  moving transfer effects.

These are implemented affordances. Whether they create a satisfying rhythm needs human play.

## 0.7.2 — The voices join the rhythm

Built on Claude's introduction, sixteen state-driven voices and revised classroom guide. The
attached six-round guide remains historical material; its Station, exposure, strike and hidden
families are not restored to the live game. The economy and arena remain unchanged.

- The introduction is a native dialog. Space cannot advance a hidden journey, and keyboard focus
  stays within the welcome. The notes can reopen it without resetting a journey. There is no
  timed text reveal or forced waiting before beginning.
- Written guidance and music are named separately. They are preferences for one game, with the
  same rules and possibilities. Warnings and forecasts remain available without guidance.
- Water moves first; one world speaks afterwards. Auto-flow pauses for new guidance. Its words
  use the existing moment area, and its name is marked on the orbit, keeping planets uncovered.
  **Listen** and **Heard** are free; choosing the next action also moves on.
- **Read this moment** retains the complete factual account when guidance occupies that space.
  Forecast wording describes the pressure forecast, not every inventory change. Dawn no longer
  implies that every last unit of used water has already been cleaned.
- The classroom guide includes shared play: predict, choose, observe, and try a different answer
  with undo. It distinguishes game rules from claims about real people.

Browser checks on this pass: first-time welcome (Space/Escape do not pass a moment); a complete
no-tending journey to dawn; auto-flow stopping at moment 9 for Ember's new guidance; restart,
undo and reload preserving the completed journey; changing guidance without changing the
journey; phone welcome and current preview at 390 × 844. Earlier in this same pass: direct
planet-to-planet dragging, current release and undo, Prism's target preview, port-limit reasons,
sound controls, and keyboard-opened notes stopping auto-flow. No browser console errors observed.
Sound output was not assessed by a human listener. Real touch hardware and screen readers remain
unverified, as does enjoyment or suitability across ages.
