import React from 'react';

const pulseKeyframes = `
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}
`;

function SkeletonBlock({ width, height, borderRadius = 8, style }: {
  width: number | string;
  height: number | string;
  borderRadius?: number | string;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{
      width,
      height,
      borderRadius,
      background: '#262640',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      ...style,
    }} />
  );
}

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#1a1a2e',
      padding: '24px 16px',
    }}>
      <style>{pulseKeyframes}</style>

      {/* Logo */}
      <img
        src="/logo.png"
        alt="moonvit"
        style={{
          width: 64, height: 64, borderRadius: '50%',
          marginBottom: 8,
          animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        }}
      />

      {/* Skeleton: calories ring */}
      <div style={{
        width: 160,
        height: 160,
        borderRadius: '50%',
        border: '10px solid #262640',
        marginTop: 32,
        marginBottom: 24,
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      }} />

      {/* Skeleton: calorie text below ring */}
      <SkeletonBlock width={120} height={16} borderRadius={8} style={{ marginBottom: 32 }} />

      {/* Skeleton: macro bars */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SkeletonBlock width={48} height={12} borderRadius={6} />
          <SkeletonBlock width="75%" height={10} borderRadius={5} style={{ animationDelay: '0.1s' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SkeletonBlock width={48} height={12} borderRadius={6} />
          <SkeletonBlock width="55%" height={10} borderRadius={5} style={{ animationDelay: '0.3s' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SkeletonBlock width={48} height={12} borderRadius={6} />
          <SkeletonBlock width="65%" height={10} borderRadius={5} style={{ animationDelay: '0.5s' }} />
        </div>
      </div>

      {/* Skeleton: vitamin chart block */}
      <SkeletonBlock
        width="100%"
        height={120}
        borderRadius={16}
        style={{ marginTop: 28, maxWidth: 340, animationDelay: '0.2s' }}
      />

      {/* Skeleton: food log entries */}
      <div style={{ width: '100%', maxWidth: 340, marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBlock width="100%" height={48} borderRadius={12} style={{ animationDelay: '0.4s' }} />
        <SkeletonBlock width="100%" height={48} borderRadius={12} style={{ animationDelay: '0.6s' }} />
      </div>
    </div>
  );
}
