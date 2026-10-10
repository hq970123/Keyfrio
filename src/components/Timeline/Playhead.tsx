import React, { memo } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUiStore } from '../../stores/uiStore';

interface PlayheadProps {
  timelineScrollRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Fully migrated to Zustand – only re-renders when currentTime or zoom changes.
 */
export const Playhead: React.FC<PlayheadProps> = memo(() => {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const zoom = useUiStore((s) => s.zoom);
  const leftPosition = currentTime * zoom;

  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
      style={{
        left: `${leftPosition}px`,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Top Red Indicator Pip */}
      <div className="w-1.5 h-1.5 bg-red-500 rotate-45 -mt-0.5 shrink-0" />
      {/* Playhead Red Needle Line with glowing shadow */}
      <div className="w-0.5 flex-1 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]" />
    </div>
  );
});
