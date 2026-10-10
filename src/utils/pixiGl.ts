import type {
  Application,
  CanvasSource,
  Sprite,
  Texture,
  UniformGroup,
} from 'pixi.js';
import type { GpuEffectSettings } from '../types/editor';

// pixi.js is loaded lazily via dynamic import() inside initialize() so it
// stays out of the editor's first-load critical path; until the chunk and
// the WebGL app are ready, callers use the Canvas2D fallback (by design).
// The classes are destructured (not kept as a namespace object) so Rollup
// can tree-shake the async chunk down to what is actually used.
interface PixiClasses {
  Application: typeof import('pixi.js').Application;
  CanvasSource: typeof import('pixi.js').CanvasSource;
  Filter: typeof import('pixi.js').Filter;
  GlProgram: typeof import('pixi.js').GlProgram;
  Rectangle: typeof import('pixi.js').Rectangle;
  Sprite: typeof import('pixi.js').Sprite;
  Texture: typeof import('pixi.js').Texture;
  UniformGroup: typeof import('pixi.js').UniformGroup;
}
let P: PixiClasses | null = null;

/**
 * Real PixiJS / WebGL render path for GPU effect clips (gap 9.7).
 *
 * - Lazily initializes a shared Pixi Application (WebGL). Until init
 *   resolves — or if WebGL is unavailable — renderEffectViaPixi returns
 *   false and the caller falls back to the legacy Canvas2D engine.
 * - "filter" category: the full-frame scene snapshot is uploaded as a
 *   canvas texture and processed by a custom GLSL uber-shader (10 modes).
 * - "particle" category: a sprite pool driven by the same deterministic
 *   seed math as the Canvas2D implementation; matrix rain uses a glyph
 *   atlas texture. The GL canvas is composited onto the 2D context with
 *   the same blend-mode semantics as the legacy path.
 */

const MAX_PARTICLES = 500;
const MATRIX_CHARS = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';

interface Seed {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
  angle: number;
  color: number;
  chars: number[];
}

// Same deterministic LCG seeds as the Canvas2D engine.
const seeds: Seed[] = Array.from({ length: MAX_PARTICLES }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 997.33 + n * 137.17) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    x: r(1),
    y: r(2),
    size: 0.5 + r(3) * 1.5,
    speed: 0.6 + r(4) * 0.8,
    phase: r(5) * Math.PI * 2,
    angle: r(6) * Math.PI * 2,
    color: Math.floor(r(7) * 5),
    chars: Array.from({ length: 16 }, (_, k) => Math.floor(r(8 + k) * 36)),
  };
});

// PixiJS v8 default filter vertex shader (same one built-in filters use).
const FILTER_VERTEX = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

// Uber-shader: uMode selects the effect (0 glitch, 1 bloom, 2 shockwave,
// 3 rgbSplit, 4 crt, 5 vignette, 6 pixelate, 7 radialBlur, 8 neonGlow,
// 9 waterRipple). Written in the PixiJS v8 filter fragment convention:
// vTextureCoord in, finalColor out, uTexture is the input frame.
const FILTER_FRAGMENT = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uMode;
uniform float uTime;
uniform float uIntensity;
uniform float uFrequency;
uniform float uSpeed;
uniform float uProgress;
uniform vec2 uResolution;

vec4 at(vec2 p) { return texture(uTexture, clamp(p, 0.001, 0.999)); }
float hash(float n) { return fract(sin(n) * 43758.5453); }

void main()
{
    vec2 uv = vTextureCoord;
    vec4 c;

    if (uMode < 0.5) {
        // glitch: displaced horizontal slices + RGB-split bands while active
        float active = step(0.45, abs(sin(uTime * 6.0 * uSpeed * uFrequency)));
        if (active < 0.5 && uIntensity < 0.8) {
            c = at(uv);
        } else {
            float band = floor(uv.y * 40.0);
            float hit = step(0.72, hash(band * 12.7 + floor(uTime * 8.0 * uSpeed)));
            uv.x += hit * (hash(band * 3.1 + uTime) - 0.5) * 0.12 * uIntensity;
            c = at(uv);
            if (hit > 0.5) {
                c = vec4(c.r, at(uv + vec2(0.015, 0.0)).g, at(uv - vec2(0.015, 0.0)).b, c.a);
            }
        }
    } else if (uMode < 1.5) {
        // bloom: horizontal multi-tap glow added back
        c = at(uv);
        vec3 glow = vec3(0.0);
        for (int i = 1; i < 5; i++) {
            float q = float(i) * 0.008 * (0.5 + uIntensity);
            glow += at(uv + vec2(q, 0.0)).rgb + at(uv - vec2(q, 0.0)).rgb;
        }
        c.rgb += glow * 0.16 * uIntensity;
    } else if (uMode < 2.5) {
        // shockwave: expanding radial ripple driven by uProgress
        vec2 d = uv - 0.5;
        float dist = length(d);
        float wave = sin((dist - uProgress) * 35.0) * exp(-abs(dist - uProgress) * 18.0);
        c = at(uv + d * wave * 0.03 * uIntensity);
    } else if (uMode < 3.5) {
        // rgb split
        vec2 off = vec2(0.012 * uIntensity, 0.0);
        c = vec4(at(uv + off).r, at(uv).g, at(uv - off).b, at(uv).a);
    } else if (uMode < 4.5) {
        // crt: scanlines + vignette
        c = at(uv);
        c.rgb *= 0.85 + 0.15 * sin(uv.y * uResolution.y * 3.14159);
        c.rgb *= 1.0 - 0.45 * length(uv - 0.5) * (0.5 + uIntensity);
    } else if (uMode < 5.5) {
        // vignette
        c = at(uv);
        c.rgb *= 1.0 - uIntensity * smoothstep(0.25, 0.78, length(uv - 0.5));
    } else if (uMode < 6.5) {
        // pixelate
        float px = mix(3.0, 26.0, uIntensity);
        vec2 grid = uResolution / px;
        c = at((floor(uv * grid) + 0.5) / grid);
    } else if (uMode < 7.5) {
        // radial blur toward the center
        c = vec4(0.0);
        for (int i = 0; i < 8; i++) {
            float q = (float(i) - 3.5) * 0.012 * uIntensity;
            c += at(mix(uv, vec2(0.5), q));
        }
        c /= 8.0;
    } else if (uMode < 8.5) {
        // neon glow: blurred saturation-boosted overlay
        c = at(uv);
        vec3 glow = vec3(0.0);
        for (int i = 1; i < 5; i++) {
            float q = float(i) * 0.01;
            glow += at(uv + vec2(q, 0.0)).rgb + at(uv - vec2(q, 0.0)).rgb;
        }
        float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        vec3 saturated = mix(vec3(lum), c.rgb, 1.4);
        c.rgb = mix(c.rgb, saturated + glow * 0.12, uIntensity);
    } else {
        // water ripple: sinusoidal UV distortion
        vec2 ripple = vec2(
            sin(uv.y * 45.0 * uFrequency + uTime * uSpeed * 2.0),
            cos(uv.x * 38.0 * uFrequency + uTime * uSpeed * 2.0)
        ) * 0.012 * uIntensity;
        c = at(uv + ripple);
    }

    finalColor = vec4(c.rgb, c.a);
}
`;

const FILTER_MODES: Record<string, number> = {
  glitch: 0,
  bloom: 1,
  shockwave: 2,
  rgbSplit: 3,
  crt: 4,
  vignette: 5,
  pixelate: 6,
  radialBlur: 7,
  neonGlow: 8,
  waterRipple: 9,
};

let app: Application | undefined;
let initPromise: Promise<void> | undefined;
let failed = false;

let canvasSource: CanvasSource | undefined;
let sourceTexture: Texture | undefined;
let filterSprite: Sprite | undefined;
let effectUniforms: UniformGroup | undefined;

let particleTexture: Texture | undefined;
let particleSprites: Sprite[] = [];

let glyphTextures: Texture[] | undefined;
let matrixSprites: Sprite[] = [];

async function initialize(width: number, height: number): Promise<void> {
  try {
    if (!P) {
      const m = await import('pixi.js');
      P = {
        Application: m.Application,
        CanvasSource: m.CanvasSource,
        Filter: m.Filter,
        GlProgram: m.GlProgram,
        Rectangle: m.Rectangle,
        Sprite: m.Sprite,
        Texture: m.Texture,
        UniformGroup: m.UniformGroup,
      };
    }
    app = new P.Application();
    await app.init({
      width,
      height,
      backgroundAlpha: 0,
      antialias: false,
      autoStart: false,
      preference: 'webgl',
    });
  } catch {
    failed = true;
    app = undefined;
  }
}

function ensureFilterSprite(): boolean {
  if (filterSprite) return true;
  effectUniforms = new P!.UniformGroup({
    uMode: { value: 0, type: 'f32' },
    uTime: { value: 0, type: 'f32' },
    uIntensity: { value: 0, type: 'f32' },
    uFrequency: { value: 1, type: 'f32' },
    uSpeed: { value: 1, type: 'f32' },
    uProgress: { value: 0, type: 'f32' },
    uResolution: { value: [1, 1], type: 'vec2<f32>' },
  });
  const filter = new P!.Filter({
    glProgram: P!.GlProgram.from({ vertex: FILTER_VERTEX, fragment: FILTER_FRAGMENT, name: 'keyfrio-effects' }),
    resources: { effectUniforms },
  });
  canvasSource = new P!.CanvasSource({ resource: document.createElement('canvas') as any });
  sourceTexture = new P!.Texture({ source: canvasSource });
  filterSprite = new P!.Sprite(sourceTexture);
  filterSprite.filters = [filter];
  app!.stage.addChild(filterSprite);
  return true;
}

function ensureParticleTexture(): Texture {
  if (particleTexture) return particleTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'white');
  grad.addColorStop(0.25, 'rgba(255,255,255,.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  particleTexture = P!.Texture.from(c);
  return particleTexture;
}

function ensureDotSprites(n: number): void {
  while (particleSprites.length < n) {
    const s = new P!.Sprite(ensureParticleTexture());
    s.anchor.set(0.5);
    s.visible = false;
    particleSprites.push(s);
    app!.stage.addChild(s);
  }
}

const GLYPH_CELL_W = 36;
const GLYPH_CELL_H = 44;
const GLYPH_COLS = 8;

function ensureGlyphTextures(): Texture[] {
  if (glyphTextures) return glyphTextures;
  const rows = Math.ceil(MATRIX_CHARS.length / GLYPH_COLS);
  const c = document.createElement('canvas');
  c.width = GLYPH_COLS * GLYPH_CELL_W;
  c.height = rows * GLYPH_CELL_H;
  const g = c.getContext('2d')!;
  g.font = 'bold 30px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  for (let i = 0; i < MATRIX_CHARS.length; i++) {
    const x = (i % GLYPH_COLS) * GLYPH_CELL_W + GLYPH_CELL_W / 2;
    const y = Math.floor(i / GLYPH_COLS) * GLYPH_CELL_H + GLYPH_CELL_H / 2;
    g.fillText(MATRIX_CHARS[i], x, y);
  }
  const atlas = P!.Texture.from(c);
  glyphTextures = Array.from({ length: MATRIX_CHARS.length }, (_, i) => {
    return new P!.Texture({
      source: atlas.source,
      frame: new P!.Rectangle(
        (i % GLYPH_COLS) * GLYPH_CELL_W,
        Math.floor(i / GLYPH_COLS) * GLYPH_CELL_H,
        GLYPH_CELL_W,
        GLYPH_CELL_H
      ),
    });
  });
  return glyphTextures;
}

function ensureMatrixSprites(n: number): void {
  const glyphs = ensureGlyphTextures();
  while (matrixSprites.length < n) {
    const s = new P!.Sprite(glyphs[0]);
    s.anchor.set(0.5);
    s.visible = false;
    matrixSprites.push(s);
    app!.stage.addChild(s);
  }
}

function hideAllSprites(): void {
  for (const s of particleSprites) s.visible = false;
  for (const s of matrixSprites) s.visible = false;
}

function tintOf(hex: string | undefined, fallback: number): number {
  if (!hex) return fallback;
  const parsed = parseInt(hex.replace('#', ''), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function blendOperation(mode: GpuEffectSettings['blendMode']): GlobalCompositeOperation {
  switch (mode) {
    case 'add':
      return 'lighter';
    case 'screen':
      return 'screen';
    case 'overlay':
      return 'overlay';
    case 'multiply':
      return 'multiply';
    default:
      return 'source-over';
  }
}

function defaultBlendFor(type: string, mode: GpuEffectSettings['blendMode']): GlobalCompositeOperation {
  if (mode) return blendOperation(mode);
  if (type === 'goldDust' || type === 'fireSparks' || type === 'meteorShower') return 'lighter';
  if (type === 'cyberBokeh') return 'screen';
  return 'source-over';
}

function renderParticles(settings: GpuEffectSettings, t: number, w: number, h: number): GlobalCompositeOperation {
  const type = settings.particleType || 'snow';
  const intensity = (settings.intensity ?? 70) / 100;
  const speed = settings.speed ?? 1.0;
  const density = settings.density ?? 1.0;
  const sizeMult = settings.size ?? 1.0;
  const palette = [0x00f0ff, 0xff007f, 0xa855f7, 0x38bdf8, 0xfbbf24];

  if (type === 'matrixRain') {
    const glyphs = ensureGlyphTextures();
    const colWidth = 22 * sizeMult;
    const fontSize = 16 * sizeMult;
    const numCols = Math.floor((w / colWidth) * Math.min(1.2, density));
    const trail = 20;
    ensureMatrixSprites(Math.min(MAX_PARTICLES, numCols * trail));
    for (const s of particleSprites) s.visible = false;
    let k = 0;
    for (let c = 0; c < numCols && k < matrixSprites.length; c++) {
      const seed = seeds[c % MAX_PARTICLES];
      const colSpeed = (70 + seed.speed * 100) * speed;
      const headY = ((seed.y * h + t * colSpeed) % (h + 300)) - 100;
      const colX = c * colWidth + colWidth / 2;
      const trailLength = 12 + Math.floor(seed.size * 8);
      for (let row = 0; row < trailLength && k < matrixSprites.length; row++) {
        const charY = headY - row * fontSize;
        const s = matrixSprites[k++];
        if (charY < -20 || charY > h + 20) {
          s.visible = false;
          continue;
        }
        const charIdx = (seed.chars[row % seed.chars.length] + Math.floor(t * 4)) % MATRIX_CHARS.length;
        s.texture = glyphs[charIdx];
        s.visible = true;
        s.x = colX;
        s.y = charY;
        s.width = fontSize * (GLYPH_CELL_W / GLYPH_CELL_H) * 1.4;
        s.height = fontSize * 1.4;
        s.rotation = 0;
        if (row === 0) {
          s.alpha = Math.min(1, intensity * 1.2);
          s.tint = 0xffffff;
        } else {
          s.alpha = Math.max(0, Math.min(1, (1 - row / trailLength) * intensity));
          s.tint = tintOf(settings.color, 0x22c55e);
        }
      }
    }
    for (; k < matrixSprites.length; k++) matrixSprites[k].visible = false;
    return blendOperation(settings.blendMode);
  }

  for (const s of matrixSprites) s.visible = false;

  if (type === 'meteorShower') {
    const count = Math.max(4, Math.floor(12 * density * intensity));
    ensureDotSprites(count);
    const angle = (35 * Math.PI) / 180;
    const dx = -Math.cos(angle);
    const dy = Math.sin(angle);
    const rotation = Math.atan2(-dx, dy);
    for (let i = 0; i < particleSprites.length; i++) particleSprites[i].visible = i < count;
    for (let i = 0; i < count; i++) {
      const p = seeds[i];
      const s = particleSprites[i];
      const cycle = 3.0 / (p.speed * speed || 1);
      const meteorTime = (t + p.phase * 2) % cycle;
      if (meteorTime >= 1.2) {
        s.visible = false;
        continue;
      }
      const progress = meteorTime / 1.2;
      const travel = (w + h) * 0.9 * progress;
      const headX = p.x * (w * 1.4) + dx * travel;
      const headY = -50 + p.y * (h * 0.3) + dy * travel;
      const tailLen = (120 + p.size * 150) * sizeMult;
      s.visible = true;
      s.x = headX - (dx * tailLen) / 2;
      s.y = headY - (dy * tailLen) / 2;
      s.width = (2 + p.size * 2.5) * sizeMult * 2;
      s.height = tailLen;
      s.rotation = rotation;
      s.alpha = Math.max(0, Math.min(1, Math.sin(progress * Math.PI) * intensity));
      s.tint = tintOf(settings.color, 0x38bdf8);
    }
    return defaultBlendFor(type, settings.blendMode);
  }

  const baseCount =
    type === 'snow' ? 180 : type === 'goldDust' ? 140 : type === 'fireSparks' ? 160 : type === 'cyberBokeh' ? 45 : type === 'sakura' ? 90 : type === 'stars' ? 140 : 180;
  const count = Math.min(MAX_PARTICLES, Math.floor(baseCount * density * intensity));
  ensureDotSprites(count);
  for (let i = 0; i < particleSprites.length; i++) particleSprites[i].visible = i < count;

  for (let i = 0; i < count; i++) {
    const p = seeds[i];
    const s = particleSprites[i];
    // Default motion = snow (also the legacy fallback for unknown types).
    const pSpeed = (35 + p.speed * 45) * speed;
    let x = ((p.x * w + Math.sin(t * 1.5 + p.phase) * (20 + p.speed * 30)) % (w + 40)) - 20;
    let y = ((p.y * h + t * pSpeed) % (h + 40)) - 20;
    let alpha = (0.3 + p.speed * 0.6) * Math.min(1, intensity * 1.2);
    let r = (1.5 + p.size * 2.8) * sizeMult;
    let spriteW = r * 2;
    let spriteH = r * 2;
    let rotation = 0;
    let tint = tintOf(settings.color, 0xffffff);

    if (type === 'goldDust') {
      const upSpeed = (25 + p.speed * 35) * speed;
      y = h - (((p.y * h + t * upSpeed) % (h + 30)) - 15);
      x = ((p.x * w + Math.sin(t * 2 + p.phase) * 18) % (w + 30)) - 15;
      alpha = (0.2 + Math.abs(Math.sin(t * 4 + p.phase * 3)) * 0.8) * intensity;
      r = (2 + p.size * 3) * sizeMult;
      spriteW = r * 2.5;
      spriteH = r * 2.5;
      tint = tintOf(settings.color, 0xffd700);
    } else if (type === 'fireSparks') {
      const lifetime = 2.5 / (p.speed * speed || 1);
      const age = (t + p.y * lifetime) % lifetime;
      const q = age / lifetime;
      y = h - h * 0.85 * q;
      x = p.x * w + Math.sin(t * 5 + p.phase + h * 0.85 * q * 0.02) * (25 * (1 + q * 1.5));
      alpha = (1 - q) * (0.6 + p.size * 0.4) * intensity;
      r = Math.max(1, (3 - q * 2) * p.size * sizeMult);
      spriteW = r * 2;
      spriteH = r * 3.6;
      tint = settings.color
        ? tintOf(settings.color, 0xffff99)
        : q > 0.7
          ? 0xdc2626
          : q > 0.35
            ? 0xea580c
            : q > 0.15
              ? 0xfacc15
              : 0xffff99;
    } else if (type === 'cyberBokeh') {
      const bSpeed = (15 + p.speed * 20) * speed;
      y = ((p.y * h + t * bSpeed) % (h + 160)) - 80;
      x = ((p.x * w + Math.sin(t * 0.8 + p.phase) * 40) % (w + 160)) - 80;
      r = (25 + p.size * 45) * sizeMult * (1 + Math.sin(t * 1.8 + p.phase) * 0.15);
      spriteW = r * 2;
      spriteH = r * 2;
      alpha = (0.15 + p.speed * 0.3) * intensity;
      tint = settings.color ? tintOf(settings.color, palette[p.color % 5]) : palette[p.color % 5];
    } else if (type === 'sakura') {
      const sSpeed = (30 + p.speed * 35) * speed;
      y = ((p.y * h + t * sSpeed) % (h + 40)) - 20;
      x = ((p.x * w + Math.sin(t * 1.4 + p.phase) * 45 + t * 15 * speed) % (w + 40)) - 20;
      rotation = t * (1.5 + p.speed) + p.angle;
      const squish = Math.abs(Math.cos(rotation * 0.8));
      spriteW = (8 + p.size * 7) * sizeMult * (0.3 + squish * 0.7) * 2;
      spriteH = (12 + p.size * 9) * sizeMult;
      alpha = (0.5 + p.speed * 0.4) * intensity;
      tint = tintOf(settings.color, 0xf472b6);
    } else if (type === 'stars') {
      x = p.x * w;
      y = p.y * h;
      alpha = (0.3 + 0.7 * Math.abs(Math.sin(t * 2 + p.phase))) * intensity;
      r = (1 + p.size * 2) * sizeMult;
      spriteW = r * 2;
      spriteH = r * 2;
    }

    s.x = x;
    s.y = y;
    s.width = spriteW;
    s.height = spriteH;
    s.rotation = rotation;
    s.alpha = Math.max(0, Math.min(1, alpha));
    s.tint = tint;
  }
  return defaultBlendFor(type, settings.blendMode);
}

export function renderEffectViaPixi(
  ctx: CanvasRenderingContext2D,
  settings: GpuEffectSettings,
  relTime: number,
  duration: number,
  width: number,
  height: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
): boolean {
  try {
    if (failed) return false;
    if (!app) {
      if (!initPromise) initPromise = initialize(width, height);
      return false;
    }
    if (width <= 0 || height <= 0) return false;
    if (app.renderer.width !== width || app.renderer.height !== height) {
      app.renderer.resize(width, height);
    }

    let operation: GlobalCompositeOperation = 'source-over';

    if (settings.category === 'filter') {
      if (!sourceCanvas) return false;
      if (!ensureFilterSprite()) return false;
      hideAllSprites();
      filterSprite!.visible = true;
      (canvasSource as any).resource = sourceCanvas;
      canvasSource!.update();
      filterSprite!.width = width;
      filterSprite!.height = height;
      const u = effectUniforms!.uniforms as any;
      u.uMode = FILTER_MODES[settings.filterType || 'glitch'] ?? 0;
      u.uTime = relTime;
      u.uIntensity = (settings.intensity ?? 60) / 100;
      u.uFrequency = settings.frequency ?? 1;
      u.uSpeed = settings.speed ?? 1.0;
      u.uProgress = duration > 0 ? relTime / duration : 0;
      u.uResolution = [width, height];
    } else {
      if (filterSprite) filterSprite.visible = false;
      operation = renderParticles(settings, relTime, width, height);
    }

    app.renderer.render(app.stage);
    ctx.save();
    ctx.globalCompositeOperation = operation;
    ctx.drawImage(app.canvas as HTMLCanvasElement, 0, 0);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}
