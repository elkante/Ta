import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  ShoppingBag,
  Sparkles,
  Truck,
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

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  store,
  onOrderWhatsApp,
  onAddToCart,
  onShareProduct,
}) => {
  if (!isOpen || !product) return null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );
  const [buyerLocation, setBuyerLocation] = useState('');
  const [buyerNote, setBuyerNote] = useState('');
  const [addedToCartToast, setAddedToCartToast] = useState(false);
  const [copiedUid, setCopiedUid] = useState(false);

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentOriginalPrice = selectedVariant?.originalPrice || product.originalPrice;
  const isAvailable = selectedVariant ? selectedVariant.inStock : product.inStock;

  const handleCopyUid = () => {
    navigator.clipboard.writeText(`#${product.uid || product.id}`);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleVariantChange = (variant: ProductVariant) => {
    setSelectedVariant(variant);
  };

  const handleAddBag = () => {
    onAddToCart(product, selectedVariant);
    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2200);
  };

  const handleDirectOrder = () => {
    onOrderWhatsApp(product, selectedVariant, buyerLocation, buyerNote);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col max-h-[92vh] sm:max-h-[90vh] z-10">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {product.category}
            </span>
            {product.badge && (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                <span>{product.badge}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onShareProduct(product)}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Share product link & QR code"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main Grid: Gallery & Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Gallery */}
            <div className="space-y-3">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs">
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    !isAvailable ? 'grayscale opacity-75' : ''
                  }`}
                />
                {!isAvailable && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white text-slate-900 text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                      Currently Sold Out
                    </span>
                  </div>
                )}
              </div>

              {/* Thumbnails if multiple images */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition cursor-pointer ${
                        activeImageIndex === idx ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta */}
            <div className="flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                  {product.name}
                </h2>

                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200">
                    Item UID: #{product.uid || product.id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUid}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                  >
                    {copiedUid ? 'Copied UID!' : 'Copy UID'}
                  </button>
                </div>

                {/* Price Display */}
                <div className="mt-2.5 flex items-baseline gap-2.5">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {formatPrice(currentPrice, store.currencySymbol)}
                  </span>
                  {currentOriginalPrice && currentOriginalPrice > currentPrice && (
                    <span className="text-sm text-slate-400 line-through font-mono">
                      {formatPrice(currentOriginalPrice, store.currencySymbol)}
                    </span>
                  )}
                  {isAvailable ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      In Stock
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      Out of Stock
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Variants Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    Select Option / Size:
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {product.variants.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => handleVariantChange(v)}
                        className={`p-2.5 rounded-xl border text-left text-xs flex items-center justify-between transition cursor-pointer ${
                          selectedVariant?.id === v.id
                            ? 'border-slate-900 bg-slate-900 text-white font-medium shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-800'
                        } ${!v.inStock ? 'opacity-50' : ''}`}
                      >
                        <span className="font-semibold">{v.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xs ${selectedVariant?.id === v.id ? 'text-amber-300' : 'text-slate-600'}`}>
                            {formatPrice(v.price, store.currencySymbol)}
                          </span>
                          {!v.inStock && (
                            <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Specific Attributes (e.g. Fragrance Notes, Fabric, Specs) */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                Product Specifications & Notes
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {Object.entries(product.attributes).map(([key, val]) => (
                  <div key={key} className="bg-white p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700 block text-[11px] text-slate-400 uppercase">
                      {key}
                    </span>
                    <span className="text-slate-800 font-medium">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Order Personalization Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Personalize Your WhatsApp Message (Optional)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>Your Delivery City / Area</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lekki Phase 1, Lagos or Abuja"
                  value={buyerLocation}
                  onChange={(e) => setBuyerLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Special Note or Question
                </label>
                <input
                  type="text"
                  placeholder="e.g. Can it arrive today? Need gift bag"
                  value={buyerNote}
                  onChange={(e) => setBuyerNote(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-200/80 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Delivery & Trust reassurance banner */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-4 py-2.5 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span>{store.deliveryInfo || 'Fast dispatch available nationwide.'}</span>
            </div>
            <div className="flex items-center gap-1.5 hidden sm:flex">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Replies on WhatsApp promptly</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-3 sm:p-4 pb-safe bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <button
            onClick={handleAddBag}
            disabled={!isAvailable}
            className={`w-full sm:w-auto px-4 py-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
              addedToCartToast
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
            } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            {addedToCartToast ? <Check className="w-4 h-4 text-emerald-600" /> : <ShoppingBag className="w-4 h-4" />}
            <span>{addedToCartToast ? 'Added to WhatsApp Bag!' : 'Add to WhatsApp Bag'}</span>
          </button>

          <button
            onClick={handleDirectOrder}
            disabled={!isAvailable}
            className={`w-full sm:flex-1 py-3 px-3.5 sm:px-6 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 shadow-md transition cursor-pointer active:scale-[0.99] ${
              isAvailable
                ? 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">Order on WhatsApp ({formatPrice(currentPrice, store.currencySymbol)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
