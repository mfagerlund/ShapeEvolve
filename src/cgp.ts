// Cartesian Genetic Programming engine for ShapeEvolve — Vec3 architecture (v3)

export type Vec3 = [number, number, number];

export const INPUT_NAMES = ['uv0', 'uvd', 'uvt', 'uva', 'dat'] as const;
export const OUTPUT_NAMES = ['pos', 'col'] as const;
export const NUM_INPUTS = INPUT_NAMES.length;
export const NUM_OUTPUTS = OUTPUT_NAMES.length;
export const DEFAULT_NUM_CONSTANTS = 6;
export const MAX_ARITY = 2;

// --- Vec3 JS helpers ---

function v3add(a: Vec3, b: Vec3): Vec3 { return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]; }
function v3sub(a: Vec3, b: Vec3): Vec3 { return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]; }
function v3mul(a: Vec3, b: Vec3): Vec3 { return [a[0]*b[0], a[1]*b[1], a[2]*b[2]]; }
function v3scale(a: Vec3, s: number): Vec3 { return [a[0]*s, a[1]*s, a[2]*s]; }
function v3dot(a: Vec3, b: Vec3): number { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function v3cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function v3len(a: Vec3): number { return Math.sqrt(v3dot(a, a)); }
function v3normalize(a: Vec3): Vec3 {
  const l = v3len(a);
  return l < 1e-8 ? [0, 0, 0] : [a[0]/l, a[1]/l, a[2]/l];
}

const safeDivF = (a: number, b: number) => Math.abs(b) < 0.001 ? a / 0.001 : a / b;
const safeSqrtF = (a: number) => Math.sqrt(Math.abs(a));
const safeModF = (a: number, b: number) => Math.abs(b) < 0.001 ? a : a % b;
const safePowF = (a: number, b: number) => Math.pow(Math.abs(a) + 0.0001, Math.min(4, Math.max(-4, b)));
const triF = (x: number) => { const t = x - Math.floor(x); return 1.0 - Math.abs(t * 2.0 - 1.0); };

function v3map(a: Vec3, fn: (x: number) => number): Vec3 { return [fn(a[0]), fn(a[1]), fn(a[2])]; }
function v3map2(a: Vec3, b: Vec3, fn: (x: number, y: number) => number): Vec3 {
  return [fn(a[0], b[0]), fn(a[1], b[1]), fn(a[2], b[2])];
}

// --- 3D Simplex noise (JS, Stefan Gustavson / Ashima Arts) ---

const _sn_grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
const _sn_perm = new Uint8Array(512);
{
  const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  for (let i = 0; i < 256; i++) _sn_perm[i] = _sn_perm[i + 256] = p[i];
}

function simplexNoise3D(x: number, y: number, z: number): number {
  const F3 = 1/3, G3 = 1/6;
  const s = (x + y + z) * F3;
  const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s);
  const t = (i + j + k) * G3;
  const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t);
  let i1: number, j1: number, k1: number, i2: number, j2: number, k2: number;
  if (x0 >= y0) {
    if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
    else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
    else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
  } else {
    if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
    else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
    else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
  }
  const x1 = x0-i1+G3, y1 = y0-j1+G3, z1 = z0-k1+G3;
  const x2 = x0-i2+2*G3, y2 = y0-j2+2*G3, z2 = z0-k2+2*G3;
  const x3 = x0-1+3*G3, y3 = y0-1+3*G3, z3 = z0-1+3*G3;
  const ii = i & 255, jj = j & 255, kk = k & 255;
  const gi0 = _sn_perm[ii + _sn_perm[jj + _sn_perm[kk]]] % 12;
  const gi1 = _sn_perm[ii+i1 + _sn_perm[jj+j1 + _sn_perm[kk+k1]]] % 12;
  const gi2 = _sn_perm[ii+i2 + _sn_perm[jj+j2 + _sn_perm[kk+k2]]] % 12;
  const gi3 = _sn_perm[ii+1 + _sn_perm[jj+1 + _sn_perm[kk+1]]] % 12;
  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
  if (t0 >= 0) { t0 *= t0; n0 = t0*t0 * (_sn_grad3[gi0][0]*x0 + _sn_grad3[gi0][1]*y0 + _sn_grad3[gi0][2]*z0); }
  let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
  if (t1 >= 0) { t1 *= t1; n1 = t1*t1 * (_sn_grad3[gi1][0]*x1 + _sn_grad3[gi1][1]*y1 + _sn_grad3[gi1][2]*z1); }
  let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
  if (t2 >= 0) { t2 *= t2; n2 = t2*t2 * (_sn_grad3[gi2][0]*x2 + _sn_grad3[gi2][1]*y2 + _sn_grad3[gi2][2]*z2); }
  let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
  if (t3 >= 0) { t3 *= t3; n3 = t3*t3 * (_sn_grad3[gi3][0]*x3 + _sn_grad3[gi3][1]*y3 + _sn_grad3[gi3][2]*z3); }
  return 32 * (n0 + n1 + n2 + n3);
}

// --- Function set ---

export interface CGPFunction {
  name: string;
  arity: number; // 1 or 2
  glsl: (args: string[]) => string;
  js: (args: Vec3[]) => Vec3;
}

export const FUNCTIONS: CGPFunction[] = [
  // --- Unary (14) ---
  { name: 'sin', arity: 1, glsl: ([a]) => `sin(${a})`, js: ([a]) => v3map(a, Math.sin) },
  { name: 'cos', arity: 1, glsl: ([a]) => `cos(${a})`, js: ([a]) => v3map(a, Math.cos) },
  { name: 'abs', arity: 1, glsl: ([a]) => `abs(${a})`, js: ([a]) => v3map(a, Math.abs) },
  { name: 'neg', arity: 1, glsl: ([a]) => `(-${a})`, js: ([a]) => v3map(a, x => -x) },
  { name: 'fract', arity: 1, glsl: ([a]) => `fract(${a})`, js: ([a]) => v3map(a, x => x - Math.floor(x)) },
  { name: 'tanh', arity: 1, glsl: ([a]) => `tanh(${a})`, js: ([a]) => v3map(a, Math.tanh) },
  { name: 'floor', arity: 1, glsl: ([a]) => `floor(${a})`, js: ([a]) => v3map(a, Math.floor) },
  { name: 'sign', arity: 1, glsl: ([a]) => `sign(${a})`, js: ([a]) => v3map(a, Math.sign) },
  { name: 'sqrt', arity: 1, glsl: ([a]) => `safesqrt3(${a})`, js: ([a]) => v3map(a, safeSqrtF) },
  { name: 'normalize', arity: 1, glsl: ([a]) => `safeNormalize(${a})`, js: ([a]) => v3normalize(a) },
  { name: 'tri_wave', arity: 1, glsl: ([a]) => `tri3(${a})`, js: ([a]) => v3map(a, triF) },
  { name: 'swizzle_yzx', arity: 1, glsl: ([a]) => `${a}.yzx`, js: ([a]) => [a[1], a[2], a[0]] },
  { name: 'swizzle_zxy', arity: 1, glsl: ([a]) => `${a}.zxy`, js: ([a]) => [a[2], a[0], a[1]] },
  { name: 'spherical', arity: 1, glsl: ([a]) => `spherical(${a})`, js: ([a]) => {
    const [x, y, z] = a;
    const r = Math.sqrt(x*x + y*y + z*z);
    const theta = Math.atan2(y, x);
    const phi = r < 1e-8 ? 0 : Math.acos(Math.min(1, Math.max(-1, z / r)));
    return [r, theta, phi];
  }},

  { name: 'hsv2rgb', arity: 1, glsl: ([a]) => `hsv2rgb(${a})`, js: ([a]) => {
    const h = ((a[0] % 1) + 1) % 1; // wrap hue
    const s = Math.max(0, Math.min(1, a[1])); // clamp saturation
    const v = Math.max(0, Math.min(1, a[2])); // clamp value
    const c = v * s, hp = h * 6, x = c * (1 - Math.abs(hp % 2 - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; } else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; } else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; } else { r = c; b = x; }
    const m = v - c;
    return [r + m, g + m, b + m];
  }},
  { name: 'rgb2hsv', arity: 1, glsl: ([a]) => `rgb2hsv(${a})`, js: ([a]) => {
    const r = Math.max(0, Math.min(1, a[0])); // clamp inputs
    const g = Math.max(0, Math.min(1, a[1]));
    const b = Math.max(0, Math.min(1, a[2]));
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const v = mx, s = mx < 1e-8 ? 0 : d / mx;
    let h = 0;
    if (d > 1e-8) {
      if (mx === r) h = ((g - b) / d + 6) % 6 / 6;
      else if (mx === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h, s, v];
  }},

  // --- Binary (18) ---
  { name: 'add', arity: 2, glsl: ([a, b]) => `(${a}+${b})`, js: ([a, b]) => v3add(a, b) },
  { name: 'sub', arity: 2, glsl: ([a, b]) => `(${a}-${b})`, js: ([a, b]) => v3sub(a, b) },
  { name: 'mul', arity: 2, glsl: ([a, b]) => `(${a}*${b})`, js: ([a, b]) => v3mul(a, b) },
  { name: 'div', arity: 2, glsl: ([a, b]) => `safediv3(${a},${b})`, js: ([a, b]) => v3map2(a, b, safeDivF) },
  { name: 'min', arity: 2, glsl: ([a, b]) => `min(${a},${b})`, js: ([a, b]) => v3map2(a, b, Math.min) },
  { name: 'max', arity: 2, glsl: ([a, b]) => `max(${a},${b})`, js: ([a, b]) => v3map2(a, b, Math.max) },
  { name: 'mod', arity: 2, glsl: ([a, b]) => `safemod3(${a},${b})`, js: ([a, b]) => v3map2(a, b, safeModF) },
  { name: 'pow', arity: 2, glsl: ([a, b]) => `safepow3(${a},${b})`, js: ([a, b]) => v3map2(a, b, safePowF) },
  { name: 'cross', arity: 2, glsl: ([a, b]) => `cross(${a},${b})`, js: ([a, b]) => v3cross(a, b) },
  { name: 'dot_v', arity: 2, glsl: ([a, b]) => `vec3(dot(${a},${b}))`, js: ([a, b]) => { const d = v3dot(a, b); return [d, d, d]; } },
  { name: 'uniform_scale', arity: 2, glsl: ([a, b]) => `${a}*${b}.x`, js: ([a, b]) => v3scale(a, b[0]) },
  { name: 'rotate_x', arity: 2, glsl: ([a, b]) => `rot_x(${a},${b}.x)`, js: ([a, b]) => {
    const c = Math.cos(b[0]), s = Math.sin(b[0]);
    return [a[0], a[1]*c - a[2]*s, a[1]*s + a[2]*c];
  }},
  { name: 'rotate_y', arity: 2, glsl: ([a, b]) => `rot_y(${a},${b}.x)`, js: ([a, b]) => {
    const c = Math.cos(b[0]), s = Math.sin(b[0]);
    return [a[0]*c + a[2]*s, a[1], -a[0]*s + a[2]*c];
  }},
  { name: 'rotate_z', arity: 2, glsl: ([a, b]) => `rot_z(${a},${b}.x)`, js: ([a, b]) => {
    const c = Math.cos(b[0]), s = Math.sin(b[0]);
    return [a[0]*c - a[1]*s, a[0]*s + a[1]*c, a[2]];
  }},
  { name: 'reflect', arity: 2, glsl: ([a, b]) => `reflect(${a},safeNormalize(${b}))`, js: ([a, b]) => {
    const n = v3normalize(b);
    const d = 2 * v3dot(a, n);
    return v3sub(a, v3scale(n, d));
  }},
  { name: 'avg', arity: 2, glsl: ([a, b]) => `(${a}+${b})*0.5`, js: ([a, b]) => v3scale(v3add(a, b), 0.5) },
  { name: 'noise_v', arity: 2, glsl: ([a, b]) => `noise3(${a},${b})`, js: ([a, b]) => {
    const hash = (x: number, y: number) => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return (n - Math.floor(n)) * 2.0 - 1.0;
    };
    return [hash(a[0], b[0]), hash(a[1], b[1]), hash(a[2], b[2])];
  }},
  { name: 'swirl', arity: 2, glsl: ([a, b]) => `swirl3(${a},${b}.x)`, js: ([a, b]) => {
    const [x, y, z] = a;
    const s = b[0];
    const r = Math.sqrt(x*x + y*y);
    const angle = Math.atan2(y, x) + r * s;
    return [r * Math.cos(angle), r * Math.sin(angle), z];
  }},
  { name: 'simplex3d', arity: 2, glsl: ([a, b]) => `simplex3d_v(${a},${b})`, js: ([a, b]) => {
    // b.x = frequency, b.y = amplitude, b.z = seed offset
    const freq = b[0], amp = b[1], seed = b[2];
    const px = a[0] * freq, py = a[1] * freq, pz = a[2] * freq;
    return [
      simplexNoise3D(px, py, pz + seed) * amp,
      simplexNoise3D(px + 31.416, py - 17.53, pz + seed + 7.892) * amp,
      simplexNoise3D(px - 12.77, py + 43.21, pz + seed - 28.65) * amp,
    ];
  }},
];

// --- Genome ---

export interface CGPNode {
  funcIdx: number;
  inputs: number[]; // indices into inputs + previous nodes
}

export interface CGPGenome {
  cols: number;
  rows: number;
  nodes: CGPNode[];         // cols * rows nodes
  outputIndices: number[];  // NUM_OUTPUTS indices (2: pos, col)
  constants: number[][];    // vec3 triplets, e.g. [[0.5, -1.2, 0.3], ...]
  version?: number;         // 3 = vec3 format
}

function numInputSlots(g: CGPGenome): number {
  return NUM_INPUTS + g.constants.length;
}

function totalNodeCount(g: CGPGenome): number {
  return numInputSlots(g) + g.nodes.length;
}

export function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function randFloat(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

export function createRandomGenome(cols: number, rows: number): CGPGenome {
  const constants: number[][] = Array.from({ length: DEFAULT_NUM_CONSTANTS },
    () => [randFloat(-2, 2), randFloat(-2, 2), randFloat(-2, 2)]
  );
  const inputSlots = NUM_INPUTS + constants.length;
  const nodes: CGPNode[] = [];

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const funcIdx = randInt(FUNCTIONS.length);
      const maxSource = inputSlots + c * rows;
      const inputs = Array.from({ length: MAX_ARITY }, () => randInt(maxSource));
      nodes.push({ funcIdx, inputs });
    }
  }

  const totalNodes = inputSlots + nodes.length;
  const outputIndices = Array.from({ length: NUM_OUTPUTS }, () => randInt(totalNodes));

  return { cols, rows, nodes, outputIndices, constants, version: 3 };
}

export function cloneGenome(g: CGPGenome): CGPGenome {
  return {
    cols: g.cols,
    rows: g.rows,
    nodes: g.nodes.map(n => ({ funcIdx: n.funcIdx, inputs: [...n.inputs] })),
    outputIndices: [...g.outputIndices],
    constants: g.constants.map(c => [...c] as [number, number, number]),
    version: g.version,
  };
}

// --- Active node detection ---

export function getActiveNodes(g: CGPGenome): Set<number> {
  const active = new Set<number>();
  const slots = numInputSlots(g);
  const stack = [...g.outputIndices];

  while (stack.length > 0) {
    const idx = stack.pop()!;
    if (idx < slots || active.has(idx)) continue;
    active.add(idx);
    const node = g.nodes[idx - slots];
    const fn = FUNCTIONS[node.funcIdx];
    for (let i = 0; i < fn.arity; i++) {
      stack.push(node.inputs[i]);
    }
  }
  return active;
}

// --- Mutation ---

const GENES_PER_NODE = 1 + MAX_ARITY; // 1 funcIdx + 2 inputs = 3

export function mutateGenome(parent: CGPGenome, numMutations: number): CGPGenome {
  const g = cloneGenome(parent);
  const slots = numInputSlots(g);
  const total = totalNodeCount(g);
  const numConsts = g.constants.length;
  // Each vec3 constant has 3 mutable components
  const numConstGenes = numConsts * 3;
  const numGenes = g.nodes.length * GENES_PER_NODE + NUM_OUTPUTS + numConstGenes;

  // Do numMutations-1 random mutations, then 1 Goldman-Punch (guaranteed active)
  const randomRounds = Math.max(0, numMutations - 1);

  for (let m = 0; m < randomRounds; m++) {
    mutateOneGene(g, slots, total, numConsts, numConstGenes, numGenes);
  }

  // Goldman-Punch: keep mutating until an active gene is hit
  const activeNodes = getActiveNodes(g);
  let hitActive = false;
  let attempts = 0;
  while (!hitActive && attempts < numGenes * 3) {
    attempts++;
    const wasActive = mutateOneGene(g, slots, total, numConsts, numConstGenes, numGenes, activeNodes);
    if (wasActive) hitActive = true;
  }

  return g;
}

function mutateOneGene(
  g: CGPGenome, slots: number, total: number,
  numConsts: number, numConstGenes: number, numGenes: number,
  activeNodes?: Set<number>
): boolean {
  const geneIdx = randInt(numGenes);
  const nodeGeneCount = g.nodes.length * GENES_PER_NODE;

  if (geneIdx < nodeGeneCount) {
    const nodeIdx = Math.floor(geneIdx / GENES_PER_NODE);
    const geneType = geneIdx % GENES_PER_NODE;
    const col = Math.floor(nodeIdx / g.rows);
    const maxSource = slots + col * g.rows;

    if (geneType === 0) {
      g.nodes[nodeIdx].funcIdx = randInt(FUNCTIONS.length);
    } else {
      g.nodes[nodeIdx].inputs[geneType - 1] = randInt(maxSource);
    }

    return activeNodes ? activeNodes.has(nodeIdx + slots) : false;
  } else if (geneIdx < nodeGeneCount + NUM_OUTPUTS) {
    const outputIdx = geneIdx - nodeGeneCount;
    g.outputIndices[outputIdx] = randInt(total);
    return true; // output genes are always active
  } else {
    // Mutate individual component of a vec3 constant
    const constGeneIdx = geneIdx - nodeGeneCount - NUM_OUTPUTS;
    const constIdx = Math.floor(constGeneIdx / 3);
    const compIdx = constGeneIdx % 3;
    g.constants[constIdx][compIdx] += randFloat(-0.5, 0.5);
    return true; // conservative: constants are always "active"
  }
}

// --- Genome version migration ---

export function migrateGenome(g: CGPGenome): CGPGenome {
  if (g.version === 3) return g;
  // v1/v2 → v3: clean break, replace with random genome
  return createRandomGenome(g.cols, g.rows);
}

// --- GLSL compilation ---

const GLSL_PREAMBLE = `
vec3 safediv3(vec3 a, vec3 b) {
  return vec3(
    abs(b.x)<0.001 ? a.x*1000.0 : a.x/b.x,
    abs(b.y)<0.001 ? a.y*1000.0 : a.y/b.y,
    abs(b.z)<0.001 ? a.z*1000.0 : a.z/b.z
  );
}
vec3 safesqrt3(vec3 a) { return sqrt(abs(a)); }
vec3 safepow3(vec3 a, vec3 b) {
  return vec3(
    pow(abs(a.x)+0.0001, clamp(b.x,-4.0,4.0)),
    pow(abs(a.y)+0.0001, clamp(b.y,-4.0,4.0)),
    pow(abs(a.z)+0.0001, clamp(b.z,-4.0,4.0))
  );
}
vec3 safemod3(vec3 a, vec3 b) {
  return vec3(
    abs(b.x)<0.001 ? a.x : mod(a.x, b.x),
    abs(b.y)<0.001 ? a.y : mod(a.y, b.y),
    abs(b.z)<0.001 ? a.z : mod(a.z, b.z)
  );
}
vec3 safeNormalize(vec3 a) {
  float l = length(a);
  return l < 0.00001 ? vec3(0.0) : a / l;
}
float tri(float x) {
  float t = fract(x);
  return 1.0 - abs(t * 2.0 - 1.0);
}
vec3 tri3(vec3 a) { return vec3(tri(a.x), tri(a.y), tri(a.z)); }
vec3 spherical(vec3 a) {
  float r = length(a);
  float theta = atan(a.y, a.x);
  float phi = r < 0.00001 ? 0.0 : acos(clamp(a.z / r, -1.0, 1.0));
  return vec3(r, theta, phi);
}
vec3 rot_x(vec3 a, float angle) {
  float c = cos(angle), s = sin(angle);
  return vec3(a.x, a.y*c - a.z*s, a.y*s + a.z*c);
}
vec3 rot_y(vec3 a, float angle) {
  float c = cos(angle), s = sin(angle);
  return vec3(a.x*c + a.z*s, a.y, -a.x*s + a.z*c);
}
vec3 rot_z(vec3 a, float angle) {
  float c = cos(angle), s = sin(angle);
  return vec3(a.x*c - a.y*s, a.x*s + a.y*c, a.z);
}
vec3 noise3(vec3 a, vec3 b) {
  return vec3(
    fract(sin(a.x*12.9898+b.x*78.233)*43758.5453)*2.0-1.0,
    fract(sin(a.y*12.9898+b.y*78.233)*43758.5453)*2.0-1.0,
    fract(sin(a.z*12.9898+b.z*78.233)*43758.5453)*2.0-1.0
  );
}
vec3 swirl3(vec3 a, float s) {
  float r = length(a.xy);
  float angle = atan(a.y, a.x) + r * s;
  return vec3(r * cos(angle), r * sin(angle), a.z);
}
vec3 hsv2rgb(vec3 c) {
  float h = fract(c.x);       // hue wraps
  float s = clamp(c.y, 0.0, 1.0); // saturation clamps
  float v = clamp(c.z, 0.0, 1.0); // value clamps
  vec3 p = abs(fract(vec3(h) + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - vec3(3.0));
  return v * mix(vec3(1.0), clamp(p - vec3(1.0), 0.0, 1.0), s);
}
vec3 snoise_mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 snoise_mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
vec4 snoise_permute(vec4 x) { return snoise_mod289(((x*34.0)+1.0)*x); }
vec4 snoise_taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise3(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = snoise_mod289(i);
  vec4 p = snoise_permute(snoise_permute(snoise_permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x2_ = x_ * ns.x + ns.yyyy;
  vec4 y2_ = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x2_) - abs(y2_);
  vec4 b0 = vec4(x2_.xy, y2_.xy);
  vec4 b1 = vec4(x2_.zw, y2_.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = snoise_taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
vec3 simplex3d_v(vec3 pos, vec3 params) {
  float freq = params.x;
  float amp = params.y;
  float seed = params.z;
  vec3 p = pos * freq;
  return vec3(
    snoise3(p + vec3(0.0, 0.0, seed)),
    snoise3(p + vec3(31.416, -17.53, seed + 7.892)),
    snoise3(p + vec3(-12.77, 43.21, seed - 28.65))
  ) * amp;
}
vec3 rgb2hsv(vec3 c) {
  vec3 cc = clamp(c, 0.0, 1.0); // clamp inputs to valid RGB range
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(cc.bg, K.wz), vec4(cc.gb, K.xy), step(cc.b, cc.g));
  vec4 q = mix(vec4(p.xyw, cc.r), vec4(cc.r, p.yzx), step(p.x, cc.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
`;

export function compileToGLSL(g: CGPGenome): { vertexShader: string; fragmentShader: string } {
  const slots = numInputSlots(g);
  const active = getActiveNodes(g);
  const numConsts = g.constants.length;

  function nodeName(idx: number): string {
    if (idx < NUM_INPUTS) return INPUT_NAMES[idx];
    if (idx < slots) return `c${idx - NUM_INPUTS}`;
    return `n${idx - slots}`;
  }

  const lines: string[] = [];

  // Declare constants as vec3
  for (let i = 0; i < numConsts; i++) {
    const [x, y, z] = g.constants[i];
    lines.push(`  vec3 c${i} = vec3(${x.toFixed(6)}, ${y.toFixed(6)}, ${z.toFixed(6)});`);
  }

  // Compute active nodes in order
  for (let i = 0; i < g.nodes.length; i++) {
    const globalIdx = i + slots;
    if (!active.has(globalIdx)) continue;

    const node = g.nodes[i];
    const fn = FUNCTIONS[node.funcIdx];
    const args = node.inputs.slice(0, fn.arity).map(nodeName);
    lines.push(`  vec3 ${nodeName(globalIdx)} = ${fn.glsl(args)};`);
  }

  // Map outputs: pos and col
  const posName = nodeName(g.outputIndices[0]);
  const colName = nodeName(g.outputIndices[1]);

  const vertexShader = `
uniform float time;
varying vec3 vColor;
varying vec3 vPosition;

${GLSL_PREAMBLE}

void main() {
  float u = position.x;
  float v = position.y;
  float d = length(position.xy) / 3.14159;
  float t = mod(time, 6.28318530) - 3.14159265;
  float a = atan(v, u);

  // Bundled vec3 inputs
  vec3 uv0 = vec3(u, v, 0.0);
  vec3 uvd = vec3(u, v, d);
  vec3 uvt = vec3(u, v, t);
  vec3 uva = vec3(u, v, a);
  vec3 dat = vec3(d, a, t);

${lines.join('\n')}

  vec3 pos = clamp(${posName}, -10.0, 10.0);
  vColor = vec3(tri(${colName}.x), tri(${colName}.y), tri(${colName}.z));

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vPosition = mvPos.xyz;
  gl_Position = projectionMatrix * mvPos;
}
`;

  const fragmentShader = `
varying vec3 vColor;
varying vec3 vPosition;

void main() {
  vec3 dx = dFdx(vPosition);
  vec3 dy = dFdy(vPosition);
  vec3 normal = normalize(cross(dy, dx));

  if (!gl_FrontFacing) normal = -normal;

  vec3 viewDir = normalize(-vPosition);

  // Key light (upper-right-front)
  vec3 keyDir = normalize(vec3(1.0, 2.0, 3.0));
  vec3 keyHalf = normalize(keyDir + viewDir);
  float keyDiff = max(dot(normal, keyDir), 0.0);
  float keySpec = pow(max(dot(normal, keyHalf), 0.0), 32.0);

  // Fill light (lower-left, no specular)
  vec3 fillDir = normalize(vec3(-2.0, -1.0, 1.0));
  float fillDiff = max(dot(normal, fillDir), 0.0);

  vec3 ambient = vColor * 0.2;
  vec3 diffuse = vColor * (keyDiff * 0.65 + fillDiff * 0.3);
  vec3 specular = vec3(0.3) * keySpec;

  gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}
`;

  return { vertexShader, fragmentShader };
}

// --- JS evaluation (for debugging) ---

export function evaluateGenome(g: CGPGenome, u: number, v: number, d: number, t: number): Vec3[] {
  const slots = numInputSlots(g);
  const values: Vec3[] = new Array(slots + g.nodes.length);
  const a = Math.atan2(v, u);

  // Bundled vec3 inputs
  values[0] = [u, v, 0];    // uv0
  values[1] = [u, v, d];    // uvd
  values[2] = [u, v, t];    // uvt
  values[3] = [u, v, a];    // uva
  values[4] = [d, a, t];    // dat

  for (let i = 0; i < g.constants.length; i++) {
    values[NUM_INPUTS + i] = [...g.constants[i]] as Vec3;
  }

  for (let i = 0; i < g.nodes.length; i++) {
    const node = g.nodes[i];
    const fn = FUNCTIONS[node.funcIdx];
    const args = node.inputs.slice(0, fn.arity).map(idx => values[idx]);
    const result = fn.js(args);
    values[slots + i] = result.map(x => isFinite(x) ? x : 0) as Vec3;
  }

  return g.outputIndices.map(idx => {
    const val = values[idx];
    return val.map(x => isFinite(x) ? x : 0) as Vec3;
  });
}
