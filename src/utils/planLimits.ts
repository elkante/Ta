import { getPlatformSettings, DEFAULT_PLATFORM_SETTINGS } from './storage';

export type StoreTier = 'free' | 'starter' | 'basic' | 'pro' | 'business';

export interface PlanConfig {
  id: StoreTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  productLimit: number; // 4, 10, 30, 70, Infinity
  badge?: string;
  description: string;
  features: string[];
}

export const PLAN_CONFIGS: Record<StoreTier, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free Trial',
    priceMonthly: 0,
    priceYearly: 0,
    productLimit: 4,
    description: 'Test your social commerce storefront with zero cost.',
    features: [
      'Up to 4 products in catalog',
      'Up to 5 photos per product',
      'Custom storefront web link',
      'Item UID code on every product (#TA-XXX)',
      'Direct WhatsApp cart checkout',
      'Real-time stock status (in-stock / sold out)',
      'Loud order sound alert on dashboard',
      'Instant dispatch waybill generator',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Starter Plan',
    priceMonthly: 500,
    priceYearly: 6000,
    productLimit: 10,
    description: 'Essential social catalog for small WhatsApp sellers.',
    features: [
      'Up to 10 products with variants',
      'Everything in Free Trial',
      'Storefront custom banner, logo & address',
      'Customer WhatsApp inquiry click log',
      'Printable store QR code',
    ],
  },
  basic: {
    id: 'basic',
    name: 'Tá.shop Basic',
    priceMonthly: 1500,
    priceYearly: 15000,
    productLimit: 30,
    badge: 'Popular Value',
    description: 'Best value for growing merchants needing more products.',
    features: [
      'Up to 30 products',
      'Up to 5 photos per product',
      'Everything in Starter',
      'AI product descriptions (5 daily credits)',
      'WhatsApp Status Studio (marketing cards)',
      'Notes scratchpad & expense tracker',
      'Profit margin calculator',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Tá.shop Pro',
    priceMonthly: 4900,
    priceYearly: 39000,
    productLimit: 70,
    badge: 'Popular',
    description: 'For growing brands wanting high catalog volume and customer reviews.',
    features: [
      'Up to 70 products (more than 2x Basic)',
      'Verified Merchant Blue Tick badge',
      'Everything in Basic',
      'Customer review collection & ratings showcase',
      'Priority WhatsApp click tracking & analytics',
      'Multi-photo uploads & item UID search',
      'Priority order notifications',
      'Custom domain support ready',
    ],
  },
  business: {
    id: 'business',
    name: 'Business Store Bot',
    priceMonthly: 25000,
    priceYearly: 200000,
    productLimit: Infinity,
    badge: '🤖 AI WhatsApp Bot',
    description: 'Fully automated WhatsApp commerce with verified trust and unlimited products.',
    features: [
      'UNLIMITED products (the only plan with no cap)',
      'Official Golden Tick Badge (Exclusive to Business AI)',
      'Remove "Powered by Tá.shop" promotion (100% white-label)',
      'Everything in Pro included',
      '24/7 WhatsApp AI Assistant Bot (Baileys connection)',
      'Auto-replies with product photos, prices & status',
      'Automated WhatsApp receipts to customers',
      'Instant merchant order alerts on WhatsApp',
    ],
  },
};

/**
 * Returns dynamic plan configurations, reading real-time pricing from Super Admin PlatformSettings
 */
export function getActivePlanConfigs(): Record<StoreTier, PlanConfig> {
  let settings = DEFAULT_PLATFORM_SETTINGS;
  try {
    settings = getPlatformSettings();
  } catch (e) {
    // fallback
  }

  return {
    free: { ...PLAN_CONFIGS.free },
    starter: {
      ...PLAN_CONFIGS.starter,
      priceMonthly: settings?.starterPriceMonthly ?? PLAN_CONFIGS.starter.priceMonthly,
      priceYearly: settings?.starterPriceYearly ?? PLAN_CONFIGS.starter.priceYearly,
    },
    basic: {
      ...PLAN_CONFIGS.basic,
      priceMonthly: settings?.basicPriceMonthly ?? PLAN_CONFIGS.basic.priceMonthly,
      priceYearly: settings?.basicPriceYearly ?? PLAN_CONFIGS.basic.priceYearly,
    },
    pro: {
      ...PLAN_CONFIGS.pro,
      priceMonthly: settings?.proPriceMonthly ?? PLAN_CONFIGS.pro.priceMonthly,
      priceYearly: settings?.proPriceYearly ?? PLAN_CONFIGS.pro.priceYearly,
    },
    business: {
      ...PLAN_CONFIGS.business,
      priceMonthly: settings?.businessPriceMonthly ?? PLAN_CONFIGS.business.priceMonthly,
      priceYearly: settings?.businessPriceYearly ?? PLAN_CONFIGS.business.priceYearly,
    },
  };
}

/**
 * Returns the exact live price in NGN for a plan and billing cycle,
 * dynamically reflecting Super Admin price changes in Paystack and UI.
 */
export function getPlanAmount(
  plan: StoreTier | 'badge',
  cycle: 'monthly' | 'yearly' = 'monthly'
): number {
  if (plan === 'free') return 0;
  if (plan === 'badge') {
    let settings = DEFAULT_PLATFORM_SETTINGS;
    try { settings = getPlatformSettings(); } catch (e) {}
    return cycle === 'monthly'
      ? (settings?.badgePriceMonthly ?? 2000)
      : (settings?.badgePriceYearly ?? 20000);
  }

  const configs = getActivePlanConfigs();
  if (plan in configs) {
    return cycle === 'monthly' ? configs[plan].priceMonthly : configs[plan].priceYearly;
  }
  return 0;
}

/**
 * Returns the maximum number of products allowed for a given store tier.
 */
export function getProductLimitByTier(tier?: string): number {
  if (tier && tier in PLAN_CONFIGS) {
    return PLAN_CONFIGS[tier as StoreTier].productLimit;
  }
  return 4;
}

/**
 * Returns a friendly name for the plan tier.
 */
export function getPlanNameByTier(tier?: string): string {
  if (tier && tier in PLAN_CONFIGS) {
    return PLAN_CONFIGS[tier as StoreTier].name;
  }
  return 'Free Trial';
}

/**
 * Recommends the next higher plan for upgrading.
 */
export function getNextUpgradePlan(tier?: string): {
  targetPlan: 'starter' | 'basic' | 'pro' | 'business';
  name: string;
  priceMonthly: number;
  productLimit: number;
} {
  const configs = getActivePlanConfigs();
  switch (tier) {
    case 'free':
      return {
        targetPlan: 'basic',
        name: configs.basic.name,
        priceMonthly: configs.basic.priceMonthly,
        productLimit: configs.basic.productLimit,
      };
    case 'starter':
      return {
        targetPlan: 'basic',
        name: configs.basic.name,
        priceMonthly: configs.basic.priceMonthly,
        productLimit: configs.basic.productLimit,
      };
    case 'basic':
      return {
        targetPlan: 'pro',
        name: configs.pro.name,
        priceMonthly: configs.pro.priceMonthly,
        productLimit: configs.pro.productLimit,
      };
    case 'pro':
    default:
      return {
        targetPlan: 'business',
        name: configs.business.name,
        priceMonthly: configs.business.priceMonthly,
        productLimit: configs.business.productLimit,
      };
  }
}
