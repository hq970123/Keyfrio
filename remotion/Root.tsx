import React from 'react';
import { Composition } from 'remotion';
import { EndCard, LowerThird, TitleCard } from './compositions';
import { REMOTION_TEMPLATES } from './templateMeta';

const byId = (id: string) => REMOTION_TEMPLATES.find((t) => t.id === id)!;

export const RemotionRoot: React.FC = () => {
  const title = byId('TitleCard');
  const lower = byId('LowerThird');
  const end = byId('EndCard');
  return (
    <>
      <Composition
        id={title.id}
        component={TitleCard}
        durationInFrames={title.durationInFrames}
        fps={title.fps}
        width={title.width}
        height={title.height}
        defaultProps={title.defaultProps}
      />
      <Composition
        id={lower.id}
        component={LowerThird}
        durationInFrames={lower.durationInFrames}
        fps={lower.fps}
        width={lower.width}
        height={lower.height}
        defaultProps={lower.defaultProps}
      />
      <Composition
        id={end.id}
        component={EndCard}
        durationInFrames={end.durationInFrames}
        fps={end.fps}
        width={end.width}
        height={end.height}
        defaultProps={end.defaultProps}
      />
    </>
  );
};
