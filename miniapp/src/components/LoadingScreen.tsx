import React from 'react';

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: 16,
      background: '#06060e',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Warp rings */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 120,
          height: 120,
          border: '1px solid rgba(124, 58, 237, 0.15)',
          borderRadius: '50%',
          animation: `warp-ring ${2.5 + i * 0.4}s ease-out infinite`,
          animationDelay: `${i * 0.6}s`,
        }} />
      ))}

      {/* Ambient nebula glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #7C3AED, #60A5FA)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 32,
        fontWeight: 800,
        color: '#fff',
        position: 'relative',
        zIndex: 1,
        animation: 'warp-in 0.8s ease both',
        boxShadow: '0 0 40px rgba(124, 58, 237, 0.3)',
        fontFamily: "'Outfit', sans-serif",
      }}>
        M
      </div>

      {/* Brand */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        animation: 'fade-in-up 0.6s ease 0.3s both',
      }}>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "'Outfit', sans-serif",
          background: 'linear-gradient(135deg, #E2E8F0, #94A3B8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          NutriBot
        </div>
        <div style={{
          fontSize: 12,
          color: 'rgba(124, 58, 237, 0.6)',
          letterSpacing: 3,
          textTransform: 'uppercase',
          marginTop: 4,
          fontWeight: 500,
        }}>
          Moonvit
        </div>
      </div>

      {/* Loading dots */}
      <div className="loading-dots" style={{ position: 'relative', zIndex: 1, marginTop: 8 }}>
        <span /><span /><span />
      </div>
    </div>
  );
}
