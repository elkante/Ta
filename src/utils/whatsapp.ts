import { CartItem, Product, ProductVariant, Store } from '../types';
import { getPlatformBrandName } from './storage';

/**
 * Clean phone number for wa.me format
 * wa.me requires digits only, international format without + or leading zeros.
 * E.g., countryCode "+234" and number "08031234567" -> "2348031234567"
 */
export function formatWhatsAppNumber(countryCode: string, rawNumber: string): string {
  const codeDigits = countryCode.replace(/\D/g, '');
  let numberDigits = rawNumber.replace(/\D/g, '');

  // If local Nigerian/international number starts with 0, strip leading 0
  if (numberDigits.startsWith('0')) {
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
    `📦 *Fulfillment*: *${order.fulfillmentMethod === 'delivery' ? '🚚 Delivery' : '🏬 Store Pickup'}*`,
  ];

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
  lines.push(`💰 *TOTAL BILL*: *${formatPrice(order.totalAmount, store.currencySymbol)}*`);
  lines.push(`🆔 *Order ID*: *#${order.id}*`);
  lines.push(`🔗 *Order Link*: ${orderUrl}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Hello ${store.name}, I just placed this order on your Tá.shop catalog. Please confirm availability and send payment / account details. Thank you!`);

  return lines.join('\n');
}

export function generateWhatsAppLink(countryCode: string, rawNumber: string, messageText: string): string {
  const phone = formatWhatsAppNumber(countryCode, rawNumber);
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${phone}?text=${encodedText}`;
}
