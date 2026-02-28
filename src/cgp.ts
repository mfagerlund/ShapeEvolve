// Cartesian Genetic Programming engine for ShapeEvolve

export const INPUT_NAMES = ['u', 'v', 'd', 't'] as const;
export const OUTPUT_NAMES = ['x', 'y', 'z', 'r', 'g', 'b'] as const;
export const NUM_INPUTS = INPUT_NAMES.length;
export const NUM_OUTPUTS = OUTPUT_NAMES.length;
export const DEFAULT_NUM_CONSTANTS = 8;

// --- Function set ---

export interface CGPFunction {
  name: string;
  arity: number; // 1 or 2
  glsl: (args: string[]) => string;
  js: (args: number[]) => number;
}

const safeDivJs = (a: number, b: number) => Math.abs(b) < 0.001 ? a / 0.001 : a / b;
const safeSqrtJs = (a: number) => Math.sqrt(Math.abs(a));
const safeLogJs = (a: number) => Math.log(Math.abs(a) + 0.001);
const safeExpJs = (a: number) => Math.exp(Math.min(10, Math.max(-10, a)));
const safePowJs = (a: number, b: number) => Math.pow(Math.abs(a) + 0.0001, Math.min(4, Math.max(-4, b)));
const clampJs = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fractJs = (x: number) => x - Math.floor(x);

export const FUNCTIONS: CGPFunction[] = [
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
      const inputs = [randInt(maxSource), randInt(maxSource)];
      nodes.push({ funcIdx, inputs });
    }
  }

  const totalNodes = inputSlots + nodes.length;
  const outputIndices = Array.from({ length: NUM_OUTPUTS }, () => randInt(totalNodes));

  return { cols, rows, nodes, outputIndices, constants };
}

export function cloneGenome(g: CGPGenome): CGPGenome {
  return {
    cols: g.cols,
    rows: g.rows,
    nodes: g.nodes.map(n => ({ funcIdx: n.funcIdx, inputs: [...n.inputs] })),
    outputIndices: [...g.outputIndices],
    constants: [...g.constants],
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

export function mutateGenome(parent: CGPGenome, numMutations: number): CGPGenome {
  const g = cloneGenome(parent);
  const slots = numInputSlots(g);
  const total = totalNodeCount(g);
  const numConsts = g.constants.length;
  const numGenes = g.nodes.length * 3 + NUM_OUTPUTS + numConsts;

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

  if (geneIdx < g.nodes.length * 3) {
    const nodeIdx = Math.floor(geneIdx / 3);
    const geneType = geneIdx % 3;
    const col = Math.floor(nodeIdx / g.rows);
    const maxSource = slots + col * g.rows;

    if (geneType === 0) {
      g.nodes[nodeIdx].funcIdx = randInt(FUNCTIONS.length);
    } else {
      g.nodes[nodeIdx].inputs[geneType - 1] = randInt(maxSource);
    }

    return activeNodes ? activeNodes.has(nodeIdx + slots) : false;
  } else if (geneIdx < g.nodes.length * 3 + NUM_OUTPUTS) {
    const outputIdx = geneIdx - g.nodes.length * 3;
    g.outputIndices[outputIdx] = randInt(total);
    return true; // output genes are always active
  } else {
    const constIdx = geneIdx - g.nodes.length * 3 - NUM_OUTPUTS;
    g.constants[constIdx] += randFloat(-0.5, 0.5);
    return true; // conservative
  }
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

void main() {
  float u = position.x;
  float v = position.y;
  float d = length(position.xy) / 3.14159;
  float t = time;

${lines.join('\n')}
${outNames.join('\n')}

  vec3 pos = clamp(vec3(out_x, out_y, out_z), -10.0, 10.0);
  vColor = clamp(vec3(out_r, out_g, out_b) * 0.5 + 0.5, 0.0, 1.0);

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
  values[0] = u; values[1] = v; values[2] = d; values[3] = t;
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
