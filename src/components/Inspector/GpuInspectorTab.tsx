import React from 'react';
import {
  Sparkles,
  Zap,
  Flame,
  Snowflake,
  Sliders,
  Palette,
  RotateCcw,
  Gauge,
  Layers,
  Check,
} from 'lucide-react';
import { Clip, GpuEffectSettings, GpuFilterType, GpuParticleType } from '../../types/editor';
import { GPU_FILTER_PRESETS, GPU_PARTICLE_PRESETS } from '../../constants/gpuEffects';

interface GpuInspectorTabProps {
  clip: Clip;
  onUpdateGpuEffect: (settings: GpuEffectSettings | undefined) => void;
}

export const GpuInspectorTab: React.FC<GpuInspectorTabProps> = ({ clip, onUpdateGpuEffect }) => {
  const currentEffect: GpuEffectSettings = clip.gpuEffect || {
    category: clip.type === 'effect' ? 'particle' : 'filter',
    particleType: 'snow',
    filterType: 'glitch',
    intensity: 65,
    speed: 1.0,
    density: 1.0,
    size: 1.0,
    frequency: 1.0,
    color: '#ffffff',
  };

  const updateSetting = (partial: Partial<GpuEffectSettings>) => {
    onUpdateGpuEffect({
      ...currentEffect,
      ...partial,
    });
  };

  const isParticle = currentEffect.category === 'particle';

  return (
    <div className="flex flex-col gap-3 text-xs select-none">
      {/* Category Toggle */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-1 rounded-lg flex gap-1">
        <button
          onClick={() => updateSetting({ category: 'particle' })}
          className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            isParticle
              ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>GPU 粒子系统</span>
        </button>
        <button
          onClick={() => updateSetting({ category: 'filter' })}
          className={`flex-1 py-1 px-2 rounded text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 ${
            !isParticle
              ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>GPU 着色滤镜</span>
        </button>
      </div>

      {/* Preset Pickers */}
      {isParticle ? (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-2.5 rounded-lg flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            粒子特效预设
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {GPU_PARTICLE_PRESETS.map((preset) => {
              const isActive = currentEffect.particleType === preset.settings.particleType;
              return (
                <button
                  key={preset.id}
                  onClick={() =>
                    onUpdateGpuEffect({
                      ...preset.settings,
                    })
                  }
                  className={`p-1.5 rounded-md border text-left flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-semibold'
                      : 'bg-[var(--kf-surface-1)] border-white/[0.06] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-base">{preset.icon}</span>
                  <span className="text-[10px] truncate">{preset.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-2.5 rounded-lg flex flex-col gap-2">
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
            GPU 着色滤镜预设
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {GPU_FILTER_PRESETS.map((preset) => {
              const isActive = currentEffect.filterType === preset.settings.filterType;
              return (
                <button
                  key={preset.id}
                  onClick={() =>
                    onUpdateGpuEffect({
                      ...preset.settings,
                    })
                  }
                  className={`p-1.5 rounded-md border text-left flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-semibold'
                      : 'bg-[var(--kf-surface-1)] border-white/[0.06] text-neutral-300 hover:border-neutral-500'
                  }`}
                >
                  <span className="text-base">{preset.icon}</span>
                  <span className="text-[10px] truncate">{preset.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Numerical Sliders */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-2.5 rounded-lg flex flex-col gap-3">
        <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
          <span>动力学参数调优</span>
          <span className="text-cyan-400 font-mono text-[9px]">WebGL 2.0</span>
        </span>

        {/* Intensity */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-300">特效强度 (Intensity)</span>
            <span className="text-cyan-400 font-mono font-medium">{currentEffect.intensity ?? 65}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={currentEffect.intensity ?? 65}
            onChange={(e) => updateSetting({ intensity: Number(e.target.value) })}
            className="w-full accent-cyan-500 h-1 bg-[var(--kf-surface-1)] rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Speed */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-300">运动速率 (Speed)</span>
            <span className="text-cyan-400 font-mono font-medium">{(currentEffect.speed ?? 1.0).toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.1"
            value={currentEffect.speed ?? 1.0}
            onChange={(e) => updateSetting({ speed: Number(e.target.value) })}
            className="w-full accent-cyan-500 h-1 bg-[var(--kf-surface-1)] rounded appearance-none cursor-pointer"
          />
        </div>

        {/* Particle Specific: Density & Size */}
        {isParticle && (
          <>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-300">粒子密度 (Density)</span>
                <span className="text-amber-400 font-mono font-medium">
                  {((currentEffect.density ?? 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.1"
                value={currentEffect.density ?? 1.0}
                onChange={(e) => updateSetting({ density: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1 bg-[var(--kf-surface-1)] rounded appearance-none cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-neutral-300">粒子颗粒大小 (Particle Size)</span>
                <span className="text-amber-400 font-mono font-medium">
                  {((currentEffect.size ?? 1.0) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={currentEffect.size ?? 1.0}
                onChange={(e) => updateSetting({ size: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1 bg-[var(--kf-surface-1)] rounded appearance-none cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Filter Specific: Frequency */}
        {!isParticle && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-neutral-300">波动频率 (Frequency)</span>
              <span className="text-purple-400 font-mono font-medium">
                {(currentEffect.frequency ?? 1.0).toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="3.0"
              step="0.1"
              value={currentEffect.frequency ?? 1.0}
              onChange={(e) => updateSetting({ frequency: Number(e.target.value) })}
              className="w-full accent-purple-500 h-1 bg-[var(--kf-surface-1)] rounded appearance-none cursor-pointer"
            />
          </div>
        )}

        {/* Color Tint Palette */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/[0.06]">
          <span className="text-[11px] text-neutral-300 flex items-center justify-between">
            <span>主色调 / 辉光颜色</span>
            <span className="font-mono text-[10px] text-neutral-400">{currentEffect.color || '#ffffff'}</span>
          </span>
          <div className="flex items-center gap-1.5">
            {['#ffffff', '#ffd700', '#ff007f', '#00ffff', '#3b82f6', '#22c55e', '#ff4500'].map((c) => (
              <button
                key={c}
                onClick={() => updateSetting({ color: c })}
                className={`w-5 h-5 rounded-full border transition-transform ${
                  currentEffect.color === c ? 'scale-125 border-white shadow-xs ring-1 ring-white/50' : 'border-transparent opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={currentEffect.color || '#ffffff'}
              onChange={(e) => updateSetting({ color: e.target.value })}
              className="w-5 h-5 rounded bg-transparent cursor-pointer border-none p-0 ml-1"
            />
          </div>
        </div>

        {/* Blend Mode */}
        <div className="flex flex-col gap-1 pt-1 border-t border-white/[0.06]">
          <span className="text-[11px] text-neutral-300">混合叠加模式 (Blend Mode)</span>
          <select
            value={currentEffect.blendMode || (isParticle ? 'add' : 'normal')}
            onChange={(e) => updateSetting({ blendMode: e.target.value as any })}
            className="bg-[var(--kf-surface-1)] border border-white/[0.06] rounded px-2 py-1 text-white text-[11px] outline-none"
          >
            <option value="normal">正常 (Normal)</option>
            <option value="add">发光加色 (Linear Add / Lighter)</option>
            <option value="screen">滤色 (Screen)</option>
            <option value="overlay">叠加 (Overlay)</option>
            <option value="multiply">正片叠底 (Multiply)</option>
          </select>
        </div>
      </div>

      {/* Reset / Remove Button */}
      <button
        onClick={() => onUpdateGpuEffect(undefined)}
        className="py-1.5 bg-red-950/30 hover:bg-red-950/60 border border-red-500/30 hover:border-red-500/60 text-red-400 rounded-md text-[11px] font-medium transition-colors flex items-center justify-center gap-1.5"
      >
        <RotateCcw className="w-3 h-3" />
        <span>移除当前 GPU 特效</span>
      </button>
    </div>
  );
};
