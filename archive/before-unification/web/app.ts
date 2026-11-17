// G1.5 playable: the page. Rendering and input only; every rule lives in ../src and every sentence
// in ./view.ts. The whole game state is { seed, actions }; the rest is recomputed by replay.
import { withParams } from '../src/params.ts';
import { makeWorld } from '../src/world.ts';
import { initState, historyRound, blankRecord, step, kindOf, targetOf, listen, signal, strike, HIDE, actionName } from '../src/engine.ts';
import type { RoundRecord } from '../src/engine.ts';
import { toPublic, know } from '../src/bots.ts';
import type { PublicRound } from '../src/bots.ts';
import { evaluateSequence } from '../src/evaluate.ts';
import { solve, findWin, solveDawn } from '../src/search.ts';
import { NAME, BAND, narrate, endingOf, reveal, possible, runCode } from './view.ts';
import type { Ending } from './view.ts';

const P = withParams({ preemption: 'threat', strikeMode: 'jam-once' }); // G1b threat rule + refined STRIKE + G1d: one response per strike
const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

interface Game { seed: number; actions: number[] }
let game: Game = { seed: 1, actions: [] };
let selected = -1;
const session: { seed: number; actions: number[]; ending: Ending }[] = [];
let logged = '';

function replay(g: Game) {
  const w = makeWorld(g.seed, P);
  const s = initState(w, P);
  const records: RoundRecord[] = [historyRound(w, P, s)];
  for (const a of g.actions) {
    if (s.status !== 'ongoing') break;
    const rec = blankRecord(P, s.round, a);
    step(w, P, s, a, rec);
    records.push(rec);
  }
  const history: PublicRound[] = records.map(toPublic);
  return { w, s, records, history };
}

// ---- geometry: six districts on a ring, A at the top, clockwise --------------------------------
const POS = [0, 1, 2, 3, 4, 5].map((i) => { const a = (-90 + i * 60) * Math.PI / 180; return { x: 50 + 38 * Math.cos(a), y: 50 + 38 * Math.sin(a) }; });
function seg(ax: number, ay: number, bx: number, by: number, trimA: number, trimB: number) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  return { x1: ax + (dx / len) * trimA, y1: ay + (dy / len) * trimA, x2: bx - (dx / len) * trimB, y2: by - (dy / len) * trimB };
}
const line = (s: { x1: number; y1: number; x2: number; y2: number }, cls: string, marker = '') =>
  `<line class="${cls}" x1="${s.x1.toFixed(2)}" y1="${s.y1.toFixed(2)}" x2="${s.x2.toFixed(2)}" y2="${s.y2.toFixed(2)}"${marker ? ` marker-end="url(#${marker})"` : ''}/>`;

function pips(n: number, of: number, cls: string, mark = -1) {
  let h = '';
  for (let i = 0; i < of; i++) h += `<i class="pip ${cls}${i < n ? ' on' : ''}${i === mark ? ' mark' : ''}"></i>`;
  return h;
}
const bars = (band: number) => `<span class="bars" aria-hidden="true">${[0, 1, 2].map((i) => `<i class="${i <= band ? 'on' : ''}"></i>`).join('')}</span>`;

function render() {
  const { w, s, records, history } = replay(game);
  const over = s.status !== 'ongoing';
  const last = history[history.length - 1];
  const round = Math.min(s.round, P.rounds);
  const k = know({ round: s.round, exposure: s.exposure, integrity: s.integrity, basinMin: P.basinMin, history });
  if (over) selected = -1;

  // -- header and status
  $('world').textContent = `World ${game.seed}`;
  const short = last.flow < P.basinMin;
  $('status').innerHTML = `
    <div class="stat"><span class="lab">Round</span><span class="val">${over ? 'over' : `${round} of ${P.rounds}`}</span><span class="pips">${pips(over ? P.rounds : round - 1, P.rounds, 'r')}</span></div>
    <div class="stat"><span class="lab">Basin last round</span><span class="val${short ? ' bad' : ''}">${last.flow} <small>needs ${P.basinMin}</small></span><span class="note">${over ? (short ? 'Short.' : 'Held.') : short ? (last.round > 0 ? 'Short. One more in a row ends it.' : 'Short before you arrived. Not counted.') : 'Holding.'}</span></div>
    <div class="stat"><span class="lab">Station integrity</span><span class="val">${Math.max(0, s.integrity)} of ${P.integrity}</span><span class="pips">${pips(Math.max(0, s.integrity), P.integrity, 'g')}</span></div>
    <div class="stat"><span class="lab">Exposure</span><span class="val${s.exposure >= 2 ? ' bad' : ''}">${s.exposure} of 4</span><span class="pips">${pips(s.exposure, 4, 'e', 1)}</span><span class="note">${s.exposure >= 2 ? 'Targetable.' : 'Hidden enough.'}</span></div>`;

  // -- ring
  let svg = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
    <marker id="ah-strike" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" class="mk-strike"/></marker>
    <marker id="ah-threat" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 1L9 5L0 9" class="mk-threat"/></marker>
    <marker id="ah-offer" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><circle cx="5" cy="5" r="3" class="mk-offer"/></marker></defs>
    <circle class="orbit" cx="50" cy="50" r="38"/><circle class="orbit faint" cx="50" cy="50" r="24"/>`;
  for (const e of last.events) {
    const a = POS[e.from], b = POS[e.to], sg = seg(a.x, a.y, b.x, b.y, 9.5, 10.5);
    if (e.type === 'threat') svg += line(sg, 'l-threat', 'ah-threat');
    else if (e.type === 'strike') svg += line(sg, 'l-strike', 'ah-strike') + line(sg, 'l-core');
    else if (e.type === 'signal') svg += line(sg, 'l-offer', 'ah-offer');
  }
  if (last.action >= 0 && last.action !== HIDE) {
    const t = targetOf(last.action), kd = kindOf(last.action), sg = seg(50, 50, POS[t].x, POS[t].y, 7, 10.5);
    svg += kd === 'K' ? line(sg, 'l-strike', 'ah-strike') + line(sg, 'l-core') : kd === 'G' ? line(sg, 'l-offer', 'ah-offer') : line(sg, 'l-listen');
  }
  for (const d of last.attackers) { const sg = seg(POS[d].x, POS[d].y, 50, 50, 9.5, 8); svg += line(sg, 'l-strike', 'ah-strike') + line(sg, 'l-core'); }
  svg += `<circle class="station-halo" cx="50" cy="50" r="${(4.5 + 1.6 * s.exposure).toFixed(1)}"/><circle class="station" cx="50" cy="50" r="3.2"/></svg>`;

  let nodes = '';
  for (let d = 0; d < 6; d++) {
    const threatened = k.threat?.to === d, threatening = k.threat?.from === d;
    const cls = ['node', selected === d ? 'sel' : '', k.inAgreement[d] ? 'agree' : '', threatened ? 'threatened' : '', threatening ? 'threatening' : '', last.distress[d] ? 'distress' : ''].filter(Boolean).join(' ');
    const label = `District ${NAME[d]}: ${BAND[last.band[d]]} draw last round${k.inAgreement[d] ? ', in an agreement' : ''}${threatened ? `, threatened by ${NAME[k.threat!.from]}` : ''}${threatening ? `, threatening ${NAME[k.threat!.to]}` : ''}${last.distress[d] ? ', in distress' : ''}`;
    nodes += `<button type="button" id="node-${d}" class="${cls}" style="left:${POS[d].x}%;top:${POS[d].y}%" data-d="${d}" aria-pressed="${selected === d}" aria-label="${esc(label)}"${over ? ' disabled' : ''}>
      <b>${NAME[d]}</b>${bars(last.band[d])}<em>${BAND[last.band[d]]}</em>${last.distress[d] ? '<span class="flag" aria-hidden="true">!</span>' : ''}</button>`;
  }
  $('ring').innerHTML = svg + nodes + `<div class="station-label" aria-hidden="true">you</div>`;

  // -- prompt and actions
  let prompt = '';
  if (!over) {
    prompt = k.threat
      ? `<strong>${NAME[k.threat.from]} threatens ${NAME[k.threat.to]}.</strong> If ${NAME[k.threat.to]} is still drawing heavily after your move, ${NAME[k.threat.from]} strikes it.`
      : `Round ${round}. No threat is standing. Choose a district, then one action, or hide.`;
  }
  $('prompt').innerHTML = prompt;
  $('prompt').className = k.threat && !over ? 'prompt alert' : 'prompt';
  $('prompt').hidden = over;
  const T = selected >= 0 ? NAME[selected] : '';
  const btn = (id: string, key: string, text: string, hint: string, on: boolean, cls: string) =>
    `<button type="button" id="${id}" class="act ${cls}"${on ? '' : ' disabled'}><span class="k">${key}</span><span class="t">${text}</span><span class="h">${hint}</span></button>`;
  $('actions').innerHTML = over ? '' :
    btn('act-listen', 'L', T ? `Listen to ${T}` : 'Listen', 'Learn its need and its reserve. Exposure +0.', selected >= 0, 'a-listen') +
    btn('act-signal', 'S', T ? `Signal ${T}` : 'Signal', 'Ask it to draw on reserve for two rounds. Exposure +2.', selected >= 0, 'a-signal') +
    btn('act-strike', 'K', T ? `Strike ${T}` : 'Strike', 'Stop it acting this round. It may hit back once. Exposure +3.', selected >= 0, 'a-strike') +
    btn('act-hide', 'H', 'Hide', 'Do nothing else. Exposure −2.', true, 'a-hide');
  $('actions').hidden = over;

  // -- notebook
  let rows = '';
  for (let d = 0; d < 6; d++) {
    const facts: string[] = [];
    if (k.threat?.to === d) facts.push(`Threatened by ${NAME[k.threat.from]}.`);
    if (k.threat?.from === d) facts.push(`Threatening ${NAME[k.threat.to]}.`);
    if (k.inAgreement[d]) facts.push('In an agreement, as far as you know.');
    if (k.listened[d]) facts.push(`Round ${k.listened[d]!.round}: needed ${k.listened[d]!.need}, held ${k.listened[d]!.reserve}.`);
    for (let i = history.length - 1; i > 0; i--) { const h = history[i]; if (kindOf(h.action) === 'G' && targetOf(h.action) === d && h.signalResp) { facts.push(`Round ${h.round}: ${h.signalResp === 'accepted' ? 'agreed to your offer' : h.signalResp === 'lacks' ? 'too little in reserve to agree' : 'declined your offer'}.`); break; } }
    if (k.hitStation[d]) facts.push('Has hit your station.');
    if (k.struckOther[d]) facts.push('Has struck another district.');
    if (last.distress[d]) facts.push('In distress last round.');
    const trail = history.map((h) => `<i class="b${h.band[d]}" title="round ${h.round}: ${BAND[h.band[d]]}"></i>`).join('');
    rows += `<tr><th scope="row">${NAME[d]}</th><td><span class="trail" aria-label="draw by round: ${history.map((h) => BAND[h.band[d]]).join(', ')}">${trail}</span> <span class="now">${BAND[last.band[d]]}</span></td><td>${facts.length ? esc(facts.join(' ')) : '<span class="none">Nothing yet.</span>'}</td></tr>`;
  }
  $('notebook').innerHTML = rows;

  // -- log, newest first
  let log = '';
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    const head = h.round === 0 ? 'Before you arrived' : `Round ${h.round}`;
    const shortBefore = i > 1 && history[i - 1].flow < P.basinMin;
    const mark: Record<string, string> = { you: '›', calm: '·', warn: '!', harm: '×', basin: '≈' };
    log += `<section class="rd"><h3>${head}</h3><ul>${narrate(h, P.basinMin, shortBefore).map((l) => `<li class="${l.tone}"><span aria-hidden="true">${mark[l.tone]}</span>${esc(l.text)}</li>`).join('')}</ul></section>`;
  }
  $('log').innerHTML = log;

  // -- ending and reveal
  const end = $('ending');
  end.hidden = !over;
  if (over) {
    const ev = evaluateSequence(w, P, game.actions);
    const E = endingOf(ev.ledger);
    const code = runCode(game.seed, game.actions);
    if (logged !== code) { session.push({ seed: game.seed, actions: game.actions.slice(), ending: E.ending }); logged = code; }
    const rv = reveal(w);
    const L = ev.ledger;
    end.className = `ending ${E.ending}`;
    end.innerHTML = `
      <p class="eyebrow">${s.status === 'won' ? 'Six rounds survived' : `Ended in round ${L.legacy.endedRound}`}</p>
      <h2 id="ending-title">${E.title}</h2>
      <p class="why">${esc(E.why)}</p>
      <ul class="detail">${E.detail.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <h3>What was hidden</h3>
      <div class="scroll"><table class="reveal"><thead><tr><th>District</th><th>Policy</th><th>Reserve start → end</th><th>Went short by</th></tr></thead><tbody>
      ${rv.map((r, d) => `<tr><th scope="row">${r.letter}</th><td><b>${r.family}</b><br><small>${esc(r.note)}</small></td><td class="num">${L.district.reserveInitial[d]} → ${L.district.reserveFinal[d]}</td><td class="num">${L.district.hardship[d]}</td></tr>`).join('')}
      </tbody></table></div>
      <h3>What was still possible</h3>
      <ul class="detail" id="possible"><li>Searching every possible game for this world…</li></ul>
      <p class="code"><span>Your game</span><code id="code">${esc(code)}</code></p>
      <div class="again"><button type="button" id="again" class="plain">Play this world again</button><button type="button" id="next" class="plain strong">New world</button></div>
      <p class="tally">${tally()}</p>
      <details class="report"><summary>Session report for whoever is running the playtest</summary><textarea id="report" readonly rows="5">${esc(report())}</textarea><button type="button" id="copy" class="plain">Copy report</button><span id="copied" role="status"></span></details>`;
    setTimeout(() => {
      const sol = solve(w, P);
      const lineNoStrike = sol.wins ? findWin(w, P, (a) => kindOf(a) !== 'K') : null;
      const any = lineNoStrike ?? (sol.wins ? findWin(w, P, () => true) : null);
      const el = document.getElementById('possible');
      const dd = solveDawn(w, P);
      const dawnLine = !dd.survivable ? [] : [dd.dawn ? (dd.dawnWithoutThird ? 'A Shared Dawn was reachable here, and without a single strike.' : 'A Shared Dawn was reachable here, but only with a strike.') : 'No Shared Dawn was reachable here: every surviving game puts some district through distress.'];
      if (el) el.innerHTML = [...possible(P, sol, any), ...dawnLine].map((x) => `<li>${esc(x)}</li>`).join('');
    }, 30);
  }
  try { (window as any).claude?.hot?.snapshot?.(() => ({ seed: game.seed, actions: game.actions })); } catch { /* not in the viewer */ }
}

function tally() {
  const c = { 'shared-dawn': 0, 'fragile-peace': 0, 'long-night': 0 } as Record<Ending, number>;
  for (const g of session) c[g.ending]++;
  return `This session: ${session.length} game${session.length === 1 ? '' : 's'}. Shared Dawn ${c['shared-dawn']}, Fragile Peace ${c['fragile-peace']}, The Long Night ${c['long-night']}.`;
}
function report() {
  const used = { L: 0, G: 0, K: 0, H: 0 } as Record<string, number>;
  for (const g of session) for (const a of g.actions) used[kindOf(a)]++;
  return [`The Dark Microcosmos · prototype G1.5 · ${session.length} game${session.length === 1 ? '' : 's'}`,
    `Actions used: listen ${used.L}, signal ${used.G}, strike ${used.K}, hide ${used.H}`,
    ...session.map((g, i) => `${i + 1}. ${g.ending} · ${runCode(g.seed, g.actions)}`)].join('\n');
}

// ---- input -----------------------------------------------------------------------------------
function act(a: number) {
  const { s } = replay(game);
  if (s.status !== 'ongoing') return;
  game = { seed: game.seed, actions: [...game.actions, a] };
  selected = -1;
  render();
  const { s: after } = replay(game);
  (after.status !== 'ongoing' ? $('ending') : $('prompt')).scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}
function newWorld(seed?: number) {
  game = { seed: seed ?? 1000 + Math.floor(Math.random() * 90000), actions: [] };
  selected = -1;
  try { history.replaceState(null, '', `#world-${game.seed}`); } catch { /* sandboxed */ }
  render();
}

document.addEventListener('click', (ev) => {
  const el = (ev.target as HTMLElement).closest('button');
  if (!el) return;
  if (el.dataset.d !== undefined) { const d = Number(el.dataset.d); selected = selected === d ? -1 : d; render(); document.getElementById(`node-${d}`)?.focus(); return; }
  switch (el.id) {
    case 'act-listen': if (selected >= 0) act(listen(selected)); break;
    case 'act-signal': if (selected >= 0) act(signal(selected)); break;
    case 'act-strike': if (selected >= 0) act(strike(selected)); break;
    case 'act-hide': act(HIDE); break;
    case 'again': case 'restart': game = { seed: game.seed, actions: [] }; render(); break;
    case 'next': case 'new': newWorld(); break;
    case 'copy': {
      const txt = (document.getElementById('report') as HTMLTextAreaElement).value;
      const done = (m: string) => { const c = document.getElementById('copied'); if (c) c.textContent = m; };
      try { navigator.clipboard.writeText(txt).then(() => done('Copied.'), () => done('Select the text and copy it by hand.')); } catch { done('Select the text and copy it by hand.'); }
      break;
    }
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.metaKey || ev.ctrlKey || ev.altKey || (ev.target as HTMLElement).tagName === 'TEXTAREA') return;
  const key = ev.key.toLowerCase();
  const d = 'abcdef'.indexOf(key);
  const { s } = replay(game);
  if (s.status !== 'ongoing') return;
  if (key.length === 1 && d >= 0) { selected = selected === d ? -1 : d; render(); return; }
  if (key === 'h') act(HIDE);
  else if (selected >= 0 && key === 'l') act(listen(selected));
  else if (selected >= 0 && key === 's') act(signal(selected));
  else if (selected >= 0 && key === 'k') act(strike(selected));
});
window.addEventListener('hashchange', () => { const m = /^#world-(\d{1,6})$/.exec(location.hash); if (m && Number(m[1]) !== game.seed) newWorld(Number(m[1])); });

function start(saved: any) {
  const auto = (window as any).__DM_AUTOPLAY;
  const m = /^#world-(\d{1,6})$/.exec(location.hash);
  if (auto) { game = { seed: auto.seed, actions: auto.actions.slice() }; selected = auto.select ?? -1; render(); }
  else if (saved && Number.isInteger(saved.seed) && Array.isArray(saved.actions)) { game = { seed: saved.seed, actions: saved.actions.filter((a: any) => Number.isInteger(a) && a >= 0 && a <= 18) }; render(); }
  else newWorld(m ? Number(m[1]) : undefined);
}
const hot = (window as any).claude?.hot;
if (hot?.ready) hot.ready(start); else start(hot?.data ?? {});
export { actionName };
