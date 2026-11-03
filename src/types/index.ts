export type CurrencyCode = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'KES' | 'GHS';

export interface ProductVariant {
  id: string;
  name: string; // e.g. "50ml EDP", "100ml Extrait", "Size M", "128GB"
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stockCount?: number;
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
  videoUrl?: string; // Optional product video link (YouTube, TikTok, Vimeo, Cloudinary, or direct MP4)
  inStock: boolean;
  stockCount?: number; // Actual available quantity (e.g. 15)
  lowStockThreshold?: number; // Quantity at which "Only X left!" triggers (default: 3)
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
  approvalStatus?: 'pending' | 'approved' | 'rejected'; // Super admin approval gate
  approvalRejectionReason?: string;
}

export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  slug: string;
}

export interface StoreIdVerification {
  idType: 'cac' | 'business_reg' | 'nin' | 'drivers_license' | 'passport' | 'voters_card' | 'national_id';
  idNumber?: string;
  cacNumber?: string;
  businessRegistrationName?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  certificateUrl?: string;
  status: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface StoreCoupon {
  id: string;
  storeId: string;
  code: string; // uppercase, e.g. "LAUNCH10", "WELCOME20"
  discountType: 'percent' | 'fixed'; // percent off vs amount off
  discountValue: number; // e.g. 10 (%) or 2000 (₦)
  usageLimit?: number | null; // e.g. 50 or null for unlimited
  usageCount: number; // how many times used
  minOrderAmount?: number | null; // min order requirement
  expiryDate?: string | null; // YYYY-MM-DD
  isActive: boolean;
  createdAt: string;
}

export type StoreThemeId =
  | 'mercato'
  | 'margaux'
  | 'cobalt'
  | 'arena'
  | 'colette'
  | 'galactic'
  | 'maison'
  | 'aurum'
  | 'default';

export interface StorefrontCustomization {
  isPublished?: boolean;
  themeId?: StoreThemeId;
  fontFamily?: 'sans' | 'serif' | 'playfair' | 'grotesk';
  // Hero customizations
  heroHeadline?: string;
  heroSubtitle?: string;
  heroCtaText?: string;
  heroBgColor?: string; // custom hex color e.g. '#a84a32' for warm terracotta
  heroLayout?: 'editorial' | 'banner' | 'split' | 'classic';
  // About Us section
  aboutTitle?: string;
  aboutStory?: string;
  aboutTagline?: string;
  aboutImageUrl?: string;
  // Trust Badges row
  showTrustBadges?: boolean;
  trustBadge1Title?: string;
  trustBadge1Subtitle?: string;
  trustBadge2Title?: string;
  trustBadge2Subtitle?: string;
  trustBadge3Title?: string;
  trustBadge3Subtitle?: string;
  trustBadge4Title?: string;
  trustBadge4Subtitle?: string;
  // Promotional Highlight banner
  promoBannerEnabled?: boolean;
  promoBannerText?: string;
  promoBannerCta?: string;
  // Navigation tabs
  showNavLinks?: boolean;
  // Advanced Setup
  promoBanners?: PromoBannerSlot[];
  featuredProductIds?: string[];
  popularCategories?: string[];
  showCustomerReviews?: boolean;
  reviewsQuoteSnippet?: string;
  footerText?: string;
}

export interface PromoBannerSlot {
  imageUrl?: string;
  eyebrow?: string; // e.g. "New collection"
  title?: string; // e.g. "Jewelry & Charm rings"
  buttonLabel?: string; // e.g. "See more"
  categoryLink?: string; // category to filter to
  textContrast?: 'light' | 'dark'; // 'light' = white text, 'dark' = dark text
}

export interface StoreCustomer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  state?: string;
  totalOrders: number;
  totalSpent: number;
  firstOrderAt?: string;
  lastOrderAt?: string;
  notes?: string;
  source?: 'order' | 'inquiry' | 'manual';
  createdAt: string;
}

export interface StoreInvoiceItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface StoreInvoice {
  id: string;
  storeId: string;
  type: 'invoice' | 'receipt';
  docNumber: string; // e.g. "INV-1001" or "REC-1001"
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  issueDate: string;
  dueDate?: string;
  items: StoreInvoiceItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  status: 'draft' | 'unpaid' | 'paid' | 'cancelled';
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  createdAt: string;
}

export interface StoreDeliveryLocation {
  id: string;
  storeId: string;
  state: string; // e.g. "Lagos", "Abuja FCT", "Rivers"
  areaName: string; // e.g. "Lagos Island / Lekki / Ikoyi" or "All areas in state"
  fee: number; // e.g. 2500
  estimatedDays?: string; // e.g. "Same-day delivery", "1 - 2 business days"
  isActive: boolean;
}

export interface Store {
  id: string;
  name: string;
  slug: string; // unique, e.g. "amaka-perfumes"
  ownerName?: string; // Store owner full name
  ownerEmail?: string;
  ownerPassword?: string;
  idVerification?: StoreIdVerification;
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
    facebook?: string;
  };
  tier: 'free' | 'starter' | 'basic' | 'pro' | 'business';
  verified: boolean;
  hasVerifiedBadgeAddon?: boolean; // Standalone ₦2,000/mo verification add-on
  verifiedBadgeExpiresAt?: string;
  featuredOnLanding?: boolean; // Exclusively controlled by Super Admin for landing page Live Storefronts
  customDomain?: string; // Custom domain linked by Super Admin (e.g. "amakajewelry.com.ng" or "brand.com")
  aiDailyUsage?: {
    date: string; // YYYY-MM-DD
    count: number; // Generations used today
    customCap?: number; // Optional custom daily cap set by Super Admin
  };
  status?: 'active' | 'suspended' | 'deleted';
  isPublished?: boolean;
  storefrontCustomization?: StorefrontCustomization;
  coupons?: StoreCoupon[];
  deliveryLocations?: StoreDeliveryLocation[];
  invoices?: StoreInvoice[];
  customers?: StoreCustomer[];
  planExpiresAt?: string;
  planActivationSource?: 'paystack' | 'superadmin';
  lastPaymentRef?: string;
  adminNotes?: string[];
  aiBotConfig?: StoreAIBotConfig;
  whatsappBotConnected?: boolean;
  whatsappBotPhone?: string;
  /** Optional open-hours info shown on storefront hero */
  openHours?: {
    /** e.g. "Mon–Sat · 9am–8pm WAT" */
    label: string;
    /** true = currently open, false = closed */
    isOpenNow: boolean;
    /** e.g. "Replies within 30 min" */
    replyTime?: string;
  };
  /** Optional restock countdown badge on storefront hero */
  restockCountdown?: {
    /** e.g. "New drop in 2 days" */
    label: string;
    /** ISO date string of next restock event */
    date: string;
  };
  createdAt: string;
}

export interface StoreAIBotConfig {
  botName: string; // e.g. "Amaka Scents AI"
  welcomeMessage: string;
  storeKnowledge: string; // Custom FAQs, delivery timelines, payment terms
  tone: 'luxury' | 'friendly' | 'fast' | 'professional';
  suggestedQuestions: string[];
  enabled: boolean;
  whatsappConnected?: boolean;
  whatsappPhone?: string;
  lastConnectedAt?: string;
  /** Pause bot without unlinking WhatsApp */
  isPaused?: boolean;
  /** ISO string — if set, bot auto-resumes at this time; null = paused indefinitely */
  pausedUntil?: string | null;
  /** 'always' = reply to every DM; 'commerce_only' = only reply to order-intent messages */
  replyTriggerMode?: 'always' | 'commerce_only';
  /** Phone numbers (digits only, no +) whose DMs the bot will silently ignore */
  ignoredPhones?: string[];
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
  buyerEmail?: string;
  fulfillmentMethod: 'delivery' | 'pickup';
  deliveryAddress?: string;
  deliveryArea?: string;
  buyerNotes?: string;
  couponCode?: string;
  discountAmount?: number;
  items: OrderItemPayload[];
  totalAmount: number;
  currencySymbol: string;
  whatsappUrl: string;
  status: 'pending' | 'confirmed' | 'payment_confirmed' | 'ready' | 'dispatched' | 'completed' | 'cancelled';
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
  comment?: string;
  productName?: string;
  customerPhotoUrl?: string; // Buyer photo of received items
  verifiedBuyer?: boolean;
  date: string;
}

export interface SellerSession {
  email: string;
  storeId: string;
  storeSlug: string;
  storeName: string;
  ownerName?: string;
  isLoggedIn: boolean;
}

export interface SuperAdminSession {
  email: string;
  isLoggedIn: boolean;
  authenticatedAt: string;
}

export interface StoreNote {
  id: string;
  storeId: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoreExpense {
  id: string;
  storeId: string;
  description: string;
  amount: number;
  category: 'Shipping' | 'Supplies' | 'Marketing' | 'Rent' | 'Utilities' | 'Other';
  date: string;
  createdAt: string;
}

export type PlatformLeadIntent = 'talk_to_human' | 'help' | 'tell_me_more' | 'signup' | 'custom';

export interface PlatformLeadMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export interface PlatformLead {
  id: string;
  refCode: string; // e.g. "REF-TALK-7412" or "REF-LEAD-8921"
  intent: PlatformLeadIntent;
  name?: string;
  phone?: string;
  email?: string;
  businessType?: string;
  storeName?: string;
  summary: string;
  messages: PlatformLeadMessage[];
  status: 'new' | 'contacted' | 'resolved';
  createdAt: string;
}

export interface PlatformSettings {
  platformName: string;
  rootDomain?: string;
  supportWhatsApp: string;
  defaultCurrency: CurrencyCode;
  geminiApiKey?: string;
  groqApiKey?: string;
  // Plan pricing in NGN
  starterPriceMonthly: number;
  starterPriceYearly: number;
  basicPriceMonthly: number;
  basicPriceYearly: number;
  proPriceMonthly: number;
  proPriceYearly: number;
  businessPriceMonthly: number;
  businessPriceYearly: number;
  badgePriceMonthly?: number;
  badgePriceYearly?: number;
  globalAnnouncement: string;
  allowRegistrations: boolean;
  maintenanceMode: boolean;
  featuredStoreSlugs: string[];
}
