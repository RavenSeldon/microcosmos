// The Dark Microcosmos: the page. It routes input, draws the instruments and asks the rules what
// would happen. Every rule is in ../src/microcosmos.ts; every sentence about what happened or would
// happen is in ../src/telling.ts. A journey is { known at its start, the choices made }; everything
// on screen is recomputed from that, which is also how saving and undo work.
import './game.css';
import { ARENAS, FIRST_ARENA, arenaById } from '../src/arenas.ts';
import type { ArenaDef } from '../src/arenas.ts';
import { newGame, replay, advance, pairs, edgeOf, unavailable, validChoice, needAt, renewAt, activeAt, isLinked, conditionOf, strainLine, skyAt, outlook, totalWater, careOf } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
import { tell, foresee, ending, recount, skyNote, linkedTo, medalsOf, SKY_NAME, RESONANCE_GOAL } from '../src/telling.ts';
import type { MedalId } from '../src/telling.ts';
import { createWorld } from './world.ts';
import { lookOf } from './looks.ts';
import type { Scene } from './scene.ts';
import { scoreMoment, momentTitle } from './feedback.ts';
import { createSoundscape } from './sound.ts';
import { whisper } from '../src/whispers.ts';
import type { Whisper } from '../src/whispers.ts';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ARENA_KEY = 'microcosmos.arena.v1', KNOWN = 'microcosmos.known.v1', MEDALS_KEY = 'microcosmos.medals.v1', VOICES = 'microcosmos.voices.v1';

let arena: ArenaDef = FIRST_ARENA;
try { const savedId = localStorage.getItem(ARENA_KEY); if (savedId) arena = arenaById(savedId); } catch { /* default arena */ }
let W = arena.worlds, P = pairs(arena);
const journeyKey = () => `microcosmos.journey.${arena.id}.v${arena.version}`;
const music = createSoundscape(arena);
let sounding = false, routeFrom = -1, routeTo = -1, routeKind: 'current' | 'bypass' = 'current';
let resolutionTimer = 0, pendingEnd = false;
interface Saved { v: 1; known: string[]; actions: Choice[] }

let voices = true, heard = new Set<string>(), held: { key: string; w: Whisper } | null = null, introPending = false;
function loadVoices() { try { const d = JSON.parse(localStorage.getItem(VOICES) ?? 'null') as { on?: unknown; heard?: unknown } | null; if (!d) { introPending = true; return; } voices = d.on !== false; heard = new Set(Array.isArray(d.heard) ? d.heard.filter((x): x is string => typeof x === 'string') : []); } catch { introPending = true; } }
function saveVoices() { try { localStorage.setItem(VOICES, JSON.stringify({ on: voices, heard: [...heard] })); } catch { /* play continues without it */ } }

let earnedByArena: Record<string, MedalId[]> = {};
function loadEarnedMedals() {
  try {
    const raw = JSON.parse(localStorage.getItem(MEDALS_KEY) ?? '{}') as Record<string, unknown>;
    earnedByArena = {};
    for (const [k, v] of Object.entries(raw)) if (Array.isArray(v)) earnedByArena[k] = v.filter((x): x is MedalId => typeof x === 'string');
  } catch { earnedByArena = {}; }
}
function recordEarnedMedals() {
  if (game.outcome !== 'dawn') return;
  const newly = medalsOf(actions, arena).filter(m => m.status === 'earned').map(m => m.id);
  const merged = [...new Set([...(earnedByArena[arena.id] ?? []), ...newly])];
  earnedByArena[arena.id] = merged;
  try { localStorage.setItem(MEDALS_KEY, JSON.stringify(earnedByArena)); } catch { /* ignore */ }
}
const totalEarnedMedals = () => ARENAS.reduce((sum, a) => sum + (earnedByArena[a.id]?.length ?? 0), 0);

// ---- state ---------------------------------------------------------------------------------------
let known0: string[] = [], actions: Choice[] = [], game: Game = newGame(arena), selected = -1;
let busy = false, timer = 0, working = false, saving = true, notice = '', undone: Saved | null = null, fresh: string[] = [];
function load() {
  let raw = '';
  W = arena.worlds; P = pairs(arena);
  try {
    const everKnown: unknown = JSON.parse(localStorage.getItem(KNOWN) ?? '[]');
    const valid = new Set(W.flatMap(w => w.traits.map(t => t.id)));
    known0 = Array.isArray(everKnown) ? everKnown.filter((x): x is string => typeof x === 'string' && valid.has(x)) : [];
    raw = localStorage.getItem(journeyKey()) ?? '';
    if (raw) {
      const d = JSON.parse(raw) as Saved;
      if (d?.v !== 1 || !Array.isArray(d.actions) || d.actions.length > arena.length || !d.actions.every(c => validChoice(c, arena)) || !Array.isArray(d.known)) throw new Error('unreadable');
      const k = d.known.filter(x => valid.has(x));
      game = replay(d.actions, arena, k); actions = d.actions; known0 = k;
    } else {
      actions = []; game = newGame(arena, known0);
    }
  } catch {
    if (raw) { try { localStorage.setItem(`${journeyKey()}.unreadable.${Date.now()}`, raw); } catch { /* keep going */ } notice = 'A saved journey could not be read. It has been set aside, and a new one is ready.'; game = newGame(arena, known0); actions = []; }
    else { saving = false; notice = 'This device will not keep the journey. You can still play while this tab stays open.'; }
  }
  if (!actions.length) game = newGame(arena, known0);
}
function save() {
  try { localStorage.setItem(ARENA_KEY, arena.id); localStorage.setItem(journeyKey(), JSON.stringify({ v: 1, known: known0, actions } satisfies Saved)); localStorage.setItem(KNOWN, JSON.stringify([...new Set([...known0, ...game.known])])); saving = true; }
  catch { saving = false; }
}
loadEarnedMedals(); load(); loadVoices(); if (actions.length) introPending = false;

// ---- the world on screen --------------------------------------------------------------------------
const cond = (d: number) => game.last?.unmet[d] && !game.dormant[d] ? 'thirsty' : conditionOf(game, d, arena);
function scene(): Scene {
  const ahead = game.outcome ? null : outlook(game, { type: 'rest' }, 2, arena);
  return { circulation: true, world: 0, round: game.beat, rounds: arena.length,
    station: { exposure: 0, exposureMax: 4, targetable: false, integrity: 0, integrityMax: 3 },
    basin: { flow: game.basin, minimum: arena.basin.reserve + arena.basin.need, short: game.basin <= arena.basin.reserve, counted: true },
    systems: W.map((w, d) => ({ id: d, letter: w.short, band: game.dormant[d] ? 0 : activeAt(game, d) ? 2 : 1, bandTrail: [],
      distress: !game.dormant[d] && (cond(d) !== 'steady' || !!ahead?.short.includes(d)), inAgreement: linkedTo(game, d, arena).length > 0,
      threatened: game.threat?.to === d, threatening: game.threat?.from === d, selected: d === selected, heard: null, theme: w.theme })),
    links: [...P.flatMap(([from, to], e) => isLinked(game, e) ? [{ kind: 'current' as const, from, to }] : []), ...(game.threat ? [{ kind: 'threat' as const, from: game.threat.from, to: game.threat.to }] : [])] };
}
let world: ReturnType<typeof createWorld> | null = null;
try { world = createWorld($('stage'), reduced, { pick(d) { choose(d); }, connect(from, to) { if (!busy && !game.outcome) { stopWork(); routeKind = 'current'; routeFrom = from; previewRoute(to); } } }, W.length); }
catch { $('stage').innerHTML = '<div class="fallback"><p>This browser cannot draw the worlds.<br>Everything can still be done from the list of worlds below.</p></div>'; }

// ---- acting ---------------------------------------------------------------------------------------
const dialog = $('dialog') as HTMLDialogElement;
const intro = $('intro') as HTMLDialogElement;
intro.addEventListener('cancel', e => e.preventDefault());
function openIntro() {
  stopWork(); cancelRoute(); introPending = true; held = null;
  intro.hidden = false; document.body.classList.add('intro-open'); renderWhisper();
  if (!intro.open) intro.showModal(); $('intro-title').focus({ preventScroll: true });
}
let dialogFocus: HTMLElement | null = null;
function openDialog(html: string, cls = '') {
  stopWork();
  dialogFocus = document.activeElement as HTMLElement; $('dialog-content').innerHTML = html; dialog.className = cls;
  const h = $('dialog-content').querySelector('h2')!; h.id = 'dialog-title'; h.tabIndex = -1; dialog.setAttribute('aria-labelledby', h.id);
  if (!dialog.open) dialog.showModal(); h.focus({ preventScroll: true }); dialog.scrollTop = 0;
}
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (introPending) { $('intro-title').focus({ preventScroll: true }); return; } renderControls(); if (dialogFocus?.isConnected) dialogFocus.focus(); else focusPanel(); if (pendingEnd) { pendingEnd = false; showEnding(); } });
function choose(d: number) {
  if (introPending) return;
  stopWork();
  if (routeFrom >= 0) { if (d >= 0 && d !== routeFrom) previewRoute(d); return; }
  selected = d < 0 ? -1 : (selected === d ? -1 : d);
  world?.select(selected); music.select(selected); renderPanel(); renderChips(); renderLabels(); renderWhisper(); if (selected >= 0) focusPanel();
}
function routeChoice(): Choice | null {
  if (routeFrom < 0 || routeTo < 0 || routeFrom === routeTo) return null;
  const edge = edgeOf(routeFrom, routeTo, arena);
  return routeKind === 'bypass' ? { type: 'ability', world: routeFrom, target: routeTo }
    : { type: game.links[edge] ? 'release' : 'connect', edge };
}
function startRoute(d: number, kind: 'current' | 'bypass' = 'current') {
  if (busy || game.outcome || introPending) return;
  stopWork(); routeFrom = d; routeTo = -1; routeKind = kind; selected = d;
  world?.select(d); world?.composing(d); world?.route(d); renderRoute(); renderChips();
  $('route-title').focus({ preventScroll: true });
}
function cancelRoute() {
  routeFrom = routeTo = -1; world?.composing(-1); world?.route(-1);
  $('route-preview').hidden = true; $('panel').inert = false; document.body.classList.remove('routing'); renderControls();
}
function previewRoute(to: number) {
  if (busy || game.outcome || routeFrom < 0 || to === routeFrom) return;
  routeTo = to; world?.composing(routeFrom);
  const choice = routeChoice()!; world?.route(routeFrom, to, !!unavailable(game, choice, arena)); renderRoute();
  $('route-title').focus({ preventScroll: true });
}
function renderRoute() {
  const box = $('route-preview'); box.hidden = routeFrom < 0;
  document.body.classList.toggle('routing', routeFrom >= 0);
  $('panel').inert = routeFrom >= 0;
  if (routeFrom < 0) return;
  const c = routeChoice(), why = c ? unavailable(game, c, arena) : null;
  const title = c ? `${W[routeFrom].short} ↔ ${W[routeTo].short}` : `From ${W[routeFrom].short}…`;
  box.innerHTML = `<div class="route-top"><span class="eyebrow">${routeKind === 'bypass' ? 'Temporary bypass' : c?.type === 'release' ? 'Close current' : 'Link current'}</span><button type="button" class="text" id="cancel-route">Cancel <kbd>Esc</kbd></button></div><h2 id="route-title" tabindex="-1">${esc(title)}</h2>
    <p>${esc(why ?? (c ? c.type === 'release' ? 'Their ports become free. Their exchange history remains.' : routeKind === 'bypass' ? 'A three-moment route beyond port limits.' : 'A lasting route for spare water and shared renewal.' : 'Choose another planet or its name below. Choose a connected neighbour to close that current.'))}</p>
    ${c && !why ? `<p class="route-forecast">${esc(foresee(game, c, arena).text)}</p><button type="button" id="commit-route" class="primary">${c.type === 'release' ? 'Close this current' : routeKind === 'bypass' ? 'Open this bypass' : 'Open this current'} <span aria-hidden="true">↗</span></button>` : ''}`;
  renderControls();
}

function focusPanel() { const h = $('companion').querySelector('h1') as HTMLElement | null; if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); h.scrollIntoView({ block: 'nearest' }); } }
function act(c: Choice, auto = false) {
  if (busy || game.outcome || introPending) return;
  const why = unavailable(game, c, arena);
  if (why) { stopWork(); openDialog(`<h2>Not yet.</h2><p class="strong">${esc(why)}</p>`); return; }
  if (!auto) stopWork();
  cancelRoute();
  undone = null; game = advance(game, c, arena); actions.push(c); fresh = game.last!.learned;
  if (game.outcome) recordEarnedMedals();
  save();
  const score = scoreMoment(game.last!);
  busy = true; render(); world?.perform(score); music.moment(game.last!, game);
  focusPanel();
  document.body.classList.toggle('resolving', !reduced);
  $('response-cue').textContent = momentTitle(game.last!);
  $('response-cue').hidden = false;
  clearTimeout(resolutionTimer); resolutionTimer = window.setTimeout(() => { $('response-cue').hidden = true; }, reduced ? 900 : score.duration + 300);
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    busy = false; document.body.classList.remove('resolving');
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => b.disabled = !!unavailable(game, JSON.parse(b.dataset.choice!), arena));
    document.querySelectorAll<HTMLButtonElement>('[data-draw]').forEach(b => b.disabled = !!game.outcome);
    document.querySelectorAll<HTMLButtonElement>('[data-bypass]').forEach(b => { const d = Number(b.dataset.bypass); b.disabled = !!game.outcome || activeAt(game, d) || game.dormant[d]; });
    renderWhisper(); renderControls();
    if (game.outcome) { stopWork(); if (dialog.open || introPending || document.hidden) pendingEnd = true; else showEnding(); }
    else if (working) { if (held) stopWork(); else workOn(); }
  }, reduced ? 0 : score.duration);
}
function quiet(): boolean {
  if (introPending || game.outcome || game.threat || dialog.open || document.hidden || routeFrom >= 0) return false;
  const o = outlook(game, { type: 'rest' }, 2, arena), next = game.beat + 1;
  if (o.short.length || o.dormant.length || o.spill.length || o.night) return false;
  if (W.some((_, d) => cond(d) !== 'steady')) return false;
  return next !== arena.dark[0] && next !== arena.dark[1] + 1 && next !== arena.length && !game.last?.learned.length;
}
function workOn() { if (working && quiet()) act({ type: 'rest' }, true); else stopWork(); }
function stopWork() { if (working) { working = false; renderControls(); } }

// Each arena has its own sky (looks.ts). The page recolours through body[data-arena]; the renderer
// through world.mood. Entering an arena shows its title card once.
let moodFor = '';
function applyArenaLook() {
  if (moodFor === arena.id) return;
  moodFor = arena.id; document.body.dataset.arena = arena.id; world?.mood(lookOf(arena.id));
}
let cardTimer = 0;
function showArenaCard() {
  const card = $('arena-card'), look = lookOf(arena.id);
  card.querySelector('.ordinal')!.textContent = look.ordinal;
  card.querySelector('strong')!.textContent = arena.name;
  card.querySelector('em')!.textContent = look.epithet;
  card.hidden = true; void card.offsetWidth; card.hidden = false;   // restart the animation
  clearTimeout(cardTimer); cardTimer = window.setTimeout(() => { card.hidden = true; }, reduced ? 1800 : 3300);
}
function switchArena(id: string) {
  const next = arenaById(id);
  cancelRoute(); stopWork(); clearTimeout(timer); clearTimeout(resolutionTimer);
  world?.clearFeedback(); music.cancel(); pendingEnd = false; $('response-cue').hidden = true; document.body.classList.remove('resolving');
  arena = next; selected = -1; busy = false; undone = null; fresh = []; held = null;
  try { localStorage.setItem(ARENA_KEY, arena.id); } catch { /* ignore */ }
  load(); world?.select(-1); render(); showArenaCard();
}

// ---- what a choice button says --------------------------------------------------------------------
function button(c: Choice, title: string, detail: string, cls = '') {
  const why = unavailable(game, c, arena), f = why ? null : foresee(game, c, arena);
  const data = `data-choice="${esc(JSON.stringify(c))}"`;
  return `<button type="button" class="choice ${cls}" ${data} ${busy || why ? 'disabled' : ''}><span>${esc(title)}</span><small>${esc(why ?? detail)}</small>${f ? `<small class="fore${f.change ? '' : ' none'}">${esc(f.text)}</small>` : ''}</button>`;
}
const invite = (d: number, o: number) => button({ type: 'connect', edge: edgeOf(d, o, arena) }, `Link current with ${W[o].short}`, 'Share spare clean water and route backlog for renewal. Uses 1 port each.');
const tendDetail = (d: number) => { const c = careOf(game, d, arena); return `Basin sends ${c.give ? `${c.give} clean` : '0 clean'}${c.take ? ` and pulls ${c.take} backlog to reed beds` : ''}. (Breaks Pure Currents medal.)`; };
function abilityButtons(d: number) {
  const w = W[d];
  if (w.archetype !== 'prism') return button({ type: 'ability', world: d }, w.ability, w.effect, 'signature');
  const why = game.outcome ? 'This journey has ended.' : activeAt(game, d) ? 'The bypass is already under way.' : game.dormant[d] ? 'Prism needs water before it can answer.' : null;
  return `<button type="button" class="choice signature" data-bypass="${d}" ${busy || why ? 'disabled' : ''}><span>${esc(w.ability)}</span><small>${esc(why ?? 'Choose a world on the orbit to preview a temporary 3-moment bypass.')}</small></button>`;
}
function traits(d: number) {
  const w = W[d], seen = w.traits.filter(t => game.known.includes(t.id)), unseen = w.traits.length - seen.length;
  return `<p class="eyebrow known-title">Codex · ${seen.length}/${w.traits.length} known</p><ul class="known">${seen.map(t => `<li class="${fresh.includes(t.id) ? 'new' : ''}">${esc(t.text)}</li>`).join('')}${unseen ? `<li class="unseen">${unseen === 1 ? '1 trait' : `${unseen} traits`} not yet observed in play.</li>` : ''}</ul>`;
}
const pips = (n: number, max: number, cls: string, line = -1) => `<span class="pips ${cls}" role="img" aria-label="${n} of ${max}${line >= 0 ? `; strain begins at ${line + 1}` : ''}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}${i === line ? ' line' : ''}"></i>`).join('')}</span>`;
const stateWord: Record<string, string> = { steady: 'Steady', strained: 'Strained', dormant: 'Dormant', thirsty: 'Thirsty' };
const medalIcon: Record<MedalId, string> = { dawn: '☀', 'zero-waste': '💧', 'pure-network': '〰', resonant: '✦' };

function renderNotice() {
  const el = $('notice'); el.className = 'notice';
  if (game.outcome) { el.hidden = true; return; }
  if (game.threat) {
    const { from, to } = game.threat, guard = W.findIndex(w => w.archetype === 'shelter'), store = W.findIndex(w => w.archetype === 'reservoir');
    const answers: [Choice, string, string][] = [
      [{ type: 'mediate' }, `Ask ${W[to].short} to give freely`, `${W[to].short} hands over what ${W[from].short} needs. Nothing is lost.`],
      [{ type: 'care', world: from }, `Tend ${W[from].short} from the basin`, tendDetail(from)],
      [{ type: 'connect', edge: edgeOf(from, to, arena) }, 'Link a current between them', 'Neighbours do not seize from each other. Uses 1 port each.'],
      ...(guard >= 0 ? [[{ type: 'ability', world: guard }, W[guard].ability, W[guard].effect] as [Choice, string, string]] : []),
      ...(store >= 0 && store !== from ? [[{ type: 'ability', world: store }, W[store].ability, W[store].effect] as [Choice, string, string]] : []),
    ];
    const rank = (c: Choice) => unavailable(game, c, arena) ? -9 : foresee(game, c, arena).change;
    const sorted = answers.map(a => ({ a, r: rank(a[0]) })).sort((x, y) => y.r - x.r).map(x => button(...x.a));
    const happen = button({ type: 'rest' }, 'Let it happen', `${W[from].short} seizes 2 water from ${W[to].short}. 1 is lost, and they will not link again.`);
    const opts = [...sorted.slice(0, 2), `<details><summary>Other answers</summary><div class="choices">${sorted.slice(2).join('')}${happen}</div></details>`];
    el.hidden = false;
    el.innerHTML = `<p class="eyebrow">Seizure warning · next moment</p><h2>${esc(W[from].short)} is reaching for ${esc(W[to].short)}’s water.</h2><p>${esc(W[from].short)} went thirsty and shares no current with ${esc(W[to].short)}.</p><div class="choices">${opts.join('')}</div>`;
    return;
  }
  const o = outlook(game, { type: 'rest' }, 2, arena), name = (ds: number[]) => ds.map(d => W[d].short).join(' and ');
  const first = o.dormant[0] ?? o.short[0] ?? o.spill[0];
  if (first === undefined || selected === first) { el.hidden = true; return; }
  el.hidden = false; el.classList.add('soft');
  el.innerHTML = `<p>${esc(o.dormant.length ? `${name(o.dormant)} will go dormant within 2 moments.` : o.short.length ? `${name(o.short)} will go thirsty within 2 moments.` : `${name(o.spill)} will spill backlog within 2 moments.`)}</p><button type="button" class="jump" data-world="${first}">Inspect ${esc(W[first].short)}</button>`;
}

function renderMedals() {
  const ms = medalsOf(actions, arena);
  $('medals').innerHTML = ms.map(m => `<span class="medal ${m.status}" title="${esc(`${m.name}: ${m.goal}`)}">${medalIcon[m.id]} ${esc(m.name)}${m.progress ? ` ${esc(m.progress)}` : ''}</span>`).join('');
  $('arenas-btn').textContent = `Arenas · ${totalEarnedMedals()}/${ARENAS.length * 4}`;
}

function renderPanel() {
  renderNotice();
  const e = ending(game, arena);
  document.body.classList.toggle('inspecting', selected >= 0 || !!e);
  document.body.classList.toggle('side-open', selected >= 0 || !!e || (!!game.threat && !game.outcome));
  if (selected < 0) {
    $('companion').innerHTML = e
      ? `<h1>${esc(e.title)}</h1><p class="nature">${esc(e.why[0])}</p><div class="choices"><button type="button" class="choice signature" id="see-ending"><span>View journey & medals</span><small>Turning points, currents, and earned medals.</small></button></div>`
      : '';
    return;
  }
  const d = selected, w = W[d], c = cond(d), bonds = linkedTo(game, d, arena), asking = c !== 'steady' || outlook(game, { type: 'rest' }, 2, arena).short.includes(d);
  const nextBeat = Math.min(game.beat + 1, arena.length);
  const uses = game.dormant[d] ? 0 : needAt(game, d, nextBeat, arena), renews = game.dormant[d] ? 0 : renewAt(game, d, nextBeat, arena), net = renews - uses;
  const others = W.map((_, o) => o).filter(o => o !== d && !isLinked(game, edgeOf(d, o, arena)));
  const ranked = others.map(o => ({ o, why: unavailable(game, { type: 'connect', edge: edgeOf(d, o, arena) }, arena) })).map(x => ({ ...x, f: x.why ? -9 : foresee(game, { type: 'connect', edge: edgeOf(d, x.o, arena) }, arena).change })).sort((x, y) => y.f - x.f || x.o - y.o);
  const lead = ranked[0] && ranked[0].f > 0 ? ranked[0].o : -1;
  const tend = button({ type: 'care', world: d }, 'Tend from basin', tendDetail(d), asking ? 'urgent' : '');
  $('companion').innerHTML = `<button type="button" class="back" id="unselect">← Whole orbit</button><h1>${esc(w.name)}</h1><p class="voice">${esc(w.voice)}</p><p class="nature">${esc(w.nature)}</p>
    <p class="state ${c}"><i></i>${stateWord[c]}${activeAt(game, d) && !game.dormant[d] ? ` · ${esc(w.ability.toLowerCase())}, ${game.active[d] - game.beat} left` : ''}</p>
    <p class="rates">Next turn: uses <b>${uses}</b> · renews <b>${renews}</b> (<span class="${net > 0 ? 'pos' : net < 0 ? 'neg' : ''}">${net > 0 ? `+${net}` : net}</span>) · ports <b>${bonds.filter(b => game.links[b.edge]).length}/${w.ports}</b></p>
    <div class="gauges"><div class="gauge"><span>Clean ${game.clean[d]}/${w.store}</span>${pips(game.clean[d], w.store, 'clean')}</div><div class="gauge"><span>Backlog ${game.used[d]}/${w.hold}</span>${pips(game.used[d], w.hold, 'used', strainLine(d, arena) - 1)}</div></div>
    <div class="choices"><button type="button" class="choice route-choice" data-draw="${d}" ${busy || game.outcome ? 'disabled' : ''}><span>Link or close a current</span><small>Choose a neighbour on the orbit to preview the route.</small></button>${game.dormant[d] ? '' : abilityButtons(d)}${asking ? tend : ''}${lead >= 0 ? invite(d, lead) : ''}
      ${bonds.map(({ edge, other }) => { const by = game.bypass.find(b => b.edge === edge && b.until > game.beat);
        return `<div class="bond"><div><b>Current with ${esc(W[other].short)}</b><small>${by ? `Bypass · ${by.until - game.beat} ${by.until - game.beat === 1 ? 'moment' : 'moments'} left` : game.memory[edge] ? `Active for ${game.memory[edge]} ${game.memory[edge] === 1 ? 'moment' : 'moments'}` : 'Open · ready to flow'}</small></div>${by ? '' : `<button type="button" data-choice="${esc(JSON.stringify({ type: 'release', edge }))}" ${busy ? 'disabled' : ''} aria-label="Close current with ${esc(W[other].short)}">Close</button>`}</div>`; }).join('')}</div>
    <details><summary>More links & basin tending · ${bonds.filter(b => game.links[b.edge]).length}/${w.ports} ports</summary><div class="choices">${ranked.filter(x => x.o !== lead).map(x => invite(d, x.o)).join('')}${asking ? '' : tend}</div></details>
    <details class="field-notes"${w.traits.some(t => fresh.includes(t.id)) ? ' open' : ''}><summary>Codex notes${w.traits.some(t => fresh.includes(t.id)) ? ' · new discovery' : ''}</summary>${traits(d)}</details>`;
}

function renderWhisper() {
  const el = $('whisper'), key = `${arena.id}:${JSON.stringify(actions)}`;
  const show = voices && !introPending && !game.outcome;
  if (held && (held.key !== key || !show || (held.w.id === 'hello' && selected >= 0))) { heard.add(held.w.id); held = null; saveVoices(); }
  if (show && !busy && !held) { const w = whisper(game, heard, selected, arena); if (w) held = { key, w }; }
  el.hidden = busy || !held;
  document.body.classList.toggle('has-voice', !el.hidden);
  W.forEach((_, d) => document.getElementById(`label-${d}`)?.classList.toggle('speaking', !el.hidden && held?.w.who === d));
  if (el.hidden) return;
  const { w } = held!, speaker = typeof w.who === 'number' ? W[w.who] : null;
  const contentKey = `${w.id}:${w.who}:${w.text}`;
  if (el.dataset.voice === contentKey) return;
  el.dataset.voice = contentKey;
  el.className = `whisper ${speaker ? `t${speaker.theme}` : 'from-basin'}`; el.dataset.who = String(w.who);
  el.innerHTML = `<div class="voice-message" role="status"><span class="who">${esc(speaker ? speaker.name : 'The Seventh Basin')}</span><p class="said">${esc(w.text)}</p></div><div class="voice-actions">${speaker ? `<button type="button" data-hear="${w.who}">Inspect ${esc(speaker.short)} <span aria-hidden="true">↗</span></button>` : ''}<button type="button" id="dismiss-voice" aria-label="Acknowledge this guidance without passing a moment">Heard</button></div>`;
}
function dismissVoice() {
  if (held) { heard.add(held.w.id); held = null; saveVoices(); }
  $('whisper').hidden = true; document.body.classList.remove('has-voice');
  document.querySelectorAll('.label.speaking').forEach(e => e.classList.remove('speaking')); renderControls(); focusPanel();
}
function renderChips() {
  $('chips').innerHTML = W.map((w, d) => `<button type="button" class="chip t${w.theme} ${cond(d)}${w.traits.some(t => fresh.includes(t.id)) ? ' news' : ''}" data-world="${d}" aria-pressed="${selected === d}" aria-label="${esc(`${w.name}, ${stateWord[cond(d)].toLowerCase()}`)}"><i></i>${esc(w.short)}</button>`).join('');
}
let labelEls: HTMLElement[] = [];
function renderLabels() {
  const nextBeat = Math.min(game.beat + 1, arena.length);
  $('labels').innerHTML = W.map((w, d) => {
    const c = cond(d), el = activeAt(game, d) && !game.dormant[d];
    const uses = game.dormant[d] ? 0 : needAt(game, d, nextBeat, arena), renews = game.dormant[d] ? 0 : renewAt(game, d, nextBeat, arena), net = renews - uses;
    const cleanPct = Math.round((game.clean[d] / w.store) * 100), usedPct = Math.round((game.used[d] / w.hold) * 100), strainPct = Math.round((strainLine(d, arena) / w.hold) * 100);
    const usedPorts = linkedTo(game, d, arena).filter(b => game.links[b.edge]).length;
    return `<div class="label t${w.theme} ${c}${el ? ' element' : ''}${d === selected ? ' sel' : ''}" id="label-${d}">
      <div class="label-head"><b>${esc(w.short)}</b><em class="net ${game.dormant[d] ? 'off' : net > 0 ? 'pos' : net < 0 ? 'neg' : 'flat'}">${game.dormant[d] ? '—' : net > 0 ? `+${net}` : String(net)}</em></div>
      <div class="micro-bars"><span class="mbar clean"><i style="width:${cleanPct}%"></i></span><span class="mbar used"><i style="width:${usedPct}%"></i><u style="left:${strainPct}%"></u></span></div>
      <div class="label-foot"><span class="ports">${Array.from({ length: w.ports }, (_, i) => `<i class="${i < usedPorts ? 'on' : ''}"></i>`).join('')}</span><small>${c !== 'steady' ? c : el ? 'active' : ''}</small></div>
    </div>`;
  }).join('');
  labelEls = W.map((_, d) => document.getElementById(`label-${d}`)!); labelSize = [];
}
function renderControls() {
  const over = !!game.outcome;
  ($('flow') as HTMLButtonElement).disabled = busy || over || routeFrom >= 0; $('flow').textContent = busy ? 'Flowing…' : over ? 'Journey ended' : 'Next moment';
  ($('work') as HTMLButtonElement).disabled = over || (!working && (busy || !quiet())); $('work').setAttribute('aria-pressed', String(working));
  $('work').textContent = working ? 'Stop' : 'Auto-flow'; $('work').title = working ? '' : quiet() ? 'Fast-forwards quiet moments until something needs you.' : 'Something needs you now, or is about to.';
  $('undo').hidden = !actions.length && !undone; $('undo').textContent = undone ? 'Undo restart' : 'Undo';
}
function render() {
  world?.update(scene()); renderPanel(); renderChips(); renderLabels(); renderMedals(); renderControls(); renderWhisper();
  const next = Math.min(game.beat + 1, arena.length), sky = skyAt(next, arena);
  $('arena-tag').textContent = `${arena.name} · Basin ${game.basin}/${arena.basin.capacity}`;
  $('sky-name').textContent = `${SKY_NAME[sky]} · moment ${next} of ${arena.length}`;
  $('ribbon').innerHTML = Array.from({ length: arena.length }, (_, i) => { const b = i + 1, dark = skyAt(b, arena) === 'dark';
    return `${b === arena.dark[0] || b === arena.dark[1] + 1 ? '<i class="gap"></i>' : ''}<i class="${dark ? 'dark ' : ''}${b <= game.beat ? 'done' : b === next && !game.outcome ? 'now' : ''}"></i>`; }).join('');
  $('ribbon').setAttribute('aria-label', `Moment ${next} of ${arena.length}. The dark runs from moment ${arena.dark[0]} to ${arena.dark[1]}.`);
  $('sky-note').textContent = skyNote(game, arena);
  $('night').hidden = !game.night;
  $('night').innerHTML = `The night gathers ${Array.from({ length: arena.nightfall }, (_, i) => `<i class="${i < game.night ? 'on' : ''}"></i>`).join('')}`;
  $('moment-label').textContent = game.beat ? `After moment ${game.beat}` : 'Before moment 1';
  const spoken = game.last ? tell(game.last, game, arena) : [];
  const important = spoken.filter(x => /thirsty|dormant|spilled|takes |Next moment|itself went|Resonance:/.test(x));
  const brief = important.length ? important.slice(0, 2) : spoken.slice(0, 2);
  $('story').textContent = notice || (game.last ? brief.join(' ') : (voices ? 'Nothing has been asked of the worlds yet.' : 'Drag a current from a negative-flow world (red badge) to Verdance (+3) to start cleaning backlog.'));
  $('read-moment').hidden = !game.last;
  $('read-moment').textContent = game.last?.learned.length ? `Read moment · ${game.last.learned.length} new ${game.last.learned.length === 1 ? 'trait' : 'traits'}` : 'Read moment';
  $('save-status').textContent = saving ? 'Saved on device' : 'Storage unavailable · keep tab open';
  document.body.dataset.sky = sky; applyArenaLook();
  document.body.classList.toggle('dawn', game.outcome === 'dawn');
}

// ---- dialogs: arenas & ending ---------------------------------------------------------------------
function openArenas() {
  const cards = ARENAS.map(a => {
    const got = earnedByArena[a.id] ?? [], cur = a.id === arena.id;
    return `<div class="arena-card${cur ? ' current' : ''}" data-a="${esc(a.id)}"><span class="swatch" aria-hidden="true"></span>
      <div class="arena-card-top"><h3>${esc(a.name)}</h3><span class="meta">${got.length}/4 medals · Dark M${a.dark[0]}–${a.dark[1]} · Rain ${a.rain.gathering}/${a.rain.dark}/${a.rain.return}</span></div>
      <p>${esc(a.subtitle)}</p>
      <div class="row">${cur ? '<span class="stat-pill"><b>Active arena</b></span>' : `<button type="button" class="ghost" data-arena="${esc(a.id)}">Switch to ${esc(a.name)}</button>`}</div>
    </div>`;
  }).join('');
  openDialog(`<p class="eyebrow">Orbits & challenges · ${totalEarnedMedals()}/${ARENAS.length * 4} medals earned</p><h2>Choose an arena.</h2><p>Each arena uses the same six worlds and strict water conservation under a different sky or starting pressure. Progress saves separately per arena.</p><div class="arena-grid">${cards}</div>`);
}

function showEnding() {
  const e = ending(game, arena); if (!e) return;
  recordEarnedMedals(); renderMedals();
  const r = recount(actions, arena, known0), back = r.firstDormant ? Math.max(0, r.firstDormant - 4) : -1;
  const ms = medalsOf(actions, arena);
  const idx = ARENAS.findIndex(a => a.id === arena.id), nextArena = idx >= 0 && idx + 1 < ARENAS.length ? ARENAS[idx + 1] : null;
  const medalCards = `<div class="ending-medals">${ms.map(m => `<div class="ending-medal ${m.status}"><b>${medalIcon[m.id]} ${esc(m.name)}${m.progress ? ` (${esc(m.progress)})` : ''}</b><small>${esc(m.goal)}</small></div>`).join('')}</div>`;
  const kept = r.bonds.length ? `<h3>Currents that endured</h3><ul>${r.bonds.map(b => `<li><b>${esc(b.text)}</b>: active on ${b.shared} ${b.shared === 1 ? 'moment' : 'moments'}</li>`).join('')}</ul>` : '<h3>Currents that endured</h3><p>None. Every world ended on its own.</p>';
  openDialog(`<p class="eyebrow">${esc(arena.name)} · ${game.beat} of ${arena.length} moments · Resonance ${game.resonance}</p><h2>${esc(e.title)}</h2>${e.why.map((x, i) => `<p class="${i ? '' : 'strong'}">${esc(x)}</p>`).join('')}
    <h3>Run medals</h3>${medalCards}
    <h3>What turned the journey</h3>${r.points.length ? `<ul>${r.points.slice(0, 12).map(p => `<li><b>Moment ${p.moment}.</b> ${esc(p.text)}</li>`).join('')}</ul>` : '<p>Nothing was asked of the worlds, and nothing was offered.</p>'}
    ${kept}<p>${r.spilled ? `${r.spilled} water spilled out of the orbit. ` : 'No water was spilled. '}${r.learned ? `Discovered ${r.learned} new ${r.learned === 1 ? 'trait' : 'traits'}.` : ''}</p>
    <div class="row">${e.outcome === 'dawn' && nextArena ? `<button type="button" class="primary" data-arena="${esc(nextArena.id)}">Next arena: ${esc(nextArena.name)} →</button>` : ''}<button type="button" class="${e.outcome === 'dawn' && nextArena ? 'ghost' : 'primary'}" id="again">Play again</button>${back >= 0 ? `<button type="button" class="ghost" data-back="${back}">Rewind to moment ${back + 1}</button>` : ''}<button type="button" class="text" id="undo-end">Undo last moment</button></div>`, `end-${e.outcome}`);
}
function begin(keep: boolean) {
  cancelRoute(); clearTimeout(resolutionTimer); world?.clearFeedback(); music.cancel(); pendingEnd = false; $('response-cue').hidden = true; document.body.classList.remove('resolving');
  undone = keep ? { v: 1, known: known0, actions: actions.slice() } : null;
  known0 = [...new Set([...known0, ...game.known])]; actions = []; game = newGame(arena, known0); selected = -1; busy = false; working = false; fresh = []; clearTimeout(timer); world?.select(-1); save(); render();
}
function rewind(to: number) { cancelRoute(); clearTimeout(resolutionTimer); world?.clearFeedback(); music.cancel(); pendingEnd = false; $('response-cue').hidden = true; document.body.classList.remove('resolving'); stopWork(); clearTimeout(timer); busy = false; actions = actions.slice(0, to); game = replay(actions, arena, known0); fresh = game.last?.learned ?? []; save(); render(); }

// ---- input ----------------------------------------------------------------------------------------
document.addEventListener('click', ev => {
  const b = (ev.target as HTMLElement).closest('button') as HTMLButtonElement | null; if (!b) return;
  if (b.id === 'dismiss-voice') { dismissVoice(); return; }
  if (b.dataset.hear !== undefined) { const d = Number(b.dataset.hear); dismissVoice(); if (d !== selected) choose(d); return; }
  if (b.dataset.arena !== undefined) { if (dialog.open) dialog.close(); switchArena(b.dataset.arena); return; }
  if (b.id === 'meet-basin') { dialog.close(); openIntro(); return; }
  if (b.id === 'begin-guided' || b.id === 'begin-silent') { voices = b.id === 'begin-guided'; introPending = false; saveVoices(); intro.close(); intro.hidden = true; document.body.classList.remove('intro-open'); render(); showArenaCard(); focusPanel(); if (pendingEnd) { pendingEnd = false; showEnding(); } return; }
  if (b.id === 'toggle-voices') { voices = !voices; if (voices) heard = new Set(); held = null; saveVoices(); dialog.close(); render(); return; }
  if (b.id === 'commit-route') { const c = routeChoice(); if (c) act(c); }
  else if (b.id === 'cancel-route') { cancelRoute(); focusPanel(); }
  else if (b.dataset.draw !== undefined) startRoute(Number(b.dataset.draw));
  else if (b.dataset.bypass !== undefined) startRoute(Number(b.dataset.bypass), 'bypass');
  else if (b.dataset.choice) { if (dialog.open) dialog.close(); act(JSON.parse(b.dataset.choice) as Choice); }
  else if (b.dataset.world !== undefined) choose(Number(b.dataset.world));
  else if (b.dataset.back !== undefined) { dialog.close(); rewind(Number(b.dataset.back)); }
  else if (b.id === 'unselect') { cancelRoute(); selected = -1; world?.select(-1); renderPanel(); renderChips(); renderLabels(); focusPanel(); }
  else if (b.id === 'see-ending') showEnding();
  else if (b.id === 'again') { dialog.close(); begin(false); }
  else if (b.id === 'undo-end') { dialog.close(); rewind(actions.length - 1); }
  else if (b.id === 'confirm-restart') { dialog.close(); begin(true); }
});
$('arenas-btn').addEventListener('click', openArenas);
$('flow').addEventListener('click', () => act({ type: 'rest' }));
$('work').addEventListener('click', () => { if (working) stopWork(); else if (quiet()) { working = true; renderControls(); workOn(); } });
$('undo').addEventListener('click', () => {
  cancelRoute(); stopWork(); clearTimeout(timer); clearTimeout(resolutionTimer); world?.clearFeedback(); music.cancel(); pendingEnd = false; $('response-cue').hidden = true; document.body.classList.remove('resolving'); busy = false;
  if (undone) { known0 = undone.known; actions = undone.actions; undone = null; game = replay(actions, arena, known0); save(); render(); } else rewind(actions.length - 1);
});
$('restart').addEventListener('click', () => openDialog('<p class="eyebrow">Another beginning</p><h2>Restart this orbit?</h2><p>Starts this arena again from moment 1. Discovered traits and earned medals stay saved. You can undo right afterwards.</p><div class="row"><button type="button" class="ghost" id="confirm-restart">Restart orbit</button></div>'));
$('sound').addEventListener('click', async () => {
  const b = $('sound') as HTMLButtonElement; b.disabled = true;
  try { sounding = await music.enable(!sounding); b.textContent = sounding ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', String(sounding)); }
  catch { b.textContent = 'Sound unavailable'; sounding = false; } finally { b.disabled = false; }
});
$('guide').addEventListener('click', () => openDialog(`<p class="eyebrow">Keeper’s notes · ${esc(arena.name)}</p><h2>How the orbit works.</h2>
  <div class="scroll"><table class="notes"><tbody>
  <tr><th>Goal</th><td>Reach moment ${arena.length} with every world awake, no thirst in the last 3 moments, and no backlog at or past the red strain tick.</td></tr>
  <tr><th>Planet HUD</th><td>Blue bar = Clean water. Gold bar = Backlog (with red strain tick). Badge = Net flow next turn. Dots = Ports (gold = linked, hollow = free).</td></tr>
  <tr><th>Seasons</th><td>Open Sky (1–${arena.dark[0] - 1}) · The Dark (${arena.dark[0]}–${arena.dark[1]}, no rain; Ember & Unobserved surge) · The Return (${arena.dark[1] + 1}–${arena.length}).</td></tr>
  <tr><th>Resonance</th><td>Sparks whenever a world renews backlog for 2+ neighbours in one turn, or via a 2+ hop chain. Hit ${RESONANCE_GOAL} and reach Dawn for Singing Orbit.</td></tr>
  <tr><th>Disputes</th><td>A thirsty world with no link to a wealthy world warns 1 turn ahead before seizing water. Link, mediate, tend, or raise Obsidian’s shelter.</td></tr>
  <tr><th>Nightfall</th><td>${arena.nightfall} total dormant world-moments end the journey in The Long Night.</td></tr>
  </tbody></table></div>
  <div class="row"><button type="button" class="ghost" id="toggle-voices">${voices ? 'Turn off written guidance' : 'Turn on written guidance'}</button><button type="button" class="text" id="meet-basin">Reopen intro</button></div>
  <p>Keys: Tab and Enter reach everything. Space advances a moment. Escape steps back. Every moment can be undone.</p>`));
$('ledger').addEventListener('click', () => {
  const m = game.last;
  openDialog(`<p class="eyebrow">The water · after moment ${game.beat}</p><h2>Where every drop is.</h2><div class="scroll"><table><thead><tr><th>World</th><th>Clean</th><th>Backlog</th><th>Uses next</th><th>Renews next</th></tr></thead><tbody>${W.map((w, d) => `<tr><th>${esc(w.short)}</th><td>${game.clean[d]}/${w.store}</td><td>${game.used[d]}/${w.hold}</td><td>${game.dormant[d] ? 'dormant' : needAt(game, d, game.beat + 1, arena)}</td><td>${game.dormant[d] ? '0' : renewAt(game, d, game.beat + 1, arena)}</td></tr>`).join('')}<tr><th>The basin</th><td>${game.basin}/${arena.basin.capacity}</td><td>${game.reeds}/${arena.basin.hold} reeds</td><td>${arena.basin.need}</td><td>${arena.basin.renew[skyAt(Math.min(game.beat + 1, arena.length), arena)]}</td></tr></tbody></table></div>
    <p class="strong">${m ? `${m.before} held + ${m.rain} rain + ${m.mist} mist − ${m.drunk} basin − ${m.spilled} spilled − ${m.cost} cost = ${m.after} held. ${m.renewed} renewed.` : `${totalWater(game)} water is held in the orbit.`}</p>
    <p>Water enters only as rain and mist, and leaves only via basin use, spills, shelters, or seizures. Currents and Resonance never fabricate water.</p>`);
});
document.addEventListener('keydown', e => {
  if (dialog.open || introPending) return;
  if (e.code === 'Space' && !(e.target as HTMLElement).closest('button, summary, a')) { e.preventDefault(); $('flow').click(); }
  if (e.key === 'Escape') { if (routeFrom >= 0) { cancelRoute(); focusPanel(); return; } stopWork(); if (selected >= 0) { selected = -1; world?.select(-1); renderPanel(); renderChips(); renderLabels(); } }
});
$('read-moment').addEventListener('click', () => {
  if (!game.last) return;
  const discoveries = game.last.learned.flatMap(id => W.flatMap(w => w.traits.filter(t => t.id === id).map(t => `${w.short}: ${t.text}`)));
  openDialog(`<p class="eyebrow">Moment ${game.beat} · ${SKY_NAME[game.last.sky]}</p><h2>${esc(momentTitle(game.last))}</h2>${tell(game.last, game, arena).map(x => `<p>${esc(x)}</p>`).join('')}${discoveries.length ? `<h3>Codex discoveries</h3><ul>${discoveries.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopWork(); world?.clearFeedback(); void music.suspend().catch(() => {}); }
  else { void music.resume().catch(() => {}); if (pendingEnd && !dialog.open && !introPending) { pendingEnd = false; showEnding(); } }
});
document.addEventListener('keydown', e => { if (working && e.key !== 'Tab') stopWork(); }, true);
document.addEventListener('pointerdown', e => { if (working && !(e.target as HTMLElement).closest('#work')) stopWork(); }, true);
const resize = new ResizeObserver(() => world?.resize()); resize.observe($('stage'));
let frame = 0;
// Labels sit above their world. If that would put a label on a neighbouring planet (the ring is
// seen at an angle, so a near world can rise into a far one's label), it goes beneath its own world.
let labelSize: { w: number; h: number }[] = [];
function place() {
  if (world && labelEls.length) {
    if (labelSize.length !== labelEls.length) labelSize = labelEls.map(el => ({ w: el.offsetWidth, h: el.offsetHeight }));
    const centres = labelEls.map((_, d) => world!.centreOf(d)), tops = labelEls.map((_, d) => world!.screenOf(d));
    const radius = centres.map((c, d) => Math.max(8, c.y - tops[d].y) * 0.8);
    const hits = (d: number, x0: number, y0: number, x1: number, y1: number) => centres.some((c, j) => {
      if (j === d || !c.visible) return false;
      const nx = Math.max(x0, Math.min(c.x, x1)), ny = Math.max(y0, Math.min(c.y, y1));
      return (nx - c.x) ** 2 + (ny - c.y) ** 2 < radius[j] ** 2;
    });
    for (let d = 0; d < labelEls.length; d++) {
      const el = labelEls[d], p = tops[d], { w, h } = labelSize[d] ?? { w: 80, h: 40 };
      const above = hits(d, p.x - w / 2, p.y - h, p.x + w / 2, p.y);
      const belowY = centres[d].y + (centres[d].y - p.y) * 0.95;
      const below = above && !hits(d, p.x - w / 2, belowY, p.x + w / 2, belowY + h);
      el.classList.toggle('below', below);
      el.style.transform = below ? `translate3d(${p.x}px, ${belowY}px, 0) translate(-50%, 0)` : `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -100%)`;
      el.style.opacity = p.visible ? '1' : '0';
    }
  }
  frame = requestAnimationFrame(place);
}
window.addEventListener('pagehide', e => { if (e.persisted) return; cancelAnimationFrame(frame); resize.disconnect(); clearTimeout(timer); world?.dispose(); clearTimeout(resolutionTimer); void music.dispose(); });

// window.__MC = { actions?, select?, arena? } lets a headless browser open a given situation.
const auto = (window as unknown as { __MC?: { actions?: Choice[]; select?: number; end?: boolean; intro?: boolean; voices?: boolean; arena?: string } }).__MC;
if (auto?.arena) { arena = arenaById(auto.arena); W = arena.worlds; P = pairs(arena); }
if (auto) { actions = auto.actions ?? []; known0 = []; game = replay(actions, arena, known0); if (auto.select !== undefined) selected = auto.select; }
if (auto) { introPending = !!auto.intro; voices = auto.voices !== false; heard = new Set(); }
if (introPending) openIntro();
render(); world?.select(selected); place();
if (!introPending && !auto) showArenaCard();
if (introPending) $('intro-title').focus({ preventScroll: true });
if (auto?.end && game.outcome) showEnding();
