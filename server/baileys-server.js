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
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  jidNormalizedUser,
  fetchLatestWaWebVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 3001;
// Ensure SESSIONS_DIR is permanently anchored in the server folder regardless of process.cwd()
const SESSIONS_DIR = path.join(__dirname, 'sessions');
const REGISTRY_FILE = path.join(SESSIONS_DIR, 'sessions-registry.json');

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Migrate any existing sessions from root ./sessions to server/sessions
const rootSessions = path.resolve('./sessions');
if (rootSessions !== SESSIONS_DIR && fs.existsSync(rootSessions)) {
  try {
    const rootEntries = fs.readdirSync(rootSessions);
    for (const entry of rootEntries) {
      const src = path.join(rootSessions, entry);
      const dest = path.join(SESSIONS_DIR, entry);
      if (!fs.existsSync(dest)) {
        fs.cpSync(src, dest, { recursive: true });
        console.log(`[Sessions Migration] Migrated session ${entry} to permanent store`);
      }
    }
  } catch (migErr) {
    console.warn('[Sessions Migration] Warning:', migErr.message);
  }
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

// ─── SUPABASE INTEGRATION (Auto-resolve store name, slug & catalog) ────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hbestsjsqvfilhbeymbf.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Wit92S4u1YwX7SwBCbnKHQ_Gf_-dQ07';

async function fetchStoreFromSupabase(storeIdOrSlug) {
  try {
    const isStoreId = String(storeIdOrSlug).startsWith('store_');
    const param = isStoreId ? `id=eq.${storeIdOrSlug}` : `slug=eq.${storeIdOrSlug}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/stores?${param}&select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (e) {
    console.warn(`[Supabase] Failed to fetch store ${storeIdOrSlug}:`, e.message);
    return null;
  }
}

async function fetchProductsFromSupabase(storeId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?store_id=eq.${storeId}&select=*`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price || 0),
      uid: p.uid,
      images: p.images || [],
      inStock: p.in_stock !== false,
      category: p.category || '',
      description: p.description || '',
    }));
  } catch (e) {
    console.warn(`[Supabase] Failed to fetch products for ${storeId}:`, e.message);
    return [];
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

// Map<`${storeId}:${remoteJid}`, number> pause expiration timestamp when customer requests a human seller
const humanHandovers = new Map();

function getTimeGreeting() {
  // West Africa Time (UTC+1)
  const now = new Date();
  const utcHour = now.getUTCHours();
  const watHour = (utcHour + 1) % 24;
  if (watHour >= 4 && watHour < 12) return 'Good morning ☀️';
  if (watHour >= 12 && watHour < 17) return 'Good afternoon 🌤️';
  return 'Good evening 🌙';
}

function findMatchingProducts(query, catalog) {
  if (!query || !catalog || catalog.length === 0) return [];
  const qClean = query.toLowerCase().trim();

  // 1. Exact UID match (e.g. #TA-TOS-435 or TA-TOS-435)
  const uidMatch = qClean.match(/#?(ta-[a-z0-9-]+)/i);
  if (uidMatch) {
    const targetUid = uidMatch[1].toUpperCase();
    const exact = catalog.find((p) => p.uid && p.uid.toUpperCase() === targetUid);
    if (exact) return [exact];
  }

  // 2. Exact or substring name match
  const exactMatches = catalog.filter((p) => p.name && qClean.includes(p.name.toLowerCase()));
  if (exactMatches.length > 0) return exactMatches;

  // 3. Token-based relevance scoring for multi-word or fuzzy searches
  const stopwords = new Set([
    'a', 'an', 'the', 'is', 'are', 'i', 'we', 'you', 'want', 'need', 'show', 'me', 'do',
    'have', 'get', 'can', 'please', 'for', 'to', 'in', 'at', 'of', 'and', 'or', 'with',
    'give', 'look', 'looking', 'buy', 'item', 'product', 'price', 'much', 'cost', 'sell',
    'any', 'some', 'there'
  ]);

  const tokens = qClean
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopwords.has(t));

  if (tokens.length === 0) return [];

  const scored = [];
  for (const product of catalog) {
    const nameLower = (product.name || '').toLowerCase();
    const catLower = (product.category || '').toLowerCase();
    const descLower = (product.description || '').toLowerCase();

    let score = 0;
    for (const token of tokens) {
      const singular = token.endsWith('s') && token.length > 3 ? token.slice(0, -1) : token;
      if (nameLower.includes(token) || nameLower.includes(singular)) {
        score += 5;
      } else if (catLower.includes(token) || catLower.includes(singular)) {
        score += 3;
      } else if (descLower.includes(token) || descLower.includes(singular)) {
        score += 1;
      }
    }

    if (score >= 3) {
      scored.push({ product, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.product);
}

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
  // Build product link: storeBaseUrl may already contain ?store=slug, so use & for product param
  const productLink = storeBaseUrl.includes('?')
    ? `${storeBaseUrl}&product=${product.id}`
    : `${storeBaseUrl}/?product=${product.id}`;

  const reply =
    `👋 Hello! Here is the item you requested from *${storeName}*:\n\n` +
    `🏷️ *${product.name}*\n` +
    `💰 *Price:* ₦${Number(product.price).toLocaleString()}\n` +
    `📦 *Status:* ${product.inStock ? '✅ In Stock (Ready to dispatch)' : '❌ Sold Out'}\n` +
    `🔑 *Item Code:* #${product.uid}\n\n` +
    `👉 *Tap here to view photos & complete order:*\n` +
    `${productLink}`;

  let images = Array.isArray(product.images) ? product.images : [];
  let rawImg = images[0] || product.image || null;

  // Fallback: If product in memory lacks an image, fetch image URL from Supabase
  if (!rawImg && product.id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${product.id}&select=images`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows[0]?.images && Array.isArray(rows[0].images) && rows[0].images.length > 0) {
          rawImg = rows[0].images[0];
        }
      }
    } catch (e) {
      console.warn(`[Store: ${storeId}] Failed to fetch product images from Supabase:`, e?.message);
    }
  }

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
    if (typeof fetchLatestWaWebVersion === 'function') {
      const res = await fetchLatestWaWebVersion();
      if (res?.version && Array.isArray(res.version)) {
        cachedBaileysVersion = res.version;
        console.log('[Baileys] Resolved current WhatsApp Web production version:', res.version.join('.'));
        return res.version;
      }
    }
  } catch (err) {
    console.warn('[Baileys] fetchLatestWaWebVersion error, using production fallback:', err.message);
  }
  // Current verified WhatsApp Web protocol version (prevents "Couldn't link device" rejection)
  cachedBaileysVersion = [2, 3000, 1052379569];
  return cachedBaileysVersion;
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
  if (forceRefresh) {
    const existing = activeSessions.get(storeId);
    if (existing?.sock) {
      try {
        existing.sock.ev.removeAllListeners('connection.update');
        existing.sock.ev.removeAllListeners('creds.update');
        existing.sock.end?.();
      } catch (e) {}
    }
    try {
      fs.rmSync(storeSessionDir, { recursive: true, force: true });
      console.log(`[Store: ${storeId}] Force refresh: wiped session directory for fresh pairing.`);
    } catch (e) {}
    const registry = loadRegistry();
    delete registry[storeId];
    saveRegistry(registry);
  }
  if (!fs.existsSync(storeSessionDir)) {
    fs.mkdirSync(storeSessionDir, { recursive: true });
  }
  const { state, saveCreds } = await useMultiFileAuthState(storeSessionDir);

  let effectiveStoreInfo = storeInfo && Object.keys(storeInfo).length > 0 ? { ...storeInfo } : {};
  if (!effectiveStoreInfo.name || !effectiveStoreInfo.slug || String(effectiveStoreInfo.name).startsWith('store_')) {
    const dbStore = await fetchStoreFromSupabase(storeId);
    if (dbStore) {
      effectiveStoreInfo = {
        name: dbStore.name,
        slug: dbStore.slug,
        customDomain: dbStore.custom_domain,
        deliveryInfo: dbStore.delivery_info,
        location: dbStore.location,
        openHours: dbStore.open_hours,
        ...effectiveStoreInfo,
      };
      if (dbStore.name) effectiveStoreInfo.name = dbStore.name;
      if (dbStore.slug) effectiveStoreInfo.slug = dbStore.slug;
    }
  }

  let effectiveCatalog = storeCatalog && storeCatalog.length > 0 ? storeCatalog : [];
  if (!effectiveCatalog || effectiveCatalog.length === 0) {
    effectiveCatalog = await fetchProductsFromSupabase(storeId);
  }

  const sessionData = {
    sock: null,
    status: 'connecting',
    qrDataUrl: null,
    qrRaw: null,
    qrGeneratedAt: null,
    phone: null,
    pairingRequested: Boolean(options.isPairingCode),
    catalog: effectiveCatalog,
    storeInfo: effectiveStoreInfo,
    // Bot behaviour controls — synced from dashboard
    isPaused: false,
    pausedUntil: null,
    replyTriggerMode: 'commerce_only', // 'always' | 'commerce_only'
    ignoredPhones: [],
  };
  activeSessions.set(storeId, sessionData);

  const version = await getBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }), // suppress verbose protocol logs
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'), // Must be Chrome browser platform (platformId 1) so WhatsApp accepts pairing code on phone!
    syncFullHistory: false,
    markOnlineOnConnect: true, // Keep WhatsApp seeing device as online & active
    fireInitQueries: true,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 15000, // Frequent ping to prevent NAT / WebSocket idle drops
    qrTimeout: 180000, // 3 minutes timeout so pairing code does not expire while merchant types on phone
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 5,
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
    // Only emit QR updates if merchant is not currently in the middle of phone pairing code linking
    if (qr && !sessionData.pairingRequested) {
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

      sessionData.qrDataUrl = null;

      // Always flush credentials immediately so auth tokens are safely preserved on disk
      try {
        await saveCreds();
      } catch (flushErr) {
        console.warn(`[Store: ${storeId}] Failed flushing creds on close:`, flushErr?.message);
      }

      const isRestart = statusCode === DisconnectReason.restartRequired;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const credsPath = path.join(storeSessionDir, 'creds.json');
      const hasRegisteredCreds = fs.existsSync(credsPath) && fs.readFileSync(credsPath, 'utf8').includes('"registered":true');

      console.log(`[Store: ${storeId}] WhatsApp connection closed (code: ${statusCode}, registered: ${hasRegisteredCreds}).`);

      if (isLoggedOut || statusCode === 401 || statusCode === 403) {
        console.log(`[Store: ${storeId}] WhatsApp session was unlinked/logged out on phone. Cleaning session state.`);
        try {
          fs.rmSync(storeSessionDir, { recursive: true, force: true });
        } catch (e) {}
        const registry = loadRegistry();
        delete registry[storeId];
        saveRegistry(registry);
        sessionData.status = 'disconnected';
        sessionData.phone = null;
        pushSSEEvent(storeId, {
          event: 'disconnected',
          status: 'disconnected',
          message: 'WhatsApp device unlinked or logged out. Please re-scan QR or re-link.',
        });
        return;
      }

      sessionData.status = 'connecting';
      pushSSEEvent(storeId, {
        event: isRestart ? 'reconnecting' : 'connecting',
        status: 'connecting',
        statusCode,
        message: isRestart ? 'Code / QR accepted! Linking WhatsApp on your phone...' : 'Maintaining permanent WhatsApp connection...',
      });

      const reconnectDelay = isRestart ? 800 : 2500;
      setTimeout(async () => {
        try {
          console.log(`[Store: ${storeId}] Auto-restoring permanent socket...`);
          await initStoreSession(storeId, sessionData.catalog, sessionData.storeInfo, { forceRefresh: false });
        } catch (e) {
          console.error(`[Store: ${storeId}] Failed to reconnect session:`, e?.message);
        }
      }, reconnectDelay);
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

      // ── GLOBAL BOT PAUSE CHECK (dashboard "Pause Bot" button) ───────────────
      if (sessionData.isPaused) {
        const pausedUntil = sessionData.pausedUntil;
        const stillPaused = !pausedUntil || new Date(pausedUntil).getTime() > Date.now();
        if (stillPaused) {
          console.log(`[Store: ${storeId}] Bot is paused — ignoring message from ${remoteJid}`);
          continue;
        } else {
          // Auto-resume: pause period expired
          sessionData.isPaused = false;
          sessionData.pausedUntil = null;
          console.log(`[Store: ${storeId}] Pause period ended — bot auto-resumed`);
        }
      }

      // ── IGNORED PHONES CHECK ─────────────────────────────────────────────────
      const senderPhone = remoteJid.replace(/@.*/, '');
      if (Array.isArray(sessionData.ignoredPhones) && sessionData.ignoredPhones.length > 0) {
        const isIgnored = sessionData.ignoredPhones.some((p) => {
          const clean = String(p).replace(/\D/g, '');
          return senderPhone.endsWith(clean) || clean.endsWith(senderPhone);
        });
        if (isIgnored) {
          console.log(`[Store: ${storeId}] Ignored phone ${senderPhone} — skipping reply`);
          continue;
        }
      }

      // ── COMMERCE-ONLY MODE: ignore casual chit-chat ──────────────────────────
      const replyMode = sessionData.replyTriggerMode || 'commerce_only';
      if (replyMode === 'commerce_only') {
        // Allow: UID searches, commerce keywords, greetings that start the shopping flow
        const isCommerceMessage = (
          // Item UID codes
          /#?(TA-[A-Z0-9-]+)/i.test(cleanText) ||
          // Shopping / product intent
          /\b(how much|price|buy|order|stock|available|deliver|delivery|payment|pay|transfer|account|catalog|products?|item|show|want|looking|need|search|find|get me|wetin|abeg|how far|gift|budget|discount|last price|how to order|pickup|location|shipping|waybill|instock|in stock|sold out)\b/i.test(cleanText) ||
          // Explicit greetings / menu triggers (open the catalog flow — allowed in both modes)
          /^(hi|hello|hey|yo|good morning|good afternoon|good evening|menu|catalog|start|help|products|prices?)\b/i.test(cleanText) ||
          // Nigerian pidgin
          /\b(wetin una get|wetin dey|how far|una get)\b/i.test(cleanText) ||
          // Human escalation always allowed
          /\b(human|agent|seller|owner|customer care|speak|talk to|real person|representative)\b/i.test(cleanText)
        );
        if (!isCommerceMessage) {
          console.log(`[Store: ${storeId}] commerce_only mode — ignoring non-commerce message from ${remoteJid}: "${cleanText.slice(0, 60)}"`);
          continue;
        }
      }

      // Match Item UID pattern (e.g. #TA-BR540 or TA-AMK-102)
      const uidMatch = cleanText.match(/#?(TA-[A-Z0-9-]+)/i);
      const queryUid = uidMatch ? uidMatch[1].toUpperCase() : null;

      let currentCatalog = sessionData.catalog || [];
      let info = sessionData.storeInfo || {};

      // Live Supabase lookup if storeInfo is missing, incomplete, or contains a raw store ID
      if (!info.name || !info.slug || String(info.name).startsWith('store_') || String(info.slug).startsWith('store_')) {
        const dbStore = await fetchStoreFromSupabase(storeId);
        if (dbStore) {
          info = {
            name: dbStore.name,
            slug: dbStore.slug,
            customDomain: dbStore.custom_domain,
            deliveryInfo: dbStore.delivery_info,
            location: dbStore.location,
            openHours: dbStore.open_hours,
          };
          sessionData.storeInfo = info;
          const reg = loadRegistry();
          if (reg[storeId]) {
            reg[storeId].storeInfo = info;
            saveRegistry(reg);
          }
        }
      }

      if (!currentCatalog || currentCatalog.length === 0) {
        currentCatalog = await fetchProductsFromSupabase(storeId);
        sessionData.catalog = currentCatalog;
      }

      const storeSlug = info.slug || '';
      // Prettify store name: use the verified name from storeInfo / Supabase
      let storeName = info.name;
      if (!storeName || String(storeName).startsWith('store_')) {
        const cleanSlug = String(storeSlug).startsWith('store_') ? '' : storeSlug;
        storeName = cleanSlug ? cleanSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Our Store';
      }

      const rootDomain = process.env.ROOT_DOMAIN || 'taaa.com.ng';
      const siteBaseUrl = process.env.SITE_URL || `https://${rootDomain}`;

      // Build store URL using custom domain or the verified store slug
      const resolvedStoreParam = storeSlug || storeId;
      const storeBaseUrl = info.customDomain
        ? `https://${info.customDomain.replace(/^https?:\/\//, '')}`
        : `${siteBaseUrl}/?store=${encodeURIComponent(resolvedStoreParam)}`;

      // 0. Check Human Handover Pause
      const handoverKey = `${storeId}:${remoteJid}`;
      const handoverTime = humanHandovers.get(handoverKey);
      const isExplicitResume = /^(menu|bot|restart|catalog|start|hi|hello|hey|#?ta-)/i.test(cleanText);

      if (handoverTime && Date.now() - handoverTime < 45 * 60 * 1000) {
        if (!isExplicitResume) {
          console.log(`[Store: ${storeId}] Bot auto-replies paused for ${remoteJid} (human handover active).`);
          continue;
        } else {
          console.log(`[Store: ${storeId}] Customer resumed bot interaction for ${remoteJid}.`);
          humanHandovers.delete(handoverKey);
        }
      }

      // 1. Human Handover Request
      const isHandoverQuery = /\b(human|person|agent|seller|owner|customer care|speak with someone|talk to someone|call me|real person|rep|representative|who am i talking to)\b/i.test(cleanText);
      if (isHandoverQuery) {
        humanHandovers.set(handoverKey, Date.now());
        const reply =
          `👋 *You're chatting with the official AI Concierge for ${storeName}.* 🤖\n\n` +
          `I have paused my automated replies for the next 45 minutes so the store owner / merchant can reply to you directly! 💬\n\n` +
          `Feel free to send your inquiry, phone number, or specific order details here.\n\n` +
          `_Want to resume browsing with me at any time? Just type *"menu"* or send any *#Item Code*._`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 2. Direct Item UID match (e.g. #TA-TOS-435)
      if (queryUid) {
        const itemByUid = currentCatalog.find((p) => p.uid && p.uid.toUpperCase() === queryUid);
        if (itemByUid) {
          await sendProductCard(sock, remoteJid, itemByUid, storeName, storeBaseUrl, storeId);
          continue;
        }
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

      // 4. How to Order / Purchasing Steps
      const isHowToOrder = /\b(how to order|how do i order|how to buy|how do i buy|i want to buy|place order|order now|how to purchase|guide me to order|order process|steps to buy)\b/i.test(cleanText);
      if (isHowToOrder) {
        const sampleUid = currentCatalog[0]?.uid || 'TA-ITEM';
        const reply =
          `🛍️ *How to Order from ${storeName} in 3 Easy Steps:*\n\n` +
          `1️⃣ *Select your item:* Browse our catalog at ${storeBaseUrl} or reply with any *#Item Code* (e.g. *#${sampleUid}*) right here.\n` +
          `2️⃣ *Provide Delivery Info:* Drop your delivery address & phone number right here on WhatsApp or at checkout.\n` +
          `3️⃣ *Make Payment:* Complete payment via Bank Transfer (all banks, OPay, PalmPay) or online card, and receive your receipt!\n\n` +
          `🚚 Fast dispatch straight to your location!\n\n` +
          `👉 *Browse Catalog Now:* ${storeBaseUrl}`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 5. Payment Options & Bank Transfer Inquiry
      const isPaymentQuery = /\b(payment|pay|bank|transfer|account number|account details|opay|palmpay|send acct|how to pay|paystack)\b/i.test(cleanText);
      if (isPaymentQuery) {
        const reply =
          `💳 *Payment Options at ${storeName}*\n\n` +
          `We accept 100% verified & secure payments:\n` +
          `✅ Instant Bank Transfer (All Nigerian Commercial Banks, OPay, PalmPay)\n` +
          `✅ Secure Online Card Checkout (Mastercard, Visa, Verve)\n\n` +
          `🛒 *To Pay & Order:*\n` +
          `1. Choose your items on our storefront:\n` +
          `${storeBaseUrl}\n` +
          `2. Complete checkout to get immediate payment instructions & instant WhatsApp confirmation.\n` +
          `3. After payment, your order moves directly to dispatch! 🚚💨`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 6. Price Negotiation / Nigerian "How much last" / Discount
      const isLastPrice = /\b(how much last|last price|discount|reduce am|cheaper|best price|negotiat|promo code|coupon)\b/i.test(cleanText);
      if (isLastPrice) {
        const reply =
          `🤝 *Best Price Guarantee at ${storeName}*\n\n` +
          `All our prices are direct from our inventory at the best quality-to-price ratio! ✨\n\n` +
          `📦 *Looking for bulk / wholesale pricing or special packages?*\n` +
          `Type *"human"* or reply with the items & quantity you need, and the merchant will review your custom deal directly!\n\n` +
          `👉 *See current promo prices:* ${storeBaseUrl}`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 7. Nigerian Pidgin greeting / inquiries
      const isPidgin = /\b(wetin una get|wetin dey|abeg|how far|una get)\b/i.test(cleanText);
      if (isPidgin) {
        const topProducts = currentCatalog.filter((p) => p.inStock).slice(0, 4);
        const listText = topProducts
          .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()})`)
          .join('\n');
        const reply =
          `👋 *How far! Welcome to ${storeName}!* 🙌\n\n` +
          `We get quality items ready for dispatch sharp-sharp! 🚀\n\n` +
          `Check some of our hot items:\n${listText || 'No items listed yet'}\n\n` +
          `👉 *Check everything we get here:* ${storeBaseUrl}\n` +
          `Reply with any *#Item Code* to see full pictures and price!`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 8. Delivery / Location / Shipping / Pickup
      if (/\b(deliver|delivery|shipping|ship|location|address|where are you|where una dey|pickup|pick up|how long|dispatch|lagos|abuja|waybill|interstate)\b/i.test(cleanText)) {
        const deliveryText = info.deliveryInfo
          ? `🚚 *Delivery Info:*\n${info.deliveryInfo}`
          : `🚚 Fast delivery available across the city and nationwide waybill!`;
        const locationText = info.location ? `\n\n📍 *We're located at:* ${info.location}` : '';
        const hoursText = info.openHours ? `\n\n🕐 *Opening Hours:* ${info.openHours}` : '';
        const reply =
          `👋 Hi! Thanks for reaching out to *${storeName}*.\n\n` +
          `${deliveryText}${locationText}${hoursText}\n\n` +
          `👉 *Shop our full catalog:* ${storeBaseUrl}`;
        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 9. Specific Price List inquiry
      if (/^(price list|prices|how much are your items|all prices|all products)/i.test(cleanText)) {
        const topProducts = currentCatalog.filter((p) => p.inStock).slice(0, 6);
        if (topProducts.length > 0) {
          const listText = topProducts
            .map((p) => `• *#${p.uid}* - ${p.name}: ₦${Number(p.price).toLocaleString()}`)
            .join('\n');
          const reply =
            `💰 *Price List — ${storeName}*\n\n` +
            `${listText}\n\n` +
            `Reply with any *#Item Code* for full details & photos, or view all items online:\n${storeBaseUrl}`;
          await safeSendMessage(sock, remoteJid, { text: reply });
          continue;
        }
      }

      // 10. Greetings or General Menu / Catalog request
      if (/^(hi|hello|hey|yo|good morning|good afternoon|good evening|catalog|products|start|menu|help)/i.test(cleanText)) {
        const timeGreeting = getTimeGreeting();
        const topProducts = currentCatalog.filter((p) => p.inStock).slice(0, 5);
        const listText = topProducts
          .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()})`)
          .join('\n');
        const openHoursLine = info.openHours ? `\n🕐 *Hours:* ${info.openHours}` : '';
        const locationLine = info.location ? `\n📍 *Location:* ${info.location}` : '';

        const reply =
          `👋 *${timeGreeting}! Welcome to ${storeName}!* 🛍️${openHoursLine}${locationLine}\n\n` +
          `Here are some popular items ready for you:\n${listText || 'Browse our catalog below!'}\n\n` +
          `👉 *Tap to browse full catalog:* ${storeBaseUrl}\n\n` +
          `Reply with any *#Item Code* (e.g. #${topProducts[0]?.uid || 'TA-ITEM'}) for photos & details!\n\n` +
          `💡 *You can also ask:*\n` +
          `• "Do you have shoes?" — category search\n` +
          `• "How to order" — step by step guide\n` +
          `• "Delivery info" — shipping & pickup details\n` +
          `• "Payment info" — bank transfer & card options\n` +
          `• "Human" — chat directly with the store owner`;

        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

      // 11. Fuzzy & Multi-word Product Search (matching title, category, description, tokens)
      const matchedProducts = findMatchingProducts(cleanText, currentCatalog);
      if (matchedProducts.length === 1) {
        await sendProductCard(sock, remoteJid, matchedProducts[0], storeName, storeBaseUrl, storeId);
        continue;
      }
      if (matchedProducts.length > 1) {
        const topOne = matchedProducts[0];
        const otherMatches = matchedProducts.slice(1, 5);
        // Send image card for top product
        await sendProductCard(sock, remoteJid, topOne, storeName, storeBaseUrl, storeId);

        if (otherMatches.length > 0) {
          const listText = otherMatches
            .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()}) ${p.inStock ? '✅' : '❌'}`)
            .join('\n');
          const reply =
            `🔍 *We also found these matching items at ${storeName}:*\n\n` +
            `${listText}\n\n` +
            `Reply with any *#Item Code* for full details & photos, or browse all:\n${storeBaseUrl}`;
          await safeSendMessage(sock, remoteJid, { text: reply });
        }
        continue;
      }

      // 12. Smart Concierge Fallback (Never Stay Silent!)
      const topProducts = currentCatalog.filter((p) => p.inStock).slice(0, 4);
      const listText = topProducts
        .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()})`)
        .join('\n');
      const sampleUid = topProducts[0]?.uid || 'TA-ITEM';

      const fallbackReply =
        `👋 *Hello! Thanks for messaging ${storeName}.*\n\n` +
        `I'm your 24/7 AI shopping assistant. I couldn't find an exact match for "${cleanText.slice(0, 40)}", but here is how I can help:\n\n` +
        `🔥 *Popular in our store right now:*\n${listText || 'Check out our full collection online!'}\n\n` +
        `👉 *Tap to view full store & prices:*\n${storeBaseUrl}\n\n` +
        `💬 *Quick options:*\n` +
        `• Send an *#Item Code* (e.g. *#${sampleUid}*) to see photos & details\n` +
        `• Search any item (e.g. *"Men Combo"*, *"perfume"*, *"shoes"*)\n` +
        `• Type *"How to order"* or *"Payment info"*\n` +
        `• Type *"Delivery info"* for shipping rates & location\n` +
        `• Type *"human"* to speak with the store owner`;

      await safeSendMessage(sock, remoteJid, { text: fallbackReply });
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
      try {
        const credsContent = fs.readFileSync(credsPath, 'utf8');
        if (credsContent.includes('"registered":true')) {
          const registry = loadRegistry();
          const meta = registry[storeId] || {};
          console.log(`[Store: ${storeId}] Stored session detected on disk. Auto-restoring socket...`);
          session = await initStoreSession(storeId, meta.catalog || [], meta.storeInfo || {});
        }
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

  const isLive = session.status === 'connected' && Boolean(session.sock?.user?.id);
  res.json({
    status: isLive ? 'connected' : session.status,
    connected: isLive,
    qrDataUrl: isLive ? null : session.qrDataUrl,
    phone: isLive ? session.phone : null,
    qrGeneratedAt: session.qrGeneratedAt || null,
  });
});

/**
 * Update / Sync store metadata & catalog for an active WhatsApp session
 */
app.post('/api/whatsapp/sync/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { catalog = [], storeInfo = {}, isPaused, pausedUntil, replyTriggerMode, ignoredPhones } = req.body;

  let session = activeSessions.get(storeId);
  if (session) {
    if (catalog && catalog.length > 0) session.catalog = catalog;
    if (storeInfo && Object.keys(storeInfo).length > 0) {
      session.storeInfo = { ...(session.storeInfo || {}), ...storeInfo };
    }
    // Sync bot behaviour controls
    if (typeof isPaused === 'boolean') session.isPaused = isPaused;
    if (pausedUntil !== undefined) session.pausedUntil = pausedUntil;
    if (replyTriggerMode) session.replyTriggerMode = replyTriggerMode;
    if (Array.isArray(ignoredPhones)) session.ignoredPhones = ignoredPhones;
  }

  const registry = loadRegistry();
  if (registry[storeId]) {
    if (catalog && catalog.length > 0) registry[storeId].catalog = catalog;
    if (storeInfo && Object.keys(storeInfo).length > 0) {
      registry[storeId].storeInfo = { ...(registry[storeId].storeInfo || {}), ...storeInfo };
    }
    saveRegistry(registry);
  }

  res.json({ success: true, message: 'Store metadata synced successfully' });
});

/**
 * Start pairing session — emits live QR code to dashboard
 */
app.post('/api/whatsapp/connect/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { catalog = [], storeInfo = {}, forceRefresh = false } = req.body;

  try {
    const session = await initStoreSession(storeId, catalog, storeInfo, { forceRefresh });

    const isTrulyConnected = session.status === 'connected' && Boolean(session.sock?.user?.id);

    // If waiting for QR code to be generated, wait up to 4s so client gets QR immediately
    if (!isTrulyConnected && !session.qrDataUrl) {
      await new Promise((resolve) => {
        const startTime = Date.now();
        const interval = setInterval(() => {
          if (session.qrDataUrl || (session.status === 'connected' && session.sock?.user?.id) || Date.now() - startTime > 4000) {
            clearInterval(interval);
            resolve();
          }
        }, 120);
      });
    }

    const isLive = session.status === 'connected' && Boolean(session.sock?.user?.id);
    res.json({
      success: true,
      status: isLive ? 'connected' : (session.qrDataUrl ? 'waiting_scan' : session.status),
      connected: isLive,
      qrDataUrl: isLive ? null : session.qrDataUrl,
      phone: isLive ? session.phone : null,
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
  const { phoneNumber, catalog = [], storeInfo = {} } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  let cleanPhone = String(phoneNumber).replace(/\D/g, '');
  if (cleanPhone.startsWith('2340') && cleanPhone.length === 14) {
    cleanPhone = '234' + cleanPhone.slice(4);
  } else if (cleanPhone.startsWith('0') && (cleanPhone.length === 11 || cleanPhone.length === 10)) {
    cleanPhone = '234' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
    cleanPhone = '234' + cleanPhone;
  }
  if (cleanPhone.length < 8) {
    return res.status(400).json({ error: 'Valid international phone number required (e.g. 2348012345678)' });
  }

  try {
    let session = activeSessions.get(storeId);

    // Clean any previous session credentials so registered: true doesn't block pairing code generation
    const storeSessionDir = path.join(SESSIONS_DIR, storeId);
    try {
      if (session?.sock) {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.end?.();
      }
      fs.rmSync(storeSessionDir, { recursive: true, force: true });
    } catch (e) {}

    // Force a fresh session for phone pairing code with provided catalog and store info
    const effectiveCat = catalog && catalog.length > 0 ? catalog : (session?.catalog || []);
    const effectiveInfo = storeInfo && Object.keys(storeInfo).length > 0 ? storeInfo : (session?.storeInfo || {});
    session = await initStoreSession(storeId, effectiveCat, effectiveInfo, { forceRefresh: true, isPairingCode: true });

    // Wait for the socket to establish connection with WhatsApp and emit the ready/QR event
    if (session.sock?.waitForConnectionUpdate) {
      try {
        await session.sock.waitForConnectionUpdate((u) => Boolean(u.qr || u.connection === 'open'), 12000);
      } catch (waitErr) {
        console.warn(`[Store: ${storeId}] waitForConnectionUpdate timed out, proceeding with fallback...`);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }

    session.pairingRequested = true;

    let code = '';
    try {
      code = await session.sock.requestPairingCode(cleanPhone);
    } catch (pairErr) {
      console.warn(`[Store: ${storeId}] First pairing code attempt failed (${pairErr?.message}), retrying in 2.5s...`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (session.sock) {
        code = await session.sock.requestPairingCode(cleanPhone);
      }
    }

    if (!code) {
      throw new Error('WhatsApp server returned an empty code. Please try again.');
    }

    const formattedCode = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
    console.log(`[Store: ${storeId}] Generated 8-digit WhatsApp pairing code for +${cleanPhone}: ${formattedCode}`);

    pushSSEEvent(storeId, {
      event: 'pairing_code',
      pairingCode: formattedCode,
      phoneNumber: cleanPhone,
    });

    res.json({
      success: true,
      pairingCode: formattedCode,
      phoneNumber: cleanPhone,
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
      `⚡ *View your Dashboard:* ${process.env.SITE_URL ? `${process.env.SITE_URL}/?store=${store.slug || storeId}&view=dashboard` : `https://${store.slug || storeId}.${rootDomain}/?view=dashboard`}`;

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
        `Your order *#${order.id}* has been successfully received by *${(store.name || store.slug || 'our store').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}*!\n\n` +
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

// ─── PERMANENT ACTIVE HEARTBEAT & AUTO-HEALING LOOP ────────────────────────
// Runs every 25 seconds:
// 1. Sends an active presence ping to WhatsApp so connections never drop due to idling
// 2. Automatically restores any registered sessions that may have had a temporary network drop
setInterval(async () => {
  for (const [storeId, session] of activeSessions.entries()) {
    if (session && session.status === 'connected' && session.sock) {
      try {
        await session.sock.sendPresenceUpdate('available');
      } catch (e) {
        // Socket may be reconnecting; heartbeat will retry next cycle
      }
    } else if (session && session.status !== 'connected' && session.status !== 'connecting') {
      const credsPath = path.join(SESSIONS_DIR, storeId, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const credsStr = fs.readFileSync(credsPath, 'utf8');
          if (credsStr.includes('"registered":true')) {
            console.log(`[Permanent Heartbeat] Restoring inactive registered session for store: ${storeId}...`);
            session.status = 'connecting';
            initStoreSession(storeId, session.catalog, session.storeInfo, { forceRefresh: false }).catch((err) => {
              console.warn(`[Permanent Heartbeat] Reconnect failed for ${storeId}:`, err?.message);
            });
          }
        } catch (e) {}
      }
    }
  }
}, 25000);

// ─── SECURE SERVER-SIDE AI PROXY ENDPOINTS ────────────────────────────────
async function executeBackendAi({ prompt, jsonMode, groqKey, geminiKey }) {
  if (geminiKey && geminiKey.length > 15) {
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];
    for (const model of models) {
      try {
        const body = {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: jsonMode ? 600 : 350,
          },
        };
        if (jsonMode) {
          body.generationConfig.responseMimeType = 'application/json';
        }
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (e) {
        console.warn(`[Baileys Server AI] Gemini ${model} failed:`, e?.message);
      }
    }
  }

  if (groqKey && groqKey.length > 15) {
    const models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    for (const model of models) {
      try {
        const body = {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: jsonMode ? 750 : 850,
        };
        if (jsonMode) {
          body.response_format = { type: 'json_object' };
        }
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text) return text.trim();
        }
      } catch (e) {
        console.warn(`[Baileys Server AI] Groq ${model} failed:`, e?.message);
      }
    }
  }

  return null;
}

app.post('/api/ai/marketing', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const groqKey = process.env.GROQ_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const text = await executeBackendAi({ prompt, jsonMode: true, groqKey, geminiKey });
    if (text) {
      return res.json({ success: true, text });
    }
    return res.status(502).json({ success: false, error: 'AI provider unavailable' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.post('/api/ai/description', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    const groqKey = process.env.GROQ_API_KEY || '';
    const geminiKey = process.env.GEMINI_API_KEY || '';
    const text = await executeBackendAi({ prompt, jsonMode: false, groqKey, geminiKey });
    if (text) {
      return res.json({ success: true, text });
    }
    return res.status(502).json({ success: false, error: 'AI provider unavailable' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.listen(PORT, async () => {
  console.log(`⚡ Taaa.shop Baileys Multi-Tenant WhatsApp Server running on port ${PORT}`);
  await restoreAllSessions();
});
