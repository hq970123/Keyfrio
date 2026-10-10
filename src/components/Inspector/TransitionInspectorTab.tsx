import React from 'react';
import { Sparkles, Clock, RotateCcw, Check } from 'lucide-react';
import { Clip, TransitionType, TransitionSettings } from '../../types/editor';

interface TransitionInspectorTabProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
}

const TRANSITION_PRESETS: { type: TransitionType; name: string; icon: string; desc: string }[] = [
  { type: 'none', name: '无转场', icon: '⛔', desc: '硬切剪辑' },
  { type: 'crossDissolve', name: '交叉溶解', icon: '🌫️', desc: '两段画面柔和叠化' },
  { type: 'fadeBlack', name: '黑场淡入', icon: '🎬', desc: '电影感黑场过渡' },
  { type: 'fadeWhite', name: '白场闪白', icon: '⚡', desc: '高亮闪白冲刷' },
  { type: 'wipeLeft', name: '向左擦除', icon: '⬅️', desc: '水平从右向左划出' },
  { type: 'wipeRight', name: '向右擦除', icon: '➡️', desc: '水平从左向右划出' },
  { type: 'wipeUp', name: '向上擦除', icon: '⬆️', desc: '竖直向上推开' },
  { type: 'zoomIn', name: '变焦推近', icon: '🔍', desc: '镜头急速推进冲击' },
  { type: 'glitch', name: '数码故障', icon: '👾', desc: 'RGB 信号故障噪波' },
  { type: 'blur', name: '模糊推拉', icon: '💨', desc: '径向高斯模糊过渡' },
];

export const TransitionInspectorTab: React.FC<TransitionInspectorTabProps> = ({ clip, onUpdate }) => {
  const currentTransition: TransitionSettings = clip.transition || {
    type: 'none',
    duration: 0.6,
  };

  const updateTransition = (partial: Partial<TransitionSettings>) => {
    onUpdate({
      transition: {
        ...currentTransition,
        ...partial,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Transition Presets Grid */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span className="font-semibold text-neutral-200">转场过渡效果 (Transitions)</span>
          </div>
          <span className="text-[10px] text-neutral-400 font-medium">
            {TRANSITION_PRESETS.find((p) => p.type === currentTransition.type)?.name || '未选择'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {TRANSITION_PRESETS.map((preset) => {
            const isSelected = currentTransition.type === preset.type;
            return (
              <button
                key={preset.type}
                onClick={() => updateTransition({ type: preset.type })}
                className={`p-2 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-pink-500/20 border-pink-500 text-pink-200 font-medium shadow-xs'
                    : 'bg-[var(--kf-surface-1)] border-white/[0.06] text-neutral-300 hover:border-neutral-700 hover:text-white'
                }`}
              >
                <span className="text-base leading-none">{preset.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="text-[11px] font-semibold truncate">{preset.name}</span>
                  <span className="text-[9px] text-neutral-400 truncate">{preset.desc}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Duration Control (Only when transition active) */}
      {currentTransition.type !== 'none' && (
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span className="font-semibold text-neutral-200">转场时长 (Duration)</span>
            </div>
            <span className="font-mono text-sm font-bold text-pink-400">
              {currentTransition.duration.toFixed(1)} 秒
            </span>
          </div>

          <input
            type="range"
            min="0.2"
            max="2.0"
            step="0.1"
            value={currentTransition.duration}
            onChange={(e) => updateTransition({ duration: parseFloat(e.target.value) })}
            className="w-full accent-pink-500 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />

          <div className="grid grid-cols-4 gap-1 pt-1">
            {[0.3, 0.5, 0.8, 1.2].map((dur) => (
              <button
                key={dur}
                onClick={() => updateTransition({ duration: dur })}
                className={`py-1 rounded font-mono text-[10px] transition-colors ${
                  Math.abs(currentTransition.duration - dur) < 0.05
                    ? 'bg-pink-600 text-white font-semibold'
                    : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800'
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reset / Remove Transition */}
      <button
        onClick={() => updateTransition({ type: 'none' })}
        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium text-[11px]"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>移除转场 (Remove Transition)</span>
      </button>
    </div>
  );
};
