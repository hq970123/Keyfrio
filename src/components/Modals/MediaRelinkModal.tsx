import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  FolderOpen,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
  RefreshCw,
  Upload,
  Search,
  Film,
  Music,
  Image as ImageIcon,
  Sparkles,
  Link2,
  HardDrive,
  Check,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { MediaAsset, Clip } from '../../types/editor';
import { formatSMPTE } from '../../utils/time';
import { isFileSystemAccessSupported, isDirectoryPickerSupported } from '../../utils/fileSystem';

export const MediaRelinkModal: React.FC = () => {
  const {
    project,
    userAssets,
    isRelinkModalOpen,
    closeRelinkModal,
    offlineAssetsCount,
    needsPermissionCount,
    checkLocalMediaPermissions,
    requestAllFilePermissions,
    relinkWithDirectory,
    relinkWithFiles,
    relinkSingleMedia,
  } = useEditor();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'offline' | 'needsPermission' | 'connected'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeRelinkTarget, setActiveRelinkTarget] = useState<string | null>(null);

  // Compile list of all media items (from userAssets and project timeline clips)
  const mediaItemsList = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        type: string;
        duration: number;
        thumbnail?: string;
        size?: number;
        isOffline: boolean;
        needsPermission: boolean;
        hasHandle: boolean;
        clipCount: number;
        trackNames: string[];
        asset?: MediaAsset;
        clips: Clip[];
      }
    >();

    // 1. Add from userAssets
    userAssets.forEach((a) => {
      map.set(a.name || a.id, {
        id: a.id,
        name: a.name,
        type: a.type,
        duration: a.duration || 5,
        thumbnail: a.thumbnail || (a.thumbnails && a.thumbnails[0]),
        size: a.size,
        isOffline: Boolean(a.isOffline || (!a.url && !a.blob)),
        needsPermission: Boolean(a.needsPermission),
        hasHandle: Boolean(a.fileHandle),
        clipCount: 0,
        trackNames: [],
        asset: a,
        clips: [],
      });
    });

    // 2. Add from timeline clips
    project.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.type === 'video' || c.type === 'audio' || c.type === 'image') {
          const key = c.name || c.id;
          const existing = map.get(key);
          const isOff = Boolean(c.isOffline || (!c.sourceUrl && !c.sourceBlob));
          const needsPerm = Boolean(c.needsPermission);
          const hasHdl = Boolean(c.fileHandle);

          if (existing) {
            existing.clipCount += 1;
            if (!existing.trackNames.includes(t.name)) existing.trackNames.push(t.name);
            existing.clips.push(c);
            if (isOff) existing.isOffline = true;
            if (needsPerm) existing.needsPermission = true;
            if (hasHdl) existing.hasHandle = true;
          } else {
            map.set(key, {
              id: c.id,
              name: c.name,
              type: c.type,
              duration: c.originalDuration || c.duration,
              thumbnail: c.thumbnailUrl || (c.thumbnails && c.thumbnails[0]),
              isOffline: isOff,
              needsPermission: needsPerm,
              hasHandle: hasHdl,
              clipCount: 1,
              trackNames: [t.name],
              clips: [c],
            });
          }
        }
      });
    });

    return Array.from(map.values());
  }, [userAssets, project.tracks]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return mediaItemsList.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === 'offline') return item.isOffline && !item.needsPermission;
      if (filterStatus === 'needsPermission') return item.needsPermission;
      if (filterStatus === 'connected') return !item.isOffline && !item.needsPermission;
      return true;
    });
  }, [mediaItemsList, searchQuery, filterStatus]);

  if (!isRelinkModalOpen) return null;

  // Handle one-click permission request
  const handleRequestAllPermissions = async () => {
    setIsProcessing(true);
    setStatusMessage({ text: '正在向浏览器请求本地文件授权...', type: 'info' });
    try {
      const res = await requestAllFilePermissions();
      if (res.authorized > 0) {
        setStatusMessage({
          text: `成功重新授权并连接了 ${res.authorized} 个本地素材！`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: '未获取到新的文件授权，请尝试「选择所在文件夹」进行批量重连。',
          type: 'info',
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: `授权过程出错: ${err.message || err}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Directory Picker auto-scan
  const handleFolderRelink = async () => {
    setIsProcessing(true);
    setStatusMessage({ text: '正在选择并扫描素材文件夹...', type: 'info' });
    try {
      if (isDirectoryPickerSupported()) {
        const res = await relinkWithDirectory();
        if (res.reconnected > 0) {
          setStatusMessage({
            text: `已扫描 ${res.totalScanned} 个文件，成功重连 ${res.reconnected} 个本地素材！`,
            type: 'success',
          });
        } else {
          setStatusMessage({
            text: `扫描了 ${res.totalScanned} 个文件，未发现与当前项目同名的素材。`,
            type: 'info',
          });
        }
      } else {
        // Trigger fallback input with webkitdirectory
        folderInputRef.current?.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMessage({ text: `文件夹重连出错: ${err.message || err}`, type: 'error' });
      } else {
        setStatusMessage(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle fallback folder input change
  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage({ text: '正在匹配文件夹中的文件...', type: 'info' });
    try {
      const res = await relinkWithFiles(e.target.files);
      setStatusMessage({
        text: `成功通过所选文件夹重连了 ${res.reconnected} 个本地素材！`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({ text: `批量重连出错: ${err.message || err}`, type: 'error' });
    } finally {
      setIsProcessing(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  // Handle batch file selection
  const handleBatchFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage({ text: '正在匹配所选文件...', type: 'info' });
    try {
      const res = await relinkWithFiles(e.target.files);
      setStatusMessage({
        text: `已成功匹配并重连了 ${res.reconnected} 个本地素材！`,
        type: 'success',
      });
    } catch (err: any) {
      setStatusMessage({ text: `文件匹配出错: ${err.message || err}`, type: 'error' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle single file relink
  const handleStartSingleRelink = (targetName: string) => {
    setActiveRelinkTarget(targetName);
    singleFileInputRef.current?.click();
  };

  const handleSingleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeRelinkTarget) return;
    const file = e.target.files[0];
    setIsProcessing(true);
    try {
      const success = await relinkSingleMedia(activeRelinkTarget, file);
      if (success) {
        setStatusMessage({
          text: `素材「${activeRelinkTarget}」已成功重新连接为本地文件「${file.name}」！`,
          type: 'success',
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: `单个重连出错: ${err.message || err}`, type: 'error' });
    } finally {
      setIsProcessing(false);
      setActiveRelinkTarget(null);
      if (singleFileInputRef.current) singleFileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 kf-anim-fade-in">
      {/* Hidden File Inputs for Fallbacks */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBatchFileInputChange}
        multiple
        accept="video/*,audio/*,image/*,.json"
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderInputChange}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={singleFileInputRef}
        onChange={handleSingleFileInputChange}
        accept="video/*,audio/*,image/*,.json"
        className="hidden"
      />

      <div className="bg-[var(--kf-surface-2)] border border-white/[0.08] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[var(--kf-surface-1)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                本地素材授权与重新连接管理
                {offlineAssetsCount > 0 && (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
                    {offlineAssetsCount} 个离线
                  </span>
                )}
                {needsPermissionCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs px-2 py-0.5 rounded-full font-mono">
                    {needsPermissionCount} 个待授权
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                浏览器会话重新进入时，快速验证本地文件权限或选择素材文件夹批量恢复剪辑源文件
              </p>
            </div>
          </div>

          <button
            onClick={closeRelinkModal}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Action Toolbar */}
        <div className="p-6 border-b border-white/[0.06] bg-[var(--kf-surface-2)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* One-click permission authorization */}
            <button
              onClick={handleRequestAllPermissions}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-semibold shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              <span>一键授权访问本地素材</span>
            </button>

            {/* Folder Picker Auto Relink */}
            <button
              onClick={handleFolderRelink}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--kf-surface-4)] hover:bg-[var(--kf-surface-5)] border border-white/[0.08] text-white text-xs font-semibold disabled:opacity-50 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              <FolderOpen className="w-4 h-4 text-cyan-300" />
              <span>选择素材所在文件夹 (自动批量匹配)</span>
            </button>

            {/* Multiple files selection */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700 text-neutral-200 text-xs font-medium disabled:opacity-50 transition-all cursor-pointer active:scale-95"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>选取本地文件批量重连</span>
            </button>
          </div>

          {/* Quick Refresh Check */}
          <button
            onClick={() => checkLocalMediaPermissions()}
            disabled={isProcessing}
            title="刷新文件访问权限状态"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800/40 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>检测状态</span>
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-red-950/40 border-red-800/50 text-red-300'
                : 'bg-cyan-950/40 border-cyan-800/50 text-cyan-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
              {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 text-cyan-300 shrink-0 animate-spin" />}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-neutral-400 hover:text-white text-xs px-2 py-0.5"
            >
              关闭
            </button>
          </div>
        )}

        {/* Search and Filter Tabs */}
        <div className="px-6 py-3 border-b border-white/[0.06] bg-[var(--kf-surface-1)] flex items-center justify-between gap-4 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="搜索素材名称..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--kf-surface-3)] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-[var(--kf-surface-3)] p-1 rounded-xl border border-white/[0.06]">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              全部 ({mediaItemsList.length})
            </button>
            <button
              onClick={() => setFilterStatus('needsPermission')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'needsPermission'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              待授权 ({mediaItemsList.filter((m) => m.needsPermission).length})
            </button>
            <button
              onClick={() => setFilterStatus('offline')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'offline'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              离线断链 ({mediaItemsList.filter((m) => m.isOffline && !m.needsPermission).length})
            </button>
            <button
              onClick={() => setFilterStatus('connected')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === 'connected'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              已连接 ({mediaItemsList.filter((m) => !m.isOffline && !m.needsPermission).length})
            </button>
          </div>
        </div>

        {/* Media Items Table */}
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[460px] p-6 space-y-2">
          {filteredItems.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-neutral-500">
              <FileCheck className="w-10 h-10 text-emerald-500/40 mb-2" />
              <p className="text-sm text-neutral-300 font-medium">没有匹配的素材项</p>
              <p className="text-xs text-neutral-500 mt-1">当前筛选条件下所有素材均处于正常状态</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const status = item.needsPermission
                ? 'needsPermission'
                : item.isOffline
                ? 'offline'
                : 'connected';

              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    status === 'offline'
                      ? 'bg-red-950/15 border-red-900/30 hover:border-red-700/50'
                      : status === 'needsPermission'
                      ? 'bg-amber-950/15 border-amber-900/30 hover:border-amber-700/50'
                      : 'bg-[var(--kf-surface-3)] border-white/[0.06] hover:border-white/[0.14]'
                  }`}
                >
                  {/* Left: Thumbnail + Media Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail preview */}
                    <div className="w-14 h-11 rounded-lg bg-[var(--kf-bg-soft)] border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0 relative">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                      ) : item.type === 'video' ? (
                        <Film className="w-5 h-5 text-cyan-300" />
                      ) : item.type === 'audio' ? (
                        <Music className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-amber-400" />
                      )}

                      {/* Status indicator dot */}
                      <span
                        className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black/40 ${
                          status === 'connected'
                            ? 'bg-emerald-500'
                            : status === 'needsPermission'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white truncate max-w-[280px]">
                          {item.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {item.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-neutral-400 flex-wrap">
                        <span>时长: {formatSMPTE(item.duration)}</span>
                        {item.size ? (
                          <span>大小: {(item.size / (1024 * 1024)).toFixed(1)} MB</span>
                        ) : null}
                        <span>
                          时间线引用:{' '}
                          {item.clipCount > 0 ? (
                            <span className="text-cyan-200 font-medium">
                              {item.clipCount} 个片段 ({item.trackNames.join(', ')})
                            </span>
                          ) : (
                            <span className="text-neutral-500">仅素材库</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Status Badge */}
                  <div className="px-4 shrink-0 text-center">
                    {status === 'connected' && (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <Check className="w-3.5 h-3.5" />
                        <span>已连接正常</span>
                      </div>
                    )}
                    {status === 'needsPermission' && (
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-medium bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 animate-pulse">
                        <Lock className="w-3.5 h-3.5" />
                        <span>待授权访问</span>
                      </div>
                    )}
                    {status === 'offline' && (
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-medium bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>本地源离线</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartSingleRelink(item.name)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Link2 className="w-3.5 h-3.5 text-cyan-300" />
                      <span>定位此文件</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[var(--kf-surface-2)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <HelpCircle className="w-4 h-4 text-neutral-500" />
            <span>
              提示: 当您移动了本地素材文件或重新打开浏览器时，点击「选择素材所在文件夹」可一键自动寻路匹配所有断链片段。
            </span>
          </div>

          <button
            onClick={closeRelinkModal}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-semibold shadow-lg shadow-cyan-400/20 transition-all cursor-pointer active:scale-95"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
