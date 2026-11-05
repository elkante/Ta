import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCheck,
  Clock,
  Copy,
  ExternalLink,
  MessageCircle,
  Pause,
  Phone,
  Play,
  Plus,
  QrCode,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserX,
  Wifi,
  Zap,
} from 'lucide-react';
import { Product, Store, StoreAIBotConfig } from '../../types';
import { formatPrice } from '../../utils/whatsapp';
import { getStoreDisplayUrl, getStoreUrl, updateStore, getRootDomain } from '../../utils/storage';
import { generateQRCodeSVG } from '../../utils/qrCode';

interface WhatsAppBotStudioProps {
  store: Store;
  products: Product[];
  onRefreshData?: () => void;
  onUpgrade?: (plan?: 'starter' | 'basic' | 'pro' | 'business') => void;
  onOpenBilling?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'bot';
  text: string;
  timestamp: string;
  productCard?: {
    product: Product;
    checkoutUrl: string;
  };
}

export const WhatsAppBotStudio: React.FC<WhatsAppBotStudioProps> = ({
  store,
  products,
  onRefreshData,
  onUpgrade,
  onOpenBilling,
}) => {
  const displayUrl = getStoreDisplayUrl(store.slug);
  const webhookUrl = `https://api.${getRootDomain()}/v1/webhook/whatsapp/${store.slug}`;
  const webhookSecret = `ta_live_whsec_${store.id.replace('store_', '')}_9921`;

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [qrScannedConfirming, setQrScannedConfirming] = useState(false);

  // Existing bot configuration or defaults
  const existingConfig = store.aiBotConfig || {
    botName: `${store.name.split(' ')[0]} AI Assistant`,
    welcomeMessage: `Hello! 👋 Welcome to ${store.name}. Drop any Item UID (e.g. #${products[0]?.uid || 'TA-BR540'}) or ask about products, prices, and delivery!`,
    storeKnowledge: `Dispatch: ${store.deliveryInfo || 'Fast same-day dispatch.'} Location: ${store.location}. ${store.announcement || ''}`,
    tone: 'luxury',
    suggestedQuestions: [
      'What are your bestsellers?',
      `Any items under ${store.currencySymbol}50,000?`,
      'Delivery options and locations',
    ],
    enabled: false,
    isPaused: false,
    pausedUntil: null,
    replyTriggerMode: 'commerce_only',
    ignoredPhones: [],
  };

  // Editable Bot State
  const [botName, setBotName] = useState(existingConfig.botName);
  const [welcomeMessage, setWelcomeMessage] = useState(existingConfig.welcomeMessage);
  const [storeKnowledge, setStoreKnowledge] = useState(existingConfig.storeKnowledge);
  const [botTone, setBotTone] = useState<'luxury' | 'friendly' | 'fast' | 'professional'>(existingConfig.tone);
  const [bubbleEnabled, setBubbleEnabled] = useState(existingConfig.enabled);
  const [isPaused, setIsPaused] = useState(Boolean(existingConfig.isPaused));
  const [pausedUntil, setPausedUntil] = useState<string | null>(existingConfig.pausedUntil || null);
  const [replyTriggerMode, setReplyTriggerMode] = useState<'always' | 'commerce_only'>(existingConfig.replyTriggerMode || 'commerce_only');
  const [ignoredPhones, setIgnoredPhones] = useState<string[]>(existingConfig.ignoredPhones || []);
  const [newIgnoredPhone, setNewIgnoredPhone] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Baileys WhatsApp Connection State (persisted so logout/reload never breaks pairing)
  const isPreviouslyConnected = Boolean(
    store.aiBotConfig?.whatsappConnected ||
    store.whatsappBotConnected ||
    (typeof localStorage !== 'undefined' && localStorage.getItem(`ta_wa_conn_${store.id}`) === '1')
  );

  const PRIMARY_RENDER_ENDPOINT = 'https://ta-whatsapp-bot.onrender.com';
  const LOCAL_ENDPOINT = 'http://localhost:3001';

  const [baileysStatus, setBaileysStatus] = useState<'disconnected' | 'waiting_scan' | 'connected'>(
    isPreviouslyConnected ? 'connected' : 'disconnected'
  );
  const [baileysQr, setBaileysQr] = useState<string | null>(null);
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(
    store.aiBotConfig?.whatsappPhone || store.whatsappBotPhone || null
  );
  const [serverEndpoint, setServerEndpoint] = useState<string>(
    (import.meta as any).env?.VITE_BAILEYS_SERVER_URL || PRIMARY_RENDER_ENDPOINT
  );
  const normalizeNigerianPhone = (raw: string): string => {
    let clean = String(raw || '').replace(/\D/g, '');
    if (clean.startsWith('2340') && clean.length === 14) {
      clean = '234' + clean.slice(4);
    } else if (clean.startsWith('0') && (clean.length === 11 || clean.length === 10)) {
      clean = '234' + clean.slice(1);
    } else if (!clean.startsWith('234') && clean.length === 10) {
      clean = '234' + clean;
    }
    return clean;
  };

  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'waking' | 'offline'>('checking');
  const [pairingMethod, setPairingMethod] = useState<'qr' | 'code'>('qr');
  const [pairingPhone, setPairingPhone] = useState<string>(() => {
    return normalizeNigerianPhone(`${store.whatsappCountryCode || '+234'}${store.whatsappNumber || ''}`);
  });
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingCodeLoading, setPairingCodeLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [serverMessage, setServerMessage] = useState<string>('');
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);
  const hasSyncedMetadataRef = useRef(false);
  const pairingRetryCountRef = useRef(0);
  const baileysQrRef = useRef<string | null>(null);
  const pairingCodeRef = useRef<string | null>(null);
  const isRequestingCodeRef = useRef(false);

  useEffect(() => {
    baileysQrRef.current = baileysQr;
  }, [baileysQr]);
  useEffect(() => {
    pairingCodeRef.current = pairingCode;
  }, [pairingCode]);

  // Strip large media and data URLs from catalog to keep payloads tiny (<10KB) and prevent 413 Payload Too Large
  const sanitizeCatalogForBot = useCallback((rawProducts: Product[]) => {
    if (!Array.isArray(rawProducts)) return [];
    return rawProducts.slice(0, 150).map((p) => ({
      id: p.id,
      uid: p.uid || p.id,
      name: p.name || '',
      price: p.price || 0,
      category: p.category || '',
      inStock: typeof p.inStock === 'boolean' ? p.inStock : true,
      description: (p.description || '').slice(0, 200),
    }));
  }, []);

  // Auto-detect whether local server or Render is responsive
  useEffect(() => {
    let isMounted = true;
    const detectEndpoint = async () => {
      const explicitEnv = (import.meta as any).env?.VITE_BAILEYS_SERVER_URL;
      if (explicitEnv) {
        setServerEndpoint(explicitEnv);
        setServerStatus('online');
        return;
      }

      const isLocalHost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

      if (isLocalHost) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 1200);
          const localRes = await fetch(`${LOCAL_ENDPOINT}/health`, { signal: ctrl.signal });
          clearTimeout(t);
          if (localRes.ok && isMounted) {
            setServerEndpoint(LOCAL_ENDPOINT);
            setServerStatus('online');
            return;
          }
        } catch (e) {
          // local server not running, continue to Render
        }
      }

      // Check Render endpoint
      try {
        setServerStatus('checking');
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const renderRes = await fetch(`${PRIMARY_RENDER_ENDPOINT}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (renderRes.ok && isMounted) {
          setServerEndpoint(PRIMARY_RENDER_ENDPOINT);
          setServerStatus('online');
        } else if (isMounted) {
          setServerEndpoint(PRIMARY_RENDER_ENDPOINT);
          setServerStatus('waking');
        }
      } catch (e) {
        if (isMounted) {
          setServerEndpoint(PRIMARY_RENDER_ENDPOINT);
          setServerStatus('waking');
        }
      }
    };

    detectEndpoint();
    return () => {
      isMounted = false;
    };
  }, []);

  // Helper: persist connected state and update store record
  const handleConnectedEvent = React.useCallback((phone: string) => {
    setBaileysStatus('connected');
    setBaileysQr(null);
    setPairingCode(null);
    setQrScannedConfirming(false);
    const resolvedPhone = phone || `${store.whatsappCountryCode || '+234'} ${store.whatsappNumber || ''}`;
    setConnectedPhone(resolvedPhone);
    setServerStatus('online');
    try { localStorage.setItem(`ta_wa_conn_${store.id}`, '1'); } catch (e) {}
    if (!store.aiBotConfig?.whatsappConnected || !store.whatsappBotConnected) {
      const updatedConfig: StoreAIBotConfig = {
        ...(store.aiBotConfig || existingConfig),
        whatsappConnected: true,
        whatsappPhone: resolvedPhone,
        lastConnectedAt: new Date().toISOString(),
      };
      updateStore({ ...store, aiBotConfig: updatedConfig, whatsappBotConnected: true, whatsappBotPhone: resolvedPhone });
      if (onRefreshData) onRefreshData();
    }
  }, [store, existingConfig, onRefreshData]);

  // SSE: subscribe for instant server push events (QR, connected, reconnecting)
  useEffect(() => {
    if (baileysStatus !== 'waiting_scan') return;
    let es: EventSource | null = null;
    // Auto-reset timeout: if stuck in "confirming" for >25s, go back to fresh QR request
    let confirmingTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      es = new EventSource(`${serverEndpoint}/api/whatsapp/events/${store.id}`);

      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data.status === 'connected') {
            if (confirmingTimeout) clearTimeout(confirmingTimeout);
            handleConnectedEvent(data.phone || '');
          } else if (data.status === 'waiting_scan' && data.qrDataUrl) {
            // New QR arrived (after a failed scan attempt) — reset confirming state
            if (confirmingTimeout) clearTimeout(confirmingTimeout);
            setBaileysQr(data.qrDataUrl);
            setQrScannedConfirming(false);
            setServerMessage('New QR ready — scan this one with WhatsApp.');
            setServerStatus('online');
          } else if (data.event === 'reconnecting') {
            // QR was scanned or Pairing Code was entered on phone — WhatsApp is confirming
            setQrScannedConfirming(true);
            setServerMessage(pairingMethod === 'code' ? 'Code entered on phone! 📱 Linking WhatsApp...' : 'QR scanned! Confirming pairing with WhatsApp...');
            if (confirmingTimeout) clearTimeout(confirmingTimeout);
            confirmingTimeout = setTimeout(() => {
              // Timed out — pairing failed
              setQrScannedConfirming(false);
              setBaileysQr(null);
              setServerMessage('Pairing timed out. Please try again.');
              if (pairingMethod === 'qr') handleStartBaileysPairing();
            }, 30000);
          } else if (data.event === 'connecting') {
            // Plain reconnect (not scan-related) — keep existing QR visible to avoid flickering
            setQrScannedConfirming(false);
            setServerMessage('Connecting to WhatsApp gateway...');
          }
        } catch (e) {}
      };

      es.onerror = () => {
        es?.close();
      };
    } catch (e) {
      // Browser doesn't support SSE — polling covers it
    }

    return () => {
      es?.close();
      if (confirmingTimeout) clearTimeout(confirmingTimeout);
    };
  }, [baileysStatus, serverEndpoint, store.id, handleConnectedEvent]);

  // Fast fallback polling (every 1.2s) when waiting for scan — covers SSE gaps
  useEffect(() => {
    let interval: any = null;

    const checkStatus = async () => {
      // Don't poll while user is waiting for a pairing code generation response
      if (isRequestingCodeRef.current) return;

      try {
        const res = await fetch(`${serverEndpoint}/api/whatsapp/status/${store.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.connected && data.phone) {
          handleConnectedEvent(data.phone || '');
          if (!hasSyncedMetadataRef.current) {
            hasSyncedMetadataRef.current = true;
            fetch(`${serverEndpoint}/api/whatsapp/sync/${store.id}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                catalog: sanitizeCatalogForBot(products),
                storeInfo: {
                  name: store.name,
                  slug: store.slug,
                  customDomain: store.customDomain,
                  deliveryInfo: store.deliveryInfo,
                  location: store.location,
                  openHours: store.openHours,
                },
              }),
            }).catch(() => {});
          }
        } else {
          // If server reports disconnected, do not falsely pretend to be connected!
          if (baileysStatus === 'connected' && !data.connected && data.status !== 'connecting') {
            setBaileysStatus('disconnected');
            setConnectedPhone(null);
            try { localStorage.removeItem(`ta_wa_conn_${store.id}`); } catch (e) {}
          }
          if (data.qrDataUrl && baileysStatus === 'waiting_scan' && pairingMethod === 'qr') {
            setBaileysQr((prev) => (prev === data.qrDataUrl ? prev : data.qrDataUrl));
            setQrScannedConfirming(false);
            setServerMessage('');
            setServerStatus('online');
          } else if ((data.status === 'connecting') && baileysStatus === 'waiting_scan' && (baileysQrRef.current || pairingCodeRef.current)) {
            // QR was scanned or Pairing Code entered — Baileys is reconnecting to confirm it
            setQrScannedConfirming(true);
            setServerMessage(pairingMethod === 'code' ? 'Code entered on phone! 📱 Linking WhatsApp...' : 'QR scanned! Confirming pairing with WhatsApp...');
          }
        }
      } catch (e) {
        // server asleep or not reachable
      }
    };

    // Always check once on mount to verify actual live session
    checkStatus();

    if (baileysStatus === 'waiting_scan') {
      interval = setInterval(checkStatus, 1500); // poll every 1.5s
    }

    return () => { if (interval) clearInterval(interval); };
  }, [baileysStatus, serverEndpoint, store.id, handleConnectedEvent, pairingMethod, sanitizeCatalogForBot]);

  const handleStartBaileysPairing = async (forceRefresh = true) => {
    if (store.tier === 'free' || store.tier === 'starter') {
      onUpgrade?.('business');
      return;
    }
    setIsPairingLoading(true);
    setPairingError(null);
    setBaileysStatus('waiting_scan');
    setBaileysQr(null);
    setPairingCode(null);
    setQrScannedConfirming(false);
    setServerMessage('Generating live WhatsApp pairing QR code...');

    try {
      const res = await fetch(`${serverEndpoint}/api/whatsapp/connect/${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRefresh: true, // Always start fresh pairing handshake
          storeInfo: {
            name: store.name,
            slug: store.slug,
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      pairingRetryCountRef.current = 0;
      setServerStatus('online');
      if (data.connected && data.phone) {
        handleConnectedEvent(data.phone);
      } else if (data.qrDataUrl) {
        setBaileysQr(data.qrDataUrl);
        setServerMessage('Scan this QR code with WhatsApp on your phone!');
      } else {
        setServerMessage('Generating live WhatsApp pairing QR code...');
      }
    } catch (e: any) {
      console.warn('Pairing error:', e?.message);
      const isClientError = e?.message && /4\d\d/.test(e.message);
      if (isClientError) {
        setPairingError(e.message || 'WhatsApp gateway error. Please try again.');
        setServerMessage('');
        setIsPairingLoading(false);
        return;
      }
      pairingRetryCountRef.current += 1;
      if (pairingRetryCountRef.current <= 2 && !baileysQrRef.current) {
        setServerStatus('waking');
        setServerMessage('WhatsApp bot server is warming up on Render... retrying automatically');
        setTimeout(() => {
          if (baileysStatus === 'waiting_scan' && !baileysQrRef.current) {
            handleStartBaileysPairing(true);
          }
        }, 5000);
      } else {
        if (!baileysQrRef.current) {
          setPairingError('WhatsApp server is taking longer than usual to wake. Please click "Refresh QR Code" to try again.');
        }
        setServerMessage('');
        setIsPairingLoading(false);
      }
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleRequestPairingCode = async () => {
    const clean = normalizeNigerianPhone(pairingPhone);

    if (!clean || clean.length < 8) {
      setPairingError('Please enter a valid WhatsApp phone number (e.g. 08012345678 or 2348012345678).');
      return;
    }
    setPairingPhone(clean);
    setPairingCodeLoading(true);
    setPairingError(null);
    setPairingCode(null);
    setBaileysQr(null);
    setBaileysStatus('waiting_scan');
    setServerMessage(`Requesting 8-digit WhatsApp pairing code for +${clean}...`);
    isRequestingCodeRef.current = true;

    try {
      const res = await fetch(`${serverEndpoint}/api/whatsapp/pairing-code/${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: clean,
          storeInfo: {
            name: store.name,
            slug: store.slug,
          },
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (_) {}

      if (data.pairingCode) {
        setPairingCode(data.pairingCode);
        setServerMessage('Enter this code in WhatsApp -> Linked Devices -> Link with phone number');
      } else if (data.connected && data.phone) {
        handleConnectedEvent(data.phone);
      } else if (data.error) {
        setPairingError(data.error);
      } else if (!res.ok) {
        if (res.status === 413) {
          setPairingError('Product catalog payload too large. Please retry now that the catalog is optimized.');
        } else {
          setPairingError(`Server responded with ${res.status}: ${data.error || res.statusText || 'Unable to generate code'}. Please try scanning the QR code.`);
        }
      }
    } catch (e: any) {
      setPairingError('Failed to generate pairing code. Please ensure the WhatsApp bot server is running or try scanning the QR code.');
    } finally {
      setPairingCodeLoading(false);
      isRequestingCodeRef.current = false;
    }
  };

  const handleCopyPairingCode = () => {
    if (pairingCode) {
      navigator.clipboard.writeText(pairingCode.replace(/-/g, ''));
      setCopiedPairingCode(true);
      setTimeout(() => setCopiedPairingCode(false), 2000);
    }
  };

  const handleDisconnectBaileys = async () => {
    try {
      localStorage.removeItem(`ta_wa_conn_${store.id}`);
    } catch (e) {}
    try {
      await fetch(`${serverEndpoint}/api/whatsapp/disconnect/${store.id}`, { method: 'POST' });
    } catch (e) {}
    setBaileysStatus('disconnected');
    setBaileysQr(null);
    setPairingCode(null);
    setConnectedPhone(null);
    const updatedConfig: StoreAIBotConfig = {
      ...(store.aiBotConfig || existingConfig),
      whatsappConnected: false,
      whatsappPhone: undefined,
    };
    updateStore({
      ...store,
      aiBotConfig: updatedConfig,
      whatsappBotConnected: false,
      whatsappBotPhone: undefined,
    });
    if (onRefreshData) onRefreshData();
  };

  // Chat Simulator State
  const initialChat: ChatMessage[] = [
    {
      id: 'm1',
      sender: 'buyer',
      text: `Hello, how much is #${products[0]?.uid || 'TA-BR540'}?`,
      timestamp: '10:42 AM',
    },
    {
      id: 'm2',
      sender: 'bot',
      text: `Hello! 👋 Thanks for reaching out to *${store.name}*.\n\nHere are the details for your inquiry:`,
      timestamp: '10:42 AM',
      productCard: products[0]
        ? {
            product: products[0],
            checkoutUrl: getStoreUrl(store.slug, { productId: products[0].id }),
          }
        : undefined,
    },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialChat);
  const [inputMessage, setInputMessage] = useState('');

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhookSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleSaveBotSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedConfig: StoreAIBotConfig = {
      botName: botName.trim() || `${store.name} AI`,
      welcomeMessage: welcomeMessage.trim(),
      storeKnowledge: storeKnowledge.trim(),
      tone: botTone,
      suggestedQuestions: existingConfig.suggestedQuestions,
      enabled: bubbleEnabled,
      isPaused,
      pausedUntil,
      replyTriggerMode,
      ignoredPhones,
    };

    const updatedStore: Store = {
      ...store,
      aiBotConfig: updatedConfig,
    };

    updateStore(updatedStore);
    if (onRefreshData) onRefreshData();

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTogglePause = (paused: boolean, durationHours?: number) => {
    let until: string | null = null;
    if (paused && durationHours) {
      until = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();
    }
    setIsPaused(paused);
    setPausedUntil(until);

    const updatedConfig: StoreAIBotConfig = {
      ...(store.aiBotConfig || existingConfig),
      isPaused: paused,
      pausedUntil: until,
      replyTriggerMode,
      ignoredPhones,
    };

    updateStore({
      ...store,
      aiBotConfig: updatedConfig,
    });

    if (serverEndpoint) {
      fetch(`${serverEndpoint}/api/whatsapp/sync/${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPaused: paused,
          pausedUntil: until,
          replyTriggerMode,
          ignoredPhones,
        }),
      }).catch(() => {});
    }

    if (onRefreshData) onRefreshData();
  };

  const handleAddIgnoredPhone = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newIgnoredPhone.replace(/\D/g, '');
    if (!clean || clean.length < 7) return;
    if (ignoredPhones.includes(clean)) {
      setNewIgnoredPhone('');
      return;
    }
    const updated = [...ignoredPhones, clean];
    setIgnoredPhones(updated);
    setNewIgnoredPhone('');

    const updatedConfig: StoreAIBotConfig = {
      ...(store.aiBotConfig || existingConfig),
      isPaused,
      pausedUntil,
      replyTriggerMode,
      ignoredPhones: updated,
    };
    updateStore({ ...store, aiBotConfig: updatedConfig });
    if (onRefreshData) onRefreshData();
  };

  const handleRemoveIgnoredPhone = (phoneToRemove: string) => {
    const updated = ignoredPhones.filter((p) => p !== phoneToRemove);
    setIgnoredPhones(updated);
    const updatedConfig: StoreAIBotConfig = {
      ...(store.aiBotConfig || existingConfig),
      isPaused,
      pausedUntil,
      replyTriggerMode,
      ignoredPhones: updated,
    };
    updateStore({ ...store, aiBotConfig: updatedConfig });
    if (onRefreshData) onRefreshData();
  };

  // Auto-resume check if paused with expiry
  useEffect(() => {
    if (isPaused && pausedUntil) {
      const expiresAt = new Date(pausedUntil).getTime();
      if (Date.now() > expiresAt) {
        setIsPaused(false);
        setPausedUntil(null);
        const updatedConfig: StoreAIBotConfig = {
          ...(store.aiBotConfig || existingConfig),
          isPaused: false,
          pausedUntil: null,
        };
        updateStore({ ...store, aiBotConfig: updatedConfig });
        if (onRefreshData) onRefreshData();
      }
    }
  }, [isPaused, pausedUntil]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newBuyerMsg: ChatMessage = {
      id: `msg_${Date.now()}_buyer`,
      sender: 'buyer',
      text: userText,
      timestamp: timeNow,
    };

    setMessages((prev) => [...prev, newBuyerMsg]);
    setInputMessage('');

    // Simulate Bot response after 400ms delay
    setTimeout(() => {
      // Find UID match in the message text
      const cleanUpper = userText.toUpperCase();
      const matchedProduct = products.find(
        (p) =>
          cleanUpper.includes(p.uid.toUpperCase()) ||
          cleanUpper.includes(p.slug.toUpperCase()) ||
          (p.name && cleanUpper.includes(p.name.toUpperCase().slice(0, 8)))
      );

      if (matchedProduct) {
        const checkoutLink = getStoreUrl(store.slug, { productId: matchedProduct.id });
        const botReply: ChatMessage = {
          id: `msg_${Date.now()}_bot`,
          sender: 'bot',
          text: `🎯 *Match Found:* #${matchedProduct.uid}\n\n*${matchedProduct.name}*\n🏷️ *Price:* ${formatPrice(matchedProduct.price, store.currencySymbol)}\n📦 *Stock:* ${matchedProduct.inStock ? '✅ In Stock' : '❌ Sold Out'}\n🚚 *Delivery:* ${store.deliveryInfo || 'Same-day Lagos dispatch'}\n\n👉 *Tap here to order in 1-click without creating an account:*`,
          timestamp: timeNow,
          productCard: {
            product: matchedProduct,
            checkoutUrl: checkoutLink,
          },
        };
        setMessages((prev) => [...prev, botReply]);
      } else if (cleanUpper.includes('HELLO') || cleanUpper.includes('HI') || cleanUpper.includes('HEY')) {
        const botReply: ChatMessage = {
          id: `msg_${Date.now()}_bot`,
          sender: 'bot',
          text: welcomeMessage,
          timestamp: timeNow,
        };
        setMessages((prev) => [...prev, botReply]);
      } else {
        const botReply: ChatMessage = {
          id: `msg_${Date.now()}_bot`,
          sender: 'bot',
          text: `I didn't quite catch that. You can drop any Item UID (e.g. #${products[0]?.uid || 'PROD-101'}) or ask about prices, stock, and delivery.\n\nOr reply *"AGENT"* to speak with our sales manager on duty.`,
          timestamp: timeNow,
        };
        setMessages((prev) => [...prev, botReply]);
      }
    }, 450);
  };

  const handleResetChat = () => {
    setMessages(initialChat);
  };

  return (
    <>
      {/* Plan gate — WhatsApp Auto-Reply Bot is locked for Free and Starter */}
      {store.tier === 'free' || store.tier === 'starter' ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900">WhatsApp Auto-Reply Bot</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Automated WhatsApp 24/7 Drop UID auto-replies, catalog assistants, and live pairing are locked on the <strong>{store.tier === 'free' ? 'Free Trial' : 'Starter'} plan</strong>.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 font-medium space-y-2 w-full text-left">
            <p className="font-black text-emerald-950 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Unlock Automated WhatsApp Selling:</span>
            </p>
            <p>• 24/7 instant replies to Item UID codes (e.g. #TA-BR540)</p>
            <p>• Automatically sends product photos, live prices &amp; 1-click checkout links to buyers</p>
            <p>• Direct QR pairing with your WhatsApp Business phone</p>
            <p>• Smart human handover: auto-pauses when you type manually to friends</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => onUpgrade?.('business')}
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Upgrade to Business Bot →</span>
            </button>
            {onOpenBilling && (
              <button
                type="button"
                onClick={onOpenBilling}
                className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
              >
                View All Plans
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
      {/* Feature Intro Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Conversational AI • 24/7 "Drop UID" Auto-Responder</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Turn midnight WhatsApp messages into instant sales while you sleep.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              When customers see your Instagram Reel or WhatsApp status with an Item code like <strong className="text-amber-400 font-mono">#TA-BR540</strong>, they simply text the code to your WhatsApp. The bot immediately replies with photo, live price, available sizes, and a 1-click checkout link.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0 text-center space-y-2">
            <span className="text-[11px] uppercase tracking-wider text-slate-300 font-bold block">
              Bot Status
            </span>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ACTIVE & LISTENING</span>
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              Average response: &lt; 0.4s
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Simulator on Left, Integration & Settings on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Live Interactive WhatsApp Simulator (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[380px] bg-black rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col h-[650px] relative">
            {/* Speaker Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-4 bg-black rounded-full z-30 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2" />
              <div className="w-8 h-1 rounded-full bg-slate-900" />
            </div>

            {/* Simulated Phone Screen */}
            <div className="flex-1 bg-[#efeae2] rounded-[34px] overflow-hidden flex flex-col relative">
              {/* WhatsApp Header Bar */}
              <div className="bg-[#075e54] text-white pt-8 pb-3 px-3 flex items-center justify-between shadow-md z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src={store.logoUrl}
                    alt={store.name}
                    className="w-8 h-8 rounded-full object-cover border border-white/40 bg-white"
                  />
                  <div className="truncate">
                    <div className="text-xs font-bold leading-tight truncate flex items-center gap-1">
                      <span>{store.name}</span>
                      <span className="text-emerald-300 text-[10px]">✓</span>
                    </div>
                    <span className="text-[9px] text-emerald-200 block">
                      ⚡ Automated Order Bot
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleResetChat}
                  title="Reset demo chat"
                  className="p-1 rounded-full hover:bg-white/10 text-white/80 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Chat Message Scrollable Feed */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 font-sans text-xs">
                {/* Security notice pill */}
                <div className="text-center">
                  <span className="bg-amber-100/90 text-amber-900 text-[9px] font-semibold px-2.5 py-1 rounded-lg shadow-2xs inline-block">
                    🔒 Messages are end-to-end verified via Taaa.shop Webhook
                  </span>
                </div>

                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'buyer' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 shadow-xs text-slate-900 relative ${
                        msg.sender === 'buyer'
                          ? 'bg-[#d9fdd3] rounded-tr-none'
                          : 'bg-white rounded-tl-none border border-slate-100'
                      }`}
                    >
                      <p className="whitespace-pre-line text-xs leading-relaxed">
                        {msg.text}
                      </p>

                      {/* Product Card Attachment in Chat */}
                      {msg.productCard && (
                        <div className="mt-2.5 bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                          <img
                            src={msg.productCard.product.images[0] || store.logoUrl}
                            alt={msg.productCard.product.name}
                            className="w-full h-24 object-cover"
                          />
                          <div className="p-2 space-y-1">
                            <span className="font-bold text-slate-900 text-xs line-clamp-1">
                              {msg.productCard.product.name}
                            </span>
                            <div className="text-amber-600 font-black text-xs font-mono">
                              {formatPrice(
                                msg.productCard.product.price,
                                store.currencySymbol
                              )}
                            </div>
                            <a
                              href={msg.productCard.checkoutUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 w-full py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg text-center block shadow-2xs transition"
                            >
                              Tap to Order on WhatsApp 👉
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400">
                        <span>{msg.timestamp}</span>
                        {msg.sender === 'buyer' && (
                          <CheckCheck className="w-3 h-3 text-sky-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="bg-[#f0f2f5] p-2 flex items-center gap-1.5 border-t border-slate-200 shrink-0"
              >
                <input
                  type="text"
                  placeholder={`Try sending #${products[0]?.uid || 'TA-BR540'}...`}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 bg-white rounded-full px-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none border border-slate-200 shadow-2xs"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>Quick test codes:</span>
            {products.slice(0, 3).map((p) => (
              <button
                key={p.id}
                onClick={() => setInputMessage(`#${p.uid}`)}
                className="font-mono text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md font-bold cursor-pointer transition"
              >
                #{p.uid}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT: WhatsApp Connection & Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* LIVE 1-CLICK WHATSAPP QR PAIRING */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white shrink-0 ${
                  baileysStatus === 'connected' ? 'bg-emerald-600' : 'bg-slate-900'
                }`}>
                  <MessageCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight flex items-center gap-2">
                    <span>1-Click WhatsApp QR Link</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                      24/7 Auto-Reply
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Connect {store.name}'s dedicated WhatsApp by scanning a QR code with your phone
                  </p>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                {baileysStatus === 'connected' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected ({connectedPhone || `${store.whatsappCountryCode} ${store.whatsappNumber}`})</span>
                  </span>
                ) : baileysStatus === 'waiting_scan' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Pairing Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    <span className={`w-2 h-2 rounded-full ${serverStatus === 'online' ? 'bg-emerald-400' : serverStatus === 'waking' ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                    <span>{serverStatus === 'waking' ? 'Engine Waking Up...' : serverStatus === 'online' ? 'Gateway Ready' : 'Not Connected'}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Content when Disconnected */}
            {baileysStatus === 'disconnected' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <h4 className="font-bold text-slate-900 text-sm">
                    No Meta Developer Account or Credit Card Needed
                  </h4>
                  <p className="text-xs text-slate-600 max-w-md leading-relaxed">
                    Link your phone in 20 seconds. Once connected, your WhatsApp automatically answers customer Item UID searches like <code className="font-mono bg-white px-1.5 py-0.5 rounded border">#{products[0]?.uid || 'TA-BR540'}</code> and sends instant product links.
                  </p>
                  {serverStatus === 'waking' && (
                    <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1 pt-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Cloud gateway is waking up on Render (free tier takes ~20s on first load).</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    onClick={() => {
                      setPairingMethod('qr');
                      handleStartBaileysPairing(true);
                    }}
                    disabled={isPairingLoading}
                    className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <QrCode className="w-4 h-4 text-amber-400" />
                    <span>{isPairingLoading ? 'Connecting...' : 'Connect WhatsApp (Scan QR)'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setPairingMethod('code');
                      setBaileysStatus('waiting_scan');
                    }}
                    className="px-4 py-3 rounded-2xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                    title="Link using an 8-digit code instead of camera"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Use Phone Code</span>
                  </button>
                </div>
              </div>
            )}

            {/* Content when Waiting for Scan or Pairing Code */}
            {baileysStatus === 'waiting_scan' && (
              <div className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col md:flex-row items-start justify-between gap-6 animate-in fade-in duration-200">
                <div className="space-y-4 flex-1 text-left w-full">
                  {/* Pairing Method Switcher */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex p-1 bg-amber-100/80 rounded-xl border border-amber-200/60">
                      <button
                        type="button"
                        onClick={() => {
                          setPairingMethod('qr');
                          if (!baileysQr && !isPairingLoading) handleStartBaileysPairing();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          pairingMethod === 'qr'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Scan QR Code</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPairingMethod('code')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                          pairingMethod === 'code'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Link with Phone Number</span>
                      </button>
                    </div>

                    <span className="text-[10px] text-amber-800 font-mono hidden sm:inline-block">
                      {serverStatus === 'online' ? '🟢 Gateway Live' : '🟡 Connecting...'}
                    </span>
                  </div>

                  {/* Method 1: QR Code Instructions */}
                  {pairingMethod === 'qr' && (
                    <ol className="space-y-2 text-xs text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                        <span>Open <strong>WhatsApp</strong> on your business phone ({store.whatsappCountryCode} {store.whatsappNumber}).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                        <span>Go to <strong>Settings</strong> → <strong>Linked Devices</strong> → tap <strong>Link a Device</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                        <span>Point your camera at this QR code to complete pairing.</span>
                      </li>
                    </ol>
                  )}

                  {/* Method 2: Pairing Code (Phone Number) */}
                  {pairingMethod === 'code' && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        Don&apos;t have a second phone or camera? Enter your WhatsApp business phone number to get an 8-character pairing code to type directly into WhatsApp:
                      </p>
                      <div className="flex gap-2 max-w-sm">
                        <input
                          type="text"
                          value={pairingPhone}
                          onChange={(e) => setPairingPhone(e.target.value)}
                          placeholder="e.g. 2348012345678"
                          className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-mono text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={handleRequestPairingCode}
                          disabled={pairingCodeLoading}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition shrink-0"
                        >
                          {pairingCodeLoading ? 'Generating...' : 'Get Code'}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        Format: International digits without '+' (e.g. <strong>2348031234567</strong> for Nigeria)
                      </span>

                      {pairingError && (
                        <p className="text-xs text-rose-600 font-medium">{pairingError}</p>
                      )}

                      {qrScannedConfirming ? (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 shadow-xs flex items-center gap-3 animate-in fade-in">
                          <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-emerald-950 block">Code Entered on Phone! ✅</span>
                            <span className="text-[11px] text-emerald-700 block">Completing WhatsApp handshake and pairing your store bot...</span>
                          </div>
                        </div>
                      ) : pairingCode && (
                        <div className="p-4 bg-white rounded-xl border-2 border-emerald-500/80 shadow-xs space-y-2">
                          <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                            Your WhatsApp 8-Digit Pairing Code:
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-2xl font-black text-slate-900 tracking-wider">
                              {pairingCode}
                            </span>
                            <button
                              type="button"
                              onClick={handleCopyPairingCode}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              {copiedPairingCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedPairingCode ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <ol className="text-[11px] text-slate-600 space-y-1 pt-1 list-decimal list-inside">
                            <li>Open WhatsApp on <strong>{pairingPhone}</strong></li>
                            <li>Go to <strong>Settings</strong> → <strong>Linked Devices</strong> → <strong>Link a Device</strong></li>
                            <li>Tap <strong>&ldquo;Link with phone number instead&rdquo;</strong> at the bottom</li>
                            <li>Type in code <strong>{pairingCode}</strong></li>
                          </ol>
                        </div>
                      )}
                    </div>
                  )}

                  {serverMessage && (
                    <p className="text-[11px] text-amber-800 font-medium bg-amber-100/70 p-2 rounded-lg">
                      {serverMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      onClick={handleDisconnectBaileys}
                      className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* QR Display */}
                {pairingMethod === 'qr' && (
                  <div className="shrink-0 flex flex-col items-center p-3.5 bg-white rounded-2xl border-2 border-amber-400 shadow-md">
                    {qrScannedConfirming ? (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-center p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center mb-1.5">
                          <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" />
                        </div>
                        <span className="text-xs font-bold text-emerald-900">QR Scanned! ✅</span>
                        <p className="text-[10px] text-emerald-700 mt-1 leading-snug">
                          Confirming pairing with WhatsApp...
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setQrScannedConfirming(false);
                            handleStartBaileysPairing(true);
                          }}
                          className="mt-2 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-100 cursor-pointer shadow-2xs"
                        >
                          Cancel / New QR
                        </button>
                      </div>
                    ) : baileysQr && baileysQr.startsWith('data:image') ? (
                      <div className="space-y-2 text-center">
                        <img
                          src={baileysQr}
                          alt="WhatsApp Pairing QR"
                          className="w-48 h-48 rounded-xl object-contain border border-slate-100 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleStartBaileysPairing(true)}
                          disabled={isPairingLoading}
                          className="w-full text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 py-1.5 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isPairingLoading ? 'animate-spin' : ''}`} />
                          <span>Refresh QR Code</span>
                        </button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 flex flex-col items-center justify-center text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mb-2" />
                        <span className="text-xs font-bold text-slate-800">
                          {isPairingLoading ? 'Connecting...' : 'Generating QR...'}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                          {serverMessage || 'Establishing live WhatsApp session...'}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleStartBaileysPairing(true)}
                          className="mt-3 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          Retry Connect
                        </button>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono mt-2">
                      Live Baileys Gateway
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Content when Connected */}
            {baileysStatus === 'connected' && (
              <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-4 animate-in fade-in duration-200 ${
                isPaused ? 'bg-amber-50/80 border-amber-300' : 'bg-emerald-50 border-emerald-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white ${
                      isPaused ? 'bg-amber-600' : 'bg-emerald-600'
                    }`}>
                      {isPaused ? <Pause className="w-5 h-5 text-white" /> : <CheckCheck className="w-5 h-5 text-amber-300" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                        <span>{isPaused ? 'Auto-Replies Temporarily Paused' : 'WhatsApp Connected & Active!'}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaused ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
                        }`}>
                          {isPaused ? 'WhatsApp Still Linked' : 'Listening'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-600">
                        {isPaused
                          ? pausedUntil
                            ? `Bot will auto-resume at ${new Date(pausedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Chat with friends freely!`
                            : 'Bot is paused indefinitely. You can chat with personal friends without bot interruptions.'
                          : `Answering catalog inquiries & Item UIDs (${products.length} products indexed).`}
                      </p>
                    </div>
                  </div>

                  {/* 1-Click Pause / Resume Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={() => handleTogglePause(false)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Resume Bot</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTogglePause(true)}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Pause bot without unlinking your WhatsApp"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause Bot</span>
                        </button>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '1h') handleTogglePause(true, 1);
                            else if (val === '8h') handleTogglePause(true, 8);
                            else if (val === 'forever') handleTogglePause(true);
                            e.target.value = '';
                          }}
                          defaultValue=""
                          className="px-2.5 py-2 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 transition"
                        >
                          <option value="" disabled>Schedule ⏱️</option>
                          <option value="1h">Pause 1 Hour</option>
                          <option value="8h">Pause 8 Hours</option>
                          <option value="forever">Pause Indefinitely</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPairingMethod('qr');
                        handleStartBaileysPairing(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                      title="Scan a new QR or connect a different phone"
                    >
                      <RefreshCw className="w-3 h-3 text-slate-500" />
                      <span>Re-link / New QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDisconnectBaileys}
                      className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                    >
                      Unlink
                    </button>
                  </div>
                </div>

                {/* Smart Chat Privacy & Friends Filter */}
                <div className="mt-2 pt-3 border-t border-slate-200/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Smart Chat Filter (Prevent Interrupting Friends)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        Only reply to commerce messages or ignore personal contacts
                      </span>
                    </div>

                    <div className="inline-flex items-center p-0.5 bg-white border border-slate-200 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTriggerMode('commerce_only');
                          const updatedConfig: StoreAIBotConfig = { ...(store.aiBotConfig || existingConfig), replyTriggerMode: 'commerce_only' };
                          updateStore({ ...store, aiBotConfig: updatedConfig });
                          if (onRefreshData) onRefreshData();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          replyTriggerMode === 'commerce_only' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🎯 Commerce Only
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTriggerMode('always');
                          const updatedConfig: StoreAIBotConfig = { ...(store.aiBotConfig || existingConfig), replyTriggerMode: 'always' };
                          updateStore({ ...store, aiBotConfig: updatedConfig });
                          if (onRefreshData) onRefreshData();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          replyTriggerMode === 'always' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚡ All Messages
                      </button>
                    </div>
                  </div>

                  {replyTriggerMode === 'commerce_only' && (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                      <span className="text-base shrink-0">💡</span>
                      <div>
                        <strong>Commerce Only is Active:</strong> The bot will <strong>silently ignore</strong> casual messages from friends (like &ldquo;how are you&rdquo;, &ldquo;bro&rdquo;, &ldquo;what are you doing&rdquo;) and only answer messages that contain Item UIDs (e.g. <span className="font-mono bg-emerald-50 px-1 py-0.5 rounded">#TA-XXX</span>), price questions, or order keywords. Group chats are always ignored.
                      </div>
                    </div>
                  )}

                  {/* Ignored Contacts (Friends / Family Numbers) */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <UserX className="w-3.5 h-3.5 text-slate-500" />
                        <span>Friends & Family Numbers to Always Ignore:</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Bot will never reply to these numbers</span>
                    </label>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newIgnoredPhone}
                        onChange={(e) => setNewIgnoredPhone(e.target.value)}
                        placeholder="e.g. 2348012345678 (no +)"
                        className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIgnoredPhone();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddIgnoredPhone}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Number</span>
                      </button>
                    </div>

                    {ignoredPhones.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {ignoredPhones.map((phone) => (
                          <span
                            key={phone}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 shadow-2xs"
                          >
                            <span>+{phone}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveIgnoredPhone(phone)}
                              className="text-slate-400 hover:text-rose-600 transition cursor-pointer ml-1"
                              title="Remove number from ignore list"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bot Custom Message Templates & Store AI Settings */}
          <form
            onSubmit={handleSaveBotSettings}
            className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Customize Store AI Assistant
                </h3>
                <p className="text-xs text-slate-500">
                  Strictly applies to {store.name}'s chat bubble & WhatsApp replies
                </p>
              </div>
              {saveSuccess && (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold animate-in fade-in flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Saved!</span>
                </span>
              )}
            </div>

            {/* Enable/Disable Storefront Bubble */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Show AI Chat Bubble on Storefront
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Visitors on your store can tap the floating bubble to chat with your AI
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBubbleEnabled(!bubbleEnabled)}
                className="text-slate-700 hover:text-slate-950 transition cursor-pointer"
              >
                {bubbleEnabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>

            {/* Bot Name & Tone Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  AI Assistant Name
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  placeholder="e.g. Amaka Scents AI"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 font-sans focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Conversation Tone
                </label>
                <select
                  value={botTone}
                  onChange={(e) => setBotTone(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-slate-50 font-sans focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="luxury">Luxury Concierge (Warm & Elegant)</option>
                  <option value="friendly">Friendly & Energetic (Emoji Rich)</option>
                  <option value="fast">Direct & Fast (Short & Punchy)</option>
                  <option value="professional">Corporate & Professional</option>
                </select>
              </div>
            </div>

            {/* Custom Welcome Message */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Welcome Greeting Message
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 font-sans focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            {/* Store-Specific Knowledge & FAQs */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Store-Specific Knowledge & Policies</span>
                <span className="text-[10px] text-slate-400 font-normal">AI will reference this when answering</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Lagos Island delivery takes 2-4 hours. Nationwide orders via GIG Logistics take 24-48 hours. We accept bank transfer and pay on delivery for Lagos buyers."
                value={storeKnowledge}
                onChange={(e) => setStoreKnowledge(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50 font-sans focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer active:scale-95 shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Save AI Assistant Settings for {store.name}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
      )}
    </>
  );
};
