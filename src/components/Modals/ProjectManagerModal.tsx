import React, { useState } from 'react';
import { useEditor } from '../../context/EditorContext';
import { 
  FolderGit2, 
  Plus, 
  Copy, 
  Trash2, 
  Clock, 
  Film, 
  Check, 
  X, 
  Database,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { AspectRatio } from '../../types/editor';

export const ProjectManagerModal: React.FC = () => {
  const {
    isProjectManagerOpen,
    closeProjectManager,
    project,
    projectList,
    switchProject,
    createNewProject,
    duplicateProject,
    deleteProject,
    dbSaveStatus,
  } = useEditor();

  const [newProjectName, setNewProjectName] = useState('');
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('16:9');
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isProjectManagerOpen) return null;

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    await createNewProject(newProjectName.trim(), selectedRatio);
    setNewProjectName('');
    setIsCreating(false);
  };

  return (
    <div 
      id="project-manager-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 kf-anim-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeProjectManager();
      }}
    >
      <div 
        id="project-manager-modal-container"
        className="w-full max-w-2xl bg-[var(--kf-surface-2)] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[var(--kf-surface-1)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                项目工程库 (IndexedDB 本地数据库)
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                  dbSaveStatus === 'saved' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : dbSaveStatus === 'saving'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {dbSaveStatus === 'saved' ? '● 数据已实时同步' : dbSaveStatus === 'saving' ? '● 正在保存...' : '保存异常'}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                支持永久记忆多工程剪辑序列与素材，刷新页面或重开浏览器不丢失
              </p>
            </div>
          </div>
          <button
            id="close-project-manager-btn"
            onClick={closeProjectManager}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-[var(--kf-surface-4)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* New Project Creator Card */}
          {isCreating ? (
            <div className="bg-zinc-900/90 border border-cyan-500/40 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  新建剪辑工程序列
                </h3>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  取消
                </button>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">工程名称</label>
                <input
                  id="new-project-name-input"
                  type="text"
                  placeholder="例如: 2026产品宣传片剪辑 / VLOG第4期"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                  autoFocus
                  className="w-full bg-[var(--kf-bg)] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1.5">画面比例 (Resolution)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['16:9', '9:16', '1:1', '4:5'] as AspectRatio[]).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setSelectedRatio(ratio)}
                      className={`px-3 py-2 text-xs rounded-lg border font-medium transition-all ${
                        selectedRatio === ratio
                          ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300 shadow-sm'
                          : 'bg-[var(--kf-bg)] border-white/[0.06] text-neutral-400 hover:bg-[var(--kf-surface-3)]'
                      }`}
                    >
                      {ratio} {ratio === '16:9' ? '(横屏)' : ratio === '9:16' ? '(短视频)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs text-neutral-300 hover:bg-[var(--kf-surface-4)] rounded-lg"
                >
                  取消
                </button>
                <button
                  id="confirm-create-project-btn"
                  type="button"
                  onClick={handleCreate}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  立即创建
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                已保存工程列表 ({projectList.length})
              </span>
              <button
                id="open-create-project-btn"
                onClick={() => setIsCreating(true)}
                className="px-3 py-1.5 text-xs font-medium bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                新建工程
              </button>
            </div>
          )}

          {/* Project Cards List */}
          <div className="space-y-2.5">
            {projectList.map((item) => {
              const isCurrent = item.id === project.id;
              const formattedDate = new Date(item.lastModified).toLocaleString('zh-CN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={item.id}
                  id={`project-card-${item.id}`}
                  className={`group flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm'
                      : 'bg-[var(--kf-surface-2)]/60 border-white/[0.06] hover:border-white/[0.12] hover:bg-[var(--kf-surface-3)]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${
                      isCurrent
                        ? 'bg-cyan-600/20 border-cyan-500/40 text-cyan-400'
                        : 'bg-[var(--kf-surface-4)] border-white/[0.08] text-neutral-400'
                    }`}>
                      <FolderGit2 className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-zinc-100 truncate max-w-[260px]">
                          {item.name}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                            当前载入
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-zinc-500" />
                          {item.trackCount} 轨道 · {item.clipCount} 片段
                        </span>
                        <span className="flex items-center gap-1">
                          <Film className="w-3 h-3 text-zinc-500" />
                          {item.resolution.width}x{item.resolution.height} ({item.resolution.aspectRatio})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCurrent && (
                      <button
                        id={`switch-project-${item.id}`}
                        onClick={async () => {
                          await switchProject(item.id);
                          closeProjectManager();
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium bg-[var(--kf-surface-4)] hover:bg-[var(--kf-surface-5)] text-neutral-200 rounded-lg border border-white/[0.08] transition-colors flex items-center gap-1"
                      >
                        载入工程
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      id={`duplicate-project-${item.id}`}
                      onClick={() => duplicateProject(item.id)}
                      title="复制工程副本"
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-[var(--kf-surface-4)] rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    {deletingId === item.id ? (
                      <div className="flex items-center gap-1 bg-red-950/60 border border-red-800 p-1 rounded-lg">
                        <button
                          onClick={() => {
                            deleteProject(item.id);
                            setDeletingId(null);
                          }}
                          className="px-2 py-0.5 text-[10px] bg-red-600 hover:bg-red-500 text-white rounded font-medium"
                        >
                          确认删除
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-[var(--kf-surface-4)] rounded"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        id={`delete-project-${item.id}`}
                        onClick={() => setDeletingId(item.id)}
                        title="删除工程"
                        className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/[0.06] bg-[var(--kf-surface-1)] flex items-center justify-between text-xs text-zinc-400">
          <span>存储引擎: 浏览器 IndexedDB 高性能持久化存储</span>
          <button
            id="done-project-manager-btn"
            onClick={closeProjectManager}
            className="px-4 py-1.5 bg-[var(--kf-surface-4)] hover:bg-[var(--kf-surface-5)] text-neutral-200 rounded-lg font-medium transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
