import React from 'react';
import { Smile, Plus } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { STICKER_LIST } from '../../constants/samples';

export const StickersPanel: React.FC = () => {
  const { addMediaToTimeline } = useEditor();

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      <div className="p-2.5 border-b border-white/[0.06]">
        <span className="font-bold text-xs text-white flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-pink-400" />
          贴纸表情 (Stickers)
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2.5">
        <div className="grid grid-cols-4 gap-1.5">
          {STICKER_LIST.map((stk) => (
            <button
              key={stk.id}
              onClick={() =>
                addMediaToTimeline({
                  name: stk.name,
                  type: 'sticker',
                  duration: 4,
                  stickerEmoji: stk.emoji,
                })
              }
              className="bg-[var(--kf-surface-3)] hover:bg-[var(--kf-surface-4)] border border-white/[0.06] hover:border-pink-500 rounded-md p-1.5 flex flex-col items-center justify-center gap-0.5 transition-all group aspect-square"
              title={`添加 ${stk.name}`}
            >
              <span className="text-xl group-hover:scale-120 transition-transform">{stk.emoji}</span>
              <span className="text-[8px] text-neutral-400 truncate w-full text-center">{stk.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
