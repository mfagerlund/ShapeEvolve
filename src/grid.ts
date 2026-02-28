import { CGPGenome, createRandomGenome, mutateGenome, cloneGenome } from './cgp';
import { ShapeViewer } from './viewer';

export const GRID_SIZE = 4;
export const POPULATION = GRID_SIZE * GRID_SIZE;

export interface GridState {
  genomes: CGPGenome[];
  viewers: ShapeViewer[];
  generation: number;
  cols: number;
  rows: number;
}

export function createRandomPopulation(cols: number, rows: number): CGPGenome[] {
  return Array.from({ length: POPULATION }, () => createRandomGenome(cols, rows));
}

export function createSeededPopulation(seed: CGPGenome, numMutations: number): CGPGenome[] {
  const genomes: CGPGenome[] = [cloneGenome(seed)];
  for (let i = 1; i < POPULATION; i++) {
    genomes.push(mutateGenome(seed, numMutations));
  }
  return genomes;
}

export function evolveFromParent(parent: CGPGenome, numMutations: number): CGPGenome[] {
  const genomes: CGPGenome[] = [cloneGenome(parent)];
  for (let i = 1; i < POPULATION; i++) {
    genomes.push(mutateGenome(parent, numMutations));
  }
  return genomes;
}

export function createGrid(container: HTMLElement, genomes: CGPGenome[]): GridState {
  const viewers: ShapeViewer[] = [];

  for (let i = 0; i < POPULATION; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = String(i);

    const canvas = document.createElement('canvas');
    canvas.className = 'shape-canvas';
    cell.appendChild(canvas);

    const label = document.createElement('div');
    label.className = 'cell-label';
    label.textContent = `#${i + 1}`;
    cell.appendChild(label);

    container.appendChild(cell);

    const viewer = new ShapeViewer(canvas, i);
    viewer.setGenome(genomes[i]);
    viewers.push(viewer);
  }

  return {
    genomes,
    viewers,
    generation: 0,
    cols: genomes[0].cols,
    rows: genomes[0].rows,
  };
}

export function updateGrid(state: GridState, newGenomes: CGPGenome[]): void {
  state.genomes = newGenomes;
  state.generation++;
  for (let i = 0; i < POPULATION; i++) {
    state.viewers[i].setGenome(newGenomes[i]);
  }
}

export function resizeViewers(state: GridState): void {
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach((cell, i) => {
    const rect = cell.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && state.viewers[i]) {
      state.viewers[i].resize(rect.width, rect.height);
    }
  });
}

export function renderAll(state: GridState): void {
  for (const viewer of state.viewers) {
    viewer.render();
  }
}
