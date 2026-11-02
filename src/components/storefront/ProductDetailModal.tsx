import React, { useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Play,
  Share2,
  ShoppingBag,
  Sparkles,
  Truck,
  Video,
  X,
} from 'lucide-react';
import { Product, ProductVariant, Store } from '../../types';
import { formatPrice } from '../../utils/whatsapp';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  store: Store;
  onOrderWhatsApp: (product: Product, variant?: ProductVariant, buyerLocation?: string, buyerNote?: string) => void;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  onShareProduct: (product: Product) => void;
}

const getEmbedUrl = (rawUrl?: string): { type: 'iframe' | 'video'; embedUrl: string } | null => {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  // YouTube (standard, youtu.be, shorts, embed)
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`,
    };
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'iframe',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
    };
  }

  // Direct video file
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url)) {
    return {
      type: 'video',
      embedUrl: url,
    };
  }

  return {
    type: 'iframe',
    embedUrl: url,
  };
};

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  store,
  onOrderWhatsApp,
  onAddToCart,
  onShareProduct,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [mediaTab, setMediaTab] = useState<'photos' | 'video'>('photos');
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(() => {
    return product?.variants && product.variants.length > 0 ? [product.variants[0].id] : [];
  });
  const [buyerLocation, setBuyerLocation] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [addedToCartToast, setAddedToCartToast] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  if (!isOpen || !product) return null;

  const toggleVariant = (id: string) => {
    setSelectedVariantIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((vId) => vId !== id);
        return next.length > 0 ? next : [id];
      } else {
        return [...prev, id];
      }
    });
  };

  const primaryVariant = product.variants?.find((v) => selectedVariantIds.includes(v.id)) || product.variants?.[0];
  const currentPrice = primaryVariant ? primaryVariant.price : product.price;
  const currentOriginalPrice = primaryVariant?.originalPrice || product.originalPrice;
  const isAvailable = primaryVariant ? primaryVariant.inStock : product.inStock;
  const videoEmbed = product.videoUrl ? getEmbedUrl(product.videoUrl) : null;

  const images =
    product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80'];

  const prevImage = () => setActiveImageIndex((i) => (i - 1 + images.length) % images.length);
  const nextImage = () => setActiveImageIndex((i) => (i + 1) % images.length);

  const handleCopyUid = () => {
    navigator.clipboard.writeText(`#${product.uid || product.id}`);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleAddBag = () => {
    if (product.variants && product.variants.length > 0) {
      const selected = product.variants.filter((v) => selectedVariantIds.includes(v.id));
      if (selected.length > 0) {
        selected.forEach((v) => onAddToCart(product, v));
      } else {
        onAddToCart(product, product.variants[0]);
      }
    } else {
      onAddToCart(product);
    }
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2200);
  };

  const handleDirectOrder = () => {
    onOrderWhatsApp(product, primaryVariant, buyerLocation, buyerNote);
  };

  const discountPercent =
    currentOriginalPrice && currentOriginalPrice > currentPrice
      ? Math.round(((currentOriginalPrice - currentPrice) / currentOriginalPrice) * 100)
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      {/* Bottom-sheet on mobile, centred card on desktop */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-250 flex flex-col max-h-[94vh] sm:max-h-[90vh] z-10">

        {/* Mobile drag pill */}
        <div className="w-10 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* ── IMAGE / VIDEO GALLERY ───────────────────────────── */}
        <div className="relative bg-slate-900 shrink-0" style={{ aspectRatio: '16/9' }}>
          {mediaTab === 'video' && videoEmbed ? (
            <div className="w-full h-full relative flex items-center justify-center bg-black">
              {videoEmbed.type === 'video' ? (
                <video
                  src={videoEmbed.embedUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <iframe
                  src={videoEmbed.embedUrl}
                  title={product.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              )}
            </div>
          ) : (
            <img
              key={activeImageIndex}
              src={images[activeImageIndex]}
              alt={product.name}
              className={`w-full h-full object-cover transition-opacity duration-200 ${!isAvailable ? 'grayscale opacity-70' : ''}`}
              decoding="async"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80';
              }}
            />
          )}

          {/* Photo / Video Switcher (only if product has videoUrl) */}
          {product.videoUrl && videoEmbed && (
            <div className="absolute bottom-3 left-3 z-20 flex items-center p-1 bg-black/60 backdrop-blur-md rounded-full border border-white/20 shadow-md">
              <button
                type="button"
                onClick={() => setMediaTab('photos')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  mediaTab === 'photos'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3 h-3" />
                <span>Photos ({images.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaTab('video')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                  mediaTab === 'video'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Watch Video</span>
              </button>
            </div>
          )}

          {/* Prev / Next (only in photo mode) */}
          {mediaTab === 'photos' && images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 transition cursor-pointer z-10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 transition cursor-pointer z-10"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              {/* Dot indicators */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`rounded-full transition-all cursor-pointer ${i === activeImageIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.badge && (
              <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {product.badge}
              </span>
            )}
            {discountPercent && isAvailable && (
              <span className="bg-rose-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
                Save {discountPercent}%
              </span>
            )}
          </div>

          {/* Top-right controls */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <button
              onClick={() => onShareProduct(product)}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 transition cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/60 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!isAvailable && mediaTab === 'photos' && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="bg-white text-slate-900 text-sm font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-xl">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* ── SCROLLABLE BODY ─────────────────────────── */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">

          {/* Category + UID */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400">
              {product.category}
            </span>
            <button
              onClick={handleCopyUid}
              className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition cursor-pointer flex items-center gap-1"
              title="Copy Item UID"
            >
              {copiedUid ? <Check className="w-3 h-3 text-emerald-600" /> : null}
              #{product.uid || product.id.slice(-6)}
            </button>
          </div>

          {/* Name */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
            {product.name}
          </h2>

          {/* Price */}
          <div className="flex items-baseline flex-wrap gap-3">
            <span className="text-3xl font-black text-amber-600 font-mono leading-none">
              {formatPrice(currentPrice, store.currencySymbol)}
            </span>
            {currentOriginalPrice && currentOriginalPrice > currentPrice && (
              <span className="text-base text-slate-400 line-through font-mono">
                {formatPrice(currentOriginalPrice, store.currencySymbol)}
              </span>
            )}
            {isAvailable ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1 ml-auto">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                In Stock
              </span>
            ) : (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full ml-auto">
                Out of Stock
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>

          {/* Watch Video Banner */}
          {product.videoUrl && videoEmbed && mediaTab !== 'video' && (
            <button
              type="button"
              onClick={() => {
                setMediaTab('video');
                // Scroll modal to top so video is in view
                const container = document.querySelector('.overflow-y-auto');
                if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-amber-700 text-amber-700" />
              <span>Watch Product Video Preview</span>
            </button>
          )}

          {/* Variants with Checkboxes */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block uppercase tracking-wide">
                Available Options (Mark Checkbox)
              </label>
              <div className="space-y-2">
                {product.variants.map((v) => {
                  const isChecked = selectedVariantIds.includes(v.id);
                  return (
                    <label
                      key={v.id}
                      className={`p-3 rounded-2xl border text-xs flex items-center justify-between transition cursor-pointer select-none ${
                        isChecked
                          ? 'border-emerald-600 bg-emerald-50 text-slate-900 font-bold shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      } ${!v.inStock ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleVariant(v.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                        />
                        <span className="font-semibold">{v.name}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {formatPrice(v.price, store.currencySymbol)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Specifications
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(product.attributes).map(([key, val]) => (
                  <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-400 text-[10px] uppercase block">{key}</span>
                    <span className="text-slate-800 font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personalisation */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Personalise your order (optional)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Delivery City / Area
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lekki Phase 1, Lagos"
                  value={buyerLocation}
                  onChange={(e) => setBuyerLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Special Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gift wrap? Urgent delivery?"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Delivery trust bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-4 py-3 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span>{store.deliveryInfo || 'Fast dispatch available nationwide.'}</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Replies promptly on WhatsApp</span>
            </div>
          </div>

          {/* Spacer so content clears sticky footer on mobile */}
          <div className="h-2 sm:hidden" />
        </div>

        {/* ── STICKY FOOTER CTA: Add to Cart Focus ─────────────────────── */}
        <div className="shrink-0 p-3 sm:p-4 bg-white border-t border-slate-100 flex gap-2" style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
          <button
            onClick={handleAddBag}
            disabled={!isAvailable}
            className={`w-full py-3.5 px-6 rounded-2xl text-sm font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-[0.99] ${
              !isAvailable
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : addedToCartToast
                ? 'bg-emerald-600 text-white shadow-emerald-600/25'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/25'
            }`}
          >
            {addedToCartToast ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart · {formatPrice(currentPrice, store.currencySymbol)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
