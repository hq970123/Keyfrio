import type { AnimationItem } from 'lottie-web';
import { Clip } from '../types/editor';
import { LOTTIE_PRESETS } from '../constants/lottieSamples';

// lottie-web is heavy and only needed when a lottie clip is on screen, so
// it is loaded lazily via dynamic import(). Until it arrives, entries stay
// in a pending state and drawLottieFrame returns false (placeholder path).
type LottieModule = (typeof import('lottie-web'))['default'];
let lottieModule: LottieModule | null = null;
let lottieLoadPromise: Promise<void> | null = null;

function ensureLottieLoading(): void {
  if (lottieModule || lottieLoadPromise) return;
  lottieLoadPromise = import('lottie-web')
    .then((m) => {
      lottieModule = m.default;
    })
    .catch(() => {
      // Leave lottieModule null; pending entries keep drawing placeholders.
    });
}

interface CachedLottie {
  anim: AnimationItem | null;
  container: HTMLDivElement;
  canvas: HTMLCanvasElement | null;
  totalFrames: number;
  frameRate: number;
  width: number;
  height: number;
  lastLoadedKey: string;
  isReady: boolean;
  error?: string;
  pendingLoad?: boolean;
}

const lottieCache = new Map<string, CachedLottie>();

export function getLottieKey(clip: Clip): string {
  const jsonStr = clip.lottie?.jsonData
    ? typeof clip.lottie.jsonData === 'string'
      ? clip.lottie.jsonData.slice(0, 100)
      : JSON.stringify(clip.lottie.jsonData).slice(0, 100)
    : '';
  const url = clip.lottie?.url || clip.sourceUrl || '';
  return `${clip.id}_${url}_${jsonStr}`;
}

export function getOrInitLottie(clip: Clip): CachedLottie {
  const clipId = clip.id;
  const currentKey = getLottieKey(clip);

  const existing = lottieCache.get(clipId);
  if (existing && existing.lastLoadedKey === currentKey) {
    if (existing.anim || existing.error) {
      // If canvas element was not cached yet, find it
      if (!existing.canvas && existing.container) {
        existing.canvas = existing.container.querySelector('canvas');
      }
      return existing;
    }
    // Pending entry (lottie-web chunk not loaded yet)
    if (!lottieModule) {
      ensureLottieLoading();
      return existing;
    }
    // Module has arrived: fall through and initialize this entry now.
    existing.pendingLoad = false;
  }

  // Cleanup old animation if key changed
  if (existing && existing.anim && existing.lastLoadedKey !== currentKey) {
    try {
      existing.anim.destroy();
    } catch {
      // ignore
    }
  }

  const reuseEntry =
    existing && existing.lastLoadedKey === currentKey ? existing : null;

  const container = reuseEntry
    ? reuseEntry.container
    : document.createElement('div');
  if (!reuseEntry) {
    container.style.position = 'fixed';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.width = '500px';
    container.style.height = '500px';
    container.style.opacity = '0';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const entry: CachedLottie = reuseEntry ?? {
    anim: null,
    container,
    canvas: null,
    totalFrames: 60,
    frameRate: 30,
    width: 500,
    height: 500,
    lastLoadedKey: currentKey,
    isReady: false,
  };
  lottieCache.set(clipId, entry);

  if (!lottieModule) {
    entry.pendingLoad = true;
    ensureLottieLoading();
    return entry;
  }

  let animData: object | null = null;

  // 1. Check if jsonData is provided
  if (clip.lottie?.jsonData) {
    if (typeof clip.lottie.jsonData === 'string') {
      try {
        animData = JSON.parse(clip.lottie.jsonData);
      } catch {
        entry.error = 'Invalid JSON data';
      }
    } else {
      animData = clip.lottie.jsonData;
    }
  }

  // 2. If no direct data, check preset or url
  if (!animData && (clip.lottie?.url || clip.sourceUrl)) {
    const url = clip.lottie?.url || clip.sourceUrl || '';
    // Load by URL path
    try {
      const anim = lottieModule!.loadAnimation({
        container,
        renderer: 'canvas',
        loop: false,
        autoplay: false,
        path: url,
        rendererSettings: {
          clearCanvas: true,
          progressiveLoad: false,
        },
      });

      entry.anim = anim;

      anim.addEventListener('DOMLoaded', () => {
        entry.isReady = true;
        entry.totalFrames = anim.totalFrames || 60;
        entry.frameRate = anim.frameRate || 30;
        entry.canvas = container.querySelector('canvas');
        if (entry.canvas) {
          entry.width = entry.canvas.width || 500;
          entry.height = entry.canvas.height || 500;
        }
      });

      anim.addEventListener('data_failed', () => {
        entry.error = 'Failed to load Lottie URL';
      });

      return entry;
    } catch (err: unknown) {
      entry.error = err instanceof Error ? err.message : 'Error loading Lottie';
      return entry;
    }
  }

  // 3. If still no data, fallback to first preset (Confetti)
  if (!animData) {
    const preset = LOTTIE_PRESETS.find((p) => p.id === clip.name) || LOTTIE_PRESETS[0];
    animData = preset.jsonData;
  }

  try {
    const anim = lottieModule!.loadAnimation({
      container,
      renderer: 'canvas',
      loop: false,
      autoplay: false,
      animationData: animData,
      rendererSettings: {
        clearCanvas: true,
        progressiveLoad: false,
      },
    });

    entry.anim = anim;

    anim.addEventListener('DOMLoaded', () => {
      entry.isReady = true;
      entry.totalFrames = anim.totalFrames || 60;
      entry.frameRate = anim.frameRate || 30;
      entry.canvas = container.querySelector('canvas');
      if (entry.canvas) {
        entry.width = entry.canvas.width || 500;
        entry.height = entry.canvas.height || 500;
      }
    });

    // Synchronously check canvas if ready immediately
    setTimeout(() => {
      if (!entry.canvas) {
        entry.canvas = container.querySelector('canvas');
        if (entry.canvas) {
          entry.isReady = true;
          entry.totalFrames = anim.totalFrames || 60;
          entry.frameRate = anim.frameRate || 30;
        }
      }
    }, 10);
  } catch (err: unknown) {
    entry.error = err instanceof Error ? err.message : 'Error parsing Lottie data';
  }

  return entry;
}

export function drawLottieFrame(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  relTime: number,
  targetWidth: number,
  targetHeight: number
): boolean {
  const cached = getOrInitLottie(clip);
  if (!cached.anim) return false;

  if (!cached.canvas && cached.container) {
    cached.canvas = cached.container.querySelector('canvas');
  }

  const speed = clip.lottie?.speed || clip.speed || 1;
  const loop = clip.lottie?.loop !== false; // default true
  const totalDuration = (cached.totalFrames / (cached.frameRate || 30)) || 2.0;

  let activeTime = relTime * speed;
  if (loop && totalDuration > 0) {
    activeTime = activeTime % totalDuration;
  } else if (!loop) {
    activeTime = Math.min(activeTime, totalDuration);
  }

  const direction = clip.lottie?.direction || 1;
  let targetFrame = (activeTime / (totalDuration || 1)) * cached.totalFrames;
  if (direction === -1) {
    targetFrame = cached.totalFrames - targetFrame;
  }

  targetFrame = Math.max(0, Math.min(cached.totalFrames - 0.001, targetFrame));

  try {
    cached.anim.goToAndStop(targetFrame, true);
  } catch {
    // ignore frame rendering error
  }

  if (cached.canvas && cached.canvas.width > 0 && cached.canvas.height > 0) {
    // Maintain aspect ratio
    const lottieAspect = (cached.canvas.width || 500) / (cached.canvas.height || 500);
    const drawW = targetWidth;
    const drawH = targetWidth / lottieAspect;
    ctx.drawImage(cached.canvas, -drawW / 2, -drawH / 2, drawW, drawH);
    return true;
  }

  return false;
}
