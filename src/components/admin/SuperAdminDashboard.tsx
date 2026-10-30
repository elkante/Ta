import React, { useEffect, useMemo, useState } from 'react';
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
  FileText,
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
  Star,
  Timer,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  X,
  Zap,
  ZoomIn,
} from 'lucide-react';
import confetti from 'canvas-confetti';
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
  saveProducts,
  saveOrders,
  saveStores,
  updateStore,
  getRootDomain,
  getPlatformBrandName,
} from '../../utils/storage';
import { formatPrice } from '../../utils/whatsapp';
import { getStoreAIUsage } from '../../utils/aiMarketing';
import { dbSaveStore, dbDeleteStore, dbSaveProduct, dbFetchAllProducts, dbFetchAllOrders, dbFetchStores } from '../../utils/supabase';

interface SuperAdminDashboardProps {
  session: SuperAdminSession;
  allStores: Store[];
  onLogout: () => void;
  onRefreshData?: () => void;
  onSelectStore?: (store: Store) => void;
  onOpenStorefront?: (slug: string) => void;
  onImpersonateStore?: (session: SellerSession) => void;
  onOpenLanding?: () => void;
}

type AdminTab = 'stores' | 'products' | 'orders' | 'verifications' | 'plans' | 'notes' | 'settings';

const ID_TYPE_LABELS: Record<string, string> = {
  nin: 'NIN (National Identification Number)',
  drivers_license: "Driver's License",
  passport: 'International Passport',
  voters_card: "Voter's Card (PVC)",
  national_id: 'Other National ID',
};

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  session,
  allStores,
  onLogout,
  onRefreshData = () => {},
  onSelectStore = () => {},
  onOpenStorefront = () => {},
  onImpersonateStore = () => {},
  onOpenLanding = () => {},
}) => {
  const [activeTab, setActiveTabState] = useState<AdminTab>(() => {
    try {
      const url = new URL(window.location.href);
      const urlTab = url.searchParams.get('tab') as AdminTab;
      if (urlTab && ['stores', 'products', 'orders', 'verifications', 'plans', 'notes', 'settings'].includes(urlTab)) {
        return urlTab;
      }
      const saved = sessionStorage.getItem('ta_superadmin_active_tab') as AdminTab;
      if (saved && ['stores', 'products', 'orders', 'verifications', 'plans', 'notes', 'settings'].includes(saved)) {
        return saved;
      }
    } catch (e) {}
    return 'stores';
  });

  const setActiveTab = (tab: AdminTab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem('ta_superadmin_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  // Mobile sidebar drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Search & Filter state for Stores
  const [storeSearch, setStoreSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'starter' | 'pro' | 'business'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'featured' | 'suspended'>('all');

  // KYC ID Verification Queue state
  const [idVerificationFilter, setIdVerificationFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; title: string } | null>(null);
  const [rejectModalStore, setRejectModalStore] = useState<Store | null>(null);
  const [rejectReason, setRejectReason] = useState('ID photo is unclear or blurred. Please upload a clear photo.');

  // Search state for Products
  const [productSearch, setProductSearch] = useState('');
  const [productStoreFilter, setProductStoreFilter] = useState<string>('all');
  const [productApprovalFilter, setProductApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectProductModal, setRejectProductModal] = useState<Product | null>(null);
  const [rejectProductReason, setRejectProductReason] = useState('');

  // Plan override modal state
  const [planOverrideStore, setPlanOverrideStore] = useState<Store | null>(null);
  const [planOverrideTier, setPlanOverrideTier] = useState<'free' | 'starter' | 'pro' | 'business'>('starter');
  const [planOverrideDays, setPlanOverrideDays] = useState('30');
  const [planOverrideNote, setPlanOverrideNote] = useState('');

  // Platform Settings State
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>(getPlatformSettings());
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);

  // Private note composer modal target
  const [noteTarget, setNoteTarget] = useState<Store | null>(null);
  const [noteText, setNoteText] = useState('');

  // Custom Domain management state
  const [domainModalStore, setDomainModalStore] = useState<Store | null>(null);
  const [domainInput, setDomainInput] = useState('');
  const [isSavingDomain, setIsSavingDomain] = useState(false);

  // Modals / Action states
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [isRefreshingStores, setIsRefreshingStores] = useState(false);

  // Live stores - self-fetched from Supabase on mount (not relying on prop from parent)
  const [liveStores, setLiveStores] = useState<Store[]>(allStores);

  useEffect(() => {
    let mounted = true;
    async function fetchAllStoresFromDB() {
      try {
        const stores = await dbFetchStores();
        if (mounted && stores && stores.length > 0) {
          setLiveStores(stores);
          saveStores(stores); // refresh localStorage with complete store list
        }
      } catch (err) {
        console.warn('SuperAdmin: failed to fetch all stores from Supabase:', err);
      }
    }
    fetchAllStoresFromDB();
    return () => { mounted = false; };
  }, []);

  // Sync when parent allStores prop updates (e.g. after onRefreshData)
  useEffect(() => {
    if (allStores.length > liveStores.length) {
      setLiveStores(allStores);
    }
  }, [allStores]);

  // Live products & orders across entire system from Supabase cloud database
  const [liveProducts, setLiveProducts] = useState<Product[]>(() => getStoredProducts());
  const [liveOrders, setLiveOrders] = useState<StoreOrder[]>(() => getStoredOrders());

  useEffect(() => {
    let mounted = true;
    async function syncCloudCatalog() {
      try {
        const [cloudProducts, cloudOrders] = await Promise.all([
          dbFetchAllProducts(),
          dbFetchAllOrders(),
        ]);
        if (mounted) {
          if (cloudProducts && cloudProducts.length > 0) {
            setLiveProducts(cloudProducts);
            saveProducts(cloudProducts);
          }
          if (cloudOrders && cloudOrders.length > 0) {
            setLiveOrders(cloudOrders);
            saveOrders(cloudOrders);
          }
        }
      } catch (err) {
        console.warn('SuperAdmin live catalog sync error:', err);
      }
    }
    syncCloudCatalog();
    return () => { mounted = false; };
  }, [liveStores]);

  const allProducts = liveProducts;
  const allOrders = liveOrders;

  // Platform Metrics
  const totalStoresCount = liveStores.length;
  const proStoresCount = liveStores.filter((s) => s.tier === 'pro' || s.tier === 'business').length;
  const freeStoresCount = liveStores.filter((s) => s.tier === 'free').length;
  const verifiedStoresCount = liveStores.filter((s) => s.verified).length;
  const suspendedStoresCount = liveStores.filter((s) => s.status === 'suspended').length;
  const pendingVerificationsCount = liveStores.filter((s) => s.idVerification?.status === 'pending').length;
  const totalVerificationsCount = liveStores.filter((s) => s.idVerification).length;
  const totalProductsCount = allProducts.length;
  const pendingProductsCount = allProducts.filter((p) => p.approvalStatus === 'pending').length;
  const totalOrdersCount = allOrders.length;
  const totalPlatformGMV = allOrders.reduce((sum, ord) => sum + (ord.totalAmount || 0), 0);

  // Filtered stores
  const filteredStores = useMemo(() => {
    return liveStores.filter((store) => {
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
        (statusFilter === 'featured' && store.featuredOnLanding) ||
        (statusFilter === 'suspended' && store.status === 'suspended');

      return matchSearch && matchTier && matchStatus;
    });
  }, [liveStores, storeSearch, tierFilter, statusFilter]);

  // Filtered products across platform
  const filteredProducts = useMemo(() => {
    return allProducts.filter((prod) => {
      const matchSearch =
        !productSearch ||
        prod.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        prod.uid.toLowerCase().includes(productSearch.toLowerCase()) ||
        prod.category.toLowerCase().includes(productSearch.toLowerCase());

      const matchStore = productStoreFilter === 'all' || prod.storeId === productStoreFilter;

      const matchApproval =
        productApprovalFilter === 'all' ||
        (productApprovalFilter === 'pending' && (!prod.approvalStatus || prod.approvalStatus === 'pending')) ||
        (productApprovalFilter === 'approved' && prod.approvalStatus === 'approved') ||
        (productApprovalFilter === 'rejected' && prod.approvalStatus === 'rejected');

      return matchSearch && matchStore && matchApproval;
    });
  }, [allProducts, productSearch, productStoreFilter, productApprovalFilter]);

  // Toast trigger
  const triggerToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  // ── Unified store save: localStorage + Supabase + local liveStores state ──────
  const saveStoreEverywhere = async (updated: Store) => {
    // 1. Optimistic UI update — immediately reflect in liveStores so no flicker/revert
    setLiveStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    // 2. Persist to localStorage (update within the full list)
    const currentStores = liveStores.map((s) => (s.id === updated.id ? updated : s));
    saveStores(currentStores);
    // 3. Persist to Supabase
    try {
      await dbSaveStore(updated);
    } catch (e) {
      console.warn('Supabase store save error:', e);
    }
    // 4. Tell parent to refresh (background sync, won't override liveStores unless more stores found)
    onRefreshData();
  };

  const handleManualRefreshStores = async () => {
    setIsRefreshingStores(true);
    try {
      const stores = await dbFetchStores();
      if (stores && stores.length > 0) {
        setLiveStores(stores);
        saveStores(stores);
        triggerToast(`Synced ${stores.length} store(s) from Supabase.`);
      } else {
        triggerToast('No stores returned from Supabase.');
      }
      onRefreshData();
    } catch (e) {
      console.warn('Manual store refresh error:', e);
      triggerToast('Failed to refresh stores from database.');
    } finally {
      setIsRefreshingStores(false);
    }
  };

  // Action handlers
  const handleToggleVerified = async (store: Store) => {
    const updated: Store = { ...store, verified: !store.verified };
    await saveStoreEverywhere(updated);
    triggerToast(`Store "${store.name}" verification toggled.`);
  };

  const handleToggleFeaturedOnLanding = async (store: Store) => {
    const nextVal = !store.featuredOnLanding;
    const updated: Store = { ...store, featuredOnLanding: nextVal };
    await saveStoreEverywhere(updated);
    triggerToast(
      nextVal
        ? `🌟 "${store.name}" added to Landing Page Live Storefronts!`
        : `"${store.name}" removed from Landing Page showcase.`
    );
  };

  const handleResetStoreAIUsage = async (store: Store) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const updated: Store = {
      ...store,
      aiDailyUsage: {
        date: todayStr,
        count: 0,
        customCap: store.aiDailyUsage?.customCap,
      },
    };
    await saveStoreEverywhere(updated);
    triggerToast(`AI Studio quota for "${store.name}" reset to 0 used today.`);
  };

  const handleOpenDomainModal = (store: Store) => {
    setDomainModalStore(store);
    setDomainInput(store.customDomain || '');
  };

  const handleSaveCustomDomain = async (store: Store, domainValue: string) => {
    setIsSavingDomain(true);
    const clean = domainValue.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const updated: Store = { ...store, customDomain: clean || undefined };
    await saveStoreEverywhere(updated);
    setIsSavingDomain(false);
    setDomainModalStore(null);
    triggerToast(clean ? `🌐 Custom domain "${clean}" linked to "${store.name}"!` : `Custom domain removed from "${store.name}".`);
  };

  const handleToggleSuspended = async (store: Store) => {
    const nextStatus = store.status === 'suspended' ? 'active' : 'suspended';
    const updated: Store = { ...store, status: nextStatus };
    await saveStoreEverywhere(updated);
    triggerToast(
      nextStatus === 'suspended'
        ? `Store "${store.name}" has been BANNED/SUSPENDED.`
        : `Store "${store.name}" is now REACTIVATED.`
    );
  };

  const handleSetPlan = async (store: Store, tier: 'free' | 'starter' | 'pro' | 'business', daysOverride?: number) => {
    const now = new Date();
    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() + (daysOverride ?? 30));

    const updated: Store = {
      ...store,
      tier,
      verified: tier === 'pro' || tier === 'business' ? true : store.verified,
      planExpiresAt: tier === 'free' ? undefined : expiry.toISOString(),
    };
    await saveStoreEverywhere(updated);
    triggerToast(`"${store.name}" → ${tier.toUpperCase()} plan for ${daysOverride ?? 30} day(s).`);
    setPlanOverrideStore(null);
    setPlanOverrideNote('');
  };

  // Product approval handlers
  const handleApproveProduct = async (product: Product) => {
    const updated: Product = { ...product, approvalStatus: 'approved', approvalRejectionReason: undefined };
    // Update local state immediately so UI reflects change without waiting
    setLiveProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    // Persist to localStorage
    const allProds = getStoredProducts();
    saveProducts(allProds.map((p) => (p.id === product.id ? updated : p)));
    // Persist to Supabase (approval stored in attributes JSONB via mapProductToDB)
    try {
      const ok = await dbSaveProduct(updated);
      if (!ok) console.warn('dbSaveProduct returned false for approval');
    } catch (err) {
      console.warn('Failed to save product approval to Supabase:', err);
    }
    onRefreshData();
    triggerToast(`✓ "${product.name}" approved — live on storefront.`);
  };

  const handleRejectProduct = async (product: Product, reason: string) => {
    const updated: Product = { ...product, approvalStatus: 'rejected', approvalRejectionReason: reason };
    // Update local state immediately so UI reflects change without waiting
    setLiveProducts((prev) => prev.map((p) => (p.id === product.id ? updated : p)));
    // Persist to localStorage
    const allProds = getStoredProducts();
    saveProducts(allProds.map((p) => (p.id === product.id ? updated : p)));
    // Persist to Supabase
    try {
      const ok = await dbSaveProduct(updated);
      if (!ok) console.warn('dbSaveProduct returned false for rejection');
    } catch (err) {
      console.warn('Failed to save product rejection to Supabase:', err);
    }
    onRefreshData();
    triggerToast(`"${product.name}" rejected.`);
    setRejectProductModal(null);
    setRejectProductReason('');
  };

  const handleSendNote = async (store: Store) => {
    if (!noteText.trim()) return;
    const existingNotes = store.adminNotes || [];
    const newNoteEntry = `[${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Admin]: ${noteText.trim()}`;
    const updated: Store = {
      ...store,
      adminNotes: [newNoteEntry, ...existingNotes],
    };
    await saveStoreEverywhere(updated);
    setNoteText('');
    setNoteTarget(null);
    triggerToast(`Private note sent to ${store.name}.`);
  };

  const handleApproveId = async (store: Store) => {
    if (!store.idVerification) return;
    const updatedStore: Store = {
      ...store,
      verified: true,
      idVerification: {
        ...store.idVerification,
        status: 'verified',
        verifiedAt: new Date().toISOString(),
        rejectionReason: undefined,
      },
    };
    await saveStoreEverywhere(updatedStore);
    triggerToast(`Store "${store.name}" ID approved! Verified Blue Tick activated.`);
    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
    } catch (e) {}
  };

  const handleRejectId = async (store: Store, reason: string) => {
    if (!store.idVerification) return;
    const updatedStore: Store = {
      ...store,
      verified: false,
      idVerification: {
        ...store.idVerification,
        status: 'rejected',
        rejectionReason: reason,
      },
    };
    await saveStoreEverywhere(updatedStore);
    triggerToast(`Store "${store.name}" ID rejected.`);
    setRejectModalStore(null);
  };

  const handleDeleteStore = async (store: Store) => {
    // 1. Optimistically remove from admin UI immediately
    setLiveStores((prev) => prev.filter((s) => s.id !== store.id));
    setStoreToDelete(null);

    // 2. Purge ALL local browser traces (localStorage: store, products, orders, session, WA flag)
    deleteStoreAndData(store.id);

    // 3. Hard-purge from Supabase cloud DB:
    //    deletes store row → seller's email/phone no longer matches any row → login denied instantly
    //    deletes all products, orders, and reviews belonging to this store
    let cloudSuccess = false;
    try {
      cloudSuccess = await dbDeleteStore(store.id);
      if (!cloudSuccess) {
        console.error(`[Admin] Supabase delete may have partially failed for store ${store.id}`);
        triggerToast(`⚠️ Store "${store.name}" removed locally but cloud purge had an error — check Supabase.`);
      }
    } catch (e) {
      console.warn('Supabase delete store error:', e);
      triggerToast(`⚠️ Store "${store.name}" removed locally. Cloud purge failed — retry may be needed.`);
    }

    if (cloudSuccess) {
      triggerToast(`🗑️ Store "${store.name}" fully purged — store, products, orders & login access deleted.`);
    }

    onRefreshData();
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
      stores: liveStores,
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
      label: `Stores (${liveStores.length})`,
      icon: Building,
      badge: suspendedStoresCount > 0 ? `${suspendedStoresCount} Banned` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'products', label: `Products (${allProducts.length})`, icon: Package, badge: pendingProductsCount > 0 ? `${pendingProductsCount} Pending` : undefined, badgeColor: 'bg-amber-400 text-slate-950 font-black animate-pulse' },
    { id: 'orders', label: `Master Orders (${allOrders.length})`, icon: ShoppingBag },
    {
      id: 'verifications',
      label: `ID Verifications (${totalVerificationsCount})`,
      icon: ShieldCheck,
      badge: pendingVerificationsCount > 0 ? `${pendingVerificationsCount} Pending` : undefined,
      badgeColor: 'bg-amber-400 text-slate-950 font-black animate-pulse',
    },
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
                <span className="font-extrabold text-white text-base tracking-tight">Taaa.shop</span>
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
            onClick={() => onOpenStorefront(liveStores[0]?.slug || '')}
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
                  <span className="font-extrabold text-white text-sm">Taaa.shop Admin</span>
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
                    <option value="featured">🌟 Featured on Landing</option>
                    <option value="verified">Verified Only</option>
                    <option value="suspended">Banned / Suspended Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleManualRefreshStores}
                    disabled={isRefreshingStores}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition shadow-2xs"
                    title="Reload all stores directly from Supabase database"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStores ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingStores ? 'Syncing...' : 'Sync Stores'}</span>
                  </button>
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
                                {store.featuredOnLanding && (
                                  <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                    <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                                    Landing Showcase
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

                                {/* KYC ID Status Badge */}
                                {store.idVerification ? (
                                  <button
                                    onClick={() => setActiveTab('verifications')}
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-full cursor-pointer flex items-center gap-1 transition ${
                                      store.idVerification.status === 'verified'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : store.idVerification.status === 'pending'
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                    title="Click to view submitted ID"
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>
                                      {store.idVerification.status === 'verified'
                                        ? 'ID Verified'
                                        : store.idVerification.status === 'pending'
                                        ? 'Review ID ⚠️'
                                        : 'ID Rejected'}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                    No ID Yet
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                                <span className="font-mono text-slate-700 font-semibold">{store.slug}.{getRootDomain()}</span>
                                {store.customDomain && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold">
                                    <Globe className="w-2.5 h-2.5 text-emerald-600" />
                                    {store.customDomain}
                                  </span>
                                )}
                                <span>•</span>
                                <span className="font-semibold text-slate-900">Owner: {store.ownerName || 'Not specified'}</span>
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
                                {(() => {
                                  const quota = getStoreAIUsage(store);
                                  return (
                                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md font-medium text-[10px]">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                      <span>AI: <strong>{quota.used}/{quota.cap}</strong></span>
                                      {quota.used > 0 && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleResetStoreAIUsage(store);
                                          }}
                                          className="ml-1 text-[9px] text-indigo-700 underline font-bold cursor-pointer hover:text-indigo-900"
                                          title="Reset today's AI usage for this store"
                                        >
                                          Reset
                                        </button>
                                      )}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          {/* Super Admin Control Actions */}
                          <div className="flex flex-wrap items-center gap-1.5 self-end lg:self-center shrink-0">
                            {/* Feature on Landing (Live Storefronts) Toggle - Super Admin Only */}
                            <button
                              onClick={() => handleToggleFeaturedOnLanding(store)}
                              className={`p-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                store.featuredOnLanding
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                              }`}
                              title={
                                store.featuredOnLanding
                                  ? 'Remove store from Landing Page Live Storefronts'
                                  : 'Feature store on Landing Page Live Storefronts'
                              }
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  store.featuredOnLanding ? 'text-amber-600 fill-amber-500' : 'text-slate-400'
                                }`}
                              />
                              <span className="text-[11px] hidden sm:inline">
                                {store.featuredOnLanding ? 'On Landing' : '+ Landing'}
                              </span>
                            </button>

                            {/* Custom Domain Management */}
                            <button
                              onClick={() => handleOpenDomainModal(store)}
                              className={`p-2 px-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                                store.customDomain
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold shadow-2xs'
                                  : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                              }`}
                              title={store.customDomain ? `Custom Domain: ${store.customDomain} (Click to edit)` : 'Assign Custom Web Domain'}
                            >
                              <Globe className={`w-3.5 h-3.5 ${store.customDomain ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span className="text-[11px] hidden sm:inline">
                                {store.customDomain ? 'Domain' : '+ Domain'}
                              </span>
                            </button>

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
                  <option value="all">All Stores ({liveStores.length})</option>
                  {liveStores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Approval filter pills */}
              <div className="flex flex-wrap items-center gap-2">
                {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => {
                  const count =
                    f === 'all'
                      ? allProducts.length
                      : f === 'pending'
                      ? allProducts.filter((p) => !p.approvalStatus || p.approvalStatus === 'pending').length
                      : allProducts.filter((p) => p.approvalStatus === f).length;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setProductApprovalFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition cursor-pointer flex items-center gap-1.5 ${
                        productApprovalFilter === f
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{f === 'all' ? 'All Products' : f}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${productApprovalFilter === f ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      {productApprovalFilter === 'pending' ? '🎉 No products pending review!' : 'No products match your filters.'}
                    </div>
                  ) : (
                    filteredProducts.map((p) => {
                      const store = liveStores.find((s) => s.id === p.storeId);
                      const isApproved = p.approvalStatus === 'approved';
                      const isRejected = p.approvalStatus === 'rejected';
                      const isPending = !p.approvalStatus || p.approvalStatus === 'pending';
                      return (
                        <div key={p.id} className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition ${isPending ? 'border-l-2 border-amber-400' : isRejected ? 'border-l-2 border-rose-400' : ''}`}>
                          <div className="flex items-center gap-3">
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{p.name}</span>
                                <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                  #{p.uid}
                                </span>
                                {isPending && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                    ⏳ Pending Review
                                  </span>
                                )}
                                {isApproved && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                    ✓ Live
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                    ✗ Rejected
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                <strong>{store?.name}</strong> • {p.category} •{' '}
                                <span className="font-mono font-bold text-slate-900">
                                  {formatPrice(p.price, store?.currencySymbol || '₦')}
                                </span>
                              </div>
                              {isRejected && p.approvalRejectionReason && (
                                <p className="text-[11px] text-rose-600 mt-0.5">Reason: {p.approvalRejectionReason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {p.inStock ? 'In Stock' : 'Sold Out'}
                            </span>
                            {!isApproved && (
                              <button
                                type="button"
                                onClick={() => handleApproveProduct(p)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}
                            {isApproved && (
                              <button
                                type="button"
                                onClick={() => handleApproveProduct(p)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold flex items-center gap-1 cursor-default"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setRejectProductModal(p); setRejectProductReason(''); }}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                            {store && (
                              <button
                                onClick={() => onOpenStorefront(store.slug)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
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
                      const store = liveStores.find((s) => s.id === ord.storeId);
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

          {/* ── TAB: KYC & ID VERIFICATIONS QUEUE ── */}
          {activeTab === 'verifications' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <span>KYC & Merchant ID Verification Queue</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review government ID documents (NIN, Driver's License, International Passport, Voter's Card) submitted during upgrade or seller onboarding.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>{pendingVerificationsCount} Awaiting Review</span>
                    </span>
                  </div>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                    <span className="text-[11px] font-semibold text-slate-500 block">Total KYC Submissions</span>
                    <span className="text-lg font-black text-slate-900">{totalVerificationsCount}</span>
                  </div>
                  <div className="bg-amber-50/70 rounded-xl p-3 border border-amber-200/80">
                    <span className="text-[11px] font-semibold text-amber-700 block">Pending Review</span>
                    <span className="text-lg font-black text-amber-800">{pendingVerificationsCount}</span>
                  </div>
                  <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80">
                    <span className="text-[11px] font-semibold text-emerald-700 block">Verified Merchants</span>
                    <span className="text-lg font-black text-emerald-800">
                      {liveStores.filter((s) => s.idVerification?.status === 'verified').length}
                    </span>
                  </div>
                  <div className="bg-rose-50/70 rounded-xl p-3 border border-rose-200/80">
                    <span className="text-[11px] font-semibold text-rose-700 block">Rejected / Needs Fix</span>
                    <span className="text-lg font-black text-rose-800">
                      {liveStores.filter((s) => s.idVerification?.status === 'rejected').length}
                    </span>
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-2 mb-5">
                  {(['all', 'pending', 'verified', 'rejected'] as const).map((filterKey) => {
                    const count =
                      filterKey === 'all'
                        ? totalVerificationsCount
                        : liveStores.filter((s) => s.idVerification?.status === filterKey).length;
                    const isActive = idVerificationFilter === filterKey;
                    return (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setIdVerificationFilter(filterKey)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer capitalize flex items-center gap-2 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{filterKey === 'all' ? 'All Submissions' : filterKey}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Verification Queue List */}
                {(() => {
                  const filteredStores = liveStores.filter((s) => {
                    if (!s.idVerification) return false;
                    if (idVerificationFilter === 'all') return true;
                    return s.idVerification.status === idVerificationFilter;
                  });

                  if (filteredStores.length === 0) {
                    return (
                      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                        <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-slate-700">No verification requests found</h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                          {idVerificationFilter === 'pending'
                            ? 'All merchant verification submissions have been reviewed! New submissions will appear here.'
                            : 'No merchant stores match the selected verification status filter.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredStores.map((st) => {
                        const ver = st.idVerification!;
                        const isVerified = ver.status === 'verified';
                        const isPending = ver.status === 'pending';
                        const isRejected = ver.status === 'rejected';

                        return (
                          <div
                            key={st.id}
                            className={`rounded-2xl border transition-all p-4 sm:p-5 ${
                              isPending
                                ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                                : isVerified
                                ? 'border-emerald-200 bg-white'
                                : 'border-rose-200 bg-rose-50/15'
                            }`}
                          >
                            {/* Merchant Meta Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                              <div className="flex items-center gap-3">
                                <img
                                  src={st.logoUrl}
                                  alt={st.name}
                                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                                />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">{st.name}</h4>
                                    <span className="text-xs font-mono text-slate-400">({st.slug}.{getRootDomain()})</span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        st.tier === 'business'
                                          ? 'bg-purple-100 text-purple-700'
                                          : st.tier === 'pro'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {st.tier} Plan
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                    <span>
                                      <strong>Owner Name:</strong>{' '}
                                      <span className="text-slate-900 font-semibold">{st.ownerName || 'Not specified'}</span>
                                    </span>
                                    {st.ownerEmail && (
                                      <span>
                                        <strong>Email:</strong> {st.ownerEmail}
                                      </span>
                                    )}
                                    <span>
                                      <strong>WhatsApp:</strong> {st.whatsappCountryCode || '+234'} {st.whatsappNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="flex items-center gap-2 shrink-0">
                                {isPending && (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 animate-pulse">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Pending Verification</span>
                                  </span>
                                )}
                                {isVerified && (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Verified Merchant</span>
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5">
                                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Rejected / Resubmission Requested</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* ID Details & Rejection Notice */}
                            <div className="py-3 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-xs text-slate-600">
                              <div>
                                <span className="text-slate-400">ID Document Type: </span>
                                <span className="font-bold text-slate-800">
                                  {ID_TYPE_LABELS[ver.idType] || ver.idType}
                                </span>
                              </div>
                              {ver.idNumber && (
                                <div>
                                  <span className="text-slate-400">ID Number / Reg: </span>
                                  <span className="font-mono font-bold text-slate-800">{ver.idNumber}</span>
                                </div>
                              )}
                              <div>
                                <span className="text-slate-400">Submitted: </span>
                                <span className="font-medium text-slate-700">
                                  {ver.submittedAt ? new Date(ver.submittedAt).toLocaleString() : 'N/A'}
                                </span>
                              </div>
                              {ver.verifiedAt && (
                                <div>
                                  <span className="text-slate-400">Verified: </span>
                                  <span className="font-medium text-emerald-700">
                                    {new Date(ver.verifiedAt).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Rejection Alert if rejected */}
                            {ver.rejectionReason && (
                              <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="block font-semibold">Previous Rejection Reason:</strong>
                                  <span>{ver.rejectionReason}</span>
                                </div>
                              </div>
                            )}

                            {/* ID Photos Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pb-3">
                              {/* Front Image */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Front of ID Card</span>
                                  </span>
                                  {ver.frontImageUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedImageModal({
                                          url: ver.frontImageUrl,
                                          title: `${st.name} - Front of ${ID_TYPE_LABELS[ver.idType] || ver.idType}`,
                                        })
                                      }
                                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5" />
                                      <span>Zoom & Inspect</span>
                                    </button>
                                  )}
                                </div>
                                {ver.frontImageUrl ? (
                                  <div
                                    onClick={() =>
                                      setSelectedImageModal({
                                        url: ver.frontImageUrl,
                                        title: `${st.name} - Front of ${ID_TYPE_LABELS[ver.idType] || ver.idType}`,
                                      })
                                    }
                                    className="relative h-44 rounded-lg overflow-hidden border border-slate-200 bg-white group cursor-pointer"
                                  >
                                    <img
                                      src={ver.frontImageUrl}
                                      alt="Front ID"
                                      className="w-full h-full object-contain group-hover:scale-102 transition duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                      <ZoomIn className="w-4 h-4" /> Click to view full image
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-44 rounded-lg border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                                    Front image not provided
                                  </div>
                                )}
                              </div>

                              {/* Back Image */}
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Back of ID Card</span>
                                  </span>
                                  {ver.backImageUrl && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedImageModal({
                                          url: ver.backImageUrl,
                                          title: `${st.name} - Back of ${ID_TYPE_LABELS[ver.idType] || ver.idType}`,
                                        })
                                      }
                                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5" />
                                      <span>Zoom & Inspect</span>
                                    </button>
                                  )}
                                </div>
                                {ver.backImageUrl ? (
                                  <div
                                    onClick={() =>
                                      setSelectedImageModal({
                                        url: ver.backImageUrl,
                                        title: `${st.name} - Back of ${ID_TYPE_LABELS[ver.idType] || ver.idType}`,
                                      })
                                    }
                                    className="relative h-44 rounded-lg overflow-hidden border border-slate-200 bg-white group cursor-pointer"
                                  >
                                    <img
                                      src={ver.backImageUrl}
                                      alt="Back ID"
                                      className="w-full h-full object-contain group-hover:scale-102 transition duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5">
                                      <ZoomIn className="w-4 h-4" /> Click to view full image
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-44 rounded-lg border border-dashed border-slate-300 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                                    Back image not provided
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Bar */}
                            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenStorefront(st.slug)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                  <span>View Storefront</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleImpersonate(st)}
                                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Impersonate Seller</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                {!isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveId(st)}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>Approve & Verify Merchant</span>
                                  </button>
                                )}
                                {isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveId(st)}
                                    className="px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5 cursor-default"
                                  >
                                    <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Verified Active</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectModalStore(st);
                                    setRejectReason('ID photo is unclear or blurred. Please upload a clear photo.');
                                  }}
                                  className="px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>{isRejected ? 'Update Rejection Note' : 'Reject ID'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
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
                    Total Stores: <span className="font-bold text-slate-900">{liveStores.length}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {liveStores.map((store) => {
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
                              <span className="font-mono text-xs text-slate-400">({store.slug}.{getRootDomain()})</span>
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
                                  ? '🤖 Business Bot'
                                  : tierOption === 'pro'
                                  ? '⚡ Pro'
                                  : tierOption === 'starter'
                                  ? 'Starter'
                                  : 'Free'}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setPlanOverrideStore(store);
                              setPlanOverrideTier(store.tier || 'starter');
                              setPlanOverrideDays('30');
                              setPlanOverrideNote('');
                            }}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 shadow-2xs"
                            title="Set custom plan tier & duration for trial or promo"
                          >
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Custom Duration</span>
                          </button>
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
                  {liveStores.map((store) => {
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
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Root Domain</label>
                      <input
                        type="text"
                        placeholder="e.g. taaa.com.ng or ta.shop"
                        value={platformSettings.rootDomain || ''}
                        onChange={(e) => setPlatformSettings({ ...platformSettings, rootDomain: e.target.value.toLowerCase().replace(/^https?:\/\//, '').trim() })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Stores appear as <span className="font-mono">yourstore.{platformSettings.rootDomain || 'taaa.com.ng'}</span></p>
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

          {/* Right 2 Items: ID Verifications & Settings */}
          {(['verifications', 'settings'] as AdminTab[]).map((tabId) => {
            const tab = adminNavItems.find((t) => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer relative"
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'text-amber-400' : 'text-slate-500'}`} />
                  {tab.badge && tabId === 'verifications' && pendingVerificationsCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-amber-400 text-slate-950 font-black text-[9px] rounded-full flex items-center justify-center animate-pulse">
                      {pendingVerificationsCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-400' : 'text-slate-500'}`}>
                  {tabId === 'verifications' ? 'KYC IDs' : 'Settings'}
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
                Are you sure you want to delete <strong>{storeToDelete.name}</strong> (`{storeToDelete.slug}.{getRootDomain()}`)? All catalog items and recorded orders will be erased.
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

      {/* ── KYC REJECTION REASON MODAL ── */}
      {rejectModalStore && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Reject ID Submission</h3>
                  <p className="text-xs text-slate-500">{rejectModalStore.name} ({rejectModalStore.ownerName || 'Merchant'})</p>
                </div>
              </div>
              <button
                onClick={() => setRejectModalStore(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select or customize the feedback given to the merchant. They will see this note in their dashboard settings and can upload corrected photos.
            </p>

            {/* Quick preset chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Preset Reasons:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'ID photo is blurry, unreadable or has glare.',
                  'Missing or unreadable back of ID card.',
                  'Name on ID does not match store owner name.',
                  'Uploaded document has expired.',
                  'Document type does not match selected option.',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer text-left ${
                      rejectReason === reason
                        ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Rejection Feedback to Seller:
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                placeholder="Explain what is wrong with the document..."
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setRejectModalStore(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectId(rejectModalStore, rejectReason)}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FULLSCREEN ID IMAGE LIGHTBOX MODAL ── */}
      {selectedImageModal && (
        <div className="fixed inset-0 z-[350] flex flex-col items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
          <div className="max-w-4xl w-full flex items-center justify-between pb-3 text-white">
            <div className="min-w-0 pr-4">
              <h4 className="font-bold text-sm sm:text-base truncate">{selectedImageModal.title}</h4>
              <p className="text-xs text-slate-400">High-resolution document preview</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedImageModal(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-4xl w-full max-h-[80vh] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center p-2 shadow-2xl">
            <img
              src={selectedImageModal.url}
              alt={selectedImageModal.title}
              className="max-h-[75vh] max-w-full object-contain rounded-lg"
            />
          </div>

          <div className="mt-4 flex items-center gap-3">
            <a
              href={selectedImageModal.url}
              download="id-document"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Original</span>
            </a>
            <button
              type="button"
              onClick={() => setSelectedImageModal(null)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Done Viewing
            </button>
          </div>
        </div>
      )}

      {/* ── PRODUCT REJECTION MODAL ── */}
      {rejectProductModal && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">Reject Product Listing</h3>
                  <p className="text-xs text-slate-500 truncate">{rejectProductModal.name} (#{rejectProductModal.uid})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectProductModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Rejecting this product removes it from public storefront visibility. Provide feedback so the seller understands why:
            </p>

            {/* Quick preset chips */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Preset Reasons:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Prohibited or shady goods.',
                  'Misleading description or fake pricing.',
                  'Low quality or broken product images.',
                  'Copyright or brand trademark infringement.',
                  'Missing variant or sizing details.',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectProductReason(reason)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer text-left ${
                      rejectProductReason === reason
                        ? 'bg-rose-100 text-rose-800 font-bold border border-rose-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Feedback for Store Owner:
              </label>
              <textarea
                rows={3}
                value={rejectProductReason}
                onChange={(e) => setRejectProductReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                placeholder="Explain why this item cannot be published..."
              />
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setRejectProductModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRejectProduct(rejectProductModal, rejectProductReason || 'Item does not meet platform catalog guidelines.')}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM PLAN OVERRIDE & DURATION MODAL ── */}
      {planOverrideStore && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">Manual Plan & Trial Override</h3>
                  <p className="text-xs text-slate-500 truncate">{planOverrideStore.name} ({planOverrideStore.ownerName || 'Merchant'})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPlanOverrideStore(null)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Manually set this merchant's subscription tier and configure exact duration (give friends a free trial, extend existing plans, or upgrade manually).
            </p>

            {/* Tier Selector */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Select Plan Tier:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'free', label: 'Free Tier', badge: '₦0' },
                  { id: 'starter', label: 'Starter', badge: '₦500/mo' },
                  { id: 'pro', label: '⚡ Pro Plan', badge: '₦4,900/mo' },
                  { id: 'business', label: '🤖 Business Bot', badge: '₦25,000/mo' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setPlanOverrideTier(t.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      planOverrideTier === t.id
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-1 ring-indigo-500'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{t.badge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration Days */}
            {planOverrideTier !== 'free' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">Duration in Days:</label>
                  <span className="text-[11px] font-mono text-indigo-700 font-bold">
                    Expires on {new Date(Date.now() + (parseInt(planOverrideDays) || 30) * 86400000).toLocaleDateString()}
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={planOverrideDays}
                  onChange={(e) => setPlanOverrideDays(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="30"
                />

                {/* Quick day presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { days: '7', label: '7d (Trial)' },
                    { days: '14', label: '14d' },
                    { days: '30', label: '30d (1 Mo)' },
                    { days: '60', label: '60d' },
                    { days: '90', label: '90d' },
                    { days: '365', label: '365d (1 Yr)' },
                  ].map((p) => (
                    <button
                      key={p.days}
                      type="button"
                      onClick={() => setPlanOverrideDays(p.days)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium border transition cursor-pointer ${
                        planOverrideDays === p.days
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPlanOverrideStore(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSetPlan(planOverrideStore, planOverrideTier, parseInt(planOverrideDays) || 30)}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Plan Override</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CUSTOM DOMAIN MANAGER MODAL (Super Admin Only) ───────────────── */}
      {domainModalStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="fixed inset-0" onClick={() => !isSavingDomain && setDomainModalStore(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 z-10">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Globe className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Assign Custom Web Domain</h3>
                  <p className="text-xs text-slate-500 truncate">
                    {domainModalStore.name} ({domainModalStore.slug}.{getRootDomain()})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDomainModalStore(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Default URL vs Custom Domain */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span>Default Platform Handle:</span>
                <span className="font-mono font-semibold text-slate-800">{domainModalStore.slug}.{getRootDomain()}</span>
              </div>
              {domainModalStore.customDomain && (
                <div className="flex items-center justify-between text-emerald-700 font-semibold pt-1 border-t border-slate-200/60">
                  <span>Active Custom Domain:</span>
                  <span className="font-mono bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md">
                    {domainModalStore.customDomain}
                  </span>
                </div>
              )}
            </div>

            {/* Domain Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Custom Domain Name (e.g. .com, .com.ng, .ng, .store)
              </label>
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-emerald-600 focus-within:border-emerald-600">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-400 font-mono select-none">https://</span>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value.toLowerCase().trim())}
                  placeholder="amakajewelry.com.ng"
                  className="flex-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none placeholder:text-slate-300"
                />
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Enter without "https://" or slashes. Example: <code className="text-slate-600">amakajewels.com.ng</code> or <code className="text-slate-600">brand.com</code>
              </p>
            </div>

            {/* Quick DNS Setup Guide Box */}
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>DNS Settings for Whogohost / Namecheap / QServers:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block font-sans">Apex/Root Record:</span>
                  <strong className="text-slate-800">A @ ➔ 76.76.21.21</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block font-sans">WWW Subdomain:</span>
                  <strong className="text-slate-800">CNAME www ➔ cname.vercel-dns.com</strong>
                </div>
              </div>
              <p className="text-[10px] text-indigo-800/80 leading-relaxed font-sans">
                💡 Tip: Add the domain to your Vercel Project Domains to auto-generate the free SSL padlock (takes 60s).
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {domainModalStore.customDomain && (
                <button
                  type="button"
                  disabled={isSavingDomain}
                  onClick={() => handleSaveCustomDomain(domainModalStore, '')}
                  className="px-3 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                  title="Disconnect and remove custom domain"
                >
                  Remove Domain
                </button>
              )}
              <button
                type="button"
                disabled={isSavingDomain}
                onClick={() => setDomainModalStore(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingDomain}
                onClick={() => handleSaveCustomDomain(domainModalStore, domainInput)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSavingDomain ? 'Saving to Cloud...' : 'Save & Link Domain'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
