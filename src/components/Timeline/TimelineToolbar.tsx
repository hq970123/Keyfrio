import React, { useState, useMemo } from 'react';
import {
  Pointer,
  Scissors,
  Trash2,
  Copy,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Plus,
  Undo2,
  Redo2,
  Film,
  Music2,
  Waves,
  Hand,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  Link2,
  Link2Off,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { useUiStore } from '../../stores/uiStore';
import { MediaType } from '../../types/editor';

/**
 * Timeline toolbar – UI flags & selection read from Zustand;
 * complex mutations (split, delete, undo, link) still via EditorContext.
 */
export const TimelineToolbar: React.FC = () => {
  const {
    splitClip,
    deleteSelectedClips,
    duplicateClip,
    toggleLinkSelectedClips,
    setSnapping,
    setToolMode,
    setRippleMode,
    setTrackHeight,
    setInPoint,
    setOutPoint,
    setZoom,
    addTrack,
    canUndo,
    canRedo,
    undo,
    redo,
    resetProject,
  } = useEditor();

  const tracks = useProjectStore((s) => s.tracks);
  const totalDuration = useProjectStore((s) => s.totalDuration);

  const currentTime = usePlaybackStore((s) => s.currentTime);
  const inPoint = usePlaybackStore((s) => s.inPoint);
  const outPoint = usePlaybackStore((s) => s.outPoint);

  const selectedClipIds = useSelectionStore((s) => s.selectedClipIds);

  const zoom = useUiStore((s) => s.zoom);
  const toolMode = useUiStore((s) => s.toolMode);
  const snapping = useUiStore((s) => s.snappingEnabled);
  const rippleMode = useUiStore((s) => s.rippleMode);
  const trackHeight = useUiStore((s) => s.trackHeight);

  const [isTrackMenuOpen, setIsTrackMenuOpen] = useState(false);
  const [isHeightMenuOpen, setIsHeightMenuOpen] = useState(false);

  const hasSelection = selectedClipIds.length > 0;

  const isAnyClipLinked = useMemo(() => {
    return tracks.some((t) =>
      t.clips.some((c) => selectedClipIds.includes(c.id) && c.isLinked)
    );
  }, [tracks, selectedClipIds]);

  const handleZoomFit = () => {
    const targetZoom = Math.max(15, Math.min(100, 800 / (totalDuration || 16)));
    setZoom(targetZoom);
  };

  const handleCreateTrack = (type: MediaType) => {
    setIsTrackMenuOpen(false);
    addTrack(type);
  };

  return (
    <div className="h-9 bg-[#121319] border-b border-[#20222a] px-2 flex items-center justify-between text-xs text-neutral-300 select-none shrink-0 z-30">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setToolMode('select')}
          title="选择指针工具 (V)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            toolMode === 'select'
              ? 'bg-[#00c9bd] text-[#081011] shadow-[0_0_14px_rgba(0,212,200,0.18)] font-semibold'
              : 'text-neutral-400 hover:text-white hover:bg-[#1b1d27]'
          }`}
        >
          <Pointer className="w-3.5 h-3.5" />
          <span className="text-[11px]">选择 (V)</span>
        </button>

        <button
          onClick={() => setToolMode('blade')}
          title="剃刀切割工具 (C) - 移动到任意片段点击即切"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            toolMode === 'blade'
              ? 'bg-red-600 text-white shadow-sm font-medium animate-pulse'
              : 'text-neutral-400 hover:text-white hover:bg-[#1b1d27]'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
          <span className="text-[11px]">剃刀 (C)</span>
        </button>

        <button
          onClick={() => setToolMode('hand')}
          title="抓手平移工具 (H)"
          className={`p-1.5 rounded-md transition-all cursor-pointer ${
            toolMode === 'hand'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-[#1b1d27]'
          }`}
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-[#242633] mx-1" />

        <button
          onClick={() => setRippleMode(!rippleMode)}
          title={
            rippleMode
              ? '波纹编辑已开启 (B) - 删除或修剪时自动闭合间隙'
              : '波纹编辑已关闭 (B) - 点击开启波纹修剪'
          }
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            rippleMode
              ? 'bg-emerald-600/90 text-white border border-emerald-400/50 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-[#1b1d27]'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span className="text-[11px]">波纹 (B)</span>
        </button>

        <button
          onClick={() => setSnapping(!snapping)}
          title={snapping ? '自动磁吸对齐：开启 (N)' : '自动磁吸对齐：关闭 (N)'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
            snapping
              ? 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30'
              : 'text-neutral-400 hover:text-white hover:bg-[#1b1d27]'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="text-[11px]">磁吸 (N)</span>
        </button>

        <div className="h-4 w-px bg-[#242633] mx-1" />

        <button
          onClick={() => splitClip()}
          title="在播放头位置分割选中的片段 (S)"
          className="flex items-center gap-1 px-2 py-1 rounded-md text-neutral-300 hover:text-white hover:bg-[#1b1d27] active:scale-95 transition-all cursor-pointer"
        >
          <Scissors className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px]">分割 (S)</span>
        </button>

        <button
          onClick={() => duplicateClip()}
          disabled={!hasSelection}
          title="复制选中片段副本 (Ctrl+D)"
          className={`p-1.5 rounded-md transition-colors ${
            hasSelection
              ? 'text-neutral-300 hover:text-white hover:bg-[#1b1d27] cursor-pointer'
              : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => toggleLinkSelectedClips()}
          disabled={!hasSelection}
          title={
            isAnyClipLinked
              ? '取消音视频绑定 (Ctrl+L)'
              : selectedClipIds.length >= 2
              ? '绑定选中的音画片段 (Ctrl+L)'
              : '分离音频轨并绑定 (Ctrl+L)'
          }
          className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
            !hasSelection
              ? 'text-neutral-600 cursor-not-allowed'
              : isAnyClipLinked
              ? 'text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 cursor-pointer font-medium'
              : 'text-neutral-300 hover:text-white hover:bg-[#1b1d27] cursor-pointer'
          }`}
        >
          {isAnyClipLinked ? (
            <Link2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <Link2Off className="w-3.5 h-3.5 text-neutral-400" />
          )}
          <span className="text-[11px]">{isAnyClipLinked ? '已绑定' : '绑定 (L)'}</span>
        </button>

        <button
          onClick={() => deleteSelectedClips(rippleMode)}
          disabled={!hasSelection}
          title={rippleMode ? '波纹删除 (Shift+Del)' : '删除选中片段 (Del)'}
          className={`p-1.5 rounded-md transition-colors ${
            hasSelection
              ? 'text-red-400 hover:text-white hover:bg-red-600/80 cursor-pointer'
              : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="flex items-center bg-[#181a24] border border-[#242633] rounded-lg px-1.5 py-0.5 gap-1 text-[10px]">
          <button
            onClick={() => setInPoint(currentTime)}
            title="设为工作区入点 (I)"
            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              inPoint !== null ? 'text-[#00d4c8] font-bold bg-[#00d4c8]/10' : 'text-neutral-400 hover:text-white'
            }`}
          >
            [ In
          </button>
          <button
            onClick={() => setOutPoint(currentTime)}
            title="设为工作区出点 (O)"
            className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              outPoint !== null ? 'text-[#00d4c8] font-bold bg-[#00d4c8]/10' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Out ]
          </button>
          {(inPoint !== null || outPoint !== null) && (
            <button
              onClick={() => {
                setInPoint(null);
                setOutPoint(null);
              }}
              title="清除出入点 (Alt+X)"
              className="px-1 text-red-400 hover:text-red-300 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setIsTrackMenuOpen(!isTrackMenuOpen)}
            className="flex items-center gap-1 bg-[#181a24] hover:bg-[#202330] border border-[#262838] hover:border-[#00d4c8]/50 text-neutral-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#00d4c8]" />
            <span className="text-[11px] font-medium">添加轨道</span>
          </button>

          {isTrackMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTrackMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 w-48 bg-[#181a24] border border-[#2a2d3d] rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-in fade-in">
                <div className="px-3 py-1 text-[9px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-neutral-400" />
                  <span>选择轨道类型</span>
                </div>
                <button
                  onClick={() => handleCreateTrack('video')}
                  className="w-full px-3 py-1.5 text-left text-neutral-200 hover:text-white hover:bg-blue-600/20 flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Film className="w-3.5 h-3.5 text-blue-400" />
                    <span>视频主轨道 (Video)</span>
                  </div>
                  <span className="text-[9px] text-neutral-500">视频/字幕/动效</span>
                </button>
                <button
                  onClick={() => handleCreateTrack('audio')}
                  className="w-full px-3 py-1.5 text-left text-neutral-200 hover:text-white hover:bg-emerald-600/20 flex items-center justify-between text-[11px] cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Music2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>音频配乐轨 (Audio)</span>
                  </div>
                  <span className="text-[9px] text-neutral-500">人声/BGM/音效</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="撤销 (Ctrl+Z)"
          className={`p-1.5 rounded-md transition-colors ${
            canUndo ? 'text-neutral-300 hover:text-white hover:bg-[#1b1d27] cursor-pointer' : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={redo}
          disabled={!canRedo}
          title="重做 (Ctrl+Y)"
          className={`p-1.5 rounded-md transition-colors ${
            canRedo ? 'text-neutral-300 hover:text-white hover:bg-[#1b1d27] cursor-pointer' : 'text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-[#242633] mx-1" />

        <div className="relative">
          <button
            onClick={() => setIsHeightMenuOpen(!isHeightMenuOpen)}
            title="切换轨道高度显示 (紧凑/标准/大图)"
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1b1d27] rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          {isHeightMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsHeightMenuOpen(false)} />
              <div className="absolute top-full right-0 mt-1 w-36 bg-[#181a24] border border-[#2a2d3d] rounded-xl shadow-2xl py-1 z-50 text-xs animate-in fade-in">
                <button
                  onClick={() => {
                    setTrackHeight('compact');
                    setIsHeightMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left cursor-pointer ${
                    trackHeight === 'compact' ? 'text-blue-400 font-medium bg-blue-500/10' : 'text-neutral-300'
                  } hover:bg-blue-600/20`}
                >
                  紧凑轨道 (36px)
                </button>
                <button
                  onClick={() => {
                    setTrackHeight('normal');
                    setIsHeightMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left cursor-pointer ${
                    trackHeight === 'normal' ? 'text-blue-400 font-medium bg-blue-500/10' : 'text-neutral-300'
                  } hover:bg-blue-600/20`}
                >
                  标准轨道 (56px)
                </button>
                <button
                  onClick={() => {
                    setTrackHeight('tall');
                    setIsHeightMenuOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left cursor-pointer ${
                    trackHeight === 'tall' ? 'text-blue-400 font-medium bg-blue-500/10' : 'text-neutral-300'
                  } hover:bg-blue-600/20`}
                >
                  扩展轨道 (80px)
                </button>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setZoom((prev) => Math.max(10, prev - 10))}
          title="缩小时间线 (-)"
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1b1d27] rounded-md transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min="10"
          max="150"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-16 h-1 bg-[#242633] accent-blue-500 rounded-lg cursor-pointer"
          title={`缩放比例: ${Math.round((zoom / 45) * 100)}%`}
        />

        <button
          onClick={() => setZoom((prev) => Math.min(150, prev + 10))}
          title="放大时间线 (+)"
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1b1d27] rounded-md transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleZoomFit}
          title="缩放以适应全工程 (Shift+Z)"
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#1b1d27] rounded-md transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-px bg-[#242633] mx-1" />

        <button
          onClick={() => {
            if (window.confirm('确定要重置当前工程回到初始状态吗？未导出的修改将丢失。')) {
              resetProject();
            }
          }}
          title="重置工程 (新建)"
          className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
