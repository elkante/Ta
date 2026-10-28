import React, { useState } from 'react';
import { MessageCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { Product, Store } from '../../types';
import { formatPrice } from '../../utils/whatsapp';

interface ProductCardProps {
  product: Product;
  store: Store;
  onOpenDetails: (product: Product) => void;
  onQuickWhatsApp: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  /** Grid index — drives stagger animation delay */
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  store,
  onOpenDetails,
  onQuickWhatsApp,
  onAddToCart,
  index = 0,
}) => {
  const [cartBounce, setCartBounce] = useState(false);

  const hasVariants = product.variants && product.variants.length > 0;
  const lowestPrice = hasVariants
    ? Math.min(...product.variants.map((v) => v.price))
    : product.price;

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;
    onAddToCart(product);
    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 600);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.inStock) return;
    onQuickWhatsApp(product);
  };

  // Stagger: 0, 60, 120 ... capped at 360ms
  const staggerDelay = Math.min(index * 60, 360);

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${staggerDelay}ms`, animationFillMode: 'both' }}
    >
      {/* Portrait image — 3:4 ratio */}
      <div
        onClick={() => onOpenDetails(product)}
        className="relative w-full bg-slate-100 overflow-hidden cursor-pointer"
        style={{ aspectRatio: '3/4' }}
      >
        <img
          src={
            product.images[0] ||
            'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80'
          }
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            !product.inStock ? 'grayscale opacity-60' : ''
          }`}
          loading="lazy"
        />

        {/* Top-left: product badge */}
        {product.badge && (
          <span className="absolute top-2 left-2 bg-slate-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            {product.badge}
          </span>
        )}

        {/* Top-right: discount */}
        {discountPercent && product.inStock && (
          <span className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md z-10">
            -{discountPercent}%
          </span>
        )}

        {/* Bottom-right: stock status pill */}
        <div className="absolute bottom-2 right-2 z-10">
          {!product.inStock ? (
            <span className="bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Sold Out
            </span>
          ) : product.isLowStock ? (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
              Few Left
            </span>
          ) : (
            <span className="bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              In Stock
            </span>
          )}
        </div>

        {/* Sold out dim overlay */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/25" />
        )}
      </div>

      {/* Card Content */}
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        {/* Category + UID */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span className="uppercase tracking-wider truncate">{product.category}</span>
          <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">
            #{product.uid || product.id.slice(-6)}
          </span>
        </div>

        {/* Product name */}
        <h3
          onClick={() => onOpenDetails(product)}
          className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2 cursor-pointer leading-snug hover:text-slate-700 transition"
          title={product.name}
        >
          {product.name}
        </h3>

        {/* Price — hero element, amber & bold */}
        <div className="flex items-baseline gap-1.5 mt-auto pt-1">
          <span className="font-black text-base sm:text-lg text-amber-600 font-mono leading-none">
            {hasVariants && product.variants.length > 1 && (
              <span className="text-[10px] font-normal text-slate-400 font-sans mr-0.5">from </span>
            )}
            {formatPrice(lowestPrice, store.currencySymbol)}
          </span>
          {product.originalPrice && product.originalPrice > lowestPrice && (
            <span className="text-[11px] text-slate-400 line-through font-mono">
              {formatPrice(product.originalPrice, store.currencySymbol)}
            </span>
          )}
        </div>

        {/* Action buttons — always visible, no hover gating */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
          <button
            onClick={handleWhatsApp}
            disabled={!product.inStock}
            className={`flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.97] ${
              product.inStock
                ? 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-sm shadow-emerald-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Order</span>
          </button>

          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border transition-all duration-150 ${
              cartBounce
                ? 'bg-emerald-50 border-emerald-400 text-emerald-700 scale-125'
                : product.inStock
                ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
            title="Add to bag"
          >
            <ShoppingBag className={`w-4 h-4 shrink-0 ${cartBounce ? 'animate-bounce' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
