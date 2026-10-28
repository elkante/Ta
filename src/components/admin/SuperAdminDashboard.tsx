import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  Building,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Download,
  Edit,
  ExternalLink,
  Eye,
  Filter,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Timer,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  CurrencyCode,
  PlatformSettings,
  Product,
  SellerSession,
  Store,
  StoreOrder,
  SuperAdminSession,
  WhatsAppInquiryLog,
} from '../../types';
import {
  deleteStoreAndData,
  getOrdersByStore,
  getPlatformSettings,
  getProductsByStore,
  getStoredOrders,
  getStoredProducts,
  getStoredStores,
  impersonateStoreAsSeller,
  resetPlatformToSeedData,
  savePlatformSettings,
  saveStores,
  updateStore,
} from '../../utils/storage';
import { formatPrice } from '../../utils/whatsapp';

interface SuperAdminDashboardProps {
  session: SuperAdminSession;
  allStores: Store[];
  onLogout: () => void;
  onRefreshData: () => void;
  onSelectStore: (store: Store) => void;
  onOpenStorefront: (slug: string) => void;
  onImpersonateStore: (session: SellerSession) => void;
  onOpenLanding: () => void;
}

type AdminTab = 'stores' | 'products' | 'orders' | 'plans' | 'notes' | 'settings';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  session,
  allStores,
  onLogout,
  onRefreshData,
  onSelectStore,
  onOpenStorefront,
  onImpersonateStore,
  onOpenLanding,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('stores');

  // Mobile sidebar drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search & Filter state for Stores
  const [storeSearch, setStoreSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'starter' | 'pro' | 'business'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'suspended'>('all');

  // Search state for Products
  const [productSearch, setProductSearch] = useState('');
  const [productStoreFilter, setProductStoreFilter] = useState<string>('all');

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Private note composer modal target
  const [noteTarget, setNoteTarget] = useState<Store | null>(null);
  const [noteText, setNoteText] = useState('');

  // Modals / Action states
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // All products & orders across entire system
  const allProducts = useMemo(() => getStoredProducts(), [allStores]);
  const allOrders = useMemo(() => getStoredOrders(), [allStores]);

  // Platform Metrics
  const totalStoresCount = allStores.length;
  const proStoresCount = allStores.filter((s) => s.tier === 'pro' || s.tier === 'business').length;
  const freeStoresCount = allStores.filter((s) => s.tier === 'free').length;
  const verifiedStoresCount = allStores.filter((s) => s.verified).length;
  const suspendedStoresCount = allStores.filter((s) => s.status === 'suspended').length;
  const totalProductsCount = allProducts.length;
  const totalOrdersCount = allOrders.length;
  const totalPlatformGMV = allOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

  // Filtered stores
  const filteredStores = useMemo(() => {
    return allStores.filter((store) => {
      const matchSearch =
        !storeSearch ||
        store.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
        store.slug.toLowerCase().includes(storeSearch.toLowerCase()) ||
        (store.ownerEmail && store.ownerEmail.toLowerCase().includes(storeSearch.toLowerCase())) ||
        store.location.toLowerCase().includes(storeSearch.toLowerCase());

      const matchTier = tierFilter === 'all' || store.tier === tierFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'verified' && store.verified) ||
        (statusFilter === 'suspended' && store.status === 'suspended');

      return matchSearch && matchTier && matchStatus;
    });
  }, [allStores, storeSearch, tierFilter, statusFilter]);

  // Filtered products across platform
  const filteredProducts = useMemo(() => {
    return allProducts.filter((prod) => {
      const matchSearch =
        !productSearch ||
        prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        prod.uid.toLowerCase().includes(productSearch.toLowerCase()) ||
        prod.category.toLowerCase().includes(productSearch.toLowerCase());

      const matchStore = productStoreFilter === 'all' || prod.storeId === productStoreFilter;

      return matchSearch && matchStore;
    });
  }, [allProducts, productSearch, productStoreFilter]);

  // Toast trigger
  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  // Action handlers
  const handleToggleVerified = (store: Store) => {
    const updated: Store = { ...store, verified: !store.verified };
    updateStore(updated);
    onRefreshData();
    triggerToast(`Store "${store.name}" verification toggled.`);
  };

  const handleToggleSuspended = (store: Store) => {
    const nextStatus = store.status === 'suspended' ? 'active' : 'suspended';
    const updated: Store = { ...store, status: nextStatus };
    updateStore(updated);
    onRefreshData();
    triggerToast(
      nextStatus === 'suspended'
        ? `Store "${store.name}" has been BANNED/SUSPENDED.`
        : `Store "${store.name}" is now REACTIVATED.`
    );
  };

  const handleSetPlan = (store: Store, tier: 'free' | 'starter' | 'pro' | 'business') => {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + 30); // 30 days validity

    const updated: Store = {
      ...store,
      tier,
      verified: tier === 'pro' || tier === 'business',
      planExpiresAt: tier === 'free' ? undefined : expiry.toISOString(),
    };
    updateStore(updated);
    onRefreshData();
    triggerToast(`Store "${store.name}" plan updated to ${tier.toUpperCase()} (30-day timer started).`);
  };

  const handleSendNote = (store: Store) => {
    if (!noteText.trim()) return;
    const existingNotes = store.adminNotes || [];
    const newNoteEntry = `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Admin]: ${noteText.trim()}`;
    const updated: Store = {
      ...store,
      adminNotes: [newNoteEntry, ...existingNotes],
    };
    updateStore(updated);
    onRefreshData();
    setNoteText('');
    setNoteTarget(null);
    triggerToast(`Private note sent to ${store.name}.`);
  };

  const handleDeleteStore = (store: Store) => {
    deleteStoreAndData(store.id);
    setStoreToDelete(null);
    onRefreshData();
    triggerToast(`Store "${store.name}" and associated catalog deleted.`);
  };

  const handleImpersonate = (store: Store) => {
    const sellerSession = impersonateStoreAsSeller(store.id);
    if (sellerSession) {
      onImpersonateStore(sellerSession);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    savePlatformSettings(platformSettings);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  const handleExportDataJSON = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platformSettings,
      stores: allStores,
      products: allProducts,
      orders: allOrders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tashop-master-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetDemoData = () => {
    if (
      window.confirm(
        '⚠️ Are you sure you want to reset all platform data to the initial demo stores and products? Any custom stores will be reloaded from seed data.'
      )
    ) {
      resetPlatformToSeedData();
      onRefreshData();
      triggerToast('Platform successfully reset to initial seed data.');
    }
  };

  // Plan Timer calculator
  const getPlanTimeRemaining = (store: Store): { text: string; isExpired: boolean; badgeColor: string } => {
    if (store.tier === 'free') {
      return { text: 'Free Tier (Unlimited)', isExpired: false, badgeColor: 'bg-slate-100 text-slate-600' };
    }
    
    // Check custom expiry date, or fallback to 30 days from creation
    const expiryDateStr = store.planExpiresAt || store.createdAt;
    const baseDate = new Date(expiryDateStr);
    const expiry = store.planExpiresAt ? new Date(store.planExpiresAt) : new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: '⚠️ Plan Expired', isExpired: true, badgeColor: 'bg-rose-100 text-rose-800 font-black animate-pulse' };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days === 0) {
      return { text: `⏳ ${hours}h left today`, isExpired: false, badgeColor: 'bg-amber-100 text-amber-800 font-bold' };
    }
    return { text: `⏱️ ${days}d ${hours}h left`, isExpired: false, badgeColor: 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200' };
  };

  // Sidebar navigation items
  const adminNavItems: { id: AdminTab; label: string; icon: React.ElementType; badge?: string; badgeColor?: string }[] = [
    {
      id: 'stores',
      label: `Stores (${allStores.length})`,
      icon: Building,
      badge: suspendedStoresCount > 0 ? `${suspendedStoresCount} Banned` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'products', label: `Products (${allProducts.length})`, icon: Package },
    { id: 'orders', label: `Master Orders (${allOrders.length})`, icon: ShoppingBag },
    { id: 'plans', label: 'Plan & Subscriptions', icon: CreditCard, badge: 'Timers', badgeColor: 'bg-amber-400 text-slate-950 font-bold' },
    { id: 'notes', label: 'Private Notes', icon: MessageSquare },
    { id: 'settings', label: 'Platform Config', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 overflow-x-hidden w-full max-w-full font-sans">
      
      {/* Toast Alert */}
      {actionSuccessMessage && (
        <div className="fixed top-4 right-4 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* ── DESKTOP SIDEBAR PANEL (Always Visible on Desktop) ── */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-950 flex-shrink-0 sticky top-0 z-40 border-r border-slate-800 shadow-xl">
        {/* Brand / Root Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">Tá.shop</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                  ROOT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{session.email}</p>
            </div>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {adminNavItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left transition cursor-pointer text-xs font-semibold ${
                  active
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="flex-1 truncate">{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tab.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Shortcuts */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-1.5 bg-slate-950/80">
          <button
            onClick={onOpenLanding}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition text-xs font-medium cursor-pointer"
          >
            <Globe className="w-4 h-4 text-slate-400" />
            <span>Landing Page</span>
          </button>
          <button
            onClick={() => onOpenStorefront(allStores[0]?.slug || '')}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition text-xs font-medium cursor-pointer"
          >
            <Eye className="w-4 h-4 text-slate-400" />
            <span>View First Storefront</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-500/10 transition text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Exit Super Admin</span>
          </button>
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR DRAWER OVERLAY ── */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <aside className="relative w-72 bg-slate-950 h-full flex flex-col shadow-2xl z-10">
            <div className="p-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-white text-sm">Tá.shop Admin</span>
                  <span className="text-[10px] text-amber-300 font-mono block">ROOT</span>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {adminNavItems.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer text-xs font-semibold ${
                      active ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 truncate">{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${tab.badgeColor || 'bg-slate-800'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-slate-800 space-y-1">
              <button onClick={onOpenLanding} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white">
                <Globe className="w-4 h-4" /> Landing Page
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400">
                <LogOut className="w-4 h-4" /> Exit Admin
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Compact Top Navigation Header */}
        <header className="bg-slate-900 text-white border-b border-slate-800 h-14 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">Root Platform Control</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/30 hidden sm:inline">
                  ALL PERMISSIONS
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-slate-400 font-mono hidden lg:inline">{session.email}</span>
            <button
              onClick={onLogout}
              className="text-xs font-semibold text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 pb-28 md:pb-8 overflow-x-hidden">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Stores</span>
                <Building className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalStoresCount}</div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                <span className="text-amber-700 font-bold">{proStoresCount} Paid</span>
                <span>•</span>
                <span className="text-blue-600 font-bold">{verifiedStoresCount} Verified</span>
                {suspendedStoresCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-rose-600 font-bold">{suspendedStoresCount} Banned</span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Catalog Items</span>
                <Package className="w-4 h-4 text-slate-700" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">{totalProductsCount}</div>
              <span className="text-[11px] text-slate-400 font-medium">Across all store databases</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Platform GMV</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">{formatPrice(totalPlatformGMV, '₦')}</div>
              <span className="text-[11px] text-emerald-600 font-medium">From {totalOrdersCount} WhatsApp checkouts</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider">Multi-Tenant Engine</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">100%</div>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live database synced
              </span>
            </div>
          </div>

          {/* ── TAB 1: STORES MANAGEMENT ── */}
          {activeTab === 'stores' && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search stores by name, slug, email, city..."
                    value={storeSearch}
                    onChange={(e) => setStoreSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free Tier</option>
                    <option value="starter">Starter Plan</option>
                    <option value="pro">Pro Plan</option>
                    <option value="business">Business AI Plan</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="verified">Verified Only</option>
                    <option value="suspended">Banned / Suspended Only</option>
                  </select>
                </div>
              </div>

              {/* Stores List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredStores.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">No stores match your search criteria.</div>
                  ) : (
                    filteredStores.map((store) => {
                      const storeProds = getProductsByStore(store.id);
                      const storeOrds = getOrdersByStore(store.id);
                      const isSuspended = store.status === 'suspended';
                      const planTime = getPlanTimeRemaining(store);

                      return (
                        <div
                          key={store.id}
                          className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition hover:bg-slate-50/70 ${
                            isSuspended ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : ''
                          }`}
                        >
                          {/* Store Info */}
                          <div className="flex items-start gap-3.5">
                            <img
                              src={store.logoUrl}
                              alt={store.name}
                              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100"
                            />
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-sm leading-tight">{store.name}</h4>
                                {store.verified && (
                                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <BadgeCheck className="w-3 h-3 text-blue-500" />
                                    Verified
                                  </span>
                                )}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                    store.tier === 'business'
                                      ? 'bg-violet-100 text-violet-800'
                                      : store.tier === 'pro'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {store.tier}
                                </span>
                                {isSuspended ? (
                                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase animate-pulse">
                                    🚫 BANNED
                                  </span>
                                ) : (
                                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    ● Active
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                                <span className="font-mono text-slate-700 font-semibold">{store.slug}.ta.shop</span>
                                <span>•</span>
                                <span>{store.ownerEmail || 'No email registered'}</span>
                                <span>•</span>
                                <span>WA: {store.whatsappCountryCode} {store.whatsappNumber}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {store.location || 'Nigeria'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                                <span><strong>{storeProds.length}</strong> products</span>
                                <span>•</span>
                                <span><strong>{storeOrds.length}</strong> orders</span>
                                <span>•</span>
                                <span className={`px-2 py-0.5 rounded-md ${planTime.badgeColor}`}>
                                  {planTime.text}
                                </span>
                                {store.adminNotes && store.adminNotes.length > 0 && (
                                  <span className="text-indigo-600 font-semibold">
                                    📝 {store.adminNotes.length} Note{store.adminNotes.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Super Admin Control Actions */}
                          <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-center shrink-0">
                            {/* Send Private Note */}
                            <button
                              onClick={() => {
                                setNoteTarget(store);
                                setNoteText('');
                              }}
                              className="p-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                              title="Send Private Admin Note"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">Note</span>
                            </button>

                            {/* Verify Toggle */}
                            <button
                              onClick={() => handleToggleVerified(store)}
                              className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                store.verified
                                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                              }`}
                              title={store.verified ? 'Revoke Verified Blue Tick' : 'Grant Verified Blue Tick'}
                            >
                              <BadgeCheck className="w-3.5 h-3.5" />
                              <span className="text-[11px] hidden sm:inline">{store.verified ? 'Verified' : 'Verify'}</span>
                            </button>

                            {/* Impersonate Seller */}
                            <button
                              onClick={() => handleImpersonate(store)}
                              className="p-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                              title="Login As This Merchant into Seller Dashboard"
                            >
                              <LogIn className="w-3.5 h-3.5 text-amber-400" />
                              <span className="text-[11px]">Login As</span>
                            </button>

                            {/* View Customer Storefront */}
                            <button
                              onClick={() => onOpenStorefront(store.slug)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                              title="Open Public Storefront"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>

                            {/* BAN / SUSPEND BUTTON */}
                            <button
                              onClick={() => handleToggleSuspended(store)}
                              className={`p-2 px-2.5 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                                isSuspended
                                  ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white'
                              }`}
                              title={isSuspended ? 'Unban Store' : 'Ban / Suspend Store from public'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span className="text-[11px]">{isSuspended ? 'Unban' : 'Ban Store'}</span>
                            </button>

                            {/* Delete Permanently */}
                            <button
                              onClick={() => setStoreToDelete(store)}
                              className="p-2 rounded-xl border border-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-400 transition cursor-pointer"
                              title="Delete Store Permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: PRODUCTS AUDIT ── */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products across all stores by title, UID, or category..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <select
                  value={productStoreFilter}
                  onChange={(e) => setProductStoreFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none"
                >
                  <option value="all">All Stores ({allStores.length})</option>
                  {allStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">No products match your search.</div>
                  ) : (
                    filteredProducts.map((p) => {
                      const store = allStores.find((s) => s.id === p.storeId);
                      return (
                        <div key={p.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</span>
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  #{p.uid}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                <strong>{store?.name}</strong> • {p.category} •{' '}
                                <span className="font-mono font-bold text-slate-900">
                                  {formatPrice(p.price, store?.currencySymbol || '₦')}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                p.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {p.inStock ? 'In Stock' : 'Sold Out'}
                            </span>
                            {store && (
                              <button
                                onClick={() => onOpenStorefront(store.slug)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: MASTER ORDERS LEDGER ── */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Master Platform Transactions</h3>
                    <p className="text-xs text-slate-500">Live order audit stream from all store checkouts</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Network Volume</span>
                    <span className="text-xl font-black font-mono text-slate-900">{formatPrice(totalPlatformGMV, '₦')}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {allOrders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">No orders recorded yet.</div>
                  ) : (
                    allOrders.map((ord) => {
                      const store = allStores.find((s) => s.id === ord.storeId);
                      return (
                        <div key={ord.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                              <span className="font-semibold text-slate-800">
                                {ord.buyerName} ({ord.buyerPhone})
                              </span>
                              <span className="text-[10px] text-slate-400">
                                → <strong>{store?.name || ord.storeId}</strong>
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {ord.items.length} item(s): {ord.items.map((i) => i.productName).join(', ')}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {formatPrice(ord.totalAmount, ord.currencySymbol || '₦')}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                ord.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : ord.status === 'confirmed'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: PLAN & SUBSCRIPTIONS MANAGER (With Expiry Timer) ── */}
          {activeTab === 'plans' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-500" />
                      <span>Subscription & Plan Manager</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Manage each merchant's subscription tier, override permissions, and monitor remaining plan countdown timers.
                    </p>
                  </div>
                  <div className="text-xs font-semibold text-slate-500">
                    Total Stores: <span className="font-bold text-slate-900">{allStores.length}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {allStores.map((store) => {
                    const planTime = getPlanTimeRemaining(store);
                    return (
                      <div key={store.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm truncate">{store.name}</span>
                              <span className="font-mono text-xs text-slate-400">({store.slug}.ta.shop)</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${planTime.badgeColor}`}>
                                {planTime.text}
                              </span>
                              {store.tier !== 'free' && (
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {store.planExpiresAt
                                    ? `Expires: ${new Date(store.planExpiresAt).toLocaleDateString()}`
                                    : '30-day billing cycle'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Plan Switcher Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-slate-500 mr-1">Switch:</span>
                          {(['free', 'starter', 'pro', 'business'] as const).map((tierOption) => {
                            const isCurrent = store.tier === tierOption;
                            return (
                              <button
                                key={tierOption}
                                onClick={() => handleSetPlan(store, tierOption)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                                  isCurrent
                                    ? tierOption === 'business'
                                      ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                                      : tierOption === 'pro'
                                      ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                                      : 'bg-slate-900 border-slate-900 text-white shadow-xs'
                                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                                }`}
                              >
                                {tierOption === 'business'
                                  ? '🤖 Business AI'
                                  : tierOption === 'pro'
                                  ? '⚡ Pro'
                                  : tierOption === 'starter'
                                  ? 'Starter'
                                  : 'Free'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: PRIVATE NOTES LOG & MESSAGING ── */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    <span>Private Admin Notes to Store Owners</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Send confidential advisories, warnings, or support notes directly into any store's record.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {allStores.map((store) => {
                    const notes = store.adminNotes || [];
                    return (
                      <div key={store.id} className="py-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={store.logoUrl}
                              alt={store.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{store.name}</span>
                                <span className="text-xs text-slate-400">({store.ownerEmail || 'No email'})</span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                {notes.length === 0 ? 'No notes sent yet' : `${notes.length} saved message(s)`}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setNoteTarget(store);
                              setNoteText('');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Write Note</span>
                          </button>
                        </div>

                        {/* Note history list */}
                        {notes.length > 0 && (
                          <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 border border-slate-200/70">
                            {notes.map((nt, idx) => (
                              <div key={idx} className="text-xs text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs font-mono">
                                {nt}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 6: PLATFORM CONFIGURATION & DANGER ZONE ── */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Website & Platform Identity</h3>
                    <p className="text-xs text-slate-500">Global platform branding, contact details, and subscription tiers</p>
                  </div>

                  {settingsSavedToast && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Platform configuration updated successfully!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Platform Brand Name</label>
                      <input
                        type="text"
                        value={platformSettings.platformName}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, platformName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Platform Support WhatsApp</label>
                      <input
                        type="text"
                        value={platformSettings.supportWhatsApp}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, supportWhatsApp: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  {/* Pricing Tiers */}
                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Subscription Pricing Defaults</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Starter Plan Monthly (₦)</label>
                        <input
                          type="number"
                          value={platformSettings.starterPriceMonthly}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, starterPriceMonthly: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">Pro Plan Monthly (₦)</label>
                        <input
                          type="number"
                          value={platformSettings.proPriceMonthly}
                          onChange={(e) => setPlatformSettings({ ...platformSettings, proPriceMonthly: Number(e.target.value) })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Global Announcement */}
                  <div className="pt-3 border-t border-slate-100">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Global Platform Announcement</label>
                    <textarea
                      rows={2}
                      value={platformSettings.globalAnnouncement}
                      onChange={(e) => setPlatformSettings({ ...platformSettings, globalAnnouncement: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none"
                    />
                  </div>

                  {/* Platform Switches */}
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-xs text-slate-900 block">Allow Public Registrations</span>
                        <span className="text-[11px] text-slate-500">Let merchants create stores via landing page</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformSettings.allowRegistrations}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, allowRegistrations: e.target.checked })}
                        className="rounded text-slate-900 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                      <div>
                        <span className="font-semibold text-xs text-slate-900 block">Maintenance Mode</span>
                        <span className="text-[11px] text-slate-500">Temporarily display a maintenance notice for visitors</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={platformSettings.maintenanceMode}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                        className="rounded text-slate-900 cursor-pointer"
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer shadow-md"
                    >
                      Save Platform Configuration
                    </button>
                  </div>
                </form>
              </div>

              {/* Data & Backup */}
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Platform Data & Backup</h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Export complete database backup containing all registered stores, product catalogs, and order transactions.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportDataJSON}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-indigo-200"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span>Export System JSON Backup</span>
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="bg-rose-50/60 p-6 rounded-2xl border border-rose-200 shadow-2xs space-y-3">
                  <div className="flex items-center gap-2 text-rose-900">
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                    <h3 className="font-bold text-sm">Platform Danger Zone</h3>
                  </div>
                  <p className="text-xs text-rose-700">
                    Reset the platform database back to the default demo stores.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetDemoData}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset to Seed Demo Stores</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── MOBILE NOTCHED BOTTOM NAV BAR ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950 border-t border-slate-800 h-16 flex items-end"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex w-full items-center h-16 relative">
          {/* Left 2 Items: Stores & Products */}
          {(['stores', 'products'] as AdminTab[]).map((tabId) => {
            const tab = adminNavItems.find((t) => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer relative"
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                  {tabId === 'stores' ? 'Stores' : 'Products'}
                </span>
                {tab.badge && tabId === 'stores' && suspendedStoresCount > 0 && (
                  <span className="absolute top-1 right-3 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </button>
            );
          })}

          {/* CENTER NOTCH FAB (Plan & Subscriptions Timer Button) */}
          <div className="flex-1 flex justify-center items-end pb-1 relative">
            <button
              onClick={() => setActiveTab('plans')}
              className={`absolute -top-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition cursor-pointer border-4 border-slate-900 active:scale-95 ${
                activeTab === 'plans' ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300' : 'bg-slate-800 text-amber-400 hover:bg-slate-700'
              }`}
              title="Plan & Subscriptions Manager"
            >
              <CreditCard className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>

          {/* Right 2 Items: Private Notes & Settings */}
          {(['notes', 'settings'] as AdminTab[]).map((tabId) => {
            const tab = adminNavItems.find((t) => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer"
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                  {tabId === 'notes' ? 'Notes' : 'Config'}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── PRIVATE NOTE MODAL ── */}
      {noteTarget && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  <span>Send Private Note</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Recipient: <strong>{noteTarget.name}</strong> ({noteTarget.ownerEmail || 'Store Owner'})
                </p>
              </div>
              <button onClick={() => setNoteTarget(null)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`Write private message or advisory for ${noteTarget.name}...`}
              className="w-full px-4 py-3 text-xs sm:text-sm border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 resize-none"
            />

            <div className="flex gap-2.5">
              <button
                onClick={() => setNoteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendNote(noteTarget)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE STORE CONFIRMATION MODAL ── */}
      {storeToDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Delete Store Permanently?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete <strong>{storeToDelete.name}</strong> (`{storeToDelete.slug}.ta.shop`)? All catalog items and recorded orders will be erased.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStore(storeToDelete)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
