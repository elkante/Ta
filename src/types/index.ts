export type CurrencyCode = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'KES' | 'GHS';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "50ml EDP", "100ml Extrait", "Size M", "128GB"
  price: number;
  originalPrice?: number;
  inStock: boolean;
  sku?: string;
}

export interface Product {
  id: string;
  uid: string; // Unique Item UID (e.g. "TA-BR540", "TA-AMK-102") for fast search
  storeId: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  images: string[];
  inStock: boolean;
  isLowStock?: boolean;
  badge?: string; // "Bestseller", "New Arrival", "Viral", "Limited"
  options?: {
    name: string; // e.g. "Size" or "Color"
    values: string[];
  }[];
  variants: ProductVariant[];
  attributes?: Record<string, string>; // e.g. "Fragrance Notes": "Amber, Oud, Vanilla"
  inquiryCount: number;
  createdAt: string;
}

export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  slug: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string; // unique, e.g. "amaka-perfumes"
  ownerEmail?: string;
  ownerPassword?: string;
  tagline: string;
  description: string;
  whatsappCountryCode: string; // "+234"
  whatsappNumber: string; // "8031234567"
  currency: CurrencyCode;
  currencySymbol: string;
  logoUrl: string;
  bannerUrl: string;
  accentColor: string; // hex
  themeStyle: 'luxury' | 'modern' | 'minimal' | 'bold';
  location: string;
  announcement?: string;
  deliveryInfo: string;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
  };
  tier: 'free' | 'pro';
  verified: boolean;
  status?: 'active' | 'suspended';
  createdAt: string;
}

export interface WhatsAppInquiryLog {
  id: string;
  storeId: string;
  productId: string;
  productUid?: string;
  productName: string;
  variantName?: string;
  price: number;
  buyerNote?: string;
  buyerLocation?: string;
  whatsappUrl: string;
  timestamp: string;
  status: 'inquired' | 'contacted' | 'completed' | 'cancelled';
}

export interface OrderItemPayload {
  productId: string;
  productUid: string;
  productName: string;
  variantName?: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

export interface StoreOrder {
  id: string; // e.g. "TA-ORD-9281"
  storeId: string;
  buyerName: string;
  buyerPhone: string;
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryAddress?: string;
  deliveryArea?: string;
  buyerNotes?: string;
  items: OrderItemPayload[];
  totalAmount: number;
  currencySymbol: string;
  whatsappUrl: string;
  status: 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface CartItem {
  id: string; // unique cart line ID
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export interface StoreReview {
  id: string;
  storeId: string;
  author: string;
  rating: number;
  comment: string;
  productName?: string;
  date: string;
}

export interface SellerSession {
  email: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  isLoggedIn: boolean;
}

export interface SuperAdminSession {
  email: string;
  isLoggedIn: boolean;
  authenticatedAt: string;
}

export interface PlatformSettings {
  platformName: string;
  supportWhatsApp: string;
  defaultCurrency: CurrencyCode;
  starterPriceMonthly: number;
  proPriceMonthly: number;
  globalAnnouncement: string;
  allowRegistrations: boolean;
  maintenanceMode: boolean;
  featuredStoreSlugs: string[];
}
