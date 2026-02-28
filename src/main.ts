import './style.css';
import {
  createGrid, updateGrid, resizeViewers, renderAll,
  evolveFromParent, createRandomPopulation, createSeededPopulation,
  GridState, POPULATION,
} from './grid';
import { PRESETS } from './seeds';

// --- State ---

let state: GridState;
let selectedIndex: number | null = null;
let numMutations = 5;
let cgpCols = 10;
let cgpRows = 6;
let currentPresetIdx = 0;

// --- DOM setup ---

const app = document.getElementById('app')!;

const presetOptions = PRESETS.map((p, i) =>
  `<option value="${i}">${p.name}</option>`
).join('') + '<option value="random">Random</option>';

app.innerHTML = `
  <div class="header">
    <div class="header-left">
      <div class="logo">ShapeEvolve</div>
      <div class="generation-badge">Gen <span id="gen-num">0</span></div>
    </div>
    <div class="header-right">
      <button class="btn btn-primary" id="btn-evolve" disabled>Evolve Selected</button>
      <button class="btn" id="btn-random">Randomize</button>
    </div>
  </div>
  <div class="settings-bar">
    <div class="setting">
      <label>Seed</label>
      <select id="seed-select">${presetOptions}</select>
    </div>
    <div class="setting">
      <label>Mutations</label>
      <input type="range" id="mutation-slider" min="1" max="20" step="1" value="${numMutations}">
      <span class="value" id="mutation-value">${numMutations}</span>
    </div>
    <div class="setting">
      <label>Grid</label>
      <select id="cgp-size">
        <option value="6,4">6x4</option>
        <option value="10,6" selected>10x6</option>
        <option value="16,8">16x8</option>
        <option value="24,10">24x10</option>
      </select>
    </div>
    <div class="hint">Click to select, Enter/dblclick to evolve</div>
  </div>
  <div class="grid-container" id="grid"></div>
  <div class="toast" id="toast"></div>
`;

// --- Initialize with sphere seed ---

const gridContainer = document.getElementById('grid')!;
const seedGenome = PRESETS[0].create(cgpCols, cgpRows);
const initialGenomes = createSeededPopulation(seedGenome, numMutations);
state = createGrid(gridContainer, initialGenomes);

// --- Resize ---

function handleResize() {
  resizeViewers(state);
}

window.addEventListener('resize', handleResize);
requestAnimationFrame(() => requestAnimationFrame(handleResize));

// --- Animation loop ---

function animate() {
  requestAnimationFrame(animate);
  renderAll(state);
}
animate();

// --- Selection ---

gridContainer.addEventListener('click', (e: MouseEvent) => {
  const cell = (e.target as HTMLElement).closest('.grid-cell') as HTMLElement;
  if (!cell) return;
  const index = parseInt(cell.dataset.index!, 10);
  selectedIndex = selectedIndex === index ? null : index;
  updateSelectionUI();
});

gridContainer.addEventListener('dblclick', (e: MouseEvent) => {
  const cell = (e.target as HTMLElement).closest('.grid-cell') as HTMLElement;
  if (!cell) return;
  selectedIndex = parseInt(cell.dataset.index!, 10);
  doEvolve();
});

function updateSelectionUI() {
  const cells = gridContainer.querySelectorAll('.grid-cell');
  cells.forEach((cell, i) => {
    cell.classList.toggle('selected', i === selectedIndex);
    cell.classList.remove('parent');
    const label = cell.querySelector('.cell-label')!;
    label.textContent = i === 0 && state.generation > 0 ? 'Parent' : `#${i + 1}`;
    label.classList.toggle('parent-label', i === 0 && state.generation > 0);
  });
  (document.getElementById('btn-evolve') as HTMLButtonElement).disabled = selectedIndex === null;
}

// --- Evolve ---

function doEvolve() {
  if (selectedIndex === null) return;
  const parent = state.genomes[selectedIndex];
  updateGrid(state, evolveFromParent(parent, numMutations));
  document.getElementById('gen-num')!.textContent = String(state.generation);
  selectedIndex = 0;
  updateSelectionUI();

  const cells = gridContainer.querySelectorAll('.grid-cell');
  cells[0].classList.add('parent');
  handleResize();
  showToast(`Generation ${state.generation}`);
}

document.getElementById('btn-evolve')!.addEventListener('click', doEvolve);

// --- Seed selection ---

function applySeed() {
  const sel = (document.getElementById('seed-select') as HTMLSelectElement).value;
  let genomes;
  if (sel === 'random') {
    genomes = createRandomPopulation(cgpCols, cgpRows);
  } else {
    const preset = PRESETS[parseInt(sel, 10)];
    const seed = preset.create(cgpCols, cgpRows);
    genomes = createSeededPopulation(seed, numMutations);
  }
  updateGrid(state, genomes);
  state.generation = 0;
  selectedIndex = null;
  document.getElementById('gen-num')!.textContent = '0';
  updateSelectionUI();
  handleResize();
}

document.getElementById('seed-select')!.addEventListener('change', applySeed);

// --- Randomize ---

document.getElementById('btn-random')!.addEventListener('click', () => {
  const genomes = createRandomPopulation(cgpCols, cgpRows);
  updateGrid(state, genomes);
  state.generation = 0;
  selectedIndex = null;
  document.getElementById('gen-num')!.textContent = '0';
  updateSelectionUI();
  handleResize();
  showToast('Random population');
});

// --- Settings ---

const mutationSlider = document.getElementById('mutation-slider') as HTMLInputElement;
const mutationValue = document.getElementById('mutation-value')!;
mutationSlider.addEventListener('input', () => {
  numMutations = parseInt(mutationSlider.value, 10);
  mutationValue.textContent = String(numMutations);
});

const cgpSizeSelect = document.getElementById('cgp-size') as HTMLSelectElement;
cgpSizeSelect.addEventListener('change', () => {
  const [c, r] = cgpSizeSelect.value.split(',').map(Number);
  cgpCols = c;
  cgpRows = r;
  applySeed(); // regenerate with new grid size
  showToast(`Grid: ${c}x${r}`);
});

// --- Keyboard shortcuts ---

document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    doEvolve();
  }
  if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
    document.getElementById('btn-random')!.click();
  }
  const num = parseInt(e.key, 10);
  if (!isNaN(num) && num >= 0 && num <= 9) {
    const idx = num === 0 ? 9 : num - 1;
    if (idx < POPULATION) {
      selectedIndex = idx;
      updateSelectionUI();
    }
  }
});

// --- Toast ---

function showToast(message: string) {
  const toast = document.getElementById('toast')!;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
}
