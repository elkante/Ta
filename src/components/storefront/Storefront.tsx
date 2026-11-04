import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Facebook,
  Filter,
  Headphones,
  Heart,
  Instagram,
  Lock,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  PackageCheck,
  Phone,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Truck,
  Twitter,
  User,
  X,
  Zap,
} from 'lucide-react';
import { CartItem, Product, ProductVariant, Store, StoreReview, StoreThemeId } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { WhatsAppCartDrawer } from './WhatsAppCartDrawer';
import { StoreAIBotBubble } from './StoreAIBotBubble';
import { WhatsAppPreviewModal } from '../modals/WhatsAppPreviewModal';
import { SocialShareModal } from '../modals/SocialShareModal';
import { CustomerReviewModal } from '../modals/CustomerReviewModal';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { getStorePlanStatus } from '../../utils/planStatus';
import {
  createCartInquiryMessage,
  createProductInquiryMessage,
  formatPrice,
  generateWhatsAppLink,
} from '../../utils/whatsapp';
import { recordWhatsAppInquiry } from '../../utils/storage';
import { parseSocialLink } from '../../utils/social';

interface StorefrontProps {
  store: Store;
  products: Product[];
  reviews: StoreReview[];
  isLoadingProducts?: boolean;
  isStoreOwner?: boolean;
  onOpenCreateStore: () => void;
  onOpenLogin?: () => void;
  onOpenLanding?: () => void;
  onRefreshData?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy' | 'cookies') => void;
  /** Navigates the owner to their seller dashboard */
  onOpenDashboard?: () => void;
  /** Product ID from ?product= URL param — auto-opens product detail on load */
  initialProductId?: string | null;
}

export const Storefront: React.FC<StorefrontProps> = ({
  store,
  products,
  reviews,
  isLoadingProducts = false,
  isStoreOwner = false,
  onOpenCreateStore,
  onOpenLogin,
  onOpenLanding,
  onRefreshData,
  onOpenLegal,
  onOpenDashboard,
  initialProductId,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Storefront Customization & Navigation States
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);

  const custom = store.storefrontCustomization || {};
  const activeThemeId: StoreThemeId = custom.themeId || 'classic';
  const isClassicTheme = activeThemeId === 'classic';

  const isDarkTheme = activeThemeId === 'galactic' || activeThemeId === 'aurum';
  const isRoseTheme = activeThemeId === 'colette';

  const themeWrapperClass = useMemo(() => {
    if (activeThemeId === 'aurum') {
      return 'bg-[#0c0d12] text-slate-100';
    }
    if (activeThemeId === 'galactic') {
      return 'bg-[#070b14] text-slate-100';
    }
    if (activeThemeId === 'colette') {
      return 'bg-[#fdf8f9] text-stone-900';
    }
    if (activeThemeId === 'margaux') {
      return 'bg-[#faf9f6] text-stone-900';
    }
    if (activeThemeId === 'arena') {
      return 'bg-[#f4f4f5] text-black';
    }
    if (activeThemeId === 'cobalt') {
      return 'bg-[#f8fafc] text-slate-900';
    }
    return 'bg-[#fafbfc] text-slate-900';
  }, [activeThemeId]);

  const ig = useMemo(() => parseSocialLink('instagram', store.socialLinks?.instagram), [store.socialLinks?.instagram]);
  const tt = useMemo(() => parseSocialLink('tiktok', store.socialLinks?.tiktok), [store.socialLinks?.tiktok]);
  const fb = useMemo(() => parseSocialLink('facebook', store.socialLinks?.facebook), [store.socialLinks?.facebook]);
  const tw = useMemo(() => parseSocialLink('twitter', store.socialLinks?.twitter), [store.socialLinks?.twitter]);

  const fontClass = useMemo(() => {
    if (
      custom.fontFamily === 'serif' ||
      activeThemeId === 'margaux' ||
      activeThemeId === 'colette' ||
      activeThemeId === 'aurum' ||
      activeThemeId === 'maison'
    ) {
      return 'font-serif';
    }
    if (custom.fontFamily === 'grotesk' || activeThemeId === 'arena') {
      return 'font-mono tracking-tight';
    }
    return 'font-sans';
  }, [custom.fontFamily, activeThemeId]);

  const scrollToSection = (id: string) => {
    setIsMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTargetProduct, setShareTargetProduct] = useState<Product | undefined>(undefined);

  // Auto-open a product from ?product= URL param (e.g. scanned product QR code or WhatsApp bot link)
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const cleanId = initialProductId.trim().toLowerCase().replace(/^#/, '');
      const match = products.find(
        (p) =>
          p.id.toLowerCase() === cleanId ||
          p.uid?.toLowerCase() === cleanId ||
          p.slug?.toLowerCase() === cleanId
      );
      if (match) {
        setSelectedProduct(match);
        setIsDetailOpen(true);
        // Clean the param from URL so refresh doesn't re-open it
        const url = new URL(window.location.href);
        url.searchParams.delete('product');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [initialProductId, products]);

  // Customer Review Modal State & Deep-link support (?review=1)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeReviews, setActiveReviews] = useState<StoreReview[]>(reviews);

  useEffect(() => {
    setActiveReviews(reviews);
  }, [reviews]);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (
        url.searchParams.get('review') === '1' ||
        url.searchParams.get('review') === 'true' ||
        url.searchParams.get('action') === 'review'
      ) {
        setIsReviewModalOpen(true);
        url.searchParams.delete('review');
        url.searchParams.delete('action');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}
  }, []);

  // Trigger data sync on mount so newly approved products show immediately
  useEffect(() => {
    onRefreshData?.();
  }, [store.id]);

  // WhatsApp Message Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [pendingWhatsAppMessage, setPendingWhatsAppMessage] = useState('');
  const [pendingInquiryPayload, setPendingInquiryPayload] = useState<{
    productId: string;
    productName: string;
    variantName?: string;
    price: number;
    buyerLocation?: string;
    buyerNote?: string;
    whatsappUrl: string;
  } | null>(null);

  // Cart / WhatsApp Bag State
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Distinct categories (honoring popularCategories if configured)
  const categories = useMemo(() => {
    if (custom.popularCategories && custom.popularCategories.length > 0) {
      return ['All', ...custom.popularCategories];
    }
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products, custom.popularCategories]);

  // Featured collections with representative products
  const featuredCollections = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => {
      if (p.category && !map.has(p.category) && p.approvalStatus === 'approved') {
        map.set(p.category, p);
      }
    });
    return Array.from(map.entries()).map(([cat, prod]) => ({
      name: cat,
      sampleProduct: prod,
      count: products.filter((p) => p.category === cat && (p.approvalStatus === 'approved' || isStoreOwner)).length,
    }));
  }, [products, isStoreOwner]);

  // Pinned featured products (Editor's Picks)
  const featuredProductsList = useMemo(() => {
    if (!custom.featuredProductIds || custom.featuredProductIds.length === 0) return [];
    return products.filter((p) => {
      const isApproved = p.approvalStatus === 'approved' || isStoreOwner;
      return isApproved && custom.featuredProductIds?.includes(p.id);
    });
  }, [products, custom.featuredProductIds, isStoreOwner]);

  const cleanSearch = searchQuery.trim().toLowerCase().replace(/^#/, '');

  // Filtered products with UID support
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Store owners previewing their store can see all their products (pending ones marked Under Review)
      // Public buyers ONLY see products that have been approved by Super Admin
      const isApproved = p.approvalStatus === 'approved' || isStoreOwner;
      if (!isApproved) return false;

      const matchSearch =
        !cleanSearch ||
        p.name.toLowerCase().includes(cleanSearch) ||
        p.description.toLowerCase().includes(cleanSearch) ||
        p.category.toLowerCase().includes(cleanSearch) ||
        (p.uid && p.uid.toLowerCase().includes(cleanSearch));

      const matchCategory =
        selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchStock = !onlyInStock || p.inStock;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, cleanSearch, selectedCategory, onlyInStock, isStoreOwner]);

  // Plan Status & 5-Day Grace Period Product Cap
  // If the store is on Free (or paid plan expired past 5-day grace period),
  // buyers (!isStoreOwner) see ONLY the first 4 products. Remaining products are safely paused.
  const planStatus = useMemo(() => getStorePlanStatus(store), [store.tier, store.planExpiresAt]);

  const visibleProducts = useMemo(() => {
    if (isStoreOwner) return filteredProducts;
    if (planStatus.hasExpiredPastGrace || store.tier === 'free') {
      return filteredProducts.slice(0, 4);
    }
    return filteredProducts;
  }, [filteredProducts, isStoreOwner, planStatus.hasExpiredPastGrace, store.tier]);

  // Exact or direct UID match
  const directUidMatch = useMemo(() => {
    if (!cleanSearch || cleanSearch.length < 2) return null;
    return products.find(
      (p) =>
        p.uid &&
        (p.uid.toLowerCase() === cleanSearch ||
          p.uid.toLowerCase() === `ta-${cleanSearch}` ||
          p.uid.toLowerCase().includes(cleanSearch))
    );
  }, [products, cleanSearch]);

  // Cart operations
  const handleAddToCart = (product: Product, variant?: ProductVariant) => {
    setCartItems((prev) => {
      const lineId = `${product.id}_${variant ? variant.id : 'default'}`;
      const existing = prev.find((item) => item.id === lineId);
      if (existing) {
        return prev.map((item) =>
          item.id === lineId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: lineId, product, variant, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const handleRemoveCartItem = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  // Direct 1-Click Product Inquiry
  const handleOpenProductWhatsApp = (
    product: Product,
    variant?: ProductVariant,
    buyerLocation?: string,
    buyerNote?: string
  ) => {
    const text = createProductInquiryMessage({
      store,
      product,
      variant,
      buyerLocation,
      buyerNote,
    });

    const activePrice = variant ? variant.price : product.price;
    const waUrl = generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, text);

    setPendingWhatsAppMessage(text);
    setPendingInquiryPayload({
      productId: product.id,
      productName: product.name,
      variantName: variant?.name,
      price: activePrice,
      buyerLocation,
      buyerNote,
      whatsappUrl: waUrl,
    });
    setPreviewModalOpen(true);
  };

  // Cart Checkout
  const handleCheckoutCartWhatsApp = (buyerLocation: string, buyerNote: string) => {
    const text = createCartInquiryMessage({
      store,
      items: cartItems,
      buyerLocation,
      buyerNote,
    });

    const totalAmount = cartItems.reduce((sum, item) => {
      const p = item.variant ? item.variant.price : item.product.price;
      return sum + p * item.quantity;
    }, 0);

    const waUrl = generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, text);

    setPendingWhatsAppMessage(text);
    setPendingInquiryPayload({
      productId: cartItems[0]?.product.id || 'cart_bundle',
      productName: `Order Bag (${cartItems.length} items)`,
      variantName: cartItems.map((c) => c.product.name).join(', '),
      price: totalAmount,
      buyerLocation,
      buyerNote,
      whatsappUrl: waUrl,
    });
    setPreviewModalOpen(true);
    setIsCartOpen(false);
  };

  const handleConfirmSendInquiry = () => {
    if (pendingInquiryPayload) {
      recordWhatsAppInquiry({
        storeId: store.id,
        ...pendingInquiryPayload,
      });
      if (onRefreshData) onRefreshData();
    }
  };

  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const totalCartAmount = cartItems.reduce((sum, item) => {
    const p = item.variant ? item.variant.price : item.product.price;
    return sum + p * item.quantity;
  }, 0);

  return (
    <div id="top" className={`min-h-screen ${themeWrapperClass} ${fontClass} pb-28 sm:pb-24 overflow-x-hidden w-full max-w-full`}>
      {/* Top Store Announcement Bar */}
      {store.announcement && (
        <div
          className="text-white text-xs font-semibold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-xs transition-colors"
          style={{ backgroundColor: store.accentColor || '#0f172a' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{store.announcement}</span>
        </div>
      )}

      {/* Paused Store Alert */}
      {store.isPublished === false && !isStoreOwner && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2">
          <span>⚠️ {store.name} is currently updating their store. You can still message the seller on WhatsApp!</span>
        </div>
      )}

      {/* ── CONDITIONAL LAYOUT: CLASSIC SIGNATURE vs MODERN BOUTIQUE ── */}
      {isClassicTheme ? (
        /* ── CLASSIC SIGNATURE STOREFRONT HEADER (Signature Dark Cinematic) ── */
        <div className="relative bg-slate-900 text-white overflow-hidden border-b border-slate-800">
          {/* Background Image with Gradient Overlay */}
          <div className="absolute inset-0 z-0">
            {store.bannerUrl ? (
              <img
                src={store.bannerUrl}
                alt={store.name}
                className="w-full h-full object-cover opacity-30"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${store.accentColor || '#0f172a'} 0%, ${store.accentColor || '#1e293b'}cc 50%, #0f172a 100%)`,
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/70 to-slate-900/40" />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Store Logo Avatar */}
              <div className="relative shrink-0">
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-2xl bg-slate-800 ring-4 ring-amber-400/70 ring-offset-2 ring-offset-slate-900"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl text-white font-black text-2xl flex items-center justify-center shadow-2xl ring-4 ring-amber-400/70 ring-offset-2 ring-offset-slate-900"
                    style={{ backgroundColor: store.accentColor || '#0f172a' }}
                  >
                    {store.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 ring-2 ring-slate-900 rounded-full shadow-sm">
                  <VerifiedBadge tier={store.tier} verified={store.verified} size="md" />
                </div>
              </div>

              {/* Store Title, Tagline & Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans truncate">
                    {store.name}
                  </h1>
                  <VerifiedBadge tier={store.tier} verified={store.verified} size="md" showLabel />
                </div>

                <p className="text-base sm:text-xl text-white mt-1 font-black leading-snug">
                  {store.tagline || 'Curated catalog for verified WhatsApp buyers'}
                </p>

                <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 mt-3 text-xs text-slate-300">
                  {store.location && (
                    <div className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{store.location}</span>
                    </div>
                  )}

                  {/* Open Hours */}
                  {store.openHours ? (
                    <div className={`flex items-center gap-1 font-medium ${store.openHours.isOpenNow ? 'text-emerald-400' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${store.openHours.isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      <span>{store.openHours.isOpenNow ? 'Open now' : 'Closed'} · {store.openHours.label}</span>
                      {store.openHours.replyTime && store.openHours.isOpenNow && (
                        <span className="text-slate-400 ml-1">· {store.openHours.replyTime}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-400 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Accepting WhatsApp orders</span>
                    </div>
                  )}

                  {/* Restock countdown badge */}
                  {store.restockCountdown && (
                    <span className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/30 text-amber-300 px-2.5 py-0.5 rounded-full font-semibold">
                      🔔 {store.restockCountdown.label}
                    </span>
                  )}

                  {/* Social media links */}
                  {ig && (
                    <a
                      href={ig.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-white transition"
                      title={`Instagram: ${ig.display}`}
                    >
                      <Instagram className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>{ig.display}</span>
                    </a>
                  )}
                  {tt && (
                    <a
                      href={tt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-white transition"
                      title={`TikTok: ${tt.display}`}
                    >
                      <svg className="w-3.5 h-3.5 text-cyan-400 fill-current shrink-0" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.93-4.52V8.58a8.28 8.28 0 0 0 4.8 1.54V6.69z" />
                      </svg>
                      <span>{tt.display}</span>
                    </a>
                  )}
                  {fb && (
                    <a
                      href={fb.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-white transition"
                      title={`Facebook: ${fb.display}`}
                    >
                      <Facebook className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{fb.display}</span>
                    </a>
                  )}
                  {tw && (
                    <a
                      href={tw.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-white transition"
                      title={`X / Twitter: ${tw.display}`}
                    >
                      <Twitter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{tw.display}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Direct Contact, Bag & Share Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <a
                  href={generateWhatsAppLink(
                    store.whatsappCountryCode,
                    store.whatsappNumber,
                    `👋 Hello ${store.name}! I am browsing your catalog at ${window.location.origin}?store=${store.slug} and would like to ask a question.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-[0.98] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat on WhatsApp</span>
                </a>

                {/* Cart Bag Icon with Badge */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer flex items-center justify-center"
                  title="View Bag"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {totalCartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                      {totalCartCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setShareTargetProduct(undefined);
                    setIsShareOpen(true);
                  }}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                  title="Share store link & QR code"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {isStoreOwner && onOpenDashboard && (
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer shrink-0"
                  >
                    Dashboard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── MODERN BOUTIQUE & THEMATIC STOREFRONT (Mercato, Margaux, Aurum, etc.) ── */
        <>
          {/* Sticky Nav Bar with proper color contrast */}
          <header
            style={{ borderTop: `3px solid ${store.accentColor || '#0f172a'}` }}
            className={`sticky top-0 z-40 backdrop-blur-md transition-shadow shadow-xs ${
              isDarkTheme
                ? 'bg-slate-950/95 text-white border-b border-slate-800'
                : 'bg-white/95 text-slate-900 border-b border-slate-200/80'
            }`}
          >
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
              {/* Logo & Store Name */}
              <button
                type="button"
                onClick={() => scrollToSection('top')}
                className="flex items-center gap-2.5 cursor-pointer text-left group shrink-0"
              >
                {store.logoUrl ? (
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: store.accentColor || '#0f172a' }}
                  >
                    {store.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-black text-base tracking-tight transition-colors ${
                      isDarkTheme ? 'text-white group-hover:text-amber-400' : 'text-slate-900 group-hover:text-amber-600'
                    } ${fontClass}`}
                  >
                    {store.name}
                  </span>
                  <VerifiedBadge tier={store.tier} verified={store.verified} size="xs" />
                </div>
              </button>

              {/* Center Navigation Links (Desktop) */}
              {custom.showNavLinks !== false && (
                <nav
                  className={`hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider ${
                    isDarkTheme ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => scrollToSection('top')}
                    className="hover:opacity-100 opacity-80 transition cursor-pointer"
                  >
                    Home
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSection('catalog')}
                    className="hover:opacity-100 opacity-80 transition cursor-pointer"
                  >
                    Shop
                  </button>
                  {featuredCollections.length > 0 && custom.showCollections !== false && (
                    <button
                      type="button"
                      onClick={() => scrollToSection('collections')}
                      className="hover:opacity-100 opacity-80 transition cursor-pointer"
                    >
                      Collections
                    </button>
                  )}
                  {(custom.aboutStory || store.description || isStoreOwner) && (
                    <button
                      type="button"
                      onClick={() => scrollToSection('about')}
                      className="hover:opacity-100 opacity-80 transition cursor-pointer"
                    >
                      About
                    </button>
                  )}
                  {custom.showCustomerReviews !== false && (
                    <button
                      type="button"
                      onClick={() => scrollToSection('reviews')}
                      className="hover:opacity-100 opacity-80 transition cursor-pointer"
                    >
                      Reviews
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => scrollToSection('contact')}
                    className="hover:opacity-100 opacity-80 transition cursor-pointer"
                  >
                    Contact
                  </button>
                </nav>
              )}

              {/* Right Action Icons (Small header socials, Cart Bag with badge, Mobile menu) */}
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Small Social Icons on Header */}
                <div className="hidden lg:flex items-center gap-0.5 text-slate-500 mr-1">
                  {ig && (
                    <a
                      href={ig.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`Instagram: ${ig.display}`}
                      className="p-1.5 rounded-lg hover:bg-slate-100/80 hover:text-pink-600 transition"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {tt && (
                    <a
                      href={tt.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`TikTok: ${tt.display}`}
                      className="p-1.5 rounded-lg hover:bg-slate-100/80 hover:text-cyan-500 transition"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.93-4.52V8.58a8.28 8.28 0 0 0 4.8 1.54V6.69z" />
                      </svg>
                    </a>
                  )}
                  {tw && (
                    <a
                      href={tw.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`Twitter / X: ${tw.display}`}
                      className="p-1.5 rounded-lg hover:bg-slate-100/80 hover:text-sky-500 transition"
                    >
                      <Twitter className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {fb && (
                    <a
                      href={fb.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`Facebook: ${fb.display}`}
                      className="p-1.5 rounded-lg hover:bg-slate-100/80 hover:text-blue-600 transition"
                    >
                      <Facebook className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* Owner Dashboard link if owner */}
                {isStoreOwner && onOpenDashboard && (
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="hidden sm:flex px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold items-center gap-1.5 hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span>Dashboard</span>
                  </button>
                )}

                {/* Cart / Bag Icon with Badge using Store Accent Color */}
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className={`relative p-2.5 rounded-xl transition cursor-pointer flex items-center justify-center ${
                    isDarkTheme
                      ? 'bg-slate-800 hover:bg-slate-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                  }`}
                  title="View Cart"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {totalCartCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in"
                      style={{ backgroundColor: store.accentColor || '#0f172a' }}
                    >
                      {totalCartCount}
                    </span>
                  )}
                </button>

                {/* Mobile Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                  className={`md:hidden p-2 rounded-xl transition cursor-pointer ${
                    isDarkTheme ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Nav Dropdown */}
            {isMobileNavOpen && (
              <div
                className={`md:hidden border-t px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150 ${
                  isDarkTheme ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-100 bg-white text-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => scrollToSection('top')}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider hover:opacity-100 opacity-80 cursor-pointer"
                >
                  Home
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSection('catalog')}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider hover:opacity-100 opacity-80 cursor-pointer"
                >
                  Shop All Products
                </button>
                {featuredCollections.length > 0 && custom.showCollections !== false && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('collections')}
                    className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider hover:opacity-100 opacity-80 cursor-pointer"
                  >
                    Collections
                  </button>
                )}
                {(custom.aboutStory || store.description || isStoreOwner) && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('about')}
                    className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider hover:opacity-100 opacity-80 cursor-pointer"
                  >
                    About {store.name}
                  </button>
                )}
                {custom.showCustomerReviews !== false && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('reviews')}
                    className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider hover:opacity-100 opacity-80 cursor-pointer"
                  >
                    Customer Reviews
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => scrollToSection('contact')}
                  className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider hover:opacity-100 opacity-80 cursor-pointer"
                >
                  Contact &amp; Location
                </button>

                {/* Social icons row in mobile nav */}
                {(ig || tt || tw || fb) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/40">
                    {ig && (
                      <a href={ig.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100/50 text-pink-600">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {tt && (
                      <a href={tt.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100/50 text-slate-800">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.93-4.52V8.58a8.28 8.28 0 0 0 4.8 1.54V6.69z" />
                        </svg>
                      </a>
                    )}
                    {tw && (
                      <a href={tw.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100/50 text-sky-500">
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {fb && (
                      <a href={fb.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-100/50 text-blue-600">
                        <Facebook className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}

                {isStoreOwner && onOpenDashboard && (
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="w-full text-left py-2 text-xs font-bold text-amber-500 cursor-pointer pt-2 border-t border-slate-200/40"
                  >
                    Go to Seller Dashboard →
                  </button>
                )}
              </div>
            )}
          </header>

          {/* ── THEME-SPECIFIC HERO LAYOUTS ── */}
          {activeThemeId === 'margaux' ? (
            /* MARGAUX: Editorial split — large serif text left, logo+tagline right */
            <section
              className="relative overflow-hidden border-b border-[#d4b896]/30"
              style={{ backgroundColor: custom.heroBgColor || '#0f172a' }}
            >
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-15">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-0 min-h-[380px]">
                {/* Left: editorial large text */}
                <div className="flex flex-col justify-center py-16 pr-0 md:pr-12 border-b md:border-b-0 md:border-r border-[#d4b896]/20">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#d4b896]/70 mb-4">
                    {store.tagline || 'Curated Fashion & Lifestyle'}
                  </span>
                  <h1 className={`text-4xl sm:text-5xl md:text-6xl font-black text-white leading-none tracking-tight mb-6 font-serif`}>
                    {custom.heroHeadline || store.name}
                  </h1>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => scrollToSection('catalog')}
                      className="px-7 py-3 rounded-none border border-[#d4b896] text-[#d4b896] font-bold text-xs uppercase tracking-widest hover:bg-[#d4b896] hover:text-black transition cursor-pointer">
                      {custom.heroCtaText || 'Explore Collection'}
                    </button>
                    <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                      target="_blank" rel="noreferrer"
                      className="px-5 py-3 flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-widest hover:text-white transition cursor-pointer">
                      <MessageCircle className="w-3.5 h-3.5" /><span>WhatsApp</span>
                    </a>
                  </div>
                </div>
                {/* Right: logo + meta info */}
                <div className="flex flex-col items-center justify-center py-12 pl-0 md:pl-12 gap-4">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} className="w-24 h-24 rounded-2xl object-cover border border-[#d4b896]/40 shadow-2xl" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-[#d4b896]/10 border border-[#d4b896]/40 text-[#d4b896] font-black text-3xl flex items-center justify-center font-serif">
                      {store.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="text-center space-y-1">
                    <p className="text-white/50 text-xs uppercase tracking-widest">{store.location || 'Nigeria'}</p>
                    <p className="text-[#d4b896]/60 text-[11px]">Est. Commerce · Tá.shop</p>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span>Accepting orders</span>
                  </div>
                </div>
              </div>
            </section>
          ) : activeThemeId === 'arena' ? (
            /* ARENA: Streetwear — full black, huge punchy text, asymmetric */
            <section className="relative overflow-hidden bg-black border-b-4 border-[#22c55e]">
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-10">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover grayscale" />
                </div>
              )}
              <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-16 sm:py-20">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <span className="inline-block text-[#22c55e] text-[10px] font-black uppercase tracking-[0.4em] mb-3 border border-[#22c55e]/40 px-3 py-1">
                      {store.tagline || 'Limited Drops'}
                    </span>
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-black text-white leading-none uppercase tracking-tighter mb-6 font-mono">
                      {(custom.heroHeadline || store.name).split(' ').map((w: string, i: number) => (
                        <span key={i} className={`block ${i % 2 === 1 ? 'text-[#22c55e]' : ''}`}>{w}</span>
                      ))}
                    </h1>
                    <div className="flex flex-wrap gap-3 mt-4">
                      <button type="button" onClick={() => scrollToSection('catalog')}
                        className="px-8 py-3 bg-[#22c55e] text-black font-black text-xs uppercase tracking-widest hover:bg-white transition cursor-pointer">
                        {custom.heroCtaText || 'SHOP DROP'}
                      </button>
                      <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                        target="_blank" rel="noreferrer"
                        className="px-6 py-3 border border-white/30 text-white/70 text-xs font-bold uppercase tracking-widest hover:border-white hover:text-white transition flex items-center gap-2 cursor-pointer">
                        <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                      </a>
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end gap-3 text-right shrink-0">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-20 h-20 object-cover border-2 border-[#22c55e]/50 grayscale hover:grayscale-0 transition" />
                    ) : (
                      <div className="w-20 h-20 border-2 border-[#22c55e] text-[#22c55e] font-black text-2xl flex items-center justify-center font-mono">
                        {store.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="text-white/30 text-[10px] uppercase tracking-widest font-mono">{store.location || 'NG'}</span>
                  </div>
                </div>
              </div>
            </section>
          ) : activeThemeId === 'colette' ? (
            /* COLETTE: Beauty magazine — centered, rose gradient, circular avatar */
            <section
              className="relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, #881337 0%, #be123c 40%, #f43f5e 100%)` }}
            >
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-20">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center space-y-6">
                {/* Circular avatar */}
                <div className="flex justify-center">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} className="w-24 h-24 rounded-full object-cover ring-4 ring-white/40 shadow-2xl" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-white/20 text-white font-black text-2xl flex items-center justify-center ring-4 ring-white/40 font-serif">
                      {store.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-pink-200/80 text-[10px] uppercase tracking-[0.4em] font-bold mb-2">
                    {store.tagline || 'Beauty · Skincare · Fragrance'}
                  </p>
                  <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight font-serif">
                    {custom.heroHeadline || store.name}
                  </h1>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button type="button" onClick={() => scrollToSection('catalog')}
                    className="px-8 py-3 rounded-full bg-white text-rose-800 font-black text-xs uppercase tracking-widest shadow-xl hover:bg-rose-50 transition cursor-pointer">
                    {custom.heroCtaText || 'Shop Beauty'}
                  </button>
                  <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                    target="_blank" rel="noreferrer"
                    className="px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer">
                    <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" /><span>WhatsApp</span>
                  </a>
                </div>
                <div className="text-pink-200/60 text-[11px] flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{store.location || 'Nigeria'} · Accepting orders</span>
                </div>
              </div>
            </section>
          ) : activeThemeId === 'galactic' ? (
            /* GALACTIC: Dark catalog — sidebar-style top, product rows below */
            <section className="relative overflow-hidden bg-[#070b14] border-b border-indigo-900/50">
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-10">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8">
                {/* Top bar row */}
                <div className="py-10 flex flex-col md:flex-row items-center gap-8">
                  <div className="flex items-center gap-4 shrink-0">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-16 h-16 rounded-xl object-cover border border-indigo-500/30 shadow-xl shadow-indigo-900/50" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-indigo-950 border border-indigo-500/30 text-indigo-400 font-black text-xl flex items-center justify-center">
                        {store.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {custom.heroHeadline || store.name}
                      </h1>
                      <p className="text-indigo-400/70 text-xs mt-0.5">{store.tagline || 'Dark Catalog'}</p>
                    </div>
                  </div>
                  <div className="flex-1 hidden md:flex items-center gap-3 justify-center">
                    {/* Horizontal "category pills" as visual decorators */}
                    {['Electronics', 'Accessories', 'New Drops', 'Sale'].map((cat) => (
                      <span key={cat} onClick={() => scrollToSection('catalog')}
                        className="px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-[11px] font-bold uppercase tracking-wider cursor-pointer hover:border-indigo-500 hover:text-indigo-100 transition">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => scrollToSection('catalog')}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer">
                      {custom.heroCtaText || 'Browse All'}
                    </button>
                    <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                      target="_blank" rel="noreferrer"
                      className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-800 text-emerald-400 hover:bg-indigo-900 transition cursor-pointer">
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                {/* Bottom stats bar */}
                <div className="border-t border-indigo-900/50 py-4 flex flex-wrap items-center gap-6 text-[11px] text-indigo-400/70">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Catalog</span>
                  </div>
                  {store.location && <span>{store.location}</span>}
                  <span>WhatsApp Commerce · ₦ Accepted</span>
                </div>
              </div>
            </section>
          ) : activeThemeId === 'aurum' ? (
            /* AURUM: Jewellers boutique — near-black + gold bars, spotlight hero */
            <section
              className="relative overflow-hidden"
              style={{ backgroundColor: custom.heroBgColor || '#0c0d12' }}
            >
              {/* Gold top bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#78350f] via-[#f59e0b] to-[#78350f]" />
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-10">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-16 sm:py-24">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-20 h-20 rounded-full object-cover ring-2 ring-[#f59e0b]/50 shadow-2xl shadow-amber-900/40" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-amber-950/50 border-2 border-[#f59e0b]/40 text-[#f59e0b] font-black text-2xl flex items-center justify-center font-serif">
                        {store.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-[#f59e0b]/50 text-[10px] uppercase tracking-[0.5em] font-bold">
                    Fine Jewellery & Luxury Goods
                  </p>
                  <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight font-serif">
                    {custom.heroHeadline || store.name}
                  </h1>
                  <p className="text-white/40 text-sm max-w-md mx-auto">
                    {custom.heroSubtitle || store.tagline || 'Crafted for those who appreciate the extraordinary'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <button type="button" onClick={() => scrollToSection('catalog')}
                      className="px-8 py-3 bg-gradient-to-r from-[#b45309] to-[#f59e0b] text-black font-black text-xs uppercase tracking-widest rounded-sm hover:from-[#d97706] hover:to-[#fbbf24] transition cursor-pointer shadow-lg shadow-amber-900/40">
                      {custom.heroCtaText || 'View Collection'}
                    </button>
                    <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                      target="_blank" rel="noreferrer"
                      className="px-6 py-3 border border-[#f59e0b]/20 text-[#f59e0b]/70 text-xs font-bold uppercase tracking-widest hover:border-[#f59e0b]/50 hover:text-[#f59e0b] transition flex items-center gap-2 rounded-sm cursor-pointer">
                      <MessageCircle className="w-3.5 h-3.5" />Private Enquiry
                    </a>
                  </div>
                  {store.location && (
                    <p className="text-white/25 text-[11px] uppercase tracking-widest">{store.location}</p>
                  )}
                </div>
              </div>
              {/* Gold bottom bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-[#f59e0b]/40 to-transparent" />
            </section>
          ) : activeThemeId === 'cobalt' ? (
            /* COBALT: Bold e-commerce — blue bar hero, clean white body */
            <section className="relative overflow-hidden bg-[#1d4ed8]">
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-15">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  {/* Left */}
                  <div className="flex-1 text-left space-y-4">
                    <div className="flex items-center gap-3">
                      {store.logoUrl ? (
                        <img src={store.logoUrl} alt={store.name} className="w-12 h-12 rounded-xl object-cover bg-white/20 ring-2 ring-white/30" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white/20 text-white font-black text-lg flex items-center justify-center ring-2 ring-white/30">
                          {store.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                          {custom.heroHeadline || store.name}
                        </h1>
                        <p className="text-blue-200/70 text-xs">{store.tagline || store.location}</p>
                      </div>
                    </div>
                    <p className="text-blue-100/80 text-sm max-w-sm">
                      {custom.heroSubtitle || 'Premium products. Fast delivery. Direct WhatsApp checkout.'}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => scrollToSection('catalog')}
                        className="px-7 py-3 rounded-xl bg-white text-[#1d4ed8] font-black text-xs uppercase tracking-wider shadow-xl hover:bg-blue-50 transition cursor-pointer">
                        {custom.heroCtaText || 'Shop Now'}
                      </button>
                      <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                        target="_blank" rel="noreferrer"
                        className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 cursor-pointer">
                        <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" />WhatsApp Us
                      </a>
                    </div>
                  </div>
                  {/* Right: CTA stats */}
                  <div className="flex md:flex-col items-center gap-3 shrink-0">
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[100px]">
                      <span className="text-2xl font-black text-white block">100%</span>
                      <span className="text-blue-200/70 text-[10px] uppercase tracking-wider font-bold">Authentic</span>
                    </div>
                    <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center min-w-[100px]">
                      <span className="text-2xl font-black text-[#25D366] block">24/7</span>
                      <span className="text-blue-200/70 text-[10px] uppercase tracking-wider font-bold">Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : activeThemeId === 'maison' ? (
            /* MAISON: Quiet luxury — minimal white, generous whitespace, thin lines */
            <section
              className="relative overflow-hidden border-b border-stone-200"
              style={{ backgroundColor: custom.heroBgColor || '#faf9f7' }}
            >
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-8">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-12 py-20 sm:py-28">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div className="w-12 h-px bg-stone-400" />
                    <p className="text-stone-400 text-[10px] uppercase tracking-[0.4em] font-medium">
                      {store.tagline || 'Quiet Luxury · Carefully Curated'}
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-black text-stone-900 leading-tight tracking-tight font-serif">
                      {custom.heroHeadline || store.name}
                    </h1>
                    <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
                      {custom.heroSubtitle || 'Every piece thoughtfully selected. Every detail considered.'}
                    </p>
                    <div className="flex flex-wrap gap-4 pt-2">
                      <button type="button" onClick={() => scrollToSection('catalog')}
                        className="px-8 py-3 bg-stone-900 text-white font-bold text-xs uppercase tracking-widest hover:bg-stone-800 transition cursor-pointer">
                        {custom.heroCtaText || 'Explore'}
                      </button>
                      <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                        target="_blank" rel="noreferrer"
                        className="px-6 py-3 border border-stone-300 text-stone-600 font-medium text-xs uppercase tracking-widest hover:border-stone-500 hover:text-stone-900 transition flex items-center gap-2 cursor-pointer">
                        <MessageCircle className="w-3.5 h-3.5" />Enquire
                      </a>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-4">
                    {store.logoUrl ? (
                      <img src={store.logoUrl} alt={store.name} className="w-32 h-32 object-cover border border-stone-200 shadow-md" style={{ borderRadius: '0' }} />
                    ) : (
                      <div className="w-32 h-32 bg-stone-100 border border-stone-200 text-stone-400 font-black text-3xl flex items-center justify-center font-serif">
                        {store.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="text-right space-y-1">
                      <p className="text-stone-400 text-[10px] uppercase tracking-widest">{store.location || 'Nigeria'}</p>
                      <div className="flex items-center gap-1 justify-end text-emerald-600 text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /><span>Taking orders</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : activeThemeId === 'mercato' ? (
            /* MERCATO: Modern marketplace — white header, search-style hero */
            <section
              className="relative overflow-hidden border-b border-slate-200"
              style={{ backgroundColor: '#f8fafc' }}
            >
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-5">
                  <img src={store.bannerUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div
                className="relative z-10 py-10 sm:py-14 px-4 sm:px-6 text-center space-y-5"
                style={{ background: `linear-gradient(180deg, ${custom.heroBgColor || store.accentColor || '#1e40af'}15 0%, transparent 100%)` }}
              >
                <div className="flex justify-center">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shadow-md" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: store.accentColor || '#1e40af' }}>
                      {store.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    {custom.heroHeadline || store.name}
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {custom.heroSubtitle || store.tagline || 'Your trusted marketplace'}
                  </p>
                </div>
                {/* Search-style CTA bar */}
                <div className="max-w-xl mx-auto flex gap-2">
                  <button type="button" onClick={() => scrollToSection('catalog')}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white shadow-md hover:opacity-90 transition cursor-pointer"
                    style={{ backgroundColor: store.accentColor || '#1e40af' }}>
                    {custom.heroCtaText || 'Browse Products →'}
                  </button>
                  <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `Hello ${store.name}!`)}
                    target="_blank" rel="noreferrer"
                    className="px-4 py-3 rounded-xl bg-[#25D366] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-[#20ba59] transition shrink-0">
                    <MessageCircle className="w-4 h-4 fill-white" /><span className="hidden sm:inline">WhatsApp</span>
                  </a>
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-[11px] text-slate-400">
                  {store.location && <span>📍 {store.location}</span>}
                  <span className="flex items-center gap-1 text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Open for orders</span>
                </div>
              </div>
            </section>
          ) : (
            /* DEFAULT / CLASSIC-STYLE MODERN HERO (Mercato fallback & all other themes) */
            <section
              className="relative text-white overflow-hidden py-14 sm:py-20 px-4 sm:px-6 transition-colors shadow-inner"
              style={{ backgroundColor: custom.heroBgColor || store.accentColor || '#a84a32' }}
            >
              {store.bannerUrl && (
                <div className="absolute inset-0 z-0 opacity-20">
                  <img src={store.bannerUrl} alt={store.name} className="w-full h-full object-cover" loading="eager" />
                </div>
              )}
              <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
                <div className="flex items-center justify-center gap-2.5">
                  {store.logoUrl ? (
                    <img src={store.logoUrl} alt={store.name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-2xl bg-white/20 ring-4 ring-white/30" />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 text-white font-black text-2xl flex items-center justify-center shadow-xl ring-4 ring-white/30">
                      {store.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-sm ${fontClass}`}>
                    {custom.heroHeadline || store.name}
                  </h1>
                  <p className="text-xs sm:text-sm uppercase tracking-widest text-white/80 font-bold max-w-xl mx-auto">
                    {custom.heroSubtitle || store.tagline || 'TASTEFUL PIECES FOR EVERY OCCASION'}
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button type="button" onClick={() => scrollToSection('catalog')}
                    className="px-8 py-3 rounded-full bg-white text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl hover:bg-slate-100 transition active:scale-95 cursor-pointer">
                    {custom.heroCtaText || 'Shop Now'}
                  </button>
                  <a href={generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, `👋 Hello ${store.name}! I am browsing your catalog at ${window.location.origin}?store=${store.slug} and would like to ask a question.`)}
                    target="_blank" rel="noreferrer"
                    className="px-5 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2 backdrop-blur-xs">
                    <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
                    <span>Chat on WhatsApp</span>
                  </a>
                  <button type="button" onClick={() => { setShareTargetProduct(undefined); setIsShareOpen(true); }}
                    className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer" title="Share store link & QR code">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-xs text-white/80">
                  {store.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-white/90 shrink-0" />
                      <span>{store.location}</span>
                    </div>
                  )}
                  {store.openHours ? (
                    <div className="flex items-center gap-1 font-medium">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${store.openHours.isOpenNow ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                      <span>{store.openHours.isOpenNow ? 'Open now' : 'Closed'} · {store.openHours.label}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 font-medium text-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Accepting WhatsApp orders</span>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Collections Gallery */}
          {featuredCollections.length > 0 && custom.showCollections !== false && (
            <section id="collections" className={`py-12 border-b ${isDarkTheme ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="text-center mb-8">
                  <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-900'} ${fontClass}`}>
                    Our Collections
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                    Timeless pieces, curated with care
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featuredCollections.map((col) => (
                    <div
                      key={col.name}
                      onClick={() => {
                        setSelectedCategory(col.name);
                        scrollToSection('catalog');
                      }}
                      className="group relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-2xs hover:shadow-lg transition cursor-pointer bg-slate-900"
                    >
                      <div className="h-44 sm:h-52 w-full overflow-hidden">
                        <img
                          src={col.sampleProduct?.images[0] || 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80'}
                          alt={col.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-90"
                        />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-3.5 text-white">
                        <h3 className="font-bold text-sm sm:text-base leading-tight drop-shadow-sm">{col.name}</h3>
                        <p className="text-[11px] text-slate-300 mt-0.5">{col.count} Product{col.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      scrollToSection('catalog');
                    }}
                    className={`px-6 py-2.5 rounded-full border transition text-xs font-bold uppercase tracking-wider cursor-pointer ${
                      isDarkTheme
                        ? 'border-slate-700 text-slate-200 hover:bg-white hover:text-slate-950'
                        : 'border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    View All Products
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Promotional Banner */}
          {(custom.promoBannerEnabled || false) && (
            <section
              className="py-10 px-4 sm:px-6 text-white text-center transition-colors"
              style={{ backgroundColor: custom.heroBgColor || store.accentColor || '#a84a32' }}
            >
              <div className="max-w-3xl mx-auto space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full inline-block">
                  LIMITED TIME
                </span>
                <h3 className={`text-2xl sm:text-3xl font-black tracking-tight ${fontClass}`}>
                  {custom.promoBannerText || 'Save big across our latest arrivals!'}
                </h3>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToSection('catalog')}
                    className="px-6 py-2.5 rounded-full bg-white text-slate-900 text-xs font-bold uppercase tracking-wider shadow hover:bg-slate-100 transition cursor-pointer"
                  >
                    {custom.promoBannerCta || 'Shop The Sale →'}
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Trust Guarantees Row */}
          {custom.showTrustBadges !== false && (
            <section id="trust" className={`py-8 border-b ${isDarkTheme ? 'bg-slate-900/50 border-slate-800' : 'bg-[#fafafa] border-slate-200/80'}`}>
              <div className="max-w-5xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {custom.whyChooseUs && custom.whyChooseUs.length === 4 ? (
                    custom.whyChooseUs.map((w, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5 p-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                          {i === 0 ? (
                            <PackageCheck className="w-5 h-5 text-amber-600" />
                          ) : i === 1 ? (
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          ) : i === 2 ? (
                            <Headphones className="w-5 h-5 text-blue-600" />
                          ) : (
                            <CreditCard className="w-5 h-5 text-violet-600" />
                          )}
                        </div>
                        <h4 className={`text-[11px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                          {w.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {w.subtitle}
                        </p>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-1.5 p-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                          <PackageCheck className="w-5 h-5 text-amber-600" />
                        </div>
                        <h4 className={`text-[11px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                          {custom.trustBadge1Title || 'PACKAGED WITH CARE'}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {custom.trustBadge1Subtitle || 'Carefully inspected before dispatch'}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <h4 className={`text-[11px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                          {custom.trustBadge2Title || 'AUTHENTIC GUARANTEE'}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {custom.trustBadge2Subtitle || '100% genuine products directly sourced'}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                          <Headphones className="w-5 h-5 text-blue-600" />
                        </div>
                        <h4 className={`text-[11px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                          {custom.trustBadge3Title || 'DIRECT WHATSAPP SUPPORT'}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {custom.trustBadge3Subtitle || 'Fast assistance from our friendly team'}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 p-3">
                        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                          <CreditCard className="w-5 h-5 text-violet-600" />
                        </div>
                        <h4 className={`text-[11px] font-black uppercase tracking-wider ${isDarkTheme ? 'text-white' : 'text-slate-900'}`}>
                          {custom.trustBadge4Title || 'SECURE PAYMENTS'}
                        </h4>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          {custom.trustBadge4Subtitle || 'Bank transfer & instant invoice receipts'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── PROMO BANNERS SHOWCASE (3-Slot Grid) ── */}
      {custom.showPromoCards !== false && custom.promoBanners && custom.promoBanners.some((b) => b.imageUrl || b.title) && (
        <section className="py-6 bg-slate-50/70 border-b border-slate-200/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {custom.promoBanners.map((banner, idx) => {
                if (!banner.imageUrl && !banner.title) return null;
                const isLight = banner.textContrast !== 'dark';
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (banner.categoryLink && banner.categoryLink !== 'All') {
                        setSelectedCategory(banner.categoryLink);
                      }
                      scrollToSection('catalog');
                    }}
                    className="group relative h-48 sm:h-52 rounded-2xl overflow-hidden cursor-pointer shadow-2xs hover:shadow-md transition duration-300 border border-slate-200/80 bg-slate-900"
                  >
                    {(() => {
                      const curatedFallbacks = [
                        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
                        'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
                        'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=800&q=80',
                      ];
                      const imgSrc = banner.imageUrl || products[idx]?.images?.[0] || curatedFallbacks[idx % curatedFallbacks.length];
                      return (
                        <img
                          src={imgSrc}
                          alt={banner.title || 'Promo banner'}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      );
                    })()}
                    <div
                      className={`absolute inset-0 ${
                        isLight
                          ? 'bg-gradient-to-t from-black/85 via-black/40 to-transparent text-white'
                          : 'bg-gradient-to-t from-white/95 via-white/50 to-transparent text-slate-900'
                      } p-4 sm:p-5 flex flex-col justify-end transition-opacity`}
                    >
                      {banner.eyebrow && (
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-90 mb-1">
                          {banner.eyebrow}
                        </span>
                      )}
                      {banner.title && (
                        <h4 className="text-base sm:text-lg font-black leading-tight line-clamp-2 mb-2">
                          {banner.title}
                        </h4>
                      )}
                      {banner.buttonLabel && (
                        <div className="flex items-center gap-1 text-xs font-bold underline underline-offset-4 group-hover:translate-x-1 transition-transform">
                          <span>{banner.buttonLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area: Catalog Section */}
      <main id="catalog" className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        {/* ── PINNED FEATURED PRODUCTS (Editor's Picks) ── */}
        {featuredProductsList.length > 0 && (
          <section className="mb-10 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </span>
                <div>
                  <h3 className={`text-base sm:text-lg font-black text-slate-900 tracking-tight ${fontClass}`}>
                    Featured Picks
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Hand-selected by {store.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {featuredProductsList.map((p, idx) => (
                <ProductCard
                  key={`featured-${p.id}`}
                  product={p}
                  store={store}
                  index={idx}
                  onOpenDetails={(item) => {
                    setSelectedProduct(item);
                    setIsDetailOpen(true);
                  }}
                  onQuickWhatsApp={(item) => {
                    handleAddToCart(item);
                    setIsCartOpen(true);
                  }}
                  onAddToCart={(item, v) => {
                    handleAddToCart(item, v);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* Search & Category Tabs Bar */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search by product name, category, or Item UID (e.g. #TA-BR540)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent shadow-2xs font-sans"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* In-Stock Filter Toggle */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 select-none cursor-pointer hover:bg-slate-50 transition shrink-0">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(e) => setOnlyInStock(e.target.checked)}
                className="rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <span>In-Stock Only</span>
            </label>
          </div>

          {/* Direct Item UID Match Banner */}
          {directUidMatch && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-2xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-xl bg-emerald-700 text-white font-mono text-xs font-bold tracking-tight shrink-0">
                  #{directUidMatch.uid}
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="truncate">{directUidMatch.name}</span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded-full font-semibold">
                      Exact UID Match
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-900 font-mono mt-0.5">
                    {formatPrice(directUidMatch.price, store.currencySymbol)} • {directUidMatch.inStock ? 'Ready for WhatsApp Order' : 'Sold Out'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedProduct(directUidMatch);
                  setIsDetailOpen(true);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shrink-0"
              >
                View Item
              </button>
            </div>
          )}

          {/* Category Chips Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium shrink-0 transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Store Owner Preview Banner: Notice if products beyond 4 are paused */}
        {isStoreOwner && (planStatus.hasExpiredPastGrace || store.tier === 'free') && products.length > 4 && (
          <div className="mb-4 bg-amber-50 border border-amber-300 rounded-2xl p-3.5 text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">👁️</span>
              <div>
                <strong className="block font-bold">Owner Preview Mode</strong>
                <span className="text-[11px] text-amber-800">
                  You see all {products.length} products. Public buyers only see the first 4 products because the store is on the Free plan (or plan expired).
                </span>
              </div>
            </div>
            {onOpenDashboard && (
              <button
                onClick={() => onOpenDashboard()}
                className="px-3 py-1.5 bg-slate-900 text-white font-bold text-[11px] rounded-xl shrink-0 cursor-pointer hover:bg-slate-800 transition"
              >
                Upgrade to Unpause All →
              </button>
            )}
          </div>
        )}

        {/* Catalog Products Grid */}
        {isLoadingProducts && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5 animate-in fade-in duration-200">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs flex flex-col animate-pulse"
              >
                {/* 3:4 aspect ratio image shimmer */}
                <div className="w-full bg-slate-200/70 relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.4s_infinite]" />
                </div>
                {/* Product details shimmer */}
                <div className="p-3 sm:p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-3.5 bg-slate-200/80 rounded-md w-4/5" />
                    <div className="h-2.5 bg-slate-100 rounded-md w-2/5" />
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <div className="h-4 bg-slate-200/80 rounded-md w-1/2" />
                    <div className="h-7 w-7 bg-slate-200/60 rounded-xl shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200/80 p-8 space-y-4 animate-in fade-in duration-300">
            {/* Branded empty state */}
            <div className="mx-auto w-20 h-20 relative">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <ShoppingBag className="w-9 h-9 text-amber-400" />
              </div>
              <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-base font-black border-2 border-white">?</span>
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-lg">
                Nothing found{searchQuery ? ` for "${searchQuery}"` : ''}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                {selectedCategory !== 'All'
                  ? `No ${selectedCategory} items right now.`
                  : 'Try a different search — or ask the seller directly on WhatsApp.'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setOnlyInStock(false);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Clear Filters
              </button>
              <a
                href={`https://wa.me/${store.whatsappCountryCode.replace('+', '')}${store.whatsappNumber}?text=${encodeURIComponent(
                  `Hi ${store.name}! I was searching for "${searchQuery || selectedCategory}" but didn't find it. Do you have it?`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Ask the Seller on WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
            {visibleProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                store={store}
                index={idx}
                onOpenDetails={(p) => {
                  setSelectedProduct(p);
                  setIsDetailOpen(true);
                }}
                onQuickWhatsApp={(p) => {
                  handleAddToCart(p);
                  setIsCartOpen(true);
                }}
                onAddToCart={(p, v) => {
                  handleAddToCart(p, v);
                }}
              />
            ))}
          </div>
        )}

        {/* Social Proof & Customer Reviews Section */}
        {custom.showCustomerReviews !== false && (
          <section id="reviews" className="mt-16 pt-10 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight flex items-center gap-2">
                  <span>Customer Reviews & Feedback</span>
                  <span className="text-amber-500 flex items-center text-sm font-semibold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" />{' '}
                    {activeReviews.length > 0
                      ? (activeReviews.reduce((sum, r) => sum + r.rating, 0) / activeReviews.length).toFixed(1)
                      : '5.0'}
                  </span>
                </h3>
                {custom.reviewsQuoteSnippet ? (
                  <p className="text-xs font-semibold text-slate-600 italic mt-0.5">
                    "{custom.reviewsQuoteSnippet}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">Verified buyer ratings from orders & delivery</p>
                )}
              </div>

              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-transform active:scale-95 shrink-0 self-start sm:self-auto"
              >
                <Star className="w-3.5 h-3.5 fill-slate-950" />
                <span>Leave a Review</span>
              </button>
            </div>

            {activeReviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-0.5 text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400">{rev.date}</span>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-700 italic leading-relaxed">
                          "{rev.comment}"
                        </p>
                      )}

                      {/* Customer Photo of what they received */}
                      {rev.customerPhotoUrl && (
                        <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                          <img
                            src={rev.customerPhotoUrl}
                            alt="Customer item received"
                            className="w-full h-36 object-cover hover:scale-105 transition-transform"
                          />
                          <div className="px-2 py-1 bg-white/95 text-[10px] font-semibold text-emerald-700 border-t border-slate-100 flex items-center gap-1">
                            <span>📸 Photo of item received</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-900 flex items-center gap-1">
                        {rev.author}
                        {rev.customerPhotoUrl && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded-full">
                            📷 Photo
                          </span>
                        )}
                      </span>
                      {rev.productName && (
                        <span className="text-slate-400 truncate max-w-[120px]">{rev.productName}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-600">No reviews posted yet.</p>
                <button
                  onClick={() => setIsReviewModalOpen(true)}
                  className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer underline"
                >
                  Be the first to leave a review!
                </button>
              </div>
            )}
          </section>
        )}

        {/* How Ordering Works & Policies */}
        <section className="mt-12 bg-white rounded-2xl p-6 border border-slate-200/80">
          <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>How to Order on {store.name}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block text-xs">1. Choose & Customize</span>
              <p>Browse the catalog, pick your preferred size, variant, or add multiple items to your bag.</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block text-xs">2. 1-Click WhatsApp Chat</span>
              <p>Click "Order on WhatsApp". An automatic prefilled message with your item and link opens in chat.</p>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block text-xs">3. Confirm & Receive</span>
              <p>{store.deliveryInfo || 'Fast same-day and nationwide dispatch with tracking.'}</p>
            </div>
          </div>
        </section>

        {/* ── ABOUT US & BRAND STORY SECTION ── */}
        {(custom.aboutStory || store.description || isStoreOwner) && (
          <section id="about" className="mt-16 py-12 px-6 sm:px-12 bg-white rounded-3xl border border-slate-200/80 text-center shadow-2xs space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">
              {custom.aboutTagline || 'OUR STORY'}
            </span>
            <h3 className={`text-2xl sm:text-3xl font-black text-slate-900 tracking-tight ${fontClass}`}>
              {custom.aboutTitle || `About ${store.name}`}
            </h3>
            <div className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3 font-normal">
              {custom.aboutStory || store.description ? (
                <p className={!isAboutExpanded ? 'line-clamp-3 sm:line-clamp-4' : ''}>
                  {custom.aboutStory || store.description}
                </p>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 text-xs">
                  <span>No story added yet. Customize your origin story in Dashboard → Manage Storefront.</span>
                </div>
              )}
              {custom.aboutImageUrl && (
                <div className="pt-3 max-w-md mx-auto rounded-2xl overflow-hidden shadow-sm">
                  <img src={custom.aboutImageUrl} alt={store.name} className="w-full h-48 object-cover" />
                </div>
              )}
            </div>
            {(custom.aboutStory || store.description) && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsAboutExpanded(!isAboutExpanded)}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  <span>{isAboutExpanded ? 'Read Less' : 'Read More →'}</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── FOLLOW US & CONNECT SECTION (Inspired by Image 3) ── */}
        <section id="contact" className="mt-12 py-10 text-center space-y-4">
          <h4 className={`text-xl sm:text-2xl font-black text-slate-900 tracking-tight ${fontClass}`}>
            Follow us
          </h4>
          <p className="text-xs text-slate-400">Stay updated with new drops, behind the scenes &amp; private discounts.</p>

          <div className="flex items-center justify-center gap-3 pt-1">
            {(() => {
              const ig = parseSocialLink('instagram', store.socialLinks?.instagram);
              const tt = parseSocialLink('tiktok', store.socialLinks?.tiktok);
              const fb = parseSocialLink('facebook', store.socialLinks?.facebook);
              const tw = parseSocialLink('twitter', store.socialLinks?.twitter);

              return (
                <>
                  {ig && (
                    <a
                      href={ig.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-white border border-slate-200 text-pink-600 hover:shadow-md hover:scale-105 transition"
                      title="Follow on Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {tt && (
                    <a
                      href={tt.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-900 hover:shadow-md hover:scale-105 transition"
                      title="Follow on TikTok"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.43 6.3 6.3 0 0 0 1.93-4.52V8.58a8.28 8.28 0 0 0 4.8 1.54V6.69z" />
                      </svg>
                    </a>
                  )}
                  {fb && (
                    <a
                      href={fb.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-white border border-slate-200 text-blue-600 hover:shadow-md hover:scale-105 transition"
                      title="Follow on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {tw && (
                    <a
                      href={tw.url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-3 rounded-2xl bg-white border border-slate-200 text-sky-500 hover:shadow-md hover:scale-105 transition"
                      title="Follow on Twitter / X"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}

                  {/* WhatsApp Direct */}
                  <a
                    href={generateWhatsAppLink(
                      store.whatsappCountryCode,
                      store.whatsappNumber,
                      `👋 Hello ${store.name}! I would like to make an inquiry.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-2xl bg-[#25D366] text-white hover:shadow-md hover:scale-105 transition"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </>
              );
            })()}
          </div>
        </section>

        {/* Footer & Platform Branding */}
        <footer className="mt-16 text-center text-xs text-slate-400 space-y-4">
          {/* Explore Stores & Platform Hub — Hidden for Gold Tick Business & Enterprise Plan stores */}
          {store.tier !== 'business' && store.tier !== 'enterprise' && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {onOpenLanding && (
                <button
                  onClick={onOpenLanding}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md shadow-slate-900/10 transition active:scale-95 cursor-pointer"
                  title="Explore all stores on Tá.shop"
                >
                  <div className="w-5 h-5 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                    Tá
                  </div>
                  <span>Explore Stores on Tá.shop</span>
                </button>
              )}

              <button
                onClick={onOpenCreateStore}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-2xl text-slate-700 font-semibold text-xs transition cursor-pointer border border-slate-200"
              >
                <span>⚡ Powered by <strong>Tá.shop</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-bold">Launch your store</span>
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} {store.name}</span>
            {store.tier !== 'business' && store.tier !== 'enterprise' && onOpenLanding && (
              <>
                <span>•</span>
                <button
                  onClick={onOpenLanding}
                  className="text-slate-700 hover:text-slate-900 font-semibold underline cursor-pointer"
                >
                  Explore Stores
                </button>
              </>
            )}
            {onOpenLogin && (
              <>
                <span>•</span>
                <button
                  onClick={onOpenLogin}
                  className="text-slate-700 hover:text-slate-900 font-semibold underline cursor-pointer"
                >
                  Seller Login
                </button>
              </>
            )}
            {onOpenLegal && (
              <>
                <span>•</span>
                <button
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-slate-900 transition cursor-pointer"
                >
                  Terms
                </button>
                <span>•</span>
                <button
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-slate-900 transition cursor-pointer"
                >
                  Privacy
                </button>
                <span>•</span>
                <button
                  onClick={() => onOpenLegal('cookies')}
                  className="hover:text-slate-900 transition cursor-pointer"
                >
                  Cookies
                </button>
              </>
            )}
          </div>
        </footer>
      </main>

      {/* Floating WhatsApp Bag Button (Sticky at bottom right on desktop, docked bar on mobile) */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-3 sm:p-0 sm:bottom-6 sm:right-6 sm:left-auto sm:inset-x-auto z-40 bg-gradient-to-t from-white/95 via-white/80 to-transparent sm:bg-none pb-safe sm:pb-0 pointer-events-none">
          <button
            onClick={() => setIsCartOpen(true)}
            className="pointer-events-auto w-full sm:w-auto bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da851] text-white py-3.5 sm:py-3 px-5 rounded-2xl shadow-xl shadow-emerald-500/30 font-bold text-xs sm:text-sm flex items-center justify-between sm:justify-start gap-3 transition-transform active:scale-[0.98] cursor-pointer animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#25D366]">
                  {totalCartCount}
                </span>
              </div>
              <span className="font-sans font-bold">
                View Cart ({totalCartCount} item{totalCartCount > 1 ? 's' : ''})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-xs sm:text-sm bg-white/20 px-2 py-0.5 rounded-lg">
                {formatPrice(totalCartAmount, store.currencySymbol)}
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
        store={store}
        onOrderWhatsApp={(prod, variant) => {
          setIsDetailOpen(false);
          handleAddToCart(prod, variant);
          setIsCartOpen(true);
        }}
        onAddToCart={(prod, variant) => {
          handleAddToCart(prod, variant);
        }}
        onShareProduct={(prod) => {
          setShareTargetProduct(prod);
          setIsShareOpen(true);
        }}
      />

      {/* WhatsApp Cart Drawer */}
      <WhatsAppCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        store={store}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onOrderPlaced={() => {
          if (onRefreshData) onRefreshData();
        }}
      />

      {/* WhatsApp Message Preview Modal */}
      <WhatsAppPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        store={store}
        messageText={pendingWhatsAppMessage}
        onConfirmSend={handleConfirmSendInquiry}
      />

      {/* Social Share & QR Modal */}
      <SocialShareModal
        isOpen={isShareOpen}
        onClose={() => {
          setIsShareOpen(false);
          setShareTargetProduct(undefined);
        }}
        store={store}
        product={shareTargetProduct}
      />

      {/* Customer Review & Photo Feedback Modal */}
      <CustomerReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        store={store}
        products={products}
        onReviewSubmitted={(newRev) => {
          setActiveReviews((prev) => [newRev, ...prev]);
        }}
      />

      {/* Floating AI Shopping Assistant Bubble (Strictly for this store - locked for free and starter) */}
      {/* key={store.id} forces full unmount+remount on store change → resets all chat state */}
      {store.tier !== 'free' && store.tier !== 'starter' && (
        <StoreAIBotBubble
          key={store.id}
          store={store}
          products={products}
          onOpenProductDetail={(prod) => {
            setSelectedProduct(prod);
            setIsDetailOpen(true);
          }}
        />
      )}
    </div>
  );
};
