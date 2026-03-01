import { useRef, useEffect } from 'preact/hooks';
import { type CGPGenome } from '../cgp';
import { useShapeViewer } from '../useShapeViewer';

interface Props {
  /** Raw genome object or JSON string */
  genome: CGPGenome | string;
  onClose: () => void;
}

export function ShapeViewerOverlay({ genome, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useShapeViewer(canvasRef, genome);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div class="maximize-overlay" onClick={onClose}>
      <div class="maximize-viewer" onClick={(e) => e.stopPropagation()}>
        <canvas ref={canvasRef} />
        <button class="maximize-close" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
