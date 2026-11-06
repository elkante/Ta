import React from 'react';
import { BadgeCheck } from 'lucide-react';

import { StoreTier } from '../../types';

interface VerifiedBadgeProps {
  tier?: StoreTier;
  verified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

/**
 * VerifiedBadge
 * ─────────────────────────────────────────────────────────────────────────────
 * • Pro Tier  → Verified Blue Tick
 * • Business  → Official Gold Tick
 * • Enterprise → Super Merchant Diamond Tick (cyan/teal gradient diamond SVG)
 * • Free / Starter / Basic without verification → renders nothing
 */

/** Diamond SVG — renders as an inline SVG badge at any size */
const DiamondSVG: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Outer diamond shape */}
    <defs>
      <linearGradient id="diamondGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#a5f3fc" />
        <stop offset="40%"  stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#0891b2" />
      </linearGradient>
      <linearGradient id="diamondShine" x1="0%" y1="0%" x2="60%" y2="100%">
        <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* Main diamond body */}
    <path
      d="M12 2L4 9l8 13 8-13L12 2z"
      fill="url(#diamondGrad)"
    />
    {/* Top facet divider */}
    <path
      d="M4 9h16"
      stroke="#ffffff"
      strokeWidth="0.6"
      strokeOpacity="0.5"
    />
    {/* Left facet line */}
    <path
      d="M12 2L4 9l8 13"
      stroke="#ffffff"
      strokeWidth="0.5"
      strokeOpacity="0.3"
      fill="none"
    />
    {/* Shine overlay */}
    <path
      d="M12 2L4 9h8V2z"
      fill="url(#diamondShine)"
    />
    {/* Inner checkmark */}
    <path
      d="M9 11l2 2.5 4-3.5"
      stroke="#ffffff"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  tier,
  verified,
  size = 'md',
  className = '',
  showLabel = false,
}) => {
  const isEnterprise = tier === 'enterprise';
  const isBusinessGold = tier === 'business';
  const isProBlue = tier === 'pro' || Boolean(verified);

  if (!isEnterprise && !isBusinessGold && !isProBlue) return null;

  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSize = sizeMap[size];

  // ── Enterprise: Diamond / Super Merchant Tick ─────────────────────────────
  if (isEnterprise) {
    return (
      <span
        title="Super Merchant — Tá.shop Enterprise (Diamond)"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <DiamondSVG className={`${iconSize} drop-shadow-sm`} />
        {showLabel && (
          <span
            className="text-[10px] font-black uppercase tracking-wider px-1.5 py-px rounded-md font-sans"
            style={{
              background: 'linear-gradient(135deg,#a5f3fc,#22d3ee,#0891b2)',
              color: '#fff',
              textShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}
          >
            SUPER MERCHANT
          </span>
        )}
      </span>
    );
  }

  // ── Business AI: Gold Tick ────────────────────────────────────────────────
  if (isBusinessGold) {
    return (
      <span
        title="Official Business AI Verified (Gold Tick)"
        className={`inline-flex items-center gap-1 shrink-0 ${className}`}
      >
        <BadgeCheck
          className={`${iconSize} text-amber-500 fill-amber-100 drop-shadow-xs`}
          strokeWidth={2.5}
        />
        {showLabel && (
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md font-sans">
            GOLD
          </span>
        )}
      </span>
    );
  }

  // ── Pro / Manually Verified: Blue Tick ────────────────────────────────────
  return (
    <span
      title="Verified Merchant (Blue Tick)"
      className={`inline-flex items-center gap-1 shrink-0 ${className}`}
    >
      <BadgeCheck
        className={`${iconSize} text-blue-500 fill-blue-100`}
        strokeWidth={2.5}
      />
      {showLabel && (
        <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded-md font-sans">
          VERIFIED
        </span>
      )}
    </span>
  );
};
