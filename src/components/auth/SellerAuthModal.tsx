import React, { useState, useRef } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  Globe,
  Instagram,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Store as StoreIcon,
  Upload,
  User,
  UserPlus,
  FileText,
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
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupStoreName, setSignupStoreName] = useState('');
  const [signupOwnerName, setSignupOwnerName] = useState('');
  const [signupSlug, setSignupSlug] = useState(initialSlug);
  const [signupCountryCode, setSignupCountryCode] = useState('+234');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupCurrency, setSignupCurrency] = useState<CurrencyCode>('NGN');

  // Optional ID collection state (can be added later or now)
  const [showIdSection, setShowIdSection] = useState(false);
  const [signupIdType, setSignupIdType] = useState<'nin' | 'drivers_license' | 'passport' | 'voters_card' | 'national_id'>('nin');
  const [signupIdNumber, setSignupIdNumber] = useState('');
  const [signupFrontIdUrl, setSignupFrontIdUrl] = useState('');
  const [signupBackIdUrl, setSignupBackIdUrl] = useState('');
  const [isUploadingFrontId, setIsUploadingFrontId] = useState(false);
  const [isUploadingBackId, setIsUploadingBackId] = useState(false);

  // Optional social links
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialTiktok, setSocialTiktok] = useState('');

  // Optional logo upload from device
  const [signupLogoUrl, setSignupLogoUrl] = useState('');
  const [isUploadingSignupLogo, setIsUploadingSignupLogo] = useState(false);
  const signupLogoInputRef = useRef<HTMLInputElement>(null);

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

  const handleStoreNameChange = (val: string) => {
    setSignupStoreName(val);
    // Auto-generate slug: spaces → hyphens, lowercase, strip specials
    const auto = val
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // spaces to hyphens
      .replace(/[^a-z0-9-]+/g, '')    // remove non-alphanumeric except hyphens
      .replace(/^-+|-+$/g, '');       // strip leading/trailing hyphens
    setSignupSlug(auto);
  };

  const handleSignupLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file for your logo (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Logo must be under 5MB');
      return;
    }

    setIsUploadingSignupLogo(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignupLogoUrl(reader.result as string);
      setIsUploadingSignupLogo(false);
    };
    reader.onerror = () => {
      setError('Failed to read logo file. Please try again.');
      setIsUploadingSignupLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file (JPG, PNG, WebP) for your ID');
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      setError('ID photo must be under 7MB');
      return;
    }

    if (side === 'front') setIsUploadingFrontId(true);
    else setIsUploadingBackId(true);
    setError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (side === 'front') {
        setSignupFrontIdUrl(reader.result as string);
        setIsUploadingFrontId(false);
      } else {
        setSignupBackIdUrl(reader.result as string);
        setIsUploadingBackId(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read ID image file.');
      if (side === 'front') setIsUploadingFrontId(false);
      else setIsUploadingBackId(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupStoreName.trim()) {
      setError('Please provide a store name');
      return;
    }

    if (!signupOwnerName.trim()) {
      setError('Please provide the store owner name');
      return;
    }

    if (!signupPhone.trim()) {
      setError('Please provide a WhatsApp phone number for receiving orders');
      return;
    }

    const autoCleanSlug =
      signupSlug ||
      signupStoreName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      `store-${Date.now().toString().slice(-4)}`;

    const slugCheck = validateSlug(autoCleanSlug);
    if (!slugCheck.isValid) {
      setError(slugCheck.error || 'Invalid store name. Please use standard characters.');
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
      ownerName: signupOwnerName.trim(),
      slug: slugCheck.cleanSlug,
      ownerEmail: signupEmail.trim() || `${slugCheck.cleanSlug}@tashop.co`,
      ownerPassword: signupPassword || 'password123',
      idVerification: (signupFrontIdUrl && signupBackIdUrl) ? {
        idType: signupIdType,
        idNumber: signupIdNumber.trim() || undefined,
        frontImageUrl: signupFrontIdUrl,
        backImageUrl: signupBackIdUrl,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      } : undefined,
      tagline: `Welcome to ${signupStoreName.trim()}`,
      description: `Browse our catalog and order directly on WhatsApp. Search products by Item UID for fast checkout.`,
      whatsappCountryCode: signupCountryCode,
      whatsappNumber: signupPhone.replace(/\D/g, ''),
      currency: signupCurrency,
      currencySymbol: curSymbol,
      logoUrl: signupLogoUrl || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
      accentColor: '#b45309',
      themeStyle: 'luxury',
      location: 'Lagos, Nigeria',
      announcement: `✨ Welcome to ${signupStoreName}! Search by Item UID to order via WhatsApp.`,
      deliveryInfo: 'Fast dispatch available nationwide. Inquire via WhatsApp for exact rates.',
      socialLinks: {
        instagram: socialInstagram.trim() ? `https://instagram.com/${socialInstagram.trim().replace(/^@/, '')}` : undefined,
        facebook: socialFacebook.trim() ? `https://facebook.com/${socialFacebook.trim().replace(/^@/, '')}` : undefined,
        tiktok: socialTiktok.trim() ? `https://tiktok.com/@${socialTiktok.trim().replace(/^@/, '')}` : undefined,
      },
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
                {mode === 'login' ? 'Manage your WhatsApp catalog & orders' : 'Claim your handle — yourbrand.ta.shop'}
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
                  Store Email, Phone, or Handle
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Enter store email, phone, or slug"
                    value={loginEmailOrPhone}
                    onChange={(e) => setLoginEmailOrPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Owner Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Seller Dashboard</span>
              </button>
            </form>
          ) : (
            /* SELLER SIGNUP */
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Store / Business Name *
                </label>
                <div className="relative">
                  <StoreIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zenith Tech, Bella Scents, Prime Hub"
                    value={signupStoreName}
                    onChange={(e) => handleStoreNameChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Store Owner Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chioma Adebayo or Ibrahim Musa"
                    value={signupOwnerName}
                    onChange={(e) => setSignupOwnerName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Auto-generated Live URL Preview Pill (Slug is automatic - not asked from user) */}
              {signupSlug ? (
                <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Store Link:</span>
                  <span className="font-bold text-slate-900 truncate">{signupSlug}.ta.shop</span>
                  <span className="ml-auto text-emerald-600 text-[10px] font-sans font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    Auto-assigned
                  </span>
                </div>
              ) : null}

              {/* Optional Store Logo Upload from Device */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <input
                  ref={signupLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSignupLogoUpload}
                />
                <div className="w-11 h-11 rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                  {signupLogoUrl ? (
                    <img src={signupLogoUrl} alt="Store logo" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-slate-800 block">Store Logo (Optional)</span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {signupLogoUrl ? 'Logo uploaded from device' : 'Upload from device now or later'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => signupLogoInputRef.current?.click()}
                  disabled={isUploadingSignupLogo}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-white text-xs font-semibold text-slate-700 bg-white shadow-2xs transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                  {isUploadingSignupLogo ? '...' : signupLogoUrl ? 'Change' : 'Upload'}
                </button>
              </div>

              {/* WhatsApp Phone */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Country</label>
                  <select
                    value={signupCountryCode}
                    onChange={(e) => setSignupCountryCode(e.target.value)}
                    className="w-full px-2 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Create a password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Optional ID Verification (KYC) - Can be added now or later */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Identity Verification (KYC)</span>
                      <span className="text-[11px] text-slate-500">Optional now • Required if upgrading from ₦500 plan</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIdSection(!showIdSection)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 underline cursor-pointer"
                  >
                    {showIdSection ? 'Hide' : '+ Upload ID Now'}
                  </button>
                </div>

                {showIdSection && (
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Select ID Document Type</label>
                      <select
                        value={signupIdType}
                        onChange={(e) => setSignupIdType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none cursor-pointer"
                      >
                        <option value="nin">National Identification Number (NIN)</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="passport">International Passport</option>
                        <option value="voters_card">Voter's Card (PVC)</option>
                        <option value="national_id">Other Government Issued National ID</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">ID / Document Number (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 11-digit NIN or License Number"
                        value={signupIdNumber}
                        onChange={(e) => setSignupIdNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Front ID */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">Front of ID</span>
                        <label className="flex flex-col items-center justify-center p-2.5 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-400 bg-white cursor-pointer transition text-center min-h-[74px]">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleIdFileUpload(e, 'front')}
                          />
                          {signupFrontIdUrl ? (
                            <div className="relative w-full h-14 rounded-lg overflow-hidden">
                              <img src={signupFrontIdUrl} alt="Front ID" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] py-0.5">Change</span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <Upload className="w-4 h-4 text-slate-400 mx-auto" />
                              <span className="text-[10px] text-slate-500 font-medium block">
                                {isUploadingFrontId ? 'Reading...' : 'Upload Front'}
                              </span>
                            </div>
                          )}
                        </label>
                      </div>

                      {/* Back ID */}
                      <div>
                        <span className="text-[11px] font-semibold text-slate-600 block mb-1">Back of ID</span>
                        <label className="flex flex-col items-center justify-center p-2.5 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-400 bg-white cursor-pointer transition text-center min-h-[74px]">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleIdFileUpload(e, 'back')}
                          />
                          {signupBackIdUrl ? (
                            <div className="relative w-full h-14 rounded-lg overflow-hidden">
                              <img src={signupBackIdUrl} alt="Back ID" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] py-0.5">Change</span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <Upload className="w-4 h-4 text-slate-400 mx-auto" />
                              <span className="text-[10px] text-slate-500 font-medium block">
                                {isUploadingBackId ? 'Reading...' : 'Upload Back'}
                              </span>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Social Links */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Social Links <span className="font-normal normal-case text-slate-400">(Optional — shown on your store)</span>
                </p>

                {/* Instagram */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-base shrink-0">📸</span>
                  <span className="text-xs text-slate-400 font-mono shrink-0">instagram.com/</span>
                  <input
                    type="text"
                    placeholder="yourusername"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value.replace(/^@/, ''))}
                    className="flex-1 text-xs font-medium text-slate-900 bg-transparent placeholder:text-slate-300 focus:outline-none min-w-0"
                  />
                </div>

                {/* Facebook */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-base shrink-0">👤</span>
                  <span className="text-xs text-slate-400 font-mono shrink-0">facebook.com/</span>
                  <input
                    type="text"
                    placeholder="yourpagename"
                    value={socialFacebook}
                    onChange={(e) => setSocialFacebook(e.target.value.replace(/^@/, ''))}
                    className="flex-1 text-xs font-medium text-slate-900 bg-transparent placeholder:text-slate-300 focus:outline-none min-w-0"
                  />
                </div>

                {/* TikTok */}
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                  <span className="text-base shrink-0">🎵</span>
                  <span className="text-xs text-slate-400 font-mono shrink-0">tiktok.com/@</span>
                  <input
                    type="text"
                    placeholder="yourusername"
                    value={socialTiktok}
                    onChange={(e) => setSocialTiktok(e.target.value.replace(/^@/, ''))}
                    className="flex-1 text-xs font-medium text-slate-900 bg-transparent placeholder:text-slate-300 focus:outline-none min-w-0"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 pt-2"
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
