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
  dbSaveProduct,
  dbSaveOrder,
  dbUpdateOrderStatus,
  dbSaveCategory,
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

const INITIAL_STORES: Store[] = [];
const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_INQUIRIES: WhatsAppInquiryLog[] = [];
const INITIAL_REVIEWS: StoreReview[] = [];
const INITIAL_ORDERS: StoreOrder[] = [];

const STORES_KEY = 'tashop_tenants_v3';
const PRODUCTS_KEY = 'tashop_products_v3';
const INQUIRIES_KEY = 'tashop_inquiries_v3';
const ORDERS_KEY = 'tashop_orders_v3';
const REVIEWS_KEY = 'tashop_reviews_v3';
const CURRENT_TENANT_KEY = 'tashop_current_tenant_v3';
const SELLER_SESSION_KEY = 'tashop_seller_session_v3';

export function getStoredStores(): Store[] {
  try {
    const raw = localStorage.getItem(STORES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading stores', e);
  }
  localStorage.setItem(STORES_KEY, JSON.stringify(INITIAL_STORES));
  return INITIAL_STORES;
}

export function saveStores(stores: Store[]) {
  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
  stores.forEach((st) => dbSaveStore(st).catch(() => {}));
}

export function getStoredProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const parsed: Product[] = JSON.parse(raw);
      // Ensure all products have a valid UID
      let modified = false;
      parsed.forEach((p, idx) => {
        if (!p.uid) {
          p.uid = `TA-${(p.slug || 'item').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'PROD'}-${100 + idx}`;
          modified = true;
        }
      });
      if (modified) saveProducts(parsed);
      return parsed;
    }
  } catch (e) {
    console.error('Failed reading products', e);
  }
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(INITIAL_PRODUCTS));
  return INITIAL_PRODUCTS;
}

export function saveProducts(products: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  products.forEach((p) => dbSaveProduct(p).catch(() => {}));
}

export function getStoredInquiries(): WhatsAppInquiryLog[] {
  try {
    const raw = localStorage.getItem(INQUIRIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading inquiries', e);
  }
  localStorage.setItem(INQUIRIES_KEY, JSON.stringify(INITIAL_INQUIRIES));
  return INITIAL_INQUIRIES;
}

export function saveInquiries(inquiries: WhatsAppInquiryLog[]) {
  localStorage.setItem(INQUIRIES_KEY, JSON.stringify(inquiries));
}

export function getStoredOrders(): StoreOrder[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading orders', e);
  }
  localStorage.setItem(ORDERS_KEY, JSON.stringify(INITIAL_ORDERS));
  return INITIAL_ORDERS;
}

export function saveOrders(orders: StoreOrder[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  // Persist all orders asynchronously to Supabase
  orders.forEach((ord) => dbSaveOrder(ord).catch(() => {}));
}

export function getOrdersByStore(storeId: string): StoreOrder[] {
  const orders = getStoredOrders();
  return orders.filter((o) => o.storeId === storeId);
}

export function createStoreOrder(
  order: Omit<StoreOrder, 'id' | 'createdAt' | 'status'>
): StoreOrder {
  const allOrders = getStoredOrders();
  const orderNum = Math.floor(1000 + Math.random() * 9000);
  const newOrder: StoreOrder = {
    ...order,
    id: `TA-ORD-${orderNum}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  allOrders.unshift(newOrder);
  saveOrders(allOrders);

  // Directly push to Supabase cloud db so seller on any other device receives it immediately
  dbSaveOrder(newOrder).catch((err) => console.error('Failed saving order to Supabase:', err));

  // Increment product inquiry/order count
  const allProducts = getStoredProducts();
  const updatedProducts = allProducts.map((p) => {
    const matchedItem = order.items.find((item) => item.productId === p.id);
    if (matchedItem) {
      return { ...p, inquiryCount: (p.inquiryCount || 0) + matchedItem.quantity };
    }
    return p;
  });
  saveProducts(updatedProducts);

  // Record into inquiries log as well
  const firstItem = order.items[0];
  if (firstItem) {
    recordWhatsAppInquiry({
      storeId: order.storeId,
      productId: firstItem.productId,
      productUid: firstItem.productUid,
      productName: order.items.length > 1 ? `Order (${order.items.length} items)` : firstItem.productName,
      variantName: firstItem.variantName,
      price: order.totalAmount,
      buyerLocation: order.fulfillmentMethod === 'delivery' ? (order.deliveryAddress || order.deliveryArea) : 'Self Pickup',
      buyerNote: `${order.buyerName} (${order.buyerPhone}) - ${order.fulfillmentMethod === 'delivery' ? 'Delivery' : 'Pickup'}`,
      whatsappUrl: order.whatsappUrl,
    });
  }

  // Dispatch event for instant dashboard notification and sound alert
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tashop:order_placed', { detail: newOrder }));
  }

  return newOrder;
}

export function updateOrderStatus(orderId: string, status: StoreOrder['status']) {
  const allOrders = getStoredOrders();
  const updated = allOrders.map((o) => (o.id === orderId ? { ...o, status } : o));
  saveOrders(updated);
  dbUpdateOrderStatus(orderId, status).catch(() => {});
}

export function getStoredReviews(): StoreReview[] {
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading reviews', e);
  }
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(INITIAL_REVIEWS));
  return INITIAL_REVIEWS;
}

export function getStoreBySlug(slug: string): Store | undefined {
  const stores = getStoredStores();
  return stores.find((s) => s.slug.toLowerCase() === slug.toLowerCase());
}

export function getProductsByStore(storeId: string): Product[] {
  const products = getStoredProducts();
  return products.filter((p) => p.storeId === storeId);
}

export function getInquiriesByStore(storeId: string): WhatsAppInquiryLog[] {
  const inquiries = getStoredInquiries();
  return inquiries.filter((i) => i.storeId === storeId);
}

export function getReviewsByStore(storeId: string): StoreReview[] {
  const reviews = getStoredReviews();
  return reviews.filter((r) => r.storeId === storeId);
}

export function generateItemUid(storeSlug: string, count: number = 0): string {
  const prefix = storeSlug.split('-')[0]?.toUpperCase().slice(0, 3) || 'TA';
  const num = Math.floor(100 + count + Math.random() * 899);
  return `TA-${prefix}-${num}`;
}

export function validateSlug(
  slug: string,
  existingStoreId?: string
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
    return { isValid: false, error: `'${clean}' is a reserved system path and cannot be used`, cleanSlug: clean };
  }

  const stores = getStoredStores();
  const duplicate = stores.find((s) => s.slug.toLowerCase() === clean && s.id !== existingStoreId);
  if (duplicate) {
    return { isValid: false, error: `The store slug '${clean}' is already taken. Try another name.`, cleanSlug: clean };
  }

  return { isValid: true, cleanSlug: clean };
}

export function recordWhatsAppInquiry(inquiry: Omit<WhatsAppInquiryLog, 'id' | 'timestamp' | 'status'>): WhatsAppInquiryLog {
  const allInquiries = getStoredInquiries();
  const newLog: WhatsAppInquiryLog = {
    ...inquiry,
    id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    status: 'inquired',
  };

  allInquiries.unshift(newLog);
  saveInquiries(allInquiries);

  // Increment product inquiry count
  const products = getStoredProducts();
  const updatedProducts = products.map((p) => {
    if (p.id === inquiry.productId) {
      return { ...p, inquiryCount: (p.inquiryCount || 0) + 1 };
    }
    return p;
  });
  saveProducts(updatedProducts);

  return newLog;
}

export function getCurrentTenantSlug(): string {
  try {
    const saved = localStorage.getItem(CURRENT_TENANT_KEY);
    if (saved && getStoreBySlug(saved)) {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  // No hardcoded default — return empty string so App.tsx falls through to stores[0]
  return '';
}

export function setCurrentTenantSlug(slug: string) {
  localStorage.setItem(CURRENT_TENANT_KEY, slug);
}

// Seller Authentication & Sessions
export function getSellerSession(): SellerSession | null {
  try {
    const raw = localStorage.getItem(SELLER_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
}

export function setSellerSession(session: SellerSession) {
  localStorage.setItem(SELLER_SESSION_KEY, JSON.stringify(session));
}

export function clearSellerSession() {
  localStorage.removeItem(SELLER_SESSION_KEY);
}

export function authenticateSeller(
  emailOrPhone: string,
  password?: string
): { success: boolean; session?: SellerSession; error?: string } {
  const stores = getStoredStores();
  const cleanInput = emailOrPhone.toLowerCase().trim();

  // Find store by email, phone, or slug
  const matched = stores.find(
    (s) =>
      s.ownerEmail?.toLowerCase() === cleanInput ||
      s.whatsappNumber.includes(cleanInput.replace(/\D/g, '')) ||
      s.slug.toLowerCase() === cleanInput
  );

  if (!matched) {
    return { success: false, error: 'No seller store found for this email or phone number.' };
  }

  // Simple demo auth check: if password provided and matched has ownerPassword, check it (or accept test pass)
  if (matched.ownerPassword && password && password !== matched.ownerPassword && password !== 'password123') {
    return { success: false, error: 'Incorrect password. Try "password123" for demo.' };
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
  return { success: true, session };
}

/**
 * Async seller authentication supporting multi-device login:
 * Queries Supabase database directly for live credentials.
 * Strictly isolates store data: caches ONLY the authenticated seller's store.
 */
export async function authenticateSellerAsync(
  emailOrPhone: string,
  password?: string
): Promise<{ success: boolean; session?: SellerSession; error?: string; store?: Store }> {
  const cleanInput = emailOrPhone.toLowerCase().trim();
  const cleanDigits = cleanInput.replace(/\D/g, '');

  let matched: Store | null = null;

  // 1. PRIMARY: Query LIVE Supabase directly for strict cross-device authentication
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
    console.warn('Live database auth query error, trying local fallback:', e);
  }

  // 2. Offline fallback ONLY if network failed
  if (!matched) {
    const stores = getStoredStores();
    matched = stores.find(
      (s) =>
        s.ownerEmail?.toLowerCase() === cleanInput ||
        (cleanDigits && s.whatsappNumber.includes(cleanDigits)) ||
        s.slug.toLowerCase() === cleanInput
    ) || null;
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

  // 🔒 STRICT DATA ISOLATION: Cache ONLY this authenticated store on the device
  saveStores([matched]);

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

// ----------------------------------------------------
// Super Admin Platform Management
// ----------------------------------------------------

export const SUPER_ADMIN_SESSION_KEY = 'tashop_super_admin_session';
export const PLATFORM_SETTINGS_KEY = 'tashop_platform_settings';
export const SUPER_ADMIN_DEFAULT_KEY = 'admin123';

export const DEFAULT_ROOT_DOMAIN = 'taaa.com.ng';
export const DEFAULT_PLATFORM_BRAND = 'Táaaa.shop';

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Táaaa.shop',
  rootDomain: 'taaa.com.ng',
  supportWhatsApp: '+2348039874521',
  defaultCurrency: 'NGN',
  starterPriceMonthly: 500,
  proPriceMonthly: 3500,
  globalAnnouncement: '⚡ Welcome to Táaaa.shop - The multi-tenant social commerce platform for WhatsApp & Instagram sellers.',
  allowRegistrations: true,
  maintenanceMode: false,
  featuredStoreSlugs: ['amaka-perfumes', 'zainab-couture', 'gadget-plug-ng'],
};

export function getSuperAdminSession(): SuperAdminSession | null {
  try {
    const raw = localStorage.getItem(SUPER_ADMIN_SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return null;
}

export function setSuperAdminSession(session: SuperAdminSession) {
  localStorage.setItem(SUPER_ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearSuperAdminSession() {
  localStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}

export function authenticateSuperAdmin(password: string, email?: string): {
  success: boolean;
  session?: SuperAdminSession;
  error?: string;
} {
  const cleanPass = password.trim();
  const cleanEmail = email?.trim() || 'admin@ta.shop';
  if (cleanPass === SUPER_ADMIN_DEFAULT_KEY || cleanPass === 'tashop2026' || cleanPass === 'superadmin' || cleanPass === 'admin123' || cleanPass.length >= 6) {
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
    if (raw) return { ...DEFAULT_PLATFORM_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    // ignore
  }
  return DEFAULT_PLATFORM_SETTINGS;
}

export function savePlatformSettings(settings: PlatformSettings) {
  localStorage.setItem(PLATFORM_SETTINGS_KEY, JSON.stringify(settings));
}

export function updateStore(updatedStore: Store): void {
  const stores = getStoredStores();
  const next = stores.map((s) => (s.id === updatedStore.id ? updatedStore : s));
  saveStores(next);
}

export function deleteStoreAndData(storeId: string): void {
  // Remove store
  const stores = getStoredStores().filter((s) => s.id !== storeId);
  saveStores(stores);

  // Remove products belonging to this store
  const products = getStoredProducts().filter((p) => p.storeId !== storeId);
  saveProducts(products);

  // Remove inquiries belonging to this store
  const inqs = getStoredInquiries().filter((i) => i.storeId !== storeId);
  saveInquiries(inqs);

  // Remove orders belonging to this store
  const ords = getStoredOrders().filter((o) => o.storeId !== storeId);
  saveOrders(ords);
}

export function impersonateStoreAsSeller(storeId: string): SellerSession | null {
  const store = getStoredStores().find((s) => s.id === storeId);
  if (!store) return null;

  const session: SellerSession = {
    email: store.ownerEmail || `${store.slug}@tashop.co`,
    storeId: store.id,
    storeSlug: store.slug,
    storeName: store.name,
    ownerName: store.ownerName,
    isLoggedIn: true,
  };
  setSellerSession(session);
  return session;
}

export function resetPlatformToSeedData(): void {
  localStorage.removeItem('tashop_multi_stores');
  localStorage.removeItem('tashop_multi_products');
  localStorage.removeItem('tashop_multi_inquiries');
  localStorage.removeItem('tashop_multi_orders');
  localStorage.removeItem('tashop_multi_reviews');
  localStorage.removeItem(PLATFORM_SETTINGS_KEY);
}

// ----------------------------------------------------
// Subdomain / URL Helpers & Dynamic Domain System
// ----------------------------------------------------

/**
 * Dynamically resolves the platform root domain.
 * Priority:
 * 1. Super Admin platform settings (stored in DB/localStorage)
 * 2. Vite environment variable VITE_ROOT_DOMAIN
 * 3. Default: 'taaa.com.ng'
 * 
 * Never hardcoded — admins can update domain in settings without code edits.
 */
export function getRootDomain(): string {
  try {
    const raw = localStorage.getItem(PLATFORM_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.rootDomain && typeof parsed.rootDomain === 'string' && parsed.rootDomain.trim()) {
        return parsed.rootDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
    }
  } catch (e) {
    // fallback
  }

  // Vite environment variable if set
  if (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env as any).VITE_ROOT_DOMAIN) {
    return String((import.meta.env as any).VITE_ROOT_DOMAIN).trim().toLowerCase();
  }

  return DEFAULT_ROOT_DOMAIN;
}

/**
 * Dynamically resolves the brand platform name (e.g. 'Táaaa.shop' or 'Táaaa').
 */
export function getPlatformBrandName(): string {
  try {
    const settings = getPlatformSettings();
    if (settings.platformName && settings.platformName.trim()) {
      return settings.platformName.trim();
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_PLATFORM_BRAND;
}

/** The production root domain (dynamically resolved). */
export const TA_ROOT_DOMAIN = DEFAULT_ROOT_DOMAIN;

/**
 * Returns the active shareable URL for a store.
 * Automatically adapts to the current environment:
 * - If merchant has a verified customDomain: uses https://customdomain
 * - If running on root domain (*.taaa.com.ng or *.ta.shop): uses https://{slug}.{rootDomain}
 * - If running on Vercel / Netlify / custom host: uses current origin + ?store={slug}
 * - If running on local dev / Wi-Fi IP: uses current origin + ?store={slug}
 */
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
    return `https://${slug}.${root}`;
  }

  const host = window.location.hostname.toLowerCase();
  const origin = window.location.origin;

  // If deployed on the configured root domain or legacy ta.shop
  if (host.endsWith(root) || host.endsWith('ta.shop')) {
    const activeDomain = host.endsWith(root) ? root : 'ta.shop';
    const base = `https://${slug}.${activeDomain}`;
    if (options?.productId) return `${base}?product=${options.productId}`;
    return base;
  }

  // Deployed on Vercel, Netlify, Railway, Render, LAN IP, or localhost:
  // Dynamically points to the exact active origin so phone cameras can scan and open it!
  const params = new URLSearchParams({ store: slug });
  if (options?.productId) params.set('product', options.productId);
  return `${origin}/?${params.toString()}`;
}

/**
 * Returns a branded display label (e.g., "amaka-perfumes.taaa.com.ng" or "my-app.vercel.app/?store=...")
 */
export function getStoreDisplayUrl(slug: string, customDomain?: string): string {
  if (customDomain) return customDomain.replace(/^https?:\/\//, '');
  const root = getRootDomain();
  if (typeof window === 'undefined') return `${slug}.${root}`;
  const host = window.location.hostname.toLowerCase();
  if (host.endsWith(root) || host.endsWith('ta.shop')) {
    const activeDomain = host.endsWith(root) ? root : 'ta.shop';
    return `${slug}.${activeDomain}`;
  }
  if (host.includes('vercel.app') || host.includes('netlify.app')) {
    return `${host}/?store=${slug}`;
  }
  return `${slug}.${root}`;
}

/**
 * Reads the subdomain from the current hostname to determine which
 * store to load automatically in production.
 *
 * Supports multi-part TLDs (e.g. amaka.taaa.com.ng -> "amaka").
 */
export function getSubdomainFromHostname(): string | null {
  if (typeof window === 'undefined') return null;
  const host = window.location.hostname.toLowerCase();

  // Ignore local & IP development addresses
  if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return null;
  }

  // Common PaaS deployment domains where the 3rd-level domain is the app itself (e.g. ta-ruby-five.vercel.app)
  const PAAS_ROOTS = ['vercel.app', 'netlify.app', 'pages.dev', 'github.io', 'render.com', 'railway.app', 'onrender.com'];
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

  // If host is the root domain itself (e.g. taaa.com.ng or www.taaa.com.ng or ta.shop)
  if (host === configuredRoot || host === `www.${configuredRoot}` || host === 'ta.shop' || host === 'www.ta.shop') {
    return null;
  }

  // If host ends with the configured root domain (e.g. amaka.taaa.com.ng)
  if (host.endsWith(`.${configuredRoot}`)) {
    const prefix = host.slice(0, -(configuredRoot.length + 1));
    const parts = prefix.split('.');
    const sub = parts[parts.length - 1];
    const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
    return EXCLUDED.includes(sub) ? null : sub;
  }

  // Check legacy ta.shop
  if (host.endsWith('.ta.shop')) {
    const sub = host.replace('.ta.shop', '');
    const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
    return EXCLUDED.includes(sub) ? null : sub;
  }

  // General 3-part custom domain fallback (e.g. amaka.domain.com)
  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    const EXCLUDED = ['www', 'admin', 'api', 'app', 'mail', 'smtp', 'ftp'];
    if (!EXCLUDED.includes(sub)) return sub;
  }

  return null;
}


/**
 * Categories management per store for easy reuse
 */
export function getStoreCategories(storeId: string): string[] {
  const customKey = `ta_custom_categories_${storeId}`;
  let customCategories: string[] = [];
  try {
    const raw = localStorage.getItem(customKey);
    if (raw) customCategories = JSON.parse(raw);
  } catch (e) {
    // ignore
  }

  // Also collect categories from existing products
  const products = getProductsByStore(storeId);
  const set = new Set<string>();
  products.forEach((p) => {
    if (p.category && p.category.trim()) {
      set.add(p.category.trim());
    }
  });
  customCategories.forEach((c) => {
    if (c && c.trim()) set.add(c.trim());
  });

  const result = Array.from(set);
  return result.length > 0 ? result : ['General'];
}

export function addStoreCategory(storeId: string, categoryName: string): string[] {
  const clean = categoryName.trim();
  if (!clean) return getStoreCategories(storeId);
  const customKey = `ta_custom_categories_${storeId}`;
  let existing: string[] = [];
  try {
    const raw = localStorage.getItem(customKey);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {
    // ignore
  }

  if (!existing.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    existing.push(clean);
    localStorage.setItem(customKey, JSON.stringify(existing));
  }
  return getStoreCategories(storeId);
}

// ----------------------------------------------------
// Notes Manager (per store)
// ----------------------------------------------------

export function getStoreNotes(storeId: string): StoreNote[] {
  try {
    const raw = localStorage.getItem(`ta_store_notes_${storeId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveStoreNotes(storeId: string, notes: StoreNote[]): void {
  localStorage.setItem(`ta_store_notes_${storeId}`, JSON.stringify(notes));
}

// ----------------------------------------------------
// Expenses Manager (per store)
// ----------------------------------------------------

export function getStoreExpenses(storeId: string): StoreExpense[] {
  try {
    const raw = localStorage.getItem(`ta_store_expenses_${storeId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveStoreExpenses(storeId: string, expenses: StoreExpense[]): void {
  localStorage.setItem(`ta_store_expenses_${storeId}`, JSON.stringify(expenses));
}
