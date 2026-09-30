import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUiStore } from '../../stores/uiStore';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TrackHeader } from './TrackHeader';
import { TrackRow } from './TrackRow';
import { Playhead } from './Playhead';
import { formatSMPTE } from '../../utils/time';
import { Plus } from 'lucide-react';

/** CapCut-style full-width dark timeline */
export const TimelineContainer: React.FC = () => {
  const { addTrack } = useEditor();

  const tracks = useProjectStore((s) => s.tracks);
  const totalDuration = useProjectStore((s) => s.totalDuration);

  const currentTime = usePlaybackStore((s) => s.currentTime);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const inPoint = usePlaybackStore((s) => s.inPoint);
  const outPoint = usePlaybackStore((s) => s.outPoint);

  const zoom = useUiStore((s) => s.zoom);
  const toolMode = useUiStore((s) => s.toolMode);
  const activeSnapGuide = useUiStore((s) => s.activeSnapGuide);

  const rulerScrollRef = useRef<HTMLDivElement | null>(null);
  const tracksScrollRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const [isHandPanning, setIsHandPanning] = useState(false);

  const minSeconds = Math.max(30, totalDuration + 15);
  const totalWidth = Math.max(1200, minSeconds * zoom);

  useEffect(() => {
    if (!isPlaying || !tracksScrollRef.current) return;
    const playheadPx = currentTime * zoom;
    const scrollLeft = tracksScrollRef.current.scrollLeft;
    const clientWidth = tracksScrollRef.current.clientWidth;

    if (playheadPx > scrollLeft + clientWidth - 60) {
      tracksScrollRef.current.scrollLeft = playheadPx - 100;
    } else if (playheadPx < scrollLeft) {
      tracksScrollRef.current.scrollLeft = Math.max(0, playheadPx - 20);
    }
  }, [currentTime, isPlaying, zoom]);

  const handleTracksScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollTop } = e.currentTarget;
    if (rulerScrollRef.current) {
      rulerScrollRef.current.scrollLeft = scrollLeft;
    }
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollTop = scrollTop;
    }
  };

  const handleHeaderWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (tracksScrollRef.current) {
      tracksScrollRef.current.scrollTop += e.deltaY;
    }
  };

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (toolMode !== 'hand') return;
    setIsHandPanning(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialScrollLeft = tracksScrollRef.current?.scrollLeft || 0;
    const initialScrollTop = tracksScrollRef.current?.scrollTop || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!tracksScrollRef.current) return;
      tracksScrollRef.current.scrollLeft = initialScrollLeft - (moveEvent.clientX - startX);
      tracksScrollRef.current.scrollTop = initialScrollTop - (moveEvent.clientY - startY);
    };

    const onMouseUp = () => {
      setIsHandPanning(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const inPx = inPoint !== null ? inPoint * zoom : null;
  const outPx = outPoint !== null ? outPoint * zoom : null;

  return (
    <div className="h-[clamp(280px,38vh,440px)] min-h-[280px] bg-[#14151a] border-t border-[#2a2c36] flex flex-col select-none shrink-0 z-20 shadow-[0_-12px_36px_rgba(0,0,0,0.14)]">
      <TimelineToolbar />

      {/* Ruler bar */}
      <div className="h-7 bg-[#16161a] border-b border-[#2a2a32] flex shrink-0 z-20">
        <div className="w-24 bg-[#16161a] border-r border-[#2a2a32] px-2 flex items-center justify-between text-[9px] font-semibold text-[#6b6b78] shrink-0">
          <span className="font-mono text-[#00d4c8] font-bold tracking-wider">
            {formatSMPTE(currentTime)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => addTrack('video')}
              title="快速新增视频轨道 (V)"
              className="px-1 py-0.5 rounded bg-[#1a2a3a] hover:bg-[#1e3a4a] border border-[#2a4a5a] text-[#5ec8e8] flex items-center gap-0.5 text-[8px] font-mono cursor-pointer transition-colors"
            >
              <Plus className="w-2 h-2" />
              <span>V</span>
            </button>
            <button
              type="button"
              onClick={() => addTrack('audio')}
              title="快速新增音频轨道 (A)"
              className="px-1 py-0.5 rounded bg-[#1a2e24] hover:bg-[#1e3a2e] border border-[#2a4a3a] text-[#5ed89a] flex items-center gap-0.5 text-[8px] font-mono cursor-pointer transition-colors"
            >
              <Plus className="w-2 h-2" />
              <span>A</span>
            </button>
          </div>
        </div>

        <div ref={rulerScrollRef} className="flex-1 overflow-hidden relative">
          <TimelineRuler totalWidth={totalWidth} />
        </div>
      </div>

      {/* Tracks */}
      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={headerScrollRef}
          onWheel={handleHeaderWheel}
          className="w-24 bg-[#16161a] border-r border-[#2a2a32] flex flex-col shrink-0 z-20 overflow-hidden"
        >
          {tracks.map((track, idx) => (
            <TrackHeader
              key={track.id}
              track={track}
              index={idx}
              totalTracks={tracks.length}
            />
          ))}
        </div>

        <div
          ref={tracksScrollRef}
          onScroll={handleTracksScroll}
          onMouseDown={handleTimelineMouseDown}
          className={`flex-1 flex flex-col overflow-x-auto overflow-y-auto relative bg-[#0e0e10] ${
            toolMode === 'hand'
              ? isHandPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : ''
          }`}
        >
          <div style={{ width: `${totalWidth}px` }} className="relative flex flex-col min-h-full">
            {inPx !== null && outPx !== null && outPx > inPx && (
              <div
                className="absolute top-0 bottom-0 bg-[rgba(0,212,200,0.06)] border-x border-[rgba(0,212,200,0.35)] pointer-events-none z-10"
                style={{
                  left: `${inPx}px`,
                  width: `${outPx - inPx}px`,
                }}
              />
            )}

            {activeSnapGuide && (
              <div
                className="absolute top-0 bottom-0 w-px bg-[#00d4c8] shadow-[0_0_8px_rgba(0,212,200,0.8)] z-40 pointer-events-none"
                style={{ left: `${activeSnapGuide.time * zoom}px` }}
              >
                <div className="absolute top-2 left-1 bg-[#00a89e] text-white font-mono text-[8px] px-1 py-0.5 rounded shadow whitespace-nowrap">
                  {activeSnapGuide.label}
                </div>
              </div>
            )}

            <Playhead timelineScrollRef={tracksScrollRef} />

            {tracks.map((track) => (
              <TrackRow key={track.id} track={track} totalWidth={totalWidth} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
