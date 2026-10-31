import { Store } from '../types';
import { getProductLimitByTier } from './planLimits';

export const GRACE_PERIOD_DAYS = 5;

export interface StorePlanStatus {
  tier: 'free' | 'starter' | 'basic' | 'pro' | 'business';
  /** The tier currently in effect. Reverts to 'free' once 5-day grace period ends. */
  effectiveTier: 'free' | 'starter' | 'basic' | 'pro' | 'business';
  isExpired: boolean;
  isGracePeriod: boolean;
  daysRemainingInGrace: number;
  daysSinceExpiry: number;
  hasExpiredPastGrace: boolean;
  maxVisibleProducts: number;
  expiryDateStr?: string;
  graceEndDateStr?: string;
}

/**
 * Calculates a store's subscription status, handling the 5-day post-expiry grace period.
 * ─────────────────────────────────────────────────────────────────────────────
 * • Free Plan: never expires, max 4 products visible.
 * • Active Paid Plan: all features & products live.
 * • Expired (< 5 days): in GRACE period. All products stay active, banner warns seller to renew.
 * • Expired (> 5 days): grace period has ended. Automatically paused to Free plan.
 *   Only the first 4 products remain visible to customers. The rest are NOT deleted,
 *   just hidden from buyers until the seller renews.
 */
export function getStorePlanStatus(store: Partial<Store>): StorePlanStatus {
  const currentTier = store.tier || 'free';

  // Free tier has no expiry date and is capped to 4 products
  if (currentTier === 'free' || !store.planExpiresAt) {
    return {
      tier: currentTier,
      effectiveTier: 'free',
      isExpired: false,
      isGracePeriod: false,
      daysRemainingInGrace: 0,
      daysSinceExpiry: 0,
      hasExpiredPastGrace: false,
      maxVisibleProducts: 4,
    };
  }

  const now = Date.now();
  const expiryTime = new Date(store.planExpiresAt).getTime();

  // If expiry date is invalid, treat as active
  if (isNaN(expiryTime)) {
    return {
      tier: currentTier,
      effectiveTier: currentTier,
      isExpired: false,
      isGracePeriod: false,
      daysRemainingInGrace: 0,
      daysSinceExpiry: 0,
      hasExpiredPastGrace: false,
      maxVisibleProducts: getProductLimitByTier(currentTier),
    };
  }

  const expiryDate = new Date(expiryTime);
  const expiryDateStr = expiryDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Plan is still active (not expired yet)
  if (now <= expiryTime) {
    return {
      tier: currentTier,
      effectiveTier: currentTier,
      isExpired: false,
      isGracePeriod: false,
      daysRemainingInGrace: 0,
      daysSinceExpiry: 0,
      hasExpiredPastGrace: false,
      maxVisibleProducts: getProductLimitByTier(currentTier),
      expiryDateStr,
    };
  }

  // Plan has passed its expiry date
  const msSinceExpiry = now - expiryTime;
  const daysSinceExpiry = Math.floor(msSinceExpiry / (1000 * 60 * 60 * 24));
  const gracePeriodMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const graceEndTime = expiryTime + gracePeriodMs;
  const graceEndDate = new Date(graceEndTime);
  const graceEndDateStr = graceEndDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // WITHIN 5-DAY GRACE PERIOD!
  if (now <= graceEndTime) {
    const msRemaining = graceEndTime - now;
    const daysRemainingInGrace = Math.max(1, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

    return {
      tier: currentTier,
      effectiveTier: currentTier, // Still enjoys their perks during the 5-day grace!
      isExpired: true,
      isGracePeriod: true,
      daysRemainingInGrace,
      daysSinceExpiry,
      hasExpiredPastGrace: false,
      maxVisibleProducts: getProductLimitByTier(currentTier),
      expiryDateStr,
      graceEndDateStr,
    };
  }

  // EXPIRED PAST 5-DAY GRACE PERIOD!
  // Revert to free plan: ONLY 4 products visible to customers.
  return {
    tier: currentTier,
    effectiveTier: 'free',
    isExpired: true,
    isGracePeriod: false,
    daysRemainingInGrace: 0,
    daysSinceExpiry,
    hasExpiredPastGrace: true,
    maxVisibleProducts: 4,
    expiryDateStr,
    graceEndDateStr,
  };
}
