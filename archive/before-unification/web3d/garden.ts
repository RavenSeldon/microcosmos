import './garden.css';
import { FIRST_ARENA as arena } from '../src/arenas.ts';
import { initialConstellation, replayConstellation, advance, pairs, weatherAt, position, needs, activeAt, isLinked, unavailable, bypassEdge, totalWater } from '../src/constellation.ts';
import type { Choice, Constellation } from '../src/constellation.ts';
import { createWorld } from './world.ts';
import type { Scene } from '../web/scene.ts';

const $ = (id: string) => document.getElementById(id)!;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const worlds = arena.worlds, routes = pairs(arena);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const KEY = `microcosmos.constellation.${arena.id}.v${arena.version}`;
let actions: Choice[] = [], state = initialConstellation(arena), selected = -1, saving = true, recoveryNotice = '';
let savedRaw = '', unreadableSave = '';
try {
  savedRaw = localStorage.getItem(KEY) ?? '';
  if (savedRaw) {
    const data: unknown = JSON.parse(savedRaw);
    if (!Array.isArray(data) || data.length > 4000) throw new Error('Invalid journal');
    // Replay validates both action shape and whether each decision was possible at that moment.
    state = replayConstellation(data, arena); actions = data;
  }
} catch {
  if (savedRaw) { unreadableSave = savedRaw; recoveryNotice = 'The saved orbit could not be read. A fresh orbit is ready; the earlier save will be backed up before a new decision is saved.'; }
  else { saving = false; recoveryNotice = 'Device storage is unavailable. You can still play and undo while this tab stays open.'; }
}
let next = advance(state, { type: 'rest' }, arena), later = advance(next, { type: 'rest' }, arena);
let world: ReturnType<typeof createWorld> | null = null;
let busy = false, timer = 0, beforeRestart: Choice[] | null = null;
let audio: AudioContext | null = null, sounding = false;
const linked = (d: number) => routes.flatMap(([x, y], e) => (x === d || y === d) && isLinked(state, e) ? [e] : []);
function mood(d: number) {
  if (state.last?.unmet[d]) return 'Recovering from a shortage';
  if (next.last!.unmet[d]) return 'Needs help next moment';
  if (later.last!.unmet[d]) return 'Reserves will run thin soon';
  if (state.grievance[d] >= state.beat + 1) return 'Taking some distance';
  if (activeAt(state, d)) return `${worlds[d].ability} · ${state.active[d] - state.beat} left`;
  if (worlds[d].archetype === 'forge' && needs(state, state.beat + 1, arena)[d] > worlds[d].need) return 'Living through the heat';
  return linked(d).length ? 'Keeping its commitments' : 'Following its own rhythm';
}
function scene(): Scene {
  return { circulation: true, world: 0, round: state.beat, rounds: arena.seasonLength,
    station: { exposure: 0, exposureMax: 4, targetable: false, integrity: 0, integrityMax: 3 },
    basin: { flow: state.basin, minimum: arena.basin.reserve + arena.basin.need, short: state.basin < 8, counted: true },
    systems: worlds.map((w, d) => ({ id: d, letter: w.short, band: state.last?.unmet[d] ? 0 : 1, bandTrail: [],
      distress: !!state.last?.unmet[d] || !!next.last!.unmet[d] || !!later.last!.unmet[d], inAgreement: linked(d).length > 0,
      threatened: state.threat?.to === d, threatening: state.threat?.from === d, selected: d === selected, heard: null, theme: w.theme })),
    links: [...routes.flatMap(([from, to], e) => isLinked(state, e) ? [{ kind: 'current' as const, from, to }] : []),
      ...(state.threat ? [{ kind: 'threat' as const, from: state.threat.from, to: state.threat.to }] : [])],
  };
}
try { world = createWorld($('stage'), reduced, { pick(d) { choose(d); } }, worlds.length); }
catch { $('stage').innerHTML = '<div class="sky-fallback"><span>✧</span><p>Six worlds. The same living orbit.<br>Choose a world below to begin.</p></div>'; document.body.classList.add('without-webgl'); }
function choose(d: number) {
  selected = selected === d ? -1 : d; world?.select(selected); renderCompanion(); renderChoices();
  focusCompanion();
  if (selected >= 0 && matchMedia('(max-width: 740px)').matches) $('companion').scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
}
function focusCompanion() { const h = $('companion').querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } }
function save() {
  try {
    // Never silently replace an unreadable journal. If backup storage fails, leave it intact.
    if (unreadableSave) { localStorage.setItem(`${KEY}.recovery.${Date.now()}`, unreadableSave); unreadableSave = ''; }
    localStorage.setItem(KEY, JSON.stringify(actions)); saving = true; recoveryNotice = '';
  } catch { saving = false; }
}
function chime() {
  if (!sounding || !audio) return;
  void audio.resume(); const now = audio.currentTime;
  const root = selected < 0 ? 146.83 : [130.81, 174.61, 196, 146.83, 220, 164.81][worlds[selected].theme];
  [root, root * 1.5, root * 2].forEach((hz, i) => {
    const osc = audio!.createOscillator(), gain = audio!.createGain(); osc.type = 'sine'; osc.frequency.value = hz;
    gain.gain.setValueAtTime(0, now + i * .14); gain.gain.linearRampToValueAtTime(.025, now + i * .14 + .07); gain.gain.exponentialRampToValueAtTime(.0001, now + i * .14 + 1.5);
    osc.connect(gain).connect(audio!.destination); osc.start(now + i * .14); osc.stop(now + i * .14 + 1.6); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  });
}
const dialog = $('dialog') as HTMLDialogElement;
let dialogFocus: HTMLElement | null = null;
function openDialog(html: string) {
  dialogFocus = document.activeElement as HTMLElement; $('dialog-content').innerHTML = html;
  const heading = $('dialog-content').querySelector('h2')!;
  heading.id = 'dialog-title'; heading.tabIndex = -1; dialog.setAttribute('aria-labelledby', heading.id);
  dialog.showModal(); heading.focus({ preventScroll: true }); dialog.scrollTop = 0;
}
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (dialogFocus?.isConnected) dialogFocus.focus(); else focusCompanion(); });
function act(c: Choice) {
  if (busy) return;
  const reason = unavailable(state, c, arena);
  if (reason) { openDialog(`<h2>A moment to reconsider.</h2><p>${escape(reason)}</p>`); return; }
  if (actions.length >= 4000) { openDialog('<h2>A full journal.</h2><p>This orbit has reached its save limit. Begin a fresh season to continue playing.</p>'); return; }
  beforeRestart = null; state = advance(state, c, arena); actions.push(c); save();
  busy = !reduced; if (dialog.open) dialog.close(); render(); world?.flow(state.last!.transfers); chime(); focusCompanion();
  clearTimeout(timer); timer = window.setTimeout(() => {
    busy = false;
    // Keep focus and expanded alternatives intact when the short visual beat ends.
    document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => {
      const c = choiceFrom(b); b.disabled = !!unavailable(state, c, arena);
    });
    renderControls();
  }, reduced ? 0 : 900);
}
function button(c: Choice, title: string, detail: string, cls = 'invitation-button') {
  const reason = unavailable(state, c, arena);
  if (!reason && c.type === 'ability') {
    const forecast = advance(state, c, arena);
    const short = worlds.filter((_, d) => forecast.last!.unmet[d]);
    if (short.length) detail += ` ${short.map(w => w.short).join(' and ')} would still go short this moment.`;
  }
  const attr = 'edge' in c ? `data-edge="${c.edge}"` : 'world' in c ? `data-target="${c.world}"` : '';
  return `<button class="${cls}" data-action="${c.type}" ${attr} ${busy || reason ? 'disabled' : ''}><span>${escape(title)} <i aria-hidden="true">↗</i></span><small>${escape(reason ?? detail)}</small></button>`;
}
function abilityDetail(d: number) {
  if (worlds[d].archetype === 'prism') {
    const e = bypassEdge(state, d, arena);
    return e === undefined ? worlds[d].effect : `A three-moment bypass to ${worlds[routes[e].find(x => x !== d)!].short}, beyond the usual port limit.`;
  }
  if (worlds[d].archetype === 'shifter') return weatherAt(state.beat + 1, arena) === 'dry' ? 'Switch to mist-catching for three moments. There is no mist in the dry: local recovery will fall until the weather turns.' : 'Trade mist collection for stronger local recovery for three moments. Less fresh water reaches the basin.';
  return worlds[d].effect;
}
function renderChoices() {
  $('world-choices').innerHTML = worlds.map((w, d) => `<button class="world-choice theme-${w.theme}" data-world="${d}" aria-pressed="${selected === d}"><span class="world-dot" aria-hidden="true"></span><span><b>${escape(w.name)}</b><small>${escape(mood(d))}</small></span></button>`).join('');
}
function renderCompanion() {
  if (selected < 0) {
    $('companion').innerHTML = `<h1>${state.dawn ? 'A shared dawn.<br><em>Still becoming.</em>' : 'Different worlds.<br><em>A living whole.</em>'}</h1>
      <p class="opening">${state.dawn ? 'You carried every community through a season. The relationships are yours; the next season is still open.' : 'Six temperaments. Six ways to survive. Shape the currents between them, or help a world stand on its own.'}</p>
      <div class="invitation"><span class="small-star" aria-hidden="true">✧</span><p>Choose a world. Hear it out.<br>One decision, then let it breathe.</p></div>
      <div class="quiet-rule"></div><p class="small-copy">${state.beat === 0 ? 'Try Ember’s forge, or introduce it to Verdance. Both renew water; they create different possibilities.' : 'Your aim: bring all seven communities through the season. Alliances are one way to build resilience. No clock runs while you think.'}</p>
      <button class="text-button" id="arena-info">${escape(arena.name)} · about this arena ↗</button>`;
    return;
  }
  const d = selected, w = worlds[d], connections = linked(d);
  const invitations = routes.map(([x, y], e) => ({ e, other: x === d ? y : y === d ? x : -1 })).filter(x => x.other >= 0 && !isLinked(state, x.e));
  // Put a viable, complementary relationship first. All alternatives stay available on request.
  invitations.sort((x, y) => Number(!!unavailable(state, { type: 'connect', edge: x.e }, arena)) - Number(!!unavailable(state, { type: 'connect', edge: y.e }, arena)) || worlds[y.other].reclaim - worlds[x.other].reclaim || x.e - y.e);
  const invite = ({ e, other }: typeof invitations[number]) => button({ type: 'connect', edge: e }, `Invite ${worlds[other].short}`, `${worlds[other].gift.split('. ')[0]}. Share spare water and recovery capacity; uses a port at each world.`);
  const asking = next.last!.unmet[d] || later.last!.unmet[d];
  const voice = state.last?.unmet[d] ? `“${w.archetype === 'forge' ? 'Running on embers. I need a way to recover.' : w.archetype === 'shelter' ? 'Even stone has its limits. I need water.' : w.archetype === 'shifter' ? 'This rhythm is no longer enough.' : w.archetype === 'wetland' ? 'I can renew water. I cannot conjure it.' : w.archetype === 'reservoir' ? 'The stores are thin. Let us choose carefully.' : 'The path is open. The water is missing.'}”` : w.voice;
  $('companion').innerHTML = `<button class="text-button back" id="unselect">← The whole orbit</button><h1 class="world-title">${escape(w.name)}</h1><p class="world-voice">${escape(voice)}</p><p class="small-copy">${escape(w.gift)}</p><p class="feeling"><span class="feeling-dot ${asking || state.last?.unmet[d] ? 'low' : ''}"></span>${escape(mood(d))}</p>
    <div class="relationships">${button({ type: 'ability', world: d }, w.ability, abilityDetail(d), 'invitation-button signature')}
    ${asking ? button({ type: 'care', world: d }, 'Offer water from the basin', 'Prioritise up to three water for this world. The basin keeps its protected reserve.') : ''}
    ${invitations.length ? invite(invitations[0]) : ''}
    ${connections.map(e => { const other = routes[e].find(x => x !== d)!; const temporary = state.bypass.find(b => b.edge === e && b.until > state.beat);
      return `<div class="friendship"><span class="thread-icon" aria-hidden="true">↔</span><div><b>${escape(worlds[other].short)}</b><small>${temporary ? `Bypass · ${temporary.until - state.beat} moments left` : state.memory[e] ? `Water exchanged on ${state.memory[e]} ${state.memory[e] === 1 ? 'moment' : 'moments'}` : 'Agreed; waiting for an exchange'}</small></div><button class="text-button" data-action="release" data-edge="${e}" ${busy ? 'disabled' : ''} aria-label="Rest the current with ${escape(worlds[other].short)}">Rest</button></div>`; }).join('')}</div>
    <details class="other-choices"><summary>Other possibilities · ${connections.length}/${w.ports} ports in use</summary><div class="relationships">${invitations.slice(1).map(invite).join('')}${!asking ? button({ type: 'care', world: d }, 'Offer water from the basin', 'Prioritise up to three water. Giving here leaves less available elsewhere.') : ''}</div></details>
    <p class="action-note">A choice passes one moment. Listening is free. Every moment can be undone.</p>`;
}
function renderControls() {
  $('flow').disabled = busy; $('flow').innerHTML = busy ? 'The current moves…' : 'Let it flow <span aria-hidden="true">↗</span>';
  $('undo').hidden = !actions.length && !beforeRestart?.length;
  $('undo').textContent = beforeRestart ? 'Undo fresh start' : 'Undo last moment';
}
function render() {
  next = advance(state, { type: 'rest' }, arena); later = advance(next, { type: 'rest' }, arena);
  $('chapter-label').textContent = `${arena.name} · season ${Math.floor(state.beat / arena.seasonLength) + 1}`;
  world?.update(scene()); renderCompanion(); renderChoices(); renderControls();
  $('world-labels').innerHTML = worlds.map((w, d) => `<div class="planet-label theme-${w.theme}" id="planet-label-${d}"><span>${escape(w.short)}</span><small>${state.last?.unmet[d] ? 'recovering' : next.last!.unmet[d] ? 'needs care' : activeAt(state, d) ? 'in its element' : ''}</small></div>`).join('');
  const weather = weatherAt(state.beat + 1, arena), pos = position(state.beat + 1, arena);
  $('weather').textContent = weather === 'dry' ? '☾  The dry passage' : weather === 'rain' ? '✧  Returning rain' : '✧  A gathering rhythm';
  const concerns = worlds.filter((_, d) => next.last!.unmet[d] || later.last!.unmet[d]);
  $('season-note').textContent = concerns.length ? `${concerns[0].short} will need attention${concerns.length > 1 ? ` · ${concerns.length - 1} other ${concerns.length === 2 ? 'world' : 'worlds'} too` : ''}.` : pos < arena.dry[0] && pos >= arena.dry[0] - 3 ? 'The sky will dry soon. Time to prepare.' : `Moment ${pos} of ${arena.seasonLength} · the orbit waits for you`;
  $('attention').innerHTML = state.threat ? `<button id="hear-threat"><span class="attention-dot"></span>${escape(worlds[state.threat.from].short)} plans to disrupt ${escape(worlds[state.threat.to].short)}<span>Hear both worlds ↗</span></button>` : '';
  $('attention').hidden = !state.threat;
  $('basin-mood').textContent = state.last?.basinUnmet ? 'The community needs water' : state.basin >= 18 ? 'Room to breathe' : state.basin >= 8 ? 'Holding steady' : 'Drawing on its last reserves';
  $('moment-label').textContent = state.last?.words.some(w => w.startsWith('A shared dawn.')) ? 'A SHARED DAWN' : state.beat ? `AFTER MOMENT ${state.beat}` : 'YOUR FIRST ORBIT';
  $('story').textContent = recoveryNotice || (state.last ? state.last.words.join(' ') : 'Ember can renew its own water. Verdance has room to help. A current between them would let their different strengths meet.');
  $('save-note').textContent = saving ? 'Progress saves on this device · earlier garden saves stay separate.' : 'Saving unavailable · keep this tab open to continue.';
  document.body.classList.toggle('dawn', state.dawn);
}
function threatDialog() {
  if (!state.threat) return;
  const { from, to } = state.threat;
  openDialog(`<p class="eyebrow">A DISAGREEMENT · NEXT MOMENT</p><h2>Fear has a direction.</h2><p>${escape(worlds[from].short)} fears ${escape(worlds[to].short)}’s growing demand. If nothing changes, it will spill up to two of that world’s stored water next moment.</p><p>A direct current between them also settles this threat. An active shelter covering the target blocks it. You may let the disruption happen and help the world recover.</p><div class="relationships">${button({ type: 'mediate' }, 'Ask for a show of restraint', `${worlds[to].short} returns two stored water to the basin. The threat settles.`)}${button({ type: 'interrupt' }, 'Interrupt the disruption', `${worlds[from].short} closes all its currents and declines invitations for three moments. The target’s stores are protected.`)}</div><p class="small-copy">The orbit waits while you decide. Close this panel to arrange a current or a shelter instead.</p>`);
}
$('guide').addEventListener('click', () => openDialog(`<p class="eyebrow">DARK MICROCOSMOS · LIVING CURRENTS</p><h2>Find a rhythm that holds.</h2><p>Bring the six worlds and the basin community through a season. Choose a world to listen for free. Make one choice, then watch the exchange. Nothing advances while you look or think.</p><p>Every world recovers some used water on its own. Currents share spare clean water and carry used water to neighbours with spare processing capacity. Each archetype also has its own three-moment ability.</p><p>Most worlds keep two currents; The Unobserved keeps one. Invitations respect these limits, recovery backlogs and a world’s need for distance. Rest a current to make room for another. You can succeed without filling every port—or making any alliance.</p><p>Dry weather and Ember’s heat bring pressure. Warnings look two quiet moments ahead. A disagreement is announced before it happens; restraint, protection, intervention or accepting the consequence are all choices.</p><p>A shared dawn marks three comfortable moments at or after the season’s end, with the basin above its protected reserve. There is no alliance quota or moral score. Shortages are recoverable; undo is always available.</p><p>Gold travelling lights carry used water. Blue carries clean water. Each light corresponds to a recorded exchange. Sound is optional.</p><p class="small-copy">Tab / Enter: choose controls. Space: pass a moment when the page itself has focus. Escape: close a panel or return to the whole orbit.</p><a class="archive-link" href="./challenge.html">Original Dark Forest experiment ↗</a>`));
$('ledger').addEventListener('click', () => {
  const r = state.last, upcoming = needs(state, state.beat + 1, arena);
  openDialog(`<p class="eyebrow">BENEATH THE SURFACE · MOMENT ${state.beat}</p><h2>Water, honestly accounted for.</h2><div class="table-scroll"><table><caption>Stored water and next moment’s needs</caption><thead><tr><th>World</th><th>Clean</th><th>Used</th><th>Need</th></tr></thead><tbody>${worlds.map((w, d) => `<tr><th>${escape(w.short)}</th><td>${state.clean[d]}</td><td>${state.used[d]}</td><td>${upcoming[d]}</td></tr>`).join('')}<tr><th>Basin community</th><td>${state.basin}</td><td>—</td><td>${arena.basin.need}</td></tr></tbody></table></div><p>${r ? `${r.before} held + ${r.rain} rain / mist − ${r.loss} evaporation / spill / overflow = ${r.after} held. ${r.recovered} used water was recovered.` : `${totalWater(state)} water held in this orbit.`}</p><p class="small-copy">Recovered water fills the processing world’s buffer first, then returns to the basin for a later moment. Most currents carry three used water per moment; Prism’s carry five. Only clean water above a world’s own needs and reserve is shared. Local processing uses external energy. No water is created by an alliance.</p>`);
});
$('restart').addEventListener('click', () => openDialog('<p class="eyebrow">ANOTHER BEGINNING</p><h2>A fresh orbit?</h2><p>Your current season will be set aside. You can undo this immediately afterwards.</p><button class="invitation-button" id="confirm-restart">Begin a fresh orbit ↗</button>'));
function choiceFrom(b: HTMLButtonElement): Choice {
  const type = b.dataset.action as Choice['type'];
  return type === 'connect' || type === 'release' ? { type, edge: Number(b.dataset.edge) } : type === 'care' || type === 'ability' ? { type, world: Number(b.dataset.target) } : { type };
}
document.addEventListener('click', event => {
  const b = (event.target as HTMLElement).closest('button'); if (!b) return;
  if (b.id === 'confirm-restart') { beforeRestart = actions.slice(); actions = []; state = initialConstellation(arena); selected = -1; busy = false; clearTimeout(timer); world?.select(-1); save(); render(); dialog.close(); }
  else if (b.id === 'hear-threat') threatDialog();
  else if (b.id === 'arena-info') openDialog(`<p class="eyebrow">ARENA 01</p><h2>${escape(arena.name)}</h2><p>${escape(arena.subtitle)}. An eighteen-moment season: gathering weather, a dry passage, returning rain.</p><p>This is the first playable arena. Your decisions and relationships carry into the next season.</p><p class="small-copy">More worlds and galaxy arenas are planned. There are no other playable arenas yet.</p>`);
  else if (b.id === 'unselect') { selected = -1; world?.select(-1); renderCompanion(); renderChoices(); focusCompanion(); }
  else if (b.dataset.action) {
    act(choiceFrom(b));
  } else if (b.dataset.world !== undefined) choose(Number(b.dataset.world));
});
$('flow').addEventListener('click', () => act({ type: 'rest' }));
$('undo').addEventListener('click', () => { clearTimeout(timer); busy = false; if (beforeRestart) { actions = beforeRestart; beforeRestart = null; } else actions.pop(); state = replayConstellation(actions, arena); save(); render(); focusCompanion(); });
$('sound').addEventListener('click', () => { try { audio ??= new AudioContext(); sounding = !sounding; $('sound').textContent = sounding ? 'Sound on' : 'Sound off'; $('sound').setAttribute('aria-pressed', String(sounding)); if (sounding) chime(); } catch { $('sound').textContent = 'Sound unavailable'; } });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !dialog.open && (e.target === document.body || e.target === $('stage'))) { e.preventDefault(); $('flow').click(); } if (e.key === 'Escape' && !dialog.open && selected >= 0) { selected = -1; world?.select(-1); renderCompanion(); renderChoices(); } });
const resize = new ResizeObserver(() => world?.resize()); resize.observe($('stage'));
let labelFrame = 0;
function labels() { if (world) worlds.forEach((_, d) => { const el = $(`planet-label-${d}`), p = world!.screenOf(d); el.style.transform = `translate(-50%, -100%) translate(${p.x}px, ${p.y}px)`; el.style.opacity = p.visible ? '1' : '0'; }); labelFrame = requestAnimationFrame(labels); }
window.addEventListener('pagehide', event => { if (event.persisted) return; cancelAnimationFrame(labelFrame); resize.disconnect(); clearTimeout(timer); world?.dispose(); void audio?.close(); });
render(); labels();
