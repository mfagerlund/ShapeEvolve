# ShapeEvolve

An interactive 3D shape evolution app using **Cartesian Genetic Programming (CGP)** to evolve procedural geometry. Select shapes from a grid to breed the next generation of mutations.

**Live**: https://shapeevolve.web.app

## Tech Stack

- **Preact** + preact-router + @preact/signals
- **Three.js** with custom GLSL shaders
- **Firebase** (Auth, Firestore, Storage, Hosting)
- **TypeScript** + **Vite**

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

## Deploy

```bash
deploy.bat       # Build + deploy everything to Firebase
```

Or deploy individually:

```bash
firebase deploy --only hosting                   # Site only
firebase deploy --only firestore:rules,storage   # Rules only
```

## How It Works

1. A **CGP genome** (array of nodes + outputs + constants) is compiled to GLSL shaders via `compileToGLSL()`
2. The **vertex shader** computes (x, y, z) position and (r, g, b) color for each vertex on a sphere mesh
3. The **fragment shader** applies Phong lighting
4. `mutateGenome()` guarantees at least one active-gene mutation per generation (Goldman-Punch algorithm)
5. Users pick a shape to evolve; it becomes the parent for the next generation

## Project Structure

```
src/
  cgp.ts              # CGP engine: genome, 19 math ops, mutation, GLSL compiler
  seeds.ts            # GenomeBuilder DSL for seed shapes (sphere, torus, etc.)
  grid.ts             # Population management, DOM grid cells with Three.js canvases
  viewer.ts           # ShapeViewer: Three.js WebGL renderer per grid cell
  firebase.ts         # Firebase SDK init
  auth.ts             # Google sign-in/out, reactive user signal
  db.ts               # Firestore CRUD for shapes
  storage.ts          # Thumbnail upload to Firebase Storage
  components/
    main.tsx           # Preact entry point, router
    NavBar.tsx         # Logo, auth, avatar, navigation
    EvolvePage.tsx     # Evolution grid with controls
    MyShapesPage.tsx   # User's saved shapes
    SaveDialog.tsx     # Save modal (name, tags, public toggle)
    ConfirmDialog.tsx  # Custom confirm dialog
```

## Security

- **Firestore rules** (`firestore.rules`): Owner-only writes, public reads for public shapes
- **Storage rules** (`storage.rules`): Authenticated uploads only, 2 MB limit, PNG only
- **Auth**: Google Sign-In via Firebase Auth
