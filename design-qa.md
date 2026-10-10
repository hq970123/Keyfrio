# Design QA

> 历史说明：本文件最初记录的是浅色 OpenCut 风格方向，该方向已被废弃。
> 自 commit d2e01b3 起，Keyfrio 实行 Obsidian 深色设计系统，本文件于
> 2026-10-10 按现行实现重写，验收以本文与代码为准。

## 现行设计系统（Obsidian 深色）

- 主题：深色工作台，设计 tokens 定义在 `src/index.css` 的 `--kf-*` 变量中
  （surface 层级、边框、强调色 cyan/violet 语义色等），组件禁止硬编码旧色值。
- 布局：落地页（Landing）/ 工程库（ProjectHome）/ 编辑器三视图；
  编辑器为左面板 + 中央预览 + 右检查器 + 底部时间线的经典剪辑布局。
- 组件规范：面板、弹窗、时间线统一使用 `--kf-surface-*` 层级与
  `white/[0.06]` 级别边框；强调色按语义使用（主操作 cyan、AI violet、
  成功 emerald、警告 amber）。
- 动效：以 CSS transition 为主，克制使用；播放头、标尺等高频组件已 memo 化。

## Verification

- `npx tsc --noEmit` 零错误、`npm run build` 成功（合入基线要求）。
- 浏览器视觉复验受本仓库自动化环境限制，以代码与设计 tokens 对照为准。

## Follow-up

- 新增 UI 时先查 `src/index.css` 的 token 与既有组件样式，不要引入新的
  硬编码色值或第二套圆角/阴影规范。
