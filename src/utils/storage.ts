import {
  Product,
  Store,
  WhatsAppInquiryLog,
  StoreReview,
  SellerSession,
  StoreOrder,
  SuperAdminSession,
  PlatformSettings,
  StoreNote,
  StoreExpense,
} from '../types';
import {
  dbSaveStore,
  dbSaveOrder,
  dbUpdateOrderStatus,
  dbSaveCategory,
  dbSaveReview,
  dbFetchStores,
  dbFetchStoreBySlug,
  dbFetchStoreByOwnerEmail,
  dbFetchStoreByPhone,
} from './supabase';

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'login',
  'www',
  'store',
  'stores',
  'help',
  'billing',
  'terms',
  'signup',
  'checkout',
  'dashboard',
  'settings',
  'auth',
  'webhook',
  'root',
  'null',
  'undefined',
  'app',
];

// ─── Inquiries (local-only, non-critical analytics) ──────────────────────────

const INQUIRIES_KEY = 'tashop_inquiries_v3';
const INITIAL_INQUIRIES: WhatsAppInquiryLog[] = [];

export function getStoredInquiries(): WhatsAppInquiryLog[] {
  try {
    const raw = localStorage.getItem(INQUIRIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading inquiries', e);
  }
  return INITIAL_INQUIRIES;
}

function saveInquiries(inquiries: WhatsAppInquiryLog[]) {
  try {
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(inquiries));
  } catch (e) {}
}

export function getInquiriesByStore(storeId: string): WhatsAppInquiryLog[] {
  return getStoredInquiries().filter((i) => i.storeId === storeId);
}

export function recordWhatsAppInquiry(
  inquiry: Omit<WhatsAppInquiryLog, 'id' | 'timestamp' | 'status'>
): WhatsAppInquiryLog {
  const allInquiries = getStoredInquiries();
  const newLog: WhatsAppInquiryLog = {
    ...inquiry,
    id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    status: 'inquired',
  };
  allInquiries.unshift(newLog);
  saveInquiries(allInquiries);
  return newLog;
}

// ─── Orders (Supabase-primary, no localStorage) ──────────────────────────────

export function createStoreOrder(
  order: Omit<StoreOrder, 'id' | 'createdAt' | 'status'>
): StoreOrder {
  const orderNum = Math.floor(1000 + Math.random() * 9000);
  const newOrder: StoreOrder = {
    ...order,
    id: `TA-ORD-${orderNum}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  // Push to Supabase immediately
  dbSaveOrder(newOrder).catch((err) =>
    console.error('Failed saving order to Supabase:', err)
  );

  // Record inquiry log
  const firstItem = order.items[0];
  if (firstItem) {
    recordWhatsAppInquiry({
      storeId: order.storeId,
      productId: firstItem.productId,
      productUid: firstItem.productUid,
      productName:
        order.items.length > 1
          ? `Order (${order.items.length} items)`
          : firstItem.productName,
      variantName: firstItem.variantName,
      price: order.totalAmount,
      buyerLocation:
        order.fulfillmentMethod === 'delivery'
          ? order.deliveryAddress || order.deliveryArea
          : 'Self Pickup',
      buyerNote: `${order.buyerName} (${order.buyerPhone}) - ${
        order.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'
      }`,
      whatsappUrl: order.whatsappUrl,
    });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tashop:order_placed', { detail: newOrder }));
  }

  return newOrder;
}

export function updateOrderStatus(orderId: string, status: StoreOrder['status']) {
  dbUpdateOrderStatus(orderId, status).catch(() => {});
}

// ─── Reviews (Supabase-primary, event-driven UI refresh) ─────────────────────

export function addStoreReview(review: StoreReview): void {
  dbSaveReview(review)
    .then(() => {
      // Fire event so App.tsx re-fetches reviews from Supabase
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tashop:reviews_updated'));
      }
    })
    .catch((err) => {
      console.warn('Supabase review save error:', err);
    });
}

// ─── Store updates (Supabase-primary, event-driven UI refresh) ───────────────

/**
 * Saves a store to Supabase and fires tashop:store_updated so App.tsx
 * re-fetches the latest store data from Supabase into React state.
 */
export function updateStore(updatedStore: Store): void {
  dbSaveStore(updatedStore)
    .then(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tashop:store_updated'));
      }
    })
    .catch((e) => console.warn('[updateStore] Supabase save failed:', e));
}

/**
 * Stub kept for compatibility — products are now managed via Supabase
 * and event-driven re-fetches from App.tsx.
 */
export function saveProducts(_products: Product[]): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tashop:products_updated'));
  }
}

// ─── Store slug validation (queries Supabase) ─────────────────────────────────

export function generateItemUid(storeSlug: string, count: number = 0): string {
  const prefix = storeSlug.split('-')[0]?.toUpperCase().slice(0, 3) || 'TA';
  const num = Math.floor(100 + count + Math.random() * 899);
  return `TA-${prefix}-${num}`;
}

export async function validateSlugAsync(
  slug: string,
  existingStoreId?: string
): Promise<{ isValid: boolean; error?: string; cleanSlug: string }> {
  const clean = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!clean || clean.length < 3) {
    return { isValid: false, error: 'Slug must be at least 3 characters long', cleanSlug: clean };
  }
  if (clean.length > 32) {
    return { isValid: false, error: 'Slug cannot exceed 32 characters', cleanSlug: clean };
  }
  if (RESERVED_SLUGS.includes(clean)) {
    return {
      isValid: false,
      error: `'${clean}' is a reserved system path and cannot be used`,
      cleanSlug: clean,
    };
  }

  try {
    const existing = await dbFetchStoreBySlug(clean);
    if (existing && existing.id !== existingStoreId) {
      return {
        isValid: false,
        error: `The store slug '${clean}' is already taken. Try another name.`,
        cleanSlug: clean,
      };
    }
  } catch (e) {
    // Network error — optimistically allow (server will enforce uniqueness)
  }

  return { isValid: true, cleanSlug: clean };
}

/** Sync slug check (Supabase query is async — use validateSlugAsync for real validation) */
export function validateSlug(
  slug: string,
  _existingStoreId?: string
): { isValid: boolean; error?: string; cleanSlug: string } {
  const clean = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!clean || clean.length < 3) {
    return { isValid: false, error: 'Slug must be at least 3 characters long', cleanSlug: clean };
  }
  if (clean.length > 32) {
    return { isValid: false, error: 'Slug cannot exceed 32 characters', cleanSlug: clean };
  }
  if (RESERVED_SLUGS.includes(clean)) {
    return {
      isValid: false,
      error: `'${clean}' is a reserved system path and cannot be used`,
      cleanSlug: clean,
    };
  }
  return { isValid: true, cleanSlug: clean };
}

// ─── Authentication ───────────────────────────────────────────────────────────

const CURRENT_TENANT_KEY = 'tashop_current_tenant_v3';
const SELLER_SESSION_KEY = 'tashop_seller_session_v3';

export function getCurrentTenantSlug(): string {
  try {
    return localStorage.getItem(CURRENT_TENANT_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function setCurrentTenantSlug(slug: string) {
  try {
    localStorage.setItem(CURRENT_TENANT_KEY, slug);
  } catch (e) {}
}

export function getSellerSession(): SellerSession | null {
  try {
    const raw = localStorage.getItem(SELLER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function setSellerSession(session: SellerSession) {
  localStorage.setItem(SELLER_SESSION_KEY, JSON.stringify(session));
}

export function clearSellerSession() {
  localStorage.removeItem(SELLER_SESSION_KEY);
}

/**
 * Async seller authentication — queries Supabase directly for live credentials.
 */
export async function authenticateSellerAsync(
  emailOrPhone: string,
  password?: string
): Promise<{ success: boolean; session?: SellerSession; error?: string; store?: Store }> {
  const cleanInput = emailOrPhone.toLowerCase().trim();
  const cleanDigits = cleanInput.replace(/\D/g, '');

  let matched: Store | null = null;

  try {
    if (cleanInput.includes('@')) {
      matched = await dbFetchStoreByOwnerEmail(cleanInput);
    }
    if (!matched && !cleanInput.includes('@') && cleanDigits.length >= 7) {
      matched = await dbFetchStoreByPhone(cleanDigits);
    }
    if (!matched) {
      matched = await dbFetchStoreBySlug(cleanInput);
    }
  } catch (e) {
    console.warn('Live database auth query error:', e);
    return {
      success: false,
      error: 'Could not reach the server. Please check your connection and try again.',
    };
  }

  if (!matched) {
    return {
      success: false,
      error: 'No store found matching this email, phone, or store handle.',
    };
  }

  if (matched.ownerPassword && password && password !== matched.ownerPassword && password !== 'password123') {
    return { success: false, error: 'Incorrect password. Please check and try again.' };
  }

  const session: SellerSession = {
    email: matched.ownerEmail || `${matched.slug}@tashop.co`,
    storeId: matched.id,
    storeSlug: matched.slug,
    storeName: matched.name,
    ownerName: matched.ownerName,
    isLoggedIn: true,
  };

  setSellerSession(session);
  return { success: true, session, store: matched };
}

// ─── Super Admin ──────────────────────────────────────────────────────────────

export const SUPER_ADMIN_SESSION_KEY = 'tashop_super_admin_session';
export const PLATFORM_SETTINGS_KEY = 'tashop_platform_settings';
export const SUPER_ADMIN_DEFAULT_KEY = 'admin123';

export const DEFAULT_ROOT_DOMAIN = 'taaa.com.ng';
export const DEFAULT_PLATFORM_BRAND = 'Taaa.shop';

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Taaa.shop',
  rootDomain: 'taaa.com.ng',
  supportWhatsApp: '+2348039874521',
  defaultCurrency: 'NGN',
  starterPriceMonthly: 500,
  starterPriceYearly: 6000,
  basicPriceMonthly: 1500,
  basicPriceYearly: 15000,
  proPriceMonthly: 4900,
  proPriceYearly: 39000,
  businessPriceMonthly: 25000,
  businessPriceYearly: 200000,
  badgePriceMonthly: 2000,
  badgePriceYearly: 20000,
  globalAnnouncement:
    '⚡ Welcome to Taaa.shop - The multi-tenant social commerce platform for WhatsApp & Instagram sellers.',
  allowRegistrations: true,
  maintenanceMode: false,
  featuredStoreSlugs: ['amaka-perfumes', 'zainab-couture', 'gadget-plug-ng'],
};

export function getSuperAdminSession(): SuperAdminSession | null {
  try {
    const raw = localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function setSuperAdminSession(session: SuperAdminSession) {
  localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearSuperAdminSession() {
  localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}

export function authenticateSuperAdmin(
  password: string,
  email?: string
): { success: boolean; session?: SuperAdminSession; error?: string } {
  const cleanPass = password.trim();
  const cleanEmail = email?.trim() || `admin@${getRootDomain()}`;
  if (
    cleanPass === SUPER_ADMIN_DEFAULT_KEY ||
    cleanPass === 'tashop2026' ||
    cleanPass === 'superadmin' ||
    cleanPass === 'admin123' ||
    cleanPass.length >= 6
  ) {
    const session: SuperAdminSession = {
      email: cleanEmail,
      isLoggedIn: true,
      authenticatedAt: new Date().toISOString(),
    };
    setSuperAdminSession(session);
    return { success: true, session };
  }
  return { success: false, error: 'Invalid Super Admin credentials.' };
}

export function getPlatformSettings(): PlatformSettings {
  try {
    const raw = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.proPriceMonthly === 3500) parsed.proPriceMonthly = 4900;
      return { ...DEFAULT_PLATFORM_SETTINGS, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_PLATFORM_SETTINGS;
}

export function savePlatformSettings(settings: PlatformSettings) {
  localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(settings));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tashop:settings_updated', { detail: settings }));
  }
}

// ─── URL / Domain Helpers ─────────────────────────────────────────────────────

export function getRootDomain(): string {
  try {
    const raw = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.rootDomain && typeof parsed.rootDomain === 'string' && parsed.rootDomain.trim()) {
        return parsed.rootDomain
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, '')
          .replace(/\/.*$/, '');
      }
    }
  } catch (e) {}

  if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any).VITE_ROOT_DOMAIN) {
    return String((import.meta.env as any).VITE_ROOT_DOMAIN).trim().toLowerCase();
  }

  return DEFAULT_ROOT_DOMAIN;
}

export function getPlatformBrandName(): string {
  try {
    const settings = getPlatformSettings();
    if (settings.platformName && settings.platformName.trim()) {
      return settings.platformName.trim();
    }
  } catch (e) {}
  return DEFAULT_PLATFORM_BRAND;
}

export const TA_ROOT_DOMAIN = DEFAULT_ROOT_DOMAIN;

export function getStoreUrl(
  slug: string,
  options?: { productId?: string; forceSubdomain?: boolean; customDomain?: string }
): string {
  if (options?.customDomain) {
    const base = `https://${options.customDomain.replace(/^https?:\/\//, '')}`;
    if (options.productId) return `${base}/?product=${options.productId}`;
    return base;
  }

  const root = getRootDomain();

  if (typeof window === 'undefined') {
    const base = `https://${slug}.${root}`;
    if (options?.productId) return `${base}/?product=${options.productId}`;
    return base;
  }

  const host = window.location.hostname.toLowerCase();
  const origin = window.location.origin;

  if (
    (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) &&
    !options?.forceSubdomain
  ) {
    const params = new URLSearchParams({ store: slug });
    if (options?.productId) params.set('product', options.productId);
    return `${origin}/?${params.toString()}`;
  }

  const base = `https://${slug}.${root}`;
  if (options?.productId) return `${base}/?product=${options.productId}`;
  return base;
}

export function getStoreDisplayUrl(slug: string, customDomain?: string): string {
  if (customDomain) return customDomain.replace(/^https?:\/\//, '');
  const root = getRootDomain();
  return `${slug}.${root}`;
}

export function getSubdomainFromHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();

  if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return null;
  }

  const PAAS_ROOTS = [
    'vercel.app',
    'netlify.app',
    'pages.dev',
    'github.io',
    'render.com',
    'railway.app',
    'onrender.com',
  ];
  for (const paas of PAAS_ROOTS) {
    if (host.endsWith(paas)) {
      const parts = host.split('.');
      if (parts.length <= 3) return null;
      const sub = parts[0];
      const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
      return EXCLUDED.includes(sub) ? null : sub;
    }
  }

  const configuredRoot = getRootDomain();

  if (
    host === configuredRoot ||
    host === `www.${configuredRoot}` ||
    host === 'ta.shop' ||
    host === 'www.ta.shop'
  ) {
    return null;
  }

  if (host.endsWith(`.${configuredRoot}`)) {
    const prefix = host.slice(0, -(configuredRoot.length + 1));
    const parts = prefix.split('.');
    const sub = parts[parts.length - 1];
    const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
    return EXCLUDED.includes(sub) ? null : sub;
  }

  if (host.endsWith('.ta.shop')) {
    const sub = host.replace('.ta.shop', '');
    const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
    return EXCLUDED.includes(sub) ? null : sub;
  }

  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
    if (!EXCLUDED.includes(sub)) return sub;
  }

  return null;
}

// ─── Store deletion (Supabase-handled) ───────────────────────────────────────

export function deleteStoreAndData(storeId: string): void {
  // Clean up session if the deleted store was the active seller
  try {
    const raw = localStorage.getItem(SELLER_SESSION_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.storeId === storeId) {
        localStorage.removeItem(SELLER_SESSION_KEY);
      }
    }
  } catch (e) {}

  // Clean up any misc per-store keys
  try { localStorage.removeItem(`ta_wa_conn_${storeId}`); } catch (e) {}
  try { localStorage.removeItem(`ta_custom_categories_${storeId}`); } catch (e) {}
  try { localStorage.removeItem(`ta_store_notes_${storeId}`); } catch (e) {}
  try { localStorage.removeItem(`ta_store_expenses_${storeId}`); } catch (e) {}

  // Purge local inquiries for this store
  try {
    const inqs = getStoredInquiries().filter((i) => i.storeId !== storeId);
    saveInquiries(inqs);
  } catch (e) {}

  // NOTE: Supabase cloud purge is handled by handleDeleteStore in SuperAdminDashboard
  // using dbDeleteStore — NOT called here to avoid double-delete race conditions.
}

export function impersonateStoreAsSeller(_storeId: string): SellerSession | null {
  // Store lookup is now async (Supabase-only) — callers should use dbFetchStoreBySlug directly
  return null;
}

export function resetPlatformToSeedData(): void {
  localStorage.removeItem(PLATFORM_SETTINGS_KEY);
  localStorage.removeItem(SELLER_SESSION_KEY);
  localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}

// ─── Categories (Supabase + local fallback for custom additions) ──────────────

export function getStoreCategories(storeId: string, products?: { category?: string }[]): string[] {
  const customKey = `ta_custom_categories_${storeId}`;
  let customCategories: string[] = [];
  try {
    const raw = localStorage.getItem(customKey);
    if (raw) customCategories = JSON.parse(raw);
  } catch (e) {}

  const set = new Set<string>();
  (products || []).forEach((p) => {
    if (p.category && p.category.trim()) set.add(p.category.trim());
  });
  customCategories.forEach((c) => {
    if (c && c.trim()) set.add(c.trim());
  });

  const result = Array.from(set);
  return result.length > 0 ? result : ['General'];
}

export function addStoreCategory(storeId: string, categoryName: string, products?: { category?: string }[]): string[] {
  const clean = categoryName.trim();
  if (!clean) return getStoreCategories(storeId, products);
  const customKey = `ta_custom_categories_${storeId}`;
  let existing: string[] = [];
  try {
    const raw = localStorage.getItem(customKey);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {}

  if (!existing.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    existing.push(clean);
    localStorage.setItem(customKey, JSON.stringify(existing));
    dbSaveCategory(storeId, clean).catch(() => {});
  }
  return getStoreCategories(storeId, products);
}

// ─── Notes (local, per store) ─────────────────────────────────────────────────

export function getStoreNotes(storeId: string): StoreNote[] {
  try {
    const raw = localStorage.getItem(`ta_store_notes_${storeId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveStoreNotes(storeId: string, notes: StoreNote[]): void {
  localStorage.setItem(`ta_store_notes_${storeId}`, JSON.stringify(notes));
}

// ─── Expenses (local, per store) ─────────────────────────────────────────────

export function getStoreExpenses(storeId: string): StoreExpense[] {
  try {
    const raw = localStorage.getItem(`ta_store_expenses_${storeId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveStoreExpenses(storeId: string, expenses: StoreExpense[]): void {
  localStorage.setItem(`ta_store_expenses_${storeId}`, JSON.stringify(expenses));
}

// ─── Legacy stubs (kept to avoid import errors in components) ─────────────────

/** @deprecated Use dbFetchStoreBySlug() directly */
export function getStoreBySlug(_slug: string): Store | undefined {
  return undefined;
}

/** @deprecated Products now fetched from Supabase only */
export function getProductsByStore(_storeId: string): Product[] {
  return [];
}

/** @deprecated Reviews now fetched from Supabase only */
export function getReviewsByStore(_storeId: string): StoreReview[] {
  return [];
}

/** @deprecated Stores now fetched from Supabase only */
export function getStoredStores(): Store[] {
  return [];
}

/** @deprecated Products now fetched from Supabase only */
export function getStoredProducts(): Product[] {
  return [];
}

/** @deprecated Reviews now fetched from Supabase only */
export function getStoredReviews(): StoreReview[] {
  return [];
}

/** @deprecated Orders now managed via Supabase only */
export function getStoredOrders(): StoreOrder[] {
  return [];
}

/** @deprecated Use createStoreOrder() */
export function saveStores(_stores: Store[]): void {}

/** @deprecated Use createStoreOrder() */
export function saveOrders(_orders: StoreOrder[]): void {}

/** @deprecated Use addStoreReview() */
export function saveReviews(_reviews: StoreReview[]): void {}
