import {
  Project,
  Track,
  Resolution,
  AspectRatio,
  Clip,
  MediaType,
  Transform,
  ColorFilter,
  AudioSettings,
  TextSettings,
} from '../types/editor';
import {
  ASPECT_RATIOS,
  DEFAULT_TRANSFORM,
  DEFAULT_FILTER,
  DEFAULT_AUDIO,
  DEFAULT_TEXT,
} from '../constants/samples';

/** Create a clean professional NLE project with V1 + A1 tracks */
export function createInitialProject(
  name = '我的剪辑序列 (PR Sequence)',
  aspect: AspectRatio = '16:9',
  fps = 30,
  customResolution?: Resolution
): Project {
  const videoTrack: Track = {
    id: 'track-video-1',
    name: 'V1',
    type: 'video',
    isMuted: false,
    isLocked: false,
    isHidden: false,
    isSolo: false,
    volume: 1,
    order: 0,
    clips: [],
  };

  const audioTrack: Track = {
    id: 'track-audio-1',
    name: 'A1',
    type: 'audio',
    isMuted: false,
    isLocked: false,
    isHidden: false,
    isSolo: false,
    volume: 1,
    order: 1,
    clips: [],
  };

  return {
    id: `proj-${Date.now()}`,
    name,
    resolution: customResolution ?? ASPECT_RATIOS[aspect],
    fps,
    duration: 30,
    tracks: [videoTrack, audioTrack],
    lastModified: Date.now(),
  };
}

/** Generate a unique id with optional prefix */
export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a default Clip from partial data */
export function createClip(partial: Partial<Clip> & { type: MediaType; trackId: string }): Clip {
  const duration = partial.duration ?? 5;
  return {
    id: partial.id ?? uid('clip'),
    trackId: partial.trackId,
    type: partial.type,
    name: partial.name ?? 'Untitled',
    start: partial.start ?? 0,
    duration,
    trimStart: partial.trimStart ?? 0,
    trimEnd: partial.trimEnd ?? duration,
    originalDuration: partial.originalDuration ?? duration,
    sourceUrl: partial.sourceUrl,
    sourceBlob: partial.sourceBlob,
    thumbnailUrl: partial.thumbnailUrl,
    thumbnails: partial.thumbnails,
    color: partial.color,
    speed: partial.speed ?? 1,
    transform: { ...DEFAULT_TRANSFORM, ...partial.transform },
    filter: { ...DEFAULT_FILTER, ...partial.filter },
    audio: { ...DEFAULT_AUDIO, ...partial.audio },
    text: partial.text ? { ...DEFAULT_TEXT, ...partial.text } : undefined,
    transition: partial.transition,
    stickerEmoji: partial.stickerEmoji,
    stickerSvg: partial.stickerSvg,
    lottie: partial.lottie,
    gpuEffect: partial.gpuEffect,
    audioWaveform: partial.audioWaveform,
    htmlMediaElement: partial.htmlMediaElement ?? null,
    fileHandle: partial.fileHandle,
    filePath: partial.filePath,
    isOffline: partial.isOffline,
    needsPermission: partial.needsPermission,
    linkedClipId: partial.linkedClipId,
    linkGroupId: partial.linkGroupId,
    isLinked: partial.isLinked,
    keyframes: partial.keyframes,
    colorGrading: partial.colorGrading,
  };
}

/** Compute total project duration from the last clip end */
export function computeTotalDuration(tracks: Track[], minDuration = 30): number {
  let max = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const end = clip.start + clip.duration;
      if (end > max) max = end;
    }
  }
  return Math.max(minDuration, Math.ceil(max + 2));
}
