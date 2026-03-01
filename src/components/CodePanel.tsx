import { useState, useEffect, useCallback } from 'preact/hooks';
import {
  CGPGenome, genomeToExpression, compileToGLSL,
  getActiveNodes, FUNCTIONS, INPUT_NAMES, OUTPUT_NAMES, NUM_INPUTS,
} from '../cgp';

interface CodePanelProps {
  genome: CGPGenome;
  onClose: () => void;
}

const CONN_COLORS = ['rgba(20,184,166,0.7)', 'rgba(245,158,11,0.7)', 'rgba(236,72,153,0.7)'];

function GraphView({ genome }: { genome: CGPGenome }) {
  const active = getActiveNodes(genome);
  const numConsts = genome.constants.length;
  const slots = NUM_INPUTS + numConsts;

  const PAD = 20;
  const NW = 90;
  const NH = 26;
  const COL_STEP = NW + 36;
  const ROW_STEP = NH + 12;

  type NPos = { x: number; y: number };
  const npos = new Map<number, NPos>();

  for (let i = 0; i < slots; i++) {
    npos.set(i, { x: PAD, y: PAD + i * ROW_STEP });
  }

  for (let c = 0; c < genome.cols; c++) {
    for (let r = 0; r < genome.rows; r++) {
      npos.set(slots + c * genome.rows + r, {
        x: PAD + (c + 1) * COL_STEP,
        y: PAD + r * ROW_STEP,
      });
    }
  }

  const outX = PAD + (genome.cols + 1) * COL_STEP;
  const outYs = genome.outputIndices.map((_, o) => PAD + o * ROW_STEP);

  const maxRows = Math.max(slots, genome.rows, genome.outputIndices.length);
  const svgW = outX + NW + PAD;
  const svgH = maxRows * ROW_STEP + PAD * 2;

  type Conn = { from: NPos; to: NPos; color: string };
  const conns: Conn[] = [];

  for (let i = 0; i < genome.nodes.length; i++) {
    const gIdx = i + slots;
    if (!active.has(gIdx)) continue;
    const node = genome.nodes[i];
    const fn = FUNCTIONS[node.funcIdx];
    const to = npos.get(gIdx)!;
    for (let a = 0; a < fn.arity; a++) {
      const from = npos.get(node.inputs[a]);
      if (from) conns.push({ from, to, color: CONN_COLORS[a] });
    }
  }

  for (let o = 0; o < genome.outputIndices.length; o++) {
    const from = npos.get(genome.outputIndices[o]);
    if (from) conns.push({ from, to: { x: outX, y: outYs[o] }, color: '#4ade80' });
  }

  function bezier(f: NPos, t: NPos): string {
    const x1 = f.x + NW, y1 = f.y + NH / 2;
    const x2 = t.x, y2 = t.y + NH / 2;
    const cx = Math.min(Math.abs(x2 - x1) * 0.4, 50);
    return `M${x1},${y1} C${x1 + cx},${y1} ${x2 - cx},${y2} ${x2},${y2}`;
  }

  function nodeLabel(idx: number): string {
    if (idx < NUM_INPUTS) return INPUT_NAMES[idx];
    if (idx < slots) return `c${idx - NUM_INPUTS}`;
    return FUNCTIONS[genome.nodes[idx - slots].funcIdx].name;
  }

  function nodeFill(idx: number): string {
    if (idx < NUM_INPUTS) return '#1e3a5f';
    if (idx < slots) return '#2d1f54';
    if (active.has(idx)) return '#0f3433';
    return '#16161e';
  }

  function nodeStroke(idx: number): string {
    if (idx < NUM_INPUTS) return '#3b82f6';
    if (idx < slots) return '#8b5cf6';
    if (active.has(idx)) return '#14b8a6';
    return '#2a2a3a';
  }

  const MAX_CHARS = Math.floor((NW - 10) / 5.4);
  function trunc(s: string): string {
    return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS - 1) + '\u2026' : s;
  }

  const FONT = "'Fira Code','Cascadia Code','Consolas',monospace";

  return (
    <>
      <div class="graph-legend">
        <span class="graph-legend-item" style={{ color: '#3b82f6' }}>input</span>
        <span class="graph-legend-item" style={{ color: '#8b5cf6' }}>const</span>
        <span class="graph-legend-item" style={{ color: '#14b8a6' }}>active</span>
        <span class="graph-legend-item" style={{ color: '#4ade80' }}>output</span>
        <span class="graph-legend-sep" />
        <span class="graph-legend-item" style={{ color: 'rgba(20,184,166,0.9)' }}>&#x2014; arg1</span>
        <span class="graph-legend-item" style={{ color: 'rgba(245,158,11,0.9)' }}>&#x2014; arg2</span>
        <span class="graph-legend-item" style={{ color: 'rgba(236,72,153,0.9)' }}>&#x2014; arg3</span>
      </div>
      <svg width={svgW} height={svgH} style={{ minWidth: svgW }}>
        {conns.map((c, i) => (
          <path key={i} d={bezier(c.from, c.to)}
            fill="none" stroke={c.color} strokeWidth="1.5" />
        ))}

        {Array.from(npos.entries()).map(([idx, p]) => {
          const isActive = idx < slots || active.has(idx);
          return (
            <g key={idx} opacity={isActive ? 1 : 0.3}>
              <rect x={p.x} y={p.y} width={NW} height={NH} rx={4}
                fill={nodeFill(idx)} stroke={nodeStroke(idx)} strokeWidth="1" />
              <text x={p.x + 5} y={p.y + NH / 2}
                dy="0.35em"
                fill={isActive ? '#e0e0e8' : '#4a4a5a'}
                style={{ fontSize: '9px', fontFamily: FONT }}>
                {trunc(isActive ? `${idx}: ${nodeLabel(idx)}` : String(idx))}
              </text>
            </g>
          );
        })}

        {outYs.map((y, o) => (
          <g key={`out-${o}`}>
            <rect x={outX} y={y} width={NW} height={NH} rx={4}
              fill="#1a2e1a" stroke="#4ade80" strokeWidth="1" />
            <text x={outX + 5} y={y + NH / 2}
              dy="0.35em"
              fill="#4ade80"
              style={{ fontSize: '10px', fontWeight: 600, fontFamily: FONT }}>
              {OUTPUT_NAMES[o]}
            </text>
          </g>
        ))}
      </svg>
    </>
  );
}

export function CodePanel({ genome, onClose }: CodePanelProps) {
  const [tab, setTab] = useState<'expr' | 'glsl' | 'graph'>('expr');
  const [copied, setCopied] = useState(false);

  const expression = genomeToExpression(genome);
  const exprText = expression.pos + '\n' + expression.col;
  const glslText = compileToGLSL(genome).vertexShader;

  const currentText = tab === 'expr' ? exprText : tab === 'glsl' ? glslText : '';

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  function copyToClipboard() {
    navigator.clipboard.writeText(currentText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal code-panel" onClick={(e) => e.stopPropagation()}>
        <div class="code-header">
          <div class="code-tabs">
            <button class={`code-tab ${tab === 'expr' ? 'active' : ''}`}
              onClick={() => setTab('expr')}>Expression</button>
            <button class={`code-tab ${tab === 'glsl' ? 'active' : ''}`}
              onClick={() => setTab('glsl')}>GLSL</button>
            <button class={`code-tab ${tab === 'graph' ? 'active' : ''}`}
              onClick={() => setTab('graph')}>Graph</button>
          </div>
          {tab !== 'graph' && (
            <button class="code-copy" onClick={copyToClipboard}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        <div class="code-content">
          {tab === 'graph'
            ? <GraphView genome={genome} />
            : <pre>{currentText}</pre>
          }
        </div>
      </div>
    </div>
  );
}
