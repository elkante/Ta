import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Edit2,
  Trash2,
  Check,
  X,
  Phone,
  Mail,
  Lock,
  Sparkles,
  ShoppingBag,
  Package,
  FileText,
  MessageCircle,
  Tag,
  Truck,
  Bot,
  QrCode,
  Globe,
  BarChart3,
  StickyNote,
  Wallet,
  Calculator,
  LayoutDashboard,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Store, StoreStaffMember, TabId } from '../../types';
import { getStaffLimitByTier } from '../../utils/planLimits';

interface StaffManagementTabProps {
  store: Store;
  onUpdateStore: (updated: Store) => Promise<void>;
  onOpenUpgrade: (targetPlan: 'pro' | 'business' | 'enterprise') => void;
}

interface SelectableTabOption {
  id: TabId;
  label: string;
  desc: string;
  icon: React.ElementType;
  category: 'core' | 'catalog' | 'marketing' | 'finance';
}

const SELECTABLE_TABS: SelectableTabOption[] = [
  { id: 'home', label: 'Dashboard Overview', desc: 'View summary numbers and stats', icon: LayoutDashboard, category: 'core' },
  { id: 'orders', label: 'Orders & Dispatches', desc: 'Process customer orders and waybills', icon: ShoppingBag, category: 'core' },
  { id: 'invoices', label: 'Invoices & Receipts', desc: 'Generate and send official bills', icon: FileText, category: 'core' },
  { id: 'inquiries', label: 'Customer Chats', desc: 'Read WhatsApp messages and leads', icon: MessageCircle, category: 'core' },
  { id: 'products', label: 'Products & Inventory', desc: 'Add, edit, and restock items', icon: Package, category: 'catalog' },
  { id: 'coupons', label: 'Discounts & Wholesale', desc: 'Manage promotional coupons and rules', icon: Tag, category: 'catalog' },
  { id: 'customers', label: 'Customer CRM', desc: 'View buyer contact history', icon: Users, category: 'catalog' },
  { id: 'locations', label: 'Where you deliver', desc: 'Manage shipping zones and delivery rates', icon: Truck, category: 'catalog' },
  { id: 'storefront', label: 'Storefront Design', desc: 'Customize themes, banners, and layout', icon: Globe, category: 'marketing' },
  { id: 'uid-bot', label: 'WhatsApp Auto-Reply Bot', desc: 'Configure bot settings and catalogs', icon: Bot, category: 'marketing' },
  { id: 'marketing', label: 'Status & Story Studio', desc: 'Generate 9:16 social cards and AI copy', icon: QrCode, category: 'marketing' },
  { id: 'analytics', label: 'Sales Analytics', desc: 'View revenue trends and charts', icon: BarChart3, category: 'finance' },
  { id: 'expenses', label: 'Expense Tracker', desc: 'Log store business expenses', icon: Wallet, category: 'finance' },
  { id: 'notes', label: 'My Notes', desc: 'Private shop scratchpad and logs', icon: StickyNote, category: 'finance' },
  { id: 'calculator', label: 'Profit Calculator', desc: 'Calculate markup and margins', icon: Calculator, category: 'finance' },
];

export const StaffManagementTab: React.FC<StaffManagementTabProps> = ({
  store,
  onUpdateStore,
  onOpenUpgrade,
}) => {
  const staffList: StoreStaffMember[] = store.staff || [];
  const maxStaff = getStaffLimitByTier(store.tier);
  const isLimitReached = staffList.length >= maxStaff;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [pinOrPassword, setPinOrPassword] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [allowedTabs, setAllowedTabs] = useState<TabId[]>(['orders', 'inquiries']);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    if (isLimitReached) {
      if (store.tier === 'pro') onOpenUpgrade('business');
      else if (store.tier === 'business') onOpenUpgrade('enterprise');
      else onOpenUpgrade('pro');
      return;
    }
    setEditingStaffId(null);
    setName('');
    setEmailOrPhone('');
    setPinOrPassword('');
    setRoleTitle('');
    setAllowedTabs(['home', 'orders', 'inquiries']);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StoreStaffMember) => {
    setEditingStaffId(staff.id);
    setName(staff.name);
    setEmailOrPhone(staff.emailOrPhone);
    setPinOrPassword(staff.pinOrPassword);
    setRoleTitle(staff.roleTitle || '');
    setAllowedTabs((staff.allowedTabs as TabId[]) || []);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleToggleTab = (tabId: TabId) => {
    setAllowedTabs((prev) =>
      prev.includes(tabId) ? prev.filter((t) => t !== tabId) : [...prev, tabId]
    );
  };

  const applyPreset = (preset: 'all' | 'orders' | 'sales' | 'inventory') => {
    switch (preset) {
      case 'all':
        setAllowedTabs(SELECTABLE_TABS.map((t) => t.id));
        break;
      case 'orders':
        setAllowedTabs(['home', 'orders', 'locations', 'invoices']);
        break;
      case 'sales':
        setAllowedTabs(['home', 'inquiries', 'orders', 'products', 'customers']);
        break;
      case 'inventory':
        setAllowedTabs(['home', 'products', 'storefront', 'marketing']);
        break;
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = name.trim();
    const cleanId = emailOrPhone.trim();
    const cleanPin = pinOrPassword.trim();

    if (!cleanName) {
      setErrorMsg('Please enter staff member name');
      return;
    }
    if (!cleanId) {
      setErrorMsg('Please enter a phone number or email for login');
      return;
    }
    if (!cleanPin) {
      setErrorMsg('Please set a PIN or password for staff login');
      return;
    }
    if (allowedTabs.length === 0) {
      setErrorMsg('Please select at least one dashboard tab permission');
      return;
    }

    // Check for duplicate identifier
    const duplicate = staffList.find(
      (s) => s.emailOrPhone.toLowerCase() === cleanId.toLowerCase() && s.id !== editingStaffId
    );
    if (duplicate) {
      setErrorMsg('A staff member with this phone or email already exists');
      return;
    }

    setIsSaving(true);
    try {
      let updatedStaff: StoreStaffMember[];
      if (editingStaffId) {
        updatedStaff = staffList.map((s) =>
          s.id === editingStaffId
            ? {
                ...s,
                name: cleanName,
                emailOrPhone: cleanId,
                pinOrPassword: cleanPin,
                roleTitle: roleTitle.trim() || undefined,
                allowedTabs,
              }
            : s
        );
      } else {
        const newMember: StoreStaffMember = {
          id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: cleanName,
          emailOrPhone: cleanId,
          pinOrPassword: cleanPin,
          roleTitle: roleTitle.trim() || undefined,
          allowedTabs,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        updatedStaff = [...staffList, newMember];
      }

      await onUpdateStore({
        ...store,
        staff: updatedStaff,
      });

      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (staffId: string) => {
    const updatedStaff = staffList.map((s) =>
      s.id === staffId ? { ...s, isActive: !s.isActive } : s
    );
    await onUpdateStore({ ...store, staff: updatedStaff });
  };

  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!window.confirm(`Are you sure you want to remove staff member "${staffName}"?`)) {
      return;
    }
    const updatedStaff = staffList.filter((s) => s.id !== staffId);
    await onUpdateStore({ ...store, staff: updatedStaff });
  };

  return (
    <div className="space-y-5">
      {/* Top Banner Card */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 text-base">
                  Staff &amp; Team Management
                </h3>
                <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold">
                  {staffList.length} of {maxStaff} Worker{maxStaff === 1 ? '' : 's'} Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Add worker accounts for your sales reps, order dispatchers, and inventory handlers.
                Set and amend exact permissions for which dashboard areas each worker can access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {maxStaff > 0 ? (
              <button
                onClick={openAddModal}
                disabled={isLimitReached}
                className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 ${
                  isLimitReached
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLimitReached ? 'Limit Reached' : 'Add Staff Member'}</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenUpgrade('pro')}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Upgrade to Pro to Add Staff</span>
              </button>
            )}
          </div>
        </div>

        {/* Tier Allowance Info Pill */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Your current plan (<strong>{store.tier.toUpperCase()}</strong>) allows up to{' '}
              <strong>{maxStaff}</strong> staff member{maxStaff === 1 ? '' : 's'}.
            </span>
          </div>

          {store.tier !== 'enterprise' && (
            <button
              onClick={() => {
                if (store.tier === 'pro') onOpenUpgrade('business');
                else onOpenUpgrade('enterprise');
              }}
              className="text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
            >
              Need more worker accounts? Upgrade plan →
            </button>
          )}
        </div>
      </div>

      {/* Upgrade Callout if Free / Starter / Basic */}
      {maxStaff === 0 && (
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border-2 border-amber-200 rounded-3xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
            <Users className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="font-extrabold text-slate-900 text-base">
              Empower Your Shop Team with Staff Accounts
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Staff accounts let your workers handle orders and customer WhatsApp chats directly
              from their phones without sharing your main owner password or accessing sensitive
              store settings.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-semibold text-slate-700">
            <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              ⚡ Pro: <strong>1 Staff Account</strong>
            </span>
            <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              🤖 Business: <strong>3 Staff Accounts</strong>
            </span>
            <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              🌐 Enterprise: <strong>6 Staff Accounts</strong>
            </span>
          </div>
          <button
            onClick={() => onOpenUpgrade('pro')}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Upgrade to Pro to Enable Staff Access</span>
          </button>
        </div>
      )}

      {/* Staff List */}
      {maxStaff > 0 && staffList.length === 0 && (
        <div className="bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200/80 space-y-3">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Users className="w-7 h-7" />
          </div>
          <h4 className="font-extrabold text-slate-900 text-sm">No staff accounts created yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Create an account for your dispatch rider, sales assistant, or catalog helper. They will
            only see the tabs you choose.
          </p>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2 cursor-pointer active:scale-95 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Your First Staff Member</span>
          </button>
        </div>
      )}

      {/* Staff Member Cards */}
      {staffList.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staffList.map((staff) => (
            <div
              key={staff.id}
              className={`bg-white rounded-3xl border p-5 shadow-2xs transition space-y-4 ${
                staff.isActive ? 'border-slate-200/90' : 'border-slate-200/50 opacity-70 bg-slate-50/50'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-white flex items-center justify-center font-black text-sm shrink-0">
                    {staff.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">{staff.name}</h4>
                      {staff.roleTitle && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                          {staff.roleTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                      {staff.emailOrPhone.includes('@') ? (
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : (
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span className="font-mono text-[11px] truncate">{staff.emailOrPhone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleActive(staff.id)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer ${
                      staff.isActive
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                    title={staff.isActive ? 'Click to suspend worker' : 'Click to activate worker'}
                  >
                    {staff.isActive ? 'Active' : 'Suspended'}
                  </button>
                  <button
                    onClick={() => openEditModal(staff)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    title="Edit permissions"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteStaff(staff.id, staff.name)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                    title="Remove staff member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Allowed Tabs Badges */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Allowed Tabs ({staff.allowedTabs?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(staff.allowedTabs || []).map((tabId) => {
                    const match = SELECTABLE_TABS.find((t) => t.id === tabId);
                    return (
                      <span
                        key={tabId}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-1"
                      >
                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{match ? match.label : tabId}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Login Info Pill */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>PIN / Password: <strong>••••</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => openEditModal(staff)}
                  className="text-emerald-700 font-bold hover:underline cursor-pointer"
                >
                  Change PIN
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="fixed inset-0" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-2xl w-full p-5 sm:p-7 border border-slate-100 z-10 space-y-5 max-h-[95vh] sm:max-h-[92vh] overflow-y-auto my-0 sm:my-auto">
            {/* Mobile drag handle */}
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-1 sm:hidden shrink-0" />

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingStaffId ? 'Edit Staff Permissions & Details' : 'Add New Staff Member'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingStaffId
                    ? 'Amend the permissions or credentials for this worker.'
                    : 'Create worker credentials and specify allowed dashboard areas.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveStaff} className="space-y-5">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Chioma Okafor"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Role / Job Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Order Dispatcher, Sales Rep"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Staff Phone or Email (Login ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="e.g. 08012345678 or staff@store.com"
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Staff Login PIN or Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={pinOrPassword}
                      onChange={(e) => setPinOrPassword(e.target.value)}
                      placeholder="e.g. 1234 or secretPass"
                      className="w-full p-2.5 pr-10 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* PERMISSION SELECTOR */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-extrabold text-slate-900 block">
                      Select Allowed Dashboard Tabs
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Check each tab this worker can see. (Store Settings &amp; Billing are always restricted to Owner).
                    </p>
                  </div>

                  {/* Quick Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyPreset('all')}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('orders')}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition cursor-pointer"
                    >
                      Orders &amp; Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('sales')}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 transition cursor-pointer"
                    >
                      Sales &amp; Chats
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('inventory')}
                      className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 transition cursor-pointer"
                    >
                      Inventory
                    </button>
                  </div>
                </div>

                {/* Tab Cards Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {SELECTABLE_TABS.map((tab) => {
                    const isSelected = allowedTabs.includes(tab.id);
                    const Icon = tab.icon;
                    return (
                      <div
                        key={tab.id}
                        onClick={() => handleToggleTab(tab.id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-start gap-2.5 select-none ${
                          isSelected
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                            isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {tab.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 leading-tight">
                            {tab.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-500 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    <strong>Owner Security Guarantee:</strong> Store Settings, payout bank details, and Subscription Billing can never be accessed by staff members.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : editingStaffId ? 'Update Permissions' : 'Save Staff Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
