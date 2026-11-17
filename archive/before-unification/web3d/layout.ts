// Where things sit in space. EXPANSION SCAFFOLD: the renderer asks this module for every position,
// so a system with more planets, or several systems side by side, needs no change to world.ts's
// drawing code. Only the single-system, six-planet case is used today.
export type V3 = [number, number, number];

export const PLANET = 1.5;          // planet-ship radius
export const BASIN_DROP = 8.5;      // how far below its ring a system's basin sits

// Ring radius that keeps neighbouring ships at least `gap` planet radii apart, never below 10.
export function ringRadius(n: number, gap = 6.6): number {
  return Math.max(10, (gap * PLANET) / (2 * Math.sin(Math.PI / n)));
}

// Planet centres for one system: evenly spaced, the first at the top of the ring.
export function planetPositions(n: number, centre: V3 = [0, 0, 0]): V3[] {
  const r = ringRadius(n);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [centre[0] + Math.cos(a) * r, centre[1], centre[2] + Math.sin(a) * r] as V3;
  });
}

// SCAFFOLD, not used yet: several systems laid out on a wide arc, each with its own ring and basin.
// What would join them (a shared river, travel between them, events across them) is undecided;
// see docs/EXPANSION.md.
export interface SystemSlot { id: string; centre: V3; planets: number }
export function cosmosLayout(systems: { id: string; planets: number }[], spacing = 60): SystemSlot[] {
  const k = systems.length;
  return systems.map((s, i) => {
    const a = k === 1 ? 0 : (-0.5 + i / (k - 1)) * Math.min(Math.PI * 0.8, k * 0.5);
    const dist = k === 1 ? 0 : spacing * k * 0.35;
    return { id: s.id, planets: s.planets, centre: [Math.sin(a) * dist, 0, -Math.cos(a) * dist + (k === 1 ? 0 : dist)] as V3 };
  });
}
