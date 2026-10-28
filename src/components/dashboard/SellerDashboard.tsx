import React, { useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  QrCode,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CurrencyCode, Product, Store, StoreOrder, WhatsAppInquiryLog } from '../../types';
import { AddEditProductModal } from './AddEditProductModal';
import { PaystackModal } from '../modals/PaystackModal';
import { SocialShareModal } from '../modals/SocialShareModal';
import { StatusStudioModal } from '../modals/StatusStudioModal';
import { WaybillModal } from '../modals/WaybillModal';
import { WhatsAppBotStudio } from './WhatsAppBotStudio';
import { formatPrice, generateWhatsAppLink } from '../../utils/whatsapp';
import { generateQRCodeSVG } from '../../utils/qrCode';
import { playOrderNotificationSound } from '../../utils/audio';
import {
  generateItemUid,
  getOrdersByStore,
  getStoredInquiries,
  getStoredProducts,
  getStoredStores,
  getStoreUrl,
  getStoreDisplayUrl,
  saveInquiries,
  saveProducts,
  saveStores,
  updateOrderStatus,
  validateSlug,
} from '../../utils/storage';

interface SellerDashboardProps {
  store: Store;
  products: Product[];
  inquiries: WhatsAppInquiryLog[];
  onOpenStorefront: () => void;
  onRefreshData: () => void;
  onSelectStore: (store: Store) => void;
  onOpenGuide?: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  store,
  products,
  inquiries,
  onOpenStorefront,
  onRefreshData,
  onSelectStore,
  onOpenGuide,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'uid-bot' | 'marketing' | 'inquiries' | 'settings' | 'billing'>('orders');

  // Orders State & Filtering
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'dispatched' | 'completed' | 'cancelled'>('all');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Status & Story Studio Modal state
  const [isStatusStudioOpen, setIsStatusStudioOpen] = useState(false);
  const [statusStudioProduct, setStatusStudioProduct] = useState<Product | null>(null);

  // Commercial Waybill Modal state
  const [isWaybillOpen, setIsWaybillOpen] = useState(false);
  const [selectedOrderForWaybill, setSelectedOrderForWaybill] = useState<StoreOrder | null>(null);

  const storeOrders = getOrdersByStore(store.id);
  const totalOrderRevenue = storeOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const pendingOrdersCount = storeOrders.filter((o) => o.status === 'pending').length;

  const filteredOrders = storeOrders.filter((o) => {
    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const cleanQ = orderSearch.trim().toLowerCase();
    const matchSearch =
      !cleanQ ||
      o.id.toLowerCase().includes(cleanQ) ||
      o.buyerName.toLowerCase().includes(cleanQ) ||
      o.buyerPhone.includes(cleanQ) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(cleanQ)) ||
      o.items.some((i) => i.productName.toLowerCase().includes(cleanQ) || (i.productUid && i.productUid.toLowerCase().includes(cleanQ)));
    return matchStatus && matchSearch;
  });

  // Search & Filter in Products
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Product Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Paystack & Share Modals
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Settings local state
  const [settingsName, setSettingsName] = useState(store.name);
  const [settingsSlug, setSettingsSlug] = useState(store.slug);
  const [settingsTagline, setSettingsTagline] = useState(store.tagline || '');
  const [settingsDescription, setSettingsDescription] = useState(store.description || '');
  const [settingsCountryCode, setSettingsCountryCode] = useState(store.whatsappCountryCode || '+234');
  const [settingsNumber, setSettingsNumber] = useState(store.whatsappNumber || '');
  const [settingsCurrency, setSettingsCurrency] = useState<CurrencyCode>(store.currency || 'NGN');
  const [settingsAccentColor, setSettingsAccentColor] = useState(store.accentColor || '#b45309');
  const [settingsAnnouncement, setSettingsAnnouncement] = useState(store.announcement || '');
  const [settingsDeliveryInfo, setSettingsDeliveryInfo] = useState(store.deliveryInfo || '');
  const [settingsInstagram, setSettingsInstagram] = useState(store.socialLinks?.instagram || '');
  const [settingsTikTok, setSettingsTikTok] = useState(store.socialLinks?.tiktok || '');
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Link copy toast
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);

  // Mobile sidebar drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Analytics Metrics
  const totalCatalogValue = products.reduce((sum, p) => sum + p.price, 0);
  const outOfStockCount = products.filter((p) => !p.inStock).length;
  const totalInquiriesCount = inquiries.length;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Actions on Products
  const handleToggleStock = (product: Product) => {
    const allProducts = getStoredProducts();
    const updated = allProducts.map((p) => (p.id === product.id ? { ...p, inStock: !p.inStock } : p));
    saveProducts(updated);
    onRefreshData();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const allProducts = getStoredProducts();
      const updated = allProducts.filter((p) => p.id !== productId);
      saveProducts(updated);
      onRefreshData();
    }
  };

  const handleDuplicateProduct = (product: Product) => {
    const allProducts = getStoredProducts();
    const duplicated: Product = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      uid: generateItemUid(store.slug, allProducts.length + 1),
      name: `${product.name} (Copy)`,
      inquiryCount: 0,
      createdAt: new Date().toISOString(),
    };
    saveProducts([duplicated, ...allProducts]);
    onRefreshData();
  };

  const handleSaveProduct = (payload: Partial<Product>) => {
    const allProducts = getStoredProducts();

    if (productToEdit) {
      // Update existing
      const updated = allProducts.map((p) => (p.id === productToEdit.id ? { ...p, ...payload } : p));
      saveProducts(updated);
    } else {
      // Add new
      const newProd: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        uid: payload.uid || generateItemUid(store.slug, allProducts.length + 1),
        storeId: store.id,
        name: payload.name || 'New Product',
        slug: (payload.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: payload.description || '',
        price: payload.price || 0,
        originalPrice: payload.originalPrice,
        category: payload.category || 'General',
        images: payload.images || [],
        inStock: payload.inStock ?? true,
        badge: payload.badge,
        variants: payload.variants || [],
        inquiryCount: 0,
        createdAt: new Date().toISOString(),
      };
      saveProducts([newProd, ...allProducts]);
    }

    onRefreshData();
    setProductToEdit(null);
  };

  // Inquiry Status Change
  const handleUpdateInquiryStatus = (inquiryId: string, status: WhatsAppInquiryLog['status']) => {
    const allInquiries = getStoredInquiries();
    const updated = allInquiries.map((i) => (i.id === inquiryId ? { ...i, status } : i));
    saveInquiries(updated);
    onRefreshData();
  };

  // Save Store Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);

    // Validate slug
    const slugCheck = validateSlug(settingsSlug, store.id);
    if (!slugCheck.isValid) {
      setSettingsError(slugCheck.error || 'Invalid slug');
      return;
    }

    const curSymbol =
      settingsCurrency === 'NGN'
        ? '₦'
        : settingsCurrency === 'USD'
        ? '$'
        : settingsCurrency === 'GBP'
        ? '£'
        : settingsCurrency === 'EUR'
        ? '€'
        : settingsCurrency === 'KES'
        ? 'KSh'
        : 'GH₵';

    const updatedStore: Store = {
      ...store,
      name: settingsName.trim(),
      slug: slugCheck.cleanSlug,
      tagline: settingsTagline.trim(),
      description: settingsDescription.trim(),
      whatsappCountryCode: settingsCountryCode,
      whatsappNumber: settingsNumber.replace(/\D/g, ''),
      currency: settingsCurrency,
      currencySymbol: curSymbol,
      accentColor: settingsAccentColor,
      announcement: settingsAnnouncement.trim(),
      deliveryInfo: settingsDeliveryInfo.trim(),
      socialLinks: {
        instagram: settingsInstagram.trim(),
        tiktok: settingsTikTok.trim(),
      },
    };

    const allStores = getStoredStores();
    const updatedStores = allStores.map((s) => (s.id === store.id ? updatedStore : s));
    saveStores(updatedStores);
    onSelectStore(updatedStore);
    onRefreshData();

    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  const handleCopyStoreLink = () => {
    const url = getStoreUrl(store.slug);
    navigator.clipboard.writeText(url);
    setCopiedStoreLink(true);
    setTimeout(() => setCopiedStoreLink(false), 2000);
  };

  const storeCatalogUrl = getStoreUrl(store.slug);
  const qrSvg = generateQRCodeSVG(storeCatalogUrl, 260, store.accentColor || '#111827', '#ffffff');

  const handleDownloadStoreQR_PNG = () => {
    const img = new Image();
    const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 0, 0, 600, 600);
        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;
        a.download = `${store.slug}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ─── Nav definition (shared by sidebar + mobile bottom bar) ───────────────
  type TabId = 'orders' | 'products' | 'uid-bot' | 'marketing' | 'inquiries' | 'settings' | 'billing';
  const allTabs: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'orders',    label: 'Orders',          icon: ShoppingBag,   badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined },
    { id: 'products',  label: 'Products',         icon: Package,       badge: `${products.length}` },
    { id: 'uid-bot',   label: 'UID Drop Bot',     icon: Bot,           badge: 'Auto' },
    { id: 'marketing', label: 'Status & QR',      icon: QrCode },
    { id: 'inquiries', label: 'WA Clicks',         icon: MessageCircle, badge: inquiries.length > 0 ? `${inquiries.length}` : undefined },
    { id: 'settings',  label: 'Store Settings',   icon: Settings },
    { id: 'billing',   label: 'Subscription',     icon: CreditCard },
  ];
  // Bottom 5 for mobile notched nav (FAB is center — index 2 slot)
  const bottomTabs: TabId[] = ['orders', 'products', 'marketing', 'settings'];

  const NavItem = ({ tab, compact = false }: { tab: typeof allTabs[0]; compact?: boolean }) => {
    const Icon = tab.icon;
    const active = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
          active
            ? 'bg-white/15 text-white font-semibold'
            : 'text-slate-400 hover:text-white hover:bg-white/8 font-medium'
        }`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-amber-400' : ''}`} />
        {!compact && <span className="text-sm flex-1 truncate">{tab.label}</span>}
        {!compact && tab.badge && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            tab.id === 'orders' && pendingOrdersCount > 0
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-white/20 text-white/70'
          }`}>
            {tab.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden w-full max-w-full">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-slate-900 flex-shrink-0 sticky top-0 overflow-y-auto">
        {/* Store identity */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={store.logoUrl}
              alt={store.name}
              className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">{store.name}</p>
              <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                store.tier === 'business'
                  ? 'bg-violet-500/30 text-violet-300'
                  : store.tier === 'pro'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-white/10 text-slate-400'
              }`}>
                {store.tier === 'business' ? '🤖 Business AI' : store.tier === 'pro' ? '⚡ Pro' : 'Starter'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {allTabs.map(tab => <NavItem key={tab.id} tab={tab} />)}
        </nav>

        {/* Sidebar bottom actions */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={onOpenStorefront}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>View Store</span>
          </button>
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Platform Guide</span>
            </button>
          )}
          {store.tier === 'free' && (
            <button
              onClick={() => setIsPaystackOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY + DRAWER ── */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 bg-slate-900 h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <img src={store.logoUrl} alt={store.name} className="w-9 h-9 rounded-xl object-cover border border-white/20" />
                <div>
                  <p className="text-white font-bold text-sm truncate">{store.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    store.tier === 'business' ? 'bg-violet-500/30 text-violet-300' :
                    store.tier === 'pro' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-400'
                  }`}>
                    {store.tier === 'business' ? '🤖 Business AI' : store.tier === 'pro' ? '⚡ Pro' : 'Starter'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {allTabs.map(tab => <NavItem key={tab.id} tab={tab} />)}
            </nav>
            <div className="p-3 border-t border-white/10 space-y-2">
              <button onClick={onOpenStorefront} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer">
                <Eye className="w-4 h-4" />
                <span>View Store</span>
              </button>
              {onOpenGuide && (
                <button onClick={onOpenGuide} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer">
                  <Sparkles className="w-4 h-4 text-amber-400" /><span>Platform Guide</span>
                </button>
              )}
              {store.tier === 'free' && (
                <button onClick={() => { setIsPaystackOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold cursor-pointer">
                  <Zap className="w-4 h-4" />Upgrade to Pro
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Compact top header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">{store.name}</p>
              <p className="text-[11px] text-slate-400 hidden sm:block font-mono">{store.slug}.ta.shop</p>
            </div>
          </div>

          {/* Header quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStatusStudioProduct(products[0] || null); setIsStatusStudioOpen(true); }}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Status Studio</span>
            </button>
            <button
              onClick={handleCopyStoreLink}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedStoreLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedStoreLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
            {store.tier === 'free' && (
              <button
                onClick={() => setIsPaystackOpen(true)}
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" /><span>Upgrade</span>
              </button>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 p-4 sm:p-6 pb-28 md:pb-8 overflow-x-hidden">

        {/* Analytics Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Orders Received</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{storeOrders.length}</div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {pendingOrdersCount > 0 ? `${pendingOrdersCount} pending dispatch` : 'All orders processed'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Order Revenue</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
              {formatPrice(totalOrderRevenue, store.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">From WhatsApp checkouts</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Catalog Products</span>
              <Package className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{products.length}</div>
            <span className="text-[11px] text-slate-400 font-medium">
              {outOfStockCount > 0 ? `${outOfStockCount} sold out` : 'All in stock'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Leads</span>
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalInquiriesCount}</div>
            <span className="text-[11px] text-slate-400 font-medium">Direct chats initiated</span>
          </div>
        </div>

        {/* TAB 0: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Header with Loud Alert Sound Test Button */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Store Orders & Dispatch Log</h3>
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                    {storeOrders.length} Orders
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orders submitted via your mobile cart. Customers receive their Order ID, and a loud sound alert is triggered on placement.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => playOrderNotificationSound(1.0)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer active:scale-95"
                  title="Test the loud celebratory cash chime that plays when a buyer orders"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Test Loud Order Alert 🔊</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search orders by customer name, phone, address, or Order ID (#TA-ORD)..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'confirmed', label: 'Confirmed' },
                  { id: 'dispatched', label: 'Dispatched' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOrderStatusFilter(st.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                      orderStatusFilter === st.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Feed */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No orders found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {orderSearch || orderStatusFilter !== 'all'
                    ? 'No orders match your filter criteria. Try clearing search or status filters.'
                    : 'When customers place orders from your mobile storefront, they will appear here with full item breakdowns and Item UIDs.'}
                </p>
                {(orderSearch || orderStatusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('all');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition hover:shadow-md"
                  >
                    {/* Order Top Banner */}
                    <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-black text-sm text-slate-900 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          #{ord.id}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`#${ord.id}`);
                            setCopiedOrderId(ord.id);
                            setTimeout(() => setCopiedOrderId(null), 2000);
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedOrderId === ord.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedOrderId === ord.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(ord.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Status Selector Dropdown */}
                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Status:
                        </span>
                        <select
                          value={ord.status}
                          onChange={(e) => {
                            updateOrderStatus(ord.id, e.target.value as any);
                            onRefreshData();
                          }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                            ord.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : ord.status === 'dispatched'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : ord.status === 'confirmed'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-900 border-amber-200 ring-2 ring-amber-400/20'
                          }`}
                        >
                          <option value="pending">🟡 Pending Dispatch</option>
                          <option value="confirmed">🔵 Confirmed</option>
                          <option value="dispatched">🟣 Out for Delivery</option>
                          <option value="completed">🟢 Paid & Delivered</option>
                          <option value="cancelled">🔴 Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Customer & Fulfillment Info Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                        {/* Customer */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Customer Info
                          </span>
                          <div className="font-bold text-slate-900 text-sm">{ord.buyerName}</div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <a
                              href={`tel:${ord.buyerPhone}`}
                              className="font-mono text-slate-700 hover:text-slate-900 flex items-center gap-1 font-semibold underline decoration-slate-300"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{ord.buyerPhone}</span>
                            </a>
                            <a
                              href={generateWhatsAppLink(
                                store.whatsappCountryCode,
                                ord.buyerPhone,
                                `Hello ${ord.buyerName}, this is ${store.name} regarding your order #${ord.id}.`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold hover:bg-emerald-100 transition flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                          {ord.buyerNotes && (
                            <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                              💬 Note: "{ord.buyerNotes}"
                            </div>
                          )}
                        </div>

                        {/* Fulfillment */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Fulfillment Details
                          </span>
                          <div>
                            {ord.fulfillmentMethod === 'delivery' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Doorstep Delivery</span>
                                </span>
                                <div className="text-xs text-slate-800 font-medium mt-1">
                                  📍 {ord.deliveryAddress || 'Address not specified'}
                                </div>
                                {ord.deliveryArea && (
                                  <div className="text-xs text-slate-500">
                                    🏙️ City/Area: {ord.deliveryArea}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                  <span>🏬 Store Pickup</span>
                                </span>
                                <div className="text-xs text-slate-800 font-medium mt-1">
                                  📍 {store.location || 'At store counter'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered Table */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ordered Items ({ord.items.length})
                        </span>
                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                                  />
                                )}
                                <div>
                                  <div className="font-semibold text-slate-900">{item.productName}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-mono font-bold bg-white text-slate-800 px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                                      UID: #{item.productUid}
                                    </span>
                                    {item.variantName && <span>Option: {item.variantName}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-900">
                                  {formatPrice(item.subtotal, ord.currencySymbol || store.currencySymbol)}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {item.quantity} × {formatPrice(item.price, ord.currencySymbol || store.currencySymbol)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Summary & Actions */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-slate-500">Total Order Amount:</span>
                          <span className="text-lg font-black font-mono text-slate-900">
                            {formatPrice(ord.totalAmount, ord.currencySymbol || store.currencySymbol)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={
                              ord.whatsappUrl ||
                              generateWhatsAppLink(
                                store.whatsappCountryCode,
                                ord.buyerPhone,
                                `Hello ${ord.buyerName}, this is ${store.name} regarding your order #${ord.id}.`
                              )
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Reply to Customer on WhatsApp</span>
                          </a>

                          <button
                            onClick={() => {
                              setSelectedOrderForWaybill(ord);
                              setIsWaybillOpen(true);
                            }}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                            title="Generate commercial delivery waybill slip"
                          >
                            <Truck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Print Waybill</span>
                          </button>

                          {ord.status === 'pending' && (
                            <button
                              onClick={() => {
                                updateOrderStatus(ord.id, 'confirmed');
                                onRefreshData();
                              }}
                              className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                            >
                              Mark Confirmed
                            </button>
                          )}

                          {ord.status === 'confirmed' && (
                            <button
                              onClick={() => {
                                updateOrderStatus(ord.id, 'dispatched');
                                onRefreshData();
                              }}
                              className="py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold transition cursor-pointer"
                            >
                              Mark Dispatched
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Header / Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products by title..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setProductToEdit(null);
                  setIsAddProductOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Item UID</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Variants</th>
                      <th className="py-3 px-4">Inquiries</th>
                      <th className="py-3 px-4">Stock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No products found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                              />
                              <div className="max-w-xs">
                                <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                                {p.badge && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                    {p.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-800 text-xs">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                              #{p.uid || p.id}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {formatPrice(p.price, store.currencySymbol)}
                          </td>

                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px]">
                              {p.category}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {p.variants && p.variants.length > 0 ? (
                              <span className="font-mono">{p.variants.length} options</span>
                            ) : (
                              <span className="text-slate-400">Single SKU</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              {p.inquiryCount || 0}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleStock(p)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                p.inStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{p.inStock ? 'In Stock' : 'Sold Out'}</span>
                            </button>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setStatusStudioProduct(p);
                                  setIsStatusStudioOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
                                title="Create 9:16 WhatsApp Status Card"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span className="hidden sm:inline">Status Card</span>
                              </button>
                              <button
                                onClick={() => {
                                  setProductToEdit(p);
                                  setIsAddProductOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="Duplicate Product"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INQUIRIES & ORDERS LOG */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Customer WhatsApp Inquiry Log</h3>
                  <p className="text-xs text-slate-500">
                    Every time a buyer clicks "Order on WhatsApp", an inquiry event is logged here with their requested variant and location.
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-semibold">
                  {inquiries.length} Inquiries Logged
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {inquiries.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                  No inquiries recorded yet. When buyers click "Order on WhatsApp", they will appear here.
                </div>
              ) : (
                inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{inq.productName}</span>
                        {inq.variantName && (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {inq.variantName}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatPrice(inq.price, store.currencySymbol)}
                        </span>
                      </div>

                      {inq.buyerLocation && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Delivery to: <strong>{inq.buyerLocation}</strong></span>
                        </div>
                      )}

                      {inq.buyerNote && (
                        <p className="text-xs text-slate-500 italic">
                          "{inq.buyerNote}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(inq.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <select
                        value={inq.status}
                        onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as any)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                          inq.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : inq.status === 'contacted'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : inq.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="inquired">🟡 New Inquiry</option>
                        <option value="contacted">🔵 In Discussion</option>
                        <option value="completed">🟢 Paid & Delivered</option>
                        <option value="cancelled">⚪ Cancelled</option>
                      </select>

                      <a
                        href={inq.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold transition flex items-center gap-1"
                        title="Open WhatsApp chat with message pre-filled"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 max-w-3xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">Storefront Settings</h3>
            <p className="text-xs text-slate-500 mb-6">
              Configure your store slug, WhatsApp routing, brand color palette, and delivery announcement.
            </p>

            {settingsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSavedToast && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Store settings updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* Store Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Store Name</label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Store URL Slug (Unique)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-slate-900">
                    <span className="pl-3 text-xs text-slate-500 font-mono">/s/</span>
                    <input
                      type="text"
                      required
                      value={settingsSlug}
                      onChange={(e) => setSettingsSlug(e.target.value)}
                      className="w-full px-2 py-2.5 text-xs font-mono text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Store Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. 100% Original Designer & Niche Fragrances in Lagos"
                  value={settingsTagline}
                  onChange={(e) => setSettingsTagline(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* WhatsApp Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Country</label>
                  <select
                    value={settingsCountryCode}
                    onChange={(e) => setSettingsCountryCode(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="+234">🇳🇬 +234 (Nigeria)</option>
                    <option value="+1">🇺🇸 +1 (USA/Canada)</option>
                    <option value="+44">🇬🇧 +44 (UK)</option>
                    <option value="+254">🇰🇪 +254 (Kenya)</option>
                    <option value="+233">🇬🇭 +233 (Ghana)</option>
                    <option value="+27">🇿🇦 +27 (South Africa)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    WhatsApp Orders Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={settingsNumber}
                    onChange={(e) => setSettingsNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Announcement Bar & Accent Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Announcement Banner (Top of page)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ✨ Free nationwide dispatch on orders over ₦70,000!"
                    value={settingsAnnouncement}
                    onChange={(e) => setSettingsAnnouncement(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Theme Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsAccentColor}
                      onChange={(e) => setSettingsAccentColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settingsAccentColor}
                      onChange={(e) => setSettingsAccentColor(e.target.value)}
                      className="w-28 px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200"
                    />
                    <div className="flex gap-1">
                      {['#b45309', '#047857', '#1d4ed8', '#be185d', '#0f172a'].map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setSettingsAccentColor(c)}
                          className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Info Policy */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Delivery & Logistics Timeline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Island & Mainland: Same-day. Rest of Nigeria: 24-48 hours."
                  value={settingsDeliveryInfo}
                  onChange={(e) => setSettingsDeliveryInfo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Social links */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Instagram Handle</label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <span className="pl-3 text-xs text-slate-400 select-none">@</span>
                    <input
                      type="text"
                      value={settingsInstagram}
                      onChange={(e) => setSettingsInstagram(e.target.value)}
                      className="w-full px-1.5 py-2 text-xs bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">TikTok Handle</label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <span className="pl-3 text-xs text-slate-400 select-none">@</span>
                    <input
                      type="text"
                      value={settingsTikTok}
                      onChange={(e) => setSettingsTikTok(e.target.value)}
                      className="w-full px-1.5 py-2 text-xs bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  Save Store Settings
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB: WHATSAPP DROP UID BOT */}
        {activeTab === 'uid-bot' && (
          <WhatsAppBotStudio store={store} products={products} onRefreshData={onRefreshData} />
        )}

        {/* TAB 4: MARKETING & QR */}
        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Studio Promotion Card */}
            <div className="md:col-span-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Status & Story Studio (9:16 Vertical Cards)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Export high-res story cards with Item UIDs, currency prices, and QR codes for WhatsApp Status, Instagram Stories, and TikTok.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStatusStudioProduct(products[0] || null);
                  setIsStatusStudioOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Launch Status Studio</span>
              </button>
            </div>
            {/* Downloadable QR Code Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Printable Store QR Code</h3>
                <p className="text-xs text-slate-500">
                  Print this QR code on physical business cards, delivery boxes, or thank-you cards.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div
                  className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="mt-3 text-xs font-mono text-slate-600 font-semibold">
                  {store.slug}.ta.shop
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadStoreQR_PNG}
                  className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Download high-res PNG for flyers and social media"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => {
                    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${store.slug}-qr.svg`;
                    a.click();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Download scalable vector SVG"
                >
                  <Download className="w-4 h-4" />
                  <span>SVG</span>
                </button>

                <button
                  onClick={handleCopyStoreLink}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            {/* Social Sharing Pitch & Tips */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">WhatsApp Status & Bio Links</h3>
                <p className="text-xs text-slate-500">
                  Ready-made templates to post on your WhatsApp Status and Instagram Bio.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Instagram / TikTok Bio Link
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={storeCatalogUrl}
                      className="w-full text-xs font-mono text-slate-800 bg-white p-2 rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={handleCopyStoreLink}
                      className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    WhatsApp Status Broadcast Message
                  </span>
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-sans leading-relaxed">
                    ✨ Check out the new catalog for <strong>{store.name}</strong>! All items in stock with Item UID search and 1-click WhatsApp ordering: {storeCatalogUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUBSCRIPTION & BILLING */}
        {activeTab === 'billing' && (
          <div className="max-w-3xl space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Current Active Plan
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <span>{store.tier === 'pro' ? 'Tá.shop Pro Seller' : 'Tá.shop Starter Plan (₦500/mo)'}</span>
                    {store.tier === 'pro' && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {store.tier === 'pro'
                      ? 'Active recurring subscription via Paystack. Unlimited products and verified badge enabled.'
                      : 'Starter tier at ₦500/month for up to 10 products with custom slug and WhatsApp orders.'}
                  </p>
                </div>

                {store.tier === 'free' ? (
                  <button
                    onClick={() => setIsPaystackOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-[#0ba4db] hover:bg-[#0091c5] text-white font-bold text-xs shadow-md transition cursor-pointer"
                  >
                    Upgrade for ₦4,900/mo
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    Active & Renewed
                  </span>
                )}
              </div>
            </div>

            {/* Plan Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={`p-5 rounded-2xl border bg-white ${store.tier === 'free' ? 'ring-2 ring-slate-900' : 'border-slate-200'}`}>
                <h4 className="font-bold text-slate-900 text-sm">Starter Plan</h4>
                <div className="mt-2 text-2xl font-black font-mono">₦500 <span className="text-xs font-normal text-slate-400">/ month</span></div>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">✓ Up to 10 products</li>
                  <li className="flex items-center gap-2">✓ Custom store slug (tá.shop/slug)</li>
                  <li className="flex items-center gap-2">✓ Item UID search & WhatsApp checkout</li>
                  <li className="flex items-center gap-2">✓ Loud audio order alerts on dashboard</li>
                  <li className="flex items-center gap-2 text-slate-400">✕ Verified merchant badge</li>
                  <li className="flex items-center gap-2 text-slate-400">✕ Remove Tá.shop branding</li>
                </ul>
              </div>

              <div className={`p-5 rounded-2xl border bg-gradient-to-br from-amber-50/50 to-white ${store.tier === 'pro' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>Tá.shop Pro</span>
                    <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  </h4>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    Recommended
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono">₦4,900 <span className="text-xs font-normal text-slate-400">/ month</span></div>
                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Unlimited products & variants</strong></li>
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Verified Blue Tick</strong> for high trust</li>
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Remove "Powered by Tá.shop"</strong></li>
                  <li className="flex items-center gap-2 font-medium">✓ Priority WhatsApp click analytics</li>
                  <li className="flex items-center gap-2 font-medium">✓ Custom domain support ready</li>
                </ul>
                {store.tier === 'free' && (
                  <button
                    onClick={() => setIsPaystackOpen(true)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    Activate Pro with Paystack
                  </button>
                )}
              </div>

              {/* Business AI Plan */}
              <div className={`p-5 rounded-2xl border bg-gradient-to-br from-violet-50/80 to-white ${store.tier === 'business' ? 'ring-2 ring-violet-500 border-violet-300' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <span>Business AI</span>
                    <Bot className="w-3.5 h-3.5 text-violet-500" />
                  </h4>
                  <span className="bg-violet-100 text-violet-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                    🤖 AI Powered
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black font-mono">₦25,000 <span className="text-xs font-normal text-slate-400">/ month</span></div>
                <ul className="mt-4 space-y-2 text-xs text-slate-700">
                  <li className="flex items-center gap-2 font-medium">✓ <strong>Everything in Pro</strong></li>
                  <li className="flex items-center gap-2 font-medium">✓ <strong>24/7 AI WhatsApp Bot</strong> — auto-replies</li>
                  <li className="flex items-center gap-2 font-medium">✓ Smart product recommendations</li>
                  <li className="flex items-center gap-2 font-medium">✓ Auto order-confirmation messages</li>
                  <li className="flex items-center gap-2 font-medium">✓ Unlimited bot conversations</li>
                  <li className="flex items-center gap-2 font-medium">✓ Priority support &amp; early access</li>
                </ul>
                {store.tier !== 'business' && (
                  <button
                    onClick={() => setIsPaystackOpen(true)}
                    className="mt-4 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-xs font-semibold shadow transition cursor-pointer"
                  >
                    Activate Business AI
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        </div>{/* /content area */}
      </div>{/* /main flex-1 */}

      {/* ── MOBILE NOTCHED BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 h-16 flex items-end"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex w-full items-center h-16 relative">
          {/* Left 2 tabs */}
          {['orders', 'products'].map((tabId) => {
            const tab = allTabs.find(t => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer relative"
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-slate-400'}`} />
                  {tab.badge && tab.id === 'orders' && pendingOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {pendingOrdersCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-600' : 'text-slate-400'}`}>{tab.label}</span>
              </button>
            );
          })}

          {/* CENTER NOTCH FAB */}
          <div className="flex-1 flex justify-center items-end pb-1 relative">
            <button
              onClick={() => { setActiveTab('products'); setIsAddProductOpen(true); }}
              className="absolute -top-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-full shadow-xl flex items-center justify-center transition cursor-pointer border-4 border-white"
            >
              <Plus className="w-7 h-7 text-white" strokeWidth={3} />
            </button>
          </div>

          {/* Right 2 tabs */}
          {['marketing', 'settings'].map((tabId) => {
            const tab = allTabs.find(t => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer"
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-600' : 'text-slate-400'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Product Add/Edit Modal */}
      <AddEditProductModal
        isOpen={isAddProductOpen}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }}
        store={store}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
      />

      {/* Paystack Upgrade Modal */}
      <PaystackModal
        isOpen={isPaystackOpen}
        onClose={() => setIsPaystackOpen(false)}
        store={store}
        initialPlan="starter"
        onUpgradeSuccess={(plan) => {
          const allStores = getStoredStores();
          const updatedStore: Store = {
            ...store,
            tier: plan === 'pro' ? 'pro' : 'free',
            verified: plan === 'pro',
          };
          saveStores(allStores.map((s) => (s.id === store.id ? updatedStore : s)));
          onSelectStore(updatedStore);
          onRefreshData();
        }}
      />

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        store={store}
      />

      {/* Status & Story Studio Modal */}
      <StatusStudioModal
        isOpen={isStatusStudioOpen}
        onClose={() => setIsStatusStudioOpen(false)}
        store={store}
        products={products}
        initialProduct={statusStudioProduct}
      />

      {/* Commercial Dispatch Waybill Modal */}
      {selectedOrderForWaybill && (
        <WaybillModal
          isOpen={isWaybillOpen}
          onClose={() => {
            setIsWaybillOpen(false);
            setSelectedOrderForWaybill(null);
          }}
          order={selectedOrderForWaybill}
          store={store}
        />
      )}
    </div>
  );
};
