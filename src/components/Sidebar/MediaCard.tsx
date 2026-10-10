import React, { useState } from 'react';
import {
  Plus,
  Check,
  Play,
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
  X,
  AlertTriangle,
  Unlock,
} from 'lucide-react';
import { AudioWaveformVisualizer } from '../Timeline/AudioWaveformVisualizer';

interface MediaCardProps {
  id?: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'lottie' | string;
  url: string;
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  size?: number;
  isOffline?: boolean;
  needsPermission?: boolean;
  onAdd: () => void;
  onDelete?: () => void;
  onRelink?: () => void;
  badge?: string;
}

// Format a byte size to KB / MB with one decimal
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format duration to mm:ss (e.g. 00:06)
export function formatCardDuration(sec?: number): string {
  if (sec === undefined || isNaN(sec)) return '00:05';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export const MediaCard: React.FC<MediaCardProps> = ({
  name,
  type,
  url,
  thumbnail,
  duration,
  width,
  height,
  size,
  isOffline,
  needsPermission,
  onAdd,
  onDelete,
  onRelink,
  badge,
}) => {
  const [isAdded, setIsAdded] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd();
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPreviewModal(true);
  };

  const formattedDuration = formatCardDuration(duration);

  const handleDragStart = (e: React.DragEvent) => {
    const assetPayload = {
      name,
      type,
      url,
      thumbnail,
      duration,
      width,
      height,
      badge,
      isOffline,
      needsPermission,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(assetPayload));
    e.dataTransfer.setData('text/plain', JSON.stringify(assetPayload));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <>
      <div
        className={`group relative flex flex-col select-none cursor-grab active:cursor-grabbing w-full ${
          isOffline || needsPermission ? 'opacity-85' : ''
        }`}
        draggable={true}
        onDragStart={handleDragStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onAdd}
      >
        {/* Thumbnail Container */}
        <div
          className={`relative aspect-video w-full rounded-lg overflow-hidden bg-[var(--kf-surface-2)] border transition-all shadow-xs group-hover:shadow-md ${
            needsPermission
              ? 'border-amber-500/60 group-hover:border-amber-400'
              : isOffline
              ? 'border-rose-500/60 group-hover:border-rose-400'
              : 'border-white/[0.07] group-hover:border-cyan-400/50'
          }`}
        >
          {/* Media Thumbnail Image / Visual */}
          {thumbnail || (type === 'image' && url) ? (
            <img
              src={thumbnail || url}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
              loading="lazy"
            />
          ) : type === 'video' ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-600">
              <Film className="w-8 h-8 opacity-40" />
            </div>
          ) : type === 'audio' ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-950/60 via-teal-950/40 to-neutral-950 relative overflow-hidden p-2">
              <div className="absolute inset-0 opacity-70 flex items-center justify-center px-2">
                <AudioWaveformVisualizer
                  sourceUrl={url}
                  duration={duration || 10}
                  width={200}
                  height={60}
                  mode="mirrored"
                  showGainLine={false}
                />
              </div>
              <div className="relative z-10 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shadow-md">
                <Music className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-neutral-600">
              <ImageIcon className="w-8 h-8 opacity-40" />
            </div>
          )}

          {/* Offline / Permission Warning Overlay Badge */}
          {(isOffline || needsPermission) && (
            <div
              onClick={(e) => {
                if (onRelink) {
                  e.stopPropagation();
                  onRelink();
                }
              }}
              className={`absolute inset-x-0 top-0 py-0.5 px-1.5 flex items-center justify-between text-[9px] font-medium backdrop-blur-xs cursor-pointer z-10 ${
                needsPermission
                  ? 'bg-amber-950/85 text-amber-300 border-b border-amber-500/40 hover:bg-amber-900'
                  : 'bg-rose-950/85 text-rose-300 border-b border-rose-500/40 hover:bg-rose-900'
              }`}
              title="点击重新授权或重连此素材"
            >
              <div className="flex items-center gap-1">
                {needsPermission ? (
                  <Unlock className="w-2.5 h-2.5 text-amber-400" />
                ) : (
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                )}
                <span>{needsPermission ? '需授权' : '离线断链'}</span>
              </div>
              <span className="text-[8px] underline text-white/80 hover:text-white">重连</span>
            </div>
          )}

          {/* Optional Top-Left Badge (e.g. 4K / Stock) */}
          {badge && !isOffline && !needsPermission && (
            <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-xs text-[8px] font-mono text-neutral-300 px-1.5 py-0.2 rounded font-medium border border-white/10">
              {badge}
            </span>
          )}

          {/* Bottom-Left: Duration Pill */}
          {type !== 'image' && (
            <div className="absolute bottom-1.5 left-1.5 bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-full text-white font-mono text-[10px] font-medium tracking-tight shadow-sm pointer-events-none flex items-center gap-1 border border-white/5">
              <span>{formattedDuration}</span>
            </div>
          )}

          {/* Bottom-Right: Preview Button & Add + Button */}
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={handlePreviewClick}
              title="预览素材 (Preview)"
              className="w-5.5 h-5.5 rounded bg-black/65 hover:bg-black/90 backdrop-blur-xs border border-white/10 hover:border-white/30 text-white/90 hover:text-white flex items-center justify-center transition-all shadow-sm group/btn"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <rect x="3" y="4" width="18" height="16" rx="4" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleAddClick}
              title="添加到时间线 (Add to Timeline)"
              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all backdrop-blur-xs shadow-sm ${
                isAdded
                  ? 'bg-emerald-600 text-white scale-110'
                  : 'bg-black/65 hover:bg-cyan-500 text-white border border-white/10 hover:border-cyan-300'
              }`}
            >
              {isAdded ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>

          {/* Delete Option */}
          {onDelete && isHovered && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              title="删除此素材"
              className="absolute top-1.5 right-1.5 w-5 h-5 rounded bg-black/70 hover:bg-red-600 text-neutral-400 hover:text-white flex items-center justify-center transition-colors shadow-sm"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {/* Title Name below thumbnail */}
        <div className="mt-1 px-0.5 flex items-center justify-between min-w-0">
          <span
            className="text-[11px] font-normal text-neutral-200 group-hover:text-white truncate transition-colors"
            title={name}
          >
            {name}
          </span>
        </div>
        {/* Meta line: resolution · file size */}
        {(width && height) || size ? (
          <div className="px-0.5 flex items-center gap-1.5 text-[9px] font-mono text-neutral-500">
            {width && height ? <span>{width}×{height}</span> : null}
            {width && height && size ? <span className="text-neutral-700">·</span> : null}
            {size ? <span>{formatFileSize(size)}</span> : null}
          </div>
        ) : null}
      </div>

      {/* Full Modal Preview */}
      {showPreviewModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="kf-anim-pop-in bg-[var(--kf-surface-3)] border border-white/[0.08] rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-xs text-white truncate">{name}</span>
                <span className="kf-badge kf-badge-accent font-mono uppercase">
                  {type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black aspect-video flex items-center justify-center relative overflow-hidden">
              {type === 'video' ? (
                <video
                  src={url}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : type === 'image' ? (
                <img
                  src={url}
                  alt={name}
                  className="w-full h-full object-contain"
                />
              ) : type === 'audio' ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <Music className="w-12 h-12 text-emerald-400 animate-pulse" />
                  <audio src={url} controls autoPlay className="w-full max-w-xs" />
                </div>
              ) : (
                <img
                  src={thumbnail || url}
                  alt={name}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="p-3 bg-[var(--kf-surface-1)] border-t border-white/[0.06] flex items-center justify-between">
              <div className="text-[10px] text-neutral-400 font-mono">
                时长: {formattedDuration}
                {width && height ? ` · 分辨率: ${width}x${height}` : ''}
                {size ? ` · 大小: ${formatFileSize(size)}` : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="kf-btn kf-btn-ghost px-3 py-1 text-xs"
                >
                  关闭
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAdd();
                    setShowPreviewModal(false);
                  }}
                  className="kf-btn kf-btn-primary px-3 py-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加到时间线</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
