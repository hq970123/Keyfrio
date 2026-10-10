import { GpuEffectSettings, Clip } from '../types/editor';
import { renderEffectViaPixi } from './pixiGl';

/**
 * PixiJS & WebGL Accelerated GPU Engine
 * High-performance real-time GPU Shader Filters and GPU Particle Simulators
 */

interface ParticleItem {
  seedX: number;
  seedY: number;
  seedSize: number;
  seedSpeed: number;
  seedPhase: number;
  seedAngle: number;
  colorIdx: number;
  charSeed: number[];
}

// Generate deterministic pseudo-random seeds for 1000 particles
const MAX_PARTICLES = 500;
const particleSeeds: ParticleItem[] = Array.from({ length: MAX_PARTICLES }, (_, i) => {
  // Simple deterministic LCG random generator based on index
  const pseudoRand = (offset: number) => {
    const x = Math.sin(i * 997.33 + offset * 137.17) * 43758.5453;
    return x - Math.floor(x);
  };

  return {
    seedX: pseudoRand(1),
    seedY: pseudoRand(2),
    seedSize: 0.5 + pseudoRand(3) * 1.5,
    seedSpeed: 0.6 + pseudoRand(4) * 0.8,
    seedPhase: pseudoRand(5) * Math.PI * 2,
    seedAngle: pseudoRand(6) * Math.PI * 2,
    colorIdx: Math.floor(pseudoRand(7) * 5),
    charSeed: Array.from({ length: 16 }, (_, k) => Math.floor(pseudoRand(8 + k) * 36)),
  };
});

// Matrix glyph characters
const MATRIX_CHARS = '0123456789ABCDEFｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';

/**
 * Main GPU Effect Render Dispatcher
 * Can be called during video playback, scrubbing, and final export
 */
export function renderGpuEffectOnCanvas(
  ctx: CanvasRenderingContext2D,
  effectSettings: GpuEffectSettings,
  relTime: number,
  duration: number,
  width: number,
  height: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  if (renderEffectViaPixi(ctx, effectSettings, relTime, duration, width, height, sourceCanvas)) return;

  ctx.save();

  if (effectSettings.category === 'particle') {
    renderGpuParticles(ctx, effectSettings, relTime, width, height);
  } else if (effectSettings.category === 'filter') {
    renderGpuFilter(ctx, effectSettings, relTime, duration, width, height, sourceCanvas);
  }

  ctx.restore();
}

/**
 * -------------------------------------------------------------
 * 1. GPU PARTICLE RENDERER
 * -------------------------------------------------------------
 */
function renderGpuParticles(
  ctx: CanvasRenderingContext2D,
  settings: GpuEffectSettings,
  relTime: number,
  width: number,
  height: number
) {
  const type = settings.particleType || 'snow';
  const intensity = (settings.intensity ?? 70) / 100;
  const speed = settings.speed ?? 1.0;
  const density = settings.density ?? 1.0;
  const sizeMult = settings.size ?? 1.0;
  const customColor = settings.color;

  // Set blend mode
  if (settings.blendMode) {
    if (settings.blendMode === 'add') ctx.globalCompositeOperation = 'lighter';
    else if (settings.blendMode === 'screen') ctx.globalCompositeOperation = 'screen';
    else if (settings.blendMode === 'overlay') ctx.globalCompositeOperation = 'overlay';
    else if (settings.blendMode === 'multiply') ctx.globalCompositeOperation = 'multiply';
  } else {
    // Default optimized blend mode by particle type
    if (type === 'goldDust' || type === 'fireSparks' || type === 'meteorShower') {
      ctx.globalCompositeOperation = 'lighter';
    } else if (type === 'cyberBokeh') {
      ctx.globalCompositeOperation = 'screen';
    }
  }

  switch (type) {
    case 'snow':
      renderSnow(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    case 'goldDust':
      renderGoldDust(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    case 'fireSparks':
      renderFireSparks(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    case 'cyberBokeh':
      renderCyberBokeh(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    case 'meteorShower':
      renderMeteorShower(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    case 'matrixRain':
      renderMatrixRain(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    case 'sakura':
      renderSakura(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
      break;
    default:
      renderSnow(ctx, relTime, width, height, intensity, speed, density, sizeMult, customColor);
  }
}

// 1.1 Romantic Snow
function renderSnow(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const count = Math.min(MAX_PARTICLES, Math.floor(180 * density * intensity));
  ctx.fillStyle = color || '#FFFFFF';

  for (let i = 0; i < count; i++) {
    const p = particleSeeds[i];
    const pSpeed = (35 + p.seedSpeed * 45) * speed;
    const y = ((p.seedY * h + t * pSpeed) % (h + 40)) - 20;

    // Sway horizontally with wind
    const sway = Math.sin(t * 1.5 + p.seedPhase) * (20 + p.seedSpeed * 30);
    const x = ((p.seedX * w + sway) % (w + 40)) - 20;

    const r = (1.5 + p.seedSize * 2.8) * sizeMult;
    const alpha = (0.3 + p.seedSpeed * 0.6) * Math.min(1, intensity * 1.2);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Subtle soft glow for large flakes
    if (r > 3) {
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, r * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// 1.2 Golden Stardust
function renderGoldDust(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const count = Math.min(MAX_PARTICLES, Math.floor(140 * density * intensity));
  const baseColor = color || '#ffd700';

  for (let i = 0; i < count; i++) {
    const p = particleSeeds[i];
    const pSpeed = (25 + p.seedSpeed * 35) * speed;
    // Float upwards
    const y = h - (((p.seedY * h + t * pSpeed) % (h + 30)) - 15);
    const sway = Math.sin(t * 2 + p.seedPhase) * 18;
    const x = ((p.seedX * w + sway) % (w + 30)) - 15;

    // Twinkle shimmer
    const shimmer = Math.abs(Math.sin(t * 4 + p.seedPhase * 3));
    const alpha = (0.2 + shimmer * 0.8) * intensity;
    const r = (2 + p.seedSize * 3) * sizeMult;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Outer warm gold halo
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, baseColor);
    grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Star cross sparkle on bright pulses
    if (shimmer > 0.7 && r > 2.5) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      const crossSize = r * 2;
      ctx.beginPath();
      ctx.moveTo(x - crossSize, y);
      ctx.lineTo(x + crossSize, y);
      ctx.moveTo(x, y - crossSize);
      ctx.lineTo(x, y + crossSize);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// 1.3 Fire Sparks
function renderFireSparks(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const count = Math.min(MAX_PARTICLES, Math.floor(160 * density * intensity));

  for (let i = 0; i < count; i++) {
    const p = particleSeeds[i];
    const lifetime = 2.5 / (p.seedSpeed * speed || 1);
    const particleAge = (t + p.seedY * lifetime) % lifetime;
    const lifeRatio = particleAge / lifetime; // 0 (born at bottom) to 1 (burned out at top)

    const riseDist = h * 0.85 * lifeRatio;
    const y = h - riseDist;
    const turbulence = Math.sin(t * 5 + p.seedPhase + riseDist * 0.02) * (25 * (1 + lifeRatio * 1.5));
    const x = p.seedX * w + turbulence;

    // Color transition: White-Yellow -> Bright Orange -> Deep Crimson -> Dark Ash
    let sparkColor = '#ffff99';
    if (color) {
      sparkColor = color;
    } else if (lifeRatio > 0.7) {
      sparkColor = '#dc2626'; // dark red
    } else if (lifeRatio > 0.35) {
      sparkColor = '#ea580c'; // orange
    } else if (lifeRatio > 0.15) {
      sparkColor = '#facc15'; // yellow
    }

    const alpha = (1 - lifeRatio) * (0.6 + p.seedSize * 0.4) * intensity;
    const r = Math.max(1, (3 - lifeRatio * 2) * p.seedSize * sizeMult);

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = sparkColor;

    // Draw spark with upward motion trail
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 1.8, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle halo
    if (lifeRatio < 0.5) {
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// 1.4 Cyberpunk Bokeh
function renderCyberBokeh(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const count = Math.min(MAX_PARTICLES, Math.floor(45 * density * intensity));
  const palette = ['#00f0ff', '#ff007f', '#a855f7', '#38bdf8', '#fbbf24'];

  for (let i = 0; i < count; i++) {
    const p = particleSeeds[i];
    const bokehColor = color || palette[p.colorIdx % palette.length];
    const pSpeed = (15 + p.seedSpeed * 20) * speed;

    const y = ((p.seedY * h + t * pSpeed) % (h + 160)) - 80;
    const x = ((p.seedX * w + Math.sin(t * 0.8 + p.seedPhase) * 40) % (w + 160)) - 80;

    const baseRadius = (25 + p.seedSize * 45) * sizeMult;
    const pulse = 1 + Math.sin(t * 1.8 + p.seedPhase) * 0.15;
    const r = baseRadius * pulse;
    const alpha = (0.15 + p.seedSpeed * 0.3) * intensity;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Hexagonal / Circular gradient bokeh
    const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(0.4, bokehColor);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Thin luminous edge ring
    ctx.strokeStyle = bokehColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha * 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}

// 1.5 Meteor Shower
function renderMeteorShower(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const meteorCount = Math.max(4, Math.floor(12 * density * intensity));
  const meteorAngle = (35 * Math.PI) / 180; // 35 degree slant
  const dx = -Math.cos(meteorAngle);
  const dy = Math.sin(meteorAngle);

  for (let i = 0; i < meteorCount; i++) {
    const p = particleSeeds[i];
    const cycle = 3.0 / (p.seedSpeed * speed || 1);
    const meteorTime = (t + p.seedPhase * 2) % cycle;
    const active = meteorTime < 1.2; // shooting window

    if (!active) continue;

    const progress = meteorTime / 1.2;
    const travelDist = (w + h) * 0.9 * progress;

    const startX = p.seedX * (w * 1.4);
    const startY = -50 + p.seedY * (h * 0.3);

    const headX = startX + dx * travelDist;
    const headY = startY + dy * travelDist;

    const tailLen = (120 + p.seedSize * 150) * sizeMult;
    const tailX = headX - dx * tailLen;
    const tailY = headY - dy * tailLen;

    const alpha = Math.sin(progress * Math.PI) * intensity;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

    // Luminous tail gradient
    const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.7, color || '#38bdf8');
    grad.addColorStop(1, '#ffffff');

    ctx.strokeStyle = grad;
    ctx.lineWidth = (2 + p.seedSize * 2.5) * sizeMult;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(headX, headY);
    ctx.stroke();

    // Glowing head star
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX, headY, (3 + p.seedSize * 2) * sizeMult, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// 1.6 Matrix Rain
function renderMatrixRain(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const colWidth = 22 * sizeMult;
  const numCols = Math.floor((w / colWidth) * Math.min(1.2, density));
  const fontSize = 16 * sizeMult;
  const baseColor = color || '#22c55e';

  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textAlign = 'center';

  for (let c = 0; c < numCols; c++) {
    const seed = particleSeeds[c % MAX_PARTICLES];
    const colSpeed = (70 + seed.seedSpeed * 100) * speed;
    const headY = ((seed.seedY * h + t * colSpeed) % (h + 300)) - 100;
    const colX = c * colWidth + colWidth / 2;

    const trailLength = 12 + Math.floor(seed.seedSize * 8);

    for (let row = 0; row < trailLength; row++) {
      const charY = headY - row * fontSize;
      if (charY < -20 || charY > h + 20) continue;

      const charIdx = (seed.charSeed[row % seed.charSeed.length] + Math.floor(t * 4)) % MATRIX_CHARS.length;
      const char = MATRIX_CHARS[charIdx];

      ctx.save();
      if (row === 0) {
        // Bright glowing white head
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = Math.min(1, intensity * 1.2);
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
      } else {
        const fade = (1 - row / trailLength) * intensity;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      }

      ctx.fillText(char, colX, charY);
      ctx.restore();
    }
  }
}

// 1.7 Sakura Petals
function renderSakura(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  density: number,
  sizeMult: number,
  color?: string
) {
  const count = Math.min(MAX_PARTICLES, Math.floor(90 * density * intensity));
  const petalColor = color || '#f472b6';

  for (let i = 0; i < count; i++) {
    const p = particleSeeds[i];
    const pSpeed = (30 + p.seedSpeed * 35) * speed;
    const y = ((p.seedY * h + t * pSpeed) % (h + 40)) - 20;
    const sway = Math.sin(t * 1.4 + p.seedPhase) * 45;
    const x = ((p.seedX * w + sway + t * 15 * speed) % (w + 40)) - 20;

    // Petal fluttering rotation and 3D angle
    const rot = t * (1.5 + p.seedSpeed) + p.seedAngle;
    const squish = Math.abs(Math.cos(rot * 0.8)); // simulating flipping in air
    const pw = (8 + p.seedSize * 7) * sizeMult * (0.3 + squish * 0.7);
    const ph = (12 + p.seedSize * 9) * sizeMult;
    const alpha = (0.5 + p.seedSpeed * 0.4) * intensity;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = petalColor;

    // Draw realistic petal teardrop with notch
    ctx.beginPath();
    ctx.moveTo(0, -ph / 2);
    ctx.bezierCurveTo(pw, -ph / 3, pw * 0.8, ph / 2, 0, ph / 2);
    ctx.bezierCurveTo(-pw * 0.8, ph / 2, -pw, -ph / 3, 0, -ph / 2);
    ctx.fill();

    ctx.restore();
  }
}

/**
 * -------------------------------------------------------------
 * 2. GPU SHADER FILTERS (Glitch, Bloom, Shockwave, RGB Split, CRT)
 * -------------------------------------------------------------
 */
function renderGpuFilter(
  ctx: CanvasRenderingContext2D,
  settings: GpuEffectSettings,
  relTime: number,
  duration: number,
  width: number,
  height: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  const type = settings.filterType || 'glitch';
  const intensity = (settings.intensity ?? 60) / 100;
  const speed = settings.speed ?? 1.0;
  const freq = settings.frequency ?? 1.0;

  switch (type) {
    case 'glitch':
      renderGlitchShader(ctx, relTime, width, height, intensity, speed, freq, sourceCanvas);
      break;
    case 'bloom':
      renderBloomShader(ctx, relTime, width, height, intensity, speed, settings.color, sourceCanvas);
      break;
    case 'shockwave':
      renderShockwaveShader(ctx, relTime, duration, width, height, intensity, speed, freq, sourceCanvas);
      break;
    case 'rgbSplit':
      renderRgbSplitShader(ctx, relTime, width, height, intensity, speed, sourceCanvas);
      break;
    case 'crt':
      renderCrtShader(ctx, relTime, width, height, intensity, speed, sourceCanvas);
      break;
    case 'radialBlur':
      renderRadialBlurShader(ctx, relTime, width, height, intensity, speed, sourceCanvas);
      break;
    default:
      renderGlitchShader(ctx, relTime, width, height, intensity, speed, freq, sourceCanvas);
  }
}

// 2.1 Glitch Shader
function renderGlitchShader(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  freq: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  const jitterSeed = Math.sin(t * 18 * speed * freq) * 1000;
  const isGlitching = Math.abs(Math.sin(t * 6 * speed * freq)) > 0.45;

  if (!isGlitching && intensity < 0.8) return;

  const numSlices = Math.floor(6 + intensity * 16);

  ctx.save();

  // Draw displaced slice strips
  if (sourceCanvas) {
    for (let i = 0; i < numSlices; i++) {
      const sliceY = Math.abs(Math.sin(jitterSeed + i * 43.12)) * h;
      const sliceH = (8 + Math.abs(Math.sin(i * 12.3)) * 40) * (intensity * 1.5);
      const shiftX = (Math.sin(jitterSeed + i * 19.8) - 0.5) * 60 * intensity;

      ctx.drawImage(sourceCanvas, 0, sliceY, w, sliceH, shiftX, sliceY, w, sliceH);
    }
  }

  // RGB Offset Glitch Blocks
  const shift = (4 + intensity * 18);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = `rgba(255, 0, 80, ${0.35 * intensity})`;
  for (let k = 0; k < 4; k++) {
    const gy = ((jitterSeed * 7 + k * 120) % h);
    ctx.fillRect(shift, gy, w, 6 + intensity * 8);
  }

  ctx.fillStyle = `rgba(0, 240, 255, ${0.35 * intensity})`;
  for (let k = 0; k < 4; k++) {
    const gy = ((jitterSeed * 11 + k * 90) % h);
    ctx.fillRect(-shift, gy, w, 6 + intensity * 8);
  }

  // Horizontal Noise Slices
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  for (let j = 0; j < h; j += 12) {
    if (Math.sin(j * 0.2 + t * 20) > 0.7) {
      ctx.fillRect(0, j, w, 2);
    }
  }

  ctx.restore();
}

// 2.2 Bloom & Glow Shader
function renderBloomShader(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  color?: string,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const glowColor = color || '#ff007f';
  const pulse = 1 + Math.sin(t * 3 * speed) * 0.2;
  const alpha = 0.45 * intensity * pulse;

  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  if (sourceCanvas) {
    ctx.filter = `blur(${16 * intensity}px) brightness(140%)`;
    ctx.drawImage(sourceCanvas, 0, 0, w, h);

    ctx.filter = `blur(${32 * intensity}px) brightness(180%)`;
    ctx.drawImage(sourceCanvas, 0, 0, w, h);
  }

  // Neon Ambient Glow overlay
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, glowColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.globalAlpha = alpha * 0.3;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
}

// 2.3 Shockwave / Water Ripple Shader
function renderShockwaveShader(
  ctx: CanvasRenderingContext2D,
  relTime: number,
  duration: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  freq: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  const activeCycle = (relTime * speed * freq) % Math.max(1.5, duration);
  const waveProgress = activeCycle / 1.5; // 0 to 1
  if (waveProgress > 1) return;

  const centerX = w / 2;
  const centerY = h / 2;
  const maxRadius = Math.sqrt(w * w + h * h) * 0.6;
  const currentRadius = waveProgress * maxRadius;
  const waveWidth = 40 + intensity * 60;
  const waveAlpha = (1 - waveProgress) * intensity;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Luminous shockwave refraction ring
  const ringGrad = ctx.createRadialGradient(
    centerX,
    centerY,
    Math.max(0, currentRadius - waveWidth),
    centerX,
    centerY,
    currentRadius + waveWidth
  );
  ringGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
  ringGrad.addColorStop(0.5, `rgba(59, 130, 246, ${waveAlpha * 0.6})`);
  ringGrad.addColorStop(0.8, `rgba(255, 255, 255, ${waveAlpha * 0.9})`);
  ringGrad.addColorStop(1, 'rgba(147, 197, 253, 0)');

  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, currentRadius + waveWidth, 0, Math.PI * 2);
  ctx.fill();

  // Highlight shockwave border
  ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.8})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// 2.4 RGB Split / Chromatic Aberration
function renderRgbSplitShader(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  if (!sourceCanvas) return;

  const offset = (6 + intensity * 24) * (1 + Math.sin(t * 4 * speed) * 0.3);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // Red Channel Shift
  ctx.globalAlpha = 0.6 * intensity;
  ctx.fillStyle = '#ff0055';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceCanvas, -offset, 0, w, h);

  // Cyan Channel Shift
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = '#00ffff';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceCanvas, offset, 0, w, h);

  ctx.restore();
}

// 2.5 CRT Scanlines & Retro Phosphor
function renderCrtShader(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  ctx.save();

  // Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  const scanSpacing = 4;
  for (let y = 0; y < h; y += scanSpacing) {
    ctx.fillRect(0, y, w, 1.5);
  }

  // Rolling CRT scan beam bar
  const beamY = (t * 80 * speed) % h;
  const beamGrad = ctx.createLinearGradient(0, beamY - 40, 0, beamY + 40);
  beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  beamGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.12 * intensity})`);
  beamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = beamGrad;
  ctx.fillRect(0, beamY - 40, w, 80);

  // Heavy CRT Vignette
  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(0,0,0,${0.65 * intensity})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
}

// 2.6 Radial Blur Shader
function renderRadialBlurShader(
  ctx: CanvasRenderingContext2D,
  t: number,
  w: number,
  h: number,
  intensity: number,
  speed: number,
  sourceCanvas?: HTMLCanvasElement | OffscreenCanvas
) {
  if (!sourceCanvas) return;

  const passes = 6;
  const maxScale = 1 + 0.15 * intensity;

  ctx.save();
  ctx.globalAlpha = (1 / passes) * intensity;
  ctx.globalCompositeOperation = 'lighter';

  for (let p = 1; p <= passes; p++) {
    const scale = 1 + (maxScale - 1) * (p / passes);
    const sw = w * scale;
    const sh = h * scale;
    const sx = (w - sw) / 2;
    const sy = (h - sh) / 2;

    ctx.drawImage(sourceCanvas, sx, sy, sw, sh);
  }

  ctx.restore();
}
