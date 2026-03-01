# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

No test runner or linter is configured.

## Deploy

```bash
deploy.bat                            # Build + deploy everything (hosting, rules, indexes)
firebase deploy --only hosting        # Deploy site only
firebase deploy --only firestore:rules,storage  # Deploy rules only
```

- **Hosted at**: https://shapeevolve.web.app
- **Firebase project**: `shapeevolve`
- Hosting serves `dist/` with SPA rewrite (`** → /index.html`)
- Security rules: `firestore.rules` (Firestore) + `storage.rules` (Storage)

## Architecture

ShapeEvolve is an interactive 3D shape evolution app using **Cartesian Genetic Programming (CGP)** to evolve procedural geometry. Users select shapes from a grid; the selected shape becomes the parent for the next generation of mutations.

### Tech Stack

- **Preact** + **preact-router** (client-side routing)
- **@preact/signals** for reactive auth state
- **Firebase** (Auth, Firestore, Storage) for persistence and social features
- **Three.js** for WebGL rendering with custom GLSL shaders
- **TypeScript** (strict, ES2020 target) + **Vite**

### Core Modules (`src/`)

- **cgp.ts** — CGP engine: genome representation, 19 math operations, mutation with Goldman-Punch active-node guarantee, and `compileToGLSL()` which transpiles genomes into vertex/fragment shaders.
- **seeds.ts** — `GenomeBuilder` DSL for constructing seed genomes from hand-written parametric functions (sphere, torus, wavy sphere). Uses trace-based IR to map expressions to CGP nodes.
- **grid.ts** — Population management: creates seeded/random populations, evolves from a selected parent (parent + N-1 mutations). Imperatively creates DOM grid cells with Three.js canvases.
- **viewer.ts** — `ShapeViewer` wraps Three.js WebGL renderer per grid cell. Compiles CGP genomes to shaders with error fallback.

### Firebase Modules (`src/`)

- **firebase.ts** — SDK init, exports `db`, `auth`, `storage`
- **auth.ts** — Google sign-in/out, `user` signal for reactive auth state
- **db.ts** — Firestore CRUD for shapes (save, get, list, delete, update)
- **storage.ts** — Thumbnail upload to Firebase Storage + canvas capture

### Components (`src/components/`)

- **main.tsx** — Preact entry point, Router, mounts `ConfirmDialog`
- **NavBar.tsx** — Logo, auth button, avatar, My Shapes link
- **EvolvePage.tsx** — 4x4 evolution grid with controls; bridges imperative Three.js via refs/effects
- **MyShapesPage.tsx** — User's saved shapes: load, delete, toggle public
- **SaveDialog.tsx** — Modal for naming/tagging/publishing shapes
- **ConfirmDialog.tsx** — Custom confirm dialog replacing `window.confirm()`

### Data Flow

1. Genome (array of CGPNodes + outputs + constants) → `compileToGLSL()` → vertex shader computes (x,y,z) position + (r,g,b) color
2. Fragment shader applies Phong lighting
3. `mutateGenome()` guarantees at least one active-gene mutation per generation (Goldman-Punch)

## Conventions

- **Never use `window.confirm()` or `window.alert()`** — always use the custom `confirm()` from `src/components/ConfirmDialog.tsx`. It returns a `Promise<boolean>` and renders an in-app modal that matches the dark theme.
- Grid cells are created imperatively in `grid.ts` (DOM + Three.js canvases). Preact components interact with them via refs.
- **CRITICAL: NEVER insert new functions into the middle of the `FUNCTIONS` array in `cgp.ts`.** Saved genomes store `funcIdx` as integer indices. Inserting anywhere but the end shifts all subsequent indices, silently corrupting every saved genome that references those functions. **ALWAYS append new functions at the end of the array.**
- **CRITICAL: NEVER reorder, remove, or insert entries into `INPUT_NAMES` except at the end.** Saved genomes reference inputs by index. Shifting indices requires a version migration in `migrateGenome()`.

## V2 Roadmap

See `PLAN.md` for the full v2 plan: gallery, detail pages, comments, stars, forking, and user profiles.
