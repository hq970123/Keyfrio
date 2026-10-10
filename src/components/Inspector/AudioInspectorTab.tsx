import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Sliders, Activity, Mic, Music, RotateCcw, Sparkles } from 'lucide-react';
import { Clip, AudioSettings, EqualizerSettings, CompressorSettings } from '../../types/editor';
import { DEFAULT_AUDIO, DEFAULT_EQUALIZER, DEFAULT_COMPRESSOR } from '../../constants/samples';
import { globalAudioEngine } from '../../utils/audioEngine';

interface AudioInspectorTabProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
}

const EQ_PRESETS = [
  { name: '默认平直 (Flat)', low: 0, mid: 0, high: 0 },
  { name: '人声清亮 (Vocal Boost)', low: -2, mid: 4, high: 3 },
  { name: '低音增强 (Bass Boost)', low: 6, mid: 0, high: -1 },
  { name: '广播收音机 (Radio FX)', low: -12, mid: 6, high: -8 },
  { name: '去齿音 (De-Ess)', low: 0, mid: -2, high: -5 },
];

export const AudioInspectorTab: React.FC<AudioInspectorTabProps> = ({ clip, onUpdate }) => {
  const audio: AudioSettings = clip.audio || DEFAULT_AUDIO;
  const eq: EqualizerSettings = audio.equalizer || DEFAULT_EQUALIZER;
  const comp: CompressorSettings = audio.compressor || DEFAULT_COMPRESSOR;

  const [vuLevel, setVuLevel] = useState<{ left: number; right: number; db: number }>({
    left: 0,
    right: 0,
    db: -60,
  });

  // Realtime VU meter polling
  useEffect(() => {
    let animId: number;
    const pollVu = () => {
      const level = globalAudioEngine.getMasterAudioLevel();
      setVuLevel(level);
      animId = requestAnimationFrame(pollVu);
    };
    animId = requestAnimationFrame(pollVu);
    return () => cancelAnimationFrame(animId);
  }, []);

  const updateAudio = (partial: Partial<AudioSettings>) => {
    const updated = {
      ...audio,
      ...partial,
    };
    onUpdate({ audio: updated });
    globalAudioEngine.updateClipAudioSettings(clip.id, updated);
  };

  const updateEq = (partial: Partial<EqualizerSettings>) => {
    const updated = {
      ...eq,
      ...partial,
    };
    updateAudio({ equalizer: updated });
  };

  const updateComp = (partial: Partial<CompressorSettings>) => {
    const updated = {
      ...comp,
      ...partial,
    };
    updateAudio({ compressor: updated });
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Volume & Live VU Meter & Pan */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-neutral-200">音频增益与声相 (Gain & Pan)</span>
          </div>

          <button
            onClick={() => updateAudio({ muted: !audio.muted })}
            className={`p-1.5 rounded-lg border transition-colors ${
              audio.muted
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
            }`}
            title={audio.muted ? '取消静音' : '静音'}
          >
            {audio.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live Stereo Decibel VU Meter */}
        <div className="flex flex-col gap-1 bg-[var(--kf-surface-1)] p-2 rounded-lg border border-white/[0.06]">
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
            <span>实时电平 (Peak dBFS)</span>
            <span className={vuLevel.db > -6 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
              {vuLevel.db.toFixed(1)} dB
            </span>
          </div>

          {/* Left Channel Bar */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, (vuLevel.left || 0) * 100))}%` }}
            />
          </div>

          {/* Right Channel Bar */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-500 transition-all duration-75"
              style={{ width: `${Math.min(100, Math.max(0, (vuLevel.right || 0) * 100))}%` }}
            />
          </div>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">音量增益:</span>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={audio.volume}
            onChange={(e) => updateAudio({ volume: parseFloat(e.target.value) })}
            className="flex-1 accent-emerald-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
            {Math.round(audio.volume * 100)}%
          </span>
        </div>

        {/* Spatial Pan */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">声相平衡:</span>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={audio.pan || 0}
            onChange={(e) => updateAudio({ pan: parseFloat(e.target.value) })}
            className="flex-1 accent-emerald-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
            {audio.pan === 0 ? 'C' : audio.pan < 0 ? `L${Math.abs(Math.round(audio.pan * 100))}` : `R${Math.round(audio.pan * 100)}`}
          </span>
        </div>

        {/* Fade In & Fade Out */}
        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-2">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>淡入 (Fade In)</span>
              <span className="font-mono">{audio.fadeIn || 0}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.2"
              value={audio.fadeIn || 0}
              onChange={(e) => updateAudio({ fadeIn: parseFloat(e.target.value) })}
              className="accent-emerald-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-neutral-400">
              <span>淡出 (Fade Out)</span>
              <span className="font-mono">{audio.fadeOut || 0}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.2"
              value={audio.fadeOut || 0}
              onChange={(e) => updateAudio({ fadeOut: parseFloat(e.target.value) })}
              className="accent-emerald-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 2. 3-Band Parametric Equalizer (EQ) with Presets */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-semibold text-neutral-200">三段均衡器 (3-Band EQ)</span>
          </div>
          <button
            onClick={() => updateEq({ enabled: !eq.enabled })}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              eq.enabled
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            }`}
          >
            {eq.enabled ? '已开启' : '旁通'}
          </button>
        </div>

        {/* EQ Presets */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {EQ_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() =>
                updateEq({
                  enabled: true,
                  lowGain: p.low,
                  midGain: p.mid,
                  highGain: p.high,
                })
              }
              className="px-2 py-1 bg-[var(--kf-surface-1)] hover:bg-neutral-800 text-neutral-300 rounded text-[10px] whitespace-nowrap transition-colors border border-neutral-800"
            >
              {p.name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Low Shelf (Bass) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">低频 100Hz:</span>
          <input
            type="range"
            min="-18"
            max="18"
            step="0.5"
            value={eq.lowGain}
            onChange={(e) => updateEq({ lowGain: parseFloat(e.target.value), enabled: true })}
            className="flex-1 accent-sky-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
            {eq.lowGain > 0 ? `+${eq.lowGain}` : eq.lowGain}dB
          </span>
        </div>

        {/* Mid Peak (Vocals) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">中频 1kHz:</span>
          <input
            type="range"
            min="-18"
            max="18"
            step="0.5"
            value={eq.midGain}
            onChange={(e) => updateEq({ midGain: parseFloat(e.target.value), enabled: true })}
            className="flex-1 accent-sky-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
            {eq.midGain > 0 ? `+${eq.midGain}` : eq.midGain}dB
          </span>
        </div>

        {/* High Shelf (Treble) */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">高频 8kHz:</span>
          <input
            type="range"
            min="-18"
            max="18"
            step="0.5"
            value={eq.highGain}
            onChange={(e) => updateEq({ highGain: parseFloat(e.target.value), enabled: true })}
            className="flex-1 accent-sky-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">
            {eq.highGain > 0 ? `+${eq.highGain}` : eq.highGain}dB
          </span>
        </div>
      </div>

      {/* 3. Dynamics Compressor */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-neutral-200">动态压缩器 (Compressor)</span>
          </div>
          <button
            onClick={() => updateComp({ enabled: !comp.enabled })}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              comp.enabled
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
            }`}
          >
            {comp.enabled ? '已开启' : '旁通'}
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">阈值 (Threshold):</span>
          <input
            type="range"
            min="-40"
            max="0"
            step="1"
            value={comp.threshold}
            onChange={(e) => updateComp({ threshold: parseInt(e.target.value), enabled: true })}
            className="flex-1 accent-purple-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">{comp.threshold}dB</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-16">压缩比 (Ratio):</span>
          <input
            type="range"
            min="1"
            max="16"
            step="0.5"
            value={comp.ratio}
            onChange={(e) => updateComp({ ratio: parseFloat(e.target.value), enabled: true })}
            className="flex-1 accent-purple-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <span className="text-neutral-400 font-mono text-[10px] w-8 text-right">{comp.ratio}:1</span>
        </div>
      </div>
    </div>
  );
};
