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
/**
 * Detects the real physical product niche from the title and category.
 */
export function detectProductNiche(
  title: string,
  category?: string
): 'power' | 'fashion' | 'perfume' | 'tech' | 'beauty' | 'jewelry' | 'food' | 'general' {
  const t = `${title} ${category || ''}`.toLowerCase();

  if (
    t.match(
      /inverter|solar|battery|generator|panel|ups|stabilizer|kva|watt|power|charge controller|mppt|amp|volts|backup|grid/
    )
  ) {
    return 'power';
  }
  if (t.match(/perfume|scent|fragrance|oud|extrait|edp|cologne|body mist|oil|decant/)) {
    return 'perfume';
  }
  if (
    t.match(
      /dress|abaya|cloth|shirt|shoe|sneaker|heel|suit|hoodie|trouser|pant|jean|skirt|gown|wear|fabric|lace|agbada|kaftan|tee|top|jacket|sandals/
    )
  ) {
    return 'fashion';
  }
  if (
    t.match(
      /phone|iphone|samsung|laptop|macbook|pod|airpod|gadget|headphone|watch|smartwatch|charger|cable|console|ps5|tablet|ipad/
    )
  ) {
    return 'tech';
  }
  if (
    t.match(
      /cream|serum|soap|lotion|skin|glow|hair|wig|skincare|cosmetic|facial|cleanser|sunscreen|makeup|lipstick/
    )
  ) {
    return 'beauty';
  }
  if (t.match(/gold|silver|jewelry|jewel|ring|necklace|chain|bracelet|bangle|earring|diamond/)) {
    return 'jewelry';
  }
  if (t.match(/food|snack|spice|oil|rice|pasta|drink|grocery|provision/)) {
    return 'food';
  }
  return 'general';
}

/**
 * Generates an attractive product description (2–4 short paragraphs).
 * 1. Calls secure server proxy (/api/ai/description) → Gemini then Groq server-side.
 * 2. Falls back to dynamic randomized intelligent niche-aware copy.
 */
export async function generateProductDescription(
  name: string,
  category?: string,
  price?: number | string,
  currencySymbol = '₦'
): Promise<string> {
  const niche = detectProductNiche(name, category);

  const prompt = `You are a master product copywriter and e-commerce conversion specialist for African retail and social commerce.
Write an authentic, highly-specific product description for:
- Product Title: ${name.trim()}
- Category: ${category && category !== 'General' ? category : niche.toUpperCase()}
- Price: ${price ? `${currencySymbol} ${price}` : 'Special Offer'}
- Detected Domain: ${niche.toUpperCase()}

DOMAIN-SPECIFIC WRITING RULES:
${
  niche === 'power'
    ? `* THIS IS A POWER / SOLAR / ENERGY PRODUCT. Focus on 24/7 continuous electricity, zero generator fuel bills, peace of mind during grid/NEPA blackouts, pure sine wave protection for sensitive home/office appliances, and battery management. NEVER talk about clothing, fabrics, sizes, chic aesthetics, or outfit styling!`
    : niche === 'fashion'
    ? `* THIS IS APPAREL / FASHION. Focus on fabric texture, breathability, tailoring, fit, comfort, silhouette, and versatile styling for work, outings, or celebrations.`
    : niche === 'perfume'
    ? `* THIS IS A FRAGRANCE / SCENT. Focus on scent notes (top, heart, base), projection, longevity, compliments, and authentic oil concentration.`
    : niche === 'tech'
    ? `* THIS IS ELECTRONICS / TECH. Focus on processing speed, battery endurance, storage, build durability, smooth daily performance, and warranty.`
    : niche === 'beauty'
    ? `* THIS IS BEAUTY / SKINCARE. Focus on skin hydration, natural glow, active ingredients, non-comedogenic texture, and visible results.`
    : `* Focus on practical utility, real-world benefits, durable materials, and exceptional daily performance.`
}

STRUCTURE (Strictly 3 to 4 short, self-contained paragraphs):
- Paragraph 1 (The Problem & Solution): What this specific product actually does and the real-world daily problem it solves for the buyer.
- Paragraph 2 (Key Specs & Capabilities): Authentic, realistic specifications and practical performance details.
- Paragraph 3 (Durability & Assurance): Build quality, safety features, reliability, and long-term satisfaction.
- Paragraph 4 (Action Call): A crisp reason to purchase now with fast nationwide delivery. ${
    niche === 'fashion' ? 'Mention sizing options.' : 'Do NOT mention size or fit!'
  }

STRICT CONSTRAINTS:
1. NO markdown headings (no #, ##, ###).
2. NO bullet points (*, -) or tables.
3. NO intro greetings (do NOT say "Introducing...", "Welcome to...", or "Looking for...").
4. Separate each paragraph with a single blank line.
5. Keep total write-up between 140 to 200 words so all sentences finish completely without truncation.`;

  // 1. Try secure server-side proxy
  try {
    const text = await callAIProxy('/api/ai/description', prompt);
    if (text && text.length > 20) {
      const paragraphs = text
        .trim()
        .split(/\n\s*\n/)
        .map((p: string) => p.replace(/^[#*\-•\s]+/, '').trim())
        .filter((p: string) => p.length > 0 && !p.startsWith('---') && !p.startsWith('***'))
        .slice(0, 4);

      if (paragraphs.length >= 2) {
        return paragraphs.join('\n\n');
      }
    }
  } catch (err) {
    console.warn('[AI Description] Proxy call failed, falling back to local niche engine:', err);
  }

  // 2. Intelligent, niche-aware fallback (never generic)
  return generateDynamicDescriptionFallback(name, category, price, currencySymbol);
}

/**
 * Intelligent randomized fallback that generates lively, tailored paragraphs
 * specifically written for the exact detected niche so it feels 100% unique.
 */
export function generateDynamicDescriptionFallback(
  name: string,
  category?: string,
  price?: number | string,
  currencySymbol = '₦'
): string {
  const cleanTitle = name.trim();
  const niche = detectProductNiche(name, category);
  const priceDisplay = price ? `${currencySymbol}${price}` : 'an unbeatable price';

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  if (niche === 'power') {
    const openers = [
      `Say goodbye to sudden blackouts, noisy generators, and endless fuel expenses. The ${cleanTitle} delivers steady, reliable electricity so your home or business runs seamlessly 24/7.`,
      `Take total control of your power supply with the high-performance ${cleanTitle}. Designed to eliminate downtime and keep your essential equipment running without interruption.`,
      `Enjoy uninterrupted living and heavy-duty performance with the genuine ${cleanTitle}. Built specifically to conquer demanding power fluctuations and frequent grid outages.`
    ];
    const specs = [
      `Engineered with advanced pure sine wave technology that safely powers sensitive electronics, refrigerators, and lighting systems without humming or harmonic distortion. Features intelligent charging algorithms to maximize energy conversion and extend battery lifespan.`,
      `Equipped with smart multi-stage protection against overloads, high temperatures, and short circuits. Automatically switches between power sources in milliseconds, so your computers and appliances never shut down unexpectedly.`,
      `Delivers robust load-handling capacity and silent, clean operation. Built with high-efficiency copper windings and a heavy-duty cooling system designed for maximum African climate endurance.`
    ];
    const closers = [
      `Available now for prompt nationwide dispatch at ${priceDisplay}. Tap the WhatsApp button right now to confirm your order and delivery address!`,
      `Brand new with guaranteed quality assurance. Click order on WhatsApp today to secure yours before current warehouse stock sells out!`,
      `Delivered directly to your door with trusted warranty support. Tap WhatsApp right now to place your order with complete confidence!`
    ];
    return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
  }

  if (niche === 'perfume') {
    const openers = [
      `Turn heads and command any room with the captivating presence of ${cleanTitle}. A luxurious fragrance crafted for those who value sophistication and unforgettable allure.`,
      `Leave a lasting impression wherever you go with the genuine ${cleanTitle}. Rich, distinctive, and meticulously formulated to announce your arrival before you speak a word.`,
      `Elevate your personal signature with the intoxicating blend of ${cleanTitle}. An exquisite scent experience designed to draw genuine compliments from day to night.`
    ];
    const specs = [
      `Boasts an opulent composition of rich top, heart, and base notes that evolve gracefully across your skin. Formulated with high-concentration perfume oils that guarantee impressive projection and lasting sillage.`,
      `Masterfully blended from premium fragrance oils that adapt harmoniously to your natural body chemistry. Offers remarkable 12+ hour longevity that carries effortlessly from morning meetings to evening celebrations.`,
      `A refined olfactory journey featuring warm, deep undertones and vibrant accents. Balanced, sophisticated, and guaranteed 100% authentic with zero harsh synthetic alcohol harshness.`
    ];
    const closers = [
      `Carefully packaged and ready for speedy delivery nationwide at ${priceDisplay}. Tap the WhatsApp button now to secure your bottle today!`,
      `Limited quantity produced per batch. Tap WhatsApp right now to claim yours and step out smelling undeniably elite!`,
      `100% original guaranteed. Order directly through WhatsApp for prompt same-day handling and door delivery!`
    ];
    return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
  }

  if (niche === 'fashion') {
    const openers = [
      `Step out with unmatched confidence and poise in the ${cleanTitle}. Beautifully curated to bring you the perfect harmony of contemporary style, comfort, and elegance.`,
      `Elevate your wardrobe with the exquisite ${cleanTitle}. Designed for those who appreciate premium tailoring, sharp silhouettes, and effortless everyday luxury.`,
      `Turn heads at every gathering with the ${cleanTitle}. An essential fashion statement that seamlessly transitions from professional settings to memorable celebrations.`
    ];
    const specs = [
      `Cut from breathable, high-grade fabrics that feel luxuriously soft against your skin while maintaining their sharp drape and structure through repeated wear and washing.`,
      `Expert tailoring meets modern street-smart elegance. Precision stitching, durable textiles, and a flattering fit ensure you look effortlessly put together all day long.`,
      `Thoughtfully constructed with premium materials that prioritize all-day ease without compromising on aesthetic appeal. A versatile piece that pairs effortlessly with your favorite accessories.`
    ];
    const closers = [
      `Available for quick dispatch nationwide at ${priceDisplay}. Tap WhatsApp right now to confirm your size and delivery address!`,
      `Limited stock available per color and size. Tap the WhatsApp button today to reserve yours before it's gone!`,
      `Carefully packaged and delivered straight to your doorstep. Tap WhatsApp to confirm your size and place your order!`
    ];
    return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
  }

  if (niche === 'tech') {
    const openers = [
      `Experience responsive speed, cutting-edge capability, and dependable daily performance with the ${cleanTitle}. Engineered to keep up with your busy workflow and entertainment.`,
      `Upgrade your digital lifestyle with the ${cleanTitle}. Built with high-efficiency components to deliver smooth responsiveness and reliability without lag.`,
      `Meet your newest high-performance essential — the genuine ${cleanTitle}. Thoughtfully designed to enhance your daily productivity, gaming, and communication.`
    ];
    const specs = [
      `Powered by high-efficiency internal architecture optimized for battery endurance, rapid data connectivity, and everyday durability. Built with a rugged yet sleek finish that handles rigorous daily usage.`,
      `Engineered for seamless multitasking, crystal-clear output, and long-lasting battery life. Rigorously tested to deliver peak efficiency whether for work, study, or content creation.`,
      `Combines modern minimalist aesthetics with uncompromising build quality. Features intuitive controls and dependable hardware certified for lasting customer satisfaction.`
    ];
    const closers = [
      `Brand new in box with verified authenticity at ${priceDisplay}. Tap WhatsApp right now to secure yours with fast nationwide dispatch!`,
      `Ready for immediate nationwide delivery. Tap the WhatsApp button now to confirm your order and delivery address today!`,
      `Limited units in stock. Click order on WhatsApp right now to get yours delivered safely to your door!`
    ];
    return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
  }

  if (niche === 'beauty') {
    const openers = [
      `Revitalize your daily self-care ritual and reveal a radiant, healthy glow with the ${cleanTitle}. Specially curated for visible, lasting skin confidence.`,
      `Give your skin the pampering it truly deserves with ${cleanTitle}. Formulated with nourishing nutrients to restore texture, bounce, and vibrant luminosity.`,
      `Experience noticeable transformation with the genuine ${cleanTitle}. A gentle yet powerful beauty essential that enhances your natural glow every single day.`
    ];
    const specs = [
      `Infused with skin-loving, deeply hydrating active ingredients that absorb swiftly without greasy residue. Safe and gentle for everyday application across all sensitive skin types.`,
      `Dermatologically tested to replenish moisture, smooth fine texture, and protect against environmental dryness. Delivers noticeable, silky softness you can feel from the first use.`,
      `Packed with rich botanical extracts and restorative vitamins that nourish deep beneath the surface. Lightweight consistency with an invigorating, fresh feel.`
    ];
    const closers = [
      `Authentic and ready for swift door delivery at ${priceDisplay}. Tap WhatsApp right now to place your order with complete confidence!`,
      `Stock is strictly limited. Tap the WhatsApp button today to secure your genuine bottle before we run out!`,
      `Carefully packaged and dispatched nationwide. Tap WhatsApp to confirm your order and delivery address now!`
    ];
    return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
  }

  if (niche === 'jewelry') {
    const openers = [
      `Add timeless radiance and prestige to your signature look with the ${cleanTitle}. Meticulously crafted to catch the light and command quiet admiration.`,
      `Celebrate pure craftsmanship and elegance with the genuine ${cleanTitle}. An enduring luxury piece that elevates everyday attire and special occasion outfits alike.`,
      `Make an unforgettable statement of class with ${cleanTitle}. Beautifully detailed to bring lasting brilliance and refined sparkle to your collection.`
    ];
    const specs = [
      `Finished with a durable, high-luster tarnish-resistant coating that retains its brilliant shine through daily wear. Hypoallergenic, lightweight, and engineered for all-day comfort.`,
      `Exquisite artisanal craftsmanship with precision detailing from every angle. Built from premium-grade alloys designed to withstand fading and wear.`,
      `Thoughtfully proportioned for effortless elegance. Pairs seamlessly with casual styling or formal evening ensembles, making it an extraordinary personal piece or gift.`
    ];
    const closers = [
      `Comes in signature protective packaging at ${priceDisplay}. Tap WhatsApp right now to secure yours before current drop sells out!`,
      `Limited quantity crafted per collection. Tap the WhatsApp button today to order with nationwide door delivery!`,
      `Guaranteed brand new and authentic. Order directly on WhatsApp for prompt handling and secure delivery!`
    ];
    return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
  }

  // General fallback
  const openers = [
    `Experience exceptional utility, dependable durability, and superior craftsmanship with the ${cleanTitle}. Designed to exceed your expectations every single day.`,
    `Meet your newest favorite essential — the genuine ${cleanTitle}. Crafted for those who demand authentic quality, practical performance, and lasting value.`,
    `Step up your everyday standard with ${cleanTitle}. Meticulously selected to deliver consistent, dependable results you can trust.`
  ];
  const specs = [
    `Built from premium-grade materials engineered for rigorous daily use and long-term satisfaction. Every single component is checked to ensure dependable reliability.`,
    `Combines functional efficiency with modern design. Engineered for straightforward, hassle-free operation that makes your daily routine significantly easier.`,
    `Offers outstanding performance and solid build quality that stands the test of time. A worthwhile upgrade that delivers genuine return on your investment.`
  ];
  const closers = [
    `Available for quick dispatch nationwide at ${priceDisplay}. Tap the WhatsApp button right now to place your order with complete confidence!`,
    `Brand new and ready for speedy delivery to your doorstep. Tap WhatsApp now to confirm your order and delivery address today!`,
    `Guaranteed brand new and authentic. Click WhatsApp to place your order today for prompt customer support!`
  ];
  return `${pick(openers)}\n\n${pick(specs)}\n\n${pick(closers)}`;
}
