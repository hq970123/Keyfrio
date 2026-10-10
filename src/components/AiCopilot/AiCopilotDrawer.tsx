import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  X,
  Send,
  Loader2,
  Play,
  RotateCcw,
  Check,
  Film,
  Music,
  Type,
  Layers,
  Scissors,
  Mic,
  Volume2,
  Image as ImageIcon,
  Bot,
  User,
  Zap,
  Info,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { AiUnavailableBanner } from '../common/AiUnavailableBanner';

interface ActionItem {
  type: string;
  description: string;
  payload: any;
  executed?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actions?: ActionItem[];
  quickFollowUps?: string[];
}

export const AiCopilotDrawer: React.FC = () => {
  const {
    isAiCopilotDrawerOpen,
    closeAiCopilotDrawer,
    project,
    totalDuration,
    currentTime,
    selectedClip,
    executeAiAction,
    executeBatchAiActions,
    undo,
    setAspectRatio,
    aiAvailable,
  } = useEditor();

  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: '你好！我是你的 AI 视频剪辑助理。我可以帮你完成智能粗剪、一键配乐、自动字幕、电影级调色、片段分割及画面生成等操作。随时告诉我你的需求，或者点击下方快捷指令开始！',
      timestamp: '刚刚',
      quickFollowUps: [
        '✨ 一键智能粗剪与开场花字',
        '🎨 应用电影级青橙调色 (Teal & Orange)',
        '📝 自动生成网红爆款字幕',
        '🎵 智能匹配轻快卡点背景音乐',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isAiCopilotDrawerOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, isAiCopilotDrawerOpen]);

  if (!isAiCopilotDrawerOpen) return null;

  // Build current project context payload
  const getProjectContext = () => {
    const tracksSummary = project.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      clipCount: t.clips.length,
      clips: t.clips.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        start: c.start,
        duration: c.duration,
      })),
    }));

    return {
      name: project.name,
      aspectRatio: project.resolution.aspectRatio,
      resolution: `${project.resolution.width}x${project.resolution.height}`,
      totalDuration,
      currentTime,
      selectedClip: selectedClip
        ? {
            id: selectedClip.id,
            name: selectedClip.name,
            type: selectedClip.type,
            start: selectedClip.start,
            duration: selectedClip.duration,
            speed: selectedClip.speed,
          }
        : null,
      tracksSummary,
    };
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = promptToSend || inputMessage.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          history: historyPayload,
          projectContext: getProjectContext(),
        }),
      });

      if (!res.ok) {
        throw new Error('AI 服务请求异常');
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.reply || '已处理您的剪辑需求。',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: Array.isArray(data.actions) ? data.actions : [],
        quickFollowUps: data.quickFollowUps || [],
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Automatically execute actions if there are any
      if (Array.isArray(data.actions) && data.actions.length > 0) {
        executeBatchAiActions(data.actions);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `抱歉，处理遇到问题: ${err.message || '网络连接超时'}。请重试或检查后台配置。`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSingleAction = (action: ActionItem, msgId: string, actionIdx: number) => {
    const res = executeAiAction(action);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || !m.actions) return m;
          const nextActions = [...m.actions];
          nextActions[actionIdx] = { ...nextActions[actionIdx], executed: true };
          return { ...m, actions: nextActions };
        })
      );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 max-w-full bg-[var(--kf-surface-2)] border-l border-white/[0.06] shadow-2xl flex flex-col z-50 kf-anim-slide-in-right select-none">
      {/* Header */}
      <div className="h-12 px-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[var(--kf-surface-1)] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 via-cyan-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-purple-600/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white">AI 智能剪辑助理</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 bg-gradient-to-r from-purple-500/20 to-cyan-400/20 text-purple-300 border border-purple-500/30 rounded-full">
                Copilot 3.7
              </span>
            </div>
            <p className="text-[10px] text-neutral-400">实时时间线感知 · 指令级剪辑操控</p>
          </div>
        </div>

        <button
          onClick={closeAiCopilotDrawer}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[var(--kf-surface-4)] transition-colors"
          title="关闭 AI 助理"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <AiUnavailableBanner />

      {/* Project Status Bar */}
      <div className="px-3 py-1.5 bg-[var(--kf-surface-3)] border-b border-white/[0.06] flex items-center justify-between text-[10px] text-neutral-300 shrink-0">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-neutral-400">
            <Film className="w-3 h-3 text-cyan-300" />
            {project.tracks.length} 轨道
          </span>
          <span className="w-1 h-1 bg-neutral-600 rounded-full" />
          <span className="text-neutral-400">{totalDuration}s 总时长</span>
          <span className="w-1 h-1 bg-neutral-600 rounded-full" />
          <span className="text-cyan-300 font-mono">{currentTime.toFixed(1)}s 播放头</span>
        </div>
        <span className="px-1.5 py-0.2 bg-[var(--kf-surface-4)] text-neutral-300 rounded font-mono text-[9px]">
          {project.resolution.aspectRatio}
        </span>
      </div>

      {/* Message Chat List */}
      <div className={`flex-1 p-3 overflow-y-auto space-y-3.5 min-h-0 text-xs ${aiAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2 max-w-[92%]">
              {msg.sender === 'ai' && (
                <div className="w-5.5 h-5.5 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                  <Bot className="w-3 h-3" />
                </div>
              )}

              <div
                className={`p-2.5 rounded-xl ${
                  msg.sender === 'user'
                    ? 'bg-cyan-500 text-white rounded-br-xs shadow-sm'
                    : 'bg-[var(--kf-surface-3)] border border-white/[0.06] text-neutral-200 rounded-bl-xs'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* Structured Action Execution Cards */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1.5">
                    <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      已识别剪辑操作指令:
                    </span>
                    {msg.actions.map((act, actIdx) => (
                      <div
                        key={actIdx}
                        className="bg-[var(--kf-surface-2)] p-2 rounded-lg border border-white/[0.06] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="font-medium text-[11px] text-white block truncate">
                            {act.description || act.type}
                          </span>
                          <span className="text-[9px] text-neutral-400 font-mono">
                            {act.type}
                          </span>
                        </div>
                        <button
                          onClick={() => handleExecuteSingleAction(act, msg.id, actIdx)}
                          className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-white border border-cyan-400/30 text-[10px] font-medium flex items-center gap-1 transition-all shrink-0"
                        >
                          <Play className="w-2.5 h-2.5" />
                          执行
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick follow-ups */}
            {msg.quickFollowUps && msg.quickFollowUps.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                {msg.quickFollowUps.map((chip, cIdx) => (
                  <button
                    key={cIdx}
                    onClick={() => handleSendMessage(chip)}
                    className="text-[10px] px-2 py-1 rounded-full bg-[var(--kf-surface-3)] hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 border border-white/[0.06] hover:border-cyan-400/40 transition-all text-left truncate max-w-full"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-neutral-400 text-xs py-2 pl-2">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>AI 正在分析时间线并生成剪辑操作...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Tool Pills Bar */}
      <div className={`px-2.5 py-1.5 bg-[var(--kf-surface-1)] border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none ${aiAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}>
        <button
          onClick={() => handleSendMessage('一键智能粗剪，搭配背景音乐并加上字幕花字')}
          className="text-[10px] px-2 py-1 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] text-neutral-300 hover:text-white rounded-md border border-white/[0.06] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Wand2 className="w-3 h-3 text-purple-400" />
          智能粗剪
        </button>

        <button
          onClick={() => handleSendMessage('把当前视频调色成电影感青橙胶片风格')}
          className="text-[10px] px-2 py-1 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] text-neutral-300 hover:text-white rounded-md border border-white/[0.06] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Sliders className="w-3 h-3 text-emerald-400" />
          电影调色
        </button>

        <button
          onClick={() => handleSendMessage('为视频自动生成排版美观的网红字幕')}
          className="text-[10px] px-2 py-1 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] text-neutral-300 hover:text-white rounded-md border border-white/[0.06] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Type className="w-3 h-3 text-yellow-400" />
          爆款字幕
        </button>

        <button
          onClick={() => handleSendMessage('在当前播放头位置分割片段')}
          className="text-[10px] px-2 py-1 bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] text-neutral-300 hover:text-white rounded-md border border-white/[0.06] flex items-center gap-1 shrink-0 transition-colors"
        >
          <Scissors className="w-3 h-3 text-red-400" />
          播放头剪切
        </button>
      </div>

      {/* Input Bar */}
      <div className={`p-2.5 bg-[var(--kf-surface-2)] border-t border-white/[0.06] shrink-0 ${aiAvailable === false ? 'opacity-50 pointer-events-none' : ''}`}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-1.5 bg-[var(--kf-surface-3)] border border-white/[0.06] focus-within:border-cyan-400 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="告诉 AI 剪辑指令 (例如: 在开头加个大标题 / 换成9:16竖屏)..."
            disabled={loading || aiAvailable === false}
            className="bg-transparent text-xs text-white placeholder-neutral-500 outline-none flex-1 font-normal"
          />

          <button
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className={`p-1.5 rounded-md transition-all ${
              inputMessage.trim() && !loading
                ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-sm'
                : 'text-neutral-600 cursor-not-allowed'
            }`}
            title="发送指令"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
