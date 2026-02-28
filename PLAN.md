# ShapeEvolve v2: Social Evolution Platform

## Summary

Add Firebase (Auth + Firestore + Storage) for persistence and social features.
Migrate UI to Preact with client-side routing for multi-page app feel.

## Tech Stack

- **Frontend**: Preact + preact-router (3KB, React API, already using Vite)
- **Auth**: Firebase Auth with Google Sign-In
- **Database**: Firestore (document DB, free tier: 50k reads/day, 20k writes/day)
- **Storage**: Firebase Storage (thumbnails, free tier: 5GB)
- **Hosting**: Firebase Hosting (optional, free tier, global CDN)

## Data Model (Firestore)

### `users/{userId}`
```
{
  displayName: string,
  photoURL: string,
  createdAt: timestamp,
  shapeCount: number       // denormalized counter
}
```

### `shapes/{shapeId}`
```
{
  userId: string,
  userName: string,          // denormalized for display
  userPhoto: string,         // denormalized
  name: string,
  genome: string,            // JSON-serialized CGPGenome (~2-5KB)
  thumbnailPath: string,     // Firebase Storage path
  createdAt: timestamp,
  updatedAt: timestamp,
  generation: number,        // which generation it was saved at
  gridSize: string,          // e.g. "10x6"
  seedPreset: string | null, // "Sphere", "Torus", etc.
  forkedFrom: string | null, // shapeId of parent (null if original)
  tags: string[],            // user-defined tags
  starCount: number,         // denormalized counter
  commentCount: number,      // denormalized counter
  public: boolean
}
```

### `shapes/{shapeId}/comments/{commentId}`
```
{
  userId: string,
  userName: string,
  userPhoto: string,
  text: string,
  createdAt: timestamp
}
```

### `stars/{shapeId}_{userId}`
```
{
  shapeId: string,
  userId: string,
  createdAt: timestamp
}
```
Flat collection with composite ID prevents duplicate stars and enables
efficient "has user starred this?" lookups.

## Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users: only write own profile
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }

    // Shapes: anyone reads public, only owner writes
    match /shapes/{shapeId} {
      allow read: if resource.data.public == true
                  || request.auth.uid == resource.data.userId;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth.uid == resource.data.userId;

      // Comments: authed users can create, only author can delete
      match /comments/{commentId} {
        allow read: if true;
        allow create: if request.auth != null;
        allow delete: if request.auth.uid == resource.data.userId;
      }
    }

    // Stars: authed users can star/unstar
    match /stars/{starId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.userId == request.auth.uid;
      allow delete: if request.auth.uid == resource.data.userId;
    }
  }
}
```

## Pages / Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Evolve | The 4x4 evolution grid (current app) |
| `/explore` | Gallery | Browse public shapes, search by tag, sort by stars/date/new |
| `/shape/:id` | Detail | Full-size animated shape, comments, tags, star, fork button |
| `/my-shapes` | My Shapes | Personal collection, edit/delete, toggle public |
| `/user/:id` | Profile | User's public shapes, stats |

## UI Structure (Preact Components)

```
App
├── NavBar (logo, route links, auth button, avatar)
├── Router
│   ├── EvolvePage (current 4x4 grid + controls)
│   │   └── SaveDialog (modal: name, tags, public toggle)
│   ├── GalleryPage
│   │   ├── SearchBar (tag filter, sort dropdown)
│   │   └── ShapeCard[] (thumbnail, name, author, stars, tags)
│   ├── ShapeDetailPage
│   │   ├── ShapeViewer (full-size, animated)
│   │   ├── ShapeInfo (name, author, generation, seed, forked-from)
│   │   ├── TagList (editable by owner)
│   │   ├── StarButton
│   │   ├── ForkButton → navigates to / with genome loaded
│   │   └── CommentSection
│   │       ├── CommentForm
│   │       └── Comment[]
│   ├── MyShapesPage
│   │   └── ShapeCard[] (with edit/delete controls)
│   └── UserProfilePage
│       └── ShapeCard[] (user's public shapes)
```

## Thumbnail Capture

On save, capture the shape canvas as a PNG:
```ts
canvas.toDataURL('image/png')  // → base64
// Upload to Firebase Storage: thumbnails/{shapeId}.png
// Store download URL in shape document
```

Static screenshot (not animated) — fast to load in gallery cards.
The detail page re-renders the shape live from the genome.

## Fork Flow

1. User views a shape on `/shape/:id`
2. Clicks "Fork" → genome is copied to localStorage as `pendingFork`
3. Navigated to `/` (evolve page)
4. Evolve page detects `pendingFork`, loads it as seed
5. Shape document gets `forkedFrom: originalShapeId`
6. Detail page shows "Forked from [original]" with link

## Phases

### Phase 1: Firebase + Auth + Save/Load
- Set up Firebase project (Firestore, Auth, Storage)
- Add firebase SDK to the project
- Migrate to Preact + preact-router
- Add NavBar with Google Sign-In
- Save button on evolve page → SaveDialog → write to Firestore + upload thumbnail
- My Shapes page: list, load, delete

### Phase 2: Gallery + Detail Page
- `/explore` gallery page with ShapeCards
- Thumbnail grid with infinite scroll or pagination
- Sort by: newest, most starred, most commented
- `/shape/:id` detail page with live viewer
- Fork button

### Phase 3: Social Features
- Star/unstar shapes (with optimistic UI)
- Comment section on detail page
- Tag editor (owner can add/remove tags)
- Tag-based search/filter in gallery
- User profile pages

### Phase 4: Polish
- Responsive design (mobile-friendly gallery)
- Loading skeletons
- Error boundaries
- Share buttons (copy URL, maybe Twitter/OG tags)
- "Trending" algorithm (stars per time)
- Keyboard shortcuts documentation

## New Dependencies

```json
{
  "dependencies": {
    "preact": "^10.25.0",
    "preact-router": "^4.1.0",
    "firebase": "^11.0.0",
    "three": "^0.170.0"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.9.0"
  }
}
```

## Firebase Project Setup

1. Go to console.firebase.google.com
2. Create project "shapevolve"
3. Enable Authentication → Google provider
4. Create Firestore database (start in test mode, then add rules)
5. Enable Storage
6. Add web app → copy config to `src/firebase.ts`
7. (Optional) Enable Firebase Hosting

## File Structure (after migration)

```
src/
├── main.tsx              # Preact entry, router
├── firebase.ts           # Firebase config + init
├── auth.ts               # Auth state, login/logout
├── db.ts                 # Firestore CRUD helpers
├── storage.ts            # Firebase Storage helpers
├── cgp.ts                # CGP engine (unchanged)
├── seeds.ts              # Genome builder (unchanged)
├── components/
│   ├── NavBar.tsx
│   ├── EvolvePage.tsx    # Current grid, refactored
│   ├── SaveDialog.tsx
│   ├── GalleryPage.tsx
│   ├── ShapeCard.tsx
│   ├── ShapeDetailPage.tsx
│   ├── CommentSection.tsx
│   ├── StarButton.tsx
│   ├── ForkButton.tsx
│   ├── TagEditor.tsx
│   ├── MyShapesPage.tsx
│   ├── UserProfilePage.tsx
│   └── ShapeViewer.tsx   # Three.js viewer as Preact component
├── hooks/
│   ├── useAuth.ts
│   ├── useShapes.ts
│   └── useComments.ts
├── grid.ts               # Population logic (unchanged)
└── style.css             # Global styles (extended)
```
