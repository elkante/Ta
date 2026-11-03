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
import { CartItem, Product, ProductVariant, Store, StoreReview } from '../../types';
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
  const fontClass =
    custom.fontFamily === 'serif'
      ? 'font-serif'
      : custom.fontFamily === 'grotesk'
      ? 'font-mono'
      : 'font-sans';

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

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

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
    <div id="top" className="min-h-screen bg-[#fafbfc] text-slate-900 pb-28 sm:pb-24 overflow-x-hidden w-full max-w-full">
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

      {/* ── TOP NAVIGATION BAR (Orderly-inspired bespoke boutique nav) ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-shadow shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Store Name */}
          <button
            type="button"
            onClick={() => scrollToSection('top')}
            className="flex items-center gap-2.5 cursor-pointer text-left group"
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
              <span className={`font-black text-base tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors ${fontClass}`}>
                {store.name}
              </span>
              <VerifiedBadge tier={store.tier} verified={store.verified} size="xs" />
            </div>
          </button>

          {/* Center Navigation Links (Desktop) */}
          {custom.showNavLinks !== false && (
            <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-slate-600">
              <button
                type="button"
                onClick={() => scrollToSection('top')}
                className="hover:text-slate-950 transition cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('catalog')}
                className="hover:text-slate-950 transition cursor-pointer"
              >
                Shop
              </button>
              {featuredCollections.length > 0 && (
                <button
                  type="button"
                  onClick={() => scrollToSection('collections')}
                  className="hover:text-slate-950 transition cursor-pointer"
                >
                  Collections
                </button>
              )}
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="hover:text-slate-950 transition cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('reviews')}
                className="hover:text-slate-950 transition cursor-pointer"
              >
                Reviews
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="hover:text-slate-950 transition cursor-pointer"
              >
                Contact
              </button>
            </nav>
          )}

          {/* Right Action Icons (Search trigger, Cart Bag with badge, Mobile menu) */}
          <div className="flex items-center gap-2 sm:gap-3">
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

            {/* Cart / Bag Icon with Badge */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 transition cursor-pointer flex items-center justify-center"
              title="View Cart"
            >
              <ShoppingBag className="w-4 h-4" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-xs animate-in zoom-in">
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Dropdown */}
        {isMobileNavOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-2 animate-in slide-in-from-top-2 duration-150">
            <button
              type="button"
              onClick={() => scrollToSection('top')}
              className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('catalog')}
              className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Shop All Products
            </button>
            {featuredCollections.length > 0 && (
              <button
                type="button"
                onClick={() => scrollToSection('collections')}
                className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 cursor-pointer"
              >
                Collections
              </button>
            )}
            <button
              type="button"
              onClick={() => scrollToSection('about')}
              className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              About {store.name}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('reviews')}
              className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Customer Reviews
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="w-full text-left py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-950 cursor-pointer"
            >
              Contact &amp; Location
            </button>
            {isStoreOwner && onOpenDashboard && (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="w-full text-left py-2 text-xs font-bold text-blue-600 cursor-pointer"
              >
                Go to Seller Dashboard →
              </button>
            )}
          </div>
        )}
      </header>

      {/* Paused Store Banner */}
      {store.isPublished === false && !isStoreOwner && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2">
          <span>⚠️ {store.name} is currently updating their store. You can still message the seller on WhatsApp!</span>
        </div>
      )}

      {/* ── CUSTOMIZABLE HERO BANNER (Inspired by Solar Haven in Image 3) ── */}
      <section
        className="relative text-white overflow-hidden py-14 sm:py-20 px-4 sm:px-6 transition-colors"
        style={{
          backgroundColor: custom.heroBgColor || store.accentColor || '#a84a32',
        }}
      >
        {/* Subtle patterned overlay or cover banner image */}
        {store.bannerUrl && (
          <div className="absolute inset-0 z-0 opacity-20">
            <img
              src={store.bannerUrl}
              alt={store.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4">
          {/* Store Logo & Verified Tick */}
          <div className="flex items-center justify-center gap-2.5">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-2xl bg-white/20 ring-4 ring-white/30"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 text-white font-black text-2xl flex items-center justify-center shadow-xl ring-4 ring-white/30">
                {store.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Store Headline Title */}
          <div className="space-y-1">
            <h1 className={`text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-white drop-shadow-sm ${fontClass}`}>
              {custom.heroHeadline || store.name}
            </h1>
            <p className="text-xs sm:text-sm uppercase tracking-widest text-white/80 font-bold max-w-xl mx-auto">
              {custom.heroSubtitle || store.tagline || 'TASTEFUL PIECES FOR EVERY OCCASION'}
            </p>
          </div>

          {/* Call to action button */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => scrollToSection('catalog')}
              className="px-8 py-3 rounded-full bg-white text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            >
              {custom.heroCtaText || 'Shop Now'}
            </button>

            <a
              href={generateWhatsAppLink(
                store.whatsappCountryCode,
                store.whatsappNumber,
                `👋 Hello ${store.name}! I am browsing your catalog at ${window.location.origin}?store=${store.slug} and would like to ask a question.`
              )}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2 backdrop-blur-xs"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366] fill-[#25D366]" />
              <span>Chat on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setShareTargetProduct(undefined);
                setIsShareOpen(true);
              }}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="Share store link & QR code"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {/* Meta badges: Location & Open hours */}
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

      {/* ── OUR COLLECTIONS SECTION (Featured Categories Showcase) ── */}
      {featuredCollections.length > 0 && (
        <section id="collections" className="py-12 bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className={`text-2xl sm:text-3xl font-black text-slate-900 tracking-tight ${fontClass}`}>
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
                className="px-6 py-2.5 rounded-full border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                View All Products
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── PROMOTIONAL HIGHLIGHT BANNER (If Enabled) ── */}
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

      {/* ── TRUST GUARANTEES ROW (PACKAGED WITH CARE, AUTHENTIC, SUPPORT, PAYMENTS) ── */}
      {custom.showTrustBadges !== false && (
        <section id="trust" className="py-8 bg-[#fafafa] border-b border-slate-200/80">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {/* Badge 1 */}
              <div className="flex flex-col items-center gap-1.5 p-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <PackageCheck className="w-5 h-5 text-amber-600" />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  {custom.trustBadge1Title || 'PACKAGED WITH CARE'}
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {custom.trustBadge1Subtitle || 'Carefully inspected before dispatch'}
                </p>
              </div>

              {/* Badge 2 */}
              <div className="flex flex-col items-center gap-1.5 p-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  {custom.trustBadge2Title || 'AUTHENTIC GUARANTEE'}
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {custom.trustBadge2Subtitle || '100% genuine products directly sourced'}
                </p>
              </div>

              {/* Badge 3 */}
              <div className="flex flex-col items-center gap-1.5 p-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <Headphones className="w-5 h-5 text-blue-600" />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  {custom.trustBadge3Title || 'DIRECT WHATSAPP SUPPORT'}
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {custom.trustBadge3Subtitle || 'Fast assistance from our friendly team'}
                </p>
              </div>

              {/* Badge 4 */}
              <div className="flex flex-col items-center gap-1.5 p-3">
                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs">
                  <CreditCard className="w-5 h-5 text-violet-600" />
                </div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900">
                  {custom.trustBadge4Title || 'SECURE PAYMENTS'}
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {custom.trustBadge4Subtitle || 'Bank transfer & instant invoice receipts'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area: Catalog Section */}
      <main id="catalog" className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
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
              <p className="text-xs text-slate-500">Verified buyer ratings from orders & delivery</p>
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

        {/* ── ABOUT US & BRAND STORY SECTION (Inspired by Image 3) ── */}
        <section id="about" className="mt-16 py-12 px-6 sm:px-12 bg-white rounded-3xl border border-slate-200/80 text-center shadow-2xs space-y-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 block">
            {custom.aboutTagline || 'OUR STORY'}
          </span>
          <h3 className={`text-2xl sm:text-3xl font-black text-slate-900 tracking-tight ${fontClass}`}>
            {custom.aboutTitle || `About ${store.name}`}
          </h3>
          <div className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed space-y-3 font-normal">
            <p className={!isAboutExpanded ? 'line-clamp-3 sm:line-clamp-4' : ''}>
              {custom.aboutStory ||
                store.description ||
                `${store.name} was established with a singular vision: to bring customers thoughtfully curated, reliable products that elevate everyday lifestyle. Each product in our collection is carefully inspected and packaged to guarantee 100% satisfaction upon delivery.`}
            </p>
            {custom.aboutImageUrl && (
              <div className="pt-3 max-w-md mx-auto rounded-2xl overflow-hidden shadow-sm">
                <img src={custom.aboutImageUrl} alt={store.name} className="w-full h-48 object-cover" />
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => setIsAboutExpanded(!isAboutExpanded)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <span>{isAboutExpanded ? 'Read Less' : 'Read More →'}</span>
            </button>
          </div>
        </section>

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
          {/* Explore Stores & Platform Hub — Hidden for Gold Tick Business Plan stores */}
          {store.tier !== 'business' && (
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
            {store.tier !== 'business' && onOpenLanding && (
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

      {/* Floating AI Shopping Assistant Bubble (Strictly for this store) */}
      {/* key={store.id} forces full unmount+remount on store change → resets all chat state */}
      <StoreAIBotBubble
        key={store.id}
        store={store}
        products={products}
        onOpenProductDetail={(prod) => {
          setSelectedProduct(prod);
          setIsDetailOpen(true);
        }}
      />
    </div>
  );
};
