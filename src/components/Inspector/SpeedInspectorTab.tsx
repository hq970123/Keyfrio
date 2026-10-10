import React from 'react';
import { Gauge, FastForward, Rewind, Clock, Music2, RotateCcw } from 'lucide-react';
import { Clip } from '../../types/editor';

interface SpeedInspectorTabProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
}

const SPEED_PRESETS = [
  { label: '0.25x 极慢动作', value: 0.25 },
  { label: '0.5x 半速慢放', value: 0.5 },
  { label: '0.75x 稍慢', value: 0.75 },
  { label: '1.0x 原始速度', value: 1.0 },
  { label: '1.25x 稍快', value: 1.25 },
  { label: '1.5x 紧凑节奏', value: 1.5 },
  { label: '2.0x 双倍速', value: 2.0 },
  { label: '4.0x 极速快进', value: 4.0 },
];

export const SpeedInspectorTab: React.FC<SpeedInspectorTabProps> = ({ clip, onUpdate }) => {
  const currentSpeed = clip.speed || 1.0;
  const currentDuration = clip.duration;
  // Calculate original duration at 1.0x
  const originalDuration = currentDuration * currentSpeed;

  const handleSpeedChange = (newSpeed: number) => {
    // When speed changes, adjust clip duration accordingly on timeline
    const newDuration = originalDuration / newSpeed;
    onUpdate({
      speed: newSpeed,
      duration: Math.max(0.1, Number(newDuration.toFixed(2))),
    });
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Speed Slider & Numeric Readout */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-semibold text-neutral-200">播放速度 (Playback Speed)</span>
          </div>
          <span className="font-mono text-sm font-bold text-cyan-300">
            {currentSpeed.toFixed(2)}x
          </span>
        </div>

        <input
          type="range"
          min="0.1"
          max="4.0"
          step="0.05"
          value={currentSpeed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
        />

        {/* Speed Quick Presets */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 4.0].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`py-1 rounded font-mono text-[10px] transition-colors ${
                Math.abs(currentSpeed - s) < 0.04
                  ? 'bg-cyan-500 text-white font-bold shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 2. Duration Impact Preview */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-neutral-200">时间线占用时长</span>
        </div>

        <div className="flex items-center justify-between bg-[var(--kf-surface-1)] p-2 rounded-lg border border-white/[0.06] text-[11px]">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500">原素材时长 (1.0x):</span>
            <span className="font-mono text-neutral-300">{originalDuration.toFixed(2)} 秒</span>
          </div>
          <div className="text-neutral-500 font-bold">➔</div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-neutral-500">当前时间线时长:</span>
            <span className="font-mono text-cyan-300 font-semibold">{currentDuration.toFixed(2)} 秒</span>
          </div>
        </div>
      </div>

      {/* 3. Audio Pitch Preservation */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Music2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-neutral-200">保持原声音调 (Pitch)</span>
          </div>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
            WebAudio DSP 已生效
          </span>
        </div>
        <p className="text-[10px] text-neutral-400 leading-relaxed">
          变速时自动启用音频 DSP 时间伸缩算法，确保人声不会变尖锐（花栗鼠效应）或过低沉。
        </p>
      </div>

      {/* Reset Speed Button */}
      <button
        onClick={() => handleSpeedChange(1.0)}
        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium text-[11px]"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>恢复 1.0x 原速 (Reset Speed)</span>
      </button>
    </div>
  );
};
