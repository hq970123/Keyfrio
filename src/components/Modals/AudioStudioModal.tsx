import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Scissors,
  Download,
  Sliders,
  Sparkles,
  Zap,
  Activity,
  Maximize2,
  Layers,
  FileAudio,
  Check,
  Disc,
  FastForward,
  Rewind,
  ArrowRightLeft,
  Volume1,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import {
  extractDetailedWaveform,
  AudioMassWaveformData,
  getDecodedAudioBuffer,
  audioBufferToWavBlob,
  reverseAudioBuffer,
  normalizeAudioBuffer,
  sliceAudioBuffer,
  getAudioContext,
} from '../../utils/audio';
import { formatSMPTE } from '../../utils/time';
import { AudioSettings } from '../../types/editor';

export const AudioStudioModal: React.FC = () => {
  const {
    isAudioStudioModalOpen,
    closeAudioStudio,
    audioStudioTargetClipId,
    audioStudioTargetAsset,
    project,
    updateClip,
    addMediaAsset,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Audio Data States
  const [currentBuffer, setCurrentBuffer] = useState<AudioBuffer | null>(null);
  const [waveformData, setWaveformData] = useState<AudioMassWaveformData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<AudioBuffer[]>([]);
  const [redoStack, setRedoStack] = useState<AudioBuffer[]>([]);

  // Playback & Selection States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playheadTime, setPlayheadTime] = useState<number>(0);
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'effects' | 'equalizer' | 'dynamics' | 'generator'>('effects');

  // Effect sliders
  const [gainDb, setGainDb] = useState<number>(0);
  const [fadeDuration, setFadeDuration] = useState<number>(1.5);
  const [activePreset, setActivePreset] = useState<string>('default');

  // Real-time playback timing ref
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Target clip or asset resolving
  const targetClip = useMemo(() => {
    if (!audioStudioTargetClipId) return null;
    for (const trk of project.tracks) {
      const found = trk.clips.find((c) => c.id === audioStudioTargetClipId);
      if (found) return found;
    }
    return null;
  }, [project.tracks, audioStudioTargetClipId]);

  const targetMediaSource = useMemo(() => {
    if (targetClip) {
      return targetClip.sourceBlob || targetClip.sourceUrl;
    }
    if (audioStudioTargetAsset) {
      return audioStudioTargetAsset.blob || audioStudioTargetAsset.url;
    }
    return null;
  }, [targetClip, audioStudioTargetAsset]);

  const sourceName = useMemo(() => {
    return targetClip?.name || audioStudioTargetAsset?.name || '音频工作台';
  }, [targetClip, audioStudioTargetAsset]);

  // Load Audio into Buffer & Extract Dual Peak Waveform
  useEffect(() => {
    if (!isAudioStudioModalOpen || !targetMediaSource) return;

    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const buffer = await getDecodedAudioBuffer(targetMediaSource);
        if (!buffer || !isMounted) return;

        setCurrentBuffer(buffer);
        setHistory([buffer]);
        setRedoStack([]);

        const detailed = await extractDetailedWaveform(targetMediaSource, 512);
        if (isMounted) {
          setWaveformData(detailed);
          setSelectionRange({ start: 0, end: buffer.duration });
        }
      } catch (err) {
        console.error('AudioMass Studio Load failed:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      stopAudioPlayback();
    };
  }, [isAudioStudioModalOpen, targetMediaSource]);

  // Push new AudioBuffer to Undo History
  const commitNewBuffer = useCallback(
    async (newBuf: AudioBuffer) => {
      setHistory((prev) => [...prev.slice(-15), newBuf]);
      setRedoStack([]);
      setCurrentBuffer(newBuf);

      // Re-generate high-res waveform
      const blob = audioBufferToWavBlob(newBuf);
      const detailed = await extractDetailedWaveform(blob, 512);
      setWaveformData(detailed);
    },
    []
  );

  const handleUndo = useCallback(async () => {
    if (history.length <= 1) return;
    const current = history[history.length - 1];
    const prev = history[history.length - 2];
    setRedoStack((r) => [current, ...r]);
    setHistory((h) => h.slice(0, -1));
    setCurrentBuffer(prev);

    const blob = audioBufferToWavBlob(prev);
    const detailed = await extractDetailedWaveform(blob, 512);
    setWaveformData(detailed);
  }, [history]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((r) => r.slice(1));
    setHistory((h) => [...h, next]);
    setCurrentBuffer(next);

    const blob = audioBufferToWavBlob(next);
    const detailed = await extractDetailedWaveform(blob, 512);
    setWaveformData(detailed);
  }, [redoStack]);

  // Audio Playback Engine
  const startAudioPlayback = useCallback(
    (offsetSec = 0) => {
      if (!currentBuffer) return;
      const ctx = getAudioContext();
      audioContextRef.current = ctx;

      if (audioSourceRef.current) {
        try {
          audioSourceRef.current.stop();
        } catch {}
      }

      const source = ctx.createBufferSource();
      source.buffer = currentBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      gainNodeRef.current = gainNode;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      const start = Math.max(0, Math.min(currentBuffer.duration, offsetSec));
      source.start(0, start);
      audioSourceRef.current = source;

      playbackStartTimeRef.current = ctx.currentTime;
      playbackStartOffsetRef.current = start;
      setIsPlaying(true);

      const updateLoop = () => {
        if (!ctx || ctx.state === 'closed') return;
        const elapsed = ctx.currentTime - playbackStartTimeRef.current;
        const curr = playbackStartOffsetRef.current + elapsed;

        if (curr >= currentBuffer.duration) {
          setPlayheadTime(currentBuffer.duration);
          setIsPlaying(false);
          if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
          return;
        }

        setPlayheadTime(curr);
        animFrameRef.current = requestAnimationFrame(updateLoop);
      };

      animFrameRef.current = requestAnimationFrame(updateLoop);

      source.onended = () => {
        setIsPlaying(false);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };
    },
    [currentBuffer]
  );

  const stopAudioPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch {}
      audioSourceRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsPlaying(false);
  }, []);

  const togglePlayPause = () => {
    if (isPlaying) {
      stopAudioPlayback();
    } else {
      startAudioPlayback(playheadTime >= (currentBuffer?.duration || 0) ? 0 : playheadTime);
    }
  };

  // Draw AudioMass Canvas Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || !currentBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const midY = height / 2;
    const duration = currentBuffer.duration || 1;

    // 1. Draw Background Grid & dB Guides (AudioMass Style)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    [0.15, 0.35, 0.65, 0.85].forEach((frac) => {
      const y = height * frac;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });

    // Zero-crossing center line
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // 2. Draw Waveform Positive & Negative Peaks
    const numSamples = waveformData.positivePeaks.length;
    const barWidth = Math.max(1.2, width / numSamples);

    for (let i = 0; i < numSamples; i++) {
      const x = (i / numSamples) * width;
      const posVal = waveformData.positivePeaks[i] || 0;
      const negVal = Math.abs(waveformData.negativePeaks[i] || 0);
      const rmsVal = waveformData.rms[i] || 0;

      const topH = Math.max(1, posVal * (midY * 0.95));
      const btmH = Math.max(1, negVal * (midY * 0.95));

      // Dual Gradient - AudioMass Emerald / Cyan Palette
      const topY = midY - topH;
      const bottomY = midY + btmH;

      const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
      if (posVal > 0.95) {
        grad.addColorStop(0, '#ef4444'); // Peak clip warning
        grad.addColorStop(0.5, '#f59e0b');
        grad.addColorStop(1, '#ef4444');
      } else {
        grad.addColorStop(0, '#34d399');
        grad.addColorStop(0.5, '#10b981');
        grad.addColorStop(1, '#059669');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(x, topY, barWidth - 0.5, topH + btmH);

      // RMS high-density inner core
      if (rmsVal > 0.01) {
        const rmsH = rmsVal * (midY * 0.9);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x, midY - rmsH, barWidth - 0.5, rmsH * 2);
      }
    }

    // 3. Draw Selection Highlight
    if (selectionRange && duration > 0) {
      const selStartX = (selectionRange.start / duration) * width;
      const selEndX = (selectionRange.end / duration) * width;
      const selW = Math.max(2, selEndX - selStartX);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
      ctx.fillRect(selStartX, 0, selW, height);

      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(selStartX, 0, selW, height);
    }

    // 4. Draw Playhead Indicator
    if (duration > 0) {
      const playheadX = (playheadTime / duration) * width;
      ctx.strokeStyle = '#fbbf24'; // Amber playhead
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead Top Head
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(playheadX - 5, 0);
      ctx.lineTo(playheadX + 5, 0);
      ctx.lineTo(playheadX, 8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }, [waveformData, currentBuffer, selectionRange, playheadTime]);

  // Canvas Mouse Interactions: Scrubbing and Range Selection
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentBuffer) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, clickX / rect.width));
    const timeAtClick = frac * currentBuffer.duration;

    setIsSelecting(true);
    setSelectionRange({ start: timeAtClick, end: timeAtClick });
    setPlayheadTime(timeAtClick);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !canvasRef.current || !currentBuffer || !selectionRange) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, clickX / rect.width));
    const currTime = frac * currentBuffer.duration;

    setSelectionRange({
      start: Math.min(selectionRange.start, currTime),
      end: Math.max(selectionRange.start, currTime),
    });
  };

  const handleCanvasMouseUp = () => {
    setIsSelecting(false);
  };

  // AudioMass DSP Action Implementations
  // 1. Reverse
  const handleReverse = () => {
    if (!currentBuffer) return;
    const reversed = reverseAudioBuffer(currentBuffer);
    commitNewBuffer(reversed);
  };

  // 2. Normalize to -0.1 dB
  const handleNormalize = (targetDb = -0.1) => {
    if (!currentBuffer) return;
    const normalized = normalizeAudioBuffer(currentBuffer, targetDb);
    commitNewBuffer(normalized);
  };

  // 3. Trim / Crop Selection
  const handleCropSelection = () => {
    if (!currentBuffer || !selectionRange) return;
    const { start, end } = selectionRange;
    if (end - start <= 0.05) return;
    const sliced = sliceAudioBuffer(currentBuffer, start, end);
    commitNewBuffer(sliced);
    setSelectionRange({ start: 0, end: sliced.duration });
    setPlayheadTime(0);
  };

  // 4. Silence Selection (Mute Region)
  const handleSilenceSelection = () => {
    if (!currentBuffer || !selectionRange) return;
    const { start, end } = selectionRange;
    const ctx = getAudioContext();
    const sampleRate = currentBuffer.sampleRate;
    const copy = ctx.createBuffer(currentBuffer.numberOfChannels, currentBuffer.length, sampleRate);

    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);

    for (let c = 0; c < currentBuffer.numberOfChannels; c++) {
      const src = currentBuffer.getChannelData(c);
      const dest = copy.getChannelData(c);
      for (let i = 0; i < currentBuffer.length; i++) {
        dest[i] = i >= startSample && i <= endSample ? 0 : src[i];
      }
    }
    commitNewBuffer(copy);
  };

  // 5. Gain Adjustment (+/- dB)
  const handleApplyGain = (db: number) => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const mult = Math.pow(10, db / 20);
    const copy = ctx.createBuffer(
      currentBuffer.numberOfChannels,
      currentBuffer.length,
      currentBuffer.sampleRate
    );

    for (let c = 0; c < currentBuffer.numberOfChannels; c++) {
      const src = currentBuffer.getChannelData(c);
      const dest = copy.getChannelData(c);
      for (let i = 0; i < currentBuffer.length; i++) {
        dest[i] = Math.max(-1, Math.min(1, src[i] * mult));
      }
    }
    commitNewBuffer(copy);
  };

  // 6. Fade In / Fade Out DSP
  const handleApplyFade = (type: 'in' | 'out') => {
    if (!currentBuffer) return;
    const ctx = getAudioContext();
    const sampleRate = currentBuffer.sampleRate;
    const fadeSamples = Math.floor(fadeDuration * sampleRate);
    const copy = ctx.createBuffer(currentBuffer.numberOfChannels, currentBuffer.length, sampleRate);

    for (let c = 0; c < currentBuffer.numberOfChannels; c++) {
      const src = currentBuffer.getChannelData(c);
      const dest = copy.getChannelData(c);

      for (let i = 0; i < currentBuffer.length; i++) {
        if (type === 'in' && i < fadeSamples) {
          const factor = i / fadeSamples;
          dest[i] = src[i] * factor;
        } else if (type === 'out' && i > currentBuffer.length - fadeSamples) {
          const factor = (currentBuffer.length - i) / fadeSamples;
          dest[i] = src[i] * factor;
        } else {
          dest[i] = src[i];
        }
      }
    }
    commitNewBuffer(copy);
  };

  // Apply Changes back to Project Timeline Clip or Media Asset Library
  const handleSaveToProject = () => {
    if (!currentBuffer) return;
    const finalBlob = audioBufferToWavBlob(currentBuffer);
    const blobUrl = URL.createObjectURL(finalBlob);

    if (targetClip) {
      updateClip(targetClip.id, {
        sourceBlob: finalBlob,
        sourceUrl: blobUrl,
        duration: currentBuffer.duration,
        originalDuration: currentBuffer.duration,
        trimEnd: currentBuffer.duration,
        audioWaveform: waveformData?.positivePeaks || undefined,
      });
    } else {
      addMediaAsset({
        name: `${sourceName} (已编辑).wav`,
        type: 'audio',
        url: blobUrl,
        blob: finalBlob,
        duration: currentBuffer.duration,
        size: finalBlob.size,
      });
    }

    closeAudioStudio();
  };

  // Export as Standalone WAV file
  const handleDownloadWav = () => {
    if (!currentBuffer) return;
    const finalBlob = audioBufferToWavBlob(currentBuffer);
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sourceName.replace(/\.[^/.]+$/, '')}_edited.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAudioStudioModalOpen) return null;

  return (
    <div
      id="audiomass-studio-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 kf-anim-fade-in"
    >
      <div className="relative w-full max-w-5xl h-[88vh] bg-neutral-900 border border-neutral-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-100">AudioMass 音频工作台</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  32-Bit Web Audio DSP
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md">{sourceName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              撤销 (Undo)
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-700 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              重做 (Redo)
            </button>
            <button
              onClick={handleDownloadWav}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              导出 WAV
            </button>
            <button
              onClick={handleSaveToProject}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              应用至项目
            </button>
            <button
              onClick={closeAudioStudio}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Canvas Waveform Editor Section */}
        <div className="flex-1 flex flex-col p-5 gap-3 overflow-hidden bg-neutral-950/40">
          {/* Waveform View Container */}
          <div className="relative flex-1 w-full bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-neutral-400">
                <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">正在解析双峰波形与音频采样...</span>
              </div>
            ) : (
              <>
                {/* dB Scale & Channel Specs on Top Right */}
                <div className="absolute top-2 right-3 z-10 flex items-center gap-3 text-[10px] font-mono text-neutral-400 bg-neutral-900/80 px-2.5 py-1 rounded-md border border-neutral-800 backdrop-blur-sm pointer-events-none">
                  <span>峰值: {waveformData?.peakDb.toFixed(1)} dBFS</span>
                  <span>采样率: {waveformData?.sampleRate || 44100} Hz</span>
                  <span>声道: {waveformData?.channels === 2 ? '双声道立体声' : '单声道'}</span>
                  <span>时长: {formatSMPTE(currentBuffer?.duration || 0, 30)}</span>
                </div>

                <canvas
                  ref={canvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  className="w-full h-full block cursor-crosshair select-none"
                />
              </>
            )}
          </div>

          {/* Audio Playback Controls & Time Readout */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlayPause}
                className="w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-md transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>
              <button
                onClick={() => {
                  stopAudioPlayback();
                  setPlayheadTime(0);
                }}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                title="回到开头"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Time display */}
              <div className="flex items-center gap-1.5 ml-2 font-mono text-xs text-neutral-200">
                <span className="text-emerald-400 font-semibold">{formatSMPTE(playheadTime, 30)}</span>
                <span className="text-neutral-500">/</span>
                <span className="text-neutral-400">{formatSMPTE(currentBuffer?.duration || 0, 30)}</span>
              </div>
            </div>

            {/* Selection info and quick actions */}
            <div className="flex items-center gap-2">
              {selectionRange && (
                <div className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
                  选区: {selectionRange.start.toFixed(2)}s ~ {selectionRange.end.toFixed(2)}s ({(selectionRange.end - selectionRange.start).toFixed(2)}s)
                </div>
              )}
              <button
                onClick={() => currentBuffer && setSelectionRange({ start: 0, end: currentBuffer.duration })}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
              >
                全选
              </button>
            </div>
          </div>
        </div>

        {/* Bottom AudioMass DSP Toolsets & Quick Effects */}
        <div className="h-44 border-t border-neutral-800 bg-neutral-950/80 flex flex-col">
          {/* Toolset Tabs */}
          <div className="flex items-center gap-1 px-5 pt-2.5 border-b border-neutral-800/80">
            <button
              onClick={() => setActiveTab('effects')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                activeTab === 'effects'
                  ? 'bg-neutral-900 text-emerald-400 border-t border-x border-neutral-800'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              基础修音 (Edit & Dynamics)
            </button>
            <button
              onClick={() => setActiveTab('equalizer')}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg transition-colors ${
                activeTab === 'equalizer'
                  ? 'bg-neutral-900 text-emerald-400 border-t border-x border-neutral-800'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              增益与衰减 (Gain & Fades)
            </button>
          </div>

          {/* Tab Content Panes */}
          <div className="flex-1 p-4 overflow-x-auto">
            {activeTab === 'effects' ? (
              <div className="flex items-center gap-3">
                {/* 1. Normalize */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 min-w-[150px]">
                  <span className="text-[11px] font-medium text-neutral-300">音频标准化 (Normalize)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleNormalize(-0.1)}
                      className="flex-1 px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded text-xs font-medium transition-colors"
                    >
                      -0.1 dB (满载)
                    </button>
                    <button
                      onClick={() => handleNormalize(-1.0)}
                      className="flex-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium transition-colors"
                    >
                      -1.0 dB (广播)
                    </button>
                  </div>
                </div>

                {/* 2. Reverse & Invert */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 min-w-[140px]">
                  <span className="text-[11px] font-medium text-neutral-300">倒放与剪辑 (Manipulate)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleReverse}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded text-xs font-medium transition-colors"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      倒放 (Reverse)
                    </button>
                  </div>
                </div>

                {/* 3. Crop / Silence Selection */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 min-w-[180px]">
                  <span className="text-[11px] font-medium text-neutral-300">选区处理 (Selection Ops)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCropSelection}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 rounded text-xs font-medium transition-colors"
                    >
                      <Scissors className="w-3 h-3" />
                      裁剪留选区
                    </button>
                    <button
                      onClick={handleSilenceSelection}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-medium transition-colors"
                    >
                      <VolumeX className="w-3 h-3" />
                      静音此段
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Manual Gain Sliders */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-300">增益微调 (Gain dB)</span>
                    <span className="text-[10px] font-mono text-emerald-400">{gainDb > 0 ? `+${gainDb}` : gainDb} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="0.5"
                    value={gainDb}
                    onChange={(e) => setGainDb(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <button
                    onClick={() => {
                      handleApplyGain(gainDb);
                      setGainDb(0);
                    }}
                    disabled={gainDb === 0}
                    className="w-full mt-1 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded text-xs font-medium transition-colors"
                  >
                    应用增益
                  </button>
                </div>

                {/* Fade In / Out curve generator */}
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 min-w-[240px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-neutral-300">淡入淡出 (Fade Engine)</span>
                    <span className="text-[10px] font-mono text-neutral-400">{fadeDuration} 秒</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="5.0"
                    step="0.1"
                    value={fadeDuration}
                    onChange={(e) => setFadeDuration(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleApplyFade('in')}
                      className="flex-1 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 rounded text-xs font-medium transition-colors"
                    >
                      应用淡入
                    </button>
                    <button
                      onClick={() => handleApplyFade('out')}
                      className="flex-1 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 rounded text-xs font-medium transition-colors"
                    >
                      应用淡出
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
