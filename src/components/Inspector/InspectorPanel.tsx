import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Move,
  Palette,
  Volume2,
  Type,
  Sparkles,
  Gauge,
  Layers,
  RotateCcw,
  Trash2,
  Copy,
  Scissors,
  Diamond,
  Film,
  Music2,
  Image as ImageIcon,
  Edit2,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { LottieInspectorTab } from './LottieInspectorTab';
import { GpuInspectorTab } from './GpuInspectorTab';
import { ColorGradeInspectorTab } from './ColorGradeInspectorTab';
import { AudioInspectorTab } from './AudioInspectorTab';
import { KeyframeInspectorTab } from './KeyframeInspectorTab';
import { TransformInspectorTab } from './TransformInspectorTab';
import { TextInspectorTab } from './TextInspectorTab';
import { SpeedInspectorTab } from './SpeedInspectorTab';
import { TransitionInspectorTab } from './TransitionInspectorTab';
import { ProjectInspectorTab } from './ProjectInspectorTab';

export const InspectorPanel: React.FC = () => {
  const {
    project,
    selectedClip,
    updateClip,
    deleteClip,
    duplicateClip,
    splitClip,
    currentTime,
  } = useEditor();

  const [activeTab, setActiveTab] = useState<
    'transform' | 'keyframes' | 'color' | 'audio' | 'text' | 'transition' | 'speed' | 'lottie' | 'gpuEffect'
  >('transform');

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  // Sync tempName when clip changes
  useEffect(() => {
    if (selectedClip) {
      setTempName(selectedClip.name);
    }
  }, [selectedClip?.id]);

  // Auto switch tab when clip type changes
  useEffect(() => {
    if (!selectedClip) return;
    if (selectedClip.type === 'effect' || selectedClip.gpuEffect) {
      setActiveTab('gpuEffect');
    } else if (selectedClip.type === 'lottie') {
      setActiveTab('lottie');
    } else if (selectedClip.type === 'text') {
      setActiveTab('text');
    } else if (selectedClip.type === 'audio') {
      setActiveTab('audio');
    } else if (activeTab === 'lottie' || activeTab === 'text' || activeTab === 'gpuEffect') {
      setActiveTab('transform');
    }
  }, [selectedClip?.id, selectedClip?.type]);

  const handleNameSubmit = () => {
    if (selectedClip && tempName.trim()) {
      updateClip(selectedClip.id, { name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  // If no clip is selected, render the rich Project Inspector
  if (!selectedClip) {
    return (
      <aside className="w-full min-w-0 flex-1 bg-transparent flex flex-col p-3 text-neutral-200 select-none overflow-y-auto shrink-0">
        <ProjectInspectorTab project={project} />
      </aside>
    );
  }

  // Calculate clip capabilities
  const isVideoOrImage = selectedClip.type === 'video' || selectedClip.type === 'image';
  const isAudio = selectedClip.type === 'audio';
  const isText = selectedClip.type === 'text';
  const isSticker = selectedClip.type === 'sticker';
  const isLottie = selectedClip.type === 'lottie';
  const hasAudioTrack = isAudio || selectedClip.type === 'video';

  // Get Media Type Tag & Color
  const getTypeInfo = () => {
    switch (selectedClip.type) {
      case 'video':
        return { label: '视频', color: 'bg-cyan-400/20 text-cyan-200 border-cyan-400/30', icon: Film };
      case 'audio':
        return { label: '音频', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Music2 };
      case 'image':
        return { label: '图片', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: ImageIcon };
      case 'text':
        return { label: '文字字幕', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30', icon: Type };
      case 'lottie':
        return { label: 'Lottie 矢量', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', icon: Sparkles };
      case 'effect':
        return { label: 'GPU 特效', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30', icon: Sparkles };
      default:
        return { label: '素材', color: 'bg-neutral-500/20 text-neutral-300 border-neutral-500/30', icon: Layers };
    }
  };

  const typeInfo = getTypeInfo();
  const TypeIcon = typeInfo.icon;

  return (
    <aside className="w-full min-w-0 flex-1 bg-transparent flex flex-col text-neutral-200 select-none overflow-hidden shrink-0">
      {/* 1. Header with Clip Name, Type Badge, and Quick Action Tools */}
      <div className="px-3.5 pt-3 pb-2.5 border-b border-white/[0.06] flex flex-col gap-2.5 bg-white/[0.015]">
        <div className="flex items-center justify-between gap-2">
          {/* Clip Name or Inline Rename Field */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 shrink-0 ${typeInfo.color}`}>
              <TypeIcon className="w-2.5 h-2.5" />
              <span>{typeInfo.label}</span>
            </span>

            {isEditingName ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                  autoFocus
                  className="kf-input px-2 py-1 text-xs w-full"
                />
                <button
                  onClick={handleNameSubmit}
                  className="kf-icon-btn p-1 !text-emerald-300"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 min-w-0 flex-1 group">
                <span
                  onClick={() => setIsEditingName(true)}
                  className="font-bold text-[13px] text-white truncate cursor-pointer group-hover:text-cyan-300 transition-colors"
                  title="点击重命名片段"
                >
                  {selectedClip.name}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="opacity-0 group-hover:opacity-100 kf-icon-btn p-1"
                  title="重命名"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => splitClip(selectedClip.id)}
              title="在播放头位置拆分片段 (S)"
              className="kf-icon-btn p-1.5"
            >
              <Scissors className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => duplicateClip(selectedClip.id)}
              title="复制片段 (Ctrl+D)"
              className="kf-icon-btn p-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteClip(selectedClip.id)}
              title="删除片段 (Del)"
              className="kf-icon-btn p-1.5 hover:!text-rose-300"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Clip Time Info Bar */}
        <div className="flex items-center justify-between text-[10px] font-mono bg-white/[0.03] px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
          <div className="text-neutral-500">
            起点 <span className="text-neutral-200">{selectedClip.start.toFixed(2)}s</span>
          </div>
          <div className="text-neutral-500">
            时长 <span className="text-cyan-300 font-bold">{selectedClip.duration.toFixed(2)}s</span>
          </div>
          <div className="text-neutral-500">
            终点 <span className="text-neutral-200">{(selectedClip.start + selectedClip.duration).toFixed(2)}s</span>
          </div>
        </div>

        {/* 2. Scrollable Segmented Tab Navigation Bar */}
        <div className="flex bg-[#171822] p-0.5 rounded-lg gap-0.5 text-[11px] overflow-x-auto scrollbar-none">
          {/* Text Tab */}
          {isText && (
            <button
              onClick={() => setActiveTab('text')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-[#00c9bd] text-[#081011] font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Type className="w-3 h-3" />
              <span>排版</span>
            </button>
          )}

          {/* Transform Tab (for all except pure audio) */}
          {!isAudio && (
            <button
              onClick={() => setActiveTab('transform')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'transform'
                  ? 'bg-[#00c9bd] text-[#081011] font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Move className="w-3 h-3" />
              <span>变换</span>
            </button>
          )}

          {/* Keyframe Tab */}
          <button
            onClick={() => setActiveTab('keyframes')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'keyframes'
                  ? 'bg-[#00a89e] text-[#f5ffff] font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Diamond className="w-3 h-3" />
            <span>关键帧</span>
          </button>

          {/* Color Grade Tab */}
          {(isVideoOrImage || isSticker || isLottie) && (
            <button
              onClick={() => setActiveTab('color')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'color'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>调色</span>
            </button>
          )}

          {/* Audio Tab */}
          {hasAudioTrack && (
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'audio'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              <span>音频</span>
            </button>
          )}

          {/* GPU Effects Tab */}
          {(selectedClip.type === 'effect' || selectedClip.gpuEffect || isVideoOrImage) && (
            <button
              onClick={() => setActiveTab('gpuEffect')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'gpuEffect'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>GPU特效</span>
            </button>
          )}

          {/* Lottie Tab */}
          {isLottie && (
            <button
              onClick={() => setActiveTab('lottie')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'lottie'
                  ? 'bg-yellow-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>Lottie</span>
            </button>
          )}

          {/* Speed Tab */}
          <button
            onClick={() => setActiveTab('speed')}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'speed'
                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Gauge className="w-3 h-3" />
            <span>变速</span>
          </button>

          {/* Transition Tab */}
          {isVideoOrImage && (
            <button
              onClick={() => setActiveTab('transition')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'transition'
                  ? 'bg-pink-600 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-pink-300" />
              <span>转场</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Tab Contents Container */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 flex flex-col gap-3">
        {/* TEXT TAB */}
        {isText && activeTab === 'text' && (
          <TextInspectorTab clip={selectedClip} onUpdate={(u) => updateClip(selectedClip.id, u)} />
        )}

        {/* TRANSFORM TAB */}
        {!isAudio && activeTab === 'transform' && (
          <TransformInspectorTab clip={selectedClip} onUpdate={(u) => updateClip(selectedClip.id, u)} />
        )}

        {/* KEYFRAMES TAB */}
        {activeTab === 'keyframes' && (
          <KeyframeInspectorTab
            clip={selectedClip}
            currentTime={currentTime}
            onUpdate={(u) => updateClip(selectedClip.id, u)}
          />
        )}

        {/* COLOR GRADING TAB */}
        {activeTab === 'color' && (
          <ColorGradeInspectorTab clip={selectedClip} onUpdate={(u) => updateClip(selectedClip.id, u)} />
        )}

        {/* AUDIO & EQ TAB */}
        {activeTab === 'audio' && (
          <AudioInspectorTab clip={selectedClip} onUpdate={(u) => updateClip(selectedClip.id, u)} />
        )}

        {/* GPU EFFECT TAB */}
        {activeTab === 'gpuEffect' && (
          <GpuInspectorTab
            clip={selectedClip}
            onUpdateGpuEffect={(gpuEffect) => updateClip(selectedClip.id, { gpuEffect })}
          />
        )}

        {/* LOTTIE TAB */}
        {isLottie && activeTab === 'lottie' && (
          <LottieInspectorTab clip={selectedClip} />
        )}

        {/* SPEED TAB */}
        {activeTab === 'speed' && (
          <SpeedInspectorTab clip={selectedClip} onUpdate={(u) => updateClip(selectedClip.id, u)} />
        )}

        {/* TRANSITION TAB */}
        {activeTab === 'transition' && (
          <TransitionInspectorTab clip={selectedClip} onUpdate={(u) => updateClip(selectedClip.id, u)} />
        )}
      </div>
    </aside>
  );
};

/* ── segmented tab bar (extracted for clarity) ── */
type TabId = 'transform' | 'keyframes' | 'color' | 'audio' | 'text' | 'transition' | 'speed' | 'lottie' | 'gpuEffect';

const TabBar: React.FC<{
  isText: boolean; isAudio: boolean; isVideoOrImage: boolean;
  isSticker: boolean; isLottie: boolean; hasAudioTrack: boolean;
  clipType: string; gpuEffect: unknown;
  activeTab: TabId; setActiveTab: (t: TabId) => void;
}> = ({ isText, isAudio, isVideoOrImage, isSticker, isLottie, hasAudioTrack, clipType, gpuEffect, activeTab, setActiveTab }) => {
  const tabs: { id: TabId; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'text', label: '排版', icon: Type, show: isText },
    { id: 'transform', label: '变换', icon: Move, show: !isAudio },
    { id: 'keyframes', label: '关键帧', icon: Diamond, show: true },
    { id: 'color', label: '调色', icon: Palette, show: isVideoOrImage || isSticker || isLottie },
    { id: 'audio', label: '音频', icon: Volume2, show: hasAudioTrack },
    { id: 'gpuEffect', label: '特效', icon: Sparkles, show: clipType === 'effect' || !!gpuEffect || isVideoOrImage },
    { id: 'lottie', label: 'Lottie', icon: Sparkles, show: isLottie },
    { id: 'speed', label: '变速', icon: Gauge, show: true },
    { id: 'transition', label: '转场', icon: Sparkles, show: isVideoOrImage },
  ];
  return (
    <div className="flex bg-black/30 p-1 rounded-xl gap-0.5 text-[11px] overflow-x-auto border border-white/[0.06]">
      {tabs.filter((t) => t.show).map((t) => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer font-medium ${
              active
                ? 'bg-[var(--kf-accent-soft)] text-[var(--kf-accent)] shadow-[inset_0_0_0_1px_var(--kf-accent-line)]'
                : 'text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.04]'
            }`}
          >
            <Icon className="w-3 h-3" />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};
