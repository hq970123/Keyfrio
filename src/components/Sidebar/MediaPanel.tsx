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
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { MediaCard } from './MediaCard';
import { isFileSystemAccessSupported } from '../../utils/fileSystem';
import { SAMPLE_VIDEOS, SAMPLE_IMAGES, SAMPLE_AUDIOS } from '../../constants/samples';
import { synthesizeBgmBlob, synthesizeSfxBlob, extractWaveformFromBlob } from '../../utils/audio';

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
  const [sortKey, setSortKey] = useState<'recent' | 'name' | 'duration' | 'size'>('recent');
  const [samplesOpen, setSamplesOpen] = useState(true);
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

  const typeCounts = useMemo(() => {
    const counts = { all: userAssets.length, video: 0, image: 0, audio: 0, lottie: 0 };
    for (const a of userAssets) {
      if (a.type === 'video') counts.video++;
      else if (a.type === 'image') counts.image++;
      else if (a.type === 'audio') counts.audio++;
      else if (a.type === 'lottie') counts.lottie++;
    }
    return counts;
  }, [userAssets]);

  const filteredAssets = useMemo(() => {
    const filtered = userAssets.filter((a) => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (searchQuery.trim() && !a.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
        return false;
      }
      return true;
    });
    const sorted = [...filtered];
    switch (sortKey) {
      case 'name':
        sorted.sort((x, y) => x.name.localeCompare(y.name, 'zh-CN'));
        break;
      case 'duration':
        sorted.sort((x, y) => (y.duration || 0) - (x.duration || 0));
        break;
      case 'size':
        sorted.sort((x, y) => (y.size || 0) - (x.size || 0));
        break;
      default:
        break; // 'recent' keeps import order
    }
    return sorted;
  }, [userAssets, filterType, searchQuery, sortKey]);

  // Batch add all filtered assets to timeline
  const handleAddAllToTimeline = async () => {
    for (const asset of filteredAssets) {
      await addMediaToTimeline(asset);
    }
  };

  const addSampleAudio = async (sample: (typeof SAMPLE_AUDIOS)[number]) => {
    const blob = sample.toneType.startsWith('sfx-')
      ? synthesizeSfxBlob(sample.toneType, sample.duration)
      : synthesizeBgmBlob(sample.toneType, sample.duration);
    const url = URL.createObjectURL(blob);
    const audioWaveform = await extractWaveformFromBlob(blob);
    await addMediaToTimeline({ name: sample.name, type: 'audio', url, duration: sample.duration, audioWaveform });
  };

  return (
    <div className="flex flex-col h-full text-xs select-none">
      {/* Header */}
      <div className="kf-panel-header">
        <span className="flex items-center gap-2">
          <Film className="w-3.5 h-3.5 text-cyan-300" />
          素材库
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openRelinkModal}
            className={`kf-icon-btn p-1.5 !rounded-lg border ${
              needsPermissionCount > 0 || offlineAssetsCount > 0
                ? '!text-amber-300 !border-amber-500/40 !bg-amber-500/10'
                : '!border-white/[0.06]'
            }`}
            title="素材重连与授权管理器"
          >
            <HardDrive className="w-3.5 h-3.5" />
            {(needsPermissionCount > 0 || offlineAssetsCount > 0) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {/* Type filter row (with per-type counts) */}
        {userAssets.length > 0 && (
          <div className="flex gap-0.5 bg-black/30 p-0.5 rounded-lg border border-white/[0.06]">
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
                className={`flex-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  filterType === item.id
                    ? 'bg-[var(--kf-accent-soft)] text-[var(--kf-accent)] shadow-[inset_0_0_0_1px_var(--kf-accent-line)]'
                    : 'text-neutral-500 hover:text-neutral-200'
                }`}
              >
                {item.label}
                <span className="font-mono text-[9px] opacity-70">{typeCounts[item.id]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Offline / Need Permission Alert Block */}
        {(needsPermissionCount > 0 || offlineAssetsCount > 0) && (
          <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/25 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-[11px]">
                {needsPermissionCount > 0
                  ? `${needsPermissionCount} 个素材待授权访问`
                  : `${offlineAssetsCount} 个素材处于离线状态`}
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              浏览器安全策略要求在重新打开工程时对本地文件进行重新授权或扫描文件夹。
            </p>
            <div className="flex items-center gap-1.5">
              {needsPermissionCount > 0 && (
                <button
                  onClick={() => requestAllFilePermissions()}
                  className="kf-btn !text-[10px] px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-semibold"
                >
                  <Unlock className="w-3 h-3" />
                  <span>授权访问</span>
                </button>
              )}
              <button
                onClick={openRelinkModal}
                className="kf-btn kf-btn-ghost !text-[10px] px-2.5 py-1.5"
              >
                <FolderOpen className="w-3 h-3 text-cyan-300" />
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
          className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all relative ${
            isDragging
              ? 'border-cyan-400 bg-cyan-400/10 scale-[0.98]'
              : 'border-white/10 hover:border-cyan-400/40 bg-white/[0.02] hover:bg-cyan-400/[0.04]'
          }`}
        >
          <input
            type="file"
            multiple
            accept="video/*,image/*,audio/*,.json,application/json"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />
          <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/25 text-cyan-300 flex items-center justify-center mb-2">
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>
          <span className="font-semibold text-xs text-neutral-100">
            {isProcessing ? processingMsg : '点击上传或拖拽本地素材'}
          </span>
          <span className="text-[9px] text-neutral-600 mt-1">
            支持 MP4, WebM, MOV, MP3, WAV, PNG, JPG, SVG, Lottie JSON
          </span>
          {importError && <span role="alert" className="mt-1 text-[10px] text-red-400">{importError}</span>}

          {/* Native File Handle Button if supported */}
          {isFileSystemAccessSupported() && (
            <div className="mt-2 pt-2 border-t border-[#232532] w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleNativePicker}
                className="px-2 py-1 rounded bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] text-[10px] text-cyan-300 hover:text-cyan-200 font-medium flex items-center gap-1.5 transition-colors shadow-xs"
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
            className="bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] p-1.5 rounded-md flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white transition-colors"
            title="录制电脑屏幕画面"
          >
            <Monitor className="w-3.5 h-3.5 text-cyan-300" />
            <span className="text-[10px]">录制屏幕</span>
          </button>
          <button
            onClick={() => openRecordModal('camera')}
            className="bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] p-1.5 rounded-md flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white transition-colors"
            title="录制高清摄像头实拍"
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[10px]">摄像头录像</span>
          </button>
          <button
            onClick={() => openRecordModal('audio')}
            className="bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] p-1.5 rounded-md flex flex-col items-center gap-0.5 text-neutral-300 hover:text-white transition-colors"
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
                className="kf-input w-full pl-6 pr-2 py-1 text-[10px]"
              />
            </div>
            <div className="relative shrink-0" title="排序方式">
              <ArrowUpDown className="w-3 h-3 text-neutral-500 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                className="kf-input pl-6 pr-1.5 py-1 text-[10px] cursor-pointer appearance-none"
              >
                <option value="recent">导入顺序</option>
                <option value="name">名称</option>
                <option value="duration">时长</option>
                <option value="size">大小</option>
              </select>
            </div>
            {filteredAssets.length > 0 && (
              <button
                onClick={handleAddAllToTimeline}
                className="kf-btn kf-btn-primary px-2 py-1 text-[10px] shrink-0"
                title="批量将当前素材导入时间线"
              >
                <Layers className="w-3 h-3" />
                <span>全部上轨</span>
              </button>
            )}
            <button
              onClick={clearUserAssets}
              className="kf-btn kf-btn-danger-ghost p-1 shrink-0"
              title="清空素材库"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* User Imported Real Media Assets Grid */}
        {filteredAssets.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <div className="kf-section-title">
              已导入素材
              <span className="font-mono normal-case tracking-normal text-[var(--kf-text-faint)]">
                {filteredAssets.length}
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
                  size={asset.size}
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
          <div className="kf-empty !py-10">
            <div className="w-12 h-12 rounded-2xl bg-cyan-400/[0.07] border border-cyan-400/20 flex items-center justify-center mb-3">
              <FolderOpen className="w-5 h-5 text-cyan-300" />
            </div>
            <span className="text-xs font-semibold text-neutral-200">素材库为空</span>
            <p className="text-[10px] text-neutral-500 mt-1.5 max-w-[210px] leading-relaxed">
              点击上方区域导入本地视频、音频或图片，或使用录屏 / 摄像头开始创作。
            </p>
          </div>
        )}

        {/* Sample Media (collapsible) */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setSamplesOpen((v) => !v)}
            className="kf-section-title w-full cursor-pointer text-left"
            title={samplesOpen ? '收起示例素材' : '展开示例素材'}
          >
            示例素材
            <span className="font-mono normal-case tracking-normal text-[var(--kf-text-faint)]">
              {SAMPLE_VIDEOS.length + SAMPLE_IMAGES.length + SAMPLE_AUDIOS.length}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 text-neutral-500 transition-transform ${samplesOpen ? '' : '-rotate-90'}`}
            />
          </button>
          {samplesOpen && (
            <div className="grid grid-cols-2 gap-2">
              {[...SAMPLE_VIDEOS, ...SAMPLE_IMAGES].map((asset) => (
                <MediaCard key={asset.id} name={asset.name} type={asset.type} url={asset.url} thumbnail={asset.thumbnail} duration={asset.duration} onAdd={() => addMediaToTimeline({ name: asset.name, type: asset.type, url: asset.url, duration: asset.duration, thumbnail: asset.thumbnail })} badge="示例" />
              ))}
              {SAMPLE_AUDIOS.map((asset) => (
                <MediaCard key={asset.id} name={asset.name} type="audio" url="" duration={asset.duration} onAdd={() => addSampleAudio(asset)} badge={asset.category} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
