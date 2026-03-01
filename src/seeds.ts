// Genome builder: convert hand-written parametric functions to vec3 CGP genomes

import {
  CGPGenome, CGPNode, FUNCTIONS, NUM_INPUTS, NUM_OUTPUTS,
  MAX_ARITY, randInt, randFloat, DEFAULT_NUM_CONSTANTS,
} from './cgp';

// --- Trace types ---

type TraceEntry =
  | { type: 'input'; inputIdx: number }
  | { type: 'const'; value: [number, number, number] }
  | { type: 'op'; funcIdx: number; inputs: number[] };

type TraceId = number;

interface SeedOutputs {
  pos: TraceId;
  col: TraceId;
}

// --- GenomeBuilder ---

export class GenomeBuilder {
  private traces: TraceEntry[] = [];

  // Pre-registered vec3 input trace IDs
  readonly UV0: TraceId;  // vec3(u, v, 0)
  readonly UVD: TraceId;  // vec3(u, v, d)
  readonly UVT: TraceId;  // vec3(u, v, t)
  readonly UVA: TraceId;  // vec3(u, v, a)
  readonly DAT: TraceId;  // vec3(d, a, t)
  readonly UVT2: TraceId; // vec3(u, v, t2)

  constructor() {
    this.UV0 = this.addTrace({ type: 'input', inputIdx: 0 });
    this.UVD = this.addTrace({ type: 'input', inputIdx: 1 });
    this.UVT = this.addTrace({ type: 'input', inputIdx: 2 });
    this.UVA = this.addTrace({ type: 'input', inputIdx: 3 });
    this.DAT = this.addTrace({ type: 'input', inputIdx: 4 });
    this.UVT2 = this.addTrace({ type: 'input', inputIdx: 5 });
  }

  private addTrace(entry: TraceEntry): TraceId {
    this.traces.push(entry);
    return this.traces.length - 1;
  }

  private funcIndex(name: string): number {
    const idx = FUNCTIONS.findIndex(f => f.name === name);
    if (idx === -1) throw new Error(`Unknown CGP function: ${name}`);
    return idx;
  }

  // --- Vec3 Constants ---
  c(x: number, y: number, z: number): TraceId {
    // Reuse existing constant if close enough
    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.type === 'const' &&
        Math.abs(t.value[0] - x) < 1e-8 &&
        Math.abs(t.value[1] - y) < 1e-8 &&
        Math.abs(t.value[2] - z) < 1e-8) return i;
    }
    return this.addTrace({ type: 'const', value: [x, y, z] });
  }

  // Uniform constant: same value for all 3 components
  cu(v: number): TraceId { return this.c(v, v, v); }

  // --- Unary operations (14) ---
  sin(a: TraceId): TraceId { return this.unary('sin', a); }
  cos(a: TraceId): TraceId { return this.unary('cos', a); }
  abs(a: TraceId): TraceId { return this.unary('abs', a); }
  neg(a: TraceId): TraceId { return this.unary('neg', a); }
  fract(a: TraceId): TraceId { return this.unary('fract', a); }
  tanh(a: TraceId): TraceId { return this.unary('tanh', a); }
  floor(a: TraceId): TraceId { return this.unary('floor', a); }
  sign(a: TraceId): TraceId { return this.unary('sign', a); }
  sqrt(a: TraceId): TraceId { return this.unary('sqrt', a); }
  normalize(a: TraceId): TraceId { return this.unary('normalize', a); }
  tri_wave(a: TraceId): TraceId { return this.unary('tri_wave', a); }
  swizzle_yzx(a: TraceId): TraceId { return this.unary('swizzle_yzx', a); }
  swizzle_zxy(a: TraceId): TraceId { return this.unary('swizzle_zxy', a); }
  spherical(a: TraceId): TraceId { return this.unary('spherical', a); }
  hsv2rgb(a: TraceId): TraceId { return this.unary('hsv2rgb', a); }
  rgb2hsv(a: TraceId): TraceId { return this.unary('rgb2hsv', a); }
  cylindrical(a: TraceId): TraceId { return this.unary('cylindrical', a); }
  exp(a: TraceId): TraceId { return this.unary('exp', a); }
  bw(a: TraceId): TraceId { return this.unary('bw', a); }

  // --- Binary operations (26) ---
  add(a: TraceId, b: TraceId): TraceId { return this.binary('add', a, b); }
  sub(a: TraceId, b: TraceId): TraceId { return this.binary('sub', a, b); }
  mul(a: TraceId, b: TraceId): TraceId { return this.binary('mul', a, b); }
  div(a: TraceId, b: TraceId): TraceId { return this.binary('div', a, b); }
  min(a: TraceId, b: TraceId): TraceId { return this.binary('min', a, b); }
  max(a: TraceId, b: TraceId): TraceId { return this.binary('max', a, b); }
  mod(a: TraceId, b: TraceId): TraceId { return this.binary('mod', a, b); }
  pow(a: TraceId, b: TraceId): TraceId { return this.binary('pow', a, b); }
  cross(a: TraceId, b: TraceId): TraceId { return this.binary('cross', a, b); }
  dot_v(a: TraceId, b: TraceId): TraceId { return this.binary('dot_v', a, b); }
  uniform_scale(a: TraceId, b: TraceId): TraceId { return this.binary('uniform_scale', a, b); }
  rotate_x(a: TraceId, b: TraceId): TraceId { return this.binary('rotate_x', a, b); }
  rotate_y(a: TraceId, b: TraceId): TraceId { return this.binary('rotate_y', a, b); }
  rotate_z(a: TraceId, b: TraceId): TraceId { return this.binary('rotate_z', a, b); }
  reflect(a: TraceId, b: TraceId): TraceId { return this.binary('reflect', a, b); }
  avg(a: TraceId, b: TraceId): TraceId { return this.binary('avg', a, b); }
  noise_v(a: TraceId, b: TraceId): TraceId { return this.binary('noise_v', a, b); }
  swirl(a: TraceId, b: TraceId): TraceId { return this.binary('swirl', a, b); }
  simplex3d(a: TraceId, b: TraceId): TraceId { return this.binary('simplex3d', a, b); }
  kaleidoscope(a: TraceId, b: TraceId): TraceId { return this.binary('kaleidoscope', a, b); }
  repeat(a: TraceId, b: TraceId): TraceId { return this.binary('repeat', a, b); }
  rotate_xyz(a: TraceId, b: TraceId): TraceId { return this.binary('rotate_xyz', a, b); }
  fold(a: TraceId, b: TraceId): TraceId { return this.binary('fold', a, b); }
  smin(a: TraceId, b: TraceId): TraceId { return this.binary('smin', a, b); }
  smax(a: TraceId, b: TraceId): TraceId { return this.binary('smax', a, b); }
  quantize(a: TraceId, b: TraceId): TraceId { return this.binary('quantize', a, b); }
  pulse(a: TraceId, b: TraceId): TraceId { return this.binary('pulse', a, b); }
  breathe(a: TraceId, b: TraceId): TraceId { return this.binary('breathe', a, b); }
  wave_displace(a: TraceId, b: TraceId): TraceId { return this.binary('wave_displace', a, b); }
  orbit(a: TraceId, b: TraceId): TraceId { return this.binary('orbit', a, b); }
  hue_shift(a: TraceId, b: TraceId): TraceId { return this.binary('hue_shift', a, b); }

  // --- Ternary operations (4) ---
  transform(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('transform', a, b, c); }
  mix_v(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('mix_v', a, b, c); }
  clamp_v(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('clamp_v', a, b, c); }
  smoothstep_v(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('smoothstep_v', a, b, c); }
  fma(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('fma', a, b, c); }
  select(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('select', a, b, c); }
  remap(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('remap', a, b, c); }
  rot_axis(a: TraceId, b: TraceId, c: TraceId): TraceId { return this.ternary('rot_axis', a, b, c); }

  private unary(name: string, a: TraceId): TraceId {
    return this.addTrace({ type: 'op', funcIdx: this.funcIndex(name), inputs: [a] });
  }

  private binary(name: string, a: TraceId, b: TraceId): TraceId {
    return this.addTrace({ type: 'op', funcIdx: this.funcIndex(name), inputs: [a, b] });
  }

  private ternary(name: string, a: TraceId, b: TraceId, c: TraceId): TraceId {
    return this.addTrace({ type: 'op', funcIdx: this.funcIndex(name), inputs: [a, b, c] });
  }

  // --- Build genome ---

  build(outputs: SeedOutputs, cols: number, rows: number): CGPGenome {
    // 1. Separate constants and ops
    const constEntries: { traceIdx: number; value: [number, number, number] }[] = [];
    const opEntries: { traceIdx: number; funcIdx: number; inputs: number[] }[] = [];

    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.type === 'const') constEntries.push({ traceIdx: i, value: t.value });
      else if (t.type === 'op') opEntries.push({ traceIdx: i, funcIdx: t.funcIdx, inputs: [...t.inputs] });
    }

    // 2. Build genome constants array (pad to at least DEFAULT_NUM_CONSTANTS)
    const numConsts = Math.max(constEntries.length, DEFAULT_NUM_CONSTANTS);
    const genomeConstants: number[][] = new Array(numConsts).fill(null).map((_, i) =>
      i < constEntries.length
        ? [...constEntries[i].value]
        : [randFloat(-2, 2), randFloat(-2, 2), randFloat(-2, 2)]
    );

    const inputSlots = NUM_INPUTS + numConsts;

    // 3. Create trace-to-genome-index mapping for inputs and constants
    const mapping = new Map<number, number>();
    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.type === 'input') mapping.set(i, t.inputIdx);
    }
    for (let ci = 0; ci < constEntries.length; ci++) {
      mapping.set(constEntries[ci].traceIdx, NUM_INPUTS + ci);
    }

    // 4. Compute min column for each op (must be after all its inputs)
    const traces = this.traces;
    const getMinColumn = (traceIdx: number): number => {
      const t = traces[traceIdx];
      if (t.type !== 'op') return -1;
      let minCol = 0;
      for (const inp of t.inputs) {
        const genomeIdx = mapping.get(inp);
        if (genomeIdx !== undefined && genomeIdx >= inputSlots) {
          const nodeIdx = genomeIdx - inputSlots;
          const col = Math.floor(nodeIdx / rows);
          minCol = Math.max(minCol, col + 1);
        }
      }
      return minCol;
    };

    // Ops are already in topological order (each references only earlier traces)
    const columnFill = new Array(cols).fill(0);
    const gridNodes: CGPNode[] = [];

    // Pre-fill grid with random inactive nodes
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const maxSource = inputSlots + c * rows;
        gridNodes.push({
          funcIdx: randInt(FUNCTIONS.length),
          inputs: Array.from({ length: MAX_ARITY }, () => randInt(maxSource)),
        });
      }
    }

    // Place seed ops into the grid
    for (const op of opEntries) {
      const minCol = getMinColumn(op.traceIdx);
      let col = minCol;
      while (col < cols && columnFill[col] >= rows) col++;
      if (col >= cols) throw new Error(`Grid ${cols}x${rows} too small for seed (need column ${col})`);

      const row = columnFill[col];
      columnFill[col]++;

      const nodeIdx = col * rows + row;
      const genomeIdx = inputSlots + nodeIdx;

      // Map inputs from trace IDs to genome indices
      const mappedInputs = op.inputs.map(inp => {
        const gi = mapping.get(inp);
        if (gi === undefined) throw new Error(`Unmapped trace input ${inp}`);
        return gi;
      });
      // Pad to MAX_ARITY inputs
      while (mappedInputs.length < MAX_ARITY) mappedInputs.push(mappedInputs[0]);

      gridNodes[nodeIdx] = { funcIdx: op.funcIdx, inputs: mappedInputs };
      mapping.set(op.traceIdx, genomeIdx);
    }

    // 5. Map outputs (2: pos, col)
    const outKeys: (keyof SeedOutputs)[] = ['pos', 'col'];
    const outputIndices = outKeys.map(k => {
      const gi = mapping.get(outputs[k]);
      if (gi === undefined) throw new Error(`Unmapped output '${k}' (trace ${outputs[k]})`);
      return gi;
    });

    return { cols, rows, nodes: gridNodes, outputIndices, constants: genomeConstants, version: 5 };
  }
}

// --- Preset seeds ---

export type SeedFactory = (cols: number, rows: number) => CGPGenome;

// Helper: build a unit sphere from rotation chains.
// rot_y((1,0,0), v/2) → tilt from equator, then rot_z by u → sweep longitude.
// Returns the sphere position TraceId.
export function buildSphere(b: GenomeBuilder): TraceId {
  const base = b.c(1, 0, 0);
  const halfUV = b.mul(b.UV0, b.cu(0.5));     // vec3(u/2, v/2, 0)
  const latAngle = b.swizzle_yzx(halfUV);     // vec3(v/2, 0, u/2) — .x = v/2
  const tilted = b.rotate_y(base, latAngle);    // (cos(v/2), 0, -sin(v/2))
  return b.rotate_z(tilted, b.UV0);             // full sphere
}

// --- 1. Sphere ---
// Demonstrates: rotate_y, rotate_z, mul, swizzle_yzx, hsv2rgb, add
function sphereSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const pos = buildSphere(b);

  // Color: hsv2rgb — hue from u (longitude), saturation from v (latitude)
  const scale = b.c(1 / (2 * Math.PI), 1 / (2 * Math.PI), 0);
  const normalized = b.mul(b.UV0, scale);
  const hsv = b.add(normalized, b.c(0, 0.5, 0.9));
  const col = b.hsv2rgb(hsv);

  return b.build({ pos, col }, cols, rows);
}

// --- 2. Torus ---
// Demonstrates: cos, swizzle_yzx, rotate_y, rotate_z, add
function torusSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const tubeR = b.c(0.5, 0, 0);
  const vAngle = b.swizzle_yzx(b.UV0);
  const tube = b.rotate_y(tubeR, vAngle);
  const majorR = b.c(1.2, 0, 0);
  const offset = b.add(tube, majorR);
  const pos = b.rotate_z(offset, b.UV0);
  const col = b.cos(b.DAT);
  return b.build({ pos, col }, cols, rows);
}

// --- 3. Crystal ---
// Demonstrates: floor, fract, mul
function crystalSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);
  const scaled = b.mul(sphere, b.cu(3.0));
  const pos = b.mul(b.floor(scaled), b.cu(0.4));
  const col = b.fract(scaled);
  return b.build({ pos, col }, cols, rows);
}

// --- 4. Swirl ---
// Demonstrates: swirl, sin
function swirlSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);
  const pos = b.swirl(sphere, b.cu(2.0));
  const mixed = b.add(sphere, b.swizzle_yzx(sphere));
  const col = b.sin(mixed);
  return b.build({ pos, col }, cols, rows);
}

// --- 5. Asteroid ---
// Demonstrates: simplex3d, uniform_scale, normalize
function asteroidSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // Simplex noise displaces sphere surface radially
  const noise = b.simplex3d(sphere, b.c(4.0, 1.0, 0.0));
  // uniform_scale: sphere * (1 + noise.x * 0.15) — radial bumps
  const bumpScale = b.add(b.cu(1.0), b.mul(noise, b.cu(0.15)));
  const pos = b.uniform_scale(sphere, bumpScale);

  // Color: normalize noise direction → hsv rainbow
  const col = b.hsv2rgb(b.normalize(noise));

  return b.build({ pos, col }, cols, rows);
}

// --- 6. Spiky ---
// Demonstrates: pow, abs, dot_v, sub
function spikySeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // sub(sphere, sphere.yzx) = (x-y, y-z, z-x) — differences between components
  // abs + pow(3) sharpens into angular spikes
  const diff = b.sub(sphere, b.swizzle_yzx(sphere));
  const sharp = b.pow(b.abs(diff), b.cu(3.0));
  const pos = b.add(sphere, b.mul(sharp, b.cu(0.5)));

  // Color: dot_v with golden-ratio vector → angular gradient
  const col = b.sin(b.dot_v(sphere, b.c(1, 1.618, 0.618)));

  return b.build({ pos, col }, cols, rows);
}

// --- 7. Shell ---
// Demonstrates: uniform_scale, swizzle_zxy, spherical, mod
// Latitude ridges via sin(8z) radial modulation
function shellSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // Isolate z-component, scale up for frequency, take sin for ridges
  const ridges = b.swizzle_zxy(b.sin(b.mul(sphere, b.c(0, 0, 8))));
  // Radial bump: scale sphere by 1 + 0.15 * sin(8z)
  const bump = b.add(b.cu(1), b.mul(ridges, b.cu(0.15)));
  const pos = b.uniform_scale(sphere, bump);

  // Color: spherical angles through mod for banded stripes
  const col = b.mod(b.mul(b.spherical(sphere), b.cu(3)), b.cu(1));

  return b.build({ pos, col }, cols, rows);
}

// --- 8. Gem ---
// Demonstrates: dot_v, div, abs, mul
// Projects sphere → octahedron via L1 norm, then stretches into diamond
function gemSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // L1 norm: |x| + |y| + |z| → project onto octahedron (dual of cube)
  const l1 = b.dot_v(b.abs(sphere), b.cu(1));
  const octa = b.div(sphere, l1);

  // Stretch vertically into diamond proportions
  const pos = b.mul(octa, b.c(0.8, 0.8, 1.4));

  // Color: each octant gets a distinct hue
  const col = b.abs(sphere);

  return b.build({ pos, col }, cols, rows);
}

// --- 9. Ripple ---
// Demonstrates: tri_wave, avg, rotate_x
function rippleSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // Triangle waves of scaled sphere position → periodic bumps per axis
  const waves = b.tri_wave(b.mul(sphere, b.cu(4.0)));
  // avg blends bumpy version with original → gentle rippled surface
  const pos = b.avg(sphere, b.mul(sphere, waves));

  // Color: rotate_x twists UVA, tri_wave maps to vivid bands
  const col = b.tri_wave(b.rotate_x(b.UVA, b.UV0));

  return b.build({ pos, col }, cols, rows);
}

// --- 10. Organic ---
// Demonstrates: tanh, noise_v, sign, div
function organicSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // Hash noise → tanh saturates smoothly, sign creates hard patches
  const noise = b.noise_v(sphere, b.DAT);
  const smooth = b.tanh(noise);
  const hard = b.sign(noise);
  // Combined: smooth curves + hard edges → organic texture
  const pos = b.add(sphere, b.mul(b.add(smooth, hard), b.cu(0.1)));

  // Color: div of UV by π → smooth gradient
  const col = b.div(b.UVA, b.cu(Math.PI));

  return b.build({ pos, col }, cols, rows);
}

// --- 11. Twist ---
// Demonstrates: cross, swizzle_zxy, rgb2hsv
function twistSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // cross(sphere, sphere.zxy) creates perpendicular quadratic wings
  const crossed = b.cross(sphere, b.swizzle_zxy(sphere));
  // Blend sphere + cross product → twisted organic form
  const pos = b.add(b.mul(sphere, b.cu(0.6)), b.mul(crossed, b.cu(0.6)));

  // Color: abs(sphere) as RGB → rgb2hsv → swizzle channels
  const col = b.swizzle_zxy(b.rgb2hsv(b.abs(sphere)));

  return b.build({ pos, col }, cols, rows);
}

// --- 12. Cube ---
// Demonstrates: abs, max, swizzle_yzx, swizzle_zxy, div, simplex3d
function cubeSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const sphere = buildSphere(b);

  // Project sphere → cube by dividing by infinity norm (max absolute component)
  const abs_s = b.abs(sphere);
  const m1 = b.max(abs_s, b.swizzle_yzx(abs_s));
  const m2 = b.max(m1, b.swizzle_zxy(abs_s));   // all components = max(|x|,|y|,|z|)
  const cube = b.div(sphere, m2);

  // Tilt so 3 faces are visible from the initial camera angle
  const pos = b.rotate_y(b.rotate_x(cube, b.cu(0.4)), b.cu(0.5));

  // Color: simplex noise sampled from sphere coords (uniform distribution)
  // tri() in the shader maps each channel to [0,1] → vibrant RGB
  const col = b.simplex3d(sphere, b.c(4.0, 1.0, 0.0));

  return b.build({ pos, col }, cols, rows);
}

// --- 13. Nautilus ---
// Demonstrates: exp, uniform_scale, rotate_y, rotate_z, pow, dot_v, mix_v
// Logarithmic spiral with growing tube cross-section and natural stripe pattern
function nautilusSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();

  // Tube cross-section: rotate (0.75, 0, 0) by v around Y axis
  // Ratio 0.75 matches original (R*(exp(0.3π)-1)*0.475 ≈ 0.744R)
  // and exceeds the self-intersection threshold of (g-1)/(g+1) ≈ 0.44
  const tubeCenter = b.c(0.75, 0, 0);
  const vAngle = b.swizzle_yzx(b.UV0);              // (v, 0, u) — .x = v
  const tubePoint = b.rotate_y(tubeCenter, vAngle);  // circle in XZ plane

  // Add major radius offset → torus-like cross section
  const shellSection = b.add(tubePoint, b.c(1, 0, 0));

  // Sweep around Z by spiralAngle = 3u (3 full turns over [-π, π])
  const spiralAngle = b.mul(b.UV0, b.c(3, 0, 0));
  const rotated = b.rotate_z(shellSection, spiralAngle);

  // Logarithmic growth: R = exp(0.45u), ratio ≈ 17:1 from inner to outer
  const kAngle = b.mul(b.UV0, b.c(0.45, 0, 0));     // (0.45u, 0, 0)
  const Rvec = b.exp(kAngle);                         // (R, 1, 1)
  const scaled = b.uniform_scale(rotated, Rvec);
  const pos = b.mul(scaled, b.cu(0.25));

  // Color: nautilus stripe pattern — sin(30u)^4 as blend factor
  const freqAngle = b.mul(b.UV0, b.c(300, 0, 0));
  const stripeIntensity = b.pow(b.sin(freqAngle), b.cu(4));
  const sVec = b.dot_v(stripeIntensity, b.c(1, 0, 0)); // broadcast x → all

  // Pre-tri() colors: tri(x) = 2x for x ∈ [0, 0.5]
  // Base (0.95, 0.90, 0.80) → pre-tri (0.475, 0.45, 0.40)
  // Stripe (0.60, 0.30, 0.10) → pre-tri (0.30, 0.15, 0.05)
  const col = b.mix_v(b.c(0.475, 0.45, 0.40), b.c(0.30, 0.15, 0.05), sVec);

  return b.build({ pos, col }, cols, rows);
}

export interface Preset {
  name: string;
  create: SeedFactory;
}

export const PRESETS: Preset[] = [
  { name: 'Sphere', create: sphereSeed },
  { name: 'Torus', create: torusSeed },
  { name: 'Crystal', create: crystalSeed },
  { name: 'Swirl', create: swirlSeed },
  { name: 'Asteroid', create: asteroidSeed },
  { name: 'Spiky', create: spikySeed },
  { name: 'Shell', create: shellSeed },
  { name: 'Gem', create: gemSeed },
  { name: 'Ripple', create: rippleSeed },
  { name: 'Organic', create: organicSeed },
  { name: 'Twist', create: twistSeed },
  { name: 'Cube', create: cubeSeed },
  { name: 'Nautilus', create: nautilusSeed },
];
