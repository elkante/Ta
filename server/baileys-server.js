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

/**
 * Initializes or retrieves an isolated WhatsApp socket for a specific store.
 */
async function initStoreSession(storeId, storeCatalog = []) {
  if (activeSessions.has(storeId)) {
    const existing = activeSessions.get(storeId);
    if (existing.status === 'connected') return existing;
  }

  const storeSessionDir = path.join(SESSIONS_DIR, storeId);
  const { state, saveCreds } = await useMultiFileAuthState(storeSessionDir);

  const sessionData = {
    sock: null,
    status: 'connecting',
    qrDataUrl: null,
    phone: null,
    catalog: storeCatalog,
  };
  activeSessions.set(storeId, sessionData);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }), // suppress verbose protocol logs
    printQRInTerminal: false,
    browser: ['Tá.shop Social Catalog', 'Chrome', '1.0.0'],
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
      if (!msg.message || msg.key.fromMe) continue;

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
      const matchedProduct = currentCatalog.find(
        (p) =>
          (p.uid && p.uid.toUpperCase() === queryUid) ||
          cleanText.toLowerCase().includes(p.name.toLowerCase())
      );

      if (matchedProduct) {
        // Send automated product card & instant checkout link
        const reply =
          `👋 Hello! Here is the item you requested:\n\n` +
          `🏷️ *${matchedProduct.name}*\n` +
          `💰 *Price:* ₦${Number(matchedProduct.price).toLocaleString()}\n` +
          `📦 *Status:* ${matchedProduct.inStock ? '✅ In Stock (Ready to dispatch)' : '❌ Sold Out'}\n` +
          `🔑 *Item Code:* #${matchedProduct.uid}\n\n` +
          `👉 *Tap here to view photos & complete order:*\n` +
          `https://${storeId}.ta.shop/?product=${matchedProduct.id}`;

        await sock.sendMessage(remoteJid, { text: reply });
        continue;
      }

      // Greetings or Catalog request
      if (/^(hi|hello|hey|catalog|products|price list)/i.test(cleanText)) {
        const topProducts = currentCatalog.slice(0, 5);
        const listText = topProducts
          .map((p) => `• *#${p.uid}* - ${p.name} (₦${Number(p.price).toLocaleString()})`)
          .join('\n');

        const reply =
          `👋 Welcome to our WhatsApp catalog!\n\n` +
          `Here are some of our popular items:\n${listText}\n\n` +
          `👉 *Browse our full online catalog:* https://${storeId}.ta.shop\n` +
          `Reply with any *#Item UID* (e.g. #${topProducts[0]?.uid || 'TA-ITEM'}) to get details!`;

        await sock.sendMessage(remoteJid, { text: reply });
      }
    }
  });

  return sessionData;
}

// ─── HTTP API ROUTES FOR THE TÁ.SHOP DASHBOARD ──────────────────────────────

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
  const { catalog = [] } = req.body;

  try {
    const session = await initStoreSession(storeId, catalog);
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

app.listen(PORT, () => {
  console.log(`⚡ Tá.shop Baileys Multi-Tenant WhatsApp Server running on port ${PORT}`);
});
