/**
 * Tá.shop Multi-Tenant Baileys WhatsApp Server
 *
 * Each store on Tá.shop gets its own isolated WhatsApp session (sessions/<storeId>).
 * Store owners connect by scanning the QR code emitted to their dashboard.
 *
 * Auto-Capabilities:
 * - Detects Item UIDs (e.g. #TA-BR540) in incoming WhatsApp chats
 * - Replies instantly with product details, price, and direct checkout link
 * - Handles 'catalog', 'help', and delivery inquiries automatically
 */

import express from 'express';
import cors from 'cors';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  jidNormalizedUser,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.resolve('./sessions');
const REGISTRY_FILE = path.join(SESSIONS_DIR, 'sessions-registry.json');

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function loadRegistry() {
  try {
    if (fs.existsSync(REGISTRY_FILE)) {
      return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not read sessions-registry.json:', e.message);
  }
  return {};
}

function saveRegistry(registry) {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save sessions registry:', e.message);
  }
}

// In-memory registry of active store WhatsApp sessions
// Map<storeId, { sock, status: 'connecting'|'connected'|'disconnected', qrDataUrl: string|null, phone: string|null, catalog: Array }>
const activeSessions = new Map();

// In-memory store of recent messages for Signal retry key negotiation
// Essential to prevent "Waiting for this message. This may take a while"
const messageStore = new Map();

// In-memory conversation state for Smart Guided Shopping Concierge
// Map<`${storeId}:${remoteJid}`, { timestamp: number, budget: number|null, recipient: string|null }>
const customerSessions = new Map();

function extractBudget(text) {
  if (!text) return null;
  const kMatch = text.match(/(?:under|around|budget|below|less than|within|max|about)?\s*(?:₦|N|NGN)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const numMatch = text.match(/(?:under|around|budget|below|less than|within|max|about)?\s*(?:₦|N|NGN)?\s*(\d{4,9})\b/i);
  if (numMatch) return parseInt(numMatch[1], 10);
  return null;
}

function detectRecipient(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/\b(her|girlfriend|wife|woman|women|mom|mother|sister|daughter|babe|lady|queen)\b/i.test(lower)) return 'female';
  if (/\b(him|boyfriend|husband|man|men|dad|father|brother|son|guy|king)\b/i.test(lower)) return 'male';
  if (/\b(friend|bestie|colleague|myself|me|self)\b/i.test(lower)) return 'neutral';
  return null;
}

/**
 * Safely send message and register in local message store for retry decryption requests
 */
async function safeSendMessage(sock, jid, content, options) {
  const sent = await sock.sendMessage(jid, content, options);
  if (sent?.key?.id) {
    messageStore.set(sent.key.id, sent);
    if (messageStore.size > 3000) {
      const oldestKey = messageStore.keys().next().value;
      messageStore.delete(oldestKey);
    }
  }
  return sent;
}

/**
 * Sends a rich WhatsApp product card with high-resolution image
 * Supports base64 data URLs, remote HTTP URLs, and graceful text fallback.
 */
async function sendProductCard(sock, remoteJid, product, storeName, storeBaseUrl, storeId) {
  const reply =
    `👋 Hello! Here is the item you requested from *${storeName}*:\n\n` +
    `🏷️ *${product.name}*\n` +
    `💰 *Price:* ₦${Number(product.price).toLocaleString()}\n` +
    `📦 *Status:* ${product.inStock ? '✅ In Stock (Ready to dispatch)' : '❌ Sold Out'}\n` +
    `🔑 *Item Code:* #${product.uid}\n\n` +
    `👉 *Tap here to view photos & complete order:*\n` +
    `${storeBaseUrl}/?product=${product.id}`;

  const images = Array.isArray(product.images) ? product.images : [];
  const rawImg = images[0] || product.image || null;

  if (rawImg && typeof rawImg === 'string') {
    // 1. Data URL (Base64 from local device uploads)
    if (rawImg.startsWith('data:image/')) {
      try {
        const base64Data = rawImg.split(',')[1];
        if (base64Data) {
          const buffer = Buffer.from(base64Data, 'base64');
          await safeSendMessage(sock, remoteJid, {
            image: buffer,
            caption: reply,
          });
          return true;
        }
      } catch (err) {
        console.warn(`[Store: ${storeId}] Failed sending base64 product image:`, err?.message);
      }
    }

    // 2. HTTP/HTTPS URL (Unsplash, Cloudinary, Supabase storage)
    let url = rawImg.trim();
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          await safeSendMessage(sock, remoteJid, {
            image: buffer,
            caption: reply,
          });
          return true;
        }
      } catch (fetchErr) {
        console.warn(`[Store: ${storeId}] Buffer download failed, trying direct URL:`, fetchErr?.message);
        try {
          await safeSendMessage(sock, remoteJid, {
            image: { url },
            caption: reply,
          });
          return true;
        } catch (baileysErr) {
          console.warn(`[Store: ${storeId}] Direct image URL failed:`, baileysErr?.message);
        }
      }
    }
  }

  // Fallback to text message if no image or image sending failed
  await safeSendMessage(sock, remoteJid, { text: reply });
  return false;
}

let cachedBaileysVersion = null;
async function getBaileysVersion() {
  if (cachedBaileysVersion) return cachedBaileysVersion;
  try {
    const { version } = await fetchLatestBaileysVersion();
    cachedBaileysVersion = version;
    console.log('[Baileys] Resolved latest WhatsApp Web protocol version:', version.join('.'));
    return version;
  } catch (err) {
    console.warn('[Baileys] Could not fetch remote version, using verified default:', err.message);
    return [2, 3000, 1043857760];
  }
}

/**
 * Initializes or retrieves an isolated WhatsApp socket for a specific store.
 */
async function initStoreSession(storeId, storeCatalog = [], storeInfo = {}, options = {}) {
  const { forceRefresh = false } = options;

  if (activeSessions.has(storeId)) {
    const existing = activeSessions.get(storeId);
    // If already connected and not forcing refresh, reuse it
    if (existing.status === 'connected' && existing.sock && !forceRefresh) {
      if (storeCatalog && storeCatalog.length > 0) existing.catalog = storeCatalog;
      if (storeInfo && Object.keys(storeInfo).length > 0) existing.storeInfo = storeInfo;
      return existing;
    }
    // If waiting for scan and QR is still fresh (< 45s old) and not forcing refresh, reuse it
    if (existing.status === 'waiting_scan' && existing.qrDataUrl && !forceRefresh) {
      const age = existing.qrGeneratedAt ? (Date.now() - existing.qrGeneratedAt) : 0;
      if (age < 45_000) {
        return existing;
      }
    }
    // Clean up previous socket before starting a new one
    try {
      if (existing.sock) {
        existing.sock.ev.removeAllListeners('connection.update');
        existing.sock.ev.removeAllListeners('creds.update');
        existing.sock.end?.();
      }
    } catch (e) {}
    activeSessions.delete(storeId);
  }

  const storeSessionDir = path.join(SESSIONS_DIR, storeId);
  if (!fs.existsSync(storeSessionDir)) {
    fs.mkdirSync(storeSessionDir, { recursive: true });
  }
  const { state, saveCreds } = await useMultiFileAuthState(storeSessionDir);

  const sessionData = {
    sock: null,
    status: 'connecting',
    qrDataUrl: null,
    qrRaw: null,
    qrGeneratedAt: null,
    phone: null,
    catalog: storeCatalog,
    storeInfo: storeInfo || {},
  };
  activeSessions.set(storeId, sessionData);

  const version = await getBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // suppress verbose protocol logs
    printQRInTerminal: false,
    browser: Browsers.macOS('Desktop'),
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      if (key?.id && messageStore.has(key.id)) {
        const stored = messageStore.get(key.id);
        return stored?.message || stored || undefined;
      }
      return undefined;
    },
  });

  sessionData.sock = sock;

  // Persist session credentials
  sock.ev.on('creds.update', saveCreds);

  // Monitor connection updates & QR generation
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
        sessionData.qrDataUrl = qrDataUrl;
        sessionData.qrRaw = qr;
        sessionData.qrGeneratedAt = Date.now();
        sessionData.status = 'waiting_scan';
        console.log(`[Store: ${storeId}] Fresh valid WhatsApp pairing QR generated. Waiting for merchant to scan.`);
        // Push QR to any open SSE dashboard connections immediately
        pushSSEEvent(storeId, { event: 'qr', status: 'waiting_scan', qrDataUrl, qrGeneratedAt: sessionData.qrGeneratedAt });
      } catch (err) {
        console.error('Failed to convert QR to DataURL:', err);
      }
    }

    if (connection === 'open') {
      sessionData.status = 'connected';
      sessionData.qrDataUrl = null;
      sessionData.qrRaw = null;
      sessionData.qrGeneratedAt = null;
      const userJid = sock.user?.id || '';
      sessionData.phone = userJid.split(':')[0] || userJid.split('@')[0];
      console.log(`[Store: ${storeId}] WhatsApp connected successfully! Phone: ${sessionData.phone}`);

      // Push connected event immediately to all SSE dashboard sessions
      pushSSEEvent(storeId, { event: 'connected', status: 'connected', phone: sessionData.phone });

      const registry = loadRegistry();
      registry[storeId] = {
        status: 'connected',
        phone: sessionData.phone,
        catalog: sessionData.catalog || [],
        storeInfo: sessionData.storeInfo || {},
        updatedAt: new Date().toISOString(),
      };
      saveRegistry(registry);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : (lastDisconnect?.error && typeof lastDisconnect.error === 'object' && 'statusCode' in lastDisconnect.error)
        ? lastDisconnect.error.statusCode
        : null;

      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      sessionData.qrDataUrl = null;

      if (!isLoggedOut) {
        // WhatsApp protocol code 515 (restartRequired) signals QR was scanned and accepted!
        // We MUST reconnect quickly (500ms) with the saved auth credentials intact.
        const isRestart = statusCode === DisconnectReason.restartRequired;
        console.log(`[Store: ${storeId}] Connection closed (code: ${statusCode})${isRestart ? ' — restartRequired (QR scan accepted, re-opening socket...)' : ', reconnecting...'}`);

        sessionData.status = 'connecting';
        pushSSEEvent(storeId, {
          event: isRestart ? 'reconnecting' : 'connecting',
          status: 'connecting',
          statusCode,
        });

        const reconnectDelay = isRestart ? 500 : 2500;
        setTimeout(async () => {
          try {
            await initStoreSession(storeId, sessionData.catalog, sessionData.storeInfo, { forceRefresh: true });
          } catch (e) {
            console.error(`[Store: ${storeId}] Failed to reconnect session:`, e?.message);
          }
        }, reconnectDelay);
      } else {
        sessionData.status = 'disconnected';
        console.log(`[Store: ${storeId}] Logged out. Cleaned session credentials.`);
        pushSSEEvent(storeId, { event: 'disconnected', status: 'disconnected' });
        try {
          fs.rmSync(storeSessionDir, { recursive: true, force: true });
        } catch (e) {}
        activeSessions.delete(storeId);
        const registry = loadRegistry();
        delete registry[storeId];
        saveRegistry(registry);
      }
    }
  });

  // Handle incoming customer inquiries & Auto-Replies
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // Store in memory for Signal retry negotiation
      if (msg.key?.id) {
        messageStore.set(msg.key.id, msg);
        if (messageStore.size > 3000) {
          const oldestKey = messageStore.keys().next().value;
          messageStore.delete(oldestKey);
        }
      }

      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes('@g.us')) continue; // Ignore group chats

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      const cleanText = text.trim();
      if (!cleanText) continue;

      console.log(`[Store: ${storeId}] Incoming from ${remoteJid}: "${cleanText}"`);

      // Match Item UID pattern (e.g. #TA-BR540 or TA-AMK-102)
      const uidMatch = cleanText.match(/#?(TA-[A-Z0-9-]+)/i);
      const queryUid = uidMatch ? uidMatch[1].toUpperCase() : null;

      const currentCatalog = sessionData.catalog || [];
      const info = sessionData.storeInfo || {};
      const storeName = info.name || 'our store';
      const storeSlug = info.slug || storeId;
      const rootDomain = process.env.ROOT_DOMAIN || 'taaa.com.ng';
      const storeBaseUrl = info.customDomain
        ? `https://${info.customDomain.replace(/^https?:\/\//, '')}`
        : `https://${storeSlug}.${rootDomain}`;

      const matchedProduct = currentCatalog.find(
        (p) =>
          (p.uid && p.uid.toUpperCase() === queryUid) ||
          cleanText.toLowerCase().includes(p.name.toLowerCase())
      );

      if (matchedProduct) {
        await sendProductCard(sock, remoteJid, matchedProduct, storeName, storeBaseUrl, storeId);
        continue;
      }

      // ─── SMART GUIDED SHOPPING CONCIERGE & GIFT / BUDGET ASSISTANT ─────────
      const sessionKey = `${storeId}:${remoteJid}`;
      const activeConvo = customerSessions.get(sessionKey);
      const isConvoFresh = activeConvo && (Date.now() - activeConvo.timestamp < 20 * 60 * 1000); // 20 min conversation window

      const detectedBudget = extractBudget(cleanText);
      const detectedRecipient = detectRecipient(cleanText);
      const isGuidanceQuery = /\b(gift|gifts|present|surprise|birthday|anniversary|don't know|dont know|not sure|help me|choose|pick|suggest|recommend|confused|ideas?|advice|what should i|looking for something|what to get)\b/i.test(cleanText);

      if (isGuidanceQuery || (isConvoFresh && (detectedBudget || detectedRecipient))) {
        const effectiveBudget = detectedBudget || (isConvoFresh ? activeConvo?.budget : null);
        const effectiveRecipient = detectedRecipient || (isConvoFresh ? activeConvo?.recipient : null);

        customerSessions.set(sessionKey, {
          timestamp: Date.now(),
          budget: effectiveBudget || null,
          recipient: effectiveRecipient || null,
        });

        // If customer provided a budget or a recipient, filter catalog and recommend!
        if (effectiveBudget || effectiveRecipient) {
          let candidates = currentCatalog.filter((p) => p.inStock);

          if (effectiveBudget) {
            candidates = candidates.filter((p) => Number(p.price) <= effectiveBudget * 1.25);
          }
          if (effectiveRecipient === 'female') {
            candidates = candidates.filter((p) => !/\b(men|men's|him|cologne)\b/i.test(p.name + ' ' + (p.category || '')));
          } else if (effectiveRecipient === 'male') {
            candidates = candidates.filter((p) => !/\b(dress|skirt|wig|earring|heels)\b/i.test(p.name + ' ' + (p.category || '')));
          }

          // Sort by highest relevance/closest to budget
          candidates.sort((a, b) => Number(b.price) - Number(a.price));

          if (candidates.length > 0) {
            const top = candidates.slice(0, 4);
            const listText = top
              .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()}) ✨`)
              .join('\n');

            const budgetLine = effectiveBudget ? ` within *₦${effectiveBudget.toLocaleString()}*` : '';
            const recipientLine = effectiveRecipient === 'female' ? ' for her' : effectiveRecipient === 'male' ? ' for him' : '';

            const reply =
              `🎯 *Personal Shopper Recommendations*${recipientLine}${budgetLine} at *${storeName}*:\n\n` +
              `${listText}\n\n` +
              `Reply with any *#Item Code* (e.g. *#${top[0].uid}*) for full photos & options, or tap to checkout:\n${storeBaseUrl}\n\n` +
              `_Want a different price? Reply with e.g. "budget 15k"!_`;

            // Send photo card of the #1 match first
            await sendProductCard(sock, remoteJid, top[0], storeName, storeBaseUrl, storeId);
            await safeSendMessage(sock, remoteJid, { text: reply });
            continue;
          }
        }

        // If neither budget nor recipient is specified yet, ask the smart questions!
        const questionReply =
          `👋 I'd love to help you find the perfect match at *${storeName}*! 🎁✨\n\n` +
          `To give you our best recommendations, tell me:\n` +
          `1️⃣ *Who is this for?* (e.g. Yourself, Partner/Spouse, Mom, Friend?)\n` +
          `2️⃣ *What is your budget range?* (e.g. "under 20k", "50,000", or "no limit")\n` +
          `3️⃣ *Any specific style or category?*\n\n` +
          `💡 _Or simply reply with e.g. "gift for my girlfriend under 25k" and I'll find our best items immediately!_`;

        await safeSendMessage(sock, remoteJid, { text: questionReply });
        continue;
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Category search (e.g. "show me bags", "do you have shoes")
      const categoryKeywords = ['show me', 'do you have', 'looking for', 'i need', 'any'];
      const isCategoryQuery = categoryKeywords.some((kw) => cleanText.toLowerCase().startsWith(kw));
      if (isCategoryQuery || /\b(bags?|shoes?|dress(es)?|tops?|jewel|watches?|accessories|phones?|electronics?|cloth(es|ing)?)\b/i.test(cleanText)) {
        const searchTerm = cleanText
          .toLowerCase()
          .replace(/^(show me|do you have|looking for|i need|any)\s*/i, '')
          .trim();
        const matches = currentCatalog.filter(
          (p) =>
            p.name.toLowerCase().includes(searchTerm) ||
            (p.category && p.category.toLowerCase().includes(searchTerm)) ||
            (p.description && p.description.toLowerCase().includes(searchTerm))
        );
        if (matches.length === 1) {
          await sendProductCard(sock, remoteJid, matches[0], storeName, storeBaseUrl, storeId);
          continue;
        }
        if (matches.length > 1) {
          const listText = matches
            .slice(0, 5)
            .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()}) ${p.inStock ? '✅' : '❌'}`)
            .join('\n');
          const reply =
            `🔍 Here's what we found at *${storeName}* for "*${searchTerm}*":\n\n` +
            `${listText}\n\n` +
            `Reply with any *#Item Code* for full details & photos, or visit:\n${storeBaseUrl}`;
          await safeSendMessage(sock, remoteJid, { text: reply });
          continue;
        }
      }

      // Delivery / location / shipping inquiry
      if (/\b(deliver|delivery|shipping|ship|location|address|where|pickup|how long|dispatch|lagos|abuja)\b/i.test(cleanText)) {
        const deliveryText = info.deliveryInfo
          ? `🚚 *Delivery Info:*\n${info.deliveryInfo}`
          : `🚚 We offer delivery! Please contact us to confirm your location and arrange delivery.`;
        const locationText = info.location ? `\n\n📍 *We're located at:* ${info.location}` : '';
        const hoursText = info.openHours ? `\n\n🕐 *Opening Hours:* ${info.openHours}` : '';
        const reply =
          `👋 Hi! Thanks for reaching out to *${storeName}*.\n\n` +
          `${deliveryText}${locationText}${hoursText}\n\n` +
          `Shop our full catalog: ${storeBaseUrl}`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // Price inquiry
      if (/\b(price|cost|how much|charge|rate|fee)\b/i.test(cleanText)) {
        const topProducts = currentCatalog.filter((p) => p.inStock).slice(0, 5);
        if (topProducts.length > 0) {
          const listText = topProducts
            .map((p) => `• *#${p.uid}* - ${p.name}: ₦${Number(p.price).toLocaleString()}`)
            .join('\n');
          const reply =
            `💰 *Price List — ${storeName}*\n\n` +
            `${listText}\n\n` +
            `Reply with an *#Item Code* for full details & photos, or view all: ${storeBaseUrl}`;
          await safeSendMessage(sock, remoteJid, { text: reply });
          continue;
        }
      }

      // Greetings or Catalog request
      if (/^(hi|hello|hey|catalog|products|price list|start|menu)/i.test(cleanText)) {
        const topProducts = currentCatalog.slice(0, 5);
        const listText = topProducts
          .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()})`)
          .join('\n');
        const openHoursLine = info.openHours ? `\n🕐 *Hours:* ${info.openHours}` : '';
        const locationLine = info.location ? `\n📍 *Location:* ${info.location}` : '';

        const reply =
          `👋 Welcome to *${storeName}*! 🛍️${openHoursLine}${locationLine}\n\n` +
          `Here are some popular items:\n${listText}\n\n` +
          `👉 *Browse our full catalog:* ${storeBaseUrl}\n` +
          `Reply with any *#Item Code* (e.g. #${topProducts[0]?.uid || 'TA-ITEM'}) for details & photos!\n\n` +
          `You can also ask me:\n• "Do you have bags?" — category search\n• "Delivery info" — shipping & location\n• "Price list" — current prices`;

        await safeSendMessage(sock, remoteJid, { text: reply });
      }
    }
  });

  return sessionData;
}

// ─── SSE: Real-time connection-status push to dashboard ──────────────────────
// Keeps a Map of { res, storeId } for each open SSE subscriber
const sseClients = new Map(); // storeId -> Set<res>

function pushSSEEvent(storeId, payload) {
  const clients = sseClients.get(storeId);
  if (!clients || clients.size === 0) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of clients) {
    try { res.write(data); } catch (e) { /* dead client, will be cleaned on close */ }
  }
}

// ─── HTTP API ROUTES FOR THE TÁ.SHOP DASHBOARD ──────────────────────────────

/**
 * Root Route & Service Status
 */
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Taaa.shop Multi-Tenant Baileys WhatsApp Engine',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size,
    endpoints: {
      health: 'GET /health',
      status: 'GET /api/whatsapp/status/:storeId',
      connect: 'POST /api/whatsapp/connect/:storeId',
      disconnect: 'POST /api/whatsapp/disconnect/:storeId',
      orderNotify: 'POST /api/orders/notify/:storeId',
    },
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', activeSessions: activeSessions.size });
});

/**
 * Check connection status or retrieve current pairing QR code
 */
app.get('/api/whatsapp/status/:storeId', async (req, res) => {
  const { storeId } = req.params;
  let session = activeSessions.get(storeId);

  // If no in-memory active session, check if saved credentials exist on disk
  if (!session) {
    const credsPath = path.join(SESSIONS_DIR, storeId, 'creds.json');
    if (fs.existsSync(credsPath)) {
      const registry = loadRegistry();
      const meta = registry[storeId] || {};
      console.log(`[Store: ${storeId}] Stored session detected on disk. Auto-restoring socket...`);
      try {
        session = await initStoreSession(storeId, meta.catalog || [], meta.storeInfo || {});
      } catch (err) {
        console.error(`[Store: ${storeId}] Auto-restore error:`, err?.message);
      }
    }
  }

  if (!session) {
    return res.json({
      status: 'disconnected',
      connected: false,
      qrDataUrl: null,
      phone: null,
    });
  }

  res.json({
    status: session.status,
    connected: session.status === 'connected',
    qrDataUrl: session.qrDataUrl,
    phone: session.phone,
    qrGeneratedAt: session.qrGeneratedAt || null,
  });
});

/**
 * Start pairing session — emits live QR code to dashboard
 */
app.post('/api/whatsapp/connect/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { catalog = [], storeInfo = {}, forceRefresh = false } = req.body;

  try {
    const session = await initStoreSession(storeId, catalog, storeInfo, { forceRefresh });

    // If waiting for QR code to be generated, wait up to 3.5s so client gets QR immediately
    if (session.status !== 'connected' && !session.qrDataUrl) {
      await new Promise((resolve) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
          if (session.qrDataUrl || session.status === 'connected' || Date.now() - startTime > 3500) {
            clearInterval(interval);
            resolve();
          }
        }, 120);
      });
    }

    res.json({
      success: true,
      status: session.status,
      connected: session.status === 'connected',
      qrDataUrl: session.qrDataUrl,
      phone: session.phone,
      qrGeneratedAt: session.qrGeneratedAt || Date.now(),
    });
  } catch (error) {
    console.error(`Failed to initialize session for ${storeId}:`, error);
    res.status(500).json({ error: 'Failed to start WhatsApp socket' });
  }
});

/**
 * Request an 8-character Pairing Code to link WhatsApp using Phone Number (no camera needed)
 */
app.post('/api/whatsapp/pairing-code/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const cleanPhone = String(phoneNumber).replace(/\D/g, '');
  if (cleanPhone.length < 8) {
    return res.status(400).json({ error: 'Valid international phone number required (e.g. 2348012345678)' });
  }

  try {
    let session = activeSessions.get(storeId);
    if (!session || !session.sock) {
      session = await initStoreSession(storeId);
    }

    if (session.status === 'connected') {
      return res.json({
        success: true,
        connected: true,
        phone: session.phone,
        message: 'Already connected!',
      });
    }

    // Wait if socket is newly booting
    if (!session.sock) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    let code = '';
    try {
      code = await session.sock.requestPairingCode(cleanPhone);
    } catch (pairErr) {
      // Retry once after brief pause
      await new Promise((resolve) => setTimeout(resolve, 1200));
      code = await session.sock.requestPairingCode(cleanPhone);
    }

    const formattedCode = code ? (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code) : code;

    res.json({
      success: true,
      pairingCode: formattedCode,
    });
  } catch (err) {
    console.error(`[Store: ${storeId}] Failed requesting pairing code:`, err?.message);
    res.status(500).json({ error: err.message || 'Failed to generate WhatsApp pairing code' });
  }
});

/**
 * SSE: Real-time WhatsApp status stream for the dashboard
 * Dashboard subscribes here and gets instant push when QR generates or phone links.
 * GET /api/whatsapp/events/:storeId
 */
app.get('/api/whatsapp/events/:storeId', (req, res) => {
  const { storeId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Send current state immediately on connect
  const session = activeSessions.get(storeId);
  if (session) {
    const init = {
      event: session.status,
      status: session.status,
      qrDataUrl: session.qrDataUrl || null,
      phone: session.phone || null,
      qrGeneratedAt: session.qrGeneratedAt || null,
    };
    res.write(`data: ${JSON.stringify(init)}\n\n`);
  } else {
    res.write(`data: ${JSON.stringify({ event: 'disconnected', status: 'disconnected' })}\n\n`);
  }

  // Register this SSE client
  if (!sseClients.has(storeId)) sseClients.set(storeId, new Set());
  sseClients.get(storeId).add(res);

  // Heartbeat every 20s to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); } catch (e) { clearInterval(heartbeat); }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(storeId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClients.delete(storeId);
    }
  });
});

/**
 * Disconnect and logout store session
 */
app.post('/api/whatsapp/disconnect/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const session = activeSessions.get(storeId);

  if (session && session.sock) {
    try {
      await session.sock.logout();
    } catch (e) {}
    activeSessions.delete(storeId);
  }

  const storeSessionDir = path.join(SESSIONS_DIR, storeId);
  try {
    fs.rmSync(storeSessionDir, { recursive: true, force: true });
  } catch (e) {}

  const registry = loadRegistry();
  delete registry[storeId];
  saveRegistry(registry);

  res.json({ success: true, message: 'Disconnected' });
});

/**
 * Instant System Order Notification (Dispatches WhatsApp alerts automatically)
 * Sends notification directly to the merchant AND sends receipt confirmation to the buyer!
 */
app.post('/api/orders/notify/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { order, store = {} } = req.body;

  if (!order) {
    return res.status(400).json({ error: 'Missing order details' });
  }

  const session = activeSessions.get(storeId);
  if (!session || !session.sock || session.status !== 'connected') {
    return res.json({
      success: false,
      message: 'Store WhatsApp is not actively linked with Baileys yet.',
    });
  }

  const sock = session.sock;
  const itemsText = (order.items || [])
    .map((item) => `• ${item.quantity}x ${item.productName} (Code: #${item.productUid}) - ₦${Number(item.subtotal).toLocaleString()}`)
    .join('\n');

  // 1. Notify the Merchant (Store Owner) on their WhatsApp
  try {
    const rawMerchantPhone = (store.whatsappNumber || session.phone || '').replace(/\D/g, '');
    const merchantCountry = (store.whatsappCountryCode || '234').replace(/\D/g, '');
    const cleanMerchant = rawMerchantPhone.startsWith('0')
      ? `${merchantCountry}${rawMerchantPhone.slice(1)}`
      : rawMerchantPhone.startsWith(merchantCountry)
      ? rawMerchantPhone
      : `${merchantCountry}${rawMerchantPhone}`;

    // If notifying the linked number itself, route to user's canonical WhatsApp self chat
    let merchantJid = `${cleanMerchant}@s.whatsapp.net`;
    if (session.phone && cleanMerchant.includes(session.phone)) {
      merchantJid = sock.user?.id ? jidNormalizedUser(sock.user.id) : merchantJid;
    }

    const rootDomain = process.env.ROOT_DOMAIN || 'taaa.com.ng';
    const merchantAlert =
      `🚨 *NEW ORDER RECEIVED VIA TAAA.SHOP!* 🚨\n\n` +
      `🧾 *Order ID:* #${order.id}\n` +
      `👤 *Customer:* ${order.buyerName}\n` +
      `📞 *Phone:* ${order.buyerPhone}\n` +
      `📍 *Fulfillment:* ${(order.fulfillmentMethod || 'Delivery').toUpperCase()}\n` +
      (order.deliveryAddress ? `🏠 *Address:* ${order.deliveryAddress}\n` : '') +
      (order.buyerNotes ? `💬 *Note:* "${order.buyerNotes}"\n` : '') +
      `\n📦 *PACKING LIST:*\n${itemsText}\n\n` +
      `💰 *Total Amount:* ₦${Number(order.totalAmount).toLocaleString()}\n\n` +
      `⚡ *View Dispatch Waybill in your Dashboard:* https://${store.slug || storeId}.${rootDomain}/admin`;

    await safeSendMessage(sock, merchantJid, { text: merchantAlert });
    console.log(`[Store: ${storeId}] Instant merchant WhatsApp notification sent to ${merchantJid}`);
  } catch (err) {
    console.error('Failed to send merchant order alert:', err);
  }

  // 2. Notify the Customer (Buyer) on their WhatsApp directly from the system
  try {
    if (order.buyerPhone) {
      const rawBuyer = order.buyerPhone.replace(/\D/g, '');
      const defaultCountry = (store.whatsappCountryCode || '234').replace(/\D/g, '');
      const cleanBuyer = rawBuyer.startsWith('0')
        ? `${defaultCountry}${rawBuyer.slice(1)}`
        : rawBuyer.startsWith(defaultCountry)
        ? rawBuyer
        : `${defaultCountry}${rawBuyer}`;

      const buyerJid = `${cleanBuyer}@s.whatsapp.net`;

      const buyerReceipt =
        `🎉 Hello *${order.buyerName}*!\n\n` +
        `Your order *#${order.id}* has been successfully received by *${store.name || 'our store'}*!\n\n` +
        `📦 *Ordered Items:*\n${itemsText}\n\n` +
        `💰 *Total:* ₦${Number(order.totalAmount).toLocaleString()}\n` +
        `📍 *Destination:* ${order.deliveryAddress || order.fulfillmentMethod}\n\n` +
        `We are preparing your items for dispatch. We will message you once your rider is on the way! 🚚✨`;

      await safeSendMessage(sock, buyerJid, { text: buyerReceipt });
      console.log(`[Store: ${storeId}] Customer confirmation sent to ${buyerJid}`);
    }
  } catch (err) {
    console.error('Failed to send buyer order receipt:', err);
  }

  res.json({ success: true, message: 'Instant WhatsApp notifications dispatched!' });
});

/**
 * Auto-restore all existing store sessions on server boot
 */
async function restoreAllSessions() {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  try {
    const registry = loadRegistry();
    const knownStores = new Set(Object.keys(registry));
    const entries = fs.readdirSync(SESSIONS_DIR, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const sid = entry.name;
        const credPath = path.join(SESSIONS_DIR, sid, 'creds.json');
        if (fs.existsSync(credPath)) {
          knownStores.add(sid);
        }
      }
    }

    if (knownStores.size > 0) {
      console.log(`[Boot] Found ${knownStores.size} saved WhatsApp store session(s) to restore.`);
      for (const storeId of knownStores) {
        const meta = registry[storeId] || {};
        console.log(`[Boot] Restoring WhatsApp session for store: ${storeId}`);
        try {
          await initStoreSession(storeId, meta.catalog || [], meta.storeInfo || {});
        } catch (e) {
          console.warn(`[Boot] Session restore skipped for ${storeId}:`, e.message);
        }
      }
    }
  } catch (err) {
    console.error('[Boot] Error restoring sessions:', err.message);
  }
}

app.listen(PORT, async () => {
  console.log(`⚡ Taaa.shop Baileys Multi-Tenant WhatsApp Server running on port ${PORT}`);
  await restoreAllSessions();
});
