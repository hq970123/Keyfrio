import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Search,
  Plus,
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  Music,
  Video,
  ExternalLink,
  Key,
  ShieldCheck,
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  Layers,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import {
  PLATFORMS,
  PlatformId,
  OpenStockItem,
  searchOpenStock,
} from '../../services/openStockService';
import { playSynthesizedTone } from '../../utils/audio';
import { MediaCard } from './MediaCard';

export const OpenStockPanel: React.FC = () => {
  const { addMediaToTimeline } = useEditor();

  // Active platform
  const [activePlatform, setActivePlatform] = useState<PlatformId>('openverse');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');

  // Search state
  const [results, setResults] = useState<OpenStockItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFromLiveApi, setIsFromLiveApi] = useState(false);
  const [addedItemId, setAddedItemId] = useState<string | null>(null);

  // Audio preview state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // API Key management
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeys, setApiKeys] = useState<Partial<Record<PlatformId, string>>>(() => {
    try {
      return {
        pexels: localStorage.getItem('opencut_pexels_api_key') || '',
        pixabay: localStorage.getItem('opencut_pixabay_api_key') || '',
        unsplash: localStorage.getItem('opencut_unsplash_api_key') || '',
      };
    } catch {
      return {};
    }
  });
  const [tempKeyInput, setTempKeyInput] = useState('');

  const currentPlatformInfo = PLATFORMS[activePlatform];

  // Perform search
  const handleSearch = useCallback(
    async (overrideQuery?: string, overrideType?: 'all' | 'image' | 'video' | 'audio', overridePlatform?: PlatformId) => {
      const targetPlatform = overridePlatform || activePlatform;
      const targetQuery = overrideQuery !== undefined ? overrideQuery : searchQuery;
      const targetType = overrideType !== undefined ? overrideType : mediaTypeFilter;

      setIsLoading(true);
      try {
        const { items, fromLiveApi } = await searchOpenStock({
          platform: targetPlatform,
          query: targetQuery,
          mediaType: targetType,
          apiKeys,
        });
        setResults(items);
        setIsFromLiveApi(fromLiveApi);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [activePlatform, searchQuery, mediaTypeFilter, apiKeys]
  );

  // Trigger search when platform or filter changes
  useEffect(() => {
    // Reset media type filter if not supported by new platform
    const platformMediaTypes = PLATFORMS[activePlatform].mediaTypes;
    if (mediaTypeFilter !== 'all' && !platformMediaTypes.includes(mediaTypeFilter as any)) {
      setMediaTypeFilter('all');
      handleSearch(searchQuery, 'all', activePlatform);
    } else {
      handleSearch(searchQuery, mediaTypeFilter, activePlatform);
    }
  }, [activePlatform]);

  // Handle adding media to timeline
  const handleAddToTimeline = async (item: OpenStockItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    try {
      await addMediaToTimeline({
        name: item.title,
        type: item.type,
        url: item.url,
        thumbnail: item.thumbnail,
        thumbnails: [item.thumbnail, item.thumbnail],
        duration: item.duration || (item.type === 'video' ? 12 : item.type === 'audio' ? 15 : 5),
        width: item.width,
        height: item.height,
      });

      playSynthesizedTone('sfx-pop', 0.2, 0.4);
      setAddedItemId(item.id);
      setTimeout(() => setAddedItemId(null), 1500);
    } catch (err) {
      console.error('Failed to add open stock item to timeline:', err);
    }
  };

  // Handle audio preview playback
  const handleToggleAudioPreview = (item: OpenStockItem, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingAudioId === item.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setPlayingAudioId(null);
      return;
    }

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }

    const audio = new Audio(item.previewUrl || item.url);
    audioPreviewRef.current = audio;
    audio.crossOrigin = 'anonymous';
    audio.play().catch(() => {
      // Fallback synthetic tone preview
      playSynthesizedTone('upbeat', Math.min(3, item.duration || 10), 0.5);
    });

    setPlayingAudioId(item.id);
    audio.onended = () => setPlayingAudioId(null);
    audio.onerror = () => {
      setPlayingAudioId(null);
      playSynthesizedTone('ambient', 3, 0.5);
    };
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, []);

  // Save API Key
  const handleSaveApiKey = (platform: PlatformId, key: string) => {
    const trimmed = key.trim();
    setApiKeys((prev) => ({ ...prev, [platform]: trimmed }));
    try {
      const storageKey = PLATFORMS[platform].keyStorageKey;
      if (storageKey) {
        if (trimmed) {
          localStorage.setItem(storageKey, trimmed);
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    } catch {
      // ignore
    }
    setShowKeyModal(false);
    handleSearch(searchQuery, mediaTypeFilter, platform);
  };

  return (
    <div className="flex flex-col h-full text-neutral-200 text-xs select-none">
      {/* 1. Header with Title & Platform Overview */}
      <div className="p-2.5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-xs text-white truncate">开源与商用素材库 (Open Stock)</span>
        </div>
        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
          6 大平台
        </span>
      </div>

      {/* 2. Platform Selector Tabs */}
      <div className="p-2 bg-[var(--kf-surface-1)] border-b border-white/[0.06] flex flex-col gap-1.5">
        <div className="text-[10px] font-semibold text-neutral-400 flex items-center justify-between">
          <span>选择媒体来源平台</span>
          <span className="text-[9px] text-neutral-500">点击即切</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(PLATFORMS) as PlatformId[]).map((pid) => {
            const p = PLATFORMS[pid];
            const isSelected = activePlatform === pid;
            const hasKey = p.requiresKey ? !!apiKeys[pid] : true;

            return (
              <button
                key={pid}
                onClick={() => {
                  setActivePlatform(pid);
                  setSearchQuery('');
                }}
                className={`p-1.5 rounded flex flex-col items-start text-left border transition-all relative overflow-hidden ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-sm'
                    : 'bg-[var(--kf-surface-3)] border-[#252834] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`font-bold text-[11px] truncate ${isSelected ? 'text-cyan-300' : ''}`}>
                    {p.name}
                  </span>
                  {p.requiresKey ? (
                    <span
                      className={`text-[8px] px-1 py-0.2 rounded font-mono ${
                        hasKey ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {hasKey ? '已配Key' : '支持Key'}
                    </span>
                  ) : (
                    <span className="text-[8px] px-1 py-0.2 rounded font-mono bg-emerald-500/20 text-emerald-300">
                      免Key
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-1 text-[9px] text-neutral-400">
                  {p.mediaTypes.map((mt) => (
                    <span key={mt} className="bg-neutral-800/80 px-1 py-0.2 rounded text-[8px] uppercase">
                      {mt === 'image' ? '图' : mt === 'video' ? '视频' : '音频'}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Platform Details & Key Status Bar */}
      <div className="px-2.5 py-1.5 bg-[var(--kf-surface-3)] border-b border-white/[0.06] flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-neutral-300 font-medium truncate">
            {currentPlatformInfo.license}
          </span>
        </div>

        {currentPlatformInfo.requiresKey && (
          <button
            onClick={() => {
              setTempKeyInput(apiKeys[activePlatform] || '');
              setShowKeyModal(true);
            }}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 px-1.5 py-0.5 rounded hover:bg-cyan-900/40 shrink-0"
          >
            <Key className="w-2.5 h-2.5" />
            <span>{apiKeys[activePlatform] ? '更新 Key' : '配置 Key'}</span>
          </button>
        )}
      </div>

      {/* 4. Search and Filter Bar */}
      <div className="p-2.5 border-b border-white/[0.06] flex flex-col gap-2 bg-[#14151c]">
        {/* Search Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center"
        >
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`在 ${currentPlatformInfo.name} 中搜索素材...`}
            className="w-full bg-[#1b1c26] border border-[#282a38] rounded-md pl-8 pr-16 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-cyan-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                handleSearch('');
              }}
              className="absolute right-10 text-neutral-500 hover:text-neutral-300 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-1 bg-cyan-500 hover:bg-cyan-400 text-white px-2 py-0.8 rounded text-[10px] font-medium"
          >
            搜索
          </button>
        </form>

        {/* Media Type Filter Chips */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <button
              onClick={() => {
                setMediaTypeFilter('all');
                handleSearch(searchQuery, 'all');
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                mediaTypeFilter === 'all'
                  ? 'bg-cyan-500 text-white font-semibold'
                  : 'bg-[#1b1c26] text-neutral-400 hover:text-white border border-[#262837]'
              }`}
            >
              全部
            </button>

            {currentPlatformInfo.mediaTypes.includes('video') && (
              <button
                onClick={() => {
                  setMediaTypeFilter('video');
                  handleSearch(searchQuery, 'video');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  mediaTypeFilter === 'video'
                    ? 'bg-cyan-500 text-white font-semibold'
                    : 'bg-[#1b1c26] text-neutral-400 hover:text-white border border-[#262837]'
                }`}
              >
                <Video className="w-2.5 h-2.5" />
                视频
              </button>
            )}

            {currentPlatformInfo.mediaTypes.includes('image') && (
              <button
                onClick={() => {
                  setMediaTypeFilter('image');
                  handleSearch(searchQuery, 'image');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  mediaTypeFilter === 'image'
                    ? 'bg-cyan-500 text-white font-semibold'
                    : 'bg-[#1b1c26] text-neutral-400 hover:text-white border border-[#262837]'
                }`}
              >
                <ImageIcon className="w-2.5 h-2.5" />
                图片
              </button>
            )}

            {currentPlatformInfo.mediaTypes.includes('audio') && (
              <button
                onClick={() => {
                  setMediaTypeFilter('audio');
                  handleSearch(searchQuery, 'audio');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
                  mediaTypeFilter === 'audio'
                    ? 'bg-cyan-500 text-white font-semibold'
                    : 'bg-[#1b1c26] text-neutral-400 hover:text-white border border-[#262837]'
                }`}
              >
                <Music className="w-2.5 h-2.5" />
                音频
              </button>
            )}
          </div>

          <button
            onClick={() => handleSearch()}
            title="刷新搜索"
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-[var(--kf-surface-4)]"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-cyan-300' : ''}`} />
          </button>
        </div>

        {/* Hot Keywords Tags */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[9px] text-neutral-500 shrink-0">热门:</span>
          {currentPlatformInfo.sampleKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => {
                setSearchQuery(kw);
                handleSearch(kw);
              }}
              className="text-[9px] px-1.5 py-0.3 rounded bg-[#1c1e2a] hover:bg-cyan-500/30 text-neutral-400 hover:text-cyan-200 border border-[#282a3b] shrink-0 transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Search Results Grid */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-neutral-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-300" />
            <span className="text-xs">正在从 {currentPlatformInfo.name} 检索开放媒体...</span>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center p-4">
            <Globe className="w-8 h-8 text-neutral-600 mb-2" />
            <span className="font-semibold text-neutral-300 text-xs">暂无匹配素材</span>
            <p className="text-[10px] text-neutral-500 mt-1 max-w-[200px]">
              尝试输入其他英文或中文关键词（如 Nature, Cyber, Music, Space），或切换素材类型。
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Status Subtitle */}
            <div className="flex items-center justify-between text-[9px] text-neutral-500 px-0.5">
              <span>
                找到 {results.length} 项素材 {isFromLiveApi ? '(实时 API)' : '(精选开源库)'}
              </span>
              <span className="text-neutral-400">点击卡片或 + 直接插入时间线</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-2">
              {results.map((item) => {
                const isAdded = addedItemId === item.id;
                const isAudioPlaying = playingAudioId === item.id;

                if (item.type === 'audio') {
                  // Audio Card Layout
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleAddToTimeline(item)}
                      className="col-span-2 bg-[var(--kf-surface-3)] hover:bg-[#1f202e] border border-[#242636] hover:border-emerald-500 rounded-md p-2 flex items-center justify-between transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Audio Play Preview Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleAudioPreview(item, e)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isAudioPlaying
                              ? 'bg-emerald-500 text-white scale-105 shadow-md shadow-emerald-500/30'
                              : 'bg-[#222432] text-neutral-300 group-hover:bg-emerald-600 group-hover:text-white'
                          }`}
                        >
                          {isAudioPlaying ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>

                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-neutral-200 text-[11px] truncate group-hover:text-white">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[8px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-mono">
                              {item.duration || 15}s
                            </span>
                            <span className="text-[8px] text-neutral-500 truncate">{item.license}</span>
                          </div>
                        </div>
                      </div>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={(e) => handleAddToTimeline(item, e)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-all ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#222432] text-neutral-300 group-hover:bg-cyan-500 group-hover:text-white'
                        }`}
                      >
                        {isAdded ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  );
                }

                // Video / Image Card Layout
                return (
                  <MediaCard
                    key={item.id}
                    id={item.id}
                    name={item.title}
                    type={item.type}
                    url={item.url}
                    thumbnail={item.thumbnail}
                    duration={item.duration}
                    width={item.width}
                    height={item.height}
                    onAdd={() => handleAddToTimeline(item)}
                    badge={item.width && item.width >= 3840 ? '4K' : item.type.toUpperCase()}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. API Key Settings Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--kf-surface-3)] border border-[#2b2e3e] rounded-xl max-w-sm w-full p-4 flex flex-col gap-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#252838] pb-2.5">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">{currentPlatformInfo.name} API Key 配置</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {currentPlatformInfo.description}
            </p>

            <div className="bg-[#12131b] border border-[#222432] rounded-md p-2.5 flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-neutral-400">
                输入您的 {currentPlatformInfo.name} Access Key / API Key：
              </label>
              <input
                type="password"
                value={tempKeyInput}
                onChange={(e) => setTempKeyInput(e.target.value)}
                placeholder="在此粘贴您的 API Key..."
                className="bg-[#1a1c27] border border-[#2e3143] rounded px-2 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[9px] text-neutral-500">
                Key 安全保存在本地浏览器 LocalStorage 中，可随时清除。
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <a
                href={currentPlatformInfo.homepage}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
              >
                <span>前往 {currentPlatformInfo.name} 官网申请免费 Key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveApiKey(activePlatform, '')}
                  className="px-2.5 py-1 rounded text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  清除
                </button>
                <button
                  onClick={() => handleSaveApiKey(activePlatform, tempKeyInput)}
                  className="px-3 py-1 rounded text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm"
                >
                  保存并生效
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
