// Demo definitions for every CGP function — used by FunctionGalleryPage

import { CGPGenome } from './cgp';
import { GenomeBuilder, buildSphere } from './seeds';

export interface FunctionDemo {
  name: string;
  arity: 1 | 2 | 3;
  description: string;
  code: string;
  build: (cols: number, rows: number) => CGPGenome;
}

// Grid size for all demos — small but sufficient
const C = 8, R = 4;

// Helper: build a demo genome with sphere base
function demo(
  name: string, arity: 1 | 2 | 3, description: string, code: string,
  fn: (b: GenomeBuilder, sphere: number) => { pos: number; col: number },
): FunctionDemo {
  return {
    name, arity, description, code,
    build: (cols = C, rows = R) => {
      const b = new GenomeBuilder();
      const sphere = buildSphere(b);
      const { pos, col } = fn(b, sphere);
      return b.build({ pos, col }, cols, rows);
    },
  };
}

// ===== UNARY (19) =====

const UNARY_DEMOS: FunctionDemo[] = [
  demo('sin', 1,
    'Sine of each component. Creates smooth periodic waves.',
    'col = sin(mul(UV0, cu(3)))',
    (b) => ({
      pos: b.mul(b.UV0, b.cu(0.3)),
      col: b.sin(b.mul(b.UV0, b.cu(3))),
    })),

  demo('cos', 1,
    'Cosine of each component. Phase-shifted sine for rounded shapes.',
    'pos = cos(mul(UVD, cu(2)))',
    (b) => ({
      pos: b.cos(b.mul(b.UVD, b.cu(2))),
      col: b.sin(b.UVD),
    })),

  demo('abs', 1,
    'Absolute value per component. Folds negative space into positive, creating symmetry.',
    'pos = abs(sphere)',
    (b, s) => ({
      pos: b.abs(s),
      col: b.abs(b.sub(s, b.swizzle_yzx(s))),
    })),

  demo('neg', 1,
    'Negates each component. Mirrors geometry through the origin.',
    'pos = avg(sphere, neg(swizzle_yzx(sphere)))',
    (b, s) => ({
      pos: b.avg(s, b.neg(b.swizzle_yzx(s))),
      col: b.abs(s),
    })),

  demo('fract', 1,
    'Fractional part of each component. Repeats geometry in [0,1] cells.',
    'pos = fract(mul(sphere, cu(3)))',
    (b, s) => ({
      pos: b.fract(b.mul(s, b.cu(3))),
      col: b.fract(b.mul(s, b.cu(5))),
    })),

  demo('tanh', 1,
    'Hyperbolic tangent. Smoothly saturates values to [-1, 1].',
    'pos = mul(sphere, tanh(mul(sphere, cu(3))))',
    (b, s) => ({
      pos: b.mul(s, b.tanh(b.mul(s, b.cu(3)))),
      col: b.tanh(b.mul(s, b.cu(2))),
    })),

  demo('floor', 1,
    'Rounds down per component. Quantizes space into integer steps.',
    'pos = mul(floor(mul(sphere, cu(4))), cu(0.3))',
    (b, s) => ({
      pos: b.mul(b.floor(b.mul(s, b.cu(4))), b.cu(0.3)),
      col: b.fract(b.mul(s, b.cu(4))),
    })),

  demo('sign', 1,
    'Returns -1, 0, or 1 per component. Collapses geometry to cube vertices.',
    'pos = mul(sign(sphere), cu(0.8))',
    (b, s) => ({
      pos: b.mul(b.sign(s), b.cu(0.8)),
      col: b.abs(s),
    })),

  demo('sqrt', 1,
    'Safe square root of |x|. Expands small values, compresses large ones.',
    'pos = mul(sphere, sqrt(abs(sphere)))',
    (b, s) => ({
      pos: b.mul(s, b.sqrt(b.abs(s))),
      col: b.sqrt(b.abs(s)),
    })),

  demo('normalize', 1,
    'Unit-length vector. Projects all points onto the unit sphere.',
    'pos = normalize(mul(sphere, c(1, 2, 0.5)))',
    (b, s) => ({
      pos: b.normalize(b.mul(s, b.c(1, 2, 0.5))),
      col: b.abs(b.normalize(s)),
    })),

  demo('tri_wave', 1,
    'Triangle wave: linear zigzag in [0,1]. Creates faceted, gem-like surfaces.',
    'pos = mul(sphere, tri_wave(mul(sphere, cu(4))))',
    (b, s) => ({
      pos: b.mul(s, b.tri_wave(b.mul(s, b.cu(4)))),
      col: b.tri_wave(b.mul(s, b.cu(6))),
    })),

  demo('swizzle_yzx', 1,
    'Rotates components: (x,y,z) becomes (y,z,x). A 120-degree axis permutation.',
    'pos = avg(sphere, swizzle_yzx(sphere))',
    (b, s) => ({
      pos: b.avg(s, b.swizzle_yzx(s)),
      col: b.swizzle_yzx(b.abs(s)),
    })),

  demo('swizzle_zxy', 1,
    'Rotates components: (x,y,z) becomes (z,x,y). Inverse of yzx swizzle.',
    'pos = avg(sphere, swizzle_zxy(sphere))',
    (b, s) => ({
      pos: b.avg(s, b.swizzle_zxy(s)),
      col: b.swizzle_zxy(b.abs(s)),
    })),

  demo('spherical', 1,
    'Converts (x,y,z) to (r, theta, phi). Maps Cartesian to polar angles.',
    'col = spherical(sphere)',
    (b, s) => ({
      pos: s,
      col: b.spherical(s),
    })),

  demo('hsv2rgb', 1,
    'Hue-saturation-value to RGB. Maps angular data to rainbow colors.',
    'col = hsv2rgb(add(mul(UV0, c(0.16,0,0)), c(0,0.8,0.9)))',
    (b, s) => ({
      pos: s,
      col: b.hsv2rgb(b.add(b.mul(b.UV0, b.c(0.16, 0, 0)), b.c(0, 0.8, 0.9))),
    })),

  demo('rgb2hsv', 1,
    'RGB to hue-saturation-value. Decomposes color into angular components.',
    'col = rgb2hsv(abs(sphere))',
    (b, s) => ({
      pos: s,
      col: b.rgb2hsv(b.abs(s)),
    })),

  demo('cylindrical', 1,
    'Converts (x,y,z) to (r, theta, z). Polar coordinates in the XY plane.',
    'col = cylindrical(sphere)',
    (b, s) => ({
      pos: s,
      col: b.cylindrical(s),
    })),

  demo('from_spherical', 1,
    'Converts (r, theta, phi) back to (x, y, z). Inverse of spherical.',
    'pos = from_spherical(mul(UVD, c(1, 1, 3.14)))',
    (b) => ({
      pos: b.from_spherical(b.mul(b.UVD, b.c(1, 1, Math.PI))),
      col: b.mul(b.UVD, b.c(0.16, 0.16, 0.3)),
    })),

  demo('from_cylindrical', 1,
    'Converts (r, theta, z) back to (x, y, z). Inverse of cylindrical.',
    'pos = from_cylindrical(UVD)',
    (b) => ({
      pos: b.from_cylindrical(b.UVD),
      col: b.add(b.mul(b.abs(b.from_cylindrical(b.UVD)), b.cu(0.4)), b.c(0.1, 0.2, 0.3)),
    })),

  demo('exp', 1,
    'Safe exponential (clamped input). Creates exponential growth/decay.',
    'pos = mul(sphere, exp(mul(sphere, cu(0.5))))',
    (b, s) => ({
      pos: b.mul(s, b.exp(b.mul(s, b.cu(0.5)))),
      col: b.exp(b.mul(s, b.cu(0.3))),
    })),

  demo('bw', 1,
    'Luminance (grayscale). Collapses RGB to perceptual brightness.',
    'col = bw(abs(sphere))',
    (b, s) => ({
      pos: s,
      col: b.bw(b.abs(s)),
    })),
];

// ===== BINARY (27) =====

const BINARY_DEMOS: FunctionDemo[] = [
  demo('add', 2,
    'Per-component addition. Offsets or combines shapes.',
    'pos = add(sphere, mul(sin(mul(sphere,cu(4))),cu(0.15)))',
    (b, s) => ({
      pos: b.add(s, b.mul(b.sin(b.mul(s, b.cu(4))), b.cu(0.15))),
      col: b.add(b.abs(s), b.c(0.2, 0.1, 0.3)),
    })),

  demo('sub', 2,
    'Per-component subtraction. Creates difference patterns between shapes.',
    'pos = sub(sphere, swizzle_yzx(mul(sphere,cu(0.3))))',
    (b, s) => ({
      pos: b.sub(s, b.swizzle_yzx(b.mul(s, b.cu(0.3)))),
      col: b.abs(b.sub(s, b.swizzle_yzx(s))),
    })),

  demo('mul', 2,
    'Per-component multiplication. Scales or modulates geometry.',
    'pos = mul(sphere, c(1.5, 0.5, 1.0))',
    (b, s) => ({
      pos: b.mul(s, b.c(1.5, 0.5, 1.0)),
      col: b.mul(b.abs(s), b.c(0.2, 0.8, 0.5)),
    })),

  demo('div', 2,
    'Safe per-component division. Stretches toward infinity near zero.',
    'pos = div(sphere, add(abs(swizzle_yzx(sphere)),cu(0.5)))',
    (b, s) => ({
      pos: b.div(s, b.add(b.abs(b.swizzle_yzx(s)), b.cu(0.5))),
      col: b.abs(s),
    })),

  demo('min', 2,
    'Per-component minimum. Carves away geometry, keeping the lesser value.',
    'pos = min(sphere, swizzle_yzx(sphere))',
    (b, s) => ({
      pos: b.min(s, b.swizzle_yzx(s)),
      col: b.abs(b.sub(s, b.min(s, b.swizzle_yzx(s)))),
    })),

  demo('max', 2,
    'Per-component maximum. Inflates geometry, keeping the greater value.',
    'pos = max(sphere, swizzle_yzx(sphere))',
    (b, s) => ({
      pos: b.max(s, b.swizzle_yzx(s)),
      col: b.abs(b.sub(s, b.max(s, b.swizzle_yzx(s)))),
    })),

  demo('mod', 2,
    'Safe modulo per component. Wraps values, creating repeating patterns.',
    'pos = sub(sphere, mod(sphere, cu(0.4)))',
    (b, s) => ({
      pos: b.sub(s, b.mod(s, b.cu(0.4))),
      col: b.mod(b.abs(s), b.cu(0.3)),
    })),

  demo('pow', 2,
    'Safe power per component. Sharpens (>1) or softens (<1) curvature.',
    'pos = mul(sign(sphere), pow(abs(sphere), cu(2)))',
    (b, s) => ({
      pos: b.mul(b.sign(s), b.pow(b.abs(s), b.cu(2))),
      col: b.pow(b.abs(s), b.cu(0.5)),
    })),

  demo('cross', 2,
    'Cross product. Creates perpendicular vectors, forming wing-like geometry.',
    'pos = add(mul(sphere,cu(0.6)), mul(cross(sphere,swizzle_zxy(sphere)),cu(0.6)))',
    (b, s) => ({
      pos: b.add(b.mul(s, b.cu(0.6)), b.mul(b.cross(s, b.swizzle_zxy(s)), b.cu(0.6))),
      col: b.abs(b.cross(s, b.swizzle_yzx(s))),
    })),

  demo('dot_v', 2,
    'Dot product broadcast to vec3. Measures alignment between vectors.',
    'col = sin(dot_v(sphere, c(1, 1.618, 0.618)))',
    (b, s) => ({
      pos: s,
      col: b.sin(b.dot_v(s, b.c(1, 1.618, 0.618))),
    })),

  demo('uniform_scale', 2,
    'Scales vector by another\'s x-component. Radial modulation.',
    'pos = uniform_scale(sphere, add(cu(1), sin(UV0)))',
    (b, s) => ({
      pos: b.uniform_scale(s, b.add(b.cu(1), b.sin(b.UV0))),
      col: b.sin(b.mul(b.UV0, b.cu(2))),
    })),

  demo('rotate_x', 2,
    'Rotates around the X axis. Tilts geometry in the YZ plane.',
    'pos = rotate_x(sphere, cu(0.8))',
    (b, s) => ({
      pos: b.rotate_x(s, b.cu(0.8)),
      col: b.abs(b.sub(s, b.rotate_x(s, b.cu(0.8)))),
    })),

  demo('rotate_y', 2,
    'Rotates around the Y axis. Tilts geometry in the XZ plane.',
    'pos = rotate_y(sphere, cu(0.8))',
    (b, s) => ({
      pos: b.rotate_y(s, b.cu(0.8)),
      col: b.abs(b.sub(s, b.rotate_y(s, b.cu(0.8)))),
    })),

  demo('rotate_z', 2,
    'Rotates around the Z axis. Tilts geometry in the XY plane.',
    'pos = rotate_z(sphere, cu(0.8))',
    (b, s) => ({
      pos: b.rotate_z(s, b.cu(0.8)),
      col: b.abs(b.sub(s, b.rotate_z(s, b.cu(0.8)))),
    })),

  demo('reflect', 2,
    'Reflects vector across a plane defined by its normal. Mirror symmetry.',
    'pos = avg(sphere, reflect(sphere, c(1,1,0)))',
    (b, s) => ({
      pos: b.avg(s, b.reflect(s, b.c(1, 1, 0))),
      col: b.abs(b.reflect(s, b.c(0, 1, 1))),
    })),

  demo('avg', 2,
    'Component-wise average. Smoothly blends two shapes.',
    'pos = avg(sphere, mul(swizzle_yzx(sphere), cu(1.5)))',
    (b, s) => ({
      pos: b.avg(s, b.mul(b.swizzle_yzx(s), b.cu(1.5))),
      col: b.avg(b.abs(s), b.abs(b.swizzle_yzx(s))),
    })),

  demo('noise_v', 2,
    'Hash-based pseudorandom noise. Adds fine-grained texture.',
    'pos = add(sphere, mul(noise_v(UV0, cu(1)), cu(0.15)))',
    (b, s) => ({
      pos: b.add(s, b.mul(b.noise_v(b.UV0, b.cu(1)), b.cu(0.15))),
      col: b.add(b.noise_v(b.UV0, b.cu(2)), b.cu(0.5)),
    })),

  demo('swirl', 2,
    'Twists geometry around the Z axis with radius-dependent rotation.',
    'pos = swirl(sphere, cu(2))',
    (b, s) => ({
      pos: b.swirl(s, b.cu(2)),
      col: b.abs(b.sub(s, b.swirl(s, b.cu(2)))),
    })),

  demo('simplex3d', 2,
    '3D simplex noise: smooth, gradient-based. Organic displacement.',
    'pos = add(sphere, mul(simplex3d(UVD, c(2,0.15,0)), cu(1)))',
    (b, s) => ({
      pos: b.add(s, b.simplex3d(b.UVD, b.c(2, 0.15, 0))),
      col: b.add(b.simplex3d(b.UVD, b.c(3, 0.4, 5)), b.cu(0.5)),
    })),

  demo('kaleidoscope', 2,
    'Folds XY angle into N symmetric sectors. Creates mandala patterns.',
    'pos = kaleidoscope(sphere, cu(2))',
    (b, s) => ({
      pos: b.kaleidoscope(s, b.cu(2)),
      col: b.abs(b.sub(s, b.kaleidoscope(s, b.cu(2)))),
    })),

  demo('repeat', 2,
    'Repeats space with a given period. Tiles geometry into cells.',
    'pos = add(sphere, mul(repeat(mul(UV0,cu(4)), cu(1.5)), cu(0.1)))',
    (b, s) => ({
      pos: b.add(s, b.mul(b.repeat(b.mul(b.UV0, b.cu(4)), b.cu(1.5)), b.cu(0.1))),
      col: b.add(b.abs(b.repeat(b.mul(b.UV0, b.cu(4)), b.cu(1.5))), b.cu(0.2)),
    })),

  demo('rotate_xyz', 2,
    'Sequential rotation by (X, Y, Z) Euler angles. Full 3D orientation.',
    'pos = rotate_xyz(sphere, c(0.5, 0.8, 0.3))',
    (b, s) => ({
      pos: b.rotate_xyz(s, b.c(0.5, 0.8, 0.3)),
      col: b.abs(b.sub(s, b.rotate_xyz(s, b.c(0.5, 0.8, 0.3)))),
    })),

  demo('fold', 2,
    'Folds geometry across a plane. Reflects negative half-space.',
    'pos = fold(sphere, c(1, 1, 0))',
    (b, s) => ({
      pos: b.fold(s, b.c(1, 1, 0)),
      col: b.abs(b.sub(s, b.fold(s, b.c(1, 1, 0)))),
    })),

  demo('smin', 2,
    'Smooth minimum. Blends shapes with a soft union.',
    'pos = smin(sphere, mul(swizzle_yzx(sphere), cu(1.3)))',
    (b, s) => ({
      pos: b.smin(s, b.mul(b.swizzle_yzx(s), b.cu(1.3))),
      col: b.abs(b.sub(s, b.smin(s, b.swizzle_yzx(s)))),
    })),

  demo('smax', 2,
    'Smooth maximum. Blends shapes with a soft intersection.',
    'pos = smax(sphere, mul(swizzle_yzx(sphere), cu(0.7)))',
    (b, s) => ({
      pos: b.smax(s, b.mul(b.swizzle_yzx(s), b.cu(0.7))),
      col: b.abs(b.sub(s, b.smax(s, b.swizzle_yzx(s)))),
    })),

  demo('quantize', 2,
    'Snaps values to a grid. Creates stepped, voxel-like geometry.',
    'pos = quantize(sphere, cu(5))',
    (b, s) => ({
      pos: b.quantize(s, b.cu(5)),
      col: b.abs(b.sub(s, b.quantize(s, b.cu(5)))),
    })),

  demo('pulse', 2,
    'Cosine-based pulse envelope. Creates rhythmic scaling per component.',
    'pos = mul(sphere, pulse(sphere, cu(3)))',
    (b, s) => ({
      pos: b.mul(s, b.pulse(s, b.cu(3))),
      col: b.pulse(b.abs(s), b.cu(2)),
    })),

  demo('breathe', 2,
    'Gentle sine-wave scaling. Shapes inhale/exhale when driven by time.',
    'pos = breathe(sphere, UVT)',
    (b, s) => ({
      pos: b.breathe(s, b.UVT),
      col: b.abs(s),
    })),

  demo('wave_displace', 2,
    'Traveling surface ripples. Position-dependent phase creates moving waves.',
    'pos = wave_displace(sphere, UVT)',
    (b, s) => ({
      pos: b.wave_displace(s, b.UVT),
      col: b.abs(b.sub(s, b.wave_displace(s, b.UVT))),
    })),

  demo('orbit', 2,
    'Rotates around Y by length(b)*TAU. Continuous spinning when driven by time.',
    'pos = orbit(sphere, DAT)',
    (b, s) => ({
      pos: b.orbit(s, b.DAT),
      col: b.abs(s),
    })),

  demo('hue_shift', 2,
    'Shifts RGB hue by b.x. Cycles colors when driven by time.',
    'col = hue_shift(abs(sphere), DAT)',
    (b, s) => ({
      pos: s,
      col: b.hue_shift(b.abs(s), b.DAT),
    })),
];

// ===== TERNARY (8) =====

const TERNARY_DEMOS: FunctionDemo[] = [
  demo('transform', 3,
    'Rotate by Euler angles (b) then scale by (c). Full rigid transform.',
    'pos = transform(sphere, c(0.5,0.3,0.2), c(1.2,0.8,1.0))',
    (b, s) => ({
      pos: b.transform(s, b.c(0.5, 0.3, 0.2), b.c(1.2, 0.8, 1.0)),
      col: b.abs(b.sub(s, b.transform(s, b.c(0.5, 0.3, 0.2), b.cu(1)))),
    })),

  demo('mix_v', 3,
    'Per-component linear interpolation. Blends shapes by a factor.',
    'pos = mix_v(sphere, swizzle_yzx(sphere), cu(0.5))',
    (b, s) => ({
      pos: b.mix_v(s, b.mul(b.swizzle_yzx(s), b.cu(1.5)), b.cu(0.5)),
      col: b.mix_v(b.abs(s), b.c(0.2, 0.6, 0.9), b.abs(b.swizzle_zxy(s))),
    })),

  demo('clamp_v', 3,
    'Clamps each component to [min(b,c), max(b,c)]. Constrains geometry.',
    'pos = clamp_v(sphere, cu(-0.6), cu(0.6))',
    (b, s) => ({
      pos: b.clamp_v(s, b.cu(-0.6), b.cu(0.6)),
      col: b.abs(b.sub(s, b.clamp_v(s, b.cu(-0.6), b.cu(0.6)))),
    })),

  demo('smoothstep_v', 3,
    'Smooth Hermite interpolation between edges. Soft thresholding.',
    'pos = mul(sphere, smoothstep_v(sphere, cu(-0.5), cu(0.5)))',
    (b, s) => ({
      pos: b.mul(s, b.smoothstep_v(s, b.cu(-0.5), b.cu(0.5))),
      col: b.smoothstep_v(b.abs(s), b.cu(0.1), b.cu(0.8)),
    })),

  demo('fma', 3,
    'Fused multiply-add: a*b + c. Efficient affine transformation.',
    'pos = fma(sphere, c(1,0.5,1), c(0,0.3,0))',
    (b, s) => ({
      pos: b.fma(s, b.c(1, 0.5, 1), b.c(0, 0.3, 0)),
      col: b.fma(b.abs(s), b.c(0.5, 0.8, 0.3), b.c(0.2, 0.1, 0.3)),
    })),

  demo('select', 3,
    'Per-component select: if c >= 0, use a; else use b. Binary mask.',
    'pos = select(sphere, neg(sphere), sin(mul(sphere,cu(4))))',
    (b, s) => ({
      pos: b.select(s, b.neg(s), b.sin(b.mul(s, b.cu(4)))),
      col: b.select(b.c(0.3, 0.8, 0.4), b.c(0.8, 0.2, 0.5), s),
    })),

  demo('remap', 3,
    'Remaps a from [b, c] to [0, 1]. Normalizes value ranges.',
    'pos = mul(sphere, remap(sphere, cu(-1), cu(1)))',
    (b, s) => ({
      pos: b.mul(s, b.remap(s, b.cu(-1), b.cu(1))),
      col: b.remap(s, b.cu(-1), b.cu(1)),
    })),

  demo('rot_axis', 3,
    'Rodrigues rotation: rotates a around axis b by angle c.x.',
    'pos = rot_axis(sphere, c(0,1,0), cu(0.8))',
    (b, s) => ({
      pos: b.rot_axis(s, b.c(0, 1, 0), b.cu(0.8)),
      col: b.abs(b.sub(s, b.rot_axis(s, b.c(0, 1, 0), b.cu(0.8)))),
    })),
];

export const ALL_DEMOS: FunctionDemo[] = [...UNARY_DEMOS, ...BINARY_DEMOS, ...TERNARY_DEMOS];
export { UNARY_DEMOS, BINARY_DEMOS, TERNARY_DEMOS };
