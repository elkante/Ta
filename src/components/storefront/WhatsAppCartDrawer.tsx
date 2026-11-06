import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  User,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Store, StoreOrder, StoreDeliveryLocation, StoreWholesalePolicy } from '../../types';
import { playOrderNotificationSound } from '../../utils/audio';
import {
  createFullOrderWhatsAppMessage,
  formatPrice,
  generateWhatsAppLink,
  openWhatsAppUrl,
} from '../../utils/whatsapp';
import {
  createStoreOrder,
  getStoreCoupons,
  getStoreDeliveryLocations,
  getStoreWholesalePolicies,
} from '../../utils/storage';
import { dbSaveOrder } from '../../utils/supabase';
import { ALL_NIGERIAN_STATE_NAMES } from '../../utils/nigeriaStates';

interface WhatsAppCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  store: Store;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOrderPlaced?: (order: StoreOrder) => void;
}

export const WhatsAppCartDrawer: React.FC<WhatsAppCartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  store,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
}) => {
  // Buyer Details Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryState, setDeliveryState] = useState('Lagos');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [buyerNote, setBuyerNote] = useState('');

  // Coupon code state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; percent?: number; fixed?: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Validation & Submission State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<StoreOrder | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  const configuredLocations = useMemo(() => {
    return (store.deliveryLocations && store.deliveryLocations.length > 0)
      ? store.deliveryLocations
      : getStoreDeliveryLocations(store.id);
  }, [store.deliveryLocations, store.id]);

  // Delivery areas in the selected state
  const stateDeliveryAreas = useMemo(() => {
    return configuredLocations.filter(
      (l: StoreDeliveryLocation) => l.isActive && l.state.toLowerCase().includes(deliveryState.toLowerCase())
    );
  }, [configuredLocations, deliveryState]);

  // Selected delivery location / fee
  const selectedLocation = useMemo(() => {
    if (fulfillmentMethod !== 'delivery') return null;
    return stateDeliveryAreas.find((a: StoreDeliveryLocation) => a.areaName === deliveryArea) || stateDeliveryAreas[0] || null;
  }, [fulfillmentMethod, stateDeliveryAreas, deliveryArea]);

  const deliveryFee = selectedLocation ? selectedLocation.fee : 0;

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const rawSubtotal = items.reduce((sum, item) => {
    const p = item.variant ? item.variant.price : item.product.price;
    return sum + p * item.quantity;
  }, 0);

  // Evaluate Wholesale Policies
  const wholesalePolicies = useMemo(() => {
    return (store.wholesalePolicies && store.wholesalePolicies.length > 0)
      ? store.wholesalePolicies
      : getStoreWholesalePolicies(store.id);
  }, [store.wholesalePolicies, store.id]);

  const activeWholesalePolicy = useMemo(() => {
    const active = wholesalePolicies.filter((p) => p.isActive);
    let best: { policy: StoreWholesalePolicy; discount: number } | null = null;

    for (const policy of active) {
      const allConditionsMet =
        policy.conditions.length > 0 &&
        policy.conditions.every((cond) => {
          if (cond.type === 'min_cart_total') return rawSubtotal >= cond.value;
          if (cond.type === 'min_item_quantity') return totalItemsCount >= cond.value;
          return true;
        });

      if (allConditionsMet) {
        let disc = 0;
        if (policy.discountType === 'percentage') {
          disc = Math.round((rawSubtotal * policy.discountValue) / 100);
        } else {
          disc = Math.min(rawSubtotal, policy.discountValue);
        }
        if (!best || disc > best.discount) {
          best = { policy, discount: disc };
        }
      }
    }
    return best;
  }, [wholesalePolicies, rawSubtotal, totalItemsCount]);

  // Compute discount (coupon + wholesale policy)
  let couponDiscountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.percent) {
      couponDiscountAmount = Math.round((rawSubtotal * appliedCoupon.percent) / 100);
    } else if (appliedCoupon.fixed) {
      couponDiscountAmount = Math.min(rawSubtotal, appliedCoupon.fixed);
    }
  }

  const wholesaleDiscountAmount = activeWholesalePolicy ? activeWholesalePolicy.discount : 0;
  const discountAmount = Math.min(rawSubtotal, couponDiscountAmount + wholesaleDiscountAmount);

  const totalAmount = Math.max(
    0,
    rawSubtotal - discountAmount + (fulfillmentMethod === 'delivery' ? deliveryFee : 0)
  );

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;

    // Check seller store coupons first
    const storeCoupons = (store.coupons && store.coupons.length > 0) ? store.coupons : getStoreCoupons(store.id);
    const matched = storeCoupons.find((c) => c.code.toUpperCase() === clean);

    if (matched) {
      if (!matched.isActive) {
        setCouponError('This coupon is currently inactive');
        return;
      }
      if (matched.expiryDate && new Date(matched.expiryDate).getTime() < new Date().setHours(0, 0, 0, 0)) {
        setCouponError(`This coupon expired on ${matched.expiryDate}`);
        return;
      }
      if (matched.minOrderAmount && rawSubtotal < matched.minOrderAmount) {
        setCouponError(
          `Minimum order of ${formatPrice(matched.minOrderAmount, store.currencySymbol)} required for this coupon`
        );
        return;
      }
      if (matched.usageLimit && matched.usageCount >= matched.usageLimit) {
        setCouponError('This coupon has reached its maximum usage limit');
        return;
      }

      setAppliedCoupon({
        code: matched.code,
        percent: matched.discountType === 'percent' ? matched.discountValue : undefined,
        fixed: matched.discountType === 'fixed' ? matched.discountValue : undefined,
      });
      setCouponError(null);
      return;
    }

    // Default platform promotional codes
    if (clean === 'WELCOME10' || clean === 'TA10') {
      setAppliedCoupon({ code: clean, percent: 10 });
      setCouponError(null);
    } else if (clean === 'VIP20' || clean === 'DISCOUNT20') {
      setAppliedCoupon({ code: clean, percent: 20 });
      setCouponError(null);
    } else if (clean === 'SAVE500' || clean === 'OFF500') {
      setAppliedCoupon({ code: clean, fixed: 500 });
      setCouponError(null);
    } else if (clean === 'SAVE1000' || clean === 'OFF1000') {
      setAppliedCoupon({ code: clean, fixed: 1000 });
      setCouponError(null);
    } else {
      setCouponError('Invalid or expired coupon code. Please verify with the seller.');
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };

  const handlePlaceOrder = () => {
    const errors: string[] = [];
    if (!buyerName.trim()) {
      errors.push('Please enter your full name (so the vendor recognizes you)');
    }
    if (!buyerPhone.trim() || buyerPhone.replace(/\D/g, '').length < 7) {
      errors.push('Please enter a valid WhatsApp phone number — order updates will be sent there');
    }
    if (fulfillmentMethod === 'delivery' && !deliveryAddress.trim()) {
      errors.push('Please enter your delivery street address & landmark');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    // 1. Play celebratory loud sound
    playOrderNotificationSound(1.0);

    // 2. Fire celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    // 3. Format order items payload
    const orderItemsPayload = items.map((item) => {
      const activePrice = item.variant ? item.variant.price : item.product.price;
      return {
        productId: item.product.id,
        productUid: item.product.uid || item.product.id,
        productName: item.product.name,
        variantName: item.variant?.name,
        price: activePrice,
        quantity: item.quantity,
        subtotal: activePrice * item.quantity,
        image: item.product.images[0],
      };
    });

    const fullArea = fulfillmentMethod === 'delivery'
      ? `${deliveryState}${deliveryArea ? ` · ${deliveryArea.trim()}` : ''}`
      : undefined;

    // 4. Persist to store dashboard
    const savedOrder = createStoreOrder({
      storeId: store.id,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      buyerEmail: buyerEmail.trim() || undefined,
      fulfillmentMethod,
      deliveryAddress: fulfillmentMethod === 'delivery' ? deliveryAddress.trim() : undefined,
      deliveryArea: fullArea,
      buyerNotes: buyerNote.trim() || undefined,
      items: orderItemsPayload,
      totalAmount,
      currencySymbol: store.currencySymbol,
      whatsappUrl: '',
      couponCode: appliedCoupon?.code || (activeWholesalePolicy ? activeWholesalePolicy.policy.name : undefined),
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
    });

    // Generate accurate WA message containing assigned Order ID
    const waText = createFullOrderWhatsAppMessage({
      store,
      order: savedOrder,
    });

    const waLink = generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, waText);
    savedOrder.whatsappUrl = waLink;

    // Immediately push to Supabase cloud db so seller receives it across all devices
    dbSaveOrder(savedOrder).catch((err) => console.error('Cloud order save error:', err));

    setPlacedOrder(savedOrder);
    setIsSubmitting(false);

    // Trigger Instant Baileys System Notification
    try {
      const serverBase =
        (import.meta as any).env?.VITE_BAILEYS_SERVER_URL ||
        (typeof window !== 'undefined' && window.location.hostname === 'localhost'
          ? 'http://localhost:3001'
          : 'https://ta-whatsapp-bot.onrender.com');
      fetch(`${serverBase}/api/orders/notify/${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: savedOrder, store }),
      }).catch(() => {});
    } catch (e) {}

    if (onOrderPlaced) {
      onOrderPlaced(savedOrder);
    }
  };

  const handleCopyOrderId = () => {
    if (!placedOrder) return;
    navigator.clipboard.writeText(`#${placedOrder.id}`);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCloseAndClear = () => {
    onClearCart();
    setPlacedOrder(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#fafafa] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-200">
        {/* Checkout Header (Store identity + Secure checkout pill) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {store.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-sm truncate block">{store.name}</span>
              <span className="text-[11px] text-slate-400">Direct WhatsApp Order</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
              <Lock className="w-3 h-3 text-emerald-600" />
              <span>Secure Checkout</span>
            </span>
            <button
              onClick={placedOrder ? handleCloseAndClear : onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {placedOrder ? (
          /* SUCCESS CELEBRATION VIEW */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 pb-safe">
            <div className="text-center space-y-3 pt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Loud Order Alert Dispatched to Seller Dashboard!
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Order Confirmed!
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your order was saved to <strong>{store.name}</strong>'s dashboard. A pre-typed WhatsApp message is ready for you to finalize payment &amp; delivery!
              </p>
            </div>

            {/* Generated Order ID Card */}
            <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg space-y-3 border border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-wider font-semibold">Assigned Order ID</span>
                <span className="text-emerald-400 font-medium">Pending Store Confirmation</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-amber-300">
                  #{placedOrder.id}
                </span>
                <button
                  onClick={handleCopyOrderId}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOrderId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-[11px] text-slate-400 block">Buyer</span>
                  <span className="font-semibold text-white">{placedOrder.buyerName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Phone</span>
                  <span className="font-semibold text-white">{placedOrder.buyerPhone}</span>
                </div>
                {placedOrder.buyerEmail && (
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-400 block">Email Receipt</span>
                    <span className="font-semibold text-white">{placedOrder.buyerEmail}</span>
                  </div>
                )}
                <div className="col-span-2 pt-1">
                  <span className="text-[11px] text-slate-400 block">Fulfillment</span>
                  <span className="font-semibold text-white">
                    {placedOrder.fulfillmentMethod === 'delivery'
                      ? `🚚 Delivery: ${placedOrder.deliveryAddress}${placedOrder.deliveryArea ? ` (${placedOrder.deliveryArea})` : ''}`
                      : `🏬 Pickup: ${store.location}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Done & Continue Shopping + Chat Link */}
            <div className="space-y-2.5">
              <a
                href={placedOrder.whatsappUrl}
                onClick={(e) => {
                  e.preventDefault();
                  openWhatsAppUrl(placedOrder.whatsappUrl);
                }}
                className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Open Pre-Typed WhatsApp Chat →</span>
              </a>

              <button
                type="button"
                onClick={handleCloseAndClear}
                className="w-full py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <span>Done &amp; Continue Shopping</span>
              </button>
            </div>
          </div>
        ) : (
          /* FULL CHECKOUT VIEW */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {items.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Your order bag is empty</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Select items from {store.name}'s storefront to complete your checkout.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Title & Explainer */}
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Checkout</h2>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    <strong>{store.name}</strong> takes orders via WhatsApp. Tell us how to reach you and we'll open a chat with your full order pre-typed.
                  </p>
                </div>

                {/* Unique Total Card (Luxury Dark Navy + Warm Gold/Emerald Glow) */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-5 sm:p-6 shadow-xl border border-slate-800">
                  {/* Subtle decorative circles */}
                  <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-emerald-500/10 pointer-events-none blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-amber-500/10 pointer-events-none blur-2xl" />

                  <div className="relative z-10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                        <MessageCircle className="w-3 h-3 text-emerald-400" />
                        <span>Checking Out via WhatsApp</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">0% Commission</span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
                          {formatPrice(totalAmount, store.currencySymbol)}
                        </span>
                        {discountAmount > 0 && (
                          <span className="text-sm font-mono text-slate-400 line-through">
                            {formatPrice(rawSubtotal, store.currencySymbol)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {totalItemsCount} item{totalItemsCount > 1 ? 's' : ''} from <strong>{store.name}</strong>
                        {appliedCoupon && (
                          <span className="ml-2 text-emerald-400 font-semibold">
                            (Code {appliedCoupon.code} saved {formatPrice(couponDiscountAmount, store.currencySymbol)})
                          </span>
                        )}
                        {activeWholesalePolicy && !appliedCoupon && (
                          <span className="ml-2 text-emerald-400 font-semibold">
                            (Wholesale: "{activeWholesalePolicy.policy.name}" saved {formatPrice(wholesaleDiscountAmount, store.currencySymbol)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Wholesale Policy Banner */}
                {activeWholesalePolicy && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl p-3.5 space-y-1 shadow-2xs animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5 text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Wholesale Tier Unlocked: "{activeWholesalePolicy.policy.name}"</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-xs">
                        -{formatPrice(wholesaleDiscountAmount, store.currencySymbol)}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Automatic bulk discount of {activeWholesalePolicy.policy.discountType === 'percentage' ? `${activeWholesalePolicy.policy.discountValue}%` : formatPrice(activeWholesalePolicy.policy.discountValue, store.currencySymbol)} applied directly to your cart.
                    </p>
                  </div>
                )}

                {/* Coupon Code Section (Dotted Border Card) */}
                <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      <span>Have a coupon code?</span>
                      <span className="text-[10px] text-slate-400">(optional)</span>
                    </span>
                    {appliedCoupon && (
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-3 py-2 rounded-xl font-medium">
                      <span className="flex items-center gap-1.5 font-bold">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Code "{appliedCoupon.code}" applied!</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        -{formatPrice(discountAmount, store.currencySymbol)}
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Enter code here (e.g. WELCOME10)"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value);
                          setCouponError(null);
                        }}
                        className="flex-1 px-3 py-2 text-xs font-mono uppercase rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
                  )}
                </div>

                {/* Validation Errors Box */}
                {validationErrors.length > 0 && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Please complete the required fields:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Buyer Details Card */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Contact Details</span>
                    </span>
                    <span className="text-[10px] text-slate-400">No login required</span>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      Your name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="As the vendor will recognise you"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400 font-medium"
                    />
                  </div>

                  {/* WhatsApp / Phone Input */}
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      WhatsApp / phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+234..."
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
                    />
                    <p className="mt-1 text-[10px] text-slate-400 flex items-center gap-1">
                      <span>📲</span>
                      <span>The vendor will contact this number directly on WhatsApp</span>
                    </p>
                  </div>

                  {/* Email Input (Optional for receipt) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">
                        Email
                      </label>
                      <span className="text-[10px] text-slate-400">Optional - for the receipt</span>
                    </div>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Fulfillment Card ("How do you want this delivered?") */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
                  <label className="text-xs font-bold text-slate-800 block">
                    How do you want this delivered? <span className="text-rose-500">*</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Deliver to me */}
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod('delivery')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                        fulfillmentMethod === 'delivery'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className={`w-4 h-4 ${fulfillmentMethod === 'delivery' ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">Deliver to me</span>
                      </div>
                      <span className="text-[10px] text-slate-500 pl-6">We'll bring it</span>
                    </button>

                    {/* Pick up */}
                    <button
                      type="button"
                      onClick={() => setFulfillmentMethod('pickup')}
                      className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col gap-1 ${
                        fulfillmentMethod === 'pickup'
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building className={`w-4 h-4 ${fulfillmentMethod === 'pickup' ? 'text-emerald-700' : 'text-slate-500'}`} />
                        <span className="text-xs font-bold text-slate-900">Pick up</span>
                      </div>
                      <span className="text-[10px] text-slate-500 pl-6">At the store</span>
                    </button>
                  </div>

                  {/* Delivery Location Fields */}
                  {fulfillmentMethod === 'delivery' ? (
                    <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {/* State Dropdown */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            State <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={deliveryState}
                            onChange={(e) => {
                              const st = e.target.value;
                              setDeliveryState(st);
                              const matchingAreas = configuredLocations.filter((l: StoreDeliveryLocation) =>
                                l.isActive && l.state.toLowerCase().includes(st.toLowerCase())
                              );
                              if (matchingAreas.length > 0) {
                                setDeliveryArea(matchingAreas[0].areaName);
                              } else {
                                setDeliveryArea('');
                              }
                            }}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                          >
                            {ALL_NIGERIAN_STATE_NAMES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                            <option value="Other Nigerian States">Other Nigerian States</option>
                          </select>
                        </div>

                        {/* Area */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                            Area / Zone
                          </label>
                          {stateDeliveryAreas.length > 0 ? (
                            <select
                              value={deliveryArea || stateDeliveryAreas[0]?.areaName}
                              onChange={(e) => setDeliveryArea(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer font-medium"
                            >
                              {stateDeliveryAreas.map((area: StoreDeliveryLocation) => (
                                <option key={area.id} value={area.areaName}>
                                  {area.areaName} ({formatPrice(area.fee, store.currencySymbol)})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="e.g. Central Town, Airport Road"
                              value={deliveryArea}
                              onChange={(e) => setDeliveryArea(e.target.value)}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
                            />
                          )}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          Delivery address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Street, house number, area, landmarks..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400"
                        />
                      </div>

                      {/* Delivery fee breakdown notification */}
                      {deliveryFee > 0 && (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                          <span className="text-slate-600 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-500" />
                            <span>Estimated Delivery Fee:</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900">
                            +{formatPrice(deliveryFee, store.currencySymbol)}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Pickup info */
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span>Pickup Location:</span>
                      </div>
                      <p className="text-slate-800 font-medium pl-5">
                        {store.location || 'Direct in-store pickup. Address confirmed on WhatsApp.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Note to vendor Card */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Note to vendor
                    </label>
                    <span className="text-[10px] text-slate-400">Optional - packaging requests, gift message...</span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Anything they should know before packing?"
                    value={buyerNote}
                    onChange={(e) => setBuyerNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-400 resize-none font-medium"
                  />
                </div>

                {/* Selected Items Accordion / List */}
                <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Items in Order ({totalItemsCount})
                    </span>
                    <button
                      onClick={onClearCart}
                      className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const itemPrice = item.variant ? item.variant.price : item.product.price;
                      return (
                        <div key={item.id} className="py-2.5 flex items-center gap-3">
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.product.name}</p>
                            <p className="text-[10px] text-slate-400">
                              #{item.product.uid || item.product.id} {item.variant ? `• ${item.variant.name}` : ''}
                            </p>
                            <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">
                              {formatPrice(itemPrice, store.currencySymbol)}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                              <button
                                onClick={() => onUpdateQuantity(item.id, -1)}
                                className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-1.5 text-xs font-mono font-bold">{item.quantity}</span>
                              <button
                                onClick={() => onUpdateQuantity(item.id, 1)}
                                className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              onClick={() => onRemoveItem(item.id)}
                              className="text-slate-300 hover:text-rose-500 p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Sticky Footer CTA */}
        {!placedOrder && items.length > 0 && (
          <div className="p-4 sm:p-5 pb-safe border-t border-slate-200 bg-white space-y-3 shrink-0 shadow-lg">
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da851] text-white font-extrabold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>
                {isSubmitting
                  ? 'Preparing Order...'
                  : `Checkout via WhatsApp →`}
              </span>
            </button>
            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Direct order to vendor · No transaction fees · Instant WhatsApp response</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
