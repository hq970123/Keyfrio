import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Link,
  Plus,
  FileJson,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Search,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { LOTTIE_PRESETS, LottiePreset } from '../../constants/lottieSamples';

export const LottiePanel: React.FC = () => {
  const { addMediaToTimeline } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [userLotties, setUserLotties] = useState<
    Array<{ id: string; name: string; icon: string; duration: number; jsonData: object; url?: string }>
  >([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Add Lottie Preset to Timeline
  const handleAddPreset = (preset: LottiePreset) => {
    addMediaToTimeline({
      name: preset.name,
      type: 'lottie',
      duration: preset.duration,
      lottie: {
        sourceType: 'preset',
        jsonData: preset.jsonData,
        url: preset.url || '',
        loop: true,
        speed: 1,
        direction: 1,
        name: preset.name,
      },
    });
    showStatus(`已将「${preset.name}」动效加入时间线！`, 'success');
  };

  // Upload Local Lottie JSON File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showStatus('请上传有效的 .json 格式 Lottie 动效文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const animName = parsed.nm || file.name.replace('.json', '');
        const durationSec = (parsed.op - parsed.ip) / (parsed.fr || 30) || 4;

        const newLottie = {
          id: `custom-lottie-${Date.now()}`,
          name: animName,
          icon: '✨',
          duration: Math.max(1, Math.min(60, Math.round(durationSec * 10) / 10)),
          jsonData: parsed,
        };

        setUserLotties((prev) => [newLottie, ...prev]);

        // Also add directly to timeline
        addMediaToTimeline({
          name: animName,
          type: 'lottie',
          duration: newLottie.duration,
          lottie: {
            sourceType: 'file',
            jsonData: parsed,
            url: '',
            loop: true,
            speed: 1,
            direction: 1,
            name: animName,
          },
        });

        showStatus(`成功解析并添加「${animName}」到时间线`, 'success');
      } catch {
        showStatus('解析 JSON 文件失败，请确认文件格式', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // URL Loader
  const handleUrlAdd = async () => {
    if (!urlInput.trim()) {
      showStatus('请输入有效的 Lottie JSON 链接', 'error');
      return;
    }

    setIsLoadingUrl(true);
    try {
      const res = await fetch(urlInput.trim());
      if (res.ok) {
        const data = await res.json();
        const animName = data.nm || '远程动效';
        const durationSec = (data.op - data.ip) / (data.fr || 30) || 4;

        const newLottie = {
          id: `remote-lottie-${Date.now()}`,
          name: animName,
          icon: '🌐',
          duration: Math.max(1, Math.min(60, Math.round(durationSec * 10) / 10)),
          jsonData: data,
          url: urlInput.trim(),
        };

        setUserLotties((prev) => [newLottie, ...prev]);
        addMediaToTimeline({
          name: animName,
          type: 'lottie',
          duration: newLottie.duration,
          lottie: {
            sourceType: 'url',
            url: urlInput.trim(),
            jsonData: data,
            loop: true,
            speed: 1,
            direction: 1,
            name: animName,
          },
        });
        showStatus(`已载入「${animName}」并添加至时间线`, 'success');
      } else {
        // Direct URL fallback
        addMediaToTimeline({
          name: '网络 Lottie 动效',
          type: 'lottie',
          duration: 4,
          lottie: {
            sourceType: 'url',
            url: urlInput.trim(),
            loop: true,
            speed: 1,
            direction: 1,
            name: '网络 Lottie 动效',
          },
        });
        showStatus('已将远程动效链接添加至时间线', 'success');
      }
    } catch {
      addMediaToTimeline({
        name: '网络 Lottie 动效',
        type: 'lottie',
        duration: 4,
        lottie: {
          sourceType: 'url',
          url: urlInput.trim(),
          loop: true,
          speed: 1,
          direction: 1,
        },
      });
      showStatus('已将 Lottie 链接加入时间线', 'success');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const filteredPresets = LOTTIE_PRESETS.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      {/* Panel Header */}
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-bold text-xs text-white flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Lottie 矢量动效 (Animations)
        </span>
        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium">
          JSON 渲染
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3">
        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-2 rounded-md flex items-center gap-1.5 text-[11px] animate-fadeIn ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border border-red-500/40 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            )}
            <span className="truncate">{statusMessage.text}</span>
          </div>
        )}

        {/* Upload Zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2d3d] hover:border-amber-500 hover:bg-amber-500/5 bg-[var(--kf-surface-3)] rounded-lg p-3 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-1.5"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-4 h-4" />
          </div>
          <span className="font-semibold text-xs text-neutral-200 group-hover:text-amber-400">
            导入本地 Lottie JSON 动画
          </span>
          <span className="text-[9px] text-neutral-500">点击选择或拖拽 .json 文件到这里</span>
        </div>

        {/* URL Quick Paste Input */}
        <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg p-2 flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-neutral-300 flex items-center gap-1">
            <Link className="w-3 h-3 text-cyan-400" />
            <span>粘贴 Lottie 网络链接</span>
          </span>
          <div className="flex gap-1.5">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://.../animation.json"
              className="flex-1 bg-[var(--kf-surface-1)] border border-white/[0.06] focus:border-cyan-500 rounded px-2 py-1 text-white text-[11px] outline-none"
            />
            <button
              onClick={handleUrlAdd}
              disabled={isLoadingUrl}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded font-medium text-[11px] transition-colors shrink-0 flex items-center gap-1"
            >
              {isLoadingUrl ? (
                <RotateCw className="w-3 h-3 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              <span>添加</span>
            </button>
          </div>
        </div>

        {/* User Imported Lotties */}
        {userLotties.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">我的导入动效</span>
            <div className="grid grid-cols-2 gap-1.5">
              {userLotties.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    addMediaToTimeline({
                      name: item.name,
                      type: 'lottie',
                      duration: item.duration,
                      lottie: {
                        sourceType: item.url ? 'url' : 'file',
                        jsonData: item.jsonData,
                        url: item.url,
                        loop: true,
                        speed: 1,
                        direction: 1,
                        name: item.name,
                      },
                    })
                  }
                  className="group relative bg-[var(--kf-surface-3)] hover:bg-[#202230] border border-white/[0.06] hover:border-amber-400 rounded-md p-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <span className="text-2xl group-hover:scale-115 transition-transform">{item.icon}</span>
                  <span className="text-[10px] text-neutral-200 truncate w-full text-center font-medium">
                    {item.name}
                  </span>
                  <span className="text-[8px] text-neutral-500">{item.duration}s</span>

                  <div className="absolute inset-0 bg-amber-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Preset */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索内置动效..."
            className="w-full bg-[var(--kf-surface-3)] border border-white/[0.06] rounded pl-7 pr-2 py-1 text-white text-[11px] outline-none"
          />
        </div>

        {/* Preset Animations Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
            <span>精选内置动效 ({filteredPresets.length})</span>
            <span className="text-[9px] text-neutral-500 font-normal">点击加入主轨</span>
          </span>

          <div className="grid grid-cols-2 gap-2">
            {filteredPresets.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleAddPreset(preset)}
                className="group relative bg-[var(--kf-surface-3)] hover:bg-[#202230] border border-white/[0.06] hover:border-amber-400 rounded-lg p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl group-hover:scale-115 transition-transform">
                  {preset.icon}
                </div>

                <span className="text-[11px] text-neutral-200 truncate w-full text-center font-medium">
                  {preset.name}
                </span>

                <div className="flex items-center justify-between w-full text-[9px] text-neutral-500">
                  <span className="font-mono">{preset.duration}s</span>
                  <span className="text-amber-400/80">Lottie</span>
                </div>

                {/* Hover Add Overlay */}
                <div className="absolute inset-0 bg-amber-600/30 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity">
                  <div className="w-7 h-7 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg font-bold">
                    <Plus className="w-4.5 h-4.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
