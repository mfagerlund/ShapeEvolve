import { useRef, useEffect } from 'preact/hooks';
import { migrateGenome, type CGPGenome } from '../cgp';

interface Props {
  /** Raw genome object or JSON string */
  genome: CGPGenome | string;
  onClose: () => void;
}

export function ShapeViewerOverlay({ genome, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    let disposed = false;

    import('../viewer').then(({ ShapeViewer }) => {
      if (disposed) return;
      const parsed: CGPGenome = typeof genome === 'string'
        ? migrateGenome(JSON.parse(genome))
        : genome;
      const viewer = new ShapeViewer(el, 0);
      viewer.setGenome(parsed);
      viewerRef.current = viewer;

      function resize() {
        if (disposed || !el) return;
        viewer.resize(el.clientWidth, el.clientHeight);
      }
      resize();
      window.addEventListener('resize', resize);

      function animate() {
        if (disposed) { viewer.dispose(); return; }
        viewer.render();
        animRef.current = requestAnimationFrame(animate);
      }
      animRef.current = requestAnimationFrame(animate);

      (el as any)._cleanup = () => {
        window.removeEventListener('resize', resize);
      };
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animRef.current);
      viewerRef.current?.dispose();
      viewerRef.current = null;
      const cleanup = (el as any)?._cleanup;
      if (cleanup) { cleanup(); delete (el as any)._cleanup; }
    };
  }, [genome]);

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
