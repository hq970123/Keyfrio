import React, { useRef, useMemo, memo } from 'react';
import { useEditorActions } from '../../context/EditorContext';
import { useProjectStore } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUiStore } from '../../stores/uiStore';
import { formatSMPTE, snapTime } from '../../utils/time';

interface TimelineRulerProps {
  totalWidth: number;
}

/** Ruler playhead cursor — isolated so it alone re-renders at 60fps during playback */
const RulerCursor: React.FC<{ zoom: number }> = memo(({ zoom }) => {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const playheadX = currentTime * zoom;
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-30 flex items-center justify-center"
      style={{
        left: `${playheadX}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className="w-3.5 h-4 bg-[#ff4d6a] hover:bg-[#ff6b81] cursor-ew-resize pointer-events-auto flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-125"
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 100% 65%, 50% 100%, 0% 65%)',
        }}
      >
        <div className="w-1 h-1.5 bg-white rounded-full opacity-90" />
      </div>
    </div>
  );
});

/** CapCut-style dark ruler */
export const TimelineRuler: React.FC<TimelineRulerProps> = memo(({ totalWidth }) => {
  const { seek } = useEditorActions();

  const zoom = useUiStore((s) => s.zoom);
  const snapping = useUiStore((s) => s.snappingEnabled);
  const inPoint = usePlaybackStore((s) => s.inPoint);
  const outPoint = usePlaybackStore((s) => s.outPoint);
  const tracks = useProjectStore((s) => s.tracks);

  const rulerRef = useRef<HTMLDivElement | null>(null);

  let majorSec = 5;
  let subSec = 1;

  if (zoom >= 80) {
    majorSec = 1;
    subSec = 0.2;
  } else if (zoom >= 40) {
    majorSec = 2;
    subSec = 0.5;
  } else if (zoom >= 20) {
    majorSec = 5;
    subSec = 1;
  } else {
    majorSec = 10;
    subSec = 2;
  }

  const duration = totalWidth / zoom + 10;
  const majorTicksCount = Math.ceil(duration / majorSec);

  // Snap points are a pure function of tracks; memoise so ruler scrubbing
  // (dozens of mousemove events per second) doesn't re-traverse all clips.
  const snapPoints = useMemo(() => {
    const points: number[] = [0];
    tracks.forEach((t) => {
      t.clips.forEach((c) => {
        points.push(c.start);
        points.push(c.start + c.duration);
      });
    });
    return points;
  }, [tracks]);

  const handleSeekFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    let targetTime = Math.max(0, clickX / zoom);

    if (snapping) {
      targetTime = snapTime(targetTime, snapPoints, 8 / zoom);
    }

    seek(targetTime);
  };

  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleSeekFromEvent(e);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handleSeekFromEvent(moveEvent);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const inPx = inPoint !== null ? inPoint * zoom : null;
  const outPx = outPoint !== null ? outPoint * zoom : null;

  return (
    <div
      ref={rulerRef}
      onMouseDown={handleRulerMouseDown}
      className="h-7 bg-[var(--kf-surface-2)] relative select-none cursor-pointer overflow-hidden shrink-0"
      style={{ width: `${totalWidth}px` }}
    >
      {inPx !== null && outPx !== null && outPx > inPx && (
        <div
          className="absolute top-0 bottom-0 bg-[rgba(34,211,238,0.10)] border-x border-cyan-400/50 pointer-events-none z-10"
          style={{
            left: `${inPx}px`,
            width: `${outPx - inPx}px`,
          }}
        />
      )}

      {inPx !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none"
          style={{ left: `${inPx}px` }}
        >
          <div className="absolute top-0 left-0 bg-cyan-500 text-cyan-950 font-mono text-[7px] px-0.5 rounded-br font-bold">
            IN
          </div>
        </div>
      )}

      {outPx !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-20 pointer-events-none"
          style={{ left: `${outPx}px` }}
        >
          <div className="absolute top-0 right-0 bg-cyan-500 text-cyan-950 font-mono text-[7px] px-0.5 rounded-bl font-bold">
            OUT
          </div>
        </div>
      )}

      {Array.from({ length: majorTicksCount }).map((_, i) => {
        const time = i * majorSec;
        const left = time * zoom;

        return (
          <div key={i} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${left}px` }}>
            <div className="h-2.5 w-px bg-white/[0.14]" />
            <span className="absolute top-2 left-1 text-[8px] font-mono text-neutral-500 whitespace-nowrap select-none">
              {formatSMPTE(time)}
            </span>

            {Array.from({ length: Math.floor(majorSec / subSec) - 1 }).map((_, subIdx) => {
              const subLeft = (subIdx + 1) * subSec * zoom;
              return (
                <div
                  key={subIdx}
                  className="absolute top-0 h-1 w-px bg-white/[0.08]"
                  style={{ left: `${subLeft}px` }}
                />
              );
            })}
          </div>
        );
      })}

      <RulerCursor zoom={zoom} />
    </div>
  );
});
