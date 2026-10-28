import React, { useCallback, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Eye,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Share2,
  Smartphone,
  Store as StoreIcon,
  User,
  X,
  Zap,
} from 'lucide-react';
import { SellerSession, Store, SuperAdminSession } from '../types';
interface NavigationProps {
  currentStore: Store;
  allStores: Store[];
  activeView: 'landing' | 'storefront' | 'dashboard' | 'superadmin';
  sellerSession: SellerSession | null;
  superAdminSession?: SuperAdminSession | null;
  onViewChange: (view: 'landing' | 'storefront' | 'dashboard' | 'superadmin') => void;
  onSelectStore: (store: Store) => void;
  onOpenCreateStore: () => void;
  onOpenShareModal: () => void;
  onOpenLogin: () => void;
  onOpenSuperAdmin: () => void;
  onLogout: () => void;
  isMobileDeviceFrame: boolean;
  onToggleMobileDeviceFrame: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentStore,
  allStores,
  activeView,
  sellerSession,
  superAdminSession,
  onViewChange,
  onSelectStore,
  onOpenCreateStore,
  onOpenShareModal,
  onOpenLogin,
  onOpenSuperAdmin,
  onLogout,
  isMobileDeviceFrame,
  onToggleMobileDeviceFrame,
}) => {
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── Silent 6-tap easter egg on logo → opens Super Admin ─────────────────
  // Completely invisible: no counter tooltip, no visible count badge
  const [logoTapCount, setLogoTapCount] = useState(0);
  const logoTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = () => {
    const next = logoTapCount + 1;
    setLogoTapCount(next);

    if (logoTapTimer.current) clearTimeout(logoTapTimer.current);

    if (next >= 6) {
      setLogoTapCount(0);
      onOpenSuperAdmin();
    } else {
      // Reset if no subsequent tap within 2 seconds
      logoTapTimer.current = setTimeout(() => {
        setLogoTapCount(0);
        onViewChange('storefront');
      }, 700);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand & Tenant Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={handleLogoTap}
            className="flex items-center gap-2 cursor-pointer group text-left shrink-0 select-none"
            title="Tá.shop"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-xs group-hover:scale-105 transition-transform">
              Tá
            </div>
            <div className="hidden sm:block">
              <div className="flex items-baseline">
                <span className="font-extrabold text-sm tracking-tight text-slate-900">Tá</span>
                <span className="font-extrabold text-sm tracking-tight text-amber-500">.shop</span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">social catalog</span>
            </div>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* ─── Tenant Switcher: ONLY for logged-in sellers or super admin ─── */}
          {(sellerSession || superAdminSession) ? (
            <div className="relative min-w-0">
              <button
                onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition text-left cursor-pointer group max-w-[140px] xs:max-w-[170px] sm:max-w-[200px]"
              >
                <img
                  src={currentStore.logoUrl}
                  alt={currentStore.name}
                  className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                    <span className="truncate">{currentStore.name}</span>
                    {currentStore.verified && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Verified Store" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate hidden xs:block">
                    {currentStore.slug}.ta.shop
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition shrink-0 ml-auto" />
              </button>

              {/* Dropdown Menu */}
              {storeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setStoreDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-xl border border-slate-100 z-40 p-2 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Select Active Storefront
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {allStores.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onSelectStore(s);
                            setStoreDropdownOpen(false);
                            if (activeView === 'landing') {
                              onViewChange('storefront');
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition cursor-pointer ${
                            s.id === currentStore.id
                              ? 'bg-slate-900 text-white font-medium'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <img
                              src={s.logoUrl}
                              alt={s.name}
                              className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-200/40"
                            />
                            <div className="truncate">
                              <div className="truncate font-semibold">{s.name}</div>
                              <div
                                className={`text-[10px] font-mono truncate ${
                                  s.id === currentStore.id ? 'text-slate-300' : 'text-slate-400'
                                }`}
                              >
                                {s.slug}.ta.shop
                              </div>
                            </div>
                          </div>
                          {s.id === currentStore.id && (
                            <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button
                        onClick={() => {
                          setStoreDropdownOpen(false);
                          onOpenCreateStore();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Launch New Storefront</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Buyers: static store identity — no switcher, no navigation away */
            activeView === 'storefront' && (
              <div className="flex items-center gap-2 px-2 py-1.5">
                <img
                  src={currentStore.logoUrl}
                  alt={currentStore.name}
                  className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0"
                />
                <div className="truncate hidden xs:block">
                  <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                    <span className="truncate">{currentStore.name}</span>
                    {currentStore.verified && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Verified Store" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {currentStore.slug}.ta.shop
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Desktop Navigation (Visible on sm screens and up) */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Main View Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => onViewChange('storefront')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeView === 'storefront'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Buyer catalog (No login required)"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Buyer Catalog</span>
            </button>

            <button
              onClick={() => {
                if (!sellerSession) {
                  onOpenLogin();
                } else {
                  onViewChange('dashboard');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeView === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Seller Management Portal"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Seller Portal</span>
            </button>
          </div>

          {/* If on Storefront, provide Phone Mockup simulator toggle */}
          {activeView === 'storefront' && (
            <button
              onClick={onToggleMobileDeviceFrame}
              title={isMobileDeviceFrame ? 'Switch to Full Browser View' : 'Preview as Mobile Phone Screen'}
              className={`p-2 rounded-xl border text-xs font-medium transition cursor-pointer hidden md:flex items-center gap-1.5 ${
                isMobileDeviceFrame
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-800 font-semibold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[11px]">{isMobileDeviceFrame ? 'Mobile Frame' : 'Full Screen'}</span>
            </button>
          )}

          {/* Quick Share / QR Button */}
          {activeView !== 'landing' && (
            <button
              onClick={onOpenShareModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share & QR</span>
            </button>
          )}

          {/* Seller Auth Status / Logout */}
          {sellerSession ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[11px] font-semibold text-slate-600 hidden lg:inline-block max-w-[110px] truncate">
                {sellerSession.email}
              </span>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Log out from seller session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>Seller Login</span>
            </button>
          )}
        </div>

        {/* Mobile Header Right (Zero overflow: Just quick Share + Hamburger Menu) */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {activeView !== 'landing' && (
            <button
              onClick={onOpenShareModal}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
              title="Share store link & QR"
            >
              <Share2 className="w-4 h-4 text-slate-600" />
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              mobileMenuOpen
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer (Slides cleanly over everything at highest z-index) */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150 flex flex-col justify-start">
          <div
            className="absolute inset-0"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative bg-white border-b border-slate-200 shadow-2xl p-4 space-y-4 max-h-[90vh] overflow-y-auto z-10 pb-safe">
            {/* Top Bar with brand and Close X button */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                  Tá
                </div>
                <div>
                  <div className="flex items-baseline">
                    <span className="font-extrabold text-sm text-slate-900">Tá</span>
                    <span className="font-extrabold text-sm text-amber-500">.shop</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block -mt-1 font-mono">social catalog</span>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* View Switcher Segmented Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Navigation View
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onViewChange('storefront');
                    setMobileMenuOpen(false);
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                    activeView === 'storefront'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <span className="block leading-tight">Buyer Catalog</span>
                    <span className="text-[10px] opacity-70 block font-normal">Customer view</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (!sellerSession) {
                      onOpenLogin();
                    } else {
                      onViewChange('dashboard');
                    }
                  }}
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-center gap-2.5 transition cursor-pointer ${
                    activeView === 'dashboard'
                      ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-400" />
                  <div className="text-left">
                    <span className="block leading-tight">Seller Portal</span>
                    <span className="text-[10px] opacity-70 block font-normal">Orders & catalog</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Actions List */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenShareModal();
                }}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2.5 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-500" />
                <span>Share Store Link & QR Code</span>
              </button>

              {/* Only sellers/admins can launch new storefronts */}
              {(sellerSession || superAdminSession) && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenCreateStore();
                  }}
                  className="w-full p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 text-xs font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Launch New Storefront</span>
                </button>
              )}

              {/* Login / Logout */}
              {sellerSession ? (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="truncate">
                    <span className="text-[10px] text-slate-400 block font-semibold">Logged in as seller:</span>
                    <span className="font-bold text-slate-800 truncate">{sellerSession.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <LogIn className="w-4 h-4 text-slate-300" />
                  <span>Merchant Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
