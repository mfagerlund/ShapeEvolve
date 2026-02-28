// Cartesian Genetic Programming engine for ShapeEvolve

export const INPUT_NAMES = ['u', 'v', 'd', 't', 'a'] as const;
export const OUTPUT_NAMES = ['x', 'y', 'z', 'r', 'g', 'b'] as const;
export const NUM_INPUTS = INPUT_NAMES.length;
export const NUM_OUTPUTS = OUTPUT_NAMES.length;
export const DEFAULT_NUM_CONSTANTS = 8;
export const MAX_ARITY = 3;

// --- Function set ---

export interface CGPFunction {
  name: string;
  arity: number; // 1, 2, or 3
  glsl: (args: string[]) => string;
  js: (args: number[]) => number;
}

const safeDivJs = (a: number, b: number) => Math.abs(b) < 0.001 ? a / 0.001 : a / b;
const safeSqrtJs = (a: number) => Math.sqrt(Math.abs(a));
const safeLogJs = (a: number) => Math.log(Math.abs(a) + 0.001);
const safeExpJs = (a: number) => Math.exp(Math.min(10, Math.max(-10, a)));
const safePowJs = (a: number, b: number) => Math.pow(Math.abs(a) + 0.0001, Math.min(4, Math.max(-4, b)));
const fractJs = (x: number) => x - Math.floor(x);

export const FUNCTIONS: CGPFunction[] = [
  // --- Original 19 functions ---
  // Binary
  { name: 'add', arity: 2, glsl: ([a, b]) => `(${a}+${b})`, js: ([a, b]) => a + b },
  { name: 'sub', arity: 2, glsl: ([a, b]) => `(${a}-${b})`, js: ([a, b]) => a - b },
  { name: 'mul', arity: 2, glsl: ([a, b]) => `(${a}*${b})`, js: ([a, b]) => a * b },
  { name: 'div', arity: 2, glsl: ([a, b]) => `safediv(${a},${b})`, js: ([a, b]) => safeDivJs(a, b) },
  { name: 'min', arity: 2, glsl: ([a, b]) => `min(${a},${b})`, js: ([a, b]) => Math.min(a, b) },
  { name: 'max', arity: 2, glsl: ([a, b]) => `max(${a},${b})`, js: ([a, b]) => Math.max(a, b) },
  { name: 'pow', arity: 2, glsl: ([a, b]) => `safepow(${a},${b})`, js: ([a, b]) => safePowJs(a, b) },
  { name: 'atan2', arity: 2, glsl: ([a, b]) => `atan(${a},${b})`, js: ([a, b]) => Math.atan2(a, b) },
  { name: 'mod', arity: 2, glsl: ([a, b]) => `safemod(${a},${b})`, js: ([a, b]) => Math.abs(b) < 0.001 ? a : a % b },
  // Unary
  { name: 'sin', arity: 1, glsl: ([a]) => `sin(${a})`, js: ([a]) => Math.sin(a) },
  { name: 'cos', arity: 1, glsl: ([a]) => `cos(${a})`, js: ([a]) => Math.cos(a) },
  { name: 'abs', arity: 1, glsl: ([a]) => `abs(${a})`, js: ([a]) => Math.abs(a) },
  { name: 'sqrt', arity: 1, glsl: ([a]) => `safesqrt(${a})`, js: ([a]) => safeSqrtJs(a) },
  { name: 'neg', arity: 1, glsl: ([a]) => `(-${a})`, js: ([a]) => -a },
  { name: 'fract', arity: 1, glsl: ([a]) => `fract(${a})`, js: ([a]) => fractJs(a) },
  { name: 'tanh', arity: 1, glsl: ([a]) => `tanh(${a})`, js: ([a]) => Math.tanh(a) },
  { name: 'floor', arity: 1, glsl: ([a]) => `floor(${a})`, js: ([a]) => Math.floor(a) },
  { name: 'sign', arity: 1, glsl: ([a]) => `sign(${a})`, js: ([a]) => Math.sign(a) },
  { name: 'exp', arity: 1, glsl: ([a]) => `safeexp(${a})`, js: ([a]) => safeExpJs(a) },
  { name: 'log', arity: 1, glsl: ([a]) => `safelog(${a})`, js: ([a]) => safeLogJs(a) },

  // --- 21 new functions ---

  // Symmetry/pattern (unary)
  { name: 'tri_wave', arity: 1,
    glsl: ([a]) => `tri(${a})`,
    js: ([a]) => { const t = a - Math.floor(a); return 1.0 - Math.abs(t * 2.0 - 1.0); } },
  { name: 'square_wave', arity: 1,
    glsl: ([a]) => `sign(sin(${a}))`,
    js: ([a]) => Math.sign(Math.sin(a)) },
  { name: 'wave01', arity: 1,
    glsl: ([a]) => `(sin(${a})*0.5+0.5)`,
    js: ([a]) => Math.sin(a) * 0.5 + 0.5 },
  { name: 'clamp01', arity: 1,
    glsl: ([a]) => `clamp(${a},0.0,1.0)`,
    js: ([a]) => Math.min(1, Math.max(0, a)) },

  // Symmetry/pattern (binary)
  { name: 'kaleido', arity: 2,
    glsl: ([a, b]) => `kaleido_f(${a},${b})`,
    js: ([angle, n]) => {
      const sectors = Math.max(Math.floor(Math.abs(n) * 8), 1);
      const sector = Math.PI * 2 / sectors;
      const a = ((angle % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      return ((a % sector) + sector) % sector;
    } },
  { name: 'kaleido_mirror', arity: 2,
    glsl: ([a, b]) => `kaleido_mirror_f(${a},${b})`,
    js: ([angle, n]) => {
      const sectors = Math.max(Math.floor(Math.abs(n) * 8), 1);
      const sector = Math.PI * 2 / sectors;
      const a = ((angle % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
      const t = ((a % sector) + sector) % sector;
      return t > sector * 0.5 ? sector - t : t;
    } },
  { name: 'mirror_fold', arity: 2,
    glsl: ([a, b]) => `mirror_fold_f(${a},${b})`,
    js: ([x, axis]) => {
      const a = Math.max(Math.abs(axis), 0.001);
      return Math.abs(((x + a) % (2 * a) + 2 * a) % (2 * a) - a);
    } },
  { name: 'repeat', arity: 2,
    glsl: ([a, b]) => `repeat_f(${a},${b})`,
    js: ([x, period]) => {
      const p = Math.max(Math.abs(period), 0.001);
      return ((x + p * 0.5) % p + p) % p - p * 0.5;
    } },
  { name: 'rings', arity: 2,
    glsl: ([a, b]) => `(fract(${a}*abs(${b})*4.0)*2.0-1.0)`,
    js: ([d, count]) => {
      const v = d * Math.abs(count) * 4;
      return (v - Math.floor(v)) * 2.0 - 1.0;
    } },
  { name: 'checker', arity: 2,
    glsl: ([a, b]) => `(mod(floor(${a})+floor(${b}),2.0)*2.0-1.0)`,
    js: ([x, y]) => ((Math.floor(x) + Math.floor(y)) & 1) ? 1 : -1 },
  { name: 'noise', arity: 2,
    glsl: ([a, b]) => `noise2d(${a},${b})`,
    js: ([x, y]) => {
      const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      return (n - Math.floor(n)) * 2.0 - 1.0;
    } },
  { name: 'smoothstep_f', arity: 2,
    glsl: ([a, b]) => `smoothstep(0.0,${a},${b})`,
    js: ([edge, x]) => {
      const e = Math.max(Math.abs(edge), 0.001);
      const t = Math.min(1, Math.max(0, x / e));
      return t * t * (3 - 2 * t);
    } },
  { name: 'step_f', arity: 2,
    glsl: ([a, b]) => `step(${a},${b})`,
    js: ([edge, x]) => x >= edge ? 1.0 : 0.0 },

  // Polar conversion (binary)
  { name: 'from_polar_x', arity: 2,
    glsl: ([a, b]) => `(${a}*cos(${b}))`,
    js: ([r, angle]) => r * Math.cos(angle) },
  { name: 'from_polar_y', arity: 2,
    glsl: ([a, b]) => `(${a}*sin(${b}))`,
    js: ([r, angle]) => r * Math.sin(angle) },

  // Coordinate transforms (ternary)
  { name: 'rotate2d_x', arity: 3,
    glsl: ([a, b, c]) => `(${a}*cos(${c})-${b}*sin(${c}))`,
    js: ([x, y, angle]) => x * Math.cos(angle) - y * Math.sin(angle) },
  { name: 'rotate2d_y', arity: 3,
    glsl: ([a, b, c]) => `(${a}*sin(${c})+${b}*cos(${c}))`,
    js: ([x, y, angle]) => x * Math.sin(angle) + y * Math.cos(angle) },
  { name: 'swirl_x', arity: 3,
    glsl: ([a, b, c]) => `swirl_x_f(${a},${b},${c})`,
    js: ([x, y, s]) => {
      const r = Math.sqrt(x * x + y * y);
      const a = Math.atan2(y, x) + r * s;
      return r * Math.cos(a);
    } },
  { name: 'swirl_y', arity: 3,
    glsl: ([a, b, c]) => `swirl_y_f(${a},${b},${c})`,
    js: ([x, y, s]) => {
      const r = Math.sqrt(x * x + y * y);
      const a = Math.atan2(y, x) + r * s;
      return r * Math.sin(a);
    } },
  { name: 'bend_x', arity: 3,
    glsl: ([a, b, c]) => `(${a}+sin(${b}*${c}))`,
    js: ([x, y, amount]) => x + Math.sin(y * amount) },
  { name: 'bend_y', arity: 3,
    glsl: ([a, b, c]) => `(${b}+sin(${a}*${c}))`,
    js: ([x, y, amount]) => y + Math.sin(x * amount) },
];

// --- Genome ---

export interface CGPNode {
  funcIdx: number;
  inputs: number[]; // indices into inputs + previous nodes
}

export interface CGPGenome {
  cols: number;
  rows: number;
  nodes: CGPNode[];       // cols * rows nodes
  outputIndices: number[]; // NUM_OUTPUTS indices
  constants: number[];     // per-genome evolved constants (variable length)
  version?: number;        // 2 = current format (5 inputs, 3 inputs/node)
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
  const constants = Array.from({ length: DEFAULT_NUM_CONSTANTS }, () => randFloat(-2, 2));
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

  return { cols, rows, nodes, outputIndices, constants, version: 2 };
}

export function cloneGenome(g: CGPGenome): CGPGenome {
  return {
    cols: g.cols,
    rows: g.rows,
    nodes: g.nodes.map(n => ({ funcIdx: n.funcIdx, inputs: [...n.inputs] })),
    outputIndices: [...g.outputIndices],
    constants: [...g.constants],
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

const GENES_PER_NODE = 1 + MAX_ARITY; // 1 funcIdx + 3 inputs

export function mutateGenome(parent: CGPGenome, numMutations: number): CGPGenome {
  const g = cloneGenome(parent);
  const slots = numInputSlots(g);
  const total = totalNodeCount(g);
  const numConsts = g.constants.length;
  const numGenes = g.nodes.length * GENES_PER_NODE + NUM_OUTPUTS + numConsts;

  // Do numMutations-1 random mutations, then 1 Goldman-Punch (guaranteed active)
  const randomRounds = Math.max(0, numMutations - 1);

  for (let m = 0; m < randomRounds; m++) {
    mutateOneGene(g, slots, total, numConsts, numGenes);
  }

  // Goldman-Punch: keep mutating until an active gene is hit
  const activeNodes = getActiveNodes(g);
  let hitActive = false;
  let attempts = 0;
  while (!hitActive && attempts < numGenes * 3) {
    attempts++;
    const wasActive = mutateOneGene(g, slots, total, numConsts, numGenes, activeNodes);
    if (wasActive) hitActive = true;
  }

  return g;
}

function mutateOneGene(
  g: CGPGenome, slots: number, total: number,
  numConsts: number, numGenes: number,
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
    const constIdx = geneIdx - nodeGeneCount - NUM_OUTPUTS;
    g.constants[constIdx] += randFloat(-0.5, 0.5);
    return true; // conservative
  }
}

// --- Genome version migration ---

const OLD_NUM_INPUTS = 4; // v1 had [u, v, d, t]

export function migrateGenome(g: CGPGenome): CGPGenome {
  if (g.version === 2) return g;

  // v1 → v2: add 'a' input at index 4 (shift constants/nodes), pad node inputs to 3
  function shiftIndex(idx: number): number {
    if (idx < OLD_NUM_INPUTS) return idx; // u, v, d, t unchanged
    return idx + 1; // shift past new 'a' input
  }

  const newNodes = g.nodes.map(n => {
    const shifted = n.inputs.map(shiftIndex);
    // Pad to MAX_ARITY inputs
    while (shifted.length < MAX_ARITY) shifted.push(shifted[0]);
    return { funcIdx: n.funcIdx, inputs: shifted };
  });

  const newOutputIndices = g.outputIndices.map(shiftIndex);

  return {
    cols: g.cols,
    rows: g.rows,
    nodes: newNodes,
    outputIndices: newOutputIndices,
    constants: [...g.constants],
    version: 2,
  };
}

// --- GLSL compilation ---

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

  // Declare constants
  for (let i = 0; i < numConsts; i++) {
    lines.push(`  float c${i} = ${g.constants[i].toFixed(6)};`);
  }

  // Compute active nodes in order
  for (let i = 0; i < g.nodes.length; i++) {
    const globalIdx = i + slots;
    if (!active.has(globalIdx)) continue;

    const node = g.nodes[i];
    const fn = FUNCTIONS[node.funcIdx];
    const args = node.inputs.slice(0, fn.arity).map(nodeName);
    lines.push(`  float ${nodeName(globalIdx)} = ${fn.glsl(args)};`);
  }

  // Map outputs
  const outNames = OUTPUT_NAMES.map((name, i) =>
    `  float out_${name} = ${nodeName(g.outputIndices[i])};`
  );

  const vertexShader = `
uniform float time;
varying vec3 vColor;
varying vec3 vPosition;

float safediv(float a, float b) { return abs(b) < 0.001 ? a * 1000.0 : a / b; }
float safesqrt(float a) { return sqrt(abs(a)); }
float safepow(float a, float b) { return pow(abs(a) + 0.0001, clamp(b, -4.0, 4.0)); }
float safemod(float a, float b) { return abs(b) < 0.001 ? a : mod(a, b); }
float safeexp(float a) { return exp(clamp(a, -10.0, 10.0)); }
float safelog(float a) { return log(abs(a) + 0.001); }

// Triangle wave: maps any float to 0..1, cycling smoothly
float tri(float x) {
  float t = fract(x);
  return 1.0 - abs(t * 2.0 - 1.0);
}

// Kaleidoscope: partition angle into sectors
float kaleido_f(float angle, float n) {
  float sectors = max(floor(abs(n) * 8.0), 1.0);
  float sector = 6.28318530 / sectors;
  float a = mod(angle + 3.14159265, 6.28318530) - 3.14159265;
  return mod(a, sector);
}

// Kaleidoscope with mirror fold within each sector
float kaleido_mirror_f(float angle, float n) {
  float sectors = max(floor(abs(n) * 8.0), 1.0);
  float sector = 6.28318530 / sectors;
  float a = mod(angle + 3.14159265, 6.28318530) - 3.14159265;
  float t = mod(a, sector);
  return t > sector * 0.5 ? sector - t : t;
}

// Mirror fold: zigzag within [-axis, axis]
float mirror_fold_f(float x, float axis) {
  float a = max(abs(axis), 0.001);
  return abs(mod(x + a, 2.0 * a) - a);
}

// Centered repeat: tile x with given period
float repeat_f(float x, float period) {
  float p = max(abs(period), 0.001);
  return mod(x + p * 0.5, p) - p * 0.5;
}

// Hash-based pseudo-noise
float noise2d(float x, float y) {
  return fract(sin(x * 12.9898 + y * 78.233) * 43758.5453) * 2.0 - 1.0;
}

// Swirl: rotate by distance from origin
float swirl_x_f(float x, float y, float s) {
  float r = length(vec2(x, y));
  float a = atan(y, x) + r * s;
  return r * cos(a);
}

float swirl_y_f(float x, float y, float s) {
  float r = length(vec2(x, y));
  float a = atan(y, x) + r * s;
  return r * sin(a);
}

void main() {
  float u = position.x;
  float v = position.y;
  float d = length(position.xy) / 3.14159;
  float t = mod(time, 6.28318530) - 3.14159265;
  float a = atan(v, u);

${lines.join('\n')}
${outNames.join('\n')}

  vec3 pos = clamp(vec3(out_x, out_y, out_z), -10.0, 10.0);
  vColor = vec3(tri(out_r), tri(out_g), tri(out_b));

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
  vec3 normal = normalize(cross(dx, dy));

  if (!gl_FrontFacing) normal = -normal;

  vec3 lightDir = normalize(vec3(1.0, 2.0, 3.0));
  vec3 viewDir = normalize(-vPosition);
  vec3 halfDir = normalize(lightDir + viewDir);

  float diff = max(dot(normal, lightDir), 0.0);
  float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);

  vec3 ambient = vColor * 0.15;
  vec3 diffuse = vColor * diff * 0.75;
  vec3 specular = vec3(0.3) * spec;

  gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
}
`;

  return { vertexShader, fragmentShader };
}

// --- JS evaluation (for debugging) ---

export function evaluateGenome(g: CGPGenome, u: number, v: number, d: number, t: number): number[] {
  const slots = numInputSlots(g);
  const values = new Float64Array(slots + g.nodes.length);
  const a = Math.atan2(v, u);
  values[0] = u; values[1] = v; values[2] = d; values[3] = t; values[4] = a;
  for (let i = 0; i < g.constants.length; i++) values[NUM_INPUTS + i] = g.constants[i];

  for (let i = 0; i < g.nodes.length; i++) {
    const node = g.nodes[i];
    const fn = FUNCTIONS[node.funcIdx];
    const args = node.inputs.slice(0, fn.arity).map(idx => values[idx]);
    const result = fn.js(args);
    values[slots + i] = isFinite(result) ? result : 0;
  }

  return g.outputIndices.map(idx => {
    const val = values[idx];
    return isFinite(val) ? val : 0;
  });
}
