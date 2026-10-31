import React from 'react';
import { X, Zap, Check, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Store } from '../../types';
import {
  getProductLimitByTier,
  getPlanNameByTier,
  getNextUpgradePlan,
  PLAN_CONFIGS,
} from '../../utils/planLimits';

interface ProductLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  currentProductCount: number;
  onOpenUpgrade: (targetPlan: 'starter' | 'basic' | 'pro' | 'business') => void;
}

export const ProductLimitModal: React.FC<ProductLimitModalProps> = ({
  isOpen,
  onClose,
  store,
  currentProductCount,
  onOpenUpgrade,
}) => {
  if (!isOpen) return null;

  const currentLimit = getProductLimitByTier(store.tier);
  const currentPlanName = getPlanNameByTier(store.tier);
  const nextPlan = getNextUpgradePlan(store.tier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>

          <h3 className="text-lg font-extrabold tracking-tight">Product Limit Reached</h3>
          <p className="text-xs text-amber-100 mt-1 max-w-xs mx-auto">
            Your {currentPlanName} allows up to{' '}
            <span className="font-bold text-white font-mono">{currentLimit}</span> products.
          </p>

          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-black/20 rounded-full text-xs font-mono font-bold">
            <span>{currentProductCount} / {currentLimit} products used</span>
          </div>
        </div>

        {/* Upgrade Recommendation */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recommended Upgrade
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Unlock {nextPlan.productLimit === Infinity ? 'Unlimited' : `${nextPlan.productLimit} Products`}
              </span>
            </div>

            <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>{nextPlan.name}</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </h4>

            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 font-mono">
                ₦{nextPlan.priceMonthly.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">/ month</span>
            </div>

            <ul className="mt-3 space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2 font-semibold text-emerald-800">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {nextPlan.productLimit === Infinity
                    ? 'UNLIMITED catalog products'
                    : `Up to ${nextPlan.productLimit} products (vs. ${currentLimit} now)`}
                </span>
              </li>
              {store.tier === 'free' && (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI product descriptions (5 daily)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp Status Studio & expense tracker</span>
                  </li>
                </>
              )}
              {store.tier === 'basic' && (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Verified Merchant Blue Tick</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Customer reviews collection</span>
                  </li>
                </>
              )}
              {store.tier === 'pro' && (
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>24/7 AI WhatsApp Bot (auto-replies & cards)</span>
                </li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => {
                onClose();
                onOpenUpgrade(nextPlan.targetPlan);
              }}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Upgrade to {nextPlan.name}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
