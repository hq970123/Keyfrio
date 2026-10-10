import { useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { useProjectStore } from '../stores/projectStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useSelectionStore } from '../stores/selectionStore';
import { useUiStore } from '../stores/uiStore';
import { useAssetsStore } from '../stores/assetsStore';

/**
 * Long-term one-way bridge from EditorContext to the Zustand mirror stores.
 *
 * EditorContext is the sole owner of state mutations. This component keeps the
 * domain-sliced stores synchronized so components can use fine-grained
 * subscriptions without introducing a second mutation path.
 */
export function StoreBridge() {
  const editor = useEditor();
  // ---- Project ----
  useEffect(() => {
    useProjectStore.getState().setProject(editor.project);
  }, [editor.project]);

  // ---- Playback ----
  useEffect(() => {
    const pb = usePlaybackStore.getState();
    if (pb.currentTime !== editor.currentTime) pb.seek(editor.currentTime);
  }, [editor.currentTime]);

  useEffect(() => {
    const pb = usePlaybackStore.getState();
    if (pb.isPlaying !== editor.isPlaying) {
      editor.isPlaying ? pb.play() : pb.pause();
    }
  }, [editor.isPlaying]);

  useEffect(() => {
    usePlaybackStore.getState().setPlaybackSpeed(editor.playbackSpeed);
  }, [editor.playbackSpeed]);

  useEffect(() => {
    usePlaybackStore.getState().setLoop(editor.loop);
  }, [editor.loop]);

  useEffect(() => {
    usePlaybackStore.getState().setInPoint(editor.inPoint);
  }, [editor.inPoint]);

  useEffect(() => {
    usePlaybackStore.getState().setOutPoint(editor.outPoint);
  }, [editor.outPoint]);

  // ---- Selection ----
  useEffect(() => {
    useSelectionStore.getState().selectClips(editor.selectedClipIds);
  }, [editor.selectedClipIds]);

  useEffect(() => {
    useSelectionStore.getState().setActiveTrackId(editor.activeTrackId);
  }, [editor.activeTrackId]);

  // ---- UI ----
  useEffect(() => {
    useUiStore.getState().setCurrentView(editor.currentView);
  }, [editor.currentView]);

  useEffect(() => {
    useUiStore.getState().setActiveSidebarTab(editor.activeSidebarTab);
  }, [editor.activeSidebarTab]);

  useEffect(() => {
    useUiStore.getState().setZoom(editor.zoom);
  }, [editor.zoom]);

  useEffect(() => {
    useUiStore.getState().setSnappingEnabled(editor.snappingEnabled ?? editor.snapping);
  }, [editor.snappingEnabled, editor.snapping]);

  useEffect(() => {
    useUiStore.getState().setMagnetMode(editor.magnetMode);
  }, [editor.magnetMode]);

  useEffect(() => {
    useUiStore.getState().setToolMode(editor.toolMode);
  }, [editor.toolMode]);

  useEffect(() => {
    useUiStore.getState().setRippleMode(editor.rippleMode);
  }, [editor.rippleMode]);

  useEffect(() => {
    useUiStore.getState().setTrackHeight(editor.trackHeight);
  }, [editor.trackHeight]);

  useEffect(() => {
    useUiStore.getState().setShowGrid(editor.showGrid);
  }, [editor.showGrid]);

  useEffect(() => {
    useUiStore.getState().setShowSafeMargin(editor.showSafeMargin);
  }, [editor.showSafeMargin]);

  // Modal flags
  useEffect(() => {
    if (editor.isExportModalOpen) useUiStore.getState().openExportModal();
    else useUiStore.getState().closeExportModal();
  }, [editor.isExportModalOpen]);

  useEffect(() => {
    if (editor.isRecordModalOpen) useUiStore.getState().openRecordModal(editor.recordMode);
    else useUiStore.getState().closeRecordModal();
  }, [editor.isRecordModalOpen, editor.recordMode]);

  useEffect(() => {
    if (editor.isShortcutsModalOpen) useUiStore.getState().openShortcutsModal();
    else useUiStore.getState().closeShortcutsModal();
  }, [editor.isShortcutsModalOpen]);

  useEffect(() => {
    if (editor.isAiModalOpen) useUiStore.getState().openAiModal();
    else useUiStore.getState().closeAiModal();
  }, [editor.isAiModalOpen]);

  useEffect(() => {
    if (editor.isAiCopilotDrawerOpen) useUiStore.getState().openAiCopilotDrawer();
    else useUiStore.getState().closeAiCopilotDrawer();
  }, [editor.isAiCopilotDrawerOpen]);

  useEffect(() => {
    if (editor.isAudioStudioModalOpen) {
      useUiStore.getState().openAudioStudio(editor.audioStudioTargetClipId ?? undefined);
    } else {
      useUiStore.getState().closeAudioStudio();
    }
  }, [editor.isAudioStudioModalOpen, editor.audioStudioTargetClipId]);

  useEffect(() => {
    if (editor.isProjectManagerOpen) useUiStore.getState().openProjectManager();
    else useUiStore.getState().closeProjectManager();
  }, [editor.isProjectManagerOpen]);

  useEffect(() => {
    if (editor.isRelinkModalOpen) useUiStore.getState().openRelinkModal();
    else useUiStore.getState().closeRelinkModal();
  }, [editor.isRelinkModalOpen]);

  // ---- Assets ----
  useEffect(() => {
    useAssetsStore.getState().setUserAssets(editor.userAssets);
  }, [editor.userAssets]);

  useEffect(() => {
    useAssetsStore.getState().setProjectList(editor.projectList);
  }, [editor.projectList]);

  useEffect(() => {
    useAssetsStore.getState().setDbSaveStatus(editor.dbSaveStatus);
  }, [editor.dbSaveStatus]);

  useEffect(() => {
    useAssetsStore
      .getState()
      .setOfflineCounts(editor.offlineAssetsCount, editor.needsPermissionCount);
  }, [editor.offlineAssetsCount, editor.needsPermissionCount]);

  return null;
}
