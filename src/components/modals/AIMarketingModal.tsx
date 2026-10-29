import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Hash,
  Key,
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
  getStoredAIKey,
  getStoreAIUsage,
  incrementStoreAIUsage,
  MarketingTone,
  saveStoredAIKey,
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

  const [aiKey, setAiKey] = useState(getStoredAIKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showKeyPassword, setShowKeyPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStore(store);
  }, [store]);

  const quota = getStoreAIUsage(currentStore);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || {
    name: customName || 'Special Item',
    price: parseFloat(customPrice) || 10000,
    uid: 'TA-SPECIAL',
    category: 'Featured',
  };

  const [result, setResult] = useState<AIMarketingResult | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const trimmedKey = aiKey.trim();
      const isPersonalKey = Boolean(trimmedKey && trimmedKey.startsWith('AIzaSy') && trimmedKey !== getStoredAIKey());

      // If relying on shared Google AI Studio 1M quota and daily cap is reached:
      if (!isPersonalKey && quota.isCapReached) {
        // Generate immediately using local engine
        const offlineResult = generateLocalMarketingContent(selectedProduct, currentStore, tone);
        setResult(offlineResult);
        return;
      }

      const generated = await generateMarketingContentWithAI(
        selectedProduct,
        currentStore,
        tone,
        trimmedKey || undefined
      );
      setResult(generated);

      // Increment quota usage if using shared quota
      if (!isPersonalKey) {
        const { updatedStore } = incrementStoreAIUsage(currentStore);
        updateStore(updatedStore);
        setCurrentStore(updatedStore);
        onStoreUpdated?.(updatedStore);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSaveKey = () => {
    saveStoredAIKey(aiKey);
    setShowKeyInput(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 z-10 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>AI Caption & Hashtag Generator</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-mono font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Google AI Studio
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Generate viral WhatsApp status copy, Instagram posts, TikTok scripts & hashtags in 1 click.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Store AI Quota Counter Strip */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Zap className={`w-3.5 h-3.5 ${quota.isCapReached ? 'text-rose-500' : 'text-amber-500'}`} />
            <span className="font-semibold text-slate-700">
              Daily AI Quota: <strong className="text-slate-900">{quota.used} / {quota.cap}</strong> used today
            </span>
            <span className="text-[11px] text-slate-400 font-medium">({quota.remaining} left • 1M pool)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 sm:w-28 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  quota.isCapReached
                    ? 'bg-rose-500'
                    : quota.used / quota.cap > 0.8
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.round((quota.used / Math.max(1, quota.cap)) * 100))}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-slate-500 font-bold">
              {Math.min(100, Math.round((quota.used / Math.max(1, quota.cap)) * 100))}%
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {quota.isCapReached && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Daily Store AI Quota Reached ({quota.cap}/{quota.cap})</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Your store has used its daily quota from our shared 1M token Google AI Studio pool.
                  Resets tonight at midnight. You can still generate instant viral captions with our offline marketing engine, or use your private key below.
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

            <button
              type="button"
              onClick={() => setShowKeyInput(!showKeyInput)}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer justify-center"
            >
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Google AI Studio Key Config</span>
            </button>
          </div>

          {/* Optional Key Configuration toggle */}
          {showKeyInput && (
            <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Google AI Studio / Gemini API Key</span>
                </label>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  Get free key at aistudio.google.com ↗
                </a>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKeyPassword ? 'text' : 'password'}
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    placeholder="Paste your AI Studio key (starts with AIzaSy...)"
                    className="w-full pl-3 pr-10 py-2 text-xs rounded-xl border border-amber-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5"
                    tabIndex={-1}
                    title={showKeyPassword ? 'Hide key' : 'Show key'}
                  >
                    {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl cursor-pointer shrink-0"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-amber-800">
                Note: Standard Google AI Studio keys start with <code>AIzaSy...</code>. If no external key is active, our built-in high-converting marketing engine produces copy automatically.
              </p>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
};
