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
  expiryDateTimeStr?: string;
  graceEndDateStr?: string;
  // Live Active Plan Timer fields
  isActivePaid: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  totalSecondsRemaining: number;
  formattedTimeRemaining: string;
  planSource?: 'paystack' | 'superadmin';
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
      isActivePaid: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      totalSecondsRemaining: 0,
      formattedTimeRemaining: 'No active timer (Free Plan)',
      planSource: undefined,
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
      isActivePaid: true,
      daysRemaining: 30,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      totalSecondsRemaining: 30 * 86400,
      formattedTimeRemaining: '30 days left',
      planSource: store.planActivationSource || undefined,
    };
  }

  const expiryDate = new Date(expiryTime);
  const expiryDateStr = expiryDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const expiryDateTimeStr = expiryDate.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Plan is still active (not expired yet)
  if (now <= expiryTime) {
    const msRemaining = expiryTime - now;
    const totalSecondsRemaining = Math.max(0, Math.floor(msRemaining / 1000));
    const daysRemaining = Math.floor(totalSecondsRemaining / 86400);
    const hoursRemaining = Math.floor((totalSecondsRemaining % 86400) / 3600);
    const minutesRemaining = Math.floor((totalSecondsRemaining % 3600) / 60);
    const secondsRemaining = totalSecondsRemaining % 60;

    let formattedTimeRemaining = '';
    if (daysRemaining > 1) {
      formattedTimeRemaining = `${daysRemaining} days left`;
    } else if (daysRemaining === 1) {
      formattedTimeRemaining = `1d ${hoursRemaining}h left`;
    } else if (hoursRemaining > 0) {
      formattedTimeRemaining = `${hoursRemaining}h ${minutesRemaining}m left`;
    } else {
      formattedTimeRemaining = `${minutesRemaining}m ${secondsRemaining}s left`;
    }

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
      expiryDateTimeStr,
      isActivePaid: true,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      secondsRemaining,
      totalSecondsRemaining,
      formattedTimeRemaining,
      planSource: store.planActivationSource || undefined,
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
      expiryDateTimeStr,
      graceEndDateStr,
      isActivePaid: false,
      daysRemaining: 0,
      hoursRemaining: 0,
      minutesRemaining: 0,
      secondsRemaining: 0,
      totalSecondsRemaining: 0,
      formattedTimeRemaining: `${daysRemainingInGrace}d grace period left`,
      planSource: store.planActivationSource || undefined,
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
    expiryDateTimeStr,
    graceEndDateStr,
    isActivePaid: false,
    daysRemaining: 0,
    hoursRemaining: 0,
    minutesRemaining: 0,
    secondsRemaining: 0,
    totalSecondsRemaining: 0,
    formattedTimeRemaining: 'Plan expired',
    planSource: store.planActivationSource || undefined,
  };
}
