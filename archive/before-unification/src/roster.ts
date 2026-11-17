// The one place the number of districts in a system is fixed.
//
// EXPANSION SCAFFOLD (see docs/EXPANSION.md). Everything that depends on the district count reads
// it from here: the action encoding, the search, district letters, the renderer's layout. Raising
// DISTRICTS is the first step towards larger systems, but it is NOT enough on its own: the tuned
// numbers (river sizing, bands, thresholds) and the six planet-ship designs were made for six, and
// every result in this repository was measured at six. The guard in assertRoster() stops a world of
// any other size from running until that work is done.
export const DISTRICTS = 6;
export const LETTERS = 'ABCDEFGHIJKLMNOP'; // room for up to 16
export const ACTIONS = 3 * DISTRICTS + 1;   // LISTEN, SIGNAL, STRIKE per district, plus HIDE

export const letter = (d: number) => LETTERS[d];

export function assertRoster(n: number): void {
  if (n !== DISTRICTS) {
    throw new Error(`a system of ${n} districts is scaffolded but not built (this build plays ${DISTRICTS}); see docs/EXPANSION.md`);
  }
}
