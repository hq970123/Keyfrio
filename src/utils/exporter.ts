import { Project, ExportSettings, ExportProgress } from '../types/editor';
import { renderFrame } from './canvasRenderer';
import { getAudioContext, getDecodedAudioBuffer } from './audio';

type ExportFormat = ExportSettings['format'];

const EXPORT_MIME_TYPES: Record<ExportFormat, string[]> = {
  mp4: [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4',
  ],
  webm: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'],
};

export function getSupportedExportMimeType(format: ExportFormat): string | null {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  return EXPORT_MIME_TYPES[format].find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) || null;
}

export async function exportVideo(
  project: Project,
  settings: ExportSettings,
  onProgress?: (progress: ExportProgress) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const { resolution, fps, quality, format } = settings;
  const mimeType = getSupportedExportMimeType(format);
  if (!mimeType) {
    throw new Error(`当前浏览器不支持 ${format.toUpperCase()} 导出，请选择其他格式或更换浏览器。`);
  }
  const timelineEnd = project.tracks.reduce(
    (latest, track) => track.clips.reduce((trackEnd, clip) => Math.max(trackEnd, clip.start + clip.duration), latest),
    0
  );
  const totalDuration = Math.max(project.duration || 0, timelineEnd, 1);
  const totalFrames = Math.ceil(totalDuration * fps);

  // Bitrate estimation
  let bitrate = 8_000_000;
  if (quality === 'high') bitrate = 12_000_000;
  else if (quality === 'medium') bitrate = 6_000_000;
  else bitrate = 2_500_000;

  // 1. Prepare export canvas
  const canvas = document.createElement('canvas');
  canvas.width = resolution.width;
  canvas.height = resolution.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('无法创建导出画布，请检查浏览器图形能力后重试。');

  // 2. Set up Web Audio destination for audio mixing
  const audioCtx = getAudioContext();
  const audioDest = audioCtx.createMediaStreamDestination();
  const scheduledSources: AudioBufferSourceNode[] = [];
  let canvasStream: MediaStream | null = null;
  let hasCleanedUp = false;

  const cleanup = () => {
    if (hasCleanedUp) return;
    hasCleanedUp = true;
    scheduledSources.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    canvasStream?.getTracks().forEach((track) => track.stop());
    audioDest.stream.getTracks().forEach((track) => track.stop());
  };

  // Decode and schedule every audible timeline clip into the export stream.
  const soloTracksExist = project.tracks.some((track) => track.isSolo);
  const audioClips = project.tracks
    .filter((track) => track.type === 'audio' && !track.isMuted && (!soloTracksExist || track.isSolo))
    .flatMap((track) => track.clips
      .filter((clip) => clip.type === 'audio' && !clip.audio?.muted && (clip.audio?.volume ?? 1) > 0)
      .map((clip) => ({ track, clip })));
  const decodedAudioClips = await Promise.all(audioClips.map(async ({ track, clip }) => {
    const sourceRef = clip.sourceBlob || clip.sourceUrl;
    if (!sourceRef) return null;

    const buffer = await getDecodedAudioBuffer(sourceRef);
    return buffer ? { track, clip, buffer } : null;
  }));
  const audioStartAt = audioCtx.currentTime + 0.1;

  decodedAudioClips.forEach((decoded) => {
    if (!decoded) return;
    const { track, clip, buffer } = decoded;

    const sourceOffset = Math.max(0, clip.trimStart || 0);
    const sourceLimit = Math.max(0, (clip.trimEnd ?? buffer.duration) - sourceOffset);
    const sourceDuration = Math.min(sourceLimit, clip.duration * (clip.speed || 1), buffer.duration - sourceOffset);
    if (sourceDuration <= 0) return;

    const speed = Math.max(0.05, clip.speed || 1);
    const playDuration = sourceDuration / speed;
    const startsAt = audioStartAt + Math.max(0, clip.start);
    const endsAt = startsAt + playDuration;
    const clipVolume = Math.max(0, Math.min(2, (clip.audio?.volume ?? 1) * (track.volume ?? 1)));

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(speed, startsAt);

    const gain = audioCtx.createGain();
    const fadeIn = Math.min(playDuration, Math.max(0, clip.audio?.fadeIn || 0));
    const fadeOut = Math.min(playDuration, Math.max(0, clip.audio?.fadeOut || 0));
    if (fadeIn > 0) {
      gain.gain.setValueAtTime(0, startsAt);
      gain.gain.linearRampToValueAtTime(clipVolume, startsAt + fadeIn);
    } else {
      gain.gain.setValueAtTime(clipVolume, startsAt);
    }
    if (fadeOut > 0) {
      const fadeOutStartsAt = Math.max(startsAt, endsAt - fadeOut);
      gain.gain.setValueAtTime(clipVolume, fadeOutStartsAt);
      gain.gain.linearRampToValueAtTime(0, endsAt);
    }

    source.connect(gain);
    if (typeof audioCtx.createStereoPanner === 'function') {
      const panner = audioCtx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, clip.audio?.pan || 0)), startsAt);
      gain.connect(panner);
      panner.connect(audioDest);
    } else {
      gain.connect(audioDest);
    }

    source.start(startsAt, sourceOffset, sourceDuration);
    scheduledSources.push(source);
  });

  // 3. Create stream from canvas + audio stream
  try {
    canvasStream = canvas.captureStream(fps);
  } catch (error) {
    cleanup();
    throw new Error(`无法启动画布录制：${error instanceof Error ? error.message : String(error)}`);
  }
  let combinedStream: MediaStream;
  try {
    combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioDest.stream.getAudioTracks(),
    ]);
  } catch (error) {
    cleanup();
    throw new Error(`无法组合导出音视频流：${error instanceof Error ? error.message : String(error)}`);
  }

  let mediaRecorder: MediaRecorder;
  try {
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });
  } catch (error) {
    cleanup();
    throw new Error(`无法创建 ${format.toUpperCase()} 编码器：${error instanceof Error ? error.message : String(error)}`);
  }

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      cleanup();
      const finalBlob = new Blob(recordedChunks, { type: mimeType });
      resolve(finalBlob);
    };

    mediaRecorder.onerror = (err) => {
      cleanup();
      reject(err);
    };

    try {
      mediaRecorder.start();
    } catch (error) {
      cleanup();
      reject(error);
      return;
    }

    const startTime = performance.now();
    let currentFrame = 0;
    const frameDuration = 1 / fps;

    const renderNextFrame = () => {
      if (abortSignal?.aborted) {
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        cleanup();
        reject(new DOMException('Export aborted by user', 'AbortError'));
        return;
      }

      if (currentFrame >= totalFrames) {
        mediaRecorder.stop();
        return;
      }

      const frameTime = currentFrame * frameDuration;

      // Render video frame
      try {
        renderFrame(ctx, project, frameTime, resolution, {
          isExporting: true,
        });
      } catch (error) {
        cleanup();
        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
        reject(new Error(`渲染第 ${currentFrame + 1} 帧失败：${error instanceof Error ? error.message : String(error)}`));
        return;
      }

      currentFrame++;

      // Progress reporting
      const pct = Math.min(100, Math.round((currentFrame / totalFrames) * 100));
      const elapsed = (performance.now() - startTime) / 1000;
      const rate = currentFrame / (elapsed || 0.001);
      const remaining = Math.max(0, (totalFrames - currentFrame) / (rate || 1));

      if (onProgress) {
        onProgress({
          progress: pct,
          currentFrame,
          totalFrames,
          estimatedTimeRemaining: remaining,
        });
      }

      // Schedule next frame rendering
      setTimeout(renderNextFrame, 1000 / fps);
    };

    setTimeout(renderNextFrame, 100);
  });
}
