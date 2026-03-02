import { useRef, useEffect } from 'preact/hooks';
import { migrateGenome, type CGPGenome } from './cgp';

/**
 * Manages a live ShapeViewer on a canvas element: creates the viewer,
 * sets the genome, handles resize, runs the animation loop, and cleans up.
 */
export function useShapeViewer(
  canvasRef: { current: HTMLCanvasElement | null },
  genome: CGPGenome | string | null,
) {
  const animRef = useRef(0);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !genome) return;

    let disposed = false;

    import('./viewer').then(({ ShapeViewer }) => {
      if (disposed) return;
      let parsed: CGPGenome;
      try {
        parsed = typeof genome === 'string'
          ? migrateGenome(JSON.parse(genome))
          : genome;
      } catch (err) {
        console.error('Failed to parse genome:', err);
        return;
      }
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
      if (viewerRef.current) {
        viewerRef.current.dispose();
        viewerRef.current = null;
      }
      const cleanup = (el as any)?._cleanup;
      if (cleanup) { cleanup(); delete (el as any)._cleanup; }
    };
  }, [genome]);
}
