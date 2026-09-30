import React, { useState, useRef } from 'react';
import {
  Download,
  X,
  CheckCircle2,
  Film,
  Sparkles,
  Loader2,
  Play,
  Settings2,
  HardDrive,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { exportVideo, getSupportedExportMimeType } from '../../utils/exporter';
import { ExportProgress, ExportSettings } from '../../types/editor';
import { AppLogo } from '../common/AppLogo';

export const ExportModal: React.FC = () => {
  const { isExportModalOpen, closeExportModal, project, totalDuration } = useEditor();

  const [resolution, setResolution] = useState<'1080p' | '720p' | '4k' | '480p'>('1080p');
  const [fps, setFps] = useState<number>(30);
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportedBlobUrl, setExportedBlobUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const isMp4Supported = getSupportedExportMimeType('mp4') !== null;

  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isExportModalOpen) return null;

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress({ progress: 0, currentFrame: 0, totalFrames: 1, estimatedTimeRemaining: 0 });
    setExportError(null);
    setExportedBlobUrl(null);

    // Calculate dimensions
    let width = project.resolution.width;
    let height = project.resolution.height;

    if (resolution === '720p') {
      const scale = 720 / height;
      width = Math.round(width * scale);
      height = 720;
    } else if (resolution === '4k') {
      const scale = 2160 / height;
      width = Math.round(width * scale);
      height = 2160;
    } else if (resolution === '480p') {
      const scale = 480 / height;
      width = Math.round(width * scale);
      height = 480;
    }

    const settings: ExportSettings = {
      format,
      resolution: {
        width,
        height,
        label: resolution,
        aspectRatio: project.resolution.aspectRatio,
      },
      fps,
      quality,
      filename: `${project.name.replace(/\s+/g, '_')}_${resolution}_${fps}fps`,
    };

    abortControllerRef.current = new AbortController();

    try {
      const blob = await exportVideo(
        project,
        settings,
        (p) => setProgress(p),
        abortControllerRef.current.signal
      );

      const url = URL.createObjectURL(blob);
      setExportedBlobUrl(url);

      // Auto trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.filename}.${format}`;
      a.click();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Export error:', err);
        setExportError(err.message || '导出过程中发生异常');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
    closeExportModal();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#131419] border border-[#20222a] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-neutral-200 text-xs">
        {/* Header */}
        <div className="h-11 px-3.5 border-b border-[#20222a] flex items-center justify-between bg-[#101116]">
          <div className="flex items-center gap-2">
            <AppLogo className="w-5.5 h-5.5" />
            <div>
              <span className="font-semibold text-xs text-white block">导出视频 (Export Video)</span>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[#171822] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-3.5">
          {!isExporting && !exportedBlobUrl && (
            <>
              {/* Resolution selection */}
              <div>
                <label className="text-[10px] font-semibold text-neutral-400 block mb-1">导出分辨率：</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: '1080p', label: '1080P 全高清', sub: '推荐' },
                    { id: '720p', label: '720P 高清', sub: '体积小' },
                    { id: '4k', label: '4K 超清', sub: '极清' },
                    { id: '480p', label: '480P 标清', sub: '预览' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setResolution(item.id as any)}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-0.5 transition-all ${
                        resolution === item.id
                          ? 'bg-blue-600/20 border-blue-500 text-white font-medium'
                          : 'bg-[#171822] border-[#242633] text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span className="text-[11px]">{item.label}</span>
                      <span className="text-[9px] text-neutral-500">{item.sub}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format & FPS */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 block mb-1">封装格式：</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setFormat('webm')}
                      className={`p-1.5 rounded-lg border text-center transition-all text-[11px] ${
                        format === 'webm'
                          ? 'bg-blue-600/20 border-blue-500 text-white font-medium'
                          : 'bg-[#171822] border-[#242633] text-neutral-400'
                      }`}
                    >
                      WebM (VP9)
                    </button>
                    <button
                      onClick={() => setFormat('mp4')}
                      disabled={!isMp4Supported}
                      title={isMp4Supported ? '导出为 MP4 (H.264)' : '当前浏览器不支持 MP4 编码'}
                      className={`p-1.5 rounded-lg border text-center transition-all text-[11px] ${
                        !isMp4Supported
                          ? 'bg-[#171822] border-[#242633] text-neutral-600 cursor-not-allowed'
                          : format === 'mp4'
                          ? 'bg-blue-600/20 border-blue-500 text-white font-medium'
                          : 'bg-[#171822] border-[#242633] text-neutral-400'
                      }`}
                    >
                      {isMp4Supported ? 'MP4 (H.264)' : 'MP4 不可用'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-neutral-400 block mb-1">导出帧率：</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[24, 30, 60].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFps(f)}
                        className={`p-1.5 rounded-lg border text-center transition-all text-[11px] ${
                          fps === f
                            ? 'bg-blue-600/20 border-blue-500 text-white font-medium'
                            : 'bg-[#171822] border-[#242633] text-neutral-400'
                        }`}
                      >
                        {f} FPS
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quality Preset */}
              <div>
                <label className="text-[10px] font-semibold text-neutral-400 block mb-1">码率品质：</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'high', label: '高码率 (推荐)', rate: '12 Mbps' },
                    { id: 'medium', label: '中等码率', rate: '6 Mbps' },
                    { id: 'low', label: '低码率', rate: '2.5 Mbps' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setQuality(q.id as any)}
                      className={`p-1.5 rounded-lg border text-center transition-all ${
                        quality === q.id
                          ? 'bg-blue-600/20 border-blue-500 text-white font-medium'
                          : 'bg-[#171822] border-[#242633] text-neutral-400'
                      }`}
                    >
                      <span className="block text-[11px]">{q.label}</span>
                      <span className="text-[9px] text-neutral-500">{q.rate}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Exporting Progress State */}
          {isExporting && progress && (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center animate-spin">
                <Loader2 className="w-6 h-6" />
              </div>

              <div className="flex flex-col gap-1 w-full max-w-sm">
                <span className="font-semibold text-xs text-white">
                  正在渲染导出 ({progress.progress}%)
                </span>
                <span className="text-[10px] text-neutral-400">
                  当前渲染第 {progress.currentFrame} / {progress.totalFrames} 帧
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-[#1c1d27] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full transition-all duration-200"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>

              <span className="text-[10px] text-neutral-400 font-mono">
                预计剩余: {Math.max(1, Math.round(progress.estimatedTimeRemaining))} 秒
              </span>
            </div>
          )}

          {/* Export Finished State */}
          {exportedBlobUrl && (
            <div className="py-6 flex flex-col items-center justify-center text-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="font-semibold text-sm text-white">视频导出成功！</span>
              <p className="text-neutral-400 text-[11px] max-w-xs">
                浏览器已自动开始下载，也可点击下方按钮重新下载。
              </p>

              <div className="flex gap-2 mt-2">
                <a
                  href={exportedBlobUrl}
                  download={`${project.name}.${format}`}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium flex items-center gap-1.5 text-xs shadow-md shadow-blue-600/30"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>重新下载视频</span>
                </a>
              </div>
            </div>
          )}

          {exportError && (
            <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-red-300 text-xs">
              ⚠️ 导出失败: {exportError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-11 px-4 bg-[#101116] border-t border-[#20222a] flex items-center justify-end gap-2">
          {!isExporting && !exportedBlobUrl && (
            <>
              <button
                onClick={closeExportModal}
                className="px-3 py-1 bg-[#171822] hover:bg-[#1f202d] text-neutral-300 rounded border border-[#242633] text-xs transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleStartExport}
                className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium rounded text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>开始导出</span>
              </button>
            </>
          )}

          {exportedBlobUrl && (
            <button
              onClick={closeExportModal}
              className="px-4 py-1 bg-[#171822] hover:bg-[#1f202d] text-white font-medium rounded border border-[#242633] text-xs"
            >
              完成并关闭
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
