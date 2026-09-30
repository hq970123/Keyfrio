import React from 'react';
import {
  Blend,
  Check,
  Sparkles,
  ArrowRightLeft,
  Sun,
  Moon,
  MoveLeft,
  MoveRight,
  MoveUp,
  ZoomIn,
  Zap,
  CloudFog,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { TransitionType } from '../../types/editor';

const TRANSITIONS: {
  type: TransitionType;
  name: string;
  desc: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    type: 'crossDissolve',
    name: '交叉溶解 (Cross Dissolve)',
    desc: '平滑淡入淡出，最经典的电影转场',
    icon: Blend,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  },
  {
    type: 'fadeBlack',
    name: '黑场过渡 (Fade to Black)',
    desc: '淡入黑色画面，适合场景时空切换',
    icon: Moon,
    color: 'text-neutral-300 bg-neutral-800/60 border-neutral-700/40',
  },
  {
    type: 'fadeWhite',
    name: '白场闪白 (Fade to White)',
    desc: '高亮闪白过场，富有回忆或高光感',
    icon: Sun,
    color: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  },
  {
    type: 'wipeLeft',
    name: '向左擦除 (Wipe Left)',
    desc: '由右向左平移推拉揭示下一幕',
    icon: MoveLeft,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    type: 'wipeRight',
    name: '向右擦除 (Wipe Right)',
    desc: '由左向右平稳擦除过渡',
    icon: MoveRight,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    type: 'wipeUp',
    name: '向上擦除 (Wipe Up)',
    desc: '由下向上揭示画面',
    icon: MoveUp,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    type: 'zoomIn',
    name: '推镜头变焦 (Zoom In)',
    desc: '极速推向画面中心，动感十足',
    icon: ZoomIn,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    type: 'glitch',
    name: '数码故障 (Digital Glitch)',
    desc: '赛博朋克信号故障干扰撕裂',
    icon: Zap,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    type: 'blur',
    name: '动态模糊 (Motion Blur)',
    desc: '柔和径向虚化快速过渡',
    icon: CloudFog,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
];

export const TransitionsPanel: React.FC = () => {
  const { selectedClip, updateClip } = useEditor();

  const handleApplyTransition = (type: TransitionType) => {
    if (!selectedClip) {
      alert('请先在时间线上选中一个视频或图片片段');
      return;
    }
    updateClip(selectedClip.id, {
      transition: {
        type,
        duration: selectedClip.transition?.duration || 0.6,
      },
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#131419] text-neutral-200 text-xs select-none">
      <div className="p-2.5 border-b border-[#20222a] flex items-center justify-between">
        <div>
          <span className="font-bold text-xs text-white flex items-center gap-1.5">
            <Blend className="w-3.5 h-3.5 text-pink-400" />
            转场特效 (Transitions)
          </span>
          <p className="text-[9px] text-neutral-400 mt-0.5">
            {selectedClip ? `正在为 [${selectedClip.name}] 设置转场` : '💡 请先在时间线上选中目标片段'}
          </p>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-300 font-mono text-[9px]">
          8 种预设
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2">
        {TRANSITIONS.map((trans) => {
          const Icon = trans.icon;
          const isSelected = selectedClip?.transition?.type === trans.type;
          return (
            <button
              key={trans.type}
              onClick={() => handleApplyTransition(trans.type)}
              className={`p-2.5 bg-[#171822] hover:bg-[#1f202d] border rounded-lg flex items-center justify-between text-left transition-all group cursor-pointer ${
                isSelected ? 'border-pink-500 bg-pink-500/10 shadow-xs' : 'border-[#242633] hover:border-pink-500/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${trans.color}`}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium text-xs text-white group-hover:text-pink-400 transition-colors truncate">
                    {trans.name}
                  </span>
                  <span className="text-[9.5px] text-neutral-400 truncate">{trans.desc}</span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-white transition-colors shrink-0 ml-2 ${
                  isSelected ? 'bg-pink-600' : 'bg-[#242634] group-hover:bg-pink-600/80'
                }`}
              >
                <Check className="w-3 h-3" strokeWidth={2.5} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
