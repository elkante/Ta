import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Download,
  Printer,
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
} from 'lucide-react';
import { Store, StoreInvoice, StoreInvoiceItem, Product } from '../../types';
import { getStoreInvoices, saveStoreInvoices } from '../../utils/storage';

interface InvoicesTabProps {
  store: Store;
  products: Product[];
}

export const InvoicesTab: React.FC<InvoicesTabProps> = ({ store, products }) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setViewingDoc(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 z-10 space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Controls Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black uppercase px-2.5 py-1 rounded-lg ${
                    viewingDoc.type === 'receipt'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {viewingDoc.type} Preview
                </span>
                <span className="text-xs text-slate-500 font-mono">#{viewingDoc.docNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Content */}
            <div className="space-y-6 text-slate-900 font-sans print:p-0">
              {/* Store & Doc Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    {store.name}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{store.tagline || 'Social Commerce Store'}</p>
                  <p className="text-xs text-slate-600 mt-1">{store.location || 'Nigeria'}</p>
                  <p className="text-xs text-slate-600 font-mono">
                    {store.whatsappCountryCode} {store.whatsappNumber}
                  </p>
                </div>

                <div className="text-right">
                  <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                    {viewingDoc.type === 'receipt' ? 'Official Receipt' : 'Commercial Invoice'}
                  </h1>
                  <span className="text-sm font-mono font-bold text-slate-700 block mt-1">
                    #{viewingDoc.docNumber}
                  </span>
                  <div className="mt-2 text-xs text-slate-500 space-y-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setIsCreateModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 z-10 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">
                Create New {docType === 'invoice' ? 'Invoice' : 'Receipt'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
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
  );
};
