import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { UNARY_DEMOS, BINARY_DEMOS, TERNARY_DEMOS, FunctionDemo } from '../functionDemos';
import { ShapeViewer } from '../viewer';

const THUMB_SIZE = 200;

function FunctionCard({ demo, thumb }: { demo: FunctionDemo; thumb?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ShapeViewer | null>(null);
  const rafRef = useRef<number>(0);

  const arityClass = demo.arity === 1 ? 'unary' : demo.arity === 2 ? 'binary' : 'ternary';

  const startAnimation = () => {
    const container = containerRef.current;
    if (!container || viewerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'fn-card-canvas';
    const thumbArea = container.querySelector('.fn-card-thumb-area')!;
    const img = thumbArea.querySelector('img');
    if (img) img.style.display = 'none';
    thumbArea.appendChild(canvas);

    try {
      const genome = demo.build(8, 4);
      const viewer = new ShapeViewer(canvas, 0);
      viewer.setGenome(genome);
      viewerRef.current = viewer;

      const rect = thumbArea.getBoundingClientRect();
      viewer.resize(rect.width * devicePixelRatio, rect.height * devicePixelRatio);

      const animate = () => {
        viewer.render();
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    } catch {
      // build/compile failed — just leave the thumbnail
      if (img) img.style.display = '';
      canvas.remove();
    }
  };

  const stopAnimation = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (viewerRef.current) {
      viewerRef.current.dispose();
      viewerRef.current = null;
    }
    const container = containerRef.current;
    if (container) {
      const canvas = container.querySelector('.fn-card-canvas');
      if (canvas) canvas.remove();
      const img = container.querySelector('.fn-card-thumb-area img') as HTMLElement | null;
      if (img) img.style.display = '';
    }
  };

  const evolveFrom = (e: Event) => {
    e.stopPropagation();
    const genome = demo.build(10, 6);
    localStorage.setItem('loadGenome', JSON.stringify(genome));
    route('/');
  };

  useEffect(() => () => stopAnimation(), []);

  return (
    <div
      class="fn-card"
      ref={containerRef}
      onMouseEnter={startAnimation}
      onMouseLeave={stopAnimation}
    >
      <div class="fn-card-thumb-area">
        {thumb
          ? <img src={thumb} alt={demo.name} width={THUMB_SIZE} height={THUMB_SIZE} />
          : <div class="fn-card-placeholder" />}
      </div>
      <div class="fn-card-body">
        <div class="fn-card-header">
          <span class="fn-card-name">{demo.name}</span>
          <span class={`fn-arity-badge ${arityClass}`}>
            {demo.arity === 1 ? 'unary' : demo.arity === 2 ? 'binary' : 'ternary'}
          </span>
          <button class="fn-card-evolve-btn" onClick={evolveFrom} title="Evolve from this shape">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </button>
        </div>
        <p class="fn-card-desc">{demo.description}</p>
        <pre class="fn-card-code">{demo.code}</pre>
      </div>
    </div>
  );
}

function Section({ title, demos, thumbs }: {
  title: string;
  demos: FunctionDemo[];
  thumbs: Map<string, string>;
}) {
  return (
    <section class="fn-gallery-section">
      <h3>{title}<span class="fn-section-count">{demos.length}</span></h3>
      <div class="fn-gallery-grid">
        {demos.map(d => (
          <FunctionCard key={d.name} demo={d} thumb={thumbs.get(d.name)} />
        ))}
      </div>
    </section>
  );
}

export function FunctionGalleryPage() {
  const [thumbs, setThumbs] = useState<Map<string, string>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const allDemos = [...UNARY_DEMOS, ...BINARY_DEMOS, ...TERNARY_DEMOS];
    const map = new Map<string, string>();

    // Render thumbnails sequentially (one WebGL context at a time)
    const renderNext = (i: number) => {
      if (!mountedRef.current || i >= allDemos.length) {
        if (mountedRef.current) setThumbs(new Map(map));
        return;
      }

      const demo = allDemos[i];
      try {
        const canvas = document.createElement('canvas');
        canvas.width = THUMB_SIZE;
        canvas.height = THUMB_SIZE;
        const genome = demo.build(8, 4);
        const viewer = new ShapeViewer(canvas, 0);
        viewer.setGenome(genome);
        viewer.resize(THUMB_SIZE, THUMB_SIZE);
        viewer.render();
        map.set(demo.name, canvas.toDataURL());
        viewer.dispose();
      } catch {
        // skip failed thumbnails
      }

      // Batch update every 6 thumbnails for progressive loading
      if (i > 0 && i % 6 === 0 && mountedRef.current) {
        setThumbs(new Map(map));
      }

      // Yield to main thread
      requestAnimationFrame(() => renderNext(i + 1));
    };

    renderNext(0);

    return () => { mountedRef.current = false; };
  }, []);

  return (
    <div class="fn-gallery-page">
      <div class="fn-gallery-header">
        <h2>Function Gallery</h2>
        <p>Every CGP function visualized. Hover a card to animate.</p>
      </div>
      <Section title="Unary" demos={UNARY_DEMOS} thumbs={thumbs} />
      <Section title="Binary" demos={BINARY_DEMOS} thumbs={thumbs} />
      <Section title="Ternary" demos={TERNARY_DEMOS} thumbs={thumbs} />
    </div>
  );
}
