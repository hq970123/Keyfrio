import { Clip, Project, Resolution, Track } from '../types/editor';
import { drawLottieFrame } from './lottieManager';
import { renderGpuEffectOnCanvas } from './pixiEngine';
import { getOrCreateVideoElement, getOrCreateImageElement } from './mediaPlayback';
import { getClipActiveTransformAtTime, getClipActiveFilterAtTime } from './keyframeEngine';

let offscreenCaptureCanvas: HTMLCanvasElement | null = null;

export function getCachedMediaElement(clip: Clip): HTMLVideoElement | HTMLImageElement | null {
  if (clip.type === 'video') {
    return getOrCreateVideoElement(clip);
  } else if (clip.type === 'image') {
    return getOrCreateImageElement(clip);
  }
  return null;
}

/**
 * Calculate the base unscaled render dimensions (width, height) for any media clip
 * to fit proportionally inside the project canvas frame (aspect-ratio preservation).
 */
export function getMediaBaseDimensions(
  clip: Clip,
  canvasWidth: number,
  canvasHeight: number
): { width: number; height: number } {
  const clipWidth = (clip as any).width || 0;
  const clipHeight = (clip as any).height || 0;

  if (clip.type === 'video') {
    const video = getOrCreateVideoElement(clip);
    let mWidth = video && video.videoWidth > 0 ? video.videoWidth : clipWidth;
    let mHeight = video && video.videoHeight > 0 ? video.videoHeight : clipHeight;

    if (!mWidth || !mHeight) {
      const thumbUrl = clip.thumbnailUrl || (clip.thumbnails && clip.thumbnails.length > 0 ? clip.thumbnails[0] : null);
      if (thumbUrl) {
        const thumbImg = getOrCreateImageElement({ id: `thumb-${clip.id}`, sourceUrl: thumbUrl });
        if (thumbImg && thumbImg.naturalWidth > 0 && thumbImg.naturalHeight > 0) {
          mWidth = thumbImg.naturalWidth;
          mHeight = thumbImg.naturalHeight;
        }
      }
    }

    if (mWidth > 0 && mHeight > 0) {
      const mediaAspect = mWidth / mHeight;
      const canvasAspect = canvasWidth / canvasHeight;
      if (mediaAspect >= canvasAspect) {
        return {
          width: canvasWidth,
          height: canvasWidth / mediaAspect,
        };
      } else {
        return {
          width: canvasHeight * mediaAspect,
          height: canvasHeight,
        };
      }
    }
    return { width: canvasWidth, height: canvasHeight };
  }

  if (clip.type === 'image') {
    const img = getOrCreateImageElement(clip);
    let mWidth = img && img.naturalWidth > 0 ? img.naturalWidth : clipWidth;
    let mHeight = img && img.naturalHeight > 0 ? img.naturalHeight : clipHeight;

    if (mWidth > 0 && mHeight > 0) {
      const mediaAspect = mWidth / mHeight;
      const canvasAspect = canvasWidth / canvasHeight;
      if (mediaAspect >= canvasAspect) {
        return {
          width: canvasWidth,
          height: canvasWidth / mediaAspect,
        };
      } else {
        return {
          width: canvasHeight * mediaAspect,
          height: canvasHeight,
        };
      }
    }
    return { width: canvasWidth, height: canvasHeight };
  }

  if (clip.type === 'text' && clip.text) {
    const fontSize = clip.text.fontSize || 48;
    const lineHeight = clip.text.lineHeight || 1.2;
    const pad = clip.text.bgPadding || 16;
    const estCharW = fontSize * 0.6;
    const textW = (clip.text.text || '').length * estCharW;
    const textH = fontSize * lineHeight;
    return {
      width: textW + pad * 2,
      height: textH + pad * 2,
    };
  }

  if (clip.type === 'sticker') {
    return { width: 120, height: 120 };
  }

  if (clip.type === 'lottie') {
    const drawSize = Math.min(canvasWidth, canvasHeight) * 0.45;
    return { width: drawSize, height: drawSize };
  }

  return { width: canvasWidth * 0.5, height: canvasHeight * 0.4 };
}

export interface RenderOptions {
  showSafeMargin?: boolean;
  showGrid?: boolean;
  selectedClipId?: string | null;
  isExporting?: boolean;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  project: Project,
  currentTime: number,
  resolution: Resolution,
  options: RenderOptions = {}
) {
  const { width, height } = resolution;

  // 1. Clear background
  ctx.save();
  ctx.fillStyle = '#0a0b0e';
  ctx.fillRect(0, 0, width, height);

  // 2. Gather active clips at currentTime
  // Sort tracks bottom to top
  const sortedTracks = [...project.tracks].sort((a, b) => a.order - b.order);
  const activeClips: { clip: Clip; track: Track }[] = [];

  for (const track of sortedTracks) {
    if (track.isHidden || track.visible === false || track.type === 'audio') continue;
    for (const clip of track.clips) {
      if (clip.type === 'audio') continue;
      if (currentTime >= clip.start && currentTime < clip.start + clip.duration) {
        activeClips.push({ clip, track });
      }
    }
  }

  // Sort active clips by track type / zIndex
  activeClips.sort((a, b) => (a.clip.transform.zIndex || 0) - (b.clip.transform.zIndex || 0));

  // 3. Render each active clip
  for (const { clip } of activeClips) {
    ctx.save();

    const relTime = (currentTime - clip.start) * clip.speed; // time relative to clip start
    const clipRelativeSec = (currentTime - clip.start);
    const sourcePlayTime = clip.trimStart + relTime;
    const clipProgress = (currentTime - clip.start) / clip.duration;

    // Get interpolated keyframe values or fallback to static
    let activeTransform = getClipActiveTransformAtTime(clip, clipRelativeSec);
    const activeFilter = getClipActiveFilterAtTime(clip, clipRelativeSec);

    // Resolve the clip's transition phase once so preview and export share the same effect.
    let opacity = activeTransform.opacity ?? 1;
    const transition = clip.transition;
    const transitionDuration = Math.min(clip.duration / 2, Math.max(0.05, transition?.duration || 0.5));
    const entering = Boolean(transition && transition.type !== 'none' && clipRelativeSec < transitionDuration);
    const leaving = Boolean(
      transition && transition.type !== 'none' && clip.duration - clipRelativeSec <= transitionDuration
    );
    const transitionProgress = entering
      ? clamp01(clipRelativeSec / transitionDuration)
      : leaving
        ? clamp01((clip.duration - clipRelativeSec) / transitionDuration)
        : 1;

    if (transition && (entering || leaving)) {
      if (transition.type === 'crossDissolve') {
        opacity *= transitionProgress;
      } else if (transition.type === 'zoomIn') {
        activeTransform = {
          ...activeTransform,
          scale: (activeTransform.scale || 1) * (0.82 + transitionProgress * 0.18),
        };
      }

      // Wipes clip the rendered layer in canvas coordinates before the clip transform is applied.
      if (transition.type === 'wipeLeft' || transition.type === 'wipeRight' || transition.type === 'wipeUp') {
        const p = transitionProgress;
        ctx.beginPath();
        if (transition.type === 'wipeLeft') {
          ctx.rect(entering ? width * (1 - p) : 0, 0, width * p, height);
        } else if (transition.type === 'wipeRight') {
          ctx.rect(entering ? 0 : width * (1 - p), 0, width * p, height);
        } else {
          ctx.rect(0, entering ? height * (1 - p) : 0, width, height * p);
        }
        ctx.clip();
      }
    }

    // Glitch transitions add a deterministic frame shake and brief high-contrast color split feel.
    if (transition?.type === 'glitch' && (entering || leaving)) {
      const frame = Math.floor(currentTime * 24);
      const jitterX = Math.sin(frame * 91.7) * (1 - transitionProgress) * 12;
      const jitterY = Math.cos(frame * 47.3) * (1 - transitionProgress) * 4;
      ctx.translate(jitterX, jitterY);
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

    // Calculate center coordinates
    const centerX = width / 2 + (activeTransform.x / 100) * width;
    const centerY = height / 2 + (activeTransform.y / 100) * height;

    ctx.translate(centerX, centerY);
    if (activeTransform.rotation) {
      ctx.rotate((activeTransform.rotation * Math.PI) / 180);
    }
    const scale = activeTransform.scale || 1;
    const scaleX = scale * (activeTransform.flipH ? -1 : 1);
    const scaleY = scale * (activeTransform.flipV ? -1 : 1);
    ctx.scale(scaleX, scaleY);

    // Apply CSS Color Filters
    const filter = activeFilter;
    if (filter) {
      const filterParts: string[] = [];
      if (filter.brightness !== 100) filterParts.push(`brightness(${filter.brightness}%)`);
      if (filter.contrast !== 100) filterParts.push(`contrast(${filter.contrast}%)`);
      if (filter.saturate !== 100) filterParts.push(`saturate(${filter.saturate}%)`);
      if (filter.blur > 0) filterParts.push(`blur(${filter.blur}px)`);
      if (filter.hueRotate !== 0) filterParts.push(`hue-rotate(${filter.hueRotate}deg)`);
      if (filter.sepia > 0) filterParts.push(`sepia(${filter.sepia}%)`);
      if (filter.grayscale > 0) filterParts.push(`grayscale(${filter.grayscale}%)`);
      if (filterParts.length > 0) {
        ctx.filter = filterParts.join(' ');
      }
    }
    if (transition?.type === 'blur' && (entering || leaving)) {
      const blurPx = (1 - transitionProgress) * Math.min(24, Math.max(0, Math.min(width, height) / 80));
      ctx.filter = `${ctx.filter === 'none' ? '' : `${ctx.filter} `}blur(${blurPx.toFixed(2)}px)`.trim();
    }
    if (transition?.type === 'glitch' && (entering || leaving)) {
      ctx.filter = `${ctx.filter === 'none' ? '' : `${ctx.filter} `}contrast(1.25) saturate(1.4)`.trim();
    }

    // Render depending on media type
    if (clip.type === 'video') {
      const video = getOrCreateVideoElement(clip);
      let drawn = false;
      const { width: targetW, height: targetH } = getMediaBaseDimensions(clip, width, height);

      if (video) {
        // If not playing or seeking, align current video time
        if (video.paused && Math.abs(video.currentTime - sourcePlayTime) > 0.08) {
          video.currentTime = sourcePlayTime;
        }

        if (video.videoWidth > 0 && video.readyState >= 1) {
          ctx.drawImage(video, -targetW / 2, -targetH / 2, targetW, targetH);
          drawn = true;
        }
      }

      // Fallback to real extracted video filmstrip/thumbnail if video element is seeking or decoding
      if (!drawn) {
        const thumbUrl = clip.thumbnailUrl || (clip.thumbnails && clip.thumbnails.length > 0 ? clip.thumbnails[0] : null);
        if (thumbUrl) {
          const thumbImg = getOrCreateImageElement({ id: `thumb-${clip.id}`, sourceUrl: thumbUrl });
          if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
            ctx.drawImage(thumbImg, -targetW / 2, -targetH / 2, targetW, targetH);
            drawn = true;
          }
        }
      }

      // Vignette effect overlay
      if (filter && filter.vignette > 0) {
        ctx.save();
        ctx.filter = 'none';
        const vigGrad = ctx.createRadialGradient(0, 0, width * 0.3, 0, 0, width * 0.7);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${filter.vignette / 100})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
      }
    } else if (clip.type === 'image') {
      const img = getOrCreateImageElement(clip);
      let drawn = false;
      const { width: targetW, height: targetH } = getMediaBaseDimensions(clip, width, height);

      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        drawn = true;
      }

      // Vignette effect overlay
      if (filter && filter.vignette > 0) {
        ctx.save();
        ctx.filter = 'none';
        const vigGrad = ctx.createRadialGradient(0, 0, width * 0.3, 0, 0, width * 0.7);
        vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vigGrad.addColorStop(1, `rgba(0,0,0,${filter.vignette / 100})`);
        ctx.fillStyle = vigGrad;
        ctx.fillRect(-width / 2, -height / 2, width, height);
        ctx.restore();
      }
    } else if (clip.type === 'text' && clip.text) {
      const cfg = clip.text;
      let displayText = cfg.text;

      // Handle text animation (typewriter)
      if (cfg.animation === 'typewriter') {
        const charCount = Math.floor(clipProgress * cfg.text.length * 1.5);
        displayText = cfg.text.slice(0, Math.min(cfg.text.length, charCount));
      }

      ctx.font = `${cfg.fontStyle} ${cfg.fontWeight} ${cfg.fontSize}px ${cfg.fontFamily}`;
      ctx.textAlign = cfg.align || 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(displayText);
      const textW = metrics.width;
      const textH = cfg.fontSize * (cfg.lineHeight || 1.2);

      // Draw background box
      if (cfg.bgColor && cfg.bgColor !== 'transparent') {
        ctx.save();
        ctx.fillStyle = cfg.bgColor;
        const pad = cfg.bgPadding || 12;
        const rad = cfg.bgRadius || 8;
        const boxX = cfg.align === 'center' ? -textW / 2 - pad : cfg.align === 'left' ? -pad : -textW - pad;
        const boxY = -textH / 2 - pad;
        const boxW = textW + pad * 2;
        const boxH = textH + pad * 2;

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, rad);
        ctx.fill();
        ctx.restore();
      }

      // Shadow
      if (cfg.shadowColor && cfg.shadowColor !== 'transparent') {
        ctx.shadowColor = cfg.shadowColor;
        ctx.shadowBlur = cfg.shadowBlur || 8;
        ctx.shadowOffsetX = cfg.shadowOffsetX || 2;
        ctx.shadowOffsetY = cfg.shadowOffsetY || 4;
      }

      // Stroke
      if (cfg.strokeWidth > 0 && cfg.strokeColor && cfg.strokeColor !== 'transparent') {
        ctx.strokeStyle = cfg.strokeColor;
        ctx.lineWidth = cfg.strokeWidth;
        ctx.strokeText(displayText, 0, 0);
      }

      // Fill
      ctx.fillStyle = cfg.color;
      ctx.fillText(displayText, 0, 0);
    } else if (clip.type === 'sticker') {
      ctx.font = '96px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(clip.stickerEmoji || '⭐', 0, 0);
    } else if (clip.type === 'lottie') {
      const drawSize = Math.min(width, height) * 0.45;
      const success = drawLottieFrame(ctx, clip, relTime, drawSize, drawSize);
      if (!success) {
        // Fallback drawing if still initializing
        ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✨', 0, 0);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(clip.name || 'Lottie 动效', 0, 80);
      }
    } else if (clip.type === 'effect' || clip.gpuEffect) {
      const effectSettings = clip.gpuEffect || {
        category: 'particle' as const,
        particleType: 'snow' as const,
        intensity: 70,
        speed: 1.0,
      };

      // Reset transform before rendering full-canvas GPU shader / particles
      ctx.restore();
      ctx.save();

      // If shader filter requires underlying scene image, capture snapshot
      if (effectSettings.category === 'filter') {
        if (!offscreenCaptureCanvas) {
          offscreenCaptureCanvas = document.createElement('canvas');
        }
        if (offscreenCaptureCanvas.width !== width || offscreenCaptureCanvas.height !== height) {
          offscreenCaptureCanvas.width = width;
          offscreenCaptureCanvas.height = height;
        }
        const offCtx = offscreenCaptureCanvas.getContext('2d');
        if (offCtx) {
          offCtx.clearRect(0, 0, width, height);
          offCtx.drawImage(ctx.canvas, 0, 0);
        }
      }

      renderGpuEffectOnCanvas(
        ctx,
        effectSettings,
        relTime,
        clip.duration,
        width,
        height,
        offscreenCaptureCanvas || undefined
      );
    }

    if ((transition?.type === 'fadeWhite' || transition?.type === 'fadeBlack') && (entering || leaving)) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1 - transitionProgress;
      ctx.fillStyle = transition.type === 'fadeWhite' ? '#fff' : '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  // 4. Overlays (Grids & Safe margins & Selection Box) - only if not exporting
  if (!options.isExporting) {
    if (options.showGrid) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      // 3x3 Rule of thirds
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo((width / 3) * i, 0);
        ctx.lineTo((width / 3) * i, height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, (height / 3) * i);
        ctx.lineTo(width, (height / 3) * i);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (options.showSafeMargin) {
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 2;
      // 90% action safe margin
      const m90x = width * 0.05;
      const m90y = height * 0.05;
      ctx.strokeRect(m90x, m90y, width * 0.9, height * 0.9);

      // 80% title safe margin
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
      const m80x = width * 0.1;
      const m80y = height * 0.1;
      ctx.strokeRect(m80x, m80y, width * 0.8, height * 0.8);
      ctx.restore();
    }

    // 5. Draw bounding box around selected clip
    if (options.selectedClipId) {
      const sel = activeClips.find((c) => c.clip.id === options.selectedClipId);
      if (sel) {
        const { clip } = sel;
        ctx.save();
        const cX = width / 2 + (clip.transform.x / 100) * width;
        const cY = height / 2 + (clip.transform.y / 100) * height;

        ctx.translate(cX, cY);
        if (clip.transform.rotation) {
          ctx.rotate((clip.transform.rotation * Math.PI) / 180);
        }
        const s = clip.transform.scale || 1;
        ctx.scale(s, s);

        // Accurately calculated bounding box matching the rendered media
        let { width: boxW, height: boxH } = getMediaBaseDimensions(clip, width, height);
        if (clip.type === 'text' && clip.text) {
          ctx.font = `${clip.text.fontStyle} ${clip.text.fontWeight} ${clip.text.fontSize}px ${clip.text.fontFamily}`;
          const m = ctx.measureText(clip.text.text);
          const pad = clip.text.bgPadding || 16;
          const textH = clip.text.fontSize * (clip.text.lineHeight || 1.2);
          boxW = m.width + pad * 2;
          boxH = textH + pad * 2;
        } else if (clip.type === 'sticker') {
          boxW = 120;
          boxH = 120;
        } else if (clip.type === 'lottie') {
          boxW = Math.min(width, height) * 0.45;
          boxH = boxW;
        }

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5 / s;
        ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

        // 8 handles
        const handleSize = 10 / s;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / s;

        const handles = [
          [-boxW / 2, -boxH / 2],
          [0, -boxH / 2],
          [boxW / 2, -boxH / 2],
          [boxW / 2, 0],
          [boxW / 2, boxH / 2],
          [0, boxH / 2],
          [-boxW / 2, boxH / 2],
          [-boxW / 2, 0],
        ];

        for (const [hx, hy] of handles) {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        }

        // Rotation pin at top
        ctx.beginPath();
        ctx.moveTo(0, -boxH / 2);
        ctx.lineTo(0, -boxH / 2 - 25 / s);
        ctx.strokeStyle = '#3b82f6';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, -boxH / 2 - 25 / s, 6 / s, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

        ctx.restore();
      }
    }
  }

  ctx.restore();
}
