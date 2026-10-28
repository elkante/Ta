import {
  Product,
  Store,
  WhatsAppInquiryLog,
  StoreReview,
  SellerSession,
  StoreOrder,
  SuperAdminSession,
  PlatformSettings,
} from '../types';

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

const INITIAL_STORES: Store[] = [
  {
    id: 'store_amaka',
    name: 'Amaka Perfumes & Luxury Scents',
    slug: 'amaka-perfumes',
    ownerEmail: 'amaka@perfumes.ng',
    ownerPassword: 'password123',
    tagline: '100% Original Designer & Niche Fragrances in Lagos',
    description: 'Specializing in authentic Arabian oud, French designer decants, and niche perfumes. Same-day delivery across Lagos & fast dispatch nationwide via GIG / DHL.',
    whatsappCountryCode: '+234',
    whatsappNumber: '8039874521',
    currency: 'NGN',
    currencySymbol: '₦',
    logoUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=1600&auto=format&fit=crop&q=80',
    accentColor: '#b45309', // Warm amber / gold
    themeStyle: 'luxury',
    location: 'Admiralty Way, Lekki Phase 1, Lagos',
    announcement: '✨ FREE nationwide delivery for orders above ₦70,000 this week! Search by UID to order.',
    deliveryInfo: 'Lagos Island & Mainland: Same-day dispatch. Nationwide (Abuja, PH, Ibadan, etc.): 24-48 hours.',
    socialLinks: {
      instagram: 'amakaperfumes',
      tiktok: 'amakascents',
      twitter: 'amakaperfumes',
    },
    tier: 'pro',
    verified: true,
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'store_zainab',
    name: 'Zainab Couture & Modest Wear',
    slug: 'zainab-couture',
    ownerEmail: 'zainab@couture.ng',
    ownerPassword: 'password123',
    tagline: 'Bespoke Silk Abayas, Kaftans & RTW Dresses',
    description: 'Crafted with premium Dubai silk and Japanese crepe. Elegant, timeless pieces tailored for the modern modest woman.',
    whatsappCountryCode: '+234',
    whatsappNumber: '8145558902',
    currency: 'NGN',
    currencySymbol: '₦',
    logoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80',
    accentColor: '#047857', // Emerald
    themeStyle: 'bold',
    location: 'Maitama Business Plaza, Abuja',
    announcement: '🎉 Ramadan Collection 2026 is LIVE! Limited units per design.',
    deliveryInfo: 'Abuja: Instant dispatch within 3 hours. Rest of Nigeria: 48h via express courier.',
    socialLinks: {
      instagram: 'zainabcouture.ng',
      tiktok: 'zainabcouture',
    },
    tier: 'pro',
    verified: true,
    createdAt: '2026-02-10T11:00:00Z',
  },
  {
    id: 'store_gadget',
    name: 'Gadget Plug Nigeria',
    slug: 'gadget-plug-ng',
    ownerEmail: 'gadget@plug.ng',
    ownerPassword: 'password123',
    tagline: 'Authentic Apple Devices, Audio & Premium Accessories',
    description: 'Brand new & UK-Used Grade A+ iPhones, MacBooks, AirPods, and MagSafe accessories with 90-day warranty.',
    whatsappCountryCode: '+234',
    whatsappNumber: '8023456789',
    currency: 'NGN',
    currencySymbol: '₦',
    logoUrl: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1600&auto=format&fit=crop&q=80',
    accentColor: '#1d4ed8', // Tech Blue
    themeStyle: 'modern',
    location: 'Otigba Street, Computer Village, Ikeja, Lagos',
    announcement: '⚡ iPhone 16 Pro Max now in stock! Swap deals available via WhatsApp.',
    deliveryInfo: 'Lagos delivery via dispatched bike within 2 hours. Pay on Delivery available for vetted Lagos buyers.',
    socialLinks: {
      instagram: 'gadgetplugng',
      twitter: 'gadgetplug_ng',
    },
    tier: 'free',
    verified: false,
    createdAt: '2026-03-01T08:30:00Z',
  },
];

const INITIAL_PRODUCTS: Product[] = [
  // --- Amaka Perfumes Products ---
  {
    id: 'prod_br540',
    uid: 'TA-BR540',
    storeId: 'store_amaka',
    name: 'Maison Francis Kurkdjian - Baccarat Rouge 540',
    slug: 'baccarat-rouge-540',
    description: 'An iconic luminous fragrance with airy jasmine blossoms and radiance of saffron, cedarwood, and warm ambergris. Unmistakable sillage and projection.',
    price: 185000,
    originalPrice: 215000,
    category: 'Extrait & EDP',
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    isLowStock: false,
    badge: 'Bestseller',
    options: [{ name: 'Size', values: ['70ml EDP', '70ml Extrait', '200ml Extrait'] }],
    variants: [
      { id: 'v_br_70edp', name: '70ml EDP', price: 185000, originalPrice: 205000, inStock: true },
      { id: 'v_br_70ex', name: '70ml Extrait de Parfum', price: 245000, originalPrice: 270000, inStock: true },
      { id: 'v_br_200ex', name: '200ml Extrait (Mega)', price: 495000, originalPrice: 540000, inStock: false },
    ],
    attributes: {
      'Concentration': 'Extrait / Eau de Parfum',
      'Longevity': '14+ Hours',
      'Top Notes': 'Bitter Almond, Saffron',
      'Heart Notes': 'Egyptian Jasmine, Cedar',
      'Base Notes': 'Ambergris, Woody Musk',
    },
    inquiryCount: 42,
    createdAt: '2026-01-20T12:00:00Z',
  },
  {
    id: 'prod_grandsoir',
    uid: 'TA-GSOIR',
    storeId: 'store_amaka',
    name: 'MFK Grand Soir Eau de Parfum',
    slug: 'mfk-grand-soir',
    description: 'Dress in your finest attire and polish your look. Experience the luminous radiance of a magnificent Parisian evening with deep benzoin and tonka beans.',
    price: 165000,
    category: 'Extrait & EDP',
    images: [
      'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    badge: 'Top Pick',
    options: [{ name: 'Bottle Size', values: ['70ml', '200ml'] }],
    variants: [
      { id: 'v_gs_70', name: '70ml Bottle', price: 165000, inStock: true },
      { id: 'v_gs_200', name: '200ml Bottle', price: 340000, inStock: true },
    ],
    attributes: {
      'Longevity': '12+ Hours',
      'Key Notes': 'Spanish Labdanum, Siam Benzoin, Brazilian Tonka Bean, Vanilla',
      'Best For': 'Evenings, Dates & Luxury events',
    },
    inquiryCount: 28,
    createdAt: '2026-01-22T14:30:00Z',
  },
  {
    id: 'prod_khamrah',
    uid: 'TA-KHAM',
    storeId: 'store_amaka',
    name: 'Lattafa Khamrah Qahwa (Arabian Oud & Coffee)',
    slug: 'lattafa-khamrah-qahwa',
    description: 'The viral Arabian sensation. Rich sweet cinnamon, praline, dates, and roasted Arabic coffee notes. Intense projection and huge compliment getter.',
    price: 38000,
    originalPrice: 45000,
    category: 'Arabian & Oud',
    images: [
      'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    isLowStock: true,
    badge: 'Viral TikTok',
    variants: [
      { id: 'v_kh_100', name: '100ml EDP', price: 38000, originalPrice: 45000, inStock: true },
    ],
    attributes: {
      'Origin': 'Dubai, UAE',
      'Fragrance Type': 'Gourmand Spicy Sweet',
      'Key Notes': 'Cardamom, Cinnamon, Coffee, Candied Praline, Vanilla',
    },
    inquiryCount: 65,
    createdAt: '2026-02-01T09:15:00Z',
  },
  {
    id: 'prod_delina',
    uid: 'TA-DEL75',
    storeId: 'store_amaka',
    name: 'Parfums de Marly - Delina Exclusif',
    slug: 'delina-exclusif',
    description: 'A sensual floral composition infused with Turkish rose, lily of the valley, and peony, softened by luminous lychee, rhubarb, and bergamot.',
    price: 210000,
    originalPrice: 230000,
    category: 'Floral & Sweet',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    variants: [
      { id: 'v_del_75', name: '75ml EDP', price: 210000, inStock: true },
    ],
    attributes: {
      'Vibe': 'Feminine, Romantic, High Society',
      'Longevity': '10-12 Hours',
    },
    inquiryCount: 19,
    createdAt: '2026-02-05T15:00:00Z',
  },
  {
    id: 'prod_decant_bundle',
    uid: 'TA-DEC3X',
    storeId: 'store_amaka',
    name: 'Luxury Niche 10ml Decant Discovery Set (3 Scents)',
    slug: 'discovery-decant-set',
    description: 'Sample 3 of our most coveted luxury fragrances before committing to a full bottle. Choose any 3 from BR540, Grand Soir, Delina, or Ombre Leather.',
    price: 52000,
    category: 'Decants & Travel',
    images: [
      'https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    variants: [
      { id: 'v_dec_3x10', name: 'Set of 3 (10ml each)', price: 52000, inStock: true },
    ],
    inquiryCount: 31,
    createdAt: '2026-02-12T16:00:00Z',
  },
  {
    id: 'prod_tomford_ombre',
    uid: 'TA-TFOMB',
    storeId: 'store_amaka',
    name: 'Tom Ford - Ombre Leather Parfum',
    slug: 'tom-ford-ombre-leather',
    description: 'Vast, untethered, and driven. Floral leather and cool spices reveal an untethered, tactile scent for men and women.',
    price: 175000,
    category: 'Woody & Leather',
    images: [
      'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: false,
    badge: 'Sold Out',
    variants: [
      { id: 'v_tf_100', name: '100ml Parfum', price: 175000, inStock: false },
    ],
    inquiryCount: 14,
    createdAt: '2026-02-15T11:00:00Z',
  },

  // --- Zainab Couture Products ---
  {
    id: 'prod_abaya_noor',
    uid: 'TA-NOOR',
    storeId: 'store_zainab',
    name: 'The Noor Embellished Dubai Silk Abaya',
    slug: 'the-noor-silk-abaya',
    description: 'Hand-sewn crystal detailing across the cuffs and lapel. Comes with matching modal hijab and inner slip dress.',
    price: 95000,
    category: 'Luxury Abayas',
    images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    badge: 'New Season',
    options: [
      { name: 'Size', values: ['Size 54 (S)', 'Size 56 (M)', 'Size 58 (L)', 'Size 60 (XL)'] },
      { name: 'Color', values: ['Emerald Green', 'Midnight Onyx', 'Desert Champagne'] },
    ],
    variants: [
      { id: 'v_noor_54', name: 'Size 54 / Emerald Green', price: 95000, inStock: true },
      { id: 'v_noor_56', name: 'Size 56 / Emerald Green', price: 95000, inStock: true },
      { id: 'v_noor_58', name: 'Size 58 / Midnight Onyx', price: 95000, inStock: true },
      { id: 'v_noor_60', name: 'Size 60 / Desert Champagne', price: 98000, inStock: true },
    ],
    attributes: {
      'Fabric': '100% Grade 6A Dubai Silk Crepe',
      'Includes': 'Abaya + Inner Slip + Matching Chiffon Hijab',
      'Care': 'Dry clean or gentle cold hand wash',
    },
    inquiryCount: 38,
    createdAt: '2026-02-15T13:00:00Z',
  },
  {
    id: 'prod_kaftan_soraya',
    uid: 'TA-SORAY',
    storeId: 'store_zainab',
    name: 'Soraya Pleated Silk Kaftan',
    slug: 'soraya-pleated-kaftan',
    description: 'Flowing pleated kaftan dress with gold thread neck embroidery. Effortlessly flattering silhouette for wedding guests and special gatherings.',
    price: 82000,
    originalPrice: 90000,
    category: 'Occasion Wear',
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    badge: 'Bestseller',
    variants: [
      { id: 'v_soraya_free', name: 'Free Size (Fits UK 8 - 18)', price: 82000, originalPrice: 90000, inStock: true },
    ],
    inquiryCount: 22,
    createdAt: '2026-02-18T10:00:00Z',
  },

  // --- Gadget Plug Products ---
  {
    id: 'prod_ip16pm',
    uid: 'TA-16PM',
    storeId: 'store_gadget',
    name: 'Apple iPhone 16 Pro Max - Factory Unlocked',
    slug: 'iphone-16-pro-max',
    description: 'Grade A+ Pristine condition / Brand New open box with battery health 100%. Titanium build, 48MP Fusion camera, Action button. 90 days shop warranty included.',
    price: 1650000,
    originalPrice: 1750000,
    category: 'iPhones',
    images: [
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    badge: 'Hot Deal',
    options: [
      { name: 'Storage', values: ['256GB', '512GB', '1TB'] },
      { name: 'Color', values: ['Desert Titanium', 'Natural Titanium', 'Black Titanium'] },
    ],
    variants: [
      { id: 'v_16pm_256', name: '256GB / Natural Titanium', price: 1650000, originalPrice: 1750000, inStock: true },
      { id: 'v_16pm_512', name: '512GB / Desert Titanium', price: 1890000, originalPrice: 1980000, inStock: true },
      { id: 'v_16pm_1tb', name: '1TB / Black Titanium', price: 2150000, inStock: false },
    ],
    attributes: {
      'Condition': 'Grade A+ Clean / New',
      'Warranty': '90 Days Store Receipt Guarantee',
      'Includes': 'Original Apple USB-C Braided Cable + Free 20W Fast Charger',
    },
    inquiryCount: 54,
    createdAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'prod_airpods_pro',
    uid: 'TA-APP2',
    storeId: 'store_gadget',
    name: 'Apple AirPods Pro 2 (USB-C MagSafe Case)',
    slug: 'airpods-pro-2-usbc',
    description: 'Up to 2x more Active Noise Cancellation, Adaptive Audio, and Personalized Spatial Audio. Brand new sealed.',
    price: 245000,
    originalPrice: 270000,
    category: 'Audio',
    images: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
    ],
    inStock: true,
    variants: [
      { id: 'v_app2', name: 'Standard Sealed Pack', price: 245000, inStock: true },
    ],
    inquiryCount: 39,
    createdAt: '2026-03-08T11:00:00Z',
  },
];

const INITIAL_INQUIRIES: WhatsAppInquiryLog[] = [
  {
    id: 'inq_1',
    storeId: 'store_amaka',
    productId: 'prod_br540',
    productUid: 'TA-BR540',
    productName: 'Maison Francis Kurkdjian - Baccarat Rouge 540',
    variantName: '70ml Extrait de Parfum',
    price: 245000,
    buyerLocation: 'Victoria Island, Lagos',
    buyerNote: 'Need this delivered before 4pm for a birthday surprise please!',
    whatsappUrl: 'https://wa.me/2348039874521',
    timestamp: '2026-10-26T06:12:00Z',
    status: 'completed',
  },
  {
    id: 'inq_2',
    storeId: 'store_amaka',
    productId: 'prod_khamrah',
    productUid: 'TA-KHAM',
    productName: 'Lattafa Khamrah Qahwa (Arabian Oud & Coffee)',
    variantName: '100ml EDP',
    price: 38000,
    buyerLocation: 'Garki 2, Abuja',
    buyerNote: 'Is payment on delivery possible for Abuja?',
    whatsappUrl: 'https://wa.me/2348039874521',
    timestamp: '2026-10-26T04:45:00Z',
    status: 'contacted',
  },
];

const INITIAL_REVIEWS: StoreReview[] = [
  {
    id: 'rev_1',
    storeId: 'store_amaka',
    author: 'Chidinma O.',
    rating: 5,
    comment: 'Authentic BR540! Projection is insane and lasted over 24 hours on my blazer. Ordering the Grand Soir next using UID #TA-GSOIR.',
    productName: 'Baccarat Rouge 540 Extrait',
    date: '3 days ago',
  },
  {
    id: 'rev_2',
    storeId: 'store_amaka',
    author: 'Tunde A.',
    rating: 5,
    comment: 'Same day dispatch to Lekki was super fast. Contacted via WhatsApp with the UID and had the bottle within 3 hours. 10/10 service.',
    productName: 'Lattafa Khamrah Qahwa',
    date: '1 week ago',
  },
  {
    id: 'rev_3',
    storeId: 'store_zainab',
    author: 'Fatima M.',
    rating: 5,
    comment: 'The Noor silk abaya is breathtaking in person. The crystal embellishments catch light so gracefully.',
    productName: 'The Noor Embellished Silk Abaya',
    date: '5 days ago',
  },
];

const INITIAL_ORDERS: StoreOrder[] = [
  {
    id: 'TA-ORD-9281',
    storeId: 'store_amaka',
    buyerName: 'Chidinma Okafor',
    buyerPhone: '08039281742',
    fulfillmentMethod: 'delivery',
    deliveryAddress: 'Block 4, Plot 12, Admiralty Way, Lekki Phase 1',
    deliveryArea: 'Lagos',
    buyerNotes: 'Please ring bell upon arrival',
    items: [
      {
        productId: 'prod_br540',
        productUid: 'TA-BR540',
        productName: 'Maison Francis Kurkdjian - Baccarat Rouge 540',
        variantName: '70ml Extrait de Parfum',
        price: 245000,
        quantity: 1,
        subtotal: 245000,
        image: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80',
      },
    ],
    totalAmount: 245000,
    currencySymbol: '₦',
    whatsappUrl: 'https://wa.me/2348039874521',
    status: 'confirmed',
    createdAt: '2026-10-26T06:12:00Z',
  },
  {
    id: 'TA-ORD-9279',
    storeId: 'store_amaka',
    buyerName: 'Tunde Adeleke',
    buyerPhone: '08148829103',
    fulfillmentMethod: 'pickup',
    buyerNotes: 'Will pick up during lunch break around 1pm',
    items: [
      {
        productId: 'prod_khamrah',
        productUid: 'TA-KHAM',
        productName: 'Lattafa Khamrah Qahwa (Arabian Oud & Coffee)',
        variantName: '100ml EDP',
        price: 38000,
        quantity: 1,
        subtotal: 38000,
        image: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&auto=format&fit=crop&q=80',
      },
    ],
    totalAmount: 38000,
    currencySymbol: '₦',
    whatsappUrl: 'https://wa.me/2348039874521',
    status: 'completed',
    createdAt: '2026-10-26T04:45:00Z',
  },
];

const STORES_KEY = 'tashop_tenants_v2';
const PRODUCTS_KEY = 'tashop_products_v2';
const INQUIRIES_KEY = 'tashop_inquiries_v2';
const ORDERS_KEY = 'tashop_orders_v2';
const REVIEWS_KEY = 'tashop_reviews_v2';
const CURRENT_TENANT_KEY = 'tashop_current_tenant_v2';
const SELLER_SESSION_KEY = 'tashop_seller_session_v2';

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

  return newOrder;
}

export function updateOrderStatus(orderId: string, status: StoreOrder['status']) {
  const allOrders = getStoredOrders();
  const updated = allOrders.map((o) => (o.id === orderId ? { ...o, status } : o));
  saveOrders(updated);
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
  return 'amaka-perfumes';
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
    isLoggedIn: true,
  };

  setSellerSession(session);
  return { success: true, session };
}

// ----------------------------------------------------
// Super Admin Platform Management
// ----------------------------------------------------

export const SUPER_ADMIN_SESSION_KEY = 'tashop_super_admin_session';
export const PLATFORM_SETTINGS_KEY = 'tashop_platform_settings';
export const SUPER_ADMIN_DEFAULT_KEY = 'admin123';

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'Tá.shop',
  supportWhatsApp: '+2348039874521',
  defaultCurrency: 'NGN',
  starterPriceMonthly: 500,
  proPriceMonthly: 3500,
  globalAnnouncement: '⚡ Welcome to Tá.shop - The multi-tenant social commerce platform for WhatsApp & Instagram sellers.',
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

export function authenticateSuperAdmin(password: string): {
  success: boolean;
  session?: SuperAdminSession;
  error?: string;
} {
  const cleanPass = password.trim();
  if (cleanPass === SUPER_ADMIN_DEFAULT_KEY || cleanPass === 'tashop2026' || cleanPass === 'superadmin') {
    const session: SuperAdminSession = {
      email: 'superadmin@tashop.co',
      isLoggedIn: true,
      authenticatedAt: new Date().toISOString(),
    };
    setSuperAdminSession(session);
    return { success: true, session };
  }
  return { success: false, error: 'Invalid Super Admin password. Use "admin123" for testing.' };
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
