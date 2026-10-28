import React, { useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  UserPlus,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CurrencyCode, Product, SellerSession, Store } from '../../types';
import {
  authenticateSeller,
  generateItemUid,
  getStoredProducts,
  getStoredStores,
  saveProducts,
  saveStores,
  setSellerSession,
  validateSlug,
} from '../../utils/storage';

interface SellerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  initialSlug?: string;
  onLoginSuccess: (session: SellerSession) => void;
  onStoreCreated: (newStore: Store) => void;
}

export const SellerAuthModal: React.FC<SellerAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  initialSlug = '',
  onLoginSuccess,
  onStoreCreated,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Login form state
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Signup form state
  const [signupStoreName, setSignupStoreName] = useState('');
  const [signupSlug, setSignupSlug] = useState(initialSlug);
  const [signupCountryCode, setSignupCountryCode] = useState('+234');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('password123');
  const [signupCurrency, setSignupCurrency] = useState<CurrencyCode>('NGN');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = authenticateSeller(loginEmailOrPhone, loginPassword);
    if (!res.success || !res.session) {
      setError(res.error || 'Login failed. Please check credentials.');
      return;
    }

    onLoginSuccess(res.session);
    onClose();
  };

  const handleQuickDemoLogin = (slug: string, email: string) => {
    setLoginEmailOrPhone(email);
    const res = authenticateSeller(slug, 'password123');
    if (res.success && res.session) {
      onLoginSuccess(res.session);
      onClose();
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupStoreName.trim()) {
      setError('Please provide a store name');
      return;
    }

    if (!signupPhone.trim()) {
      setError('Please provide a WhatsApp phone number for receiving orders');
      return;
    }

    const slugCheck = validateSlug(signupSlug);
    if (!slugCheck.isValid) {
      setError(slugCheck.error || 'Invalid slug');
      return;
    }

    const curSymbol =
      signupCurrency === 'NGN'
        ? '₦'
        : signupCurrency === 'USD'
        ? '$'
        : signupCurrency === 'GBP'
        ? '£'
        : signupCurrency === 'EUR'
        ? '€'
        : signupCurrency === 'KES'
        ? 'KSh'
        : 'GH₵';

    const storeId = `store_${Date.now()}`;
    const newStore: Store = {
      id: storeId,
      name: signupStoreName.trim(),
      slug: slugCheck.cleanSlug,
      ownerEmail: signupEmail.trim() || `${slugCheck.cleanSlug}@tashop.co`,
      ownerPassword: signupPassword || 'password123',
      tagline: `Welcome to ${signupStoreName.trim()}`,
      description: `Browse our catalog and order directly on WhatsApp. Search products by Item UID for fast checkout.`,
      whatsappCountryCode: signupCountryCode,
      whatsappNumber: signupPhone.replace(/\D/g, ''),
      currency: signupCurrency,
      currencySymbol: curSymbol,
      logoUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
      accentColor: '#b45309',
      themeStyle: 'luxury',
      location: 'Lagos, Nigeria',
      announcement: `✨ Welcome to ${signupStoreName}! Search by Item UID to order via WhatsApp.`,
      deliveryInfo: 'Fast dispatch available nationwide. Inquire via WhatsApp for exact rates.',
      socialLinks: {},
      tier: 'free',
      verified: false,
      createdAt: new Date().toISOString(),
    };

    // Create 2 starter products with Item UIDs!
    const starterProducts: Product[] = [
      {
        id: `prod_${Date.now()}_1`,
        uid: generateItemUid(slugCheck.cleanSlug, 1),
        storeId: storeId,
        name: `${signupStoreName} Bestseller 01`,
        slug: 'bestseller-01',
        description: 'Premium quality collection piece. Ready for same-day dispatch.',
        price: signupCurrency === 'NGN' ? 35000 : 50,
        category: 'Featured',
        images: [newStore.logoUrl],
        inStock: true,
        badge: 'New Arrival',
        variants: [
          {
            id: `v_${Date.now()}_1`,
            name: 'Standard Option',
            price: signupCurrency === 'NGN' ? 35000 : 50,
            inStock: true,
          },
        ],
        inquiryCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    const allStores = getStoredStores();
    allStores.push(newStore);
    saveStores(allStores);

    const allProducts = getStoredProducts();
    saveProducts([...starterProducts, ...allProducts]);

    const session: SellerSession = {
      email: newStore.ownerEmail || `${newStore.slug}@tashop.co`,
      storeId: newStore.id,
      storeSlug: newStore.slug,
      storeName: newStore.name,
      isLoggedIn: true,
    };
    setSellerSession(session);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    onStoreCreated(newStore);
    onLoginSuccess(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 flex flex-col max-h-[92vh] pb-safe sm:pb-0 z-10">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Customer Notification Banner */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-5 py-2.5 flex items-center gap-2 text-[11px] text-amber-900 font-medium">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Shopper Notice:</strong> Customers do not need an account. You can browse, search by UID, and order freely without logging in!
          </span>
        </div>

        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tighter">
              Tá
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {mode === 'login' ? 'Seller Merchant Portal' : 'Launch Your Tá.shop Store'}
              </h3>
              <p className="text-xs text-slate-500">
                {mode === 'login' ? 'Manage your WhatsApp catalog & orders' : 'Claim your tá.shop/handle in 30 seconds'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Login vs Signup */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 mx-6 mt-4 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Seller Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'signup' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create New Store</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            /* SELLER LOGIN */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Store Email, Phone, or Slug
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. amaka-perfumes or amaka@perfumes.ng"
                    value={loginEmailOrPhone}
                    onChange={(e) => setLoginEmailOrPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Owner Password</span>
                  <span className="text-[11px] text-slate-400">Default: password123</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Seller Dashboard</span>
              </button>

              {/* 1-Click Demo Logins */}
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                  Or Test with a Demo Store (1-Click)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('amaka-perfumes', 'amaka@perfumes.ng')}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-left text-xs transition cursor-pointer"
                  >
                    <span className="font-bold block truncate">Amaka</span>
                    <span className="text-[10px] text-slate-400 block truncate font-mono">amaka-perfumes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('zainab-couture', 'zainab@couture.ng')}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-left text-xs transition cursor-pointer"
                  >
                    <span className="font-bold block truncate">Zainab</span>
                    <span className="text-[10px] text-slate-400 block truncate font-mono">zainab-couture</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDemoLogin('gadget-plug-ng', 'gadget@plug.ng')}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-left text-xs transition cursor-pointer"
                  >
                    <span className="font-bold block truncate">Gadget Plug</span>
                    <span className="text-[10px] text-slate-400 block truncate font-mono">gadget-plug-ng</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* SELLER SIGNUP */
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Store / Business Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amaka Perfumes or Kemi Glow"
                  value={signupStoreName}
                  onChange={(e) => {
                    setSignupStoreName(e.target.value);
                    if (!signupSlug || signupSlug === '') {
                      const auto = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                      setSignupSlug(auto);
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                  <span>Store Slug Link *</span>
                  <span className="text-[11px] text-slate-400 font-mono">tá.shop/your-slug</span>
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-slate-900">
                  <span className="pl-3 text-xs text-slate-400 font-mono select-none">tá.shop/</span>
                  <input
                    type="text"
                    required
                    value={signupSlug}
                    onChange={(e) => setSignupSlug(e.target.value.toLowerCase())}
                    className="w-full px-1.5 py-2 text-xs font-mono text-slate-900 bg-transparent focus:outline-none"
                  />
                </div>
              </div>

              {/* WhatsApp Phone */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Country</label>
                  <select
                    value={signupCountryCode}
                    onChange={(e) => setSignupCountryCode(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  >
                    <option value="+234">🇳🇬 +234</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+254">🇰🇪 +254</option>
                    <option value="+233">🇬🇭 +233</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    WhatsApp Orders Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08031234567"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Owner Email & Password */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Owner Email</label>
                  <input
                    type="email"
                    placeholder="owner@domain.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="password123"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 pt-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Launch My Tá.shop Store</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
