import React from 'react';
import { useEditor } from '../../context/EditorContext';

export const AiUnavailableBanner: React.FC = () => {
  const { aiAvailable } = useEditor();

  if (aiAvailable !== false) return null;

  return (
    <div className="mx-2.5 mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-300">
      AI 未配置：服务端未设置 GEMINI_API_KEY，AI 功能暂时不可用
    </div>
  );
};
