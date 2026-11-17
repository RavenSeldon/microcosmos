// The 3D world. It draws a Scene (scene.ts) and nothing else: it never sees the engine's state.
// Layers, far to near: star field and nebula (atmosphere, encode nothing) · the instrument ring and
// six planet-ships · filaments between them · the station · the axis · the basin below, with
// contour ground and the cosmogram.
import {
  AdditiveBlending, BackSide, BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, ConeGeometry, EdgesGeometry, Group,
  IcosahedronGeometry, Line, LineBasicMaterial, LineDashedMaterial, LineLoop, LineSegments, Mesh, MeshBasicMaterial, Object3D,
  PerspectiveCamera, PlaneGeometry, Points, Raycaster, Scene as TScene, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, TextureLoader,
  TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { planetPositions, ringRadius, PLANET, BASIN_DROP } from './layout.ts';
import type { Beat, Scene, SceneLink } from './scene.ts';

import { THEME_LIST } from './themes.ts';
import type { Theme } from './themes.ts';
import type { Transfer } from '../src/microcosmos.ts';
import type { Performance } from './feedback.ts';

const C = { void: 0x05060b, signal: 0xe4ae60, life: 0x77c8d7, strike: 0xf0526e, core: 0xfff4f0, dim: 0xa7a1b8, ember: 0x8a2f2a, deep: 0x2c3f86 };
const BASIN_Y = -BASIN_DROP;
const GAIN = [0.15, 0.55, 1.0]; // how hard a ship is drawing, from its public band
const SPIN = [0.05, 0.11, 0.2];

// A small deterministic generator for decoration only. Nothing here reads game state.
function rnd(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---- shaders -----------------------------------------------------------------------------------
const POINT_VERT = `
  attribute float aSize; attribute float aGlow; uniform float uScale; uniform float uGain; varying float vGlow;
  void main() { vGlow = aGlow * uGain; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uScale / -mv.z, 1.2, 22.0); }`;
const POINT_FRAG = `
  uniform vec3 uColor; varying float vGlow;
  void main() { vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(uColor * (0.55 + 0.45 * a), a * a * vGlow); }`;

const PLANET_VERT = `
  varying vec3 vObj; varying vec3 vN; varying vec3 vW;
  void main() { vObj = position; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
// One shader for all six designs; each theme only changes the numbers. Every feature is procedural
// (value noise in object space, so it turns with the planet). Ship features shared by all: an
// equatorial trench with running lights, and a dish.
const PLANET_FRAG = `
  uniform float uTime, uGain; uniform vec3 uLow, uHigh, uAccent, uAtmo, uCity, uLight;
  uniform vec4 uMix1; // clouds, contour, cracks, rain
  uniform vec4 uMix2; // iridescence, lattice, noise scale, seed
  varying vec3 vObj; varying vec3 vN; varying vec3 vW;
  float h(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
  void main() {
    vec3 p = normalize(vObj), n = normalize(vN), v = normalize(cameraPosition - vW);
    vec3 q = p * uMix2.z + uMix2.w;
    float e = fbm(q);
    vec3 col = mix(uLow, uHigh, smoothstep(0.38, 0.68, e)), emit = vec3(0.0);
    float lat = asin(clamp(p.y, -1.0, 1.0)), lon = atan(p.z, p.x);
    // gilt contour lines
    emit += uAccent * uMix1.y * (1.0 - smoothstep(0.0, 0.05, abs(fract(e * 14.0) - 0.5))) * 0.85;
    // lava in the cracks
    float r = 1.0 - abs(2.0 * fbm(q * 1.7 + 3.1) - 1.0);
    emit += uAccent * uMix1.z * smoothstep(0.86, 0.97, r) * (0.55 + 0.6 * uGain);
    // weather
    float cl = fbm(p * 3.0 + vec3(uTime * 0.015, 0.0, uTime * 0.01) + 9.0);
    col = mix(col, vec3(0.9, 0.94, 0.96), uMix1.x * smoothstep(0.52, 0.72, cl));
    // wireframe half
    float side = smoothstep(-0.15, 0.15, p.x);
    float grid = pow(1.0 - min(abs(sin(lat * 9.0)), abs(sin(lon * 9.0))), 26.0);
    col = mix(col, col * (1.0 - side * 0.85), uMix2.y);
    emit += uAtmo * uMix2.y * grid * (0.25 + 0.75 * side);
    // the trench and its running lights
    float tr = 1.0 - smoothstep(0.025, 0.045, abs(p.y));
    col *= 1.0 - 0.75 * tr;
    float dots = smoothstep(0.75, 1.0, cos(lon * 76.0 + uTime * 0.6)) * (1.0 - smoothstep(0.006, 0.014, abs(p.y)));
    emit += uCity * dots * (0.35 + 0.9 * uGain);
    // the dish
    vec3 d0 = normalize(vec3(0.55, 0.42, 0.72));
    float dd = acos(clamp(dot(p, d0), -1.0, 1.0)), R = 0.42;
    float inside = 1.0 - smoothstep(R - 0.015, R, dd);
    col *= 1.0 - 0.6 * inside * (1.0 - dd / R * 0.6);
    col += uAccent * inside * pow(abs(cos(dd * 42.0)), 24.0) * 0.12;
    emit += uAccent * (1.0 - smoothstep(0.0, 0.018, abs(dd - R))) * 0.5;
    emit += uAccent * (1.0 - smoothstep(0.0, 0.05, dd)) * (0.5 + uGain);
    // light from the station's star, and the night side
    float dif = max(dot(n, uLight), 0.0);
    vec3 lit = col * (0.12 + dif * 0.95);
    float night = 1.0 - smoothstep(-0.05, 0.25, dot(n, uLight));
    emit += uCity * smoothstep(0.72, 0.9, noise(p * 38.0 + uMix2.w)) * smoothstep(0.45, 0.6, e) * night * (0.2 + 0.9 * uGain);
    // rain running down the glass
    float lid = floor(lon * 14.3239), lx = fract(lon * 14.3239);
    float streak = (1.0 - smoothstep(0.0, 0.12, abs(lx - 0.5))) * smoothstep(0.55, 1.0, fract(p.y * 1.6 + uTime * 0.9 + h(vec3(lid, 1.0, 2.0)) * 5.0)) * step(0.45, h(vec3(lid, 3.0, 4.0)));
    emit += vec3(0.85, 0.9, 1.0) * uMix1.w * streak * 0.5;
    // prismatic sheen
    float fr = 1.0 - max(dot(n, v), 0.0);
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + fr * 1.6 + e * 0.8 + uTime * 0.03));
    lit = mix(lit, iri * (0.25 + dif * 0.7), uMix2.x * (0.12 + 0.55 * pow(fr, 1.5))); // sheen at the limb, base at the centre
    gl_FragColor = vec4(lit + emit + uAtmo * pow(fr, 2.6) * 1.1, 1.0);
  }`;
const ATMO_VERT = `varying vec3 vN; varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`;
const ATMO_FRAG = `uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vW;
  void main() { vec3 v = normalize(cameraPosition - vW); float rim = 1.0 - abs(dot(normalize(vN), v)); gl_FragColor = vec4(uColor * pow(rim, 2.4) * uStrength, 1.0); }`;

function pointsOf(positions: Float32Array, sizes: Float32Array, glow: Float32Array, color: number) {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(positions, 3));
  g.setAttribute('aSize', new BufferAttribute(sizes, 1));
  g.setAttribute('aGlow', new BufferAttribute(glow, 1));
  const m = new ShaderMaterial({ vertexShader: POINT_VERT, fragmentShader: POINT_FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending, uniforms: { uColor: { value: new Color(color) }, uScale: { value: 1 }, uGain: { value: 1 } } });
  return new Points(g, m);
}
function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!; const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}
const lineMat = (color: number, opacity: number) => new LineBasicMaterial({ color, transparent: true, opacity, blending: AdditiveBlending, depthWrite: false });
function loop(radius: number, y: number, segments = 128, wobble?: (a: number) => [number, number]) {
  const pts: Vector3[] = [];
  for (let i = 0; i < segments; i++) { const a = (i / segments) * Math.PI * 2; const [dr, dy] = wobble ? wobble(a) : [0, 0]; pts.push(new Vector3(Math.cos(a) * (radius + dr), y + dy, Math.sin(a) * (radius + dr))); }
  return new BufferGeometry().setFromPoints(pts);
}
function nerve(a: Vector3, b: Vector3, r: () => number, sway: number, n = 5): Vector3[] {
  const mid: Vector3[] = [a.clone()];
  for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); p.x += (r() - 0.5) * sway; p.y += (r() - 0.5) * sway * 0.7; p.z += (r() - 0.5) * sway; mid.push(p); }
  mid.push(b.clone());
  return new CatmullRomCurve3(mid).getPoints(40);
}

// Each design's superstructure: what makes it a ship and not only a planet.
function superstructure(i: number, t: Theme, glow: CanvasTexture): Object3D {
  const g = new Group(), r = rnd(500 + i);
  if (i === 0) { // Obsidian Dusk: a gilt orbital ring with docking spokes
    g.add(new LineLoop(loop(PLANET * 1.32, 0, 160), lineMat(t.accent, 0.75)));
    const spokes: Vector3[] = [];
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; spokes.push(new Vector3(Math.cos(a) * PLANET * 1.02, 0, Math.sin(a) * PLANET * 1.02), new Vector3(Math.cos(a) * PLANET * (k % 3 ? 1.32 : 1.45), 0, Math.sin(a) * PLANET * (k % 3 ? 1.32 : 1.45))); }
    g.add(new LineSegments(new BufferGeometry().setFromPoints(spokes), lineMat(t.accent, 0.45)));
  } else if (i === 1) { // Verdance: a habitat ring with lit pods
    const ring = new Mesh(new TorusGeometry(PLANET * 1.42, 0.05, 6, 96), new MeshBasicMaterial({ color: 0x2f5b33 }));
    ring.rotation.x = Math.PI / 2; g.add(ring);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; const s = new Sprite(new SpriteMaterial({ map: glow, color: t.city, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false })); s.position.set(Math.cos(a) * PLANET * 1.42, 0, Math.sin(a) * PLANET * 1.42); s.scale.setScalar(0.32); g.add(s); }
  } else if (i === 2) { // Ember Glass: spires through the burning sky
    for (let k = 0; k < 9; k++) {
      const dir = new Vector3(r() - 0.5, (r() - 0.5) * 1.4, r() - 0.5).normalize(), len = 0.45 + r() * 0.45;
      const spire = new Mesh(new ConeGeometry(0.055, len, 5), new MeshBasicMaterial({ color: 0x1b0d0b }));
      spire.position.copy(dir).multiplyScalar(PLANET + len / 2 - 0.05); spire.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), dir); g.add(spire);
      const tip = new Sprite(new SpriteMaterial({ map: glow, color: t.accent, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false }));
      tip.position.copy(dir).multiplyScalar(PLANET + len); tip.scale.setScalar(0.28); g.add(tip);
    }
  } else if (i === 3) { // Still Sanctum: concentric gilt rings, flat as a mandala
    for (let k = 0; k < 4; k++) g.add(new LineLoop(loop(PLANET * (1.18 + k * 0.09), 0, 160), lineMat(t.accent, 0.6 - k * 0.1)));
  } else if (i === 4) { // Prism Reach: three atomic orbits
    [t.accent, 0xb28cff, 0xe4ae60].forEach((c, k) => { const l = new LineLoop(loop(PLANET * 1.38, 0, 160), lineMat(c, 0.7)); l.rotation.set(Math.PI / 2 + (k - 1) * 0.95, k * 1.1, 0); l.scale.set(1, 1, 0.42); g.add(l); });
  } else { // The Unobserved: the wireframe of the world it might be
    const shell = new LineSegments(new EdgesGeometry(new IcosahedronGeometry(PLANET * 1.28, 1)), lineMat(t.accent, 0.5));
    shell.name = 'counter'; g.add(shell);
  }
  return g;
}

export type PreviewKind = 'listen' | 'offer' | 'strike' | 'hide';
export interface World {
  update(s: Scene): void;
  resize(): void;
  screenOf(i: number): { x: number; y: number; visible: boolean };
  select(i: number): void;                 // -1 clears
  preview(p: { kind: PreviewKind; target: number } | null): void;
  play(beats: Beat[], flows: { from: number; to: number }, apply: () => void, onPhase: (phase: number) => void, done: () => void): void;
  skip(): void;
  flow(transfers: Transfer[]): void;
  perform(score: Performance): void;
  clearFeedback(): void;
  route(from: number, to?: number, blocked?: boolean): void;
  composing(from: number): void;
  dispose(): void;
  canvas: HTMLCanvasElement;
}
export interface WorldEvents { pick?(i: number): void; hover?(i: number): void; connect?(from: number, to: number): void }

// `count` planet-ships on one ring. Every position comes from layout.ts, so a larger system is a
// different count here, not a different renderer (EXPANSION SCAFFOLD; only 6 is played today).
export function createWorld(host: HTMLElement, reducedMotion: boolean, events: WorldEvents = {}, count = 6): World {
  const RING = ringRadius(count), BR = 6.9 * (RING / 10); // basin gauge radius scales with the ring
  const POS = planetPositions(count).map(([x, y, z]) => new Vector3(x, y, z));
  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setClearColor(C.void, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  host.appendChild(renderer.domElement);
  const scene = new TScene();
  const camera = new PerspectiveCamera(42, 1, 0.5, 600);
  const target = new Vector3(0, -2.6, 0);
  const view = { az: 0.35, el: 0.42, dist: 31, user: false };
  let circulation = false;
  const glow = glowTexture();
  const deco = rnd(20261115);
  const lightDir = new Vector3(0.45, 0.75, 0.48).normalize();

  // ---- far field: atmosphere only -------------------------------------------------------------
  {
    const n = 2600, p = new Float32Array(n * 3), s = new Float32Array(n), g = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = deco() * 2 - 1, t = deco() * Math.PI * 2, r = 110 + deco() * 70, q = Math.sqrt(1 - u * u);
      p[i * 3] = r * q * Math.cos(t); p[i * 3 + 1] = r * u; p[i * 3 + 2] = r * q * Math.sin(t);
      s[i] = 380 + deco() * 620 * (deco() < 0.07 ? 2.6 : 1); g[i] = 0.4 + deco() * 0.6;
    }
    scene.add(pointsOf(p, s, g, 0xdfe6ff));
    for (const [color, pos, size, op] of [[C.ember, [-70, 18, -120], 230, 0.34], [C.deep, [60, -10, -130], 210, 0.3], [C.ember, [95, 40, -60], 150, 0.16], [C.deep, [-90, -30, 70], 180, 0.18]] as const) {
      const sp = new Sprite(new SpriteMaterial({ map: glow, color, transparent: true, opacity: op, blending: AdditiveBlending, depthWrite: false }));
      sp.position.set(pos[0], pos[1], pos[2]); sp.scale.set(size, size, 1); scene.add(sp);
    }
  }

  // ---- the instrument ring ----------------------------------------------------------------------
  scene.add(new LineLoop(loop(RING, 0, 256), lineMat(C.signal, 0.55)));
  scene.add(new LineLoop(loop(RING + 0.55, 0, 256), lineMat(C.signal, 0.2)));
  {
    const ticks: Vector3[] = [];
    for (let i = 0; i < 144; i++) { const a = (i / 144) * Math.PI * 2, long = i % 12 === 0 ? 0.5 : i % 4 === 0 ? 0.28 : 0.14; ticks.push(new Vector3(Math.cos(a) * (RING + 0.55), 0, Math.sin(a) * (RING + 0.55)), new Vector3(Math.cos(a) * (RING + 0.55 + long), 0, Math.sin(a) * (RING + 0.55 + long))); }
    scene.add(new LineSegments(new BufferGeometry().setFromPoints(ticks), lineMat(C.signal, 0.35)));
  }

  // ---- six planet-ships -------------------------------------------------------------------------
  const centre = (i: number) => POS[i].clone();
  const sphere = new SphereGeometry(PLANET, 64, 48), shellGeo = new SphereGeometry(PLANET * 1.13, 48, 32);
  // One body per design, built once; a district shows the design the scene assigns it.
  const designs = THEME_LIST.map((t, i) => {
    const mat = new ShaderMaterial({
      vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG,
      uniforms: {
        uTime: { value: 0 }, uGain: { value: 0.5 }, uLight: { value: lightDir },
        uLow: { value: new Color(t.low) }, uHigh: { value: new Color(t.high) }, uAccent: { value: new Color(t.accent) }, uAtmo: { value: new Color(t.atmo) }, uCity: { value: new Color(t.city) },
        uMix1: { value: [t.clouds, t.contour, t.cracks, t.rain] }, uMix2: { value: [t.iridescence, t.lattice, t.scale, 7.3 * (i + 1)] },
      },
    });
    const atmo = new ShaderMaterial({ vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG, side: BackSide, transparent: true, blending: AdditiveBlending, depthWrite: false, uniforms: { uColor: { value: new Color(t.atmo) }, uStrength: { value: t.atmoStrength } } });
    return { t, mat, atmo, i };
  });
  interface Sys { group: Group; body: Group | null; theme: number; planet: Mesh | null; material: ShaderMaterial | null; agree: LineLoop[]; threat: Line; distress: LineLoop; strands: Line[]; spin: number; pulse: number }
  const systems: Sys[] = [];
  const hitTargets: Mesh[] = [];
  const hitGeo = new SphereGeometry(PLANET * 1.7, 12, 8), hitMat = new MeshBasicMaterial({ visible: false });
  for (let i = 0; i < count; i++) {
    const group = new Group(); group.position.copy(centre(i)); scene.add(group);
    const hit = new Mesh(hitGeo, hitMat); hit.userData.index = i; group.add(hit); hitTargets.push(hit);
    const agree = [new LineLoop(loop(PLANET * 1.78, 0, 96), lineMat(C.signal, 0.95)), new LineLoop(loop(PLANET * 1.9, 0, 96), lineMat(C.signal, 0.95))];
    agree.forEach((l) => { l.visible = false; group.add(l); });
    const tg = loop(PLANET * 2.1, 0, 96); const closed = tg.getAttribute('position').array as Float32Array; const arr = new Float32Array(closed.length + 3); arr.set(closed); arr.set(closed.subarray(0, 3), closed.length);
    const threat = new Line(new BufferGeometry().setAttribute('position', new BufferAttribute(arr, 3)), new LineDashedMaterial({ color: C.strike, dashSize: 0.45, gapSize: 0.35, transparent: true, opacity: 0.95 }));
    threat.computeLineDistances(); threat.visible = false; group.add(threat);
    const distress = new LineLoop(loop(PLANET * 1.6, 0, 96), lineMat(C.strike, 0.9)); distress.visible = false; group.add(distress);
    // Draw strands: one, two or three cyan threads down to the basin, by how hard the ship is drawing.
    const strands: Line[] = [];
    const a = Math.atan2(POS[i].z, POS[i].x), r = rnd(900 + i);
    for (let k = 0; k < 3; k++) {
      const from = centre(i).add(new Vector3(0, -PLANET * 0.95, 0)), to = new Vector3(Math.cos(a + (k - 1) * 0.08) * BR, BASIN_Y + 0.05, Math.sin(a + (k - 1) * 0.08) * BR);
      const ln = new Line(new BufferGeometry().setFromPoints(nerve(from, to, r, 1.4, 4)), lineMat(C.life, 0.5)); ln.visible = false; scene.add(ln); strands.push(ln);
    }
    systems.push({ group, body: null, theme: -1, planet: null, material: null, agree, threat, distress, strands, spin: SPIN[1], pulse: 0 });
  }
  function setTheme(sys: Sys, theme: number) {
    if (sys.theme === theme) return;
    if (sys.body) { sys.group.remove(sys.body); sys.material?.dispose(); }
    const d = designs[theme];
    const body = new Group(); body.rotation.z = d.t.tilt;
    // Separate uniforms let future arenas repeat a theme without coupling two worlds' moods.
    const material = d.mat.clone();
    const planet = new Mesh(sphere, material); body.add(planet);
    body.add(new Mesh(shellGeo, d.atmo));
    planet.add(superstructure(theme, d.t, glow));
    sys.group.add(body); sys.body = body; sys.planet = planet; sys.material = material; sys.theme = theme;
  }

  // ---- station and axis ---------------------------------------------------------------------------
  const station = new Sprite(new SpriteMaterial({ map: glow, color: C.signal, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false }));
  station.scale.set(1.6, 1.6, 1); scene.add(station);
  const halo = new LineLoop(loop(1, 0, 96), lineMat(C.signal, 0.8)); scene.add(halo);
  const pips: LineLoop[] = [];
  for (let i = 0; i < 3; i++) { const l = new LineLoop(loop(0.5, 0, 48), lineMat(C.life, 0.9)); l.scale.setScalar(0.5 + 0.16 * i); scene.add(l); pips.push(l); }
  scene.add(new Line(new BufferGeometry().setFromPoints([new Vector3(0, 13, 0), new Vector3(0, BASIN_Y, 0)]), lineMat(C.core, 0.5)));
  { const beam = new Sprite(new SpriteMaterial({ map: glow, color: C.signal, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false })); beam.scale.set(1.1, 30, 1); beam.position.set(0, 2, 0); scene.add(beam); }

  // ---- structural nerves: always there, faint ----------------------------------------------------
  {
    const segs: Vector3[] = [];
    const push = (pts: Vector3[]) => { for (let i = 0; i < pts.length - 1; i++) segs.push(pts[i], pts[i + 1]); };
    for (let i = 0; i < count; i++) {
      const trunk = nerve(new Vector3(0, 0, 0), centre(i), deco, 2.2); push(trunk);
      for (let b = 0; b < 3; b++) { const from = trunk[8 + Math.floor(deco() * 24)]; const to = from.clone().add(new Vector3((deco() - 0.5) * 7, (deco() - 0.6) * 5, (deco() - 0.5) * 7)); push(nerve(from, to, deco, 1.2, 3)); }
      push(nerve(centre(i), centre((i + 1) % count), deco, 1.6));
    }
    scene.add(new LineSegments(new BufferGeometry().setFromPoints(segs), lineMat(C.signal, 0.13)));
  }

  // ---- the basin: contour ground, the cosmogram, the flow gauge ---------------------------------
  {
    const r = rnd(7);
    for (let k = 0; k < 11; k++) {
      const ph = [r() * 6.28, r() * 6.28, r() * 6.28], amp = 0.25 + r() * 0.5;
      const geo = loop(BR + 0.5 + k * 0.62, BASIN_Y - 0.15 - k * 0.28, 160, (a) => [Math.sin(a * 3 + ph[0]) * amp + Math.sin(a * 7 + ph[1]) * amp * 0.45, Math.sin(a * 5 + ph[2]) * 0.12]);
      scene.add(new LineLoop(geo, lineMat(C.signal, 0.34 - k * 0.022)));
    }
  }
  const cosmogram = new Mesh(new PlaneGeometry(13.6, 13.6), new MeshBasicMaterial({ transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  cosmogram.rotation.x = -Math.PI / 2; cosmogram.position.y = BASIN_Y; scene.add(cosmogram);
  new TextureLoader().load('./cosmogram.svg', (tex) => { const m = cosmogram.material as MeshBasicMaterial; m.map = tex; m.opacity = 0.9; m.needsUpdate = true; }, undefined, () => { /* the world still reads without it */ });
  // One fixed buffer for the whole circle; a reading only changes how much of it is drawn. (Resizing
  // the buffer per frame, as the animated flow does, is what three.js warns against.)
  const gaugeGeo = new BufferGeometry();
  { const a = new Float32Array(161 * 3); for (let i = 0; i <= 160; i++) { const t = -Math.PI / 2 + (i / 160) * Math.PI * 2; a[i * 3] = Math.cos(t) * BR; a[i * 3 + 1] = BASIN_Y + 0.02; a[i * 3 + 2] = Math.sin(t) * BR; } gaugeGeo.setAttribute('position', new BufferAttribute(a, 3)); }
  const gauge = new Line(gaugeGeo, lineMat(C.life, 0.95)); scene.add(gauge);
  let minimum = 30;
  // Two thirds of the circle is the minimum: a short basin visibly falls short of the white mark.
  function setGauge(flow: number) {
    const frac = Math.max(0.02, Math.min(1, (flow / minimum) * (2 / 3)));
    gaugeGeo.setDrawRange(0, Math.max(2, Math.round(160 * frac)) + 1);
    (gauge.material as LineBasicMaterial).color.set(flow < minimum ? C.strike : C.life);
  }
  { const a = -Math.PI / 2 + (2 / 3) * Math.PI * 2; scene.add(new Line(new BufferGeometry().setFromPoints([new Vector3(Math.cos(a) * (BR - 0.4), BASIN_Y + 0.02, Math.sin(a) * (BR - 0.4)), new Vector3(Math.cos(a) * (BR + 0.4), BASIN_Y + 0.02, Math.sin(a) * (BR + 0.4))]), lineMat(C.core, 0.95))); }

  // ---- links: what happened, and any standing threat ----------------------------------------------
  const linkGroup = new Group(); scene.add(linkGroup);
  const arrowGeo = new ConeGeometry(0.22, 0.6, 10);
  function drawLinks(links: SceneLink[]) {
    for (const o of [...linkGroup.children]) { linkGroup.remove(o); if ((o as Line).geometry !== arrowGeo) (o as Line).geometry.dispose(); ((o as Line).material as LineBasicMaterial).dispose(); }
    const at = (x: number | 'station' | 'basin') => (x === 'station' ? new Vector3(0, 0, 0) : x === 'basin' ? new Vector3(0, BASIN_Y, 0) : centre(x));
    links.forEach((l, i) => {
      const a = at(l.from), b = at(l.to), lift = l.from === 'station' || l.to === 'station' ? 0.8 : 2.2;
      const mid = a.clone().lerp(b, 0.5); mid.y += lift; mid.multiplyScalar(l.from === 'station' || l.to === 'station' ? 1 : 0.82);
      const pts = new CatmullRomCurve3([a, mid, b]).getPoints(48 + i).slice(6, -6);
      const geo = new BufferGeometry().setFromPoints(pts);
      if (l.kind === 'threat' || l.kind === 'strike' || l.kind === 'hit') { // an arrowhead says who acts on whom
        const tip = pts[pts.length - 1], back = pts[pts.length - 4];
        const head = new Mesh(arrowGeo, new MeshBasicMaterial({ color: C.strike, transparent: true, opacity: 0.95 }));
        head.position.copy(tip); head.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), tip.clone().sub(back).normalize()); linkGroup.add(head);
      }
      if (l.kind === 'current') { linkGroup.add(new Line(geo, lineMat(C.signal, 0.75))); }
      else if (l.kind === 'threat') { const ln = new Line(geo, new LineDashedMaterial({ color: C.strike, dashSize: 0.5, gapSize: 0.4, transparent: true, opacity: 0.95 })); ln.computeLineDistances(); linkGroup.add(ln); }
      else if (l.kind === 'offer') { const ln = new Line(geo, new LineDashedMaterial({ color: C.signal, dashSize: 0.12, gapSize: 0.3, transparent: true, opacity: 1 })); ln.computeLineDistances(); linkGroup.add(ln); }
      else if (l.kind === 'listen') { const ln = new Line(geo, new LineDashedMaterial({ color: C.life, dashSize: 0.9, gapSize: 0.25, transparent: true, opacity: 0.9 })); ln.computeLineDistances(); linkGroup.add(ln); }
      else { linkGroup.add(new Line(geo, lineMat(C.strike, 1))); const core = geo.clone(); core.translate(0, 0.06, 0); linkGroup.add(new Line(core, lineMat(C.core, 0.9))); }
    });
  }

  function update(s: Scene) {
    circulation = !!s.circulation;
    s.systems.forEach((sys, i) => {
      const v = systems[i];
      setTheme(v, sys.theme);
      v.material!.uniforms.uGain.value = GAIN[sys.band];
      v.spin = SPIN[sys.band];
      v.strands.forEach((l, k) => (l.visible = s.circulation ? k === 0 : k <= sys.band));
      v.agree.forEach((l) => (l.visible = sys.inAgreement));
      v.threat.visible = sys.threatened;
      v.distress.visible = sys.distress;
      (v.distress.material as LineBasicMaterial).color.set(s.circulation ? C.signal : C.strike);
    });
    halo.scale.setScalar(0.9 + 0.45 * s.station.exposure);
    (halo.material as LineBasicMaterial).color.set(s.station.targetable ? C.strike : C.signal);
    pips.forEach((p, i) => (p.visible = i < s.station.integrity));
    if (s.circulation) { pips.forEach((p) => p.visible = false); halo.visible = false; }
    else halo.visible = true;
    minimum = s.basin.minimum;
    setGauge(s.basin.flow);
    drawLinks(s.links);
  }

  const homeTarget = new Vector3(0, -2.6, 0), wantTarget = homeTarget.clone();
  function place() {
    target.lerp(wantTarget, reducedMotion ? 1 : 0.06);
    const ce = Math.cos(view.el), se = Math.sin(view.el);
    camera.position.set(target.x + view.dist * ce * Math.sin(view.az), target.y + view.dist * se, target.z + view.dist * ce * Math.cos(view.az));
    camera.lookAt(target);
  }
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // far enough back that the whole ring fits the narrower side
    const fit = Math.max(31 * (RING / 10), (count === 3 ? 16 : RING + 3.4) / (Math.tan((21 * Math.PI) / 180) * (w / h)));
    if (!view.user) view.dist = Math.min(180, fit);
    const px = (renderer.getPixelRatio() * h * 1.3) / 1000; // aSize is in thousandths of a unit
    scene.traverse((o) => { const m = (o as Points).material as ShaderMaterial; if (m && m.uniforms && m.uniforms.uScale) m.uniforms.uScale.value = px; });
  }

  // ---- travel: drag to orbit, pinch or wheel to zoom ---------------------------------------------
  const el = renderer.domElement; el.style.touchAction = 'none';
  const ptr = new Map<number, { x: number; y: number }>(); let pinch = 0;
  const ray = new Raycaster(), ndc = new Vector2();
  function pick(cx: number, cy: number): number {
    const r = el.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(hitTargets, false)[0];
    return hit ? (hit.object.userData.index as number) : -1;
  }
  let down: { x: number; y: number; t: number; planet: number } | null = null, hovered = -1;
  let drawing = -1, composing = -1;
  el.addEventListener('pointerdown', (e) => {
    ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); el.setPointerCapture(e.pointerId);
    if (ptr.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), planet: pick(e.clientX, e.clientY) };
    else { down = null; drawing = -1; route(-1); }
  });
  el.addEventListener('pointermove', (e) => {
    const p = ptr.get(e.pointerId);
    if (!p) { const h = pick(e.clientX, e.clientY); if (h !== hovered) { hovered = h; el.style.cursor = h >= 0 ? 'pointer' : 'grab'; events.hover?.(h); } return; }
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
      if (down.planet >= 0 && events.connect) drawing = down.planet;
      else down = null;
    }
    if (ptr.size === 1 && drawing >= 0) { const to = pick(e.clientX, e.clientY); route(drawing, to); }
    else if (ptr.size === 1 && (!down || down.planet < 0 || !events.connect)) { view.az -= (e.clientX - p.x) * 0.005; view.el = Math.max(0.12, Math.min(1.2, view.el + (e.clientY - p.y) * 0.004)); view.user = true; }
    p.x = e.clientX; p.y = e.clientY;
    if (ptr.size === 2) { const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) view.dist = Math.max(12, Math.min(90, view.dist * (pinch / d))); pinch = d; view.user = true; }
  });
  const up = (e: PointerEvent) => {
    ptr.delete(e.pointerId); pinch = 0;
    const target = pick(e.clientX, e.clientY), from = drawing;
    down = e.type === 'pointercancel' ? null : down;
    drawing = -1; route(-1);
    if (from >= 0 && e.type === 'pointerup' && target >= 0 && target !== from) events.connect?.(from, target);
    else if (down && e.type === 'pointerup' && from < 0) events.pick?.(target);
    down = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { e.preventDefault(); view.dist = Math.max(12, Math.min(90, view.dist * (1 + Math.sign(e.deltaY) * 0.08))); view.user = true; }, { passive: false });

  // ---- selection, preview, and the four-beat turn ------------------------------------------------
  const selRing = new LineLoop(loop(PLANET * 2.45, 0, 120), lineMat(C.core, 0.95)); selRing.visible = false; scene.add(selRing);
  const selRing2 = new LineLoop(loop(PLANET * 2.6, 0, 6), lineMat(C.core, 0.6)); selRing2.visible = false; scene.add(selRing2);
  let selected = -1;
  function select(i: number) {
    selected = i;
    selRing.visible = selRing2.visible = i >= 0;
    if (i >= 0) { selRing.position.copy(centre(i)); selRing2.position.copy(centre(i)); wantTarget.copy(homeTarget).lerp(centre(i), circulation ? 0 : 0.3); }
    else wantTarget.copy(homeTarget);
  }
  const ghostGroup = new Group(); scene.add(ghostGroup);
  const routeGroup = new Group(); scene.add(routeGroup);
  function route(from: number, to = -1, blocked = false) {
    for (const o of [...routeGroup.children]) { routeGroup.remove(o); (o as Line).geometry.dispose(); ((o as Line).material as LineBasicMaterial).dispose(); }
    if (from < 0 || from >= count) return;
    const color = blocked ? C.strike : C.life;
    const ring = new LineLoop(loop(PLANET * 1.55, 0, 64), lineMat(color, .8)); ring.position.copy(centre(from)); routeGroup.add(ring);
    if (to < 0 || to >= count || to === from) return;
    const a = centre(from), b = centre(to), mid = a.clone().lerp(b, .5); mid.y += 2;
    const line = new Line(new BufferGeometry().setFromPoints(new CatmullRomCurve3([a, mid, b]).getPoints(48)), new LineDashedMaterial({color, dashSize:.4, gapSize:.2, transparent:true, opacity:.9}));
    line.computeLineDistances(); routeGroup.add(line);
  }
  let ghostKind: PreviewKind | null = null;
  function preview(p: { kind: PreviewKind; target: number } | null) {
    for (const o of [...ghostGroup.children]) { ghostGroup.remove(o); (o as Line).geometry.dispose(); ((o as Line).material as LineBasicMaterial).dispose(); }
    ghostKind = p ? p.kind : null;
    station.material.opacity = 0.95;
    if (!p || p.kind === 'hide' || p.target < 0) return;
    const a = new Vector3(0, 0, 0), b = centre(p.target), mid = a.clone().lerp(b, 0.5); mid.y += 0.8;
    const geo = new BufferGeometry().setFromPoints(new CatmullRomCurve3([a, mid, b]).getPoints(48).slice(4, -6));
    const color = p.kind === 'strike' ? C.strike : p.kind === 'offer' ? C.signal : C.life;
    const ln = new Line(geo, new LineDashedMaterial({ color, dashSize: 0.3, gapSize: 0.3, transparent: true, opacity: 0.9 })); ln.computeLineDistances(); ghostGroup.add(ln);
  }
  // Effects: short-lived sprites driven by the frame clock. Nothing here touches game state.
  interface Fx { t0: number; dur: number; tick(u: number): void; end(): void }
  let fx: Fx[] = [], playing: { timers: number[]; apply: () => void; applied: boolean; done: () => void } | null = null;
  function spark(color: number, size: number) {
    const s = new Sprite(new SpriteMaterial({ map: glow, color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
    s.scale.setScalar(size); scene.add(s); return s;
  }
  const where = (x: number | 'station' | 'river' | 'basin') => (x === 'station' ? new Vector3(0, 0, 0) : x === 'basin' ? new Vector3(0, BASIN_Y, 0) : x === 'river' ? new Vector3(0, 10, 0) : centre(x));
  function travel(from: Vector3, to: Vector3, color: number, dur = 650, delay = 0) {
    const mid = from.clone().lerp(to, 0.5); mid.y += 1.4;
    const curve = new CatmullRomCurve3([from, mid, to]); const s = spark(color, 1.4);
    fx.push({ t0: clock + delay / 1000, dur: dur / 1000, tick(u) { s.position.copy(curve.getPoint(u)); s.material.opacity = Math.sin(Math.PI * u) * 0.95 + 0.05; }, end() { scene.remove(s); s.material.dispose(); } });
  }
  function bloom(at: Vector3, color: number, size = 5, dur = 700, delay = 0) {
    const s = spark(color, 1); s.position.copy(at);
    fx.push({ t0: clock + delay / 1000, dur: dur / 1000, tick(u) { s.scale.setScalar(1 + size * u); s.material.opacity = (1 - u) * 0.55; }, end() { scene.remove(s); s.material.dispose(); } });
  }
  function flowTo(fromFlow: number, toFlow: number, dur = 800) {
    systems.forEach((s) => s.strands.forEach((l) => { (l.material as LineBasicMaterial).opacity = 0.95; }));
    fx.push({ t0: clock, dur: dur / 1000, tick(u) { setGauge(Math.round(fromFlow + (toFlow - fromFlow) * u)); }, end() { setGauge(toFlow); systems.forEach((s) => s.strands.forEach((l) => { (l.material as LineBasicMaterial).opacity = 0.5; })); } });
  }
  function effectOf(b: Beat, flows: { from: number; to: number }) {
    const good = b.good === undefined ? C.dim : b.good ? C.signal : C.strike;
    switch (b.kind) {
      case 'listen': travel(where('station'), where(b.to), C.life); break;
      case 'offer': travel(where('station'), where(b.to), C.signal); break;
      case 'strike': travel(where('station'), where(b.to), C.strike, 450); break;
      case 'hide': fx.push({ t0: clock, dur: 0.7, tick(u) { station.material.opacity = 0.95 - 0.8 * Math.sin(Math.PI * u); }, end() { station.material.opacity = 0.95; } }); break;
      case 'reply': travel(where(b.from), where('station'), good, 500); break;
      case 'threat': travel(where(b.from), where(b.to), C.strike, 800); break;
      case 'net-strike': travel(where(b.from), where(b.to), C.strike, 450); bloom(where(b.to), C.strike); break;
      case 'lapse': case 'interrupted': bloom(where(b.from), C.dim, 3); break;
      case 'relay': travel(where(b.from), where(b.to), good); break;
      case 'flow': flowTo(flows.from, flows.to); break;
      case 'hit': travel(where(b.from), where('station'), C.strike, 450); bloom(where('station'), C.strike, 4); break;
      case 'distress': case 'broken': bloom(where(b.from), C.strike, 4); break;
      case 'basin': bloom(where('basin'), b.good ? C.life : C.strike, 9, 900); break;
    }
  }
  function finish() {
    if (!playing) return;
    const p = playing; playing = null;
    p.timers.forEach((id) => clearTimeout(id));
    fx.forEach((f) => f.end()); fx = [];
    if (!p.applied) p.apply();
    p.done();
  }
  function play(beats: Beat[], flows: { from: number; to: number }, apply: () => void, onPhase: (phase: number) => void, done: () => void) {
    finish();
    if (reducedMotion) { apply(); onPhase(4); done(); return; }
    const p = { timers: [] as number[], apply, applied: false, done }; playing = p;
    const PHASE_MS = 750;
    for (let ph = 1; ph <= 4; ph++) {
      const inPhase = beats.filter((b) => b.phase === ph);
      p.timers.push(window.setTimeout(() => {
        onPhase(ph);
        if (ph === 4 && !p.applied) { p.applied = true; apply(); }
        inPhase.forEach((b, k) => p.timers.push(window.setTimeout(() => effectOf(b, flows), k * 140)));
      }, (ph - 1) * PHASE_MS));
    }
    p.timers.push(window.setTimeout(finish, 4 * PHASE_MS + 250));
  }

  let last = performance.now(), raf = 0, alive = true, clock = 0;
  function frame(now: number) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reducedMotion) {
      clock += dt;
      if (!ptr.size && selected < 0 && composing < 0) view.az += dt * 0.025;
      systems.forEach((s) => {
        if (s.planet) { s.planet.rotation.y += dt * s.spin; const c = s.planet.getObjectByName('counter'); if (c) c.rotation.y -= dt * s.spin * 2.2; }
        if (s.distress.visible) { s.pulse += dt; s.distress.scale.setScalar(1 + (circulation ? 0.07 : 0.12) * Math.sin(s.pulse * (circulation ? 1.5 : 4))); }
      });
    }
    if (reducedMotion) clock += dt;
    systems.forEach((s) => { if (s.material) s.material.uniforms.uTime.value = reducedMotion ? 0 : clock; });
    fx = fx.filter((f) => { if (clock < f.t0) return true; const u = Math.min(1, (clock - f.t0) / f.dur); f.tick(u); if (u >= 1) { f.end(); return false; } return true; });
    if (selRing.visible && !reducedMotion) { selRing.rotation.y += dt * 0.4; selRing2.rotation.y -= dt * 0.25; }
    if (ghostKind) ghostGroup.children.forEach((o) => { ((o as Line).material as LineDashedMaterial).opacity = 0.55 + 0.4 * Math.sin(clock * 5); });
    if (ghostKind === 'hide') station.material.opacity = 0.6 + 0.35 * Math.sin(clock * 3);
    place(); renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const vis = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); } };
  document.addEventListener('visibilitychange', vis);
  resize(); place(); raf = requestAnimationFrame(frame);

  const tmp = new Vector3();
  return {
    update, resize, canvas: el, select, preview, play, skip: finish, route,
    composing(from) { composing = from; },
    clearFeedback() { fx.forEach(f => f.end()); fx = []; },
    perform(score) {
      fx.forEach(f => f.end()); fx = [];
      if (reducedMotion) return;
      score.passages.forEach(p => travel(where(p.transfer.from), where(p.transfer.to), p.transfer.kind === 'used' ? C.signal : C.life, p.duration, p.at));
      score.accents.forEach(p => bloom(centre(p.world), p.kind === 'warning' ? C.strike : p.kind === 'wake' ? C.life : designs[systems[p.world].theme].t.accent, 4, 430, p.at));
    },
    flow(transfers) {
      if (reducedMotion) return;
      transfers.forEach((t) => travel(where(t.from), where(t.to), t.kind === 'used' ? C.signal : C.life, 1050));
      if (transfers.some((t) => t.to === 'basin')) bloom(where('basin'), C.life, 6, 1200);
    },
    screenOf(i) { tmp.copy(centre(i)); tmp.y += PLANET * 1.25; tmp.project(camera); return { x: (tmp.x * 0.5 + 0.5) * host.clientWidth, y: (-tmp.y * 0.5 + 0.5) * host.clientHeight, visible: tmp.z < 1 }; },
    dispose() { alive = false; cancelAnimationFrame(raf); document.removeEventListener('visibilitychange', vis); renderer.dispose(); el.remove(); },
  };
}
