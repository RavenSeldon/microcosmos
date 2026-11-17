// The Dark Microcosmos: the page. It routes input, draws the instruments and asks the rules what
// would happen. Every rule is in ../src/microcosmos.ts; every sentence about what happened or would
// happen is in ../src/telling.ts. A journey is { known at its start, the choices made }; everything
// on screen is recomputed from that, which is also how saving and undo work.
import './game.css';
import { FIRST_ARENA as arena } from '../src/arenas.ts';
import { newGame, replay, advance, pairs, edgeOf, unavailable, validChoice, needAt, activeAt, isLinked, conditionOf, strainLine, skyAt, outlook, totalWater, careOf } from '../src/microcosmos.ts';
import type { Choice, Game } from '../src/microcosmos.ts';
import { tell, foresee, ending, recount, skyNote, linkedTo, SKY_NAME } from '../src/telling.ts';
import { createWorld } from './world.ts';
import type { Scene } from './scene.ts';
import { scoreMoment, momentTitle } from './feedback.ts';
import { createSoundscape } from './sound.ts';
import { whisper } from '../src/whispers.ts';
import type { Whisper } from '../src/whispers.ts';

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const W = arena.worlds, P = pairs(arena);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const music = createSoundscape(arena);
let sounding = false, routeFrom = -1, routeTo = -1, routeKind: 'current' | 'bypass' = 'current';
let resolutionTimer = 0, pendingEnd = false;
const JOURNEY = `microcosmos.journey.${arena.id}.v${arena.version}`, KNOWN = 'microcosmos.known.v1';
interface Saved { v: 1; known: string[]; actions: Choice[] }
// Two ways to travel one journey: with the worlds' voices, or in silence. Each voice line is heard once.
const VOICES = 'microcosmos.voices.v1';
let voices = true, heard = new Set<string>(), held: { key: string; w: Whisper } | null = null, introPending = false;
function loadVoices() { try { const d = JSON.parse(localStorage.getItem(VOICES) ?? 'null') as { on?: unknown; heard?: unknown } | null; if (!d) { introPending = true; return; } voices = d.on !== false; heard = new Set(Array.isArray(d.heard) ? d.heard.filter((x): x is string => typeof x === 'string') : []); } catch { introPending = true; } }
function saveVoices() { try { localStorage.setItem(VOICES, JSON.stringify({ on: voices, heard: [...heard] })); } catch { /* play continues without it */ } }

// ---- state ---------------------------------------------------------------------------------------
let known0: string[] = [], actions: Choice[] = [], game: Game = newGame(arena), selected = -1;
let busy = false, timer = 0, working = false, saving = true, notice = '', undone: Saved | null = null, fresh: string[] = [];
function load() {
  let raw = '';
  try {
    const everKnown: unknown = JSON.parse(localStorage.getItem(KNOWN) ?? '[]');
    const valid = new Set(W.flatMap(w => w.traits.map(t => t.id)));
    known0 = Array.isArray(everKnown) ? everKnown.filter((x): x is string => typeof x === 'string' && valid.has(x)) : [];
    raw = localStorage.getItem(JOURNEY) ?? '';
    if (raw) {
      const d = JSON.parse(raw) as Saved;
      if (d?.v !== 1 || !Array.isArray(d.actions) || d.actions.length > arena.length || !d.actions.every(c => validChoice(c, arena)) || !Array.isArray(d.known)) throw new Error('unreadable');
      const k = d.known.filter(x => valid.has(x));
      game = replay(d.actions, arena, k); actions = d.actions; known0 = k;   // replay refuses any choice that was not possible
    }
  } catch {
    if (raw) { try { localStorage.setItem(`${JOURNEY}.unreadable.${Date.now()}`, raw); } catch { /* keep going */ } notice = 'A saved journey could not be read. It has been set aside, and a new one is ready.'; game = newGame(arena, known0); actions = []; }
    else { saving = false; notice = 'This device will not keep the journey. You can still play while this tab stays open.'; }
  }
  if (!actions.length) game = newGame(arena, known0);
}
function save() {
  try { localStorage.setItem(JOURNEY, JSON.stringify({ v: 1, known: known0, actions } satisfies Saved)); localStorage.setItem(KNOWN, JSON.stringify([...new Set([...known0, ...game.known])])); saving = true; }
  catch { saving = false; }
}
load(); loadVoices(); if (actions.length) introPending = false;

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
  selected = selected === d ? -1 : d;
  world?.select(selected); music.select(selected); renderPanel(); renderChips(); renderLabels(); renderWhisper(); focusPanel();
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
  box.innerHTML = `<div class="route-top"><span class="eyebrow">${routeKind === 'bypass' ? 'Temporary bypass' : c?.type === 'release' ? 'Rest a current' : 'Draw a current'}</span><button type="button" class="text" id="cancel-route">Cancel <kbd>Esc</kbd></button></div><h2 id="route-title" tabindex="-1">${esc(title)}</h2>
    <p>${esc(why ?? (c ? c.type === 'release' ? 'Their ports become free. Their exchange history remains.' : routeKind === 'bypass' ? 'A three-moment route beyond the usual port limits.' : 'A lasting route for spare water and shared renewal.' : 'Choose another planet or its name below. Choose a connected neighbour to rest that current.'))}</p>
    ${c && !why ? `<p class="route-forecast">${esc(foresee(game, c, arena).text)}</p><button type="button" id="commit-route" class="primary">${c.type === 'release' ? 'Rest this current' : routeKind === 'bypass' ? 'Open this bypass' : 'Open this current'} <span aria-hidden="true">↗</span></button>` : ''}`;
  renderControls();
}

function focusPanel() { const h = $('companion').querySelector('h1') as HTMLElement | null; if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); h.scrollIntoView({ block: 'nearest' }); } }
function act(c: Choice, auto = false) {
  if (busy || game.outcome || introPending) return;
  const why = unavailable(game, c, arena);
  if (why) { stopWork(); openDialog(`<h2>Not yet.</h2><p class="strong">${esc(why)}</p>`); return; }
  if (!auto) stopWork();
  cancelRoute();
  undone = null; game = advance(game, c, arena); actions.push(c); fresh = game.last!.learned; save();
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
    // Preserve keyboard focus and expanded choices at the end of the visual beat.
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(b => b.disabled = !!unavailable(game, JSON.parse(b.dataset.choice!), arena));
    document.querySelectorAll<HTMLButtonElement>('[data-draw]').forEach(b => b.disabled = !!game.outcome);
    document.querySelectorAll<HTMLButtonElement>('[data-bypass]').forEach(b => { const d = Number(b.dataset.bypass); b.disabled = !!game.outcome || activeAt(game, d) || game.dormant[d]; });
    renderWhisper(); renderControls();
    if (game.outcome) { stopWork(); if (dialog.open || introPending || document.hidden) pendingEnd = true; else showEnding(); }
    else if (working) { if (held) stopWork(); else workOn(); }
  }, reduced ? 0 : score.duration);
}
// "Let the currents work": pass quiet moments, and stop the moment before something needs the player.
function quiet(): boolean {
  if (introPending || game.outcome || game.threat || dialog.open || document.hidden || routeFrom >= 0) return false;
  const o = outlook(game, { type: 'rest' }, 2, arena), next = game.beat + 1;
  if (o.short.length || o.dormant.length || o.spill.length || o.night) return false;
  if (W.some((_, d) => cond(d) !== 'steady')) return false;
  return next !== arena.dark[0] && next !== arena.dark[1] + 1 && next !== arena.length && !game.last?.learned.length;
}
function workOn() { if (working && quiet()) act({ type: 'rest' }, true); else stopWork(); }
function stopWork() { if (working) { working = false; renderControls(); } }

// ---- what a choice button says --------------------------------------------------------------------
function button(c: Choice, title: string, detail: string, cls = '') {
  const why = unavailable(game, c, arena), f = why ? null : foresee(game, c, arena);
  const data = `data-choice="${esc(JSON.stringify(c))}"`;
  return `<button type="button" class="choice ${cls}" ${data} ${busy || why ? 'disabled' : ''}><span>${esc(title)}</span><small>${esc(why ?? detail)}</small>${f ? `<small class="fore${f.change ? '' : ' none'}">${esc(f.text)}</small>` : ''}</button>`;
}
const invite = (d: number, o: number) => button({ type: 'connect', edge: edgeOf(d, o, arena) }, `Open a current with ${W[o].short}`, 'They share spare water, and each can renew what the other has used. It takes a port at both.');
const tendDetail = (d: number) => { const c = careOf(game, d, arena); return `The basin community sends ${W[d].short} ${c.give ? `${c.give} clean water` : 'no water (it has none to spare)'}${c.take ? ` and carries ${c.take} used water back to its reed beds` : ''}.`; };
function abilityButtons(d: number) {
  const w = W[d];
  if (w.archetype !== 'prism') return button({ type: 'ability', world: d }, w.ability, w.effect, 'signature');
  const why = game.outcome ? 'This journey has ended.' : activeAt(game, d) ? 'The bypass is already under way.' : game.dormant[d] ? 'Prism needs water before it can answer.' : null;
  return `<button type="button" class="choice signature" data-bypass="${d}" ${busy || why ? 'disabled' : ''}><span>${esc(w.ability)}</span><small>${esc(why ?? 'Choose a world on the orbit, then see what the bypass would change before committing.')}</small></button>`;
}
function traits(d: number) {
  const w = W[d], seen = w.traits.filter(t => game.known.includes(t.id)), unseen = w.traits.length - seen.length;
  return `<p class="eyebrow known-title">What you know of ${esc(w.short)}</p><ul class="known">${seen.map(t => `<li class="${fresh.includes(t.id) ? 'new' : ''}">${esc(t.text)}</li>`).join('')}${unseen ? `<li class="unseen">${unseen === 1 ? 'One thing' : `${['', '', 'Two', 'Three'][unseen] ?? unseen} things`} about this world ${unseen === 1 ? 'has' : 'have'} not shown ${unseen === 1 ? 'itself' : 'themselves'} yet.</li>` : ''}</ul>`;
}
const pips = (n: number, max: number, cls: string, line = -1) => `<span class="pips ${cls}" role="img" aria-label="${n} of ${max}${line >= 0 ? `; strain begins at ${line + 1}` : ''}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}${i === line ? ' line' : ''}"></i>`).join('')}</span>`;
const stateWord: Record<string, string> = { steady: 'Steady', strained: 'Strained', dormant: 'Dormant', thirsty: 'Thirsty' };

function renderNotice() {
  const el = $('notice'); el.className = 'notice';
  if (game.outcome) { el.hidden = true; return; }
  if (game.threat) {
    const { from, to } = game.threat, guard = W.findIndex(w => w.archetype === 'shelter'), store = W.findIndex(w => w.archetype === 'reservoir');
    const answers: [Choice, string, string][] = [
      [{ type: 'mediate' }, `Ask ${W[to].short} to give freely`, `${W[to].short} hands over what ${W[from].short} needs. Nothing is lost, and the two will have exchanged.`],
      [{ type: 'care', world: from }, `Tend ${W[from].short} from the basin`, tendDetail(from)],
      [{ type: 'connect', edge: edgeOf(from, to, arena) }, 'Open a current between them', 'Neighbours do not take from each other. It uses a port at each.'],
      ...(guard >= 0 ? [[{ type: 'ability', world: guard }, W[guard].ability, W[guard].effect] as [Choice, string, string]] : []),
      ...(store >= 0 && store !== from ? [[{ type: 'ability', world: store }, W[store].ability, W[store].effect] as [Choice, string, string]] : []),
    ];
    // The answers that would help most come first; the rest stay one step away.
    const rank = (c: Choice) => unavailable(game, c, arena) ? -9 : foresee(game, c, arena).change;
    const sorted = answers.map(a => ({ a, r: rank(a[0]) })).sort((x, y) => y.r - x.r).map(x => button(...x.a));
    const happen = button({ type: 'rest' }, 'Let it happen', `${W[from].short} takes two water from ${W[to].short}. One is lost, and they will not open a current to each other again this journey.`);
    const opts = [...sorted.slice(0, 2), `<details><summary>Other answers</summary><div class="choices">${sorted.slice(2).join('')}${happen}</div></details>`];
    el.hidden = false;
    el.innerHTML = `<p class="eyebrow">Next moment, unless something changes</p><h2>${esc(W[from].short)} is reaching for ${esc(W[to].short)}’s water.</h2><p>${esc(W[from].short)} went thirsty and shares no current with ${esc(W[to].short)}, which has plenty. You have this one moment.</p><div class="choices">${opts.join('')}</div>`;
    return;
  }
  const o = outlook(game, { type: 'rest' }, 2, arena), name = (ds: number[]) => ds.map(d => W[d].short).join(' and ');
  const first = o.dormant[0] ?? o.short[0] ?? o.spill[0];
  if (first === undefined || selected === first) { el.hidden = true; return; }
  el.hidden = false; el.classList.add('soft');
  el.innerHTML = `<p>${esc(o.dormant.length ? `${name(o.dormant)} will go dormant within two moments if nothing changes.` : o.short.length ? `${name(o.short)} will go thirsty within two moments if nothing changes.` : `${name(o.spill)} will spill used water within two moments if nothing changes.`)}</p><button type="button" class="jump" data-world="${first}">Listen to ${esc(W[first].short)}</button>`;
}
function renderPanel() {
  renderNotice();
  if (selected < 0) {
    const e = ending(game, arena);
    $('companion').innerHTML = e
      ? `<h1>${esc(e.title)}</h1><p class="lede">${esc(e.why[0])}</p><div class="choices"><button type="button" class="choice signature" id="see-ending"><span>How the journey went</span><small>What turned it, and what endured.</small></button></div>`
      : `<h1>Six worlds.<br><em>One basin.</em></h1><p class="lede">${game.beat ? 'Bring every world through the dark awake, and leave no holding near its limit when the journey ends.' : 'Each world uses water and can renew only some of it. What they cannot renew piles up, unless another world renews it for them.'}</p>
         <div class="choices">${game.beat ? '' : '<p class="nature">Choose a world to hear it out. Listening costs nothing. A choice passes one moment; so does letting it flow.</p>'}</div>`;
    return;
  }
  const d = selected, w = W[d], c = cond(d), bonds = linkedTo(game, d, arena), asking = c !== 'steady' || outlook(game, { type: 'rest' }, 2, arena).short.includes(d);
  const others = W.map((_, o) => o).filter(o => o !== d && !isLinked(game, edgeOf(d, o, arena)));
  const ranked = others.map(o => ({ o, why: unavailable(game, { type: 'connect', edge: edgeOf(d, o, arena) }, arena) })).map(x => ({ ...x, f: x.why ? -9 : foresee(game, { type: 'connect', edge: edgeOf(d, x.o, arena) }, arena).change })).sort((x, y) => y.f - x.f || x.o - y.o);
  const lead = ranked[0] && ranked[0].f > 0 ? ranked[0].o : -1;
  const tend = button({ type: 'care', world: d }, 'Tend it from the basin', tendDetail(d), asking ? 'urgent' : '');
  $('companion').innerHTML = `<button type="button" class="back" id="unselect">← The whole orbit</button><h1>${esc(w.name)}</h1><p class="voice">${esc(w.voice)}</p><p class="nature">${esc(w.nature)}</p>
    <p class="state ${c}"><i></i>${stateWord[c]}${activeAt(game, d) && !game.dormant[d] ? ` · ${esc(w.ability.toLowerCase())}, ${game.active[d] - game.beat} left` : ''}</p>
    <div class="gauges"><div class="gauge"><span>Clean water</span>${pips(game.clean[d], w.store, 'clean')}</div><div class="gauge"><span>Used, waiting</span>${pips(game.used[d], w.hold, 'used', strainLine(d, arena) - 1)}</div></div>
    <div class="choices"><button type="button" class="choice route-choice" data-draw="${d}" ${busy || game.outcome ? 'disabled' : ''}><span>Shape a current</span><small>Choose a neighbour on the orbit. Preview opening or resting a route.</small></button>${game.dormant[d] ? '' : abilityButtons(d)}${asking ? tend : ''}${lead >= 0 ? invite(d, lead) : ''}
      ${bonds.map(({ edge, other }) => { const by = game.bypass.find(b => b.edge === edge && b.until > game.beat);
        return `<div class="bond"><div><b>Current with ${esc(W[other].short)}</b><small>${by ? `A bypass · ${by.until - game.beat} ${by.until - game.beat === 1 ? 'moment' : 'moments'} left` : game.memory[edge] ? `Water has passed between them on ${game.memory[edge]} ${game.memory[edge] === 1 ? 'moment' : 'moments'}` : 'Open; nothing has passed yet'}</small></div>${by ? '' : `<button type="button" data-choice="${esc(JSON.stringify({ type: 'release', edge }))}" ${busy ? 'disabled' : ''} aria-label="Rest the current with ${esc(W[other].short)}">Rest it</button>`}</div>`; }).join('')}</div>
    <details><summary>Other possibilities · ${bonds.filter(b => game.links[b.edge]).length} of ${w.ports} ${w.ports === 1 ? 'port' : 'ports'} in use</summary><div class="choices">${ranked.filter(x => x.o !== lead).map(x => invite(d, x.o)).join('')}${asking ? '' : tend}</div></details>
    <details class="field-notes"${w.traits.some(t => fresh.includes(t.id)) ? ' open' : ''}><summary>Field notes${w.traits.some(t => fresh.includes(t.id)) ? ' · something new' : ''}</summary>${traits(d)}</details>`;
}
// One voice follows the visual response. No new advice competes with moving water.
function renderWhisper() {
  const el = $('whisper'), key = JSON.stringify(actions);
  const show = voices && !introPending && !game.outcome;
  if (held && (held.key !== key || !show || (held.w.id === 'hello' && selected >= 0))) { heard.add(held.w.id); held = null; saveVoices(); }
  if (show && !busy && !held) { const w = whisper(game, heard, selected, arena); if (w) held = { key, w }; }
  el.hidden = busy || !held;
  document.body.classList.toggle('has-voice', !el.hidden);
  W.forEach((_, d) => document.getElementById(`label-${d}`)?.classList.toggle('speaking', !el.hidden && held?.w.who === d));
  if (el.hidden) return;
  const { w } = held!, speaker = typeof w.who === 'number' ? W[w.who] : null;
  const contentKey = `${w.id}:${w.who}:${w.text}`;
  if (el.dataset.voice === contentKey) return; // Don't re-announce or replace a focused control on inspection.
  el.dataset.voice = contentKey;
  el.className = `whisper ${speaker ? `t${speaker.theme}` : 'from-basin'}`; el.dataset.who = String(w.who);
  el.innerHTML = `<div class="voice-message" role="status"><span class="who">${esc(speaker ? speaker.name : 'The Seventh Basin')}</span><p class="said">${esc(w.text)}</p></div><div class="voice-actions">${speaker ? `<button type="button" data-hear="${w.who}">Listen to ${esc(speaker.short)} <span aria-hidden="true">↗</span></button>` : ''}<button type="button" id="dismiss-voice" aria-label="Acknowledge this guidance without passing a moment">Heard</button></div>`;
}
function dismissVoice() {
  if (held) { heard.add(held.w.id); held = null; saveVoices(); }
  $('whisper').hidden = true; document.body.classList.remove('has-voice');
  document.querySelectorAll('.label.speaking').forEach(e => e.classList.remove('speaking')); renderControls(); focusPanel();
}
function renderChips() {
  $('chips').innerHTML = W.map((w, d) => `<button type="button" class="chip t${w.theme} ${cond(d)}${w.traits.some(t => fresh.includes(t.id)) ? ' news' : ''}" data-world="${d}" aria-pressed="${selected === d}" aria-label="${esc(`${w.name}, ${stateWord[cond(d)].toLowerCase()}`)}"><i></i>${esc(w.short)}</button>`).join('');
}
function renderLabels() {
  $('labels').innerHTML = W.map((w, d) => { const c = cond(d), el = activeAt(game, d) && !game.dormant[d];
    return `<div class="label t${w.theme} ${c}${el ? ' element' : ''}${d === selected ? ' sel' : ''}" id="label-${d}"><b>${esc(w.short)}</b><small>${c !== 'steady' ? c : el ? 'in its element' : ''}</small></div>`; }).join('');
}
function renderControls() {
  const over = !!game.outcome;
  ($('flow') as HTMLButtonElement).disabled = busy || over || routeFrom >= 0; $('flow').textContent = busy ? 'The water moves…' : over ? 'The journey is over' : 'Let it flow';
  ($('work') as HTMLButtonElement).disabled = over || (!working && (busy || !quiet())); $('work').setAttribute('aria-pressed', String(working));
  $('work').textContent = working ? 'Stop' : 'Let the currents work'; $('work').title = working ? '' : quiet() ? 'Passes moments until something needs you.' : 'Something needs you now, or is about to.';
  $('undo').hidden = !actions.length && !undone; $('undo').textContent = undone ? 'Undo restart' : 'Undo';
}
function render() {
  world?.update(scene()); renderPanel(); renderChips(); renderLabels(); renderControls(); renderWhisper();
  const next = Math.min(game.beat + 1, arena.length), sky = skyAt(next, arena);
  $('sky-name').textContent = `${SKY_NAME[sky]} · moment ${next} of ${arena.length}`;
  $('ribbon').innerHTML = Array.from({ length: arena.length }, (_, i) => { const b = i + 1, dark = skyAt(b, arena) === 'dark';
    return `${b === arena.dark[0] || b === arena.dark[1] + 1 ? '<i class="gap"></i>' : ''}<i class="${dark ? 'dark ' : ''}${b <= game.beat ? 'done' : b === next && !game.outcome ? 'now' : ''}"></i>`; }).join('');
  $('ribbon').setAttribute('aria-label', `Moment ${next} of ${arena.length}. The dark runs from moment ${arena.dark[0]} to ${arena.dark[1]}.`);
  $('sky-note').textContent = skyNote(game, arena);
  $('night').hidden = !game.night;
  $('night').innerHTML = `The night gathers ${Array.from({ length: arena.nightfall }, (_, i) => `<i class="${i < game.night ? 'on' : ''}"></i>`).join('')}`;
  $('moment-label').textContent = game.beat ? `After moment ${game.beat}` : 'Before the first moment';
  const spoken = game.last ? tell(game.last, game, arena) : [];
  // Keep urgent consequences visible even if several exchanges happened in the same moment.
  const important = spoken.filter(x => /thirsty|dormant|spilled|takes |Next moment|itself went/.test(x));
  const brief = important.length ? important.slice(0, 2) : spoken.slice(0, 2);
  $('story').textContent = notice || (game.last ? brief.join(' ') : (voices ? 'Nothing has been asked of the worlds yet.' : 'Ember will use more water than it can renew under this sky. Draw a current to another world, or listen first.'));
  $('read-moment').hidden = !game.last;
  $('read-moment').textContent = game.last?.learned.length ? `Read this moment · ${game.last.learned.length} ${game.last.learned.length === 1 ? 'discovery' : 'discoveries'}` : 'Read this moment';
  $('save-status').textContent = saving ? 'Saved on this device' : 'Storage unavailable · keep this tab open';
  document.body.dataset.sky = sky;
  document.body.classList.toggle('dawn', game.outcome === 'dawn');
}

// ---- the ending ------------------------------------------------------------------------------------
function showEnding() {
  const e = ending(game, arena); if (!e) return;
  const r = recount(actions, arena, known0), back = r.firstDormant ? Math.max(0, r.firstDormant - 4) : -1;
  const kept = r.bonds.length ? `<h3>Currents that endured</h3><ul>${r.bonds.map(b => `<li><b>${esc(b.text)}</b>: water passed between them on ${b.shared} ${b.shared === 1 ? 'moment' : 'moments'}</li>`).join('')}</ul>` : '<h3>Currents that endured</h3><p>None. Every world ended on its own.</p>';
  openDialog(`<p class="eyebrow">${esc(arena.name)} · ${game.beat} of ${arena.length} moments</p><h2>${esc(e.title)}</h2>${e.why.map((x, i) => `<p class="${i ? '' : 'strong'}">${esc(x)}</p>`).join('')}
    <h3>What turned the journey</h3>${r.points.length ? `<ul>${r.points.slice(0, 12).map(p => `<li><b>Moment ${p.moment}.</b> ${esc(p.text)}</li>`).join('')}</ul>` : '<p>Nothing was asked of the worlds, and nothing was offered.</p>'}
    ${kept}<p>${r.spilled ? `${r.spilled} water spilled out of the orbit. ` : 'No water was spilled. '}${r.learned ? `You saw ${r.learned} new ${r.learned === 1 ? 'thing' : 'things'} about these worlds, and they stay known.` : ''}</p>
    <div class="row"><button type="button" class="primary" id="again">Begin another journey</button>${back >= 0 ? `<button type="button" class="ghost" data-back="${back}">Go back to moment ${back + 1}, before ${esc(W[r.firstDormantWorld].short)} went dormant</button>` : ''}<button type="button" class="text" id="undo-end">Undo the last moment</button></div>`, `end-${e.outcome}`);
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
  if (b.id === 'meet-basin') { dialog.close(); openIntro(); return; }
  if (b.id === 'begin-guided' || b.id === 'begin-silent') { voices = b.id === 'begin-guided'; introPending = false; saveVoices(); intro.close(); intro.hidden = true; document.body.classList.remove('intro-open'); render(); focusPanel(); if (pendingEnd) { pendingEnd = false; showEnding(); } return; }
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
$('flow').addEventListener('click', () => act({ type: 'rest' }));
$('work').addEventListener('click', () => { if (working) stopWork(); else if (quiet()) { working = true; renderControls(); workOn(); } });
$('undo').addEventListener('click', () => {
  cancelRoute(); stopWork(); clearTimeout(timer); clearTimeout(resolutionTimer); world?.clearFeedback(); music.cancel(); pendingEnd = false; $('response-cue').hidden = true; document.body.classList.remove('resolving'); busy = false;
  if (undone) { known0 = undone.known; actions = undone.actions; undone = null; game = replay(actions, arena, known0); save(); render(); } else rewind(actions.length - 1);
});
$('restart').addEventListener('click', () => openDialog('<p class="eyebrow">Another beginning</p><h2>Begin again?</h2><p>This journey is set aside and a new one starts from the first moment. What you have learned about the worlds stays known. You can undo this straight afterwards.</p><div class="row"><button type="button" class="ghost" id="confirm-restart">Begin a new journey</button></div>'));
$('sound').addEventListener('click', async () => {
  const b = $('sound') as HTMLButtonElement; b.disabled = true;
  try { sounding = await music.enable(!sounding); b.textContent = sounding ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', String(sounding)); }
  catch { b.textContent = 'Sound unavailable'; sounding = false; } finally { b.disabled = false; }
});
$('guide').addEventListener('click', () => openDialog(`<p class="eyebrow">Keeper’s notes</p><h2>What the basin has told you.</h2>
  <div class="scroll"><table class="notes"><tbody>
  <tr><th>Who am I?</th><td>The keeper of the Seventh Basin: the shared water, and the seventh community that lives on it.</td></tr>
  <tr><th>Who lives here?</th><td>Six worlds on one orbit. Each uses water every moment and can make only part of it clean again. The rest waits in its holding.</td></tr>
  <tr><th>How long?</th><td>${arena.length} moments: an open sky, the dark (moments ${arena.dark[0]} to ${arena.dark[1]}, no rain), then the rain’s return.</td></tr>
  <tr><th>What can I do?</th><td>One thing a moment: ask two worlds to share a current, or rest one; tend a world from the basin; ask a world for what it does best; answer a dispute; or let it flow.</td></tr>
  <tr><th>What is free?</th><td>Listening. Choosing a world shows how it is, what you have learned of it, and what each choice would change over three moments.</td></tr>
  <tr><th>What goes wrong?</th><td>Used water piles up and spills out of the orbit. A world goes thirsty; twice running, it goes dormant until it holds water again.</td></tr>
  <tr><th>Why do worlds take?</th><td>A thirsty world with no current to a comfortable one reaches for its stores. It always says so one moment before.</td></tr>
  <tr><th>How is it lost?</th><td>The long night: the worlds spent ${arena.nightfall} moments dormant between them. The count shows from the first.</td></tr>
  <tr><th>The best ending?</th><td>A shared dawn: every world awake, no thirst in the last three moments, no holding nearly full. Anything less that completes the journey is a fragile peace.</td></tr>
  </tbody></table></div>
  <p>How each world behaves under each sky is for you to find. What you have seen stays written under that world.</p>
  <div class="row"><button type="button" class="ghost" id="toggle-voices">${voices ? 'Turn off written guidance' : 'Let the worlds guide me again'}</button></div>
  <p>Draw between planets to preview a current. Gold lights carry used water; blue lights carry clean water. Forecasts describe pressure over three moments, not every movement of water. Music is optional and independent of written guidance.</p>
  <button type="button" class="text" id="meet-basin">Meet the basin again</button>
  <p>Keys: Tab and Enter reach everything. Space lets a moment flow. Escape steps back. Every moment can be undone.</p>`));
$('ledger').addEventListener('click', () => {
  const m = game.last;
  openDialog(`<p class="eyebrow">The water · after moment ${game.beat}</p><h2>Where every drop is.</h2><div class="scroll"><table><thead><tr><th>World</th><th>Clean</th><th>Used</th><th>Uses next</th></tr></thead><tbody>${W.map((w, d) => `<tr><th>${esc(w.short)}</th><td>${game.clean[d]} of ${w.store}</td><td>${game.used[d]} of ${w.hold}</td><td>${game.dormant[d] ? 'dormant' : needAt(game, d, game.beat + 1, arena)}</td></tr>`).join('')}<tr><th>The basin</th><td>${game.basin} of ${arena.basin.capacity}</td><td>${game.reeds} of ${arena.basin.hold} in the reed beds</td><td>${arena.basin.need}</td></tr></tbody></table></div>
    <p class="strong">${m ? `${m.before} held + ${m.rain} rain + ${m.mist} mist − ${m.drunk} used by the basin community − ${m.spilled} spilled − ${m.cost} lost to a shelter or a seizure = ${m.after} held. ${m.renewed} used water was made clean.` : `${totalWater(game)} water is held in the orbit.`}</p>
    <p>Water enters only as rain and mist. It leaves only through the basin community’s own use, spills, and what a shelter or a seizure costs. No current creates water.</p>`);
});
document.addEventListener('keydown', e => {
  if (dialog.open || introPending) return;
  if (e.code === 'Space' && !(e.target as HTMLElement).closest('button, summary, a')) { e.preventDefault(); $('flow').click(); }
  if (e.key === 'Escape') { if (routeFrom >= 0) { cancelRoute(); focusPanel(); return; } stopWork(); if (selected >= 0) { selected = -1; world?.select(-1); renderPanel(); renderChips(); renderLabels(); } }
});
$('read-moment').addEventListener('click', () => {
  if (!game.last) return;
  const discoveries = game.last.learned.flatMap(id => W.flatMap(w => w.traits.filter(t => t.id === id).map(t => `${w.short}: ${t.text}`)));
  openDialog(`<p class="eyebrow">Moment ${game.beat} · ${SKY_NAME[game.last.sky]}</p><h2>${esc(momentTitle(game.last))}</h2>${tell(game.last, game, arena).map(x => `<p>${esc(x)}</p>`).join('')}${discoveries.length ? `<h3>What you noticed</h3><ul>${discoveries.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { stopWork(); world?.clearFeedback(); void music.suspend().catch(() => {}); }
  else { void music.resume().catch(() => {}); if (pendingEnd && !dialog.open && !introPending) { pendingEnd = false; showEnding(); } }
});
document.addEventListener('keydown', e => { if (working && e.key !== 'Tab') stopWork(); }, true);
document.addEventListener('pointerdown', e => { if (working && !(e.target as HTMLElement).closest('#work')) stopWork(); }, true);
const resize = new ResizeObserver(() => world?.resize()); resize.observe($('stage'));
let frame = 0;
function place() {
  if (world) W.forEach((_, d) => { const el = document.getElementById(`label-${d}`); if (!el) return; const p = world!.screenOf(d); el.style.transform = `translate(-50%, -100%) translate(${p.x}px, ${p.y}px)`; el.style.opacity = p.visible ? '1' : '0'; });
  frame = requestAnimationFrame(place);
}
window.addEventListener('pagehide', e => { if (e.persisted) return; cancelAnimationFrame(frame); resize.disconnect(); clearTimeout(timer); world?.dispose(); clearTimeout(resolutionTimer); void music.dispose(); });

// window.__MC = { actions?, select? } lets a headless browser open a given situation.
const auto = (window as unknown as { __MC?: { actions?: Choice[]; select?: number; end?: boolean; intro?: boolean; voices?: boolean } }).__MC;
if (auto) { actions = auto.actions ?? []; known0 = []; game = replay(actions, arena, known0); if (auto.select !== undefined) selected = auto.select; }
if (auto) { introPending = !!auto.intro; voices = auto.voices !== false; heard = new Set(); }
if (introPending) openIntro();
render(); world?.select(selected); place();
if (introPending) $('intro-title').focus({ preventScroll: true });
if (auto?.end && game.outcome) showEnding();
