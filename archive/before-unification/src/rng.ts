// Seeded PRNG. Randomness enters ONLY at world generation (and inside the random bot).
// Round resolution never draws a random number.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Independent stream per purpose, so changing one draw (e.g. families) cannot shift another (e.g. needs).
export function stream(seed: number, id: number): () => number {
  let h = (seed ^ Math.imul(id + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return mulberry32((h ^ (h >>> 16)) >>> 0);
}

export const int = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));

export function shuffled(r: () => number, n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
