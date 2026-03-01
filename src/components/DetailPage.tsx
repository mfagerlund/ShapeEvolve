import { useState, useEffect, useRef } from 'preact/hooks';
import { route } from 'preact-router';
import { getShape, type ShapeDoc } from '../db';
import { migrateGenome, type CGPGenome } from '../cgp';
import { CodePanel } from './CodePanel';

interface Props {
  id?: string;
}

export function DetailPage({ id }: Props) {
  const [shape, setShape] = useState<ShapeDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<any>(null);
  const animRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getShape(id).then(s => {
      setShape(s);
      setLoading(false);
    });
  }, [id]);

  // Set up live 3D viewer when shape loads
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !shape) return;

    let disposed = false;

    import('../viewer').then(({ ShapeViewer }) => {
      if (disposed) return;
      const genome = JSON.parse(shape.genome);
      const viewer = new ShapeViewer(el, 0);
      viewer.setGenome(genome);
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

      // Store cleanup ref
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
      if ((el as any)?._cleanup) {
        (el as any)._cleanup();
        delete (el as any)._cleanup;
      }
    };
  }, [shape]);

  function forkAndEvolve() {
    if (!shape) return;
    localStorage.setItem('pendingFork', shape.genome);
    route('/');
  }

  function loadShape() {
    if (!shape) return;
    localStorage.setItem('loadGenome', shape.genome);
    route('/');
  }

  if (loading) {
    return <div class="page-message">Loading...</div>;
  }

  if (!shape) {
    return (
      <div class="page-message">
        Shape not found. <a href="/explore">Back to Gallery</a>
      </div>
    );
  }

  const date = shape.createdAt?.toDate?.()
    ? shape.createdAt.toDate().toLocaleDateString()
    : '';

  return (
    <div class="detail-page">
      <div class="detail-back">
        <a href="/explore" class="btn btn-sm">Back to Gallery</a>
      </div>
      <div class="detail-layout">
        <div class="detail-viewer">
          <canvas class="detail-canvas" ref={canvasRef} />
        </div>
        <div class="detail-info">
          <h2>{shape.name}</h2>
          <div class="detail-author">
            {shape.userPhoto && (
              <img class="avatar" src={shape.userPhoto} alt="" referrerpolicy="no-referrer" />
            )}
            <span>{shape.userName}</span>
          </div>
          <div class="detail-meta">
            <div><span class="meta-label">Generation</span> {shape.generation}</div>
            <div><span class="meta-label">Complexity</span> {shape.gridSize}</div>
            {shape.seedPreset && (
              <div><span class="meta-label">Seed</span> {shape.seedPreset}</div>
            )}
            {date && (
              <div><span class="meta-label">Created</span> {date}</div>
            )}
          </div>
          {shape.tags.length > 0 && (
            <div class="detail-tags">
              {shape.tags.map(t => (
                <span class="tag" key={t}>{t}</span>
              ))}
            </div>
          )}
          {shape.forkedFrom && (
            <div class="detail-forked">
              Forked from <a href={`/shape/${shape.forkedFrom}`}>{shape.forkedFrom}</a>
            </div>
          )}
          <div class="detail-actions">
            <button class="btn btn-primary" onClick={forkAndEvolve}>Fork &amp; Evolve</button>
            <button class="btn" onClick={loadShape}>Load</button>
            <button class="btn" onClick={() => setShowCode(true)}>View Code</button>
          </div>
        </div>
      </div>

      {showCode && (
        <CodePanel
          genome={migrateGenome(JSON.parse(shape.genome) as CGPGenome)}
          onClose={() => setShowCode(false)}
        />
      )}
    </div>
  );
}
