import React, { useState } from 'react';
import { Bot, Check, CheckCircle2, CreditCard, Lock, ShieldCheck, X, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Store } from '../../types';

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  initialPlan?: 'starter' | 'pro' | 'business';
  initialCycle?: 'monthly' | 'yearly';
  onUpgradeSuccess: (plan: 'starter' | 'pro' | 'business') => void;
}

export const PaystackModal: React.FC<PaystackModalProps> = ({
  isOpen,
  onClose,
  store,
  initialPlan = 'pro',
  initialCycle = 'monthly',
  onUpgradeSuccess,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'starter' | 'pro' | 'business'>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialCycle);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'checkout' | 'processing' | 'success'>('checkout');

  if (!isOpen) return null;

  // Pricing matrix:
  // Starter: ₦500/mo, ₦6,000/yr (No discount)
  // Pro: ₦4,900/mo, ₦39,000/yr (Save 20% / ₦19,800 off)
  // Business AI: ₦25,000/mo, ₦200,000/yr (Save 20% / ₦100,000 off)
  const getAmount = () => {
    if (selectedPlan === 'starter') {
      return billingCycle === 'monthly' ? 500 : 6000;
    }
    if (selectedPlan === 'pro') {
      return billingCycle === 'monthly' ? 4900 : 39000;
    }
    return billingCycle === 'monthly' ? 25000 : 200000;
  };

  const activeAmount = getAmount();

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
                  LIVE SECURED
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Automated Card & Bank Subscription</p>
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
          <div className="p-6 space-y-4 overflow-y-auto">
            {/* Billing Cycle Switcher */}
            <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual (Yearly)</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0.2 rounded-full font-black">
                  SAVE 20%
                </span>
              </button>
            </div>

            {/* Plan Selector Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedPlan('starter')}
                className={`py-2 px-2 rounded-xl transition cursor-pointer truncate ${
                  selectedPlan === 'starter'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Starter
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('pro')}
                className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                  selectedPlan === 'pro'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3 text-slate-950 fill-slate-950" />
                <span>Pro</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('business')}
                className={`py-2 px-2 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                  selectedPlan === 'business'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>AI Bot</span>
              </button>
            </div>

            <div className="text-center pb-2 border-b border-slate-100">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Subscribe {store.name} to
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center justify-center gap-1.5">
                <span>
                  {selectedPlan === 'business'
                    ? 'Tá.shop Business AI Plan'
                    : selectedPlan === 'pro'
                    ? 'Tá.shop Pro Seller'
                    : 'Tá.shop Starter Plan'}
                </span>
                {selectedPlan === 'pro' && <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />}
                {selectedPlan === 'business' && <Bot className="w-4 h-4 text-violet-600" />}
              </h3>
              
              <div className="mt-2 flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900 font-mono">
                  ₦{activeAmount.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {billingCycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>

              {billingCycle === 'yearly' && selectedPlan !== 'starter' && (
                <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  🎉 20% Annual Discount Applied (2 Months Free)
                </span>
              )}
            </div>

            {/* Feature Perks according to plan */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700">
              {selectedPlan === 'business' ? (
                <>
                  <div className="flex items-center gap-2 text-violet-800 font-semibold">
                    <Check className="w-4 h-4 text-violet-600" />
                    <span>24/7 AI WhatsApp Bot (auto-replies to inquiries)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-600" />
                    <span>Smart product recommendations & auto-checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-violet-600" />
                    <span>Verified Blue Tick & all Pro features included</span>
                  </div>
                </>
              ) : selectedPlan === 'pro' ? (
                <>
                  <div className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Unlimited products & variant checkboxes</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Verified Merchant Blue Tick</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Remove "Powered by Tá.shop" branding</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Up to 10 products with custom slug</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Item UID search & loud order chime</span>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-xl bg-[#0ba4db] hover:bg-[#0091c5] active:scale-95 text-white font-bold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>
                Pay ₦{activeAmount.toLocaleString()} with Paystack
              </span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>PCI-DSS Level 1 Encrypted • Pay with Naira Card, USSD, or Bank Transfer</span>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#00c3f7] border-t-transparent rounded-full animate-spin mx-auto" />
            <h4 className="font-bold text-slate-900 text-base">Processing Transaction...</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Communicating securely with Paystack. Verifying payment of ₦{activeAmount.toLocaleString()}.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="p-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg">Subscription Activated!</h4>
              <p className="text-xs text-slate-500 mt-1">
                {store.name} has been upgraded to {selectedPlan.toUpperCase()} ({billingCycle}). All perks are active immediately.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
