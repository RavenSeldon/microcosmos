// What the renderer is asked to draw, as plain data. The renderer never sees the rules or the game
// state: game.ts builds a Scene from the state and hands it over.
export type LinkKind = 'threat' | 'strike' | 'offer' | 'listen' | 'hit' | 'current';
export interface SceneSystem {
  id: number; letter: string;
  band: number;             // 0 dormant and dim · 1 awake · 2 in its element (its rhythm is under way)
  bandTrail: number[];
  distress: boolean;        // strained, thirsty, or about to be: the amber ring
  inAgreement: boolean;     // shares at least one current
  threatened: boolean; threatening: boolean; selected: boolean;
  heard: { need: number; reserve: number; round: number } | null;
  theme: number;            // which planet design
}
export interface SceneLink { kind: LinkKind; from: number | 'station' | 'basin'; to: number | 'station' | 'basin' }
export interface Scene {
  circulation?: boolean; world: number; round: number; rounds: number;
  station: { exposure: number; exposureMax: number; targetable: boolean; integrity: number; integrityMax: number };
  basin: { flow: number; minimum: number; short: boolean; counted: boolean };
  systems: SceneSystem[]; links: SceneLink[];
}
// The renderer can still stage a resolved round as timed beats. The unified game does not use this yet.
export type BeatKind = 'listen' | 'offer' | 'strike' | 'hide' | 'reply' | 'threat' | 'lapse' | 'interrupted' | 'net-strike' | 'relay' | 'flow' | 'hit' | 'broken' | 'distress' | 'basin';
export interface Beat { phase: 1 | 2 | 3 | 4; kind: BeatKind; from: number | 'station' | 'basin'; to: number | 'station' | 'basin'; text: string; good?: boolean }
