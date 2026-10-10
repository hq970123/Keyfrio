import React from 'react';
import { Type, Plus, Sparkles, MessageSquare } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { TEXT_TEMPLATES } from '../../constants/samples';

export const TextPanel: React.FC = () => {
  const { addMediaToTimeline, openAiModal } = useEditor();

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      {/* Header */}
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-bold text-xs text-white flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-amber-400" />
          文字花字 (Text)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
        {/* AI Subtitle Generator Trigger */}
        <button
          onClick={openAiModal}
          className="w-full p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/25 hover:border-purple-400 flex items-center justify-between text-left transition-all group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">✨ AI 智能字幕 & 文案</span>
              <span className="text-[9px] text-purple-300/80">一键生成精准对齐的字幕轨道</span>
            </div>
          </div>
          <Plus className="w-3.5 h-3.5 text-purple-400" />
        </button>

        {/* Basic Text Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">基础文本</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() =>
                addMediaToTimeline({
                  name: '普通标题',
                  type: 'text',
                  duration: 4,
                  text: {
                    text: '大标题文字',
                    fontSize: 54,
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    align: 'center',
                    strokeColor: '#000000',
                    strokeWidth: 2,
                    bgColor: 'transparent',
                    animation: 'none',
                  },
                })
              }
              className="p-2 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-amber-500 rounded-md flex flex-col items-center justify-center gap-0.5 transition-all"
            >
              <span className="text-sm font-bold text-white">大标题</span>
              <span className="text-[9px] text-neutral-500">Main Title</span>
            </button>

            <button
              onClick={() =>
                addMediaToTimeline({
                  name: '普通字幕条',
                  type: 'text',
                  duration: 4,
                  text: {
                    text: '请在此输入字幕内容',
                    fontSize: 36,
                    fontWeight: '600',
                    color: '#FFFFFF',
                    align: 'center',
                    strokeColor: 'transparent',
                    strokeWidth: 0,
                    bgColor: 'rgba(0,0,0,0.6)',
                    bgPadding: 12,
                    bgRadius: 6,
                    animation: 'slide-up',
                  },
                })
              }
              className="p-2 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-amber-500 rounded-md flex flex-col items-center justify-center gap-0.5 transition-all"
            >
              <span className="text-xs font-semibold text-neutral-200 bg-black/60 px-1.5 py-0.2 rounded">字幕条</span>
              <span className="text-[9px] text-neutral-500">Subtitle Box</span>
            </button>
          </div>
        </div>

        {/* Text Template Presets */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">热门花字模板</span>
          <div className="flex flex-col gap-1.5">
            {TEXT_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() =>
                  addMediaToTimeline({
                    name: tpl.name,
                    type: 'text',
                    duration: 5,
                    text: tpl.config,
                  })
                }
                className="p-2 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-amber-400 rounded-md flex items-center justify-between cursor-pointer transition-all group"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[9px] text-neutral-500 font-semibold uppercase">{tpl.category}</span>
                  <span
                    className="truncate text-xs"
                    style={{
                      color: tpl.config.color,
                      textShadow:
                        tpl.config.shadowColor !== 'transparent'
                          ? `0 2px 8px ${tpl.config.shadowColor}`
                          : undefined,
                    }}
                  >
                    {tpl.config.text}
                  </span>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#222430] group-hover:bg-amber-500 group-hover:text-black flex items-center justify-center text-neutral-300 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
