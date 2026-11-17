// P0–P3: the 3D world is the game. Select a planet-ship, arm a move, read what you can know about it,
// commit, and watch the round resolve in four beats. Every rule lives in ../src, every sentence the
// player reads lives in ../web (forecast, beats, view, scenarios). This file only routes input and
// draws the HUD. The whole game is { world, actions }; everything else is recomputed by replay.
import './style.css';
import { withParams } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { kindOf, targetOf, listen, signal, strike, HIDE } from '../src/engine.ts';
import { evaluateSequence } from '../src/evaluate.ts';
import { solve, findWin, solveDawn } from '../src/search.ts';
import { DISTRICTS, LETTERS } from '../src/roster.ts';
import { play } from '../web/game.ts';
import type { Session, Played } from '../web/game.ts';
import { preview, threatLine, situation } from '../web/forecast.ts';
import type { Preview } from '../web/forecast.ts';
import { beatsOf, PHASES } from '../web/beats.ts';
import type { Beat } from '../web/beats.ts';
import { SCENARIOS } from '../web/scenarios.ts';
import type { Scenario } from '../web/scenarios.ts';
import { buildScene } from '../web/scene.ts';
import type { Scene } from '../web/scene.ts';
import { narrate, endingOf, reveal, possible, BAND } from '../web/view.ts';
import { createWorld } from './world.ts';
import type { PreviewKind } from './world.ts';
import { THEME_LIST } from './themes.ts';

const P = withParams({ preemption: 'threat', strikeMode: 'jam-once' }); // G1b threats + refined STRIKE + G1d one response
const OPTS = { rounds: P.rounds, basinMin: P.basinMin, integrityMax: P.integrity, exposureMax: P.exposure.max, targetable: P.exposure.targetable };
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

type Kind = 'L' | 'G' | 'K' | 'H';
const ACTS: { kind: Kind; key: string; title: string; hint: string; cls: string; fx: PreviewKind }[] = [
  { kind: 'L', key: 'L', title: 'Listen', hint: 'Learn its need and reserve. Silent.', cls: 'listen', fx: 'listen' },
  { kind: 'G', key: 'S', title: 'Signal', hint: 'Ask it to conserve for two rounds.', cls: 'signal', fx: 'offer' },
  { kind: 'K', key: 'K', title: 'Strike', hint: 'Jam its network move this round.', cls: 'strike', fx: 'strike' },
  { kind: 'H', key: 'H', title: 'Hide', hint: 'Go dark: exposure falls by 2.', cls: 'hide', fx: 'hide' },
];
const code = (k: Kind, d: number) => (k === 'L' ? listen(d) : k === 'G' ? signal(d) : k === 'K' ? strike(d) : HIDE);

// ---- state -------------------------------------------------------------------------------------
let session!: Session;
let shown!: Played;                 // what the HUD shows; lags the engine while a turn animates
let scenario: Scenario | null = null;
let selected = -1;
let armed: Kind | null = null;
let hovered: Kind | null = null;   // an action button under the pointer or focus: preview without arming
let turn: { round: number; beats: Beat[]; phase: number } | null = null;
let busy = false;
let evidence = false;

function themeNumber(): number { return session.seed ?? 7 + 13 * SCENARIOS.findIndex((s) => s.id === session.scenario); }
function freePlay(seed: number): Session { return { world: makeWorld(seed, P), params: P, actions: [], label: `World ${seed}`, seed, scenario: null }; }
function learning(sc: Scenario): Session { return { world: sc.world, params: P, actions: [], label: sc.title, seed: null, scenario: sc.id }; }

function start(s: Session, actions: number[] = []) {
  world?.skip();
  session = { ...s, actions: actions.slice() };
  scenario = SCENARIOS.find((x) => x.id === s.scenario) ?? null;
  shown = play(session);
  selected = -1; armed = null; hovered = null; turn = null; busy = false;
  try { window.history.replaceState(null, '', scenario ? `#learn-${scenario.id}` : `#world-${s.seed}`); } catch { /* sandboxed */ }
  $('ending').hidden = true;
  world?.select(-1); world?.preview(null);
  render();
}

// ---- the world ---------------------------------------------------------------------------------
let world: ReturnType<typeof createWorld> | null = null;
try {
  world = createWorld($('stage'), reduced, {
    pick(i) { if (!busy && !shown.over) choose(i >= 0 && i === selected ? -1 : i); },
    hover(i) { document.querySelectorAll('.label').forEach((el, d) => el.classList.toggle('hover', d === i)); },
  }, DISTRICTS);
} catch {
  $('stage').innerHTML = '<p class="nogl">This browser does not offer WebGL, so the planets cannot be drawn. The game still works from the panel, or <a href="./play/">play the simple version</a>.</p>';
}

// ---- input -------------------------------------------------------------------------------------
function choose(d: number) {
  selected = d;
  world?.select(d);
  render();
}
function arm(k: Kind | null) {
  if (busy || shown.over) return;
  if (k && k !== 'H' && selected < 0) { armed = null; flash('Choose a ship first: click a planet, or press A to F.'); return; }
  armed = armed === k ? null : k;
  render();
}
function actionNow(k: Kind | null): number | null {
  if (!k) return null;
  if (k === 'H') return HIDE;
  return selected >= 0 ? code(k, selected) : null;
}
function commit() {
  const a = actionNow(armed);
  if (a === null || busy || shown.over) return;
  const before = shown.history[shown.history.length - 1];
  session.actions.push(a);
  const next = play(session);
  const r = next.history[next.history.length - 1];
  turn = { round: r.round, beats: beatsOf(r, { flow: before.flow, integrity: before.integrity }, P.basinMin), phase: 0 };
  armed = null; hovered = null; busy = true;
  world?.preview(null);
  render();
  const apply = () => { shown = next; renderStatus(); renderWorld(); };
  const onPhase = (ph: number) => { if (turn) turn.phase = ph; renderStory(); };
  const mine = session;
  const done = () => {
    if (session !== mine) return; // a new world was started mid-turn
    busy = false; if (turn) turn.phase = 5;
    shown = next; render();
    if (next.over) setTimeout(() => { if (session === mine && $('menu').hidden) showEnding(); }, reduced ? 0 : 500);
  };
  if (world) world.play(turn.beats, { from: before.flow, to: r.flow }, apply, onPhase, done);
  else { apply(); onPhase(4); done(); }
}
function cancel() {
  if (armed) { armed = null; render(); return; }
  if (selected >= 0) choose(-1);
}
let flashTimer = 0;
function flash(text: string) {
  const el = $('coach'); el.hidden = false; el.innerHTML = `<span class="goal">Note</span>${esc(text)}`;
  clearTimeout(flashTimer); flashTimer = window.setTimeout(renderCoach, 2600);
}

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const overlay = !$('menu').hidden || !$('ending').hidden;
  if (e.key === 'Escape') { if (!$('menu').hidden) { closeMenu(); return; } if (overlay) return; cancel(); return; }
  if (overlay) return;
  if (busy) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); world?.skip(); } return; }
  const k = e.key.toUpperCase();
  const d = LETTERS.slice(0, DISTRICTS).indexOf(k);
  if (d >= 0 && k.length === 1) { choose(d === selected ? -1 : d); return; }
  if (/^[1-9]$/.test(e.key) && Number(e.key) <= DISTRICTS) { const n = Number(e.key) - 1; choose(n === selected ? -1 : n); return; }
  const act = ACTS.find((x) => x.key === k);
  if (act) { arm(act.kind); return; }
  if (e.key === 'Enter' && armed && (e.target as HTMLElement).tagName !== 'BUTTON') { e.preventDefault(); commit(); }
});

document.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).closest('button');
  if (!t) return;
  const ds = t.dataset;
  if (ds.ship !== undefined) { const d = Number(ds.ship); choose(d === selected ? -1 : d); }
  else if (ds.act) arm(ds.act as Kind);
  else if (ds.do === 'commit') commit();
  else if (ds.do === 'cancel') cancel();
  else if (ds.do === 'skip') world?.skip();
  else if (ds.do === 'evidence') { evidence = !evidence; renderStory(); }
  else if (ds.do === 'replay') start(session, []);
  else if (ds.do === 'new') start(freePlay(1000 + Math.floor(Math.random() * 90000)));
  else if (ds.do === 'menu') openMenu();
  else if (ds.do === 'close') closeMenu();
  else if (ds.learn) briefing(SCENARIOS.find((s) => s.id === ds.learn)!);
  else if (ds.begin) { closeMenu(); start(learning(SCENARIOS.find((s) => s.id === ds.begin)!)); }
  else if (ds.do === 'free') { closeMenu(); start(freePlay(1000 + Math.floor(Math.random() * 90000))); }
});
for (const ev of ['pointerover', 'focusin'] as const) document.addEventListener(ev, (e) => {
  const t = (e.target as HTMLElement).closest('button[data-act]') as HTMLButtonElement | null;
  const k = t && !t.disabled ? (t.dataset.act as Kind) : null;
  if (k !== hovered) { hovered = k; renderMove(); }
});
for (const ev of ['pointerout', 'focusout'] as const) document.addEventListener(ev, (e) => {
  const t = (e.target as HTMLElement).closest('button[data-act]');
  const to = (e as PointerEvent | FocusEvent).relatedTarget as HTMLElement | null;
  if (t && !(to && to.closest('button[data-act]'))) { hovered = null; renderMove(); }
});
$('open-menu').addEventListener('click', openMenu);
$('restart').addEventListener('click', () => start(session, []));
addEventListener('resize', () => world?.resize());
addEventListener('hashchange', route);

// ---- rendering ---------------------------------------------------------------------------------
const lastOf = (p: Played) => p.history[p.history.length - 1];
function sceneOf(p: Played): Scene { return buildScene(themeNumber(), p.history, { ...OPTS, selected }); }

function render() { renderWorld(); renderStatus(); renderMove(); renderStory(); renderCoach(); }

function renderWorld() {
  const sc = sceneOf(shown);
  world?.update(sc);
  const struck = situation(shown.history, P).struckByStation;
  $('labels').innerHTML = sc.systems.map((s) => {
    const tags = [BAND[s.band]];
    if (s.inAgreement) tags.push('agreed');
    if (s.threatening) tags.push('<em class="hot">threatening</em>');
    if (s.threatened) tags.push('<em class="hot">threatened</em>');
    if (s.distress) tags.push('<em class="hot">distress</em>');
    if (struck[s.id]) tags.push('<em class="warm">struck</em>');
    return `<div class="label${s.selected ? ' sel' : ''}" id="lab-${s.id}"><b>${s.letter}</b><i>${esc(THEME_LIST[s.theme].name)}</i><span>${tags.join(' · ')}</span></div>`;
  }).join('');
  const k = armed ? ACTS.find((x) => x.kind === armed)! : null;
  if (!busy) world?.preview(k ? { kind: k.fx, target: k.kind === 'H' ? -1 : selected } : null);
}

function pips(n: number, max: number, cls: (i: number) => string) { return Array.from({ length: max }, (_, i) => `<i class="${cls(i)}"></i>`).join(''); }

function renderStatus() {
  const last = lastOf(shown), st = shown.state;
  const round = Math.min(last.round + 1, P.rounds);
  $('mode').textContent = scenario ? `Learning world ${SCENARIOS.indexOf(scenario) + 1} of ${SCENARIOS.length}` : 'Free play';
  $('where').textContent = session.label;
  $('round').innerHTML = pips(P.rounds, P.rounds, (i) => (i < last.round ? 'done' : i === last.round && !shown.over ? 'now' : '')) +
    `<span>${shown.over ? (st.status === 'won' ? 'Survived' : 'Over') : `${round} of ${P.rounds}`}</span>`;

  const pv = currentPreview();
  const short = last.flow < P.basinMin, counted = last.round > 0;
  const scale = Math.max(P.basinMin * 1.6, last.flow + 6);
  const w = (x: number) => `${Math.max(0, Math.min(100, (100 * x) / scale)).toFixed(1)}%`;
  const basinNote = !counted ? `Before you arrived the basin received ${last.flow}. It needs ${P.basinMin} each round.`
    : short ? (situation(shown.history, P).shortStreak ? `Short last round. One more short round and it collapses.` : `Short.`) : `Holding.`;
  $('basin').innerHTML = `<div class="row"><span class="num ${short && counted ? 'bad' : ''}">${last.flow}<small> received · needs ${P.basinMin}</small></span></div>
    <div class="bar"><div class="fill${short ? ' short' : ''}" data-w="${w(last.flow)}"></div>${pv && pv.basin.upTo > 0 ? `<div class="ghost" data-l="${w(last.flow)}" data-w="${w(pv.basin.upTo)}"></div>` : ''}<div class="min" data-l="${w(P.basinMin)}"></div></div>
    <p class="note ${short && counted ? 'warnline' : ''}">${esc(pv ? pv.basin.note : basinNote)}</p>`;
  $('basin').querySelectorAll<HTMLElement>('[data-w],[data-l]').forEach((el) => { if (el.dataset.w) el.style.width = el.dataset.w; if (el.dataset.l) el.style.left = el.dataset.l; });

  const integ = Math.max(0, last.integrity), x = last.exposure;
  const after = pv ? pv.exposure.after : x;
  const exCls = (i: number) => [i < Math.min(x, after) ? 'on' : i < Math.max(x, after) ? 'ghost' : '', i === P.exposure.targetable - 1 || i === P.exposure.max - 1 ? 'mark' : ''].join(' ');
  $('station').innerHTML = `<div class="row"><span>Integrity</span><span class="pips">${pips(integ, P.integrity, (i) => (i < integ ? 'on' : 'lost'))}</span></div>
    <div class="row"><span>Exposure ${x}${pv && after !== x ? ` → ${after}` : ''} of ${P.exposure.max}</span><span class="pips exp">${pips(x, P.exposure.max, exCls)}</span></div>
    <p class="note ${x >= P.exposure.targetable ? 'warnline' : ''}">${x >= P.exposure.max ? 'Fully exposed: some ships fire on you unprovoked.' : x >= P.exposure.targetable ? 'Visible: struck ships can hit you back.' : 'Hidden from the others.'}</p>`;

  const tl = shown.over ? null : threatLine(shown.history, P);
  $('threat').hidden = !tl;
  if (tl) $('threat').innerHTML = `<b>Threat.</b> ${esc(tl)}`;
}

function currentPreview(): Preview | null {
  if (busy || shown.over) return null;
  const a = actionNow(hovered ?? armed);
  return a === null ? null : preview(a, shown.history, P);
}

function renderMove() {
  const over = shown.over;
  const sc = sceneOf(shown), sit = situation(shown.history, P);
  $('ships').innerHTML = sc.systems.map((s) => {
    const mk = s.distress ? '<span class="mk bad">distress</span>' : s.threatened ? '<span class="mk bad">threat</span>' : s.inAgreement ? '<span class="mk">agreed</span>' : '<span class="mk"></span>';
    const label = `Ship ${s.letter}, drawing ${BAND[s.band]}${s.inAgreement ? ', in agreement' : ''}${s.threatened ? ', threatened' : ''}${s.threatening ? ', threatening' : ''}${s.distress ? ', in distress' : ''}`;
    return `<button type="button" class="ship" data-ship="${s.id}" aria-pressed="${s.id === selected}" aria-label="${esc(label)}" ${busy || over ? 'disabled' : ''}><b>${s.letter}</b><span class="bars">${[0, 1, 2].map((b) => `<i class="${b <= s.band ? 'on' : ''}"></i>`).join('')}</span>${mk}</button>`;
  }).join('');

  if (selected >= 0) {
    const s = sc.systems[selected];
    const facts: [string, string][] = [];
    facts.push(['', `Drawing ${BAND[s.band]} (${s.bandTrail.slice(1).map((b) => BAND[b][0].toUpperCase()).join(' ') || 'no rounds yet'}).`]);
    if (s.heard) facts.push(['', `When you listened in round ${s.heard.round}: needed ${s.heard.need}, held ${s.heard.reserve}.`]); else facts.push(['', 'You have not listened to it.']);
    if (s.inAgreement) facts.push(['warm', 'Living on its reserve under your agreement.']);
    const rep = sit.lastReply[selected];
    if (rep) facts.push(['', `Last answer to you: ${rep === 'accepted' ? 'agreed' : rep === 'lacks' ? 'too little stored' : 'declined'}.`]);
    if (s.threatening) facts.push(['hot', `Threatening ${LETTERS[sit.threat!.to]}.`]);
    if (s.threatened) facts.push(['hot', `Threatened by ${LETTERS[sit.threat!.from]}.`]);
    if (s.distress) facts.push(['hot', 'Could not meet its need last round.']);
    if (sit.struckByStation[selected]) facts.push(['hot', 'You struck it. It refuses your offers.']);
    $('card').innerHTML = `<div class="shipcard"><h2>${s.letter} <i>${esc(THEME_LIST[s.theme].name)}</i></h2><ul class="facts">${facts.map(([c, t]) => `<li class="${c}">${esc(t)}</li>`).join('')}</ul></div>`;
  } else {
    $('card').innerHTML = `<p class="empty">${over ? 'The game is over.' : 'Choose a ship: click a planet, a letter above, or press A to F. Hide needs no ship.'}</p>`;
  }

  $('acts').innerHTML = ACTS.map((a) => {
    const off = busy || over || (a.kind !== 'H' && selected < 0);
    return `<button type="button" class="act ${a.cls}" data-act="${a.kind}" aria-pressed="${armed === a.kind}" ${off ? 'disabled' : ''}><span class="t">${a.title}${a.kind !== 'H' && selected >= 0 ? ` ${LETTERS[selected]}` : ''}<kbd>${a.key}</kbd></span><span class="h">${a.hint}</span></button>`;
  }).join('');

  const pv = currentPreview();
  const li = (cls: string, tag: string, xs: string[]) => xs.map((x) => `<li class="${cls}"><span>${tag}</span>${esc(x)}</li>`).join('');
  $('preview').innerHTML = pv
    ? `<h3>${esc(pv.title)}${hovered && hovered !== armed ? ' <small class="note">preview</small>' : ''}</h3><ul>${li('k', 'Will', pv.known)}${li('c', 'If', pv.conditional)}${li('u', 'Unknown', pv.unknown)}</ul>`
    : `<p class="hint">${over ? '' : busy ? 'The round is resolving.' : 'Point at a move to see what you can know about it before you commit.'}</p>`;

  const a = actionNow(armed);
  $('commit').hidden = a === null || busy || over;
  if (a !== null && pv) $('commit').innerHTML = `<button type="button" class="go" data-do="commit">Commit: ${esc(preview(a, shown.history, P).title)} <kbd>Enter</kbd></button><button type="button" class="no" data-do="cancel">Cancel</button>`;
}

function renderStory() {
  const last = lastOf(shown);
  let html = '';
  if (turn) {
    const ph = turn.phase;
    html += `<h2><span>Round ${turn.round}</span>${busy ? '<button type="button" data-do="skip">Skip <kbd>Space</kbd></button>' : ''}</h2>`;
    html += `<div class="phases">${PHASES.map((t, i) => `<span class="${i + 1 === ph ? 'on' : i + 1 < ph ? 'past' : ''}">${i + 1} ${t}</span>`).join('')}</div>`;
    html += `<ul class="beats">${turn.beats.map((b) => `<li class="${b.good === true ? 'good' : b.good === false ? 'bad' : ''}${b.phase > ph ? ' pending' : ''}">${esc(b.text)}</li>`).join('')}</ul>`;
  } else if (last.round > 0) {
    // Arrived mid-game (a replayed link): the last round as settled beats.
    const prev = shown.history[shown.history.length - 2];
    html += `<h2><span>Round ${last.round}</span></h2><ul class="beats">${beatsOf(last, { flow: prev.flow, integrity: prev.integrity }, P.basinMin).map((b) => `<li class="${b.good === true ? 'good' : b.good === false ? 'bad' : ''}">${esc(b.text)}</li>`).join('')}</ul>`;
  } else {
    html += `<h2><span>Before you arrived</span></h2><ul class="beats">${narrate(last, P.basinMin, false).map((l) => `<li class="${l.tone === 'harm' ? 'bad' : ''}">${esc(l.text)}</li>`).join('')}</ul>`;
  }
  if (!busy && shown.history.length > 1) {
    html += `<div class="record"><button type="button" data-do="evidence" aria-expanded="${evidence}">${evidence ? 'Hide' : 'Show'} the full record</button>`;
    if (evidence) html += shown.history.map((h, i) => `<h3>${h.round === 0 ? 'Before you arrived' : `Round ${h.round}`}</h3><ul>${narrate(h, P.basinMin, i > 1 && shown.history[i - 1].flow < P.basinMin).map((l) => `<li>${esc(l.text)}</li>`).join('')}</ul>`).join('');
    html += '</div>';
  }
  $('story').innerHTML = html;
}

function renderCoach() {
  const el = $('coach');
  const round = lastOf(shown).round + 1;
  let text = '', goal = '';
  if (scenario && !shown.over) { goal = scenario.goal; text = scenario.hints[round] ?? ''; }
  else if (!scenario && !shown.over && round === 1 && selected < 0) { goal = 'How to play'; text = 'Choose a ship, choose a move, read what you can and cannot know, then commit. One move a round, six rounds.'; }
  el.hidden = !text && !goal;
  if (!el.hidden) el.innerHTML = `<span class="goal">${esc(goal)}</span>${esc(text)}`;
}

// ---- ending ------------------------------------------------------------------------------------
function showEnding() {
  const w = session.world;
  const ev = evaluateSequence(w, P, session.actions);
  const E = endingOf(ev.ledger), L = ev.ledger, rv = reveal(w);
  const sheet = $('ending-sheet');
  sheet.className = `sheet ${E.ending}`;
  const nextLearn = scenario ? SCENARIOS[SCENARIOS.indexOf(scenario) + 1] : null;
  sheet.innerHTML = `
    <p class="eyebrow">${esc(session.label)} · ${shown.state.status === 'won' ? 'six rounds survived' : `ended in round ${L.legacy.endedRound}`}</p>
    <h2 id="end-title" tabindex="-1">${E.title}</h2>
    <p>${esc(E.why)}</p>
    ${scenario ? `<p class="lesson"><b>What this world teaches.</b> ${esc(scenario.lesson)}</p>` : ''}
    <ul class="detail">${E.detail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3>What was hidden from you</h3>
    <div class="scroll"><table class="reveal"><thead><tr><th>Ship</th><th>Kind of world</th><th>Stored, start → end</th><th>Went short by</th></tr></thead><tbody>
    ${rv.map((r, d) => `<tr><th scope="row">${r.letter}</th><td><b>${esc(r.family)}</b><br><small>${esc(r.note)}</small></td><td>${L.district.reserveInitial[d]} → ${L.district.reserveFinal[d]}</td><td>${L.district.hardship[d]}</td></tr>`).join('')}
    </tbody></table></div>
    <h3>With full knowledge, which you did not have</h3>
    <p class="note">These lines come from searching every possible game with the hidden kinds above in view. No player could have seen them while playing.</p>
    <ul class="detail" id="possible"><li>Searching every possible game for this world…</li></ul>
    <div class="btnrow">
      ${nextLearn ? `<button type="button" class="go" data-learn="${nextLearn.id}">Next: ${esc(nextLearn.title)}</button>` : `<button type="button" class="go" data-do="new">New world</button>`}
      <button type="button" data-do="replay">Play this world again</button>
      <button type="button" data-do="menu">All worlds</button>
    </div>`;
  $('ending').hidden = false;
  sheet.scrollTop = 0;
  ($('end-title') as HTMLElement).focus({ preventScroll: true });
  setTimeout(() => {
    const sol = solve(w, P);
    const line = sol.wins ? findWin(w, P, (a) => kindOf(a) !== 'K') ?? findWin(w, P, () => true) : null;
    const dd = solveDawn(w, P);
    const dawn = !dd.survivable ? [] : [dd.dawn ? (dd.dawnWithoutThird ? 'A Shared Dawn was reachable, and without a single strike.' : 'A Shared Dawn was reachable, but only with a strike.') : 'No Shared Dawn was reachable: every surviving game puts some ship through distress.'];
    const el = document.getElementById('possible');
    if (el) el.innerHTML = [...possible(P, sol, line), ...dawn].map((x) => `<li>${esc(x)}</li>`).join('');
  }, 40);
}

// ---- worlds menu -------------------------------------------------------------------------------
let returnFocus: HTMLElement | null = null;
function openMenu() {
  returnFocus = document.activeElement as HTMLElement | null;
  $('ending').hidden = true;
  $('menu-sheet').innerHTML = `
    <p class="eyebrow">The Dark Microcosmos</p>
    <h2 id="menu-title">Choose a world</h2>
    <p class="howto">Six planet-ships draw from one river. The <b>Seventh Basin</b> below lives on what they leave, and it needs ${P.basinMin} a round: two short rounds in a row and it collapses. Your station sits at the centre. Each round you make <b>one move</b>, and each ship answers by its own hidden nature. Survive six rounds.</p>
    <div class="worlds">
      ${SCENARIOS.map((s, i) => `<button type="button" data-learn="${s.id}"><em>Learning world ${i + 1}</em><b>${esc(s.title)}</b><span>${esc(s.goal)}</span></button>`).join('')}
      <button type="button" data-do="free"><em>Free play</em><b>A random world</b><span>Hidden kinds, no hints. Every world number is its own puzzle.</span></button>
    </div>
    <div class="btnrow"><button type="button" data-do="close">Close <kbd>Esc</kbd></button></div>`;
  $('menu').hidden = false;
  ($('menu-sheet').querySelector('button') as HTMLElement).focus();
}
function briefing(sc: Scenario) {
  $('ending').hidden = true;
  $('menu-sheet').innerHTML = `
    <p class="eyebrow">Learning world ${SCENARIOS.indexOf(sc) + 1} of ${SCENARIOS.length}</p>
    <h2 id="menu-title">${esc(sc.title)}</h2>
    <p>${esc(sc.brief)}</p>
    <p class="lesson"><b>Goal.</b> ${esc(sc.goal)}</p>
    <div class="btnrow"><button type="button" class="go" data-begin="${sc.id}">Begin</button><button type="button" data-do="menu">Back</button></div>`;
  $('menu').hidden = false;
  ($('menu-sheet').querySelector('button.go') as HTMLElement).focus();
}
function closeMenu() { $('menu').hidden = true; (returnFocus ?? document.body).focus?.(); }

// ---- labels follow their planets ---------------------------------------------------------------
function placeLabels() {
  if (world) for (let i = 0; i < DISTRICTS; i++) {
    const el = document.getElementById(`lab-${i}`); if (!el) continue;
    const p = world.screenOf(i);
    el.style.transform = `translate(-50%,-100%) translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px)`;
    el.style.opacity = p.visible ? '1' : '0';
  }
  requestAnimationFrame(placeLabels);
}

// ---- routes ------------------------------------------------------------------------------------
// #world-1005 free play · #learn-river a learning world · nothing: the River behind the menu.
function route() {
  const w = /^#world-(\d{1,6})$/.exec(location.hash), l = /^#learn-([a-z]+)$/.exec(location.hash);
  if (w) { if (session?.seed !== Number(w[1])) start(freePlay(Number(w[1]))); return true; }
  const sc = l && SCENARIOS.find((s) => s.id === l[1]);
  if (sc) { if (session?.scenario !== sc.id) start(learning(sc)); return true; }
  return false;
}

// window.__DM3D = { seed?, scenario?, actions?, select?, arm?, menu? } drives headless screenshots.
const auto = (window as any).__DM3D as { seed?: number; scenario?: string; actions?: number[]; select?: number; arm?: Kind; menu?: boolean; end?: boolean } | undefined;
if (auto) {
  const sc = auto.scenario ? SCENARIOS.find((s) => s.id === auto.scenario) : undefined;
  start(sc ? learning(sc) : freePlay(auto.seed ?? 1005), auto.actions ?? []);
  if (auto.select !== undefined) choose(auto.select);
  if (auto.arm) arm(auto.arm);
  if (auto.menu) openMenu();
  if (auto.end && shown.over) showEnding();
} else if (!route()) {
  start(learning(SCENARIOS[0]));
  openMenu();
}
placeLabels();
