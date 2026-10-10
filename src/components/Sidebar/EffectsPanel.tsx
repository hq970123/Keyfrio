import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Flame,
  Snowflake,
  Tv,
  Waves,
  Palette,
  Plus,
  CheckCircle2,
  Search,
  Cpu,
  Layers,
  Sliders,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { GPU_FILTER_PRESETS, GPU_PARTICLE_PRESETS, GpuPreset } from '../../constants/gpuEffects';
import { FILTER_PRESETS } from '../../constants/samples';

export const EffectsPanel: React.FC = () => {
  const { selectedClip, updateClip, addMediaToTimeline, addTrack, project, addClip, currentTime } = useEditor();
  const [activeCategory, setActiveCategory] = useState<'all' | 'particles' | 'filters' | 'color'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Add GPU Effect as an independent Clip on the video track
  const handleAddEffectToTimeline = (preset: GpuPreset) => {
    let videoTrack = project.tracks.find((t) => t.type === 'video' && !t.isLocked);
    if (!videoTrack) {
      videoTrack = addTrack('video', 'V1');
    }

    addClip(videoTrack.id, {
      name: preset.name,
      type: 'effect',
      start: currentTime,
      duration: preset.duration || 5,
      color: preset.color,
      gpuEffect: { ...preset.settings },
    });

    showToast(`已将「${preset.name}」添加至视频轨道！`);
  };

  // Apply GPU Effect directly to the currently selected video / image clip
  const handleApplyToSelectedClip = (preset: GpuPreset) => {
    if (!selectedClip) {
      // Fallback to timeline addition
      handleAddEffectToTimeline(preset);
      return;
    }

    updateClip(selectedClip.id, {
      gpuEffect: { ...preset.settings },
    });
    showToast(`已将「${preset.name}」赋予当前片段「${selectedClip.name}」！`);
  };

  // Apply classic color filter preset
  const handleApplyColorPreset = (preset: (typeof FILTER_PRESETS)[0]) => {
    if (!selectedClip) {
      showToast('💡 请先在时间线选中目标片段以应用调色');
      return;
    }
    updateClip(selectedClip.id, {
      filter: { ...preset.filter },
    });
    showToast(`已应用「${preset.name}」调色滤镜！`);
  };

  const filteredParticles = GPU_PARTICLE_PRESETS.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFilters = GPU_FILTER_PRESETS.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      {/* Panel Header */}
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-bold text-xs text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            GPU 特效与粒子 (PixiJS Engine)
          </span>
          <span className="text-[9px] text-neutral-400 mt-0.5 flex items-center gap-1">
            <Cpu className="w-2.5 h-2.5 text-cyan-500" />
            <span>WebGL 硬件加速 · 实时着色器与物理粒子</span>
          </span>
        </div>
        <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[9px] rounded font-semibold">
          PixiJS v8
        </span>
      </div>

      {/* Category Tabs */}
      <div className="px-2 pt-2 pb-1 border-b border-white/[0.06] flex gap-1">
        {[
          { id: 'all', label: '全部特效' },
          { id: 'particles', label: '🎆 粒子发生器' },
          { id: 'filters', label: '⚡ GPU 滤镜' },
          { id: 'color', label: '🎨 胶片调色' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`flex-1 py-1 px-1 rounded text-[10px] font-medium transition-all text-center ${
              activeCategory === tab.id
                ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-[var(--kf-surface-4)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索特效、粒子、故障风、雪花..."
            className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] rounded pl-6 pr-2 py-1 text-white text-[11px] outline-none"
          />
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div className="mx-2 mt-2 p-1.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded text-[10px] flex items-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">{statusMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3">
        {/* 1. GPU Particles Section */}
        {(activeCategory === 'all' || activeCategory === 'particles') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                GPU 粒子特效 (Particle Systems)
              </span>
              <span className="text-[9px] text-neutral-500">独立轨 / 贴合片段</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {filteredParticles.map((preset) => (
                <div
                  key={preset.id}
                  className="group bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-cyan-500/60 rounded-lg p-2 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center text-xl shrink-0 border"
                      style={{
                        backgroundColor: `${preset.color}15`,
                        borderColor: `${preset.color}40`,
                      }}
                    >
                      {preset.icon}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                          {preset.name}
                        </span>
                        <span
                          className="px-1 py-0.2 rounded text-[8px] font-mono"
                          style={{
                            backgroundColor: `${preset.color}20`,
                            color: preset.color,
                          }}
                        >
                          {preset.duration}s
                        </span>
                      </div>
                      <span className="text-[9px] text-neutral-400 truncate mt-0.5">
                        {preset.description}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleApplyToSelectedClip(preset)}
                      title="应用至当前选中的片段"
                      className="p-1.5 bg-[#202230] hover:bg-cyan-600 text-neutral-300 hover:text-white rounded transition-colors text-[9px] flex items-center gap-0.5"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>应用</span>
                    </button>
                    <button
                      onClick={() => handleAddEffectToTimeline(preset)}
                      title="添加为独立特效轨道"
                      className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition-colors flex items-center gap-0.5 shadow-sm font-medium text-[9px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>加到时间线</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. GPU Shaders Section */}
        {(activeCategory === 'all' || activeCategory === 'filters') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 text-cyan-400" />
                GPU 着色器滤镜 (Shader Filters)
              </span>
              <span className="text-[9px] text-neutral-500">故障 / 发光 / 水波</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {filteredFilters.map((preset) => (
                <div
                  key={preset.id}
                  className="group bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-purple-500/60 rounded-lg p-2 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center text-xl shrink-0 border"
                      style={{
                        backgroundColor: `${preset.color}15`,
                        borderColor: `${preset.color}40`,
                      }}
                    >
                      {preset.icon}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-white truncate group-hover:text-purple-300 transition-colors">
                          {preset.name}
                        </span>
                        <span
                          className="px-1 py-0.2 rounded text-[8px] font-mono"
                          style={{
                            backgroundColor: `${preset.color}20`,
                            color: preset.color,
                          }}
                        >
                          Shader
                        </span>
                      </div>
                      <span className="text-[9px] text-neutral-400 truncate mt-0.5">
                        {preset.description}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      onClick={() => handleApplyToSelectedClip(preset)}
                      title="应用至当前选中的片段"
                      className="p-1.5 bg-[#202230] hover:bg-purple-600 text-neutral-300 hover:text-white rounded transition-colors text-[9px] flex items-center gap-0.5"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>应用</span>
                    </button>
                    <button
                      onClick={() => handleAddEffectToTimeline(preset)}
                      title="添加为独立特效轨道"
                      className="p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded transition-colors flex items-center gap-0.5 shadow-sm font-medium text-[9px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>加到时间线</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Classic Color Grading Presets */}
        {(activeCategory === 'all' || activeCategory === 'color') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Palette className="w-3 h-3 text-cyan-400" />
                电影级色彩预设 (Color Grading)
              </span>
              <span className="text-[9px] text-neutral-500">点击赋予选中片段</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {FILTER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyColorPreset(preset)}
                  className="p-2 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-cyan-500 rounded-md flex flex-col gap-1.5 text-left transition-all group cursor-pointer"
                >
                  <div
                    className="w-full h-10 rounded overflow-hidden border border-white/10 relative flex items-end p-1"
                    style={{
                      filter: `brightness(${preset.filter.brightness}%) contrast(${preset.filter.contrast}%) saturate(${preset.filter.saturate}%) hue-rotate(${preset.filter.hueRotate}deg) sepia(${preset.filter.sepia}%) grayscale(${preset.filter.grayscale}%)`,
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    }}
                  >
                    <span className="text-[8px] font-bold text-white bg-black/60 px-1 py-0.2 rounded backdrop-blur-xs">
                      {preset.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-neutral-400">
                    <span>饱和 {preset.filter.saturate}%</span>
                    <span className="text-cyan-400 group-hover:underline">点击应用</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
