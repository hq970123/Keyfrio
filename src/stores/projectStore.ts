import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { castDraft } from 'immer';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  Project,
  Track,
  Clip,
  AspectRatio,
  Resolution,
  TrackType,
  MediaType,
} from '../types/editor';
import {
  createInitialProject,
  createClip,
  computeTotalDuration,
  uid,
} from '../domain/projectFactory';
import {
  updateClipInTracks,
  removeClipFromTracks,
  moveClipInTracks,
  splitClipAt,
  resolveTrackTypeForMedia,
  allocateNonOverlappingTrack,
} from '../domain/clipOps';
import { ASPECT_RATIOS } from '../constants/samples';

export interface ProjectState {
  project: Project;

  // Derived helpers (read-only convenience)
  tracks: Track[];
  totalDuration: number;

  // Core mutations
  setProject: (project: Project) => void;
  setProjectName: (name: string) => void;
  setAspectRatio: (aspect: AspectRatio, custom?: Resolution) => void;
  setFps: (fps: number) => void;

  // Track operations
  addTrack: (type: TrackType | MediaType, name?: string) => Track;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  reorderTrack: (trackId: string, direction: 'up' | 'down') => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;

  // Clip operations
  addClip: (trackId: string, clipData: Partial<Clip> & { type: MediaType }) => Clip;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  deleteClip: (clipId: string, ripple?: boolean) => void;
  moveClip: (clipId: string, targetTrackId: string, targetStart: number) => void;
  splitClip: (clipId: string, atTime: number) => void;
  duplicateClip: (clipId: string) => Clip | null;

  // Batch / high-level
  replaceTracks: (tracks: Track[]) => void;
  resetToNew: (name?: string, aspect?: AspectRatio) => void;
}

function withDerived(project: Project): Pick<ProjectState, 'project' | 'tracks' | 'totalDuration'> {
  const duration = computeTotalDuration(project.tracks);
  return {
    project: { ...project, duration, lastModified: Date.now() },
    tracks: project.tracks,
    totalDuration: duration,
  };
}

export const useProjectStore = create<ProjectState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...withDerived(createInitialProject()),

      setProject: (project) => set(withDerived(project)),

      setProjectName: (name) =>
        set((s) => {
          s.project.name = name;
          s.project.lastModified = Date.now();
        }),

      setAspectRatio: (aspect, custom) =>
        set((s) => {
          s.project.resolution = custom ?? ASPECT_RATIOS[aspect];
          s.project.lastModified = Date.now();
        }),

      setFps: (fps) =>
        set((s) => {
          s.project.fps = fps;
          s.project.lastModified = Date.now();
        }),

      addTrack: (typeOrMedia, name) => {
        const type: TrackType =
          typeOrMedia === 'audio' || typeOrMedia === 'video'
            ? typeOrMedia
            : resolveTrackTypeForMedia(typeOrMedia as MediaType);

        const sameType = get().tracks.filter((t) => t.type === type);
        const track: Track = {
          id: uid(`track-${type}`),
          name: name ?? (type === 'video' ? `V${sameType.length + 1}` : `A${sameType.length + 1}`),
          type,
          isMuted: false,
          isLocked: false,
          isHidden: false,
          isSolo: false,
          volume: 1,
          order: get().tracks.length,
          clips: [],
        };

        set((s) => {
          s.project.tracks.push(castDraft(track));
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        });
        return track;
      },

      removeTrack: (trackId) =>
        set((s) => {
          s.project.tracks = s.project.tracks.filter((t) => t.id !== trackId);
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        }),

      updateTrack: (trackId, updates) =>
        set((s) => {
          const t = s.project.tracks.find((tr) => tr.id === trackId);
          if (t) Object.assign(t, updates);
          s.project.lastModified = Date.now();
        }),

      reorderTrack: (trackId, direction) =>
        set((s) => {
          const idx = s.project.tracks.findIndex((t) => t.id === trackId);
          if (idx === -1) return;
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= s.project.tracks.length) return;
          const arr = s.project.tracks;
          [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
          arr.forEach((t, i) => {
            t.order = i;
          });
          s.project.lastModified = Date.now();
        }),

      toggleTrackMute: (trackId) =>
        set((s) => {
          const t = s.project.tracks.find((tr) => tr.id === trackId);
          if (t) t.isMuted = !t.isMuted;
        }),

      toggleTrackSolo: (trackId) =>
        set((s) => {
          const t = s.project.tracks.find((tr) => tr.id === trackId);
          if (t) t.isSolo = !t.isSolo;
        }),

      toggleTrackLock: (trackId) =>
        set((s) => {
          const t = s.project.tracks.find((tr) => tr.id === trackId);
          if (t) t.isLocked = !t.isLocked;
        }),

      toggleTrackHide: (trackId) =>
        set((s) => {
          const t = s.project.tracks.find((tr) => tr.id === trackId);
          if (t) t.isHidden = !t.isHidden;
        }),

      updateTrackVolume: (trackId, volume) =>
        set((s) => {
          const t = s.project.tracks.find((tr) => tr.id === trackId);
          if (t) t.volume = Math.max(0, Math.min(2, volume));
        }),

      addClip: (trackId, clipData) => {
        const clip = createClip({ ...clipData, trackId });
        set((s) => {
          const track = s.project.tracks.find((t) => t.id === trackId);
          if (track) {
            track.clips.push(castDraft(clip));
            track.clips.sort((a, b) => a.start - b.start);
          }
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        });
        return clip;
      },

      updateClip: (clipId, updates) =>
        set((s) => {
          s.project.tracks = castDraft(updateClipInTracks(s.project.tracks as unknown as Track[], clipId, updates));
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        }),

      deleteClip: (clipId, ripple = false) =>
        set((s) => {
          s.project.tracks = castDraft(removeClipFromTracks(s.project.tracks as unknown as Track[], clipId, ripple));
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        }),

      moveClip: (clipId, targetTrackId, targetStart) =>
        set((s) => {
          s.project.tracks = castDraft(moveClipInTracks(s.project.tracks as unknown as Track[], clipId, targetTrackId, targetStart));
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        }),

      splitClip: (clipId, atTime) =>
        set((s) => {
          for (const track of s.project.tracks) {
            const idx = track.clips.findIndex((c) => c.id === clipId);
            if (idx === -1) continue;
            const result = splitClipAt(track.clips[idx] as unknown as Clip, atTime);
            if (!result) return;
            const [left, right] = result;
            track.clips.splice(idx, 1, castDraft(left), castDraft(right));
            Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
            return;
          }
        }),

      duplicateClip: (clipId) => {
        const state = get();
        for (const track of state.tracks) {
          const clip = track.clips.find((c) => c.id === clipId);
          if (!clip) continue;
          const dup = createClip({
            ...clip,
            id: undefined,
            start: clip.start + clip.duration + 0.1,
            trackId: track.id,
          });
          set((s) => {
            const t = s.project.tracks.find((tr) => tr.id === track.id);
            if (t) {
              t.clips.push(castDraft(dup));
              t.clips.sort((a, b) => a.start - b.start);
            }
            Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
          });
          return dup;
        }
        return null;
      },

      replaceTracks: (tracks) =>
        set((s) => {
          s.project.tracks = castDraft(tracks);
          Object.assign(s, withDerived(castDraft(s.project) as unknown as Project));
        }),

      resetToNew: (name, aspect) => set(withDerived(createInitialProject(name, aspect))),
    }))
  )
);
