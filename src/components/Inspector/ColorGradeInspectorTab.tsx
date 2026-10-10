import React, { useState } from 'react';
import { Palette, Sun, Sliders, RotateCcw, Eye, Sparkles, Wand2, Contrast } from 'lucide-react';
import { Clip, ColorGrading, ColorGradeWheel, ColorFilter } from '../../types/editor';
import { DEFAULT_COLOR_GRADING, DEFAULT_FILTER } from '../../constants/samples';

interface ColorGradeInspectorTabProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
}

// Cinematic LUT / Grading Presets
const COLOR_PRESETS = [
  {
    name: '青橙影调 (Teal & Orange)',
    icon: '🎬',
    grading: {
      exposure: 0.1,
      temperature: -10,
      tint: 15,
      contrast: 115,
      saturation: 110,
      vibrance: 20,
      lift: { r: -0.25, g: 0.05, b: 0.35, y: -0.05 },
      gamma: { r: 0.15, g: 0.0, b: -0.15, y: 0.02 },
      gain: { r: 0.35, g: 0.15, b: -0.2, y: 0.05 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
  },
  {
    name: '复古胶片 (Vintage 90s)',
    icon: '🎞️',
    grading: {
      exposure: 0.0,
      temperature: 20,
      tint: -10,
      contrast: 90,
      saturation: 85,
      vibrance: -10,
      lift: { r: 0.2, g: 0.1, b: -0.1, y: 0.1 },
      gamma: { r: 0.05, g: 0.05, b: 0.0, y: -0.05 },
      gain: { r: 0.15, g: 0.2, b: 0.05, y: 0.0 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
  },
  {
    name: '赛博霓虹 (Cyberpunk)',
    icon: '🌃',
    grading: {
      exposure: 0.2,
      temperature: -30,
      tint: 40,
      contrast: 130,
      saturation: 140,
      vibrance: 40,
      lift: { r: -0.1, g: -0.3, b: 0.4, y: -0.1 },
      gamma: { r: 0.3, g: -0.1, b: 0.3, y: 0.0 },
      gain: { r: -0.2, g: 0.4, b: 0.5, y: 0.1 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
  },
  {
    name: '落日金辉 (Golden Sunset)',
    icon: '🌅',
    grading: {
      exposure: 0.15,
      temperature: 45,
      tint: -5,
      contrast: 105,
      saturation: 120,
      vibrance: 30,
      lift: { r: 0.15, g: 0.0, b: -0.2, y: -0.05 },
      gamma: { r: 0.25, g: 0.1, b: -0.15, y: 0.05 },
      gain: { r: 0.4, g: 0.2, b: -0.3, y: 0.05 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
  },
  {
    name: '冷峻北欧 (Nordic Cold)',
    icon: '❄️',
    grading: {
      exposure: -0.1,
      temperature: -40,
      tint: -10,
      contrast: 120,
      saturation: 75,
      vibrance: -15,
      lift: { r: -0.2, g: -0.05, b: 0.3, y: 0.0 },
      gamma: { r: -0.1, g: 0.05, b: 0.2, y: -0.05 },
      gain: { r: -0.15, g: 0.0, b: 0.25, y: 0.0 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
  },
  {
    name: '黑白纪实 (Noir B&W)',
    icon: '🖤',
    grading: {
      exposure: 0.0,
      temperature: 0,
      tint: 0,
      contrast: 140,
      saturation: 0,
      vibrance: -100,
      lift: { r: 0, g: 0, b: 0, y: -0.1 },
      gamma: { r: 0, g: 0, b: 0, y: 0.0 },
      gain: { r: 0, g: 0, b: 0, y: 0.15 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
    },
  },
];

// 3-Way Color Wheel Mini Component
const ColorWheelControl: React.FC<{
  label: string;
  wheel: ColorGradeWheel;
  onChange: (updated: ColorGradeWheel) => void;
  accentColor: string;
}> = ({ label, wheel, onChange, accentColor }) => {
  const handleWheelDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const dx = (clientX - centerX) / centerX; // -1 to 1
    const dy = (clientY - centerY) / centerY; // -1 to 1

    const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const r = Math.max(-1, Math.min(1, Math.cos(angle) * dist));
    const b = Math.max(-1, Math.min(1, Math.sin(angle) * dist));
    const g = Math.max(-1, Math.min(1, -Math.sin(angle) * dist * 0.5));

    onChange({
      ...wheel,
      r: Number(r.toFixed(3)),
      g: Number(g.toFixed(3)),
      b: Number(b.toFixed(3)),
    });
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ r: 0, g: 0, b: 0, y: 0 });
  };

  // Convert (r, b) to 2D disk position (percentage)
  const puckX = 50 + (wheel.r || 0) * 40;
  const puckY = 50 + (wheel.b || 0) * 40;

  return (
    <div className="flex flex-col items-center gap-1.5 bg-[var(--kf-surface-1)] p-2 rounded-xl border border-white/[0.06] flex-1 min-w-[85px]">
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-[10px] font-semibold text-neutral-300 tracking-wide truncate">{label}</span>
        <button
          onClick={handleReset}
          className="text-[9px] text-neutral-500 hover:text-neutral-300 p-0.5"
          title="重置色轮"
        >
          <RotateCcw className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Color Disk */}
      <div
        onClick={handleWheelDrag}
        className="relative w-16 h-16 rounded-full border border-neutral-700 cursor-crosshair shadow-inner overflow-hidden flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, #262626 0%, #171717 40%, rgba(220,60,60,0.4) 75%, rgba(60,160,255,0.4) 100%)`,
        }}
      >
        {/* Crosshair */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-neutral-600/40 pointer-events-none" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-neutral-600/40 pointer-events-none" />

        {/* Center Target Puck */}
        <div
          className="absolute w-2.5 h-2.5 rounded-full border border-white shadow-md pointer-events-none transition-transform"
          style={{
            left: `${puckX}%`,
            top: `${puckY}%`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: accentColor,
          }}
        />
      </div>

      {/* Master Luminance Slider */}
      <div className="w-full flex items-center gap-1 mt-0.5">
        <span className="text-[8px] font-mono text-neutral-400">Y</span>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={wheel.y || 0}
          onChange={(e) => onChange({ ...wheel, y: parseFloat(e.target.value) })}
          className="w-full accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
        />
        <span className="text-[8px] font-mono text-neutral-400 w-5 text-right">
          {((wheel.y || 0) * 100).toFixed(0)}
        </span>
      </div>
    </div>
  );
};

export const ColorGradeInspectorTab: React.FC<ColorGradeInspectorTabProps> = ({ clip, onUpdate }) => {
  const grading: ColorGrading = clip.colorGrading || DEFAULT_COLOR_GRADING;
  const filter: ColorFilter = clip.filter || DEFAULT_FILTER;

  const [activeSubTab, setActiveSubTab] = useState<'presets' | 'primary' | 'wheels' | 'filters'>('presets');

  const updateGrading = (partial: Partial<ColorGrading>) => {
    onUpdate({
      colorGrading: {
        ...grading,
        ...partial,
        enabled: true,
      },
    });
  };

  const updateFilter = (partial: Partial<ColorFilter>) => {
    onUpdate({
      filter: {
        ...filter,
        ...partial,
      },
    });
  };

  const handleToggle = () => {
    onUpdate({
      colorGrading: {
        ...grading,
        enabled: !grading.enabled,
      },
    });
  };

  const handleResetAll = () => {
    onUpdate({
      colorGrading: DEFAULT_COLOR_GRADING,
      filter: DEFAULT_FILTER,
    });
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Top Banner & Enable Toggle */}
      <div className="flex items-center justify-between bg-[var(--kf-surface-3)] p-2.5 rounded-xl border border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-neutral-200">ASC-CDL 专业调色</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggle}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              grading.enabled
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            }`}
          >
            {grading.enabled ? '已开启' : '已禁用'}
          </button>
          <button
            onClick={handleResetAll}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
            title="重置所有调色参数"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Sub-tabs: 电影滤镜 / 基础校色 / 三段色轮 / 特效滤镜 */}
      <div className="flex bg-[var(--kf-surface-1)] p-0.5 rounded-lg gap-0.5 text-[10px]">
        <button
          onClick={() => setActiveSubTab('presets')}
          className={`flex-1 py-1 rounded transition-colors ${
            activeSubTab === 'presets' ? 'bg-amber-600 text-white font-medium shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          电影滤镜
        </button>
        <button
          onClick={() => setActiveSubTab('primary')}
          className={`flex-1 py-1 rounded transition-colors ${
            activeSubTab === 'primary' ? 'bg-amber-600 text-white font-medium shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          基础校色
        </button>
        <button
          onClick={() => setActiveSubTab('wheels')}
          className={`flex-1 py-1 rounded transition-colors ${
            activeSubTab === 'wheels' ? 'bg-amber-600 text-white font-medium shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          三段色轮
        </button>
        <button
          onClick={() => setActiveSubTab('filters')}
          className={`flex-1 py-1 rounded transition-colors ${
            activeSubTab === 'filters' ? 'bg-amber-600 text-white font-medium shadow-xs' : 'text-neutral-400 hover:text-white'
          }`}
        >
          暗角/模糊
        </button>
      </div>

      {/* 1. PRESETS TAB */}
      {activeSubTab === 'presets' && (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-neutral-200">大师级电影调色 LUT 预设</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() =>
                  updateGrading({
                    ...preset.grading,
                    enabled: true,
                  })
                }
                className="p-2 bg-[var(--kf-surface-1)] hover:bg-neutral-800 border border-white/[0.06] hover:border-amber-500/40 text-neutral-200 rounded-lg text-left transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="text-base">{preset.icon}</span>
                <span className="text-[11px] font-medium truncate">{preset.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. PRIMARY TAB */}
      {activeSubTab === 'primary' && (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
          <span className="font-semibold text-neutral-200">基础校色参数 (Primary Adjustments)</span>

          {/* Exposure */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">曝光 (EV):</span>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.05"
              value={grading.exposure || 0}
              onChange={(e) => updateGrading({ exposure: parseFloat(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {grading.exposure > 0 ? `+${grading.exposure}` : grading.exposure}
            </span>
          </div>

          {/* Temperature */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">色温 (冷-暖):</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grading.temperature || 0}
              onChange={(e) => updateGrading({ temperature: parseInt(e.target.value) })}
              className="flex-1 accent-orange-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {grading.temperature}
            </span>
          </div>

          {/* Tint */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">色调 (绿-洋红):</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grading.tint || 0}
              onChange={(e) => updateGrading({ tint: parseInt(e.target.value) })}
              className="flex-1 accent-emerald-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {grading.tint}
            </span>
          </div>

          {/* Saturation */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">饱和度:</span>
            <input
              type="range"
              min="0"
              max="200"
              step="1"
              value={grading.saturation || 100}
              onChange={(e) => updateGrading({ saturation: parseInt(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {grading.saturation}%
            </span>
          </div>

          {/* Vibrance */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">自然饱和度:</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grading.vibrance || 0}
              onChange={(e) => updateGrading({ vibrance: parseInt(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {grading.vibrance}
            </span>
          </div>
        </div>
      )}

      {/* 3. WHEELS TAB */}
      {activeSubTab === 'wheels' && (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-200">三段色轮 (3-Way Wheels)</span>
            <span className="text-[10px] text-neutral-500 font-mono">ASC-CDL</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <ColorWheelControl
              label="暗部 (Lift)"
              wheel={grading.lift}
              accentColor="#38bdf8"
              onChange={(wheel) => updateGrading({ lift: wheel })}
            />
            <ColorWheelControl
              label="中间调 (Gamma)"
              wheel={grading.gamma}
              accentColor="#a855f7"
              onChange={(wheel) => updateGrading({ gamma: wheel })}
            />
            <ColorWheelControl
              label="高光 (Gain)"
              wheel={grading.gain}
              accentColor="#f59e0b"
              onChange={(wheel) => updateGrading({ gain: wheel })}
            />
          </div>
        </div>
      )}

      {/* 4. FILTERS & VIGNETTE TAB */}
      {activeSubTab === 'filters' && (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
          <span className="font-semibold text-neutral-200">暗角与滤镜 (Vignette & Blur)</span>

          {/* Vignette */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">暗角强度:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={filter.vignette || 0}
              onChange={(e) => updateFilter({ vignette: parseInt(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {filter.vignette || 0}%
            </span>
          </div>

          {/* Blur */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">高斯模糊:</span>
            <input
              type="range"
              min="0"
              max="20"
              value={filter.blur || 0}
              onChange={(e) => updateFilter({ blur: parseInt(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {filter.blur || 0}px
            </span>
          </div>

          {/* Sepia */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">怀旧棕褐:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={filter.sepia || 0}
              onChange={(e) => updateFilter({ sepia: parseInt(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {filter.sepia || 0}%
            </span>
          </div>

          {/* Grayscale */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-neutral-400 w-16">黑白灰度:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={filter.grayscale || 0}
              onChange={(e) => updateFilter({ grayscale: parseInt(e.target.value) })}
              className="flex-1 accent-amber-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
              {filter.grayscale || 0}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
