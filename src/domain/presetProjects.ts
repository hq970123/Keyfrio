import { Project, Track, AspectRatio, Resolution } from '../types/editor';
import { createInitialProject, createClip, computeTotalDuration, uid } from './projectFactory';
import { SAMPLE_VIDEOS, SAMPLE_IMAGES, FILTER_PRESETS, TEXT_TEMPLATES, DEFAULT_AUDIO } from '../constants/samples';

const titleTemplate = (text: string, templateId = 'tpl-headline') => ({
  ...(TEXT_TEMPLATES.find((t) => t.id === templateId) ?? TEXT_TEMPLATES.find((t) => t.category === 'Title'))!.config,
  text,
});
const subtitleTemplate = (text: string) => ({
  ...TEXT_TEMPLATES.find((t) => t.category === 'Subtitle')!.config,
  text,
});
const track = (id: string, name: string, type: 'video' | 'audio', order: number): Track => ({
  id, name, type, isMuted: false, isLocked: false, isHidden: false, isSolo: false, volume: 1, order, clips: [],
});
const filter = (id: string) => FILTER_PRESETS.find((p) => p.id === id)!.filter;

export function buildDemoProject(): Project {
  const project = createInitialProject('官方示例工程 (Demo)', '16:9', 30);
  const v1 = track('track-video-1', 'V1', 'video', 0);
  let start = 0;
  for (const sample of SAMPLE_VIDEOS.slice(0, 3)) {
    const duration = Math.min(sample.duration, 10);
    v1.clips.push(createClip({ trackId: v1.id, type: 'video', name: sample.name, start, duration, originalDuration: sample.duration, sourceUrl: sample.url, thumbnailUrl: sample.thumbnail }));
    start += duration;
  }
  const v2 = track('track-video-2', 'V2', 'video', 1);
  v2.clips.push(createClip({ trackId: v2.id, type: 'text', name: '示例标题', start: 0, duration: 4, text: titleTemplate('Keyfrio 示例工程') }));
  v2.clips.push(createClip({ trackId: v2.id, type: 'text', name: '示例字幕 1', start: 4, duration: 3, text: subtitleTemplate('从灵感到成片，剪辑可以如此简单。') }));
  v2.clips.push(createClip({ trackId: v2.id, type: 'text', name: '示例字幕 2', start: 7, duration: 3, text: subtitleTemplate('欢迎使用 Keyfrio 开始你的创作。') }));
  const a1 = track('track-audio-1', 'A1', 'audio', 2);
  a1.clips.push(createClip({ trackId: a1.id, type: 'audio', name: '官方示例 BGM', start: 0, duration: 20, originalDuration: 20, sourceUrl: 'https://cdn.freesound.org/previews/567/567232_5674468-lq.mp3', audio: { ...DEFAULT_AUDIO, volume: 0.6 } }));
  project.tracks = [v1, v2, a1];
  project.duration = computeTotalDuration(project.tracks);
  return project;
}

export function buildTemplateProject(templateId: string, opts: { name: string; aspect: AspectRatio; fps: number; resolution: Resolution }): { tracks: Track[]; duration: number } {
  const base = createInitialProject(opts.name, opts.aspect, opts.fps, opts.resolution);
  const v1 = track(uid('track-video'), 'V1', 'video', 0);
  const v2 = track(uid('track-video'), 'V2', 'video', 1);
  const a1 = track(uid('track-audio'), 'A1', 'audio', 2);
  const addVideo = (sample: typeof SAMPLE_VIDEOS[number] | typeof SAMPLE_IMAGES[number], start: number, duration = Math.min(sample.duration, 8), preset = 'filter-normal') => {
    v1.clips.push(createClip({ trackId: v1.id, type: sample.type, name: sample.name, start, duration, originalDuration: sample.duration, sourceUrl: sample.url, thumbnailUrl: sample.thumbnail, filter: filter(preset) }));
  };
  const addTitle = (text: string, template = 'tpl-headline') => v2.clips.push(createClip({ trackId: v2.id, type: 'text', name: '标题', start: 0, duration: 4, text: titleTemplate(text, template) }));
  const addSubtitle = (text: string, start: number) => v2.clips.push(createClip({ trackId: v2.id, type: 'text', name: '字幕', start, duration: 3, text: subtitleTemplate(text) }));
  switch (templateId) {
    case 'travel-vlog': addVideo(SAMPLE_VIDEOS[1], 0, 8, 'filter-teal-orange'); addVideo(SAMPLE_IMAGES[0], 8, 5, 'filter-teal-orange'); addTitle('此刻，出发去远方'); addSubtitle('把沿途的风景，剪成一段故事。', 4); break;
    case 'tiktok-viral': addVideo(SAMPLE_VIDEOS[0], 0, 8, 'filter-cyberpunk'); addVideo(SAMPLE_VIDEOS[2], 8, 8, 'filter-cyberpunk'); addTitle('这一秒，爆发！', 'tpl-neon'); addSubtitle('抓住节奏，留下你的高光。', 4); break;
    case 'podcast-sub': addVideo(SAMPLE_IMAGES[1], 0, 20, 'filter-normal'); addTitle('城市里的真实对话'); addSubtitle('今天我们聊聊创作与灵感。', 4); addSubtitle('每一个故事，都值得被听见。', 7); addSubtitle('欢迎来到本期访谈。', 10); break;
    case 'epic-trailer': addVideo(SAMPLE_VIDEOS[1], 0, 8, 'filter-vintage'); addVideo(SAMPLE_VIDEOS[3], 8, 8, 'filter-teal-orange'); addTitle('命运，在此刻觉醒'); addSubtitle('一场史诗旅程，即将开始。', 4); break;
    default: addVideo(SAMPLE_VIDEOS[0], 0, 8, 'filter-normal'); addTitle('你的精彩片段'); addSubtitle('现在，开始创作吧。', 4); break;
  }
  base.tracks = [v1, v2, a1];
  return { tracks: base.tracks, duration: computeTotalDuration(base.tracks) };
}
