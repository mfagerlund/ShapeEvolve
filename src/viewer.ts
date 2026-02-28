import * as THREE from 'three';
import { CGPGenome, compileToGLSL } from './cgp';

export class ShapeViewer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private clock = new THREE.Clock();
  private disposed = false;

  constructor(
    public canvas: HTMLCanvasElement,
    public index: number,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a0f, 1);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camera.position.set(0, 0, 4);
    this.camera.lookAt(0, 0, 0);
  }

  setGenome(genome: CGPGenome): void {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.material?.dispose();
    }

    const { vertexShader, fragmentShader } = compileToGLSL(genome);

    const segments = 64;
    const geometry = new THREE.PlaneGeometry(
      Math.PI * 2, Math.PI * 2,
      segments, segments
    );

    try {
      this.material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { time: { value: 0 } },
        side: THREE.DoubleSide,
      });

      this.mesh = new THREE.Mesh(geometry, this.material);
      this.scene.add(this.mesh);
    } catch {
      const fallbackMat = new THREE.MeshBasicMaterial({
        color: 0x333333, wireframe: true, side: THREE.DoubleSide,
      });
      this.mesh = new THREE.Mesh(geometry, fallbackMat);
      this.scene.add(this.mesh);
      this.material = null;
    }
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    if (this.disposed) return;

    const elapsed = this.clock.getElapsedTime();

    if (this.material) {
      this.material.uniforms.time.value = elapsed;
    }

    if (this.mesh) {
      this.mesh.rotation.y = elapsed * 0.3;
      this.mesh.rotation.x = Math.sin(elapsed * 0.15) * 0.3;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    if (this.mesh) this.mesh.geometry.dispose();
    this.material?.dispose();
    this.renderer.dispose();
  }
}
