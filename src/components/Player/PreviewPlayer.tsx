import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Camera,
  Grid,
  Shield,
  Repeat,
  Gauge,
  ZoomIn,
  Zap,
  Activity,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { renderFrame, getMediaBaseDimensions } from '../../utils/canvasRenderer';
import { formatSMPTE, parseTimeToSeconds } from '../../utils/time';
import { ScopesPanel } from './ScopesPanel';

export const PreviewPlayer: React.FC = () => {
  const {
    project,
    currentTime,
    isPlaying,
    totalDuration,
    togglePlay,
    seek,
    stepFrame,
    selectedClipId,
    selectedClip,
    updateClip,
    showGrid,
    setShowGrid,
    showSafeMargin,
    setShowSafeMargin,
    playbackSpeed,
    setPlaybackSpeed,
    loop,
    setLoop,
  } = useEditor();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScopes, setShowScopes] = useState(false);
  const [isEditingTimecode, setIsEditingTimecode] = useState(false);
  const [timecodeInput, setTimecodeInput] = useState(formatSMPTE(currentTime));

  // Canvas interaction state (drag to move / resize / rotate selected clip directly on canvas)
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'scale' | 'rotate' | null>(null);
  const [hoverMode, setHoverMode] = useState<'move' | 'scale' | 'rotate' | null>(null);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialX: number;
    initialY: number;
    initialScale: number;
    initialRot: number;
    initialDist: number;
    centerX: number;
    centerY: number;
  }>({
    clientX: 0,
    clientY: 0,
    initialX: 0,
    initialY: 0,
    initialScale: 1,
    initialRot: 0,
    initialDist: 1,
    centerX: 0,
    centerY: 0,
  });

  // Calculate local coordinates of mouse relative to selected clip
  const getClipLocalCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      if (!selectedClip || !canvasRef.current) return null;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleCanvasX = project.resolution.width / rect.width;
      const scaleCanvasY = project.resolution.height / rect.height;

      const canvasX = (clientX - rect.left) * scaleCanvasX;
      const canvasY = (clientY - rect.top) * scaleCanvasY;

      const centerX = project.resolution.width / 2 + ((selectedClip.transform.x || 0) / 100) * project.resolution.width;
      const centerY = project.resolution.height / 2 + ((selectedClip.transform.y || 0) / 100) * project.resolution.height;

      const dx = canvasX - centerX;
      const dy = canvasY - centerY;

      const rotRad = (-((selectedClip.transform.rotation || 0) * Math.PI)) / 180;
      const s = selectedClip.transform.scale || 1;

      const rx = (dx * Math.cos(rotRad) - dy * Math.sin(rotRad)) / s;
      const ry = (dx * Math.sin(rotRad) + dy * Math.cos(rotRad)) / s;

      const { width: boxW, height: boxH } = getMediaBaseDimensions(
        selectedClip,
        project.resolution.width,
        project.resolution.height
      );

      return {
        canvasX,
        canvasY,
        centerX,
        centerY,
        dx,
        dy,
        rx,
        ry,
        boxW,
        boxH,
        scale: s,
        rect,
      };
    },
    [selectedClip, project.resolution]
  );

  // Keep timecode input synced with currentTime
  useEffect(() => {
    if (!isEditingTimecode) {
      setTimecodeInput(formatSMPTE(currentTime));
    }
  }, [currentTime, isEditingTimecode]);

  // Render canvas frame on state change, seek, or during playback animation loop
  useEffect(() => {
    let animId: number;

    const draw = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderFrame(ctx, project, currentTime, project.resolution, {
            selectedClipId,
            showGrid,
            showSafeMargin,
            isExporting: false,
          });
        }
      }

      if (isPlaying) {
        animId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [project, currentTime, isPlaying, selectedClipId, showGrid, showSafeMargin]);

  // Hit test handles and bounding box
  const hitTest = useCallback(
    (clientX: number, clientY: number): 'rotate' | 'scale' | 'move' | null => {
      const local = getClipLocalCoordinates(clientX, clientY);
      if (!local) return null;
      const { rx, ry, boxW, boxH, scale } = local;

      // Rotation pin test at top
      const pinY = -boxH / 2 - 25 / scale;
      const distPin = Math.hypot(rx, ry - pinY);
      if (distPin <= 20 / scale) {
        return 'rotate';
      }

      // 4 corners test for scaling
      const handleTolerance = 22 / scale;
      const corners = [
        [-boxW / 2, -boxH / 2],
        [boxW / 2, -boxH / 2],
        [boxW / 2, boxH / 2],
        [-boxW / 2, boxH / 2],
      ];

      for (const [cx, cy] of corners) {
        if (Math.hypot(rx - cx, ry - cy) <= handleTolerance) {
          return 'scale';
        }
      }

      // Inside bounding box for moving
      if (Math.abs(rx) <= boxW / 2 + 10 && Math.abs(ry) <= boxH / 2 + 10) {
        return 'move';
      }

      return null;
    },
    [getClipLocalCoordinates]
  );

  // Handle direct on-canvas mouse drag manipulation
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClip || !canvasRef.current) return;
    const mode = hitTest(e.clientX, e.clientY);
    if (!mode) return;

    const local = getClipLocalCoordinates(e.clientX, e.clientY);
    if (!local) return;

    setIsDraggingCanvas(true);
    setDragMode(mode);

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: selectedClip.transform.x || 0,
      initialY: selectedClip.transform.y || 0,
      initialScale: selectedClip.transform.scale || 1,
      initialRot: selectedClip.transform.rotation || 0,
      initialDist: Math.hypot(local.canvasX - local.centerX, local.canvasY - local.centerY) || 1,
      centerX: local.centerX,
      centerY: local.centerY,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!selectedClip || !canvasRef.current) return;

    if (!isDraggingCanvas) {
      const mode = hitTest(e.clientX, e.clientY);
      setHoverMode(mode);
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleCanvasX = project.resolution.width / rect.width;
    const scaleCanvasY = project.resolution.height / rect.height;

    const currentCanvasX = (e.clientX - rect.left) * scaleCanvasX;
    const currentCanvasY = (e.clientY - rect.top) * scaleCanvasY;

    if (dragMode === 'move') {
      const deltaClientX = e.clientX - dragStartRef.current.clientX;
      const deltaClientY = e.clientY - dragStartRef.current.clientY;

      const scalePercentX = (deltaClientX / rect.width) * 100;
      const scalePercentY = (deltaClientY / rect.height) * 100;

      updateClip(selectedClip.id, {
        transform: {
          ...selectedClip.transform,
          x: Math.round(dragStartRef.current.initialX + scalePercentX),
          y: Math.round(dragStartRef.current.initialY + scalePercentY),
        },
      });
    } else if (dragMode === 'scale') {
      const currentDist = Math.hypot(
        currentCanvasX - dragStartRef.current.centerX,
        currentCanvasY - dragStartRef.current.centerY
      );
      const ratio = currentDist / (dragStartRef.current.initialDist || 1);
      const newScale = Math.max(0.1, Math.min(4.0, parseFloat((dragStartRef.current.initialScale * ratio).toFixed(2))));

      updateClip(selectedClip.id, {
        transform: {
          ...selectedClip.transform,
          scale: newScale,
        },
      });
    } else if (dragMode === 'rotate') {
      const startAngle = Math.atan2(
        (dragStartRef.current.clientY - rect.top) * scaleCanvasY - dragStartRef.current.centerY,
        (dragStartRef.current.clientX - rect.left) * scaleCanvasX - dragStartRef.current.centerX
      );
      const currentAngle = Math.atan2(
        currentCanvasY - dragStartRef.current.centerY,
        currentCanvasX - dragStartRef.current.centerX
      );
      const deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
      const newRot = Math.round((dragStartRef.current.initialRot + deltaDeg) % 360);

      updateClip(selectedClip.id, {
        transform: {
          ...selectedClip.transform,
          rotation: newRot,
        },
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    setDragMode(null);
  };

  // Snapshot frame as PNG
  const handleSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `opencut_frame_${formatSMPTE(currentTime).replace(/:/g, '-')}.png`;
    a.click();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const handleTimecodeSubmit = () => {
    setIsEditingTimecode(false);
    const parsed = parseTimeToSeconds(timecodeInput, project.fps);
    seek(parsed);
  };

  return (
    <div
      ref={containerRef}
      className="kf-preview-pane flex-1 flex flex-col bg-[#15161c] border border-[#2b2d37] rounded-xl overflow-hidden select-none relative shadow-[0_18px_48px_rgba(0,0,0,0.24)]"
    >
      {/* Player Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-5 relative overflow-hidden bg-[radial-gradient(ellipse_at_center,#1c1d25_0%,#111217_72%)]">
        {/* Aspect Ratio Box Wrapper */}
        <div
          className="relative max-w-full max-h-full flex items-center justify-center rounded-md overflow-hidden border border-[#363944] bg-black shadow-[0_12px_44px_rgba(0,0,0,0.48)]"
          style={{
            aspectRatio: `${project.resolution.width} / ${project.resolution.height}`,
          }}
        >
          <canvas
            ref={canvasRef}
            width={project.resolution.width}
            height={project.resolution.height}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            className={`w-full h-full object-contain ${
              dragMode === 'rotate' || hoverMode === 'rotate'
                ? 'cursor-rotate-custom'
                : dragMode === 'scale' || hoverMode === 'scale'
                ? 'cursor-nwse-resize'
                : dragMode === 'move' || hoverMode === 'move'
                ? 'cursor-move'
                : selectedClip
                ? 'cursor-default'
                : 'cursor-default'
            }`}
          />

          {/* Quick HUD badge when hovering */}
          <div className="absolute top-2 left-2 flex items-center gap-1 pointer-events-none opacity-60 hover:opacity-100 transition-opacity">
            <span className="bg-[#101116]/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-mono text-neutral-300 border border-[#343743]">
              {project.resolution.aspectRatio} · {project.resolution.width}×{project.resolution.height}
            </span>
            <span className="bg-[#101116]/90 backdrop-blur-xs px-1.5 py-0.5 rounded text-[9px] font-mono text-neutral-400 border border-[#343743]">
              {project.fps} FPS
            </span>
          </div>

          {/* Floating Live Scopes Panel */}
          {showScopes && (
            <div className="absolute bottom-3 right-3 z-30 shadow-2xl max-w-sm w-full">
              <ScopesPanel sourceCanvasRef={canvasRef} onClose={() => setShowScopes(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Player Bottom Control Bar */}
      <div className="h-11 bg-[#17181f] border-t border-[#2a2c36] px-3 flex items-center justify-between text-xs text-neutral-300 shrink-0 select-none">
        {/* Left: Timecode / Position */}
        <div className="flex items-center gap-1.5">
          {isEditingTimecode ? (
            <input
              type="text"
              value={timecodeInput}
              autoFocus
              onChange={(e) => setTimecodeInput(e.target.value)}
              onBlur={handleTimecodeSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTimecodeSubmit()}
              className="bg-[#171822] border border-[#00c9bd] text-[#00d4c8] font-mono text-[11px] px-1.5 py-0.5 rounded outline-none w-20"
            />
          ) : (
            <button
              onClick={() => {
                setTimecodeInput(formatSMPTE(currentTime));
                setIsEditingTimecode(true);
              }}
              className="font-mono text-[11px] font-semibold text-[#00d4c8] hover:text-[#72fff5] bg-[#171822] px-1.5 py-0.5 rounded border border-[#242633] transition-colors"
              title="点击手动跳转时间码 (HH:MM:SS:FF)"
            >
              {formatSMPTE(currentTime)}
            </button>
          )}

          <span className="text-neutral-500 font-mono text-[10px]">/ {formatSMPTE(totalDuration)}</span>

          <div
            className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-500/30 rounded text-[9px] text-cyan-300 font-mono"
            title="PixiJS GPU 硬件加速引擎：就绪"
          >
            <Zap className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
            <span className="font-semibold">PixiJS GPU</span>
          </div>
        </div>

        {/* Center: Play / Pause / Step */}
        <div className="flex items-center gap-1">
          {/* Jump to start */}
          <button
            onClick={() => seek(0)}
            title="回到片头 (Home)"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#1c1d27] rounded transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Step back 1 frame */}
          <button
            onClick={() => stepFrame(-1)}
            title="上一帧 (Left Arrow)"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#1c1d27] rounded transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Primary Play/Pause Button */}
          <button
            onClick={togglePlay}
            title="播放 / 暂停 (Space)"
            className="w-7 h-7 rounded-full bg-[#00c9bd] hover:bg-[#00e0d2] text-[#081011] flex items-center justify-center shadow-[0_0_16px_rgba(0,212,200,0.24)] active:scale-95 transition-all mx-0.5 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {/* Step forward 1 frame */}
          <button
            onClick={() => stepFrame(1)}
            title="下一帧 (Right Arrow)"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#1c1d27] rounded transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Jump to end */}
          <button
            onClick={() => seek(totalDuration)}
            title="跳到片尾 (End)"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#1c1d27] rounded transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Overlays, Speed, Snapshot, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Speed Selector */}
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="bg-[#171822] border border-[#242633] text-neutral-300 text-[10px] rounded px-1.5 py-0.5 outline-none cursor-pointer"
            title="播放倍速"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1.0x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2.0x</option>
          </select>

          {/* Loop toggle */}
          <button
            onClick={() => setLoop(!loop)}
            title={loop ? '循环播放：已开启' : '循环播放：已关闭'}
            className={`p-1 rounded transition-colors ${
              loop ? 'text-[#00d4c8] bg-[#00d4c8]/10' : 'text-neutral-400 hover:text-white hover:bg-[#1c1d27]'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>

          {/* Scopes Overlay Toggle */}
          <button
            onClick={() => setShowScopes(!showScopes)}
            title="FreeCut 实时视频示波器 (波形/RGB分量/矢量图/直方图)"
            className={`p-1 rounded transition-colors ${
              showScopes ? 'text-emerald-400 bg-emerald-500/15' : 'text-neutral-400 hover:text-white hover:bg-[#1c1d27]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </button>

          {/* Grid Overlay Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            title="九宫格构图参考线"
            className={`p-1 rounded transition-colors ${
              showGrid ? 'text-[#00d4c8] bg-[#00d4c8]/10' : 'text-neutral-400 hover:text-white hover:bg-[#1c1d27]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Safe Margin Guide Toggle */}
          <button
            onClick={() => setShowSafeMargin(!showSafeMargin)}
            title="安全区参考框 (90% / 80%)"
            className={`p-1 rounded transition-colors ${
              showSafeMargin ? 'text-pink-400 bg-pink-500/15' : 'text-neutral-400 hover:text-white hover:bg-[#1c1d27]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
          </button>

          {/* Snapshot Button */}
          <button
            onClick={handleSnapshot}
            title="截图当前画幅 (PNG)"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#1c1d27] rounded transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title="全屏预览 (F)"
            className="p-1 text-neutral-400 hover:text-white hover:bg-[#1c1d27] rounded transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
