import React, { useEffect, useState } from 'react';
import { HardDrive, Trash2, CheckCircle2, ShieldCheck, Database, RefreshCw, X, AlertCircle } from 'lucide-react';
import { globalOpfsStorage } from '../../utils/opfsStorage';
import { OpfsStats } from '../../types/editor';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageManagerModal: React.FC<StorageManagerModalProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<OpfsStats>({
    isSupported: true,
    usageBytes: 0,
    quotaBytes: 0,
    fileCount: 0,
  });
  const [isClearing, setIsClearing] = useState(false);

  const fetchStats = async () => {
    const s = await globalOpfsStorage.getStorageStats();
    setStats(s);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClearCache = async () => {
    if (confirm('确定要清理本地 OPFS 缓存空间吗？这不会影响当前保存的工程结构。')) {
      setIsClearing(true);
      await globalOpfsStorage.clearAll();
      await fetchStats();
      setIsClearing(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercent = stats.quotaBytes > 0 ? (stats.usageBytes / stats.quotaBytes) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 kf-anim-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-xs">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-sm text-neutral-100">FreeCut OPFS 本地私有存储引擎</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {/* Privacy Badge */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5 text-neutral-300">
              <span className="font-semibold text-emerald-300">100% 浏览器本地化隐私保障</span>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                借鉴 FreeCut 核心架构，所有导入的原片视频、音频波形和导出渲染全部运行于您的设备本地 OPFS (Origin Private File System)，零云端上传，极速流畅且保障数据绝对私密。
              </p>
            </div>
          </div>

          {/* Storage Capacity Stats */}
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between text-neutral-300">
              <div className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-sky-400" />
                <span className="font-medium">存储空间配额</span>
              </div>
              <span className="font-mono text-neutral-400">
                {formatBytes(stats.usageBytes)} / {formatBytes(stats.quotaBytes || 10737418240)}
              </span>
            </div>

            {/* Storage Bar */}
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-300"
                style={{ width: `${Math.max(2, Math.min(100, usagePercent))}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800/80 text-[11px] text-neutral-400">
              <div>
                <span>OPFS 原生支持: </span>
                <span className="text-emerald-400 font-medium">
                  {stats.isSupported ? '已启用 (Chrome/Edge 113+)' : 'IndexedDB 回退模式'}
                </span>
              </div>
              <div>
                <span>本地媒体文件数: </span>
                <span className="text-neutral-200 font-mono font-medium">{stats.fileCount} 个</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={fetchStats}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新状态
            </button>

            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-900/50 text-rose-300 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isClearing ? '正在清理...' : '清理 OPFS 媒体缓存'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
