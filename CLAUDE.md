# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev      # Start Vite dev server
npm run build    # TypeScript check + Vite production build
npm run preview  # Preview production build locally
```

No test runner or linter is configured.

## Architecture

ShapeEvolve is an interactive 3D shape evolution app using **Cartesian Genetic Programming (CGP)** to evolve procedural geometry. Users select shapes from a grid; the selected shape becomes the parent for the next generation of mutations.

### Core Modules (all in `src/`)

- **cgp.ts** — CGP engine: genome representation, 19 math operations, mutation with Goldman-Punch active-node guarantee, and `compileToGLSL()` which transpiles genomes into vertex/fragment shaders.
- **seeds.ts** — `GenomeBuilder` DSL for constructing seed genomes from hand-written parametric functions (sphere, torus, wavy sphere). Uses trace-based IR to map expressions to CGP nodes.
- **grid.ts** — Population management: creates seeded/random populations, evolves from a selected parent (parent + N-1 mutations).
- **viewer.ts** — `ShapeViewer` wraps Three.js WebGL renderer per grid cell. Compiles CGP genomes to shaders with error fallback.
- **main.ts** — Entry point: vanilla DOM event handling, animation loop, keyboard shortcuts (Enter=evolve, R=randomize, 1-9=select), toast notifications.

### Data Flow

1. Genome (array of CGPNodes + outputs + constants) → `compileToGLSL()` → vertex shader computes (x,y,z) position + (r,g,b) color
2. Fragment shader applies Phong lighting
3. `mutateGenome()` guarantees at least one active-gene mutation per generation (Goldman-Punch)

### Tech Stack

- **TypeScript** (strict, ES2020 target) + **Vite** + **Three.js**
- No UI framework — vanilla DOM manipulation
- Single-page app served from `index.html`

## V2 Roadmap

See `PLAN.md` for the full v2 plan: migrate to Preact, add Firebase (Auth/Firestore/Storage) for persistence, social features (gallery, comments, stars, forking), and client-side routing.
