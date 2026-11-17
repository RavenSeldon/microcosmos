// What should be on screen, as plain data. Both renderers (the 2D page and the 3D world) can read
// it. It is built ONLY from what the player may see: the world's public number and the public
// history. Hidden state cannot reach a renderer through here, and test/scene.test.ts checks that
// two worlds with the same public history and different hidden policies give the same scene.
import type { PublicRound } from '../src/bots.ts';
import { know } from '../src/bots.ts';
import { kindOf, targetOf, HIDE } from '../src/engine.ts';
import { stream, shuffled } from '../src/rng.ts';
import { letter } from '../src/roster.ts';

export type LinkKind = 'threat' | 'strike' | 'offer' | 'listen' | 'hit' | 'current';
export interface SceneSystem {
  id: number;
  letter: string;
  band: number;               // 0 low, 1 medium, 2 heavy: last round's draw
  bandTrail: number[];        // draw by round, oldest first
  distress: boolean;
  inAgreement: boolean;       // as far as the player knows
  threatened: boolean;
  threatening: boolean;
  selected: boolean;
  heard: { need: number; reserve: number; round: number } | null;
  theme: number;              // which planet-ship design it is drawn as; from the world number, never from policy
}
export interface SceneLink { kind: LinkKind; from: number | 'station' | 'basin'; to: number | 'station' | 'basin' }
export interface Scene {
  circulation?: boolean;
  world: number;
  round: number;              // the round about to be played
  rounds: number;
  station: { exposure: number; exposureMax: number; targetable: boolean; integrity: number; integrityMax: number };
  basin: { flow: number; minimum: number; short: boolean; counted: boolean };
  systems: SceneSystem[];
  links: SceneLink[];         // what happened last round, plus any standing threat
}

const STREAM_THEME = 77; // its own random stream: the theme order shares nothing with any hidden draw
export const THEMES = 6;

export function buildScene(world: number, history: PublicRound[], opts: { selected?: number; rounds: number; basinMin: number; integrityMax: number; exposureMax: number; targetable: number }): Scene {
  const last = history[history.length - 1];
  const n = last.band.length;
  const round = last.round + 1;
  const k = know({ round, exposure: last.exposure, integrity: last.integrity, basinMin: opts.basinMin, history });
  const themes = shuffled(stream(world, STREAM_THEME), n).map((x) => x % THEMES);

  const systems: SceneSystem[] = [];
  for (let d = 0; d < n; d++) {
    systems.push({
      id: d, letter: letter(d), band: last.band[d], bandTrail: history.map((h) => h.band[d]), distress: last.distress[d],
      inAgreement: k.inAgreement[d], threatened: k.threat?.to === d, threatening: k.threat?.from === d,
      selected: opts.selected === d, heard: k.listened[d] ? { ...k.listened[d]! } : null, theme: themes[d],
    });
  }

  const links: SceneLink[] = [];
  for (const e of last.events) {
    if (e.type === 'threat') links.push({ kind: 'threat', from: e.from, to: e.to });
    else if (e.type === 'strike') links.push({ kind: 'strike', from: e.from, to: e.to });
    else if (e.type === 'signal') links.push({ kind: 'offer', from: e.from, to: e.to });
  }
  if (last.action >= 0 && last.action !== HIDE) {
    const kd = kindOf(last.action);
    links.push({ kind: kd === 'K' ? 'strike' : kd === 'G' ? 'offer' : 'listen', from: 'station', to: targetOf(last.action) });
  }
  for (const d of last.attackers) links.push({ kind: 'hit', from: d, to: 'station' });

  return {
    world, round: Math.min(round, opts.rounds), rounds: opts.rounds,
    station: { exposure: last.exposure, exposureMax: opts.exposureMax, targetable: last.exposure >= opts.targetable, integrity: Math.max(0, last.integrity), integrityMax: opts.integrityMax },
    basin: { flow: last.flow, minimum: opts.basinMin, short: last.flow < opts.basinMin, counted: last.round > 0 },
    systems, links,
  };
}
