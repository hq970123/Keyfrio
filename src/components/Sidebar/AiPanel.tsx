import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  MessageSquare,
  FileText,
  Zap,
  Check,
  Loader2,
  ListPlus,
  Play,
  Volume2,
  Mic,
  Image as ImageIcon,
  Sliders,
  Send,
  Scissors,
  Layers,
  ArrowRight,
  Bot,
  RefreshCw,
  Clapperboard,
  Activity,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { DEFAULT_TEXT, DEFAULT_TRANSFORM, DEFAULT_FILTER } from '../../constants/samples';
import { extractWaveformFromBlob, pcmBase64ToWavBlob } from '../../utils/audio';
import { AiUnavailableBanner } from '../common/AiUnavailableBanner';

export const AiPanel: React.FC = () => {
  const {
    project,
    addTrack,
    addClip,
    totalDuration,
    currentTime,
    executeAiAction,
    executeBatchAiActions,
    openAiCopilotDrawer,
    aiAvailable,
  } = useEditor();

  const [aiMode, setAiMode] = useState<'copilot' | 'tts' | 'captions' | 'script' | 'image' | 'audit'>('copilot');
  const [loading, setLoading] = useState(false);

  // Copilot Quick Chat State
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string; actions?: any[] }>>([
    {
      sender: 'ai',
      text: '你好！我是 AI 剪辑助手。你可以输入“在开头加个大标题”、“帮我应用电影调色”、“一键智能粗剪”，我将为你直接执行剪辑操作！',
    },
  ]);

  // TTS State
  const [ttsText, setTtsText] = useState('欢迎收看本期视频，今天我们将一起探索电影级视频剪辑的秘密技巧！');
  const [ttsVoice, setTtsVoice] = useState<'Kore' | 'Puck' | 'Zephyr' | 'Fenrir' | 'Charon'>('Kore');
  const [ttsResultAudio, setTtsResultAudio] = useState<string | null>(null);
  const [ttsAudioBlob, setTtsAudioBlob] = useState<Blob | null>(null);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsDuration, setTtsDuration] = useState<number | null>(null);

  // Captions State
  const [captionInput, setCaptionInput] = useState('今天给大家分享3个超实用剪辑技巧，让你也能轻松做出电影感大片！第一步是节奏把控，第二步是色彩情绪，第三步是音效细节...');
  const [captionStyle, setCaptionStyle] = useState('vlog');

  // Script State
  const [scriptTopic, setScriptTopic] = useState('如何用手机拍出电影质感短视频教程');

  // Image Gen State
  const [imagePrompt, setImagePrompt] = useState('赛博朋克霓虹雨夜街道，电影级光影质感');

  // Audit State
  const [auditResult, setAuditResult] = useState<any>(null);
  const [resultData, setResultData] = useState<any>(null);

  // 1. Quick Copilot Send
  const handleSendCopilot = async (overridePrompt?: string) => {
    const text = overridePrompt || chatPrompt.trim();
    if (!text || loading) return;

    setChatHistory((prev) => [...prev, { sender: 'user', text }]);
    setChatPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          projectContext: {
            name: project.name,
            aspectRatio: project.resolution.aspectRatio,
            totalDuration,
            currentTime,
            tracksCount: project.tracks.length,
          },
        }),
      });
      const data = await res.json();
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: data.reply || '已处理完毕。',
          actions: data.actions || [],
        },
      ]);

      if (Array.isArray(data.actions) && data.actions.length > 0) {
        executeBatchAiActions(data.actions);
      }
    } catch (e: any) {
      console.error(e);
      setChatHistory((prev) => [
        ...prev,
        { sender: 'ai', text: `请求出现问题: ${e.message || '网络连接超时'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 2. TTS Voiceover Generation
  const handleGenerateTTS = async () => {
    if (!ttsText.trim() || loading) return;
    setLoading(true);
    setTtsResultAudio(null);
    setTtsAudioBlob(null);
    setTtsDuration(null);
    if (ttsAudioUrl) {
      URL.revokeObjectURL(ttsAudioUrl);
      setTtsAudioUrl(null);
    }
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: ttsText,
          voice: ttsVoice,
        }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        const { blob, duration } = pcmBase64ToWavBlob(data.audioBase64, 24000);
        const url = URL.createObjectURL(blob);
        setTtsResultAudio(data.audioBase64);
        setTtsAudioBlob(blob);
        setTtsAudioUrl(url);
        setTtsDuration(duration);
      }
    } catch (e: any) {
      console.error(e);
      alert('语音生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // Apply TTS audio into timeline
  const handleApplyTTSToTimeline = async () => {
    if (!ttsAudioBlob || !ttsAudioUrl || ttsDuration === null) {
      alert('请先生成语音后再添加至时间线');
      return;
    }
    let audioTrack = project.tracks.find((t) => t.type === 'audio');
    if (!audioTrack) {
      audioTrack = addTrack('audio', 'AI 旁白配音 (Voiceover)');
    }

    const waveform = await extractWaveformFromBlob(ttsAudioBlob, 80);
    addClip(audioTrack.id, {
      name: `AI 配音 (${ttsVoice}): ${ttsText.slice(0, 8)}...`,
      type: 'audio',
      start: currentTime,
      duration: ttsDuration,
      sourceUrl: ttsAudioUrl,
      sourceBlob: ttsAudioBlob,
      audio: { volume: 0.95, fadeIn: 0.2, fadeOut: 0.4, muted: false, pan: 0 },
      audioWaveform: waveform,
    });

    alert(`🎉 成功将 AI 旁白语音导入音频轨 (时长约 ${ttsDuration.toFixed(1)}s)！`);
  };

  // 3. Auto Captions Generator
  const handleGenerateCaptions = async () => {
    setLoading(true);
    setResultData(null);
    try {
      const res = await fetch('/api/ai/auto-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: captionInput,
          duration: totalDuration || 15,
          style: captionStyle,
          language: 'zh-CN',
        }),
      });
      const data = await res.json();
      setResultData(data);
    } catch (e: any) {
      console.error(e);
      alert('AI 生成字幕失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySubtitlesToTimeline = () => {
    if (!resultData?.subtitles || !Array.isArray(resultData.subtitles)) return;
    executeAiAction({
      type: 'ADD_SUBTITLES',
      payload: { subtitles: resultData.subtitles },
    });
    alert(`🎉 成功生成并导入 ${resultData.subtitles.length} 条字幕片段到时间线！`);
  };

  // 4. Video Script Generator
  const handleGenerateScript = async () => {
    setLoading(true);
    setResultData(null);
    try {
      const res = await fetch('/api/ai/video-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: scriptTopic,
          platform: 'douyin/tiktok',
          targetDuration: 20,
        }),
      });
      const data = await res.json();
      setResultData(data);
    } catch (e) {
      alert('AI 生成分镜脚本失败');
    } finally {
      setLoading(false);
    }
  };

  // 5. Image Generator
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || loading) return;
    setLoading(true);
    setResultData(null);
    try {
      const res = await fetch('/api/ai/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          aspectRatio: project.resolution.aspectRatio === '9:16' ? '9:16' : '16:9',
        }),
      });
      const data = await res.json();
      setResultData(data);
    } catch (e) {
      alert('AI 画面生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyImageToTimeline = () => {
    if (!resultData?.imageUrl) return;
    let videoTrack = project.tracks.find((t) => t.type === 'video') || addTrack('video', 'AI 画面轨道');
    addClip(videoTrack.id, {
      name: `AI 配图: ${imagePrompt.slice(0, 10)}`,
      type: 'image',
      start: currentTime,
      duration: 5,
      sourceUrl: resultData.imageUrl,
      thumbnailUrl: resultData.imageUrl,
      filter: { ...DEFAULT_FILTER },
    });
    alert('🎉 已将 AI 生成画面添加至视频轨道！');
  };

  // 6. Project Audit
  const handleAuditProject = async () => {
    setLoading(true);
    try {
      const clipsSummary = project.tracks.flatMap((t) =>
        t.clips.map((c) => ({
          track: t.name,
          type: c.type,
          name: c.name,
          start: c.start,
          duration: c.duration,
        }))
      );
      const res = await fetch('/api/ai/suggest-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipsSummary,
          videoGoal: '提升前3秒完播率并增强视觉节奏感',
        }),
      });
      const data = await res.json();
      setAuditResult(data);
    } catch (e) {
      alert('AI 工程诊断失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      {/* Top Header */}
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between bg-[var(--kf-surface-1)] shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-bold text-xs text-white">AI 智能剪辑工作室</span>
        </div>
        <button
          onClick={openAiCopilotDrawer}
          className="text-[10px] px-2 py-0.5 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 transition-all flex items-center gap-1"
        >
          <Bot className="w-3 h-3" />
          <span>全屏助理</span>
        </button>
      </div>

      <AiUnavailableBanner />

      {/* Sub Tabs */}
      <div className="grid grid-cols-3 border-b border-white/[0.06] bg-[var(--kf-surface-1)] p-1 gap-1 shrink-0">
        {[
          { id: 'copilot', label: '对话助理', icon: Bot, color: 'text-cyan-300' },
          { id: 'tts', label: 'AI 配音', icon: Mic, color: 'text-emerald-400' },
          { id: 'captions', label: '智能字幕', icon: FileText, color: 'text-amber-400' },
          { id: 'script', label: '分镜脚本', icon: Clapperboard, color: 'text-purple-400' },
          { id: 'image', label: 'AI 配图', icon: ImageIcon, color: 'text-cyan-400' },
          { id: 'audit', label: '节奏诊断', icon: Activity, color: 'text-rose-400' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = aiMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setAiMode(tab.id as any);
                setResultData(null);
              }}
              className={`py-1.5 px-1 rounded-md text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-cyan-500 text-white font-semibold shadow-xs'
                  : 'text-neutral-400 hover:text-white hover:bg-[var(--kf-surface-4)]'
              }`}
            >
              <Icon className={`w-3 h-3 ${isActive ? 'text-white' : tab.color}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 ${aiAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* 1. COPILOT CHAT MODE */}
        {aiMode === 'copilot' && (
          <div className="flex flex-col h-full gap-2">
            <div className="flex-1 overflow-y-auto space-y-2 max-h-56 pr-1">
              {chatHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg text-[11px] leading-relaxed ${
                    item.sender === 'user'
                      ? 'bg-cyan-500 text-white ml-6 text-right'
                      : 'bg-[var(--kf-surface-3)] border border-[#232532] text-neutral-200 mr-4'
                  }`}
                >
                  <p>{item.text}</p>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-1.5 text-neutral-400 text-[10px]">
                  <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                  <span>AI 正在执行剪辑操作...</span>
                </div>
              )}
            </div>

            {/* Quick action chips */}
            <div className="flex flex-wrap gap-1">
              {[
                '⚡ 一键智能成片',
                '🎨 电影级青橙滤镜',
                '📝 自动生成字幕',
                '🎵 匹配轻快BGM',
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendCopilot(chip)}
                  className="text-[9px] px-1.5 py-0.5 rounded bg-[#181a24] hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 border border-[#232532] transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-1 bg-[var(--kf-surface-3)] border border-[#232532] rounded-md px-2 py-1">
              <input
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendCopilot()}
                placeholder="告诉 AI 你的剪辑需求..."
                className="bg-transparent text-xs text-white placeholder-neutral-500 outline-none flex-1"
              />
              <button
                onClick={() => handleSendCopilot()}
                disabled={!chatPrompt.trim() || loading}
                className="p-1 text-cyan-300 hover:text-white disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* 2. TTS VOICE STUDIO */}
        {aiMode === 'tts' && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-neutral-300 block mb-1">
                选择解说音色：
              </label>
              <div className="grid grid-cols-3 gap-1">
                {(['Kore', 'Puck', 'Zephyr', 'Fenrir', 'Charon'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setTtsVoice(v)}
                    className={`py-1 rounded border text-[10px] transition-colors ${
                      ttsVoice === v
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-semibold'
                        : 'bg-[var(--kf-surface-3)] border-white/[0.06] text-neutral-400 hover:text-white'
                    }`}
                  >
                    {v === 'Kore' && '清澈女声'}
                    {v === 'Puck' && '活力男声'}
                    {v === 'Zephyr' && '磁性解说'}
                    {v === 'Fenrir' && '浑厚旁白'}
                    {v === 'Charon' && '沉稳男声'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-300 block mb-1">
                旁白配音文本：
              </label>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                rows={4}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-cyan-400 rounded-md p-2 text-xs text-white outline-none resize-none"
                placeholder="输入你要生成的旁白或台词..."
              />
            </div>

            <button
              onClick={handleGenerateTTS}
              disabled={loading || !ttsText.trim()}
              className="w-full py-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 正在合成语音...</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>生成 AI 旁白语音</span>
                </>
              )}
            </button>

            {/* TTS Success Box */}
            {ttsResultAudio && (
              <div className="bg-[var(--kf-surface-3)] border border-purple-500/30 rounded-lg p-2.5 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  语音合成完毕
                </span>
                {ttsAudioUrl && (
                  <audio
                    controls
                    src={ttsAudioUrl}
                    className="w-full h-8 rounded bg-[var(--kf-surface-4)]"
                  />
                )}
                <button
                  onClick={handleApplyTTSToTimeline}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>添加至时间线音频轨</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. CAPTIONS MODE */}
        {aiMode === 'captions' && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-neutral-300 block mb-1">
                视频台词或文案：
              </label>
              <textarea
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                rows={4}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-cyan-400 rounded-md p-2 text-xs text-white outline-none resize-none"
                placeholder="输入视频语音内容，AI将自动断句对齐时间码..."
              />
            </div>

            <button
              onClick={handleGenerateCaptions}
              disabled={loading || !captionInput.trim()}
              className="w-full py-2 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 正在识别生成字幕...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>智能识别并生成字幕</span>
                </>
              )}
            </button>

            {resultData?.subtitles && (
              <div className="bg-[var(--kf-surface-3)] border border-emerald-500/30 rounded-lg p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-[11px]">
                    ✅ 已生成 {resultData.subtitles.length} 条精准字幕
                  </span>
                  <button
                    onClick={handleApplySubtitlesToTimeline}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium flex items-center gap-1 transition-all"
                  >
                    <ListPlus className="w-3 h-3" />
                    <span>导入时间线</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. SCRIPT & STORYBOARD */}
        {aiMode === 'script' && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-neutral-300 block mb-1">
                短视频主题 / 关键词：
              </label>
              <input
                type="text"
                value={scriptTopic}
                onChange={(e) => setScriptTopic(e.target.value)}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-cyan-400 rounded-md px-2 py-1.5 text-xs text-white outline-none"
                placeholder="例如: 3个超实用剪辑技巧..."
              />
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={loading || !scriptTopic.trim()}
              className="w-full py-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 正在构思爆款分镜...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>生成分镜脚本与运镜规划</span>
                </>
              )}
            </button>

            {resultData?.scenes && (
              <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg p-2.5 flex flex-col gap-2 max-h-52 overflow-y-auto">
                <span className="font-bold text-amber-300 text-[11px]">
                  📌 开篇黄金3秒 Hook: {resultData.hook}
                </span>
                {resultData.scenes.map((sc: any, idx: number) => (
                  <div key={idx} className="bg-[var(--kf-surface-2)] p-2 rounded border border-white/[0.06] text-[10px]">
                    <span className="font-bold text-white block">分镜 {idx + 1}: {sc.title || sc.overlayText}</span>
                    <p className="text-neutral-400 mt-0.5">台词: {sc.spokenText}</p>
                    <p className="text-cyan-300 mt-0.5">画面: {sc.visualNote}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. IMAGE GENERATOR */}
        {aiMode === 'image' && (
          <div className="flex flex-col gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-neutral-300 block mb-1">
                AI 画面与插画提示词：
              </label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                rows={3}
                className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-cyan-400 rounded-md p-2 text-xs text-white outline-none resize-none"
                placeholder="描述你想要的B-Roll配图或封面背景..."
              />
            </div>

            <button
              onClick={handleGenerateImage}
              disabled={loading || !imagePrompt.trim()}
              className="w-full py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 正在渲染画面...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>生成 AI B-Roll 画面</span>
                </>
              )}
            </button>

            {resultData?.imageUrl && (
              <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg p-2.5 flex flex-col gap-2">
                <img
                  src={resultData.imageUrl}
                  alt="Generated"
                  className="w-full h-28 object-cover rounded"
                />
                <button
                  onClick={handleApplyImageToTimeline}
                  className="w-full py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1 transition-all"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>插入视频主轨道</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 6. PROJECT AUDIT */}
        {aiMode === 'audit' && (
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleAuditProject}
              disabled={loading}
              className="w-full py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>AI 正在深度分析工程节奏...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>一键诊断时间线与节奏</span>
                </>
              )}
            </button>

            {auditResult?.suggestions && (
              <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg p-2.5 flex flex-col gap-2 max-h-56 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-[#222430] pb-1.5">
                  <span className="font-bold text-xs text-white">节奏评分:</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {auditResult.overallRating} / 10
                  </span>
                </div>
                {auditResult.suggestions.map((sug: any, idx: number) => (
                  <div key={idx} className="bg-[var(--kf-surface-2)] p-2 rounded border border-white/[0.06] text-[10px]">
                    <span className="font-bold text-cyan-300">[{sug.category}]</span>
                    <p className="text-white mt-0.5">{sug.recommendation}</p>
                    {sug.actionableTip && (
                      <p className="text-neutral-400 mt-0.5 italic">💡 {sug.actionableTip}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
