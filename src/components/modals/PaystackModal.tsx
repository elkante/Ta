import React, { useState } from 'react';
import { Check, CheckCircle2, CreditCard, Lock, ShieldCheck, X, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Store } from '../../types';

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  initialPlan?: 'starter' | 'pro';
  onUpgradeSuccess: (plan: 'starter' | 'pro') => void;
}

export const PaystackModal: React.FC<PaystackModalProps> = ({
  isOpen,
  onClose,
  store,
  initialPlan = 'starter',
  onUpgradeSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro'>(initialPlan);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');

  if (!isOpen) return null;

  const activeAmount = selectedPlan === 'starter' ? 500 : 4900;

  const handlePay = () => {
    setIsProcessing(true);
    setStep('processing');

    setTimeout(() => {
      setIsProcessing(false);
      setStep('success');

      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
        });
      } catch (e) {
        // ignore
      }

      setTimeout(() => {
        onUpgradeSuccess(selectedPlan);
        onClose();
        setStep('checkout');
      }, 1800);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col pb-safe sm:pb-0 z-10">
        {/* Paystack header banner */}
        <div className="bg-[#00132b] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00c3f7] flex items-center justify-center font-bold text-slate-950 text-xs">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm tracking-tight text-white">paystack</span>
                <span className="bg-white/10 text-[10px] text-sky-200 px-1.5 py-0.5 rounded font-mono">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Secured Recurring Subscription</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'checkout' && (
          <div className="p-6 space-y-4">
            {/* Plan Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setSelectedPlan('starter')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedPlan === 'starter'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Starter (₦500/mo)
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('pro')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  selectedPlan === 'pro'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Pro (₦4,900/mo)</span>
              </button>
            </div>

            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Subscribe {store.name} to
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center justify-center gap-1.5">
                <span>{selectedPlan === 'starter' ? 'Tá.shop Starter Plan' : 'Tá.shop Pro Plan'}</span>
                {selectedPlan === 'pro' && <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />}
              </h3>
              <div className="mt-1 flex items-baseline justify-center gap-1">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  ₦{activeAmount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500">/ month</span>
              </div>
            </div>

            {/* Feature Perks according to plan */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700">
              {selectedPlan === 'starter' ? (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Up to 10 products</strong> with multiple variants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Custom store slug:</strong> tá.shop/{store.slug}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Item UID search (#TA-...)</strong> & WhatsApp order bag</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Loud order audio alerts</strong> on dashboard</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Unlimited products</strong> (no product caps)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Verified Merchant Blue Tick</strong> on your store</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Remove "Powered by Tá.shop"</strong> platform footer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Advanced WhatsApp order analytics</strong> & export</span>
                  </div>
                </>
              )}
            </div>

            {/* Simulated Card Selector */}
            <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-900">•••• •••• •••• 4081</p>
                  <p className="text-[10px] text-slate-500">Paystack Visa / Mastercard / Verve</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>

            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3.5 bg-[#0ba4db] hover:bg-[#0091c5] text-white font-bold text-xs rounded-xl shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>Pay ₦{activeAmount.toLocaleString()} with Paystack</span>
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>256-bit SSL secured • Cancel subscription anytime</span>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-10 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#0ba4db] border-t-transparent rounded-full animate-spin mx-auto" />
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Authorizing with Paystack...</h4>
              <p className="text-xs text-slate-500 mt-1">Verifying subscription renewal schedule</p>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-slate-900 text-base">Subscription Activated!</h4>
            <p className="text-xs text-slate-600">
              {store.name} is now subscribed to{' '}
              <strong className="text-emerald-700">
                {selectedPlan === 'starter' ? 'Tá.shop Starter (₦500/mo)' : 'Tá.shop Pro (₦4,900/mo)'}
              </strong>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
