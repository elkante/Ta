/**
 * AI Marketing, Caption, Keyword, Hashtag & Product Description Generator
 * All live API calls go through the secure server-side proxy (/api/ai/*).
 * Keys are NEVER read from the browser — no import.meta.env, no localStorage key reads.
 */

import { Product, Store } from '../types';
import { formatPrice } from './whatsapp';
import { getRootDomain } from './storage';

export interface AIMarketingResult {
  whatsappCaption: string;
  instagramCaption: string;
  tiktokCaption: string;
  hashtags: string[];
  keywords: string[];
}

export type MarketingTone = 'viral' | 'luxury' | 'urgent' | 'minimal';

// ─── Tier Caps ────────────────────────────────────────────────────────────────

/**
 * Daily AI Viral Marketing Studio generations per store tier.
 * free & starter → 0 (no access), basic → 5, pro → 15, business → 30.
 */
export function getStoreAICap(store: Store): number {
  if (store.aiDailyUsage?.customCap && store.aiDailyUsage.customCap > 0) {
    return store.aiDailyUsage.customCap;
  }
  switch (store.tier) {
    case 'business': return 30;
    case 'pro':      return 15;
    case 'basic':    return 5;
    case 'starter':
    case 'free':
    default:         return 0;
  }
}

/**
 * Daily AI Product Description generations per tier.
 * free & starter → 0, basic → 3, pro → 5, business → 15.
 */
export function getDescriptionCapByTier(tier?: string): number {
  switch (tier) {
    case 'business': return 15;
    case 'pro':      return 5;
    case 'basic':    return 3;
    case 'starter':
    case 'free':
    default:         return 0;
  }
}

// ─── Usage Tracking ───────────────────────────────────────────────────────────

/**
 * Calculates current day's AI usage and remaining quota for a store (marketing).
 */
export function getStoreAIUsage(store: Store): {
  used: number;
  cap: number;
  remaining: number;
  isCapReached: boolean;
  todayStr: string;
} {
  const todayStr = new Date().toISOString().slice(0, 10);
  const used = store.aiDailyUsage?.date === todayStr ? (store.aiDailyUsage.count || 0) : 0;
  const cap = getStoreAICap(store);
  const remaining = Math.max(0, cap - used);
  return {
    used,
    cap,
    remaining,
    isCapReached: remaining <= 0,
    todayStr,
  };
}

/**
 * Increments today's AI generation usage for the store (marketing).
 */
export function incrementStoreAIUsage(store: Store): { updatedStore: Store; remaining: number } {
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentCount = store.aiDailyUsage?.date === todayStr ? (store.aiDailyUsage.count || 0) : 0;
  const newCount = currentCount + 1;
  const cap = getStoreAICap(store);

  const updatedStore: Store = {
    ...store,
    aiDailyUsage: {
      date: todayStr,
      count: newCount,
      customCap: store.aiDailyUsage?.customCap,
    },
  };

  return {
    updatedStore,
    remaining: Math.max(0, cap - newCount),
  };
}

// ─── Server-Side Proxy Calls ──────────────────────────────────────────────────

/**
 * Calls the secure server-side AI proxy for marketing content.
 * In dev: handled by Vite middleware.
 * In prod: handled by Baileys Express server or serverless function.
 * The API key is NEVER sent to or from the browser.
 */
async function callAIProxy(
  endpoint: '/api/ai/marketing' | '/api/ai/description',
  prompt: string
): Promise<string | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.text && typeof data.text === 'string' && data.text.trim().length > 10) {
        return data.text.trim();
      }
    }
  } catch (err) {
    console.warn(`[AI Proxy] ${endpoint} request failed:`, err);
  }
  return null;
}

// ─── Local Offline Fallback ───────────────────────────────────────────────────

/**
 * Intelligent algorithmic generator that always produces high-converting African social commerce
 * captions, keywords, and hashtags even when the proxy is unavailable.
 */
export function generateLocalMarketingContent(
  product: Partial<Product>,
  store: Store,
  tone: MarketingTone = 'viral'
): AIMarketingResult {
  const name = product.name || 'Featured Item';
  const priceStr = formatPrice(product.price || 0, store.currencySymbol || '₦');
  const uid = product.uid || 'TA-DROP';
  const category = product.category || 'Collection';
  const storeLink = store.customDomain || `${store.slug}.${getRootDomain()}`;

  const categoryTags: Record<string, string[]> = {
    jewelry: ['#NaijaJewelry', '#GoldJewelryNigeria', '#LagosJewelryVendor', '#LuxuryJewelryNG', '#JewelryInLagos'],
    perfume: ['#NaijaPerfumes', '#LagosPerfumeVendor', '#PerfumeLoversNG', '#ScentOfTheDayNG', '#AffordableLuxuryNG'],
    fragrance: ['#NaijaPerfumes', '#LagosPerfumeVendor', '#PerfumeTok', '#FragranceTok', '#LuxuryScentsNG'],
    fashion: ['#NaijaFashion', '#LagosFashionVendor', '#NaijaBrand', '#ReadyToWearNG', '#FashionInLagos'],
    beauty: ['#NaijaBeauty', '#LagosBeautyVendor', '#SkinCareNG', '#GlowWithMe', '#BeautyTokNG'],
    shoes: ['#NaijaShoes', '#LagosShoeVendor', '#HeelsInLagos', '#SneakersNG', '#FootwearNG'],
    bags: ['#NaijaBags', '#LuxuryBagsNG', '#LagosBagVendor', '#BagLoversNG', '#ToteBagNG'],
  };

  const catLower = category.toLowerCase();
  const matchedKey = Object.keys(categoryTags).find((k) => catLower.includes(k)) || 'fashion';
  const specificTags = categoryTags[matchedKey] || categoryTags['fashion'];

  const generalViralTags = [
    '#LagosVendors',
    '#NaijaSmallBusiness',
    '#ShopLocalNG',
    '#LagosBusinesses',
    '#TrendingInNigeria',
    '#TikTokNaija',
    '#fypng',
  ];

  const allHashtags = Array.from(new Set([...specificTags, ...generalViralTags]));

  const keywords = [
    name.toLowerCase(),
    `buy ${name.toLowerCase()}`,
    `${category.toLowerCase()} lagos`,
    `${store.name.toLowerCase()} catalog`,
    `best ${category.toLowerCase()} nigeria`,
    `${name.toLowerCase()} price`,
    'original quality',
    'fast nationwide delivery',
    'whatsapp catalog ordering',
  ];

  let whatsappCaption = '';
  let instagramCaption = '';
  let tiktokCaption = '';

  if (tone === 'luxury') {
    whatsappCaption = `✨ *EXCLUSIVE ARRIVAL: ${name.toUpperCase()}* ✨\n\nElevate your everyday standard with pure elegance from *${store.name}*.\n\n💎 *Item Code:* #${uid}\n🏷️ *Investment:* ${priceStr}\n📦 *Category:* ${category}\n\n👉 *To claim this piece immediately, tap reply and send #${uid} or view catalog:*\nhttps://${storeLink}\n\nFast nationwide dispatch & door delivery guaranteed.`;
    instagramCaption = `Sophistication in every detail. Introducing the ${name} by @${store.name}.\n\nCrafted for those who appreciate true refinement. Limited quantity produced per drop.\n\nCode: #${uid}\nPrice: ${priceStr}\n\n📲 Tap the link in our bio (${storeLink}) or send us a WhatsApp DM with #${uid} for instant checkout.\n\n${allHashtags.slice(0, 10).join(' ')}`;
    tiktokCaption = `POV: You found the most elegant ${category.toLowerCase()} in Lagos. Code #${uid} from ${store.name} ✨ Link in bio to shop!\n\n${allHashtags.slice(0, 8).join(' ')}`;
  } else if (tone === 'urgent') {
    whatsappCaption = `🚨 *LIMITED STOCK ALERT: ${name.toUpperCase()}* 🚨\n\nOnly a few pieces left in stock! Selling out rapidly at *${store.name}*.\n\n⚡ *Price:* ${priceStr}\n🔖 *Code:* #${uid}\n\n👉 *Reply now with #${uid} before it's gone!*\nBrowse live stock: https://${storeLink}`;
    instagramCaption = `RUN, DON'T WALK! 🏃💨 ${name} is flying off the shelves.\n\nStock is strictly limited. First to confirm on WhatsApp takes it.\n\n🔥 Price: ${priceStr}\n🏷️ Code: #${uid}\n\nTap link in bio (${storeLink}) or WhatsApp us code #${uid} right now!\n\n${allHashtags.slice(0, 10).join(' ')}`;
    tiktokCaption = `Don't say I didn't warn you! 😭 This ${name} is selling out today. Code #${uid} — tap link in bio to order!\n\n${allHashtags.slice(0, 8).join(' ')}`;
  } else {
    // Viral & Hype
    whatsappCaption = `🛍️ *NEW DROP: ${name.toUpperCase()} IS HERE!* 🛍️\n\nYou asked for it, we brought it! Direct from *${store.name}*.\n\n✨ *Code:* #${uid}\n💵 *Price:* ${priceStr}\n\n📲 *Reply with #${uid} to order instantly on WhatsApp!*\nOr tap link: https://${storeLink}\n\nDelivery nationwide!`;
    instagramCaption = `Your new obsession just landed! 🔥 Say hello to ${name}.\n\nTag someone who needs to see this! 👇\n\nPrice: ${priceStr}\nOrder Code: #${uid}\n\nHow to order:\n1️⃣ Tap link in bio (${storeLink})\n2️⃣ Or DM / WhatsApp us code #${uid}\n\n${allHashtags.slice(0, 12).join(' ')}`;
    tiktokCaption = `Tell me this isn't the cleanest ${category.toLowerCase()} you've seen this week! 😍 Drop code #${uid} in WhatsApp to grab yours. Link in bio!\n\n${allHashtags.slice(0, 8).join(' ')}`;
  }

  return {
    whatsappCaption,
    instagramCaption,
    tiktokCaption,
    hashtags: allHashtags,
    keywords,
  };
}

// ─── Main AI Generation Functions ─────────────────────────────────────────────

/**
 * Main AI marketing generation:
 * 1. Calls secure server proxy (/api/ai/marketing) → Gemini then Groq server-side.
 * 2. Falls back to local intelligent marketing engine if proxy is unavailable.
 */
export async function generateMarketingContentWithAI(
  product: Partial<Product>,
  store: Store,
  tone: MarketingTone = 'viral'
): Promise<AIMarketingResult> {
  const prompt = `You are an expert social media copywriter and growth marketer for Nigerian and African WhatsApp/Instagram sellers.
Generate viral marketing copy for this product:
Product Name: ${product.name}
Price: ${store.currencySymbol || '₦'}${product.price}
Item Code: #${product.uid || 'TA-ITEM'}
Category: ${product.category || 'General'}
Store Name: ${store.name}
Store Link: ${store.customDomain || `${store.slug}.${getRootDomain()}`}
Tone: ${tone}

Return a valid JSON object ONLY with this exact structure:
{
  "whatsappCaption": "string with emojis, clear CTA, item code, price, and link",
  "instagramCaption": "engaging Instagram post caption with hook, emojis, and hashtags",
  "tiktokCaption": "short catchy TikTok caption with hook and hashtags",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"]
}`;

  // 1. Try secure server-side proxy (Gemini → Groq handled server-side)
  try {
    const text = await callAIProxy('/api/ai/marketing', prompt);
    if (text) {
      const jsonStr = text.includes('{') ? text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1) : text;
      const parsed = JSON.parse(jsonStr);
      if (parsed.whatsappCaption && parsed.instagramCaption) {
        return {
          whatsappCaption: parsed.whatsappCaption,
          instagramCaption: parsed.instagramCaption,
          tiktokCaption: parsed.tiktokCaption || parsed.instagramCaption,
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
          keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
        };
      }
    }
  } catch (err) {
    console.warn('[AI Marketing] Proxy call or JSON parse failed, falling back to local:', err);
  }

  // 2. Guaranteed local fallback
  return generateLocalMarketingContent(product, store, tone);
}

/**
 * Generates an attractive product description (2–4 short paragraphs).
 * 1. Calls secure server proxy (/api/ai/description) → Gemini then Groq server-side.
 * 2. Falls back to dynamic randomized intelligent copy.
 */
export async function generateProductDescription(
  name: string,
  category?: string,
  price?: number | string,
  currencySymbol = '₦'
): Promise<string> {
  const prompt = `You are an elite product copywriter for top African e-commerce and social commerce brands.
Write a captivating, high-converting product description for:
- Product Title: ${name.trim()}
- Category: ${category || 'General'}
- Price: ${price ? `${currencySymbol} ${price}` : 'Special Offer'}

STRICT RULES:
1. Format into 2 to 4 short paragraphs tops (maximum 4 short paragraphs). No long write-ups, no fluff.
2. Keep it punchy, engaging, and readable for WhatsApp and Instagram shoppers.
3. Highlight premium quality, aesthetic appeal, and reasons to buy today.
4. Do NOT include markdown headings (no # or ##), bullet symbols (*), or intro greetings.
5. Separate each paragraph with a single blank line.`;

  // 1. Try secure server-side proxy
  try {
    const text = await callAIProxy('/api/ai/description', prompt);
    if (text && text.length > 20) {
      const paragraphs = text
        .trim()
        .split(/\n\s*\n/)
        .map((p: string) => p.replace(/^[#*\-•\s]+/, '').trim())
        .filter((p: string) => p.length > 0)
        .slice(0, 4);

      if (paragraphs.length > 0) {
        return paragraphs.join('\n\n');
      }
    }
  } catch (err) {
    console.warn('[AI Description] Proxy call failed, falling back to local:', err);
  }

  // 2. Dynamic intelligent fallback
  return generateDynamicDescriptionFallback(name, category, price, currencySymbol);
}

/**
 * Intelligent randomized fallback that generates 2–3 lively, tailored paragraphs
 * so the seller never gets the exact same repetitive description when offline.
 */
export function generateDynamicDescriptionFallback(
  name: string,
  category?: string,
  price?: number | string,
  currencySymbol = '₦'
): string {
  const cat = (category || 'item').toLowerCase();
  const cleanTitle = name.trim();

  const openers = [
    `Experience exceptional sophistication and style with the ${cleanTitle}. Designed to make an effortless statement wherever you go.`,
    `Meet your newest favorite everyday essential — the ${cleanTitle}. Crafted for those who appreciate premium quality and undeniable authenticity.`,
    `Step up your game with the genuine ${cleanTitle}. Beautifully curated to bring you the perfect blend of performance, elegance, and durability.`,
    `Turn heads and elevate your everyday lifestyle with ${cleanTitle}. Handpicked for superior finish and lasting value.`
  ];

  let details: string[];
  if (cat.includes('perfume') || cat.includes('fragrance') || cat.includes('scent')) {
    details = [
      `Formulated with deep, rich aromatic notes that project with distinction. Enjoy an enduring sillage that lingers gracefully from morning meetings to evening celebrations.`,
      `Boasting an exquisite blend of top, heart, and base notes that adapt harmoniously to your skin. Delivers impressive longevity and compliments with every spray.`,
      `A luxurious olfactory journey crafted from high-grade fragrance oils. Balanced, sophisticated, and guaranteed 100% authentic.`
    ];
  } else if (cat.includes('fashion') || cat.includes('cloth') || cat.includes('wear') || cat.includes('dress') || cat.includes('shoe')) {
    details = [
      `Cut from breathable, premium fabrics that prioritize comfort without sacrificing a sharp silhouette. Built to hold its shape beautifully through repeated wear.`,
      `Expert tailoring meets modern street-smart elegance. Soft on the skin, impeccably finished, and versatile enough for casual styling or formal outings.`,
      `Engineered for a flattering fit and maximum all-day ease. Precision stitching and durable textiles ensure lasting satisfaction.`
    ];
  } else if (cat.includes('jewel') || cat.includes('gold') || cat.includes('silver') || cat.includes('ring') || cat.includes('chain')) {
    details = [
      `Carefully finished with high-luster, tarnish-resistant coating. Hypoallergenic and lightweight, making it your go-to accent for daily shine.`,
      `Exquisite craftsmanship that captures the light from every angle. Classic timelessness paired with contemporary detailing.`,
      `Durable, radiant, and thoughtfully designed to pair seamlessly with your signature look or make a memorable gift.`
    ];
  } else if (cat.includes('tech') || cat.includes('gadget') || cat.includes('phone') || cat.includes('electronic')) {
    details = [
      `Powered by high-efficiency components and responsive performance. Streamlined to enhance your daily productivity and entertainment without lag.`,
      `Rugged build quality meets modern minimalist aesthetics. Optimized for battery efficiency, rapid connectivity, and everyday reliability.`,
      `Engineered to deliver seamless functionality and dependable results whenever you need it most.`
    ];
  } else if (cat.includes('beauty') || cat.includes('skin') || cat.includes('hair') || cat.includes('cosmetic')) {
    details = [
      `Infused with nourishing, skin-loving nutrients that revitalize and illuminate your natural texture. Gentle on sensitive skin and safe for daily use.`,
      `Formulated to hydrate, protect, and restore a youthful glow. Lightweight consistency that absorbs quickly without greasy residue.`,
      `A nourishing treat for your self-care ritual. Visible results with smooth, healthy radiance you can feel.`
    ];
  } else {
    details = [
      `Meticulously checked for uncompromising quality, durability, and practical utility. Designed to exceed expectations and deliver genuine satisfaction.`,
      `Premium grade materials crafted with attention to every single detail. Built to provide reliable performance day in and day out.`,
      `Offers exceptional value and craftsmanship you can trust. An ideal upgrade for discerning shoppers.`
    ];
  }

  const closers = [
    `Available for quick dispatch nationwide. Click order on WhatsApp now to secure yours before current stock runs out!`,
    `Carefully packaged and ready for speedy delivery to your doorstep. Tap WhatsApp to confirm your size and delivery address today!`,
    `Guaranteed brand new and authentic. Order directly through WhatsApp for prompt customer support and same-day handling.`,
    `Limited quantity in stock. Tap the WhatsApp button right now to place your order with complete confidence!`
  ];

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  return `${pick(openers)}\n\n${pick(details)}\n\n${pick(closers)}`;
}
