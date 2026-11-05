import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Hash,
  MessageCircle,
  Package,
  Search,
  Share2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Product, Store } from '../../types';
import {
  AIMarketingResult,
  generateLocalMarketingContent,
  generateMarketingContentWithAI,
  getStoreAIUsage,
  incrementStoreAIUsage,
  MarketingTone,
} from '../../utils/aiMarketing';
import { updateStore } from '../../utils/storage';

interface AIMarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  products: Product[];
  initialProduct?: Product | null;
  onStoreUpdated?: (updated: Store) => void;
}

export const AIMarketingModal: React.FC<AIMarketingModalProps> = ({
  isOpen,
  onClose,
  store,
  products,
  initialProduct,
  onStoreUpdated,
}) => {
  const [currentStore, setCurrentStore] = useState<Store>(store);
  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProduct?.id || products[0]?.id || ''
  );
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [tone, setTone] = useState<MarketingTone>('viral');
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram' | 'tiktok' | 'hashtags' | 'keywords'>('whatsapp');

  const [isLoading, setIsLoading] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStore(store);
  }, [store]);

  useEffect(() => {
    if (initialProduct?.id) {
      setSelectedProductId(initialProduct.id);
    } else if (products && products.length > 0) {
      setSelectedProductId((prev) =>
        products.some((p) => p.id === prev) ? prev : products[0].id
      );
    }
  }, [initialProduct, products]);

  const quota = getStoreAIUsage(currentStore);
  const isNoAccess = quota.cap === 0; // free & starter tiers

  const selectedProduct = products.find((p) => p.id === selectedProductId) || {
    name: customName || 'Special Item',
    price: parseFloat(customPrice) || 10000,
    uid: 'TA-SPECIAL',
    category: 'Featured',
  };

  const [result, setResult] = useState<AIMarketingResult | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (isNoAccess) return; // should not reach here, but guard anyway
    setIsLoading(true);
    try {
      const generated = await generateMarketingContentWithAI(
        selectedProduct,
        currentStore,
        tone
      );
      setResult(generated);

      if (!quota.isCapReached) {
        const { updatedStore } = incrementStoreAIUsage(currentStore);
        updateStore(updatedStore);
        setCurrentStore(updatedStore);
        onStoreUpdated?.(updatedStore);
      }
    } catch (e) {
      console.error('Marketing generation failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[95vh] sm:max-h-[92vh] my-0 sm:my-auto">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">AI Viral Marketing Studio</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                  Smart Copy
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Generate high-converting WhatsApp broadcasts, Instagram reels & hashtags in seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">

          {/* Free / Starter tier — no access */}
          {isNoAccess ? (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">AI Marketing Studio</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  AI Viral Marketing is available on the <strong>Basic plan and above</strong>.<br />
                  Upgrade your store to generate high-converting WhatsApp, Instagram &amp; TikTok captions powered by AI.
                </p>
              </div>
              <div className="flex flex-col gap-1.5 text-xs text-slate-600 bg-slate-50 rounded-2xl border border-slate-200 p-4 w-full max-w-sm text-left">
                <p className="font-bold text-slate-800 mb-1">Plan limits:</p>
                <p>🟡 <strong>Basic</strong> — 5 AI generations / day</p>
                <p>🟢 <strong>Pro</strong> — 15 AI generations / day</p>
                <p>🔵 <strong>Business</strong> — 30 AI generations / day</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Close &amp; Upgrade Plan
              </button>
            </div>
          ) : (
            <>
          {/* Daily Quota Counter */}
          <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-slate-600 font-medium">Daily Store AI Quota:</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">
                {quota.remaining} generations left today
              </span>
              <span className="text-[11px] text-slate-400">({quota.used}/{quota.cap} used)</span>
            </div>
          </div>

          {quota.isCapReached && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Daily Store AI Quota Reached ({quota.cap}/{quota.cap})</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Your store has used its daily quota. Resets tonight at midnight. You can still generate instant viral captions with our built-in marketing engine.
                </p>
              </div>
            </div>
          )}

          {/* Product & Tone Selection Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Choose Product from Catalog:
              </label>
              {products.length > 0 ? (
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.uid})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Gold pendant, Luxury perfume"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Select Marketing Tone:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: 'viral', label: '🔥 Hype' },
                  { id: 'luxury', label: '✨ Luxury' },
                  { id: 'urgent', label: '🚨 Urgent' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTone(t.id as MarketingTone)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition cursor-pointer text-center ${
                      tone === t.id
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isLoading}
              className="py-2.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition active:scale-95"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-400" />
              )}
              <span>{result ? 'Regenerate Content' : 'Generate Viral Content with AI'}</span>
            </button>
          </div>

          {/* Generated Result Preview */}
          {result && (
            <div className="space-y-3 pt-2">
              {/* Output Tab switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-bold">
                {[
                  { id: 'whatsapp', label: '📲 WhatsApp' },
                  { id: 'instagram', label: '📸 Instagram' },
                  { id: 'tiktok', label: '🎵 TikTok' },
                  { id: 'hashtags', label: '🏷️ Hashtags' },
                  { id: 'keywords', label: '🔍 Keywords' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id as any)}
                    className={`py-1.5 px-3 rounded-lg transition whitespace-nowrap cursor-pointer ${
                      activeTab === t.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Content Panel */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                {activeTab === 'whatsapp' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                        <span>Ready for WhatsApp Status & Broadcast:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.whatsappCaption, 'whatsapp')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === 'whatsapp' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedType === 'whatsapp' ? 'Copied!' : 'Copy Caption'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={7}
                      value={result.whatsappCaption}
                      className="w-full p-3 text-xs font-sans rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                )}

                {activeTab === 'instagram' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-pink-800 flex items-center gap-1.5">
                        <Share2 className="w-4 h-4 text-pink-600" />
                        <span>Instagram & Facebook Caption:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.instagramCaption, 'instagram')}
                        className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === 'instagram' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedType === 'instagram' ? 'Copied!' : 'Copy Caption'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={7}
                      value={result.instagramCaption}
                      className="w-full p-3 text-xs font-sans rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                )}

                {activeTab === 'tiktok' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-slate-900" />
                        <span>TikTok Short Script & Caption:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.tiktokCaption, 'tiktok')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === 'tiktok' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedType === 'tiktok' ? 'Copied!' : 'Copy Caption'}</span>
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={result.tiktokCaption}
                      className="w-full p-3 text-xs font-sans rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none resize-none leading-relaxed"
                    />
                  </div>
                )}

                {activeTab === 'hashtags' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Hash className="w-4 h-4 text-indigo-600" />
                        <span>High-Reach Nigerian & Global Hashtags:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.hashtags.join(' '), 'hashtags')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === 'hashtags' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedType === 'hashtags' ? 'Copied All!' : 'Copy All Hashtags'}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-slate-200">
                      {result.hashtags.map((h, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleCopy(h, `tag-${i}`)}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
                          title="Click to copy single hashtag"
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'keywords' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-slate-600" />
                        <span>Search Discovery Keywords:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(result.keywords.join(', '), 'keywords')}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        {copiedType === 'keywords' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedType === 'keywords' ? 'Copied All!' : 'Copy Keywords'}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-slate-200">
                      {result.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
