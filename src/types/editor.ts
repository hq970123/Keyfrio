export type MediaType = 'video' | 'audio' | 'image' | 'text' | 'sticker' | 'lottie' | 'effect' | 'color';

export type TrackType = 'video' | 'audio';

export type GpuFilterType =
  | 'none'
  | 'glitch'
  | 'bloom'
  | 'shockwave'
  | 'rgbSplit'
  | 'crt'
  | 'vignette'
  | 'pixelate'
  | 'radialBlur'
  | 'neonGlow'
  | 'waterRipple';

export type GpuParticleType =
  | 'snow'
  | 'goldDust'
  | 'fireSparks'
  | 'cyberBokeh'
  | 'meteorShower'
  | 'matrixRain'
  | 'sakura'
  | 'stars';

export interface GpuEffectSettings {
  category: 'filter' | 'particle';
  filterType?: GpuFilterType;
  particleType?: GpuParticleType;
  intensity: number; // 0 to 100 (default 50)
  speed: number; // 0.2 to 3.0 (default 1.0)
  color?: string; // Hex color for particles or tint (e.g. #ffd700, #00ffff)
  density?: number; // Particle density multiplier 0.5 to 3.0 (default 1.0)
  size?: number; // Particle size 0.5 to 3.0 (default 1.0)
  frequency?: number; // Glitch jitter / ripple frequency 0.5 to 3.0 (default 1.0)
  blendMode?: 'normal' | 'add' | 'screen' | 'overlay' | 'multiply';
  name?: string;
}

export interface LottieSettings {
  sourceType: 'preset' | 'url' | 'json' | 'file';
  url?: string;
  jsonData?: string | object;
  loop?: boolean;
  speed?: number; // 0.25 to 4.0
  direction?: 1 | -1;
  name?: string;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '21:9';

export type AppView = 'landing' | 'home' | 'editor';

export interface Resolution {
  width: number;
  height: number;
  label?: string;
  aspectRatio: AspectRatio;
}

export interface Transform {
  x: number; // Offset from center in % (-100 to 100) or pixels
  y: number; // Offset from center in % (-100 to 100) or pixels
  scale: number; // 0.1 to 5.0 (default: 1)
  rotation: number; // -180 to 180 in degrees
  opacity: number; // 0 to 1
  zIndex: number;
  flipH?: boolean;
  flipV?: boolean;
}

export interface ColorFilter {
  brightness: number; // 0 to 200% (default: 100)
  contrast: number; // 0 to 200% (default: 100)
  saturate: number; // 0 to 200% (default: 100)
  blur: number; // 0 to 20px (default: 0)
  hueRotate: number; // 0 to 360deg (default: 0)
  sepia: number; // 0 to 100% (default: 0)
  grayscale: number; // 0 to 100% (default: 0)
  vignette: number; // 0 to 100% (default: 0)
  temperature: number; // -100 to 100 (default: 0)
}

export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring' | 'hold';

export interface Keyframe<T = number> {
  id: string;
  time: number; // relative to clip start (seconds, 0 <= time <= duration)
  value: T;
  easing: EasingType;
}

export interface ClipKeyframes {
  x?: Keyframe<number>[];
  y?: Keyframe<number>[];
  scale?: Keyframe<number>[];
  rotation?: Keyframe<number>[];
  opacity?: Keyframe<number>[];
  volume?: Keyframe<number>[];
  brightness?: Keyframe<number>[];
  contrast?: Keyframe<number>[];
  blur?: Keyframe<number>[];
  saturate?: Keyframe<number>[];
}

export interface ColorGradeWheel {
  r: number; // -1 to 1 (default 0)
  g: number; // -1 to 1 (default 0)
  b: number; // -1 to 1 (default 0)
  y: number; // master luma offset -1 to 1 (default 0)
}

export interface ToneCurvePoint {
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface ColorGrading {
  enabled: boolean;
  lift: ColorGradeWheel; // Shadows
  gamma: ColorGradeWheel; // Midtones
  gain: ColorGradeWheel; // Highlights
  offset: ColorGradeWheel; // Global offset
  temperature: number; // -100 to +100
  tint: number; // -100 to +100
  exposure: number; // -3.0 to +3.0 EV (default 0)
  contrast: number; // 0 to 200% (default 100)
  saturation: number; // 0 to 200% (default 100)
  vibrance: number; // -100 to +100 (default 0)
  curves?: {
    master: ToneCurvePoint[];
    red: ToneCurvePoint[];
    green: ToneCurvePoint[];
    blue: ToneCurvePoint[];
  };
}

export interface EqualizerSettings {
  enabled: boolean;
  lowGain: number; // -24dB to +24dB (default 0)
  lowFreq: number; // default 100Hz
  midGain: number; // -24dB to +24dB (default 0)
  midFreq: number; // default 1000Hz
  highGain: number; // -24dB to +24dB (default 0)
  highFreq: number; // default 8000Hz
  // 5-band extension
  band60?: number; // -24dB to +24dB
  band250?: number; // -24dB to +24dB
  band1000?: number; // -24dB to +24dB
  band4000?: number; // -24dB to +24dB
  band12000?: number; // -24dB to +24dB
}

export interface CompressorSettings {
  enabled: boolean;
  threshold: number; // -60dB to 0dB (default -24)
  ratio: number; // 1 to 20 (default 4)
  attack: number; // 0 to 1 (default 0.003s)
  release: number; // 0 to 1 (default 0.25s)
  knee: number; // 0 to 40 (default 30)
  makeupGain?: number; // 0 to 24dB
}

export interface ReverbSettings {
  enabled: boolean;
  wet: number; // 0 to 1 (default 0.3)
  decay: number; // 0.1 to 10s (default 1.5)
  preDelay?: number; // 0 to 0.1s
  roomSize?: number; // 0.1 to 1.0
}

export interface DelaySettings {
  enabled: boolean;
  time: number; // 0.01 to 1.0s (default 0.3)
  feedback: number; // 0 to 0.9 (default 0.4)
  wet: number; // 0 to 1.0 (default 0.3)
  pingPong?: boolean;
}

export interface DistortionSettings {
  enabled: boolean;
  drive: number; // 0 to 100 (default 20)
  tone: number; // 200 to 10000Hz (default 3000)
  warmth?: number; // 0 to 1
}

export interface NoiseGateSettings {
  enabled: boolean;
  threshold: number; // -80 to -20dB (default -45)
  reduction: number; // 0 to 1 (default 0.8)
}

export interface NormalizeSettings {
  enabled: boolean;
  targetDb: number; // 0, -1, -14 (LUFS)
}

export interface AudioSettings {
  volume: number; // 0 to 2 (0% to 200%, default: 1)
  fadeIn: number; // in seconds
  fadeOut: number; // in seconds
  fadeCurve?: 'linear' | 'exponential' | 'scurve';
  muted: boolean;
  pan: number; // -1 (left) to 1 (right)
  equalizer?: EqualizerSettings;
  compressor?: CompressorSettings;
  reverb?: ReverbSettings;
  delay?: DelaySettings;
  distortion?: DistortionSettings;
  noiseGate?: NoiseGateSettings;
  normalize?: NormalizeSettings;
  pitchShift?: number; // -12 to +12 semitones
  vocalClarity?: boolean;
  reverse?: boolean;
}

export interface SequenceMarker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface Sequence {
  id: string;
  name: string;
  resolution: Resolution;
  fps: number;
  duration: number;
  tracks: Track[];
  markers?: SequenceMarker[];
  playheadTime?: number;
  colorTag?: string;
}

export interface OpfsStats {
  isSupported: boolean;
  usageBytes: number;
  quotaBytes: number;
  fileCount: number;
}

export type TextAnimation = 'none' | 'typewriter' | 'fade' | 'slide-up' | 'pop' | 'bounce' | 'neon-pulse';

export interface TextSettings {
  text: string;
  fontFamily: string;
  fontSize: number; // in px at base 1080p
  fontWeight: 'normal' | 'bold' | '600' | '800';
  fontStyle: 'normal' | 'italic';
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string; // background banner color (empty if none)
  bgPadding: number;
  bgRadius: number;
  align: 'left' | 'center' | 'right';
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  animation: TextAnimation;
  letterSpacing: number;
  lineHeight: number;
}

export type TransitionType =
  | 'none'
  | 'crossDissolve'
  | 'fadeBlack'
  | 'fadeWhite'
  | 'wipeLeft'
  | 'wipeRight'
  | 'wipeUp'
  | 'zoomIn'
  | 'glitch'
  | 'blur';

export interface TransitionSettings {
  type: TransitionType;
  duration: number; // 0.2s to 2.0s
}

export type TimelineToolMode = 'select' | 'blade' | 'hand' | 'ripple';

export type TimelineTrackHeight = 'compact' | 'normal' | 'tall';

export interface SnapGuideInfo {
  time: number;
  label: string;
  type: 'clip-start' | 'clip-end' | 'playhead' | 'marker' | 'origin';
}

export interface Clip {
  id: string;
  trackId: string;
  type: MediaType;
  name: string;
  start: number; // start time on timeline (seconds)
  duration: number; // active duration on timeline (seconds)
  trimStart: number; // offset inside source (seconds)
  trimEnd: number; // source total duration limit (seconds)
  originalDuration: number; // source original duration
  sourceUrl?: string; // object URL or data URL or sample url
  sourceBlob?: Blob;
  thumbnailUrl?: string;
  thumbnails?: string[]; // Array of frame thumbnail data URLs for filmstrip
  color?: string; // Timeline badge color
  speed: number; // 0.25 to 4.0
  transform: Transform;
  filter: ColorFilter;
  audio: AudioSettings;
  text?: TextSettings;
  transition?: TransitionSettings;
  stickerEmoji?: string;
  stickerSvg?: string;
  lottie?: LottieSettings;
  gpuEffect?: GpuEffectSettings;
  audioWaveform?: number[]; // peak amplitudes 0-1 for waveform display
  /** Runtime-only DOM handle; Immer treats the branded value as atomic. */
  htmlMediaElement?: (HTMLVideoElement | HTMLAudioElement | HTMLImageElement) & { readonly __immer_atom?: never } | null;
  fileHandle?: any; // FileSystemFileHandle
  filePath?: string;
  isOffline?: boolean;
  needsPermission?: boolean;
  linkedClipId?: string; // ID of companion linked clip (e.g. video <-> audio)
  linkGroupId?: string; // Unique group ID connecting linked clips
  isLinked?: boolean; // Whether the clip is currently bound to another clip
  keyframes?: ClipKeyframes; // FreeCut Keyframe Animation Track
  colorGrading?: ColorGrading; // FreeCut Color Wheels & Curves Grading
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  visible?: boolean;
  muted?: boolean;
  locked?: boolean;
  isMuted?: boolean;
  isLocked?: boolean;
  isHidden?: boolean;
  isSolo?: boolean;
  volume: number;
  order: number;
  clips: Clip[];
}

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  blob?: Blob;
  duration: number;
  thumbnail?: string;
  thumbnails?: string[];
  width?: number;
  height?: number;
  size?: number;
  audioWaveform?: number[];
  category?: string;
  lottie?: LottieSettings;
  gpuEffect?: GpuEffectSettings;
  fileHandle?: any; // FileSystemFileHandle
  filePath?: string;
  isOffline?: boolean;
  needsPermission?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  resolution: Resolution;
  fps: number;
  duration: number; // max timeline duration (e.g. calculated from last clip or min 30s)
  tracks: Track[];
  sequences?: Sequence[]; // FreeCut Multi-Sequence timelines
  activeSequenceId?: string;
  lastModified: number;
}

export interface SnappingGuide {
  time: number;
  type: 'clip-start' | 'clip-end' | 'playhead' | 'marker';
}

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  lastModified: number;
  duration: number;
  trackCount: number;
  clipCount: number;
  thumbnail?: string;
  resolution?: Resolution;
  fps?: number;
}

export interface ExportProgress {
  progress: number;
  currentFrame: number;
  totalFrames: number;
  estimatedTimeRemaining: number;
}

export interface ExportSettings {
  resolution: Resolution;
  fps: number;
  format: 'webm' | 'mp4';
  quality: 'high' | 'medium' | 'low';
  filename: string;
}
