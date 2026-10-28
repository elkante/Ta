import React from 'react';
import { Eye, MessageCircle, ShoppingBag, Sparkles } from 'lucide-react';
import { Product, Store } from '../../types';
import { formatPrice } from '../../utils/whatsapp';

interface ProductCardProps {
  product: Product;
  store: Store;
  onOpenDetails: (product: Product) => void;
  onQuickWhatsApp: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  store,
  onOpenDetails,
  onQuickWhatsApp,
  onAddToCart,
}) => {
  const hasVariants = product.variants && product.variants.length > 0;
  const lowestPrice = hasVariants
    ? Math.min(...product.variants.map((v) => v.price))
    : product.price;

  const discountPercent =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/80 hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex flex-col">
      {/* Image container */}
      <div
        onClick={() => onOpenDetails(product)}
        className="relative aspect-square w-full bg-slate-100 overflow-hidden cursor-pointer"
      >
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&auto=format&fit=crop&q=80'}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            !product.inStock ? 'grayscale opacity-75' : ''
          }`}
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10">
          {product.badge && (
            <span className="bg-slate-900/90 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>{product.badge}</span>
            </span>
          )}
          {discountPercent && product.inStock && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              Save {discountPercent}%
            </span>
          )}
        </div>

        {/* Stock Status Badge */}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
            <span className="bg-white/95 text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
              Sold Out
            </span>
          </div>
        )}

        {product.inStock && product.isLowStock && (
          <span className="absolute bottom-2.5 left-2.5 bg-amber-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
            Only a few left
          </span>
        )}

        {/* Quick View Hover overlay */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails(product);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-900 font-semibold text-xs shadow-md flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Quick View</span>
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
            <span className="uppercase tracking-wider truncate">{product.category}</span>
            <div className="flex items-center gap-1">
              <span className="text-slate-700 font-mono font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded" title="Item UID">
                #{product.uid || product.id}
              </span>
              {hasVariants && (
                <span className="text-slate-500 font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                  {product.variants.length} options
                </span>
              )}
            </div>
          </div>

          <h3
            onClick={() => onOpenDetails(product)}
            className="font-bold text-slate-900 text-sm line-clamp-2 hover:text-slate-700 transition cursor-pointer leading-snug"
            title={product.name}
          >
            {product.name}
          </h3>

          <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Price and Action Buttons */}
        <div className="pt-3.5 mt-2 border-t border-slate-100">
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-extrabold text-base text-slate-900 font-mono">
              {hasVariants && product.variants.length > 1 && <span className="text-xs font-normal text-slate-500 font-sans mr-0.5">from </span>}
              {formatPrice(lowestPrice, store.currencySymbol)}
            </span>
            {product.originalPrice && product.originalPrice > lowestPrice && (
              <span className="text-xs text-slate-400 line-through font-mono">
                {formatPrice(product.originalPrice, store.currencySymbol)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            <button
              onClick={() => onQuickWhatsApp(product)}
              disabled={!product.inStock}
              className={`col-span-4 py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98] ${
                product.inStock
                  ? 'bg-[#25D366] hover:bg-[#20ba59] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
              title="Order this product directly on WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Order WhatsApp</span>
            </button>

            <button
              onClick={() => onAddToCart(product)}
              disabled={!product.inStock}
              className={`col-span-1 py-2 rounded-xl flex items-center justify-center border transition cursor-pointer ${
                product.inStock
                  ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                  : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
              }`}
              title="Add to WhatsApp Order Bag"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
