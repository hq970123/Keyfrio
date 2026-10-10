import React, { useRef, useState, useMemo, memo } from 'react';
import {
  Film,
  Music,
  Type,
  Smile,
  Sparkles,
  Zap,
  Scissors,
  Copy,
  Trash2,
  Waves,
  Palette,
  Clock,
  AlertTriangle,
  Unlock,
  HardDrive,
  Link2,
  Link2Off,
} from 'lucide-react';
import { useEditorActions } from '../../context/EditorContext';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { Clip, MediaType } from '../../types/editor';
import { snapTime, formatSMPTE } from '../../utils/time';
import { AudioWaveformVisualizer } from './AudioWaveformVisualizer';

interface ClipItemProps {
  clip: Clip;
  trackId: string;
  isLocked: boolean;
}

export const ClipItem: React.FC<ClipItemProps> = memo(({ clip, trackId, isLocked }) => {
  // Reads: fine-grained Zustand subscriptions
  const zoom = useUiStore((s) => s.zoom);
  const snapping = useUiStore((s) => s.snappingEnabled);
  const toolMode = useUiStore((s) => s.toolMode);
  const rippleMode = useUiStore((s) => s.rippleMode);
  const tracks = useProjectStore((s) => s.tracks);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds);

  // Writes: stable action dispatchers
  const {
    selectClip,
    toggleClipSelection,
    updateClip,
    moveClip,
    trimClip,
    deleteClip,
    rippleDeleteClip,
    duplicateClip,
    splitClip,
    setActiveSnapGuide,
    openRelinkModal,
    unlinkClips,
    toggleLinkSelectedClips,
    separateAudioFromVideo,
  } = useEditorActions();

  const isSelected = selectedClipIds.includes(clip.id);
  const clipRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragTooltip, setDragTooltip] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [bladeHoverTime, setBladeHoverTime] = useState<number | null>(null);
  const [bladeHoverX, setBladeHoverX] = useState<number | null>(null);

  // Position & Width based on time and zoom
  const left = clip.start * zoom;
  const width = Math.max(20, clip.duration * zoom);

  // Gather all other clip boundary timestamps for magnet snapping
  const getSnapPoints = (): number[] => {
    const points: number[] = [0, currentTime];
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.id !== clip.id) {
          points.push(c.start);
          points.push(c.start + c.duration);
        }
      });
    });
    return points;
  };

  // Helper: detect which track row the cursor is currently over
  const detectTrackAtY = (clientY: number): string => {
    const trackRows = document.querySelectorAll<HTMLElement>('[data-track-id]');
    for (const row of Array.from(trackRows)) {
      const rect = row.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return row.getAttribute('data-track-id') || trackId;
      }
    }
    return trackId;
  };

  // Drag to move clip position (with cross-track dragging)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isLocked || e.button !== 0) return;
    e.stopPropagation();

    // If Blade Tool is active, click splits clip at this exact position
    if (toolMode === 'blade') {
      if (!clipRef.current) return;
      const rect = clipRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const splitTime = clip.start + clickX / zoom;
      splitClip(clip.id, splitTime);
      return;
    }

    if (e.shiftKey) {
      toggleClipSelection(clip.id);
    } else if (!isSelected) {
      selectClip(clip.id);
    }

    setIsDragging(true);
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const initialStart = clip.start;
    const snapPoints = getSnapPoints();

    let targetTrack = trackId;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPixels = moveEvent.clientX - startMouseX;
      let newStart = Math.max(0, initialStart + deltaPixels / zoom);

      if (snapping) {
        const potentialStart = newStart;
        const snappedStart = snapTime(potentialStart, snapPoints, 10 / zoom);
        if (snappedStart !== potentialStart) {
          newStart = snappedStart;
          setActiveSnapGuide({
            time: newStart,
            label: `对齐: ${formatSMPTE(newStart)}`,
            type: 'clip-start',
          });
        } else {
          setActiveSnapGuide(null);
        }
      }

      // Check vertical cross-track movement
      targetTrack = detectTrackAtY(moveEvent.clientY);

      setDragTooltip(`起点: ${formatSMPTE(newStart)} | 轨道: ${targetTrack}`);
      moveClip(clip.id, targetTrack, newStart, rippleMode);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      setDragTooltip(null);
      setActiveSnapGuide(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Left Trim (Start In-point)
  const handleResizeLeftMouseDown = (e: React.MouseEvent) => {
    if (isLocked || e.button !== 0) return;
    e.stopPropagation();
    setIsResizingLeft(true);
    const startMouseX = e.clientX;
    const initialStart = clip.start;
    const initialDuration = clip.duration;
    const initialTrimStart = clip.trimStart;
    const snapPoints = getSnapPoints();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPixels = moveEvent.clientX - startMouseX;
      let newStart = initialStart + deltaPixels / zoom;

      if (snapping) {
        newStart = snapTime(newStart, snapPoints, 8 / zoom);
      }

      const maxStart = initialStart + initialDuration - 0.2;
      newStart = Math.max(0, Math.min(newStart, maxStart));
      const deltaSec = newStart - initialStart;
      const newDuration = Math.max(0.2, initialDuration - deltaSec);
      const newTrimStart = Math.max(0, initialTrimStart + deltaSec * clip.speed);

      setDragTooltip(`片头修剪: +${deltaSec.toFixed(2)}s | 长度: ${newDuration.toFixed(2)}s`);
      trimClip(clip.id, newTrimStart, newDuration, newStart, rippleMode);
    };

    const onMouseUp = () => {
      setIsResizingLeft(false);
      setDragTooltip(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Right Trim (End Out-point)
  const handleResizeRightMouseDown = (e: React.MouseEvent) => {
    if (isLocked || e.button !== 0) return;
    e.stopPropagation();
    setIsResizingRight(true);
    const startMouseX = e.clientX;
    const initialDuration = clip.duration;
    const snapPoints = getSnapPoints();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPixels = moveEvent.clientX - startMouseX;
      let newDuration = initialDuration + deltaPixels / zoom;

      if (snapping) {
        const potentialEnd = clip.start + newDuration;
        const snappedEnd = snapTime(potentialEnd, snapPoints, 8 / zoom);
        newDuration = snappedEnd - clip.start;
      }

      newDuration = Math.max(0.2, newDuration);
      setDragTooltip(`片尾长度: ${newDuration.toFixed(2)}s`);
      trimClip(clip.id, clip.trimStart, newDuration, clip.start, rippleMode);
    };

    const onMouseUp = () => {
      setIsResizingRight(false);
      setDragTooltip(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Blade tool hover indicator
  const handleMouseMove = (e: React.MouseEvent) => {
    if (toolMode === 'blade' && !isLocked && clipRef.current) {
      const rect = clipRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const time = clip.start + clickX / zoom;
      setBladeHoverX(clickX);
      setBladeHoverTime(time);
    } else {
      if (bladeHoverTime !== null) {
        setBladeHoverTime(null);
        setBladeHoverX(null);
      }
    }
  };

  const handleMouseLeave = () => {
    if (bladeHoverTime !== null) {
      setBladeHoverTime(null);
      setBladeHoverX(null);
    }
  };

  // Right click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    selectClip(clip.id);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Filmstrip frames calculation for video tracks
  const filmstripThumbnails = useMemo(() => {
    if (clip.type !== 'video') return [];
    if (clip.thumbnails && clip.thumbnails.length > 0) return clip.thumbnails;
    if (clip.thumbnailUrl) return [clip.thumbnailUrl];
    return [];
  }, [clip.type, clip.thumbnails, clip.thumbnailUrl]);

  // Waveform bars calculation for audio tracks
  const audioBars = useMemo(() => {
    if (clip.type !== 'audio') return [];
    const count = Math.max(8, Math.min(60, Math.floor(width / 5)));
    if (clip.audioWaveform && clip.audioWaveform.length > 0) {
      const src = clip.audioWaveform;
      const step = src.length / count;
      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        const val = src[Math.floor(i * step)] || 0.4;
        result.push(val);
      }
      return result;
    }
    // Procedural fallback
    return Array.from({ length: count }).map((_, i) => 0.25 + Math.sin(i * 0.7) * 0.45 + ((i % 3) * 0.1));
  }, [clip.type, clip.audioWaveform, width]);

  // Clip color styling by type — obsidian glassy gradients
  const getClipBg = () => {
    if (clip.color) {
      return `border-[${clip.color}] bg-[#141824]`;
    }
    switch (clip.type) {
      case 'video':
        return 'bg-gradient-to-b from-[#1d2b52]/95 via-[#16213d]/95 to-[#101a30]/95 border-[#3b82f6]/45';
      case 'audio':
        return 'bg-gradient-to-b from-[#123c2e]/95 via-[#0f3226]/95 to-[#0b271e]/95 border-[#34d399]/40';
      case 'text':
        return 'bg-gradient-to-b from-[#4a3410]/95 via-[#3a2a0d]/95 to-[#2b1f0a]/95 border-[#fbbf24]/40';
      case 'sticker':
        return 'bg-gradient-to-b from-[#4d1d33]/95 via-[#3d1628]/95 to-[#2e1120]/95 border-[#fb7185]/40';
      case 'lottie':
        return 'bg-gradient-to-b from-[#35245e]/95 via-[#2a1d4d]/95 to-[#201640]/95 border-[#a78bfa]/45';
      case 'effect':
        return 'bg-gradient-to-b from-[#0f3d4d]/95 via-[#0c3240]/95 to-[#092733]/95 border-[#22d3ee]/45';
      default:
        return 'bg-[#141824] border-white/10';
    }
  };

  return (
    <>
      <div
        ref={clipRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        className={`kf-clip absolute top-1 bottom-1 border flex items-center select-none ${getClipBg()} ${
          isSelected
            ? 'selected'
            : ''
        } ${isDragging ? 'opacity-90 shadow-2xl scale-[1.01] z-30 cursor-grabbing' : 'cursor-grab'} ${
          toolMode === 'blade' ? 'cursor-crosshair' : ''
        }`}
        style={{
          left: `${left}px`,
          width: `${width}px`,
        }}
      >
        {/* Real Video Filmstrip Background */}
        {clip.type === 'video' && filmstripThumbnails.length > 0 && (
          <div className="absolute inset-0 flex overflow-hidden opacity-30 pointer-events-none">
            {filmstripThumbnails.map((thumb, idx) => (
              <img
                key={idx}
                src={thumb}
                alt=""
                className="h-full object-cover shrink-0 flex-1 min-w-[36px]"
              />
            ))}
          </div>
        )}

        {/* High-Resolution Audio Waveform Background for Audio Clips */}
        {clip.type === 'audio' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none px-1">
            <AudioWaveformVisualizer
              waveform={clip.audioWaveform}
              sourceUrl={clip.sourceUrl}
              sourceBlob={clip.sourceBlob}
              duration={clip.duration}
              trimStart={clip.trimStart}
              originalDuration={clip.originalDuration}
              speed={clip.speed}
              volume={clip.audio?.volume ?? 1}
              muted={clip.audio?.muted ?? false}
              width={Math.max(16, width - 8)}
              height={38}
              mode="mirrored"
              showGainLine={true}
            />
          </div>
        )}

        {/* Left Trim Handle */}
        {!isLocked && (
          <div
            onMouseDown={handleResizeLeftMouseDown}
            className="absolute left-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-white/20 hover:bg-white/70 cursor-ew-resize flex items-center justify-center z-20 transition-all group"
            title="拖动修剪片头 (In-point)"
          >
            <div className="w-0.5 h-3.5 bg-white/80 rounded-full" />
          </div>
        )}

        {/* Clip Content (Title, Icons, Badges) */}
        <div className="flex-1 h-full flex flex-col justify-between p-1 px-3 min-w-0 pointer-events-none z-10">
          {/* Top Row: Icon + Clip Name + Duration */}
          <div className="flex items-center justify-between gap-1 w-full">
            <div className="flex items-center gap-1.5 min-w-0">
              {clip.type === 'video' && <Film className="w-3 h-3 text-cyan-200 shrink-0" />}
              {clip.type === 'audio' && <Music className="w-3 h-3 text-emerald-300 shrink-0" />}
              {clip.type === 'text' && <Type className="w-3 h-3 text-amber-300 shrink-0" />}
              {clip.type === 'sticker' && <Smile className="w-3 h-3 text-pink-300 shrink-0" />}
              {clip.type === 'lottie' && <Sparkles className="w-3 h-3 text-purple-300 shrink-0" />}
              {clip.type === 'effect' && <Zap className="w-3 h-3 text-cyan-300 shrink-0" />}

              <span className="font-semibold text-[10px] text-white truncate drop-shadow-md">
                {clip.text ? clip.text.text : clip.name}
              </span>

              {clip.isLinked && (
                <span
                  className="flex items-center gap-0.5 bg-cyan-500/25 border border-cyan-400/50 text-cyan-300 font-semibold text-[8px] px-1 py-0.2 rounded shrink-0 shadow-xs"
                  title="音画已绑定同步编辑 (点击右键可取消绑定)"
                >
                  <Link2 className="w-2.5 h-2.5" />
                  <span>已绑定</span>
                </span>
              )}

              {clip.needsPermission && (
                <span className="flex items-center gap-0.5 bg-amber-500/90 text-black font-semibold text-[8px] px-1 py-0.2 rounded shrink-0 shadow-xs">
                  <Unlock className="w-2.5 h-2.5" />
                  <span>待授权</span>
                </span>
              )}

              {clip.isOffline && !clip.needsPermission && (
                <span className="flex items-center gap-0.5 bg-rose-600/90 text-white font-semibold text-[8px] px-1 py-0.2 rounded shrink-0 shadow-xs">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  <span>离线</span>
                </span>
              )}
            </div>

            <span className="font-mono text-[8px] text-neutral-200 bg-black/60 px-1 py-0.5 rounded shrink-0 font-medium">
              {clip.duration.toFixed(1)}s
            </span>
          </div>

          {/* Bottom Audio Info Bar if applicable */}
          {clip.type === 'audio' && (
            <div className="flex items-center justify-between text-[8px] text-emerald-300/80 font-mono">
              <span className="truncate max-w-[120px]">
                {clip.audio?.muted ? '已静音' : `音量: ${Math.round((clip.audio?.volume ?? 1) * 100)}%`}
              </span>
              {clip.speed !== 1 && <span>{clip.speed}x</span>}
            </div>
          )}

          {/* Transition Badge */}
          {clip.transition && clip.transition.type !== 'none' && (
            <div className="absolute bottom-1 right-2 flex items-center gap-0.5 bg-pink-600/90 px-1 py-0.5 rounded text-[8px] text-white font-medium shadow-sm">
              <Sparkles className="w-2.5 h-2.5" />
              <span>{clip.transition.type} ({clip.transition.duration}s)</span>
            </div>
          )}
        </div>

        {/* Right Trim Handle */}
        {!isLocked && (
          <div
            onMouseDown={handleResizeRightMouseDown}
            className="absolute right-0 top-0 bottom-0 w-2.5 hover:w-3.5 bg-white/20 hover:bg-white/70 cursor-ew-resize flex items-center justify-center z-20 transition-all group"
            title="拖动修剪片尾 (Out-point)"
          >
            <div className="w-0.5 h-3.5 bg-white/80 rounded-full" />
          </div>
        )}

        {/* Blade Tool Cutting Hover Line */}
        {toolMode === 'blade' && bladeHoverX !== null && bladeHoverTime !== null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] z-30 pointer-events-none"
            style={{ left: `${bladeHoverX}px` }}
          >
            <div className="absolute -top-4 -translate-x-1/2 bg-red-600 text-white font-mono text-[8px] px-1 py-0.2 rounded shadow">
              {formatSMPTE(bladeHoverTime)}
            </div>
          </div>
        )}
      </div>

      {/* Floating Drag / Trim Tooltip */}
      {dragTooltip && (
        <div
          className="fixed bg-cyan-500/95 text-white font-mono text-[10px] px-2 py-1 rounded shadow-2xl z-50 pointer-events-none -translate-y-8"
          style={{ left: `${left + width / 2}px` }}
        >
          {dragTooltip}
        </div>
      )}

      {/* Right Click Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed bg-[var(--kf-surface-3)] border border-[#262838] rounded-lg shadow-2xl py-1.5 z-50 text-xs w-48 kf-anim-pop-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-1 text-[9px] font-semibold text-neutral-400 uppercase truncate">
              {clip.name}
            </div>

            {(clip.isOffline || clip.needsPermission || clip.type === 'video' || clip.type === 'audio' || clip.type === 'image') && (
              <button
                onClick={() => {
                  openRelinkModal();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-amber-300 hover:text-white hover:bg-amber-600/20 flex items-center gap-2 text-[11px]"
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>重新授权 / 重新连接本地素材</span>
              </button>
            )}

            {clip.isLinked ? (
              <button
                onClick={() => {
                  unlinkClips([clip.id]);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-cyan-300 hover:text-white hover:bg-cyan-600/20 flex items-center gap-2 text-[11px]"
              >
                <Link2Off className="w-3.5 h-3.5 text-cyan-400" />
                <span>取消音画绑定 (Ctrl+L)</span>
              </button>
            ) : selectedClipIds.length >= 2 ? (
              <button
                onClick={() => {
                  toggleLinkSelectedClips();
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-cyan-300 hover:text-white hover:bg-cyan-600/20 flex items-center gap-2 text-[11px]"
              >
                <Link2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>绑定选中的音视频片段 (Ctrl+L)</span>
              </button>
            ) : clip.type === 'video' ? (
              <button
                onClick={() => {
                  separateAudioFromVideo(clip.id);
                  setContextMenu(null);
                }}
                className="w-full px-3 py-1.5 text-left text-emerald-300 hover:text-white hover:bg-emerald-600/20 flex items-center gap-2 text-[11px]"
              >
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>分离音频为独立音轨并绑定</span>
              </button>
            ) : null}

            <button
              onClick={() => {
                splitClip(clip.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-neutral-200 hover:text-white hover:bg-cyan-500/20 flex items-center gap-2 text-[11px]"
            >
              <Scissors className="w-3.5 h-3.5 text-cyan-300" />
              <span>在播放头分割 (S)</span>
            </button>

            <button
              onClick={() => {
                duplicateClip(clip.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-neutral-200 hover:text-white hover:bg-cyan-500/20 flex items-center gap-2 text-[11px]"
            >
              <Copy className="w-3.5 h-3.5 text-emerald-400" />
              <span>复制片段 (Ctrl+D)</span>
            </button>

            <button
              onClick={() => {
                updateClip(clip.id, {
                  transition: { type: 'crossDissolve', duration: 0.8 },
                });
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-neutral-200 hover:text-white hover:bg-pink-600/20 flex items-center gap-2 text-[11px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>添加交叉溶解转场</span>
            </button>

            <div className="h-px bg-[#262838] my-1" />

            <button
              onClick={() => {
                rippleDeleteClip(clip.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-2 text-[11px]"
            >
              <Waves className="w-3.5 h-3.5" />
              <span>波纹删除并闭合间隙</span>
            </button>

            <button
              onClick={() => {
                deleteClip(clip.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-1.5 text-left text-red-400 hover:text-red-300 hover:bg-red-500/20 flex items-center gap-2 text-[11px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除片段 (Del)</span>
            </button>
          </div>
        </>
      )}
    </>
  );
});
