import React from 'react';
import {
  FolderOpen,
  Globe2,
  Music2,
  Type,
  Sticker,
  Sparkles,
  Blend,
  Bot,
  Clapperboard,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useEditor } from '../../context/EditorContext';

export interface TabItem {
  id: string;
  name: string;
  icon: React.ElementType;
  badge?: string;
}

export const TABS: TabItem[] = [
  { id: 'media', name: '媒体', icon: FolderOpen },
  { id: 'openstock', name: '素材', icon: Globe2, badge: 'Free' },
  { id: 'lottie', name: '动画', icon: Clapperboard },
  { id: 'audio', name: '音频', icon: Music2 },
  { id: 'text', name: '文字', icon: Type },
  { id: 'stickers', name: '贴纸', icon: Sticker },
  { id: 'effects', name: '特效', icon: Sparkles },
  { id: 'transitions', name: '转场', icon: Blend },
  { id: 'ai', name: 'AI', icon: Bot, badge: 'AI' },
];

/** CapCut-style vertical icon rail with labels */
export const SidebarTabs: React.FC = () => {
  const activeSidebarTab = useUiStore((s) => s.activeSidebarTab);
  const { setActiveSidebarTab } = useEditor();

  return (
    <aside
      aria-label="编辑工具"
      className="w-[64px] bg-[#141418] border-r border-[#2a2a32] flex flex-col items-center py-2 select-none shrink-0 z-20"
    >
      <nav className="flex flex-col gap-0.5 w-full px-1.5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSidebarTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.name}
              aria-pressed={isActive}
              onClick={() => setActiveSidebarTab(tab.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg w-full py-2 transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[rgba(0,212,200,0.12)] text-[#00d4c8]'
                  : 'text-[#6b6b78] hover:text-[#f0f0f2] hover:bg-[#222228]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  aria-hidden="true"
                  className="w-[18px] h-[18px]"
                  strokeWidth={isActive ? 2.2 : 1.7}
                />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 rounded px-1 text-[7px] font-bold tracking-wide leading-none py-0.5 ${
                      tab.badge === 'AI'
                        ? 'bg-[rgba(124,92,255,0.25)] text-[#b4a0ff] border border-[rgba(124,92,255,0.35)]'
                        : 'bg-[#2a2a32] text-[#a0a0ab] border border-[#3a3a44]'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none font-medium ${
                isActive ? 'text-[#00d4c8]' : 'text-current'
              }`}>
                {tab.name}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#00d4c8]"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
