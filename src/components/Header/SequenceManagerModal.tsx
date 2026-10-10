import React, { useState } from 'react';
import { Layers, Plus, Trash2, Copy, Check, Film, X, Monitor, Smartphone, Video } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { AspectRatio, Resolution, Sequence } from '../../types/editor';
import { ASPECT_RATIOS } from '../../constants/samples';

interface SequenceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SequenceManagerModal: React.FC<SequenceManagerModalProps> = ({ isOpen, onClose }) => {
  const { project, updateProject } = useEditor();
  const sequences: Sequence[] = project.sequences || [
    {
      id: 'seq-main',
      name: '主序列 (Sequence 1)',
      resolution: project.resolution,
      fps: project.fps,
      duration: project.duration,
      tracks: project.tracks,
    },
  ];

  const activeSeqId = project.activeSequenceId || sequences[0]?.id || 'seq-main';

  const [newSeqName, setNewSeqName] = useState('新建时间线序列');
  const [newRatio, setNewRatio] = useState<AspectRatio>('16:9');
  const [newFps, setNewFps] = useState<number>(30);

  if (!isOpen) return null;

  const handleSwitchSequence = (seq: Sequence) => {
    updateProject({
      activeSequenceId: seq.id,
      resolution: seq.resolution,
      fps: seq.fps,
      tracks: seq.tracks,
    });
  };

  const handleCreateSequence = () => {
    const res = ASPECT_RATIOS[newRatio];
    const newSeq: Sequence = {
      id: `seq-${Date.now()}`,
      name: newSeqName.trim() || '未命名序列',
      resolution: res,
      fps: newFps,
      duration: 30,
      tracks: [
        { id: `track-v-${Date.now()}`, name: '视频轨 1', type: 'video', volume: 1, order: 0, clips: [] },
        { id: `track-a-${Date.now()}`, name: '音频轨 1', type: 'audio', volume: 1, order: 1, clips: [] },
      ],
    };

    const updated = [...sequences, newSeq];
    updateProject({
      sequences: updated,
      activeSequenceId: newSeq.id,
      resolution: newSeq.resolution,
      fps: newSeq.fps,
      tracks: newSeq.tracks,
    });

    setNewSeqName(`新序列 ${updated.length + 1}`);
  };

  const handleDuplicateSequence = (seq: Sequence) => {
    const dupeSeq: Sequence = {
      ...seq,
      id: `seq-${Date.now()}`,
      name: `${seq.name} (副本)`,
      tracks: JSON.parse(JSON.stringify(seq.tracks)),
    };

    const updated = [...sequences, dupeSeq];
    updateProject({
      sequences: updated,
    });
  };

  const handleDeleteSequence = (seqId: string) => {
    if (sequences.length <= 1) return;
    const remaining = sequences.filter((s) => s.id !== seqId);
    const nextActive = remaining[0];
    updateProject({
      sequences: remaining,
      activeSequenceId: nextActive.id,
      resolution: nextActive.resolution,
      fps: nextActive.fps,
      tracks: nextActive.tracks,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 kf-anim-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h2 className="font-bold text-sm text-neutral-100">FreeCut 多序列管理器 (Sequences)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col md:flex-row gap-6 max-h-[70vh] overflow-y-auto">
          {/* Left: Sequence List */}
          <div className="flex-1 flex flex-col gap-2">
            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              项目序列列表 ({sequences.length})
            </span>

            <div className="flex flex-col gap-2">
              {sequences.map((seq) => {
                const isActive = seq.id === activeSeqId;
                return (
                  <div
                    key={seq.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isActive
                        ? 'bg-sky-950/40 border-sky-500/60 shadow-lg'
                        : 'bg-neutral-950/50 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div
                      onClick={() => handleSwitchSequence(seq)}
                      className="flex-1 cursor-pointer flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-neutral-200">{seq.name}</span>
                        {isActive && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono">
                            当前激活
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {seq.resolution.aspectRatio} • {seq.resolution.width}×{seq.resolution.height} • {seq.fps}fps
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDuplicateSequence(seq)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded hover:bg-neutral-800"
                        title="复制此序列"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {sequences.length > 1 && (
                        <button
                          onClick={() => handleDeleteSequence(seq.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-800"
                          title="删除序列"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Create New Sequence */}
          <div className="w-full md:w-64 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <span className="text-xs font-semibold text-neutral-300">新建时间线序列</span>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-neutral-400">序列名称</label>
              <input
                type="text"
                value={newSeqName}
                onChange={(e) => setNewSeqName(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-neutral-400">画幅比例</label>
              <select
                value={newRatio}
                onChange={(e) => setNewRatio(e.target.value as AspectRatio)}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
              >
                <option value="16:9">16:9 宽屏 (1920×1080)</option>
                <option value="9:16">9:16 竖屏 (1080×1920)</option>
                <option value="1:1">1:1 方形 (1080×1080)</option>
                <option value="4:5">4:5 肖像 (1080×1350)</option>
                <option value="21:9">21:9 电影宽荧幕 (2560×1080)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-neutral-400">帧率 (FPS)</label>
              <select
                value={newFps}
                onChange={(e) => setNewFps(parseInt(e.target.value))}
                className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-sky-500"
              >
                <option value={24}>24 FPS (电影标准)</option>
                <option value={30}>30 FPS (高清流媒体)</option>
                <option value={60}>60 FPS (高帧率电竞/丝滑)</option>
              </select>
            </div>

            <button
              onClick={handleCreateSequence}
              className="mt-2 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建并切换至序列
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
