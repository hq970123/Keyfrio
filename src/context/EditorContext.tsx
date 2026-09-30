import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Clip,
  Project,
  ProjectSummary,
  Track,
  TrackType,
  MediaType,
  AspectRatio,
  AppView,
  Resolution,
  ColorFilter,
  TextSettings,
  TimelineToolMode,
  TimelineTrackHeight,
  SnapGuideInfo,
  MediaAsset,
} from '../types/editor';
import {
  ASPECT_RATIOS,
  DEFAULT_TRANSFORM,
  DEFAULT_FILTER,
  DEFAULT_AUDIO,
  DEFAULT_TEXT,
} from '../constants/samples';
import { LOTTIE_PRESETS } from '../constants/lottieSamples';
import { generateProceduralWaveform, playSynthesizedTone, fetchAndExtractWaveform } from '../utils/audio';
import {
  isTrackOverlapping,
  findTrackWithoutOverlap,
  allocateNonOverlappingTrack,
  resolveTrackTypeForMedia,
} from '../utils/trackCollision';
import { findSnapTime } from '../utils/time';
import { extractVideoMetadataAndFilmstrip, extractAudioMetadataAndWaveform, createFallbackThumbnail } from '../utils/mediaExtractor';
import { syncMediaPlayback, pauseAllMedia } from '../utils/mediaPlayback';
import {
  saveProjectToDB,
  loadProjectFromDB,
  listAllProjectsFromDB,
  deleteProjectFromDB,
  saveAssetToDB,
  loadAllAssetsFromDB,
  deleteAssetFromDB,
  hydrateProjectMediaUrls,
} from '../utils/db';
import {
  isFileSystemAccessSupported,
  isDirectoryPickerSupported,
  queryHandlePermission,
  requestHandlePermission,
  pickAndScanDirectory,
  pickLocalMediaFiles,
  ScannedLocalFile,
} from '../utils/fileSystem';

interface HistorySnapshot {
  tracks: Track[];
  resolution: Resolution;
  name: string;
}

interface EditorContextType {
  project: Project;
  tracks: Track[];
  selectedClipId: string | null;
  selectedClipIds: string[];
  selectedClip: Clip | null;
  activeTrackId: string | null;
  currentTime: number;
  isPlaying: boolean;
  totalDuration: number;
  zoom: number;
  snappingEnabled: boolean;
  snapping: boolean;
  magnetMode: boolean;
  toolMode: TimelineToolMode;
  rippleMode: boolean;
  trackHeight: TimelineTrackHeight;
  activeSnapGuide: SnapGuideInfo | null;
  inPoint: number | null;
  outPoint: number | null;
  showGrid: boolean;
  showSafeMargin: boolean;
  playbackSpeed: number;
  loop: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isExportModalOpen: boolean;
  isRecordModalOpen: boolean;
  recordMode: 'screen' | 'camera' | 'audio';
  isShortcutsModalOpen: boolean;
  isAiModalOpen: boolean;
  isAiCopilotDrawerOpen: boolean;
  isAudioStudioModalOpen: boolean;
  audioStudioTargetClipId: string | null;
  audioStudioTargetAsset: MediaAsset | null;
  activeSidebarTab: string;

  // View state (Landing vs Home vs Editor workspace)
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  openLanding: () => void;
  openEditor: () => void;
  openHome: () => void;

  // DB & Project Persistence
  dbSaveStatus: 'saved' | 'saving' | 'error';
  projectList: ProjectSummary[];
  isProjectManagerOpen: boolean;
  openProjectManager: () => void;
  closeProjectManager: () => void;
  switchProject: (projectId: string) => Promise<void>;
  createNewProject: (name?: string, aspect?: AspectRatio, fps?: number, customResolution?: Resolution, description?: string) => Promise<Project>;
  duplicateProject: (projectId: string) => Promise<void>;
  renameProject: (projectId: string, newName: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;

  // Real User Media Assets Library (with IndexedDB Blob backing)
  userAssets: MediaAsset[];
  addUserAsset: (asset: MediaAsset) => void;
  deleteUserAsset: (assetId: string) => void;
  clearUserAssets: () => void;
  importFiles: (files: FileList | File[]) => Promise<MediaAsset[]>;

  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  stepFrame: (frames: number) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setSnappingEnabled: (enabled: boolean) => void;
  setSnapping: (enabled: boolean) => void;
  setMagnetMode: (enabled: boolean) => void;
  setToolMode: (mode: TimelineToolMode) => void;
  setRippleMode: (enabled: boolean) => void;
  setTrackHeight: (height: TimelineTrackHeight) => void;
  setActiveSnapGuide: (guide: SnapGuideInfo | null) => void;
  setInPoint: (time: number | null) => void;
  setOutPoint: (time: number | null) => void;
  setShowGrid: (show: boolean) => void;
  setShowSafeMargin: (show: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setLoop: (loop: boolean) => void;
  setActiveSidebarTab: (tab: string) => void;

  selectClip: (clipId: string | null) => void;
  selectClips: (clipIds: string[]) => void;
  toggleClipSelection: (clipId: string) => void;
  setActiveTrackId: (trackId: string | null) => void;
  setAspectRatio: (aspect: AspectRatio) => void;
  setProjectName: (name: string) => void;

  // Clip CRUD, Clipboard & Advanced Transformations
  addClip: (trackId: string, clipData: Partial<Clip>) => Clip;
  addMediaToTimeline: (media: Partial<MediaAsset> & { text?: any; stickerEmoji?: string }) => Promise<Clip>;
  addMediaAtPosition: (media: Partial<MediaAsset> & { text?: any; stickerEmoji?: string }, targetTrackId?: string, targetTime?: number) => Promise<Clip>;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  moveClip: (clipId: string, targetTrackId: string, targetStart: number, ripple?: boolean) => void;
  moveClipsBatch: (clipsMovement: Array<{ clipId: string; targetTrackId: string; newStart: number }>) => void;
  trimClip: (clipId: string, newTrimStart: number, newDuration: number, newStart?: number, ripple?: boolean) => void;
  splitClip: (clipId?: string, splitAtTime?: number) => void;
  splitClipAtTime: (trackId: string, time: number) => void;
  duplicateClip: (clipId?: string) => void;
  deleteClip: (clipId: string) => void;
  rippleDeleteClip: (clipId: string) => void;
  deleteSelected: (ripple?: boolean) => void;
  deleteSelectedClips: (ripple?: boolean) => void;
  copySelectedClips: () => void;
  cutSelectedClips: () => void;
  pasteClips: () => void;
  closeGapAt: (trackId: string, time: number) => void;

  // Audio-Video Clip Linking & Unlinking (音画绑定与解绑)
  linkSelectedClips: () => void;
  unlinkSelectedClips: () => void;
  toggleLinkSelectedClips: () => void;
  linkClips: (clipId1: string, clipId2: string) => void;
  unlinkClips: (clipIds: string[]) => void;
  separateAudioFromVideo: (clipId: string) => Promise<Clip | null>;

  // Track CRUD & Reordering
  addTrack: (type: TrackType | MediaType, name?: string) => Track;
  removeTrack: (trackId: string) => void;
  deleteTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
  reorderTrack: (trackId: string, direction: 'up' | 'down') => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackSolo: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackHide: (trackId: string) => void;
  updateTrackVolume: (trackId: string, volume: number) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Project Import/Export
  exportProjectJSON: () => string;
  importProjectJSON: (jsonStr: string) => boolean;
  loadDemoProject: () => void;
  resetProject: () => void;

  // Modals & Copilot Drawer
  openExportModal: () => void;
  closeExportModal: () => void;
  openRecordModal: (mode?: 'screen' | 'camera' | 'audio') => void;
  closeRecordModal: () => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  openAiModal: () => void;
  closeAiModal: () => void;
  openAiCopilotDrawer: () => void;
  closeAiCopilotDrawer: () => void;
  toggleAiCopilotDrawer: () => void;
  openAudioStudio: (clipId?: string, asset?: MediaAsset) => void;
  closeAudioStudio: () => void;

  // AI Action Execution
  executeAiAction: (action: { type: string; payload: any; description?: string }) => { success: boolean; message: string };
  executeBatchAiActions: (actions: Array<{ type: string; payload: any; description?: string }>) => { success: boolean; count: number; message: string };

  // Media Relink & Local File Authorization
  offlineAssetsCount: number;
  needsPermissionCount: number;
  isRelinkModalOpen: boolean;
  openRelinkModal: () => void;
  closeRelinkModal: () => void;
  checkLocalMediaPermissions: () => Promise<void>;
  requestAllFilePermissions: () => Promise<{ authorized: number; total: number }>;
  relinkWithDirectory: () => Promise<{ reconnected: number; totalScanned: number }>;
  relinkWithFiles: (files: FileList | File[]) => Promise<{ reconnected: number }>;
  relinkSingleMedia: (targetNameOrId: string, file: File, handle?: any) => Promise<boolean>;
  openNativeFilePicker: (multiple?: boolean) => Promise<MediaAsset[]>;
}

const EditorContext = createContext<EditorContextType | null>(null);

const STORAGE_KEY = 'opencut_project_v4';

function createLocalProjectSnapshot(project: Project): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => {
        const { sourceBlob, thumbnailUrl, thumbnails, htmlMediaElement, ...snapshotClip } = clip;
        const sourceUrl = snapshotClip.sourceUrl;
        return {
          ...snapshotClip,
          sourceUrl: sourceUrl?.startsWith('blob:') || sourceUrl?.startsWith('data:') ? undefined : sourceUrl,
        };
      }),
    })),
  };
}

// Initial Project: Standard professional NLE sequence structure (V1 Video Track + A1 Audio Track) ready for imported media
function createInitialProject(): Project {
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
    id: 'proj-' + Date.now(),
    name: '我的剪辑序列 (PR Sequence)',
    resolution: ASPECT_RATIOS['16:9'],
    fps: 30,
    duration: 30,
    tracks: [videoTrack, audioTrack],
    lastModified: Date.now(),
  };
}

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<Project>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.tracks) && parsed.tracks.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return createInitialProject();
  });

  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [activeTrackId, setActiveTrackId] = useState<string | null>('track-video-1');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoom, setZoomState] = useState<number>(45); // px per second
  const [snappingEnabled, setSnappingEnabled] = useState<boolean>(true);
  const [magnetMode, setMagnetMode] = useState<boolean>(false);
  const [toolMode, setToolMode] = useState<TimelineToolMode>('select');
  const [rippleMode, setRippleMode] = useState<boolean>(false);
  const [trackHeight, setTrackHeight] = useState<TimelineTrackHeight>('normal');
  const [activeSnapGuide, setActiveSnapGuide] = useState<SnapGuideInfo | null>(null);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [showSafeMargin, setShowSafeMargin] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [loop, setLoop] = useState<boolean>(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('media');

  // View state: Landing page vs Home launcher vs Editor workspace
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const openLanding = useCallback(() => setCurrentView('landing'), []);
  const openEditor = useCallback(() => setCurrentView('editor'), []);
  const openHome = useCallback(() => setCurrentView('home'), []);

  // DB and Project persistence state
  const [dbSaveStatus, setDbSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [projectList, setProjectList] = useState<ProjectSummary[]>([]);
  const [isProjectManagerOpen, setIsProjectManagerOpen] = useState<boolean>(false);

  const openProjectManager = useCallback(() => setIsProjectManagerOpen(true), []);
  const closeProjectManager = useCallback(() => setIsProjectManagerOpen(false), []);

  // Real User Media Assets Library state
  const [userAssets, setUserAssets] = useState<MediaAsset[]>([]);

  const addUserAsset = useCallback((asset: MediaAsset) => {
    setUserAssets((prev) => [asset, ...prev.filter((a) => a.id !== asset.id)]);
    saveAssetToDB(asset).catch((err) => console.warn('Failed to save asset to DB:', err));
  }, []);

  const deleteUserAsset = useCallback((assetId: string) => {
    setUserAssets((prev) => prev.filter((a) => a.id !== assetId));
    deleteAssetFromDB(assetId).catch((err) => console.warn('Failed to delete asset from DB:', err));
  }, []);

  const clearUserAssets = useCallback(() => {
    setUserAssets([]);
  }, []);

  const refreshProjectList = useCallback(async () => {
    try {
      const list = await listAllProjectsFromDB();
      setProjectList(list);
    } catch (err) {
      console.warn('Failed to list projects from DB:', err);
    }
  }, []);

  // Local Media Relink & Authorization State
  const [isRelinkModalOpen, setIsRelinkModalOpen] = useState<boolean>(false);
  const openRelinkModal = useCallback(() => setIsRelinkModalOpen(true), []);
  const closeRelinkModal = useCallback(() => setIsRelinkModalOpen(false), []);

  // Helper to extract metadata and create a full MediaAsset from a File (and optional handle)
  const processFileToMediaAsset = useCallback(
    async (file: File, handle?: any, index: number = 0): Promise<MediaAsset> => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      const isAudio = file.type.startsWith('audio/');
      const isJson = file.name.endsWith('.json') || file.type === 'application/json';

      let type: MediaType = 'video';
      let duration = 5;
      let thumbnail = '';
      let thumbnails: string[] = [];
      let waveform: number[] | undefined = undefined;
      let lottieData: any = undefined;
      let width: number | undefined;
      let height: number | undefined;

      if (isJson) {
        type = 'lottie';
        duration = 4;
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          lottieData = {
            sourceType: 'file',
            jsonData: parsed,
            loop: true,
            speed: 1,
            direction: 1,
            name: parsed.nm || file.name.replace('.json', ''),
          };
          if (parsed.op && parsed.ip && parsed.fr) {
            duration = Math.max(1, (parsed.op - parsed.ip) / parsed.fr);
          }
        } catch {
          // ignore
        }
      } else if (isVideo) {
        type = 'video';
        try {
          const videoMeta = await extractVideoMetadataAndFilmstrip(url, 8);
          duration = videoMeta.duration || 10;
          width = videoMeta.width;
          height = videoMeta.height;
          thumbnail = videoMeta.thumbnailUrl;
          thumbnails = videoMeta.thumbnails;
        } catch (err) {
          console.warn('Video extraction error:', err);
          duration = 10;
          thumbnail = createFallbackThumbnail(file.name, '#3b82f6');
        }
      } else if (isImage) {
        type = 'image';
        thumbnail = url;
        duration = 5;
        try {
          const img = new Image();
          img.src = url;
          await new Promise<void>((resolve) => {
            img.onload = () => {
              width = img.naturalWidth;
              height = img.naturalHeight;
              resolve();
            };
            img.onerror = () => resolve();
          });
        } catch {
          // ignore
        }
      } else if (isAudio) {
        type = 'audio';
        try {
          const audioMeta = await extractAudioMetadataAndWaveform(file, 80);
          duration = audioMeta.duration || 15;
          waveform = audioMeta.waveform;
          thumbnail = createFallbackThumbnail(file.name, '#10b981');
        } catch (err) {
          console.warn('Audio extraction error:', err);
          duration = 15;
        }
      }

      return {
        id: `asset-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        type,
        url,
        blob: file,
        duration: Math.round(duration * 10) / 10,
        thumbnail: thumbnail || (thumbnails[0] ?? ''),
        thumbnails: thumbnails.length > 0 ? thumbnails : thumbnail ? [thumbnail] : undefined,
        width,
        height,
        size: file.size,
        lottie: lottieData,
        audioWaveform: waveform,
        fileHandle: handle,
        filePath: file.name,
        isOffline: false,
        needsPermission: false,
      };
    },
    []
  );

  // Check file permissions for stored handles on startup and update asset/clip statuses
  const checkLocalMediaPermissions = useCallback(async () => {
    try {
      const storedAssets = await loadAllAssetsFromDB();
      const updatedAssets: MediaAsset[] = [];

      for (const asset of storedAssets) {
        if (asset.fileHandle && isFileSystemAccessSupported()) {
          const perm = await queryHandlePermission(asset.fileHandle);
          if (perm === 'granted') {
            try {
              const file = await asset.fileHandle.getFile();
              const freshUrl = URL.createObjectURL(file);
              const refreshed = {
                ...asset,
                blob: file,
                url: freshUrl,
                isOffline: false,
                needsPermission: false,
              };
              updatedAssets.push(refreshed);
              await saveAssetToDB(refreshed);
              continue;
            } catch (err) {
              console.warn('Error reading granted handle:', err);
            }
          } else if (perm === 'prompt') {
            updatedAssets.push({
              ...asset,
              isOffline: true,
              needsPermission: true,
            });
            continue;
          }
        }
        updatedAssets.push(asset);
      }

      setUserAssets(updatedAssets);

      // Hydrate current project clips
      setProject((prevProj) => hydrateProjectMediaUrls(prevProj, updatedAssets));
    } catch (err) {
      console.warn('Check local media permissions error:', err);
    }
  }, []);

  // Request user permission for all file handles awaiting permission
  const requestAllFilePermissions = useCallback(async (): Promise<{ authorized: number; total: number }> => {
    let authorized = 0;
    let total = 0;

    const assetsToAuth = userAssets.filter((a) => a.fileHandle && (a.needsPermission || a.isOffline));
    total = assetsToAuth.length;

    const nextAssets = [...userAssets];

    for (let i = 0; i < nextAssets.length; i++) {
      const a = nextAssets[i];
      if (a.fileHandle) {
        const granted = await requestHandlePermission(a.fileHandle);
        if (granted) {
          try {
            const file = await a.fileHandle.getFile();
            const freshUrl = URL.createObjectURL(file);
            const updated: MediaAsset = {
              ...a,
              blob: file,
              url: freshUrl,
              isOffline: false,
              needsPermission: false,
            };
            nextAssets[i] = updated;
            await saveAssetToDB(updated);
            authorized++;
          } catch (err) {
            console.warn('Error getting file after permission grant:', err);
          }
        }
      }
    }

    setUserAssets(nextAssets);
    setProject((prev) => hydrateProjectMediaUrls(prev, nextAssets));
    return { authorized, total };
  }, [userAssets]);

  // Relink project and asset library by auto-scanning a chosen folder
  const relinkWithDirectory = useCallback(async (): Promise<{ reconnected: number; totalScanned: number }> => {
    const scanResult = await pickAndScanDirectory();
    const scannedFiles = scanResult.files;
    let reconnected = 0;

    const scannedMap = new Map<string, ScannedLocalFile>();
    scannedFiles.forEach((f) => {
      scannedMap.set(f.name.toLowerCase(), f);
    });

    // 1. Relink userAssets
    const updatedUserAssets = await Promise.all(
      userAssets.map(async (asset) => {
        const match = scannedMap.get(asset.name.toLowerCase());
        if (match) {
          try {
            const file = await match.getFile();
            const processed = await processFileToMediaAsset(file, match.fileHandle);
            reconnected++;
            const merged: MediaAsset = {
              ...asset,
              ...processed,
              id: asset.id,
            };
            await saveAssetToDB(merged);
            return merged;
          } catch (err) {
            console.warn('Relink file error:', err);
          }
        }
        return asset;
      })
    );

    setUserAssets(updatedUserAssets);

    // 2. Relink timeline clips directly
    setProject((prev) => {
      const nextTracks = prev.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => {
          const match = scannedMap.get(clip.name.toLowerCase());
          if (match && (clip.isOffline || !clip.sourceUrl)) {
            const matchedAsset = updatedUserAssets.find((a) => a.name.toLowerCase() === clip.name.toLowerCase());
            return {
              ...clip,
              sourceUrl: matchedAsset?.url || clip.sourceUrl,
              sourceBlob: matchedAsset?.blob || clip.sourceBlob,
              fileHandle: match.fileHandle,
              isOffline: false,
              needsPermission: false,
              thumbnails: matchedAsset?.thumbnails || clip.thumbnails,
              thumbnailUrl: matchedAsset?.thumbnail || clip.thumbnailUrl,
              audioWaveform: matchedAsset?.audioWaveform || clip.audioWaveform,
            };
          }
          return clip;
        }),
      }));
      return { ...prev, tracks: nextTracks };
    });

    return { reconnected, totalScanned: scannedFiles.length };
  }, [userAssets, processFileToMediaAsset]);

  // Relink using a batch of files selected via standard or multiple file input
  const relinkWithFiles = useCallback(
    async (files: FileList | File[]): Promise<{ reconnected: number }> => {
      const fileList = Array.from(files);
      const fileMap = new Map<string, File>();
      fileList.forEach((f) => {
        fileMap.set(f.name.toLowerCase(), f);
      });

      let reconnected = 0;
      const updatedUserAssets = await Promise.all(
        userAssets.map(async (asset) => {
          const match = fileMap.get(asset.name.toLowerCase());
          if (match) {
            try {
              const processed = await processFileToMediaAsset(match);
              reconnected++;
              const merged: MediaAsset = {
                ...asset,
                ...processed,
                id: asset.id,
              };
              await saveAssetToDB(merged);
              return merged;
            } catch (err) {
              console.warn('Relink file error:', err);
            }
          }
          return asset;
        })
      );

      setUserAssets(updatedUserAssets);

      setProject((prev) => {
        const nextTracks = prev.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            const match = fileMap.get(clip.name.toLowerCase());
            if (match) {
              const matchedAsset = updatedUserAssets.find((a) => a.name.toLowerCase() === clip.name.toLowerCase());
              return {
                ...clip,
                sourceUrl: matchedAsset?.url || (match ? URL.createObjectURL(match) : clip.sourceUrl),
                sourceBlob: match || clip.sourceBlob,
                isOffline: false,
                needsPermission: false,
                thumbnails: matchedAsset?.thumbnails || clip.thumbnails,
                thumbnailUrl: matchedAsset?.thumbnail || clip.thumbnailUrl,
                audioWaveform: matchedAsset?.audioWaveform || clip.audioWaveform,
              };
            }
            return clip;
          }),
        }));
        return { ...prev, tracks: nextTracks };
      });

      return { reconnected };
    },
    [userAssets, processFileToMediaAsset]
  );

  // Relink a specific single asset or timeline clip
  const relinkSingleMedia = useCallback(
    async (targetNameOrId: string, file: File, handle?: any): Promise<boolean> => {
      try {
        const processed = await processFileToMediaAsset(file, handle);

        // Update in userAssets
        setUserAssets((prev) =>
          prev.map((a) => {
            if (a.name.toLowerCase() === targetNameOrId.toLowerCase() || a.id === targetNameOrId) {
              const merged = { ...a, ...processed, id: a.id };
              saveAssetToDB(merged).catch((err) => console.warn(err));
              return merged;
            }
            return a;
          })
        );

        // Update in project clips
        setProject((prev) => ({
          ...prev,
          tracks: prev.tracks.map((track) => ({
            ...track,
            clips: track.clips.map((clip) => {
              if (clip.name.toLowerCase() === targetNameOrId.toLowerCase() || clip.id === targetNameOrId) {
                return {
                  ...clip,
                  sourceUrl: processed.url,
                  sourceBlob: file,
                  fileHandle: handle,
                  isOffline: false,
                  needsPermission: false,
                  thumbnails: processed.thumbnails || clip.thumbnails,
                  thumbnailUrl: processed.thumbnail || clip.thumbnailUrl,
                  audioWaveform: processed.audioWaveform || clip.audioWaveform,
                };
              }
              return clip;
            }),
          })),
        }));

        return true;
      } catch (err) {
        console.warn('Relink single media error:', err);
        return false;
      }
    },
    [processFileToMediaAsset]
  );

  // Native File Picker with File System Access Handle preservation
  const openNativeFilePicker = useCallback(
    async (multiple: boolean = true): Promise<MediaAsset[]> => {
      const scanned = await pickLocalMediaFiles(multiple);
      const newAssets: MediaAsset[] = [];

      for (let i = 0; i < scanned.length; i++) {
        const item = scanned[i];
        const file = await item.getFile();
        const asset = await processFileToMediaAsset(file, item.fileHandle, i);
        await saveAssetToDB(asset);
        newAssets.push(asset);
      }

      if (newAssets.length > 0) {
        setUserAssets((prev) => [...newAssets, ...prev]);
      }
      return newAssets;
    },
    [processFileToMediaAsset]
  );

  // Initial DB load on startup
  useEffect(() => {
    let isMounted = true;
    async function initDB() {
      try {
        // 1. Load all stored binary assets
        const loadedAssets = await loadAllAssetsFromDB();
        if (isMounted && loadedAssets.length > 0) {
          setUserAssets(loadedAssets);
        }

        // 2. Load stored projects list
        const storedProjects = await listAllProjectsFromDB();
        if (isMounted) {
          setProjectList(storedProjects);
        }

        // 3. Hydrate active project from IndexedDB if present
        if (storedProjects.length > 0) {
          const lastProjId = localStorage.getItem('opencut_active_project_id') || storedProjects[0].id;
          const fullProj = await loadProjectFromDB(lastProjId);
          if (fullProj && isMounted) {
            const hydrated = hydrateProjectMediaUrls(fullProj, loadedAssets);
            setProject(hydrated);
          }
        }

        // 4. Perform background permission check on handles
        if (isMounted) {
          checkLocalMediaPermissions();
        }
      } catch (err) {
        console.warn('DB initialization error:', err);
      }
    }
    initDB();
    return () => {
      isMounted = false;
    };
  }, [checkLocalMediaPermissions]);

  const importFiles = useCallback(
    async (files: FileList | File[]): Promise<MediaAsset[]> => {
      const newAssets: MediaAsset[] = [];
      const fileList = Array.from(files);

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const asset = await processFileToMediaAsset(file, undefined, i);
        saveAssetToDB(asset).catch((err) => console.warn('Failed to save asset to DB:', err));
        newAssets.push(asset);
      }

      setUserAssets((prev) => [...newAssets, ...prev]);
      return newAssets;
    },
    [processFileToMediaAsset]
  );

  // Compute offline and permission needed asset counters
  const offlineAssetsCount = useMemo(() => {
    let count = 0;
    const countedNames = new Set<string>();

    userAssets.forEach((a) => {
      if (a.isOffline || (!a.url && !a.blob)) {
        count++;
        if (a.name) countedNames.add(a.name.toLowerCase());
      }
    });

    project.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (
          (c.type === 'video' || c.type === 'audio' || c.type === 'image') &&
          (c.isOffline || (!c.sourceUrl && !c.sourceBlob)) &&
          (!c.name || !countedNames.has(c.name.toLowerCase()))
        ) {
          count++;
          if (c.name) countedNames.add(c.name.toLowerCase());
        }
      });
    });

    return count;
  }, [userAssets, project.tracks]);

  const needsPermissionCount = useMemo(() => {
    let count = 0;
    const countedNames = new Set<string>();

    userAssets.forEach((a) => {
      if (a.needsPermission) {
        count++;
        if (a.name) countedNames.add(a.name.toLowerCase());
      }
    });

    project.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (c.needsPermission && (!c.name || !countedNames.has(c.name.toLowerCase()))) {
          count++;
          if (c.name) countedNames.add(c.name.toLowerCase());
        }
      });
    });

    return count;
  }, [userAssets, project.tracks]);

  // History stack for Undo/Redo
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Auto-save project changes to IndexedDB and localStorage (debounced)
  useEffect(() => {
    setDbSaveStatus('saving');
    const handler = setTimeout(async () => {
      try {
        // IndexedDB is the primary store. A large localStorage snapshot (especially
        // embedded thumbnails) can exceed the browser quota and must not block it.
        await saveProjectToDB(project);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(createLocalProjectSnapshot(project)));
          localStorage.setItem('opencut_active_project_id', project.id);
        } catch (storageError) {
          console.warn('Project saved to IndexedDB; localStorage cache could not be updated:', storageError);
        }
        await refreshProjectList();
        setDbSaveStatus('saved');
      } catch (err) {
        console.warn('Failed to auto-save project to IndexedDB:', err);
        setDbSaveStatus('error');
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [project, refreshProjectList]);

  // Multi-project switching, creation, duplication, rename, deletion
  const switchProject = useCallback(
    async (projectId: string) => {
      try {
        setDbSaveStatus('saving');
        await saveProjectToDB(project);
        const targetProj = await loadProjectFromDB(projectId);
        if (!targetProj) throw new Error('Project not found');

        const loadedAssets = await loadAllAssetsFromDB();
        const hydrated = hydrateProjectMediaUrls(targetProj, loadedAssets);
        setProject(hydrated);
        localStorage.setItem('opencut_active_project_id', projectId);
        setCurrentTime(0);
        setSelectedClipIds([]);
        setHistory([]);
        setHistoryIndex(-1);
        setDbSaveStatus('saved');
        setCurrentView('editor');
        await refreshProjectList();
      } catch (err) {
        console.error('Failed to switch project:', err);
        setDbSaveStatus('error');
      }
    },
    [project, refreshProjectList]
  );

  const createNewProject = useCallback(
    async (
      name?: string,
      aspect: AspectRatio = '16:9',
      fps: number = 30,
      customResolution?: Resolution,
      description?: string
    ) => {
      const videoTrack: Track = {
        id: `track-video-${Date.now()}`,
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
        id: `track-audio-${Date.now()}`,
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

      const targetResolution: Resolution =
        customResolution || ASPECT_RATIOS[aspect] || ASPECT_RATIOS['16:9'];

      const newProj: Project = {
        id: 'proj-' + Date.now(),
        name: name || `新剪辑序列 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
        description: description || '',
        resolution: targetResolution,
        fps: fps || 30,
        duration: 30,
        tracks: [videoTrack, audioTrack],
        lastModified: Date.now(),
      };

      await saveProjectToDB(newProj);
      localStorage.setItem('opencut_active_project_id', newProj.id);
      setProject(newProj);
      setCurrentTime(0);
      setSelectedClipIds([]);
      setHistory([]);
      setHistoryIndex(-1);
      setCurrentView('editor');
      await refreshProjectList();
      return newProj;
    },
    [refreshProjectList]
  );

  const renameProject = useCallback(
    async (projectId: string, newName: string) => {
      if (!newName.trim()) return;
      const targetProj = await loadProjectFromDB(projectId);
      if (targetProj) {
        const updated = { ...targetProj, name: newName.trim(), lastModified: Date.now() };
        await saveProjectToDB(updated);
        if (project.id === projectId) {
          setProject((prev) => ({ ...prev, name: newName.trim() }));
        }
        await refreshProjectList();
      }
    },
    [project.id, refreshProjectList]
  );

  const duplicateProject = useCallback(
    async (projectId: string) => {
      const source = await loadProjectFromDB(projectId);
      if (!source) return;
      const cloned: Project = {
        ...JSON.parse(JSON.stringify(source)),
        id: 'proj-' + Date.now(),
        name: `${source.name} (副本)`,
        lastModified: Date.now(),
      };
      await saveProjectToDB(cloned);
      await refreshProjectList();
    },
    [refreshProjectList]
  );

  const deleteProject = useCallback(
    async (projectId: string) => {
      await deleteProjectFromDB(projectId);
      const remaining = await listAllProjectsFromDB();
      setProjectList(remaining);
      if (project.id === projectId) {
        if (remaining.length > 0) {
          await switchProject(remaining[0].id);
        } else {
          await createNewProject('默认剪辑序列');
        }
      }
    },
    [project.id, switchProject, createNewProject]
  );

  // Backward compatibility alias for selectedClipId
  const selectedClipId = selectedClipIds.length > 0 ? selectedClipIds[selectedClipIds.length - 1] : null;

  const selectClip = useCallback(
    (clipId: string | null) => {
      if (!clipId) {
        setSelectedClipIds([]);
        return;
      }
      let linkedPartnerId: string | null = null;
      for (const t of project.tracks) {
        const c = t.clips.find((item) => item.id === clipId);
        if (c && c.isLinked && c.linkedClipId) {
          linkedPartnerId = c.linkedClipId;
          break;
        }
      }
      if (linkedPartnerId) {
        setSelectedClipIds([clipId, linkedPartnerId]);
      } else {
        setSelectedClipIds([clipId]);
      }
    },
    [project.tracks]
  );

  const selectClips = useCallback((clipIds: string[]) => {
    setSelectedClipIds(clipIds);
  }, []);

  const toggleClipSelection = useCallback(
    (clipId: string) => {
      let linkedPartnerId: string | null = null;
      for (const t of project.tracks) {
        const c = t.clips.find((item) => item.id === clipId);
        if (c && c.isLinked && c.linkedClipId) {
          linkedPartnerId = c.linkedClipId;
          break;
        }
      }
      setSelectedClipIds((prev) => {
        const isCurrentlySelected = prev.includes(clipId);
        if (isCurrentlySelected) {
          const toRemove = new Set([clipId, ...(linkedPartnerId ? [linkedPartnerId] : [])]);
          return prev.filter((id) => !toRemove.has(id));
        } else {
          const toAdd = [clipId, ...(linkedPartnerId ? [linkedPartnerId] : [])];
          return Array.from(new Set([...prev, ...toAdd]));
        }
      });
    },
    [project.tracks]
  );

  // Zoom setter supporting functional update
  const setZoom = useCallback((zoomOrFn: number | ((prev: number) => number)) => {
    setZoomState((prev) => {
      const next = typeof zoomOrFn === 'function' ? zoomOrFn(prev) : zoomOrFn;
      return Math.max(10, Math.min(200, next));
    });
  }, []);

  // Snapping alias
  const snapping = snappingEnabled;
  const setSnapping = setSnappingEnabled;

  // Calculate dynamic total duration (furthest clip end + 3s, minimum 16s)
  const totalDuration = useMemo(() => {
    let maxEnd = 16;
    project.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        const end = c.start + c.duration;
        if (end > maxEnd) maxEnd = end;
      });
    });
    return Math.max(16, Math.ceil(maxEnd + 3));
  }, [project.tracks]);

  // Update project duration when clips change
  useEffect(() => {
    setProject((prev) => (prev.duration !== totalDuration ? { ...prev, duration: totalDuration } : prev));
  }, [totalDuration]);

  // Push snapshot to history
  const pushHistory = useCallback(
    (newTracks: Track[]) => {
      const snapshot: HistorySnapshot = {
        tracks: JSON.parse(JSON.stringify(newTracks)),
        resolution: project.resolution,
        name: project.name,
      };
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, snapshot];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex, project.resolution, project.name]
  );

  // Find currently selected clip object
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of project.tracks) {
      const found = track.clips.find((c) => c.id === selectedClipId);
      if (found) return found;
    }
    return null;
  }, [project.tracks, selectedClipId]);

  // Playback RAF loop
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const deltaSec = ((now - lastTimeRef.current) / 1000) * playbackSpeed;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const nextTime = prev + deltaSec;
        const endBound = outPoint !== null ? outPoint : totalDuration;
        const startBound = inPoint !== null ? inPoint : 0;

        if (nextTime >= endBound) {
          if (loop) {
            return startBound;
          } else {
            setIsPlaying(false);
            return endBound;
          }
        }
        return nextTime;
      });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, playbackSpeed, totalDuration, loop, inPoint, outPoint]);

  // Synchronize real HTMLMediaElements (videos and audios) with timeline state
  useEffect(() => {
    syncMediaPlayback(project, currentTime, isPlaying, playbackSpeed);
  }, [project, currentTime, isPlaying, playbackSpeed]);

  useEffect(() => {
    return () => {
      pauseAllMedia();
    };
  }, []);

  // Playback controls
  const play = useCallback(() => {
    if (outPoint !== null && currentTime >= outPoint) {
      setCurrentTime(inPoint ?? 0);
    } else if (currentTime >= totalDuration) {
      setCurrentTime(0);
    }
    setIsPlaying(true);
  }, [currentTime, totalDuration, inPoint, outPoint]);

  const pause = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      setCurrentTime(Math.max(0, Math.min(totalDuration, time)));
    },
    [totalDuration]
  );

  const stepFrame = useCallback(
    (frames: number) => {
      const frameDuration = 1 / project.fps;
      setCurrentTime((prev) => Math.max(0, Math.min(totalDuration, prev + frames * frameDuration)));
    },
    [project.fps, totalDuration]
  );

  // Snapping guides calculation
  const snappingGuides = useMemo<SnapGuideInfo[]>(() => {
    const guides: SnapGuideInfo[] = [
      { time: 0, label: '00:00.0 (起点)', type: 'origin' },
      { time: currentTime, label: '播放头位置', type: 'playhead' },
    ];
    if (inPoint !== null) guides.push({ time: inPoint, label: '入点 (In)', type: 'marker' });
    if (outPoint !== null) guides.push({ time: outPoint, label: '出点 (Out)', type: 'marker' });

    project.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        guides.push({ time: c.start, label: `片段起点: ${c.name}`, type: 'clip-start' });
        guides.push({ time: c.start + c.duration, label: `片段终点: ${c.name}`, type: 'clip-end' });
      });
    });
    return guides;
  }, [project.tracks, currentTime, inPoint, outPoint]);

  // Add a new track (Restricted to Video and Audio tracks only)
  const addTrack = useCallback(
    (type: TrackType | MediaType, name?: string) => {
      const trackType: TrackType = type === 'audio' ? 'audio' : 'video';
      const id = `track-${trackType}-${Date.now()}`;
      const defaultName =
        trackType === 'video'
          ? `V${project.tracks.filter((t) => t.type === 'video').length + 1}`
          : `A${project.tracks.filter((t) => t.type === 'audio').length + 1}`;

      const newTrack: Track = {
        id,
        name: name || defaultName,
        type: trackType,
        isMuted: false,
        isLocked: false,
        isHidden: false,
        isSolo: false,
        volume: 1,
        order: project.tracks.length,
        clips: [],
      };

      setProject((prev) => {
        const nextTracks = [...prev.tracks, newTrack];
        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
      setActiveTrackId(id);
      return newTrack;
    },
    [project.tracks, pushHistory]
  );

  // Remove track
  const removeTrack = useCallback(
    (trackId: string) => {
      setProject((prev) => {
        const nextTracks = prev.tracks.filter((t) => t.id !== trackId);
        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
    },
    [pushHistory]
  );

  const deleteTrack = removeTrack;

  // Update track
  const updateTrack = useCallback(
    (trackId: string, updates: Partial<Track>) => {
      setProject((prev) => {
        const nextTracks = prev.tracks.map((t) => {
          if (t.id === trackId) {
            return {
              ...t,
              ...updates,
              // sync aliases
              visible: updates.isHidden !== undefined ? !updates.isHidden : updates.visible !== undefined ? updates.visible : t.visible,
              muted: updates.isMuted !== undefined ? updates.isMuted : updates.muted !== undefined ? updates.muted : t.muted,
              locked: updates.isLocked !== undefined ? updates.isLocked : updates.locked !== undefined ? updates.locked : t.locked,
            };
          }
          return t;
        });
        return { ...prev, tracks: nextTracks };
      });
    },
    []
  );

  // Reorder track up or down
  const reorderTrack = useCallback(
    (trackId: string, direction: 'up' | 'down') => {
      setProject((prev) => {
        const idx = prev.tracks.findIndex((t) => t.id === trackId);
        if (idx === -1) return prev;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.tracks.length) return prev;

        const nextTracks = [...prev.tracks];
        const [moved] = nextTracks.splice(idx, 1);
        nextTracks.splice(targetIdx, 0, moved);

        // Re-assign orders
        nextTracks.forEach((t, i) => {
          t.order = i;
        });

        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
    },
    [pushHistory]
  );

  // Toggle track mute/solo/lock/hide
  const toggleTrackMute = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, isMuted: !t.isMuted, muted: !t.isMuted } : t)),
    }));
  }, []);

  const toggleTrackSolo = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, isSolo: !t.isSolo } : t)),
    }));
  }, []);

  const toggleTrackLock = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, isLocked: !t.isLocked, locked: !t.isLocked } : t)),
    }));
  }, []);

  const toggleTrackHide = useCallback((trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, isHidden: !t.isHidden, visible: t.isHidden } : t)),
    }));
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, volume } : t)),
    }));
  }, []);

  // Add clip to specific track (automatically finds or creates non-overlapping track to prevent stacking)
  const addClip = useCallback(
    (trackId: string, clipData: Partial<Clip>) => {
      const id = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const type = clipData.type || 'video';
      const trackType = type === 'audio' ? 'audio' : 'video';

      const defaultColors: Record<MediaType, string> = {
        video: '#3b82f6',
        audio: '#10b981',
        text: '#f59e0b',
        sticker: '#ec4899',
        image: '#8b5cf6',
        effect: '#06b6d4',
        color: '#64748b',
        lottie: '#f59e0b',
      };

      const resolvedSourceUrl = clipData.sourceUrl || (clipData as any).url;
      const resolvedThumbnailUrl = clipData.thumbnailUrl || (clipData as any).thumbnail;
      const resolvedSourceBlob = clipData.sourceBlob || (clipData as any).blob;
      const resolvedThumbnails =
        clipData.thumbnails ||
        (resolvedThumbnailUrl ? [resolvedThumbnailUrl] : undefined);

      const start = clipData.start ?? currentTime;
      const duration = clipData.duration ?? 5;

      let finalClip: Clip | null = null;

      setProject((prev) => {
        // Allocate a track without overlap at [start, start + duration]
        const { targetTrack, updatedTracks } = allocateNonOverlappingTrack(
          prev.tracks,
          trackType,
          start,
          duration,
          trackId
        );

        const newClip: Clip = {
          id,
          trackId: targetTrack.id,
          type,
          name: clipData.name || (type === 'lottie' ? 'Lottie 动效' : `新片段`),
          start,
          duration,
          trimStart: clipData.trimStart ?? 0,
          trimEnd: clipData.trimEnd ?? duration,
          originalDuration: clipData.originalDuration ?? duration,
          sourceUrl: resolvedSourceUrl,
          sourceBlob: resolvedSourceBlob,
          thumbnailUrl: resolvedThumbnailUrl,
          thumbnails: resolvedThumbnails,
          speed: clipData.speed ?? 1,
          color: clipData.color || defaultColors[type],
          transform: clipData.transform || { ...DEFAULT_TRANSFORM },
          filter: clipData.filter || { ...DEFAULT_FILTER },
          audio: clipData.audio || { ...DEFAULT_AUDIO },
          text: clipData.text ? { ...DEFAULT_TEXT, ...clipData.text } : type === 'text' ? { ...DEFAULT_TEXT } : undefined,
          stickerEmoji: clipData.stickerEmoji,
          gpuEffect: clipData.gpuEffect,
          lottie:
            clipData.lottie ||
            (type === 'lottie'
              ? {
                  sourceType: 'preset',
                  jsonData: LOTTIE_PRESETS[0].jsonData,
                  loop: true,
                  speed: 1,
                  direction: 1,
                  name: '礼花彩带 (Confetti)',
                }
              : undefined),
          audioWaveform: clipData.audioWaveform || (type === 'audio' ? generateProceduralWaveform(60) : undefined),
        };

        finalClip = newClip;

        const nextTracks = updatedTracks.map((t) => {
          if (t.id === targetTrack.id) {
            return {
              ...t,
              clips: [...t.clips, newClip].sort((a, b) => a.start - b.start),
            };
          }
          return t;
        });

        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });

      setSelectedClipIds([id]);
      playSynthesizedTone('sfx-pop', 0.2, 0.4);
      return finalClip || ({ id, trackId, type, name: '新片段', start, duration } as Clip);
    },
    [currentTime, pushHistory]
  );

  // Helper to add media or template to timeline automatically with separate video & audio tracks and auto-linking
  const addMediaToTimeline = useCallback(
    async (media: Partial<MediaAsset> & { text?: any; stickerEmoji?: string }): Promise<Clip> => {
      const targetType = media.type || 'video';
      const isVideo = targetType === 'video';
      const isAudio = targetType === 'audio';

      let duration = media.duration || 5;
      let thumbnails = media.thumbnails;
      let waveform = media.audioWaveform;

      const sourceUrl = media.url || (media as any).sourceUrl;
      const thumbnailUrl = media.thumbnail || (media as any).thumbnailUrl;
      const sourceBlob = media.blob || (media as any).sourceBlob;

      // Extract real video/audio filmstrip thumbnails & waveform if available
      if (sourceUrl && isVideo) {
        if (!thumbnails || thumbnails.length <= 1) {
          try {
            const meta = await extractVideoMetadataAndFilmstrip(sourceUrl, 8);
            if (meta.duration > 0) duration = meta.duration;
            thumbnails = meta.thumbnails;
          } catch {
            // ignore
          }
        }
        if (!waveform) {
          try {
            const audioMeta = await extractAudioMetadataAndWaveform(sourceUrl, 80);
            waveform = audioMeta.waveform;
          } catch {
            waveform = generateProceduralWaveform(60);
          }
        }
      } else if (sourceUrl && isAudio && !waveform) {
        try {
          const meta = await extractAudioMetadataAndWaveform(sourceUrl, 80);
          if (meta.duration > 0) duration = meta.duration;
          waveform = meta.waveform;
        } catch {
          waveform = generateProceduralWaveform(60);
        }
      }

      const startPos = currentTime;

      // If video: load Video and Audio separately on timeline and bind/link them together
      if (isVideo) {
        const linkGroupId = `link-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const videoClipId = `clip-v-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const audioClipId = `clip-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let createdVideoClip: Clip | null = null;

        setProject((prev) => {
          // 1. Allocate Video Track (prefer active track if valid, or free track, or create new track)
          const videoAlloc = allocateNonOverlappingTrack(
            prev.tracks,
            'video',
            startPos,
            duration,
            activeTrackId
          );

          // 2. Allocate Audio Track (find free audio track at startPos, or create new track)
          const audioAlloc = allocateNonOverlappingTrack(
            videoAlloc.updatedTracks,
            'audio',
            startPos,
            duration
          );

          const videoClip: Clip = {
            id: videoClipId,
            trackId: videoAlloc.targetTrack.id,
            type: 'video',
            name: media.name || '视频片段',
            start: startPos,
            duration,
            trimStart: 0,
            trimEnd: duration,
            originalDuration: duration,
            sourceUrl,
            sourceBlob,
            thumbnailUrl,
            thumbnails: thumbnails || (thumbnailUrl ? [thumbnailUrl] : undefined),
            speed: (media as any).speed ?? 1,
            color: '#3b82f6',
            transform: (media as any).transform || { ...DEFAULT_TRANSFORM },
            filter: (media as any).filter || { ...DEFAULT_FILTER },
            audio: { ...DEFAULT_AUDIO, muted: true, volume: 0 }, // Muted so separate audio clip handles sound
            fileHandle: media.fileHandle,
            filePath: media.filePath,
            isOffline: media.isOffline,
            needsPermission: media.needsPermission,
            linkedClipId: audioClipId,
            linkGroupId,
            isLinked: true,
          };

          const audioClip: Clip = {
            id: audioClipId,
            trackId: audioAlloc.targetTrack.id,
            type: 'audio',
            name: `${media.name || '音频'} (音轨)`,
            start: startPos,
            duration,
            trimStart: 0,
            trimEnd: duration,
            originalDuration: duration,
            sourceUrl,
            sourceBlob,
            audioWaveform: waveform || generateProceduralWaveform(60),
            speed: (media as any).speed ?? 1,
            color: '#10b981',
            transform: { ...DEFAULT_TRANSFORM },
            filter: { ...DEFAULT_FILTER },
            audio: { ...DEFAULT_AUDIO, muted: false, volume: 1 },
            fileHandle: media.fileHandle,
            filePath: media.filePath,
            isOffline: media.isOffline,
            needsPermission: media.needsPermission,
            linkedClipId: videoClipId,
            linkGroupId,
            isLinked: true,
          };

          createdVideoClip = videoClip;

          const nextTracks = audioAlloc.updatedTracks.map((t) => {
            if (t.id === videoAlloc.targetTrack.id && t.id === audioAlloc.targetTrack.id) {
              return { ...t, clips: [...t.clips, videoClip, audioClip].sort((a, b) => a.start - b.start) };
            }
            if (t.id === videoAlloc.targetTrack.id) {
              return { ...t, clips: [...t.clips, videoClip].sort((a, b) => a.start - b.start) };
            }
            if (t.id === audioAlloc.targetTrack.id) {
              return { ...t, clips: [...t.clips, audioClip].sort((a, b) => a.start - b.start) };
            }
            return t;
          });

          pushHistory(nextTracks);
          return { ...prev, tracks: nextTracks };
        });

        setSelectedClipIds([videoClipId, audioClipId]);
        playSynthesizedTone('sfx-pop', 0.2, 0.4);
        return createdVideoClip || ({ id: videoClipId, trackId: '', type: 'video', name: media.name || '视频片段', start: startPos, duration } as Clip);
      }

      // Non-video media (Audio, Text, Sticker, Effect, Lottie, etc.)
      const trackType = isAudio ? 'audio' : 'video';

      return addClip(activeTrackId, {
        ...media,
        type: targetType as MediaType,
        sourceUrl,
        thumbnailUrl,
        sourceBlob,
        duration,
        thumbnails: thumbnails || (thumbnailUrl ? [thumbnailUrl] : undefined),
        audioWaveform: waveform,
        start: startPos,
      });
    },
    [activeTrackId, currentTime, addClip, pushHistory]
  );

  // Update clip properties
  const updateClip = useCallback((clipId: string, updates: Partial<Clip>) => {
    setProject((prev) => {
      const nextTracks = prev.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      }));
      return { ...prev, tracks: nextTracks };
    });
  }, []);

  // Move clip (with cross-track support, snapping, ripple shift, and synchronous linked companion clip movement)
  const moveClip = useCallback(
    (clipId: string, targetTrackId: string, targetStart: number, ripple = false) => {
      let finalStart = Math.max(0, targetStart);

      if (snappingEnabled) {
        const snapResult = findSnapTime(finalStart, snappingGuides, 0.25);
        finalStart = snapResult.snappedTime;
        setActiveSnapGuide(snapResult.guide);
      } else {
        setActiveSnapGuide(null);
      }

      setProject((prev) => {
        let targetClip: Clip | null = null;
        let originalStart = 0;
        let originalTrackId = '';

        // Locate clip in project tracks
        for (const t of prev.tracks) {
          const found = t.clips.find((c) => c.id === clipId);
          if (found) {
            targetClip = found;
            originalStart = found.start;
            originalTrackId = t.id;
            break;
          }
        }

        if (!targetClip) return prev;

        const delta = finalStart - originalStart;
        const isBound = targetClip.isLinked && !!targetClip.linkedClipId;
        const linkedPartnerId = isBound ? targetClip.linkedClipId : null;

        // Verify target track type compatibility for targetClip:
        // Audio clips belong on Audio tracks, all other content belongs on Video tracks
        const destTrack = prev.tracks.find((t) => t.id === targetTrackId);
        const isCompatible =
          destTrack &&
          (targetClip.type === 'audio'
            ? destTrack.type === 'audio'
            : destTrack.type === 'video');

        const actualTargetTrackId =
          destTrack && isCompatible ? targetTrackId : originalTrackId;

        const nextTracks = prev.tracks.map((t) => {
          let updatedClips = t.clips;

          // 1. Remove targetClip if moving to a different track
          const hadTarget = updatedClips.some((c) => c.id === clipId);
          if (hadTarget && t.id !== actualTargetTrackId) {
            updatedClips = updatedClips.filter((c) => c.id !== clipId);
          }

          // 2. If this is the destination track, update or insert targetClip
          if (t.id === actualTargetTrackId) {
            const updatedTarget: Clip = {
              ...targetClip!,
              trackId: actualTargetTrackId,
              start: finalStart,
            };
            if (hadTarget) {
              updatedClips = updatedClips.map((c) => (c.id === clipId ? updatedTarget : c));
            } else {
              updatedClips = [...updatedClips, updatedTarget];
            }
          }

          // 3. If track contains the bound linked clip, shift it synchronously by delta
          if (linkedPartnerId && updatedClips.some((c) => c.id === linkedPartnerId)) {
            updatedClips = updatedClips.map((c) => {
              if (c.id === linkedPartnerId) {
                return {
                  ...c,
                  start: Math.max(0, c.start + delta),
                };
              }
              return c;
            });
          }

          // 4. Ripple effect if enabled
          if (ripple && delta !== 0 && originalTrackId === actualTargetTrackId && t.id === actualTargetTrackId) {
            updatedClips = updatedClips.map((c) => {
              if (c.id !== clipId && c.id !== linkedPartnerId && c.start >= originalStart) {
                return { ...c, start: Math.max(0, c.start + delta) };
              }
              return c;
            });
          }

          return { ...t, clips: updatedClips.sort((a, b) => a.start - b.start) };
        });

        return { ...prev, tracks: nextTracks };
      });
    },
    [snappingEnabled, snappingGuides]
  );

  // Move multiple clips simultaneously
  const moveClipsBatch = useCallback(
    (clipsMovement: Array<{ clipId: string; targetTrackId: string; newStart: number }>) => {
      setProject((prev) => {
        const moveMap = new Map(clipsMovement.map((m) => [m.clipId, m]));
        const nextTracks = prev.tracks.map((t) => {
          // Filter out moved clips
          const remaining = t.clips.filter((c) => !moveMap.has(c.id));
          return { ...t, clips: remaining };
        });

        // Re-insert into target tracks
        clipsMovement.forEach((m) => {
          let origClip: Clip | null = null;
          for (const t of prev.tracks) {
            const found = t.clips.find((c) => c.id === m.clipId);
            if (found) {
              origClip = found;
              break;
            }
          }
          if (origClip) {
            const targetTrack = nextTracks.find((t) => t.id === m.targetTrackId);
            if (targetTrack) {
              targetTrack.clips.push({
                ...origClip,
                trackId: m.targetTrackId,
                start: Math.max(0, m.newStart),
              });
            }
          }
        });

        // Sort clips on each track
        nextTracks.forEach((t) => t.clips.sort((a, b) => a.start - b.start));
        return { ...prev, tracks: nextTracks };
      });
    },
    []
  );

  // Trim clip head or tail with optional ripple editing & linked companion sync
  const trimClip = useCallback(
    (clipId: string, newTrimStart: number, newDuration: number, newStart?: number, ripple = false) => {
      setProject((prev) => {
        let deltaDuration = 0;
        let clipTrackId = '';
        let clipOrigEnd = 0;
        let linkedPartnerId: string | null = null;

        for (const t of prev.tracks) {
          const found = t.clips.find((c) => c.id === clipId);
          if (found) {
            if (found.isLinked && found.linkedClipId) {
              linkedPartnerId = found.linkedClipId;
            }
            break;
          }
        }

        const finalDur = Math.max(0.2, newDuration);

        const nextTracks = prev.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.id === clipId) {
              clipTrackId = t.id;
              clipOrigEnd = c.start + c.duration;
              deltaDuration = finalDur - c.duration;
              return {
                ...c,
                trimStart: Math.max(0, newTrimStart),
                duration: finalDur,
                start: newStart !== undefined ? Math.max(0, newStart) : c.start,
              };
            }
            // If linked companion clip, trim synchronously
            if (linkedPartnerId && c.id === linkedPartnerId) {
              return {
                ...c,
                trimStart: Math.max(0, newTrimStart),
                duration: finalDur,
                start: newStart !== undefined ? Math.max(0, newStart) : c.start,
              };
            }
            return c;
          }),
        }));

        if (ripple && deltaDuration !== 0) {
          const trackToRipple = nextTracks.find((t) => t.id === clipTrackId);
          if (trackToRipple) {
            trackToRipple.clips = trackToRipple.clips.map((c) => {
              if (c.id !== clipId && c.id !== linkedPartnerId && c.start >= clipOrigEnd - 0.05) {
                return { ...c, start: Math.max(0, c.start + deltaDuration) };
              }
              return c;
            });
          }
        }

        return { ...prev, tracks: nextTracks };
      });
    },
    []
  );

  // Split clip at specified time (or current playhead) with linked pair synchronization
  const splitClip = useCallback(
    (targetClipId?: string, splitAtTime?: number) => {
      const timeToSplit = splitAtTime !== undefined ? splitAtTime : currentTime;
      const clipToSplitId = targetClipId || selectedClipId;

      let clipFound: Clip | null = null;
      let trackFound: Track | null = null;
      let linkedClipFound: Clip | null = null;
      let linkedTrackFound: Track | null = null;

      for (const t of project.tracks) {
        if (t.isLocked) continue;
        const found = clipToSplitId
          ? t.clips.find((c) => c.id === clipToSplitId)
          : t.clips.find((c) => timeToSplit > c.start && timeToSplit < c.start + c.duration);
        if (found) {
          clipFound = found;
          trackFound = t;
          break;
        }
      }

      if (!clipFound || !trackFound) return;
      if (timeToSplit <= clipFound.start || timeToSplit >= clipFound.start + clipFound.duration) return;

      // Check for linked companion clip
      if (clipFound.isLinked && clipFound.linkedClipId) {
        for (const t of project.tracks) {
          const found = t.clips.find((c) => c.id === clipFound!.linkedClipId);
          if (found && timeToSplit > found.start && timeToSplit < found.start + found.duration) {
            linkedClipFound = found;
            linkedTrackFound = t;
            break;
          }
        }
      }

      const firstDuration = timeToSplit - clipFound.start;
      const secondDuration = clipFound.duration - firstDuration;
      const secondTrimStart = clipFound.trimStart + firstDuration * clipFound.speed;

      const group1 = `link-${Date.now()}-part1`;
      const group2 = `link-${Date.now()}-part2`;

      const firstHalfId = clipFound.id;
      const secondHalfId = `clip-${Date.now()}-split-v`;
      let firstHalfAudioId = '';
      let secondHalfAudioId = '';

      if (linkedClipFound) {
        firstHalfAudioId = linkedClipFound.id;
        secondHalfAudioId = `clip-${Date.now()}-split-a`;
      }

      const firstHalf: Clip = {
        ...clipFound,
        duration: firstDuration,
        linkedClipId: linkedClipFound ? firstHalfAudioId : undefined,
        linkGroupId: linkedClipFound ? group1 : undefined,
        isLinked: !!linkedClipFound,
      };

      const secondHalf: Clip = {
        ...clipFound,
        id: secondHalfId,
        start: timeToSplit,
        duration: secondDuration,
        trimStart: secondTrimStart,
        linkedClipId: linkedClipFound ? secondHalfAudioId : undefined,
        linkGroupId: linkedClipFound ? group2 : undefined,
        isLinked: !!linkedClipFound,
      };

      let firstHalfLinked: Clip | null = null;
      let secondHalfLinked: Clip | null = null;

      if (linkedClipFound) {
        const linkedFirstDur = timeToSplit - linkedClipFound.start;
        const linkedSecDur = linkedClipFound.duration - linkedFirstDur;
        const linkedSecTrim = linkedClipFound.trimStart + linkedFirstDur * linkedClipFound.speed;

        firstHalfLinked = {
          ...linkedClipFound,
          duration: linkedFirstDur,
          linkedClipId: firstHalfId,
          linkGroupId: group1,
          isLinked: true,
        };

        secondHalfLinked = {
          ...linkedClipFound,
          id: secondHalfAudioId,
          start: timeToSplit,
          duration: linkedSecDur,
          trimStart: linkedSecTrim,
          linkedClipId: secondHalfId,
          linkGroupId: group2,
          isLinked: true,
        };
      }

      setProject((prev) => {
        const nextTracks = prev.tracks.map((t) => {
          if (t.id === trackFound!.id) {
            const updatedClips = t.clips.flatMap((c) => (c.id === clipFound!.id ? [firstHalf, secondHalf] : [c]));
            return { ...t, clips: updatedClips.sort((a, b) => a.start - b.start) };
          }
          if (linkedTrackFound && t.id === linkedTrackFound.id && firstHalfLinked && secondHalfLinked) {
            const updatedClips = t.clips.flatMap((c) =>
              c.id === linkedClipFound!.id ? [firstHalfLinked!, secondHalfLinked!] : [c]
            );
            return { ...t, clips: updatedClips.sort((a, b) => a.start - b.start) };
          }
          return t;
        });
        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });

      const nextSelection = [secondHalf.id];
      if (secondHalfLinked) nextSelection.push(secondHalfLinked.id);
      setSelectedClipIds(nextSelection);
      playSynthesizedTone('sfx-whoosh', 0.3, 0.4);
    },
    [currentTime, selectedClipId, project.tracks, pushHistory]
  );

  // Split clip at specific track and timestamp (for Razor Blade tool)
  const splitClipAtTime = useCallback(
    (trackId: string, time: number) => {
      const track = project.tracks.find((t) => t.id === trackId);
      if (!track || track.isLocked) return;
      const clip = track.clips.find((c) => time > c.start && time < c.start + c.duration);
      if (!clip) return;
      splitClip(clip.id, time);
    },
    [project.tracks, splitClip]
  );

  // Duplicate clip (with linked companion support and collision avoidance)
  const duplicateClip = useCallback(
    (clipId?: string) => {
      const idToDup = clipId || selectedClipId;
      if (!idToDup) return;

      let clipToDup: Clip | null = null;
      let trackId: string | null = null;
      let linkedClipToDup: Clip | null = null;
      let linkedTrackId: string | null = null;

      for (const t of project.tracks) {
        const found = t.clips.find((c) => c.id === idToDup);
        if (found) {
          clipToDup = found;
          trackId = t.id;
          break;
        }
      }

      if (!clipToDup || !trackId) return;

      if (clipToDup.isLinked && clipToDup.linkedClipId) {
        for (const t of project.tracks) {
          const found = t.clips.find((c) => c.id === clipToDup!.linkedClipId);
          if (found) {
            linkedClipToDup = found;
            linkedTrackId = t.id;
            break;
          }
        }
      }

      const newGroupId = `link-${Date.now()}-dup`;
      const newClipId = `clip-${Date.now()}-dup1`;
      const newLinkedId = `clip-${Date.now()}-dup2`;
      const targetStart = clipToDup.start + clipToDup.duration + 0.2;

      setProject((prev) => {
        const trackType = clipToDup!.type === 'audio' ? 'audio' : 'video';
        const primaryAlloc = allocateNonOverlappingTrack(
          prev.tracks,
          trackType,
          targetStart,
          clipToDup!.duration,
          trackId!
        );

        const newClip: Clip = {
          ...JSON.parse(JSON.stringify(clipToDup)),
          id: newClipId,
          trackId: primaryAlloc.targetTrack.id,
          name: `${clipToDup!.name} (副本)`,
          start: targetStart,
          linkedClipId: linkedClipToDup ? newLinkedId : undefined,
          linkGroupId: linkedClipToDup ? newGroupId : undefined,
          isLinked: !!linkedClipToDup,
        };

        let currentTracks = primaryAlloc.updatedTracks;
        let newLinkedClip: Clip | null = null;

        if (linkedClipToDup) {
          const linkedTrackType = linkedClipToDup.type === 'audio' ? 'audio' : 'video';
          const secondaryAlloc = allocateNonOverlappingTrack(
            currentTracks,
            linkedTrackType,
            targetStart,
            linkedClipToDup.duration,
            linkedTrackId || undefined
          );
          currentTracks = secondaryAlloc.updatedTracks;

          newLinkedClip = {
            ...JSON.parse(JSON.stringify(linkedClipToDup)),
            id: newLinkedId,
            trackId: secondaryAlloc.targetTrack.id,
            name: `${linkedClipToDup.name} (副本)`,
            start: targetStart,
            linkedClipId: newClipId,
            linkGroupId: newGroupId,
            isLinked: true,
          };
        }

        const nextTracks = currentTracks.map((t) => {
          let updatedClips = [...t.clips];
          if (t.id === newClip.trackId) {
            updatedClips.push(newClip);
          }
          if (newLinkedClip && t.id === newLinkedClip.trackId) {
            updatedClips.push(newLinkedClip);
          }
          return {
            ...t,
            clips: updatedClips.sort((a, b) => a.start - b.start),
          };
        });

        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });

      setSelectedClipIds(linkedClipToDup ? [newClipId, newLinkedId] : [newClipId]);
      playSynthesizedTone('sfx-pop', 0.2, 0.4);
    },
    [selectedClipId, project.tracks, pushHistory]
  );

  // Delete clip (normal) - also deletes linked companion clip
  const deleteClip = useCallback(
    (clipId: string) => {
      let linkedPartnerId: string | null = null;
      for (const t of project.tracks) {
        const c = t.clips.find((item) => item.id === clipId);
        if (c && c.isLinked && c.linkedClipId) {
          linkedPartnerId = c.linkedClipId;
          break;
        }
      }

      const removeSet = new Set([clipId, ...(linkedPartnerId ? [linkedPartnerId] : [])]);
      setProject((prev) => {
        const nextTracks = prev.tracks.map((t) => ({
          ...t,
          clips: t.clips.filter((c) => !removeSet.has(c.id)),
        }));
        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
      setSelectedClipIds((prev) => prev.filter((id) => !removeSet.has(id)));
    },
    [project.tracks, pushHistory]
  );

  // Ripple Delete: removes clip and shifts subsequent clips left to close the gap
  const rippleDeleteClip = useCallback(
    (clipId: string) => {
      let linkedPartnerId: string | null = null;
      for (const t of project.tracks) {
        const c = t.clips.find((item) => item.id === clipId);
        if (c && c.isLinked && c.linkedClipId) {
          linkedPartnerId = c.linkedClipId;
          break;
        }
      }

      const removeSet = new Set([clipId, ...(linkedPartnerId ? [linkedPartnerId] : [])]);

      setProject((prev) => {
        let deletedClip: Clip | null = null;
        let trackId = '';

        for (const t of prev.tracks) {
          const found = t.clips.find((c) => c.id === clipId);
          if (found) {
            deletedClip = found;
            trackId = t.id;
            break;
          }
        }

        if (!deletedClip) return prev;

        const shiftAmount = deletedClip.duration;
        const nextTracks = prev.tracks.map((t) => {
          const hasRemoved = t.clips.some((c) => removeSet.has(c.id));
          if (hasRemoved) {
            const remaining = t.clips
              .filter((c) => !removeSet.has(c.id))
              .map((c) => (c.start > deletedClip!.start ? { ...c, start: Math.max(0, c.start - shiftAmount) } : c));
            return { ...t, clips: remaining };
          }
          return t;
        });

        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
      setSelectedClipIds((prev) => prev.filter((id) => !removeSet.has(id)));
    },
    [project.tracks, pushHistory]
  );

  // Delete all selected clips (with optional ripple)
  const deleteSelectedClips = useCallback(
    (ripple = false) => {
      if (selectedClipIds.length === 0) return;
      if (ripple && selectedClipIds.length <= 2) {
        rippleDeleteClip(selectedClipIds[0]);
      } else {
        // Collect all IDs plus any linked companion IDs
        const removeSet = new Set(selectedClipIds);
        project.tracks.forEach((t) => {
          t.clips.forEach((c) => {
            if (selectedClipIds.includes(c.id) && c.isLinked && c.linkedClipId) {
              removeSet.add(c.linkedClipId);
            }
          });
        });

        setProject((prev) => {
          const nextTracks = prev.tracks.map((t) => ({
            ...t,
            clips: t.clips.filter((c) => !removeSet.has(c.id)),
          }));
          pushHistory(nextTracks);
          return { ...prev, tracks: nextTracks };
        });
        setSelectedClipIds([]);
      }
    },
    [selectedClipIds, project.tracks, rippleDeleteClip, pushHistory]
  );

  const deleteSelected = deleteSelectedClips;

  // Add media directly at specific track and target timestamp (for drag-and-drop onto timeline)
  const addMediaAtPosition = useCallback(
    async (
      media: Partial<MediaAsset> & { text?: any; stickerEmoji?: string },
      targetTrackId?: string,
      targetTime?: number
    ): Promise<Clip> => {
      const targetType = media.type || 'video';
      const isVideo = targetType === 'video';
      const isAudio = targetType === 'audio';

      const startPos = Math.max(0, targetTime !== undefined ? targetTime : currentTime);
      const sourceUrl = media.url || (media as any).sourceUrl;
      const thumbnailUrl = media.thumbnail || (media as any).thumbnailUrl;
      const sourceBlob = media.blob || (media as any).sourceBlob;

      let duration = media.duration || 5;
      let thumbnails = media.thumbnails;
      let waveform = media.audioWaveform;

      if (sourceUrl && isVideo) {
        if (!thumbnails || thumbnails.length <= 1) {
          try {
            const meta = await extractVideoMetadataAndFilmstrip(sourceUrl, 8);
            if (meta.duration > 0) duration = meta.duration;
            thumbnails = meta.thumbnails;
          } catch {
            // ignore
          }
        }
        if (!waveform) {
          try {
            const audioMeta = await extractAudioMetadataAndWaveform(sourceUrl, 80);
            waveform = audioMeta.waveform;
          } catch {
            waveform = generateProceduralWaveform(60);
          }
        }
      } else if (sourceUrl && isAudio && !waveform) {
        try {
          const meta = await extractAudioMetadataAndWaveform(sourceUrl, 80);
          if (meta.duration > 0) duration = meta.duration;
          waveform = meta.waveform;
        } catch {
          waveform = generateProceduralWaveform(60);
        }
      }

      // If video dropped onto timeline: create video clip on target track & paired audio clip on audio track (avoiding overlaps)
      if (isVideo) {
        const linkGroupId = `link-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const videoClipId = `clip-v-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const audioClipId = `clip-a-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        let createdVideoClip: Clip | null = null;

        setProject((prev) => {
          const videoAlloc = allocateNonOverlappingTrack(
            prev.tracks,
            'video',
            startPos,
            duration,
            targetTrackId
          );

          const audioAlloc = allocateNonOverlappingTrack(
            videoAlloc.updatedTracks,
            'audio',
            startPos,
            duration
          );

          const videoClip: Clip = {
            id: videoClipId,
            trackId: videoAlloc.targetTrack.id,
            type: 'video',
            name: media.name || '视频片段',
            start: startPos,
            duration,
            trimStart: 0,
            trimEnd: duration,
            originalDuration: duration,
            sourceUrl,
            sourceBlob,
            thumbnailUrl,
            thumbnails: thumbnails || (thumbnailUrl ? [thumbnailUrl] : undefined),
            speed: (media as any).speed ?? 1,
            color: '#3b82f6',
            transform: (media as any).transform || { ...DEFAULT_TRANSFORM },
            filter: (media as any).filter || { ...DEFAULT_FILTER },
            audio: { ...DEFAULT_AUDIO, muted: true, volume: 0 },
            fileHandle: media.fileHandle,
            filePath: media.filePath,
            isOffline: media.isOffline,
            needsPermission: media.needsPermission,
            linkedClipId: audioClipId,
            linkGroupId,
            isLinked: true,
          };

          const audioClip: Clip = {
            id: audioClipId,
            trackId: audioAlloc.targetTrack.id,
            type: 'audio',
            name: `${media.name || '音频'} (音轨)`,
            start: startPos,
            duration,
            trimStart: 0,
            trimEnd: duration,
            originalDuration: duration,
            sourceUrl,
            sourceBlob,
            audioWaveform: waveform || generateProceduralWaveform(60),
            speed: (media as any).speed ?? 1,
            color: '#10b981',
            transform: { ...DEFAULT_TRANSFORM },
            filter: { ...DEFAULT_FILTER },
            audio: { ...DEFAULT_AUDIO, muted: false, volume: 1 },
            fileHandle: media.fileHandle,
            filePath: media.filePath,
            isOffline: media.isOffline,
            needsPermission: media.needsPermission,
            linkedClipId: videoClipId,
            linkGroupId,
            isLinked: true,
          };

          createdVideoClip = videoClip;

          const nextTracks = audioAlloc.updatedTracks.map((t) => {
            if (t.id === videoAlloc.targetTrack.id && t.id === audioAlloc.targetTrack.id) {
              return { ...t, clips: [...t.clips, videoClip, audioClip].sort((a, b) => a.start - b.start) };
            }
            if (t.id === videoAlloc.targetTrack.id) {
              return { ...t, clips: [...t.clips, videoClip].sort((a, b) => a.start - b.start) };
            }
            if (t.id === audioAlloc.targetTrack.id) {
              return { ...t, clips: [...t.clips, audioClip].sort((a, b) => a.start - b.start) };
            }
            return t;
          });

          pushHistory(nextTracks);
          return { ...prev, tracks: nextTracks };
        });

        setSelectedClipIds([videoClipId, audioClipId]);
        playSynthesizedTone('sfx-pop', 0.2, 0.4);
        return createdVideoClip || ({ id: videoClipId, trackId: '', type: 'video', name: media.name || '视频片段', start: startPos, duration } as Clip);
      }

      const fallbackType = isAudio ? 'audio' : 'video';
      return addClip(targetTrackId, {
        ...media,
        type: (media.type || fallbackType) as MediaType,
        sourceUrl,
        thumbnailUrl,
        sourceBlob,
        duration,
        thumbnails: thumbnails || (thumbnailUrl ? [thumbnailUrl] : undefined),
        audioWaveform: waveform,
        start: startPos,
      });
    },
    [addClip, pushHistory]
  );

  // Audio-Video Binding / Linking Operations (绑定与取消绑定)
  const linkClips = useCallback(
    (clipId1: string, clipId2: string) => {
      const linkGroupId = `link-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setProject((prev) => {
        const nextTracks = prev.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (c.id === clipId1) {
              return { ...c, linkedClipId: clipId2, linkGroupId, isLinked: true };
            }
            if (c.id === clipId2) {
              return { ...c, linkedClipId: clipId1, linkGroupId, isLinked: true };
            }
            return c;
          }),
        }));
        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
      setSelectedClipIds([clipId1, clipId2]);
      playSynthesizedTone('sfx-pop', 0.2, 0.4);
    },
    [pushHistory]
  );

  const unlinkClips = useCallback(
    (clipIds: string[]) => {
      const idSet = new Set(clipIds);
      setProject((prev) => {
        const allToUnlink = new Set(idSet);
        prev.tracks.forEach((t) => {
          t.clips.forEach((c) => {
            if (idSet.has(c.id) && c.linkedClipId) {
              allToUnlink.add(c.linkedClipId);
            }
          });
        });

        const nextTracks = prev.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => {
            if (allToUnlink.has(c.id)) {
              const copy = { ...c, isLinked: false };
              delete copy.linkedClipId;
              delete copy.linkGroupId;
              return copy;
            }
            return c;
          }),
        }));
        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });
      playSynthesizedTone('sfx-pop', 0.15, 0.3);
    },
    [pushHistory]
  );

  const separateAudioFromVideo = useCallback(
    async (clipId: string): Promise<Clip | null> => {
      let videoClip: Clip | null = null;
      for (const t of project.tracks) {
        const found = t.clips.find((c) => c.id === clipId);
        if (found) {
          videoClip = found;
          break;
        }
      }

      if (!videoClip || videoClip.type !== 'video') return null;

      const linkGroupId = `link-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const audioClipId = `clip-audio-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      let waveform = videoClip.audioWaveform;
      if (!waveform && videoClip.sourceUrl) {
        try {
          const meta = await extractAudioMetadataAndWaveform(videoClip.sourceUrl, 80);
          waveform = meta.waveform;
        } catch {
          waveform = generateProceduralWaveform(60);
        }
      }

      let createdAudioClip: Clip | null = null;

      setProject((prev) => {
        // Allocate free audio track at [videoClip.start, videoClip.start + videoClip.duration] or create new
        const { targetTrack, updatedTracks } = allocateNonOverlappingTrack(
          prev.tracks,
          'audio',
          videoClip!.start,
          videoClip!.duration
        );

        const audioClip: Clip = {
          id: audioClipId,
          trackId: targetTrack.id,
          type: 'audio',
          name: `${videoClip!.name} (音频)`,
          start: videoClip!.start,
          duration: videoClip!.duration,
          trimStart: videoClip!.trimStart,
          trimEnd: videoClip!.trimEnd,
          originalDuration: videoClip!.originalDuration,
          sourceUrl: videoClip!.sourceUrl,
          sourceBlob: videoClip!.sourceBlob,
          audioWaveform: waveform || generateProceduralWaveform(60),
          speed: videoClip!.speed,
          color: '#10b981',
          transform: { ...DEFAULT_TRANSFORM },
          filter: { ...DEFAULT_FILTER },
          audio: { volume: 1, muted: false, pan: 0, fadeIn: 0, fadeOut: 0 },
          fileHandle: videoClip!.fileHandle,
          filePath: videoClip!.filePath,
          linkedClipId: videoClip!.id,
          linkGroupId,
          isLinked: true,
        };

        createdAudioClip = audioClip;

        const nextTracks = updatedTracks.map((t) => {
          if (t.clips.some((c) => c.id === clipId)) {
            return {
              ...t,
              clips: t.clips.map((c) => {
                if (c.id === clipId) {
                  return {
                    ...c,
                    linkedClipId: audioClipId,
                    linkGroupId,
                    isLinked: true,
                    audio: { ...c.audio, muted: true, volume: 0 },
                  };
                }
                return c;
              }),
            };
          }
          if (t.id === targetTrack.id) {
            return {
              ...t,
              clips: [...t.clips, audioClip].sort((a, b) => a.start - b.start),
            };
          }
          return t;
        });

        pushHistory(nextTracks);
        return { ...prev, tracks: nextTracks };
      });

      setSelectedClipIds([videoClip.id, audioClipId]);
      playSynthesizedTone('sfx-pop', 0.2, 0.4);
      return createdAudioClip;
    },
    [project.tracks, pushHistory]
  );

  const toggleLinkSelectedClips = useCallback(() => {
    if (selectedClipIds.length === 0) return;

    let hasLinked = false;
    for (const t of project.tracks) {
      for (const c of t.clips) {
        if (selectedClipIds.includes(c.id) && c.isLinked) {
          hasLinked = true;
          break;
        }
      }
      if (hasLinked) break;
    }

    if (hasLinked) {
      unlinkClips(selectedClipIds);
    } else {
      if (selectedClipIds.length >= 2) {
        linkClips(selectedClipIds[0], selectedClipIds[1]);
      } else if (selectedClipIds.length === 1) {
        separateAudioFromVideo(selectedClipIds[0]);
      }
    }
  }, [selectedClipIds, project.tracks, unlinkClips, linkClips, separateAudioFromVideo]);

  const linkSelectedClips = useCallback(() => {
    if (selectedClipIds.length >= 2) {
      linkClips(selectedClipIds[0], selectedClipIds[1]);
    }
  }, [selectedClipIds, linkClips]);

  const unlinkSelectedClips = useCallback(() => {
    if (selectedClipIds.length > 0) {
      unlinkClips(selectedClipIds);
    }
  }, [selectedClipIds, unlinkClips]);

  // Clipboard operations (Copy, Cut, Paste)
  const clipboardClipsRef = useRef<Clip[]>([]);

  const copySelectedClips = useCallback(() => {
    if (selectedClipIds.length === 0) return;
    const clipsToCopy: Clip[] = [];
    for (const track of project.tracks) {
      for (const clip of track.clips) {
        if (selectedClipIds.includes(clip.id)) {
          clipsToCopy.push(JSON.parse(JSON.stringify(clip)));
        }
      }
    }
    if (clipsToCopy.length > 0) {
      const minStart = Math.min(...clipsToCopy.map((c) => c.start));
      clipboardClipsRef.current = clipsToCopy.map((c) => ({
        ...c,
        start: c.start - minStart,
      }));
      playSynthesizedTone('sfx-pop', 0.1, 0.2);
    }
  }, [project.tracks, selectedClipIds]);

  const cutSelectedClips = useCallback(() => {
    copySelectedClips();
    deleteSelectedClips(false);
  }, [copySelectedClips, deleteSelectedClips]);

  const pasteClips = useCallback(() => {
    if (clipboardClipsRef.current.length === 0) return;
    const pasteTime = currentTime;
    const newClipIds: string[] = [];

    setProject((prev) => {
      let currentTracks = prev.tracks.map((t) => ({ ...t, clips: [...t.clips] }));

      clipboardClipsRef.current.forEach((clipTemplate) => {
        const newId = `clip-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        newClipIds.push(newId);

        const targetStart = pasteTime + clipTemplate.start;
        const trackType = clipTemplate.type === 'audio' ? 'audio' : 'video';

        const { targetTrack, updatedTracks } = allocateNonOverlappingTrack(
          currentTracks,
          trackType,
          targetStart,
          clipTemplate.duration,
          clipTemplate.trackId
        );

        currentTracks = updatedTracks.map((t) => {
          if (t.id === targetTrack.id) {
            const pastedClip: Clip = {
              ...clipTemplate,
              id: newId,
              trackId: targetTrack.id,
              start: targetStart,
            };
            return {
              ...t,
              clips: [...t.clips, pastedClip].sort((a, b) => a.start - b.start),
            };
          }
          return t;
        });
      });

      pushHistory(currentTracks);
      return { ...prev, tracks: currentTracks };
    });

    if (newClipIds.length > 0) {
      setSelectedClipIds(newClipIds);
      playSynthesizedTone('sfx-pop', 0.15, 0.3);
    }
  }, [currentTime, pushHistory]);

  // Ripple Close Gap at specified track and timestamp
  const closeGapAt = useCallback(
    (trackId: string, clickTime: number) => {
      setProject((prev) => {
        const track = prev.tracks.find((t) => t.id === trackId);
        if (!track || track.isLocked) return prev;

        const sorted = [...track.clips].sort((a, b) => a.start - b.start);
        if (sorted.length === 0) return prev;

        let gapStart = 0;
        let gapEnd = 0;
        let foundGap = false;

        if (clickTime < sorted[0].start) {
          gapStart = 0;
          gapEnd = sorted[0].start;
          foundGap = true;
        } else {
          for (let i = 0; i < sorted.length - 1; i++) {
            const curEnd = sorted[i].start + sorted[i].duration;
            const nextStart = sorted[i + 1].start;
            if (clickTime >= curEnd && clickTime <= nextStart) {
              gapStart = curEnd;
              gapEnd = nextStart;
              foundGap = true;
              break;
            }
          }
        }

        if (!foundGap || gapEnd <= gapStart + 0.01) return prev;

        const gapSize = gapEnd - gapStart;
        const nextTracks = prev.tracks.map((t) => {
          if (t.id !== trackId) return t;
          return {
            ...t,
            clips: t.clips
              .map((c) => {
                if (c.start >= gapEnd - 0.001) {
                  return { ...c, start: Math.max(gapStart, c.start - gapSize) };
                }
                return c;
              })
              .sort((a, b) => a.start - b.start),
          };
        });

        pushHistory(nextTracks);
        playSynthesizedTone('sfx-pop', 0.15, 0.3);
        return { ...prev, tracks: nextTracks };
      });
    },
    [pushHistory]
  );

  // Undo / Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
    if (!canUndo) return;
    const targetSnapshot = history[historyIndex - 1];
    setProject((prev) => ({
      ...prev,
      tracks: JSON.parse(JSON.stringify(targetSnapshot.tracks)),
      resolution: targetSnapshot.resolution,
      name: targetSnapshot.name,
    }));
    setHistoryIndex((prev) => prev - 1);
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    const targetSnapshot = history[historyIndex + 1];
    setProject((prev) => ({
      ...prev,
      tracks: JSON.parse(JSON.stringify(targetSnapshot.tracks)),
      resolution: targetSnapshot.resolution,
      name: targetSnapshot.name,
    }));
    setHistoryIndex((prev) => prev + 1);
  }, [canRedo, history, historyIndex]);

  // Change project aspect ratio
  const setAspectRatio = useCallback((aspect: AspectRatio) => {
    setProject((prev) => ({
      ...prev,
      resolution: ASPECT_RATIOS[aspect] || ASPECT_RATIOS['16:9'],
    }));
  }, []);

  const setProjectName = useCallback((name: string) => {
    setProject((prev) => ({ ...prev, name }));
  }, []);

  // Export JSON Project File
  const exportProjectJSON = useCallback(() => {
    return JSON.stringify(project, null, 2);
  }, [project]);

  // Import JSON Project File
  const importProjectJSON = useCallback(
    (jsonStr: string): boolean => {
      try {
        const parsed = JSON.parse(jsonStr) as Project;
        if (!parsed.tracks || !Array.isArray(parsed.tracks)) {
          throw new Error('无效的工程文件结构');
        }
        setProject(parsed);
        pushHistory(parsed.tracks);
        setCurrentView('editor');
        return true;
      } catch (e) {
        console.error('Import error:', e);
        return false;
      }
    },
    [pushHistory]
  );

  const loadDemoProject = useCallback(() => {
    const demo = createInitialProject();
    setProject(demo);
    pushHistory(demo.tracks);
    setCurrentView('editor');
  }, [pushHistory]);

  const resetProject = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const demo = createInitialProject();
    setProject(demo);
    pushHistory(demo.tracks);
    setSelectedClipIds([]);
    setCurrentTime(0);
  }, [pushHistory]);

  // Modals & Copilot Drawer
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState<boolean>(false);
  const [recordMode, setRecordMode] = useState<'screen' | 'camera' | 'audio'>('camera');
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [isAiCopilotDrawerOpen, setIsAiCopilotDrawerOpen] = useState<boolean>(false);
  const [isAudioStudioModalOpen, setIsAudioStudioModalOpen] = useState<boolean>(false);
  const [audioStudioTargetClipId, setAudioStudioTargetClipId] = useState<string | null>(null);
  const [audioStudioTargetAsset, setAudioStudioTargetAsset] = useState<MediaAsset | null>(null);

  const openExportModal = () => setIsExportModalOpen(true);
  const closeExportModal = () => setIsExportModalOpen(false);
  const openRecordModal = (mode: 'screen' | 'camera' | 'audio' = 'camera') => {
    setRecordMode(mode);
    setIsRecordModalOpen(true);
  };
  const closeRecordModal = () => setIsRecordModalOpen(false);
  const openShortcutsModal = () => setIsShortcutsModalOpen(true);
  const closeShortcutsModal = () => setIsShortcutsModalOpen(false);
  const openAiModal = () => setIsAiModalOpen(true);
  const closeAiModal = () => setIsAiModalOpen(false);
  const openAiCopilotDrawer = () => setIsAiCopilotDrawerOpen(true);
  const closeAiCopilotDrawer = () => setIsAiCopilotDrawerOpen(false);
  const toggleAiCopilotDrawer = () => setIsAiCopilotDrawerOpen((prev) => !prev);

  const openAudioStudio = useCallback((clipId?: string, asset?: MediaAsset) => {
    setAudioStudioTargetClipId(clipId || null);
    setAudioStudioTargetAsset(asset || null);
    setIsAudioStudioModalOpen(true);
  }, []);

  const closeAudioStudio = useCallback(() => {
    setIsAudioStudioModalOpen(false);
    setAudioStudioTargetClipId(null);
    setAudioStudioTargetAsset(null);
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused inside text inputs, textareas, or contentEditable elements
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Space: Toggle Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      // V: Select Tool
      else if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
      }
      // C: Razor / Blade Tool
      else if (e.key === 'c' || e.key === 'C') {
        setToolMode('blade');
      }
      // B: Ripple Edit Mode
      else if (e.key === 'b' || e.key === 'B') {
        setRippleMode((prev) => !prev);
      }
      // H: Hand Tool
      else if (e.key === 'h' || e.key === 'H') {
        setToolMode('hand');
      }
      // S: Split Clip at Playhead
      else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        splitClip();
      }
      // Delete / Backspace: Delete selected
      else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        deleteSelectedClips(e.shiftKey || rippleMode);
      }
      // Ctrl+D / Cmd+D: Duplicate
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateClip();
      }
      // Ctrl+Z / Cmd+Z: Undo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl+Y / Cmd+Shift+Z: Redo
      else if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        redo();
      }
      // Ctrl+A / Cmd+A: Select all clips
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds: string[] = [];
        project.tracks.forEach((t) => t.clips.forEach((c) => allIds.push(c.id)));
        selectClips(allIds);
      }
      // I: Set In-Point
      else if (e.key === 'i' || e.key === 'I') {
        setInPoint(currentTime);
      }
      // O: Set Out-Point
      else if (e.key === 'o' || e.key === 'O') {
        setOutPoint(currentTime);
      }
      // Alt+X: Clear In/Out Points
      else if (e.altKey && (e.key === 'x' || e.key === 'X')) {
        setInPoint(null);
        setOutPoint(null);
      }
      // ArrowLeft / ArrowRight: Step 1 frame (or Shift+Arrow for 1 second)
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(e.shiftKey ? -project.fps : -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepFrame(e.shiftKey ? project.fps : 1);
      }
      // Ctrl+L / Cmd+L: Toggle Link / Unlink Audio and Video
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        toggleLinkSelectedClips();
      }
      // N: Toggle Snapping
      else if (e.key === 'n' || e.key === 'N') {
        setSnappingEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    splitClip,
    deleteSelectedClips,
    duplicateClip,
    undo,
    redo,
    selectClips,
    toggleLinkSelectedClips,
    currentTime,
    stepFrame,
    project.fps,
    project.tracks,
    rippleMode,
  ]);

  // Execute structured AI actions on the timeline
  const executeAiAction = useCallback(
    (action: { type: string; payload: any; description?: string }): { success: boolean; message: string } => {
      const { type, payload } = action;
      try {
        switch (type) {
          case 'ADD_CLIP': {
            const trackType = payload.trackType === 'audio' ? 'audio' : 'video';
            let targetTrack = project.tracks.find((t) => t.type === trackType);
            if (!targetTrack) {
              targetTrack = addTrack(trackType);
            }
            addClip(targetTrack.id, payload.clipData || {});
            return { success: true, message: `成功添加片段: ${payload.clipData?.name || '新片段'}` };
          }
          case 'ADD_LOTTIE': {
            const presetId = payload.presetId || 'confetti';
            const preset = LOTTIE_PRESETS.find((p) => p.id === presetId) || LOTTIE_PRESETS[0];
            const videoTrack = project.tracks.find((t) => t.type === 'video' && !t.isLocked) || addTrack('video', 'V1');
            addClip(videoTrack.id, {
              name: payload.name || preset.name,
              type: 'lottie',
              start: Number(payload.start ?? currentTime),
              duration: Number(payload.duration ?? preset.duration),
              lottie: {
                sourceType: 'preset',
                jsonData: preset.jsonData,
                url: payload.url || '',
                loop: payload.loop !== false,
                speed: Number(payload.speed || 1),
                direction: Number(payload.direction || 1),
                name: payload.name || preset.name,
              },
            });
            return { success: true, message: `已成功添加 Lottie「${payload.name || preset.name}」矢量动效！` };
          }
          case 'ADD_SUBTITLES': {
            if (!payload.subtitles || !Array.isArray(payload.subtitles)) {
              return { success: false, message: '字幕数据格式不正确' };
            }
            const textTrack = project.tracks.find((t) => t.type === 'video' && !t.isLocked) || addTrack('video', 'V2 AI 字幕轨');
            payload.subtitles.forEach((sub: any, idx: number) => {
              addClip(textTrack.id, {
                name: `字幕 ${idx + 1}`,
                type: 'text',
                start: Number(sub.start) || idx * 3,
                duration: Number(sub.duration) || 2.5,
                text: {
                  ...DEFAULT_TEXT,
                  text: sub.text,
                  fontSize: 38,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  strokeColor: '#000000',
                  strokeWidth: 2,
                  bgColor: 'rgba(0, 0, 0, 0.7)',
                  bgPadding: 12,
                  bgRadius: 6,
                  align: 'center',
                  animation: 'slide-up',
                },
                transform: {
                  ...DEFAULT_TRANSFORM,
                  y: 36,
                  scale: 1,
                },
              });
            });
            return { success: true, message: `成功生成并导入 ${payload.subtitles.length} 条字幕！` };
          }
          case 'APPLY_FILTER': {
            const filterPresets: Record<string, Partial<ColorFilter>> = {
              cinematic: { brightness: 105, contrast: 120, saturate: 115, vignette: 28, temperature: 8 },
              cyberpunk: { brightness: 110, contrast: 130, saturate: 150, hueRotate: 45, vignette: 20 },
              vintage: { brightness: 95, contrast: 90, sepia: 35, saturate: 80, vignette: 30 },
              warm: { brightness: 105, contrast: 105, temperature: 25, saturate: 110 },
              bw: { brightness: 110, contrast: 130, grayscale: 100, vignette: 25 },
              fresh: { brightness: 110, contrast: 105, saturate: 125, temperature: -5 },
              vivid: { brightness: 105, contrast: 125, saturate: 140 },
            };
            const presetValues = filterPresets[payload.preset] || payload.values || {};
            setProject((prev) => {
              const updatedTracks = prev.tracks.map((t) => {
                if (t.type !== 'video') return t;
                return {
                  ...t,
                  clips: t.clips.map((c) => {
                    if (selectedClipId && c.id !== selectedClipId) return c;
                    return {
                      ...c,
                      filter: { ...c.filter, ...presetValues, ...(payload.values || {}) },
                    };
                  }),
                };
              });
              pushHistory(updatedTracks);
              return { ...prev, tracks: updatedTracks };
            });
            return { success: true, message: `已应用调色滤镜: ${payload.preset || '自定义调色'}` };
          }
          case 'SPLIT_CLIP': {
            const targetTime = typeof payload.time === 'number' ? payload.time : currentTime;
            splitClip(selectedClipId || undefined, targetTime);
            return { success: true, message: `已在 ${targetTime.toFixed(1)}s 处分割片段` };
          }
          case 'SET_SPEED': {
            const targetSpeed = Number(payload.speed) || 1;
            if (selectedClipId) {
              updateClip(selectedClipId, { speed: targetSpeed });
            } else {
              setPlaybackSpeed(targetSpeed);
            }
            return { success: true, message: `播放速度已设为 ${targetSpeed}x` };
          }
          case 'ADJUST_AUDIO': {
            if (payload.addBgm) {
              const audioTrack = project.tracks.find((t) => t.type === 'audio') || addTrack('audio', '背景音乐 (BGM)');
              addClip(audioTrack.id, {
                type: 'audio',
                name: payload.addBgm.name || 'AI 推荐背景音乐.mp3',
                start: 0,
                duration: totalDuration || 20,
                audio: { volume: payload.volume ?? 0.7, fadeIn: payload.fadeIn ?? 1, fadeOut: payload.fadeOut ?? 1.5, muted: false, pan: 0 },
                audioWaveform: generateProceduralWaveform(80, 5),
              });
            }
            if (selectedClipId && payload.volume !== undefined) {
              updateClip(selectedClipId, {
                audio: { ...selectedClip?.audio, volume: payload.volume, ...(payload.fadeIn ? { fadeIn: payload.fadeIn } : {}), ...(payload.fadeOut ? { fadeOut: payload.fadeOut } : {}) } as any,
              });
            }
            return { success: true, message: '已完成音频调整与BGM匹配' };
          }
          case 'SET_ASPECT_RATIO': {
            if (payload.aspectRatio && ASPECT_RATIOS[payload.aspectRatio as AspectRatio]) {
              setAspectRatio(payload.aspectRatio as AspectRatio);
              return { success: true, message: `画布比例已切换为 ${payload.aspectRatio}` };
            }
            return { success: false, message: '不支持的画幅比例' };
          }
          case 'SET_PROJECT_NAME': {
            if (payload.name) {
              setProjectName(payload.name);
              return { success: true, message: `工程名称已更新为: ${payload.name}` };
            }
            return { success: false, message: '无效名称' };
          }
          case 'SMART_ROUGH_CUT': {
            const videoTrack = addTrack('video', 'V1 主视频轨');
            const audioTrack = addTrack('audio', 'A1 配乐轨');
            const textTrack = addTrack('video', 'V2 标题字幕轨');

            // Use imported user assets if available
            const importedVideos = userAssets.filter((a) => a.type === 'video');
            const importedAudios = userAssets.filter((a) => a.type === 'audio');

            if (importedVideos.length > 0) {
              let curTime = 0;
              importedVideos.forEach((v, idx) => {
                const dur = Math.min(v.duration, 8);
                addClip(videoTrack.id, {
                  name: v.name,
                  type: 'video',
                  start: curTime,
                  duration: dur,
                  sourceUrl: v.url,
                  sourceBlob: v.blob,
                  thumbnailUrl: v.thumbnail,
                  thumbnails: v.thumbnails,
                  filter: { ...DEFAULT_FILTER, brightness: 105, contrast: 110 },
                  transition: idx > 0 ? { type: 'crossDissolve', duration: 0.8 } : undefined,
                });
                curTime += dur;
              });
            }

            if (importedAudios.length > 0) {
              const bgm = importedAudios[0];
              addClip(audioTrack.id, {
                name: bgm.name,
                type: 'audio',
                start: 0,
                duration: Math.min(bgm.duration, 15),
                sourceUrl: bgm.url,
                sourceBlob: bgm.blob,
                audio: { volume: 0.75, fadeIn: 0.5, fadeOut: 1.5, muted: false, pan: 0 },
                audioWaveform: bgm.audioWaveform,
              });
            }

            addClip(textTrack.id, {
              name: '爆款开场标题',
              type: 'text',
              start: 0.2,
              duration: 4.5,
              text: {
                ...DEFAULT_TEXT,
                text: payload.titleText || '🔥 3秒掌握电影级运镜技巧',
                fontSize: 50,
                fontWeight: '800',
                color: '#FFE600',
                strokeColor: '#000000',
                strokeWidth: 4,
                bgColor: 'rgba(0, 0, 0, 0.7)',
                animation: 'pop',
              },
              transform: { ...DEFAULT_TRANSFORM, y: -20, scale: 1.1 },
            });

            return { success: true, message: '🎉 AI 智能粗剪编排完成，包含分镜、配乐与开场花字！' };
          }
          default:
            return { success: false, message: `未知指令类型: ${type}` };
        }
      } catch (e: any) {
        console.error('Execute AI Action error:', e);
        return { success: false, message: `执行失败: ${e.message || '未知错误'}` };
      }
    },
    [project.tracks, selectedClipId, selectedClip, currentTime, totalDuration, addTrack, addClip, updateClip, splitClip, setAspectRatio, setProjectName, pushHistory]
  );

  const executeBatchAiActions = useCallback(
    (actions: Array<{ type: string; payload: any; description?: string }>): { success: boolean; count: number; message: string } => {
      let count = 0;
      let lastMsg = '';
      actions.forEach((act) => {
        const res = executeAiAction(act);
        if (res.success) {
          count++;
          lastMsg = res.message;
        }
      });
      return {
        success: count > 0,
        count,
        message: count === 1 ? lastMsg : `已成功批量执行 ${count} 项 AI 剪辑指令！`,
      };
    },
    [executeAiAction]
  );

  return (
    <EditorContext.Provider
      value={{
        project,
        tracks: project.tracks,
        selectedClipId,
        selectedClipIds,
        selectedClip,
        activeTrackId,
        currentTime,
        isPlaying,
        totalDuration,
        zoom,
        snappingEnabled,
        snapping,
        magnetMode,
        toolMode,
        rippleMode,
        trackHeight,
        activeSnapGuide,
        inPoint,
        outPoint,
        showGrid,
        showSafeMargin,
        playbackSpeed,
        loop,
        canUndo,
        canRedo,
        isExportModalOpen,
        isRecordModalOpen,
        recordMode,
        isShortcutsModalOpen,
        isAiModalOpen,
        isAiCopilotDrawerOpen,
        isAudioStudioModalOpen,
        audioStudioTargetClipId,
        audioStudioTargetAsset,
        activeSidebarTab,

        // View state
        currentView,
        setCurrentView,
        openLanding,
        openEditor,
        openHome,

        // DB and Project persistence
        dbSaveStatus,
        projectList,
        isProjectManagerOpen,
        openProjectManager,
        closeProjectManager,
        switchProject,
        createNewProject,
        duplicateProject,
        renameProject,
        deleteProject,

        userAssets,
        addUserAsset,
        deleteUserAsset,
        clearUserAssets,
        importFiles,

        play,
        pause,
        togglePlay,
        seek,
        stepFrame,
        setZoom,
        setSnappingEnabled,
        setSnapping,
        setMagnetMode,
        setToolMode,
        setRippleMode,
        setTrackHeight,
        setActiveSnapGuide,
        setInPoint,
        setOutPoint,
        setShowGrid,
        setShowSafeMargin,
        setPlaybackSpeed,
        setLoop,
        setActiveSidebarTab,

        selectClip,
        selectClips,
        toggleClipSelection,
        setActiveTrackId,
        setAspectRatio,
        setProjectName,

        addClip,
        addMediaToTimeline,
        addMediaAtPosition,
        updateClip,
        moveClip,
        moveClipsBatch,
        trimClip,
        splitClip,
        splitClipAtTime,
        duplicateClip,
        deleteClip,
        rippleDeleteClip,
        deleteSelected,
        deleteSelectedClips,
        copySelectedClips,
        cutSelectedClips,
        pasteClips,
        closeGapAt,

        // Audio-Video Binding / Linking
        linkSelectedClips,
        unlinkSelectedClips,
        toggleLinkSelectedClips,
        linkClips,
        unlinkClips,
        separateAudioFromVideo,

        addTrack,
        removeTrack,
        deleteTrack,
        updateTrack,
        reorderTrack,
        toggleTrackMute,
        toggleTrackSolo,
        toggleTrackLock,
        toggleTrackHide,
        updateTrackVolume,

        undo,
        redo,
        exportProjectJSON,
        importProjectJSON,
        loadDemoProject,
        resetProject,

        openExportModal,
        closeExportModal,
        openRecordModal,
        closeRecordModal,
        openShortcutsModal,
        closeShortcutsModal,
        openAiModal,
        closeAiModal,
        openAiCopilotDrawer,
        closeAiCopilotDrawer,
        toggleAiCopilotDrawer,
        openAudioStudio,
        closeAudioStudio,

        executeAiAction,
        executeBatchAiActions,

        // Media Relink & Local File Authorization
        offlineAssetsCount,
        needsPermissionCount,
        isRelinkModalOpen,
        openRelinkModal,
        closeRelinkModal,
        checkLocalMediaPermissions,
        requestAllFilePermissions,
        relinkWithDirectory,
        relinkWithFiles,
        relinkSingleMedia,
        openNativeFilePicker,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
