/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navigation } from './components/Navigation';
import { Storefront } from './components/storefront/Storefront';
import { SellerDashboard } from './components/dashboard/SellerDashboard';
import { LandingPage } from './components/landing/LandingPage';
import { PricingPage } from './components/landing/PricingPage';
import { SellerAuthModal } from './components/auth/SellerAuthModal';
import { CreateStoreModal } from './components/modals/CreateStoreModal';
import { SocialShareModal } from './components/modals/SocialShareModal';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { SuperAdminLoginModal } from './components/admin/SuperAdminLoginModal';
import { SysHqPage } from './components/admin/SysHqPage';
import { SplashScreen } from './components/common/SplashScreen';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { OnboardingGuide } from './components/onboarding/OnboardingGuide';
import { LegalModal, LegalTab } from './components/legal/LegalModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import {
  Product,
  SellerSession,
  Store,
  StoreReview,
  SuperAdminSession,
  WhatsAppInquiryLog,
} from './types';
import {
  clearSellerSession,
  clearSuperAdminSession,
  getInquiriesByStore,
  getSellerSession,
  getSuperAdminSession,
  getSubdomainFromHostname,
  getRootDomain,
} from './utils/storage';
import {
  dbFetchStores,
  dbFetchProducts,
  dbFetchReviews,
  dbFetchAllProducts,
  dbFetchAllOrders,
  dbFetchStoreBySlug,
  dbFetchStoreByCustomDomain,
  dbSaveOrder,
  dbUpdateOrderStatus,
} from './utils/supabase';

export default function App() {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeInquiries, setStoreInquiries] = useState<WhatsAppInquiryLog[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);

  const [activeView, setActiveView] = useState<'landing' | 'pricing' | 'storefront' | 'dashboard' | 'superadmin'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
        const hash = window.location.hash.toLowerCase();
        if (
          pathname === '/sys-hq' ||
          pathname.endsWith('/sys-hq') ||
          hash === '#/sys-hq' ||
          hash === '#sys-hq'
        ) {
          return 'superadmin';
        }
      }
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam === 'sys-hq' || viewParam === 'superadmin' || viewParam === 'admin') {
        return 'superadmin';
      }
      if (viewParam === 'pricing') {
        return 'pricing';
      }
      if (viewParam === 'dashboard' || viewParam === 'storefront' || viewParam === 'landing') {
        return viewParam as 'landing' | 'pricing' | 'storefront' | 'dashboard' | 'superadmin';
      }
      const subSlug = getSubdomainFromHostname();
      if (urlParams.get('store') || subSlug) {
        return 'storefront';
      }
      const savedView = sessionStorage.getItem('ta_last_view');
      const session = getSellerSession();
      if (savedView === 'dashboard' && session) return 'dashboard';
      if (savedView === 'storefront') return 'storefront';
    } catch (e) {}
    return 'landing';
  });

  const [sellerSession, setSellerSession] = useState<SellerSession | null>(() => getSellerSession());
  const [superAdminSession, setSuperAdminSessionState] = useState<SuperAdminSession | null>(() => getSuperAdminSession());

  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authModalSlug, setAuthModalSlug] = useState('');
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalTab>('terms');
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      const hasSeenSplash = sessionStorage.getItem('ta_seen_splash');
      if (isPWA || hasSeenSplash) return false;
    }
    return true;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initialProductId, setInitialProductId] = useState<string | null>(null);
  const [isBootingStore, setIsBootingStore] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const sub = getSubdomainFromHostname();
      return !!(urlParams.get('store') || sub);
    }
    return false;
  });

  // ─── Core data loader — Supabase only, no localStorage for stores/products/reviews ───
  const loadTenantData = async (slug?: string) => {
    const savedView = sessionStorage.getItem('ta_last_view') as typeof activeView | null;
    const savedStoreSlug = sessionStorage.getItem('ta_last_store_slug') || '';

    const session = getSellerSession();
    setSellerSession(session);
    const adminSession = getSuperAdminSession();
    setSuperAdminSessionState(adminSession);

    const subdomainSlug = getSubdomainFromHostname();
    const urlParams = new URLSearchParams(window.location.search);
    const storeParam = urlParams.get('store');
    const productParam = urlParams.get('product');
    const viewParam = urlParams.get('view');
    if (productParam) setInitialProductId(productParam);

    const targetFetchSlug = slug || subdomainSlug || storeParam || session?.storeSlug || '';

    const isSysHqRoute =
      window.location.pathname.startsWith('/sys-hq') ||
      viewParam === 'sys-hq' ||
      viewParam === 'superadmin' ||
      viewParam === 'admin';

    // Direct legal policy views
    if (viewParam === 'terms' || viewParam === 'privacy' || viewParam === 'cookies') {
      setLegalModalTab(viewParam as LegalTab);
      setIsLegalModalOpen(true);
    }

    // Route to sys-hq if needed
    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const hash = window.location.hash.toLowerCase();
    if (
      pathname === '/sys-hq' ||
      pathname.endsWith('/sys-hq') ||
      hash === '#/sys-hq' ||
      hash === '#sys-hq' ||
      isSysHqRoute
    ) {
      setActiveView('superadmin');
      // Still fetch all stores for admin
      try {
        const [liveStores, liveAllOrders] = await Promise.all([
          dbFetchStores(),
          dbFetchAllOrders(),
        ]);
        if (liveStores?.length) setAllStores(liveStores);
      } catch (e) {}
      return;
    }

    let stores: Store[] = [];
    let targetStore: Store | null = null;
    const hasExplicitStore = !!(slug || subdomainSlug || storeParam);

    try {
      if (adminSession) {
        // Super admin: fetch ALL stores
        const [liveStores] = await Promise.all([dbFetchStores(), dbFetchAllOrders()]);
        if (liveStores?.length) {
          stores = liveStores;
          setAllStores(liveStores);
        }
      } else if (targetFetchSlug) {
        // Seller/guest: fetch only the target store
        const liveStore = await dbFetchStoreBySlug(targetFetchSlug);
        if (liveStore) {
          stores = [liveStore];
          setAllStores([liveStore]);
          targetStore = liveStore;
        }
      }
    } catch (e) {
      console.warn('[App] Supabase initial fetch error:', e);
    }

    // Custom domain resolution
    const currentHost = window.location.hostname.toLowerCase();
    const root = getRootDomain();
    const isPaaSOrLocal =
      currentHost === 'localhost' ||
      currentHost === '127.0.0.1' ||
      currentHost.endsWith('vercel.app') ||
      currentHost.endsWith('netlify.app') ||
      currentHost.endsWith(root) ||
      currentHost.endsWith('ta.shop');

    if (!isPaaSOrLocal && !targetStore) {
      try {
        const liveCustom = await dbFetchStoreByCustomDomain(currentHost);
        if (liveCustom) {
          targetStore = liveCustom;
          stores = [...stores.filter(s => s.id !== liveCustom.id), liveCustom];
          setAllStores(stores);
        }
      } catch (e) {}
    }

    // If explicit store param and target not found yet, check allStores array
    if (!targetStore && hasExplicitStore) {
      const urlStoreSlug = slug || subdomainSlug || storeParam || '';
      targetStore = stores.find(s => s.slug.toLowerCase() === urlStoreSlug.toLowerCase()) || null;
    }

    // Resolve view
    if (viewParam === 'landing') {
      setActiveView('landing');
    } else if (viewParam === 'pricing') {
      setActiveView('pricing');
    } else if (viewParam === 'dashboard' && session) {
      setActiveView('dashboard');
      sessionStorage.setItem('ta_last_view', 'dashboard');
    } else if (targetStore && hasExplicitStore) {
      setCurrentStore(targetStore);
      sessionStorage.setItem('ta_last_view', 'storefront');
      sessionStorage.setItem('ta_last_store_slug', targetStore.slug);
      setActiveView('storefront');
    } else if (!viewParam && !hasExplicitStore) {
      if (savedView === 'dashboard' && session) {
        setActiveView('dashboard');
      } else if (savedView === 'storefront' && savedStoreSlug) {
        const restoredStore = stores.find(s => s.slug.toLowerCase() === savedStoreSlug.toLowerCase()) || null;
        if (restoredStore) {
          targetStore = restoredStore;
          setActiveView('storefront');
        } else {
          setActiveView('landing');
        }
      } else {
        setActiveView('landing');
      }
    } else {
      setActiveView('landing');
    }

    // Authenticated seller with no explicit store → restore their store
    if (!targetStore && session) {
      targetStore = stores.find(s => s.id === session.storeId || s.slug === session.storeSlug) || null;
      if (!targetStore && session.storeSlug) {
        try {
          const liveStore = await dbFetchStoreBySlug(session.storeSlug);
          if (liveStore) {
            targetStore = liveStore;
            stores = [...stores.filter(s => s.id !== liveStore.id), liveStore];
            setAllStores(stores);
          }
        } catch (e) {}
      }
    }

    if (targetStore) {
      setCurrentStore(targetStore);
      sessionStorage.setItem('ta_last_store_slug', targetStore.slug);

      // Fetch products & reviews directly from Supabase — no localStorage
      try {
        const liveProds = await dbFetchProducts(targetStore.id);
        if (Array.isArray(liveProds)) setStoreProducts(liveProds);
      } catch (e) {}

      setStoreInquiries(getInquiriesByStore(targetStore.id));

      try {
        const liveRevs = await dbFetchReviews(targetStore.id);
        if (Array.isArray(liveRevs)) setStoreReviews(liveRevs);
      } catch (e) {}
    }

    setIsBootingStore(false);
  };

  useEffect(() => {
    loadTenantData();
  }, []);

  // Persist last active view to sessionStorage + URL
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (activeView === 'superadmin') {
        if (url.pathname !== '/sys-hq') {
          url.pathname = '/sys-hq';
          url.searchParams.delete('store');
          url.searchParams.delete('view');
          window.history.replaceState({}, '', url.toString());
        }
      } else if (activeView === 'dashboard' && currentStore) {
        if (url.pathname === '/sys-hq') url.pathname = '/';
        sessionStorage.setItem('ta_last_view', 'dashboard');
        sessionStorage.setItem('ta_last_store_slug', currentStore.slug);
        url.searchParams.set('store', currentStore.slug);
        url.searchParams.set('view', 'dashboard');
        window.history.replaceState({}, '', url.toString());
      } else if (activeView === 'storefront' && currentStore) {
        if (url.pathname === '/sys-hq') url.pathname = '/';
        sessionStorage.setItem('ta_last_view', 'storefront');
        sessionStorage.setItem('ta_last_store_slug', currentStore.slug);
        url.searchParams.set('store', currentStore.slug);
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
      } else if (activeView === 'pricing') {
        if (url.pathname === '/sys-hq') url.pathname = '/';
        sessionStorage.removeItem('ta_last_view');
        sessionStorage.removeItem('ta_last_store_slug');
        url.searchParams.delete('store');
        url.searchParams.set('view', 'pricing');
        window.history.replaceState({}, '', url.toString());
      } else if (activeView === 'landing') {
        if (url.pathname === '/sys-hq') url.pathname = '/';
        sessionStorage.removeItem('ta_last_view');
        sessionStorage.removeItem('ta_last_store_slug');
        url.searchParams.delete('store');
        url.searchParams.delete('view');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {}
  }, [activeView, currentStore]);

  // Listen for products_updated event (fired after product mutations in SellerDashboard)
  useEffect(() => {
    const handler = () => {
      if (currentStore) {
        dbFetchProducts(currentStore.id)
          .then(live => { if (Array.isArray(live)) setStoreProducts(live); })
          .catch(() => {});
      }
    };
    window.addEventListener('tashop:products_updated', handler);
    return () => window.removeEventListener('tashop:products_updated', handler);
  }, [currentStore?.id]);

  // Listen for reviews_updated event
  useEffect(() => {
    const handler = () => {
      if (currentStore) {
        dbFetchReviews(currentStore.id)
          .then(live => { if (Array.isArray(live)) setStoreReviews(live); })
          .catch(() => {});
      }
    };
    window.addEventListener('tashop:reviews_updated', handler);
    return () => window.removeEventListener('tashop:reviews_updated', handler);
  }, [currentStore?.id]);

  // Listen for store_updated event (fired after store settings saves in SellerDashboard)
  useEffect(() => {
    const handler = () => {
      if (currentStore) {
        dbFetchStoreBySlug(currentStore.slug)
          .then(live => {
            if (live) {
              setCurrentStore(live);
              setAllStores(prev => prev.map(s => s.id === live.id ? live : s));
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('tashop:store_updated', handler);
    return () => window.removeEventListener('tashop:store_updated', handler);
  }, [currentStore?.id]);

  // PWA manifest — landing only
  useEffect(() => {
    const isLanding = !currentStore || activeView === 'landing';
    const existing = document.querySelector('link[data-pwa="landing"]');
    if (isLanding) {
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = '/manifest.webmanifest';
        link.setAttribute('data-pwa', 'landing');
        document.head.appendChild(link);
      }
    } else {
      if (existing) existing.remove();
    }
  }, [currentStore, activeView]);

  const switchStore = (store: Store) => {
    setCurrentStore(store);
    sessionStorage.setItem('ta_last_store_slug', store.slug);

    const url = new URL(window.location.href);
    url.searchParams.set('store', store.slug);
    window.history.replaceState({}, '', url.toString());

    // Fetch fresh data from Supabase
    dbFetchProducts(store.id)
      .then(live => { if (Array.isArray(live)) setStoreProducts(live); })
      .catch(() => {});
    dbFetchReviews(store.id)
      .then(live => { if (Array.isArray(live)) setStoreReviews(live); })
      .catch(() => {});
    setStoreInquiries(getInquiriesByStore(store.id));
  };

  const handleSelectStore = (store: Store) => {
    const isSeller = sellerSession !== null;
    const isAdmin = superAdminSession !== null;
    if (!isSeller && !isAdmin) return;
    switchStore(store);
  };

  const handleStoreCreated = (newStore: Store) => {
    setIsCreateStoreOpen(false);
    setAllStores(prev => [...prev.filter(s => s.id !== newStore.id), newStore]);
    switchStore(newStore);
    setActiveView('dashboard');
    setShowOnboarding(true);
  };

  const handleLoginSuccess = async (session: SellerSession) => {
    setSellerSession(session);
    try {
      const liveStore = await dbFetchStoreBySlug(session.storeSlug);
      if (liveStore) {
        setAllStores(prev => [...prev.filter(s => s.id !== liveStore.id), liveStore]);
        switchStore(liveStore);
        sessionStorage.setItem('ta_last_view', 'dashboard');
        sessionStorage.setItem('ta_last_store_slug', liveStore.slug);
        setActiveView('dashboard');
        return;
      }
    } catch (e) {
      console.warn('[App] Login store fetch error:', e);
    }
    alert('Store data could not be found. Please contact support.');
  };

  const handleLogout = () => {
    clearSellerSession();
    setSellerSession(null);
    if (activeView === 'dashboard') {
      setActiveView('storefront');
    }
  };

  const handleOpenSuperAdmin = () => {
    setActiveView('superadmin');
    const url = new URL(window.location.href);
    url.pathname = '/sys-hq';
    url.searchParams.delete('store');
    url.searchParams.delete('view');
    window.history.pushState({}, '', url.toString());
  };

  const handleSuperAdminLoginSuccess = (session: SuperAdminSession) => {
    setSuperAdminSessionState(session);
    setActiveView('superadmin');
    const url = new URL(window.location.href);
    url.pathname = '/sys-hq';
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
    handleRefreshData();
  };

  const handleSuperAdminLogout = () => {
    clearSuperAdminSession();
    setSuperAdminSessionState(null);
    setActiveView('superadmin');
    const url = new URL(window.location.href);
    url.pathname = '/sys-hq';
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  };

  const handleImpersonateStore = (session: SellerSession) => {
    handleLoginSuccess(session);
  };

  const handleOpenStorefront = async () => {
    if (currentStore) {
      try {
        const liveProds = await dbFetchProducts(currentStore.id);
        if (Array.isArray(liveProds)) setStoreProducts(liveProds);
      } catch (e) {}
    }
    setActiveView('storefront');
  };

  const handleRefreshData = async () => {
    try {
      if (superAdminSession) {
        const liveStores = await dbFetchStores();
        if (liveStores?.length) {
          setAllStores(liveStores);
          if (currentStore) {
            const refreshedCurrent = liveStores.find(s => s.id === currentStore.id);
            if (refreshedCurrent) {
              setCurrentStore(refreshedCurrent);
              const [liveProds, liveRevs] = await Promise.all([
                dbFetchProducts(refreshedCurrent.id).catch(() => [] as Product[]),
                dbFetchReviews(refreshedCurrent.id).catch(() => [] as StoreReview[]),
              ]);
              if (Array.isArray(liveProds)) setStoreProducts(liveProds);
              if (Array.isArray(liveRevs)) setStoreReviews(liveRevs);
            }
          }
        }
      } else if (currentStore) {
        const liveStore = await dbFetchStoreBySlug(currentStore.slug);
        if (liveStore) {
          setCurrentStore(liveStore);
          setAllStores(prev => prev.map(s => s.id === liveStore.id ? liveStore : s));
          const [liveProds, liveRevs] = await Promise.all([
            dbFetchProducts(liveStore.id).catch(() => [] as Product[]),
            dbFetchReviews(liveStore.id).catch(() => [] as StoreReview[]),
          ]);
          if (Array.isArray(liveProds)) setStoreProducts(liveProds);
          if (Array.isArray(liveRevs)) setStoreReviews(liveRevs);
        }
      }
    } catch (e) {
      console.warn('[App] Supabase refresh failed:', e);
    }
  };

  const handleOpenLegal = (tab: LegalTab = 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  // ── /sys-hq bypass ────────────────────────────────────────────────────────
  if (activeView === 'superadmin') {
    return (
      <ErrorBoundary fallbackTitle="Super Admin HQ Error">
        {showSplash && <SplashScreen onFinish={() => {
          setShowSplash(false);
          try { sessionStorage.setItem('ta_seen_splash', '1'); } catch (e) {}
        }} />}
        <SysHqPage
          session={superAdminSession}
          allStores={allStores}
          onLoginSuccess={handleSuperAdminLoginSuccess}
          onLogout={handleSuperAdminLogout}
          onRefreshData={handleRefreshData}
          onSelectStore={handleSelectStore}
          onOpenStorefront={(slug) => {
            const target = allStores.find((s) => s.slug === slug);
            if (target) {
              handleSelectStore(target);
              setActiveView('storefront');
            }
          }}
          onImpersonateStore={handleImpersonateStore}
          onOpenLanding={() => {
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.delete('view');
            window.history.pushState({}, '', url.toString());
            setActiveView('landing');
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isBootingStore && !currentStore) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white font-sans px-4">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Opening Store...</h3>
            <p className="text-xs text-slate-400 mt-0.5">Fetching live catalog & WhatsApp checkout</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStore) {
    if (activeView === 'pricing') {
      return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
          <PricingPage
            onOpenSignup={(slug) => {
              setAuthModalMode('signup');
              setAuthModalSlug(slug || '');
              setIsAuthModalOpen(true);
            }}
            onBack={() => setActiveView('landing')}
          />
          <SellerAuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
            initialSlug={authModalSlug}
            onLoginSuccess={handleLoginSuccess}
            onStoreCreated={handleStoreCreated}
          />
          <LegalModal
            isOpen={isLegalModalOpen}
            onClose={() => setIsLegalModalOpen(false)}
            initialTab={legalModalTab}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-white font-sans">
        {showSplash && <SplashScreen onFinish={() => {
          setShowSplash(false);
          try { sessionStorage.setItem('ta_seen_splash', '1'); } catch (e) {}
        }} />}
        <LandingPage
          stores={allStores}
          onOpenStore={(slug) => {
            const target = allStores.find((s) => s.slug === slug);
            if (target) {
              handleSelectStore(target);
              setActiveView('storefront');
            }
          }}
          onOpenPricing={() => setActiveView('pricing')}
          onOpenLogin={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenSignup={(slug) => {
            setAuthModalMode('signup');
            setAuthModalSlug(slug || '');
            setIsAuthModalOpen(true);
          }}
          onOpenSuperAdmin={handleOpenSuperAdmin}
          onOpenLegal={handleOpenLegal}
        />
        <SellerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
          initialSlug={authModalSlug}
          onLoginSuccess={handleLoginSuccess}
          onStoreCreated={handleStoreCreated}
        />
        <LegalModal
          isOpen={isLegalModalOpen}
          onClose={() => setIsLegalModalOpen(false)}
          initialTab={legalModalTab}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900 w-full max-w-full">
      {showSplash && <SplashScreen onFinish={() => {
        setShowSplash(false);
        try { sessionStorage.setItem('ta_seen_splash', '1'); } catch (e) {}
      }} />}

      {sellerSession && activeView === 'dashboard' && <PWAInstallBanner />}

      {activeView !== 'landing' && activeView !== 'pricing' && (
        <Navigation
          currentStore={currentStore}
          allStores={allStores}
          activeView={activeView}
          sellerSession={sellerSession}
          superAdminSession={superAdminSession}
          onViewChange={(view) => {
            setActiveView(view);
            const url = new URL(window.location.href);
            if (view === 'landing') {
              url.searchParams.set('view', 'landing');
            } else if (view === 'pricing') {
              url.searchParams.set('view', 'pricing');
            } else if (view === 'superadmin') {
              handleOpenSuperAdmin();
              return;
            } else {
              url.searchParams.delete('view');
              url.searchParams.set('store', currentStore.slug);
            }
            window.history.replaceState({}, '', url.toString());
          }}
          onSelectStore={handleSelectStore}
          onOpenCreateStore={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
          onOpenShareModal={() => setIsShareModalOpen(true)}
          onOpenLogin={() => {
            setAuthModalMode('login');
            setIsAuthModalOpen(true);
          }}
          onOpenSuperAdmin={handleOpenSuperAdmin}
          onLogout={handleLogout}
          isMobileDeviceFrame={isMobileDeviceFrame}
          onToggleMobileDeviceFrame={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
        />
      )}

      <div className="flex-1">
        <ErrorBoundary fallbackTitle="View Loading Error">
          {activeView === 'pricing' ? (
            <PricingPage
              onOpenSignup={(slug) => {
                setAuthModalMode('signup');
                setAuthModalSlug(slug || '');
                setIsAuthModalOpen(true);
              }}
              onBack={() => setActiveView(sellerSession ? 'dashboard' : 'storefront')}
            />
          ) : activeView === 'landing' ? (
            <LandingPage
              stores={allStores}
              sellerSession={sellerSession}
              onOpenDashboard={() => setActiveView('dashboard')}
              onOpenStore={(slug) => {
                const target = allStores.find((s) => s.slug === slug);
                if (target) {
                  handleSelectStore(target);
                  setActiveView('storefront');
                }
              }}
              onOpenPricing={() => setActiveView('pricing')}
              onOpenLogin={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
              onOpenSignup={(slug) => {
                setAuthModalMode('signup');
                setAuthModalSlug(slug || '');
                setIsAuthModalOpen(true);
              }}
              onOpenSuperAdmin={handleOpenSuperAdmin}
              onOpenLegal={handleOpenLegal}
            />
          ) : activeView === 'storefront' ? (
            isMobileDeviceFrame ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center bg-slate-800 min-h-[calc(100vh-64px)]">
                <div className="mb-3 text-center">
                  <span className="text-xs font-semibold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                    📱 Mobile Web Simulator (How buyers see your catalog on WhatsApp/Instagram)
                  </span>
                </div>
                <div className="relative w-full max-w-[400px] h-[820px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-slate-700 overflow-hidden ring-1 ring-white/10 flex flex-col">
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
                    <div className="w-8 h-1 rounded-full bg-slate-900" />
                  </div>
                  <div className="bg-slate-900 text-slate-300 text-[11px] font-mono py-1.5 px-3 rounded-full mt-3 mb-2 mx-2 text-center truncate flex items-center justify-center gap-1.5 border border-slate-800 z-20">
                    <span className="text-emerald-400">🔒</span>
                    <span>{currentStore.customDomain || `${currentStore.slug}.${getRootDomain()}`}</span>
                  </div>
                  <div className="flex-1 bg-white rounded-[36px] overflow-y-auto overflow-x-hidden relative [transform:translateZ(0)]">
                    <Storefront
                      store={currentStore}
                      products={storeProducts}
                      reviews={storeReviews}
                      isStoreOwner={Boolean(sellerSession && currentStore && (sellerSession.storeId === currentStore.id || sellerSession.storeSlug === currentStore.slug))}
                      onOpenCreateStore={() => { setAuthModalMode('signup'); setIsAuthModalOpen(true); }}
                      onOpenLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                      onOpenLanding={() => setActiveView('landing')}
                      onRefreshData={handleRefreshData}
                      onOpenLegal={handleOpenLegal}
                      initialProductId={initialProductId}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Storefront
                store={currentStore}
                products={storeProducts}
                reviews={storeReviews}
                isStoreOwner={Boolean(sellerSession && currentStore && (sellerSession.storeId === currentStore.id || sellerSession.storeSlug === currentStore.slug))}
                onOpenCreateStore={() => { setAuthModalMode('signup'); setIsAuthModalOpen(true); }}
                onOpenLogin={() => { setAuthModalMode('login'); setIsAuthModalOpen(true); }}
                onOpenLanding={() => setActiveView('landing')}
                onRefreshData={handleRefreshData}
                onOpenLegal={handleOpenLegal}
                initialProductId={initialProductId}
              />
            )
          ) : (
            <SellerDashboard
              store={currentStore}
              products={storeProducts}
              inquiries={storeInquiries}
              onOpenStorefront={handleOpenStorefront}
              onRefreshData={handleRefreshData}
              onSelectStore={handleSelectStore}
              onOpenGuide={() => setShowOnboarding(true)}
            />
          )}
        </ErrorBoundary>
      </div>

      <SellerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        initialSlug={authModalSlug}
        onLoginSuccess={handleLoginSuccess}
        onStoreCreated={handleStoreCreated}
      />

      <CreateStoreModal
        isOpen={isCreateStoreOpen}
        onClose={() => setIsCreateStoreOpen(false)}
        onStoreCreated={handleStoreCreated}
      />

      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        store={currentStore}
      />

      <SuperAdminLoginModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
        onLoginSuccess={handleSuperAdminLoginSuccess}
      />

      {showOnboarding && currentStore && (
        <OnboardingGuide
          store={currentStore}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
