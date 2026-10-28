import { createClient } from '@supabase/supabase-js';
import {
  Product,
  Store,
  StoreCategory,
  StoreOrder,
  StoreReview,
  WhatsAppInquiryLog,
} from '../types';

export const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || 'https://hbestsjsqvfilhbeymbf.supabase.co';

export const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_Wit92S4u1YwX7SwBCbnKHQ_Gf_-dQ07';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── DB MAPPERS ─────────────────────────────────────────────────────────────

export function mapStoreFromDB(row: any): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerEmail: row.owner_email || undefined,
    ownerPassword: row.owner_password || undefined,
    tagline: row.tagline || '',
    description: row.description || '',
    whatsappCountryCode: row.whatsapp_country_code || '+234',
    whatsappNumber: row.whatsapp_number || '',
    currency: row.currency || 'NGN',
    currencySymbol: row.currency_symbol || '₦',
    logoUrl: row.logo_url || '',
    bannerUrl: row.banner_url || '',
    accentColor: row.accent_color || '#b45309',
    themeStyle: row.theme_style || 'luxury',
    location: row.location || '',
    announcement: row.announcement || undefined,
    deliveryInfo: row.delivery_info || '',
    socialLinks: row.social_links || {},
    tier: row.tier || 'free',
    verified: Boolean(row.verified),
    status: row.status || 'active',
    planExpiresAt: row.plan_expires_at || undefined,
    adminNotes: Array.isArray(row.admin_notes) ? row.admin_notes : undefined,
    aiBotConfig: row.ai_bot_config || undefined,
    openHours: row.open_hours || undefined,
    restockCountdown: row.restock_countdown || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapStoreToDB(store: Store): any {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    owner_email: store.ownerEmail,
    owner_password: store.ownerPassword,
    tagline: store.tagline,
    description: store.description,
    whatsapp_country_code: store.whatsappCountryCode,
    whatsapp_number: store.whatsappNumber,
    currency: store.currency,
    currency_symbol: store.currencySymbol,
    logo_url: store.logoUrl,
    banner_url: store.bannerUrl,
    accent_color: store.accentColor,
    theme_style: store.themeStyle,
    location: store.location,
    announcement: store.announcement,
    delivery_info: store.deliveryInfo,
    social_links: store.socialLinks,
    tier: store.tier,
    verified: store.verified,
    status: store.status || 'active',
    plan_expires_at: store.planExpiresAt,
    admin_notes: store.adminNotes || [],
    ai_bot_config: store.aiBotConfig,
    open_hours: store.openHours,
    restock_countdown: store.restockCountdown,
    created_at: store.createdAt,
  };
}

export function mapProductFromDB(row: any): Product {
  return {
    id: row.id,
    uid: row.uid || row.id.slice(-6).toUpperCase(),
    storeId: row.store_id,
    name: row.name,
    slug: row.slug || row.name.toLowerCase().replace(/\s+/g, '-'),
    description: row.description || '',
    price: Math.max(0, Number(row.price) || 0),
    originalPrice: row.original_price ? Math.max(0, Number(row.original_price)) : undefined,
    category: row.category || 'General',
    images:
      Array.isArray(row.images) && row.images.length > 0 && row.images[0]
        ? row.images
        : ['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80'],
    inStock: Boolean(row.in_stock),
    isLowStock: Boolean(row.is_low_stock),
    badge: row.badge || undefined,
    options: row.options || [],
    variants: row.variants || [],
    attributes: row.attributes || {},
    inquiryCount: row.inquiry_count || 0,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapProductToDB(product: Product): any {
  return {
    id: product.id,
    uid: product.uid,
    store_id: product.storeId,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Math.max(0, Number(product.price) || 0),
    original_price: product.originalPrice ? Math.max(0, Number(product.originalPrice)) : null,
    category: product.category || 'General',
    images:
      Array.isArray(product.images) && product.images.length > 0 && product.images[0]
        ? product.images
        : ['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80'],
    in_stock: product.inStock ?? true,
    is_low_stock: product.isLowStock,
    badge: product.badge,
    options: product.options,
    variants: product.variants,
    attributes: product.attributes,
    inquiry_count: product.inquiryCount,
    created_at: product.createdAt,
  };
}

export function mapOrderFromDB(row: any): StoreOrder {
  return {
    id: row.id,
    storeId: row.store_id,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    fulfillmentMethod: row.fulfillment_method || 'delivery',
    deliveryAddress: row.delivery_address || undefined,
    deliveryArea: row.delivery_area || undefined,
    buyerNotes: row.buyer_notes || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    totalAmount: Number(row.total_amount) || 0,
    currencySymbol: row.currency_symbol || '₦',
    whatsappUrl: row.whatsapp_url || '',
    status: row.status || 'pending',
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapOrderToDB(order: StoreOrder): any {
  return {
    id: order.id,
    store_id: order.storeId,
    buyer_name: order.buyerName,
    buyer_phone: order.buyerPhone,
    fulfillment_method: order.fulfillmentMethod,
    delivery_address: order.deliveryAddress,
    delivery_area: order.deliveryArea,
    buyer_notes: order.buyerNotes,
    items: order.items,
    total_amount: order.totalAmount,
    currency_symbol: order.currencySymbol,
    whatsapp_url: order.whatsappUrl,
    status: order.status,
    created_at: order.createdAt,
  };
}

// ─── LIVE SUPABASE API METHODS ──────────────────────────────────────────────

export async function dbFetchStores(): Promise<Store[]> {
  try {
    const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapStoreFromDB);
  } catch (e) {
    return [];
  }
}

export async function dbFetchStoreBySlug(slug: string): Promise<Store | null> {
  try {
    const { data, error } = await supabase.from('stores').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) return null;
    return mapStoreFromDB(data);
  } catch (e) {
    return null;
  }
}

export async function dbSaveStore(store: Store): Promise<boolean> {
  try {
    const payload = mapStoreToDB(store);
    const { error } = await supabase.from('stores').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function dbFetchProducts(storeId: string): Promise<Product[]> {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapProductFromDB);
  } catch (e) {
    return [];
  }
}

export async function dbSaveProduct(product: Product): Promise<boolean> {
  try {
    const payload = mapProductToDB(product);
    const { error } = await supabase.from('products').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function dbDeleteProduct(productId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function dbFetchOrders(storeId: string): Promise<StoreOrder[]> {
  try {
    const { data, error } = await supabase.from('store_orders').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapOrderFromDB);
  } catch (e) {
    return [];
  }
}

export async function dbSaveOrder(order: StoreOrder): Promise<boolean> {
  try {
    const payload = mapOrderToDB(order);
    const { error } = await supabase.from('store_orders').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}

export async function dbUpdateOrderStatus(orderId: string, status: StoreOrder['status']): Promise<boolean> {
  try {
    const { error } = await supabase.from('store_orders').update({ status }).eq('id', orderId);
    return !error;
  } catch (e) {
    return false;
  }
}

export async function dbFetchCategories(storeId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('store_categories').select('name').eq('store_id', storeId);
    if (error || !data) return [];
    return data.map((d: any) => d.name);
  } catch (e) {
    return [];
  }
}

export async function dbSaveCategory(storeId: string, name: string): Promise<boolean> {
  try {
    const id = `cat_${storeId}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const { error } = await supabase.from('store_categories').upsert({ id, store_id: storeId, name, slug }, { onConflict: 'id' });
    return !error;
  } catch (e) {
    return false;
  }
}
