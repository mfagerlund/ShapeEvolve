---
oneliner: Interactive 3D shape evolution app that breeds procedural geometry via Cartesian Genetic Programming
tags: [cartesian genetic programming, evolutionary art, procedural geometry, generative design, three.js, glsl, preact, typescript, firebase, webgl]
stack: [Preact, TypeScript, Three.js, Vite, Firebase]
generated: 2026-09-06
commit: 72397cd
placeholder: false
---
Users pick a shape from a grid of GPU-rendered mutants and the chosen genome becomes the parent for the next generation; genomes are compiled to GLSL vertex/fragment shaders on the fly. Firebase handles auth, saved shapes and a public gallery. Working and deployed at shapeevolve.web.app, with a v2 roadmap (gallery, forking, profiles) tracked in PLAN.md.
