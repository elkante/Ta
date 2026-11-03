import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Lock,
  MessageCircle,
  Palette,
  Phone,
  Save,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Type,
  Upload,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Store, StorefrontCustomization, StoreThemeId } from '../../types';
import { dbSaveStore } from '../../utils/supabase';
import { getStoreDisplayUrl, getStoreUrl } from '../../utils/storage';

export interface ThemeTemplate {
  id: StoreThemeId;
  name: string;
  category: string;
  description: string;
  colors: string[];
  font: string;
  badge?: string;
  previewBg: string;
}

export const STORE_THEMES: ThemeTemplate[] = [
  {
    id: 'mercato',
    name: 'Mercato',
    category: 'Modern Boutique & Apparel',
    description: 'Clean modern marketplace layout with a sticky header bar, crisp product grid, and warm neutral undertones.',
    colors: ['#0f172a', '#3b82f6', '#f8fafc'],
    font: 'Modern Sans',
    badge: 'Popular',
    previewBg: 'bg-slate-900',
  },
  {
    id: 'margaux',
    name: 'Margaux',
    category: 'Editorial Luxe Couture',
    description: 'Deep navy, warm gold accents, and serif headings tailored for premium fashion, bespoke tailoring, and couture.',
    colors: ['#0f172a', '#d97706', '#fef3c7'],
    font: 'Playfair Display',
    badge: 'Luxury',
    previewBg: 'bg-[#0f172a]',
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    category: 'Mainstream Commerce',
    description: 'Vibrant cobalt blue on crisp white with high-contrast action buttons and straightforward catalog shopping.',
    colors: ['#1d4ed8', '#2563eb', '#ffffff'],
    font: 'Plus Jakarta Sans',
    badge: 'High Conversion',
    previewBg: 'bg-blue-600',
  },
  {
    id: 'arena',
    name: 'Arena',
    category: 'Monochrome Streetwear',
    description: 'Stark black-and-white contrast, bold punchy headings, and urban edge for streetwear and sneakers.',
    colors: ['#000000', '#22c55e', '#ffffff'],
    font: 'Space Grotesk',
    badge: 'Urban',
    previewBg: 'bg-black',
  },
  {
    id: 'colette',
    name: 'Colette',
    category: 'Magazine Boutique & Beauty',
    description: 'Soft rose & blush tones, warm gentle borders, and editorial poise for beauty, skincare, and fragrance.',
    colors: ['#881337', '#f43f5e', '#fff1f2'],
    font: 'Cormorant Garamond',
    badge: 'Beauty & Glow',
    previewBg: 'bg-rose-950',
  },
  {
    id: 'galactic',
    name: 'Galactic',
    category: 'Dark Obsidian Catalogue',
    description: 'Moody obsidian midnight theme with indigo highlights for electronics, leather goods, and high-tech gadgets.',
    colors: ['#020617', '#6366f1', '#1e1b4b'],
    font: 'Outfit / Sans',
    badge: 'Dark Mode',
    previewBg: 'bg-slate-950',
  },
  {
    id: 'maison',
    name: 'Maison',
    category: 'Quiet Luxury Fashion House',
    description: 'Subtle slate borders, warm sandstone undertones, and generous whitespace for minimalist elegance.',
    colors: ['#334155', '#b45309', '#f8fafc'],
    font: 'Cinzel / Serif',
    badge: 'Quiet Luxury',
    previewBg: 'bg-stone-800',
  },
  {
    id: 'aurum',
    name: 'Aurum',
    category: "Jeweller's Boutique at Night",
    description: 'Near-black backdrop with metallic champagne gold and shimmer accents for fine jewelry & watches.',
    colors: ['#171717', '#f59e0b', '#fef08a'],
    font: 'Playfair Display',
    badge: 'Gold & Jewelry',
    previewBg: 'bg-[#121212]',
  },
];

interface ManageStorefrontTabProps {
  store: Store;
  onUpdateStore: (updatedStore: Store) => void;
  onOpenStorefront: () => void;
}

type SectionModalType =
  | null
  | 'hero'
  | 'about'
  | 'branding'
  | 'theme'
  | 'typography'
  | 'trust'
  | 'promo'
  | 'contact';

export const ManageStorefrontTab: React.FC<ManageStorefrontTabProps> = ({
  store,
  onUpdateStore,
  onOpenStorefront,
}) => {
  const [activeModal, setActiveModal] = useState<SectionModalType>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Published toggle state
  const isPublished = store.isPublished !== false;

  // Customization local working state
  const custom: StorefrontCustomization = store.storefrontCustomization || {};

  // Form states for modals
  const [heroHeadline, setHeroHeadline] = useState(custom.heroHeadline || store.name);
  const [heroSubtitle, setHeroSubtitle] = useState(custom.heroSubtitle || store.tagline || '');
  const [heroCtaText, setHeroCtaText] = useState(custom.heroCtaText || 'Shop Collection');
  const [heroBgColor, setHeroBgColor] = useState(custom.heroBgColor || store.accentColor || '#a84a32');
  const [heroLayout, setHeroLayout] = useState<'editorial' | 'banner' | 'split' | 'classic'>(
    custom.heroLayout || 'editorial'
  );

  // About form states
  const [aboutTitle, setAboutTitle] = useState(custom.aboutTitle || `About ${store.name}`);
  const [aboutTagline, setAboutTagline] = useState(custom.aboutTagline || 'OUR STORY & CRAFT');
  const [aboutStory, setAboutStory] = useState(
    custom.aboutStory ||
      store.description ||
      `${store.name} was founded with a passion to deliver genuine, high-quality products directly to our valued customers. Every item in our catalog is hand-selected and carefully inspected before dispatch.`
  );
  const [aboutImageUrl, setAboutImageUrl] = useState(custom.aboutImageUrl || '');

  // Theme & layout
  const [themeStyle, setThemeStyle] = useState<Store['themeStyle']>(store.themeStyle || 'luxury');
  const [themeId, setThemeId] = useState<StoreThemeId>(custom.themeId || 'mercato');
  const [fontFamily, setFontFamily] = useState<StorefrontCustomization['fontFamily']>(
    custom.fontFamily || 'serif'
  );

  // Trust badges
  const [showTrustBadges, setShowTrustBadges] = useState(custom.showTrustBadges !== false);
  const [badge1Title, setBadge1Title] = useState(custom.trustBadge1Title || 'PACKAGED WITH CARE');
  const [badge1Sub, setBadge1Sub] = useState(custom.trustBadge1Subtitle || 'Carefully inspected before dispatch');
  const [badge2Title, setBadge2Title] = useState(custom.trustBadge2Title || 'AUTHENTIC GUARANTEE');
  const [badge2Sub, setBadge2Sub] = useState(custom.trustBadge2Subtitle || '100% genuine products directly sourced');
  const [badge3Title, setBadge3Title] = useState(custom.trustBadge3Title || 'DIRECT WHATSAPP SUPPORT');
  const [badge3Sub, setBadge3Sub] = useState(custom.trustBadge3Subtitle || 'Fast assistance from our friendly team');
  const [badge4Title, setBadge4Title] = useState(custom.trustBadge4Title || 'SECURE PAYMENTS');
  const [badge4Sub, setBadge4Sub] = useState(custom.trustBadge4Subtitle || 'Bank transfer & instant invoice receipts');

  // Promo banner
  const [promoEnabled, setPromoEnabled] = useState(custom.promoBannerEnabled || false);
  const [promoText, setPromoText] = useState(
    custom.promoBannerText || 'LIMITED TIME: Save big across our latest arrivals!'
  );
  const [promoCta, setPromoCta] = useState(custom.promoBannerCta || 'Shop The Sale →');

  // Branding states
  const [accentColor, setAccentColor] = useState(store.accentColor || '#a84a32');
  const [logoUrl, setLogoUrl] = useState(store.logoUrl || '');
  const [bannerUrl, setBannerUrl] = useState(store.bannerUrl || '');

  // Navigation
  const [showNavLinks, setShowNavLinks] = useState(custom.showNavLinks !== false);

  const storeDisplayUrl = getStoreDisplayUrl(store.slug, store.customDomain);
  const fullStoreUrl = getStoreUrl(store.slug, { customDomain: store.customDomain });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullStoreUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleTogglePublished = async () => {
    const updatedStore: Store = {
      ...store,
      isPublished: !isPublished,
    };
    onUpdateStore(updatedStore);
    try {
      await dbSaveStore(updatedStore);
    } catch (e) {}
  };

  const handleSaveCustomization = async () => {
    setIsSaving(true);
    const updatedCustom: StorefrontCustomization = {
      isPublished,
      themeId,
      fontFamily,
      heroHeadline,
      heroSubtitle,
      heroCtaText,
      heroBgColor,
      heroLayout,
      aboutTitle,
      aboutTagline,
      aboutStory,
      aboutImageUrl,
      showTrustBadges,
      trustBadge1Title: badge1Title,
      trustBadge1Subtitle: badge1Sub,
      trustBadge2Title: badge2Title,
      trustBadge2Subtitle: badge2Sub,
      trustBadge3Title: badge3Title,
      trustBadge3Subtitle: badge3Sub,
      trustBadge4Title: badge4Title,
      trustBadge4Subtitle: badge4Sub,
      promoBannerEnabled: promoEnabled,
      promoBannerText: promoText,
      promoBannerCta: promoCta,
      showNavLinks,
    };

    const updatedStore: Store = {
      ...store,
      accentColor,
      logoUrl,
      bannerUrl,
      themeStyle,
      storefrontCustomization: updatedCustom,
    };

    onUpdateStore(updatedStore);

    try {
      await dbSaveStore(updatedStore);
    } catch (e) {
      console.warn('Failed to save store customization:', e);
    }

    setIsSaving(false);
    setActiveModal(null);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {saveSuccessToast && (
        <div className="fixed top-5 right-5 z-[300] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">Storefront customisation saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Manage Storefront</h2>
        <p className="text-xs text-slate-500 mt-1">
          Customise what customers see when they visit your store — hero style, about story, trust badges &amp; navigation.
        </p>
      </div>

      {/* Top Card: Public URL & Published Switch (Styled like Orderly) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Public URL</span>
              <button
                onClick={handleCopyLink}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            <a
              href={fullStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm sm:text-base font-bold text-blue-600 hover:text-blue-700 transition flex items-center gap-1.5 truncate mt-0.5 group"
            >
              <span className="truncate">{storeDisplayUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
            </a>
          </div>
        </div>

        {/* Published Switch */}
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-2xl">
          <span
            className={`text-xs font-bold ${
              isPublished ? 'text-emerald-700' : 'text-slate-400'
            }`}
          >
            {isPublished ? 'Published' : 'Paused'}
          </span>
          <button
            type="button"
            onClick={handleTogglePublished}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isPublished ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isPublished ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Sections Grid (8 Cards matching Orderly structure) */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700">Sections</span>
          <button
            onClick={onOpenStorefront}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview live store</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* 1. Hero & Banner */}
          <button
            type="button"
            onClick={() => setActiveModal('hero')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Hero &amp; Banner</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                The first thing visitors see — title, subtitle, CTA button, and cover background.
              </p>
            </div>
          </button>

          {/* 2. About Us & Story */}
          <button
            type="button"
            onClick={() => setActiveModal('about')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-purple-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>About &amp; Our Story</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Tell your brand story — your journey, founder note, and what makes your store unique.
              </p>
            </div>
          </button>

          {/* 3. Branding & Colors */}
          <button
            type="button"
            onClick={() => setActiveModal('branding')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Palette className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Branding</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Logo, primary brand colour, cover banner, and visual identity.
              </p>
            </div>
          </button>

          {/* 4. Theme & Layout */}
          <button
            type="button"
            onClick={() => setActiveModal('theme')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-amber-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Theme &amp; Layout</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Pick a template that fits your store's vibe (Terracotta, Luxury Noir, Clean Minimal).
              </p>
            </div>
          </button>

          {/* 5. Typography */}
          <button
            type="button"
            onClick={() => setActiveModal('typography')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-sky-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Type className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Typography</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Choose the font your whole storefront uses (Serif Editorial, Modern Sans, Grotesk).
              </p>
            </div>
          </button>

          {/* 6. Trust Badges */}
          <button
            type="button"
            onClick={() => setActiveModal('trust')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-teal-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Trust Guarantees</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Packaging care, quality checks, rapid WhatsApp response, and money-back guarantee.
              </p>
            </div>
          </button>

          {/* 7. Promotional Banner */}
          <button
            type="button"
            onClick={() => setActiveModal('promo')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-rose-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Tag className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Promotional Banner</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Highlight a flash sale, seasonal drop, or discount code directly across your store.
              </p>
            </div>
          </button>

          {/* 8. Contact & Socials */}
          <button
            type="button"
            onClick={() => setActiveModal('contact')}
            className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-md transition text-left cursor-pointer flex items-start gap-3.5 group"
          >
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                <span>Contact &amp; Hours</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition" />
              </h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">
                Phone, WhatsApp, location, delivery timelines, and social handles.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── MODALS FOR EDITING EACH SECTION ── */}

      {/* 1. HERO MODAL */}
      {activeModal === 'hero' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Hero &amp; Banner Customisation</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Headline Text</label>
                <input
                  type="text"
                  value={heroHeadline}
                  onChange={(e) => setHeroHeadline(e.target.value)}
                  placeholder="e.g. Solar Haven"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  placeholder="e.g. TASTEFUL PIECES FOR EVERY OCCASION"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Call to Action Button Label</label>
                <input
                  type="text"
                  value={heroCtaText}
                  onChange={(e) => setHeroCtaText(e.target.value)}
                  placeholder="e.g. Shop Now"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Hero Background Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={heroBgColor}
                    onChange={(e) => setHeroBgColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={heroBgColor}
                    onChange={(e) => setHeroBgColor(e.target.value)}
                    className="flex-1 px-3 py-2 font-mono text-xs border border-slate-200 rounded-xl uppercase"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Presets:</span>
                  {[
                    { name: 'Terracotta', color: '#a84a32' },
                    { name: 'Midnight', color: '#0f172a' },
                    { name: 'Emerald', color: '#064e3b' },
                    { name: 'Warm Amber', color: '#b45309' },
                    { name: 'Plum', color: '#4c1d95' },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setHeroBgColor(p.color)}
                      className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer"
                      style={{ backgroundColor: p.color }}
                      title={p.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ABOUT US MODAL */}
      {activeModal === 'about' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">About Us &amp; Brand Story</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Section Tagline</label>
                <input
                  type="text"
                  value={aboutTagline}
                  onChange={(e) => setAboutTagline(e.target.value)}
                  placeholder="e.g. OUR STORY"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl uppercase font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Section Heading</label>
                <input
                  type="text"
                  value={aboutTitle}
                  onChange={(e) => setAboutTitle(e.target.value)}
                  placeholder="e.g. About solar haven"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Story Narrative</label>
                <textarea
                  rows={5}
                  value={aboutStory}
                  onChange={(e) => setAboutStory(e.target.value)}
                  placeholder="Tell your customers who you are, how the brand started, your values and standards..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl leading-relaxed font-normal"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Optional Image URL (Founder/Storefront)</label>
                <input
                  type="text"
                  value={aboutImageUrl}
                  onChange={(e) => setAboutImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. BRANDING MODAL */}
      {activeModal === 'branding' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Branding &amp; Visual Identity</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">Store Logo URL</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Cover Banner URL</label>
                <input
                  type="text"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Primary Accent Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 px-3 py-2 font-mono text-xs border border-slate-200 rounded-xl uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. THEME & LAYOUT MODAL — Orderly-Inspired 8 Boutique Templates */}
      {activeModal === 'theme' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-black text-slate-900 text-base">Store Theme &amp; Layout</h3>
                <p className="text-xs text-slate-500">
                  Select a template to instantly customize your storefront’s colors, typography, and mood.
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {STORE_THEMES.map((t) => {
                const isSelected = themeId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setThemeId(t.id);
                      if (t.id === 'margaux' || t.id === 'colette' || t.id === 'aurum') {
                        setFontFamily('serif');
                        setThemeStyle('luxury');
                      } else if (t.id === 'arena') {
                        setFontFamily('grotesk');
                        setThemeStyle('bold');
                      } else if (t.id === 'galactic') {
                        setFontFamily('sans');
                        setThemeStyle('minimal');
                      } else {
                        setFontFamily('sans');
                        setThemeStyle('modern');
                      }
                    }}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between space-y-2 relative group ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/40 shadow-sm ring-2 ring-blue-600/20'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Header with badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{t.name}</span>
                        {t.badge && (
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-amber-300">
                            {t.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {t.colors.map((c, i) => (
                          <span
                            key={i}
                            className="w-3.5 h-3.5 rounded-full border border-black/10 inline-block shadow-2xs"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preview Strip */}
                    <div
                      className={`h-12 rounded-xl flex items-center justify-between px-3 text-xs font-bold shadow-2xs ${t.previewBg}`}
                    >
                      <span className="text-white text-[11px] font-mono tracking-tight">
                        {t.category}
                      </span>
                      <span className="text-[10px] text-white/80 font-normal">
                        {t.font}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {t.description}
                    </p>

                    {/* Active Indicator */}
                    <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-xs">
                      <span className="text-[10px] text-slate-400 font-medium">Font: {t.font}</span>
                      <span
                        className={`text-[11px] font-bold ${
                          isSelected ? 'text-blue-600 flex items-center gap-1' : 'text-slate-400'
                        }`}
                      >
                        {isSelected ? '✓ Active Theme' : 'Click to Apply'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Theme Choice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. TYPOGRAPHY MODAL */}
      {activeModal === 'typography' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Storefront Typography</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: 'serif' as const,
                  title: 'Editorial Serif (Playfair / Georgia)',
                  sample: 'Solar Haven — Curated for Every Occasion',
                  fontClass: 'font-serif',
                },
                {
                  id: 'sans' as const,
                  title: 'Modern Sans (Inter / System)',
                  sample: 'Solar Haven — Modern, Fast & Seamless Shopping',
                  fontClass: 'font-sans',
                },
                {
                  id: 'grotesk' as const,
                  title: 'Grotesk Contemporary',
                  sample: 'SOLAR HAVEN — BOLD URBAN ESSENTIALS',
                  fontClass: 'font-mono font-bold tracking-tight',
                },
              ].map((f) => (
                <div
                  key={f.id}
                  onClick={() => setFontFamily(f.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    fontFamily === f.id
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <h5 className="font-bold text-slate-900 text-sm mb-1">{f.title}</h5>
                  <p className={`text-sm text-slate-700 ${f.fontClass}`}>{f.sample}</p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. TRUST BADGES MODAL */}
      {activeModal === 'trust' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Trust Guarantees Row</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTrustBadges}
                  onChange={(e) => setShowTrustBadges(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Display Trust Guarantees row on storefront</span>
              </label>

              {showTrustBadges && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 1</span>
                    <input
                      type="text"
                      value={badge1Title}
                      onChange={(e) => setBadge1Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge1Sub}
                      onChange={(e) => setBadge1Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 2</span>
                    <input
                      type="text"
                      value={badge2Title}
                      onChange={(e) => setBadge2Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge2Sub}
                      onChange={(e) => setBadge2Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 3</span>
                    <input
                      type="text"
                      value={badge3Title}
                      onChange={(e) => setBadge3Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge3Sub}
                      onChange={(e) => setBadge3Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700">Badge 4</span>
                    <input
                      type="text"
                      value={badge4Title}
                      onChange={(e) => setBadge4Title(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg font-bold"
                    />
                    <input
                      type="text"
                      value={badge4Sub}
                      onChange={(e) => setBadge4Sub(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. PROMO MODAL */}
      {activeModal === 'promo' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Promotional Announcement</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promoEnabled}
                  onChange={(e) => setPromoEnabled(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Enable promotional highlight section on storefront</span>
              </label>

              {promoEnabled && (
                <div className="space-y-2 pt-2">
                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Promo Banner Headline</label>
                    <input
                      type="text"
                      value={promoText}
                      onChange={(e) => setPromoText(e.target.value)}
                      placeholder="e.g. Save big across the collection"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-800 block mb-1">Button CTA Text</label>
                    <input
                      type="text"
                      value={promoCta}
                      onChange={(e) => setPromoCta(e.target.value)}
                      placeholder="e.g. Shop The Sale →"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. CONTACT MODAL */}
      {activeModal === 'contact' && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">Contact &amp; Store Location</h3>
              <button onClick={() => setActiveModal(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">WhatsApp Number</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-600">
                    {store.whatsappCountryCode}
                  </span>
                  <input
                    type="text"
                    disabled
                    value={store.whatsappNumber}
                    className="flex-1 px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">To change phone or email, go to Store Settings tab.</p>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Store Physical Location</label>
                <input
                  type="text"
                  disabled
                  value={store.location || 'Online only'}
                  className="w-full px-3 py-2 border border-slate-200 bg-slate-50 rounded-xl text-slate-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">Navigation Links</label>
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={showNavLinks}
                    onChange={(e) => setShowNavLinks(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Show top navigation tabs (HOME, SHOP, ABOUT, REVIEWS, CONTACT)</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomization}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
