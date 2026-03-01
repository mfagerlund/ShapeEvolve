import { useRef, useEffect } from 'preact/hooks';
import { PRESETS } from '../seeds';
import { ShapeViewer } from '../viewer';

interface SeedPickerProps {
  currentIdx: number; // -1 for random
  onSelect: (idx: number | 'random') => void;
  onClose: () => void;
}

export function SeedPicker({ currentIdx, onSelect, onClose }: SeedPickerProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    // Render previews sequentially — one WebGL context at a time
    const canvases = grid.querySelectorAll<HTMLCanvasElement>('canvas[data-preset]');
    for (const canvas of canvases) {
      const idx = parseInt(canvas.dataset.preset!, 10);
      try {
        const genome = PRESETS[idx].create(10, 6);
        const viewer = new ShapeViewer(canvas, idx);
        viewer.setGenome(genome);
        viewer.resize(120, 120);
        viewer.render();
        viewer.dispose();
      } catch {
        // Seed failed to render, canvas stays blank
      }
    }
  }, []);

  return (
    <div class="modal-overlay" onClick={onClose}>
      <div class="modal seed-picker-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Choose a Seed</h3>
        <div class="seed-picker-grid" ref={gridRef}>
          {PRESETS.map((p, i) => (
            <div
              key={i}
              class={`seed-card${i === currentIdx ? ' selected' : ''}`}
              onClick={() => onSelect(i)}
            >
              <canvas data-preset={String(i)} width={120} height={120} />
              <div class="seed-name">{p.name}</div>
            </div>
          ))}
          <div
            class={`seed-card${currentIdx === -1 ? ' selected' : ''}`}
            onClick={() => onSelect('random')}
          >
            <div class="seed-random-icon">?</div>
            <div class="seed-name">Random</div>
          </div>
        </div>
      </div>
    </div>
  );
}
