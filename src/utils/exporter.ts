import { Project, ExportSettings, ExportProgress } from '../types/editor';
import { renderFrame } from './canvasRenderer';
import { getAudioContext, getDecodedAudioBuffer } from './audio';

export async function exportVideo(
  project: Project,
  settings: ExportSettings,
  onProgress?: (progress: ExportProgress) => void,
  abortSignal?: AbortSignal
): Promise<Blob> {
  const { resolution, fps, quality } = settings;
  const timelineEnd = project.tracks.reduce(
    (latest, track) => Math.max(latest, ...track.clips.map((clip) => clip.start + clip.duration)),
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
  const ctx = canvas.getContext('2d', { alpha: false })!;

  // 2. Set up Web Audio destination for audio mixing
  const audioCtx = getAudioContext();
  const audioDest = audioCtx.createMediaStreamDestination();
  const scheduledSources: AudioBufferSourceNode[] = [];

  // Decode and schedule every audible timeline clip into the export stream.
  const soloTracksExist = project.tracks.some((track) => track.type === 'audio' && track.isSolo && !track.isMuted);
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
    const sourceLimit = Math.max(0, (clip.trimEnd || buffer.duration) - sourceOffset);
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
  const canvasStream = canvas.captureStream(fps);
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ]);

  // Pick supported mimeType
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: bitrate,
  });

  const recordedChunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      recordedChunks.push(e.data);
    }
  };

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      scheduledSources.forEach((source) => {
        try { source.stop(); } catch { /* already stopped */ }
      });
      canvasStream.getTracks().forEach((track) => track.stop());
      audioDest.stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.onstop = () => {
      cleanup();
      const finalBlob = new Blob(recordedChunks, { type: mimeType });
      resolve(finalBlob);
    };

    mediaRecorder.onerror = (err) => {
      cleanup();
      reject(err);
    };

    mediaRecorder.start();

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
      renderFrame(ctx, project, frameTime, resolution, {
        isExporting: true,
      });

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
