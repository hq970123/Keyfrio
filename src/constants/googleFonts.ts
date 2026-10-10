// Open-source fonts served by Google Fonts, offered in the text editor's
// font picker. All families below are OFL/Apache-licensed Google Fonts.
// `stack` is the value stored on a text clip (primary family + sensible
// fallbacks so mixed CJK/Latin lines still render well); `weights` are the
// weights the loader requests from the css2 API for that family.

export interface GoogleFontOption {
  family: string;
  label: string;
  group: '中文' | '英文 / 拉丁' | '等宽';
  weights: number[];
  stack: string;
}

export const GOOGLE_FONT_OPTIONS: GoogleFontOption[] = [
  // —— 中文 ——
  { family: 'Noto Sans SC', label: '思源黑体（通用）', group: '中文', weights: [400, 500, 700, 900], stack: '"Noto Sans SC", sans-serif' },
  { family: 'Noto Serif SC', label: '思源宋体（典雅）', group: '中文', weights: [600, 900], stack: '"Noto Serif SC", serif' },
  { family: 'ZCOOL QingKe HuangYou', label: '站酷黄油体（标题）', group: '中文', weights: [400], stack: '"ZCOOL QingKe HuangYou", "Noto Sans SC", sans-serif' },
  { family: 'ZCOOL KuaiLe', label: '站酷快乐体（活泼）', group: '中文', weights: [400], stack: '"ZCOOL KuaiLe", "Noto Sans SC", sans-serif' },
  { family: 'ZCOOL XiaoWei', label: '站酷小薇体（清秀）', group: '中文', weights: [400], stack: '"ZCOOL XiaoWei", "Noto Sans SC", sans-serif' },
  { family: 'Ma Shan Zheng', label: '马善政书法（毛笔）', group: '中文', weights: [400], stack: '"Ma Shan Zheng", "Noto Serif SC", serif' },
  { family: 'Long Cang', label: '龙藏体（手写）', group: '中文', weights: [400], stack: '"Long Cang", "Noto Sans SC", sans-serif' },
  { family: 'Zhi Mang Xing', label: '芷莽行书（行草）', group: '中文', weights: [400], stack: '"Zhi Mang Xing", "Noto Serif SC", serif' },
  // —— 英文 / 拉丁 ——
  { family: 'Inter', label: 'Inter（现代无衬线）', group: '英文 / 拉丁', weights: [400, 600, 700, 800], stack: '"Inter", "Noto Sans SC", sans-serif' },
  { family: 'Montserrat', label: 'Montserrat（几何标题）', group: '英文 / 拉丁', weights: [600, 700, 800], stack: '"Montserrat", "Noto Sans SC", sans-serif' },
  { family: 'Poppins', label: 'Poppins（圆润几何）', group: '英文 / 拉丁', weights: [600, 700], stack: '"Poppins", "Noto Sans SC", sans-serif' },
  { family: 'Oswald', label: 'Oswald（窄体海报）', group: '英文 / 拉丁', weights: [500, 600, 700], stack: '"Oswald", "Noto Sans SC", sans-serif' },
  { family: 'Archivo Black', label: 'Archivo Black（超粗黑）', group: '英文 / 拉丁', weights: [400], stack: '"Archivo Black", "Noto Sans SC", sans-serif' },
  { family: 'Playfair Display', label: 'Playfair Display（时尚衬线）', group: '英文 / 拉丁', weights: [700, 900], stack: '"Playfair Display", "Noto Serif SC", serif' },
  // —— 等宽 ——
  { family: 'JetBrains Mono', label: 'JetBrains Mono（代码等宽）', group: '等宽', weights: [500, 700], stack: '"JetBrains Mono", monospace' },
];

export const GOOGLE_FONT_GROUPS: Array<GoogleFontOption['group']> = [
  '中文',
  '英文 / 拉丁',
  '等宽',
];

/** Legacy system-font presets kept so existing projects stay selectable. */
export const SYSTEM_FONT_PRESETS = [
  { label: '系统黑体 (System Sans)', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: '经典衬线 (Serif)', value: 'Georgia, "Times New Roman", serif' },
  { label: '现代等宽 (Monospace)', value: '"Courier New", Consolas, monospace' },
  { label: '厚重海报 (Impact)', value: 'Impact, "Arial Black", sans-serif' },
  { label: '优美楷体 (Cursive/Calligraphy)', value: '"Comic Sans MS", "Brush Script MT", cursive' },
];

export function findGoogleFont(family: string): GoogleFontOption | undefined {
  return GOOGLE_FONT_OPTIONS.find((f) => f.family === family);
}

/** First family name of a font stack, unquoted ('"Noto Sans SC", sans' → 'Noto Sans SC'). */
export function parsePrimaryFamily(fontFamilyValue: string): string {
  const first = (fontFamilyValue || '').split(',')[0]?.trim() ?? '';
  return first.replace(/^["']+|["']+$/g, '');
}
