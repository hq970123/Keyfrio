import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Wand2,
  ListPlus,
  Loader2,
  FileText,
  Zap,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { AiUnavailableBanner } from '../common/AiUnavailableBanner';

export const AiModal: React.FC = () => {
  const { isAiModalOpen, closeAiModal, project, totalDuration, addTrack, addClip, aiAvailable } = useEditor();
  const [tab, setTab] = useState<'captions' | 'script' | 'titles'>('captions');
  const [loading, setLoading] = useState(false);

  const [captionInput, setCaptionInput] = useState(
    '欢迎观看本期精彩视频！今天我们来探索最新的剪辑特效技巧，从零开始打造高质感画面。'
  );
  const [scriptTopic, setScriptTopic] = useState('3步剪出电影感旅行Vlog短视频');
  const [titleInput, setTitleInput] = useState('旅行Vlog剪辑教学');
  const [result, setResult] = useState<any>(null);

  if (!isAiModalOpen) return null;

  const handleGenerateCaptions = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/ai/auto-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: captionInput,
          duration: totalDuration || 15,
          style: 'vlog',
          language: 'zh-CN',
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      alert('AI 生成字幕失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCaptions = () => {
    if (!result?.subtitles) return;
    const newTrack = addTrack('text', 'AI 智能字幕 (AI Captions)');

    result.subtitles.forEach((sub: any, idx: number) => {
      addClip(newTrack.id, {
        name: `字幕 ${idx + 1}`,
        type: 'text',
        start: sub.start,
        duration: sub.duration,
        text: {
          text: sub.text,
          fontFamily: 'system-ui, sans-serif',
          fontSize: 38,
          fontWeight: '600',
          fontStyle: 'normal',
          color: '#FFFFFF',
          strokeColor: '#000000',
          strokeWidth: 2,
          bgColor: 'rgba(0, 0, 0, 0.75)',
          bgPadding: 12,
          bgRadius: 6,
          align: 'center',
          shadowColor: 'rgba(0,0,0,0.6)',
          shadowBlur: 8,
          shadowOffsetX: 0,
          shadowOffsetY: 2,
          animation: 'slide-up',
          letterSpacing: 1,
          lineHeight: 1.2,
        },
        transform: {
          x: 0,
          y: 36,
          scale: 1,
          rotation: 0,
          opacity: 1,
          zIndex: 10,
        },
      });
    });

    closeAiModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[var(--kf-surface-2)] border border-white/[0.06] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden text-neutral-200 text-xs">
        {/* Header */}
        <div className="h-10 px-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[var(--kf-surface-1)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <span className="font-semibold text-xs text-white block">AI 智能创作实验室 (OpenCut AI)</span>
            </div>
          </div>
          <button
            onClick={closeAiModal}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[var(--kf-surface-3)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <AiUnavailableBanner />

        {/* Tab switcher */}
        <div className="flex border-b border-white/[0.06] bg-[var(--kf-surface-1)] p-1 gap-1">
          {[
            { id: 'captions', label: '自动字幕识别', icon: Wand2 },
            { id: 'script', label: '短视频分镜脚本', icon: FileText },
            { id: 'titles', label: '爆款吸睛标题', icon: Zap },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as any);
                setResult(null);
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 font-medium transition-all text-xs ${
                tab === t.id
                  ? 'bg-purple-600/20 border border-purple-500/40 text-purple-300'
                  : 'text-neutral-400 hover:text-white hover:bg-[var(--kf-surface-3)]'
              }`}
            >
              <t.icon className="w-3 h-3" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={`p-4 flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto ${aiAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}>
          {tab === 'captions' && (
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-semibold text-neutral-400 block">
                请输入视频旁白或台词文本（AI 将智能分句并计算起止时间对齐时间线）：
              </label>
              <textarea
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                rows={3}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-purple-500 rounded-lg p-2.5 text-white outline-none resize-none text-xs"
                placeholder="粘贴台词文案..."
              />

              <button
                onClick={handleGenerateCaptions}
                disabled={loading || !captionInput.trim()}
                className="py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer disabled:opacity-50 text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini 正在分析切片与对齐时间码...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>开始智能生成并对齐字幕</span>
                  </>
                )}
              </button>

              {result?.subtitles && (
                <div className="flex flex-col gap-2 mt-1 bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-emerald-400 text-xs">
                      ✅ 成功对齐生成 {result.subtitles.length} 条字幕片段
                    </span>
                    <button
                      onClick={handleApplyCaptions}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium flex items-center gap-1 text-xs shadow-sm"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      <span>导入时间线</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto mt-1 pr-1">
                    {result.subtitles.map((sub: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-[var(--kf-surface-1)] p-1.5 rounded border border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <span className="text-neutral-200">{sub.text}</span>
                        <span className="text-neutral-500 font-mono text-[9px]">
                          {sub.start.toFixed(1)}s ~ {(sub.start + sub.duration).toFixed(1)}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'script' && (
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-semibold text-neutral-400 block">视频主题 / 关键词：</label>
              <input
                type="text"
                value={scriptTopic}
                onChange={(e) => setScriptTopic(e.target.value)}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-white outline-none text-xs"
                placeholder="例如: 3分钟快速掌握街拍人像调色"
              />

              <button
                onClick={async () => {
                  setLoading(true);
                  setResult(null);
                  try {
                    const res = await fetch('/api/ai/video-script', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ topic: scriptTopic, platform: 'douyin/tiktok', targetDuration: 20 }),
                    });
                    const d = await res.json();
                    setResult(d);
                  } catch (e) {
                    alert('生成失败');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !scriptTopic.trim()}
                className="py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/30 transition-all cursor-pointer text-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>生成爆款分镜脚本</span>
              </button>

              {result?.scenes && (
                <div className="flex flex-col gap-2 bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg p-3 mt-1">
                  <div className="p-2 rounded bg-purple-950/50 border border-purple-500/30 text-purple-200 text-xs">
                    <span className="font-bold text-yellow-300">🔥 黄金Hook:</span> {result.hook}
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {result.scenes.map((s: any, idx: number) => (
                      <div key={idx} className="bg-[var(--kf-surface-1)] p-2 rounded border border-white/[0.06] flex flex-col gap-0.5 text-xs">
                        <span className="font-medium text-cyan-300">
                          镜头 {idx + 1}: {s.title} ({s.duration}s)
                        </span>
                        <span className="text-neutral-300">台词: {s.spokenText}</span>
                        <span className="text-amber-400 text-[10px]">花字: {s.overlayText}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'titles' && (
            <div className="flex flex-col gap-2.5">
              <label className="text-[10px] font-semibold text-neutral-400 block">输入视频基础标题：</label>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-amber-500 rounded-lg px-2.5 py-1.5 text-white outline-none text-xs"
                placeholder="例如: 剪辑技巧"
              />

              <button
                onClick={async () => {
                  setLoading(true);
                  setResult(null);
                  try {
                    const res = await fetch('/api/ai/enhance-title', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ title: titleInput }),
                    });
                    const d = await res.json();
                    setResult(d);
                  } catch (e) {
                    alert('生成失败');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !titleInput.trim()}
                className="py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/30 transition-all cursor-pointer text-xs"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>生成爆款吸睛花字标题</span>
              </button>

              {result?.suggestions && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {result.suggestions.map((sug: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        addClip('track-text-1', {
                          name: sug.headline,
                          type: 'text',
                          duration: 4,
                          text: {
                            text: sug.headline,
                            fontFamily: 'system-ui, sans-serif',
                            fontSize: 54,
                            fontWeight: '800',
                            fontStyle: 'normal',
                            color: sug.textColor || '#FFE600',
                            strokeColor: sug.strokeColor || '#000000',
                            strokeWidth: 4,
                            bgColor: sug.bgColor || 'transparent',
                            bgPadding: 16,
                            bgRadius: 8,
                            align: 'center',
                            shadowColor: 'rgba(0,0,0,0.8)',
                            shadowBlur: 12,
                            shadowOffsetX: 2,
                            shadowOffsetY: 4,
                            animation: (sug.animation as any) || 'pop',
                            letterSpacing: 1,
                            lineHeight: 1.2,
                          },
                        });
                        closeAiModal();
                      }}
                      className="p-2.5 bg-[var(--kf-surface-3)] hover:bg-[#1f202d] border border-white/[0.06] hover:border-amber-400/50 rounded-lg flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-xs text-white">{sug.headline}</span>
                        {sug.subtitle && <span className="text-[9px] text-neutral-400">{sug.subtitle}</span>}
                      </div>
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[9px] font-medium">
                        + 添加到时间线
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
