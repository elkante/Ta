import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Check,
  ExternalLink,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
  ChevronRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import { PlatformLead, PlatformLeadIntent, PlatformLeadMessage } from '../../types';
import {
  getPlatformBrandName,
  getPlatformSettings,
  getRootDomain,
  savePlatformLead,
} from '../../utils/storage';

interface PlatformLeadBotBubbleProps {
  onOpenSignup: (initialSlug?: string) => void;
  onOpenLogin: () => void;
  onOpenPricing?: () => void;
}

type StepType =
  | 'init'
  | 'human_name'
  | 'human_phone'
  | 'human_note'
  | 'human_done'
  | 'help_usertype'
  | 'help_topic'
  | 'help_details'
  | 'help_contact'
  | 'help_done'
  | 'more_niche'
  | 'more_action'
  | 'signup_brand'
  | 'signup_action'
  | 'general_chat';

export const PlatformLeadBotBubble: React.FC<PlatformLeadBotBubbleProps> = ({
  onOpenSignup,
  onOpenLogin,
  onOpenPricing,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [intent, setIntent] = useState<PlatformLeadIntent | null>(null);
  const [step, setStep] = useState<StepType>('init');

  // Lead capture collected data
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadNote, setLeadNote] = useState('');
  const [leadCategory, setLeadCategory] = useState('');
  const [leadBrand, setLeadBrand] = useState('');
  const [refCode, setRefCode] = useState('');

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const platformName = getPlatformBrandName();
  const rootDomain = getRootDomain();
  const platformSettings = getPlatformSettings();

  const generateRefCode = (prefix: string = 'LEAD') => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `REF-${prefix.toUpperCase()}-${num}`;
  };

  const initialWelcomeText = `Hello! 👋 Welcome to ${platformName}. I am your dedicated platform assistant.\n\nWhether you want to speak with our leadership team, get help, learn how it works, or launch your store in 60 seconds — I'm here to guide you! How can we help you today?`;

  const [messages, setMessages] = useState<PlatformLeadMessage[]>([
    {
      id: 'init-msg',
      sender: 'bot',
      text: initialWelcomeText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowTeaser(false);
    }
  }, [isOpen, messages, isTyping]);

  const addBotMessage = (text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: 'bot',
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 450);
  };

  const addUserMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleRestart = () => {
    setIntent(null);
    setStep('init');
    setLeadName('');
    setLeadPhone('');
    setLeadNote('');
    setLeadCategory('');
    setLeadBrand('');
    setRefCode('');
    setInput('');
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'bot',
        text: initialWelcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Helper to persist finalized lead to SuperAdmin
  const finalizeLead = (
    finalIntent: PlatformLeadIntent,
    code: string,
    extraSummary?: string,
    brand?: string,
    category?: string,
    nameVal?: string,
    phoneVal?: string
  ) => {
    const currentName = nameVal || leadName || 'Website Visitor';
    const currentPhone = phoneVal || leadPhone || '';
    const leadRecord: PlatformLead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      refCode: code,
      intent: finalIntent,
      name: currentName,
      phone: currentPhone,
      storeName: brand || leadBrand || undefined,
      businessType: category || leadCategory || undefined,
      summary:
        extraSummary ||
        `${finalIntent.replace(/_/g, ' ').toUpperCase()} inquiry from ${currentName} (${currentPhone || 'No phone'})`,
      messages: [
        ...messages,
        {
          id: `lead-log-${Date.now()}`,
          sender: 'bot',
          text: `[Lead finalized under Reference: ${code}]`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      status: 'new',
      createdAt: new Date().toISOString(),
    };

    savePlatformLead(leadRecord);
    return leadRecord;
  };

  // Generates a pre-filled direct WhatsApp link to SuperAdmin
  const buildWhatsAppLink = (code: string, customText?: string) => {
    const rawNumber = platformSettings.supportWhatsApp || '+2348039874521';
    const cleanPhone = rawNumber.replace(/[^0-9]/g, '');

    const transcript = messages
      .slice(-6)
      .map((m) => `${m.sender === 'user' ? '👤 Visitor' : '🤖 Bot'}: ${m.text}`)
      .join('\n');

    const messageBody =
      `*Hello ${platformName} Super Admin!*\n` +
      `📌 *Lead Reference:* #${code}\n` +
      `👤 *Name:* ${leadName || 'Visitor'}\n` +
      `📞 *Phone/WhatsApp:* ${leadPhone || 'Not provided'}\n` +
      (leadBrand ? `🏷️ *Proposed Store:* ${leadBrand}\n` : '') +
      (leadCategory ? `📦 *Category:* ${leadCategory}\n` : '') +
      (leadNote ? `💬 *Note:* ${leadNote}\n` : '') +
      `\n*Recent Chat Highlights:*\n${transcript}\n\n` +
      `_Transferred directly via ${platformName} Lead Gen Bot_`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(customText || messageBody)}`;
  };

  // ─── Option Click Handlers ──────────────────────────────────────────────────

  const handleSelectOption = (option: 'talk_to_human' | 'help' | 'tell_me_more' | 'signup') => {
    setHasInteracted(true);
    setIntent(option);

    if (option === 'talk_to_human') {
      addUserMessage('💬 Talk to a Human / Admin');
      setStep('human_name');
      addBotMessage(
        `We'd love to connect you directly with our super admin and onboarding team! 🚀\n\nFirst, what is your full name?`
      );
    } else if (option === 'help') {
      addUserMessage('❓ Help & Support');
      setStep('help_usertype');
      addBotMessage(
        `We're here to assist you! Are you an existing store owner on ${platformName}, or a new visitor looking for answers?`
      );
    } else if (option === 'tell_me_more') {
      addUserMessage('💡 Tell me more about Taaa.shop');
      setStep('more_niche');
      addBotMessage(
        `Welcome to the new era of social selling! 🛍️\n\n${platformName} gives African merchants an instant mobile-optimized storefront with:\n\n• 🤖 Automated WhatsApp order drop bot & printed waybill receipts\n• ⚡ Instant checkout in 2 taps — no back-and-forth messaging\n• ✨ Built-in AI product description & viral captions generator\n• 📦 0% marketplace commission & custom domain support\n\nWhat kind of business or products do you sell?`
      );
    } else if (option === 'signup') {
      addUserMessage('🚀 Sign up / Open a store');
      setStep('signup_brand');
      addBotMessage(
        `Awesome move! Launching your store takes less than 60 seconds. 🎉\n\nWhat is the name of your brand or business?`
      );
    }
  };

  // ─── User Text Submit ───────────────────────────────────────────────────────

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = input.trim();
    if (!val) return;
    setInput('');
    setHasInteracted(true);
    addUserMessage(val);

    // State machine branch progression
    if (step === 'human_name') {
      setLeadName(val);
      setStep('human_phone');
      addBotMessage(
        `Pleasure to meet you, ${val}! What is your WhatsApp number or phone number so our team can reach you right away?`
      );
    } else if (step === 'human_phone') {
      setLeadPhone(val);
      setStep('human_note');
      addBotMessage(
        `Got it! Briefly, what would you like to discuss with our team? (e.g. partnership, custom plan, setup help)`
      );
    } else if (step === 'human_note') {
      setLeadNote(val);
      setStep('human_done');
      const code = generateRefCode('HUMAN');
      setRefCode(code);
      finalizeLead('talk_to_human', code, val, undefined, undefined, leadName, leadPhone);
      addBotMessage(
        `Thank you so much! 🎉 Your inquiry has been assigned **Reference #${code}** and forwarded directly to our Super Admin desk.\n\nOur team replies promptly. You can also tap below right now to chat with our admin directly on WhatsApp with your reference number!`
      );
    } else if (step === 'help_details') {
      setLeadNote(val);
      setStep('help_contact');
      addBotMessage(
        `Understood. What is your name and WhatsApp number so our technical support team can pull up your details and message you?`
      );
    } else if (step === 'help_contact') {
      setLeadPhone(val);
      setStep('help_done');
      const code = generateRefCode('HELP');
      setRefCode(code);
      finalizeLead('help', code, leadNote, undefined, undefined, leadName || 'User', val);
      addBotMessage(
        `Support ticket logged under **Reference #${code}**! Our desk has received your issue.\n\nTap below to open WhatsApp with support right now.`
      );
    } else if (step === 'signup_brand') {
      setLeadBrand(val);
      setStep('signup_action');
      const slugCandidate = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-');
      addBotMessage(
        `Love the name "${val}"! 🌟\n\nYour free store link will be:\n🔗 **${slugCandidate}.${rootDomain}**\n\nWould you like to open your store now, or have our admin team assist you with setup?`
      );
    } else {
      // Free-form intelligent responder
      handleFreeFormMessage(val);
    }
  };

  const handleFreeFormMessage = (text: string) => {
    const q = text.toLowerCase();

    if (q.includes('price') || q.includes('cost') || q.includes('plan') || q.includes('subscription')) {
      addBotMessage(
        `Our pricing is transparent and affordable! 💳\n\n• 🟡 **Basic Plan:** ₦1,500/month (30 products, AI descriptions)\n• 🟢 **Pro Plan:** ₦4,900/month (70 products, Blue Tick badge)\n• 🟣 **Business AI:** ₦15,000/month (100 products, 24/7 WhatsApp AI Bot, Golden Tick)\n• 🌐 **Enterprise:** ₦35,000/month (Unlimited products + Official .ng custom domain)\n• ⚪ **Free Trial:** Get started today for free!`
      );
    } else if (q.includes('whatsapp') || q.includes('bot') || q.includes('waybill') || q.includes('receipt')) {
      addBotMessage(
        `Our WhatsApp bot is magic! 🪄 When a customer places an order on your catalog, it drops the complete waybill with delivery address, item codes, and total into your WhatsApp automatically. No manual calculations needed!`
      );
    } else if (q.includes('cac') || q.includes('verify') || q.includes('badge') || q.includes('blue tick')) {
      addBotMessage(
        `We offer an official Verified Blue Tick badge 🛡️ to protect buyers and boost merchant trust. You can verify your business with your CAC certificate or government document easily in your seller dashboard!`
      );
    } else if (q.includes('human') || q.includes('speak') || q.includes('admin') || q.includes('person') || q.includes('call')) {
      handleSelectOption('talk_to_human');
    } else if (q.includes('sign') || q.includes('start') || q.includes('register') || q.includes('create')) {
      handleSelectOption('signup');
    } else {
      addBotMessage(
        `Thanks for your message! To give you the best experience, would you like to speak directly to our admin team, get help, or start your free store?`
      );
    }
  };

  return (
    <>
      {/* ── Floating Chat Button (Bottom Right) ── */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
        {/* Floating Greeting Pill / Teaser */}
        {showTeaser && !isOpen && (
          <div className="mb-3 max-w-xs bg-slate-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-start gap-2.5 relative group">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTeaser(false);
              }}
              className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-[10px] cursor-pointer shadow-sm"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-100 flex items-center gap-1.5">
                <span>{platformName} Concierge</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Need help, want to talk to our leadership, or ready to launch your store? Tap here!
              </p>
            </div>
          </div>
        )}

        {/* Bubble Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative group flex items-center gap-2.5 px-4 py-3 rounded-full shadow-2xl transition-all duration-300 cursor-pointer ${
            isOpen
              ? 'bg-slate-900 hover:bg-slate-800 text-white ring-4 ring-slate-900/10'
              : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-105 text-slate-950 ring-4 ring-amber-400/20 active:scale-95'
          }`}
          aria-label="Toggle Platform Lead Concierge"
        >
          {isOpen ? (
            <>
              <X className="w-5 h-5 text-slate-200" />
              <span className="text-xs font-bold tracking-tight pr-1">Close</span>
            </>
          ) : (
            <>
              <div className="relative">
                <Bot className="w-5 h-5 text-slate-950" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <span className="text-xs font-black tracking-tight flex items-center gap-1">
                <span>Chat with us</span>
                <Sparkles className="w-3.5 h-3.5 opacity-80" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* ── Interactive Chat Window Modal ── */}
      {isOpen && (
        <div className="fixed inset-x-3 bottom-20 sm:inset-auto sm:bottom-22 sm:right-6 sm:w-[410px] h-[580px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 font-sans">
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-sm">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-white leading-tight">{platformName} Concierge</h4>
                  <span className="text-[9px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.2 rounded-full">
                    Official
                  </span>
                </div>
                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online • Avg reply &lt; 2m</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRestart}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Restart conversation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                title="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reference tracker pill if active */}
          {refCode && (
            <div className="px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-900 text-[11px] font-bold flex items-center justify-between">
              <span>Ticket Reference:</span>
              <span className="font-mono bg-amber-500/20 text-amber-900 px-2 py-0.5 rounded-md text-[10px]">
                #{refCode}
              </span>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
            {messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div key={m.id} className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap break-words ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-br-xs shadow-xs font-medium'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {m.text}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isUser ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-1">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Bot className="w-3 h-3" />
                </div>
                <div className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-2 rounded-2xl">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* ── Guided Quick-Choice Chips ── */}
            {step === 'init' && (
              <div className="pt-2 space-y-1.5 animate-in fade-in duration-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Choose an option:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectOption('talk_to_human')}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 text-slate-800 text-xs font-semibold flex items-center justify-between transition cursor-pointer shadow-2xs group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">💬</span>
                      <span>Talk to human / Super Admin</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOption('help')}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 text-slate-800 text-xs font-semibold flex items-center justify-between transition cursor-pointer shadow-2xs group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">❓</span>
                      <span>Help &amp; Support desk</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOption('tell_me_more')}
                    className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 text-slate-800 text-xs font-semibold flex items-center justify-between transition cursor-pointer shadow-2xs group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">💡</span>
                      <span>Tell me more (How it works)</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectOption('signup')}
                    className="w-full text-left p-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 border border-amber-300 text-amber-950 text-xs font-bold flex items-center justify-between transition cursor-pointer shadow-2xs group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">🚀</span>
                      <span>Sign up &amp; Launch my store</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-amber-700 transition" />
                  </button>
                </div>
              </div>
            )}

            {/* Help User Type Step */}
            {step === 'help_usertype' && (
              <div className="pt-2 space-y-1.5 animate-in fade-in">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Select:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addUserMessage('🏪 I am an existing store owner');
                      setStep('help_details');
                      addBotMessage(
                        `Welcome back! Please write what you need assistance with (e.g. payout, domain, orders, WhatsApp bot, verification):`
                      );
                    }}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-xs font-bold text-slate-800 hover:bg-amber-50 transition cursor-pointer text-left"
                  >
                    🏪 Existing Owner
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      addUserMessage("🌐 I'm a new visitor");
                      setStep('help_details');
                      addBotMessage(
                        `Glad to have you! What questions can our team answer for you today?`
                      );
                    }}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-xs font-bold text-slate-800 hover:bg-amber-50 transition cursor-pointer text-left"
                  >
                    🌐 New Visitor
                  </button>
                </div>
              </div>
            )}

            {/* More Niche Step */}
            {step === 'more_niche' && (
              <div className="pt-1 space-y-1.5 animate-in fade-in">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Pick your category:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '👗 Fashion & Clothes',
                    '🌸 Perfumes & Scents',
                    '💄 Beauty & Skincare',
                    '💍 Jewelry & Accessories',
                    '📱 Phones & Gadgets',
                    '📦 Other Products',
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        addUserMessage(cat);
                        setLeadCategory(cat);
                        setStep('more_action');
                        addBotMessage(
                          `Excellent! ${cat} stores see huge order conversion on ${platformName} because customers tap your link on WhatsApp/IG, pick their size, and send the exact waybill directly to your chat without endless inquiries.\n\nReady to get started?`
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-amber-400 text-xs font-semibold text-slate-700 hover:bg-amber-50 transition cursor-pointer"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* More Action Step */}
            {step === 'more_action' && (
              <div className="pt-2 space-y-2 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSignup();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Launch Free Store Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectOption('talk_to_human');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Connect with Admin for Free Onboarding</span>
                </button>
              </div>
            )}

            {/* Sign Up Action Step */}
            {step === 'signup_action' && (
              <div className="pt-2 space-y-2 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSignup(leadBrand);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Open Store with "{leadBrand}"</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const code = generateRefCode('SIGNUP');
                    setRefCode(code);
                    finalizeLead('signup', code, `Wants setup help for ${leadBrand}`, leadBrand);
                    addBotMessage(
                      `Store registration request logged under **Reference #${code}**!\n\nTap below to send this directly to our Super Admin on WhatsApp.`
                    );
                    setStep('human_done');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <span>💬 Have Admin set it up for me</span>
                </button>
              </div>
            )}

            {/* Completion / WhatsApp Forwarding CTA (for Talk to Human & Help done) */}
            {(step === 'human_done' || step === 'help_done') && refCode && (
              <div className="pt-2 space-y-2 animate-in fade-in">
                <a
                  href={buildWhatsAppLink(refCode)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition"
                >
                  <MessageCircle className="w-4 h-4 shrink-0" />
                  <span>Send Convo to Super Admin on WhatsApp</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>

                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full py-1.5 text-center text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Start another inquiry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                step === 'human_name'
                  ? 'Type your name...'
                  : step === 'human_phone'
                  ? 'Type your WhatsApp or phone...'
                  : step === 'human_note'
                  ? 'What would you like to discuss?'
                  : step === 'signup_brand'
                  ? 'Your brand or store name...'
                  : 'Type a message or select an option...'
              }
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
