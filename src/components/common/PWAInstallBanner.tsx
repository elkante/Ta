import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone, Zap, Wifi, Bell } from 'lucide-react';

/**
 * PWA Install Modal
 * ─────────────────────────────────────────────────────────────────────
 * A beautiful bottom-sheet popup modal — shown on the landing page and
 * seller dashboard only (never on the buyer storefront side).
 *
 * Behaviour:
 * • Waits 4 seconds after mount before appearing (non-intrusive delay).
 * • Dismissed for the rest of the session when user clicks X.
 * • Permanently hidden once the browser fires 'appinstalled'.
 * • If the browser doesn't surface a BeforeInstallPromptEvent (e.g. iOS),
 *   show a manual instruction modal instead.
 */

const INSTALLED_KEY = 'ta_pwa_installed';
const DISMISSED_KEY = 'ta_pwa_modal_dismissed';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(() => {
    try { return localStorage.getItem(INSTALLED_KEY) === 'true'; } catch { return false; }
  });
  const [sessionDismissed, setSessionDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISSED_KEY) === 'true'; } catch { return false; }
  });
  // iOS manual instructions state
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch {}
      setInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Delay appearance by 4s — feel non-intrusive
  useEffect(() => {
    if (installed || sessionDismissed || isInStandaloneMode) return;
    // Show for iOS manually OR for browsers that fire the prompt
    const timer = setTimeout(() => {
      if (isIos || deferredPrompt) setVisible(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [installed, sessionDismissed, isInStandaloneMode, deferredPrompt, isIos]);

  // Also show when prompt is captured after initial mount delay
  useEffect(() => {
    if (deferredPrompt && !installed && !sessionDismissed && !isInStandaloneMode) {
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [deferredPrompt, installed, sessionDismissed, isInStandaloneMode]);

  const handleDismiss = () => {
    setVisible(false);
    setSessionDismissed(true);
    try { sessionStorage.setItem(DISMISSED_KEY, 'true'); } catch {}
  };

  const handleInstall = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      try { localStorage.setItem(INSTALLED_KEY, 'true'); } catch {}
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (installed || sessionDismissed || isInStandaloneMode || (!visible && !showIosInstructions)) return null;

  return (
    <>
      {/* Backdrop */}
      {visible && (
        <div
          className="fixed inset-0 z-[900] bg-black/40 backdrop-blur-xs animate-in fade-in duration-300"
          onClick={handleDismiss}
        />
      )}

      {/* Bottom-sheet Modal */}
      {visible && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[901] animate-in slide-in-from-bottom duration-400"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto max-w-lg w-full bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 overflow-hidden">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            {/* Header row */}
            <div className="flex items-start justify-between px-6 pt-4 pb-2">
              <div className="flex items-center gap-3">
                {/* App icon */}
                <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shrink-0">
                  <span className="text-white font-black text-xl leading-none">Tá</span>
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg leading-tight">Tá.shop App</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Free · No app store needed</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0 mt-1"
                aria-label="Dismiss"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-3 gap-3 px-6 py-4">
              {[
                { icon: Zap, label: 'Fast & offline', color: 'text-amber-600 bg-amber-50' },
                { icon: Bell, label: 'Order alerts', color: 'text-blue-600 bg-blue-50' },
                { icon: Wifi, label: 'Works anywhere', color: 'text-emerald-600 bg-emerald-50' },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                  <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="px-6 pb-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Add <strong>Tá.shop</strong> to your home screen for instant access. Manage your store, get order
                notifications, and sell faster — works like a native app, no download required.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="px-6 pb-6 pt-1 flex flex-col gap-2.5">
              <button
                onClick={handleInstall}
                className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm flex items-center justify-center gap-2.5 transition active:scale-[0.98] cursor-pointer shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Add to Home Screen</span>
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm transition cursor-pointer"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Manual Instructions Modal */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-[902] flex items-end justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Install on iPhone / iPad</h3>
              <button onClick={() => { setShowIosInstructions(false); handleDismiss(); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p>Tap the <strong>Share button</strong> <span className="inline-block align-middle">⎙</span> at the bottom of your browser (Safari).</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p>Scroll down and tap <strong>"Add to Home Screen"</strong>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                <p>Tap <strong>"Add"</strong> in the top right corner.</p>
              </div>
            </div>
            <button
              onClick={() => { setShowIosInstructions(false); handleDismiss(); }}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-sm cursor-pointer hover:bg-slate-800 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
