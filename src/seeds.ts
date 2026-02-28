// Genome builder: convert hand-written parametric functions to CGP genomes

import {
  CGPGenome, CGPNode, FUNCTIONS, NUM_INPUTS, NUM_OUTPUTS, OUTPUT_NAMES,
  randInt, randFloat, DEFAULT_NUM_CONSTANTS,
} from './cgp';

// --- Trace types ---

type TraceEntry =
  | { type: 'input'; inputIdx: number }
  | { type: 'const'; value: number }
  | { type: 'op'; funcIdx: number; inputs: number[] };

type TraceId = number;

interface SeedOutputs {
  x: TraceId; y: TraceId; z: TraceId;
  r: TraceId; g: TraceId; b: TraceId;
}

// --- GenomeBuilder ---

export class GenomeBuilder {
  private traces: TraceEntry[] = [];

  // Pre-registered input trace IDs
  readonly U: TraceId;
  readonly V: TraceId;
  readonly D: TraceId;
  readonly T: TraceId;

  constructor() {
    this.U = this.addTrace({ type: 'input', inputIdx: 0 });
    this.V = this.addTrace({ type: 'input', inputIdx: 1 });
    this.D = this.addTrace({ type: 'input', inputIdx: 2 });
    this.T = this.addTrace({ type: 'input', inputIdx: 3 });
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

  // --- Constants ---
  c(value: number): TraceId {
    // Reuse existing constant if close enough
    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.type === 'const' && Math.abs(t.value - value) < 1e-8) return i;
    }
    return this.addTrace({ type: 'const', value });
  }

  // --- Unary operations ---
  sin(a: TraceId): TraceId { return this.unary('sin', a); }
  cos(a: TraceId): TraceId { return this.unary('cos', a); }
  abs(a: TraceId): TraceId { return this.unary('abs', a); }
  sqrt(a: TraceId): TraceId { return this.unary('sqrt', a); }
  neg(a: TraceId): TraceId { return this.unary('neg', a); }
  fract(a: TraceId): TraceId { return this.unary('fract', a); }
  tanh(a: TraceId): TraceId { return this.unary('tanh', a); }
  floor(a: TraceId): TraceId { return this.unary('floor', a); }
  sign(a: TraceId): TraceId { return this.unary('sign', a); }
  exp(a: TraceId): TraceId { return this.unary('exp', a); }
  log(a: TraceId): TraceId { return this.unary('log', a); }

  // --- Binary operations ---
  add(a: TraceId, b: TraceId): TraceId { return this.binary('add', a, b); }
  sub(a: TraceId, b: TraceId): TraceId { return this.binary('sub', a, b); }
  mul(a: TraceId, b: TraceId): TraceId { return this.binary('mul', a, b); }
  div(a: TraceId, b: TraceId): TraceId { return this.binary('div', a, b); }
  min(a: TraceId, b: TraceId): TraceId { return this.binary('min', a, b); }
  max(a: TraceId, b: TraceId): TraceId { return this.binary('max', a, b); }
  pow(a: TraceId, b: TraceId): TraceId { return this.binary('pow', a, b); }
  atan2(a: TraceId, b: TraceId): TraceId { return this.binary('atan2', a, b); }
  mod(a: TraceId, b: TraceId): TraceId { return this.binary('mod', a, b); }

  private unary(name: string, a: TraceId): TraceId {
    return this.addTrace({ type: 'op', funcIdx: this.funcIndex(name), inputs: [a] });
  }

  private binary(name: string, a: TraceId, b: TraceId): TraceId {
    return this.addTrace({ type: 'op', funcIdx: this.funcIndex(name), inputs: [a, b] });
  }

  // --- Build genome ---

  build(outputs: SeedOutputs, cols: number, rows: number): CGPGenome {
    // 1. Separate constants and ops
    const constEntries: { traceIdx: number; value: number }[] = [];
    const opEntries: { traceIdx: number; funcIdx: number; inputs: number[] }[] = [];

    for (let i = 0; i < this.traces.length; i++) {
      const t = this.traces[i];
      if (t.type === 'const') constEntries.push({ traceIdx: i, value: t.value });
      else if (t.type === 'op') opEntries.push({ traceIdx: i, funcIdx: t.funcIdx, inputs: [...t.inputs] });
    }

    // 2. Build genome constants array (pad to at least DEFAULT_NUM_CONSTANTS)
    const numConsts = Math.max(constEntries.length, DEFAULT_NUM_CONSTANTS);
    const genomeConstants = new Array(numConsts).fill(0).map((_, i) =>
      i < constEntries.length ? constEntries[i].value : randFloat(-2, 2)
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
          inputs: [randInt(maxSource), randInt(maxSource)],
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
      // Pad unary ops to 2 inputs
      while (mappedInputs.length < 2) mappedInputs.push(mappedInputs[0]);

      gridNodes[nodeIdx] = { funcIdx: op.funcIdx, inputs: mappedInputs };
      mapping.set(op.traceIdx, genomeIdx);
    }

    // 5. Map outputs
    const outKeys: (keyof SeedOutputs)[] = ['x', 'y', 'z', 'r', 'g', 'b'];
    const outputIndices = outKeys.map(k => {
      const gi = mapping.get(outputs[k]);
      if (gi === undefined) throw new Error(`Unmapped output '${k}' (trace ${outputs[k]})`);
      return gi;
    });

    return { cols, rows, nodes: gridNodes, outputIndices, constants: genomeConstants };
  }
}

// --- Preset seeds ---

export type SeedFactory = (cols: number, rows: number) => CGPGenome;

function sphereSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const { U, V } = b;

  const half = b.c(0.5);
  const halfV = b.mul(V, half);       // lat = v * 0.5, maps [-PI,PI] to [-PI/2,PI/2]
  const cosLat = b.cos(halfV);
  const sinLat = b.sin(halfV);
  const cosU = b.cos(U);
  const sinU = b.sin(U);

  const x = b.mul(cosLat, cosU);
  const y = b.mul(cosLat, sinU);
  // z = sinLat (just reference sinLat directly)

  // Colors: longitude and latitude mapped to [0,1] via *0.5+0.5 in shader
  // cosU is [-1,1], sinLat is [-1,1] — perfect for the shader's *0.5+0.5 mapping
  const r = cosU;    // warm/cool bands around equator
  const g = sinLat;  // pole-to-pole gradient
  const bVal = b.c(-0.2); // maps to 0.4 after *0.5+0.5

  return b.build({ x, y, z: sinLat, r, g, b: bVal }, cols, rows);
}

function torusSeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const { U, V } = b;

  const R = b.c(1.5);    // major radius
  const r = b.c(0.5);    // minor radius

  const cosV = b.cos(V);
  const sinV = b.sin(V);
  const cosU = b.cos(U);
  const sinU = b.sin(U);

  const rCosV = b.mul(r, cosV);         // r * cos(v)
  const rSinV = b.mul(r, sinV);         // r * sin(v)
  const inner = b.add(R, rCosV);        // R + r*cos(v)

  const x = b.mul(inner, cosU);
  const y = b.mul(inner, sinU);
  const z = rSinV;

  // Colors: tube angle and ring angle
  const red = cosV;   // varies around tube cross-section
  const grn = cosU;   // varies around the ring
  const blu = b.c(0); // maps to 0.5 after *0.5+0.5

  return b.build({ x, y, z, r: red, g: grn, b: blu }, cols, rows);
}

function wavySeed(cols: number, rows: number): CGPGenome {
  const b = new GenomeBuilder();
  const { U, V } = b;

  const half = b.c(0.5);
  const halfV = b.mul(V, half);
  const cosLat = b.cos(halfV);
  const sinLat = b.sin(halfV);
  const cosU = b.cos(U);
  const sinU = b.sin(U);

  // Radius modulation: 1 + 0.3*sin(3u)*sin(2v)
  const three = b.c(3.0);
  const two = b.c(2.0);
  const amp = b.c(0.3);
  const one = b.c(1.0);

  const sin3u = b.sin(b.mul(U, three));
  const sin2v = b.sin(b.mul(V, two));
  const bump = b.mul(b.mul(sin3u, sin2v), amp);
  const radius = b.add(one, bump);

  const x = b.mul(b.mul(radius, cosLat), cosU);
  const y = b.mul(b.mul(radius, cosLat), sinU);
  const z = b.mul(radius, sinLat);

  // Colorful: use the bump for color variation
  const r = sin3u;
  const g = sinLat;
  const bVal = sin2v;

  return b.build({ x, y, z, r, g, b: bVal }, cols, rows);
}

export interface Preset {
  name: string;
  create: SeedFactory;
}

export const PRESETS: Preset[] = [
  { name: 'Sphere', create: sphereSeed },
  { name: 'Torus', create: torusSeed },
  { name: 'Wavy Sphere', create: wavySeed },
];
