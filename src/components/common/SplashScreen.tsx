import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish?: () => void;
  minDuration?: number; // ms to display
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 1400,
}) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isMounted, setIsMounted] = useState(true);

  useEffect(() => {
    // Start fadeout after minDuration
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // Remove from DOM after fade-out transition
      const removeTimer = setTimeout(() => {
        setIsMounted(false);
        onFinish?.();
      }, 450);
      return () => clearTimeout(removeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onFinish]);

  if (!isMounted) return null;

  return (
    <div
      onClick={() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsMounted(false);
          onFinish?.();
        }, 300);
      }}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 text-white select-none transition-opacity duration-500 cursor-pointer ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-label="Tá.shop Splash Screen"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-indigo-500/10 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Animated Cart with "Tá" Branding */}
        <div className="relative flex items-center justify-center animate-bounce duration-1000">
          <svg
            className="w-28 h-28 sm:w-32 sm:h-32 drop-shadow-[0_10px_25px_rgba(245,158,11,0.25)]"
            viewBox="0 0 160 160"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft Ambient Cart Glow */}
            <circle cx="80" cy="80" r="70" fill="url(#cartGlow)" opacity="0.3" />

            {/* Cart Handle & Frame */}
            <path
              d="M22 36H38L52 98C53.2 103.5 58 107.5 63.6 107.5H124C129.5 107.5 134.2 103.6 135.5 98.2L146 54C147 49.8 143.8 46 139.5 46H42"
              stroke="#cbd5e1"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Cart Basket Body Solid/Gradient Plate */}
            <path
              d="M45 52H137L128 94C127.2 97.5 124 100 120.4 100H58C54.4 100 51.3 97.4 50.5 93.9L45 52Z"
              fill="url(#basketGrad)"
              stroke="#f59e0b"
              strokeWidth="2.5"
            />

            {/* Grid Pattern inside cart plate for shopping cart basket mesh effect */}
            <line x1="68" y1="54" x2="65" y2="98" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="90" y1="54" x2="89" y2="98" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="112" y1="54" x2="113" y2="98" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.4" />
            <line x1="47" y1="74" x2="133" y2="74" stroke="#475569" strokeWidth="1.5" strokeOpacity="0.4" />

            {/* "Tá" Badge / Monogram on the Cart Basket */}
            <g transform="translate(62, 57)">
              {/* Badge backdrop */}
              <rect
                x="0"
                y="0"
                width="48"
                height="32"
                rx="10"
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1.5"
                filter="url(#badgeShadow)"
              />
              {/* "Tá" Text */}
              <text
                x="24"
                y="22"
                textAnchor="middle"
                fill="#ffffff"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontSize="20"
                fontWeight="900"
                letterSpacing="-0.5px"
              >
                T<tspan fill="#f59e0b">á</tspan>
              </text>
            </g>

            {/* Cart Wheels with Gold Hubcaps */}
            <g>
              {/* Left Wheel */}
              <circle cx="64" cy="126" r="11" fill="#0f172a" stroke="#cbd5e1" strokeWidth="3" />
              <circle cx="64" cy="126" r="4.5" fill="#f59e0b" />
              {/* Right Wheel */}
              <circle cx="120" cy="126" r="11" fill="#0f172a" stroke="#cbd5e1" strokeWidth="3" />
              <circle cx="120" cy="126" r="4.5" fill="#f59e0b" />
            </g>

            {/* Speed & Sparkle Accents */}
            <circle cx="140" cy="32" r="2.5" fill="#f59e0b" className="animate-ping" />
            <path
              d="M136 28L139 20L142 28L150 31L142 34L139 42L136 34L128 31L136 28Z"
              fill="#fbbf24"
              opacity="0.9"
            />

            <defs>
              <radialGradient id="cartGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="basketGrad" x1="45" y1="52" x2="137" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <filter id="badgeShadow" x="-4" y="-2" width="56" height="40" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.5" />
              </filter>
            </defs>
          </svg>
        </div>

        {/* Brand Name & Meaning */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              T<span className="text-amber-400">á</span>
            </h1>
            <span className="text-3xl sm:text-4xl font-extrabold text-amber-500">.shop</span>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-wide">
            Social WhatsApp Commerce • Instant Catalog & Orders
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-36 h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full animate-pulse w-full" />
        </div>
      </div>

      <div className="absolute bottom-6 text-[11px] text-slate-500 font-mono">
        tap anywhere to open
      </div>
    </div>
  );
};
