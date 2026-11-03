import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Mail,
  ShoppingBag,
  ExternalLink,
  MessageCircle,
  Plus,
  UserCheck,
  Crown,
  MapPin,
  Calendar,
  X,
  FileSpreadsheet,
  Check,
} from 'lucide-react';
import { Store, StoreOrder, StoreCustomer } from '../../types';
import { getStoreCustomers, saveStoreCustomers } from '../../utils/storage';

interface CustomersTabProps {
  store: Store;
  orders: StoreOrder[];
}

export const CustomersTab: React.FC<CustomersTabProps> = ({ store, orders }) => {
  const [customers, setCustomers] = useState<StoreCustomer[]>(() =>
    getStoreCustomers(store.id, orders)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'repeat' | 'vip'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<StoreCustomer | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newState, setNewState] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Synchronize when orders change
  React.useEffect(() => {
    const updated = getStoreCustomers(store.id, orders);
    setCustomers(updated);
  }, [orders, store.id]);

  const handleSaveCustomers = (updatedList: StoreCustomer[]) => {
    setCustomers(updatedList);
    saveStoreCustomers(store.id, updatedList);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newCust: StoreCustomer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      storeId: store.id,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim() || undefined,
      address: newAddress.trim() || undefined,
      state: newState.trim() || undefined,
      notes: newNotes.trim() || undefined,
      totalOrders: 0,
      totalSpent: 0,
      source: 'manual',
      createdAt: new Date().toISOString(),
    };

    const updated = [newCust, ...customers];
    handleSaveCustomers(updated);
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAddress('');
    setNewState('');
    setNewNotes('');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.state && c.state.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === 'repeat') {
        return c.totalOrders > 1;
      }
      if (activeFilter === 'vip') {
        return c.totalSpent >= 50000 || c.totalOrders >= 3;
      }
      return true;
    });
  }, [customers, searchQuery, activeFilter]);

  const countWithPhone = useMemo(() => customers.filter((c) => c.phone).length, [customers]);
  const countWithEmail = useMemo(() => customers.filter((c) => c.email).length, [customers]);
  const totalRepeatRevenue = useMemo(
    () =>
      customers
        .filter((c) => c.totalOrders > 1)
        .reduce((sum, c) => sum + (c.totalSpent || 0), 0),
    [customers]
  );

  // Orders associated with selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const phoneDigits = selectedCustomer.phone.replace(/\D/g, '').slice(-9);
    return orders.filter((o) => {
      const orderPhoneDigits = (o.buyerPhone || '').replace(/\D/g, '').slice(-9);
      return (
        (phoneDigits && orderPhoneDigits && orderPhoneDigits === phoneDigits) ||
        (selectedCustomer.email && o.buyerEmail === selectedCustomer.email) ||
        o.buyerName.toLowerCase().trim() === selectedCustomer.name.toLowerCase().trim()
      );
    });
  }, [selectedCustomer, orders]);

  const exportCSV = () => {
    const headers = ['Name', 'Phone', 'Email', 'State', 'Address', 'Total Orders', 'Total Spent', 'Last Order'];
    const rows = customers.map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.state || ''}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      c.totalOrders,
      c.totalSpent,
      `"${c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : ''}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${store.slug}-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner — Orderly Customer Memory styling with Tá.shop prestige */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 w-80 h-80 bg-radial from-amber-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Customer Memory CRM
              </span>
              <span className="text-slate-400 text-xs">· Auto-saved profiles</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Your Customers</span>
              <span className="text-sm font-black bg-white/10 text-white px-3 py-1 rounded-full border border-white/15">
                {customers.length} saved on file
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Customer Memory automatically profiles every buyer who checks out via WhatsApp or completes an order on your storefront. Never lose a contact again.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportCSV}
              disabled={customers.length === 0}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/15 cursor-pointer disabled:opacity-40"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            On this page
          </span>
          <div className="mt-1 text-2xl font-black text-slate-900 font-mono">
            {filteredCustomers.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Active contacts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            With Phone
          </span>
          <div className="mt-1 text-2xl font-black text-emerald-700 font-mono">
            {countWithPhone}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">WhatsApp ready</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            With Email
          </span>
          <div className="mt-1 text-2xl font-black text-indigo-700 font-mono">
            {countWithEmail}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">For digital receipts</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Repeat Revenue
          </span>
          <div className="mt-1 text-2xl font-black text-amber-700 font-mono truncate">
            {store.currencySymbol}{totalRepeatRevenue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">From loyal buyers</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone, email, or state..."
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('repeat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              activeFilter === 'repeat'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Repeat Buyers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('vip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
              activeFilter === 'vip'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Crown className="w-3 h-3 text-amber-600" />
            <span>VIP Spend</span>
          </button>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">No customers found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search terms or filter criteria.'
              : 'When customers place orders via WhatsApp or checkout, their profiles appear here automatically.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Customer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const isVIP = customer.totalSpent >= 50000 || customer.totalOrders >= 3;
            const isRepeat = customer.totalOrders > 1;
            const cleanPhone = customer.phone.replace(/\D/g, '');
            const waPhone = cleanPhone.startsWith('0')
              ? `234${cleanPhone.slice(1)}`
              : cleanPhone.startsWith('234')
              ? cleanPhone
              : `234${cleanPhone}`;

            const initials = customer.name
              .split(' ')
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'CU';

            return (
              <div
                key={customer.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md hover:border-slate-300 transition flex flex-col justify-between space-y-3 group"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-900 to-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                          <span>{customer.name}</span>
                          {isVIP && (
                            <span title="VIP Buyer">
                              <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {isVIP ? (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">
                              VIP Buyer
                            </span>
                          ) : isRepeat ? (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                              Repeat ({customer.totalOrders}x)
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400">
                              New Buyer
                            </span>
                          )}
                          {customer.state && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 text-slate-400" />
                              {customer.state}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{customer.address}</span>
                      </div>
                    )}
                  </div>

                  {/* Order Stats */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center bg-slate-50/50 p-2 rounded-xl">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Orders</span>
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {customer.totalOrders} {customer.totalOrders === 1 ? 'order' : 'orders'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Spent</span>
                      <span className="font-mono font-black text-emerald-700 text-xs">
                        {store.currencySymbol}{(customer.totalSpent || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(customer)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Order History</span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={`tel:${customer.phone}`}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                      title="Call customer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                        `Hello ${customer.name}, thank you for shopping at ${store.name}! How may we assist you today?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Message on WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-current" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Customer Order History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setSelectedCustomer(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 z-10 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{selectedCustomer.name}</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedCustomer.phone}</span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lifetime Orders</span>
                  <span className="text-base font-extrabold font-mono text-slate-900">
                    {selectedCustomer.totalOrders}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lifetime Value</span>
                  <span className="text-base font-extrabold font-mono text-emerald-700">
                    {store.currencySymbol}{(selectedCustomer.totalSpent || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 text-xs text-amber-900">
                  <span className="font-bold block mb-0.5">Seller Note:</span>
                  {selectedCustomer.notes}
                </div>
              )}

              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider pt-2">
                Order History ({customerOrders.length})
              </h4>

              {customerOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                  No individual order records matched on this device. Total spend is calculated from customer memory.
                </div>
              ) : (
                <div className="space-y-2">
                  {customerOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="font-mono text-slate-900">{order.id}</span>
                        <span className="font-mono text-emerald-700">
                          {store.currencySymbol}{order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] flex items-center justify-between">
                        <span>
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                        </span>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Add New Customer</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fatima Aliko"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08031234567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. fatima@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">State / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Lagos"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Address / Landmark</label>
                  <input
                    type="text"
                    placeholder="e.g. Lekki Phase 1"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Seller Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Preferred delivery time, fragrance preferences, etc."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
