import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Share2,
  MessageCircle,
  Eye,
  Building2,
  Calendar,
  CreditCard,
  Check,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Store, StoreInvoice, StoreInvoiceItem, Product, StoreOrder, OrderItemPayload } from '../../types';
import { getStoreInvoices, saveStoreInvoices } from '../../utils/storage';

interface InvoicesTabProps {
  store: Store;
  products: Product[];
  orders?: StoreOrder[];
  onUpgrade?: (plan?: 'starter' | 'basic' | 'pro' | 'business') => void;
  onOpenBilling?: () => void;
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({
  store,
  products,
  orders = [],
  onUpgrade,
  onOpenBilling,
}) => {
  const [invoices, setInvoices] = useState<StoreInvoice[]>(() =>
    getStoreInvoices(store.id)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'invoice' | 'receipt'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<StoreInvoice | null>(null);

  // Form state for creating invoice / receipt
  const [docType, setDocType] = useState<'invoice' | 'receipt'>('invoice');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [items, setItems] = useState<StoreInvoiceItem[]>([
    {
      id: `item_1`,
      name: products[0]?.name || 'Standard Order Item',
      quantity: 1,
      unitPrice: products[0]?.price || 5000,
      total: products[0]?.price || 5000,
      productId: products[0]?.id,
    },
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [status, setStatus] = useState<'unpaid' | 'paid'>('unpaid');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState(store.name || '');
  const [notes, setNotes] = useState('Goods received in good condition. Thank you for shopping with us!');

  const handleSaveInvoices = (newList: StoreInvoice[]) => {
    setInvoices(newList);
    saveStoreInvoices(store.id, newList);
  };

  const handleAddItem = () => {
    const newItem: StoreInvoiceItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (
    index: number,
    field: keyof StoreInvoiceItem,
    value: any
  ) => {
    const next = [...items];
    const curr = { ...next[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      curr.total = Number(curr.quantity || 0) * Number(curr.unitPrice || 0);
    }
    next[index] = curr;
    setItems(next);
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const next = [...items];
    next[index] = {
      ...next[index],
      productId: prod.id,
      name: prod.name,
      unitPrice: prod.price,
      total: (next[index].quantity || 1) * prod.price,
    };
    setItems(next);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.total || 0), 0),
    [items]
  );

  const grandTotal = useMemo(
    () => Math.max(0, subtotal - Number(discount || 0) + Number(deliveryFee || 0)),
    [subtotal, discount, deliveryFee]
  );

  const handleAutofillFromOrder = (ord: StoreOrder) => {
    setCustomerName(ord.buyerName || '');
    setCustomerPhone(ord.buyerPhone || '');
    setCustomerAddress(ord.deliveryAddress || '');
    if (ord.status === 'completed' || ord.status === 'payment_confirmed') {
      setDocType('receipt');
    } else {
      setDocType('invoice');
    }
    if (ord.items && ord.items.length > 0) {
      setItems(
        ord.items.map((i: OrderItemPayload, idx: number) => ({
          id: `item_ord_${idx}`,
          productId: i.productId,
          name: i.productName + (i.variantName ? ` (${i.variantName})` : ''),
          quantity: i.quantity || 1,
          unitPrice: i.price,
          total: (i.quantity || 1) * i.price,
        }))
      );
    }
    setDeliveryFee(0);
    setDiscount(ord.discountAmount || 0);
    setNotes(`Order #${ord.id.slice(-6).toUpperCase()}`);
  };

  const generateDocHtml = (doc: StoreInvoice) => {
    const isReceipt = doc.type === 'receipt';
    const isPaid = doc.status === 'paid' || isReceipt;

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${isReceipt ? 'Receipt' : 'Invoice'}_${doc.docNumber}_${store.name}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
        padding: 40px;
        max-width: 820px;
        margin: 0 auto;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 24px;
        margin-bottom: 24px;
      }
      .store-info {
        display: flex;
        gap: 16px;
        align-items: center;
      }
      .store-logo {
        width: 72px;
        height: 72px;
        border-radius: 16px;
        object-fit: cover;
        border: 1px solid #e2e8f0;
      }
      .store-logo-fallback {
        width: 72px;
        height: 72px;
        border-radius: 16px;
        background: #0f172a;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 800;
      }
      .doc-title {
        text-align: right;
      }
      .doc-type {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        color: ${isPaid ? '#047857' : '#1e293b'};
      }
      .doc-number {
        font-family: monospace;
        font-size: 14px;
        font-weight: 700;
        color: #64748b;
        margin-top: 4px;
      }
      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        margin-top: 8px;
        background: ${isPaid ? '#d1fae5' : '#fef3c7'};
        color: ${isPaid ? '#065f46' : '#92400e'};
      }
      .meta-box {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 20px;
        margin-bottom: 24px;
      }
      .meta-title {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #94a3b8;
        margin-bottom: 6px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 24px;
        font-size: 13px;
      }
      th {
        border-bottom: 2px solid #cbd5e1;
        padding: 10px 12px;
        text-align: left;
        font-size: 11px;
        text-transform: uppercase;
        color: #64748b;
        font-weight: 700;
      }
      td {
        padding: 12px;
        border-bottom: 1px solid #f1f5f9;
      }
      .amount-col {
        text-align: right;
        font-family: monospace;
        font-weight: 600;
      }
      .totals-container {
        display: flex;
        justify-content: space-between;
        padding-top: 16px;
        border-top: 2px solid #e2e8f0;
      }
      .totals-table {
        width: 280px;
        margin-left: auto;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        padding: 4px 0;
        color: #64748b;
      }
      .grand-total-row {
        display: flex;
        justify-content: space-between;
        font-size: 16px;
        font-weight: 800;
        padding-top: 8px;
        margin-top: 6px;
        border-top: 2px solid #0f172a;
        color: #0f172a;
      }
      .footer-note {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px dashed #cbd5e1;
        font-size: 11px;
        color: #94a3b8;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="store-info">
        ${
          store.logoUrl
            ? `<img src="${store.logoUrl}" class="store-logo" alt="${store.name}" />`
            : `<div class="store-logo-fallback">${store.name.slice(0, 2).toUpperCase()}</div>`
        }
        <div>
          <h1 style="font-size: 22px; font-weight: 800; color: #0f172a;">${store.name}</h1>
          <p style="font-size: 12px; color: #64748b; margin-top: 2px;">${store.tagline || 'Official Merchant'}</p>
          <p style="font-size: 12px; color: #64748b;">${store.location || 'Nigeria'}</p>
          <p style="font-size: 12px; font-family: monospace; color: #475569; margin-top: 2px;">${store.whatsappCountryCode} ${store.whatsappNumber}</p>
        </div>
      </div>
      <div class="doc-title">
        <div class="doc-type">${isReceipt ? 'Official Receipt' : 'Commercial Invoice'}</div>
        <div class="doc-number">#${doc.docNumber}</div>
        <div class="badge">${isPaid ? 'PAID IN FULL' : 'PAYMENT DUE'}</div>
      </div>
    </div>

    <div class="meta-box">
      <div>
        <div class="meta-title">Billed To (Customer)</div>
        <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${doc.customerName}</div>
        <div style="font-size: 12px; font-family: monospace; color: #475569; margin-top: 2px;">${doc.customerPhone}</div>
        ${doc.customerEmail ? `<div style="font-size: 12px; color: #64748b;">${doc.customerEmail}</div>` : ''}
        ${doc.customerAddress ? `<div style="font-size: 12px; color: #64748b; margin-top: 4px;">${doc.customerAddress}</div>` : ''}
      </div>
      <div style="text-align: right;">
        <div class="meta-title">Document Details</div>
        <div style="font-size: 12px; color: #475569;">Issue Date: <strong>${doc.issueDate}</strong></div>
        ${doc.dueDate ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">Due Date: <strong>${doc.dueDate}</strong></div>` : ''}
        ${doc.paymentMethod ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">Payment: <strong>${doc.paymentMethod}</strong></div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Item Description</th>
          <th style="text-align: center; width: 15%;">Qty</th>
          <th class="amount-col" style="width: 17%;">Price</th>
          <th class="amount-col" style="width: 18%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${doc.items
          .map(
            (item) => `
          <tr>
            <td style="font-weight: 600; color: #0f172a;">${item.name}</td>
            <td style="text-align: center; font-family: monospace;">${item.quantity}</td>
            <td class="amount-col">${store.currencySymbol}${item.unitPrice.toLocaleString()}</td>
            <td class="amount-col" style="font-weight: 700; color: #0f172a;">${store.currencySymbol}${item.total.toLocaleString()}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals-container">
      <div>
        ${
          doc.bankName
            ? `
          <div style="font-size: 11px; background: #f1f5f9; padding: 12px 16px; border-radius: 12px; max-width: 320px;">
            <div style="font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase;">Bank Transfer Details</div>
            <div>Bank: <strong>${doc.bankName}</strong></div>
            <div>Account: <strong>${doc.accountNumber || ''}</strong></div>
            <div>Name: <strong>${doc.accountName || ''}</strong></div>
          </div>
        `
            : ''
        }
        ${
          doc.notes
            ? `<div style="font-size: 11px; color: #64748b; margin-top: 8px;"><strong>Note:</strong> ${doc.notes}</div>`
            : ''
        }
      </div>

      <div class="totals-table">
        <div class="total-row">
          <span>Subtotal:</span>
          <span style="font-family: monospace; font-weight: 600;">${store.currencySymbol}${doc.subtotal.toLocaleString()}</span>
        </div>
        ${
          doc.discount > 0
            ? `
          <div class="total-row" style="color: #b91c1c;">
            <span>Discount:</span>
            <span style="font-family: monospace;">-${store.currencySymbol}${doc.discount.toLocaleString()}</span>
          </div>
        `
            : ''
        }
        ${
          doc.deliveryFee > 0
            ? `
          <div class="total-row">
            <span>Delivery Fee:</span>
            <span style="font-family: monospace;">+${store.currencySymbol}${doc.deliveryFee.toLocaleString()}</span>
          </div>
        `
            : ''
        }
        <div class="grand-total-row">
          <span>Total:</span>
          <span style="color: #047857; font-family: monospace;">${store.currencySymbol}${doc.total.toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div class="footer-note">
      Thank you for shopping with ${store.name}! For customer inquiries or support, WhatsApp ${store.whatsappCountryCode} ${store.whatsappNumber}.
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 300);
      };
    </script>
  </body>
</html>`;
  };

  const handleDownloadPdf = () => {
    if (!viewingDoc) return;
    const html = generateDocHtml(viewingDoc);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print(); // triggers browser Save as PDF dialog
      win.close();
    }, 600);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) return;

    const count = invoices.filter((i) => i.type === docType).length + 1;
    const prefix = docType === 'invoice' ? 'INV' : 'REC';
    const year = new Date().getFullYear();
    const docNumber = `${prefix}-${year}-${String(count).padStart(3, '0')}`;

    const newDoc: StoreInvoice = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: store.id,
      type: docType,
      docNumber,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerAddress: customerAddress.trim() || undefined,
      issueDate,
      dueDate: docType === 'invoice' ? dueDate : undefined,
      items: items.filter((i) => i.name.trim() && i.quantity > 0),
      subtotal,
      discount: Number(discount || 0),
      deliveryFee: Number(deliveryFee || 0),
      total: grandTotal,
      status: docType === 'receipt' ? 'paid' : status,
      paidAt: docType === 'receipt' || status === 'paid' ? new Date().toISOString() : undefined,
      bankName: bankName.trim() || undefined,
      accountNumber: accountNumber.trim() || undefined,
      accountName: accountName.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const updated = [newDoc, ...invoices];
    handleSaveInvoices(updated);
    setIsCreateModalOpen(false);
    setViewingDoc(newDoc);
  };

  const handleMarkAsPaid = (docId: string) => {
    const updated = invoices.map((i) =>
      i.id === docId
        ? {
            ...i,
            status: 'paid' as const,
            paidAt: new Date().toISOString(),
          }
        : i
    );
    handleSaveInvoices(updated);
    if (viewingDoc && viewingDoc.id === docId) {
      setViewingDoc({ ...viewingDoc, status: 'paid', paidAt: new Date().toISOString() });
    }
  };

  const handleDelete = (docId: string) => {
    const updated = invoices.filter((i) => i.id !== docId);
    handleSaveInvoices(updated);
    if (viewingDoc && viewingDoc.id === docId) {
      setViewingDoc(null);
    }
  };

  // Metrics
  const totalInvoiced = useMemo(
    () =>
      invoices
        .filter((i) => i.type === 'invoice')
        .reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );

  const totalReceipts = useMemo(
    () =>
      invoices
        .filter((i) => i.type === 'receipt' || i.status === 'paid')
        .reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );

  const totalUnpaid = useMemo(
    () =>
      invoices
        .filter((i) => i.type === 'invoice' && i.status !== 'paid')
        .reduce((sum, i) => sum + i.total, 0),
    [invoices]
  );

  const filteredDocs = useMemo(() => {
    return invoices.filter((doc) => {
      if (activeTab !== 'all' && doc.type !== activeTab) return false;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        doc.docNumber.toLowerCase().includes(q) ||
        doc.customerName.toLowerCase().includes(q) ||
        doc.customerPhone.toLowerCase().includes(q)
      );
    });
  }, [invoices, activeTab, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
    {/* Plan gate — invoices are Basic+ only */}
    {(store.tier === 'free' || store.tier === 'starter') ? (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-indigo-400" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Invoices & Receipts</h2>
        <p className="text-sm text-slate-500 leading-relaxed">
          Professional invoices and receipts with your store logo are available on the <strong>Basic plan</strong> and above.
        </p>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-xs text-indigo-700 font-medium space-y-1 w-full text-left">
          <p className="font-black text-indigo-900 mb-2">✦ Basic Plan includes:</p>
          <p>• PDF Invoice & Receipt generation</p>
          <p>• Store logo on every document</p>
          <p>• Auto-fill from recent orders</p>
          <p>• WhatsApp sharing with one tap</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => onUpgrade?.('basic')}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Upgrade to Basic →</span>
          </button>
          {onOpenBilling && (
            <button
              type="button"
              onClick={onOpenBilling}
              className="w-full sm:w-auto px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition cursor-pointer"
            >
              View All Plans
            </button>
          )}
        </div>
      </div>
    ) : (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner — Orderly Invoices & Receipts inspired */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Billing & Proof of Sale
              </span>
              <span className="text-slate-400 text-xs">· PDF Export & WhatsApp</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Invoices & Receipts</span>
              <span className="text-sm font-black bg-white/10 text-white px-3 py-1 rounded-full border border-white/15">
                {invoices.length} created
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Create invoices and receipts directly from your products, download them as PDF, and record paid receipts straight into your income ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setDocType('invoice');
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Invoiced
          </span>
          <div className="mt-1 text-2xl font-black text-slate-900 font-mono">
            {store.currencySymbol}{totalInvoiced.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Across all issued invoices
          </span>
        </div>

        <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Collected (Receipts)
          </span>
          <div className="mt-1 text-2xl font-black text-emerald-700 font-mono">
            {store.currencySymbol}{totalReceipts.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Paid receipts & cleared invoices
          </span>
        </div>

        <div className="p-4.5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Unpaid / Outstanding
          </span>
          <div className="mt-1 text-2xl font-black text-amber-600 font-mono">
            {store.currencySymbol}{totalUnpaid.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Pending customer payment
          </span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doc number (INV-..., REC-...) or customer name..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Invoices ({invoices.filter((i) => i.type === 'invoice').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'receipt'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Receipts ({invoices.filter((i) => i.type === 'receipt').length})
          </button>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try searching with a different doc number or customer name.'
              : 'Create your first invoice to request payment or issue a receipt as proof of purchase.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => {
                setDocType('invoice');
                setIsCreateModalOpen(true);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create First Invoice</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => {
            const isPaid = doc.status === 'paid' || doc.type === 'receipt';
            const cleanPhone = doc.customerPhone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('0')
              ? `234${cleanPhone.slice(1)}`
              : cleanPhone.startsWith('234')
              ? cleanPhone
              : `234${cleanPhone}`;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            doc.type === 'receipt'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {doc.type}
                        </span>
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {doc.docNumber}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{doc.customerName}</h4>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        {doc.customerPhone}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                      }`}
                    >
                      {isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>

                  <div className="mt-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Items:</span>
                      <span className="font-semibold text-slate-700">
                        {doc.items.length} {doc.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Date:</span>
                      <span>{doc.issueDate}</span>
                    </div>
                    {doc.dueDate && doc.type === 'invoice' && (
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Due:</span>
                        <span className="text-amber-700 font-medium">{doc.dueDate}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 font-bold">
                      <span className="text-slate-800">Total:</span>
                      <span className="font-mono text-emerald-800 text-sm">
                        {store.currencySymbol}{doc.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewingDoc(doc)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View & PDF</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(doc.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Mark document as paid"
                      >
                        <Check className="w-3 h-3" />
                        <span>Mark Paid</span>
                      </button>
                    )}
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                        `Hello ${doc.customerName}! Here are the details for your ${doc.type.toUpperCase()} (#${doc.docNumber}) from ${store.name}:\n\n` +
                          `Total: ${store.currencySymbol}${doc.total.toLocaleString()}\n` +
                          `Status: ${isPaid ? 'PAID IN FULL ✓' : 'PAYMENT PENDING'}\n` +
                          (doc.bankName ? `Bank: ${doc.bankName}\nAccount: ${doc.accountNumber}\nName: ${doc.accountName}\n\n` : '') +
                          `Thank you for your business!`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Printable Document Modal / PDF Preview */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setViewingDoc(null)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-4 sm:p-8 border border-slate-200 z-10 space-y-5 max-h-[95vh] sm:max-h-[92vh] overflow-y-auto my-0 sm:my-auto">
            {/* Mobile drag pill */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden shrink-0 print:hidden" />

            {/* Modal Controls Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg shrink-0 ${
                    viewingDoc.type === 'receipt'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {viewingDoc.type} Preview
                </span>
                <span className="text-xs text-slate-500 font-mono truncate">#{viewingDoc.docNumber}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-3 sm:px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Download as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Download PDF</span>
                  <span className="xs:hidden sm:hidden">PDF</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Content */}
            <div className="space-y-6 text-slate-900 font-sans print:p-0">
              {/* Store & Doc Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-5">
                <div className="flex items-start gap-3.5 min-w-0">
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-slate-200 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-2xs shrink-0"
                      style={{ backgroundColor: store.accentColor || '#0f172a' }}
                    >
                      {store.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 truncate">
                      {store.name}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{store.tagline || 'Social Commerce Store'}</p>
                    <p className="text-xs text-slate-600 mt-1">{store.location || 'Nigeria'}</p>
                    <p className="text-xs text-slate-600 font-mono">
                      {store.whatsappCountryCode} {store.whatsappNumber}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right w-full sm:w-auto">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider text-slate-900">
                    {viewingDoc.type === 'receipt' ? 'Official Receipt' : 'Commercial Invoice'}
                  </h1>
                  <span className="text-sm font-mono font-bold text-slate-700 block mt-0.5">
                    #{viewingDoc.docNumber}
                  </span>
                  <div className="mt-1.5 text-xs text-slate-500 space-y-0.5">
                    <p>Issue Date: <strong className="text-slate-800">{viewingDoc.issueDate}</strong></p>
                    {viewingDoc.dueDate && (
                      <p>Due Date: <strong className="text-slate-800">{viewingDoc.dueDate}</strong></p>
                    )}
                    <span
                      className={`inline-block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        viewingDoc.status === 'paid' || viewingDoc.type === 'receipt'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {viewingDoc.status === 'paid' || viewingDoc.type === 'receipt'
                        ? 'PAID IN FULL'
                        : 'PAYMENT DUE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Bill To (Customer)
                </span>
                <p className="font-extrabold text-sm text-slate-900">{viewingDoc.customerName}</p>
                <p className="text-xs text-slate-600 font-mono mt-0.5">{viewingDoc.customerPhone}</p>
                {viewingDoc.customerEmail && (
                  <p className="text-xs text-slate-600">{viewingDoc.customerEmail}</p>
                )}
                {viewingDoc.customerAddress && (
                  <p className="text-xs text-slate-600 mt-0.5">{viewingDoc.customerAddress}</p>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                      <th className="py-2">Item Description</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Unit Price</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingDoc.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-3 text-right font-mono text-slate-600">
                          {store.currencySymbol}{item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">
                          {store.currencySymbol}{item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Calculations Footer */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t-2 border-slate-200">
                {/* Bank Details */}
                <div className="text-xs text-slate-600 space-y-1 max-w-sm">
                  {viewingDoc.bankName ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="font-bold text-slate-900 block mb-1">
                        Bank Payment Details:
                      </span>
                      <p>Bank: <strong className="text-slate-800">{viewingDoc.bankName}</strong></p>
                      <p>Account No: <strong className="font-mono text-slate-900">{viewingDoc.accountNumber}</strong></p>
                      <p>Account Name: <strong className="text-slate-800">{viewingDoc.accountName}</strong></p>
                    </div>
                  ) : null}
                  {viewingDoc.notes && (
                    <p className="text-[11px] text-slate-500 italic mt-2">{viewingDoc.notes}</p>
                  )}
                </div>

                {/* Subtotal Breakdown */}
                <div className="w-full sm:w-64 space-y-1.5 text-xs text-right">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {store.currencySymbol}{viewingDoc.subtotal.toLocaleString()}
                    </span>
                  </div>
                  {viewingDoc.discount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span className="font-mono font-semibold">
                        -{store.currencySymbol}{viewingDoc.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {viewingDoc.deliveryFee > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>Delivery Fee:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        +{store.currencySymbol}{viewingDoc.deliveryFee.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-950">
                    <span>Total:</span>
                    <span className="font-mono text-emerald-800 text-base">
                      {store.currencySymbol}{viewingDoc.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Document Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full p-4 sm:p-6 border border-slate-100 z-10 space-y-4 max-h-[95vh] sm:max-h-[92vh] overflow-y-auto my-0 sm:my-auto">
            {/* Mobile drag handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Create New {docType === 'invoice' ? 'Invoice' : 'Receipt'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setDocType('invoice')}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    docType === 'invoice'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Commercial Invoice (Request Payment)
                </button>
                <button
                  type="button"
                  onClick={() => setDocType('receipt')}
                  className={`py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    docType === 'receipt'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sales Receipt (Payment Received)
                </button>
              </div>

              {/* Auto-fill from Recent Order */}
              {orders && orders.length > 0 && (
                <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Auto-fill from Recent Order</span>
                    </label>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                      Fast 1-Click
                    </span>
                  </div>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const ordId = e.target.value;
                      if (!ordId) return;
                      const found = orders.find((o) => o.id === ordId);
                      if (found) handleAutofillFromOrder(found);
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select an order to auto-populate customer & items...</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        #{o.id.slice(-6).toUpperCase()} — {o.buyerName} ({store.currencySymbol}{(o.totalAmount || 0).toLocaleString()}) • {o.items.length} item{o.items.length !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Customer Details */}
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer (Bill To)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Customer Name *"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone (WhatsApp) *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="email"
                    placeholder="Email (Optional)"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Address / City"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Issue Date</label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                  />
                </div>
                {docType === 'invoice' && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-bold text-slate-900 hover:text-amber-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {products.length > 0 && (
                          <select
                            value={item.productId || ''}
                            onChange={(e) => handleSelectProduct(idx, e.target.value)}
                            className="w-36 px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700"
                          >
                            <option value="">-- Catalog Item --</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <input
                          type="text"
                          required
                          placeholder="Item Name or Service"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Qty:</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'quantity', Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono text-center"
                          />
                        </div>
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-[10px] text-slate-400">Price:</span>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'unitPrice', Number(e.target.value))
                            }
                            className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono"
                          />
                        </div>
                        <div className="text-right font-mono font-bold text-slate-900 shrink-0">
                          {store.currencySymbol}{item.total.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Delivery Fee */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Discount Amount ({store.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discount || ''}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Delivery Fee ({store.currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={deliveryFee || ''}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* Bank Details for receiving payment */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <span className="font-bold text-slate-700 block">
                  Your Bank Account (Shown on invoice for payment transfer)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Account Name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              {/* Total Display */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Total {docType === 'invoice' ? 'Payable' : 'Paid'}
                </span>
                <span className="text-xl font-black font-mono text-amber-400">
                  {store.currencySymbol}{grandTotal.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Generate {docType === 'invoice' ? 'Invoice' : 'Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    )}
    </>
  );
};
