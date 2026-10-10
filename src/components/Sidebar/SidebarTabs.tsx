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
  MonitorPlay,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useEditorActions } from '../../context/EditorContext';

export interface TabItem {
  id: string;
  name: string;
  icon: React.ElementType;
  badge?: string;
  accent?: string;
}

export const TABS: TabItem[] = [
  { id: 'media', name: '媒体', icon: FolderOpen, accent: '#22d3ee' },
  { id: 'openstock', name: '素材', icon: Globe2, badge: 'Free', accent: '#34d399' },
  { id: 'lottie', name: '动画', icon: Clapperboard, accent: '#fbbf24' },
  { id: 'audio', name: '音频', icon: Music2, accent: '#a78bfa' },
  { id: 'text', name: '文字', icon: Type, accent: '#60a5fa' },
  { id: 'stickers', name: '贴纸', icon: Sticker, accent: '#fb7185' },
  { id: 'effects', name: '特效', icon: Sparkles, accent: '#22d3ee' },
  { id: 'transitions', name: '转场', icon: Blend, accent: '#f472b6' },
  { id: 'ai', name: 'AI', icon: Bot, badge: 'AI', accent: '#c4b5fd' },
  { id: 'remotion', name: '模板', icon: MonitorPlay, badge: 'RM', accent: '#22d3ee' },
];

/** Obsidian icon rail — slim, precise, glowing active state */
export const SidebarTabs: React.FC = () => {
  const activeSidebarTab = useUiStore((s) => s.activeSidebarTab);
  const { setActiveSidebarTab } = useEditorActions();

  return (
    <aside
      aria-label="编辑工具"
      className="w-[68px] bg-[#121318] border-r border-[#252731] flex flex-col items-center py-2.5 select-none shrink-0 z-20"
    >
      <nav className="flex flex-col gap-1 w-full px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSidebarTab === tab.id;
          const accent = tab.accent ?? '#22d3ee';
          return (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.name}
              aria-pressed={isActive}
              onClick={() => setActiveSidebarTab(tab.id)}
              className="relative flex flex-col items-center justify-center gap-1 rounded-xl w-full py-2.5 cursor-pointer transition-all duration-150 group"
              style={
                isActive
                  ? {
                      background: `linear-gradient(180deg, ${accent}1f, ${accent}0d)`,
                      color: accent,
                      boxShadow: `inset 0 0 0 1px ${accent}40, 0 0 16px ${accent}14`,
                    }
                  : { color: 'var(--kf-text-muted)' }
              }
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = 'var(--kf-text)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '';
                  e.currentTarget.style.color = '';
                }
              }}
            >
              <span className="relative flex items-center justify-center">
                <Icon
                  aria-hidden="true"
                  className="w-[19px] h-[19px] transition-transform duration-150 group-active:scale-90"
                  strokeWidth={isActive ? 2.1 : 1.7}
                />
                {tab.badge && (
                  <span
                    className="absolute -top-2 -right-3.5 rounded-md px-1 py-px text-[7px] font-extrabold tracking-wider leading-none"
                    style={
                      tab.badge === 'AI'
                        ? { background: 'rgba(139,92,246,0.22)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
                        : { background: 'rgba(52,211,153,0.14)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }
                    }
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none font-medium tracking-wide">
                {tab.name}
              </span>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                  style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* bottom hint */}
      <div className="mt-auto px-2 w-full">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-center">
          <div className="text-[9px] text-neutral-600 leading-relaxed">
            快捷键
            <br />
            <span className="font-mono text-neutral-500">?</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
