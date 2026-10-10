import React, { useState, memo } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Link2,
} from 'lucide-react';
import { useEditorActions } from '../../context/EditorContext';
import { useUiStore } from '../../stores/uiStore';
import { useSelectionStore } from '../../stores/selectionStore';
import { Track } from '../../types/editor';

interface TrackHeaderProps {
  track: Track;
  index: number;
  totalTracks: number;
}

export const TrackHeader: React.FC<TrackHeaderProps> = memo(({ track, index, totalTracks }) => {
  const {
    updateTrack,
    deleteTrack,
    toggleTrackMute,
    toggleTrackSolo,
    toggleTrackLock,
    toggleTrackHide,
  } = useEditorActions();

  const trackHeight = useUiStore((s) => s.trackHeight);
  const activeTrackId = useSelectionStore((s) => s.activeTrackId);
  const setActiveTrackId = useSelectionStore((s) => s.setActiveTrackId);
  // Also write through context so StoreBridge stays consistent for non-migrated consumers
  const { setActiveTrackId: setActiveTrackIdCtx } = useEditorActions();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(track.name);
  const [syncLock, setSyncLock] = useState(true);

  const isVideo = track.type === 'video';
  const isAudio = track.type === 'audio';
  const isTargeted = activeTrackId === track.id;

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (nameValue.trim()) {
      updateTrack(track.id, { name: nameValue.trim() });
    }
  };

  const handleSelectTrack = () => {
    setActiveTrackId(track.id);
    setActiveTrackIdCtx(track.id);
  };

  const getHeightClass = () => {
    switch (trackHeight) {
      case 'compact':
        return 'h-9';
      case 'tall':
        return 'h-20';
      default:
        return 'h-14';
    }
  };

  const isMuted = track.isMuted || track.muted;
  const isLocked = track.isLocked || track.locked;
  const isHidden = track.isHidden || track.visible === false;
  const isSolo = !!track.isSolo;

  const getPrTrackLabel = () => {
    if (track.name && (track.name.startsWith('V') || track.name.startsWith('A'))) {
      return track.name.split(' ')[0];
    }
    return isVideo ? `V${index + 1}` : `A${index + 1}`;
  };

  return (
    <div
      onClick={handleSelectTrack}
      className={`${getHeightClass()} border-b border-white/[0.06] px-1.5 flex items-center justify-between select-none text-xs transition-colors hover:bg-white/[0.03] relative group cursor-pointer ${
        isTargeted ? 'bg-cyan-400/[0.05]' : ''
      }`}
    >
      {isTargeted && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[2.5px] rounded-r-full"
          style={{
            background: isAudio ? '#34d399' : '#22d3ee',
            boxShadow: isAudio ? '0 0 8px rgba(52,211,153,0.7)' : '0 0 8px rgba(34,211,238,0.7)',
          }}
        />
      )}

      <div className="flex items-center gap-1.5 min-w-0 flex-1 pl-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleSelectTrack();
          }}
          title={isTargeted ? '当前目标轨道' : '设为目标轨道'}
          className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 transition-all ${
            isAudio
              ? isTargeted
                ? 'bg-emerald-400 text-emerald-950 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                : 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/25 hover:bg-emerald-400/20'
              : isTargeted
              ? 'bg-cyan-400 text-cyan-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
              : 'bg-cyan-400/10 text-cyan-300 border border-cyan-400/25 hover:bg-cyan-400/20'
          }`}
        >
          {getPrTrackLabel()}
        </button>

        <div className="flex flex-col min-w-0 flex-1">
          {isEditingName ? (
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleNameSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
              className="kf-input text-[10px] px-1.5 py-0.5 w-full"
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
              className="font-medium text-neutral-200 truncate text-[11px] cursor-text hover:text-cyan-300 flex items-center gap-1 transition-colors"
              title={`${track.name} (双击重命名)`}
            >
              <span>{track.name}</span>
            </div>
          )}
          <span className="text-[8px] text-neutral-500 uppercase tracking-widest font-mono">
            {isAudio ? 'Audio' : 'Video'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-1">
        {isVideo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleTrackHide(track.id);
            }}
            title={!isHidden ? '切换轨道输出' : '已隐藏轨道画面'}
            className={`kf-icon-btn w-5.5 h-5.5 !p-1 ${!isHidden ? '' : 'active'}`}
          >
            {!isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        )}

        {isAudio && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTrackMute(track.id);
              }}
              title={isMuted ? '取消静音' : '静音轨道'}
              className={`w-5.5 h-5.5 rounded-lg font-mono font-bold text-[9px] flex items-center justify-center transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                  : 'bg-white/[0.05] text-neutral-500 hover:text-white hover:bg-white/[0.09]'
              }`}
            >
              M
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleTrackSolo(track.id);
              }}
              title={isSolo ? '取消独奏' : '独奏轨道'}
              className={`w-5.5 h-5.5 rounded-lg font-mono font-bold text-[9px] flex items-center justify-center transition-all cursor-pointer ${
                isSolo
                  ? 'bg-amber-400 text-amber-950 font-extrabold shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                  : 'bg-white/[0.05] text-neutral-500 hover:text-white hover:bg-white/[0.09]'
              }`}
            >
              S
            </button>
          </>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSyncLock(!syncLock);
          }}
          title={syncLock ? '同步锁定已开启' : '同步锁定已关闭'}
          className={`kf-icon-btn w-5.5 h-5.5 !p-1 ${syncLock ? '' : 'opacity-40'}`}
        >
          <Link2 className="w-2.5 h-2.5" />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTrackLock(track.id);
          }}
          title={isLocked ? '解锁轨道' : '锁定轨道'}
          className={`kf-icon-btn w-5.5 h-5.5 !p-1 ${isLocked ? 'active' : ''}`}
        >
          {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
        </button>

        {totalTracks > 2 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteTrack(track.id);
            }}
            title="删除轨道"
            className="kf-icon-btn w-5.5 h-5.5 !p-1 opacity-0 group-hover:opacity-100 hover:!text-rose-300"
          >
            <Trash2 className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    </div>
  );
});
