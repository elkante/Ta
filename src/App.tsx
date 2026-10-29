/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navigation } from './components/Navigation';
import { Storefront } from './components/storefront/Storefront';
import { SellerDashboard } from './components/dashboard/SellerDashboard';
import { LandingPage } from './components/landing/LandingPage';
import { SellerAuthModal } from './components/auth/SellerAuthModal';
import { CreateStoreModal } from './components/modals/CreateStoreModal';
import { SocialShareModal } from './components/modals/SocialShareModal';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { SuperAdminLoginModal } from './components/admin/SuperAdminLoginModal';
import { SysHqPage } from './components/admin/SysHqPage';
import { SplashScreen } from './components/common/SplashScreen';
import { OnboardingGuide } from './components/onboarding/OnboardingGuide';
import { LegalModal, LegalTab } from './components/legal/LegalModal';
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
  getCurrentTenantSlug,
  getInquiriesByStore,
  getProductsByStore,
  getReviewsByStore,
  getSellerSession,
  getStoreBySlug,
  getStoredStores,
  getSuperAdminSession,
  getSubdomainFromHostname,
  saveStores,
  saveProducts,
  saveOrders,
  setCurrentTenantSlug,
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
} from './utils/supabase';

export default function App() {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(() => {
    try {
      const session = getSellerSession();
      const stores = getStoredStores();
      if (session) {
        return stores.find((s) => s.id === session.storeId || s.slug === session.storeSlug) || null;
      }
      const savedSlug = sessionStorage.getItem('ta_last_store_slug');
      if (savedSlug) {
        return stores.find((s) => s.slug.toLowerCase() === savedSlug.toLowerCase()) || null;
      }
    } catch (e) {}
    return null;
  });
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeInquiries, setStoreInquiries] = useState<WhatsAppInquiryLog[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);

  const [activeView, setActiveView] = useState<'landing' | 'storefront' | 'dashboard' | 'superadmin'>(() => {
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
      if (viewParam === 'dashboard' || viewParam === 'storefront' || viewParam === 'landing') {
        return viewParam as 'landing' | 'storefront' | 'dashboard' | 'superadmin';
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
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  /** Product ID from ?product= URL param; passed to Storefront to auto-open detail modal */
  const [initialProductId, setInitialProductId] = useState<string | null>(null);

  // Initialize and load store based on URL, Supabase live data or local storage
  const loadTenantData = async (slug?: string) => {
    let stores = getStoredStores();
    setAllStores(stores);

    // Read sessionStorage for last known view/store (used for refresh restoration)
    const savedView = sessionStorage.getItem('ta_last_view') as typeof activeView | null;
    const savedStoreSlug = sessionStorage.getItem('ta_last_store_slug') || '';

    // Read stored sessions first so we know roles before fetching
    const session = getSellerSession();
    setSellerSession(session);
    const adminSession = getSuperAdminSession();
    setSuperAdminSessionState(adminSession);

    // ðŸ”’ Role-based Supabase fetch â€” strict data isolation:
    // Super Admin: fetch ALL stores (needs switcher)
    // Seller/Guest: fetch ONLY the target store by slug
    const subdomainSlugForFetch = getSubdomainFromHostname();
    const urlParamsForFetch = new URLSearchParams(window.location.search);
    const storeParamForFetch = urlParamsForFetch.get('store');
    const targetFetchSlug = slug || subdomainSlugForFetch || storeParamForFetch || session?.storeSlug || '';

    try {
      if (adminSession) {
        const [liveStores, liveAllProducts, liveAllOrders] = await Promise.all([
          dbFetchStores(),
          dbFetchAllProducts(),
          dbFetchAllOrders(),
        ]);
        if (liveStores && liveStores.length > 0) {
          stores = liveStores;
          setAllStores(liveStores);
          saveStores(liveStores);
        }
        if (liveAllProducts && liveAllProducts.length > 0) {
          saveProducts(liveAllProducts);
        }
        if (liveAllOrders && liveAllOrders.length > 0) {
          saveOrders(liveAllOrders);
        }
      } else if (targetFetchSlug) {
        const liveStore = await dbFetchStoreBySlug(targetFetchSlug);
        if (liveStore) {
          const merged = [...stores.filter(s => s.id !== liveStore.id), liveStore];
          stores = merged;
          setAllStores(merged);
          saveStores(merged);
        }
      }
    } catch (e) {
      // offline / first load fallback â€” use local cache
    }


    // Read URL params
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const keyParam  = urlParams.get('key');   // secret admin key: ?view=superadmin&key=ta_root_9921
    const storeParam = urlParams.get('store');   // from QR codes / shared links
    const productParam = urlParams.get('product'); // from product QR codes / shared product links
    if (productParam) setInitialProductId(productParam);

    // Direct legal policy views
    if (viewParam === 'terms' || viewParam === 'privacy' || viewParam === 'cookies') {
      setLegalModalTab(viewParam as LegalTab);
      setIsLegalModalOpen(true);
    }

    // Resolve store slug priority:
    // 1. Explicit arg passed to loadTenantData (e.g. after creating a store)
    // 2. Subdomain in hostname (e.g. amaka-perfumes.ta.shop)
    // 3. ?store= URL param â€” QR code scans / shared links (MUST beat localStorage)
    // 4. localStorage last-visited store (lowest priority, only for authenticated sellers)
    const subdomainSlug = getSubdomainFromHostname();

    // Determine if a specific store was explicitly requested
    let hasExplicitStore = !!(slug || subdomainSlug || storeParam);
    const urlStoreSlug = slug || subdomainSlug || storeParam || '';

    // Resolve target store only if a slug was explicitly given in the URL or loadTenantData arg
    let targetStore: Store | null = null;
    if (urlStoreSlug) {
      targetStore = stores.find((s) => s.slug.toLowerCase() === urlStoreSlug.toLowerCase()) || null;
    }

    // 🌐 CUSTOM DOMAIN RESOLUTION (e.g. amakajewels.com.ng or brand.com)
    // If visitor accesses via a custom domain, load that specific merchant's storefront directly!
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
      const matchedByDomain = stores.find((s) => s.customDomain?.toLowerCase() === currentHost) || null;
      if (matchedByDomain) {
        targetStore = matchedByDomain;
        hasExplicitStore = true;
      } else {
        try {
          const liveCustom = await dbFetchStoreByCustomDomain(currentHost);
          if (liveCustom) {
            targetStore = liveCustom;
            hasExplicitStore = true;
            stores = [...stores.filter(s => s.id !== liveCustom.id), liveCustom];
            setAllStores(stores);
          }
        } catch (e) {}
      }
    }

    const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const hash = window.location.hash.toLowerCase();
    if (
      pathname === '/sys-hq' ||
      pathname.endsWith('/sys-hq') ||
      hash === '#/sys-hq' ||
      hash === '#sys-hq' ||
      viewParam === 'sys-hq' ||
      viewParam === 'admin' ||
      viewParam === 'superadmin'
    ) {
      setActiveView('superadmin');
      return;
    }

    if (viewParam === 'landing') {
      // Explicit landing request → show landing page
      setActiveView('landing');
    } else if (viewParam === 'dashboard' && session) {
      setActiveView('dashboard');
      sessionStorage.setItem('ta_last_view', 'dashboard');
    } else if (targetStore && hasExplicitStore) {
      // ONLY go to storefront if a specific store was explicitly requested AND found in registered stores
      setActiveView('storefront');
      sessionStorage.setItem('ta_last_view', 'storefront');
      sessionStorage.setItem('ta_last_store_slug', targetStore.slug);
    } else if (!viewParam && !hasExplicitStore) {
      // No URL param and no explicit store â€” try to restore last session view on refresh
      if (savedView === 'dashboard' && session) {
        setActiveView('dashboard');
      } else if (savedView === 'storefront' && savedStoreSlug) {
        // Restore storefront for last known store slug
        const restoredStore = stores.find((s) => s.slug.toLowerCase() === savedStoreSlug.toLowerCase()) || null;
        if (restoredStore) {
          targetStore = restoredStore;
          setActiveView('storefront');
        } else {
          setActiveView('landing');
        }
      } else {
        // Main site link (e.g. ta-ruby-five.vercel.app/ or root domain) â†’ ALWAYS landing page!
        setActiveView('landing');
      }
    } else {
      setActiveView('landing');
    }

    // If authenticated seller session exists and no explicit store in URL,
    // restore their store context strictly for the seller portal without mixing stores
    if (!targetStore && session) {
      targetStore = stores.find((s) => s.id === session.storeId || s.slug === session.storeSlug) || null;
      if (!targetStore && session.storeSlug) {
        try {
          const liveStore = await dbFetchStoreBySlug(session.storeSlug);
          if (liveStore) {
            targetStore = liveStore;
            saveStores([liveStore]);
          }
        } catch (e) {}
      }
    }

    // 🔒 STRICT ISOLATION: Never default to arbitrary seed stores (prevents store mixing)
    // If no store matched and user is a guest, targetStore remains null (Landing page view)

    if (targetStore) {
      setCurrentStore(targetStore);
      setCurrentTenantSlug(targetStore.slug);

      // Load isolated products, inquiries and reviews for this tenant
      let prods = getProductsByStore(targetStore.id);
      setStoreProducts(prods);

      try {
        const liveProds = await dbFetchProducts(targetStore.id);
        if (liveProds && liveProds.length > 0) {
          prods = liveProds;
          setStoreProducts(liveProds);
          saveProducts(liveProds);
        }
      } catch (e) {}

      const inqs = getInquiriesByStore(targetStore.id);
      const revs = getReviewsByStore(targetStore.id);

      setStoreInquiries(inqs);
      setStoreReviews(revs);

      // Fetch live cloud reviews from Supabase
      try {
        const liveRevs = await dbFetchReviews(targetStore.id);
        if (liveRevs && liveRevs.length > 0) {
          setStoreReviews(liveRevs);
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    loadTenantData();
  }, []);

  // 🔒 Persist last active view to sessionStorage AND update URL so browser refresh preserves location
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

  // â”€â”€â”€ PWA ONLY on Landing Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      if (existing) {
        existing.remove();
      }
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      if (!isLanding) {
        // Suppress browser install prompt completely on customer storefronts and seller dashboards
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [currentStore, activeView]);

  // Internal helper â€” bypasses the buyer guard (used by login/signup flows)
  const switchStore = (store: Store) => {
    setCurrentStore(store);
    setCurrentTenantSlug(store.slug);
    sessionStorage.setItem('ta_last_store_slug', store.slug);

    // Update URL query param smoothly
    const url = new URL(window.location.href);
    url.searchParams.set('store', store.slug);
    window.history.replaceState({}, '', url.toString());

    // Refresh tenant data immediately from local cache
    setStoreProducts(getProductsByStore(store.id));
    setStoreInquiries(getInquiriesByStore(store.id));
    setStoreReviews(getReviewsByStore(store.id));

    // Also fetch latest live products & reviews from Supabase
    dbFetchProducts(store.id)
      .then((live) => {
        if (live && live.length > 0) {
          setStoreProducts(live);
        }
      })
      .catch(() => {});

    dbFetchReviews(store.id)
      .then((liveRevs) => {
        if (liveRevs && liveRevs.length > 0) {
          setStoreReviews(liveRevs);
        }
      })
      .catch(() => {});
  };

  const handleSelectStore = (store: Store) => {
    // ðŸ”’ Role-based guard: buyers cannot switch stores.
    // Only logged-in sellers or super admin are allowed to switch.
    const isSeller = sellerSession !== null;
    const isAdmin = superAdminSession !== null;
    if (!isSeller && !isAdmin) {
      // Silently ignore â€” buyer cannot navigate away to another store
      return;
    }
    switchStore(store);
  };

  const handleStoreCreated = (newStore: Store) => {
    setIsCreateStoreOpen(false);
    loadTenantData(newStore.slug);
    switchStore(newStore); // bypasses guard â€” creator is already authenticated
    setActiveView('dashboard'); // take seller directly to their new dashboard
    setShowOnboarding(true); // show the platform guide for new store owners
  };

  const handleLoginSuccess = async (session: SellerSession) => {
    setSellerSession(session);
    let stores = getStoredStores();
    let matchedStore = stores.find((s) => s.id === session.storeId || s.slug === session.storeSlug);

    if (!matchedStore) {
      try {
        // Fetch ONLY the seller's specific store â€” not all stores
        const liveStore = await dbFetchStoreBySlug(session.storeSlug);
        if (liveStore) {
          matchedStore = liveStore;
          const merged = [...stores.filter((s) => s.id !== liveStore.id), liveStore];
          saveStores(merged);
          setAllStores(merged);
        }
      } catch (e) {}
    }

    if (!matchedStore) {
      alert('Store data could not be found. Please contact support.');
      return;
    }

    switchStore(matchedStore); // strictly switches to the merchant's authenticated store
    sessionStorage.setItem('ta_last_view', 'dashboard');
    sessionStorage.setItem('ta_last_store_slug', matchedStore.slug);
    setActiveView('dashboard');
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

  const handleRefreshData = async () => {
    // Always re-fetch from Supabase so SuperAdmin changes persist across refreshes
    try {
      const liveStores = await dbFetchStores();
      if (liveStores && liveStores.length > 0) {
        saveStores(liveStores);
        setAllStores(liveStores);
        if (currentStore) {
          const refreshedCurrent = liveStores.find((s) => s.id === currentStore.id) || liveStores[0];
          if (refreshedCurrent) {
            setCurrentStore(refreshedCurrent);
            // Also re-fetch products for current store from Supabase
            try {
              const liveProds = await dbFetchProducts(refreshedCurrent.id);
              if (liveProds && liveProds.length > 0) {
                setStoreProducts(liveProds);
              }
            } catch (_) {}
          }
        }
        return;
      }
    } catch (e) {
      console.warn('Supabase refresh failed, falling back to localStorage:', e);
    }
    // Fallback to localStorage
    const stores = getStoredStores();
    setAllStores(stores);
    if (currentStore) {
      const refreshedCurrent = stores.find((s) => s.id === currentStore.id) || stores[0];
      if (refreshedCurrent) {
        setCurrentStore(refreshedCurrent);
        setStoreProducts(getProductsByStore(refreshedCurrent.id));
        setStoreInquiries(getInquiriesByStore(refreshedCurrent.id));
        setStoreReviews(getReviewsByStore(refreshedCurrent.id));
      }
    }
  };

  const handleOpenLegal = (tab: LegalTab = 'terms') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  // ── /sys-hq bypass ────────────────────────────────────────────────────────
  // Must come BEFORE the !currentStore guard so the superadmin page renders
  // even when no store is selected (e.g. direct navigation to /sys-hq).
  if (activeView === 'superadmin') {
    return (
      <>
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
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
      </>
    );
  }

  if (!currentStore) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-900 text-white font-sans">
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
        <LandingPage
          stores={allStores}
          onOpenStore={(slug) => {
            const target = allStores.find((s) => s.slug === slug);
            if (target) {
              handleSelectStore(target);
              setActiveView('storefront');
            }
          }}
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
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-x-clip w-full max-w-full">
      {/* App Splash Screen on Initial Load */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Top Multi-Tenant Navigation Header — shown on storefront & dashboard; hidden on landing */}
      {activeView !== 'landing' && (
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

      {/* Main View Area */}
      <div className="flex-1">
        {activeView === 'landing' ? (
          /* PLATFORM LANDING PAGE */
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
            /* Mobile Device Frame Simulation (Shows Instagram/WhatsApp in-app browser view) */
            <div className="py-8 px-4 flex flex-col items-center justify-center bg-slate-800 min-h-[calc(100vh-64px)]">
              <div className="mb-3 text-center">
                <span className="text-xs font-semibold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                  ðŸ“± Mobile Web Simulator (How buyers see your catalog on WhatsApp/Instagram)
                </span>
              </div>
              <div className="relative w-full max-w-[400px] h-[820px] bg-black rounded-[48px] p-3 shadow-2xl border-4 border-slate-700 overflow-hidden ring-1 ring-white/10 flex flex-col">
                {/* Speaker & camera notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
                  <div className="w-8 h-1 rounded-full bg-slate-900" />
                </div>

                {/* In-app Browser URL bar */}
                <div className="bg-slate-900 text-slate-300 text-[11px] font-mono py-1.5 px-3 rounded-full mt-3 mb-2 mx-2 text-center truncate flex items-center justify-center gap-1.5 border border-slate-800 z-20">
                  <span className="text-emerald-400">ðŸ”’</span>
                  <span>{currentStore.customDomain || `${currentStore.slug}.${getRootDomain()}`}</span>
                </div>

                {/* Inner Screen */}
                <div className="flex-1 bg-white rounded-[36px] overflow-y-auto overflow-x-hidden relative [transform:translateZ(0)]">
                  <Storefront
                    store={currentStore}
                    products={storeProducts}
                    reviews={storeReviews}
                    onOpenCreateStore={() => {
                      setAuthModalMode('signup');
                      setIsAuthModalOpen(true);
                    }}
                    onOpenLogin={() => {
                      setAuthModalMode('login');
                      setIsAuthModalOpen(true);
                    }}
                    onOpenLanding={() => setActiveView('landing')}
                    onRefreshData={handleRefreshData}
                    onOpenLegal={handleOpenLegal}
                    initialProductId={initialProductId}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Full Width Responsive View */
            <Storefront
              store={currentStore}
              products={storeProducts}
              reviews={storeReviews}
              onOpenCreateStore={() => {
                setAuthModalMode('signup');
                setIsAuthModalOpen(true);
              }}
              onOpenLogin={() => {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }}
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
            onOpenStorefront={() => setActiveView('storefront')}
            onRefreshData={handleRefreshData}
            onSelectStore={handleSelectStore}
            onOpenGuide={() => setShowOnboarding(true)}
          />
        )}
      </div>

      {/* Seller Login & Signup Modal */}
      <SellerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        initialSlug={authModalSlug}
        onLoginSuccess={handleLoginSuccess}
        onStoreCreated={handleStoreCreated}
      />

      {/* Create New Store Modal (Secondary trigger) */}
      <CreateStoreModal
        isOpen={isCreateStoreOpen}
        onClose={() => setIsCreateStoreOpen(false)}
        onStoreCreated={handleStoreCreated}
      />

      {/* Social Share & QR Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        store={currentStore}
      />

      {/* Super Admin Login Modal */}
      <SuperAdminLoginModal
        isOpen={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
        onLoginSuccess={handleSuperAdminLoginSuccess}
      />

      {/* Onboarding Guide â€” shown automatically after store creation */}
      {showOnboarding && currentStore && (
        <OnboardingGuide
          store={currentStore}
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* Terms, Privacy, and Cookie Legal Modal */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
}
