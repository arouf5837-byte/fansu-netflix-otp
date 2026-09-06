import React, { useMemo } from 'react';

export default function AnimatedBackground() {
  // Generate stable particle positions and animation parameters
  const particles = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      size: 3 + (i % 4) * 2, // 3px to 9px
      left: `${(i * 5.8 + 4) % 96}%`,
      top: `${(i * 7.3 + 8) % 92}%`,
      duration: `${14 + (i % 6) * 3}s`, // 14s - 29s
      delay: `${-(i * 1.7)}s`,
      opacity: 0.25 + (i % 3) * 0.18,
      blur: i % 2 === 0 ? '1px' : '2px',
      color: i % 3 === 0 ? 'rgba(229, 9, 20, 0.45)' : i % 3 === 1 ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 112, 67, 0.35)',
    }));
  }, []);

  return (
    <div className="ambient-background-root" aria-hidden="true">
      {/* 1. Base Subtle Canvas Layer */}
      <div className="ambient-base-layer" />

      {/* 2. Top Focused Spotlight Cone */}
      <div className="ambient-spotlight" />

      {/* 3. Floating Aurora Mesh Orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />
      <div className="ambient-orb ambient-orb-4" />

      {/* 4. Sleek Futuristic Tech Dot Grid Matrix */}
      <div className="ambient-grid-matrix" />

      {/* 5. Floating Shimmer Light Particles */}
      <div className="ambient-particles-container">
        {particles.map((p) => (
          <span
            key={p.id}
            className="ambient-particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: p.left,
              top: p.top,
              backgroundColor: p.color,
              filter: `blur(${p.blur})`,
              opacity: p.opacity,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* 6. Soft Radial Vignette for Depth */}
      <div className="ambient-vignette" />
    </div>
  );
}
