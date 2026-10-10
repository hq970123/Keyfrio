import React, { useState } from 'react';
import {
  Undo2,
  Redo2,
  Download,
  Sparkles,
  Keyboard,
  FileJson,
  FolderOpen,
  Check,
  ChevronDown,
  RotateCcw,
  Film,
  Ratio,
  CircleDot,
  Radio,
  Database,
  Layers,
  Plus,
  HardDrive,
  AlertTriangle,
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { ASPECT_RATIOS } from '../../constants/samples';
import { AspectRatio } from '../../types/editor';
import { AppLogo } from '../common/AppLogo';
import { SequenceManagerModal } from './SequenceManagerModal';
import { StorageManagerModal } from '../Modals/StorageManagerModal';

export const Navbar: React.FC = () => {
  const {
    project,
    setProjectName,
    setAspectRatio,
    canUndo,
    canRedo,
    undo,
    redo,
    openExportModal,
    openRecordModal,
    openShortcutsModal,
    openAiCopilotDrawer,
    exportProjectJSON,
    importProjectJSON,
    loadDemoProject,
    openProjectManager,
    openLanding,
    openHome,
    createNewProject,
    dbSaveStatus,
    projectList,
    openRelinkModal,
    offlineAssetsCount,
    needsPermissionCount,
  } = useEditor();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(project.name);
  const [isAspectMenuOpen, setIsAspectMenuOpen] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isSeqModalOpen, setIsSeqModalOpen] = useState(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (tempTitle.trim()) setProjectName(tempTitle.trim());
    else setTempTitle(project.name);
  };

  const handleImportJSONClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        const text = await file.text();
        if (!importProjectJSON(text)) alert('工程文件解析失败，请检查格式');
      }
    };
    input.click();
  };

  const handleExportJSONClick = () => {
    const jsonStr = exportProjectJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}.keyfrio.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="h-[52px] kf-glass !border-x-0 !border-t-0 flex items-center justify-between px-3 text-xs select-none shrink-0 z-30">
      {/* ── left ── */}
      <div className="flex items-center gap-1.5 min-w-0">
        <button
          onClick={openLanding}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer group shrink-0"
          title="返回 Keyfrio 官网首页"
        >
          <AppLogo className="w-6 h-6 group-hover:scale-105 transition-transform" />
          <span className="text-sm font-extrabold tracking-tight text-white">
            Keyfrio <span className="kf-badge-brand kf-badge !text-[8px] ml-0.5 align-middle">PRO</span>
          </span>
        </button>

        <div className="kf-divider-v h-5 mx-1 hidden sm:block" />

        <button
          onClick={openHome}
          className="kf-btn kf-btn-subtle !text-[11px] px-2.5 py-1.5 hidden sm:inline-flex"
          title="工程项目库"
        >
          <Database className="w-3.5 h-3.5 text-cyan-300" />
          工程库
          <span className="kf-badge !text-[10px] !px-1.5 font-mono">{projectList.length}</span>
        </button>
        <button
          onClick={() => createNewProject()}
          className="kf-icon-btn p-1.5"
          title="新建空白工程"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="kf-divider-v h-5 mx-1 hidden md:block" />

        {/* project title */}
        <div className="hidden md:flex items-center gap-1 min-w-0">
          {isEditingTitle ? (
            <input
              type="text" value={tempTitle} autoFocus aria-label="工程名称"
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="kf-input text-xs px-2.5 py-1 w-44"
            />
          ) : (
            <button
              onClick={() => { setTempTitle(project.name); setIsEditingTitle(true); }}
              title="点击重命名工程"
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors max-w-[190px] cursor-pointer"
            >
              <Film className="w-3 h-3 text-neutral-500 shrink-0" />
              <span className="truncate">{project.name}</span>
            </button>
          )}
          <span
            title={dbSaveStatus === 'saved' ? '已自动保存' : dbSaveStatus === 'saving' ? '保存中…' : '保存异常'}
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              dbSaveStatus === 'saved' ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
              : dbSaveStatus === 'saving' ? 'bg-amber-400 animate-ping' : 'bg-rose-500'
            }`}
          />
          <div className="relative">
            <button
              onClick={() => setIsProjectMenuOpen((o) => !o)}
              aria-label="工程文件菜单" aria-haspopup="menu" aria-expanded={isProjectMenuOpen}
              className="kf-icon-btn p-1.5" title="工程文件导入/导出"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {isProjectMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProjectMenuOpen(false)} />
                <div className="kf-menu absolute top-full left-0 mt-1.5 w-60 z-50 text-xs">
                  <button onClick={() => { openProjectManager(); setIsProjectMenuOpen(false); }} className="kf-menu-item">
                    <Database className="w-4 h-4 text-cyan-300" /> 管理本地工程库 ({projectList.length})
                  </button>
                  <div className="kf-divider my-1" />
                  <button onClick={() => { handleExportJSONClick(); setIsProjectMenuOpen(false); }} className="kf-menu-item">
                    <FileJson className="w-4 h-4 text-sky-400" /> 导出工程文件 (.json)
                  </button>
                  <button onClick={() => { handleImportJSONClick(); setIsProjectMenuOpen(false); }} className="kf-menu-item">
                    <FolderOpen className="w-4 h-4 text-emerald-400" /> 导入工程文件 (.json)
                  </button>
                  <div className="kf-divider my-1" />
                  <button onClick={() => { loadDemoProject(); setIsProjectMenuOpen(false); }} className="kf-menu-item">
                    <RotateCcw className="w-4 h-4 text-amber-300" /> 重置为官方示例工程
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* aspect ratio */}
        <div className="relative hidden lg:block">
          <button
            onClick={() => setIsAspectMenuOpen((o) => !o)}
            className="kf-btn kf-btn-ghost !text-[11px] px-2.5 py-1.5"
          >
            <Ratio className="w-3 h-3 text-cyan-300" />
            <span className="font-bold text-cyan-300 font-mono">{project.resolution.aspectRatio}</span>
            <span className="text-[10px] text-neutral-500 font-mono">{project.resolution.width}×{project.resolution.height}</span>
            <ChevronDown className="w-3 h-3 text-neutral-500" />
          </button>
          {isAspectMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsAspectMenuOpen(false)} />
              <div className="kf-menu absolute top-full left-0 mt-1.5 w-64 z-50 text-xs">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase">画面画幅</div>
                {(Object.keys(ASPECT_RATIOS) as AspectRatio[]).map((ratio) => {
                  const item = ASPECT_RATIOS[ratio];
                  const isSelected = project.resolution.aspectRatio === ratio;
                  return (
                    <button
                      key={ratio}
                      onClick={() => { setAspectRatio(ratio); setIsAspectMenuOpen(false); }}
                      className={`kf-menu-item justify-between ${isSelected ? '!text-cyan-300 !bg-cyan-400/10' : ''}`}
                    >
                      <span>
                        <span className="block font-semibold">{item.label}</span>
                        <span className="block text-[10px] text-neutral-500 font-mono">{item.width} × {item.height}</span>
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-cyan-300" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── center ── */}
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={undo} aria-label="撤销" disabled={!canUndo} title="撤销 (Ctrl+Z)"
          className="kf-icon-btn p-2 disabled:opacity-30">
          <Undo2 className="w-4 h-4" />
        </button>
        <button onClick={redo} aria-label="重做" disabled={!canRedo} title="重做 (Ctrl+Y)"
          className="kf-icon-btn p-2 disabled:opacity-30">
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="kf-divider-v h-5 mx-1.5" />
        <button
          onClick={openAiCopilotDrawer}
          className="kf-btn kf-btn-brand !text-[11px] px-3 py-1.5 group"
          title="AI 智能剪辑助理"
        >
          <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline">AI 智能助理</span>
        </button>
        <button
          onClick={() => openRecordModal('camera')}
          className="kf-btn kf-btn-subtle !text-[11px] px-2.5 py-1.5"
          title="录制屏幕 / 摄像头 / 配音"
        >
          <Radio className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">录制</span>
        </button>
      </div>

      {/* ── right ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setIsSeqModalOpen(true)}
          className="kf-btn kf-btn-ghost !text-[11px] px-2.5 py-1.5"
          title="多序列管理器"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-300" />
          <span className="hidden md:inline">序列</span>
          <span className="kf-badge-accent kf-badge !text-[10px] !px-1.5 font-mono">{project.sequences?.length || 1}</span>
        </button>
        <button
          onClick={() => setIsStorageModalOpen(true)}
          className="kf-icon-btn p-2 hidden lg:inline-flex"
          title="OPFS 本地存储监控"
        >
          <HardDrive className="w-4 h-4 text-emerald-400" />
        </button>
        {(needsPermissionCount > 0 || offlineAssetsCount > 0) && (
          <button
            onClick={openRelinkModal}
            className="kf-btn kf-btn-danger-ghost !text-[11px] px-2.5 py-1.5 animate-pulse"
            title="重新授权或重连离线素材"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {needsPermissionCount > 0 ? `${needsPermissionCount} 需授权` : `${offlineAssetsCount} 离线`}
          </button>
        )}
        <button onClick={openShortcutsModal} aria-label="快捷键指南" title="快捷键 (?)"
          className="kf-icon-btn p-2">
          <Keyboard className="w-4 h-4" />
        </button>
        <button
          onClick={openExportModal}
          className="kf-btn kf-btn-primary !text-[11px] px-3.5 py-2 font-semibold"
          title="导出视频"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">导出视频</span>
        </button>
      </div>

      <SequenceManagerModal isOpen={isSeqModalOpen} onClose={() => setIsSeqModalOpen(false)} />
      <StorageManagerModal isOpen={isStorageModalOpen} onClose={() => setIsStorageModalOpen(false)} />
    </header>
  );
};
