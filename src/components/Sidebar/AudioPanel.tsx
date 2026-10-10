import React, { useState, useMemo, useRef } from 'react';
import {
  Music,
  Volume2,
  Plus,
  Play,
  Pause,
  Upload,
  Mic,
  Loader2,
  Trash2,
  FileAudio,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { extractAudioMetadataAndWaveform } from '../../utils/mediaExtractor';

export const AudioPanel: React.FC = () => {
  const {
    userAssets,
    addUserAsset,
    deleteUserAsset,
    addMediaToTimeline,
    openRecordModal,
  } = useEditor();

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Filter only audio assets from userAssets
  const userAudios = useMemo(() => {
    return userAssets.filter((a) => a.type === 'audio');
  }, [userAssets]);

  const handleAudioUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      try {
        const meta = await extractAudioMetadataAndWaveform(file, 80);
        addUserAsset({
          id: `audio-${Date.now()}-${i}`,
          name: file.name,
          type: 'audio',
          url,
          blob: file,
          duration: Math.round(meta.duration * 10) / 10 || 10,
          audioWaveform: meta.waveform,
          size: file.size,
        });
      } catch (err) {
        console.warn('Audio parse error:', err);
        addUserAsset({
          id: `audio-${Date.now()}-${i}`,
          name: file.name,
          type: 'audio',
          url,
          blob: file,
          duration: 10,
          size: file.size,
        });
      }
    }
    setIsUploading(false);
  };

  const handlePlayPreview = (id: string, url?: string) => {
    if (!url) return;

    if (playingAudioId === id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio();
    }

    audioPreviewRef.current.src = url;
    audioPreviewRef.current.currentTime = 0;
    audioPreviewRef.current.play().catch(console.error);
    setPlayingAudioId(id);

    audioPreviewRef.current.onended = () => {
      setPlayingAudioId(null);
    };
  };

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      {/* Header */}
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="font-bold text-xs text-white flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-emerald-400" />
          音频与配音 (Audio)
        </span>
        <span className="text-[10px] text-neutral-400 font-mono">
          {userAudios.length} 个文件
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
        {/* Upload Audio Button */}
        <label className="border border-dashed border-white/[0.08] hover:border-emerald-500/50 bg-[var(--kf-surface-2)] hover:bg-[var(--kf-surface-3)] rounded-lg p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
          <input
            type="file"
            multiple
            accept="audio/*"
            className="hidden"
            onChange={(e) => handleAudioUpload(e.target.files)}
          />
          <div className="w-8 h-8 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-1">
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </div>
          <span className="font-semibold text-xs text-neutral-200">
            {isUploading ? '正在分析音频波形...' : '导入本地音频 (BGM / 音效)'}
          </span>
          <span className="text-[9px] text-neutral-500 mt-0.5">
            支持 MP3, WAV, AAC, M4A, FLAC
          </span>
        </label>

        {/* Voiceover banner */}
        <button
          onClick={() => openRecordModal('audio')}
          className="w-full p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/25 hover:border-emerald-400 flex items-center justify-between text-left transition-all group"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white text-xs block">🎙️ 实时录音配音</span>
              <span className="text-[9px] text-emerald-300/80">开启麦克风录制专属旁白轨</span>
            </div>
          </div>
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        {/* User Audios List */}
        {userAudios.length > 0 ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              已导入音频 ({userAudios.length})
            </span>
            <div className="flex flex-col gap-1">
              {userAudios.map((item) => {
                const isPlaying = playingAudioId === item.id;
                return (
                  <div
                    key={item.id}
                    className="bg-[var(--kf-surface-3)] hover:bg-[#1f202d] border border-white/[0.06] hover:border-emerald-500/50 rounded-md p-2 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Play Button */}
                      <button
                        onClick={() => handlePlayPreview(item.id, item.url)}
                        className={`w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isPlaying
                            ? 'bg-emerald-500 text-white'
                            : 'bg-[#222430] text-neutral-300 hover:text-white hover:bg-emerald-600'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                      </button>

                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-xs text-neutral-200 truncate">{item.name}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">
                            {item.duration}s
                          </span>
                          {item.size && (
                            <span className="text-[9px] text-neutral-500 font-mono">
                              {(item.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Add to Timeline Button */}
                      <button
                        onClick={() => addMediaToTimeline(item)}
                        className="p-1 rounded bg-[#20222e] hover:bg-emerald-600 text-neutral-300 hover:text-white transition-colors"
                        title="添加到时间线"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteUserAsset(item.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-6 px-4 flex flex-col items-center justify-center text-center text-neutral-500 border border-dashed border-white/[0.06] rounded-lg bg-[#14151c]/40 mt-1">
            <FileAudio className="w-7 h-7 text-neutral-600 mb-1.5" />
            <span className="text-xs font-medium text-neutral-300">暂无导入的音频</span>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              导入本地音乐或录制麦克风旁白即可在时间线上剪辑
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
