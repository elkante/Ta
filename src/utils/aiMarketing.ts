/**
 * AI Marketing, Caption, Keyword & Hashtag Generator
 * Connects with Google AI Studio (Gemini) API + intelligent offline marketing fallback.
 */

import { Product, Store } from '../types';
import { formatPrice } from './whatsapp';
import { getRootDomain } from './storage';

// API key is stored by the seller in localStorage via the AI Studio settings panel.
// Never hardcode API keys in source — sellers paste their own free Google AI Studio key.
const DEFAULT_AI_KEY = '';

export interface AIMarketingResult {
  whatsappCaption: string;
  instagramCaption: string;
  tiktokCaption: string;
  hashtags: string[];
  keywords: string[];
}

export type MarketingTone = 'viral' | 'luxury' | 'urgent' | 'minimal';

export function getStoredAIKey(): string {
  try {
    return localStorage.getItem('ta_gemini_api_key') || DEFAULT_AI_KEY;
  } catch {
    return DEFAULT_AI_KEY;
  }
}

export function saveStoredAIKey(key: string): void {
  try {
    localStorage.setItem('ta_gemini_api_key', key.trim());
  } catch {}
}

/**
 * Returns the daily generation cap for a store under the 1,000,000 token/day Google AI Studio key.
 */
export function getStoreAICap(store: Store): number {
  if (store.aiDailyUsage?.customCap && store.aiDailyUsage.customCap > 0) {
    return store.aiDailyUsage.customCap;
  }
  switch (store.tier) {
    case 'business':
      return 250;
    case 'pro':
      return 100;
    case 'starter':
      return 50;
    case 'free':
    default:
      return 25;
  }
}

/**
 * Calculates current day's AI usage and remaining quota for a store.
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
 * Increments today's AI generation usage for the store.
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

/**
 * Intelligent algorithmic generator that always produces high-converting African social commerce
 * captions, keywords, and hashtags even if network or API keys fail.
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

/**
 * Main AI generation method: attempts Google AI Studio REST call with the configured key,
 * and gracefully falls back to the local marketing engine if the API key fails.
 */
export async function generateMarketingContentWithAI(
  product: Partial<Product>,
  store: Store,
  tone: MarketingTone = 'viral',
  customKey?: string
): Promise<AIMarketingResult> {
  const activeKey = customKey || getStoredAIKey();

  // Try real Google AI Studio / Gemini API if key is provided
  if (activeKey && activeKey.startsWith('AIzaSy')) {
    try {
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

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
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
      }
    } catch (err) {
      console.warn('AI Studio API call failed, using intelligent fallback engine:', err);
    }
  }

  // Guaranteed fallback
  return generateLocalMarketingContent(product, store, tone);
}
