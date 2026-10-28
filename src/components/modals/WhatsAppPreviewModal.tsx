import React, { useState } from 'react';
import { Check, Copy, ExternalLink, MessageCircle, Send, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Store } from '../../types';
import { generateWhatsAppLink } from '../../utils/whatsapp';

interface WhatsAppPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  messageText: string;
  onConfirmSend?: () => void;
}

export const WhatsAppPreviewModal: React.FC<WhatsAppPreviewModalProps> = ({
  isOpen,
  onClose,
  store,
  messageText,
  onConfirmSend,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const waLink = generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, messageText);

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#22c55e', '#15803d', '#10b981'],
    });
    if (onConfirmSend) onConfirmSend();
    window.open(waLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#075e54] text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <MessageCircle className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base leading-none">WhatsApp Order Preview</span>
                <span className="bg-emerald-400/20 text-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium">
                  Direct to Seller
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1">
                To: <span className="font-medium text-white">{store.name}</span> ({store.whatsappCountryCode} {store.whatsappNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WhatsApp Chat Simulated Bubble */}
        <div className="p-5 bg-[#efeae2] bg-opacity-70 space-y-3 max-h-[380px] overflow-y-auto">
          <div className="text-center">
            <span className="text-[11px] font-medium bg-white/80 text-slate-500 px-3 py-1 rounded-full shadow-xs">
              TODAY • READY TO SEND
            </span>
          </div>

          <div className="flex justify-end">
            <div className="bg-[#d9fdd3] text-slate-900 text-sm rounded-xl rounded-tr-none px-4 py-3 shadow-xs max-w-[92%] border border-emerald-100/60 whitespace-pre-wrap font-sans leading-relaxed">
              {messageText}
              <div className="text-[10px] text-emerald-800 text-right mt-2 flex items-center justify-end gap-1 font-mono">
                <span>Just now</span>
                <Check className="w-3 h-3 text-emerald-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleCopy}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 active:scale-[0.98] transition cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Text'}
          </button>

          <button
            onClick={handleOpenWhatsApp}
            className="flex-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-sm shadow-md shadow-emerald-500/20 active:scale-[0.98] transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Open in WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>

        <div className="bg-slate-50 px-5 py-2.5 text-center text-xs text-slate-500 border-t border-slate-100 flex items-center justify-center gap-2">
          <span>🔒 Free order link. No payment info requested until you confirm with the seller.</span>
        </div>
      </div>
    </div>
  );
};
