import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Globe, Palette, Sparkles, Store as StoreIcon, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CurrencyCode, Product, Store } from '../../types';
import { getStoredProducts, getStoredStores, saveProducts, saveStores, validateSlug, getRootDomain } from '../../utils/storage';
import { dbSaveStore, dbSaveProduct, dbFetchStoreBySlug } from '../../utils/supabase';

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoreCreated: (newStore: Store) => void;
}

const NICHES = [
  { id: 'perfumes', name: 'Perfumes & Scents', emoji: '✨', color: '#b45309' },
  { id: 'fashion', name: 'Fashion & Apparel', emoji: '👗', color: '#047857' },
  { id: 'gadgets', name: 'Tech & Gadgets', emoji: '📱', color: '#1d4ed8' },
  { id: 'beauty', name: 'Beauty & Hair', emoji: '💄', color: '#be185d' },
  { id: 'food', name: 'Food & Bakery', emoji: '🧁', color: '#ea580c' },
];

const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'NGN', symbol: '₦', label: 'NGN (₦) - Nigerian Naira' },
  { code: 'USD', symbol: '$', label: 'USD ($) - US Dollar' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) - British Pound' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) - Euro' },
  { code: 'KES', symbol: 'KSh', label: 'KES (KSh) - Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS (GH₵) - Ghanaian Cedi' },
];

export const CreateStoreModal: React.FC<CreateStoreModalProps> = ({
  isOpen,
  onClose,
  onStoreCreated,
}) => {
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [slug, setSlug] = useState('');
  const [countryCode, setCountryCode] = useState('+234');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('NGN');
  const [selectedNiche, setSelectedNiche] = useState('perfumes');
  const [accentColor, setAccentColor] = useState('#b45309');
  const [location, setLocation] = useState('Lagos, Nigeria');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    const generated = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(generated);
    if (generated) {
      const check = validateSlug(generated);
      if (!check.isValid) {
        setValidationError(check.error || 'Please use standard alphanumeric characters');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  };

  const handleNicheSelect = (nicheId: string) => {
    setSelectedNiche(nicheId);
    const found = NICHES.find((n) => n.id === nicheId);
    if (found) {
      setAccentColor(found.color);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError('Please enter a store name');
      return;
    }

    if (!ownerName.trim()) {
      setValidationError('Please enter the store owner full name');
      return;
    }

    if (!whatsappNumber.trim()) {
      setValidationError('Please provide your WhatsApp phone number');
      return;
    }

    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      `store-${Date.now().toString().slice(-4)}`;

    const slugCheck = validateSlug(finalSlug);
    if (!slugCheck.isValid) {
      setValidationError(slugCheck.error || 'Please enter a valid store name');
      return;
    }

    setIsSubmitting(true);
    setValidationError(null);

    // 🔒 LIVE SUPABASE CHECK: Ensure store slug is unique
    try {
      const existingLive = await dbFetchStoreBySlug(slugCheck.cleanSlug);
      if (existingLive) {
        setValidationError(`The store handle "${slugCheck.cleanSlug}.${getRootDomain()}" is already registered. Please choose another.`);
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      console.warn('Live slug uniqueness check failed:', e);
    }

    const cur = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

    const storeId = `store_${Date.now()}`;
    const newStore: Store = {
      id: storeId,
      name: name.trim(),
      ownerName: ownerName.trim(),
      slug: slugCheck.cleanSlug,
      ownerEmail: `${slugCheck.cleanSlug}@tashop.co`,
      ownerPassword: 'password123',
      tagline: `Welcome to ${name.trim()}`,
      description: `Shop our curated collection directly on WhatsApp with fast and reliable delivery.`,
      whatsappCountryCode: countryCode,
      whatsappNumber: whatsappNumber.replace(/\D/g, ''),
      currency: cur.code,
      currencySymbol: cur.symbol,
      logoUrl:
        selectedNiche === 'beauty'
          ? 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&auto=format&fit=crop&q=80'
          : selectedNiche === 'fashion'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
          : selectedNiche === 'gadgets'
          ? 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=300&auto=format&fit=crop&q=80'
          : selectedNiche === 'food'
          ? 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80',
      bannerUrl:
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80',
      accentColor: accentColor,
      themeStyle: selectedNiche === 'perfumes' ? 'luxury' : 'modern',
      location: location.trim() || 'Nigeria',
      announcement: '🎉 Welcome to our brand new WhatsApp storefront! Order in 1 click.',
      deliveryInfo: 'Fast dispatch available. Contact us for delivery timelines and rates.',
      socialLinks: {},
      tier: 'free',
      verified: false,
      createdAt: new Date().toISOString(),
    };

    // Add 2 default sample products based on niche so store isn't empty!
    const sampleProducts: Product[] = [
      {
        id: `prod_${Date.now()}_1`,
        uid: `TA-${slugCheck.cleanSlug.split('-')[0]?.toUpperCase().slice(0, 3) || 'ITM'}-101`,
        storeId: storeId,
        name: `${name.trim()} Signature Item 01`,
        slug: 'signature-item-01',
        description: 'Our flagship top-selling product. Handcrafted with superior quality and ready for instant dispatch.',
        price: currency === 'NGN' ? 25000 : 45,
        originalPrice: currency === 'NGN' ? 30000 : 55,
        category: 'Featured',
        images: [newStore.logoUrl],
        inStock: true,
        badge: 'Bestseller',
        variants: [
          {
            id: `v_${Date.now()}_a`,
            name: 'Standard Option',
            price: currency === 'NGN' ? 25000 : 45,
            inStock: true,
          },
        ],
        inquiryCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: `prod_${Date.now()}_2`,
        uid: `TA-${slugCheck.cleanSlug.split('-')[0]?.toUpperCase().slice(0, 3) || 'ITM'}-102`,
        storeId: storeId,
        name: `${name.trim()} Premium Edition 02`,
        slug: 'premium-edition-02',
        description: 'Exclusive limited collection piece. Available while stocks last.',
        price: currency === 'NGN' ? 45000 : 80,
        category: 'Exclusive',
        images: [newStore.logoUrl],
        inStock: true,
        variants: [],
        inquiryCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    try {
      // 🔒 LIVE SUPABASE SAVE FIRST
      await dbSaveStore(newStore);
      for (const sp of sampleProducts) {
        await dbSaveProduct(sp);
      }
    } catch (e) {
      console.error('Cloud store creation error:', e);
    }

    // 🔒 STRICT ISOLATION: Save ONLY this store locally for this creator
    saveStores([newStore]);

    const allProducts = getStoredProducts();
    saveProducts([...allProducts.filter(p => p.storeId === newStore.id), ...sampleProducts]);

    // Celebrate
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    setIsSubmitting(false);
    onStoreCreated(newStore);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col z-10 pb-safe sm:pb-0">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <StoreIcon className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                <span>Create Storefront</span>
                <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Live in 30s
                </span>
              </h3>
              <p className="text-xs text-slate-300">Get your unique link & start taking WhatsApp orders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Store Niche */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
              What do you sell?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NICHES.map((niche) => (
                <button
                  type="button"
                  key={niche.id}
                  onClick={() => handleNicheSelect(niche.id)}
                  className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition cursor-pointer ${
                    selectedNiche === niche.id
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  <span className="text-base">{niche.emoji}</span>
                  <span className="truncate">{niche.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Store Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Store Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Bella Scents, Zenith Tech, Apex Stores"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Store Owner Full Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Store Owner Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Chioma Adebayo or Ibrahim Musa"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>

          {/* Auto Store Link Preview Pill (No manual input needed) */}
          {slug ? (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-600">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Store Link:</span>
              <span className="font-bold text-slate-900 truncate">{slug}.{getRootDomain()}</span>
              <span className="ml-auto text-emerald-600 text-[10px] font-sans font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Auto-assigned
              </span>
            </div>
          ) : null}

          {/* WhatsApp Phone */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-2.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="+234">🇳🇬 +234</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+254">🇰🇪 +254</option>
                <option value="+233">🇬🇭 +233</option>
                <option value="+27">🇿🇦 +27</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 08031234567"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Currency & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">City / Location</label>
              <input
                type="text"
                placeholder="e.g. Lekki, Lagos or Abuja"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Brand Accent Color */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>Brand Accent Theme</span>
            </label>
            <div className="flex items-center gap-3">
              {['#b45309', '#047857', '#1d4ed8', '#be185d', '#ea580c', '#0f172a'].map((col) => (
                <button
                  type="button"
                  key={col}
                  onClick={() => setAccentColor(col)}
                  className={`w-7 h-7 rounded-full border-2 transition cursor-pointer ${
                    accentColor === col ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border border-slate-200"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isSubmitting ? 'Launching Store on Cloud...' : 'Launch Storefront & Open Dashboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
