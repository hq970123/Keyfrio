import { Project, MediaAsset, Track, Clip, ProjectSummary } from '../types/editor';

const DB_NAME = 'opencut_studio_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'media_assets';

function waitForTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction was aborted'));
    tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
  });
}

// Open or upgrade IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const projectStore = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        projectStore.createIndex('lastModified', 'lastModified', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        const assetStore = db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
        assetStore.createIndex('type', 'type', { unique: false });
        assetStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Stored Asset record (contains binary Blob and FileSystemFileHandle if available)
export interface StoredAssetRecord {
  id: string;
  name: string;
  type: string;
  blob?: Blob;
  duration: number;
  thumbnail?: string;
  thumbnails?: string[];
  width?: number;
  height?: number;
  size?: number;
  audioWaveform?: number[];
  lottie?: any;
  gpuEffect?: any;
  category?: string;
  fileHandle?: any;
  filePath?: string;
  createdAt: number;
}

// Save or update an asset in IndexedDB
export async function saveAssetToDB(asset: MediaAsset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_ASSETS);

    const record: StoredAssetRecord = {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      blob: asset.blob,
      duration: asset.duration || 5,
      thumbnail: asset.thumbnail,
      thumbnails: asset.thumbnails,
      width: asset.width,
      height: asset.height,
      size: asset.size,
      audioWaveform: asset.audioWaveform,
      lottie: asset.lottie,
      gpuEffect: asset.gpuEffect,
      category: asset.category,
      fileHandle: asset.fileHandle,
      filePath: asset.filePath,
      createdAt: Date.now(),
    };

    const req = store.put(record);
    req.onerror = () => reject(req.error);
    waitForTransaction(tx).then(resolve, reject);
  });
}

// Load all assets from IndexedDB
export async function loadAllAssetsFromDB(): Promise<MediaAsset[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, 'readonly');
    const store = tx.objectStore(STORE_ASSETS);
    const req = store.getAll();

    req.onsuccess = () => {
      const records: StoredAssetRecord[] = req.result || [];
      const assets: MediaAsset[] = records.map((r) => {
        let url = '';
        let isOffline = false;
        if (r.blob) {
          try {
            url = URL.createObjectURL(r.blob);
          } catch {
            url = '';
            isOffline = true;
          }
        } else if (r.fileHandle) {
          // Has file handle but needs permission check
          isOffline = true;
        }

        return {
          id: r.id,
          name: r.name,
          type: r.type as any,
          url: url || r.thumbnail || '',
          blob: r.blob,
          duration: r.duration,
          thumbnail: r.thumbnail,
          thumbnails: r.thumbnails,
          width: r.width,
          height: r.height,
          size: r.size,
          audioWaveform: r.audioWaveform,
          lottie: r.lottie,
          gpuEffect: r.gpuEffect,
          category: r.category,
          fileHandle: r.fileHandle,
          filePath: r.filePath,
          isOffline,
          needsPermission: Boolean(r.fileHandle && !r.blob),
        };
      });
      resolve(assets);
    };
    req.onerror = () => reject(req.error);
  });
}

// Delete an asset from IndexedDB
export async function deleteAssetFromDB(assetId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ASSETS, 'readwrite');
    const store = tx.objectStore(STORE_ASSETS);
    const req = store.delete(assetId);
    req.onerror = () => reject(req.error);
    waitForTransaction(tx).then(resolve, reject);
  });
}

// Save Project to IndexedDB
export async function saveProjectToDB(project: Project): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);

    // Strip in-memory HTML elements or non-serializable properties before storing
    const serializableProject = {
      ...project,
      lastModified: Date.now(),
      tracks: project.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => {
          const { htmlMediaElement, ...rest } = c;
          return rest;
        }),
      })),
    };

    const req = store.put(serializableProject);
    req.onerror = () => reject(req.error);
    waitForTransaction(tx).then(resolve, reject);
  });
}

// Load Project by ID from IndexedDB
export async function loadProjectFromDB(projectId: string): Promise<Project | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.get(projectId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// List all projects stored in IndexedDB
export async function listAllProjectsFromDB(): Promise<ProjectSummary[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.getAll();
    req.onsuccess = () => {
      const projects: Project[] = req.result || [];
      const list: ProjectSummary[] = projects
        .map((p) => {
          let clipCount = 0;
          let thumbnail: string | undefined = undefined;
          if (p.tracks) {
            for (const t of p.tracks) {
              clipCount += t.clips ? t.clips.length : 0;
              if (!thumbnail && t.clips) {
                for (const c of t.clips) {
                  if (c.thumbnailUrl) {
                    thumbnail = c.thumbnailUrl;
                    break;
                  }
                  if (c.thumbnails && c.thumbnails.length > 0) {
                    thumbnail = c.thumbnails[0];
                    break;
                  }
                }
              }
            }
          }
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            lastModified: p.lastModified || 0,
            duration: p.duration || 30,
            trackCount: p.tracks ? p.tracks.length : 0,
            clipCount,
            thumbnail,
            resolution: p.resolution,
            fps: p.fps || 30,
          };
        })
        .sort((a, b) => b.lastModified - a.lastModified);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

// Delete Project from IndexedDB
export async function deleteProjectFromDB(projectId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    const store = tx.objectStore(STORE_PROJECTS);
    const req = store.delete(projectId);
    req.onerror = () => reject(req.error);
    waitForTransaction(tx).then(resolve, reject);
  });
}

// Helper to hydrate project clip URLs with newly created ObjectURLs from asset blobs
export function hydrateProjectMediaUrls(project: Project, assets: MediaAsset[]): Project {
  const assetMap = new Map<string, MediaAsset>();
  assets.forEach((a) => {
    assetMap.set(a.id, a);
    if (a.name) assetMap.set(a.name, a);
  });

  const nextTracks = project.tracks.map((t) => ({
    ...t,
    clips: t.clips.map((c) => {
      // If clip has an asset match with a valid blob/url
      const match = (c.sourceBlob ? null : assetMap.get(c.name)) || (c.sourceBlob ? null : assetMap.get(c.id));
      let finalUrl = c.sourceUrl;
      let finalBlob = c.sourceBlob;
      let fileHandle = c.fileHandle || match?.fileHandle;
      let isOffline = c.isOffline || false;
      let needsPermission = c.needsPermission || false;

      if (c.sourceBlob && (!c.sourceUrl || c.sourceUrl.startsWith('blob:'))) {
        try {
          finalUrl = URL.createObjectURL(c.sourceBlob);
          isOffline = false;
        } catch {
          isOffline = true;
        }
      } else if (match && match.blob) {
        try {
          finalUrl = match.url || URL.createObjectURL(match.blob);
          finalBlob = match.blob;
          isOffline = false;
        } catch {
          isOffline = true;
        }
      } else if (match && match.fileHandle) {
        needsPermission = true;
        isOffline = true;
      } else if ((c.type === 'video' || c.type === 'audio' || c.type === 'image') && !c.sourceUrl && !c.sourceBlob) {
        isOffline = true;
      }

      return {
        ...c,
        sourceUrl: finalUrl || c.sourceUrl,
        sourceBlob: finalBlob || c.sourceBlob,
        fileHandle,
        isOffline,
        needsPermission,
      };
    }),
  }));

  return {
    ...project,
    tracks: nextTracks,
  };
}
