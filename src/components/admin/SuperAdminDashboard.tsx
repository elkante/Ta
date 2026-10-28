import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
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
  MessageCircle,
  Package,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<'stores' | 'products' | 'orders' | 'settings'>('stores');

  // Search & Filter state for Stores
  const [storeSearch, setStoreSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'suspended'>('all');

  // Search state for Products
  const [productSearch, setProductSearch] = useState('');
  const [productStoreFilter, setProductStoreFilter] = useState<string>('all');

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Modals / Action states
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // All products & orders across entire system
  const allProducts = useMemo(() => getStoredProducts(), [allStores]);
  const allOrders = useMemo(() => getStoredOrders(), [allStores]);

  // Platform Metrics
  const totalStoresCount = allStores.length;
  const proStoresCount = allStores.filter((s) => s.tier === 'pro').length;
  const freeStoresCount = allStores.filter((s) => s.tier === 'free').length;
  const verifiedStoresCount = allStores.filter((s) => s.verified).length;
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

  // Action handlers
  const handleToggleVerified = (store: Store) => {
    const updated: Store = { ...store, verified: !store.verified };
    updateStore(updated);
    onRefreshData();
    triggerToast(`Store "${store.name}" verification status updated.`);
  };

  const handleToggleTier = (store: Store) => {
    const nextTier = store.tier === 'pro' ? 'free' : 'pro';
    const updated: Store = { ...store, tier: nextTier };
    updateStore(updated);
    onRefreshData();
    triggerToast(`Store "${store.name}" tier switched to ${nextTier.toUpperCase()}.`);
  };

  const handleToggleSuspended = (store: Store) => {
    const nextStatus = store.status === 'suspended' ? 'active' : 'suspended';
    const updated: Store = { ...store, status: nextStatus };
    updateStore(updated);
    onRefreshData();
    triggerToast(
      nextStatus === 'suspended'
        ? `Store "${store.name}" suspended from public view.`
        : `Store "${store.name}" reactivated.`
    );
  };

  const handleImpersonate = (store: Store) => {
    const sellerSession = impersonateStoreAsSeller(store.id);
    if (sellerSession) {
      onImpersonateStore(sellerSession);
    }
  };

  const handleDeleteStore = (store: Store) => {
    deleteStoreAndData(store.id);
    setStoreToDelete(null);
    onRefreshData();
    triggerToast(`Store "${store.name}" and associated catalog deleted.`);
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

  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden w-full max-w-full">
      {/* Toast Alert */}
      {actionSuccessMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Top Admin Navigation Header */}
      <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Tá.shop</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                  SUPER ADMIN
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5 font-mono">
                Platform Root Management • {session.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenLanding}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 hidden md:flex"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>Landing Page</span>
            </button>

            <button
              onClick={() => onOpenStorefront(allStores[0]?.slug || 'amaka-perfumes')}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 hidden sm:flex"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>View Storefront</span>
            </button>

            <button
              onClick={onLogout}
              className="text-xs font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 px-3.5 py-1.5 rounded-xl border border-rose-500/30 transition cursor-pointer flex items-center gap-1.5"
              title="Log out from Super Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Exit Admin</span>
            </button>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 text-xs font-semibold overflow-x-auto scrollbar-none border-t border-slate-800/80">
          {[
            { id: 'stores', label: `Tenants & Stores (${allStores.length})`, icon: Building },
            { id: 'products', label: `Platform Products (${allProducts.length})`, icon: Package },
            { id: 'orders', label: `Master Orders (${allOrders.length})`, icon: ShoppingBag },
            { id: 'settings', label: 'Website & Config', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-amber-400 text-amber-300 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Stores</span>
              <Building className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {totalStoresCount}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
              <span className="text-amber-700 font-bold">{proStoresCount} Pro</span>
              <span>•</span>
              <span>{freeStoresCount} Free</span>
              <span>•</span>
              <span className="text-blue-600">{verifiedStoresCount} Verified</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Catalog Items</span>
              <Package className="w-4 h-4 text-slate-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
              {totalProductsCount}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Across all {totalStoresCount} merchant catalogs
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Platform GMV</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
              {formatPrice(totalPlatformGMV, '₦')}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              From {totalOrdersCount} WhatsApp checkouts
            </span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Network Health</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
              100%
            </div>
            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Multi-tenant engine operational
            </span>
          </div>
        </div>

        {/* TAB 1: STORES MANAGEMENT */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
            {/* Search and Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search stores by name, slug, email, or city..."
                  value={storeSearch}
                  onChange={(e) => setStoreSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Tier Filter */}
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="all">All Tiers</option>
                  <option value="free">Free Tier</option>
                  <option value="pro">Pro Tier</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="verified">Verified Sellers Only</option>
                  <option value="suspended">Suspended Only</option>
                </select>
              </div>
            </div>

            {/* Stores List Table / Cards */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="divide-y divide-slate-100">
                {filteredStores.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No stores match your search criteria.
                  </div>
                ) : (
                  filteredStores.map((store) => {
                    const storeProds = getProductsByStore(store.id);
                    const storeOrds = getOrdersByStore(store.id);
                    const isSuspended = store.status === 'suspended';

                    return (
                      <div
                        key={store.id}
                        className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:bg-slate-50/70 ${
                          isSuspended ? 'bg-rose-50/40 opacity-75' : ''
                        }`}
                      >
                        {/* Store Info */}
                        <div className="flex items-start sm:items-center gap-3.5">
                          <img
                            src={store.logoUrl}
                            alt={store.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm leading-tight">
                                {store.name}
                              </h4>
                              {store.verified && (
                                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <BadgeCheck className="w-3 h-3 text-blue-500" />
                                  Verified
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  store.tier === 'pro'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {store.tier}
                              </span>
                              {isSuspended && (
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                  Suspended
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                              <span className="font-mono text-slate-700 font-semibold">
                                {store.slug}.ta.shop
                              </span>
                              <span>•</span>
                              <span>{store.ownerEmail || 'No email'}</span>
                              <span>•</span>
                              <span>WhatsApp: {store.whatsappCountryCode} {store.whatsappNumber}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {store.location}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                              <span><strong>{storeProds.length}</strong> items in catalog</span>
                              <span>•</span>
                              <span><strong>{storeOrds.length}</strong> WhatsApp orders</span>
                              <span>•</span>
                              <span>Joined: {new Date(store.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Store Super Admin Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 self-end md:self-center shrink-0">
                          {/* Toggle Verified */}
                          <button
                            onClick={() => handleToggleVerified(store)}
                            className={`p-2 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                              store.verified
                                ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                            title={store.verified ? 'Revoke Verified Badge' : 'Grant Verified Badge'}
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden sm:inline">
                              {store.verified ? 'Verified' : 'Verify'}
                            </span>
                          </button>

                          {/* Toggle Tier */}
                          <button
                            onClick={() => handleToggleTier(store)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                            title={`Switch tier to ${store.tier === 'pro' ? 'Free' : 'Pro'}`}
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-[11px]">
                              {store.tier === 'pro' ? 'Make Free' : 'Upgrade Pro'}
                            </span>
                          </button>

                          {/* Login As Seller (Impersonation) */}
                          <button
                            onClick={() => handleImpersonate(store)}
                            className="p-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            title="Open Seller Dashboard as this merchant"
                          >
                            <LogIn className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px]">Login As</span>
                          </button>

                          {/* Open Storefront */}
                          <button
                            onClick={() => onOpenStorefront(store.slug)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                            title="Open Customer Storefront"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Suspend */}
                          <button
                            onClick={() => handleToggleSuspended(store)}
                            className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                : 'border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-500'
                            }`}
                            title={isSuspended ? 'Reactivate Store' : 'Suspend Store'}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Store */}
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

        {/* TAB 2: PLATFORM PRODUCTS AUDIT */}
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
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                />
              </div>

              <select
                value={productStoreFilter}
                onChange={(e) => setProductStoreFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
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
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No products match your search.
                  </div>
                ) : (
                  filteredProducts.map((p) => {
                    const store = allStores.find((s) => s.id === p.storeId);
                    return (
                      <div
                        key={p.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200 bg-slate-100"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {p.name}
                              </span>
                              <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                #{p.uid}
                              </span>
                              {p.badge && (
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span>Store: <strong>{store?.name || 'Unknown'}</strong></span>
                              <span>•</span>
                              <span>Category: {p.category}</span>
                              <span>•</span>
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
                              title="View on Storefront"
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

        {/* TAB 3: MASTER ORDERS LEDGER */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Master Platform Orders</h3>
                  <p className="text-xs text-slate-500">
                    Real-time transaction flow across all registered social storefronts
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Network Volume</span>
                  <span className="text-xl font-black font-mono text-slate-900">
                    {formatPrice(totalPlatformGMV, '₦')}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {allOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No orders have been recorded yet.
                  </div>
                ) : (
                  allOrders.map((ord) => {
                    const store = allStores.find((s) => s.id === ord.storeId);
                    return (
                      <div
                        key={ord.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">
                              #{ord.id}
                            </span>
                            <span className="font-semibold text-slate-800">
                              {ord.buyerName} ({ord.buyerPhone})
                            </span>
                            <span className="text-[10px] text-slate-400">
                              for <strong>{store?.name || ord.storeId}</strong>
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

        {/* TAB 4: WEBSITE & PLATFORM CONFIGURATION */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* General Platform Config */}
              <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Website & Platform Identity</h3>
                  <p className="text-xs text-slate-500">
                    Global platform branding, contact details, and default subscription fees
                  </p>
                </div>

                {settingsSavedToast && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Platform settings updated successfully!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Platform Brand Name
                    </label>
                    <input
                      type="text"
                      value={platformSettings.platformName}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, platformName: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Platform Support WhatsApp
                    </label>
                    <input
                      type="text"
                      value={platformSettings.supportWhatsApp}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, supportWhatsApp: e.target.value })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Subscription Fees Config */}
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Subscription Pricing Tiers
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Starter Plan (Monthly ₦)
                      </label>
                      <input
                        type="number"
                        value={platformSettings.starterPriceMonthly}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            starterPriceMonthly: Number(e.target.value),
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Pro Plan (Monthly ₦)
                      </label>
                      <input
                        type="number"
                        value={platformSettings.proPriceMonthly}
                        onChange={(e) =>
                          setPlatformSettings({
                            ...platformSettings,
                            proPriceMonthly: Number(e.target.value),
                          })
                        }
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Global Announcement */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Global Platform Announcement
                  </label>
                  <textarea
                    rows={2}
                    value={platformSettings.globalAnnouncement}
                    onChange={(e) =>
                      setPlatformSettings({ ...platformSettings, globalAnnouncement: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                </div>

                {/* Platform Switches */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">
                        Allow Public Merchant Registrations
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Allow sellers to create new stores via the landing page
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={platformSettings.allowRegistrations}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, allowRegistrations: e.target.checked })
                      }
                      className="rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                    <div>
                      <span className="font-semibold text-xs text-slate-900 block">
                        Maintenance Mode
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Temporarily display a maintenance notice for customers
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={platformSettings.maintenanceMode}
                      onChange={(e) =>
                        setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })
                      }
                      className="rounded text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-md"
                  >
                    Save Platform Configuration
                  </button>
                </div>
              </form>
            </div>

            {/* Platform Data Backup & Recovery */}
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
                  Reset the platform database back to the default demo stores (Amaka Perfumes, Zainab Couture, Gadget Plug).
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

      {/* Delete Store Confirmation Modal */}
      {storeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200">
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
