// A quiet, procedural instrument. No assets, autoplay, timing scores or sound-only information.
// Six voices share a pentatonic palette, but differ in register, envelope and overtone.
import type { Game, Moment } from '../src/microcosmos.ts';
import type { ArenaDef } from '../src/arenas.ts';
const NOTES = [130.81, 174.61, 196, 146.83, 261.63, 220];
export function createSoundscape(a: ArenaDef) {
  let context: AudioContext | null = null, master: GainNode | null = null, on = false;
  const nodes = new Set<OscillatorNode>();
  function cancel() { for (const o of nodes) { try { o.stop(); } catch { /* already ended */ } } nodes.clear(); }
  function tone(hz: number, start: number, length: number, volume: number, type: OscillatorType = 'sine') {
    if (!context || !master || !on) return;
    const o = context.createOscillator(), g = context.createGain(); o.type = type; o.frequency.value = hz;
    g.gain.setValueAtTime(0, start); g.gain.linearRampToValueAtTime(volume, start + .025);
    g.gain.exponentialRampToValueAtTime(.0001, start + length);
    o.connect(g).connect(master); nodes.add(o); o.start(start); o.stop(start + length + .03);
    o.onended = () => { nodes.delete(o); o.disconnect(); g.disconnect(); };
  }
  function voice(d: number, at: number, soft = false, dark = false) {
    if (!context) return;
    const theme = a.worlds[d].theme, root = NOTES[theme % NOTES.length] * (dark ? 1 : 2);
    tone(root, at, theme === 3 ? 1.15 : .65, soft ? .025 : .055, theme === 0 || theme === 2 ? 'triangle' : 'sine');
    if (theme === 1 || theme === 4) tone(root * 2, at + .04, .45, .012);
    if (theme === 5) tone(root * 1.5, at + .09, .8, .018);
  }
  return {
    async enable(value: boolean) {
      if (!value) { on = false; cancel(); return false; }
      context ??= new AudioContext();
      if (!master) { master = context.createGain(); master.gain.value = .65; master.connect(context.destination); }
      await context.resume(); on = context.state === 'running';
      if (on) tone(293.66, context.currentTime, .45, .03);
      return on;
    },
    select(d: number) { if (on && context && d >= 0) voice(d, context.currentTime, true); },
    moment(m: Moment, g: Game) {
      if (!on || !context) return;
      cancel(); const now = context.currentTime, dark = m.sky === 'dark';
      const action = m.events.find(e => ['ability', 'link', 'gift'].includes(e.kind));
      if (action) voice(action.world, now, false, dark);
      const heard = [...new Set(m.transfers.flatMap(t => [t.from, t.to]).filter((d): d is number => typeof d === 'number' && !g.dormant[d]))];
      heard.forEach((d, i) => voice(d, now + .16 + i * .105, true, dark));
      if (m.learned.length) { tone(784, now + .88, .75, .022); tone(1174.66, now + 1.02, .6, .012); }
      if (m.events.some(e => e.kind === 'woke')) tone(523.25, now + .8, 1.1, .03);
      if (g.outcome) {
        const chord = g.outcome === 'dawn' ? [196, 261.63, 392, 523.25] : g.outcome === 'peace' ? [146.83, 196, 293.66] : [65.4, 98, 146.83];
        chord.forEach((hz, i) => tone(hz, now + 1.1 + i * .14, 2, .025));
      }
    },
    cancel,
    async suspend() { cancel(); if (context?.state === 'running') await context.suspend(); },
    async resume() { if (on && context?.state === 'suspended') await context.resume(); },
    async dispose() { on = false; cancel(); await context?.close(); },
  };
}
