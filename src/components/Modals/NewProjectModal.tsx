import React, { useState, useEffect } from 'react';
import { useEditor } from '../../context/EditorContext';
import { AspectRatio, Resolution } from '../../types/editor';
import {
  X,
  Sparkles,
  Tv,
  Smartphone,
  Square,
  Clapperboard,
  Sliders,
  Film,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface PresetItem {
  id: string;
  tag: string;
  title: string;
  desc: string;
  resLabel: string;
  aspect: AspectRatio;
  width: number;
  height: number;
  icon: React.ComponentType<{ className?: string }>;
  isCustom?: boolean;
}

const PRESETS: PresetItem[] = [
  {
    id: '16:9',
    tag: '最常用',
    title: '16:9 宽屏高清',
    desc: 'YouTube / B站 / 影视宣传片',
    resLabel: '1920 × 1080',
    aspect: '16:9',
    width: 1920,
    height: 1080,
    icon: Tv,
  },
  {
    id: '9:16',
    tag: '爆款推荐',
    title: '9:16 竖屏短视频',
    desc: '抖音 / TikTok / Reels / 视频号',
    resLabel: '1080 × 1920',
    aspect: '9:16',
    width: 1080,
    height: 1920,
    icon: Smartphone,
  },
  {
    id: '1:1',
    tag: '社交',
    title: '1:1 社交正方形',
    desc: '小红书 / Instagram / 方形展示',
    resLabel: '1080 × 1080',
    aspect: '1:1',
    width: 1080,
    height: 1080,
    icon: Square,
  },
  {
    id: '4:5',
    tag: '电商',
    title: '4:5 肖像信息流',
    desc: 'Instagram Feed / 电商海报',
    resLabel: '1080 × 1350',
    aspect: '4:5',
    width: 1080,
    height: 1350,
    icon: Smartphone,
  },
  {
    id: '21:9',
    tag: '电影感',
    title: '21:9 宽银幕电影',
    desc: '大片级超宽幅电影质感',
    resLabel: '2560 × 1080',
    aspect: '21:9',
    width: 2560,
    height: 1080,
    icon: Clapperboard,
  },
  {
    id: 'custom',
    tag: '自由定义',
    title: '自定义画幅',
    desc: '输入任意宽与高分辨率',
    resLabel: '自定义尺寸',
    aspect: '16:9',
    width: 1920,
    height: 1080,
    icon: Sliders,
    isCustom: true,
  },
];

const RANDOM_NAMES = [
  '2026 盛夏旅拍精剪',
  '抖音爆款卡点节奏短片',
  '科技感产品发布会预告',
  '赛博朋克夜景调色短片',
  '高能游戏精彩混剪集锦',
  '治愈系周末美食 Vlog',
  '知识播客与双语口播',
  '大片级电影叙事短片',
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { createNewProject } = useEditor();

  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [fps, setFps] = useState<number>(30);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('16:9');
  const [customWidth, setCustomWidth] = useState<number>(1920);
  const [customHeight, setCustomHeight] = useState<number>(1080);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
      setProjectName(random);
      setDescription('');
      setSelectedPresetId('16:9');
      setFps(30);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRandomName = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setProjectName(random);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const name = projectName.trim() || `新建工程 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      const preset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

      let resolution: Resolution;
      let aspect: AspectRatio = preset.aspect;

      if (preset.isCustom) {
        const w = Math.max(200, Math.min(7680, customWidth || 1920));
        const h = Math.max(200, Math.min(4320, customHeight || 1080));
        const ratio = w / h;
        if (ratio > 2.0) aspect = '21:9';
        else if (ratio > 1.4) aspect = '16:9';
        else if (ratio >= 0.95 && ratio <= 1.05) aspect = '1:1';
        else if (ratio < 0.7) aspect = '9:16';
        else aspect = '4:5';

        resolution = {
          width: w,
          height: h,
          aspectRatio: aspect,
          label: `${w}×${h}`,
        };
      } else {
        resolution = {
          width: preset.width,
          height: preset.height,
          aspectRatio: preset.aspect,
          label: preset.title,
        };
      }

      await createNewProject(name, aspect, fps, resolution, description.trim());
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  return (
    <div
      id="new-project-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 kf-anim-fade-in select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="new-project-modal-container"
        className="w-full max-w-4xl bg-[#101118] border border-[#202333] rounded-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1c1f2d] bg-[#141520]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">开启你的下一个视频创作</h2>
                <span className="text-[10px] font-semibold bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 px-2 py-0.5 rounded-full">
                  高性能 Web 剪辑引擎
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                支持多轨超低延迟剪辑、GPU粒子滤镜、AI智能字幕与多分辨率即时导出
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[var(--kf-surface-4)] transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - 2 Columns */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* 1. Project Name Input Bar with Random Name Button */}
          <div className="flex items-center gap-2 bg-[#0c0d13] border border-[#232738] focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-cyan-400/50 rounded-xl px-3.5 py-2.5 transition-all">
            <Film className="w-4 h-4 text-neutral-400 shrink-0" />
            <input
              id="modal-project-name-input"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="输入新工程名称 (例如: 2026 盛夏旅拍精剪)..."
              className="bg-transparent outline-none flex-1 text-xs text-white placeholder-neutral-500 font-medium"
            />
            <button
              type="button"
              onClick={handleRandomName}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/15 border border-amber-400/20 px-3 py-1 rounded-lg transition-colors cursor-pointer shrink-0 font-medium"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>灵感名称</span>
            </button>
          </div>

          {/* 2. Aspect Ratio Presets Grid */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-neutral-200">
                <Sliders className="w-3.5 h-3.5 text-cyan-300" />
                <span>选择画幅与分辨率预设:</span>
              </div>
              <span className="text-neutral-400 text-[11px] font-mono">
                当前预设: {activePreset.isCustom ? `${customWidth} × ${customHeight} px` : `${activePreset.width} × ${activePreset.height} px`}
              </span>
            </div>

            {/* 6 Preset Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const isSelected = selectedPresetId === preset.id;
                const IconComponent = preset.icon;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`relative p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                      isSelected
                        ? 'bg-cyan-500/15 border-cyan-400/90 ring-1 ring-cyan-400/60 shadow-[0_0_20px_rgba(59,130,246,0.18)]'
                        : 'bg-[var(--kf-surface-2)] hover:bg-[var(--kf-surface-3)] border-white/[0.06] text-neutral-300'
                    }`}
                  >
                    {/* Top Row: Icon + Tag */}
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-400/25 text-cyan-300 border border-cyan-300/40'
                            : 'bg-[#0d0e14] text-neutral-400 border border-[#232738] group-hover:text-neutral-200'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          isSelected
                            ? 'bg-cyan-400 text-white font-bold'
                            : 'bg-[#1c1f2e] text-neutral-400 border border-[#272b3e]'
                        }`}
                      >
                        {preset.tag}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <div className="flex flex-col gap-0.5">
                      <h4
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-neutral-200'
                        }`}
                      >
                        {preset.title}
                      </h4>
                      <p className="text-[10.5px] text-neutral-400 line-clamp-1">
                        {preset.desc}
                      </p>
                    </div>

                    {/* Bottom Resolution text */}
                    <div
                      className={`text-[11px] font-mono mt-2 pt-2 border-t border-[#1c1f2d] ${
                        isSelected ? 'text-cyan-200 font-semibold' : 'text-neutral-500'
                      }`}
                    >
                      {preset.resLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Dimensions Form */}
            {activePreset.isCustom && (
              <div className="p-3.5 bg-[#141622] border border-cyan-400/40 rounded-xl flex items-center gap-3 kf-anim-fade-in mt-1">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[11px] text-neutral-400 font-medium">宽度 (Width px)</label>
                  <input
                    type="number"
                    min={200}
                    max={7680}
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Number(e.target.value))}
                    className="bg-[#0b0c11] border border-[#262a3d] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
                <span className="text-neutral-500 mt-4">×</span>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[11px] text-neutral-400 font-medium">高度 (Height px)</label>
                  <input
                    type="number"
                    min={200}
                    max={4320}
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Number(e.target.value))}
                    className="bg-[#0b0c11] border border-[#262a3d] focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Description & FPS Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-[#13141f] border border-[#202334] rounded-xl p-3.5">
            {/* FPS Selector (Left) */}
            <div className="md:col-span-5 flex items-center gap-3">
              <span className="text-xs text-neutral-400 font-medium shrink-0">基准帧率 (FPS):</span>
              <div className="flex items-center bg-[#0c0d13] border border-[#232738] rounded-xl p-1 gap-1">
                {[
                  { value: 24, label: '24 fps (电影)' },
                  { value: 30, label: '30 fps (标准)' },
                  { value: 60, label: '60 fps (丝滑)' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFps(item.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      fps === item.value
                        ? 'bg-cyan-500 text-white font-bold shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description (Right) */}
            <div className="md:col-span-7 flex items-center gap-2">
              <span className="text-xs text-neutral-400 font-medium shrink-0">描述:</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="可选: 为该工程添加简要备注或标签..."
                className="w-full bg-[#0c0d13] border border-[#232738] focus:border-cyan-400 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1c1f2d] bg-[#141520] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] transition-colors cursor-pointer"
          >
            取消
          </button>
          <button
            id="modal-submit-create-project-btn"
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-violet-600 to-purple-600 hover:from-cyan-400 hover:via-violet-500 hover:to-purple-500 shadow-lg shadow-violet-600/30 transition-all transform active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <span>+ 新建工程并开启剪辑</span>
          </button>
        </div>
      </div>
    </div>
  );
};
