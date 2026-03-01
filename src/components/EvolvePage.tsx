import { useRef, useEffect, useState, useCallback } from 'preact/hooks';
import {
  createGrid, updateGrid, resizeViewers, renderAll,
  evolveFromParent, createRandomPopulation, createSeededPopulation,
  GridState, POPULATION,
} from '../grid';
import { PRESETS } from '../seeds';
import { migrateGenome, resizeGenome } from '../cgp';
import { user } from '../auth';
import { saveShape, updateShape } from '../db';
import { uploadThumbnail, captureThumbnail } from '../storage';
import { SaveDialog } from './SaveDialog';
import { CodePanel } from './CodePanel';
import { SeedPicker } from './SeedPicker';
import { ShapeViewerOverlay } from './ShapeViewerOverlay';

function showToast(message: string) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2000);
}

export function EvolvePage() {
  const gridRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GridState | null>(null);
  const animRef = useRef(0);
  const pendingThumbnailRef = useRef<string | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [generation, setGeneration] = useState(0);
  const [numMutations, setNumMutations] = useState(2);
  const [cgpCols, setCgpCols] = useState(10);
  const [cgpRows, setCgpRows] = useState(6);
  const [presetIdx, setPresetIdx] = useState(() => {
    const saved = localStorage.getItem('seedPreset');
    if (saved) {
      const idx = PRESETS.findIndex(p => p.name === saved);
      if (idx !== -1) return idx;
    }
    const nautIdx = PRESETS.findIndex(p => p.name === 'Nautilus');
    return nautIdx !== -1 ? nautIdx : 0;
  });
  const [showSave, setShowSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveIndex, setSaveIndex] = useState(0);
  const [maximizedIndex, setMaximizedIndex] = useState<number | null>(null);
  const [codeIndex, setCodeIndex] = useState<number | null>(null);
  const [showSeedPicker, setShowSeedPicker] = useState(false);

  // Initialize grid once
  useEffect(() => {
    const container = gridRef.current;
    if (!container || stateRef.current) return;

    // Check for loaded genome from My Shapes or Fork
    const loadedGenome = localStorage.getItem('loadGenome') || localStorage.getItem('pendingFork');
    let genomes;
    if (loadedGenome) {
      localStorage.removeItem('loadGenome');
      localStorage.removeItem('pendingFork');
      try {
        const genome = migrateGenome(JSON.parse(loadedGenome));
        genomes = createSeededPopulation(genome, numMutations);
        // Restore complexity from the loaded genome
        setCgpCols(genome.cols);
        setCgpRows(genome.rows);
      } catch {
        const seed = PRESETS[presetIdx >= 0 ? presetIdx : 0].create(cgpCols, cgpRows);
        genomes = createSeededPopulation(seed, numMutations);
      }
    } else {
      const seed = PRESETS[presetIdx >= 0 ? presetIdx : 0].create(cgpCols, cgpRows);
      genomes = createSeededPopulation(seed, numMutations);
    }
    stateRef.current = createGrid(container, genomes);

    // Resize after layout
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (stateRef.current) resizeViewers(stateRef.current);
    }));

    // Animation loop — pauses when tab is hidden
    function animate() {
      if (stateRef.current) renderAll(stateRef.current);
      animRef.current = requestAnimationFrame(animate);
    }
    function onVisibility() {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else {
        animRef.current = requestAnimationFrame(animate);
      }
    }
    animRef.current = requestAnimationFrame(animate);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(animRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Resize on window resize
  useEffect(() => {
    function handleResize() {
      if (stateRef.current) resizeViewers(stateRef.current);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Rebuild grid when CGP dimensions change
  const rebuildGrid = useCallback((cols: number, rows: number, preset: number | 'random', mutations: number) => {
    const container = gridRef.current;
    if (!container) return;

    // Dispose old viewers
    if (stateRef.current) {
      stateRef.current.viewers.forEach(v => v.dispose());
    }
    container.innerHTML = '';

    let genomes = createRandomPopulation(cols, rows);
    if (preset === 'random') {
      // already set above
    } else {
      // Try current size, then progressively larger grids until seed fits
      const sizes: [number, number][] = [[cols, rows], [10, 6], [16, 8], [24, 10]];
      let usedCols = cols, usedRows = rows;
      for (const [c, r] of sizes) {
        if (c < cols || (c === cols && r < rows)) continue;
        try {
          const seed = PRESETS[preset].create(c, r);
          genomes = createSeededPopulation(seed, mutations);
          usedCols = c;
          usedRows = r;
          break;
        } catch { /* grid too small, try next */ }
      }
      if (usedCols !== cols || usedRows !== rows) {
        setCgpCols(usedCols);
        setCgpRows(usedRows);
        showToast(`Complexity increased to ${usedCols}x${usedRows}`);
      }
    }

    stateRef.current = createGrid(container, genomes);
    stateRef.current.generation = 0;
    setGeneration(0);
    setSelectedIndex(null);

    requestAnimationFrame(() => {
      if (stateRef.current) resizeViewers(stateRef.current);
    });
  }, []);

  function markParentCells() {
    const cells = gridRef.current?.querySelectorAll('.grid-cell');
    cells?.forEach((cell, i) => {
      cell.classList.toggle('parent', i === 0);
      cell.classList.toggle('selected', i === 0);
      const label = cell.querySelector('.cell-label');
      if (label) {
        label.textContent = i === 0 ? 'Parent' : `#${i + 1}`;
        label.classList.toggle('parent-label', i === 0);
      }
    });
  }

  function evolveFrom(parentIndex: number) {
    const state = stateRef.current;
    if (!state) return;
    const parent = state.genomes[parentIndex];
    updateGrid(state, evolveFromParent(parent, numMutations));
    setGeneration(state.generation);
    setSelectedIndex(0);
    markParentCells();
    resizeViewers(state);
    showToast(`Generation ${state.generation}`);
  }

  const doEvolve = useCallback(() => {
    if (selectedIndex === null) return;
    evolveFrom(selectedIndex);
  }, [selectedIndex, numMutations]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        setMaximizedIndex(null);
        setShowSave(false);
        setCodeIndex(null);
        setShowSeedPicker(false);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        doEvolve();
      }
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        rebuildGrid(cgpCols, cgpRows, presetIdx >= 0 ? presetIdx : 'random', numMutations);
        showToast('New population');
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 0 && num <= 9) {
        const idx = num === 0 ? 9 : num - 1;
        if (idx < POPULATION) {
          setSelectedIndex(idx);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [doEvolve, rebuildGrid, cgpCols, cgpRows, numMutations, presetIdx]);

  // Update selection UI when selectedIndex changes
  useEffect(() => {
    const cells = gridRef.current?.querySelectorAll('.grid-cell');
    if (!cells) return;
    cells.forEach((cell, i) => {
      cell.classList.toggle('selected', i === selectedIndex);
    });
  }, [selectedIndex]);

  function onCellClick(e: MouseEvent) {
    const target = e.target as HTMLElement;

    // Handle action button clicks
    const btn = target.closest('.cell-btn') as HTMLElement;
    if (btn) {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index!, 10);
      const action = btn.dataset.action;
      if (action === 'save') {
        if (!user.value) {
          showToast('Sign in to save shapes');
          return;
        }
        // Capture thumbnail now, before the dialog opens
        const state = stateRef.current;
        if (state) {
          const viewer = state.viewers[idx];
          viewer.render();
          pendingThumbnailRef.current = captureThumbnail(viewer.canvas);
        }
        setSaveIndex(idx);
        setShowSave(true);
      } else if (action === 'maximize') {
        setMaximizedIndex(prev => prev === idx ? null : idx);
      } else if (action === 'code') {
        setCodeIndex(idx);
      }
      return;
    }

    const cell = target.closest('.grid-cell') as HTMLElement;
    if (!cell) return;
    const index = parseInt(cell.dataset.index!, 10);
    setSelectedIndex(prev => prev === index ? null : index);
  }

  function onCellDblClick(e: MouseEvent) {
    const cell = (e.target as HTMLElement).closest('.grid-cell') as HTMLElement;
    if (!cell) return;
    const index = parseInt(cell.dataset.index!, 10);
    evolveFrom(index);
  }

  function onSeedSelect(val: number | 'random') {
    setShowSeedPicker(false);
    if (val === 'random') {
      setPresetIdx(-1);
      localStorage.removeItem('seedPreset');
      rebuildGrid(cgpCols, cgpRows, 'random', numMutations);
    } else {
      setPresetIdx(val);
      localStorage.setItem('seedPreset', PRESETS[val].name);
      rebuildGrid(cgpCols, cgpRows, val, numMutations);
    }
  }

  function onSizeChange(e: Event) {
    const [c, r] = (e.target as HTMLSelectElement).value.split(',').map(Number);
    setCgpCols(c);
    setCgpRows(r);

    const state = stateRef.current;
    const container = gridRef.current;

    // If increasing complexity, resize existing genomes to preserve shapes
    if (state && container && c >= state.cols && r >= state.rows) {
      const resized = state.genomes.map(g => resizeGenome(g, c, r));
      state.viewers.forEach(v => v.dispose());
      container.innerHTML = '';
      stateRef.current = createGrid(container, resized);
      stateRef.current.generation = state.generation;
      setGeneration(state.generation);
      requestAnimationFrame(() => {
        if (stateRef.current) resizeViewers(stateRef.current);
      });
    } else {
      rebuildGrid(c, r, presetIdx >= 0 ? presetIdx : 'random', numMutations);
    }
    showToast(`Complexity: ${c}x${r}`);
  }

  function onMutationChange(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    setNumMutations(val);
  }

  async function handleSave(name: string, tags: string[], isPublic: boolean) {
    const u = user.value;
    const state = stateRef.current;
    if (!u || !state) return;

    const saveIdx = saveIndex;
    setSaving(true);
    try {
      // Use thumbnail captured at click time
      const dataURL = pendingThumbnailRef.current
        ?? (() => { const v = state.viewers[saveIdx]; v.render(); return captureThumbnail(v.canvas); })();
      pendingThumbnailRef.current = null;

      // Save to Firestore first to get ID, then upload thumbnail
      const shapeId = await saveShape({
        userId: u.uid,
        userName: u.displayName ?? 'Anonymous',
        userPhoto: u.photoURL ?? '',
        name,
        genome: state.genomes[saveIdx],
        thumbnailURL: '', // placeholder
        generation,
        gridSize: `${cgpCols}x${cgpRows}`,
        seedPreset: presetIdx >= 0 ? PRESETS[presetIdx].name : null,
        tags,
        isPublic,
      });

      // Upload thumbnail and update doc with URL
      const thumbnailURL = await uploadThumbnail(shapeId, dataURL);
      await updateShape(shapeId, { thumbnailURL });

      setShowSave(false);
      showToast('Shape saved!');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div class="header">
        <div class="header-left">
          <div class="generation-badge">Gen <span>{generation}</span></div>
        </div>
        <div class="header-right">
          <button
            class="btn btn-primary"
            disabled={selectedIndex === null}
            onClick={doEvolve}
          >
            Evolve Selected
          </button>
          <button
            class="btn"
            onClick={() => {
              rebuildGrid(cgpCols, cgpRows, presetIdx >= 0 ? presetIdx : 'random', numMutations);
              showToast('New population');
            }}
          >
            Re-roll
          </button>
        </div>
      </div>

      <div class="settings-bar">
        <div class="setting">
          <label>Seed</label>
          <button class="btn seed-picker-btn" onClick={() => setShowSeedPicker(true)}>
            {presetIdx >= 0 ? PRESETS[presetIdx].name : 'Random'} ▾
          </button>
        </div>
        <div class="setting">
          <label>Mutations</label>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={numMutations}
            onInput={onMutationChange}
          />
          <span class="value">{numMutations}</span>
        </div>
        <div class="setting">
          <label>Complexity</label>
          <select onChange={onSizeChange} value={`${cgpCols},${cgpRows}`}>
            <option value="6,4">6x4</option>
            <option value="10,6">10x6</option>
            <option value="16,8">16x8</option>
            <option value="24,10">24x10</option>
          </select>
        </div>
        <div class="hint">Click to select, Enter/dblclick to evolve</div>
      </div>

      <div
        class="grid-container"
        ref={gridRef}
        onClick={onCellClick}
        onDblClick={onCellDblClick}
      />

      {maximizedIndex !== null && stateRef.current && (
        <ShapeViewerOverlay
          genome={stateRef.current.genomes[maximizedIndex]}
          onClose={() => setMaximizedIndex(null)}
        />
      )}

      {showSeedPicker && (
        <SeedPicker
          currentIdx={presetIdx}
          onSelect={onSeedSelect}
          onClose={() => setShowSeedPicker(false)}
        />
      )}

      {showSave && (
        <SaveDialog
          onSave={handleSave}
          onCancel={() => setShowSave(false)}
          saving={saving}
        />
      )}

      {codeIndex !== null && stateRef.current && (
        <CodePanel
          genome={stateRef.current.genomes[codeIndex]}
          onClose={() => setCodeIndex(null)}
        />
      )}
    </>
  );
}
