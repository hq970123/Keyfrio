import React, { useState, useRef } from 'react';
import {
  Upload,
  Link,
  Code,
  Sparkles,
  Repeat,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Layers,
  PlaySquare,
  ArrowRightLeft,
  ExternalLink,
} from 'lucide-react';
import { Clip } from '../../types/editor';
import { useEditor } from '../../context/EditorContext';
import { LOTTIE_PRESETS } from '../../constants/lottieSamples';

interface LottieInspectorTabProps {
  clip: Clip;
}

export const LottieInspectorTab: React.FC<LottieInspectorTabProps> = ({ clip }) => {
  const { updateClip } = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [urlInput, setUrlInput] = useState(clip.lottie?.url || '');
  const [jsonInput, setJsonInput] = useState(
    clip.lottie?.jsonData
      ? typeof clip.lottie.jsonData === 'string'
        ? clip.lottie.jsonData
        : JSON.stringify(clip.lottie.jsonData, null, 2)
      : ''
  );
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // 1. Handle Local JSON File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      showStatus('请上传有效的 .json 格式的 Lottie 动效文件', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed.layers && !parsed.v) {
          showStatus('文件不是标准的 Lottie JSON 动画格式', 'error');
          return;
        }

        const animationName = parsed.nm || file.name.replace('.json', '');
        const durationSec = (parsed.op - parsed.ip) / (parsed.fr || 30) || clip.duration;

        updateClip(clip.id, {
          name: animationName || '自定义 Lottie',
          duration: Math.max(1, Math.min(60, Math.round(durationSec * 10) / 10)),
          lottie: {
            sourceType: 'file',
            jsonData: parsed,
            url: '',
            loop: clip.lottie?.loop !== false,
            speed: clip.lottie?.speed || 1,
            direction: clip.lottie?.direction || 1,
            name: animationName,
          },
        });
        setJsonInput(JSON.stringify(parsed, null, 2));
        showStatus(`已成功载入本地动效：${animationName}`, 'success');
      } catch (err: unknown) {
        showStatus('解析 JSON 失败，请检查文件内容是否正确', 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  // 2. Handle Drag & Drop File onto Inspector
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const animationName = parsed.nm || file.name.replace('.json', '');
        updateClip(clip.id, {
          name: animationName || '自定义 Lottie',
          lottie: {
            sourceType: 'file',
            jsonData: parsed,
            url: '',
            loop: clip.lottie?.loop !== false,
            speed: clip.lottie?.speed || 1,
            direction: clip.lottie?.direction || 1,
            name: animationName,
          },
        });
        setJsonInput(JSON.stringify(parsed, null, 2));
        showStatus(`已载入：${animationName}`, 'success');
      } catch {
        showStatus('解析拖拽的 JSON 失败', 'error');
      }
    };
    reader.readAsText(file);
  };

  // 3. Handle URL Submission
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      showStatus('请输入 Lottie JSON 链接地址', 'error');
      return;
    }

    setIsLoadingUrl(true);
    try {
      // Try fetching to validate and extract metadata
      const res = await fetch(urlInput.trim());
      if (res.ok) {
        const data = await res.json();
        const animationName = data.nm || '远程 Lottie 动效';
        updateClip(clip.id, {
          name: animationName,
          lottie: {
            sourceType: 'url',
            url: urlInput.trim(),
            jsonData: data,
            loop: clip.lottie?.loop !== false,
            speed: clip.lottie?.speed || 1,
            direction: clip.lottie?.direction || 1,
            name: animationName,
          },
        });
        setJsonInput(JSON.stringify(data, null, 2));
        showStatus('已成功下载并解析远程 Lottie 动效', 'success');
      } else {
        // Fallback to path URL mode for CORS-restricted servers
        updateClip(clip.id, {
          lottie: {
            sourceType: 'url',
            url: urlInput.trim(),
            jsonData: undefined,
            loop: clip.lottie?.loop !== false,
            speed: clip.lottie?.speed || 1,
            direction: clip.lottie?.direction || 1,
          },
        });
        showStatus('已应用远程 Lottie 链接', 'success');
      }
    } catch {
      // Direct URL fallback
      updateClip(clip.id, {
        lottie: {
          sourceType: 'url',
          url: urlInput.trim(),
          jsonData: undefined,
          loop: clip.lottie?.loop !== false,
          speed: clip.lottie?.speed || 1,
          direction: clip.lottie?.direction || 1,
        },
      });
      showStatus('已设定远程动效地址', 'success');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // 4. Handle Direct Raw JSON Code Apply
  const handleJsonCodeApply = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const animationName = parsed.nm || clip.name;
      updateClip(clip.id, {
        name: animationName,
        lottie: {
          sourceType: 'json',
          jsonData: parsed,
          url: '',
          loop: clip.lottie?.loop !== false,
          speed: clip.lottie?.speed || 1,
          direction: clip.lottie?.direction || 1,
          name: animationName,
        },
      });
      showStatus('Lottie 源码已更新并实时生效', 'success');
    } catch {
      showStatus('代码语法错误，无法解析为 JSON', 'error');
    }
  };

  // 5. Apply Preset
  const handleApplyPreset = (presetId: string) => {
    const preset = LOTTIE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    updateClip(clip.id, {
      name: preset.name,
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
    setJsonInput(JSON.stringify(preset.jsonData, null, 2));
    showStatus(`已切换为：${preset.name}`, 'success');
  };

  const isLoop = clip.lottie?.loop !== false;
  const currentSpeed = clip.lottie?.speed || 1;
  const currentDirection = clip.lottie?.direction || 1;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Notification Toast */}
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

      {/* Section 1: File Upload & Drag Box */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold text-neutral-300 flex items-center gap-1">
          <Upload className="w-3 h-3 text-cyan-300" />
          <span>上传本地 Lottie 动画文件 (.json)</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-[#2a2d3d] hover:border-cyan-400 hover:bg-cyan-400/5 bg-[var(--kf-surface-3)] rounded-lg p-3 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-1.5"
        >
          <div className="w-7 h-7 rounded-full bg-cyan-400/10 text-cyan-300 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileJson className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-neutral-200 group-hover:text-cyan-300">
            点击或拖拽上传 Lottie JSON 文件
          </span>
          <span className="text-[9px] text-neutral-500">支持 After Effects 导出的 Bodymovin JSON</span>
        </div>
      </div>

      {/* Section 2: Paste Lottie URL */}
      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
        <label className="text-[10px] font-semibold text-neutral-300 flex items-center gap-1">
          <Link className="w-3 h-3 text-cyan-400" />
          <span>粘贴 Lottie 网络链接 (URL)</span>
        </label>

        <div className="flex gap-1.5">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://.../animation.json"
            className="flex-1 bg-[var(--kf-surface-3)] border border-white/[0.06] focus:border-cyan-400 rounded px-2 py-1 text-white text-[11px] outline-none"
          />
          <button
            onClick={handleUrlSubmit}
            disabled={isLoadingUrl}
            className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-white rounded font-medium text-[11px] transition-colors shrink-0 flex items-center gap-1"
          >
            {isLoadingUrl ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <span>载入</span>
            )}
          </button>
        </div>

        {/* Sample Remote Links */}
        <div className="flex items-center gap-1 overflow-x-auto text-[9px] text-neutral-400 mt-0.5">
          <span>示例链接:</span>
          <button
            onClick={() => {
              const u = 'https://assets2.lottiefiles.com/packages/lf20_touohxv0.json';
              setUrlInput(u);
            }}
            className="bg-[var(--kf-surface-3)] hover:bg-[#20222e] px-1.5 py-0.5 rounded text-neutral-300 hover:text-white border border-white/[0.06] transition-colors"
          >
            🚀 火箭
          </button>
          <button
            onClick={() => {
              const u = 'https://assets9.lottiefiles.com/packages/lf20_m6cu9m91.json';
              setUrlInput(u);
            }}
            className="bg-[var(--kf-surface-3)] hover:bg-[#20222e] px-1.5 py-0.5 rounded text-neutral-300 hover:text-white border border-white/[0.06] transition-colors"
          >
            👍 点赞
          </button>
          <button
            onClick={() => {
              const u = 'https://assets3.lottiefiles.com/packages/lf20_j1adxtyb.json';
              setUrlInput(u);
            }}
            className="bg-[var(--kf-surface-3)] hover:bg-[#20222e] px-1.5 py-0.5 rounded text-neutral-300 hover:text-white border border-white/[0.06] transition-colors"
          >
            🎉 礼花
          </button>
        </div>
      </div>

      {/* Section 3: Built-in Presets */}
      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
        <label className="text-[10px] font-semibold text-neutral-300 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>精选内置矢量动效</span>
          </span>
          <span className="text-[9px] text-neutral-500 font-normal">一键替换</span>
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          {LOTTIE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleApplyPreset(p.id)}
              className="bg-[var(--kf-surface-3)] hover:bg-[#202230] border border-white/[0.06] hover:border-amber-400/60 rounded p-1.5 flex flex-col items-center justify-center gap-1 transition-all text-center group"
            >
              <span className="text-lg group-hover:scale-115 transition-transform">{p.icon}</span>
              <span className="text-[9px] text-neutral-300 truncate w-full font-medium">{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section 4: Playback Controls & Loops */}
      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-2.5">
        <span className="text-[10px] font-semibold text-neutral-300">播放行为控制</span>

        {/* Loop Toggle */}
        <div className="flex items-center justify-between bg-[var(--kf-surface-3)] p-1.5 rounded border border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-neutral-300 text-[11px]">
            <Repeat className="w-3.5 h-3.5 text-cyan-300" />
            <span>循环播放动画</span>
          </div>
          <button
            onClick={() =>
              updateClip(clip.id, {
                lottie: {
                  ...clip.lottie,
                  sourceType: clip.lottie?.sourceType || 'preset',
                  loop: !isLoop,
                },
              })
            }
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              isLoop ? 'bg-cyan-500' : 'bg-neutral-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                isLoop ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Direction Switch */}
        <div className="flex items-center justify-between bg-[var(--kf-surface-3)] p-1.5 rounded border border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-neutral-300 text-[11px]">
            <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
            <span>播放方向</span>
          </div>
          <div className="flex bg-[var(--kf-surface-1)] rounded p-0.5 border border-white/[0.06] text-[10px]">
            <button
              onClick={() =>
                updateClip(clip.id, {
                  lottie: {
                    ...clip.lottie,
                    sourceType: clip.lottie?.sourceType || 'preset',
                    direction: 1,
                  },
                })
              }
              className={`px-2 py-0.5 rounded transition-colors ${
                currentDirection === 1 ? 'bg-cyan-500 text-white font-medium' : 'text-neutral-400'
              }`}
            >
              正放 ▶
            </button>
            <button
              onClick={() =>
                updateClip(clip.id, {
                  lottie: {
                    ...clip.lottie,
                    sourceType: clip.lottie?.sourceType || 'preset',
                    direction: -1,
                  },
                })
              }
              className={`px-2 py-0.5 rounded transition-colors ${
                currentDirection === -1 ? 'bg-cyan-500 text-white font-medium' : 'text-neutral-400'
              }`}
            >
              倒放 ◀
            </button>
          </div>
        </div>
      </div>

      {/* Section 5: Raw JSON Code Editor (Collapsible) */}
      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-2.5">
        <button
          onClick={() => setShowJsonEditor(!showJsonEditor)}
          className="flex items-center justify-between text-neutral-400 hover:text-neutral-200 text-[10px] w-full"
        >
          <span className="flex items-center gap-1 font-semibold">
            <Code className="w-3 h-3 text-emerald-400" />
            <span>Lottie JSON 源码编辑器</span>
          </span>
          <span className="text-[9px] text-cyan-300">{showJsonEditor ? '收起 ▲' : '展开代码 ▼'}</span>
        </button>

        {showJsonEditor && (
          <div className="flex flex-col gap-1.5 animate-fadeIn">
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="在此粘贴 Lottie JSON 源代码..."
              rows={5}
              className="w-full bg-[var(--kf-surface-1)] border border-white/[0.06] focus:border-emerald-500 rounded p-1.5 text-emerald-400 font-mono text-[9px] outline-none resize-y"
            />
            <button
              onClick={handleJsonCodeApply}
              className="w-full py-1 bg-[var(--kf-surface-3)] hover:bg-emerald-600 text-neutral-300 hover:text-white border border-white/[0.06] hover:border-emerald-500 rounded text-[10px] font-medium transition-colors"
            >
              格式化并应用代码 (Apply JSON)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
