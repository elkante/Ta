import React, { useState } from 'react';
import { Check, ShoppingBag, Sparkles } from 'lucide-react';
import { Product, ProductVariant, Store } from '../../types';
import { formatPrice } from '../../utils/whatsapp';

interface ProductCardProps {
  product: Product;
  store: Store;
  onOpenDetails: (product: Product) => void;
  onQuickWhatsApp: (product: Product) => void;
  onAddToCart: (product: Product, variant?: ProductVariant) => void;
  /** Grid index — drives stagger animation delay */
  index?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  store,
  onOpenDetails,
  onAddToCart,
  index = 0,
}) => {
  const [cartBounce, setCartBounce] = useState(false);

  const hasVariants = product.variants && product.variants.length > 0;
  const [selectedVariantIds, setSelectedVariantIds] = useState<string[]>(() => {
    return hasVariants ? [product.variants[0].id] : [];
  });

  const toggleVariant = (variantId: string) => {
    setSelectedVariantIds((prev) => {
      if (prev.includes(variantId)) {
        const next = prev.filter((id) => id !== variantId);
        return next.length > 0 ? next : [variantId];
      } else {
        return [...prev, variantId];
      }
    });
  };

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

    if (hasVariants) {
      const selectedVariants = product.variants.filter((v) => selectedVariantIds.includes(v.id));
      if (selectedVariants.length > 0) {
        selectedVariants.forEach((v) => onAddToCart(product, v));
      } else {
        onAddToCart(product, product.variants[0]);
      }
    } else {
      onAddToCart(product);
    }

    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 900);
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
            product.images?.[0] ||
            'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80'
          }
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            !product.inStock ? 'grayscale opacity-60' : ''
          }`}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80';
          }}
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

        {/* Variant Checkboxes */}
        {hasVariants && product.variants.length > 1 && (
          <div className="pt-1.5 space-y-1">
            {product.variants.map((v) => {
              const isChecked = selectedVariantIds.includes(v.id);
              return (
                <label
                  key={v.id}
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center justify-between px-2 py-1 rounded-lg border text-[11px] cursor-pointer transition select-none ${
                    isChecked
                      ? 'border-emerald-600 bg-emerald-50/70 text-slate-900 font-bold'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleVariant(v.id)}
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <span className="truncate">{v.name}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 shrink-0 ml-1">
                    {formatPrice(v.price, store.currencySymbol)}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Add to Cart button */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={handleAddToCart}
            disabled={!product.inStock}
            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer ${
              !product.inStock
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : cartBounce
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
            }`}
          >
            {cartBounce ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Added to Cart!</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
