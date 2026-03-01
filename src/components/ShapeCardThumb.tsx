import type { ShapeDoc } from '../db';

export const ExpandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);

interface Props {
  shape: ShapeDoc;
  onClick: () => void;
  onViewAnimated: () => void;
  lazy?: boolean;
}

export function ShapeCardThumb({ shape, onClick, onViewAnimated, lazy }: Props) {
  return (
    <div class="shape-card-thumb" onClick={onClick}>
      {shape.thumbnailURL ? (
        <img src={shape.thumbnailURL} alt={shape.name} {...(lazy ? { loading: 'lazy' as const } : {})} />
      ) : (
        <div class="thumb-placeholder" />
      )}
      <button
        class="thumb-view-btn"
        title="View animated"
        onClick={(e) => { e.stopPropagation(); onViewAnimated(); }}
      >
        <ExpandIcon />
      </button>
    </div>
  );
}
