import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Play,
  Film,
  FolderOpen,
  Sparkles,
  Search,
  Trash2,
  Copy,
  Download,
  Edit2,
  Check,
  X,
  FileVideo,
  Radio,
  Sparkle,
  Database,
  ArrowRight,
  Clock,
  Layers,
  ChevronDown,
  Upload,
  ImagePlus,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { ProjectSummary, AspectRatio, Resolution } from '../../types/editor';
import { AppLogo } from '../common/AppLogo';
import { NewProjectModal } from '../Modals/NewProjectModal';

import lvxingImg from '../../assets/templates/lvxing.webp';
import duanshipinImg from '../../assets/templates/duanshipin.webp';
import bokeImg from '../../assets/templates/boke.webp';
import yugaopianImg from '../../assets/templates/yugaopian.webp';

interface ScenarioTemplate {
  id: string;
  title: string;
  tag: string;
  desc: string;
  aspect: AspectRatio;
  fps: number;
  width: number;
  height: number;
  bgImage: string;
  accent: string;
}

const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  { id: 'travel-vlog', title: '4K 电影感旅拍 Vlog', tag: '热度', desc: '16:9 画幅 · 24fps 胶片调色 · 预设多轨音画分离', aspect: '16:9', fps: 24, width: 3840, height: 2160, bgImage: lvxingImg, accent: '#fbbf24' },
  { id: 'tiktok-viral', title: '竖屏短视频爆款模版', tag: '热门', desc: '9:16 竖屏 · 60fps 高帧率 · 适配抖音/TikTok 爆款', aspect: '9:16', fps: 60, width: 1080, height: 1920, bgImage: duanshipinImg, accent: '#fb7185' },
  { id: 'podcast-sub', title: '知识博主与访谈字幕', tag: '口播', desc: '16:9 画幅 · 30fps · 智能标题与双语字幕轨', aspect: '16:9', fps: 30, width: 1920, height: 1080, bgImage: bokeImg, accent: '#60a5fa' },
  { id: 'epic-trailer', title: '21:9 史诗级预告片', tag: '预告片', desc: '21:9 宽荧幕 · 24fps 电影质感 · 高级调色比例', aspect: '21:9', fps: 24, width: 2560, height: 1080, bgImage: yugaopianImg, accent: '#34d399' },
];

const QUICK_ACTIONS = [
  { id: 'record', icon: Radio, title: '快速录制', desc: '屏幕 / 镜头 / 配音', accent: '#fb7185', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.25)' },
  { id: 'import', icon: FolderOpen, title: '导入工程', desc: '支持 .opencut.json', accent: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
  { id: 'demo', icon: Zap, title: '官方示例', desc: '体验多轨剪辑动效', accent: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
  { id: 'ai', icon: Sparkle, title: 'AI 创作', desc: '智能粗剪 / 自动配乐', accent: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.25)' },
] as const;

export const ProjectHome: React.FC = () => {
  const {
    project,
    projectList,
    switchProject,
    duplicateProject,
    renameProject,
    deleteProject,
    openLanding,
    openEditor,
    loadDemoProject,
    importProjectJSON,
    exportProjectJSON,
    openRecordModal,
    openAiCopilotDrawer,
    createNewProject,
  } = useEditor();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'modified' | 'name'>('modified');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customCovers, setCustomCovers] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('opencut_template_covers');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const templateFileInputRef = useRef<{ id: string } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── handlers (logic unchanged) ── */
  const handleUploadCoverFile = (templateId: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setCustomCovers((prev) => {
          const next = { ...prev, [templateId]: dataUrl };
          try { localStorage.setItem('opencut_template_covers', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
  };
  const triggerUploadCover = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    templateFileInputRef.current = { id: templateId };
    coverInputRef.current?.click();
  };
  const handleCoverInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = templateFileInputRef.current?.id;
    if (file && targetId) handleUploadCoverFile(targetId, file);
    e.target.value = '';
  };
  const handleResetCover = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomCovers((prev) => {
      const next = { ...prev };
      delete next[templateId];
      try { localStorage.setItem('opencut_template_covers', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content && !importProjectJSON(content)) alert('工程文件解析失败，请检查文件格式！');
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const handleStartRename = (proj: ProjectSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(proj.id);
    setEditingName(proj.name);
  };
  const handleSaveRename = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingName.trim()) await renameProject(projId, editingName.trim());
    setEditingId(null);
  };
  const handleDeleteConfirm = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteProject(projId);
    setDeletingId(null);
  };
  const handleUseScenarioTemplate = async (template: ScenarioTemplate) => {
    const resolution: Resolution = { width: template.width, height: template.height, aspectRatio: template.aspect, label: template.title };
    await createNewProject(
      `${template.title} (${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })})`,
      template.aspect, template.fps, resolution, template.desc, template.id
    );
  };
  const formatTimeAgo = (timestamp: number) => {
    if (!timestamp) return '未知时间';
    const diffMin = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour} 小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay} 天前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };
  const filteredProjects = projectList
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (sortKey === 'name' ? a.name.localeCompare(b.name) : b.lastModified - a.lastModified));

  const quickActionHandler = (id: string) => {
    if (id === 'record') openRecordModal('screen');
    else if (id === 'import') fileInputRef.current?.click();
    else if (id === 'demo') loadDemoProject();
    else openAiCopilotDrawer();
  };

  return (
    <div className="min-h-screen w-full bg-[var(--kf-bg)] text-neutral-100 flex flex-col font-sans select-none relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="kf-aurora w-[600px] h-[300px] -top-32 left-1/3 bg-cyan-500/10" />
        <div className="kf-aurora w-[400px] h-[400px] top-[30%] -right-32 bg-violet-600/10" style={{ animationDelay: '-6s' }} />
      </div>
      <input ref={fileInputRef} type="file" accept=".json,.opencut" className="hidden" onChange={handleFileChange} />
      <input ref={coverInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/jpg" className="hidden" onChange={handleCoverInputChange} />

      {/* ── header ── */}
      <header className="h-16 kf-glass !border-x-0 !border-t-0 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
        <button onClick={openLanding} className="flex items-center gap-2.5 group cursor-pointer" title="返回官网首页">
          <AppLogo className="w-7 h-7 group-hover:scale-105 transition-transform" />
          <span className="text-left">
            <span className="block text-[15px] font-extrabold tracking-tight text-white leading-none">
              Keyfrio <span className="kf-badge-brand kf-badge !text-[9px] ml-1">PRO STUDIO</span>
            </span>
            <span className="block text-[10px] text-neutral-500 mt-0.5 hidden sm:block">Edit every moment. Shape every story.</span>
          </span>
        </button>
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 kf-badge !py-1.5 !px-3">
            <Database className="w-3.5 h-3.5 text-cyan-300" />
            本地工程库
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-cyan-300">{projectList.length}</span>
          </div>
          {project && (
            <button onClick={openEditor} className="kf-btn kf-btn-primary text-xs px-4 py-2">
              进入工作台
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-10">
        {/* ── welcome ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-[26px] sm:text-3xl font-black tracking-tight">
            晚上好，<span className="kf-gradient-text">创作者</span>
          </h1>
          <p className="mt-1.5 text-[13px] text-neutral-400">从一个灵感开始，或者接着上次的进度继续打磨。</p>
        </motion.div>

        {/* ── quick actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {QUICK_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => quickActionHandler(a.id)}
              className="kf-card kf-card-hoverable p-4 flex items-center gap-3.5 text-left group cursor-pointer"
            >
              <span
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110"
                style={{ background: a.bg, borderColor: a.border, color: a.accent }}
              >
                <a.icon className="w-5 h-5" />
              </span>
              <span>
                <span className="block text-[13px] font-bold text-white">{a.title}</span>
                <span className="block text-[11px] text-neutral-500 mt-0.5">{a.desc}</span>
              </span>
            </button>
          ))}
        </motion.div>

        {/* ── templates ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.14 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="kf-section-title !text-[13px] !text-neutral-300 !normal-case !tracking-normal flex-1">
              <Sparkles className="w-4 h-4 text-cyan-300" /> 创作场景预设模板
            </h2>
            <span className="text-[11px] text-neutral-600 ml-4 hidden sm:block">拖放原图到卡片可替换封面</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="kf-card kf-card-hoverable min-h-[190px] p-5 flex flex-col justify-between text-left cursor-pointer group relative overflow-hidden"
              style={{ borderColor: 'rgba(34,211,238,0.25)' }}
            >
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-cyan-500/15 blur-2xl group-hover:bg-cyan-500/25 transition-colors" />
              <div>
                <span className="kf-play-btn !w-11 !h-11 mb-4">
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                </span>
                <h3 className="text-[15px] font-bold text-white">新建工程</h3>
                <p className="mt-1.5 text-[11px] text-neutral-400 leading-relaxed">自由指定画幅、分辨率与帧率</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                自定义配置 <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>

            {SCENARIO_TEMPLATES.map((tmpl) => {
              const activeCover = customCovers[tmpl.id] || tmpl.bgImage;
              const hasCustom = !!customCovers[tmpl.id];
              const isDragOver = dragOverId === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => handleUseScenarioTemplate(tmpl)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(tmpl.id); }}
                  onDragLeave={() => setDragOverId(null)}
                  onDrop={(e) => { e.preventDefault(); setDragOverId(null); const f = e.dataTransfer.files?.[0]; if (f) handleUploadCoverFile(tmpl.id, f); }}
                  className={`kf-card kf-card-hoverable overflow-hidden cursor-pointer min-h-[190px] flex flex-col relative group ${isDragOver ? '!border-cyan-400 scale-[1.02]' : ''}`}
                >
                  <div className="relative h-[110px] overflow-hidden shrink-0">
                    <img src={activeCover} alt={tmpl.title} referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-108 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--kf-surface-1)] via-transparent to-transparent" />
                    <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md"
                      style={{ color: tmpl.accent, borderColor: `${tmpl.accent}55`, background: 'rgba(0,0,0,0.55)' }}>
                      {tmpl.tag}
                    </span>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={(e) => triggerUploadCover(tmpl.id, e)} title="上传原图替换封面"
                        className="p-1.5 rounded-lg bg-black/70 border border-white/15 text-neutral-300 hover:text-white backdrop-blur-md">
                        <ImagePlus className="w-3 h-3" />
                      </button>
                      {hasCustom && (
                        <button type="button" onClick={(e) => handleResetCover(tmpl.id, e)} title="恢复默认封面"
                          className="p-1.5 rounded-lg bg-black/70 border border-white/15 text-neutral-400 hover:text-red-300 backdrop-blur-md">
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {isDragOver && (
                      <div className="absolute inset-0 bg-cyan-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-cyan-300 gap-1.5">
                        <Upload className="w-6 h-6 animate-bounce" />
                        <span className="text-xs font-bold">释放鼠标应用图片</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 flex flex-col flex-1">
                    <h4 className="text-[13px] font-bold text-white line-clamp-1">{tmpl.title}</h4>
                    <p className="text-[10px] text-neutral-500 mt-1 line-clamp-1">{tmpl.desc}</p>
                    <div className="mt-auto pt-2.5 flex items-center justify-between">
                      <span className="font-mono text-[10px] text-neutral-600">{tmpl.aspect} · {tmpl.fps}FPS</span>
                      <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                        使用 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* ── projects ── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="kf-section-title !text-[13px] !text-neutral-300 !normal-case !tracking-normal flex-1 min-w-[180px]">
              <FileVideo className="w-4 h-4 text-cyan-300" /> 最近工程
              <span className="kf-badge !text-[10px] font-mono">{filteredProjects.length}</span>
            </h2>
            <div className="flex items-center gap-2">
              <div className="kf-input flex items-center px-3 py-2 w-52 sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-600 mr-2 shrink-0" />
                <input type="text" placeholder="搜索工程…" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none w-full text-xs placeholder:text-neutral-600" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-neutral-600 hover:text-white ml-1">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="relative">
                <select value={sortKey} onChange={(e) => setSortKey(e.target.value as 'modified' | 'name')}
                  className="kf-input appearance-none text-xs pl-3 pr-8 py-2 cursor-pointer text-neutral-300">
                  <option value="modified">最近修改</option>
                  <option value="name">名称排序</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="kf-panel kf-empty !py-20">
              <div className="kf-empty-icon"><Film className="w-6 h-6" /></div>
              <div className="text-[15px] font-bold text-neutral-200">{searchQuery ? '没有匹配的工程' : '还没有剪辑工程'}</div>
              <p className="mt-1.5 text-xs max-w-sm">{searchQuery ? '换个关键词试试' : '新建一个工程，或从模板开始你的第一次创作'}</p>
              {!searchQuery && (
                <button onClick={() => setIsNewModalOpen(true)} className="kf-btn kf-btn-primary text-xs px-5 py-2.5 mt-5">
                  <Plus className="w-3.5 h-3.5" /> 新建工程
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((proj) => {
                const isEditing = editingId === proj.id;
                const isDeleting = deletingId === proj.id;
                const isActive = project?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => switchProject(proj.id)}
                    className={`kf-card kf-card-hoverable overflow-hidden cursor-pointer flex flex-col group ${isActive ? '!border-cyan-400/60 shadow-[0_0_24px_rgba(34,211,238,0.15)]' : ''}`}
                  >
                    <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                      {proj.thumbnail ? (
                        <img src={proj.thumbnail} alt={proj.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <span className="w-12 h-12 rounded-full border border-white/15 bg-white/[0.04] flex items-center justify-center text-neutral-500 group-hover:text-cyan-300 group-hover:border-cyan-400/40 group-hover:scale-110 transition-all">
                          <Play className="w-5 h-5 ml-0.5" />
                        </span>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      {isActive && (
                        <span className="kf-badge-accent kf-badge !text-[9px] absolute top-2.5 left-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" /> 当前编辑中
                        </span>
                      )}
                      <span className="absolute inset-0 m-auto w-11 h-11 rounded-full kf-btn-primary !rounded-full hidden group-hover:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </span>
                    </div>
                    <div className="p-4 flex flex-col gap-2 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input type="text" value={editingName} autoFocus
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(proj.id, e as unknown as React.MouseEvent); if (e.key === 'Escape') setEditingId(null); }}
                            className="kf-input text-xs px-2.5 py-1.5 w-full" />
                          <button onClick={(e) => handleSaveRename(proj.id, e)} className="kf-icon-btn p-1.5 !text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingId(null)} className="kf-icon-btn p-1.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-[13px] text-white line-clamp-1 group-hover:text-cyan-200 transition-colors">{proj.name}</h3>
                          <button onClick={(e) => handleStartRename(proj, e)} title="重命名"
                            className="kf-icon-btn p-1 opacity-0 group-hover:opacity-100 shrink-0"><Edit2 className="w-3 h-3" /></button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(proj.lastModified)}</span>
                        <span className="text-neutral-700">·</span>
                        <span className="flex items-center gap-1 font-mono"><Layers className="w-3 h-3" />多轨</span>
                        <span className="kf-badge !text-[9px] font-mono ml-auto">{proj.resolution?.aspectRatio || '16:9'}</span>
                      </div>
                      <div className="kf-divider" />
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                          打开工程 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => duplicateProject(proj.id)} title="复制工程" className="kf-icon-btn p-1.5"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={() => {
                            const jsonStr = exportProjectJSON();
                            const blob = new Blob([jsonStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${proj.name.replace(/\s+/g, '_')}.opencut.json`; a.click();
                            URL.revokeObjectURL(url);
                          }} title="导出工程" className="kf-icon-btn p-1.5"><Download className="w-3.5 h-3.5" /></button>
                          {isDeleting ? (
                            <span className="flex items-center gap-1 kf-badge-danger kf-badge !text-[9px] !py-1">
                              确定删除？
                              <button onClick={(e) => handleDeleteConfirm(proj.id, e)} className="hover:text-white"><Check className="w-3 h-3" /></button>
                              <button onClick={() => setDeletingId(null)} className="hover:text-white"><X className="w-3 h-3" /></button>
                            </span>
                          ) : (
                            <button onClick={() => setDeletingId(proj.id)} title="删除工程" className="kf-icon-btn p-1.5 hover:!text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.section>
      </main>

      <footer className="relative z-10 mt-auto border-t border-white/[0.06] px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-neutral-600">
          <div className="flex items-center gap-2">
            <AppLogo className="w-4 h-4 opacity-50" />
            <span>Keyfrio Studio — 浏览器原生多轨视频剪辑系统</span>
          </div>
          <div className="flex items-center gap-3">
            <span>PixiJS GPU 引擎</span><span>·</span><span>OPFS 本地存储</span><span>·</span><span>Lottie 动效</span>
          </div>
        </div>
      </footer>

      <NewProjectModal isOpen={isNewModalOpen} onClose={() => setIsNewModalOpen(false)} />
    </div>
  );
};
