import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  CreditCard,
  Globe,
  Zap,
} from 'lucide-react';
import { getActivePlanConfigs } from '../../utils/planLimits';
import { getRootDomain } from '../../utils/storage';

interface PricingPageProps {
  onOpenSignup: (initialSlug?: string) => void;
  onBack: () => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onOpenSignup, onBack }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [planConfigs, setPlanConfigs] = useState(() => getActivePlanConfigs());
  const rootDomain = getRootDomain();

  useEffect(() => {
    const handleSettingsUpdate = () => setPlanConfigs(getActivePlanConfigs());
    window.addEventListener('tashop:settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);
    return () => {
      window.removeEventListener('tashop:settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  // Scroll to top when page mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <span className="text-sm font-bold text-slate-900">Pricing Plans</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">

        {/* Hero */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
            Simple Transparent Pricing
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Start free, upgrade as<br className="hidden sm:block" /> your orders grow
          </h1>
          <p className="text-sm text-slate-600">
            Pick the catalog capacity and automation tier tailored for your WhatsApp & Instagram storefront.<br />
            <strong className="text-emerald-900">Zero transaction fees. 0% commission. Your money, all yours.</strong>
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Annual (Yearly)</span>
                <span className="bg-emerald-100 text-emerald-900 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                  SAVE UP TO 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">

          {/* 1. Free Trial */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Free Trial</h3>
              <p className="text-xs text-slate-500 mt-1">Test your social catalog with zero upfront cost.</p>
              <div className="mt-4 text-3xl font-black font-mono text-slate-900">
                ₦0
                <span className="text-xs font-normal text-slate-400 block mt-0.5">Forever free</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2 font-semibold text-slate-900"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Up to 4 products</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>5 photos per product</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Item UID search (#TA-XXX)</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Direct WhatsApp checkout</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Loud audio order alerts</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Instant waybill generator</span></li>
              </ul>
            </div>
            <button
              onClick={() => onOpenSignup()}
              className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Start Free Store
            </button>
          </div>

          {/* 2. Starter */}
          <div className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Starter</h3>
              <p className="text-xs text-slate-500 mt-1">Essential social catalog for WhatsApp sellers.</p>
              <div className="mt-4 text-3xl font-black font-mono text-slate-900">
                ₦{billingCycle === 'monthly' ? planConfigs.starter.priceMonthly.toLocaleString() : planConfigs.starter.priceYearly.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 block mt-0.5">/ {billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2 font-semibold text-slate-900"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Up to {planConfigs.starter.productLimit} products with variants</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Custom store web link</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Store banner, logo & address</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Customer inquiry click tracker</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Printable store QR code</span></li>
              </ul>
            </div>
            <button
              onClick={() => onOpenSignup()}
              className="mt-6 w-full py-2.5 bg-white border border-slate-300 hover:bg-emerald-50 hover:border-emerald-300 text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              Launch Starter
            </button>
          </div>

          {/* 3. Basic */}
          <div className="p-6 rounded-3xl border border-emerald-300 bg-emerald-50/40 flex flex-col justify-between shadow-2xs relative">
            <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
              Popular Value
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Tá.shop Basic</h3>
              <p className="text-xs text-slate-500 mt-1">Best value for expanding store inventory.</p>
              <div className="mt-4 text-3xl font-black font-mono text-emerald-950">
                ₦{billingCycle === 'monthly' ? planConfigs.basic.priceMonthly.toLocaleString() : planConfigs.basic.priceYearly.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 block mt-0.5">/ {billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
              {billingCycle === 'yearly' && (
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Save ₦{(planConfigs.basic.priceMonthly * 12 - planConfigs.basic.priceYearly).toLocaleString()}/yr
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                <li className="flex items-center gap-2 font-bold text-emerald-950"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Up to {planConfigs.basic.productLimit} products</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Up to 5 photos per product</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>AI product descriptions</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Status Studio marketing cards</span></li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Notes & profit calculator</span></li>
              </ul>
            </div>
            <button
              onClick={() => onOpenSignup()}
              className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Choose Basic
            </button>
          </div>

          {/* 4. Pro */}
          <div className="p-6 rounded-3xl border-2 border-slate-900 bg-white relative flex flex-col justify-between shadow-lg">
            <span className="absolute -top-3 right-6 bg-slate-900 text-emerald-400 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Most Popular
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <span>Tá.shop Pro</span>
                <Zap className="w-4 h-4 text-emerald-500 fill-emerald-500" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">For growing brands on WhatsApp & Instagram.</p>
              <div className="mt-4 text-3xl font-black font-mono text-slate-900">
                ₦{billingCycle === 'monthly' ? planConfigs.pro.priceMonthly.toLocaleString() : planConfigs.pro.priceYearly.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 block mt-0.5">/ {billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
              {billingCycle === 'yearly' && (
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Save ₦{(planConfigs.pro.priceMonthly * 12 - planConfigs.pro.priceYearly).toLocaleString()}/yr
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-800">
                <li className="flex items-center gap-2 font-bold text-slate-900"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Up to {planConfigs.pro.productLimit} products</span></li>
                <li className="flex items-center gap-2 font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg">
                  <BadgeCheck className="w-4 h-4 text-blue-600 fill-blue-100 shrink-0" /><span>Verified Blue Tick Badge</span>
                </li>
                <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Customer reviews & ratings</span></li>
                <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Priority WhatsApp analytics</span></li>
                <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Multi-photo uploads & UID search</span></li>
              </ul>
            </div>
            <button
              onClick={() => onOpenSignup()}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Get Started with Pro
            </button>
          </div>

          {/* 5. Business AI */}
          <div className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-500 bg-gradient-to-b from-emerald-50/50 to-white relative flex flex-col justify-between shadow-lg">
            <span className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-2xs">
              🤖 AI WhatsApp Bot
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <span>Business AI</span>
                <Bot className="w-4 h-4 text-emerald-600" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">Autonomous WhatsApp commerce & {planConfigs.business.productLimit} products.</p>
              <div className="mt-4 text-2xl sm:text-3xl font-black font-mono text-emerald-950">
                ₦{billingCycle === 'monthly' ? planConfigs.business.priceMonthly.toLocaleString() : planConfigs.business.priceYearly.toLocaleString()}
                <span className="text-xs font-normal text-slate-400 block mt-0.5">/ {billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
              {billingCycle === 'yearly' && (
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Save ₦{(planConfigs.business.priceMonthly * 12 - planConfigs.business.priceYearly).toLocaleString()}/yr
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-800">
                <li className="flex items-center gap-2 font-bold text-emerald-950 bg-emerald-100/70 px-2 py-1 rounded-lg">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" /><span>Up to {planConfigs.business.productLimit} Products</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg">
                  <BadgeCheck className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" /><span>Official Golden Tick Badge</span>
                </li>
                <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>100% White-Label (No branding)</span></li>
                <li className="flex items-center gap-2 font-medium text-emerald-900">
                  <Bot className="w-4 h-4 text-emerald-600 shrink-0" /><span>24/7 AI Bot (Photos & prices)</span>
                </li>
                <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>Automated WhatsApp receipts</span></li>
              </ul>
            </div>
            <button
              onClick={() => onOpenSignup()}
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Choose Business
            </button>
          </div>

          {/* 6. Enterprise (.com.ng / .ng Domain & Card) */}
          <div className="p-5 sm:p-6 rounded-3xl border-2 border-emerald-600 bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/30 relative flex flex-col justify-between shadow-xl">
            <span className="absolute -top-3 right-4 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
              🌐 Official .com.ng / .ng + Card
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <span>Enterprise</span>
                <Globe className="w-4 h-4 text-emerald-700" />
              </h3>
              <p className="text-xs text-slate-500 mt-1">Unlimited catalog with official domain, customized digital card & 1 year plan.</p>
              <div className="mt-4 text-2xl sm:text-3xl font-black font-mono text-emerald-950">
                ₦{billingCycle === 'monthly' ? (planConfigs.enterprise?.priceMonthly ?? 21000).toLocaleString() : (planConfigs.enterprise?.priceYearly ?? 210000).toLocaleString()}
                <span className="text-xs font-normal text-slate-400 block mt-0.5">/ {billingCycle === 'yearly' ? 'year' : 'month'}</span>
              </div>
              {billingCycle === 'yearly' && (
                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Save ₦{(((planConfigs.enterprise?.priceMonthly ?? 21000) * 12) - (planConfigs.enterprise?.priceYearly ?? 210000)).toLocaleString()}/yr
                </span>
              )}
              <ul className="mt-6 space-y-2.5 text-xs text-slate-800">
                <li className="flex items-center gap-2 font-bold text-emerald-950 bg-emerald-100/90 px-2 py-1 rounded-lg border border-emerald-300">
                  <Check className="w-4 h-4 text-emerald-700 shrink-0" /><span>{planConfigs.enterprise?.productLimit && planConfigs.enterprise.productLimit < 999999 ? `Up to ${planConfigs.enterprise.productLimit} Products` : 'UNLIMITED Products (No Cap)'}</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-slate-900 bg-white border border-slate-300 px-2 py-1 rounded-lg">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" /><span>Official .com.ng or .ng Domain</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-slate-900 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                  <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" /><span>Customized Digital Card (1 Year Plan)</span>
                </li>
                <li className="flex items-center gap-2 font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                  <BadgeCheck className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" /><span>Official Golden Tick Badge</span>
                </li>
                <li className="flex items-center gap-2 font-medium text-emerald-900">
                  <Bot className="w-4 h-4 text-emerald-600 shrink-0" /><span>24/7 AI WhatsApp Bot Engine</span>
                </li>
                <li className="flex items-center gap-2 font-medium"><Check className="w-4 h-4 text-emerald-600 shrink-0" /><span>100% White-Label & VIP Concierge</span></li>
              </ul>
            </div>
            <button
              onClick={() => onOpenSignup()}
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              Get Enterprise
            </button>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-lg">Feature Comparison</h2>
            <p className="text-xs text-slate-500 mt-1">All plans include direct WhatsApp checkout, 0% commission, and lifetime store data retention.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-5 py-3 font-bold text-slate-700 min-w-[160px]">Feature</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700">Free</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-700">Starter</th>
                  <th className="text-center px-4 py-3 font-bold text-emerald-700">Basic</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-900">Pro</th>
                  <th className="text-center px-4 py-3 font-bold text-emerald-700">Business AI</th>
                  <th className="text-center px-4 py-3 font-bold text-emerald-800">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  [
                    'Max products',
                    '4',
                    String(planConfigs.starter.productLimit),
                    String(planConfigs.basic.productLimit),
                    String(planConfigs.pro.productLimit),
                    String(planConfigs.business.productLimit),
                    planConfigs.enterprise?.productLimit && planConfigs.enterprise.productLimit < 999999
                      ? String(planConfigs.enterprise.productLimit)
                      : 'Unlimited'
                  ],
                  ['Photos per product', '5', '5', '5', '5', '5', '5'],
                  ['Product video link', '✓', '✓', '✓', '✓', '✓', '✓'],
                  ['WhatsApp checkout', '✓', '✓', '✓', '✓', '✓', '✓'],
                  ['UID fast search', '✓', '✓', '✓', '✓', '✓', '✓'],
                  ['Waybill generator', '✓', '✓', '✓', '✓', '✓', '✓'],
                  ['Audio order alerts', '✓', '✓', '✓', '✓', '✓', '✓'],
                  ['Custom store link', '—', '✓', '✓', '✓', '✓', '✓'],
                  ['Store QR code', '—', '✓', '✓', '✓', '✓', '✓'],
                  ['AI product descriptions', '—', '—', '✓', '✓', '✓', '✓'],
                  ['Status Studio cards', '—', '—', '✓', '✓', '✓', '✓'],
                  ['Notes & profit tool', '—', '—', '✓', '✓', '✓', '✓'],
                  ['Customer reviews', '—', '—', '—', '✓', '✓', '✓'],
                  ['Verified Blue Tick', '—', '—', '—', '✓', '—', '—'],
                  ['Golden Tick Badge', '—', '—', '—', '—', '✓', '✓'],
                  ['24/7 AI WhatsApp bot', '—', '—', '—', '—', '✓', '✓'],
                  ['Bot pause / schedule', '—', '—', '—', '—', '✓', '✓'],
                  ['White-label (no branding)', '—', '—', '—', '—', '✓', '✓'],
                  ['Official .com.ng / .ng domain', '—', '—', '—', '—', '—', '✓'],
                  ['Custom digital card (1yr)', '—', '—', '—', '—', '—', '✓'],
                  ['Automated WA receipts', '—', '—', '—', '—', '✓', '✓'],
                ].map(([feature, ...cols]) => (
                  <tr key={feature} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-slate-700">{feature}</td>
                    {cols.map((val, i) => (
                      <td key={i} className={`text-center px-4 py-2.5 ${val === '✓' ? 'text-emerald-600 font-bold' : val === '—' ? 'text-slate-300' : 'font-semibold text-slate-800'}`}>
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-xl font-extrabold text-slate-900 text-center">Pricing FAQ</h2>
          {[
            {
              q: 'Is there a free trial or can I start for free?',
              a: 'Yes! The Free tier is free forever — no credit card needed. You get up to 4 products, full WhatsApp checkout, and waybill generation at zero cost.',
            },
            {
              q: 'Are there any transaction fees or hidden commissions?',
              a: 'Absolutely zero. You keep 100% of every sale. Customers pay you directly via bank transfer, Opay, or cash — Tá.shop never touches your money.',
            },
            {
              q: 'What happens when my subscription expires?',
              a: 'Your store enters a 5-day grace period where everything keeps working normally. After that, you drop to Free tier limits until you renew. Your data is never deleted.',
            },
            {
              q: `Can I get a free store link like mybrand.${rootDomain}?`,
              a: `Every store — even Free — gets a permanent link at yourhandle.${rootDomain}. On Business AI you can also map your own .com or .ng domain.`,
            },
            {
              q: 'Can I upgrade or downgrade anytime?',
              a: 'Yes. You can upgrade instantly and your new plan takes effect immediately. Downgrades take effect at the end of your current billing period.',
            },
          ].map((item) => (
            <div key={item.q} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm">{item.q}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-extrabold text-slate-900">Ready to start selling?</h2>
          <p className="text-sm text-slate-500">Join thousands of WhatsApp sellers. Free store live in 30 seconds.</p>
          <button
            onClick={() => onOpenSignup()}
            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            Claim Your Free Store →
          </button>
        </div>
      </div>
    </div>
  );
};
