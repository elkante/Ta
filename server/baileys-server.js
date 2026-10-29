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
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SESSIONS_DIR = path.resolve('./sessions');

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// In-memory registry of active store WhatsApp sessions
// Map<storeId, { sock, status: 'connecting'|'connected'|'disconnected', qrDataUrl: string|null, phone: string|null, catalog: Array }>
const activeSessions = new Map();

// In-memory store of recent messages for Signal retry key negotiation
// Essential to prevent "Waiting for this message. This may take a while"
const messageStore = new Map();

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
 * Initializes or retrieves an isolated WhatsApp socket for a specific store.
 */
async function initStoreSession(storeId, storeCatalog = [], storeInfo = {}) {
  if (activeSessions.has(storeId)) {
    const existing = activeSessions.get(storeId);
    if (existing.status === 'connected') {
      existing.catalog = storeCatalog;
      if (storeInfo && Object.keys(storeInfo).length > 0) existing.storeInfo = storeInfo;
      return existing;
    }
  }

  const storeSessionDir = path.join(SESSIONS_DIR, storeId);
  const { state, saveCreds } = await useMultiFileAuthState(storeSessionDir);

  const sessionData = {
    sock: null,
    status: 'connecting',
    qrDataUrl: null,
    phone: null,
    catalog: storeCatalog,
    storeInfo: storeInfo || {},
  };
  activeSessions.set(storeId, sessionData);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }), // suppress verbose protocol logs
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    syncFullHistory: false,
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
        sessionData.status = 'waiting_scan';
        console.log(`[Store: ${storeId}] QR code generated. Waiting for merchant to scan.`);
      } catch (err) {
        console.error('Failed to convert QR to DataURL:', err);
      }
    }

    if (connection === 'open') {
      sessionData.status = 'connected';
      sessionData.qrDataUrl = null;
      const userJid = sock.user?.id || '';
      sessionData.phone = userJid.split(':')[0] || userJid.split('@')[0];
      console.log(`[Store: ${storeId}] WhatsApp connected successfully! Phone: ${sessionData.phone}`);
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode
        : null;

      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      sessionData.status = 'disconnected';
      sessionData.qrDataUrl = null;

      if (!isLoggedOut) {
        console.log(`[Store: ${storeId}] Connection dropped, reconnecting...`);
        initStoreSession(storeId, sessionData.catalog);
      } else {
        console.log(`[Store: ${storeId}] Logged out. Cleaned session credentials.`);
        try {
          fs.rmSync(storeSessionDir, { recursive: true, force: true });
        } catch (e) {}
        activeSessions.delete(storeId);
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
      const storeBaseUrl = `https://${storeSlug}.ta.shop`;

      const matchedProduct = currentCatalog.find(
        (p) =>
          (p.uid && p.uid.toUpperCase() === queryUid) ||
          cleanText.toLowerCase().includes(p.name.toLowerCase())
      );

      if (matchedProduct) {
        // Send automated product card & instant checkout link
        const reply =
          `👋 Hello! Here is the item you requested from *${storeName}*:\\n\\n` +
          `🏷️ *${matchedProduct.name}*\\n` +
          `💰 *Price:* ₦${Number(matchedProduct.price).toLocaleString()}\\n` +
          `📦 *Status:* ${matchedProduct.inStock ? '✅ In Stock (Ready to dispatch)' : '❌ Sold Out'}\\n` +
          `🔑 *Item Code:* #${matchedProduct.uid}\\n\\n` +
          `👉 *Tap here to view photos & complete order:*\\n` +
          `${storeBaseUrl}/?product=${matchedProduct.id}`;

        await safeSendMessage(sock, remoteJid, { text: reply });
        continue;
      }

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
        if (matches.length > 0) {
          const listText = matches
            .slice(0, 5)
            .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()}) ${p.inStock ? '✅' : '❌'}`)
            .join('\n');
          const reply =
            `🔍 Here's what we found at *${storeName}* for "*${searchTerm}*":\\n\\n` +
            `${listText}\\n\\n` +
            `Reply with any *#Item Code* for full details, or visit:\\n${storeBaseUrl}`;
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
          `👋 Hi! Thanks for reaching out to *${storeName}*.\\n\\n` +
          `${deliveryText}${locationText}${hoursText}\\n\\n` +
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
            `💰 *Price List — ${storeName}*\\n\\n` +
            `${listText}\\n\\n` +
            `Reply with an *#Item Code* for full details, or view all: ${storeBaseUrl}`;
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
          `👋 Welcome to *${storeName}*! 🛍️${openHoursLine}${locationLine}\\n\\n` +
          `Here are some popular items:\\n${listText}\\n\\n` +
          `👉 *Browse our full catalog:* ${storeBaseUrl}\\n` +
          `Reply with any *#Item Code* (e.g. #${topProducts[0]?.uid || 'TA-ITEM'}) for details!\\n\\n` +
          `You can also ask me:\\n• "Do you have bags?" — category search\\n• "Delivery info" — shipping & location\\n• "Price list" — current prices`;

        await safeSendMessage(sock, remoteJid, { text: reply });
      }
    }
  });

  return sessionData;
}

// ─── HTTP API ROUTES FOR THE TÁ.SHOP DASHBOARD ──────────────────────────────

/**
 * Root Route & Service Status
 */
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Tá.shop Multi-Tenant Baileys WhatsApp Engine',
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
app.get('/api/whatsapp/status/:storeId', (req, res) => {
  const { storeId } = req.params;
  const session = activeSessions.get(storeId);

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
  });
});

/**
 * Start pairing session — emits live QR code to dashboard
 */
app.post('/api/whatsapp/connect/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { catalog = [], storeInfo = {} } = req.body;

  try {
    const session = await initStoreSession(storeId, catalog, storeInfo);
    res.json({
      success: true,
      status: session.status,
      connected: session.status === 'connected',
      qrDataUrl: session.qrDataUrl,
      phone: session.phone,
    });
  } catch (error) {
    console.error(`Failed to initialize session for ${storeId}:`, error);
    res.status(500).json({ error: 'Failed to start WhatsApp socket' });
  }
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

    const merchantAlert =
      `🚨 *NEW ORDER RECEIVED VIA TÁ.SHOP!* 🚨\n\n` +
      `🧾 *Order ID:* #${order.id}\n` +
      `👤 *Customer:* ${order.buyerName}\n` +
      `📞 *Phone:* ${order.buyerPhone}\n` +
      `📍 *Fulfillment:* ${(order.fulfillmentMethod || 'Delivery').toUpperCase()}\n` +
      (order.deliveryAddress ? `🏠 *Address:* ${order.deliveryAddress}\n` : '') +
      (order.buyerNotes ? `💬 *Note:* "${order.buyerNotes}"\n` : '') +
      `\n📦 *PACKING LIST:*\n${itemsText}\n\n` +
      `💰 *Total Amount:* ₦${Number(order.totalAmount).toLocaleString()}\n\n` +
      `⚡ *View Dispatch Waybill in your Dashboard:* https://${store.slug || storeId}.ta.shop/admin`;

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


app.listen(PORT, () => {
  console.log(`⚡ Tá.shop Baileys Multi-Tenant WhatsApp Server running on port ${PORT}`);
});
