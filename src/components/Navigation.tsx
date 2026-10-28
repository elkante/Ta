import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Eye,
  Home,
  LayoutDashboard,
  LogIn,
  LogOut,
  Plus,
  Share2,
  ShieldCheck,
  Smartphone,
  Store as StoreIcon,
  User,
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

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand & Tenant Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewChange('landing')}
            className="flex items-center gap-2 cursor-pointer group text-left"
            title="Go to Tá.shop Platform Home"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm tracking-tighter shadow-xs group-hover:scale-105 transition-transform">
              Tá
            </div>
            <div className="hidden sm:block">
              <div className="flex items-baseline">
                <span className="font-extrabold text-sm tracking-tight text-slate-900">Tá</span>
                <span className="font-extrabold text-sm tracking-tight text-amber-500">.shop</span>
              </div>
              <span className="text-[10px] text-slate-400 block -mt-1 font-mono">multi-tenant engine</span>
            </div>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Tenant Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100/80 transition text-left cursor-pointer group"
            >
              <img
                src={currentStore.logoUrl}
                alt={currentStore.name}
                className="w-5 h-5 rounded-full object-cover border border-slate-200"
              />
              <div className="max-w-[120px] sm:max-w-[170px]">
                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                  <span className="truncate">{currentStore.name}</span>
                  {currentStore.verified && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Verified Store" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate">
                  tá.shop/{currentStore.slug}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
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
                              tá.shop/{s.slug}
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
        </div>

        {/* Center / Right: View Modes */}
        <div className="flex items-center gap-2">
          {/* Main View Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => onViewChange('landing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeView === 'landing'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Platform Landing Page"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Tá.shop</span>
            </button>

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
              <span className="hidden sm:inline">Buyer Catalog</span>
              <span className="sm:hidden">Store</span>
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
              <span className="hidden sm:inline">Seller Portal</span>
              <span className="sm:hidden">Admin</span>
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
              <span className="hidden sm:inline">Share & QR</span>
            </button>
          )}

          {/* Super Admin Access Button */}
          <button
            onClick={onOpenSuperAdmin}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
              activeView === 'superadmin'
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm font-bold'
                : superAdminSession
                ? 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
            title="Super Admin (Manage All Stores & Website)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden xl:inline text-[11px]">
              {superAdminSession ? 'Super Admin' : 'Admin'}
            </span>
          </button>

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
              <span className="hidden sm:inline">Seller Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
