import React, { useState } from 'react';
import {
  AlertCircle,
  Building,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  MapPin,
  MessageCircle,
  Minus,
  Navigation,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  User,
  Volume2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Store, StoreOrder } from '../../types';
import { playOrderNotificationSound } from '../../utils/audio';
import {
  createFullOrderWhatsAppMessage,
  formatPrice,
  generateWhatsAppLink,
} from '../../utils/whatsapp';
import { createStoreOrder } from '../../utils/storage';

interface WhatsAppCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  store: Store;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onOrderPlaced?: (order: StoreOrder) => void;
}

export const WhatsAppCartDrawer: React.FC<WhatsAppCartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  store,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
}) => {
  // Buyer Details Form State
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('');
  const [buyerNote, setBuyerNote] = useState('');

  // Validation & Submission State
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<StoreOrder | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  if (!isOpen) return null;

  const totalAmount = items.reduce((sum, item) => {
    const p = item.variant ? item.variant.price : item.product.price;
    return sum + p * item.quantity;
  }, 0);

  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    const errors: string[] = [];
    if (!buyerName.trim()) {
      errors.push('Please enter your full name');
    }
    if (!buyerPhone.trim() || buyerPhone.replace(/\D/g, '').length < 7) {
      errors.push('Please enter a valid phone number (at least 7 digits)');
    }
    if (fulfillmentMethod === 'delivery' && !deliveryAddress.trim()) {
      errors.push('Please enter your delivery street address');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors([]);
    setIsSubmitting(true);

    // 1. Play celebratory loud sound
    playOrderNotificationSound(1.0);

    // 2. Fire celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      // ignore
    }

    // 3. Format order items payload
    const orderItemsPayload = items.map((item) => {
      const activePrice = item.variant ? item.variant.price : item.product.price;
      return {
        productId: item.product.id,
        productUid: item.product.uid || item.product.id,
        productName: item.product.name,
        variantName: item.variant?.name,
        price: activePrice,
        quantity: item.quantity,
        subtotal: activePrice * item.quantity,
        image: item.product.images[0],
      };
    });

    // 4. Generate WhatsApp link draft
    const tempOrderForMsg: any = {
      id: 'PENDING',
      storeId: store.id,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      fulfillmentMethod,
      deliveryAddress: fulfillmentMethod === 'delivery' ? deliveryAddress.trim() : undefined,
      deliveryArea: fulfillmentMethod === 'delivery' ? deliveryArea.trim() : undefined,
      buyerNotes: buyerNote.trim() || undefined,
      items: orderItemsPayload,
      totalAmount,
      currencySymbol: store.currencySymbol,
      whatsappUrl: '',
    };

    // 5. Persist to store dashboard
    const savedOrder = createStoreOrder({
      storeId: store.id,
      buyerName: buyerName.trim(),
      buyerPhone: buyerPhone.trim(),
      fulfillmentMethod,
      deliveryAddress: fulfillmentMethod === 'delivery' ? deliveryAddress.trim() : undefined,
      deliveryArea: fulfillmentMethod === 'delivery' ? deliveryArea.trim() : undefined,
      buyerNotes: buyerNote.trim() || undefined,
      items: orderItemsPayload,
      totalAmount,
      currencySymbol: store.currencySymbol,
      whatsappUrl: '',
    });

    // Generate accurate WA message containing assigned Order ID
    const waText = createFullOrderWhatsAppMessage({
      store,
      order: savedOrder,
    });

    const waLink = generateWhatsAppLink(store.whatsappCountryCode, store.whatsappNumber, waText);
    savedOrder.whatsappUrl = waLink;

    setPlacedOrder(savedOrder);
    setIsSubmitting(false);

    if (onOrderPlaced) {
      onOrderPlaced(savedOrder);
    }

    // Open WhatsApp seamlessly in a popup/tab after sound triggers
    setTimeout(() => {
      window.open(waLink, '_blank', 'noopener,noreferrer');
    }, 350);
  };

  const handleCopyOrderId = () => {
    if (!placedOrder) return;
    navigator.clipboard.writeText(`#${placedOrder.id}`);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleCloseAndClear = () => {
    onClearCart();
    setPlacedOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200 border-l border-slate-100">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {placedOrder ? 'Order Placed!' : 'WhatsApp Checkout Bag'}
              </h3>
              <p className="text-xs text-slate-500">
                {placedOrder
                  ? `Order #${placedOrder.id} sent to ${store.name}`
                  : `${totalItemsCount} item${totalItemsCount !== 1 ? 's' : ''} • ${store.name}`}
              </p>
            </div>
          </div>
          <button
            onClick={placedOrder ? handleCloseAndClear : onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        {placedOrder ? (
          /* SUCCESS CELEBRATION VIEW */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 pb-safe">
            <div className="text-center space-y-3 pt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs px-3 py-1 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Loud Order Alert Dispatched to Seller Dashboard!
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Order Received!
              </h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your order was saved to <strong>{store.name}</strong>'s dashboard. A complete copy is ready in your WhatsApp chat.
              </p>
            </div>

            {/* Generated Order ID Card */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-3xl shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-wider font-semibold">Generated Order ID</span>
                <span className="text-emerald-400 font-medium">Pending Store Confirmation</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-amber-300">
                  #{placedOrder.id}
                </span>
                <button
                  onClick={handleCopyOrderId}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedOrderId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedOrderId ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div>
                  <span className="text-[11px] text-slate-400 block">Buyer</span>
                  <span className="font-semibold text-white">{placedOrder.buyerName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Phone</span>
                  <span className="font-semibold text-white">{placedOrder.buyerPhone}</span>
                </div>
                <div className="col-span-2 pt-1">
                  <span className="text-[11px] text-slate-400 block">Fulfillment</span>
                  <span className="font-semibold text-white">
                    {placedOrder.fulfillmentMethod === 'delivery'
                      ? `🚚 Delivery: ${placedOrder.deliveryAddress}${placedOrder.deliveryArea ? `, ${placedOrder.deliveryArea}` : ''}`
                      : `🏬 Pickup: ${store.location}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Replay Sound & WhatsApp CTA Button */}
            <div className="space-y-3">
              <a
                href={placedOrder.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition active:scale-[0.99] cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Open in WhatsApp Now (Sent #{placedOrder.id})</span>
                <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
              </a>

              <button
                type="button"
                onClick={() => playOrderNotificationSound(1.0)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Volume2 className="w-4 h-4 text-amber-500" />
                <span>Replay Order Alert Sound 🔊</span>
              </button>
            </div>

            {/* Order Items Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Order Items ({placedOrder.items.length})
              </span>
              <div className="divide-y divide-slate-200/70">
                {placedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        UID: #{item.productUid} {item.variantName ? `• ${item.variantName}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-slate-900">
                        {formatPrice(item.subtotal, store.currencySymbol)}
                      </div>
                      <div className="text-[10px] text-slate-400">Qty: {item.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount:</span>
                <span className="font-mono text-base">
                  {formatPrice(placedOrder.totalAmount, store.currencySymbol)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCloseAndClear}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
            >
              Done & Continue Shopping
            </button>
          </div>
        ) : (
          /* REGULAR CART & CHECKOUT FORM */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">Your order bag is empty</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Add products from {store.name}'s catalog to send a complete order with Item UIDs to WhatsApp.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Bag Items list */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Selected Items ({totalItemsCount})
                    </span>
                    <button
                      onClick={onClearCart}
                      className="text-xs text-rose-500 hover:text-rose-600 font-medium cursor-pointer"
                    >
                      Clear Bag
                    </button>
                  </div>

                  {items.map((item) => {
                    const itemPrice = item.variant ? item.variant.price : item.product.price;
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-white flex gap-3 items-center shadow-2xs"
                      >
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100"
                        />

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 text-xs truncate">
                            {item.product.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                              #{item.product.uid || item.product.id}
                            </span>
                            {item.variant && (
                              <span className="text-[10px] text-slate-500 truncate">
                                {item.variant.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-900 font-mono mt-1">
                            {formatPrice(itemPrice, store.currencySymbol)}
                          </p>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            className="text-slate-400 hover:text-rose-500 transition cursor-pointer p-0.5"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                            <button
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-bold font-mono text-slate-800">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Validation Errors Box */}
                {validationErrors.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Please complete the required fields:</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5">
                      {validationErrors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* CUSTOMER DETAILS FORM (Mobile-First) */}
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/80 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Buyer Information</span>
                    </span>
                    <span className="text-[10px] text-slate-400">No account required</span>
                  </div>

                  {/* Name and Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Your Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amara Johnson"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        WhatsApp / Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. 0803 123 4567"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Fulfillment Method Segmented Buttons (Delivery vs Pickup) */}
                  <div className="pt-2 border-t border-slate-200/80">
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                      How would you like to receive your items? <span className="text-rose-500">*</span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentMethod('delivery')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          fulfillmentMethod === 'delivery'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>🚚 Doorstep Delivery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFulfillmentMethod('pickup')}
                        className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                          fulfillmentMethod === 'pickup'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-slate-900/10'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Building className="w-4 h-4" />
                        <span>🏬 In-Store Pickup</span>
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Fulfillment Fields */}
                  {fulfillmentMethod === 'delivery' ? (
                    <div className="space-y-2.5 pt-1 animate-in fade-in">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Delivery Street Address / Flat <span className="text-rose-500">*</span></span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Block 4, Plot 12, Admiralty Way, Lekki Phase 1"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                          City / State / Area
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Lagos Island / Mainland or Abuja"
                          value={deliveryArea}
                          onChange={(e) => setDeliveryArea(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  ) : (
                    /* In-Store Pickup Info */
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <MapPin className="w-4 h-4 text-amber-600" />
                        <span>Store Pickup Location:</span>
                      </div>
                      <p className="text-slate-800 font-medium pl-5">
                        {store.location || 'Visit store location for pickup.'}
                      </p>
                      <p className="text-[11px] text-amber-800/80 pl-5">
                        ✨ No delivery charges apply. Present your generated Order ID upon pickup.
                      </p>
                    </div>
                  )}

                  {/* Special Note */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Customer Note / Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Call when dispatch rider arrives"
                      value={buyerNote}
                      onChange={(e) => setBuyerNote(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Drawer Sticky Footer with Subtotal & Action */}
        {!placedOrder && items.length > 0 && (
          <div className="p-4 sm:p-5 pb-safe border-t border-slate-100 bg-white space-y-3 shrink-0 shadow-lg">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Total Items: {totalItemsCount}</span>
                <span className="text-xs text-slate-400">
                  {fulfillmentMethod === 'delivery' ? 'Delivery fee confirmed on WhatsApp' : 'Store pickup selected'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Subtotal</span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
                  {formatPrice(totalAmount, store.currencySymbol)}
                </span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] active:bg-[#1da851] text-white font-bold text-sm shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>
                {isSubmitting
                  ? 'Generating Order...'
                  : `Send Order to Dashboard & WhatsApp (${totalItemsCount} items)`}
              </span>
            </button>
            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
              <span>🔊 Plays loud alert on order dispatch</span>
              <span>•</span>
              <span>Generates #TA-ORD-ID copy</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
