import React, { useRef } from 'react';
import {
  Barcode,
  Check,
  Download,
  MapPin,
  Package,
  Phone,
  Printer,
  QrCode,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Store, StoreOrder } from '../../types';
import { formatPrice } from '../../utils/whatsapp';
import { generateQRCodeSVG } from '../../utils/qrCode';
import { getStoreDisplayUrl } from '../../utils/storage';

interface WaybillModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: StoreOrder;
  store: Store;
}

export const WaybillModal: React.FC<WaybillModalProps> = ({
  isOpen,
  onClose,
  order,
  store,
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const waybillNumber = `WB-${order.id.replace('TA-ORD-', '')}-${new Date().getFullYear()}`;
  const displayUrl = getStoreDisplayUrl(store.slug);
  const qrSvg = generateQRCodeSVG(
    `https://${displayUrl}?order=${order.id}`,
    130,
    '#0f172a',
    '#ffffff'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 z-10 flex flex-col max-h-[94vh]">
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <Truck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                Commercial Dispatch Waybill
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Order #{order.id} • Waybill #{waybillNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print Waybill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Waybill Sheet */}
        <div className="p-6 overflow-y-auto bg-slate-100/60 print:bg-white print:p-0">
          <div
            ref={printAreaRef}
            id="printable-waybill"
            className="bg-white p-6 sm:p-8 rounded-2xl border-2 border-slate-900 shadow-sm print:border-2 print:shadow-none print:m-0 max-w-xl mx-auto space-y-6 text-slate-900 text-xs font-sans"
          >
            {/* Header: Store Identity & Waybill Barcode */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                />
                <div>
                  <h2 className="font-black text-base tracking-tight leading-tight uppercase">
                    {store.name}
                  </h2>
                  <span className="text-[11px] font-mono text-slate-500 block">
                    {displayUrl}
                  </span>
                  <span className="text-[10px] text-slate-600 block">
                    Dispatch: {store.whatsappCountryCode} {store.whatsappNumber}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Commercial Waybill
                </span>
                <span className="font-mono font-black text-sm text-slate-900 block">
                  {waybillNumber}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Date: {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Two Column Logistics Routing Box */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Origin / Shipper */}
              <div className="space-y-1 border-r border-slate-200 pr-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  SHIPPER (ORIGIN)
                </span>
                <div className="font-bold text-slate-900 text-xs">{store.name}</div>
                <div className="text-[11px] text-slate-600 leading-tight">
                  {store.location || 'Lagos, Nigeria'}
                </div>
                <div className="text-[11px] text-slate-600 font-mono">
                  Tel: {store.whatsappCountryCode} {store.whatsappNumber}
                </div>
              </div>

              {/* Consignee / Destination */}
              <div className="space-y-1 pl-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  CONSIGNEE (RECIPIENT)
                </span>
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                  <span>{order.buyerName}</span>
                </div>
                <div className="text-[11px] text-slate-700 font-bold font-mono">
                  📞 {order.buyerPhone}
                </div>
                <div className="text-[11px] text-slate-600 leading-tight">
                  📍 {order.fulfillmentMethod === 'delivery'
                    ? (order.deliveryAddress || order.deliveryArea || 'Home Delivery')
                    : 'Customer Store Pickup'}
                </div>
              </div>
            </div>

            {/* Payment & Fulfillment Status Banners */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900">
                <span className="text-[10px] font-bold uppercase block tracking-wider text-emerald-700">
                  Payment Status
                </span>
                <span className="font-black text-xs block mt-0.5">
                  ✓ VERIFIED ORDER
                </span>
                <span className="text-[10px] text-emerald-700 block">
                  Pre-approved for dispatch
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900">
                <span className="text-[10px] font-bold uppercase block tracking-wider text-slate-500">
                  Total Declared Value
                </span>
                <span className="font-black text-sm block font-mono mt-0.5">
                  {formatPrice(order.totalAmount, order.currencySymbol || '₦')}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Fulfillment: {order.fulfillmentMethod.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Packed Items Checklist */}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                ITEMIZED PACKING LIST (VERIFIED CONTENTS)
              </span>
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <th className="p-2">Item UID</th>
                    <th className="p-2">Product Description</th>
                    <th className="p-2">Variant</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono font-bold text-amber-600">
                        #{item.productUid || 'TA-ITEM'}
                      </td>
                      <td className="p-2 font-medium">{item.productName}</td>
                      <td className="p-2 text-slate-500">{item.variantName || 'Standard'}</td>
                      <td className="p-2 text-center font-bold font-mono">{item.quantity}</td>
                      <td className="p-2 text-right font-mono font-bold">
                        {formatPrice(item.subtotal, order.currencySymbol || '₦')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Rider Instructions & Tracking QR */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  DISPATCH RIDER NOTICE:
                </span>
                <p className="text-[11px] text-slate-600 leading-snug">
                  • Call recipient 15 minutes before arrival at landmark.<br />
                  • Inspect package seal before handing over to recipient.<br />
                  • {order.buyerNotes ? `Customer Note: "${order.buyerNotes}"` : 'Deliver safely.'}
                </p>
              </div>

              <div className="shrink-0 flex flex-col items-center">
                <div
                  className="w-16 h-16 p-1 bg-white border border-slate-300 rounded-lg shadow-2xs"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="text-[8px] font-mono text-slate-400 mt-1 uppercase">
                  Scan to Verify
                </span>
              </div>
            </div>

            {/* Bottom Signature Line */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-400">
              <div>
                <span className="block mb-4">Dispatcher Signature & Date:</span>
                <div className="border-b border-slate-300 w-full" />
              </div>
              <div>
                <span className="block mb-4">Recipient Signature upon delivery:</span>
                <div className="border-b border-slate-300 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Fits standard A4 paper, receipt sheets, or 4×6 thermal parcel labels.</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-xl cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Waybill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
