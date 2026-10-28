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
    120,
    '#0f172a',
    '#ffffff'
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 z-10 flex flex-col max-h-[96vh] sm:max-h-[94vh]">
        {/* Mobile drag pill */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0 print:hidden" />

        {/* Modal Top Bar */}
        <div className="p-3.5 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-slate-900 text-white shrink-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
            </div>
            <div className="truncate">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight truncate">
                Dispatch Waybill
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-mono truncate">
                #{order.id} • {waybillNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3.5 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Waybill Scroll Area */}
        <div className="p-2.5 sm:p-6 overflow-y-auto overflow-x-hidden bg-slate-100/70 print:bg-white print:p-0 flex-1">
          {/* Print Style Injector */}
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-waybill, #printable-waybill * {
                visibility: visible;
              }
              #printable-waybill {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                max-width: 100% !important;
                border: 2px solid #000 !important;
                padding: 16px !important;
                margin: 0 !important;
                box-shadow: none !important;
              }
            }
          `}</style>

          <div
            ref={printAreaRef}
            id="printable-waybill"
            className="w-full bg-white p-3.5 sm:p-7 rounded-2xl border-2 border-slate-900 shadow-sm print:border-2 print:shadow-none print:m-0 max-w-xl mx-auto space-y-4 sm:space-y-6 text-slate-900 text-xs font-sans overflow-hidden"
          >
            {/* Header: Store Identity & Waybill Barcode */}
            <div className="flex flex-col xs:flex-row items-start justify-between border-b-2 border-slate-900 pb-3 sm:pb-4 gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                />
                <div className="min-w-0">
                  <h2 className="font-black text-sm sm:text-base tracking-tight leading-tight uppercase truncate">
                    {store.name}
                  </h2>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 block truncate">
                    {displayUrl}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-600 block truncate">
                    Dispatch: {store.whatsappCountryCode} {store.whatsappNumber}
                  </span>
                </div>
              </div>

              <div className="text-left xs:text-right w-full xs:w-auto shrink-0 pt-1 xs:pt-0 border-t xs:border-t-0 border-slate-100">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 block">
                  Commercial Waybill
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-slate-900 block">
                  {waybillNumber}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 block">
                  Date: {new Date(order.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Logistics Routing Box (Origin vs Destination) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200">
              {/* Origin / Shipper */}
              <div className="space-y-1 sm:border-r border-slate-200 sm:pr-3 pb-2 sm:pb-0 border-b sm:border-b-0">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  SHIPPER (ORIGIN)
                </span>
                <div className="font-bold text-slate-900 text-xs">{store.name}</div>
                <div className="text-[11px] text-slate-600 leading-snug">
                  {store.location || 'Lagos, Nigeria'}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-600 font-mono">
                  Tel: {store.whatsappCountryCode} {store.whatsappNumber}
                </div>
              </div>

              {/* Consignee / Destination */}
              <div className="space-y-1 sm:pl-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  CONSIGNEE (RECIPIENT)
                </span>
                <div className="font-bold text-slate-900 text-xs">
                  {order.buyerName}
                </div>
                <div className="text-[11px] text-slate-700 font-bold font-mono">
                  📞 {order.buyerPhone}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-600 leading-snug break-words">
                  📍 {order.fulfillmentMethod === 'delivery'
                    ? (order.deliveryAddress || order.deliveryArea || 'Home Delivery')
                    : 'Customer Store Pickup'}
                </div>
              </div>
            </div>

            {/* Payment & Fulfillment Status Banners */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="p-2.5 sm:p-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase block tracking-wider text-emerald-700">
                  Payment Status
                </span>
                <span className="font-black text-xs block mt-0.5">
                  ✓ VERIFIED ORDER
                </span>
                <span className="text-[9px] sm:text-[10px] text-emerald-700 block">
                  Approved for dispatch
                </span>
              </div>

              <div className="p-2.5 sm:p-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase block tracking-wider text-slate-500">
                  Total Value
                </span>
                <span className="font-black text-xs sm:text-sm block font-mono mt-0.5 truncate">
                  {formatPrice(order.totalAmount, order.currencySymbol || '₦')}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 block uppercase">
                  {order.fulfillmentMethod}
                </span>
              </div>
            </div>

            {/* Packed Items Checklist — Horizontally scrollable container so never clips */}
            <div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                ITEMIZED PACKING LIST (VERIFIED CONTENTS)
              </span>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse min-w-[320px]">
                  <thead>
                    <tr className="bg-slate-100 text-[9px] sm:text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                      <th className="p-1.5 sm:p-2">Item UID</th>
                      <th className="p-1.5 sm:p-2">Product Description</th>
                      <th className="p-1.5 sm:p-2 text-center">Qty</th>
                      <th className="p-1.5 sm:p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] sm:text-xs">
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1.5 sm:p-2 font-mono font-bold text-amber-600 whitespace-nowrap">
                          #{item.productUid || 'TA-ITEM'}
                        </td>
                        <td className="p-1.5 sm:p-2">
                          <div className="font-medium text-slate-900 leading-tight">
                            {item.productName}
                          </div>
                          {item.variantName && item.variantName !== 'Standard' && (
                            <span className="text-[10px] text-slate-500 block">
                              Option: {item.variantName}
                            </span>
                          )}
                        </td>
                        <td className="p-1.5 sm:p-2 text-center font-bold font-mono whitespace-nowrap">
                          {item.quantity}
                        </td>
                        <td className="p-1.5 sm:p-2 text-right font-mono font-bold whitespace-nowrap">
                          {formatPrice(item.subtotal, order.currencySymbol || '₦')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rider Instructions & Tracking QR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-200 gap-3">
              <div className="space-y-1 flex-1">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  DISPATCH RIDER NOTICE:
                </span>
                <p className="text-[10px] sm:text-[11px] text-slate-600 leading-relaxed">
                  • Call recipient 15 mins before arrival at delivery landmark.<br />
                  • Inspect package seal before handing over to recipient.<br />
                  {order.buyerNotes && (
                    <span className="font-semibold text-slate-800">
                      • Customer Note: "{order.buyerNotes}"
                    </span>
                  )}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-3 sm:flex-col sm:items-center">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 p-1 bg-white border border-slate-300 rounded-lg shadow-2xs shrink-0 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="text-[8px] font-mono text-slate-400 uppercase">
                  Scan to Verify
                </span>
              </div>
            </div>

            {/* Bottom Signature Line */}
            <div className="grid grid-cols-2 gap-4 sm:gap-8 pt-3 border-t border-dashed border-slate-300 text-[9px] sm:text-[10px] text-slate-400">
              <div>
                <span className="block mb-3 sm:mb-4">Dispatcher Signature:</span>
                <div className="border-b border-slate-300 w-full" />
              </div>
              <div>
                <span className="block mb-3 sm:mb-4">Recipient Signature:</span>
                <div className="border-b border-slate-300 w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 print:hidden shrink-0">
          <span className="truncate pr-2">Fits standard A4, receipt sheets, or thermal labels.</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-medium rounded-xl cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
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
