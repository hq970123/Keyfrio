import React from 'react';
import { Keyboard, X } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';

interface ShortcutGroup {
  category: string;
  items: { key: string; desc: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: '播放与时间线导航',
    items: [
      { key: 'Space', desc: '播放 / 暂停播放' },
      { key: '← / →', desc: '上一帧 / 下一帧精准步进' },
      { key: 'Home / End', desc: '快速跳到片头 / 片尾' },
      { key: 'J / K / L', desc: '倒放 / 暂停 / 2倍速快进' },
    ],
  },
  {
    category: '剪辑与轨道操作',
    items: [
      { key: 'S', desc: '在播放头位置分割 (Split) 选中片段' },
      { key: 'Ctrl + L / ⌘ + L', desc: '绑定 / 取消绑定音视频片段 (Link/Unlink)' },
      { key: 'Del / Backspace', desc: '删除选中的片段或轨道' },
      { key: 'Ctrl + D / ⌘ + D', desc: '快速复制选中片段' },
      { key: 'N', desc: '切换自动磁吸对齐 (Snapping)' },
      { key: 'V / C / H', desc: '选择工具 / 剃刀切割 / 抓手平移' },
      { key: 'B', desc: '切换波纹编辑模式 (Ripple)' },
      { key: 'Ctrl + Z / ⌘ + Z', desc: '撤销上一步操作' },
      { key: 'Ctrl + Y / ⌘ + Shift + Z', desc: '重做下一步操作' },
    ],
  },
  {
    category: '视图与工程',
    items: [
      { key: 'Ctrl + + / -', desc: '放大 / 缩小时间线' },
      { key: 'Shift + Z', desc: '自适应全览时间线' },
      { key: 'F', desc: '全屏画面预览' },
      { key: 'Ctrl + E', desc: '打开视频导出弹窗' },
      { key: '?', desc: '查看本快捷键面板' },
    ],
  },
];

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, closeShortcutsModal } = useEditor();

  if (!isShortcutsModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[var(--kf-surface-2)] border border-white/[0.06] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden text-neutral-200 text-xs">
        {/* Header */}
        <div className="h-10 px-3.5 border-b border-white/[0.06] flex items-center justify-between bg-[var(--kf-surface-1)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <Keyboard className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-semibold text-xs text-white block">快捷键 (Keyboard Shortcuts)</span>
            </div>
          </div>
          <button
            onClick={closeShortcutsModal}
            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-[var(--kf-surface-3)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="p-3.5 flex flex-col gap-3 max-h-[70vh] overflow-y-auto">
          {SHORTCUTS.map((group, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">
                {group.category}
              </span>
              <div className="bg-[var(--kf-surface-3)] border border-white/[0.06] rounded-lg overflow-hidden divide-y divide-white/[0.06]">
                {group.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="px-2.5 py-1.5 flex items-center justify-between">
                    <span className="text-neutral-300 text-xs">{item.desc}</span>
                    <kbd className="px-1.5 py-0.5 bg-[var(--kf-surface-1)] border border-[#262836] rounded text-[10px] font-mono text-neutral-200 font-medium shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="h-10 px-3 bg-[var(--kf-surface-1)] border-t border-white/[0.06] flex items-center justify-end">
          <button
            onClick={closeShortcutsModal}
            className="px-3 py-1 bg-[var(--kf-surface-3)] hover:bg-[#1f202d] border border-white/[0.06] text-white rounded text-xs transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
