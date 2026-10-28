import React, { useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Image,
  Package,
  Phone,
  QrCode,
  Settings,
  Share2,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { Store as StoreType } from '../../types';
import { getStoreDisplayUrl } from '../../utils/storage';

interface OnboardingGuideProps {
  store: StoreType;
  onComplete: () => void;
  onSkip: () => void;
}

interface Step {
  id: string;
  icon: React.ReactNode;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  content: React.ReactNode;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  store,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const storeUrl = getStoreDisplayUrl(store.slug);

  const markDone = (idx: number) => {
    setCompletedSteps((prev) => new Set([...prev, idx]));
  };

  const steps: Step[] = [
    {
      id: 'welcome',
      icon: <Sparkles className="w-8 h-8" />,
      emoji: '🎉',
      title: `Welcome to Tá.shop, ${store.name}!`,
      subtitle: 'Your store is live. Let\'s set it up in 5 quick steps.',
      color: '#b45309',
      bg: 'from-amber-900/40 to-amber-800/20',
      content: (
        <div className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5">
            <p className="text-amber-300 font-semibold text-sm mb-1">Your store is live at:</p>
            <div className="flex items-center gap-3">
              <code className="text-white font-mono text-sm bg-black/30 px-3 py-2 rounded-lg flex-1 break-all">
                {storeUrl}
              </code>
              <a
                href={`?store=${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-amber-400 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Package className="w-5 h-5" />, label: 'Add products', color: 'text-blue-400' },
              { icon: <Phone className="w-5 h-5" />, label: 'Connect WhatsApp', color: 'text-green-400' },
              { icon: <Share2 className="w-5 h-5" />, label: 'Share your store', color: 'text-purple-400' },
              { icon: <ShoppingBag className="w-5 h-5" />, label: 'Receive orders', color: 'text-pink-400' },
            ].map((item, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                <span className={item.color}>{item.icon}</span>
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>

          <p className="text-slate-400 text-sm text-center">
            This guide will walk you through each step. It only takes 5 minutes!
          </p>
        </div>
      ),
    },
    {
      id: 'products',
      icon: <Package className="w-8 h-8" />,
      emoji: '📦',
      title: 'Add Your First Product',
      subtitle: 'Upload a photo, set a price, and you\'re selling.',
      color: '#3b82f6',
      bg: 'from-blue-900/40 to-blue-800/20',
      content: (
        <div className="space-y-5">
          <div className="space-y-3">
            {[
              {
                num: '1',
                title: 'Go to Products tab',
                desc: 'Click the "Products" tab in your dashboard sidebar.',
                icon: <Package className="w-4 h-4 text-blue-400" />,
              },
              {
                num: '2',
                title: 'Click "+ Add Product"',
                desc: 'Fill in the product name, price, and upload a clear photo.',
                icon: <Image className="w-4 h-4 text-blue-400" />,
              },
              {
                num: '3',
                title: 'Add variants (optional)',
                desc: 'If your item comes in sizes or colours, tick the checkboxes under Variants.',
                icon: <CheckCircle2 className="w-4 h-4 text-blue-400" />,
              },
              {
                num: '4',
                title: 'Save & publish',
                desc: 'Hit Save — the product instantly appears in your storefront!',
                icon: <Check className="w-4 h-4 text-blue-400" />,
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 bg-white/5 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 font-bold text-sm">{step.num}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{step.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-300 text-sm">
              💡 <strong>Tip:</strong> Use bright, clear photos on a plain background — products with good photos sell 3× faster.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'whatsapp',
      icon: <Phone className="w-8 h-8" />,
      emoji: '📱',
      title: 'Connect Your WhatsApp',
      subtitle: 'Get order notifications sent straight to your phone.',
      color: '#22c55e',
      bg: 'from-green-900/40 to-green-800/20',
      content: (
        <div className="space-y-5">
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-300 font-semibold text-sm">Free via Baileys (no Meta approval needed)</p>
                <p className="text-slate-400 text-xs mt-1">
                  Tá.shop uses an open-source WhatsApp bridge — just scan a QR code from your phone, and you're connected.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { num: '1', title: 'Open "WhatsApp Bot" tab', desc: 'Find it in your dashboard sidebar (the robot icon).' },
              { num: '2', title: 'Click "Connect WhatsApp"', desc: 'A QR code will appear on screen.' },
              { num: '3', title: 'Scan with your phone', desc: 'Open WhatsApp → 3-dot menu → Linked Devices → Link a device → Scan.' },
              { num: '4', title: 'Done!', desc: 'Every new order will now send you a WhatsApp notification instantly.' },
            ].map((step, i) => (
              <div key={i} className="flex gap-4 bg-white/5 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 font-bold text-sm">{step.num}</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{step.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
            <p className="text-yellow-300 text-sm">
              ⚠️ <strong>Note:</strong> The WhatsApp number you connect is YOUR store number — not your customers' number. You receive the order, they don't need to do anything.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'orders',
      icon: <ShoppingBag className="w-8 h-8" />,
      emoji: '🛍️',
      title: 'Managing Orders',
      subtitle: 'Track, confirm, and fulfil every order from one place.',
      color: '#a855f7',
      bg: 'from-purple-900/40 to-purple-800/20',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                status: 'Pending',
                color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
                desc: 'New order just came in — review it.',
              },
              {
                status: 'Confirmed',
                color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
                desc: 'You\'ve accepted the order — preparing it.',
              },
              {
                status: 'Dispatched',
                color: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
                desc: 'Order is on its way to the customer.',
              },
              {
                status: 'Completed',
                color: 'bg-green-500/20 text-green-300 border-green-500/30',
                desc: 'Delivered & done. Revenue counted ✓',
              },
            ].map((s, i) => (
              <div key={i} className={`flex items-center gap-4 rounded-xl p-3 border ${s.color}`}>
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${s.color}`}>{s.status}</span>
                <span className="text-slate-300 text-sm">{s.desc}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-white font-semibold text-sm">Useful order features:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: <QrCode className="w-4 h-4" />, label: 'Print Waybill', desc: 'Official delivery slip' },
                { icon: <Zap className="w-4 h-4" />, label: 'Status Story', desc: 'Share order update on WhatsApp' },
                { icon: <TrendingUp className="w-4 h-4" />, label: 'Revenue Stats', desc: 'Track sales at a glance' },
                { icon: <Bot className="w-4 h-4" />, label: 'AI Bot', desc: 'Auto-replies to customers' },
              ].map((f, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3 flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-white text-xs font-semibold">{f.label}</p>
                    <p className="text-slate-500 text-xs">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'share',
      icon: <Share2 className="w-8 h-8" />,
      emoji: '🚀',
      title: 'Share & Grow Your Store',
      subtitle: 'Get your link in front of customers right now.',
      color: '#ec4899',
      bg: 'from-pink-900/40 to-pink-800/20',
      content: (
        <div className="space-y-5">
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-2xl p-5 text-center">
            <p className="text-pink-300 font-semibold text-sm mb-2">Your store link</p>
            <code className="text-white font-mono text-sm block break-all">{storeUrl}</code>
          </div>

          <p className="text-slate-300 text-sm font-semibold">Ways to share your store:</p>

          <div className="space-y-3">
            {[
              {
                icon: '📱',
                title: 'WhatsApp Status / Story',
                desc: 'Go to Marketing tab → "Create Status Story" — post a product to your WhatsApp status in one tap.',
              },
              {
                icon: '🔗',
                title: 'Copy Link in Dashboard',
                desc: 'Click "Share Store" in your dashboard — copies the full link + a nice preview message.',
              },
              {
                icon: '📷',
                title: 'QR Code',
                desc: 'Print the QR code from Settings → put it on flyers, bags, receipts, or your shop front.',
              },
              {
                icon: '📊',
                title: 'Instagram / TikTok Bio',
                desc: 'Drop your store URL in your social bio — send people directly to your shop.',
              },
            ].map((tip, i) => (
              <div key={i} className="flex gap-4 bg-white/5 rounded-xl p-4">
                <span className="text-2xl">{tip.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{tip.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{tip.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'settings',
      icon: <Settings className="w-8 h-8" />,
      emoji: '⚙️',
      title: 'Customise Your Store',
      subtitle: 'Make your brand shine — logo, colours, banner & more.',
      color: '#06b6d4',
      bg: 'from-cyan-900/40 to-cyan-800/20',
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3">
            {[
              {
                icon: '🎨',
                title: 'Brand colours & theme',
                desc: 'Settings tab → choose accent colour and theme style (Luxury, Modern, Minimal).',
              },
              {
                icon: '🖼️',
                title: 'Logo & banner',
                desc: 'Upload your logo and a banner image to make your storefront look professional.',
              },
              {
                icon: '📝',
                title: 'Store description',
                desc: 'Write a short bio — customers see this on your storefront and in search results.',
              },
              {
                icon: '🚚',
                title: 'Delivery info',
                desc: 'Add your delivery areas, fees, and estimated time so customers know what to expect.',
              },
              {
                icon: '📢',
                title: 'Announcement banner',
                desc: 'Pin a sale, promo, or delivery notice at the top of your store for everyone to see.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 bg-white/5 rounded-xl p-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleNext = () => {
    markDone(currentStep);
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((p) => p + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep((p) => p - 1);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className={`bg-gradient-to-br ${step.bg} p-6 flex-shrink-0`}>
          <div className="flex items-start justify-between mb-4">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-6 bg-white'
                      : completedSteps.has(i)
                      ? 'w-3 bg-white/60'
                      : 'w-3 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: `${step.color}22`, border: `1px solid ${step.color}44` }}
            >
              {step.emoji}
            </div>
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h2 className="text-white font-bold text-lg leading-tight mt-0.5">{step.title}</h2>
              <p className="text-white/60 text-sm mt-0.5">{step.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {step.content}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between p-5 border-t border-white/10 flex-shrink-0 bg-slate-900">
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={onSkip}
            className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
          >
            Skip guide
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-95"
            style={{ background: step.color }}
          >
            {isLast ? (
              <>
                <Star className="w-4 h-4" />
                Go to Dashboard
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
