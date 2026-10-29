import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Package,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';
import { Product, Store } from '../../types';
import { formatPrice } from '../../utils/whatsapp';
import { generateQRCodeSVG } from '../../utils/qrCode';
import { getStoreUrl, getRootDomain } from '../../utils/storage';
import { generateLocalMarketingContent } from '../../utils/aiMarketing';

interface StatusStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  products: Product[];
  initialProduct?: Product | null;
}

type CardTheme = 'luxury-dark' | 'emerald-gold' | 'royal-amber' | 'clean-minimal';

export const StatusStudioModal: React.FC<StatusStudioModalProps> = ({
  isOpen,
  onClose,
  store,
  products = [],
  initialProduct,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || products?.[0]?.id || ''
  );
  const [theme, setTheme] = useState<CardTheme>('luxury-dark');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [customAiCaption, setCustomAiCaption] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Unconditionally sync selected product when initialProduct or products list changes
  useEffect(() => {
    if (initialProduct?.id) {
      setSelectedProductId(initialProduct.id);
    } else if (products && products.length > 0) {
      setSelectedProductId((prev) =>
        products.some((p) => p.id === prev) ? prev : products[0].id
      );
    }
  }, [initialProduct, products]);

  // Unconditionally handle Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Early return ONLY after all React hooks have executed unconditionally
  if (!isOpen) return null;

  // Resolve active product safely
  const selectedProduct: Product | null =
    products.find((p) => p.id === selectedProductId) ||
    initialProduct ||
    products[0] ||
    null;

  // If store has no products yet, render friendly guided empty state
  if (!selectedProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="fixed inset-0" onClick={onClose} />
        <div className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 z-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Products in Catalog Yet</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Add your first product in the Products tab to automatically generate high-resolution vertical WhatsApp Status and Instagram Story cards.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs active:scale-95 transition"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  const images = Array.isArray(selectedProduct.images) ? selectedProduct.images : [];
  const mainImage = images[0] || store.logoUrl || '';

  const productUrl = getStoreUrl(store.slug, { productId: selectedProduct.id });
  const qrSvg = generateQRCodeSVG(productUrl, 160, '#0f172a', '#ffffff');

  // Pre-formatted viral status caption
  const statusCaption = `🛍️ NEW DROP: ${selectedProduct.name}
Code: #${selectedProduct.uid}
Price: ${formatPrice(selectedProduct.price, store.currencySymbol)}

👉 Reply with #${selectedProduct.uid} to order or tap:
${productUrl}`;

  const currentActiveCaption = customAiCaption || statusCaption;

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(currentActiveCaption);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handleAiRewriteCaption = () => {
    const aiContent = generateLocalMarketingContent(selectedProduct, store, 'viral');
    setCustomAiCaption(`${aiContent.whatsappCaption}\n\n${aiContent.hashtags.slice(0, 6).join(' ')}`);
  };

  // High-Resolution 9:16 Canvas PNG Exporter with uploaded logo and no website link text
  const handleDownloadPNG = async () => {
    setIsExporting(true);

    try {
      const canvas = document.createElement('canvas');
      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw Theme Background
      if (theme === 'luxury-dark') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(0.5, '#0f172a');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
      } else if (theme === 'emerald-gold') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#022c22');
        bgGrad.addColorStop(0.6, '#064e3b');
        bgGrad.addColorStop(1, '#022c22');
        ctx.fillStyle = bgGrad;
      } else if (theme === 'royal-amber') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#451a03');
        bgGrad.addColorStop(0.6, '#78350f');
        bgGrad.addColorStop(1, '#1c1917');
        ctx.fillStyle = bgGrad;
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#f8fafc');
        bgGrad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = bgGrad;
      }
      ctx.fillRect(0, 0, width, height);

      // Helper to safely load images
      const loadImage = (url: string): Promise<HTMLImageElement | null> => {
        return new Promise((resolve) => {
          if (!url) return resolve(null);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        });
      };

      const [logoImg, prodImg] = await Promise.all([
        loadImage(store.logoUrl || ''),
        loadImage(mainImage),
      ]);

      // 1. Draw Uploaded Store Logo & Store Title
      if (logoImg) {
        const logoSize = 100;
        const logoX = (width - logoSize) / 2;
        const logoY = 90;

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, 24);
        ctx.clip();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
        ctx.restore();

        // Logo ring
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, 24);
        ctx.stroke();

        // Store Name directly under logo
        ctx.fillStyle = theme === 'clean-minimal' ? '#0f172a' : '#ffffff';
        ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((store.name || 'STORE').toUpperCase(), width / 2, 235);
      } else {
        // Fallback Store Name header without logo
        ctx.fillStyle = theme === 'clean-minimal' ? '#0f172a' : '#ffffff';
        ctx.font = 'bold 50px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((store.name || 'STORE').toUpperCase(), width / 2, 180);
      }

      // 2. Product Image
      const imgX = 90;
      const imgY = 270;
      const imgW = 900;
      const imgH = 900;
      const radius = 48;

      if (prodImg) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, radius);
        ctx.clip();
        ctx.drawImage(prodImg, imgX, imgY, imgW, imgH);
        ctx.restore();

        // Image border ring
        ctx.strokeStyle = theme === 'clean-minimal' ? '#cbd5e1' : 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(imgX, imgY, imgW, imgH, radius);
        ctx.stroke();
      }

      // 3. Item UID Badge (Floating on image)
      const uidBgX = 140;
      const uidBgY = 320;
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(uidBgX, uidBgY, 320, 70, 20);
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 32px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`#${selectedProduct.uid}`, uidBgX + 24, uidBgY + 48);

      // 4. Product Name
      ctx.fillStyle = theme === 'clean-minimal' ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      const cleanName =
        selectedProduct.name.length > 36
          ? `${selectedProduct.name.slice(0, 36)}...`
          : selectedProduct.name;
      ctx.fillText(cleanName, width / 2, 1260);

      // 5. Price Tag Banner
      const priceBgW = 560;
      const priceBgH = 110;
      const priceBgX = (width - priceBgW) / 2;
      const priceBgY = 1320;

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(priceBgX, priceBgY, priceBgW, priceBgH, 30);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.font = '900 58px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        formatPrice(selectedProduct.price, store.currencySymbol),
        width / 2,
        priceBgY + 76
      );

      // 6. Call to action box at bottom (NO "on WhatsApp" text)
      const ctaY = 1500;
      ctx.fillStyle = theme === 'clean-minimal' ? '#ffffff' : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(90, ctaY, 900, 280, 36);
      ctx.fill();
      ctx.strokeStyle = theme === 'clean-minimal' ? '#e2e8f0' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // CTA Text — clean without "on WhatsApp"
      ctx.textAlign = 'left';
      ctx.fillStyle = theme === 'clean-minimal' ? '#0f172a' : '#ffffff';
      ctx.font = 'bold 38px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText('Instant Order', 140, ctaY + 75);

      ctx.fillStyle = '#f59e0b';
      ctx.font = '700 32px monospace';
      ctx.fillText(`Item Code: #${selectedProduct.uid}`, 140, ctaY + 130);

      ctx.fillStyle = theme === 'clean-minimal' ? '#64748b' : '#94a3b8';
      ctx.font = '500 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`Scan QR code with phone camera`, 140, ctaY + 180);

      // 7. QR Code in bottom right of CTA box
      const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
      const qrUrl = URL.createObjectURL(svgBlob);
      const qrImg = await loadImage(qrUrl);
      if (qrImg) {
        ctx.drawImage(qrImg, 760, ctaY + 40, 200, 200);
      }
      URL.revokeObjectURL(qrUrl);

      // 8. Social Media Footer Bar stamped across every exported image
      const socialParts: string[] = [];
      if (store.socialLinks?.instagram) {
        socialParts.push(`IG: @${store.socialLinks.instagram.replace(/^@/, '')}`);
      }
      if (store.socialLinks?.tiktok) {
        socialParts.push(`TikTok: @${store.socialLinks.tiktok.replace(/^@/, '')}`);
      }
      if (store.socialLinks?.facebook) {
        socialParts.push(`FB: @${store.socialLinks.facebook.replace(/^@/, '')}`);
      }
      socialParts.push(`WhatsApp: ${store.whatsappCountryCode || '+234'} ${store.whatsappNumber}`);
      socialParts.push(store.customDomain || `${store.slug}.${getRootDomain()}`);

      const socialText = socialParts.join('   •   ');
      const socialY = 1810;
      ctx.fillStyle = theme === 'clean-minimal' ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(90, socialY, 900, 70, 20);
      ctx.fill();
      ctx.strokeStyle = theme === 'clean-minimal' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = theme === 'clean-minimal' ? '#334155' : '#e2e8f0';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(socialText, width / 2, socialY + 44);

      // Trigger download
      const link = document.createElement('a');
      link.download = `${selectedProduct.uid}-status-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setIsExporting(false);
    } catch (e) {
      console.error('Error generating card', e);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} onTouchEnd={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200 z-10 flex flex-col md:flex-row max-h-[92vh]">
        {/* Modal close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-slate-900/90 text-white shadow-lg border border-white/20 active:scale-95 transition flex items-center justify-center cursor-pointer hover:bg-slate-800"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: 9:16 Story / Status Preview Canvas */}
        <div className="flex-1 bg-slate-900 p-6 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
          </div>

          <div
            className="w-full max-w-[280px] aspect-[9/16] rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-700/80 flex flex-col justify-between p-4 relative text-white"
            style={{
              background:
                theme === 'luxury-dark'
                  ? 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #020617 100%)'
                  : theme === 'emerald-gold'
                  ? 'linear-gradient(180deg, #022c22 0%, #064e3b 50%, #022c22 100%)'
                  : theme === 'royal-amber'
                  ? 'linear-gradient(180deg, #451a03 0%, #78350f 50%, #1c1917 100%)'
                  : 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
              color: theme === 'clean-minimal' ? '#0f172a' : '#ffffff',
            }}
          >
            {/* Top Store Header with uploaded logo */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {store.logoUrl && (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-7 h-7 rounded-lg object-cover border border-amber-400/80 shadow-xs shrink-0"
                />
              )}
              <span className="text-[11px] font-black tracking-wider uppercase truncate">
                {store.name}
              </span>
            </div>

            {/* Product Center Photo with UID Badge */}
            <div className="relative my-auto">
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-black/20 border border-white/10 shadow-lg relative">
                <img
                  src={mainImage}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                {/* UID Sticker */}
                <div className="absolute top-2.5 left-2.5 bg-slate-950/90 border border-amber-400 text-white font-mono text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
                  #{selectedProduct.uid}
                </div>
              </div>

              {/* Product Title & Price */}
              <div className="mt-3 text-center space-y-1.5">
                <h4 className="text-xs font-bold leading-tight line-clamp-1">
                  {selectedProduct.name}
                </h4>
                <div className="inline-block bg-amber-500 text-slate-950 font-black text-sm px-3 py-1 rounded-xl shadow-xs">
                  {formatPrice(selectedProduct.price, store.currencySymbol)}
                </div>
              </div>
            </div>

            {/* Bottom Call to Action + QR Box */}
            <div
              className={`p-2.5 rounded-2xl flex items-center justify-between gap-2 border ${
                theme === 'clean-minimal'
                  ? 'bg-white border-slate-200'
                  : 'bg-white/10 border-white/10'
              }`}
            >
              <div className="truncate">
                <span className="text-[9px] font-bold uppercase tracking-wider block text-amber-400">
                  Instant Order
                </span>
                <span className="text-[10px] font-black font-mono block truncate">
                  Send #{selectedProduct.uid}
                </span>
                <span className="text-[8px] opacity-70 block">
                  Or scan QR code
                </span>
              </div>
              <div
                className="w-12 h-12 bg-white rounded-lg p-1 shrink-0 flex items-center justify-center shadow-xs"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            </div>

            {/* Social Media Footer Strip on preview */}
            <div
              className={`mt-2 px-2.5 py-1.5 rounded-xl flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5 text-[8px] font-medium border text-center ${
                theme === 'clean-minimal'
                  ? 'bg-slate-100/90 text-slate-700 border-slate-200'
                  : 'bg-white/10 text-slate-200 border-white/10'
              }`}
            >
              {store.socialLinks?.instagram && (
                <span className="font-semibold text-amber-300">
                  IG: @{store.socialLinks.instagram.replace(/^@/, '')}
                </span>
              )}
              {store.socialLinks?.tiktok && (
                <span>
                  TT: @{store.socialLinks.tiktok.replace(/^@/, '')}
                </span>
              )}
              <span>
                WA: {store.whatsappCountryCode || '+234'} {store.whatsappNumber}
              </span>
            </div>
          </div>

          <span className="mt-3 text-[11px] text-slate-400 font-medium">
            📱 9:16 Vertical Card for Status & Stories
          </span>
        </div>

        {/* Right: Controls & Actions */}
        <div className="w-full md:w-96 p-6 flex flex-col justify-between bg-white overflow-y-auto space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-base">
                  Status & Story Studio
                </h3>
              </div>
            </div>

            {/* Select Product */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Select Product to Feature
              </label>
              <select
                value={selectedProduct.id}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.uid} - {p.name} ({formatPrice(p.price, store.currencySymbol)})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Visual Theme */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                <span>Card Theme</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'luxury-dark', name: 'Luxury Onyx', dot: 'bg-slate-900' },
                  { id: 'emerald-gold', name: 'Dubai Emerald', dot: 'bg-emerald-900' },
                  { id: 'royal-amber', name: 'Arabian Amber', dot: 'bg-amber-900' },
                  { id: 'clean-minimal', name: 'Minimal White', dot: 'bg-slate-200' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id as CardTheme)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                      theme === th.id
                        ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${th.dot} shrink-0`} />
                    <span className="truncate">{th.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ready-to-Paste Caption + AI Rewrite */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Status Caption & Hashtags</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiRewriteCaption}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200"
                    title="Generate viral marketing copy using AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Rewrite</span>
                  </button>
                  <button
                    onClick={handleCopyCaption}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCaption ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCaption ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                rows={4}
                value={currentActiveCaption}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-mono resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={handleDownloadPNG}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>{isExporting ? 'Generating High-Res Card...' : 'Download 9:16 Image for Status'}</span>
            </button>
            <p className="text-[10px] text-center text-slate-400">
              Includes store logo & scannable QR code. No URL clutter.
            </p>
          </div>
        </div>

        {/* Mobile close strip — visible on small screens */}
        <div className="sm:hidden flex-shrink-0 p-3 border-t border-slate-200 bg-white">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <X className="w-4 h-4" />
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
