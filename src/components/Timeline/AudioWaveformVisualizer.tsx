import React, { useRef, useEffect, useState, useMemo } from 'react';
import { fetchAndExtractWaveform, generateProceduralWaveform } from '../../utils/audio';

interface AudioWaveformVisualizerProps {
  waveform?: number[];
  sourceUrl?: string;
  sourceBlob?: Blob;
  duration: number;
  trimStart?: number;
  originalDuration?: number;
  speed?: number;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
  muted?: boolean;
  color?: string;
  width: number;
  height: number;
  mode?: 'mirrored' | 'bottom' | 'envelope';
  showGainLine?: boolean;
  className?: string;
}

export const AudioWaveformVisualizer: React.FC<AudioWaveformVisualizerProps> = ({
  waveform,
  sourceUrl,
  sourceBlob,
  duration,
  trimStart = 0,
  originalDuration,
  speed = 1,
  volume = 1,
  fadeIn = 0,
  fadeOut = 0,
  muted = false,
  color,
  width,
  height,
  mode = 'mirrored',
  showGainLine = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadedWaveform, setLoadedWaveform] = useState<number[] | null>(waveform || null);

  // If waveform isn't provided directly, dynamically load/extract in background
  useEffect(() => {
    if (waveform && waveform.length > 0) {
      setLoadedWaveform(waveform);
      return;
    }

    let isMounted = true;
    if (sourceBlob || sourceUrl) {
      fetchAndExtractWaveform(sourceBlob || sourceUrl!, 160).then((peaks) => {
        if (isMounted) {
          setLoadedWaveform(peaks);
        }
      });
    } else {
      setLoadedWaveform(generateProceduralWaveform(120));
    }

    return () => {
      isMounted = false;
    };
  }, [waveform, sourceUrl, sourceBlob]);

  // Compute sliced waveform visible in current trimmed window
  const activePeaks = useMemo(() => {
    const rawPeaks = loadedWaveform || generateProceduralWaveform(80);
    if (!rawPeaks || rawPeaks.length === 0) return [];

    const origDur = Math.max(duration, originalDuration || duration);
    const startFrac = Math.max(0, Math.min(0.99, trimStart / origDur));
    const spanFrac = Math.min(1 - startFrac, Math.max(0.01, (duration * speed) / origDur));
    const endFrac = Math.min(1, startFrac + spanFrac);

    const startIndex = Math.floor(startFrac * rawPeaks.length);
    const endIndex = Math.max(startIndex + 4, Math.ceil(endFrac * rawPeaks.length));

    const sliced = rawPeaks.slice(startIndex, endIndex);
    return sliced.length > 0 ? sliced : rawPeaks;
  }, [loadedWaveform, duration, trimStart, originalDuration, speed]);

  // Draw high-resolution anti-aliased audio waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (activePeaks.length === 0) {
      ctx.restore();
      return;
    }

    const midY = height / 2;
    const effectiveVolume = muted ? 0 : Math.max(0, Math.min(2, volume));

    // Number of bars based on pixel width
    const barSpacing = 2.5; // AudioMass high density
    const numBars = Math.max(8, Math.floor(width / barSpacing));
    const step = activePeaks.length / numBars;

    // Draw background center zero-line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    const fadeInPx = duration > 0 ? (fadeIn / duration) * width : 0;
    const fadeOutPx = duration > 0 ? (fadeOut / duration) * width : 0;

    for (let i = 0; i < numBars; i++) {
      const peakIndex = Math.floor(i * step);
      const rawAmp = activePeaks[peakIndex] !== undefined ? activePeaks[peakIndex] : 0.3;

      // Apply fade in / fade out curve
      const currentX = i * barSpacing;
      let fadeMultiplier = 1;
      if (fadeInPx > 0 && currentX < fadeInPx) {
        fadeMultiplier = Math.max(0, currentX / fadeInPx);
      } else if (fadeOutPx > 0 && currentX > width - fadeOutPx) {
        fadeMultiplier = Math.max(0, (width - currentX) / fadeOutPx);
      }

      const amp = Math.min(1, rawAmp * (muted ? 0.25 : Math.min(1.4, effectiveVolume * 1.05)) * fadeMultiplier);

      const x = currentX;
      const barWidth = 1.6;

      if (mode === 'mirrored') {
        const halfBarHeight = Math.max(1, amp * (height * 0.44));
        const topY = midY - halfBarHeight;
        const bottomY = midY + halfBarHeight;
        const barH = Math.max(2, bottomY - topY);

        if (muted) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        } else if (amp > 0.88) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.95)'; // Amber peak
        } else if (color) {
          ctx.fillStyle = color;
        } else {
          const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
          grad.addColorStop(0, '#10b981'); // emerald-500
          grad.addColorStop(0.5, '#34d399'); // emerald-400
          grad.addColorStop(1, '#047857'); // emerald-700
          ctx.fillStyle = grad;
        }

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, topY, barWidth, barH, 0.6);
        } else {
          ctx.rect(x, topY, barWidth, barH);
        }
        ctx.fill();
      } else {
        const barH = Math.max(2, amp * (height * 0.88));
        const topY = height - barH;

        if (muted) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.3)';
        } else if (amp > 0.88) {
          ctx.fillStyle = '#f59e0b';
        } else if (color) {
          ctx.fillStyle = color;
        } else {
          const grad = ctx.createLinearGradient(0, topY, 0, height);
          grad.addColorStop(0, '#34d399');
          grad.addColorStop(1, '#047857');
          ctx.fillStyle = grad;
        }

        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, topY, barWidth, barH, 0.6);
        } else {
          ctx.rect(x, topY, barWidth, barH);
        }
        ctx.fill();
      }
    }

    // Draw Fade In / Out envelope overlay lines if present
    if (fadeInPx > 0 || fadeOutPx > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.7)'; // cyan-300
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      if (fadeInPx > 0) {
        ctx.moveTo(0, midY);
        ctx.lineTo(fadeInPx, 4);
      }

      if (fadeOutPx > 0) {
        ctx.moveTo(width - fadeOutPx, 4);
        ctx.lineTo(width, midY);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Optional Volume Gain Line Indicator (dashed subtle horizontal line)
    if (showGainLine && !muted && volume !== 1) {
      const gainY =
        mode === 'mirrored'
          ? midY - (volume - 1) * (height * 0.25)
          : height * (1 - Math.min(1, volume * 0.7));
      const clampedGainY = Math.max(2, Math.min(height - 2, gainY));

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)'; // amber-400
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, clampedGainY);
      ctx.lineTo(width, clampedGainY);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [activePeaks, width, height, mode, volume, fadeIn, fadeOut, muted, color, showGainLine, duration]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden pointer-events-none ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  );
};
