// The six planet-ship designs. Each district is drawn as one of these, assigned from the world
// number (web/scene.ts), never from its hidden policy. All colours avoid the strike crimson, which
// keeps its single meaning: harm.
export interface Theme {
  name: string;
  low: number; high: number;   // surface, by terrain height
  accent: number;              // contours, lava, the dish rim
  atmo: number; atmoStrength: number;
  city: number;                // night-side and trench lights
  clouds: number; contour: number; cracks: number; rain: number; iridescence: number; lattice: number;
  scale: number;               // terrain noise scale
  tilt: number;                // axial tilt, radians
}
export const THEME_LIST: Theme[] = [
  // Darkness, after the obsidian topography reference: black glass, thin gilt contour lines.
  { name: 'Obsidian Dusk', low: 0x07080b, high: 0x17181f, accent: 0xe4ae60, atmo: 0x4a4366, atmoStrength: 0.45, city: 0xe4ae60, clouds: 0, contour: 1, cracks: 0, rain: 0, iridescence: 0, lattice: 0, scale: 2.2, tilt: 0.18 },
  // Lush verdant jungle under weather, lit at night by bioluminescence.
  { name: 'Verdance', low: 0x0a2614, high: 0x2f6a29, accent: 0xb8f27a, atmo: 0x6fd6a0, atmoStrength: 0.9, city: 0x9ff7d0, clouds: 0.85, contour: 0, cracks: 0, rain: 0, iridescence: 0, lattice: 0, scale: 3.0, tilt: 0.41 },
  // Fiery skies over a surface of dark glass, with rain running down it and lava in the cracks.
  { name: 'Ember Glass', low: 0x110b10, high: 0x34191a, accent: 0xff9a3d, atmo: 0xff9238, atmoStrength: 1.1, city: 0xffc27a, clouds: 0, contour: 0, cracks: 1, rain: 1, iridescence: 0.12, lattice: 0, scale: 2.6, tilt: 0.3 },
  // Calm and luminous: pale stone, gilt rings, slow cloud.
  { name: 'Still Sanctum', low: 0x2a2440, high: 0xb2a4d4, accent: 0xf2d9a0, atmo: 0xc9b8ff, atmoStrength: 0.8, city: 0xf6e7c1, clouds: 0.35, contour: 0.35, cracks: 0, rain: 0, iridescence: 0, lattice: 0, scale: 1.8, tilt: 0.05 },
  // Prismatic: a surface that shifts colour with the angle you see it from, inside atomic rings.
  { name: 'Prism Reach', low: 0x161b2a, high: 0x5a6c8e, accent: 0xc7f0ff, atmo: 0x9fd8ff, atmoStrength: 0.8, city: 0xffffff, clouds: 0, contour: 0, cracks: 0, rain: 0, iridescence: 1, lattice: 0, scale: 2.4, tilt: 0.5 },
  // Unobserved: half a world, half a wireframe of one, undecided until someone looks.
  { name: 'The Unobserved', low: 0x04040a, high: 0x0e0c1a, accent: 0xb28cff, atmo: 0xb28cff, atmoStrength: 1.1, city: 0xb28cff, clouds: 0, contour: 0, cracks: 0, rain: 0, iridescence: 0, lattice: 1, scale: 2.0, tilt: 0.62 },
];
