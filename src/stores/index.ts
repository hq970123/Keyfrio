/**
 * Keyfrio Store Layer (Zustand)
 *
 * Architecture principle:
 * - Each store owns a single domain concern
 * - Components subscribe only to the slices they need (useShallow / selectors)
 * - Side-effects (DB, media extraction, AI) live in services / hooks, not stores
 * - EditorContext is the sole mutation owner; stores are read-only mirrors
 */

export { useProjectStore } from './projectStore';
export type { ProjectState } from './projectStore';

export { usePlaybackStore } from './playbackStore';
export type { PlaybackState } from './playbackStore';

export { useSelectionStore } from './selectionStore';
export type { SelectionState } from './selectionStore';

export { useUiStore } from './uiStore';
export type { UiState } from './uiStore';

export { useAssetsStore } from './assetsStore';
export type { AssetsState } from './assetsStore';

import { useSelectionStore } from './selectionStore';
import { useProjectStore } from './projectStore';

/** Convenience: get currently selected clip object (read-only) */
export function useSelectedClip() {
  const selectedClipId = useSelectionStore((s) => s.selectedClipId);
  const tracks = useProjectStore((s) => s.tracks);
  if (!selectedClipId) return null;
  for (const track of tracks) {
    const clip = track.clips.find((c) => c.id === selectedClipId);
    if (clip) return clip;
  }
  return null;
}
