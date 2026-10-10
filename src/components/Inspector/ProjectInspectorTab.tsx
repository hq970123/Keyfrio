import React, { useState } from 'react';
import {
  Sliders,
  Film,
  Layers,
  HardDrive,
  Volume2,
  Monitor,
  Keyboard,
  Clock,
  Sparkles,
  Music,
  Maximize2,
  Check,
} from 'lucide-react';
import { Project, AspectRatio } from '../../types/editor';
import { ASPECT_RATIOS } from '../../constants/samples';
import { useEditor } from '../../context/EditorContext';

interface ProjectInspectorTabProps {
  project: Project;
}

export const ProjectInspectorTab: React.FC<ProjectInspectorTabProps> = ({ project }) => {
  const { setResolution, project: currentProject } = useEditor();

  // Count clips and media types
  let totalClips = 0;
  let videoClips = 0;
  let audioClips = 0;
  let textClips = 0;
  let effectClips = 0;

  project.tracks.forEach((track) => {
    track.clips.forEach((clip) => {
      totalClips++;
      if (clip.type === 'video') videoClips++;
      else if (clip.type === 'audio') audioClips++;
      else if (clip.type === 'text') textClips++;
      else if (clip.type === 'effect' || clip.gpuEffect) effectClips++;
    });
  });

  const handleAspectRatioSelect = (aspect: AspectRatio) => {
    const res = ASPECT_RATIOS[aspect];
    if (res) {
      setResolution(res);
    }
  };

  return (
    <div className="flex flex-col gap-3.5 text-xs">
      {/* 1. Project Header & Info */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-300" />
            <span className="font-semibold text-neutral-200">工程全局属性 (Project)</span>
          </div>
          <span className="text-[10px] bg-cyan-400/20 text-cyan-200 px-2 py-0.5 rounded-full font-mono">
            {project.fps} FPS
          </span>
        </div>

        <div className="flex flex-col gap-1 text-[11px]">
          <div className="flex justify-between text-neutral-400">
            <span>工程名称:</span>
            <span className="text-white font-medium truncate max-w-[140px]">{project.name}</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>总时间线时长:</span>
            <span className="text-white font-mono">{project.duration.toFixed(1)} 秒</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>当前序列:</span>
            <span className="text-sky-400 font-medium truncate max-w-[140px]">
              {project.activeSequenceId || '主序列'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Canvas Aspect Ratio & Resolution */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-semibold text-neutral-200">画布画幅比例 (Aspect Ratio)</span>
          </div>
          <span className="font-mono text-[11px] text-violet-300 font-medium">
            {project.resolution.width} × {project.resolution.height}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {(['16:9', '9:16', '1:1', '4:5', '21:9'] as AspectRatio[]).map((aspect) => {
            const isSelected = project.resolution.aspectRatio === aspect;
            return (
              <button
                key={aspect}
                onClick={() => handleAspectRatioSelect(aspect)}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-violet-500/20 border-violet-500 text-violet-200 font-semibold shadow-xs'
                    : 'bg-[var(--kf-surface-1)] border-white/[0.06] text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="text-[11px] font-mono">{aspect}</div>
                <div className="text-[9px] text-neutral-400">
                  {aspect === '16:9' ? '横屏视频' : aspect === '9:16' ? '竖屏短视频' : aspect === '1:1' ? '正方形' : aspect === '4:5' ? '社媒卡片' : '电影宽屏'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Timeline Elements Overview */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-neutral-200">时间线素材概览</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="bg-[var(--kf-surface-1)] p-2 rounded-lg border border-white/[0.06] flex flex-col">
            <span className="text-[10px] text-neutral-500">轨道总数</span>
            <span className="text-base font-bold text-white font-mono">{project.tracks.length}</span>
          </div>
          <div className="bg-[var(--kf-surface-1)] p-2 rounded-lg border border-white/[0.06] flex flex-col">
            <span className="text-[10px] text-neutral-500">总片段数</span>
            <span className="text-base font-bold text-cyan-300 font-mono">{totalClips}</span>
          </div>
          <div className="bg-[var(--kf-surface-1)] p-2 rounded-lg border border-white/[0.06] flex flex-col">
            <span className="text-[10px] text-neutral-500">视视频 / 图片</span>
            <span className="text-base font-bold text-sky-400 font-mono">{videoClips}</span>
          </div>
          <div className="bg-[var(--kf-surface-1)] p-2 rounded-lg border border-white/[0.06] flex flex-col">
            <span className="text-[10px] text-neutral-500">音频 / 音乐</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{audioClips}</span>
          </div>
        </div>
      </div>

      {/* 4. Keyboard Shortcuts Cheatsheet */}
      <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] p-3 rounded-xl flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Keyboard className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-neutral-200">专业快捷键指南 (Hotkeys)</span>
        </div>

        <div className="flex flex-col gap-1 pt-1 text-[11px]">
          <div className="flex justify-between py-0.5 border-b border-white/[0.06]">
            <span className="text-neutral-400">播放 / 暂停</span>
            <kbd className="bg-[var(--kf-surface-1)] border border-[#272a38] text-neutral-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
              Space 空格
            </kbd>
          </div>
          <div className="flex justify-between py-0.5 border-b border-white/[0.06]">
            <span className="text-neutral-400">切割拆分片段</span>
            <kbd className="bg-[var(--kf-surface-1)] border border-[#272a38] text-neutral-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
              S
            </kbd>
          </div>
          <div className="flex justify-between py-0.5 border-b border-white/[0.06]">
            <span className="text-neutral-400">删除所选片段</span>
            <kbd className="bg-[var(--kf-surface-1)] border border-[#272a38] text-neutral-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
              Delete / Backspace
            </kbd>
          </div>
          <div className="flex justify-between py-0.5 border-b border-white/[0.06]">
            <span className="text-neutral-400">复制片段</span>
            <kbd className="bg-[var(--kf-surface-1)] border border-[#272a38] text-neutral-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
              Ctrl + D
            </kbd>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-neutral-400">撤销 / 重做</span>
            <kbd className="bg-[var(--kf-surface-1)] border border-[#272a38] text-neutral-300 px-1.5 py-0.5 rounded font-mono text-[10px]">
              Ctrl + Z / Ctrl + Y
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
