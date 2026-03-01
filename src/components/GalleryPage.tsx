import { useState, useEffect, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { getPublicShapes, type ShapeDoc } from '../db';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { ShapeViewerOverlay } from './ShapeViewerOverlay';
import { ShapeCardThumb } from './ShapeCardThumb';

export function GalleryPage() {
  const [shapes, setShapes] = useState<ShapeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [viewGenome, setViewGenome] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getPublicShapes().then(result => {
      setShapes(result.shapes);
      setLastDoc(result.lastDoc);
      setHasMore(result.shapes.length === 20);
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load gallery:', err);
      setLoading(false);
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    const result = await getPublicShapes(lastDoc);
    setShapes(prev => [...prev, ...result.shapes]);
    setLastDoc(result.lastDoc);
    setHasMore(result.shapes.length === 20);
    setLoadingMore(false);
  }, [lastDoc, loadingMore]);

  const displayed = tagFilter
    ? shapes.filter(s => s.tags.includes(tagFilter))
    : shapes;

  if (loading) {
    return <div class="page-message">Loading...</div>;
  }

  return (
    <div class="gallery-page">
      <div class="page-header">
        <h2>Explore</h2>
        <span class="shape-count">{displayed.length} shape{displayed.length !== 1 ? 's' : ''}</span>
        {tagFilter && (
          <button class="btn btn-sm" onClick={() => setTagFilter(null)}>
            Clear filter: {tagFilter}
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div class="page-message">
          {tagFilter ? 'No shapes match this tag.' : 'No public shapes yet. Be the first to publish one!'}
        </div>
      ) : (
        <div class="shape-grid">
          {displayed.map(shape => (
            <div class="shape-card" key={shape.id}>
              <ShapeCardThumb
                shape={shape}
                onClick={() => route(`/shape/${shape.id}`)}
                onViewAnimated={() => setViewGenome(shape.genome)}
                lazy
              />
              <div class="shape-card-info">
                <div class="shape-card-name">{shape.name}</div>
                <div class="shape-card-author">
                  {shape.userPhoto && (
                    <img class="avatar-sm" src={shape.userPhoto} alt="" referrerpolicy="no-referrer" />
                  )}
                  <span>{shape.userName}</span>
                </div>
                <div class="shape-card-meta">
                  Gen {shape.generation}
                  {shape.tags.length > 0 && (
                    <span class="shape-card-tags">
                      {shape.tags.map(t => (
                        <span
                          class="tag tag-clickable"
                          key={t}
                          onClick={(e) => { e.stopPropagation(); setTagFilter(t); }}
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !tagFilter && (
        <div class="load-more-container">
          <button class="btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {viewGenome && (
        <ShapeViewerOverlay genome={viewGenome} onClose={() => setViewGenome(null)} />
      )}
    </div>
  );
}
