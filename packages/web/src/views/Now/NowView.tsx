import React, { useMemo } from "react";
import { ShortcutSection } from "../Today/components/Shortcuts/components/ShortcutSection";
import { getShortcuts } from "../Today/components/Shortcuts/data/shortcuts.data";
import { useNowShortcuts } from "./useNowShortcuts";

export const NowView = () => {
  // Initialize keyboard shortcuts
  useNowShortcuts();

  // Get shortcuts for the Now view
  const { global } = getShortcuts({ isNow: true });

  // Generate particles with random properties
  const particles = useMemo(() => {
    const particleCount = 120; // Increased from 60 to 120
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      size: Math.random() * 8 + 1, // 1-9px (increased range)
      left: Math.random() * 100, // 0-100%
      animationDelay: Math.random() * 25, // 0-25s delay (increased)
      duration: Math.random() * 15 + 10, // 10-25s duration (varied more)
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900">
      {/* Custom CSS animations */}
      <style>
        {`
          @keyframes wave1 {
            0%, 100% { 
              transform: translateX(-50%) translateY(0px) rotate(0deg);
              border-radius: 0% 0% 50% 50% / 0% 0% 100% 100%;
            }
            25% { 
              transform: translateX(-30%) translateY(-15px) rotate(0.5deg);
              border-radius: 0% 0% 60% 40% / 0% 0% 80% 100%;
            }
            50% { 
              transform: translateX(-20%) translateY(-8px) rotate(0deg);
              border-radius: 0% 0% 40% 60% / 0% 0% 100% 80%;
            }
            75% { 
              transform: translateX(-40%) translateY(-12px) rotate(-0.5deg);
              border-radius: 0% 0% 70% 30% / 0% 0% 90% 100%;
            }
          }
          
          @keyframes wave2 {
            0%, 100% { 
              transform: translateX(-50%) translateY(0px) rotate(0deg);
              border-radius: 0% 0% 60% 40% / 0% 0% 100% 100%;
            }
            33% { 
              transform: translateX(-20%) translateY(-20px) rotate(-0.8deg);
              border-radius: 0% 0% 50% 50% / 0% 0% 80% 100%;
            }
            66% { 
              transform: translateX(-40%) translateY(-5px) rotate(0.8deg);
              border-radius: 0% 0% 70% 30% / 0% 0% 90% 100%;
            }
          }
          
          @keyframes wave3 {
            0%, 100% { 
              transform: translateX(-50%) translateY(0px) rotate(0deg);
              border-radius: 0% 0% 70% 30% / 0% 0% 100% 100%;
            }
            20% { 
              transform: translateX(-10%) translateY(-25px) rotate(1.2deg);
              border-radius: 0% 0% 80% 20% / 0% 0% 70% 100%;
            }
            40% { 
              transform: translateX(-30%) translateY(-15px) rotate(-0.8deg);
              border-radius: 0% 0% 60% 40% / 0% 0% 90% 100%;
            }
            60% { 
              transform: translateX(-50%) translateY(-8px) rotate(0.5deg);
              border-radius: 0% 0% 50% 50% / 0% 0% 100% 80%;
            }
            80% { 
              transform: translateX(-70%) translateY(-20px) rotate(-1.2deg);
              border-radius: 0% 0% 90% 10% / 0% 0% 80% 100%;
            }
          }
          
          @keyframes particleFloat {
            0% { 
              transform: translateY(100vh) translateX(0px) rotate(0deg) scale(0.5);
              opacity: 0;
            }
            5% { 
              opacity: 0.3;
              transform: translateY(95vh) translateX(var(--drift, 0px)) rotate(45deg) scale(0.7);
            }
            15% { 
              opacity: 0.8;
              transform: translateY(85vh) translateX(calc(var(--drift, 0px) * 1.2)) rotate(90deg) scale(1);
            }
            85% { 
              opacity: 0.6;
              transform: translateY(15vh) translateX(calc(var(--drift, 0px) * 1.5)) rotate(315deg) scale(0.9);
            }
            100% { 
              transform: translateY(-100px) translateX(calc(var(--drift, 0px) * 2)) rotate(360deg) scale(0.3);
              opacity: 0;
            }
          }
          
          .wave-1 {
            animation: wave1 8s ease-in-out infinite;
          }
          
          .wave-2 {
            animation: wave2 12s ease-in-out infinite;
          }
          
          .wave-3 {
            animation: wave3 16s ease-in-out infinite;
          }
          
          .particle {
            animation: particleFloat var(--duration) linear infinite;
            animation-delay: var(--delay);
          }
        `}
      </style>

      {/* Ocean Wave Layers */}
      <div className="absolute inset-0 z-0">
        {/* Wave Layer 1 - Deepest */}
        <div
          className="wave-1 absolute bottom-0 left-0 h-40 w-[200%] bg-gradient-to-r from-blue-600/20 via-cyan-500/30 to-blue-800/20"
          style={{
            background:
              "linear-gradient(90deg, rgba(37, 99, 235, 0.2) 0%, rgba(6, 182, 212, 0.3) 25%, rgba(30, 64, 175, 0.2) 50%, rgba(6, 182, 212, 0.3) 75%, rgba(37, 99, 235, 0.2) 100%)",
            clipPath: "polygon(0 100%, 100% 100%, 100% 60%, 0 80%)",
          }}
        />

        {/* Wave Layer 2 - Middle */}
        <div
          className="wave-2 absolute bottom-0 left-0 h-32 w-[200%] bg-gradient-to-r from-cyan-400/25 via-blue-500/35 to-teal-600/25"
          style={{
            background:
              "linear-gradient(90deg, rgba(34, 211, 238, 0.25) 0%, rgba(59, 130, 246, 0.35) 25%, rgba(13, 148, 136, 0.25) 50%, rgba(59, 130, 246, 0.35) 75%, rgba(34, 211, 238, 0.25) 100%)",
            clipPath: "polygon(0 100%, 100% 100%, 100% 70%, 0 85%)",
          }}
        />

        {/* Wave Layer 3 - Surface */}
        <div
          className="wave-3 absolute bottom-0 left-0 h-24 w-[200%] bg-gradient-to-r from-cyan-300/30 via-blue-400/40 to-teal-500/30"
          style={{
            background:
              "linear-gradient(90deg, rgba(103, 232, 249, 0.3) 0%, rgba(96, 165, 250, 0.4) 25%, rgba(20, 184, 166, 0.3) 50%, rgba(96, 165, 250, 0.4) 75%, rgba(103, 232, 249, 0.3) 100%)",
            clipPath: "polygon(0 100%, 100% 100%, 100% 80%, 0 90%)",
          }}
        />
      </div>

      {/* Particle System */}
      <div className="absolute inset-0 z-10">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle absolute rounded-full bg-white/60"
            style={
              {
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                left: `${particle.left}%`,
                bottom: "0px",
                "--delay": `${particle.animationDelay}s`,
                "--duration": `${particle.duration}s`,
                "--drift": `${(Math.random() - 0.5) * 100}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Shortcuts Overlay */}
      <aside
        aria-label="Shortcut overlay"
        className="fixed top-24 left-3 z-30 hidden w-[240px] rounded-lg border border-white/10 bg-[#1e1e1e]/90 p-3 shadow-lg backdrop-blur-sm md:block"
      >
        <div className="mb-2 text-xs font-medium text-white">Shortcuts</div>
        <ShortcutSection title="Global" shortcuts={global} />
      </aside>

      {/* Coming Soon Text */}
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <h1 className="text-center text-7xl font-bold text-white drop-shadow-2xl">
          <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-teal-300 bg-clip-text text-transparent">
            Coming Soon
          </span>
        </h1>
      </div>
    </div>
  );
};
