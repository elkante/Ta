import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  tier?: 'free' | 'starter' | 'basic' | 'pro' | 'business';
  verified?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

/**
 * VerifiedBadge
 * ─────────────────────────────────────────────────────────────────────────────
 * • Pro Tier (₦4,900/mo) or manual verification → Verified Blue Tick
 * • Business AI Tier (₦25,000/mo) → Official Golden Tick
 * • Free / Starter / Basic without verification → renders nothing
 */
export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  tier,
  verified,
  size = 'md',
  className = '',
  showLabel = false,
}) => {
  const isBusinessGold = tier === 'business';
  const isProBlue = tier === 'pro' || Boolean(verified);

  if (!isBusinessGold && !isProBlue) return null;

  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const iconSize = sizeMap[size];

  if (isBusinessGold) {
    return (
      <span
        title="Official Business AI Verified (Golden Tick)"
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
