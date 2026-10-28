import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Check,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { Product, Store } from '../../types';
import { formatPrice, generateWhatsAppLink } from '../../utils/whatsapp';

interface StoreAIBotBubbleProps {
  store: Store;
  products: Product[];
  onOpenProductDetail?: (product: Product) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  matchedProducts?: Product[];
}

export const StoreAIBotBubble: React.FC<StoreAIBotBubbleProps> = ({
  store,
  products,
  onOpenProductDetail,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const botConfig = store.aiBotConfig || {
    botName: `${store.name.split(' ')[0]} AI Concierge`,
    welcomeMessage: `Hello! 👋 I am your dedicated AI shopping assistant for *${store.name}*. Ask me about our products, sizes, prices, or delivery details!`,
    storeKnowledge: `${store.deliveryInfo} Located at ${store.location}. ${store.announcement || ''}`,
    tone: 'luxury',
    suggestedQuestions: [
      'What are your bestsellers?',
      `Show products under ${store.currencySymbol || '₦'}60,000`,
      'How does delivery work?',
    ],
    enabled: true,
  };

  if (botConfig.enabled === false) return null;

  const initialMessages: Message[] = [
    {
      id: 'init-1',
      sender: 'bot',
      text: botConfig.welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
    }
  }, [isOpen, messages, isTyping]);

  // AI Knowledge Search Engine strictly for this store
  const generateStoreAIResponse = (userPrompt: string): { text: string; matchedProducts?: Product[] } => {
    const q = userPrompt.toLowerCase().trim();

    // 1. Check for specific Item UID match
    const uidMatch = products.find((p) => q.includes(p.uid.toLowerCase()));
    if (uidMatch) {
      return {
        text: `Here are the official details for #${uidMatch.uid}:\n\n` +
          `• Item: ${uidMatch.name}\n` +
          `• Price: ${formatPrice(uidMatch.price, store.currencySymbol)}\n` +
          `• Status: ${uidMatch.inStock ? '✅ In Stock & Ready for Dispatch' : '❌ Currently Sold Out'}\n` +
          `• Description: ${uidMatch.description.slice(0, 120)}...`,
        matchedProducts: [uidMatch],
      };
    }

    // 2. Check for Price / Budget Queries (e.g. "under 50k", "under 100000", "cheap", "affordable")
    const priceUnderMatch = q.match(/(?:under|below|less than|<)\s*(?:₦|\$|£|€)?\s*(\d+)(?:k)?/i);
    if (priceUnderMatch) {
      let limit = parseInt(priceUnderMatch[1], 10);
      if (priceUnderMatch[0].toLowerCase().includes('k')) limit *= 1000;
      const affordable = products.filter((p) => p.price <= limit && p.inStock);

      if (affordable.length > 0) {
        return {
          text: `Here are the top options at *${store.name}* under ${formatPrice(limit, store.currencySymbol)}:`,
          matchedProducts: affordable.slice(0, 3),
        };
      } else {
        return {
          text: `We don't currently have items under ${formatPrice(limit, store.currencySymbol)}. Our lowest priced item is *${products[0]?.name}* at ${formatPrice(products[0]?.price || 0, store.currencySymbol)}.`,
        };
      }
    }

    // 3. Check for Delivery / Shipping / Dispatch / Location queries
    if (
      q.includes('deliver') ||
      q.includes('dispatch') ||
      q.includes('shipping') ||
      q.includes('location') ||
      q.includes('where are you') ||
      q.includes('address') ||
      q.includes('pick up') ||
      q.includes('pickup')
    ) {
      return {
        text: `🚚 *Delivery & Dispatch Information for ${store.name}:*\n\n` +
          `📍 *Store Location:* ${store.location}\n` +
          `📦 *Dispatch Terms:* ${store.deliveryInfo || 'Fast same-day dispatch nationwide.'}\n\n` +
          `${botConfig.storeKnowledge ? `ℹ️ *Store Policies:* ${botConfig.storeKnowledge}\n\n` : ''}` +
          `You can specify your exact delivery landmark when ordering directly on WhatsApp!`,
      };
    }

    // 4. Check for Best Sellers / Popular / Top picks
    if (q.includes('best') || q.includes('popular') || q.includes('top') || q.includes('recommend')) {
      const bestSellers = products.filter((p) => p.badge?.toLowerCase().includes('best') || p.badge?.toLowerCase().includes('top') || p.inquiryCount > 20);
      const toShow = bestSellers.length > 0 ? bestSellers : products.slice(0, 3);
      return {
        text: `🌟 Here are the most coveted bestseller picks at *${store.name}*:`,
        matchedProducts: toShow.slice(0, 3),
      };
    }

    // 5. Check for Category or Product Keyword matches in this store
    const matched = products.filter(
      (p) =>
        q.includes(p.name.toLowerCase()) ||
        q.includes(p.category.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(q))
    );

    if (matched.length > 0) {
      return {
        text: `Here is what we have in stock at *${store.name}* matching your search:`,
        matchedProducts: matched.slice(0, 3),
      };
    }

    // 6. Generic or Store Overview query
    return {
      text: `Thanks for asking! At *${store.name}*, we specialize in authentic, verified products.\n\n` +
        `• We have *${products.length} catalog items* ready for order.\n` +
        `• All items have unique #Item UIDs for fast WhatsApp ordering.\n` +
        `• Dispatch: ${store.deliveryInfo}\n\n` +
        `Feel free to ask me for any product name, budget, or click one of the suggestions below!`,
      matchedProducts: products.slice(0, 2),
    };
  };

  const handleSend = (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate smart AI typing latency
    setTimeout(() => {
      const reply = generateStoreAIResponse(prompt);
      const botMsg: Message = {
        id: `b-${Date.now()}`,
        sender: 'bot',
        text: reply.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        matchedProducts: reply.matchedProducts,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 550);
  };

  const handleReset = () => {
    setMessages(initialMessages);
  };

  return (
    <>
      {/* Floating Bottom-Right Chat Bubble Button */}
      <div className="fixed bottom-6 right-5 z-40 print:hidden">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 p-3.5 sm:px-4 sm:py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-amber-400 cursor-pointer"
            aria-label={`Chat with ${botConfig.botName}`}
          >
            {/* Live Indicator Pulse */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white" />
            </span>

            <div className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
              <Bot className="w-4 h-4" />
            </div>

            <div className="hidden sm:block text-left pr-1">
              <span className="text-xs font-black block leading-tight text-white flex items-center gap-1">
                <span>{botConfig.botName}</span>
                <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
              </span>
              <span className="text-[10px] text-slate-300 block font-medium">
                Ask about products & delivery
              </span>
            </div>
          </button>
        ) : null}
      </div>

      {/* Expanded AI Chat Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[400px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 zoom-in-95 duration-200 print:hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-9 h-9 rounded-full object-cover border border-amber-400/80 bg-white"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                  <span className="truncate">{botConfig.botName}</span>
                  <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded font-mono font-bold">
                    AI
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Strictly trained on {store.name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleReset}
                title="Restart chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {/* Grounding Badge */}
            <div className="text-center">
              <span className="bg-slate-200/80 text-slate-600 text-[10px] font-semibold px-2.5 py-1 rounded-full inline-block">
                🔒 Answering strictly from {store.name}'s live catalog
              </span>
            </div>

            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] p-3 rounded-2xl shadow-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-white text-slate-900 border border-slate-200/80 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs">{m.text}</p>

                  {/* Matched Product Cards */}
                  {m.matchedProducts && m.matchedProducts.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {m.matchedProducts.map((p) => {
                        const whatsappMsg = `Hello ${store.name}, I want to order #${p.uid} - ${p.name} (${formatPrice(p.price, store.currencySymbol)})!`;
                        const whatsappLink = generateWhatsAppLink(
                          store.whatsappCountryCode,
                          store.whatsappNumber,
                          whatsappMsg
                        );

                        return (
                          <div
                            key={p.id}
                            className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={p.images[0] || store.logoUrl}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                              <div className="truncate">
                                <div className="font-bold text-slate-900 text-[11px] truncate">
                                  {p.name}
                                </div>
                                <div className="text-amber-600 font-mono font-bold text-[10px]">
                                  {formatPrice(p.price, store.currencySymbol)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-2xs transition flex items-center gap-1"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Order</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <span
                    className={`block text-[9px] mt-1 text-right ${
                      m.sender === 'user' ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 text-slate-400 p-2 bg-white rounded-2xl w-20 border border-slate-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Questions Chips */}
          <div className="p-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 scrollbar-none shrink-0">
            {botConfig.suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold whitespace-nowrap transition cursor-pointer shrink-0 border border-slate-200/60"
              >
                💬 {q}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder={`Ask ${botConfig.botName}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-100 rounded-full px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-8 h-8 rounded-full bg-slate-900 disabled:opacity-40 text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
            >
              <Send className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
