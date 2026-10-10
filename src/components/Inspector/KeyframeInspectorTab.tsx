import React from 'react';
import {
  Diamond,
  Plus,
  Trash2,
  FastForward,
  Play,
  Zap,
  ArrowLeftRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Clip, ClipKeyframes, EasingType } from '../../types/editor';
import { setClipKeyframe, removeClipKeyframe } from '../../utils/keyframeEngine';

interface KeyframeInspectorTabProps {
  clip: Clip;
  currentTime: number;
  onUpdate: (updates: Partial<Clip>) => void;
}

const MOTION_PRESETS = [
  {
    name: '镜头推进 (Zoom In)',
    icon: '🔍',
    apply: (clip: Clip) => {
      const dur = clip.duration;
      let kfs = setClipKeyframe(clip, 'scale', 0, 1.0, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'scale', dur, 1.35, 'easeInOut');
      return kfs;
    },
  },
  {
    name: '镜头拉远 (Zoom Out)',
    icon: '🔎',
    apply: (clip: Clip) => {
      const dur = clip.duration;
      let kfs = setClipKeyframe(clip, 'scale', 0, 1.35, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'scale', dur, 1.0, 'easeInOut');
      return kfs;
    },
  },
  {
    name: '平滑淡入淡出 (Fade In/Out)',
    icon: '✨',
    apply: (clip: Clip) => {
      const dur = clip.duration;
      let kfs = setClipKeyframe(clip, 'opacity', 0, 0, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'opacity', Math.min(1.0, dur * 0.2), 1, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'opacity', Math.max(0, dur - 1.0), 1, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'opacity', dur, 0, 'easeInOut');
      return kfs;
    },
  },
  {
    name: '呼吸浮动 (Breathing)',
    icon: '🫧',
    apply: (clip: Clip) => {
      const dur = clip.duration;
      let kfs = setClipKeyframe(clip, 'scale', 0, 1.0, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'scale', dur * 0.5, 1.15, 'easeInOut');
      kfs = setClipKeyframe({ ...clip, keyframes: kfs }, 'scale', dur, 1.0, 'easeInOut');
      return kfs;
    },
  },
];

export const KeyframeInspectorTab: React.FC<KeyframeInspectorTabProps> = ({
  clip,
  currentTime,
  onUpdate,
}) => {
  const clipRelativeTime = Math.max(0, Math.min(clip.duration, currentTime - clip.start));
  const keyframes: ClipKeyframes = clip.keyframes || {};

  const properties: { key: keyof ClipKeyframes; label: string; currentVal: number; unit: string }[] = [
    { key: 'scale', label: '缩放 (Scale)', currentVal: clip.transform.scale || 1, unit: 'x' },
    { key: 'x', label: '水平位移 (X)', currentVal: clip.transform.x, unit: '%' },
    { key: 'y', label: '垂直位移 (Y)', currentVal: clip.transform.y, unit: '%' },
    { key: 'rotation', label: '旋转角度 (Rotate)', currentVal: clip.transform.rotation || 0, unit: '°' },
    { key: 'opacity', label: '不透明度 (Opacity)', currentVal: clip.transform.opacity ?? 1, unit: '' },
    { key: 'blur', label: '高斯模糊 (Blur)', currentVal: clip.filter?.blur || 0, unit: 'px' },
    { key: 'brightness', label: '画面亮度 (Brightness)', currentVal: clip.filter?.brightness || 100, unit: '%' },
  ];

  const handleToggleKeyframe = (propKey: keyof ClipKeyframes, currentVal: number) => {
    const propList = keyframes[propKey] || [];
    const hasKfAtTime = propList.some((k) => Math.abs(k.time - clipRelativeTime) < 0.08);

    if (hasKfAtTime) {
      const updated = removeClipKeyframe(clip, propKey, undefined, clipRelativeTime);
      onUpdate({ keyframes: updated });
    } else {
      const updated = setClipKeyframe(clip, propKey, clipRelativeTime, currentVal, 'easeInOut');
      onUpdate({ keyframes: updated });
    }
  };

  const handleClearAllPropKeyframes = (propKey: keyof ClipKeyframes) => {
    const updated = {
      ...keyframes,
      [propKey]: [],
    };
    onUpdate({ keyframes: updated });
  };

  const handleChangeEasing = (propKey: keyof ClipKeyframes, kfId: string, easing: EasingType) => {
    const propList = keyframes[propKey] || [];
    const updatedList = propList.map((k) => (k.id === kfId ? { ...k, easing } : k));
    onUpdate({
      keyframes: {
        ...keyframes,
        ...{ [propKey]: updatedList },
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Header Info & Current Time */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-2.5 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Diamond className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
          <span className="font-semibold text-neutral-200">关键帧动效 (Keyframes)</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-sky-300 bg-[var(--kf-surface-1)] px-2 py-0.5 rounded border border-white/[0.06]">
          <span>当前片段点: {clipRelativeTime.toFixed(2)}s</span>
        </div>
      </div>

      {/* 2. Motion Presets */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-neutral-200">一键动效预设 (Motion Presets)</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {MOTION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                const newKfs = preset.apply(clip);
                onUpdate({ keyframes: newKfs });
              }}
              className="p-2 bg-[var(--kf-surface-1)] hover:bg-neutral-800 border border-white/[0.06] hover:border-sky-500/40 text-neutral-300 rounded-lg text-[11px] text-left transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="text-sm">{preset.icon}</span>
              <span className="truncate">{preset.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Property Keyframe List */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider px-1">
          可动画属性列表
        </span>

        {properties.map((prop) => {
          const propList = keyframes[prop.key] || [];
          const hasKfAtTime = propList.some((k) => Math.abs(k.time - clipRelativeTime) < 0.08);
          const totalKfs = propList.length;

          return (
            <div
              key={prop.key}
              className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-2.5 rounded-xl flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleKeyframe(prop.key, prop.currentVal)}
                    className={`p-1 rounded-md border transition-all cursor-pointer ${
                      hasKfAtTime
                        ? 'bg-sky-500/20 text-sky-400 border-sky-400 shadow-xs'
                        : 'bg-[var(--kf-surface-1)] text-neutral-400 hover:text-white border-white/[0.06]'
                    }`}
                    title={hasKfAtTime ? '删除当前时间点关键帧' : '在当前播放头打上关键帧'}
                  >
                    <Diamond
                      className={`w-3.5 h-3.5 ${hasKfAtTime ? 'fill-sky-400' : ''}`}
                    />
                  </button>
                  <span className="font-medium text-neutral-200">{prop.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-neutral-400 bg-[var(--kf-surface-1)] px-1.5 py-0.5 rounded">
                    {totalKfs > 0 ? `${totalKfs} 帧` : '静态'}
                  </span>
                  {totalKfs > 0 && (
                    <button
                      onClick={() => handleClearAllPropKeyframes(prop.key)}
                      className="p-1 text-neutral-500 hover:text-rose-400 rounded transition-colors"
                      title="清除该属性的所有关键帧"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Keyframe details & Easing */}
              {totalKfs > 0 && (
                <div className="flex flex-col gap-1 pl-6 border-l border-white/[0.06] mt-1">
                  {propList.map((kf, idx) => {
                    const isSelected = Math.abs(kf.time - clipRelativeTime) < 0.08;
                    return (
                      <div
                        key={kf.id || idx}
                        className={`flex items-center justify-between p-1.5 rounded-lg text-[10px] ${
                          isSelected ? 'bg-sky-950/40 border border-sky-800/50 text-sky-200' : 'bg-[var(--kf-surface-1)] text-neutral-400'
                        }`}
                      >
                        <span className="font-mono">
                          #{idx + 1} @ {kf.time.toFixed(2)}s: {typeof kf.value === 'number' ? kf.value.toFixed(1) : kf.value}
                        </span>

                        <select
                          value={kf.easing || 'easeInOut'}
                          onChange={(e) =>
                            handleChangeEasing(prop.key, kf.id, e.target.value as EasingType)
                          }
                          className="bg-neutral-900 border border-neutral-700 text-neutral-300 px-1 py-0.5 rounded outline-none text-[9px] cursor-pointer"
                        >
                          <option value="easeInOut">平滑 easeInOut</option>
                          <option value="easeIn">缓入 easeIn</option>
                          <option value="easeOut">缓出 easeOut</option>
                          <option value="linear">线性 linear</option>
                          <option value="spring">弹性 spring</option>
                          <option value="hold">定格 hold</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
