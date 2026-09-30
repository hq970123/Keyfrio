import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { EditorProvider, useEditor } from './context/EditorContext';
import { StoreBridge } from './components/StoreBridge';

const Navbar = lazy(() => import('./components/Header/Navbar').then((module) => ({ default: module.Navbar })));
const SidebarTabs = lazy(() => import('./components/Sidebar/SidebarTabs').then((module) => ({ default: module.SidebarTabs })));
const MediaPanel = lazy(() => import('./components/Sidebar/MediaPanel').then((module) => ({ default: module.MediaPanel })));
const OpenStockPanel = lazy(() => import('./components/Sidebar/OpenStockPanel').then((module) => ({ default: module.OpenStockPanel })));
const LottiePanel = lazy(() => import('./components/Sidebar/LottiePanel').then((module) => ({ default: module.LottiePanel })));
const AudioPanel = lazy(() => import('./components/Sidebar/AudioPanel').then((module) => ({ default: module.AudioPanel })));
const TextPanel = lazy(() => import('./components/Sidebar/TextPanel').then((module) => ({ default: module.TextPanel })));
const StickersPanel = lazy(() => import('./components/Sidebar/StickersPanel').then((module) => ({ default: module.StickersPanel })));
const EffectsPanel = lazy(() => import('./components/Sidebar/EffectsPanel').then((module) => ({ default: module.EffectsPanel })));
const TransitionsPanel = lazy(() => import('./components/Sidebar/TransitionsPanel').then((module) => ({ default: module.TransitionsPanel })));
const AiPanel = lazy(() => import('./components/Sidebar/AiPanel').then((module) => ({ default: module.AiPanel })));
const PreviewPlayer = lazy(() => import('./components/Player/PreviewPlayer').then((module) => ({ default: module.PreviewPlayer })));
const InspectorPanel = lazy(() => import('./components/Inspector/InspectorPanel').then((module) => ({ default: module.InspectorPanel })));
const TimelineContainer = lazy(() => import('./components/Timeline/TimelineContainer').then((module) => ({ default: module.TimelineContainer })));
const ExportModal = lazy(() => import('./components/Modals/ExportModal').then((module) => ({ default: module.ExportModal })));
const RecordModal = lazy(() => import('./components/Modals/RecordModal').then((module) => ({ default: module.RecordModal })));
const ShortcutsModal = lazy(() => import('./components/Modals/ShortcutsModal').then((module) => ({ default: module.ShortcutsModal })));
const AiModal = lazy(() => import('./components/Modals/AiModal').then((module) => ({ default: module.AiModal })));
const ProjectManagerModal = lazy(() => import('./components/Modals/ProjectManagerModal').then((module) => ({ default: module.ProjectManagerModal })));
const MediaRelinkModal = lazy(() => import('./components/Modals/MediaRelinkModal').then((module) => ({ default: module.MediaRelinkModal })));
const MediaRelinkBanner = lazy(() => import('./components/Header/MediaRelinkBanner').then((module) => ({ default: module.MediaRelinkBanner })));
const AudioStudioModal = lazy(() => import('./components/Modals/AudioStudioModal').then((module) => ({ default: module.AudioStudioModal })));
const AiCopilotDrawer = lazy(() => import('./components/AiCopilot/AiCopilotDrawer').then((module) => ({ default: module.AiCopilotDrawer })));
const ProjectHome = lazy(() => import('./components/Home/ProjectHome').then((module) => ({ default: module.ProjectHome })));

const LoadingFallback: React.FC = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-[#0e0e10] text-sm text-[#a0a0ab]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-[#2a2a32] border-t-[#00d4c8] animate-spin" />
      <span>正在加载 Keyfrio…</span>
    </div>
  </div>
);

const CommonOverlays: React.FC = () => (
  <>
    <RecordModal />
    <ProjectManagerModal />
    <MediaRelinkModal />
    <ShortcutsModal />
    <AiCopilotDrawer />
  </>
);

const MainAppContent: React.FC = () => {
  const { currentView, activeSidebarTab } = useEditor();

  if (currentView === 'home') {
    return (
      <div className="w-full h-dvh bg-[#0b0e17] overflow-y-auto overflow-x-hidden">
        <ProjectHome />
        <CommonOverlays />
        <StoreBridge />
      </div>
    );
  }

  const renderActiveSidebar = () => {
    switch (activeSidebarTab) {
      case 'media':
        return <MediaPanel />;
      case 'openstock':
        return <OpenStockPanel />;
      case 'lottie':
        return <LottiePanel />;
      case 'audio':
        return <AudioPanel />;
      case 'text':
        return <TextPanel />;
      case 'stickers':
        return <StickersPanel />;
      case 'effects':
        return <EffectsPanel />;
      case 'transitions':
        return <TransitionsPanel />;
      case 'ai':
        return <AiPanel />;
      default:
        return <MediaPanel />;
    }
  };

  return (
    <div className="keyfrio-editor flex flex-col h-dvh w-full bg-[#0e0e10] text-[#f0f0f2] overflow-hidden font-sans select-none">
      <Navbar />
      <MediaRelinkBanner />

      {/* Main workspace – CapCut style: tight gaps, dark panels */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 gap-0 bg-[#0e0e10]">
        {/* Icon rail */}
        <SidebarTabs />

        {/* Media / tools panel */}
        <div className="kf-media-dock w-[clamp(280px,22vw,380px)] min-w-[280px] bg-[#17181e] border-r border-[#2a2c36] flex flex-col shrink-0 overflow-hidden">
          <Suspense
            fallback={
              <div className="flex flex-1 items-center justify-center text-xs text-[#6b6b78]">
                正在加载面板…
              </div>
            }
          >
            {renderActiveSidebar()}
          </Suspense>
        </div>

        {/* Preview + Inspector */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <div className="kf-player-well flex-1 min-w-0 bg-[#101115] flex flex-col p-3">
            <PreviewPlayer />
          </div>
          <div className="kf-inspector-shell w-[clamp(280px,23vw,360px)] min-w-[280px] bg-[#17181e] border-l border-[#2a2c36] flex flex-col shrink-0 overflow-hidden">
            <InspectorPanel />
          </div>
        </div>
      </div>

      {/* Timeline – full width bottom, CapCut style */}
      <TimelineContainer />

      <ExportModal />
      <AiModal />
      <AudioStudioModal />
      <CommonOverlays />
      <StoreBridge />
    </div>
  );
};


const EditorRouteBootstrap: React.FC = () => {
  const { createNewProject, loadDemoProject, openShortcutsModal } = useEditor();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo') === '1';
    const shortcuts = params.get('shortcuts') === '1';
    const templateJson = params.get('template');
    if (!demo && !shortcuts && !templateJson) return;

    const launch = async () => {
      if (demo) {
        loadDemoProject();
      } else if (templateJson) {
        try {
          const template = JSON.parse(templateJson) as {
            title?: string; desc?: string; aspect?: string; fps?: number; width?: number; height?: number;
          };
          const allowedAspects = ['16:9', '9:16', '1:1', '4:5', '21:9'];
          if (template.title && allowedAspects.includes(template.aspect || '') &&
              Number.isFinite(template.fps) && Number.isFinite(template.width) && Number.isFinite(template.height)) {
            const aspect = template.aspect as import('./types/editor').AspectRatio;
            await createNewProject(template.title, aspect, template.fps, {
              width: template.width!, height: template.height!, aspectRatio: aspect, label: template.title,
            }, template.desc);
          }
        } catch (error) {
          console.warn('Could not open the selected template:', error);
        }
      }

      window.history.replaceState({}, '', window.location.pathname);
      if (shortcuts) openShortcutsModal();
    };

    void launch();
  }, [createNewProject, loadDemoProject, openShortcutsModal]);

  return null;
};

export default function App() {
  return (
    <EditorProvider>
      <Suspense fallback={<LoadingFallback />}>
        <EditorRouteBootstrap />
        <MainAppContent />
      </Suspense>
    </EditorProvider>
  );
}
