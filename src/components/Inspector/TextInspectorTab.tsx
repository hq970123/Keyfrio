import React from 'react';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Sparkles,
  Palette,
  Layers,
  RotateCcw,
  Plus,
  Minus,
} from 'lucide-react';
import { Clip, TextSettings, TextAnimation } from '../../types/editor';
import { DEFAULT_TEXT } from '../../constants/samples';

interface TextInspectorTabProps {
  clip: Clip;
  onUpdate: (updates: Partial<Clip>) => void;
}

import {
  GOOGLE_FONT_GROUPS,
  GOOGLE_FONT_OPTIONS,
  SYSTEM_FONT_PRESETS,
  parsePrimaryFamily,
} from '../../constants/googleFonts';
import { ensureGoogleFontLoaded } from '../../utils/fontLoader';

const knownFontValues = new Set<string>([
  ...GOOGLE_FONT_OPTIONS.map((f) => f.stack),
  ...SYSTEM_FONT_PRESETS.map((f) => f.value),
]);

const TEXT_STYLE_PRESETS = [
  {
    name: '经典电影字幕',
    color: '#ffffff',
    strokeColor: '#000000',
    strokeWidth: 3,
    bgColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 6,
  },
  {
    name: '爆款黄字粗描边',
    color: '#fbbf24',
    strokeColor: '#000000',
    strokeWidth: 5,
    bgColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.9)',
    shadowBlur: 8,
  },
  {
    name: '赛博霓虹蓝粉',
    color: '#38bdf8',
    strokeColor: '#ec4899',
    strokeWidth: 3,
    bgColor: 'rgba(15,23,42,0.8)',
    shadowColor: '#38bdf8',
    shadowBlur: 14,
  },
  {
    name: '极简黑底白字卡片',
    color: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    bgColor: 'rgba(0,0,0,0.75)',
    bgPadding: 16,
    bgRadius: 8,
    shadowColor: 'transparent',
    shadowBlur: 0,
  },
  {
    name: '综艺活力橙红',
    color: '#f97316',
    strokeColor: '#ffffff',
    strokeWidth: 4,
    bgColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowBlur: 6,
  },
  {
    name: '纯净白字无描边',
    color: '#ffffff',
    strokeColor: 'transparent',
    strokeWidth: 0,
    bgColor: 'transparent',
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowBlur: 4,
  },
];

const QUICK_COLORS = [
  '#ffffff', '#000000', '#fbbf24', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#38bdf8', '#10b981', '#64748b',
];

export const TextInspectorTab: React.FC<TextInspectorTabProps> = ({ clip, onUpdate }) => {
  const textCfg: TextSettings = clip.text || DEFAULT_TEXT;

  const updateText = (partial: Partial<TextSettings>) => {
    onUpdate({
      text: {
        ...textCfg,
        ...partial,
      },
    });
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* 1. Content Textarea */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-semibold text-neutral-200">字幕文本内容</span>
          </div>
          <span className="text-[10px] text-neutral-500 font-mono">
            {textCfg.text.length} 字符
          </span>
        </div>

        <textarea
          value={textCfg.text}
          onChange={(e) => updateText({ text: e.target.value })}
          rows={3}
          placeholder="请输入字幕或标题文本..."
          className="w-full bg-[var(--kf-surface-1)] border border-white/[0.06] focus:border-cyan-400 rounded-lg p-2.5 text-white outline-none resize-none text-xs leading-relaxed"
        />
      </div>

      {/* 2. Quick Style Presets */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-neutral-200">艺术字与预设样式 (Presets)</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {TEXT_STYLE_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() =>
                updateText({
                  color: preset.color,
                  strokeColor: preset.strokeColor,
                  strokeWidth: preset.strokeWidth,
                  bgColor: preset.bgColor || 'transparent',
                  bgPadding: preset.bgPadding || 12,
                  bgRadius: preset.bgRadius || 6,
                  shadowColor: preset.shadowColor || 'transparent',
                  shadowBlur: preset.shadowBlur || 0,
                })
              }
              className="p-1.5 bg-[var(--kf-surface-1)] hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 rounded-lg text-[11px] text-left transition-colors truncate"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Typography (Font, Size, Align, Weight) */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <span className="font-semibold text-neutral-200">字体排版 (Typography)</span>

        {/* Font Family */}
        <div>
          <label className="text-[10px] text-neutral-400 block mb-1">选择字体：</label>
          <select
            value={textCfg.fontFamily}
            onChange={(e) => {
              const value = e.target.value;
              updateText({ fontFamily: value });
              // Start loading the picked Google Font right away so the
              // preview canvas swaps from fallback to the real face.
              void ensureGoogleFontLoaded(parsePrimaryFamily(value));
            }}
            style={{ fontFamily: textCfg.fontFamily }}
            className="w-full bg-[var(--kf-surface-1)] border border-white/[0.06] text-white p-1.5 rounded-lg outline-none text-xs cursor-pointer"
          >
            {!knownFontValues.has(textCfg.fontFamily) && (
              <option value={textCfg.fontFamily}>当前字体（自定义）</option>
            )}
            {GOOGLE_FONT_GROUPS.map((group) => (
              <optgroup key={group} label={`Google 字体 · ${group}（开源）`}>
                {GOOGLE_FONT_OPTIONS.filter((f) => f.group === group).map((f) => (
                  <option key={f.family} value={f.stack}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
            <optgroup label="系统字体">
              {SYSTEM_FONT_PRESETS.map((f) => (
                <option key={f.label} value={f.value}>
                  {f.label}
                </option>
              ))}
            </optgroup>
          </select>
          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">
            Google 字体均为开源字体，首次选用时按需从 CDN 加载；工程打开与导出时会自动预加载已用字体。
          </p>
        </div>

        {/* Font Size with Stepper */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-400 w-12">字号:</span>
          <input
            type="range"
            min="16"
            max="160"
            value={textCfg.fontSize}
            onChange={(e) => updateText({ fontSize: parseInt(e.target.value) })}
            className="flex-1 accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateText({ fontSize: Math.max(12, textCfg.fontSize - 4) })}
              className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
            >
              <Minus className="w-2.5 h-2.5" />
            </button>
            <span className="w-8 text-center font-mono text-[11px] text-white">
              {textCfg.fontSize}
            </span>
            <button
              onClick={() => updateText({ fontSize: Math.min(200, textCfg.fontSize + 4) })}
              className="p-1 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
            >
              <Plus className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>

        {/* Align & Weight / Style Buttons */}
        <div className="flex items-center justify-between pt-1">
          {/* Alignment */}
          <div className="flex bg-[var(--kf-surface-1)] p-0.5 rounded-lg border border-white/[0.06]">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => updateText({ align })}
                className={`p-1.5 rounded ${
                  textCfg.align === align ? 'bg-cyan-500 text-white' : 'text-neutral-400 hover:text-white'
                }`}
                title={align === 'left' ? '左对齐' : align === 'center' ? '居中对齐' : '右对齐'}
              >
                {align === 'left' ? <AlignLeft className="w-3.5 h-3.5" /> : align === 'center' ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>

          {/* Bold & Italic */}
          <div className="flex bg-[var(--kf-surface-1)] p-0.5 rounded-lg border border-white/[0.06] gap-0.5">
            <button
              onClick={() => updateText({ fontWeight: textCfg.fontWeight === 'bold' ? 'normal' : 'bold' })}
              className={`p-1.5 rounded ${
                textCfg.fontWeight === 'bold' ? 'bg-cyan-500 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="加粗"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => updateText({ fontStyle: textCfg.fontStyle === 'italic' ? 'normal' : 'italic' })}
              className={`p-1.5 rounded ${
                textCfg.fontStyle === 'italic' ? 'bg-cyan-500 text-white' : 'text-neutral-400 hover:text-white'
              }`}
              title="斜体"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Color, Stroke & Background */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <span className="font-semibold text-neutral-200">颜色与装饰 (Color & Stroke)</span>

        {/* Text Fill Color */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">文字颜色:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={textCfg.color}
                onChange={(e) => updateText({ color: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-none"
              />
              <span className="font-mono text-[10px] text-neutral-400 uppercase">{textCfg.color}</span>
            </div>
          </div>

          {/* Quick Swatches */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            {QUICK_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateText({ color: c })}
                className="w-4 h-4 rounded-full border border-neutral-700 shrink-0 transition-transform hover:scale-125"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Stroke Width & Color */}
        <div className="border-t border-white/[0.06] pt-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">描边粗细 ({textCfg.strokeWidth}px):</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={textCfg.strokeColor === 'transparent' ? '#000000' : textCfg.strokeColor}
                onChange={(e) => updateText({ strokeColor: e.target.value })}
                className="w-5 h-5 rounded cursor-pointer bg-transparent border-none"
              />
              <span className="font-mono text-[10px] text-neutral-400 uppercase">
                {textCfg.strokeColor === 'transparent' ? '无' : textCfg.strokeColor}
              </span>
            </div>
          </div>

          <input
            type="range"
            min="0"
            max="12"
            value={textCfg.strokeWidth}
            onChange={(e) => updateText({ strokeWidth: parseInt(e.target.value) })}
            className="w-full accent-cyan-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Background Box */}
        <div className="border-t border-white/[0.06] pt-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">背景底条 (Banner Box):</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  updateText({
                    bgColor: textCfg.bgColor === 'transparent' || !textCfg.bgColor ? 'rgba(0,0,0,0.7)' : 'transparent',
                  })
                }
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                  textCfg.bgColor && textCfg.bgColor !== 'transparent'
                    ? 'bg-cyan-500 text-white font-medium'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {textCfg.bgColor && textCfg.bgColor !== 'transparent' ? '已启用底条' : '无底条'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Animation (Text Motion) */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-semibold text-neutral-200">文字出场动效 (Motion Animation)</span>
        </div>

        <select
          value={textCfg.animation}
          onChange={(e) => updateText({ animation: e.target.value as TextAnimation })}
          className="w-full bg-[var(--kf-surface-1)] border border-white/[0.06] text-white p-1.5 rounded-lg outline-none text-xs cursor-pointer"
        >
          <option value="none">无动效 (Static)</option>
          <option value="typewriter">⌨️ 打字机逐字显现 (Typewriter)</option>
          <option value="pop">💥 弹性缩放弹出 (Pop Zoom)</option>
          <option value="slide-up">⬆️ 底部平滑滑入 (Slide Up)</option>
          <option value="fade">✨ 优雅淡入淡出 (Fade In-Out)</option>
          <option value="neon-pulse">⚡ 霓虹脉冲呼吸 (Neon Pulse)</option>
          <option value="bounce">🏀 活泼弹跳进场 (Bounce)</option>
        </select>
      </div>

      {/* Reset Text Properties */}
      <button
        onClick={() => onUpdate({ text: DEFAULT_TEXT })}
        className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white rounded-xl flex items-center justify-center gap-1.5 transition-colors font-medium text-[11px]"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>重置文字样式 (Reset Text)</span>
      </button>
    </div>
  );
};
