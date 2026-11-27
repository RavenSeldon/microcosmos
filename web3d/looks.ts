// How each arena looks: presentation only, never rules. An arena keeps the same six worlds and the
// same laws; its sky changes. The renderer takes `void`, `stars` and `nebulae` (world.mood); the page
// takes the rest as CSS (body[data-arena] in game.css). An arena without an entry here falls back to
// the First Orbit's sky, so registering a new arena in src/arenas.ts never breaks the page.
import type { Mood } from './world.ts';

export interface Look extends Mood {
  ordinal: string;    // shown on the arena's title card
  epithet: string;    // one line, what is different about this sky
}
export const LOOKS: Record<string, Look> = {
  'first-orbit': { ordinal: 'Arena I', epithet: 'One open sky, one passage through the dark, one return of rain.',
    void: 0x04050a, stars: 0xdfe6ff, nebulae: [0x8a2f2a, 0x2c3f86] },
  'long-dark': { ordinal: 'Arena II', epithet: 'An eclipse that lasts eight moments. The cold belongs to Ember and the Unobserved.',
    void: 0x02040b, stars: 0x9fbaff, nebulae: [0x1b2c6e, 0x0d3a5c] },
  'dry-return': { ordinal: 'Arena III', epithet: 'After the dark, the rain barely comes back. What circulates is all there is.',
    void: 0x080604, stars: 0xffe4c2, nebulae: [0x8a5a1c, 0x5c2f12] },
  'fractured-orbit': { ordinal: 'Arena IV', epithet: 'The orbit begins already burdened. Make room before the dark arrives.',
    void: 0x09030a, stars: 0xffcadb, nebulae: [0x8a1f45, 0x46206e] },
};
export const lookOf = (id: string): Look => LOOKS[id] ?? LOOKS['first-orbit'];
