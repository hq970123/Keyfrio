import React, { useState } from 'react';
import {
  AlertTriangle,
  Unlock,
  FolderOpen,
  X,
  ExternalLink,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { isDirectoryPickerSupported } from '../../utils/fileSystem';

export const MediaRelinkBanner: React.FC = () => {
  const {
    offlineAssetsCount,
    needsPermissionCount,
    openRelinkModal,
    requestAllFilePermissions,
    relinkWithDirectory,
  } = useEditor();

  const [isDismissed, setIsDismissed] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // If there are no offline assets or permission needs, or dismissed, hide
  if (isDismissed || (offlineAssetsCount === 0 && needsPermissionCount === 0)) {
    return null;
  }

  const handleQuickAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      await requestAllFilePermissions();
    } catch (err) {
      console.warn('Quick authorize error:', err);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleQuickFolder = async () => {
    try {
      if (isDirectoryPickerSupported()) {
        await relinkWithDirectory();
      } else {
        openRelinkModal();
      }
    } catch (err) {
      console.warn('Quick folder scan error:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-950/90 via-[#1f1910] to-[#16120d] border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-200 z-30 shadow-md kf-anim-slide-in-top">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-amber-300">
            {needsPermissionCount > 0
              ? `检测到 ${needsPermissionCount} 个本地素材需要重新授权访问`
              : `检测到 ${offlineAssetsCount} 个本地素材处于离线/断链状态`}
          </span>
          <span className="text-neutral-400 hidden sm:inline">
            (在浏览器重载后需获取本地句柄访问权限或重新指定文件夹)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {needsPermissionCount > 0 && (
          <button
            onClick={handleQuickAuthorize}
            disabled={isAuthorizing}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Unlock className={`w-3.5 h-3.5 ${isAuthorizing ? 'animate-spin' : ''}`} />
            <span>一键重新授权</span>
          </button>
        )}

        <button
          onClick={handleQuickFolder}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-xs transition-colors cursor-pointer active:scale-95"
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-300" />
          <span>选择素材文件夹重连</span>
        </button>

        <button
          onClick={openRelinkModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/80 hover:bg-cyan-400 text-white font-medium text-xs transition-colors cursor-pointer active:scale-95"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>管理工作台</span>
        </button>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-neutral-400 hover:text-white rounded-md hover:bg-neutral-800 transition-colors ml-1"
          title="关闭提示"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
