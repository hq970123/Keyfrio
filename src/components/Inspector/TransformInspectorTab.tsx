import React from 'react';
import {
  Move,
  RotateCcw,
  Maximize2,
  Minimize2,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Eye,
  Sliders,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';
import { Clip, Transform, ColorFilter } from '../../types/editor';
import { DEFAULT_TRANSFORM, DEFAULT_FILTER } from '../../constants/samples';

interface TransformInspectorTabProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
}

export const TransformInspectorTab: React.FC<TransformInspectorTabProps> = ({ clip, onUpdate }) => {
  const transform: Transform = clip.transform || DEFAULT_TRANSFORM;
  const filter: ColorFilter = clip.filter || DEFAULT_FILTER;

  const updateTransform = (partial: Partial<Transform>) => {
    onUpdate({
      transform: {
        ...transform,
        ...partial,
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

  // Quick framing presets
  const applyFramingPreset = (type: 'fit' | 'fill' | 'center' | 'left' | 'right' | 'pip-tr' | 'pip-br') => {
    switch (type) {
      case 'fit':
        updateTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        break;
      case 'fill':
        updateTransform({ x: 0, y: 0, scale: 1.35, rotation: 0 });
        break;
      case 'center':
        updateTransform({ x: 0, y: 0, scale: 1, rotation: 0 });
        break;
      case 'left':
        updateTransform({ x: -25, y: 0, scale: 0.5, rotation: 0 });
        break;
      case 'right':
        updateTransform({ x: 25, y: 0, scale: 0.5, rotation: 0 });
        break;
      case 'pip-tr':
        updateTransform({ x: 30, y: -25, scale: 0.35, rotation: 0 });
        break;
      case 'pip-br':
        updateTransform({ x: 30, y: 25, scale: 0.35, rotation: 0 });
        break;
    }
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Position & Coordinates */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Move className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-semibold text-neutral-200">空间位置 (Position)</span>
          </div>
          <button
            onClick={() => updateTransform({ x: 0, y: 0 })}
            className="text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors"
            title="重置到画面中心"
          >
            居中
          </button>
        </div>

        {/* X Position */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-14">X 水平:</span>
          <input
            type="range"
            min="-80"
            max="80"
            value={transform.x}
            onChange={(e) => updateTransform({ x: parseInt(e.target.value) })}
            className="flex-1 accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={transform.x}
              onChange={(e) => updateTransform({ x: parseInt(e.target.value) || 0 })}
              className="w-12 bg-neutral-900 border border-neutral-700 text-center font-mono text-[11px] text-white py-0.5 rounded"
            />
            <span className="text-[10px] text-neutral-500">%</span>
          </div>
        </div>

        {/* Y Position */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-14">Y 垂直:</span>
          <input
            type="range"
            min="-80"
            max="80"
            value={transform.y}
            onChange={(e) => updateTransform({ y: parseInt(e.target.value) })}
            className="flex-1 accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={transform.y}
              onChange={(e) => updateTransform({ y: parseInt(e.target.value) || 0 })}
              className="w-12 bg-neutral-900 border border-neutral-700 text-center font-mono text-[11px] text-white py-0.5 rounded"
            />
            <span className="text-[10px] text-neutral-500">%</span>
          </div>
        </div>
      </div>

      {/* 2. Scale & Sizing */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-semibold text-neutral-200">缩放比例 (Scale)</span>
          </div>
          <span className="font-mono text-[11px] text-violet-300 font-medium">
            {Math.round((transform.scale || 1) * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.05"
          value={transform.scale || 1}
          onChange={(e) => updateTransform({ scale: parseFloat(e.target.value) })}
          className="w-full accent-violet-500 h-1 bg-neutral-800 rounded-lg cursor-pointer"
        />

        {/* Quick Scale Presets */}
        <div className="grid grid-cols-5 gap-1 pt-1">
          {[0.25, 0.5, 1.0, 1.5, 2.0].map((s) => (
            <button
              key={s}
              onClick={() => updateTransform({ scale: s })}
              className={`py-1 rounded text-[10px] font-mono transition-colors ${
                Math.abs((transform.scale || 1) - s) < 0.04
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {Math.round(s * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* 3. Rotation & Flip */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-neutral-200">旋转与翻转 (Rotation & Flip)</span>
          </div>
          <span className="font-mono text-[11px] text-sky-300">
            {transform.rotation || 0}°
          </span>
        </div>

        <input
          type="range"
          min="-180"
          max="180"
          value={transform.rotation || 0}
          onChange={(e) => updateTransform({ rotation: parseInt(e.target.value) })}
          className="w-full accent-sky-500 h-1 bg-neutral-800 rounded-lg cursor-pointer"
        />

        {/* Rotation & Flip Quick Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={() => updateTransform({ rotation: ((transform.rotation || 0) - 90 + 360) % 360 - 180 })}
            className="py-1 px-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[10px] font-medium transition-colors"
            title="逆时针旋转 90 度"
          >
            -90°
          </button>
          <button
            onClick={() => updateTransform({ rotation: ((transform.rotation || 0) + 90 + 180) % 360 - 180 })}
            className="py-1 px-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[10px] font-medium transition-colors"
            title="顺时针旋转 90 度"
          >
            +90°
          </button>
          <button
            onClick={() => updateTransform({ flipH: !transform.flipH })}
            className={`py-1 px-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
              transform.flipH ? 'bg-sky-600 text-white font-semibold' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
            }`}
            title="水平镜像翻转"
          >
            <FlipHorizontal className="w-3 h-3" />
            <span>水平</span>
          </button>
          <button
            onClick={() => updateTransform({ flipV: !transform.flipV })}
            className={`py-1 px-1 rounded text-[10px] font-medium flex items-center justify-center gap-1 transition-colors ${
              transform.flipV ? 'bg-sky-600 text-white font-semibold' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
            }`}
            title="垂直上下翻转"
          >
            <FlipVertical className="w-3 h-3" />
            <span>垂直</span>
          </button>
        </div>
      </div>

      {/* 4. Opacity & Visibility */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-neutral-200">不透明度 (Opacity)</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-300">
            {Math.round((transform.opacity ?? 1) * 100)}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={transform.opacity ?? 1}
          onChange={(e) => updateTransform({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-emerald-500 h-1 bg-neutral-800 rounded-lg cursor-pointer"
        />

        <div className="grid grid-cols-5 gap-1 pt-1">
          {[0, 0.25, 0.5, 0.75, 1.0].map((op) => (
            <button
              key={op}
              onClick={() => updateTransform({ opacity: op })}
              className={`py-1 rounded text-[10px] font-mono transition-colors ${
                Math.abs((transform.opacity ?? 1) - op) < 0.05
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {Math.round(op * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* 5. Quick Layout Framing Presets */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-neutral-200">构图与画中画预设 (Framing)</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => applyFramingPreset('fit')}
            className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[11px] text-left transition-colors"
          >
            📺 适应画布 (Fit)
          </button>
          <button
            onClick={() => applyFramingPreset('fill')}
            className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[11px] text-left transition-colors"
          >
            🖼️ 填充无黑边 (Fill)
          </button>
          <button
            onClick={() => applyFramingPreset('left')}
            className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[11px] text-left transition-colors"
          >
            ◀️ 左半屏分屏
          </button>
          <button
            onClick={() => applyFramingPreset('right')}
            className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[11px] text-left transition-colors"
          >
            ▶️ 右半屏分屏
          </button>
          <button
            onClick={() => applyFramingPreset('pip-tr')}
            className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[11px] text-left transition-colors"
          >
            ↗️ 右上角画中画
          </button>
          <button
            onClick={() => applyFramingPreset('pip-br')}
            className="py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded text-[11px] text-left transition-colors"
          >
            ↘️ 右下角画中画
          </button>
        </div>
      </div>

      {/* Reset Transform Button */}
      <button
        onClick={() => onUpdate({ transform: DEFAULT_TRANSFORM })}
        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium text-[11px]"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>重置所有变换属性 (Reset Transform)</span>
      </button>
    </div>
  );
};
