import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Compass,
  Download,
  ExternalLink,
  Eye,
  Globe,
  Hash,
  HelpCircle,
  LayoutDashboard,
  Lock,
  LogIn,
  MessageCircle,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Store as StoreIcon,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { SellerSession, Store } from '../../types';
import { validateSlug, getRootDomain, getPlatformBrandName } from '../../utils/storage';
import { VerifiedBadge } from '../common/VerifiedBadge';
import { getActivePlanConfigs } from '../../utils/planLimits';

interface LandingPageProps {
  stores: Store[];
  sellerSession?: SellerSession | null;
  onOpenStore: (slug: string) => void;
  onOpenLogin: () => void;
  onOpenSignup: (initialSlug?: string) => void;
  onOpenDashboard?: () => void;
  onOpenSuperAdmin?: () => void;
  onOpenLegal?: (tab: 'terms' | 'privacy' | 'cookies') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  stores,
  sellerSession,
  onOpenStore,
  onOpenLogin,
  onOpenSignup,
  onOpenDashboard,
  onOpenSuperAdmin,
  onOpenLegal,
}) => {
  const [handleInput, setHandleInput] = useState('');
  const [handleError, setHandleError] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [planConfigs, setPlanConfigs] = useState(() => getActivePlanConfigs());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const rootDomain = getRootDomain();
  const cleanHandle = handleInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  const handleAvailability = useMemo(() => {
    if (!cleanHandle || cleanHandle.length < 2) return null;
    const isTaken = stores.some((s) => s.slug.toLowerCase() === cleanHandle);
    return isTaken ? 'taken' : 'available';
  }, [cleanHandle, stores]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setPlanConfigs(getActivePlanConfigs());
    };
    window.addEventListener('tashop:settings_updated', handleSettingsUpdate);
    window.addEventListener('storage', handleSettingsUpdate);
    return () => {
      window.removeEventListener('tashop:settings_updated', handleSettingsUpdate);
      window.removeEventListener('storage', handleSettingsUpdate);
    };
  }, []);

  // ─── 6-tap easter egg on logo (Mobile & PC) → opens /sys-hq ─────────────────
  // Uses synchronous ref counter and pointer/touch tracking to guarantee every mobile tap registers
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  const handleLogoTap = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const now = Date.now();
    // Debounce duplicate events within 50ms (prevents pointerdown + click double firing)
    if (now - lastTapTimeRef.current < 50) return;
    lastTapTimeRef.current = now;

    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    tapCountRef.current += 1;
    const currentTaps = tapCountRef.current;

    // Haptic vibration feedback on mobile touch devices
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

    // 1.8s reset window: if user pauses tapping, resets after 1.8 seconds
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
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 selection:bg-amber-200 overflow-x-hidden w-full max-w-full">
      {/* Landing Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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
            className="flex items-center gap-2 cursor-pointer text-left relative active:scale-95 transition-transform"
          >
            <div className="min-w-8 h-8 px-1.5 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs tracking-tighter shadow-xs">
              Taaa
            </div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-base tracking-tight text-slate-900">Taaa</span>
              <span className="font-extrabold text-base tracking-tight text-amber-500">.shop</span>
            </div>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold text-slate-400 border border-slate-200 rounded-md px-1.5 py-0.5">
              Social Catalog
            </span>
          </button>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <a
              href="#features"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 hidden md:inline-block transition"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 hidden md:inline-block transition"
            >
              Pricing
            </a>

            {installPrompt && !isInstalled && (
              <button
                type="button"
                onClick={handleInstallApp}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Install Tá.shop App to your home screen"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xs:inline">Install App</span>
              </button>
            )}

            {sellerSession ? (
              <button
                type="button"
                onClick={onOpenDashboard}
                className="px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-slate-900" />
                <span>Dashboard ({sellerSession.storeName})</span>
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Seller Login</span>
              </button>
            )}

            <button
              onClick={() => onOpenSignup()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Launch Store</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-16 px-4 sm:px-6 overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[560px] pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-rose-500/10 to-transparent blur-3xl -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border border-amber-200/80 px-4 py-1.5 rounded-full text-xs font-semibold text-amber-950 shadow-2xs backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>⚡ The #1 WhatsApp & Social Commerce Engine for African Merchants</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Turn your social traffic into <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600">
              instant WhatsApp orders.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every seller gets their own branded store at <strong className="text-slate-900 font-mono">yourbrand.{rootDomain}</strong>.
            Customers browse login-free, search by <strong>Item UID</strong>, and order in 1 click directly to your WhatsApp with zero commission fees.
          </p>

          {/* Live Claim Handle Bar */}
          <div className="max-w-xl mx-auto pt-2">
            <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-200/90 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/10 transition-all">
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
                <span className="text-xs font-mono font-bold text-slate-400 select-none shrink-0 ml-1">
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
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 shrink-0 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Claim My Store</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>

            {handleError && (
              <p className="text-xs text-rose-600 mt-2 font-medium">{handleError}</p>
            )}

            <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-2">
              <span>⚡ Free 4-product tier included</span>
              <span>•</span>
              <span>📱 100% Smartphone friendly</span>
              <span>•</span>
              <span>💳 Zero transaction commission</span>
            </div>
          </div>

          {/* ── Interactive Smartphone & Storefront Preview Mockup (Zero Supabase Load) ── */}
          <div className="pt-8 sm:pt-12 max-w-4xl mx-auto relative">
            {/* Ambient Background Spotlight behind phone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-amber-400/20 rounded-full blur-3xl -z-10 pointer-events-none" />

            {/* Floating Live Interaction Cards */}
            <div className="hidden lg:flex absolute -left-6 top-16 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 items-center gap-3 z-20 max-w-xs text-left animate-in fade-in slide-in-from-left duration-500">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">New Order: ₦45,000</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Itemized cart sent straight to WhatsApp</p>
              </div>
            </div>

            <div className="hidden lg:flex absolute -right-6 top-24 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 items-center gap-3 z-20 max-w-xs text-left animate-in fade-in slide-in-from-right duration-500">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                  <span>WhatsApp AI Auto-Reply</span>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Replies to customer DMs 24/7 with catalog items</p>
              </div>
            </div>

            <div className="hidden sm:flex absolute left-8 -bottom-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-lg border border-slate-200/80 items-center gap-2.5 z-20 text-left">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-800">4.9/5 • 350+ Verified African Stores</span>
            </div>

            {/* Smartphone Shell */}
            <div className="mx-auto w-full max-w-[340px] sm:max-w-[380px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-900/10">
              {/* Top Speaker / Camera Island */}
              <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
                <div className="w-8 h-1 rounded-full bg-slate-800" />
              </div>

              {/* Dynamic Mockup Screen Content */}
              <div className="bg-slate-50 rounded-[32px] overflow-hidden text-left border border-slate-200">
                {/* Store Header Banner */}
                <div className="h-20 bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-700 relative p-3 flex flex-col justify-between text-white">
                  <div className="flex items-center justify-between text-[10px] font-mono opacity-90">
                    <span className="bg-black/30 backdrop-blur-xs px-2 py-0.5 rounded-full">
                      amaka.{rootDomain}
                    </span>
                    <span className="flex items-center gap-1 bg-emerald-500/80 px-2 py-0.5 rounded-full font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Open
                    </span>
                  </div>
                </div>

                {/* Store Profile Info */}
                <div className="px-4 pb-3 pt-2 bg-white border-b border-slate-100 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shadow-xs border-2 border-white -mt-6">
                    AC
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 font-bold text-slate-900 text-xs truncate">
                      <span>Amaka Couture Lagos</span>
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-600 fill-blue-100 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">Luxury RTW & Bridal Fabrics • Lekki, Lagos</p>
                  </div>
                </div>

                {/* Mock Search Bar with Item UID */}
                <div className="p-3 bg-slate-100/70 border-b border-slate-200/60">
                  <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2 text-xs text-slate-400">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[11px] font-mono text-slate-500">Search products or UID (#AC-01)...</span>
                  </div>
                </div>

                {/* Mock Catalog Items */}
                <div className="p-3 grid grid-cols-2 gap-2 bg-slate-50">
                  <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs space-y-1.5">
                    <div className="h-20 rounded-lg bg-amber-100/60 relative overflow-hidden flex items-center justify-center">
                      <span className="text-2xl">👗</span>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] font-mono text-white px-1.5 py-0.2 rounded-md">
                        #AC-01
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 truncate">Emerald Silk Boubou</div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-black text-amber-600 font-mono">₦38,000</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">WhatsApp</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl p-2 border border-slate-200/80 shadow-2xs space-y-1.5">
                    <div className="h-20 rounded-lg bg-indigo-100/60 relative overflow-hidden flex items-center justify-center">
                      <span className="text-2xl">✨</span>
                      <span className="absolute bottom-1 left-1 bg-black/60 text-[9px] font-mono text-white px-1.5 py-0.2 rounded-md">
                        #AC-02
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-900 truncate">Velvet Kaftan Set</div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-xs font-black text-amber-600 font-mono">₦45,000</span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-md">WhatsApp</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Mock WhatsApp Checkout Button */}
                <div className="p-3 bg-white border-t border-slate-200">
                  <div className="w-full py-2 bg-emerald-600 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Instant WhatsApp Checkout (1-Click)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Visual "How It Works" in 3 Simple Steps ── */}
      <section className="py-14 sm:py-20 bg-white border-y border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              3 Simple Steps
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              From zero to receiving orders in 3 minutes
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              No complicated eCommerce software, no account creation barrier for your buyers, and no laptop required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Step 1 */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 relative flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 font-black text-base flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
                  01
                </div>
                <h3 className="text-lg font-bold text-slate-900">Claim Your Branded Link</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pick your custom store handle at <strong className="text-slate-900 font-mono">{rootDomain}/yourbrand</strong>. Your store is live immediately on any smartphone.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Instant live web link</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 relative flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 font-black text-base flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
                  02
                </div>
                <h3 className="text-lg font-bold text-slate-900">Upload Products & WhatsApp</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Snap photos, set prices, and write descriptions with AI help. Each product gets an automatic short Item UID for fast customer status ordering.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Package className="w-3.5 h-3.5 text-indigo-500" />
                <span>AI descriptions & Item UIDs</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200/80 relative flex flex-col justify-between hover:shadow-md transition-shadow group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 font-black text-base flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
                  03
                </div>
                <h3 className="text-lg font-bold text-slate-900">Put in Bio & Get Paid</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Paste your link in your Instagram, TikTok, or WhatsApp bio. Buyers browse and send ready-made order invoices to your WhatsApp. You keep 100% of your earnings.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                <span>0% Commission • 100% Direct to Bank</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Strip ─────────────────────────────────────── */}
      <div className="bg-slate-900 py-10 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center mb-10">
            {[
              { value: '200+', label: 'Orders this week' },
              { value: '30+', label: 'Active storefronts' },
              { value: '< 2 min', label: 'Average setup time' },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">{s.value}</div>
                <div className="text-[11px] sm:text-xs text-slate-400 mt-1 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Seller testimonials */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 hover:bg-white/8 transition"
              >
                <p className="text-sm text-slate-200 italic leading-relaxed">"{t.quote}"</p>
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
      {/* Featured Stores Carousel / Grid */}
      <section id="featured" className="py-14 bg-white border-y border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block mb-1">
                Live Storefronts
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Explore stores powered by Tá.shop
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
                      ? 'bg-slate-900 text-white shadow-xs'
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
            const liveFeaturedStores = stores.filter(
              (s) => s.featuredOnLanding === true && s.status !== 'suspended' && s.status !== 'deleted'
            ).filter((s) => {
              if (selectedCategory === 'All') return true;
              const text = `${s.name} ${s.description} ${s.tagline} ${s.location}`.toLowerCase();
              return text.includes(selectedCategory.toLowerCase());
            });

            if (liveFeaturedStores.length === 0) {
              return (
                <div className="text-center py-12 px-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                    <StoreIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {selectedCategory === 'All' ? 'No Stores Added to Showcase Yet' : `No stores currently listed under "${selectedCategory}"`}
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
                    className="group relative bg-slate-50 rounded-3xl overflow-hidden border border-slate-200/80 hover:border-slate-300 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col"
                  >
                    {/* Banner */}
                    <div className="relative h-32 w-full overflow-hidden bg-slate-200">
                      <img
                        src={s.bannerUrl}
                        alt={s.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs text-slate-900 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
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

                      <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Accepting WhatsApp Orders</span>
                        </span>
                        <span className="text-slate-900 font-bold group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                          <span>Visit</span>
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

      {/* Core Features: Why Tá.shop is Built for Social Sellers */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              Designed For WhatsApp Commerce
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Everything sellers need, without the headache
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Traditional eCommerce carts lose 80% of buyers who don't want to create accounts or fill 12 form fields. Tá.shop fixes that.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Zero Customer Login</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers never have to remember a password, enter an email, or sign up. They click your link and immediately view products.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Hash className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Search per Item UID</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Post an item on your WhatsApp status with a short code like <strong>#TA-BR540</strong>. Customers type the UID and order instantly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <MessageCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Pre-Filled WhatsApp Invoice</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Orders open directly in WhatsApp with product name, UID, selected size, price, and customer delivery address pre-formatted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - All 5 Plans with Live Dynamic Super Admin Rates */}
      <section id="pricing" className="py-16 sm:py-24 bg-slate-50/70 border-t border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              Simple Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Start free, upgrade as your orders grow
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Pick the catalog capacity and automation tier tailored for your WhatsApp & Instagram storefront.
            </p>

            {/* Billing Cycle Switcher */}
            <div className="pt-2 flex items-center justify-center">
              <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly Billing
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === 'yearly'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Annual (Yearly)</span>
                  <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    SAVE UP TO 20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {/* 1. Free Trial Plan */}
            <div className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Free Trial</h3>
                <p className="text-xs text-slate-500 mt-1">Test your social catalog with zero upfront cost.</p>
                <div className="mt-4 text-3xl font-black font-mono text-slate-900">
                  ₦0
                  <span className="text-xs font-normal text-slate-400 block mt-0.5">Forever free</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 4 products</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>5 photos per product</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Item UID search (#TA-XXX)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Direct WhatsApp checkout</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Loud audio order alerts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instant waybill generator</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Start Free Store
              </button>
            </div>

            {/* 2. Starter Plan */}
            <div className="p-6 rounded-3xl border border-slate-200 bg-white flex flex-col justify-between shadow-2xs">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Starter</h3>
                <p className="text-xs text-slate-500 mt-1">Essential social catalog for WhatsApp sellers.</p>
                <div className="mt-4 text-3xl font-black font-mono text-slate-900">
                  ₦{billingCycle === 'monthly' ? planConfigs.starter.priceMonthly.toLocaleString() : planConfigs.starter.priceYearly.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 block mt-0.5">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 10 products with variants</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Custom store web link</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Store banner, logo & address</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Customer inquiry click tracker</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Printable store QR code</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Launch Starter
              </button>
            </div>

            {/* 3. Basic Plan */}
            <div className="p-6 rounded-3xl border border-emerald-300 bg-emerald-50/30 flex flex-col justify-between shadow-2xs relative">
              <span className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                Popular Value
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Tá.shop Basic</h3>
                <p className="text-xs text-slate-500 mt-1">Best value for expanding store inventory.</p>
                <div className="mt-4 text-3xl font-black font-mono text-emerald-950">
                  ₦{billingCycle === 'monthly' ? planConfigs.basic.priceMonthly.toLocaleString() : planConfigs.basic.priceYearly.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 block mt-0.5">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    Save ₦{(planConfigs.basic.priceMonthly * 12 - planConfigs.basic.priceYearly).toLocaleString()}/yr
                  </span>
                )}

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-bold text-emerald-950">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 30 products (3x Starter)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 5 photos per product</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI product descriptions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Status Studio marketing cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Notes & profit calculator</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Choose Basic
              </button>
            </div>

            {/* 4. Pro Plan */}
            <div className="p-6 rounded-3xl border-2 border-slate-900 bg-white relative flex flex-col justify-between shadow-lg">
              <span className="absolute -top-3 right-6 bg-slate-900 text-amber-300 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Most Popular
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <span>Tá.shop Pro</span>
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">For growing brands on WhatsApp & Instagram.</p>
                <div className="mt-4 text-3xl font-black font-mono text-slate-900">
                  ₦{billingCycle === 'monthly' ? planConfigs.pro.priceMonthly.toLocaleString() : planConfigs.pro.priceYearly.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 block mt-0.5">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Save ₦{(planConfigs.pro.priceMonthly * 12 - planConfigs.pro.priceYearly).toLocaleString()}/yr
                  </span>
                )}

                <ul className="mt-6 space-y-2.5 text-xs text-slate-800">
                  <li className="flex items-center gap-2 font-bold text-slate-900">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to 70 products</span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-blue-900 bg-blue-50 px-2 py-1 rounded-lg">
                    <BadgeCheck className="w-4 h-4 text-blue-600 fill-blue-100 shrink-0" />
                    <span>Verified Blue Tick Badge</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Customer reviews & ratings</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Priority WhatsApp analytics</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-photo uploads & UID search</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Get Started with Pro
              </button>
            </div>

            {/* 5. Business AI Plan */}
            <div className="p-6 rounded-3xl border-2 border-violet-500 bg-gradient-to-b from-violet-50/60 to-white relative flex flex-col justify-between shadow-lg">
              <span className="absolute -top-3 right-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                🤖 AI WhatsApp Bot
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <span>Business AI</span>
                  <Bot className="w-4 h-4 text-violet-600" />
                </h3>
                <p className="text-xs text-slate-500 mt-1">Autonomous WhatsApp commerce & unlimited inventory.</p>
                <div className="mt-4 text-3xl font-black font-mono text-violet-950">
                  ₦{billingCycle === 'monthly' ? planConfigs.business.priceMonthly.toLocaleString() : planConfigs.business.priceYearly.toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 block mt-0.5">
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <span className="inline-block mt-1 text-[10px] font-bold text-violet-700 bg-violet-100/80 px-2 py-0.5 rounded-md">
                    Save ₦{(planConfigs.business.priceMonthly * 12 - planConfigs.business.priceYearly).toLocaleString()}/yr
                  </span>
                )}

                <ul className="mt-6 space-y-2.5 text-xs text-slate-800">
                  <li className="flex items-center gap-2 font-bold text-violet-950 bg-violet-100/70 px-2 py-1 rounded-lg">
                    <Check className="w-4 h-4 text-violet-700 shrink-0" />
                    <span>UNLIMITED Products (No limit)</span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-1 rounded-lg">
                    <BadgeCheck className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                    <span>Official Golden Tick Badge</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>100% White-Label (No branding)</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium text-violet-900">
                    <Bot className="w-4 h-4 text-violet-600 shrink-0" />
                    <span>24/7 AI Bot (Photos & prices)</span>
                  </li>
                  <li className="flex items-center gap-2 font-medium">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Automated WhatsApp receipts</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Launch Business AI Store
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Merchant FAQ Accordion ── */}
      <section id="faq" className="py-16 sm:py-24 bg-white border-t border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
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
                a: 'No! Tá.shop is 100% optimized for smartphones. You can snap product photos, set prices, share links on Instagram/TikTok, and receive customer orders entirely on your iPhone or Android phone.',
              },
              {
                q: 'How do I receive payments from customers?',
                a: 'Customers browse your store and click "Order via WhatsApp". An itemized invoice with their delivery address opens in your WhatsApp DM. You receive 100% of the money directly into your Nigerian bank account. Tá.shop charges 0% commission on your sales.',
              },
              {
                q: 'How does the 24/7 AI WhatsApp Auto-Reply work?',
                a: 'On the Business AI tier, our smart bot connects directly to your WhatsApp. When customers send DMs asking for prices, product availability, or account numbers, the AI automatically replies in seconds with photos, sizes, and direct checkout links—even while you are asleep.',
              },
              {
                q: 'Can I use my own custom domain (e.g. mybrand.com)?',
                a: `Every store starts with a free link like yourbrand.${rootDomain}. On the Business tier, you can also connect your own custom .com, .ng, or .com.ng domain at no extra charge.`,
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
                        isOpen ? 'rotate-180 text-amber-600' : ''
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

      {/* Sticky Mobile Bottom CTA */}
      <div className="sm:hidden fixed bottom-3 inset-x-3 z-30 animate-in fade-in slide-in-from-bottom-3 duration-300">
        <div className="bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700/80 shadow-2xl flex items-center justify-between gap-3">
          <div className="pl-2 min-w-0">
            <div className="text-[11px] font-bold text-white truncate">Start selling on WhatsApp</div>
            <div className="text-[9px] text-amber-400 font-medium">Free • Live in 30 seconds</div>
          </div>
          <button
            type="button"
            onClick={() => onOpenSignup(cleanHandle || undefined)}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-xs transition active:scale-95 shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <span>Claim Store</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-4 sm:px-6 text-center text-xs text-slate-400 space-y-3 bg-slate-50">
        <div className="flex items-center justify-center gap-2">
          <div className="min-w-6 h-6 px-1 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
            Taaa
          </div>
          <span className="font-extrabold text-slate-900">Taaa.shop</span>
        </div>
        <p>© {new Date().getFullYear()} Taaa.shop. The multi-tenant social commerce catalog platform.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-1 text-[11px] text-slate-500">
          <a href="#featured" className="hover:text-slate-800 transition cursor-pointer font-medium">
            Explore Stores
          </a>
          <span>•</span>
          <button onClick={onOpenLogin} className="hover:text-slate-800 transition cursor-pointer font-medium">
            Seller Login
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal?.('terms')}
            className="hover:text-slate-800 transition cursor-pointer font-medium"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal?.('privacy')}
            className="hover:text-slate-800 transition cursor-pointer font-medium"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            onClick={() => onOpenLegal?.('cookies')}
            className="hover:text-slate-800 transition cursor-pointer font-medium"
          >
            Cookie Policy
          </button>
        </div>
      </footer>
    </div>
  );
};
