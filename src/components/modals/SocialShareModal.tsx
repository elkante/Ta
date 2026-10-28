import React, { useState } from 'react';
import { Check, Copy, Download, QrCode, Share2, Sparkles, X } from 'lucide-react';
import { Product, Store } from '../../types';
import { generateQRCodeSVG } from '../../utils/qrCode';
import { formatPrice } from '../../utils/whatsapp';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  product?: Product;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  store,
  product,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState(false);

  if (!isOpen) return null;

  const baseUrl = window.location.origin;
  const targetUrl = product
    ? `${baseUrl}?store=${store.slug}&product=${product.id}`
    : `${baseUrl}?store=${store.slug}`;

  const qrSvg = generateQRCodeSVG(targetUrl, 220, store.accentColor || '#111827', '#ffffff');

  const title = product ? product.name : store.name;
  const description = product
    ? `${formatPrice(product.price, store.currencySymbol)} • ${product.description.slice(0, 110)}...`
    : store.tagline || store.description;
  const image = product ? product.images[0] : store.bannerUrl || store.logoUrl;

  const whatsappStatusText = product
    ? `🛍️ Just listed on ${store.name}: #${product.uid || product.id} - ${product.name} (${formatPrice(product.price, store.currencySymbol)})! Search UID & order on WhatsApp: ${targetUrl}`
    : `✨ Explore our full catalog at ${store.name}! Search by Item UID & order on WhatsApp: ${targetUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyStatus = () => {
    navigator.clipboard.writeText(whatsappStatusText);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2000);
  };

  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handleDownloadQR = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product ? product.slug : store.slug}-qr-code.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = () => {
    const img = new Image();
    const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 0, 0, 600, 600);
        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;
        a.download = `${product ? product.slug : store.slug}-qr-code.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col z-10 pb-safe sm:pb-0">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {product ? 'Share Product' : 'Share Storefront'}
              </h3>
              <p className="text-xs text-slate-500">Live shareable link & printable QR code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* OpenGraph Chat Preview (Simulated WhatsApp/iMessage rich preview) */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Social Link Preview (WhatsApp / iMessage)
            </label>
            <div className="bg-[#f0f2f5] p-3 rounded-xl border border-slate-200/80">
              <div className="bg-white rounded-lg shadow-xs overflow-hidden border border-slate-100">
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                  <img src={image} alt={title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-sm">
                    tá.shop/{store.slug}
                  </span>
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-1">{title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{description}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                    <span>⚡ Instant WhatsApp Catalog Order</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Copy Link */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
              Direct Store URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={targetUrl}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-center">
            <div className="flex items-center justify-between mb-3 text-left">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-slate-700" />
                <span className="text-xs font-semibold text-slate-800">Printable QR Code</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-md border border-slate-200 shadow-2xs"
                  title="Download as PNG for Instagram / WhatsApp stories"
                >
                  <Download className="w-3 h-3" />
                  <span>PNG</span>
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  title="Download as vector SVG"
                >
                  <Download className="w-3 h-3" />
                  <span>SVG</span>
                </button>
              </div>
            </div>

            <div
              className="inline-block p-3 bg-white rounded-xl shadow-xs border border-slate-200"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Scan with any phone camera to instantly open your {product ? 'product' : 'storefront'}.
            </p>
            {isLocalhost && (
              <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-[10px] text-amber-900 text-left space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <span>📱 Local Phone Testing:</span>
                </span>
                <p>
                  Because this is running on <code>localhost</code>, your mobile phone must be on the same Wi-Fi and open the app via your Wi-Fi address (e.g. <code>http://192.168.43.182:3000</code>). In production, this will point directly to your live domain.
                </p>
              </div>
            )}
          </div>

          {/* WhatsApp Status Template */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>WhatsApp Status Pitch</span>
              </label>
              <button
                onClick={handleCopyStatus}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedStatus ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedStatus ? 'Copied' : 'Copy Pitch'}
              </button>
            </div>
            <textarea
              readOnly
              rows={2}
              value={whatsappStatusText}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 font-sans"
            />
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
