import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * PWA Install Banner
 * ─────────────────────────────────────────────────────────────────────
 * Shows a dismissible install prompt at the TOP of the page (above the nav).
 * • Appears on every page load until the user installs or dismisses.
 * • Dismiss hides it for the session only (comes back on refresh).
 * • Once the app is installed ('appinstalled' fires) it never shows again
 *   (we set a persistent localStorage flag).
 * • Shows on any view — storefront, dashboard, wherever — because we
 *   want sellers AND buyers to be able to install.
 */

const INSTALLED_KEY = 'ta_pwa_installed';

interface Props {
  /** If true, the banner will not render at all (e.g. already dismissed this session) */
  forceHide?: boolean;
}

export const PWAInstallBanner: React.FC<Props> = () => {
  // deferredPrompt holds the browser's BeforeInstallPromptEvent
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  // dismissed = user clicked the X this session
  const [dismissed, setDismissed] = useState(false);
  // installed = app was already installed (persistent flag)
  const [installed, setInstalled] = useState(() => {
    try {
      return localStorage.getItem(INSTALLED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Catch the browser's install prompt before it auto-fires
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // Stop the browser's default mini-infobar
      setDeferredPrompt(e);
    };

    // Once installed (from our prompt or browser), set the persistent flag
    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(INSTALLED_KEY, 'true');
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Don't show if: already installed, no prompt captured, or dismissed this session
  if (installed || !deferredPrompt || dismissed) return null;

  return (
    <div
      className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-white px-4 py-2.5 flex items-center justify-between gap-3 shadow-md z-50 relative"
      role="banner"
      aria-label="Install Tá.shop app"
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0 w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <Download className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-tight">Add Tá.shop to your home screen</p>
          <p className="text-xs text-amber-100 leading-tight hidden sm:block">
            Shop &amp; sell faster — works offline, no app store needed
          </p>
        </div>
      </div>

      {/* Right: Install + Dismiss */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="bg-white text-amber-700 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-amber-50 transition cursor-pointer whitespace-nowrap"
        >
          Install Free
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/80 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-white/10"
          aria-label="Dismiss"
          title="Dismiss (shows again on next visit)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
