import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronRight,
  Compass,
  Download,
  ExternalLink,
  Eye,
  Hash,
  LayoutDashboard,
  Lock,
  LogIn,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store as StoreIcon,
  Zap,
} from 'lucide-react';
import { SellerSession, Store } from '../../types';
import { validateSlug } from '../../utils/storage';

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

  // ─── 6-tap Easter egg on logo → opens Super Admin ───────────────────────
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    setLogoTapCount(next);

    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);

    if (next >= 6) {
      setLogoTapCount(0);
      onOpenSuperAdmin?.();
    } else {
      logoTapTimer.current = setTimeout(() => setLogoTapCount(0), 2500);
    }
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
            className="flex items-center gap-2 cursor-pointer text-left relative"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-xs">
              Tá
            </div>
            <div className="flex items-baseline">
              <span className="font-extrabold text-base tracking-tight text-slate-900">Tá</span>
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
      <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-900">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Built for WhatsApp, Instagram & Social Commerce</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Turn your social traffic into <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600">
              instant WhatsApp orders.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Every seller gets their own branded store at <strong className="text-slate-900 font-mono">yourbrand.ta.shop</strong>.
            Customers search by <strong>Item UID</strong> and order in 1 click without ever needing to log in.
          </p>

          {/* Claim Handle Bar */}
          <div className="max-w-md mx-auto pt-2">
            <form onSubmit={handleClaim} className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-200">
              <div className="flex-1 flex items-center px-3 min-w-0">
                <input
                  type="text"
                  placeholder="your-brand-name"
                  value={handleInput}
                  onChange={(e) => {
                    setHandleInput(e.target.value);
                    setHandleError(null);
                  }}
                  className="w-full py-2 text-xs sm:text-sm font-mono font-semibold text-slate-900 focus:outline-none bg-transparent min-w-0"
                />
                <span className="text-xs font-mono font-bold text-slate-400 select-none shrink-0 ml-1">.ta.shop</span>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Claim My Store</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
            {handleError && (
              <p className="text-xs text-rose-600 mt-2 font-medium">{handleError}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-2">
              Starter plan ₦500/month • No complicated setup • Live in 30 seconds
            </p>
          </div>

          {/* Micro Trust Pills */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Customers browse 100% login-free</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-indigo-600" />
              <span>Search per Item UID (#BR540)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Pre-filled WhatsApp inquiries</span>
            </span>
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
      <section id="featured" className="py-12 bg-white border-y border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block mb-1">
                Live Storefronts
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Explore stores powered by Tá.shop
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Click any store to test the customer shopping experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stores.map((s) => (
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
                    {s.slug}.ta.shop
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
                          {s.verified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}
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

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-white border-t border-slate-200/80 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">
              Simple Transparent Pricing
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Start free, upgrade as your business expands
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Starter Plan */}
            <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Starter Plan</h3>
                <p className="text-xs text-slate-500 mt-1">Essential social catalog for WhatsApp & Instagram sellers.</p>
                <div className="mt-4 text-3xl font-black font-mono">
                  ₦500 <span className="text-xs font-normal text-slate-400">/ month</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-700">
                  <li className="flex items-center gap-2">✓ Up to 10 products with variants</li>
                  <li className="flex items-center gap-2">✓ Custom link: <strong>yourbrand.ta.shop</strong></li>
                  <li className="flex items-center gap-2">✓ Item UID search & WhatsApp checkout</li>
                  <li className="flex items-center gap-2">✓ Loud audio order alerts & dashboard logging</li>
                  <li className="flex items-center gap-2">✓ Printable store QR code</li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-3 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Launch Starter Store (₦500/mo)
              </button>
            </div>

            {/* Pro */}
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
                  ₦4,900 <span className="text-xs font-normal text-slate-400">/ month</span>
                </div>

                <ul className="mt-6 space-y-2.5 text-xs text-slate-800">
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Unlimited products & variants</strong></li>
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Verified Blue Tick</strong> for high trust</li>
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Remove "Powered by Tá.shop"</strong></li>
                  <li className="flex items-center gap-2 font-medium">✓ Customer inquiry analytics & history</li>
                  <li className="flex items-center gap-2 font-medium">✓ Custom domain support ready</li>
                </ul>
              </div>

              <button
                onClick={() => onOpenSignup()}
                className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Get Started with Pro
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-10 px-4 sm:px-6 text-center text-xs text-slate-400 space-y-3 bg-slate-50">
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
            Tá
          </div>
          <span className="font-extrabold text-slate-900">Tá.shop</span>
        </div>
        <p>© {new Date().getFullYear()} Tá.shop. The multi-tenant social commerce catalog platform.</p>
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
