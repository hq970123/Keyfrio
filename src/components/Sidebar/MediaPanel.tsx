import React, { useState, useMemo } from 'react';
import {
  Upload,
  Plus,
  Film,
  Image as ImageIcon,
  Video,
  Mic,
  Monitor,
  Trash2,
  Loader2,
  Search,
  FolderOpen,
  Sparkles,
  Layers,
  HardDrive,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { MediaCard } from './MediaCard';
import { isFileSystemAccessSupported } from '../../utils/fileSystem';

export const MediaPanel: React.FC = () => {
  const {
    userAssets,
    importFiles,
    deleteUserAsset,
    clearUserAssets,
    addMediaToTimeline,
    openRecordModal,
    openRelinkModal,
    openNativeFilePicker,
    offlineAssetsCount,
    needsPermissionCount,
    requestAllFilePermissions,
  } = useEditor();

  const [filterType, setFilterType] = useState<'all' | 'video' | 'image' | 'audio' | 'lottie'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState('');
  const [processingMsg, setProcessingMsg] = useState('');

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setImportError('');
    setProcessingMsg(`正在解析 ${files.length} 个本地素材元数据...`);
    try {
      await importFiles(files);
    } catch (err) {
      console.error('Import error:', err);
      setImportError('素材保存失败，请检查浏览器存储空间后重试。');
    } finally {
      setIsProcessing(false);
      setProcessingMsg('');
    }
  };

  const handleNativePicker = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFileSystemAccessSupported()) {
      setIsProcessing(true);
      setProcessingMsg('正在打开本地文件系统并保存句柄...');
      try {
        await openNativeFilePicker(true);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native picker error:', err);
        }
      } finally {
        setIsProcessing(false);
        setProcessingMsg('');
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const filteredAssets = useMemo(() => {
    return userAssets.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (searchQuery.trim() && !a.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      return true;
    });
  }, [userAssets, filterType, searchQuery]);

  // Batch add all filtered assets to timeline
  const handleAddAllToTimeline = async () => {
    for (const asset of filteredAssets) {
      await addMediaToTimeline(asset);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#131419] text-neutral-200 text-xs select-none">
      {/* Header */}
      <div className="p-2.5 border-b border-[#20222a] flex items-center justify-between">
        <span className="font-bold text-xs text-white flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-blue-400" />
          素材库 (Media Library)
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={openRelinkModal}
            className={`p-1 rounded text-[10px] border transition-colors flex items-center gap-1 ${
              needsPermissionCount > 0 || offlineAssetsCount > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-[#1a1b22] text-neutral-400 border-[#242633] hover:text-white'
            }`}
            title="素材重连与授权管理器"
          >
            <HardDrive className="w-3 h-3" />
            {(needsPermissionCount > 0 || offlineAssetsCount > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
          <div className="flex gap-0.5 bg-[#1a1b22] p-0.5 rounded border border-[#242633]">
            {(
              [
                { id: 'all', label: '全部' },
                { id: 'video', label: '视频' },
                { id: 'image', label: '图片' },
                { id: 'audio', label: '音频' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterType(item.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-medium transition-colors ${
                  filterType === item.id ? 'bg-[#00c9bd] text-[#081011] shadow-sm' : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-3">
        {/* Offline / Need Permission Alert Block */}
        {(needsPermissionCount > 0 || offlineAssetsCount > 0) && (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-[11px]">
                {needsPermissionCount > 0
                  ? `${needsPermissionCount} 个素材待授权访问`
                  : `${offlineAssetsCount} 个素材处于离线状态`}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-normal">
              浏览器安全策略要求在重新打开工程时对本地文件进行重新授权或扫描文件夹。
            </p>
            <div className="flex items-center gap-1.5">
              {needsPermissionCount > 0 && (
                <button
                  onClick={() => requestAllFilePermissions()}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[10px] flex items-center gap-1 shadow-xs"
                >
                  <Unlock className="w-3 h-3" />
                  <span>授权访问</span>
                </button>
              )}
              <button
                onClick={openRelinkModal}
                className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-[10px] flex items-center gap-1"
              >
                <FolderOpen className="w-3 h-3 text-blue-400" />
                <span>批量重连</span>
              </button>
            </div>
          </div>
        )}

        {/* Upload Drop Zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border border-dashed rounded-lg p-3.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all relative ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-98'
              : 'border-[#262834] hover:border-blue-500/50 bg-[#161720] hover:bg-[#1a1b24]'
          }`}
        >
          <input
            type="file"
            multiple
            accept="video/*,image/*,audio/*,.json,application/json"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center mb-1.5">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>
          <span className="font-semibold text-xs text-neutral-200">
            {isProcessing ? processingMsg : '点击上传或拖拽本地素材'}
          </span>
          <span className="text-[9px] text-neutral-500 mt-0.5">
            支持 MP4, WebM, MOV, MP3, WAV, PNG, JPG, SVG, Lottie JSON
          </span>
          {importError && <span role="alert" className="mt-1 text-[10px] text-red-400">{importError}</span>}

          {/* Native File Handle Button if supported */}
          {isFileSystemAccessSupported() && (
            <div className="mt-2 pt-2 border-t border-[#232532] w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleNativePicker}
                className="px-2 py-1 rounded bg-[#20222e] hover:bg-[#282b3a] border border-[#2e3142] text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <HardDrive className="w-3 h-3" />
                <span>原生文件系统句柄导入 (支持持久重连)</span>
              </button>
            </div>
          )}
        </label>

        {/* Quick Media Recording Tools */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => openRecordModal('screen')}
            className="bg-[#171822] hover:bg-[#1e202c] border border-[#242633] p-1.5 rounded-md flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white transition-colors"
            title="录制电脑屏幕画面"
          >
            <Monitor className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px]">录制屏幕</span>
          </button>
          <button
            onClick={() => openRecordModal('camera')}
            className="bg-[#171822] hover:bg-[#1e202c] border border-[#242633] p-1.5 rounded-md flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white transition-colors"
            title="录制高清摄像头实拍"
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px]">摄像头录像</span>
          </button>
          <button
            onClick={() => openRecordModal('audio')}
            className="bg-[#171822] hover:bg-[#1e202c] border border-[#242633] p-1.5 rounded-md flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white transition-colors"
            title="录制麦克风旁白"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px]">麦克风配音</span>
          </button>
        </div>

        {/* Search Bar & Action Controls */}
        {userAssets.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-neutral-500 absolute left-2 top-2" />
              <input
                type="text"
                placeholder="搜索导入的素材..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161720] border border-[#242633] rounded pl-6 pr-2 py-1 text-[10px] text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            {filteredAssets.length > 0 && (
              <button
                onClick={handleAddAllToTimeline}
                className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-[10px] font-medium flex items-center gap-1 shrink-0"
                title="批量将当前素材导入时间线"
              >
                <Layers className="w-3 h-3" />
                <span>全部上轨</span>
              </button>
            )}
            <button
              onClick={clearUserAssets}
              className="p-1 hover:bg-red-500/20 text-neutral-500 hover:text-red-400 rounded border border-transparent hover:border-red-500/30 transition-colors shrink-0"
              title="清空素材库"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* User Imported Real Media Assets Grid */}
        {filteredAssets.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                已导入素材 ({filteredAssets.length})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredAssets.map((asset) => (
                <MediaCard
                  key={asset.id}
                  id={asset.id}
                  name={asset.name}
                  type={asset.type}
                  url={asset.url}
                  thumbnail={asset.thumbnail}
                  duration={asset.duration}
                  width={asset.width}
                  height={asset.height}
                  isOffline={asset.isOffline}
                  needsPermission={asset.needsPermission}
                  onRelink={openRelinkModal}
                  onAdd={() => addMediaToTimeline(asset)}
                  onDelete={() => deleteUserAsset(asset.id)}
                  badge={
                    asset.width && asset.height
                      ? `${asset.width}×${asset.height}`
                      : asset.type.toUpperCase()
                  }
                />
              ))}
            </div>
          </div>
        ) : userAssets.length > 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center text-neutral-500 gap-1.5">
            <Search className="w-6 h-6 text-neutral-600" />
            <span className="text-xs">未找到符合搜索条件的素材</span>
          </div>
        ) : (
          /* Empty State */
          <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-neutral-500 border border-dashed border-[#20222a] rounded-lg bg-[#14151c]/50">
            <FolderOpen className="w-8 h-8 text-neutral-600 mb-2" />
            <span className="text-xs font-medium text-neutral-300">素材库为空</span>
            <p className="text-[10px] text-neutral-500 mt-1 max-w-[200px] leading-relaxed">
              请点击上方区域导入您的本地视频、音频或图片文件，或使用录屏/摄像头开始创作。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
