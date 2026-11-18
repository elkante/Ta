import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { SuperAdminSession } from '../../types';
import { setSuperAdminSession } from '../../utils/storage';

// Admin credentials are injected via build-time env vars.
// Set VITE_ADMIN_EMAIL and VITE_ADMIN_PASSWORD in your Netlify/Vercel dashboard.
// Falls back to admin@ta.shop for email; password MUST be set in env or login will always fail.
const ADMIN_EMAIL =
  (import.meta as any).env?.VITE_ADMIN_EMAIL || 'admin@ta.shop';
const ADMIN_PASSWORD =
  (import.meta as any).env?.VITE_ADMIN_PASSWORD || '';

interface SuperAdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: SuperAdminSession) => void;
}

export const SuperAdminLoginModal: React.FC<SuperAdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Small artificial delay to prevent timing attacks
    await new Promise((r) => setTimeout(r, 400));

    try {
      if (!email.trim() || !password.trim()) {
        setError('Please enter both admin email and password');
        return;
      }

      if (!ADMIN_PASSWORD) {
        setError('Admin password is not configured. Set VITE_ADMIN_PASSWORD in your environment variables.');
        return;
      }

      const emailMatch = email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const passMatch = password.trim() === ADMIN_PASSWORD;

      if (!emailMatch || !passMatch) {
        setError('Invalid administrator email or password.');
        return;
      }

      const session: SuperAdminSession = {
        email: ADMIN_EMAIL,
        isLoggedIn: true,
        authenticatedAt: new Date().toISOString(),
      };
      setSuperAdminSession(session);
      onLoginSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 z-10 pb-safe sm:pb-0">
        
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight flex items-center gap-2">
                <span>Super Admin Portal</span>
                <span className="bg-amber-400/20 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                  ROOT
                </span>
              </h3>
              <p className="text-xs text-slate-400">Platform Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoFocus
                placeholder={ADMIN_EMAIL}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Master Admin Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5"
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Verifying Credentials...' : 'Authenticate Super Admin'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
