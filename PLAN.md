# ShapeEvolve v2 Roadmap

Phase 1 (Firebase + Auth + Save/Load + Hosting + Security Rules) is complete.

## Phase 2: Gallery + Detail Page

### Data Model Additions

`shapes/{shapeId}/comments/{commentId}`:
```
{ userId, userName, userPhoto, text, createdAt }
```

`stars/{shapeId}_{userId}`:
```
{ shapeId, userId, createdAt }
```

### Routes

| Route | Page | Status |
|-------|------|--------|
| `/` | Evolve | Done |
| `/my-shapes` | My Shapes | Done |
| `/explore` | Gallery | TODO |
| `/shape/:id` | Detail | TODO |
| `/user/:id` | Profile | TODO |

### Tasks

- `/explore` gallery page with ShapeCard grid (thumbnail, name, author, stars)
- Search/filter by tag, sort by newest/most starred
- Infinite scroll or pagination
- `/shape/:id` detail page with full-size live viewer
- Fork button (copy genome to evolve page via localStorage `pendingFork`)
- Detail page shows "Forked from [original]" link

## Phase 3: Social Features

- Star/unstar shapes (optimistic UI, `stars` collection, update `starCount`)
- Comment section on detail page (`comments` subcollection)
- Tag editor (owner can add/remove tags)
- Tag-based search/filter in gallery
- `/user/:id` profile page (user's public shapes + stats)
- Update Firestore rules for comments + stars collections

## Phase 4: Polish

- Responsive design (mobile-friendly gallery)
- Loading skeletons
- Error boundaries
- Share buttons (copy URL, OG tags)
- "Trending" algorithm (stars per time)
