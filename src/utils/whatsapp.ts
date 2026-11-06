import { CartItem, Product, ProductVariant, Store } from '../types';
import { getPlatformBrandName } from './storage';

/**
 * Detects if the current client is a mobile device (Android, iPhone, iPad, etc.)
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Clean phone number for WhatsApp formats (both wa.me and whatsapp://).
 * wa.me and whatsapp:// require digits only in international format without + or leading zeros.
 * Handles Nigerian and international nuances:
 * - "+234" and "08031234567" -> "2348031234567"
 * - "+234" and "+23408031234567" -> "2348031234567" (strips extra 0 after country code)
 * - "+234" and "23408031234567" -> "2348031234567" (strips extra 0 after country code)
 * - "+234" and "2348031234567" -> "2348031234567"
 * - "08031234567" with empty country code -> "2348031234567" (defaults to Nigeria)
 */
export function formatWhatsAppNumber(countryCode: string = '+234', rawNumber: string = ''): string {
  const codeDigits = (countryCode || '+234').replace(/\D/g, '') || '234';
  let numberDigits = (rawNumber || '').replace(/\D/g, '');

  if (!numberDigits) return codeDigits;

  // If number starts with 0 followed by country code (e.g. 0234...)
  if (numberDigits.startsWith('0' + codeDigits)) {
    numberDigits = numberDigits.slice(1);
  }

  // If number starts with country code followed immediately by 0 (e.g. 2340803...)
  // in Nigerian mobile numbering, the leading 0 must be removed in international format
  if (numberDigits.startsWith(codeDigits + '0')) {
    numberDigits = codeDigits + numberDigits.slice(codeDigits.length + 1);
  }

  // Strip leading zero if it's local format
  while (numberDigits.startsWith('0')) {
    numberDigits = numberDigits.slice(1);
  }

  // If number already includes country code, avoid duplicating
  if (numberDigits.startsWith(codeDigits)) {
    return numberDigits;
  }

  return `${codeDigits}${numberDigits}`;
}

export function formatPrice(amount: number, currencySymbol: string = '₦'): string {
  return `${currencySymbol}${amount.toLocaleString('en-US')}`;
}

export function createProductInquiryMessage(options: {
  store: Store;
  product: Product;
  variant?: ProductVariant;
  buyerLocation?: string;
  buyerNote?: string;
  appBaseUrl?: string;
}): string {
  const { store, product, variant, buyerLocation, buyerNote, appBaseUrl = window.location.origin } = options;
  const activePrice = variant ? variant.price : product.price;
  const productUrl = `${appBaseUrl}?store=${store.slug}&product=${product.id}`;

  const lines = [
    `👋 Hello *${store.name}*!`,
    `I saw your ${getPlatformBrandName()} catalog and would like to order:`,
    ``,
    `🛍️ *${product.name}*`,
    `• Item UID: *#${product.uid || product.id}*`,
  ];

  if (variant && variant.name) {
    lines.push(`• Variant: *${variant.name}*`);
  }

  lines.push(`• Price: *${formatPrice(activePrice, store.currencySymbol)}*`);
  lines.push(`• Catalog Link: ${productUrl}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  if (buyerLocation && buyerLocation.trim()) {
    lines.push(`📍 Delivery Location: *${buyerLocation.trim()}*`);
  } else {
    lines.push(`📍 Delivery Location: [Please enter your area/city]`);
  }

  if (buyerNote && buyerNote.trim()) {
    lines.push(`💬 Note: "${buyerNote.trim()}"`);
  }

  lines.push(``);
  lines.push(`Please confirm if this is currently available and send payment/delivery details. Thank you!`);

  return lines.join('\n');
}

export function createCartInquiryMessage(options: {
  store: Store;
  items: CartItem[];
  buyerLocation?: string;
  buyerNote?: string;
  appBaseUrl?: string;
}): string {
  const { store, items, buyerLocation, buyerNote } = options;

  let totalAmount = 0;
  const itemLines: string[] = [];

  items.forEach((item, index) => {
    const itemPrice = item.variant ? item.variant.price : item.product.price;
    const itemSubtotal = itemPrice * item.quantity;
    totalAmount += itemSubtotal;

    const variantLabel = item.variant?.name ? ` (${item.variant.name})` : '';
    itemLines.push(
      `${index + 1}. *${item.product.name}*${variantLabel}\n   Qty: ${item.quantity} × ${formatPrice(itemPrice, store.currencySymbol)} = *${formatPrice(itemSubtotal, store.currencySymbol)}*`
    );
  });

  const lines = [
    `👋 Hello *${store.name}*!`,
    `I'd like to place an order for the following *${items.length} item${items.length > 1 ? 's' : ''}*:`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    ...itemLines,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `💰 *Estimated Total: ${formatPrice(totalAmount, store.currencySymbol)}*`,
    ``,
  ];

  if (buyerLocation && buyerLocation.trim()) {
    lines.push(`📍 Delivery Location: *${buyerLocation.trim()}*`);
  } else {
    lines.push(`📍 Delivery Location: [Please enter your delivery area/address]`);
  }

  if (buyerNote && buyerNote.trim()) {
    lines.push(`💬 Buyer Note: "${buyerNote.trim()}"`);
  }

  lines.push(``);
  lines.push(`Could you confirm availability and advise on delivery fee/account details?`);

  return lines.join('\n');
}

export function createFullOrderWhatsAppMessage(options: {
  store: Store;
  order: import('../types').StoreOrder;
  appBaseUrl?: string;
}): string {
  const { store, order, appBaseUrl = window.location.origin } = options;
  const orderUrl = `${appBaseUrl}?store=${store.slug}&order=${order.id}`;

  const lines = [
    `🛍️ *NEW ORDER #${order.id}*`,
    `🏪 Store: *${store.name}*`,
    `━━━━━━━━━━━━━━━━━━━━━`,
    `👤 *Customer*: *${order.buyerName}*`,
    `📞 *Phone*: *${order.buyerPhone}*`,
  ];

  if (order.buyerEmail) {
    lines.push(`✉️ *Email*: ${order.buyerEmail}`);
  }

  lines.push(`📦 *Fulfillment*: *${order.fulfillmentMethod === 'delivery' ? '🚚 Delivery' : '🏬 Store Pickup'}*`);

  if (order.fulfillmentMethod === 'delivery') {
    lines.push(`📍 *Delivery Address*: ${order.deliveryAddress || 'Not specified'}`);
    if (order.deliveryArea) {
      lines.push(`🏙️ *City/Area*: ${order.deliveryArea}`);
    }
  } else {
    lines.push(`📍 *Pickup Location*: ${store.location || 'Store address'}`);
  }

  if (order.buyerNotes && order.buyerNotes.trim()) {
    lines.push(`💬 *Customer Note*: "${order.buyerNotes.trim()}"`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🛒 *ORDER ITEMS (${order.items.length})*:`);

  order.items.forEach((item, index) => {
    const variantStr = item.variantName ? ` (${item.variantName})` : '';
    lines.push(
      `${index + 1}. *[UID: #${item.productUid}] ${item.productName}*${variantStr}\n   Qty: ${item.quantity} × ${formatPrice(item.price, store.currencySymbol)} = *${formatPrice(item.subtotal, store.currencySymbol)}*`
    );
  });

  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  if (order.couponCode && order.discountAmount) {
    lines.push(`🎟️ *Coupon Applied*: ${order.couponCode} (-${formatPrice(order.discountAmount, store.currencySymbol)})`);
  }
  lines.push(`💰 *TOTAL BILL*: *${formatPrice(order.totalAmount, store.currencySymbol)}*`);
  lines.push(`🆔 *Order ID*: *#${order.id}*`);
  lines.push(`🔗 *Order Link*: ${orderUrl}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Hello ${store.name}, I just placed this order on your Tá.shop catalog. Please confirm availability and send payment / account details. Thank you!`);

  return lines.join('\n');
}

export function generateWhatsAppLink(
  countryCode: string,
  rawNumber: string,
  messageText: string = '',
  forceFormat?: 'app' | 'web'
): string {
  const phone = formatWhatsAppNumber(countryCode, rawNumber);
  const encodedText = encodeURIComponent(messageText);

  const useAppScheme = forceFormat === 'app' || (!forceFormat && isMobileDevice());

  if (useAppScheme) {
    return `whatsapp://send?phone=${phone}&text=${encodedText}`;
  }
  return `https://wa.me/${phone}?text=${encodedText}`;
}

/**
 * Universal method to open WhatsApp chat seamlessly across mobile and desktop:
 * - On mobile: directly invokes `whatsapp://send?phone=...&text=...` to launch the installed
 *   WhatsApp app directly and avoid browser tabs trapped on "Download WhatsApp" page.
 *   If the app isn't installed, it falls back to the web link after 1.5 seconds.
 * - On desktop: opens `https://wa.me/...` in a new tab.
 */
export function openWhatsApp(countryCode: string, rawNumber: string, messageText: string = ''): void {
  const phone = formatWhatsAppNumber(countryCode, rawNumber);
  const encodedText = encodeURIComponent(messageText);

  if (isMobileDevice()) {
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedText}`;
    const webFallbackUrl = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;

    const start = Date.now();
    // Use window.location.href directly to trigger native OS intent without blank tab
    window.location.href = appUrl;

    // Graceful fallback if WhatsApp app is not installed
    setTimeout(() => {
      if (Date.now() - start < 2000 && typeof document !== 'undefined' && !document.hidden) {
        window.location.href = webFallbackUrl;
      }
    }, 1500);
    return;
  }

  const webUrl = `https://wa.me/${phone}?text=${encodedText}`;
  window.open(webUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Converts and opens any existing WhatsApp web link (e.g. stored wa.me URL)
 * into a direct app link on mobile devices, or opens it properly in a new tab on desktop.
 */
export function openWhatsAppUrl(rawUrl: string): void {
  if (!rawUrl) return;

  if (isMobileDevice()) {
    try {
      const urlObj = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
      let phone = '';
      const text = urlObj.searchParams.get('text') || '';

      if (urlObj.hostname.includes('wa.me')) {
        phone = urlObj.pathname.replace(/^\//, '').replace(/\D/g, '');
      } else if (urlObj.hostname.includes('whatsapp.com')) {
        phone = (urlObj.searchParams.get('phone') || '').replace(/\D/g, '');
      }

      if (phone) {
        openWhatsApp('', phone, text);
        return;
      }
    } catch (e) {
      // Fallback
    }
    window.location.href = rawUrl;
    return;
  }

  window.open(rawUrl, '_blank', 'noopener,noreferrer');
}

