// Metadata for the built-in Remotion templates. This module is shared by
// the server (template list API) and the compositions (default props), and
// must stay free of React/DOM imports so the server can load it cheaply.

export interface RemotionPropField {
  key: string;
  label: string;
  type: 'text' | 'color' | 'number';
}

export interface RemotionTemplateMeta {
  id: string; // also the Remotion composition id
  name: string;
  description: string;
  /** 'mp4' renders H.264; 'webm-alpha' renders VP8 WebM with transparency for overlays */
  format: 'mp4' | 'webm-alpha';
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  fields: RemotionPropField[];
  defaultProps: Record<string, string | number>;
}

export const REMOTION_TEMPLATES: RemotionTemplateMeta[] = [
  {
    id: 'TitleCard',
    name: '开场标题卡',
    description: '全屏标题动画：主标题弹性入场、副标题上浮、装饰线展开。适合片头。',
    format: 'mp4',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 90,
    fields: [
      { key: 'title', label: '主标题', type: 'text' },
      { key: 'subtitle', label: '副标题', type: 'text' },
      { key: 'bgColor', label: '背景色', type: 'color' },
      { key: 'textColor', label: '文字色', type: 'color' },
      { key: 'accentColor', label: '强调色', type: 'color' },
    ],
    defaultProps: {
      title: '我的视频标题',
      subtitle: '副标题 · 一句话介绍这期内容',
      bgColor: '#0b0f14',
      textColor: '#f5f7fa',
      accentColor: '#22d3ee',
    },
  },
  {
    id: 'LowerThird',
    name: '人名条（透明）',
    description: '左下角姓名条：色块滑入 + 姓名/身份两行文字。透明背景 WebM，可叠在视频画面上。',
    format: 'webm-alpha',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 120,
    fields: [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'role', label: '身份/头衔', type: 'text' },
      { key: 'textColor', label: '文字色', type: 'color' },
      { key: 'accentColor', label: '色块颜色', type: 'color' },
    ],
    defaultProps: {
      name: '张小可',
      role: '本期嘉宾 · 独立开发者',
      textColor: '#ffffff',
      accentColor: '#f59e0b',
    },
  },
  {
    id: 'EndCard',
    name: '片尾结束卡',
    description: '全屏片尾：感谢语淡入、频道名上浮、末尾整体淡出。适合结尾。',
    format: 'mp4',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 90,
    fields: [
      { key: 'heading', label: '主文案', type: 'text' },
      { key: 'channel', label: '频道/署名', type: 'text' },
      { key: 'bgColor', label: '背景色', type: 'color' },
      { key: 'textColor', label: '文字色', type: 'color' },
      { key: 'accentColor', label: '强调色', type: 'color' },
    ],
    defaultProps: {
      heading: '感谢观看',
      channel: '@我的频道',
      bgColor: '#0b0f14',
      textColor: '#f5f7fa',
      accentColor: '#a78bfa',
    },
  },
];

export function getRemotionTemplate(id: string): RemotionTemplateMeta | undefined {
  return REMOTION_TEMPLATES.find((t) => t.id === id);
}
