import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export interface TitleCardProps {
  title: string;
  subtitle: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  [key: string]: string | number;
}

export const TitleCard: React.FC<TitleCardProps> = ({
  title,
  subtitle,
  bgColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleIn = spring({ frame, fps, config: { damping: 100, stiffness: 120, mass: 0.8 } });
  const lineWidth = interpolate(frame, [12, 32], [0, 420], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtitleOpacity = interpolate(frame, [18, 34], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const subtitleY = interpolate(frame, [18, 34], [26, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 120% at 50% 0%, ${accentColor}26 0%, ${bgColor} 55%)`,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
      }}
    >
      <div
        style={{
          color: textColor,
          fontSize: 118,
          fontWeight: 800,
          letterSpacing: 2,
          textAlign: 'center',
          padding: '0 120px',
          opacity: titleIn,
          transform: `scale(${0.86 + titleIn * 0.14}) translateY(${(1 - titleIn) * 30}px)`,
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 44,
          height: 6,
          width: lineWidth,
          borderRadius: 3,
          backgroundColor: accentColor,
        }}
      />
      <div
        style={{
          marginTop: 40,
          color: textColor,
          opacity: subtitleOpacity * 0.85,
          transform: `translateY(${subtitleY}px)`,
          fontSize: 42,
          fontWeight: 400,
          textAlign: 'center',
          padding: '0 160px',
        }}
      >
        {subtitle}
      </div>
    </AbsoluteFill>
  );
};

export interface LowerThirdProps {
  name: string;
  role: string;
  textColor: string;
  accentColor: string;
  [key: string]: string | number;
}

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  role,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const slideIn = spring({ frame, fps, config: { damping: 100, stiffness: 140, mass: 0.7 } });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 16, durationInFrames - 2],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const barScale = interpolate(slideIn, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 110,
          bottom: 120,
          display: 'flex',
          alignItems: 'stretch',
          opacity: Math.min(slideIn, fadeOut),
          transform: `translateX(${(1 - slideIn) * -60}px)`,
        }}
      >
        <div
          style={{
            width: 14,
            borderRadius: 7,
            backgroundColor: accentColor,
            transform: `scaleY(${barScale})`,
          }}
        />
        <div style={{ marginLeft: 26 }}>
          <div
            style={{
              color: textColor,
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.15,
              textShadow: '0 2px 18px rgba(0,0,0,0.45)',
            }}
          >
            {name}
          </div>
          <div
            style={{
              marginTop: 10,
              color: textColor,
              opacity: 0.85,
              fontSize: 34,
              fontWeight: 400,
              textShadow: '0 2px 14px rgba(0,0,0,0.45)',
            }}
          >
            {role}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export interface EndCardProps {
  heading: string;
  channel: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
  [key: string]: string | number;
}

export const EndCard: React.FC<EndCardProps> = ({
  heading,
  channel,
  bgColor,
  textColor,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const rise = spring({ frame, fps, config: { damping: 100, stiffness: 110, mass: 0.9 } });
  const channelOpacity = interpolate(frame, [16, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames - 1],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(110% 110% at 50% 100%, ${accentColor}22 0%, ${bgColor} 55%)`,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: "'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        opacity: fadeOut,
      }}
    >
      <div
        style={{
          color: accentColor,
          fontSize: 30,
          fontWeight: 600,
          letterSpacing: 14,
          opacity: rise,
          transform: `translateY(${(1 - rise) * 18}px)`,
        }}
      >
        THE END
      </div>
      <div
        style={{
          marginTop: 30,
          color: textColor,
          fontSize: 104,
          fontWeight: 800,
          letterSpacing: 4,
          opacity: rise,
          transform: `translateY(${(1 - rise) * 26}px)`,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          marginTop: 34,
          color: textColor,
          opacity: channelOpacity * 0.8,
          fontSize: 40,
          fontWeight: 400,
        }}
      >
        {channel}
      </div>
    </AbsoluteFill>
  );
};
