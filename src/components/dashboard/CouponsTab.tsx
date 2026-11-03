import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Copy,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { Store, StoreCoupon } from '../../types';
import { formatPrice } from '../../utils/whatsapp';
import { dbSaveStore } from '../../utils/supabase';
import { getStoreCoupons, saveStoreCoupons } from '../../utils/storage';

interface CouponsTabProps {
  store: Store;
  onUpdateStore: (updatedStore: Store) => void;
}

export const CouponsTab: React.FC<CouponsTabProps> = ({ store, onUpdateStore }) => {
  const [coupons, setCoupons] = useState<StoreCoupon[]>(() => {
    if (store.coupons && Array.isArray(store.coupons)) {
      return store.coupons;
    }
    return getStoreCoupons(store.id);
  });

  const [isNewCouponOpen, setIsNewCouponOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // New Coupon Form States
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [usageLimit, setUsageLimit] = useState<string>('');
  const [minOrder, setMinOrder] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');

  const handleGenerateCode = () => {
    const prefixes = ['SAVE', 'PROMO', 'DEAL', 'VIP', 'WELCOME', 'DROP', 'SPECIAL'];
    const randPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const val = discountType === 'percent' ? discountValue || '10' : 'OFF';
    const randNum = Math.floor(10 + Math.random() * 89);
    setCode(`${randPrefix}${val === 'OFF' ? randNum : val}`);
  };

  const handleSaveCouponsList = async (updated: StoreCoupon[]) => {
    setCoupons(updated);
    saveStoreCoupons(store.id, updated);
    const updatedStore: Store = { ...store, coupons: updated };
    onUpdateStore(updatedStore);
    try {
      await dbSaveStore(updatedStore);
    } catch (e) {
      console.warn('Failed to sync coupons to Supabase:', e);
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');

    if (!cleanCode) {
      setFormError('Please enter a coupon code');
      return;
    }

    if (coupons.some((c) => c.code === cleanCode)) {
      setFormError('A coupon with this code already exists. Please choose a different code.');
      return;
    }

    const numVal = parseFloat(discountValue);
    if (isNaN(numVal) || numVal <= 0) {
      setFormError('Please enter a valid discount amount or percentage');
      return;
    }

    if (discountType === 'percent' && (numVal < 1 || numVal > 90)) {
      setFormError('Percentage discount must be between 1% and 90%');
      return;
    }

    const newCoupon: StoreCoupon = {
      id: `cpn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: store.id,
      code: cleanCode,
      discountType,
      discountValue: numVal,
      usageLimit: usageLimit ? parseInt(usageLimit, 10) : null,
      usageCount: 0,
      minOrderAmount: minOrder ? parseFloat(minOrder) : null,
      expiryDate: expiryDate || null,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const nextList = [newCoupon, ...coupons];
    handleSaveCouponsList(nextList);

    // Reset Form
    setIsNewCouponOpen(false);
    setCode('');
    setDiscountType('percent');
    setDiscountValue('10');
    setUsageLimit('');
    setMinOrder('');
    setExpiryDate('');
    setFormError(null);
  };

  const handleToggleActive = (couponId: string) => {
    const nextList = coupons.map((c) =>
      c.id === couponId ? { ...c, isActive: !c.isActive } : c
    );
    handleSaveCouponsList(nextList);
  };

  const handleDeleteCoupon = (couponId: string) => {
    if (confirm('Are you sure you want to delete this coupon?')) {
      const nextList = coupons.filter((c) => c.id !== couponId);
      handleSaveCouponsList(nextList);
    }
  };

  const handleCopy = (couponCode: string) => {
    navigator.clipboard.writeText(couponCode);
    setCopiedCode(couponCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const activeCount = coupons.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Coupons &amp; Discounts</span>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
              {coupons.length} total • {activeCount} active
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Create promotional codes for customers to apply on your WhatsApp checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setIsNewCouponOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>New coupon</span>
        </button>
      </div>

      {/* Quick Stat Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Active Coupons
          </span>
          <span className="text-2xl font-black font-mono text-slate-900">{activeCount}</span>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready to use by customers</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total Redemptions
          </span>
          <span className="text-2xl font-black font-mono text-emerald-600">
            {coupons.reduce((sum, c) => sum + (c.usageCount || 0), 0)}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Orders completed with coupon</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Checkout Automation
          </span>
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Automatic WhatsApp sync</span>
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Applies in buyer cart drawer</p>
        </div>
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-8 sm:p-12 text-center space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Tag className="w-7 h-7" />
          </div>
          <h3 className="font-black text-slate-900 text-base">No coupons created yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Offer special percent-off or fixed cash discounts to drive more sales and reward your loyal customers.
          </p>
          <button
            type="button"
            onClick={() => setIsNewCouponOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs shadow hover:bg-slate-800 transition cursor-pointer"
          >
            Create your first coupon →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {coupons.map((coupon) => {
              const isExpired =
                coupon.expiryDate && new Date(coupon.expiryDate).getTime() < new Date().setHours(0, 0, 0, 0);

              return (
                <div
                  key={coupon.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                    !coupon.isActive || isExpired ? 'bg-slate-50/70 opacity-70' : 'hover:bg-slate-50/40'
                  }`}
                >
                  {/* Left Info */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        coupon.discountType === 'percent'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                      }`}
                    >
                      <Tag className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg tracking-wider">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(coupon.code)}
                          className="text-slate-400 hover:text-slate-700 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                          title="Copy coupon code"
                        >
                          {copiedCode === coupon.code ? (
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Copied!
                            </span>
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {isExpired && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.2 rounded-full">
                            Expired
                          </span>
                        )}
                        {!coupon.isActive && !isExpired && (
                          <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.2 rounded-full">
                            Paused
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-bold text-slate-800">
                          {coupon.discountType === 'percent'
                            ? `${coupon.discountValue}% OFF`
                            : `${formatPrice(coupon.discountValue, store.currencySymbol)} OFF`}
                        </span>
                        <span>•</span>
                        <span>
                          {coupon.minOrderAmount
                            ? `Min order: ${formatPrice(coupon.minOrderAmount, store.currencySymbol)}`
                            : 'No min order'}
                        </span>
                        <span>•</span>
                        <span>
                          {coupon.usageLimit ? `${coupon.usageCount} / ${coupon.usageLimit} used` : `${coupon.usageCount} used (Unlimited)`}
                        </span>
                        {coupon.expiryDate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Expires: {coupon.expiryDate}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(coupon.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                        coupon.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                    >
                      {coupon.isActive ? 'Active' : 'Enable'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCoupon(coupon.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Delete coupon"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODAL: NEW COUPON (Directly inspired by Image 1) ── */}
      {isNewCouponOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-lg">New coupon</h3>
              <button
                type="button"
                onClick={() => setIsNewCouponOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              {/* Field 1: Code + Generate button */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="E.G. LAUNCH10"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                      setFormError(null);
                    }}
                    className="flex-1 px-3.5 py-2.5 border-2 border-blue-500/80 rounded-xl font-mono font-bold text-xs sm:text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Generate</span>
                  </button>
                </div>
              </div>

              {/* Field 2: Discount Type (Segmented Buttons) */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">Discount type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percent');
                      setDiscountValue('10');
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      discountType === 'percent'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs ring-2 ring-blue-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Percent off
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('fixed');
                      setDiscountValue('1000');
                    }}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      discountType === 'fixed'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-700 shadow-xs ring-2 ring-blue-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Amount off ({store.currencySymbol || '₦'})
                  </button>
                </div>
              </div>

              {/* Field 3: Value input */}
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {discountType === 'percent'
                    ? 'Percent off (1–90)'
                    : `Discount amount (${store.currencySymbol || '₦'})`}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={discountType === 'percent' ? 90 : 5000000}
                  placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 2000'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Field 4: Usage Limit & Min Order side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-800">Usage limit</label>
                    <span className="text-[10px] text-slate-400">(optional)</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-bold text-slate-800">Min order ({store.currencySymbol || '₦'})</label>
                    <span className="text-[10px] text-slate-400">(optional)</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    placeholder="None"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {/* Field 5: Expiry date */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-bold text-slate-800">Expiry date</label>
                  <span className="text-[10px] text-slate-400">(optional)</span>
                </div>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-[0.99] cursor-pointer"
                >
                  Create coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
