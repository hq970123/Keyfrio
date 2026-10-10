import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Monitor,
  Mic,
  X,
  Play,
  Square,
  RotateCcw,
  Check,
  Radio,
  Camera,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { extractWaveformFromBlob } from '../../utils/audio';

export const RecordModal: React.FC = () => {
  const { isRecordModalOpen, closeRecordModal, recordMode, addMediaToTimeline, addUserAsset } = useEditor();

  const [mode, setMode] = useState<'screen' | 'camera' | 'audio'>(recordMode || 'camera');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (recordMode) {
      setMode(recordMode);
    }
  }, [recordMode]);

  // Clean up media streams on close
  const stopStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const handleClose = () => {
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordedBlob(null);
    setRecordedUrl(null);
    closeRecordModal();
  };

  // Start live stream
  const startStream = async (targetMode: 'screen' | 'camera' | 'audio') => {
    stopStream();
    try {
      let stream: MediaStream;
      if (targetMode === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      } else if (targetMode === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }

      mediaStreamRef.current = stream;
      if (videoPreviewRef.current && targetMode !== 'audio') {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(console.error);
      }
    } catch (err) {
      console.warn('Cannot access recording media device:', err);
    }
  };

  // Trigger stream on modal open or mode change
  useEffect(() => {
    if (isRecordModalOpen && !recordedBlob) {
      startStream(mode);
    }
    return () => {
      stopStream();
    };
  }, [isRecordModalOpen, mode, recordedBlob]);

  // Start recording
  const handleStartRecording = () => {
    if (!mediaStreamRef.current) return;
    const chunks: Blob[] = [];
    const mimeType = mode === 'audio' ? 'audio/webm' : 'video/webm;codecs=vp9,opus';

    try {
      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
        const url = URL.createObjectURL(finalBlob);
        setRecordedBlob(finalBlob);
        setRecordedUrl(url);
        stopStream();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(500);
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (e) {
      console.error(e);
      alert('无法开启录制，请检查权限');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Add recorded clip into timeline
  const handleAddToTimeline = async () => {
    if (!recordedBlob || !recordedUrl) return;

    let waveform: number[] | undefined;
    if (mode === 'audio' || mode === 'camera' || mode === 'screen') {
      waveform = await extractWaveformFromBlob(recordedBlob, 50);
    }

    const type = mode === 'audio' ? 'audio' : 'video';
    const name = `录制_${mode === 'screen' ? '屏幕' : mode === 'camera' ? '摄像头' : '配音'}_${Math.round(recordSeconds)}s`;
    const assetId = `record-${Date.now()}`;

    addUserAsset({
      id: assetId,
      name,
      type,
      url: recordedUrl,
      blob: recordedBlob,
      duration: Math.max(1, recordSeconds),
      audioWaveform: waveform,
      size: recordedBlob.size,
    });

    addMediaToTimeline({
      id: assetId,
      name,
      type,
      url: recordedUrl,
      blob: recordedBlob,
      duration: Math.max(1, recordSeconds),
      audioWaveform: waveform,
    });

    handleClose();
  };

  if (!isRecordModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[var(--kf-surface-2)] border border-white/[0.06] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-neutral-200 text-xs">
        {/* Header */}
        <div className="h-10 px-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[var(--kf-surface-1)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-600/20 text-red-400 flex items-center justify-center">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div>
              <span className="font-semibold text-xs text-white block">录制中心 (Media Recorder)</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[var(--kf-surface-3)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mode Selector */}
        {!recordedBlob && !isRecording && (
          <div className="grid grid-cols-3 p-2 bg-[var(--kf-surface-1)] border-b border-white/[0.06] gap-1.5">
            <button
              onClick={() => setMode('screen')}
              className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
                mode === 'screen' ? 'bg-cyan-500 text-white font-medium' : 'bg-[var(--kf-surface-3)] border border-white/[0.06] text-neutral-400'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>录制屏幕</span>
            </button>
            <button
              onClick={() => setMode('camera')}
              className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
                mode === 'camera' ? 'bg-red-600 text-white font-medium' : 'bg-[var(--kf-surface-3)] border border-white/[0.06] text-neutral-400'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>录制摄像头</span>
            </button>
            <button
              onClick={() => setMode('audio')}
              className={`p-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs ${
                mode === 'audio' ? 'bg-amber-600 text-white font-medium' : 'bg-[var(--kf-surface-3)] border border-white/[0.06] text-neutral-400'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>录制配音</span>
            </button>
          </div>
        )}

        {/* Video Preview or Visualizer */}
        <div className="p-3.5 flex flex-col items-center">
          <div className="w-full h-52 bg-black rounded-lg overflow-hidden relative flex items-center justify-center border border-white/[0.06]">
            {mode !== 'audio' && !recordedUrl && (
              <video ref={videoPreviewRef} muted playsInline className="w-full h-full object-cover" />
            )}

            {mode !== 'audio' && recordedUrl && (
              <video src={recordedUrl} controls className="w-full h-full object-cover" />
            )}

            {mode === 'audio' && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Mic className={`w-6 h-6 ${isRecording ? 'animate-bounce' : ''}`} />
                </div>
                <span className="font-medium text-neutral-300 text-xs">
                  {isRecording ? '正在录音中...' : recordedUrl ? '录音完成' : '准备就绪，点击下方开始录音'}
                </span>
              </div>
            )}

            {/* Recording Timer Badge */}
            {isRecording && (
              <div className="absolute top-2.5 left-2.5 bg-red-600 text-white font-mono font-medium px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1.5 shadow-lg animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>
                  {Math.floor(recordSeconds / 60)
                    .toString()
                    .padStart(2, '0')}
                  :{(recordSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5 mt-3.5">
            {!isRecording && !recordedBlob && (
              <button
                onClick={handleStartRecording}
                className="px-5 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-1.5 shadow-md shadow-red-600/30 text-xs active:scale-95 transition-all"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
                <span>开始录制</span>
              </button>
            )}

            {isRecording && (
              <button
                onClick={handleStopRecording}
                className="px-5 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-medium flex items-center gap-1.5 shadow-md border border-red-500 text-xs active:scale-95 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                <span>停止录制</span>
              </button>
            )}

            {recordedBlob && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRecordedBlob(null);
                    setRecordedUrl(null);
                    setRecordSeconds(0);
                    startStream(mode);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--kf-surface-3)] hover:bg-[#1f202d] border border-white/[0.06] text-neutral-300 text-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>重新录制</span>
                </button>
                <button
                  onClick={handleAddToTimeline}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>导入到时间线</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
