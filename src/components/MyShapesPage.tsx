import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { user, authReady } from '../auth';
import { getUserShapes, deleteShape, updateShape, type ShapeDoc } from '../db';
import { confirm } from './ConfirmDialog';

export function MyShapesPage() {
  const [shapes, setShapes] = useState<ShapeDoc[]>([]);
  const [loading, setLoading] = useState(true);

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
                <button class="btn btn-sm" onClick={() => loadShape(shape)}>Load</button>
                <button
                  class="btn btn-sm"
                  onClick={() => togglePublic(shape)}
                >
                  {shape.public ? 'Public' : 'Private'}
                </button>
                <button class="btn btn-sm btn-danger" onClick={() => handleDelete(shape)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
