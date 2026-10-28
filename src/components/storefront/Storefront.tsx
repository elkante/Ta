import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Filter,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  Phone,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { CartItem, Product, ProductVariant, Store, StoreReview } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductDetailModal } from './ProductDetailModal';
import { WhatsAppCartDrawer } from './WhatsAppCartDrawer';
import { StoreAIBotBubble } from './StoreAIBotBubble';
import { WhatsAppPreviewModal } from '../modals/WhatsAppPreviewModal';
import { SocialShareModal } from '../modals/SocialShareModal';
import {
  createCartInquiryMessage,
  createProductInquiryMessage,
  formatPrice,
  generateWhatsAppLink,
} from '../../utils/whatsapp';
import { recordWhatsAppInquiry } from '../../utils/storage';

interface StorefrontProps {
  store: Store;
  products: Product[];
  reviews: StoreReview[];
  onOpenCreateStore: () => void;
  onOpenLogin?: () => void;
  onOpenLanding?: () => void;
  onRefreshData?: () => void;
  /** Product ID from ?product= URL param — auto-opens product detail on load */
  initialProductId?: string | null;
}

export const Storefront: React.FC<StorefrontProps> = ({
  store,
  products,
  reviews,
  onOpenCreateStore,
  onOpenLogin,
  onOpenLanding,
  onRefreshData,
  initialProductId,
}) => {
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTargetProduct, setShareTargetProduct] = useState<Product | undefined>(undefined);

  // Auto-open a product from ?product= URL param (e.g. scanned product QR code)
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const match = products.find((p) => p.id === initialProductId || p.uid === initialProductId);
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

  const cleanSearch = searchQuery.trim().toLowerCase().replace(/^#/, '');

  // Filtered products with UID support
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
  }, [products, cleanSearch, selectedCategory, onlyInStock]);

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
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 pb-28 sm:pb-24 overflow-x-hidden w-full max-w-full">
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

      {/* Hero Banner Header */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        {/* Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt={store.name}
              className="w-full h-full object-cover opacity-30"
            />
          ) : (
            /* Gradient fallback generated from store accent colour */
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
            <div className="relative">
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-2xl bg-slate-800 ring-4 ring-amber-400/70 ring-offset-2 ring-offset-slate-900"
              />
              {store.verified && (
                <div
                  className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full ring-2 ring-slate-900 shadow-sm"
                  title="Verified Seller on Tá.shop"
                >
                  <BadgeCheck className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* Store Title, Tagline & Meta */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
                  {store.name}
                </h1>
                {store.verified && (
                  <span className="bg-blue-500/20 text-blue-300 text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 border border-blue-400/30">
                    <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />
                    Verified Seller
                  </span>
                )}
              </div>

              <p className="text-base sm:text-xl text-white mt-1 font-black leading-snug">{store.tagline}</p>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-3 text-xs text-slate-300">
                <div className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{store.location}</span>
                </div>

                {/* Open Hours — dynamic badge */}
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

                {store.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${store.socialLinks.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 hover:text-white transition"
                  >
                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                    <span>@{store.socialLinks.instagram}</span>
                  </a>
                )}
              </div>
            </div>

            {/* Direct Contact & Share Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
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
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
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

        {/* Catalog Products Grid */}
        {filteredProducts.length === 0 ? (
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
            {filteredProducts.map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                store={store}
                index={idx}
                onOpenDetails={(p) => {
                  setSelectedProduct(p);
                  setIsDetailOpen(true);
                }}
                onQuickWhatsApp={(p, v) => {
                  handleAddToCart(p, v);
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
        {reviews.length > 0 && (
          <section className="mt-16 pt-10 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight flex items-center gap-2">
                  <span>Customer Reviews & Feedback</span>
                  <span className="text-amber-500 flex items-center text-sm font-semibold">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400 inline" /> 5.0
                  </span>
                </h3>
                <p className="text-xs text-slate-500">Verified buyer ratings from WhatsApp orders</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {reviews.map((rev) => (
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
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-900">{rev.author}</span>
                    {rev.productName && (
                      <span className="text-slate-400 truncate max-w-[120px]">{rev.productName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
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

        {/* Footer & Platform Branding */}
        <footer className="mt-16 text-center text-xs text-slate-400 space-y-4">
          {/* Explore Stores & Platform Hub */}
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

            {store.tier === 'free' && (
              <button
                onClick={onOpenCreateStore}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-2xl text-slate-700 font-semibold text-xs transition cursor-pointer border border-slate-200"
              >
                <span>⚡ Powered by <strong>Tá.shop</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-amber-700 font-bold">Launch store (₦500/mo)</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} {store.name}</span>
            <span>•</span>
            <span className="text-slate-400">Customer View (Login-Free)</span>
            {onOpenLanding && (
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
