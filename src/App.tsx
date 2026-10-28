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
import { SplashScreen } from './components/common/SplashScreen';
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
  setCurrentTenantSlug,
} from './utils/storage';
import { dbFetchStores, dbFetchProducts } from './utils/supabase';

export default function App() {
  const [allStores, setAllStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [storeInquiries, setStoreInquiries] = useState<WhatsAppInquiryLog[]>([]);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);

  const [activeView, setActiveView] = useState<'landing' | 'storefront' | 'dashboard' | 'superadmin'>('storefront');
  const [sellerSession, setSellerSession] = useState<SellerSession | null>(null);
  const [superAdminSession, setSuperAdminSessionState] = useState<SuperAdminSession | null>(null);

  const [isMobileDeviceFrame, setIsMobileDeviceFrame] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [authModalSlug, setAuthModalSlug] = useState('');
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  /** Product ID from ?product= URL param; passed to Storefront to auto-open detail modal */
  const [initialProductId, setInitialProductId] = useState<string | null>(null);

  // Initialize and load store based on URL, Supabase live data or local storage
  const loadTenantData = async (slug?: string) => {
    let stores = getStoredStores();
    setAllStores(stores);

    try {
      const liveStores = await dbFetchStores();
      if (liveStores && liveStores.length > 0) {
        stores = liveStores;
        setAllStores(liveStores);
      }
    } catch (e) {
      // offline / first load fallback
    }

    // Read stored seller session if any
    const session = getSellerSession();
    setSellerSession(session);

    // Read stored super admin session if any
    const adminSession = getSuperAdminSession();
    setSuperAdminSessionState(adminSession);

    // Read URL params
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const storeParam = urlParams.get('store');   // from QR codes / shared links
    const productParam = urlParams.get('product'); // from product QR codes / shared product links
    if (productParam) setInitialProductId(productParam);

    // Resolve store slug priority:
    // 1. Explicit arg passed to loadTenantData (e.g. after creating a store)
    // 2. Subdomain in hostname (e.g. amaka-perfumes.ta.shop)
    // 3. ?store= URL param — QR code scans / shared links (MUST beat localStorage)
    // 4. localStorage last-visited store (lowest priority)
    const subdomainSlug = getSubdomainFromHostname();
    const urlStoreSlug = slug || subdomainSlug || storeParam || getCurrentTenantSlug();

    if (viewParam === 'landing' || stores.length === 0) {
      setActiveView('landing');
    } else if (viewParam === 'admin' || viewParam === 'superadmin') {
      if (adminSession) {
        setActiveView('superadmin');
      } else {
        setIsSuperAdminModalOpen(true);
      }
    } else if (storeParam || subdomainSlug) {
      // Explicit store in URL (QR scan or shared link) → always go straight to storefront
      setActiveView('storefront');
    }

    let targetStore = stores.find((s) => s.slug.toLowerCase() === urlStoreSlug.toLowerCase());
    if (!targetStore) {
      targetStore = stores[0] || null;
    }

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
        }
      } catch (e) {}

      const inqs = getInquiriesByStore(targetStore.id);
      const revs = getReviewsByStore(targetStore.id);

      setStoreInquiries(inqs);
      setStoreReviews(revs);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, []);

  // Internal helper — bypasses the buyer guard (used by login/signup flows)
  const switchStore = (store: Store) => {
    setCurrentStore(store);
    setCurrentTenantSlug(store.slug);

    // Update URL query param smoothly
    const url = new URL(window.location.href);
    url.searchParams.set('store', store.slug);
    window.history.replaceState({}, '', url.toString());

    // Refresh tenant data
    setStoreProducts(getProductsByStore(store.id));
    setStoreInquiries(getInquiriesByStore(store.id));
    setStoreReviews(getReviewsByStore(store.id));
  };

  const handleSelectStore = (store: Store) => {
    // 🔒 Role-based guard: buyers cannot switch stores.
    // Only logged-in sellers or super admin are allowed to switch.
    const isSeller = sellerSession !== null;
    const isAdmin = superAdminSession !== null;
    if (!isSeller && !isAdmin) {
      // Silently ignore — buyer cannot navigate away to another store
      return;
    }
    switchStore(store);
  };

  const handleStoreCreated = (newStore: Store) => {
    setIsCreateStoreOpen(false);
    loadTenantData(newStore.slug);
    switchStore(newStore); // bypasses guard — creator is already authenticated
    setActiveView('dashboard'); // take seller directly to their new dashboard
  };

  const handleLoginSuccess = (session: SellerSession) => {
    setSellerSession(session);
    const stores = getStoredStores();
    const matchedStore = stores.find((s) => s.id === session.storeId) || stores[0];
    if (matchedStore) {
      switchStore(matchedStore); // bypasses guard — session just set above
    }
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    clearSellerSession();
    setSellerSession(null);
    if (activeView === 'dashboard') {
      setActiveView('storefront');
    }
  };

  const handleSuperAdminLoginSuccess = (session: SuperAdminSession) => {
    setSuperAdminSessionState(session);
    setActiveView('superadmin');
    const url = new URL(window.location.href);
    url.searchParams.set('view', 'admin');
    window.history.replaceState({}, '', url.toString());
  };

  const handleSuperAdminLogout = () => {
    clearSuperAdminSession();
    setSuperAdminSessionState(null);
    setActiveView('landing');
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  };

  const handleImpersonateStore = (session: SellerSession) => {
    handleLoginSuccess(session);
  };

  const handleRefreshData = () => {
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
          onOpenCreateStore={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
        />
        <CreateStoreModal
          isOpen={isCreateStoreOpen || (isAuthModalOpen && authModalMode === 'signup')}
          onClose={() => {
            setIsCreateStoreOpen(false);
            setIsAuthModalOpen(false);
          }}
          onStoreCreated={(newStore) => {
            handleStoreCreated(newStore);
          }}
        />
        <SellerAuthModal
          isOpen={isAuthModalOpen && authModalMode === 'login'}
          onClose={() => setIsAuthModalOpen(false)}
          mode={authModalMode}
          initialSlug={authModalSlug}
          onSuccess={(session) => {
            handleLoginSuccess(session);
          }}
          onSwitchMode={(mode) => setAuthModalMode(mode)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 font-sans selection:bg-amber-100 selection:text-amber-900 overflow-x-clip w-full max-w-full">
      {/* App Splash Screen on Initial Load */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      {/* Top Multi-Tenant Navigation Header */}
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
            url.searchParams.set('view', 'admin');
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
        onOpenSuperAdmin={() => {
          if (!superAdminSession) {
            setIsSuperAdminModalOpen(true);
          } else {
            setActiveView('superadmin');
            const url = new URL(window.location.href);
            url.searchParams.set('view', 'admin');
            window.history.replaceState({}, '', url.toString());
          }
        }}
        onLogout={handleLogout}
        isMobileDeviceFrame={isMobileDeviceFrame}
        onToggleMobileDeviceFrame={() => setIsMobileDeviceFrame(!isMobileDeviceFrame)}
      />

      {/* Main View Area */}
      <div className="flex-1">
        {activeView === 'superadmin' && superAdminSession ? (
          /* PLATFORM SUPER ADMIN PORTAL */
          <SuperAdminDashboard
            session={superAdminSession}
            allStores={allStores}
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
            onOpenLanding={() => setActiveView('landing')}
          />
        ) : activeView === 'landing' ? (
          /* PLATFORM LANDING PAGE */
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
            onOpenSuperAdmin={() => {
              if (!superAdminSession) {
                setIsSuperAdminModalOpen(true);
              } else {
                setActiveView('superadmin');
              }
            }}
          />
        ) : activeView === 'storefront' ? (
          isMobileDeviceFrame ? (
            /* Mobile Device Frame Simulation (Shows Instagram/WhatsApp in-app browser view) */
            <div className="py-8 px-4 flex flex-col items-center justify-center bg-slate-800 min-h-[calc(100vh-64px)]">
              <div className="mb-3 text-center">
                <span className="text-xs font-semibold text-slate-300 bg-white/10 px-3 py-1 rounded-full">
                  📱 Mobile Web Simulator (How buyers see your catalog on WhatsApp/Instagram)
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
                  <span className="text-emerald-400">🔒</span>
                  <span>{currentStore.slug}.ta.shop</span>
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
    </div>
  );
}
