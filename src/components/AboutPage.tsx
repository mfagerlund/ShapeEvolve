export function AboutPage() {
  return (
    <div class="about-page">
      <h2>About ShapeEvolve</h2>

      <p>
        ShapeEvolve is an interactive 3D shape evolution app that uses{' '}
        <strong>Cartesian Genetic Programming (CGP)</strong> to evolve procedural
        geometry. Pick a shape you like from the grid, and it becomes the parent
        for the next generation of mutations &mdash; artificial selection
        for 3D forms.
      </p>

      <p>
        Made by <strong>Mattias Fagerlund</strong>.
      </p>

      <h3>Hyperspace</h3>
      <p>
        ShapeEvolve draws inspiration from{' '}
        <a href="https://evolvecode.io/hyperspace/index.html" target="_blank" rel="noopener noreferrer">
          Hyperspace
        </a>
        , an earlier exploration of evolved shapes and mathematical art.
      </p>

      <h3>How It Works</h3>
      <p>
        Each shape is defined by a CGP genome &mdash; a directed graph of
        mathematical operations that maps a sphere of points into 3D positions
        and colors. When you select a shape, the genome is mutated to produce
        offspring, guaranteeing at least one active-gene change per generation
        (Goldman&ndash;Punch mutation). The genomes compile directly to GLSL
        shaders for real-time rendering via Three.js.
      </p>
    </div>
  );
}
