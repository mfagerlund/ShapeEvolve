import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { user, authReady } from '../auth';
import { getUserShapes, deleteShape, updateShape, type ShapeDoc } from '../db';
import { confirm } from './ConfirmDialog';
import { ShapeViewerOverlay } from './ShapeViewerOverlay';

export function MyShapesPage() {
  const [shapes, setShapes] = useState<ShapeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewGenome, setViewGenome] = useState<string | null>(null);

  const u = user.value;

  useEffect(() => {
    if (!authReady.value) return;
    if (!u) {
      route('/', true);
      return;
    }
    setLoading(true);
    getUserShapes(u.uid).then(s => {
      setShapes(s);
      setLoading(false);
    });
  }, [u]);

  async function handleDelete(shape: ShapeDoc) {
    if (!await confirm(`Delete "${shape.name}"?`, { confirmLabel: 'Delete', danger: true })) return;
    await deleteShape(shape.id, shape.userId);
    setShapes(prev => prev.filter(s => s.id !== shape.id));
  }

  async function togglePublic(shape: ShapeDoc) {
    const newPublic = !shape.public;
    await updateShape(shape.id, { public: newPublic });
    setShapes(prev =>
      prev.map(s => s.id === shape.id ? { ...s, public: newPublic } : s)
    );
  }

  function loadShape(shape: ShapeDoc) {
    localStorage.setItem('loadGenome', shape.genome);
    route('/');
  }

  if (!authReady.value || loading) {
    return <div class="page-message">Loading...</div>;
  }

  if (!u) return null;

  return (
    <div class="my-shapes-page">
      <div class="page-header">
        <h2>My Shapes</h2>
        <span class="shape-count">{shapes.length} shape{shapes.length !== 1 ? 's' : ''}</span>
      </div>

      {shapes.length === 0 ? (
        <div class="page-message">
          No shapes saved yet. Go to the <a href="/">evolve page</a>, select a shape, and click Save.
        </div>
      ) : (
        <div class="shape-grid">
          {shapes.map(shape => (
            <div class="shape-card" key={shape.id}>
              <div class="shape-card-thumb" onClick={() => loadShape(shape)}>
                {shape.thumbnailURL ? (
                  <img src={shape.thumbnailURL} alt={shape.name} />
                ) : (
                  <div class="thumb-placeholder" />
                )}
                <button
                  class="thumb-view-btn"
                  title="View animated"
                  onClick={(e) => { e.stopPropagation(); setViewGenome(shape.genome); }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
              </div>
              <div class="shape-card-info">
                <div class="shape-card-name">{shape.name}</div>
                <div class="shape-card-meta">
                  Gen {shape.generation} · {shape.gridSize}
                  {shape.tags.length > 0 && (
                    <span class="shape-card-tags">
                      {shape.tags.map(t => <span class="tag" key={t}>{t}</span>)}
                    </span>
                  )}
                </div>
              </div>
              <div class="shape-card-actions">
                <button class="card-icon-btn" title="View animated" onClick={() => setViewGenome(shape.genome)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
                    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                  </svg>
                </button>
                <button class="card-icon-btn" title="Load to evolve" onClick={() => loadShape(shape)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
                <button
                  class={`card-icon-btn ${shape.public ? 'card-icon-active' : ''}`}
                  title={shape.public ? 'Public (click to make private)' : 'Private (click to make public)'}
                  onClick={() => togglePublic(shape)}
                >
                  {shape.public ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  )}
                </button>
                <button class="card-icon-btn card-icon-danger" title="Delete" onClick={() => handleDelete(shape)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {viewGenome && (
        <ShapeViewerOverlay genome={viewGenome} onClose={() => setViewGenome(null)} />
      )}
    </div>
  );
}
