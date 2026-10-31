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
      'Remove "Powered by Tá.shop" promotion',
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
    description: 'For established brands wanting verified trust & high catalog volume.',
    features: [
      'Up to 70 products (more than 2x Basic)',
      'Everything in Basic',
      'Verified Merchant Blue Tick (after ID check)',
      'Blue Tick badge on WhatsApp checkout receipts',
      'Customer review collection & ratings showcase',
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
    description: 'Fully automated WhatsApp commerce with unlimited products.',
    features: [
      'UNLIMITED products (the only plan with no cap)',
      'Everything in Pro included',
      '24/7 WhatsApp AI Assistant Bot (Baileys connection)',
      'Auto-replies with product photos, prices & status',
      'Automated WhatsApp receipts to customers',
      'Instant merchant order alerts on WhatsApp',
      'Verified Merchant Blue Tick included 100% FREE',
    ],
  },
};

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
  switch (tier) {
    case 'free':
      return {
        targetPlan: 'basic',
        name: PLAN_CONFIGS.basic.name,
        priceMonthly: PLAN_CONFIGS.basic.priceMonthly,
        productLimit: PLAN_CONFIGS.basic.productLimit,
      };
    case 'starter':
      return {
        targetPlan: 'basic',
        name: PLAN_CONFIGS.basic.name,
        priceMonthly: PLAN_CONFIGS.basic.priceMonthly,
        productLimit: PLAN_CONFIGS.basic.productLimit,
      };
    case 'basic':
      return {
        targetPlan: 'pro',
        name: PLAN_CONFIGS.pro.name,
        priceMonthly: PLAN_CONFIGS.pro.priceMonthly,
        productLimit: PLAN_CONFIGS.pro.productLimit,
      };
    case 'pro':
    default:
      return {
        targetPlan: 'business',
        name: PLAN_CONFIGS.business.name,
        priceMonthly: PLAN_CONFIGS.business.priceMonthly,
        productLimit: PLAN_CONFIGS.business.productLimit,
      };
  }
}
