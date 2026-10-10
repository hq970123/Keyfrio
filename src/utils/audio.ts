let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export interface AudioMassWaveformData {
  positivePeaks: number[];
  negativePeaks: number[];
  rms: number[];
  duration: number;
  sampleRate: number;
  channels: number;
  maxPeak: number;
  peakDb: number;
  sampleCount: number;
}

// In-memory cache for audio waveforms to prevent redundant decodes
const waveformCache = new Map<string, number[]>();
const detailedWaveformCache = new Map<string, AudioMassWaveformData>();

/**
 * Decode AudioBuffer from Blob or URL
 */
export async function getDecodedAudioBuffer(urlOrBlob: string | Blob): Promise<AudioBuffer | null> {
  try {
    const ctx = getAudioContext();
    let arrayBuffer: ArrayBuffer;
    if (typeof urlOrBlob === 'string') {
      const resp = await fetch(urlOrBlob);
      arrayBuffer = await resp.arrayBuffer();
    } else {
      arrayBuffer = await urlOrBlob.arrayBuffer();
    }
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (e) {
    console.warn('Failed to decode audio buffer:', e);
    return null;
  }
}

/**
 * AudioMass-grade exact waveform extraction: Dual positive/negative peaks, RMS and Peak dBFS
 */
export async function extractDetailedWaveform(
  urlOrBlob: string | Blob,
  sampleCount = 256
): Promise<AudioMassWaveformData> {
  const cacheKey =
    typeof urlOrBlob === 'string'
      ? `${urlOrBlob}-${sampleCount}`
      : `blob-${urlOrBlob.size}-${sampleCount}`;

  if (detailedWaveformCache.has(cacheKey)) {
    return detailedWaveformCache.get(cacheKey)!;
  }

  try {
    const audioBuffer = await getDecodedAudioBuffer(urlOrBlob);
    if (!audioBuffer) throw new Error('Could not decode audio buffer');

    const totalSamples = audioBuffer.length;
    const channels = audioBuffer.numberOfChannels;
    const channel0 = audioBuffer.getChannelData(0);
    const channel1 = channels > 1 ? audioBuffer.getChannelData(1) : null;

    const blockSize = Math.max(1, Math.floor(totalSamples / sampleCount));
    const positivePeaks: number[] = [];
    const negativePeaks: number[] = [];
    const rms: number[] = [];
    let globalMax = 0.0001;

    for (let i = 0; i < sampleCount; i++) {
      const blockStart = blockSize * i;
      const count = Math.min(blockSize, totalSamples - blockStart);
      if (count <= 0) break;

      let maxPos = 0;
      let minNeg = 0;
      let sumSquares = 0;

      for (let j = 0; j < count; j++) {
        let sample = channel0[blockStart + j] || 0;
        if (channel1) {
          sample = (sample + (channel1[blockStart + j] || 0)) * 0.5;
        }

        if (sample > maxPos) maxPos = sample;
        if (sample < minNeg) minNeg = sample;
        sumSquares += sample * sample;
      }

      const rmsVal = Math.sqrt(sumSquares / count);
      if (maxPos > globalMax) globalMax = maxPos;
      if (Math.abs(minNeg) > globalMax) globalMax = Math.abs(minNeg);

      positivePeaks.push(maxPos);
      negativePeaks.push(minNeg);
      rms.push(rmsVal);
    }

    // Peak dBFS
    const peakDb = globalMax > 0.00001 ? 20 * Math.log10(globalMax) : -60;

    const result: AudioMassWaveformData = {
      positivePeaks,
      negativePeaks,
      rms,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels,
      maxPeak: globalMax,
      peakDb,
      sampleCount: positivePeaks.length,
    };

    detailedWaveformCache.set(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('AudioMass detailed waveform fallback:', e);
    const procedural = generateProceduralWaveform(sampleCount);
    const fallback: AudioMassWaveformData = {
      positivePeaks: procedural,
      negativePeaks: procedural.map((p) => -p),
      rms: procedural.map((p) => p * 0.7),
      duration: 10,
      sampleRate: 44100,
      channels: 2,
      maxPeak: 1,
      peakDb: 0,
      sampleCount,
    };
    detailedWaveformCache.set(cacheKey, fallback);
    return fallback;
  }
}

/**
 * Generate realistic simulated or decoded audio waveforms via Web Audio API
 */
export async function extractWaveformFromBlob(blob: Blob, sampleCount = 128): Promise<number[]> {
  try {
    const detailed = await extractDetailedWaveform(blob, sampleCount);
    // Return combined normalized peaks for timeline renderer
    const maxVal = detailed.maxPeak > 0.01 ? detailed.maxPeak : 1;
    return detailed.positivePeaks.map((p, i) => {
      const combined = p * 0.5 + (detailed.rms[i] || p) * 0.5;
      return Math.min(1, Math.max(0.08, (combined / maxVal) * 0.95));
    });
  } catch (e) {
    console.warn('Audio decoding fallback to procedural waveform:', e);
    return generateProceduralWaveform(sampleCount);
  }
}

/**
 * Fetch and extract waveform with caching
 */
export async function fetchAndExtractWaveform(
  urlOrBlob: string | Blob,
  sampleCount = 128
): Promise<number[]> {
  const cacheKey = typeof urlOrBlob === 'string' ? `${urlOrBlob}-${sampleCount}` : `blob-${urlOrBlob.size}-${sampleCount}`;
  if (waveformCache.has(cacheKey)) {
    return waveformCache.get(cacheKey)!;
  }

  try {
    const detailed = await extractDetailedWaveform(urlOrBlob, sampleCount);
    const maxVal = detailed.maxPeak > 0.01 ? detailed.maxPeak : 1;
    const waveform = detailed.positivePeaks.map((p, i) => {
      const combined = p * 0.5 + (detailed.rms[i] || p) * 0.5;
      return Math.min(1, Math.max(0.08, (combined / maxVal) * 0.95));
    });
    waveformCache.set(cacheKey, waveform);
    return waveform;
  } catch {
    const fallback = generateProceduralWaveform(sampleCount);
    waveformCache.set(cacheKey, fallback);
    return fallback;
  }
}

export function generateProceduralWaveform(sampleCount = 128, seed = 1): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    // Multi-frequency harmonic envelope with natural verse/chorus energy variations
    const lowFreq = Math.sin(t * Math.PI * 4 + seed) * 0.25;
    const midFreq = Math.sin(t * Math.PI * 18 + seed * 2) * 0.2;
    const highFreq = Math.cos(t * Math.PI * 42 + seed * 3) * 0.15;
    const beatPulse = Math.pow(Math.abs(Math.sin(t * Math.PI * 12)), 3) * 0.25;
    const noise = (Math.sin(i * 997) % 1) * 0.1;

    const combined = 0.35 + lowFreq + midFreq + highFreq + beatPulse + noise;
    peaks.push(Math.max(0.12, Math.min(0.98, combined)));
  }
  return peaks;
}

/**
 * Encode an AudioBuffer to standard 16-bit WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + length;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // Helper to write string to DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, length, true);

  // Write interleaved PCM samples
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = Math.max(-1, Math.min(1, channels[c][i]));
      // Convert float [-1.0, 1.0] to 16-bit signed integer [-32768, 32767]
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Reverse AudioBuffer (AudioMass reverse tool)
 */
export function reverseAudioBuffer(buffer: AudioBuffer): AudioBuffer {
  const ctx = getAudioContext();
  const reversed = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = reversed.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      dest[i] = src[buffer.length - 1 - i];
    }
  }
  return reversed;
}

/**
 * Normalize AudioBuffer to target peak dBFS (AudioMass Normalizer)
 */
export function normalizeAudioBuffer(buffer: AudioBuffer, targetDb = -0.1): AudioBuffer {
  const ctx = getAudioContext();
  const numChannels = buffer.numberOfChannels;
  let peak = 0;

  for (let c = 0; c < numChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }

  if (peak === 0) return buffer;

  const targetLinear = Math.pow(10, targetDb / 20);
  const gain = targetLinear / peak;

  const normalized = ctx.createBuffer(numChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < numChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = normalized.getChannelData(c);
    for (let i = 0; i < buffer.length; i++) {
      dest[i] = Math.max(-1, Math.min(1, src[i] * gain));
    }
  }
  return normalized;
}

/**
 * Slice / Trim AudioBuffer
 */
export function sliceAudioBuffer(buffer: AudioBuffer, startSec: number, endSec: number): AudioBuffer {
  const ctx = getAudioContext();
  const startSample = Math.max(0, Math.floor(startSec * buffer.sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSec * buffer.sampleRate));
  const sliceLength = Math.max(1, endSample - startSample);

  const sliced = ctx.createBuffer(buffer.numberOfChannels, sliceLength, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = sliced.getChannelData(c);
    for (let i = 0; i < sliceLength; i++) {
      dest[i] = src[startSample + i];
    }
  }
  return sliced;
}

/**
 * Synthesize rich AudioMass-style Sound Effects directly to playable/exportable WAV
 */
function createSynthesizedBgmBuffer(toneType: string, duration: number): AudioBuffer {
  const sampleRate = 44100;
  const totalSamples = Math.max(1, Math.floor(sampleRate * duration));
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);
  const modes: Record<string, number[][]> = {
    upbeat: [[261.63, 329.63, 392], [196, 246.94, 293.66], [220, 277.18, 329.63], [174.61, 220, 261.63]],
    cinematic: [[220, 261.63, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [146.83, 174.61, 220]],
    synthwave: [[220, 277.18, 329.63], [196, 246.94, 293.66], [164.81, 207.65, 246.94], [185, 233.08, 277.18]],
    lofi: [[261.63, 311.13, 392], [220, 261.63, 329.63], [196, 246.94, 293.66], [233.08, 293.66, 349.23]],
  };
  const chords = modes[toneType] || modes.lofi;
  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const chord = chords[Math.floor(t / 3) % chords.length];
    let s = chord.reduce((sum, f, n) => {
      const wave = toneType === 'synthwave' ? 2 * ((f * t) % 1) - 1 : Math.sin(2 * Math.PI * f * t);
      return sum + wave * (n === 0 ? 0.11 : 0.07);
    }, 0);
    const bass = Math.sin(2 * Math.PI * chord[0] * 0.5 * t) * (toneType === 'cinematic' || toneType === 'synthwave' ? 0.1 : 0.04);
    const noise = toneType === 'lofi' ? (Math.random() * 2 - 1) * 0.012 : 0;
    const fade = Math.min(1, i / (sampleRate * 0.5), (totalSamples - i) / (sampleRate * 0.5));
    s = Math.max(-1, Math.min(1, (s + bass + noise) * fade));
    left[i] = s;
    right[i] = s;
  }
  return buffer;
}

export function synthesizeBgmBlob(toneType: string, duration = 20): Blob {
  return audioBufferToWavBlob(createSynthesizedBgmBuffer(toneType, duration));
}

export function synthesizeBgmWithWaveform(
  toneType: string,
  duration: number
): { blob: Blob; waveform: number[]; duration: number } {
  const buffer = createSynthesizedBgmBuffer(toneType, duration);
  const waveform: number[] = [];
  const sampleCount = 80;
  const samples = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(samples.length / sampleCount));
  let maxPeak = 0;

  for (let i = 0; i < sampleCount; i++) {
    const start = i * blockSize;
    const end = Math.min(samples.length, i === sampleCount - 1 ? samples.length : start + blockSize);
    let peak = 0;
    for (let j = start; j < end; j++) peak = Math.max(peak, Math.abs(samples[j]));
    waveform.push(peak);
    maxPeak = Math.max(maxPeak, peak);
  }

  return {
    blob: audioBufferToWavBlob(buffer),
    waveform: waveform.map((peak) => (maxPeak > 0 ? peak / maxPeak : 0)),
    duration: buffer.duration,
  };
}

export function pcmBase64ToWavBlob(base64: string, sampleRate = 24000): { blob: Blob; duration: number } {
  const binary = atob(base64);
  const frames = Math.floor(binary.length / 2);
  const buffer = getAudioContext().createBuffer(1, frames, sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const offset = i * 2;
    const sample = binary.charCodeAt(offset) | (binary.charCodeAt(offset + 1) << 8);
    const signedSample = sample & 0x8000 ? sample - 0x10000 : sample;
    samples[i] = signedSample / 32768;
  }
  return { blob: audioBufferToWavBlob(buffer), duration: frames / sampleRate };
}

export function synthesizeSfxBlob(toneType: string, duration = 1.0): Blob {
  const sampleRate = 44100;
  const totalSamples = Math.floor(sampleRate * duration);
  const ctx = getAudioContext();
  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const progress = i / totalSamples;
    let s = 0;

    if (toneType === 'sfx-whoosh') {
      const noise = (Math.random() * 2 - 1) * 0.7;
      const env = Math.sin(progress * Math.PI);
      const freqMod = Math.sin(t * 800 * (1 + progress * 2));
      s = (noise * 0.7 + freqMod * 0.3) * env;
    } else if (toneType === 'sfx-pop') {
      const freq = 900 * Math.exp(-progress * 15);
      const env = Math.exp(-progress * 20);
      s = Math.sin(2 * Math.PI * freq * t) * env;
    } else if (toneType === 'sfx-ding') {
      const f1 = 1046.5; // C6
      const f2 = 2093.0; // C7
      const env = Math.exp(-progress * 4);
      s = (Math.sin(2 * Math.PI * f1 * t) * 0.6 + Math.sin(2 * Math.PI * f2 * t) * 0.4) * env;
    } else if (toneType === 'sfx-laser') {
      const freq = 2400 * Math.exp(-progress * 12);
      const env = Math.exp(-progress * 8);
      s = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.6 : -0.6) * env;
    } else if (toneType === 'sfx-impact') {
      const fSub = 120 * Math.exp(-progress * 6);
      const noise = (Math.random() * 2 - 1) * Math.exp(-progress * 16);
      const env = Math.exp(-progress * 4);
      s = (Math.sin(2 * Math.PI * fSub * t) * 0.7 + noise * 0.6) * env;
    } else if (toneType === 'sfx-coin') {
      const f = progress < 0.2 ? 987.77 : 1318.51; // B5 to E6
      const env = Math.exp(-progress * 6);
      s = Math.sin(2 * Math.PI * f * t) * env;
    } else if (toneType === 'sfx-glitch') {
      const f = 150 + Math.sin(progress * 80) * 1200;
      const noise = Math.random() > 0.85 ? 0.8 : 0;
      const env = Math.exp(-progress * 5);
      s = (Math.sin(2 * Math.PI * f * t) * 0.6 + noise * 0.4) * env;
    } else if (toneType === 'sfx-riser') {
      const freq = 100 + Math.pow(progress, 2.5) * 1800;
      const env = Math.pow(progress, 1.5);
      s = Math.sin(2 * Math.PI * freq * t) * env;
    } else {
      // Default harmonic tone
      s = Math.sin(2 * Math.PI * 440 * t) * Math.exp(-progress * 3);
    }

    left[i] = Math.max(-1, Math.min(1, s * 0.85));
    right[i] = Math.max(-1, Math.min(1, s * 0.85));
  }

  return audioBufferToWavBlob(buffer);
}

// Play procedural SFX or synthesized BGM slice in browser
export function playSynthesizedTone(toneType: string, duration = 1.0, volume = 0.5) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.3, now);
    masterGain.connect(ctx.destination);

    if (toneType === 'sfx-whoosh') {
      const bufferSize = ctx.sampleRate * duration;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(3000, now + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(300, now + duration);

      masterGain.gain.setValueAtTime(0.01, now);
      masterGain.gain.linearRampToValueAtTime(volume * 0.4, now + duration * 0.4);
      masterGain.gain.linearRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start(now);
      whiteNoise.stop(now + duration);
    } else if (toneType === 'sfx-pop') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

      masterGain.gain.setValueAtTime(volume * 0.5, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (toneType === 'sfx-ding') {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc2.frequency.setValueAtTime(2093, now); // C7

      masterGain.gain.setValueAtTime(volume * 0.5, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(masterGain);
      osc2.connect(masterGain);
      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.85);
      osc2.stop(now + 0.85);
    } else if (toneType === 'sfx-laser') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.3);

      masterGain.gain.setValueAtTime(volume * 0.4, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (toneType === 'sfx-glitch') {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(850, now + 0.05);
      osc.frequency.setValueAtTime(320, now + 0.1);
      osc.frequency.setValueAtTime(1600, now + 0.15);

      masterGain.gain.setValueAtTime(volume * 0.3, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (toneType === 'upbeat' || toneType === 'synthwave' || toneType === 'lofi' || toneType === 'cinematic') {
      // Harmonic chord sequence
      const freqs =
        toneType === 'synthwave'
          ? [220, 277.18, 329.63, 440]
          : toneType === 'lofi'
          ? [196, 246.94, 293.66, 392]
          : toneType === 'cinematic'
          ? [130.81, 164.81, 196.0, 261.63]
          : [261.63, 329.63, 392.0, 523.25];

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = toneType === 'synthwave' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.01, now);
        g.gain.linearRampToValueAtTime((volume * 0.15) / freqs.length, now + 0.1 + idx * 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(now);
        osc.stop(now + duration);
      });
    }
  } catch (e) {
    console.warn('Audio tone play error:', e);
  }
}

// Procedural Canvas Video Generator for Stock Clips / Testing
export function createSyntheticVideoBlob(name: string, duration = 10, theme = 'cyberpunk'): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm',
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.start();

    let frame = 0;
    const totalFrames = duration * 30;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const t = frame * 0.033;

      // Draw dynamic animated scene
      if (theme === 'cyberpunk') {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#24243e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated neon grid
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + Math.sin(t * 3) * 0.2})`;
        ctx.lineWidth = 2;
        const gridY = canvas.height * 0.6;
        for (let x = 0; x <= canvas.width; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, gridY);
          ctx.lineTo(x + (x - canvas.width / 2) * 1.5, canvas.height);
          ctx.stroke();
        }
        for (let y = gridY; y <= canvas.height; y += 25) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Glowing sun/sphere
        const sunGrad = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height * 0.45,
          10,
          canvas.width / 2,
          canvas.height * 0.45,
          160
        );
        sunGrad.addColorStop(0, '#ff007f');
        sunGrad.addColorStop(0.8, '#ffaa00');
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height * 0.45, 160, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Nature / Abstract
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#134e5e');
        grad.addColorStop(1, '#71b280');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + i * 0.05})`;
          ctx.beginPath();
          ctx.arc(
            canvas.width * 0.5 + Math.sin(t + i) * 200,
            canvas.height * 0.5 + Math.cos(t * 0.8 + i) * 150,
            80 + i * 20,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }

      // Title & watermark
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(name, canvas.width / 2, 90);

      ctx.font = '20px monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`TIME: ${(progress * duration).toFixed(2)}s / ${duration}s`, canvas.width / 2, 130);

      if (frame >= totalFrames) {
        clearInterval(interval);
        mediaRecorder.stop();
      }
    }, 1000 / 30);
  });
}
