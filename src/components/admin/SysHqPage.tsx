import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { SellerSession, Store, SuperAdminSession } from '../../types';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { setSuperAdminSession, getRootDomain } from '../../utils/storage';
import { supabase } from '../../utils/supabase';

interface SysHqPageProps {
  session: SuperAdminSession | null;
  allStores: Store[];
  onLoginSuccess: (session: SuperAdminSession) => void;
  onLogout: () => void;
  onRefreshData?: () => void;
  onSelectStore?: (store: Store) => void;
  onOpenStorefront?: (slug: string) => void;
  onImpersonateStore?: (session: SellerSession) => void;
  onOpenLanding?: () => void;
}

export const SysHqPage: React.FC<SysHqPageProps> = ({
  session,
  allStores,
  onLoginSuccess,
  onLogout,
  onRefreshData,
  onSelectStore,
  onOpenStorefront,
  onImpersonateStore,
  onOpenLanding,
}) => {
  // If already authenticated, render the full Super Admin Dashboard
  if (session && session.isLoggedIn) {
    return (
      <SuperAdminDashboard
        session={session}
        allStores={allStores}
        onLogout={onLogout}
        onRefreshData={onRefreshData}
        onSelectStore={onSelectStore}
        onOpenStorefront={onOpenStorefront}
        onImpersonateStore={onImpersonateStore}
        onOpenLanding={onOpenLanding}
      />
    );
  }

  // Standalone Full-Page /sys-hq Login Screen
  return (
    <SysHqLoginView
      onLoginSuccess={onLoginSuccess}
      onOpenLanding={onOpenLanding}
    />
  );
};

interface SysHqLoginViewProps {
  onLoginSuccess: (session: SuperAdminSession) => void;
  onOpenLanding?: () => void;
}

const SysHqLoginView: React.FC<SysHqLoginViewProps> = ({
  onLoginSuccess,
  onOpenLanding,
}) => {
  const rootDomain = getRootDomain();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email.trim() || !password.trim()) {
        setError('Please enter both admin email and password.');
        setIsLoading(false);
        return;
      }

      // Authenticate directly against Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError || !data?.session) {
        setError(authError?.message || 'Access Denied: Invalid root administrator credentials.');
        return;
      }

      const superSession: SuperAdminSession = {
        email: data.user.email || email.trim(),
        isLoggedIn: true,
        authenticatedAt: new Date().toISOString(),
      };

      setSuperAdminSession(superSession);
      onLoginSuccess(superSession);
    } catch (err: any) {
      setError(err?.message || 'Authentication error connecting to authorization server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturnHome = () => {
    if (onOpenLanding) {
      onOpenLanding();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-500/10 via-emerald-500/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-[500px] h-[500px] bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-amber-500/5 blur-3xl pointer-events-none" />

      {/* Grid line background overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 px-6 sm:px-10 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black flex items-center justify-center text-sm shadow-lg shadow-amber-500/20">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-tight text-white">Taaa.shop</span>
              <span className="text-slate-500 text-xs font-mono">/</span>
              <span className="font-mono text-xs font-bold text-amber-400 tracking-wider">sys-hq</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">System Governance Portal</span>
          </div>
        </div>

        <button
          onClick={handleReturnHome}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-medium border border-white/10 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Public Store</span>
        </button>
      </header>

      {/* Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-mono font-medium">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>/sys-hq • ROOT ACCESS CONTROL</span>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden">
            <div className="space-y-2 mb-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Shield className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Enter System HQ
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                Dedicated governance terminal for platform architecture, custom domains, and tenant verification.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-300 font-medium flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 font-mono">
                  ROOT ADMINISTRATOR EMAIL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder={`admin@${rootDomain}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-amber-400/60 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/60 font-mono transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 block font-mono">
                    SECURITY KEY / PASSWORD
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">Supabase Auth</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-800 focus:border-amber-400/60 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400/60 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isLoading ? 'Verifying Root Key...' : 'Unlock System HQ (/sys-hq)'}</span>
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Isolated Portal</span>
              </span>
              <span className="font-mono">AES-256 TLS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 text-center text-xs text-slate-600 font-mono border-t border-white/5">
        <span>Taaa.shop Core Systems • Route: /sys-hq • Not indexable</span>
      </footer>
    </div>
  );
};
