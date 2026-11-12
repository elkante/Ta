import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Globe,
  Hash,
  LayoutDashboard,
  Lock,
  LogIn,
  MessageCircle,
  Package,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store as StoreIcon,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react';
import { SellerSession, Store } from '../../types';
import { validateSlug, getRootDomain } from '../../utils/storage';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { PlatformLeadBotBubble } from './PlatformLeadBotBubble';

interface LandingPageProps {
  stores: Store[];
  sellerSession?: SellerSession | null;
  onOpenStore: (slug: string) => void;
  onOpenPricing?: () => void;
  onOpenLogin: () => void;
  onOpenSignup: (initialSlug?: string) => void;
  onOpenDashboard?: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy' | 'cookies') => void;
}

const ROTATING_WORDS = ['customer', 'inventory', 'sales', 'order', 'waybill', 'WhatsApp'];

export const LandingPage: React.FC<LandingPageProps> = ({
  stores,
  sellerSession,
  onOpenStore,
  onOpenPricing,
  onOpenLogin,
  onOpenSignup,
  onOpenDashboard,
  onOpenSuperAdmin,
  onOpenLegal,
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [wordIndex, setWordIndex] = useState(0);

  const rootDomain = getRootDomain();
  const cleanHandle = handleInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  // Dynamic typewriter word rotation (matching Bumpa-style headline with unique Taaa.shop twist)
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleAvailability = useMemo(() => {
    if (!cleanHandle || cleanHandle.length < 2) return null;
    const isTaken = stores.some((s) => s.slug.toLowerCase() === cleanHandle);
    return isTaken ? 'taken' : 'available';
  }, [cleanHandle, stores]);

  // ─── 6-tap easter egg on logo (Mobile & PC) → opens /sys-hq ─────────────────
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const handleLogoTap = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastTapTimeRef.current < 50) return;
    lastTapTimeRef.current = now;

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    tapCountRef.current += 1;
    const currentTaps = tapCountRef.current;

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(currentTaps >= 6 ? [60, 80, 60] : 30);
      } catch (err) {}
    }

    if (currentTaps >= 6) {
      tapCountRef.current = 0;
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      window.history.pushState({}, '', '/sys-hq');
      if (onOpenSuperAdmin) {
        onOpenSuperAdmin();
      } else {
        window.location.href = '/sys-hq';
      }
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      if (tapCountRef.current === 1) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      tapCountRef.current = 0;
    }, 1800);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ─── PWA Install Prompt (Landing page only) ─────────────────────────────
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handlePrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) {
      onOpenSignup();
      return;
    }

    const check = validateSlug(handleInput);
    if (!check.isValid) {
      setHandleError(check.error || 'Invalid slug');
      return;
    }

    setHandleError(null);
    onOpenSignup(check.cleanSlug);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfd] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden w-full max-w-full">
      {/* ─── Top Navbar (Crisp White & Emerald Accents) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo with 6-tap easter egg */}
          <button
            onClick={handleLogoTap}
            onPointerDown={(e) => {
              if (e.pointerType === 'touch') {
                handleLogoTap(e);
              }
            }}
            style={{
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
            className="flex items-center gap-2.5 cursor-pointer text-left relative active:scale-95 transition-transform"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs tracking-tight shadow-xs shadow-emerald-600/30">
              Tá
            </div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-base tracking-tight text-slate-900">Taaa</span>
              <span className="font-extrabold text-base tracking-tight text-emerald-600">.shop</span>
            </div>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/60 rounded-full px-2 py-0.5">
              WhatsApp Commerce
            </span>
          </button>

          {/* Navigation Links & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="#features"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-600 hidden md:inline-block transition"
            >
              Features
            </a>
            <a
              href="#featured"
              className="text-xs font-semibold text-slate-600 hover:text-emerald-600 hidden md:inline-block transition"
            >
              Stores
            </a>
            <button
              type="button"
              onClick={onOpenPricing}
              className="text-xs font-semibold text-slate-600 hover:text-emerald-600 hidden md:inline-block transition cursor-pointer"
            >
              Pricing
            </button>

            {installPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Install Taaa.shop App to your home screen"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xs:inline">Install App</span>
              </button>
            )}

            {sellerSession ? (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs shadow-emerald-600/20"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-white" />
                <span>Dashboard ({sellerSession.storeName})</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </button>
            )}

            <button
              onClick={() => onOpenSignup()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-600/30 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>Get Started</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Hero Section (Emerald Theme with Dynamic Rotating Keyword) ─── */}
      <section className="relative pt-12 sm:pt-16 pb-12 sm:pb-16 px-4 sm:px-6 overflow-hidden">
        {/* Soft Ambient Emerald Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[480px] pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/70 via-teal-50/40 to-transparent blur-3xl -z-10" />

        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Top Pill / Badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 rounded-full text-xs font-semibold text-emerald-800 shadow-2xs backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>⚡ 2026 Social Commerce Engine for African Merchants</span>
            <ArrowRight className="w-3 h-3 text-emerald-600" />
          </div>

          {/* Headline with Typewriter Rotating Keyword */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            Solving your{' '}
            <span className="text-emerald-600 inline-block underline decoration-emerald-200 decoration-wavy underline-offset-8 font-black">
              {ROTATING_WORDS[wordIndex]}
              <span className="text-emerald-500 animate-pulse font-light ml-0.5">|</span>
            </span>
            <br className="hidden sm:inline" /> management problems, one solution at a time.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Simplify your business operations with tools that make storefronts, Item UIDs,
            WhatsApp orders, invoices & waybill generation easy.
          </p>

          {/* Live Claim Store Handle Bar */}
          <div className="max-w-xl mx-auto pt-2">
            <form
              onSubmit={handleClaim}
              className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl shadow-xl shadow-emerald-950/5 border border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all"
            >
              <div className="flex-1 flex items-center px-3 min-w-0">
                <span className="text-xs font-mono font-bold text-slate-400 select-none shrink-0 mr-1">
                  https://
                </span>
                <input
                  type="text"
                  placeholder="yourbrand"
                  value={handleInput}
                  onChange={(e) => {
                    setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setHandleError(null);
                  }}
                  className="w-full py-2 text-xs sm:text-sm font-mono font-semibold text-slate-900 focus:outline-none bg-transparent min-w-0 placeholder:text-slate-300"
                />
                <span className="text-xs font-mono font-bold text-emerald-700 select-none shrink-0 ml-1">
                  .{rootDomain}
                </span>

                {/* Real-time availability indicator badge */}
                {handleAvailability === 'available' && (
                  <span className="hidden xs:inline-flex items-center gap-1 ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0 animate-in fade-in">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Available</span>
                  </span>
                )}
                {handleAvailability === 'taken' && (
                  <span className="hidden xs:inline-flex items-center gap-1 ml-2 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0 animate-in fade-in">
                    <span>Taken</span>
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all active:scale-95 shrink-0 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {handleError && <p className="text-xs text-rose-600 mt-2 font-medium">{handleError}</p>}

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-2">
              <span>⚡ Free 4-product tier</span>
              <span>•</span>
              <span>📱 100% Mobile friendly</span>
              <span>•</span>
              <span>💳 Zero commission fees</span>
            </div>
          </div>

          {/* ── Feature Pills Row (Bumpa inspired tags) ── */}
          <div className="pt-4 flex items-center justify-center gap-2 sm:gap-2.5 flex-wrap max-w-3xl mx-auto">
            {[
              { icon: ShoppingBag, label: 'Storefront Website' },
              { icon: Hash, label: 'Item UID Catalog' },
              { icon: MessageCircle, label: '1-Click WhatsApp Orders' },
              { icon: FileText, label: 'Invoices & Waybills' },
              { icon: Truck, label: 'Delivery Tracking' },
              { icon: BarChart3, label: 'Real-time Analytics' },
              { icon: Bot, label: '24/7 AI WhatsApp Bot' },
              { icon: ShieldCheck, label: 'CAC Verified Stores' },
            ].map((pill, idx) => {
              const Icon = pill.icon;
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-[11px] font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-800 transition"
                >
                  <Icon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{pill.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Hero Visual: Emerald Dashboard Tablet + Mobile Storefront Mockup ─── */}
        <div className="pt-10 sm:pt-14 max-w-5xl mx-auto relative">
          {/* Outer glowing halo */}
          <div className="absolute inset-0 bg-emerald-500/10 rounded-3xl blur-2xl -z-10" />

          {/* Main Dashboard Canvas (Laptop / Tablet Mockup) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden p-4 sm:p-7 relative">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-slate-200" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="ml-2 font-mono text-[11px] text-slate-400 hidden sm:inline">
                  https://taaa.shop/admin/overview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Store Live & Orders Streaming</span>
                </span>
              </div>
            </div>

            {/* Dashboard Mock Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left / Main Dashboard Area */}
              <div className="lg:col-span-8 space-y-5">
                {/* Greeting & Quick Filter */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg">Hi, Zainab RTW 👋</h3>
                    <p className="text-xs text-slate-500">Here's how your store is performing today</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                    Today: All Sales
                  </span>
                </div>

                {/* 4 Stat Cards in Emerald & Clean Slate */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <div className="text-[11px] font-semibold text-emerald-800">Total Revenue</div>
                    <div className="text-base sm:text-lg font-black font-mono text-emerald-950 mt-1">₦1,450,000</div>
                    <div className="text-[10px] font-bold text-emerald-700 mt-0.5 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />
                      <span>+18.4% today</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-600">WhatsApp Orders</div>
                    <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">186</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">14 awaiting waybill</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-600">Catalog Items</div>
                    <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">42</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">All with Item UIDs</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-600">Conversion</div>
                    <div className="text-base sm:text-lg font-black font-mono text-slate-900 mt-1">8.2%</div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Top 5% on Taaa</div>
                  </div>
                </div>

                {/* Emerald Analytics Bar Chart Mock */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Hourly Order Spikes (WhatsApp Inquiries)</span>
                    <span className="text-emerald-700 text-[11px]">Peak: 8:00 PM — 10:30 PM</span>
                  </div>
                  {/* Visual simulated bar chart with emerald heights */}
                  <div className="h-28 flex items-end justify-between gap-1.5 sm:gap-2 px-1 pt-2">
                    {[28, 42, 35, 60, 48, 75, 90, 65, 82, 100, 78, 55, 92, 110, 85].map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        <div
                          className={`w-full rounded-t-md transition-all group-hover:bg-emerald-500 ${
                            i === 9 || i === 13 ? 'bg-emerald-600 shadow-sm' : 'bg-emerald-400/70'
                          }`}
                          style={{ height: `${(val / 110) * 100}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/50">
                    <span>9 AM</span>
                    <span>12 PM</span>
                    <span>3 PM</span>
                    <span>6 PM</span>
                    <span>9 PM</span>
                    <span>11 PM</span>
                  </div>
                </div>
              </div>

              {/* Right / Overlapping Mobile Smartphone Mockup */}
              <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-white/10 text-white">
                {/* Phone Speaker & Camera Notch */}
                <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-2.5" />

                {/* Phone Screen Display */}
                <div className="bg-white rounded-2xl p-3 text-slate-900 space-y-3">
                  {/* Store Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                        ZR
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold flex items-center gap-1">
                          <span className="truncate">Zainab RTW</span>
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white shrink-0" />
                        </div>
                        <p className="text-[9px] text-slate-400">zainab.{rootDomain}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                      Open
                    </span>
                  </div>

                  {/* Phone Mock Product 1 */}
                  <div className="flex gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                      alt="Boubou"
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 truncate">Emerald Silk Boubou</span>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-200 px-1 rounded">#ZN-01</span>
                        </div>
                        <div className="text-xs font-black font-mono text-emerald-700">₦38,000</div>
                      </div>
                      <span className="text-[9px] font-semibold text-emerald-600">In Stock • 3 left</span>
                    </div>
                  </div>

                  {/* Phone Mock Product 2 */}
                  <div className="flex gap-2.5 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <img
                      src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80"
                      alt="Perfume"
                      className="w-14 h-14 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 truncate">Velvet Oud Elixir</span>
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-200 px-1 rounded">#ZN-02</span>
                        </div>
                        <div className="text-xs font-black font-mono text-emerald-700">₦28,000</div>
                      </div>
                      <span className="text-[9px] font-semibold text-emerald-600">In Stock</span>
                    </div>
                  </div>

                  {/* 1-Click WhatsApp Button in Phone */}
                  <div className="pt-1">
                    <div className="w-full py-2 bg-emerald-600 text-white rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Order on WhatsApp (₦66,000)</span>
                    </div>
                    <div className="text-[9px] text-center text-slate-400 mt-1.5 font-medium">
                      Zero registration • Instant waybill ready
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bento Grid Section: Key Operations Solved (Inspired by Bumpa layout) ─── */}
      <section id="features" className="py-14 sm:py-20 bg-white border-y border-slate-100 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
              Built For African Social Sellers
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              One platform, zero headaches.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Run your WhatsApp & Instagram business like a pro with dedicated tools crafted for speed.
            </p>
          </div>

          {/* Bento Grid (Clean Emerald & Soft Tint Containers) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Bento Card 1: Business Website / Storefront */}
            <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-50/70 via-white to-slate-50 border border-emerald-100 relative overflow-hidden flex flex-col justify-between shadow-xs">
              <div className="space-y-3 max-w-md">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shadow-emerald-600/30">
                  <StoreIcon className="w-5 h-5" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                  Get a branded storefront to run online sales
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Add products easily, run discount sales, ship items, and let customers browse login-free. Put your store link in your Instagram bio or WhatsApp status.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-emerald-800">
                  <span className="bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">✨ Zero Customer Login</span>
                  <span className="bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">⚡ Instant WhatsApp Cart</span>
                  <span className="bg-white border border-emerald-200 px-2.5 py-1 rounded-lg">🇳🇬 0% Commission</span>
                </div>
              </div>

              {/* Decorative Store Preview Mock */}
              <div className="mt-6 pt-4 border-t border-emerald-200/50 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Free permanent domain: yourhandle.{rootDomain}</span>
                <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Learn more →
                </span>
              </div>
            </div>

            {/* Bento Card 2: Item UID Search */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 flex flex-col justify-between shadow-xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
                  <Hash className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Search & Order by Item UID
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every product gets an auto-generated tag like <strong className="font-mono text-slate-900">#TA-402</strong>. When posting on WhatsApp status, just include the UID. Buyers type the UID on your store to buy in seconds!
                </p>
              </div>

              <div className="mt-6 p-3 bg-slate-50 rounded-2xl border border-slate-200 font-mono text-xs flex items-center justify-between text-slate-700">
                <span>Search: #TA-402</span>
                <span className="text-emerald-600 font-bold">1 Result Found ✓</span>
              </div>
            </div>

            {/* Bento Card 3: Waybills & Invoices */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 flex flex-col justify-between shadow-xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold border border-emerald-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Instant Waybills & Invoices
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generate professional printable PDF receipts and shipping waybills with one tap. Pre-filled with customer phone number, delivery address, and total amount.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Printer className="w-4 h-4 text-emerald-600" />
                <span>Thermal & A4 Printable Formats</span>
              </div>
            </div>

            {/* Bento Card 4: 24/7 AI Sales Assistant */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white flex flex-col justify-between shadow-lg">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  24/7 AI WhatsApp Sales Bot
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Never sleep on an inquiry. Our automated AI bot checks product availability, answers customer DMs with photo catalog links, and collects order details automatically.
                </p>
              </div>

              <div className="mt-6 p-3 bg-white/10 rounded-2xl border border-white/15 text-[11px] text-emerald-300 font-mono">
                "Hello! Emerald Boubou is in stock (₦38,000). Click to complete order!"
              </div>
            </div>

            {/* Bento Card 5: Analytics & Realtime Tracking */}
            <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between shadow-xs">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">
                  Stay ahead with Taaa Analytics
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Get important data like profit margins, average order value, fast-selling Item UIDs, and WhatsApp inquiry conversions to scale your inventory safely.
                </p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Daily Revenue & Profit Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Social Proof Strip (Crisp Emerald & Dark Slate) ─── */}
      <div className="bg-slate-950 py-12 px-4 sm:px-6 text-white overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">30s</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Store Setup Time</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">₦0</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Transaction Fees</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Direct Bank Payouts</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-400">10k+</div>
              <div className="text-xs text-slate-400 mt-1 font-medium">Happy Shoppers</div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                quote: 'I moved 40 orders in my first week. My customers love how clean my catalog looks.',
                name: 'Amaka C.',
                store: 'Amaka Perfumes · Lagos',
                emoji: '🌸',
              },
              {
                quote: "No more 'what's your price' DMs. They see everything, click, and order directly.",
                name: 'Zainab M.',
                store: 'Zainab Couture · Abuja',
                emoji: '👗',
              },
              {
                quote: 'The QR code on my packaging brings repeat buyers back automatically. Game changer!',
                name: 'Chidi O.',
                store: 'Gadget Hub · Port Harcourt',
                emoji: '📱',
              },
            ].map((t) => (
              <div
                key={t.name}
                className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 hover:bg-white/10 transition"
              >
                <p className="text-xs sm:text-sm text-slate-200 italic leading-relaxed">"{t.quote}"</p>
                <div className="flex items-center gap-2.5 pt-2 border-t border-white/10">
                  <span className="text-xl">{t.emoji}</span>
                  <div>
                    <div className="text-xs font-bold text-white">{t.name}</div>
                    <div className="text-[10px] text-slate-400">{t.store}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Featured Live Storefronts (Curated by Super Admin) ─── */}
      <section id="featured" className="py-14 sm:py-20 bg-white border-y border-slate-100 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block mb-1">
                Live Storefronts
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Explore stores powered by Taaa.shop
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Click any store to test the live customer shopping experience
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
              {['All', 'Fashion', 'Beauty', 'Tech', 'Food', 'Luxury'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Exclusively super-admin curated stores shown on landing */}
          {(() => {
            const liveFeaturedStores = stores
              .filter(
                (s) => s.featuredOnLanding === true && s.status !== 'suspended' && s.status !== 'deleted'
              )
              .filter((s) => {
                if (selectedCategory === 'All') return true;
                const text = `${s.name} ${s.description} ${s.tagline} ${s.location}`.toLowerCase();
                return text.includes(selectedCategory.toLowerCase());
              });

            if (liveFeaturedStores.length === 0) {
              return (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <StoreIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {selectedCategory === 'All'
                      ? 'No Stores Added to Showcase Yet'
                      : `No stores currently listed under "${selectedCategory}"`}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {selectedCategory === 'All'
                      ? 'Live storefronts here are curated exclusively by Super Admin from the Master Admin Portal.'
                      : 'Switch to "All" or explore other categories to view active storefronts.'}
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {liveFeaturedStores.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onOpenStore(s.slug)}
                    className="group relative bg-white rounded-3xl overflow-hidden border border-slate-200/80 hover:border-emerald-300 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Banner */}
                    <div className="relative h-32 w-full overflow-hidden bg-slate-100">
                      <img
                        src={s.bannerUrl}
                        alt={s.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <span className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs text-slate-900 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                        {s.customDomain || `${s.slug}.${getRootDomain()}`}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between -mt-8 relative z-10">
                      <div>
                        <div className="flex items-end gap-3 mb-3">
                          <img
                            src={s.logoUrl}
                            alt={s.name}
                            className="w-14 h-14 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                              <span className="truncate">{s.name}</span>
                              <VerifiedBadge tier={s.tier} verified={s.verified} size="sm" />
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">{s.location}</span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {s.tagline || s.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Orders Active</span>
                        </span>
                        <span className="text-slate-900 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          <span>Visit Store</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ─── Pricing Teaser Banner ─── */}
      <section className="py-14 sm:py-20 bg-slate-50 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
            {/* Ambient background glow */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simple Transparent Pricing</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  Start free forever, upgrade as your orders surge
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  0% transaction fees. Keep 100% of your earnings. From solo merchants testing the waters to established brands requiring 24/7 AI WhatsApp automation.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-2">
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Free Plan: ₦0 forever</span>
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Pro, Business & Enterprise (.ng)</span>
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-400" /> Cancel anytime</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onOpenPricing}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Explore Plans & Limits</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenSignup()}
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition active:scale-95 cursor-pointer text-center"
                >
                  Start Free Store Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ Accordion (Emerald Styling) ─── */}
      <section id="faq" className="py-14 sm:py-20 bg-white border-t border-slate-100 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full inline-block">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Got questions? We've got answers.
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Everything you need to know about setting up your WhatsApp & social catalog.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'Do I need a laptop to set up and manage my store?',
                a: 'No! Taaa.shop is 100% optimized for smartphones. You can snap product photos, set prices, share links on Instagram/TikTok, and receive customer orders entirely on your iPhone or Android phone.',
              },
              {
                q: 'How do I receive payments from customers?',
                a: 'Customers browse your store and click "Order via WhatsApp". An itemized invoice with their delivery address opens in your WhatsApp DM. You receive 100% of the money directly into your Nigerian bank account. Taaa.shop charges 0% commission on your sales.',
              },
              {
                q: 'How does the 24/7 AI WhatsApp Auto-Reply work?',
                a: 'On the Business AI tier, our smart bot connects directly to your WhatsApp. When customers send DMs asking for prices, product availability, or account numbers, the AI automatically replies in seconds with photos, sizes, and direct checkout links—even while you are asleep.',
              },
              {
                q: 'Can I use my own custom domain (e.g. mybrand.com)?',
                a: `Every store starts with a free link like yourbrand.${rootDomain}. On Enterprise, you also get an official .com.ng or .ng domain and a custom digital business card!`,
              },
              {
                q: 'What happens if my subscription expires?',
                a: 'Your products and store data are never deleted. When a plan expires, your store enters an automatic 5-day grace period where everything continues working normally so you have ample time to renew.',
              },
              {
                q: 'Is there any transaction fee or hidden commission?',
                a: 'Zero transaction fees. You keep 100% of your earnings. You only pay for your subscription plan.',
              },
            ].map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.q}
                  className="border border-slate-200/90 rounded-2xl overflow-hidden bg-slate-50/50 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-slate-900 text-sm hover:bg-slate-100/60 transition-colors cursor-pointer gap-4"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-600' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 leading-relaxed animate-in fade-in duration-200 border-t border-slate-200/60 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Sticky Mobile Bottom CTA ─── */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-30 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center justify-between gap-3">
          <div className="pl-2 min-w-0">
            <div className="text-[11px] font-bold text-white truncate">Start selling on WhatsApp</div>
            <div className="text-[9px] text-emerald-400 font-medium">Free • Live in 30 seconds</div>
          </div>
          <button
            type="button"
            onClick={() => onOpenSignup(cleanHandle || undefined)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-xs transition active:scale-95 shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Claim Store</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 py-10 px-4 sm:px-6 text-center text-xs text-slate-400 space-y-3 bg-white">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
            Tá
          </div>
          <span className="font-extrabold text-slate-900">Taaa.shop</span>
        </div>
        <p>© {new Date().getFullYear()} Taaa.shop. The multi-tenant social commerce catalog platform.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 text-[11px] text-slate-500">
          <a href="#featured" className="hover:text-emerald-700 transition cursor-pointer font-medium">
            Explore Stores
          </a>
          <span>•</span>
          <button onClick={onOpenLogin} className="hover:text-emerald-700 transition cursor-pointer font-medium">
            Seller Login
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal?.('terms')}
            className="hover:text-emerald-700 transition cursor-pointer font-medium"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal?.('privacy')}
            className="hover:text-emerald-700 transition cursor-pointer font-medium"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal?.('cookies')}
            className="hover:text-emerald-700 transition cursor-pointer font-medium"
          >
            Cookie Policy
          </button>
        </div>
      </footer>

      {/* ─── Platform Lead Concierge Bot (for visitors & platform leads) ─── */}
      <PlatformLeadBotBubble
        onOpenSignup={onOpenSignup}
        onOpenLogin={onOpenLogin}
        onOpenPricing={onOpenPricing}
      />
    </div>
  );
};