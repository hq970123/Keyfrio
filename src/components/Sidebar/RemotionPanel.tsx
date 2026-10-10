import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  Loader2,
  MonitorPlay,
  ServerCrash,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface RemotionPropField {
  key: string;
  label: string;
  type: 'text' | 'color' | 'number';
}

interface RemotionTemplate {
  id: string;
  name: string;
  description: string;
  format: 'mp4' | 'webm-alpha';
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  fields: RemotionPropField[];
  defaultProps: Record<string, string | number>;
}

interface JobState {
  jobId: string;
  status: 'queued' | 'rendering' | 'done' | 'error';
  progress: number;
  error?: string;
  downloadUrl?: string;
}

export const RemotionPanel: React.FC = () => {
  const { addMediaToTimeline } = useEditor();

  const [templates, setTemplates] = useState<RemotionTemplate[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [propsByTemplate, setPropsByTemplate] = useState<
    Record<string, Record<string, string | number>>
  >({});
  const [job, setJob] = useState<JobState | null>(null);
  const [adding, setAdding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const pollTimer = useRef<number | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  useEffect(() => {
    let cancelled = false;
    fetch('/api/remotion/templates')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list: RemotionTemplate[] = data.templates ?? [];
        setTemplates(list);
        if (list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => {
        if (!cancelled) {
          setServerError(
            '无法连接本地服务端。Remotion 模板渲染需要在服务端进行，请通过 npm run dev（或 npm start）启动 Keyfrio 后再试。'
          );
        }
      });
    return () => {
      cancelled = true;
      if (pollTimer.current) window.clearInterval(pollTimer.current);
    };
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;
  const currentProps: Record<string, string | number> = selected
    ? { ...selected.defaultProps, ...(propsByTemplate[selected.id] ?? {}) }
    : {};

  const updateProp = (key: string, value: string | number) => {
    if (!selected) return;
    setPropsByTemplate((prev) => ({
      ...prev,
      [selected.id]: { ...(prev[selected.id] ?? selected.defaultProps), [key]: value },
    }));
  };

  const isRendering = job?.status === 'queued' || job?.status === 'rendering';

  const handleRender = async () => {
    if (!selected || isRendering) return;
    setJob(null);
    try {
      const res = await fetch('/api/remotion/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selected.id, props: currentProps }),
      });
      const data = await res.json();
      if (!res.ok || !data.jobId) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const jobId: string = data.jobId;
      setJob({ jobId, status: 'queued', progress: 0 });

      pollTimer.current = window.setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/remotion/render/${jobId}`);
          const pollData: JobState & { jobId: string } = await pollRes.json();
          setJob(pollData);
          if (pollData.status === 'done' && pollData.downloadUrl) {
            if (pollTimer.current) window.clearInterval(pollTimer.current);
            await handleAddToTimeline(selected, pollData.downloadUrl);
          } else if (pollData.status === 'error') {
            if (pollTimer.current) window.clearInterval(pollTimer.current);
            showStatus(`渲染失败：${pollData.error ?? '未知错误'}`, 'error');
          }
        } catch {
          if (pollTimer.current) window.clearInterval(pollTimer.current);
          setJob(null);
          showStatus('查询渲染进度失败，请确认服务端仍在运行', 'error');
        }
      }, 1200);
    } catch (e) {
      showStatus(`提交渲染失败：${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  const handleAddToTimeline = async (template: RemotionTemplate, downloadUrl: string) => {
    setAdding(true);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      await addMediaToTimeline({
        name: `${template.name}（Remotion）`,
        type: 'video',
        sourceUrl: url,
        sourceBlob: blob,
        duration: template.durationInFrames / template.fps,
      } as never);
      showStatus(`「${template.name}」已渲染并添加到时间线！`, 'success');
    } catch (e) {
      showStatus(
        `渲染完成但添加到时间线失败：${e instanceof Error ? e.message : String(e)}`,
        'error'
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-bold text-xs text-white flex items-center gap-1.5">
          <MonitorPlay className="w-3.5 h-3.5 text-cyan-400" />
          Remotion 模板 (Templates)
        </span>
        <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium">
          服务端渲染
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3">
        {statusMessage && (
          <div
            className={`p-2 rounded-md flex items-center gap-1.5 text-[11px] ${
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
            <span>{statusMessage.text}</span>
          </div>
        )}

        {serverError ? (
          <div className="border border-red-500/30 bg-red-950/40 rounded-lg p-3 flex flex-col gap-2">
            <span className="flex items-center gap-1.5 font-bold text-red-300">
              <ServerCrash className="w-4 h-4" /> 服务端不可用
            </span>
            <p className="text-[11px] leading-relaxed text-red-200/80">{serverError}</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="flex items-center gap-2 text-neutral-400 p-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> 正在加载模板列表…
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {templates.map((t) => {
                const active = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={`text-left rounded-lg border p-2.5 transition-all ${
                      active
                        ? 'border-cyan-400/60 bg-cyan-400/10'
                        : 'border-white/[0.08] bg-[var(--kf-surface-3)] hover:border-cyan-400/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{t.name}</span>
                      <span className="font-mono text-[9px] text-neutral-400">
                        {t.format === 'webm-alpha' ? 'WebM 透明' : 'MP4'} ·{' '}
                        {(t.durationInFrames / t.fps).toFixed(0)}s
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-400">
                      {t.description}
                    </p>
                    <p className="mt-1 font-mono text-[9px] text-neutral-500">
                      {t.width}×{t.height} · {t.fps}fps · Remotion composition
                    </p>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-3">
                <span className="font-bold text-white">模板参数</span>
                {selected.fields.map((field) => (
                  <label key={field.key} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-neutral-400">{field.label}</span>
                    {field.type === 'color' ? (
                      <span className="flex items-center gap-2 flex-1">
                        <input
                          type="color"
                          value={String(currentProps[field.key] ?? '#000000')}
                          onChange={(e) => updateProp(field.key, e.target.value)}
                          className="h-7 w-10 cursor-pointer rounded border border-white/10 bg-transparent"
                        />
                        <span className="font-mono text-[10px] text-neutral-400">
                          {String(currentProps[field.key] ?? '')}
                        </span>
                      </span>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={String(currentProps[field.key] ?? '')}
                        onChange={(e) =>
                          updateProp(
                            field.key,
                            field.type === 'number' ? Number(e.target.value) : e.target.value
                          )
                        }
                        className="kf-input flex-1 min-w-0 px-2 py-1.5 text-white"
                      />
                    )}
                  </label>
                ))}

                <button
                  onClick={handleRender}
                  disabled={isRendering || adding}
                  className="kf-btn kf-btn-primary mt-1 px-3 py-2 text-xs"
                >
                  {isRendering || adding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Clapperboard className="w-4 h-4" />
                  )}
                  {adding
                    ? '正在添加到时间线…'
                    : isRendering
                      ? `渲染中 ${(Math.round((job?.progress ?? 0) * 100))}%`
                      : '渲染并添加到时间线'}
                </button>

                {isRendering && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-cyan-400 transition-all"
                      style={{ width: `${Math.round((job?.progress ?? 0) * 100)}%` }}
                    />
                  </div>
                )}
                <p className="text-[10px] leading-relaxed text-neutral-500">
                  渲染在本地服务端以 Remotion + 无头 Chrome 逐帧完成，首次渲染需要打包模板与启动浏览器，会明显慢于后续渲染。渲染产物会作为视频素材落到时间线。
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
