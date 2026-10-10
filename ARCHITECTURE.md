# Keyfrio Architecture (v1 – Context mutations + Zustand mirrors)

## Why this change?

The original `EditorContext.tsx` (~115 KB) was a monolithic Context that mixed domain, playback, UI, history, assets and side-effects. Any state update re-rendered the entire tree.

## Design principles

1. **Domain-sliced Zustand stores** – fine-grained subscriptions
2. **Pure domain functions** in `src/domain/`
3. **Side-effects** in services / hooks, not stores
4. **Immer** for nested immutable updates
5. **EditorContext** is the sole state mutation owner
6. **Zustand stores** are read-only mirrors synchronized one-way through `StoreBridge`

## Store map

| Store | Responsibility |
|-------|----------------|
| `useProjectStore` | Read-only project, tracks, duration mirror |
| `usePlaybackStore` | currentTime, isPlaying, speed, loop, in/out |
| `useSelectionStore` | selectedClipIds, activeTrackId |
| `useUiStore` | view, sidebar, zoom, tools, modals |
| `useAssetsStore` | media library, project list, offline counts |

## Final architecture

- `EditorContext` is the sole state mutation owner, including project edits and its history stack.
- `StoreBridge` performs one-way synchronization from Context into domain-sliced Zustand stores.
- Zustand stores are read-only mirrors for fine-grained component subscriptions; they do not duplicate project mutation actions.
- Pure logic has one implementation: track collision handling lives in `src/utils/trackCollision.ts`.
- `projectFactory.ts` remains the shared factory for preset project construction and derived duration calculation.

## Performance tips

```ts
const tracks = useProjectStore((s) => s.tracks);
const zoom = useUiStore((s) => s.zoom);

import { useShallow } from 'zustand/react/shallow';
const { zoom, toolMode } = useUiStore(useShallow((s) => ({
  zoom: s.zoom,
  toolMode: s.toolMode,
})));
```

## File layout

```
src/
  domain/
  stores/
  components/StoreBridge.tsx
  context/EditorContext.tsx   # sole mutation owner
```

## Install after merge

```bash
bun install   # or npm install
bun run dev
```
