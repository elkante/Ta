import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  CreditCard,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  Filter,
  Image as ImageIcon,
  Layers,
  Link,
  MapPin,
  Menu,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  Pin,
  Plus,
  Printer,
  QrCode,
  Search,
  Settings,
  Share2,
  ShoppingBag,
  Sparkles,
  Star,
  StickyNote,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  Users,
  Volume2,
  Wallet,
  X,
  Zap,
  BarChart3,
  Calculator,
  DollarSign,
  Bell,
  Calendar,
  RotateCcw,
  TrendingDown,
  Percent,
  FileText,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CurrencyCode, Product, Store, StoreIdVerification, StoreOrder, WhatsAppInquiryLog, StoreNote, StoreExpense } from '../../types';
import { AddEditProductModal } from './AddEditProductModal';
import { PaystackModal } from '../modals/PaystackModal';
import { SocialShareModal } from '../modals/SocialShareModal';
import { StatusStudioModal } from '../modals/StatusStudioModal';
import { AIMarketingModal } from '../modals/AIMarketingModal';
import { WaybillModal } from '../modals/WaybillModal';
import { WhatsAppBotStudio } from './WhatsAppBotStudio';
import { formatPrice, generateWhatsAppLink } from '../../utils/whatsapp';
import { generateQRCodeSVG } from '../../utils/qrCode';
import { playOrderNotificationSound } from '../../utils/audio';
import { dbFetchOrders, dbDeleteProduct, dbSaveProduct, dbSaveStore } from '../../utils/supabase';
import {
  generateItemUid,
  getOrdersByStore,
  getStoredInquiries,
  getStoredOrders,
  getStoredProducts,
  getStoredStores,
  getStoreUrl,
  getStoreDisplayUrl,
  saveInquiries,
  saveOrders,
  saveProducts,
  saveStores,
  updateOrderStatus,
  updateStore,
  validateSlug,
  getStoreNotes,
  saveStoreNotes,
  getStoreExpenses,
  saveStoreExpenses,
  getRootDomain,
} from '../../utils/storage';

const COVER_PRESETS = [
  { name: 'Luxury Gold', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Minimal Boutique', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Fashion Chic', url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Dark Velvet', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1600&auto=format&fit=crop&q=80' },
  { name: 'Modern Tech', url: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1600&auto=format&fit=crop&q=80' },
];

interface SellerDashboardProps {
  store: Store;
  products: Product[];
  inquiries: WhatsAppInquiryLog[];
  onOpenStorefront: () => void;
  onRefreshData: () => void;
  onSelectStore: (store: Store) => void;
  onOpenGuide?: () => void;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  store,
  products,
  inquiries,
  onOpenStorefront,
  onRefreshData,
  onSelectStore,
  onOpenGuide,
}) => {
  const [activeTab, setActiveTabState] = useState<'orders' | 'products' | 'uid-bot' | 'marketing' | 'inquiries' | 'settings' | 'billing' | 'analytics' | 'notes' | 'expenses' | 'calculator'>(() => {
    try {
      const url = new URL(window.location.href);
      const urlTab = url.searchParams.get('tab') as any;
      if (urlTab && ['orders', 'products', 'uid-bot', 'marketing', 'inquiries', 'settings', 'billing', 'analytics', 'notes', 'expenses', 'calculator'].includes(urlTab)) {
        return urlTab;
      }
      const saved = sessionStorage.getItem(`ta_seller_tab_${store.id}`) || sessionStorage.getItem('ta_seller_tab');
      if (saved && ['orders', 'products', 'uid-bot', 'marketing', 'inquiries', 'settings', 'billing', 'analytics', 'notes', 'expenses', 'calculator'].includes(saved)) {
        return saved as any;
      }
    } catch (e) {}
    return 'orders';
  });

  const setActiveTab = (tab: typeof activeTab) => {
    setActiveTabState(tab);
    try {
      sessionStorage.setItem(`ta_seller_tab_${store.id}`, tab);
      sessionStorage.setItem('ta_seller_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch (e) {}
  };

  // Orders State & Filtering
  const [orderViewMode, setOrderViewMode] = useState<'active' | 'history'>('active');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'payment_confirmed' | 'ready' | 'dispatched' | 'completed' | 'cancelled'>('all');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // New Order Notification listener & polling
  const lastOrderCountRef = useRef<number>(-1);
  const [newOrderToast, setNewOrderToast] = useState(false);
  const [latestOrderInfo, setLatestOrderInfo] = useState<{ id: string; name: string; amount: number } | null>(null);

  // Analytics Filter States
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom_day' | 'custom_year'>('month');
  const [analyticsYear, setAnalyticsYear] = useState<number>(new Date().getFullYear());
  const [analyticsDay, setAnalyticsDay] = useState<string>(new Date().toISOString().slice(0, 10));

  // Notes Manager States
  const [storeNotes, setStoreNotes] = useState<StoreNote[]>(() => getStoreNotes(store.id));
  const [noteSearch, setNoteSearch] = useState('');
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StoreNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [notePinned, setNotePinned] = useState(false);

  // Expenses Manager States
  const [storeExpenses, setStoreExpenses] = useState<StoreExpense[]>(() => getStoreExpenses(store.id));
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>('all');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState<string>('all');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<StoreExpense['category']>('Supplies');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));

  // Calculator States
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcFormula, setCalcFormula] = useState('');
  const [calcHistory, setCalcHistory] = useState<string[]>([]);
  const [pmCostPrice, setPmCostPrice] = useState<string>('');
  const [pmSellingPrice, setPmSellingPrice] = useState<string>('');
  const [pmTargetMargin, setPmTargetMargin] = useState<string>('30');

  // Status & Story Studio Modal state
  const [isStatusStudioOpen, setIsStatusStudioOpen] = useState(false);
  const [statusStudioProduct, setStatusStudioProduct] = useState<Product | null>(null);

  // Commercial Waybill Modal state
  const [isWaybillOpen, setIsWaybillOpen] = useState(false);
  const [selectedOrderForWaybill, setSelectedOrderForWaybill] = useState<StoreOrder | null>(null);

  const storeOrders = getOrdersByStore(store.id);
  const totalOrderRevenue = storeOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
  const activeOrders = storeOrders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');
  const historyOrders = storeOrders.filter((o) => o.status === 'completed' || o.status === 'cancelled');
  const pendingOrdersCount = storeOrders.filter((o) => o.status === 'pending').length;

  // New Order Real-Time Listener + Cloud Supabase Polling Effect
  useEffect(() => {
    const checkOrders = async () => {
      // 1. Check local storage
      const localStoreOrders = getOrdersByStore(store.id);
      let count = localStoreOrders.length;

      // 2. Poll Supabase cloud db so orders sent from buyer devices arrive in real-time
      try {
        const cloudOrders = await dbFetchOrders(store.id);
        if (cloudOrders && cloudOrders.length > 0) {
          const allLocal = getStoredOrders();
          let hasNew = false;
          const merged = [...allLocal];

          cloudOrders.forEach((co) => {
            const exists = merged.some((lo) => lo.id === co.id);
            if (!exists) {
              merged.unshift(co);
              hasNew = true;
            }
          });

          if (hasNew) {
            saveOrders(merged);
            const updatedCurrentStore = merged.filter((o) => o.storeId === store.id);
            count = updatedCurrentStore.length;
            const newest = updatedCurrentStore[0];
            if (newest) {
              setLatestOrderInfo({ id: newest.id, name: newest.buyerName, amount: newest.totalAmount });
            }
            playOrderNotificationSound(1.0);
            setNewOrderToast(true);
            onRefreshData();
            setTimeout(() => setNewOrderToast(false), 8000);
          }
        }
      } catch (e) {
        // network fallback
      }

      if (lastOrderCountRef.current === -1) {
        lastOrderCountRef.current = count;
      } else if (count > lastOrderCountRef.current) {
        lastOrderCountRef.current = count;
        const currentOrders = getOrdersByStore(store.id);
        const newest = currentOrders[0];
        if (newest) {
          setLatestOrderInfo({ id: newest.id, name: newest.buyerName, amount: newest.totalAmount });
        }
        playOrderNotificationSound(1.0);
        setNewOrderToast(true);
        onRefreshData();
        setTimeout(() => setNewOrderToast(false), 8000);
      } else {
        lastOrderCountRef.current = count;
      }
    };

    // Run immediately on dashboard mount
    checkOrders();

    const handleCustomOrderEvent = (e: any) => {
      const ord = e.detail;
      if (ord && ord.storeId === store.id) {
        setLatestOrderInfo({ id: ord.id, name: ord.buyerName, amount: ord.totalAmount });
      }
      playOrderNotificationSound(1.0);
      setNewOrderToast(true);
      onRefreshData();
      setTimeout(() => setNewOrderToast(false), 8000);
    };

    window.addEventListener('tashop:order_placed', handleCustomOrderEvent);
    window.addEventListener('storage', checkOrders);
    const interval = setInterval(checkOrders, 4000);

    return () => {
      window.removeEventListener('tashop:order_placed', handleCustomOrderEvent);
      window.removeEventListener('storage', checkOrders);
      clearInterval(interval);
    };
  }, [store.id, onRefreshData]);

  // Sync notes & expenses when store changes
  useEffect(() => {
    setStoreNotes(getStoreNotes(store.id));
    setStoreExpenses(getStoreExpenses(store.id));
  }, [store.id]);

  const filteredOrders = storeOrders.filter((o) => {
    // Partition by active vs history
    if (orderViewMode === 'active') {
      if (o.status === 'completed' || o.status === 'cancelled') return false;
    } else {
      if (o.status !== 'completed' && o.status !== 'cancelled') return false;
    }

    const matchStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const cleanQ = orderSearch.trim().toLowerCase();
    const matchSearch =
      !cleanQ ||
      o.id.toLowerCase().includes(cleanQ) ||
      o.buyerName.toLowerCase().includes(cleanQ) ||
      o.buyerPhone.includes(cleanQ) ||
      (o.deliveryAddress && o.deliveryAddress.toLowerCase().includes(cleanQ)) ||
      o.items.some((i) => i.productName.toLowerCase().includes(cleanQ) || (i.productUid && i.productUid.toLowerCase().includes(cleanQ)));
    return matchStatus && matchSearch;
  });

  // Search & Filter in Products
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Product Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Paystack & Share Modals
  const [isPaystackOpen, setIsPaystackOpen] = useState(false);
  const [paystackInitialPlan, setPaystackInitialPlan] = useState<'starter' | 'badge' | 'pro' | 'business'>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAiMarketingOpen, setIsAiMarketingOpen] = useState(false);
  const [selectedAiProduct, setSelectedAiProduct] = useState<Product | null>(null);

  // Settings local state
  const [settingsOwnerName, setSettingsOwnerName] = useState(store.ownerName || '');
  const [settingsName, setSettingsName] = useState(store.name);
  const [settingsSlug, setSettingsSlug] = useState(store.slug);
  const [settingsTagline, setSettingsTagline] = useState(store.tagline || '');
  const [settingsDescription, setSettingsDescription] = useState(store.description || '');
  const [settingsCountryCode, setSettingsCountryCode] = useState(store.whatsappCountryCode || '+234');
  const [settingsNumber, setSettingsNumber] = useState(store.whatsappNumber || '');
  const [settingsCurrency, setSettingsCurrency] = useState<CurrencyCode>(store.currency || 'NGN');
  const [settingsAccentColor, setSettingsAccentColor] = useState(store.accentColor || '#b45309');
  const [settingsAnnouncement, setSettingsAnnouncement] = useState(store.announcement || '');
  const [settingsDeliveryInfo, setSettingsDeliveryInfo] = useState(store.deliveryInfo || '');
  const [settingsInstagram, setSettingsInstagram] = useState(store.socialLinks?.instagram || '');
  const [settingsTikTok, setSettingsTikTok] = useState(store.socialLinks?.tiktok || '');
  const [settingsFacebook, setSettingsFacebook] = useState(store.socialLinks?.facebook || '');
  const [settingsLogoUrl, setSettingsLogoUrl] = useState(store.logoUrl || '');
  const [settingsBannerUrl, setSettingsBannerUrl] = useState(store.bannerUrl || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // KYC re-upload state in Settings tab
  const [kycIdType, setKycIdType] = useState<StoreIdVerification['idType']>(store.idVerification?.idType || 'nin');
  const [kycIdNumber, setKycIdNumber] = useState(store.idVerification?.idNumber || '');
  const [kycFrontPreview, setKycFrontPreview] = useState<string>(store.idVerification?.frontImageUrl || '');
  const [kycBackPreview, setKycBackPreview] = useState<string>(store.idVerification?.backImageUrl || '');
  const [kycSaving, setKycSaving] = useState(false);

  useEffect(() => {
    setSettingsName(store.name);
    setSettingsSlug(store.slug);
    setSettingsTagline(store.tagline || '');
    setSettingsDescription(store.description || '');
    setSettingsCountryCode(store.whatsappCountryCode || '+234');
    setSettingsNumber(store.whatsappNumber || '');
    setSettingsCurrency(store.currency || 'NGN');
    setSettingsAccentColor(store.accentColor || '#b45309');
    setSettingsAnnouncement(store.announcement || '');
    setSettingsDeliveryInfo(store.deliveryInfo || '');
    setSettingsInstagram(store.socialLinks?.instagram || '');
    setSettingsTikTok(store.socialLinks?.tiktok || '');
    setSettingsFacebook(store.socialLinks?.facebook || '');
    setSettingsLogoUrl(store.logoUrl || '');
    setSettingsBannerUrl(store.bannerUrl || '');
    setSettingsOwnerName(store.ownerName || '');
  }, [store]);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSettingsError('Please select a valid image file for logo (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSettingsError('Logo image file must be under 5MB');
      return;
    }

    setIsUploadingLogo(true);
    setSettingsError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettingsLogoUrl(reader.result as string);
      setIsUploadingLogo(false);
    };
    reader.onerror = () => {
      setSettingsError('Failed to read logo image file.');
      setIsUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSettingsError('Please select a valid image file for cover banner (JPG, PNG, WebP)');
      return;
    }
    if (file.size > 7 * 1024 * 1024) {
      setSettingsError('Cover banner image file must be under 7MB');
      return;
    }

    setIsUploadingBanner(true);
    setSettingsError(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setSettingsBannerUrl(reader.result as string);
      setIsUploadingBanner(false);
    };
    reader.onerror = () => {
      setSettingsError('Failed to read cover banner image file.');
      setIsUploadingBanner(false);
    };
    reader.readAsDataURL(file);
  };

  // Link copy toast
  const [copiedStoreLink, setCopiedStoreLink] = useState(false);

  // Mobile sidebar drawer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Analytics Metrics
  const totalCatalogValue = products.reduce((sum, p) => sum + p.price, 0);
  const outOfStockCount = products.filter((p) => !p.inStock).length;
  const totalInquiriesCount = inquiries.length;

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  // Actions on Products
  const handleToggleStock = async (product: Product) => {
    const updatedProd: Product = { ...product, inStock: !product.inStock };
    const allProducts = getStoredProducts();
    const updated = allProducts.map((p) => (p.id === product.id ? updatedProd : p));
    saveProducts(updated);
    try {
      await dbSaveProduct(updatedProd);
    } catch (e) {}
    onRefreshData();
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const allProducts = getStoredProducts();
      const updated = allProducts.filter((p) => p.id !== productId);
      saveProducts(updated);
      try {
        await dbDeleteProduct(productId);
      } catch (err) {
        console.warn('Failed deleting product from Supabase:', err);
      }
      onRefreshData();
    }
  };

  const handleDuplicateProduct = async (product: Product) => {
    const allProducts = getStoredProducts();
    const duplicated: Product = {
      ...product,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      uid: generateItemUid(store.slug, allProducts.length + 1),
      name: `${product.name} (Copy)`,
      inquiryCount: 0,
      createdAt: new Date().toISOString(),
      approvalStatus: 'pending',
    };
    saveProducts([duplicated, ...allProducts]);
    try {
      await dbSaveProduct(duplicated);
    } catch (e) {}
    onRefreshData();
  };

  const handleSaveProduct = async (payload: Partial<Product>) => {
    const allProducts = getStoredProducts();

    // Sanitize image array to ensure preset fallback is always active if empty or missing
    const sanitizedImages =
      payload.images && payload.images.length > 0 && payload.images[0]?.trim()
        ? payload.images.map((img) => img.trim())
        : ['https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80'];

    const safePrice = Math.max(0, Number(payload.price) || 0);
    let savedProd: Product;

    if (productToEdit) {
      // Update existing
      savedProd = {
        ...productToEdit,
        ...payload,
        price: safePrice,
        images: sanitizedImages,
      };
      const updated = allProducts.map((p) =>
        p.id === productToEdit.id ? savedProd : p
      );
      saveProducts(updated);
    } else {
      // Add new
      savedProd = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        uid: payload.uid || generateItemUid(store.slug, allProducts.length + 1),
        storeId: store.id,
        name: payload.name?.trim() || 'New Product',
        slug: (payload.name || 'product').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: payload.description?.trim() || '',
        price: safePrice,
        originalPrice: payload.originalPrice ? Math.max(0, Number(payload.originalPrice)) : undefined,
        category: payload.category || 'General',
        images: sanitizedImages,
        inStock: payload.inStock ?? true,
        badge: payload.badge,
        variants: payload.variants || [],
        inquiryCount: 0,
        createdAt: new Date().toISOString(),
        approvalStatus: 'pending', // Must be approved by super admin before going live
      };
      saveProducts([savedProd, ...allProducts]);
    }

    setProductToEdit(null);

    // Await cloud persistence before triggering data refresh
    try {
      await dbSaveProduct(savedProd);
    } catch (e) {
      console.warn('Supabase product save error:', e);
    }

    onRefreshData();
  };

  // Inquiry Status Change
  const handleUpdateInquiryStatus = (inquiryId: string, status: WhatsAppInquiryLog['status']) => {
    const allInquiries = getStoredInquiries();
    const updated = allInquiries.map((i) => (i.id === inquiryId ? { ...i, status } : i));
    saveInquiries(updated);
    onRefreshData();
  };

  // Save Store Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError(null);

    // Validate slug
    const slugCheck = validateSlug(settingsSlug, store.id);
    if (!slugCheck.isValid) {
      setSettingsError(slugCheck.error || 'Invalid slug');
      return;
    }

    const curSymbol =
      settingsCurrency === 'NGN'
        ? '₦'
        : settingsCurrency === 'USD'
        ? '$'
        : settingsCurrency === 'GBP'
        ? '£'
        : settingsCurrency === 'EUR'
        ? '€'
        : settingsCurrency === 'KES'
        ? 'KSh'
        : 'GH₵';

    const updatedStore: Store = {
      ...store,
      ownerName: settingsOwnerName.trim() || store.ownerName,
      name: settingsName.trim(),
      slug: slugCheck.cleanSlug,
      tagline: settingsTagline.trim(),
      description: settingsDescription.trim(),
      logoUrl: settingsLogoUrl.trim() || store.logoUrl,
      bannerUrl: settingsBannerUrl.trim() || store.bannerUrl,
      whatsappCountryCode: settingsCountryCode,
      whatsappNumber: settingsNumber.replace(/\D/g, ''),
      currency: settingsCurrency,
      currencySymbol: curSymbol,
      accentColor: settingsAccentColor,
      announcement: settingsAnnouncement.trim(),
      deliveryInfo: settingsDeliveryInfo.trim(),
      socialLinks: {
        instagram: settingsInstagram.trim(),
        tiktok: settingsTikTok.trim(),
        facebook: settingsFacebook ? settingsFacebook.trim() : store.socialLinks?.facebook,
      },
    };

    const allStores = getStoredStores();
    const updatedStores = allStores.map((s) => (s.id === store.id ? updatedStore : s));
    saveStores(updatedStores);
    onSelectStore(updatedStore);
    try {
      await dbSaveStore(updatedStore);
    } catch (e) {
      console.warn('Supabase store settings save error:', e);
    }
    onRefreshData();

    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 2500);
  };

  // KYC re-upload save handler
  const handleSaveKyc = async () => {
    if (!kycFrontPreview) {
      setSettingsError('Please upload the front photo of your ID document before saving.');
      return;
    }
    if (!kycBackPreview) {
      setSettingsError('Please upload the back photo of your ID document before saving.');
      return;
    }
    setSettingsError(null);
    setKycSaving(true);
    const kycData: StoreIdVerification = {
      idType: kycIdType,
      idNumber: kycIdNumber.trim(),
      frontImageUrl: kycFrontPreview,
      backImageUrl: kycBackPreview,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    const updatedStore: Store = { ...store, idVerification: kycData };
    updateStore(updatedStore);
    onSelectStore(updatedStore);
    try {
      await dbSaveStore(updatedStore);
    } catch (e) {
      console.warn('Supabase KYC save error:', e);
    }
    onRefreshData();
    setKycSaving(false);
    setSettingsSavedToast(true);
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  const handleCopyStoreLink = () => {
    const url = getStoreUrl(store.slug, { customDomain: store.customDomain });
    navigator.clipboard.writeText(url);
    setCopiedStoreLink(true);
    setTimeout(() => setCopiedStoreLink(false), 2000);
  };

  const storeCatalogUrl = getStoreUrl(store.slug, { customDomain: store.customDomain });
  const qrSvg = generateQRCodeSVG(storeCatalogUrl, 260, store.accentColor || '#111827', '#ffffff');

  const handleDownloadStoreQR_PNG = () => {
    const img = new Image();
    const svgBlob = new Blob([qrSvg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 600, 600);
        ctx.drawImage(img, 0, 0, 600, 600);
        const png = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = png;
        a.download = `${store.slug}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // ─── Nav definition (shared by sidebar + mobile bottom bar) ───────────────
  type TabId = 'orders' | 'products' | 'uid-bot' | 'marketing' | 'inquiries' | 'settings' | 'billing' | 'analytics' | 'notes' | 'expenses' | 'calculator';
  const allTabs: { id: TabId; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'orders',    label: 'Orders',          icon: ShoppingBag,   badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined },
    { id: 'products',  label: 'Products',         icon: Package,       badge: `${products.length}` },
    { id: 'analytics', label: 'Analytics',        icon: BarChart3 },
    { id: 'uid-bot',   label: 'UID Drop Bot',     icon: Bot,           badge: 'Auto' },
    { id: 'marketing', label: 'Status & QR',      icon: QrCode },
    { id: 'inquiries', label: 'WA Clicks',         icon: MessageCircle, badge: inquiries.length > 0 ? `${inquiries.length}` : undefined },
    { id: 'notes',     label: 'Notes',            icon: StickyNote },
    { id: 'expenses',  label: 'Expenses',         icon: Wallet },
    { id: 'calculator',label: 'Calculator',       icon: Calculator },
    { id: 'settings',  label: 'Store Settings',   icon: Settings },
    { id: 'billing',   label: 'Subscription',     icon: CreditCard },
  ];
  // Bottom 5 for mobile notched nav (FAB is center — index 2 slot)
  const bottomTabs: TabId[] = ['orders', 'products', 'marketing', 'settings'];

  // Notes Helpers
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteBody.trim()) return;
    const now = new Date().toISOString();
    let updated: StoreNote[];
    if (editingNote) {
      updated = storeNotes.map((n) =>
        n.id === editingNote.id
          ? {
              ...n,
              title: noteTitle.trim() || 'Untitled Note',
              body: noteBody.trim(),
              pinned: notePinned,
              updatedAt: now,
            }
          : n
      );
    } else {
      const newNote: StoreNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        storeId: store.id,
        title: noteTitle.trim() || 'Untitled Note',
        body: noteBody.trim(),
        pinned: notePinned,
        createdAt: now,
        updatedAt: now,
      };
      updated = [newNote, ...storeNotes];
    }
    setStoreNotes(updated);
    saveStoreNotes(store.id, updated);
    setIsAddNoteOpen(false);
    setEditingNote(null);
    setNoteTitle('');
    setNoteBody('');
    setNotePinned(false);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Delete this note?')) {
      const updated = storeNotes.filter((n) => n.id !== noteId);
      setStoreNotes(updated);
      saveStoreNotes(store.id, updated);
    }
  };

  const handleTogglePinNote = (noteId: string) => {
    const updated = storeNotes.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n));
    setStoreNotes(updated);
    saveStoreNotes(store.id, updated);
  };

  // Expenses Helpers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(amt) || amt <= 0) return;
    const newExp: StoreExpense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      storeId: store.id,
      description: expenseDesc.trim(),
      amount: amt,
      category: expenseCategory,
      date: expenseDate || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    const updated = [newExp, ...storeExpenses];
    setStoreExpenses(updated);
    saveStoreExpenses(store.id, updated);
    setIsAddExpenseOpen(false);
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('Supplies');
  };

  const handleDeleteExpense = (expId: string) => {
    if (confirm('Delete this expense entry?')) {
      const updated = storeExpenses.filter((e) => e.id !== expId);
      setStoreExpenses(updated);
      saveStoreExpenses(store.id, updated);
    }
  };

  // Safe Calculator Evaluation
  const safeEvaluateArithmetic = (expr: string): number => {
    try {
      const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/[^0-9+\-*/.]/g, '');
      if (!sanitized) return 0;
      // Evaluate only numbers and basic operators
      const res = Function(`"use strict"; return (${sanitized})`)();
      return typeof res === 'number' && Number.isFinite(res) ? Math.round(res * 10000) / 10000 : 0;
    } catch {
      return 0;
    }
  };

  const handleCalcDigit = (digit: string) => {
    if (digit === '.') {
      if (calcDisplay.includes('.')) return;
      setCalcDisplay(calcDisplay + '.');
      return;
    }
    if (calcDisplay === '0' || calcDisplay === 'Error') {
      setCalcDisplay(digit);
    } else {
      setCalcDisplay(calcDisplay + digit);
    }
  };

  const handleCalcOperator = (op: string) => {
    if (calcFormula && !calcDisplay) {
      setCalcFormula(calcFormula.slice(0, -1) + op);
      return;
    }
    const nextFormula = calcFormula ? `${calcFormula} ${calcDisplay} ${op}` : `${calcDisplay} ${op}`;
    setCalcFormula(nextFormula);
    setCalcDisplay('0');
  };

  const handleCalcEquals = () => {
    if (!calcFormula) return;
    const fullExpr = `${calcFormula} ${calcDisplay}`;
    const result = safeEvaluateArithmetic(fullExpr);
    const historyItem = `${fullExpr} = ${result}`;
    setCalcHistory([historyItem, ...calcHistory.slice(0, 9)]);
    setCalcDisplay(String(result));
    setCalcFormula('');
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcFormula('');
  };

  const handleCalcBackspace = () => {
    if (calcDisplay.length <= 1 || calcDisplay === 'Error') {
      setCalcDisplay('0');
    } else {
      setCalcDisplay(calcDisplay.slice(0, -1));
    }
  };

  const handleCalcNegate = () => {
    if (calcDisplay === '0') return;
    if (calcDisplay.startsWith('-')) {
      setCalcDisplay(calcDisplay.slice(1));
    } else {
      setCalcDisplay('-' + calcDisplay);
    }
  };

  const handleCalcPercent = () => {
    const val = parseFloat(calcDisplay);
    if (!isNaN(val)) {
      setCalcDisplay(String(val / 100));
    }
  };

  const NavItem = ({ tab, compact = false }: { tab: typeof allTabs[0]; compact?: boolean }) => {
    const Icon = tab.icon;
    const active = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
          active
            ? 'bg-white/15 text-white font-semibold'
            : 'text-slate-400 hover:text-white hover:bg-white/8 font-medium'
        }`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-amber-400' : ''}`} />
        {!compact && <span className="text-sm flex-1 truncate">{tab.label}</span>}
        {!compact && tab.badge && (
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
            tab.id === 'orders' && pendingOrdersCount > 0
              ? 'bg-rose-500 text-white animate-pulse'
              : 'bg-white/20 text-white/70'
          }`}>
            {tab.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden w-full max-w-full">

      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden md:flex flex-col w-60 min-h-screen bg-slate-900 flex-shrink-0 sticky top-0 overflow-y-auto">
        {/* Store identity */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={store.logoUrl}
              alt={store.name}
              className="w-10 h-10 rounded-xl object-cover border border-white/20 flex-shrink-0"
            />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate leading-tight">{store.name}</p>
              <span className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                store.tier === 'business'
                  ? 'bg-violet-500/30 text-violet-300'
                  : store.tier === 'pro'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-white/10 text-slate-400'
              }`}>
                {store.tier === 'business' ? '🤖 Business AI' : store.tier === 'pro' ? '⚡ Pro' : 'Starter'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-1">
          {allTabs.map(tab => <NavItem key={tab.id} tab={tab} />)}
        </nav>

        {/* Sidebar bottom actions */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <button
            onClick={onOpenStorefront}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>View Store</span>
          </button>
          {onOpenGuide && (
            <button
              onClick={onOpenGuide}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Platform Guide</span>
            </button>
          )}
          {store.tier === 'free' && (
            <button
              onClick={() => setIsPaystackOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </aside>

      {/* ── MOBILE SIDEBAR OVERLAY + DRAWER ── */}
      {isSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-72 bg-slate-900 h-full flex flex-col shadow-2xl overflow-y-auto">
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <img src={store.logoUrl} alt={store.name} className="w-9 h-9 rounded-xl object-cover border border-white/20" />
                <div>
                  <p className="text-white font-bold text-sm truncate">{store.name}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    store.tier === 'business' ? 'bg-violet-500/30 text-violet-300' :
                    store.tier === 'pro' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-400'
                  }`}>
                    {store.tier === 'business' ? '🤖 Business AI' : store.tier === 'pro' ? '⚡ Pro' : 'Starter'}
                  </span>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {allTabs.map(tab => <NavItem key={tab.id} tab={tab} />)}
            </nav>
            <div className="p-3 border-t border-white/10 space-y-2">
              <button onClick={onOpenStorefront} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer">
                <Eye className="w-4 h-4" />
                <span>View Store</span>
              </button>
              {onOpenGuide && (
                <button onClick={onOpenGuide} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 transition text-sm cursor-pointer">
                  <Sparkles className="w-4 h-4 text-amber-400" /><span>Platform Guide</span>
                </button>
              )}
              {store.tier === 'free' && (
                <button onClick={() => { setIsPaystackOpen(true); setIsSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold cursor-pointer">
                  <Zap className="w-4 h-4" />Upgrade to Pro
                </button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Compact top header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="font-bold text-slate-900 text-sm leading-tight">{store.name}</p>
              <p className="text-[11px] text-slate-400 hidden sm:block font-mono">{store.customDomain || `${store.slug}.${getRootDomain()}`}</p>
            </div>
          </div>

          {/* Header quick actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setStatusStudioProduct(products[0] || null); setIsStatusStudioOpen(true); }}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Status Studio</span>
            </button>
            <button
              onClick={handleCopyStoreLink}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {copiedStoreLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedStoreLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
            {store.tier === 'free' && (
              <button
                onClick={() => setIsPaystackOpen(true)}
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold items-center gap-1.5 shadow transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" /><span>Upgrade</span>
              </button>
            )}
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 p-4 sm:p-6 pb-28 md:pb-8 overflow-x-hidden">

        {/* LOUD NEW ORDER ALERT BANNER */}
        {newOrderToast && (
          <div className="mb-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-4 rounded-2xl shadow-xl border border-emerald-400/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0 text-2xl shadow-inner">
                🛎️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-wide">New Order Received! 🔊</span>
                  <span className="bg-white/25 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Loud Alert</span>
                </div>
                <p className="text-xs text-emerald-100 mt-0.5">
                  {latestOrderInfo
                    ? `${latestOrderInfo.name} just placed order #${latestOrderInfo.id} • ${formatPrice(latestOrderInfo.amount, store.currencySymbol)}`
                    : 'A customer just placed a fresh order via your mobile catalog!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => playOrderNotificationSound(1.0)}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer transition"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Replay Sound</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('orders');
                  setOrderViewMode('active');
                  setOrderSearch(latestOrderInfo ? latestOrderInfo.id : '');
                  setNewOrderToast(false);
                }}
                className="px-3.5 py-1.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-black shadow-md cursor-pointer transition"
              >
                View in Orders →
              </button>
              <button
                type="button"
                onClick={() => setNewOrderToast(false)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-lg cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Analytics Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Orders Received</span>
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{storeOrders.length}</div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {pendingOrdersCount > 0 ? `${pendingOrdersCount} pending dispatch` : 'All orders processed'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Order Revenue</span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono truncate">
              {formatPrice(totalOrderRevenue, store.currencySymbol)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">From WhatsApp checkouts</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Catalog Products</span>
              <Package className="w-4 h-4 text-slate-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{products.length}</div>
            <span className="text-[11px] text-slate-400 font-medium">
              {outOfStockCount > 0 ? `${outOfStockCount} sold out` : 'All in stock'}
            </span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Leads</span>
              <MessageCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">{totalInquiriesCount}</div>
            <span className="text-[11px] text-slate-400 font-medium">Direct chats initiated</span>
          </div>
        </div>

        {/* TAB 0: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Header with Loud Alert Sound Test Button */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Store Orders & Dispatch Log</h3>
                  <span className="bg-emerald-50 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded-full border border-emerald-200 font-mono">
                    {storeOrders.length} Orders
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Orders submitted via your mobile cart. Customers receive their Order ID, and a loud sound alert is triggered on placement.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => playOrderNotificationSound(1.0)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer active:scale-95"
                  title="Test the loud celebratory cash chime that plays when a buyer orders"
                >
                  <Volume2 className="w-4 h-4 text-amber-600" />
                  <span>Test Loud Order Alert 🔊</span>
                </button>
              </div>
            </div>

            {/* View Mode Toggle: Active Orders vs Order History */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrderViewMode('active');
                    setOrderStatusFilter('all');
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    orderViewMode === 'active'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Active Orders</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    orderViewMode === 'active' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {activeOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderViewMode('history');
                    setOrderStatusFilter('all');
                  }}
                  className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                    orderViewMode === 'history'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Order History</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    orderViewMode === 'history' ? 'bg-emerald-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {historyOrders.length}
                  </span>
                </button>
              </div>

              <div className="text-xs text-slate-400 hidden sm:block">
                {orderViewMode === 'active'
                  ? '⚡ Orders currently in progress (advancing to complete)'
                  : '📦 Finished & delivered orders recorded for history'}
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={orderViewMode === 'active' ? "Search active orders by name, phone, item UID..." : "Search order history by name, phone, order ID..."}
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Status Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {orderViewMode === 'active' ? (
                  [
                    { id: 'all', label: 'All Active' },
                    { id: 'pending', label: '🆕 Received' },
                    { id: 'confirmed', label: '✅ Confirmed' },
                    { id: 'payment_confirmed', label: '💰 Paid' },
                    { id: 'ready', label: '📦 Ready' },
                    { id: 'dispatched', label: '🚚 Dispatched' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setOrderStatusFilter(st.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        orderStatusFilter === st.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))
                ) : (
                  [
                    { id: 'all', label: 'All History' },
                    { id: 'completed', label: '🎉 Completed & Delivered' },
                    { id: 'cancelled', label: '🔴 Cancelled' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setOrderStatusFilter(st.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        orderStatusFilter === st.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Orders Feed */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">No orders found</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {orderSearch || orderStatusFilter !== 'all'
                    ? 'No orders match your filter criteria. Try clearing search or status filters.'
                    : 'When customers place orders from your mobile storefront, they will appear here with full item breakdowns and Item UIDs.'}
                </p>
                {(orderSearch || orderStatusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('all');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition hover:shadow-md"
                  >
                    {/* Order Top Banner */}
                    <div className="p-4 sm:p-5 bg-slate-50/80 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-black text-sm text-slate-900 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          #{ord.id}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`#${ord.id}`);
                            setCopiedOrderId(ord.id);
                            setTimeout(() => setCopiedOrderId(null), 2000);
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                          title="Copy Order ID"
                        >
                          {copiedOrderId === ord.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedOrderId === ord.id ? 'Copied' : 'Copy'}</span>
                        </button>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(ord.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Order Status Stepper */}
                      <div className="flex flex-col gap-2 self-start sm:self-center w-full sm:w-auto">
                        {(() => {
                          const steps: { status: StoreOrder['status']; label: string; emoji: string }[] = [
                            { status: 'pending',           label: 'Received',          emoji: '🆕' },
                            { status: 'confirmed',         label: 'Confirmed',         emoji: '✅' },
                            { status: 'payment_confirmed', label: 'Payment Confirmed', emoji: '💰' },
                            { status: 'ready',             label: 'Ready',             emoji: '📦' },
                            { status: 'dispatched',        label: 'Dispatched',        emoji: '🚚' },
                            { status: 'completed',         label: 'Complete',          emoji: '🎉' },
                          ];
                          const statusOrder = steps.map(s => s.status);
                          const currentIdx = statusOrder.indexOf(ord.status as any);
                          const nextStep = currentIdx >= 0 && currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
                          const isCancelled = ord.status === 'cancelled';
                          return (
                            <div className="space-y-2">
                              {/* Steps progress bar */}
                              <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
                                {steps.map((step, idx) => {
                                  const isCompleted = currentIdx >= idx && !isCancelled;
                                  const isCurrent = currentIdx === idx && !isCancelled;
                                  return (
                                    <React.Fragment key={step.status}>
                                      <div className={`flex flex-col items-center gap-0.5 flex-shrink-0`}>
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                                          isCancelled ? 'border-slate-200 bg-slate-100 text-slate-400' :
                                          isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' :
                                          'border-slate-200 bg-white text-slate-400'
                                        }`}>
                                          {isCompleted ? '✓' : step.emoji}
                                        </div>
                                        <span className={`text-[9px] font-semibold whitespace-nowrap ${
                                          isCancelled ? 'text-slate-400' :
                                          isCurrent ? 'text-emerald-700' :
                                          isCompleted ? 'text-emerald-600' : 'text-slate-400'
                                        }`}>{step.label}</span>
                                      </div>
                                      {idx < steps.length - 1 && (
                                        <div className={`h-0.5 w-4 flex-shrink-0 mx-0.5 rounded-full ${
                                          !isCancelled && currentIdx > idx ? 'bg-emerald-400' : 'bg-slate-200'
                                        }`} />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                                {isCancelled && (
                                  <span className="ml-2 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">🔴 Cancelled</span>
                                )}
                              </div>
                              {/* Advance button */}
                              {!isCancelled && nextStep && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateOrderStatus(ord.id, nextStep.status);
                                    if (nextStep.status === 'completed') {
                                      try {
                                        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
                                      } catch (e) {}
                                    }
                                    onRefreshData();
                                  }}
                                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                                    nextStep.status === 'completed'
                                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                                  }`}
                                >
                                  <span>Mark as {nextStep.emoji} {nextStep.label}</span>
                                  <span>→</span>
                                </button>
                              )}
                              {!isCancelled && ord.status === 'completed' && (
                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                                  <span>🎉 Order Completed & Archived</span>
                                </div>
                              )}
                              {!isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to mark order #${ord.id} as Cancelled?`)) {
                                      updateOrderStatus(ord.id, 'cancelled');
                                      onRefreshData();
                                    }
                                  }}
                                  className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
                                  title="Mark order as cancelled by customer"
                                >
                                  <span>✕ Cancel Order</span>
                                </button>
                              )}
                              {isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateOrderStatus(ord.id, 'pending');
                                    onRefreshData();
                                  }}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                                  title="Restore order to Pending"
                                >
                                  ↩ Re-open Order
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Order Details Body */}
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Customer & Fulfillment Info Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                        {/* Customer */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Customer Info
                          </span>
                          <div className="font-bold text-slate-900 text-sm">{ord.buyerName}</div>
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            <a
                              href={`tel:${ord.buyerPhone}`}
                              className="font-mono text-slate-700 hover:text-slate-900 flex items-center gap-1 font-semibold underline decoration-slate-300"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{ord.buyerPhone}</span>
                            </a>
                            <a
                              href={generateWhatsAppLink(
                                store.whatsappCountryCode,
                                ord.buyerPhone,
                                `Hello ${ord.buyerName}, this is ${store.name} regarding your order #${ord.id}.`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold hover:bg-emerald-100 transition flex items-center gap-1"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                          {ord.buyerNotes && (
                            <div className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2">
                              💬 Note: "{ord.buyerNotes}"
                            </div>
                          )}
                        </div>

                        {/* Fulfillment */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                            Fulfillment Details
                          </span>
                          <div>
                            {ord.fulfillmentMethod === 'delivery' ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Doorstep Delivery</span>
                                </span>
                                <div className="text-xs text-slate-800 font-medium mt-1">
                                  📍 {ord.deliveryAddress || 'Address not specified'}
                                </div>
                                {ord.deliveryArea && (
                                  <div className="text-xs text-slate-500">
                                    🏙️ City/Area: {ord.deliveryArea}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                  <span>🏬 Store Pickup</span>
                                </span>
                                <div className="text-xs text-slate-800 font-medium mt-1">
                                  📍 {store.location || 'At store counter'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Items Ordered Table */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                          Ordered Items ({ord.items.length})
                        </span>
                        <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                          {ord.items.map((item, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200 shrink-0"
                                  />
                                )}
                                <div>
                                  <div className="font-semibold text-slate-900">{item.productName}</div>
                                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                    <span className="font-mono font-bold bg-white text-slate-800 px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                                      UID: #{item.productUid}
                                    </span>
                                    {item.variantName && <span>Option: {item.variantName}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-900">
                                  {formatPrice(item.subtotal, ord.currencySymbol || store.currencySymbol)}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {item.quantity} × {formatPrice(item.price, ord.currencySymbol || store.currencySymbol)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Summary & Actions */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-slate-500">Total Order Amount:</span>
                          <span className="text-lg font-black font-mono text-slate-900">
                            {formatPrice(ord.totalAmount, ord.currencySymbol || store.currencySymbol)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={
                              ord.whatsappUrl ||
                              generateWhatsAppLink(
                                store.whatsappCountryCode,
                                ord.buyerPhone,
                                `Hello ${ord.buyerName}, this is ${store.name} regarding your order #${ord.id}.`
                              )
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-white" />
                            <span>Reply to Customer on WhatsApp</span>
                          </a>

                          <button
                            onClick={() => {
                              setSelectedOrderForWaybill(ord);
                              setIsWaybillOpen(true);
                            }}
                            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                            title="Generate commercial delivery waybill slip"
                          >
                            <Truck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Print Waybill</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Header / Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search products by title..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setProductToEdit(null);
                  setIsAddProductOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Item UID</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Variants</th>
                      <th className="py-3 px-4">Inquiries</th>
                      <th className="py-3 px-4">Stock Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          No products found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={p.images[0]}
                                alt={p.name}
                                className="w-10 h-10 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                              />
                              <div className="max-w-xs">
                                <div className="font-semibold text-slate-900 truncate">{p.name}</div>
                                {p.badge && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                    {p.badge}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-800 text-xs">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                              #{p.uid || p.id}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {formatPrice(p.price, store.currencySymbol)}
                          </td>

                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px]">
                              {p.category}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-500">
                            {p.variants && p.variants.length > 0 ? (
                              <span className="font-mono">{p.variants.length} options</span>
                            ) : (
                              <span className="text-slate-400">Single SKU</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                              {p.inquiryCount || 0}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleStock(p)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                                p.inStock
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <span>{p.inStock ? 'In Stock' : 'Sold Out'}</span>
                            </button>
                            {/* Approval status badge */}
                            {p.approvalStatus === 'pending' && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                                ⏳ Pending Approval
                              </span>
                            )}
                            {p.approvalStatus === 'rejected' && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full" title={p.approvalRejectionReason || 'Rejected by admin'}>
                                ✗ Rejected
                              </span>
                            )}
                            {(!p.approvalStatus || p.approvalStatus === 'approved') && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                ✓ Live
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedAiProduct(p);
                                  setIsAiMarketingOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
                                title="AI Caption & Hashtag Generator (Google AI Studio)"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-600" />
                                <span className="hidden sm:inline">AI Copy</span>
                              </button>
                              <button
                                onClick={() => {
                                  setStatusStudioProduct(p);
                                  setIsStatusStudioOpen(true);
                                }}
                                className="px-2 py-1 rounded-lg text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
                                title="Create 9:16 WhatsApp Status Card"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span className="hidden sm:inline">Status Card</span>
                              </button>
                              <button
                                onClick={() => {
                                  setProductToEdit(p);
                                  setIsAddProductOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="Edit Product"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDuplicateProduct(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                                title="Duplicate Product"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INQUIRIES & ORDERS LOG */}
        {activeTab === 'inquiries' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Customer WhatsApp Inquiry Log</h3>
                  <p className="text-xs text-slate-500">
                    Every time a buyer clicks "Order on WhatsApp", an inquiry event is logged here with their requested variant and location.
                  </p>
                </div>
                <span className="text-xs font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg font-semibold">
                  {inquiries.length} Inquiries Logged
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {inquiries.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                  No inquiries recorded yet. When buyers click "Order on WhatsApp", they will appear here.
                </div>
              ) : (
                inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{inq.productName}</span>
                        {inq.variantName && (
                          <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {inq.variantName}
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {formatPrice(inq.price, store.currencySymbol)}
                        </span>
                      </div>

                      {inq.buyerLocation && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Delivery to: <strong>{inq.buyerLocation}</strong></span>
                        </div>
                      )}

                      {inq.buyerNote && (
                        <p className="text-xs text-slate-500 italic">
                          "{inq.buyerNote}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(inq.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <select
                        value={inq.status}
                        onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as any)}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                          inq.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : inq.status === 'contacted'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : inq.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        <option value="inquired">🟡 New Inquiry</option>
                        <option value="contacted">🔵 In Discussion</option>
                        <option value="completed">🟢 Paid & Delivered</option>
                        <option value="cancelled">⚪ Cancelled</option>
                      </select>

                      <a
                        href={inq.whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold transition flex items-center gap-1"
                        title="Open WhatsApp chat with message pre-filled"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STORE SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 max-w-3xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">Storefront Settings</h3>
            <p className="text-xs text-slate-500 mb-6">
              Configure your store slug, WhatsApp routing, brand color palette, and delivery announcement.
            </p>

            {settingsError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}

            {settingsSavedToast && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Store settings updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* ── Store Owner Name ── */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Store Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settingsOwnerName}
                  onChange={(e) => setSettingsOwnerName(e.target.value)}
                  placeholder="e.g. Amara Okafor"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Your legal name as the registered store owner. Required for identity verification and plan upgrades.
                </p>
              </div>

              {/* ── Brand Assets: Logo & Profile Cover ── */}
              <div className="bg-slate-50/90 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Store Branding & Profile Cover</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Upload your official store logo and profile header cover directly from your device.
                  </p>
                </div>

                {/* Hidden File Inputs */}
                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileUpload}
                />
                <input
                  ref={bannerFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleBannerFileUpload}
                />

                {/* Cover Banner Preview Card with in-place upload button */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">Profile Cover Banner</label>
                    <span className="text-[11px] text-slate-400">Recommended 16:9 or 3:1 ratio</span>
                  </div>

                  <div className="relative w-full h-36 sm:h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                    <img
                      src={settingsBannerUrl || store.bannerUrl}
                      alt="Profile cover banner"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isUploadingBanner && (
                      <div className="absolute inset-0 bg-slate-900/70 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                    {/* Upload button floating on banner */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={isUploadingBanner}
                        className="px-3.5 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-bold shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-700" />
                        <span>{isUploadingBanner ? 'Uploading...' : 'Upload Cover from Device'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Presets for Cover */}
                  <div className="mt-2.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Or pick a preset cover:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COVER_PRESETS.map((preset) => (
                        <button
                          type="button"
                          key={preset.name}
                          onClick={() => setSettingsBannerUrl(preset.url)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                            settingsBannerUrl === preset.url
                              ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-1 ring-amber-400'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundImage: `url(${preset.url})`, backgroundSize: 'cover' }} />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Store Logo Row */}
                <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Logo Avatar Preview */}
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm shrink-0">
                    <img
                      src={settingsLogoUrl || store.logoUrl}
                      alt="Store Logo"
                      className="w-full h-full object-cover"
                    />
                    {isUploadingLogo && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 block">Store Logo / Profile Picture</label>
                    <p className="text-[11px] text-slate-500">
                      Displayed on your storefront header, checkout receipts, and WhatsApp catalog link.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo from Device'}</span>
                      </button>
                      {settingsLogoUrl && settingsLogoUrl !== store.logoUrl && (
                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> New logo selected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Store Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Store Name</label>
                  <input
                    type="text"
                    required
                    value={settingsName}
                    onChange={(e) => setSettingsName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Store URL Slug (Unique)
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-slate-900">
                    <span className="pl-3 text-xs text-slate-500 font-mono">/s/</span>
                    <input
                      type="text"
                      required
                      value={settingsSlug}
                      onChange={(e) => setSettingsSlug(e.target.value)}
                      className="w-full px-2 py-2.5 text-xs font-mono text-slate-900 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Store Tagline</label>
                <input
                  type="text"
                  placeholder="e.g. 100% Original Designer & Niche Fragrances in Lagos"
                  value={settingsTagline}
                  onChange={(e) => setSettingsTagline(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* WhatsApp Details */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Country</label>
                  <select
                    value={settingsCountryCode}
                    onChange={(e) => setSettingsCountryCode(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="+234">🇳🇬 +234 (Nigeria)</option>
                    <option value="+1">🇺🇸 +1 (USA/Canada)</option>
                    <option value="+44">🇬🇧 +44 (UK)</option>
                    <option value="+254">🇰🇪 +254 (Kenya)</option>
                    <option value="+233">🇬🇭 +233 (Ghana)</option>
                    <option value="+27">🇿🇦 +27 (South Africa)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    WhatsApp Orders Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={settingsNumber}
                    onChange={(e) => setSettingsNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Announcement Bar & Accent Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Announcement Banner (Top of page)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ✨ Free nationwide dispatch on orders over ₦70,000!"
                    value={settingsAnnouncement}
                    onChange={(e) => setSettingsAnnouncement(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Theme Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsAccentColor}
                      onChange={(e) => setSettingsAccentColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settingsAccentColor}
                      onChange={(e) => setSettingsAccentColor(e.target.value)}
                      className="w-28 px-2.5 py-1.5 text-xs font-mono rounded-xl border border-slate-200"
                    />
                    <div className="flex gap-1">
                      {['#b45309', '#047857', '#1d4ed8', '#be185d', '#0f172a'].map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setSettingsAccentColor(c)}
                          className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Info Policy */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Delivery & Logistics Timeline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Island & Mainland: Same-day. Rest of Nigeria: 24-48 hours."
                  value={settingsDeliveryInfo}
                  onChange={(e) => setSettingsDeliveryInfo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Social links */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Instagram Handle</label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <span className="pl-3 text-xs text-slate-400 select-none">@</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={settingsInstagram}
                      onChange={(e) => setSettingsInstagram(e.target.value.replace(/^@/, ''))}
                      className="w-full px-1.5 py-2 text-xs bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Facebook Handle</label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <span className="pl-3 text-xs text-slate-400 select-none">@</span>
                    <input
                      type="text"
                      placeholder="pagename"
                      value={settingsFacebook}
                      onChange={(e) => setSettingsFacebook(e.target.value.replace(/^@/, ''))}
                      className="w-full px-1.5 py-2 text-xs bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">TikTok Handle</label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <span className="pl-3 text-xs text-slate-400 select-none">@</span>
                    <input
                      type="text"
                      placeholder="username"
                      value={settingsTikTok}
                      onChange={(e) => setSettingsTikTok(e.target.value.replace(/^@/, ''))}
                      className="w-full px-1.5 py-2 text-xs bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition cursor-pointer"
                >
                  Save Store Settings
                </button>
              </div>
            </form>

            {/* ── KYC IDENTITY VERIFICATION CARD (outside form, save via own handler) ── */}
            <div className="mt-6 bg-slate-50/90 rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Identity Verification (KYC)</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Required to upgrade to Pro or Business plans. Upload clear front & back photos of your government-issued ID.
                  </p>
                </div>
                {/* Status pill */}
                {store.idVerification ? (
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                      store.idVerification.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : store.idVerification.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                        : store.idVerification.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {store.idVerification.status === 'verified' && <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    {store.idVerification.status === 'pending' && <Clock className="w-3.5 h-3.5 text-amber-600" />}
                    {store.idVerification.status === 'pending' && 'Under Review'}
                    {store.idVerification.status === 'verified' && 'ID Verified ✓'}
                    {store.idVerification.status === 'rejected' && 'Rejected – Resubmit'}
                    {store.idVerification.status === 'unsubmitted' && 'Not Submitted'}
                  </span>
                ) : (
                  <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-600">
                    Not Submitted
                  </span>
                )}
              </div>

              {/* Rejection reason notice */}
              {store.idVerification?.status === 'rejected' && store.idVerification.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Reason for Rejection:</strong>
                    <span>{store.idVerification.rejectionReason}</span>
                    <span className="block mt-1 text-rose-600 font-medium">Please correct the issue and resubmit below.</span>
                  </div>
                </div>
              )}

              {/* Verified — readonly display */}
              {store.idVerification?.status === 'verified' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                    <BadgeCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-900">Your identity is verified!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      ID Type: <strong>{store.idVerification.idType?.replace(/_/g, ' ').toUpperCase()}</strong>
                      {store.idVerification.idNumber && ` · ID No: ${store.idVerification.idNumber}`}
                    </p>
                    {store.idVerification.verifiedAt && (
                      <p className="text-[11px] text-emerald-600 mt-0.5">
                        Verified on {new Date(store.idVerification.verifiedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Upload form for unsubmitted / pending / rejected */
                <div className="space-y-3">
                  {/* ID Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">ID Document Type</label>
                      <select
                        value={kycIdType}
                        onChange={(e) => setKycIdType(e.target.value as StoreIdVerification['idType'])}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="nin">NIN – National Identification Number</option>
                        <option value="drivers_license">Driver's License</option>
                        <option value="passport">International Passport</option>
                        <option value="voters_card">Voter's Card (PVC)</option>
                        <option value="national_id">Other National ID</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        ID Number / Registration (Optional)
                      </label>
                      <input
                        type="text"
                        value={kycIdNumber}
                        onChange={(e) => setKycIdNumber(e.target.value)}
                        placeholder="e.g. 12345678901"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Front & Back ID Photos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Front */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Front of ID <span className="text-rose-500">*</span>
                      </label>
                      <label className="block cursor-pointer">
                        <div
                          className={`relative h-36 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center transition ${
                            kycFrontPreview
                              ? 'border-indigo-300 bg-white'
                              : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30'
                          }`}
                        >
                          {kycFrontPreview ? (
                            <img src={kycFrontPreview} alt="Front ID" className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-center px-4">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                              <p className="text-xs text-slate-500 font-medium">Upload Front Photo</p>
                              <p className="text-[11px] text-slate-400">JPG, PNG – Max 5MB</p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              setSettingsError('Front ID photo must be under 5MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setKycFrontPreview(ev.target?.result as string);
                              setSettingsError(null);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {kycFrontPreview && (
                        <button
                          type="button"
                          onClick={() => setKycFrontPreview('')}
                          className="mt-1 text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>

                    {/* Back */}
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                        Back of ID <span className="text-rose-500">*</span>
                      </label>
                      <label className="block cursor-pointer">
                        <div
                          className={`relative h-36 rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center transition ${
                            kycBackPreview
                              ? 'border-indigo-300 bg-white'
                              : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/30'
                          }`}
                        >
                          {kycBackPreview ? (
                            <img src={kycBackPreview} alt="Back ID" className="w-full h-full object-contain" />
                          ) : (
                            <div className="text-center px-4">
                              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                              <p className="text-xs text-slate-500 font-medium">Upload Back Photo</p>
                              <p className="text-[11px] text-slate-400">JPG, PNG – Max 5MB</p>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              setSettingsError('Back ID photo must be under 5MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setKycBackPreview(ev.target?.result as string);
                              setSettingsError(null);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {kycBackPreview && (
                        <button
                          type="button"
                          onClick={() => setKycBackPreview('')}
                          className="mt-1 text-[11px] text-rose-500 hover:text-rose-700 cursor-pointer flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit KYC button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveKyc}
                      disabled={kycSaving}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-2"
                    >
                      {kycSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <BadgeCheck className="w-4 h-4" />
                      )}
                      <span>
                        {store.idVerification?.status === 'rejected'
                          ? 'Resubmit ID for Verification'
                          : store.idVerification?.status === 'pending'
                          ? 'Update & Resubmit ID'
                          : 'Submit ID for Verification'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: WHATSAPP DROP UID BOT */}
        {activeTab === 'uid-bot' && (
          <WhatsAppBotStudio store={store} products={products} onRefreshData={onRefreshData} />
        )}

        {/* TAB 4: MARKETING & QR */}
        {activeTab === 'marketing' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Caption & Hashtag Studio Card */}
            <div className="md:col-span-2 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-6 rounded-3xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      AI Marketing Studio: Captions, Hashtags & Keywords
                    </h4>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                      Google AI Studio
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Generate viral WhatsApp status copy, Instagram/TikTok captions, high-ranking Nigerian vendor hashtags, and SEO keywords for any product.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedAiProduct(products[0] || null);
                  setIsAiMarketingOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Open AI Generator</span>
              </button>
            </div>

            {/* Status Studio Promotion Card */}
            <div className="md:col-span-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border border-amber-300/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Status & Story Studio (9:16 Vertical Cards)
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Export high-res story cards with Item UIDs, currency prices, and QR codes for WhatsApp Status, Instagram Stories, and TikTok.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStatusStudioProduct(products[0] || null);
                  setIsStatusStudioOpen(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 shrink-0 cursor-pointer shadow-xs active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Launch Status Studio</span>
              </button>
            </div>
            {/* Downloadable QR Code Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Printable Store QR Code</h3>
                <p className="text-xs text-slate-500">
                  Print this QR code on physical business cards, delivery boxes, or thank-you cards.
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200/80">
                <div
                  className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <span className="mt-3 text-xs font-mono text-slate-600 font-semibold">
                  {store.customDomain || `${store.slug}.${getRootDomain()}`}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleDownloadStoreQR_PNG}
                  className="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition"
                  title="Download high-res PNG for flyers and social media"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PNG</span>
                </button>

                <button
                  onClick={() => {
                    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${store.slug}-qr.svg`;
                    a.click();
                  }}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Download scalable vector SVG"
                >
                  <Download className="w-4 h-4" />
                  <span>SVG</span>
                </button>

                <button
                  onClick={handleCopyStoreLink}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
              </div>
            </div>

            {/* Customer Review Collector & Photo Proof Link Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-white to-slate-50 p-6 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">Customer Review & Photo Feedback Link</h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      Social Proof ✨
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Send this link to buyers on WhatsApp so they can rate you 1–5 stars and upload a photo of what they received.
                  </p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-xs">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-amber-200/70 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 block">Your Store Review Link:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getStoreUrl(store.slug, { customDomain: store.customDomain })}?review=1`}
                    className="flex-1 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 select-all"
                  />
                  <button
                    onClick={() => {
                      const url = `${getStoreUrl(store.slug, { customDomain: store.customDomain })}?review=1`;
                      navigator.clipboard.writeText(url);
                      setCopiedStoreLink(true);
                      setTimeout(() => setCopiedStoreLink(false), 2000);
                    }}
                    className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedStoreLink ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Hi! 👋 Thank you for shopping with *${store.name}*! Could you take 10 seconds to leave us a quick star rating & feedback here?\n\n${getStoreUrl(store.slug, { customDomain: store.customDomain })}?review=1\n\n(You can also snap a photo of what you received!) Thank you so much for your support! ✨`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Review Request on WhatsApp</span>
                </a>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">WhatsApp Status & Bio Links</h3>
                <p className="text-xs text-slate-500">
                  Ready-made templates to post on your WhatsApp Status and Instagram Bio.
                </p>
              </div>

              <div className="space-y-3">
                {store.customDomain && (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Personal Web Domain</span>
                        <strong className="text-emerald-950 font-mono">{store.customDomain}</strong>
                      </div>
                    </div>
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Live & Verified
                    </span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Instagram / TikTok Bio Link
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={storeCatalogUrl}
                      className="w-full text-xs font-mono text-slate-800 bg-white p-2 rounded-lg border border-slate-200"
                    />
                    <button
                      onClick={handleCopyStoreLink}
                      className="px-3 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    WhatsApp Status Broadcast Message
                  </span>
                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 font-sans leading-relaxed">
                    ✨ Check out the new catalog for <strong>{store.name}</strong>! All items in stock with Item UID search and 1-click WhatsApp ordering: {storeCatalogUrl}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUBSCRIPTION & BILLING */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                    Current Active Plan
                  </span>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                    <span>
                      {store.tier === 'business'
                        ? 'Tá.shop Business AI Plan'
                        : store.tier === 'pro'
                        ? 'Tá.shop Pro Seller'
                        : 'Tá.shop Starter Plan (₦500/mo)'}
                    </span>
                    {(store.tier === 'pro' || store.tier === 'business') && (
                      <BadgeCheck className="w-5 h-5 text-blue-500" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {store.tier === 'business'
                      ? 'Active 24/7 AI WhatsApp Bot, unlimited catalogs, verified badge & priority infrastructure.'
                      : store.tier === 'pro'
                      ? 'Active recurring subscription via Paystack. Unlimited products and verified badge enabled.'
                      : 'Starter tier at ₦500/month for up to 10 products with custom slug and WhatsApp orders.'}
                  </p>
                </div>

                {store.tier === 'free' ? (
                  <button
                    onClick={() => {
                      setPaystackInitialPlan('pro');
                      setIsPaystackOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#0ba4db] hover:bg-[#0091c5] text-white font-bold text-xs shadow-md transition cursor-pointer self-start sm:self-auto"
                  >
                    Upgrade Plan
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
                    Active & Renewed
                  </span>
                )}
              </div>
            </div>

            {/* Billing Cycle Switcher: Monthly vs Annual Discount */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Choose Billing Frequency</h4>
                <p className="text-xs text-slate-500">Pay yearly to receive 20% discount on Pro & Business AI plans</p>
              </div>

              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    billingCycle === 'yearly'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Yearly</span>
                  <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                    SAVE 20%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Starter Plan */}
              <div className={`p-5 rounded-2xl border bg-white flex flex-col justify-between ${store.tier === 'free' ? 'ring-2 ring-slate-900' : 'border-slate-200'}`}>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Starter Plan</h4>
                  <div className="mt-2 text-2xl font-black font-mono">
                    {billingCycle === 'monthly' ? '₦500' : '₦6,000'}
                    <span className="text-xs font-normal text-slate-400">
                      {billingCycle === 'monthly' ? ' / month' : ' / year'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <span className="text-[11px] text-slate-500 block mt-0.5">Standard annual rate (₦500/mo)</span>
                  )}
                  <ul className="mt-4 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2">✓ Up to 10 products</li>
                    <li className="flex items-center gap-2">✓ Custom store slug (tá.shop/slug)</li>
                    <li className="flex items-center gap-2">✓ Item UID search & WhatsApp checkout</li>
                    <li className="flex items-center gap-2">✓ Loud audio order alerts on dashboard</li>
                    <li className="flex items-center gap-2 text-slate-400">✕ Verified merchant badge</li>
                    <li className="flex items-center gap-2 text-slate-400">✕ 24/7 AI WhatsApp Bot</li>
                  </ul>
                </div>
              </div>

              {/* Pro Plan */}
              <div className={`p-5 rounded-2xl border bg-gradient-to-br from-amber-50/50 to-white flex flex-col justify-between ${store.tier === 'pro' ? 'ring-2 ring-amber-500 border-amber-300' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>Tá.shop Pro</span>
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </h4>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      Popular
                    </span>
                  </div>

                  <div className="mt-2 text-2xl font-black font-mono">
                    {billingCycle === 'monthly' ? '₦4,900' : '₦39,000'}
                    <span className="text-xs font-normal text-slate-400">
                      {billingCycle === 'monthly' ? ' / month' : ' / year'}
                    </span>
                  </div>

                  {billingCycle === 'yearly' && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex">
                      <span>Save ₦19,800/yr (2 Months Free)</span>
                    </div>
                  )}

                  <ul className="mt-4 space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2 font-medium">✓ <strong>Unlimited products & variants</strong></li>
                    <li className="flex items-center gap-2 font-medium">✓ <strong>Verified Blue Tick</strong> badge</li>
                    <li className="flex items-center gap-2 font-medium">✓ <strong>Remove "Powered by Tá.shop"</strong></li>
                    <li className="flex items-center gap-2 font-medium">✓ Priority WhatsApp click analytics</li>
                    <li className="flex items-center gap-2 font-medium">✓ Custom domain support ready</li>
                  </ul>
                </div>

                {store.tier !== 'pro' && (
                  <button
                    onClick={() => {
                      setPaystackInitialPlan('pro');
                      setIsPaystackOpen(true);
                    }}
                    className="mt-5 w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                  >
                    Activate Pro ({billingCycle === 'yearly' ? '₦39k/yr' : '₦4.9k/mo'})
                  </button>
                )}
              </div>

              {/* Business AI Plan */}
              <div className={`p-5 rounded-2xl border bg-gradient-to-br from-violet-50/80 to-white flex flex-col justify-between ${store.tier === 'business' ? 'ring-2 ring-violet-500 border-violet-300' : 'border-slate-200'}`}>
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <span>Business AI</span>
                      <Bot className="w-3.5 h-3.5 text-violet-500" />
                    </h4>
                    <span className="bg-violet-100 text-violet-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      🤖 AI Powered
                    </span>
                  </div>

                  <div className="mt-2 text-2xl font-black font-mono">
                    {billingCycle === 'monthly' ? '₦25,000' : '₦200,000'}
                    <span className="text-xs font-normal text-slate-400">
                      {billingCycle === 'monthly' ? ' / month' : ' / year'}
                    </span>
                  </div>

                  {billingCycle === 'yearly' && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md inline-flex">
                      <span>Save ₦100,000/yr (2 Months Free)</span>
                    </div>
                  )}

                  <ul className="mt-4 space-y-2 text-xs text-slate-700">
                    <li className="flex items-center gap-2 font-medium">✓ <strong>Everything in Pro included</strong></li>
                    <li className="flex items-center gap-2 font-medium">✓ <strong>24/7 AI WhatsApp Bot</strong> auto-replies</li>
                    <li className="flex items-center gap-2 font-medium">✓ Smart product recommendations</li>
                    <li className="flex items-center gap-2 font-medium">✓ Auto order confirmations on WhatsApp</li>
                    <li className="flex items-center gap-2 font-medium">✓ Unlimited bot conversations</li>
                    <li className="flex items-center gap-2 font-medium">✓ VIP Priority support</li>
                  </ul>
                </div>

                {store.tier !== 'business' && (
                  <button
                    onClick={() => {
                      setPaystackInitialPlan('business');
                      setIsPaystackOpen(true);
                    }}
                    className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white text-xs font-semibold shadow transition cursor-pointer"
                  >
                    Activate Business AI ({billingCycle === 'yearly' ? '₦200k/yr' : '₦25k/mo'})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: STORE ANALYTICS */}
        {activeTab === 'analytics' && (() => {
          // Filter orders according to selected period
          const now = new Date();
          const filteredAnalyticsOrders = storeOrders.filter((o) => {
            const d = new Date(o.createdAt);
            if (analyticsPeriod === 'today') {
              return d.toDateString() === now.toDateString();
            }
            if (analyticsPeriod === 'yesterday') {
              const yest = new Date();
              yest.setDate(now.getDate() - 1);
              return d.toDateString() === yest.toDateString();
            }
            if (analyticsPeriod === 'week') {
              const weekAgo = new Date();
              weekAgo.setDate(now.getDate() - 7);
              return d >= weekAgo;
            }
            if (analyticsPeriod === 'month') {
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }
            if (analyticsPeriod === 'year') {
              return d.getFullYear() === now.getFullYear();
            }
            if (analyticsPeriod === 'custom_year') {
              return d.getFullYear() === analyticsYear;
            }
            if (analyticsPeriod === 'custom_day') {
              return d.toISOString().slice(0, 10) === analyticsDay;
            }
            return true;
          });

          const totalSales = filteredAnalyticsOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.totalAmount : 0), 0);
          const completedSales = filteredAnalyticsOrders.reduce((sum, o) => sum + (o.status === 'completed' ? o.totalAmount : 0), 0);
          const totalOrdersCount = filteredAnalyticsOrders.length;
          const completedOrdersCount = filteredAnalyticsOrders.filter((o) => o.status === 'completed').length;
          const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSales / totalOrdersCount) : 0;
          const totalItemsSold = filteredAnalyticsOrders.reduce((sum, o) => {
            if (o.status === 'cancelled') return sum;
            return sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0);
          }, 0);

          // Monthly Chart Data (Jan - Dec)
          const monthsNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthlyData = monthsNames.map((name, idx) => {
            const monthOrders = storeOrders.filter((o) => {
              const d = new Date(o.createdAt);
              const targetYear = analyticsPeriod === 'custom_year' ? analyticsYear : now.getFullYear();
              return d.getFullYear() === targetYear && d.getMonth() === idx && o.status !== 'cancelled';
            });
            const rev = monthOrders.reduce((sum, o) => sum + o.totalAmount, 0);
            return { name, revenue: rev, count: monthOrders.length };
          });
          const maxMonthRevenue = Math.max(...monthlyData.map((m) => m.revenue), 1);

          // Top Selling Products in this period
          const productStatsMap: Record<string, { id: string; name: string; image?: string; uid?: string; units: number; revenue: number }> = {};
          filteredAnalyticsOrders.forEach((o) => {
            if (o.status === 'cancelled') return;
            o.items.forEach((item) => {
              if (!productStatsMap[item.productId]) {
                productStatsMap[item.productId] = {
                  id: item.productId,
                  name: item.productName,
                  image: item.image,
                  uid: item.productUid,
                  units: 0,
                  revenue: 0,
                };
              }
              productStatsMap[item.productId].units += item.quantity;
              productStatsMap[item.productId].revenue += item.subtotal;
            });
          });
          const topProducts = Object.values(productStatsMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

          // Order status counts
          const statusCounts = {
            pending: filteredAnalyticsOrders.filter((o) => o.status === 'pending').length,
            confirmed: filteredAnalyticsOrders.filter((o) => o.status === 'confirmed').length,
            payment_confirmed: filteredAnalyticsOrders.filter((o) => o.status === 'payment_confirmed').length,
            ready: filteredAnalyticsOrders.filter((o) => o.status === 'ready').length,
            dispatched: filteredAnalyticsOrders.filter((o) => o.status === 'dispatched').length,
            completed: filteredAnalyticsOrders.filter((o) => o.status === 'completed').length,
            cancelled: filteredAnalyticsOrders.filter((o) => o.status === 'cancelled').length,
          };

          return (
            <div className="space-y-6">
              {/* Analytics Header & Period Filters */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-amber-600" />
                      <h3 className="font-bold text-slate-900 text-base">Store Sales Analytics</h3>
                      <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {store.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Track revenue, sales breakdown, and performance by year, day, or custom period.
                    </p>
                  </div>

                  {/* Year & Day Quick Selectors */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Specific Day Picker */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold text-[11px] text-slate-500">Pick Day:</span>
                      <input
                        type="date"
                        value={analyticsDay}
                        onChange={(e) => {
                          setAnalyticsDay(e.target.value);
                          setAnalyticsPeriod('custom_day');
                        }}
                        className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                      />
                    </div>

                    {/* Specific Year Picker */}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700">
                      <span className="font-semibold text-[11px] text-slate-500">Year:</span>
                      <select
                        value={analyticsPeriod === 'custom_year' ? analyticsYear : ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            setAnalyticsYear(Number(e.target.value));
                            setAnalyticsPeriod('custom_year');
                          }
                        }}
                        className="bg-transparent border-none text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        <option value="">Select Year</option>
                        {[2024, 2025, 2026, 2027].map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick Period Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Period:</span>
                  {[
                    { id: 'today', label: 'Today' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'week', label: 'Last 7 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'year', label: `Year ${now.getFullYear()}` },
                    { id: 'all', label: 'All Time' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAnalyticsPeriod(p.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        analyticsPeriod === p.id
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  {analyticsPeriod === 'custom_day' && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-xl text-xs font-bold border border-amber-300">
                      📅 Day: {analyticsDay}
                    </span>
                  )}
                  {analyticsPeriod === 'custom_year' && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-xl text-xs font-bold border border-purple-300">
                      📆 Year: {analyticsYear}
                    </span>
                  )}
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {formatPrice(totalSales, store.currencySymbol)}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
                    {completedSales > 0 ? `${formatPrice(completedSales, store.currencySymbol)} fully completed` : 'From active orders'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Orders</span>
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {totalOrdersCount}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
                    {completedOrdersCount} archived / delivered
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Avg Order Value</span>
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {formatPrice(avgOrderValue, store.currencySymbol)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                    Per customer order
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Items Sold</span>
                    <Package className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    {totalItemsSold}
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                    Individual units checked out
                  </span>
                </div>
              </div>

              {/* Monthly Sales Breakdown Chart */}
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Monthly Revenue Distribution</h4>
                    <p className="text-xs text-slate-400">
                      Annual breakdown for {analyticsPeriod === 'custom_year' ? analyticsYear : now.getFullYear()}
                    </p>
                  </div>
                  <span className="text-xs font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl font-mono">
                    Peak: {formatPrice(maxMonthRevenue === 1 ? 0 : maxMonthRevenue, store.currencySymbol)}
                  </span>
                </div>

                {/* CSS Bars Chart */}
                <div className="pt-8 pb-2 flex items-end justify-between gap-1 sm:gap-2 h-48 border-b border-slate-100 overflow-x-auto">
                  {monthlyData.map((m) => {
                    const heightPercent = maxMonthRevenue > 0 ? Math.round((m.revenue / maxMonthRevenue) * 100) : 0;
                    return (
                      <div key={m.name} className="flex-1 flex flex-col items-center gap-2 min-w-[28px] group relative">
                        {/* Tooltip on hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-10 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg font-mono whitespace-nowrap z-20 pointer-events-none shadow-lg">
                          {formatPrice(m.revenue, store.currencySymbol)} ({m.count} ord)
                        </div>
                        <div className="w-full bg-slate-100 rounded-xl h-36 flex items-end p-1 overflow-hidden">
                          <div
                            style={{ height: `${Math.max(heightPercent, 4)}%` }}
                            className={`w-full rounded-lg transition-all duration-500 ${
                              m.revenue > 0
                                ? 'bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-amber-300'
                                : 'bg-slate-200/60'
                            }`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{m.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom 2 Columns: Top Products & Order Status Pipeline */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Selling Products */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm">Top Selling Products</h4>
                    <span className="text-xs text-slate-400 font-semibold">By Sales Volume</span>
                  </div>

                  {topProducts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No product sales recorded for this period.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.map((p, idx) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition border border-slate-100 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center flex-shrink-0">
                              #{idx + 1}
                            </span>
                            {p.image && (
                              <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-white border border-slate-200" />
                            )}
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{p.name}</p>
                              {p.uid && (
                                <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  UID: #{p.uid}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black font-mono text-slate-900 text-sm">
                              {formatPrice(p.revenue, store.currencySymbol)}
                            </div>
                            <span className="text-[11px] text-slate-400 font-semibold">{p.units} units sold</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline Status Breakdown */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 text-sm">Order Status Funnel</h4>
                    <span className="text-xs text-slate-400 font-semibold">Current Pipeline</span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { label: '🆕 Received & Pending', count: statusCounts.pending, color: 'bg-amber-400' },
                      { label: '✅ Order Confirmed', count: statusCounts.confirmed, color: 'bg-blue-500' },
                      { label: '💰 Payment Confirmed', count: statusCounts.payment_confirmed, color: 'bg-emerald-500' },
                      { label: '📦 Packaged & Ready', count: statusCounts.ready, color: 'bg-indigo-500' },
                      { label: '🚚 Dispatched / Out', count: statusCounts.dispatched, color: 'bg-purple-500' },
                      { label: '🎉 Completed & Delivered', count: statusCounts.completed, color: 'bg-teal-600' },
                      { label: '🔴 Cancelled Orders', count: statusCounts.cancelled, color: 'bg-rose-500' },
                    ].map((st) => {
                      const pct = totalOrdersCount > 0 ? Math.round((st.count / totalOrdersCount) * 100) : 0;
                      return (
                        <div key={st.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{st.label}</span>
                            <span className="font-mono font-bold text-slate-900">
                              {st.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div style={{ width: `${pct}%` }} className={`h-full ${st.color} rounded-full transition-all duration-300`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* TAB: NOTES MANAGER */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <StickyNote className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-base">Store Notes & Reminders</h3>
                  <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                    {storeNotes.length} Notes
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keep customer order details, supplier contacts, restocking lists, or personal store memos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingNote(null);
                  setNoteTitle('');
                  setNoteBody('');
                  setNotePinned(false);
                  setIsAddNoteOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Note</span>
              </button>
            </div>

            {/* Note Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes by title or content..."
                value={noteSearch}
                onChange={(e) => setNoteSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
              />
            </div>

            {/* Note Cards Grid */}
            {(() => {
              const filteredNotes = storeNotes
                .filter((n) => {
                  const q = noteSearch.toLowerCase().trim();
                  return !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
                })
                .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

              if (filteredNotes.length === 0) {
                return (
                  <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <StickyNote className="w-8 h-8" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">No notes found</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Create your first store reminder, supplier quote, or order checklist.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddNoteOpen(true)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      + Create Note
                    </button>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-5 rounded-3xl border transition flex flex-col justify-between shadow-2xs hover:shadow-md ${
                        note.pinned
                          ? 'bg-gradient-to-br from-amber-50/70 to-white border-amber-300 ring-1 ring-amber-300'
                          : 'bg-white border-slate-200/90'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{note.title}</h4>
                          <button
                            type="button"
                            onClick={() => handleTogglePinNote(note.id)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              note.pinned ? 'bg-amber-100 text-amber-800' : 'text-slate-300 hover:text-slate-600'
                            }`}
                            title={note.pinned ? 'Unpin' : 'Pin to top'}
                          >
                            <Pin className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{note.body}</p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
                              alert('Note copied to clipboard!');
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                            title="Copy text"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNote(note);
                              setNoteTitle(note.title);
                              setNoteBody(note.body);
                              setNotePinned(note.pinned);
                              setIsAddNoteOpen(true);
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Note Create/Edit Modal */}
            {isAddNoteOpen && (
              <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-sm">
                      {editingNote ? 'Edit Store Note' : 'Add New Store Note'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddNoteOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveNote} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Restock Fragrance Bottles or Courier Contact"
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Note Content</label>
                      <textarea
                        rows={6}
                        placeholder="Type notes, customer requests, dispatch phone numbers, or account details..."
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="pinNoteCheck"
                        checked={notePinned}
                        onChange={(e) => setNotePinned(e.target.checked)}
                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <label htmlFor="pinNoteCheck" className="text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1">
                        <Pin className="w-3.5 h-3.5 text-amber-500" />
                        <span>Pin this note to the top</span>
                      </label>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddNoteOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                      >
                        {editingNote ? 'Save Changes' : 'Create Note'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: EXPENSES MANAGER */}
        {activeTab === 'expenses' && (() => {
          const filteredExpenses = storeExpenses.filter((exp) => {
            const matchCat = expenseCategoryFilter === 'all' || exp.category === expenseCategoryFilter;
            const matchMonth = expenseMonthFilter === 'all' || exp.date.startsWith(expenseMonthFilter);
            const q = expenseSearch.toLowerCase().trim();
            const matchQ = !q || exp.description.toLowerCase().includes(q);
            return matchCat && matchMonth && matchQ;
          });

          const totalExpensesAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
          const netProfit = totalOrderRevenue - totalExpensesAmount;
          const profitMargin = totalOrderRevenue > 0 ? Math.round((netProfit / totalOrderRevenue) * 100) : 0;

          // Category totals
          const catBreakdown: Record<string, number> = {};
          filteredExpenses.forEach((e) => {
            catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount;
          });

          return (
            <div className="space-y-6">
              {/* Header */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-600" />
                    <h3 className="font-bold text-slate-900 text-base">Store Expenses & Profit Tracker</h3>
                    <span className="bg-slate-100 text-slate-800 text-xs font-bold px-2 py-0.5 rounded-full font-mono">
                      {storeExpenses.length} Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track courier fees, packaging supplies, stock purchases, and calculate real net profit.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Log Expense</span>
                </button>
              </div>

              {/* P&L Financial Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Store Revenue
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {formatPrice(totalOrderRevenue, store.currencySymbol)}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">From WhatsApp orders</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Total Expenses
                  </span>
                  <div className="text-2xl font-black text-rose-600 font-mono">
                    {formatPrice(totalExpensesAmount, store.currencySymbol)}
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                    {filteredExpenses.length} operational items
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Net Profit
                  </span>
                  <div className={`text-2xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatPrice(netProfit, store.currencySymbol)}
                  </div>
                  <span className={`text-[11px] font-semibold mt-1 block ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {netProfit >= 0 ? 'Profitable operation' : 'Expenses exceed revenue'}
                  </span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Profit Margin
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono">
                    {profitMargin}%
                  </div>
                  <span className="text-[11px] text-slate-400 font-semibold mt-1 block">
                    Net return on sales
                  </span>
                </div>
              </div>

              {/* Filters & Expenses List */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search expenses..."
                      value={expenseSearch}
                      onChange={(e) => setExpenseSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={expenseCategoryFilter}
                      onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      {['Shipping', 'Supplies', 'Marketing', 'Rent', 'Utilities', 'Other'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Expenses Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            No expenses logged yet. Click "+ Log Expense" above to record store costs.
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50 transition">
                            <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{exp.date}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">{exp.description}</td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-100 text-slate-800 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                                {exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-black font-mono text-slate-900">
                              {formatPrice(exp.amount, store.currencySymbol)}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(exp.id)}
                                className="p-1 hover:bg-rose-50 rounded-lg text-rose-500 cursor-pointer"
                                title="Delete expense"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Expense Modal */}
              {isAddExpenseOpen && (
                <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 text-sm">Log Store Expense</h3>
                      <button
                        type="button"
                        onClick={() => setIsAddExpenseOpen(false)}
                        className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAddExpense} className="p-5 space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Expense Description</label>
                        <input
                          type="text"
                          placeholder="e.g. Courier dispatch riders fee, Packaging bags"
                          value={expenseDesc}
                          onChange={(e) => setExpenseDesc(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          autoFocus
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Amount ({store.currencySymbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="0.00"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                          <select
                            value={expenseCategory}
                            onChange={(e) => setExpenseCategory(e.target.value as any)}
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none cursor-pointer"
                          >
                            {['Shipping', 'Supplies', 'Marketing', 'Rent', 'Utilities', 'Other'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none cursor-pointer"
                        />
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddExpenseOpen(false)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                        >
                          Save Expense
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB: CALCULATOR & PROFIT MARGIN SUITE */}
        {activeTab === 'calculator' && (() => {
          const cost = parseFloat(pmCostPrice) || 0;
          const sell = parseFloat(pmSellingPrice) || 0;
          const profit = sell - cost;
          const marginPct = sell > 0 ? Math.round((profit / sell) * 1000) / 10 : 0;
          const markupPct = cost > 0 ? Math.round((profit / cost) * 1000) / 10 : 0;

          // Target pricing calculation
          const targetM = parseFloat(pmTargetMargin) || 0;
          const targetSellingPrice = targetM < 100 && cost > 0 ? Math.round(cost / (1 - targetM / 100)) : 0;

          return (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-slate-900 text-base">Commerce Calculator & Margin Suite</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Handy business tools for quick on-the-fly math, product pricing, and profit margin analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* 1. Full Business Calculator */}
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-4 max-w-sm mx-auto w-full">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fast Calculator</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(calcDisplay);
                        alert(`Copied ${calcDisplay} to clipboard!`);
                      }}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Calculator Display */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-right space-y-1">
                    <div className="text-xs text-slate-400 font-mono h-4 truncate">{calcFormula || '\u00A0'}</div>
                    <div className="text-3xl font-black font-mono text-white tracking-tight truncate">{calcDisplay}</div>
                  </div>

                  {/* Keypad */}
                  <div className="grid grid-cols-4 gap-2 text-sm font-bold font-mono">
                    <button
                      type="button"
                      onClick={handleCalcClear}
                      className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 cursor-pointer active:scale-95 transition"
                    >
                      AC
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcBackspace}
                      className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95 transition"
                    >
                      DEL
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcPercent}
                      className="p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 cursor-pointer active:scale-95 transition"
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('÷')}
                      className="p-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 transition"
                    >
                      ÷
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCalcDigit('7')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      7
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('8')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      8
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('9')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      9
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('×')}
                      className="p-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 transition"
                    >
                      ×
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCalcDigit('4')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('5')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('6')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      6
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('-')}
                      className="p-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 transition"
                    >
                      -
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCalcDigit('1')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('2')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('3')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      3
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcOperator('+')}
                      className="p-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 transition"
                    >
                      +
                    </button>

                    <button
                      type="button"
                      onClick={handleCalcNegate}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer active:scale-95 transition"
                    >
                      ±
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('0')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalcDigit('.')}
                      className="p-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white cursor-pointer active:scale-95 transition"
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={handleCalcEquals}
                      className="p-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black cursor-pointer active:scale-95 transition shadow-md"
                    >
                      =
                    </button>
                  </div>

                  {/* History Tape */}
                  {calcHistory.length > 0 && (
                    <div className="pt-3 border-t border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Recent Calculations</span>
                        <button
                          type="button"
                          onClick={() => setCalcHistory([])}
                          className="hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="max-h-20 overflow-y-auto space-y-0.5 text-[11px] font-mono text-slate-300">
                        {calcHistory.map((h, idx) => (
                          <div key={idx} className="truncate">{h}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Profit Margin & Pricing Calculator */}
                <div className="space-y-6">
                  {/* Margin & Markup Tool */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Percent className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-slate-900 text-sm">Product Profit & Margin Calculator</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Cost Price ({store.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 5000"
                          value={pmCostPrice}
                          onChange={(e) => setPmCostPrice(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Selling Price ({store.currencySymbol})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="e.g. 8500"
                          value={pmSellingPrice}
                          onChange={(e) => setPmSellingPrice(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    {/* Output badges */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Profit</span>
                        <span className={`text-base font-black font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatPrice(profit, store.currencySymbol)}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Margin</span>
                        <span className="text-base font-black font-mono text-slate-900">
                          {marginPct}%
                        </span>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Markup</span>
                        <span className="text-base font-black font-mono text-purple-600">
                          {markupPct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Target Pricing Tool */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-slate-900 text-sm">Target Price Finder</h4>
                    </div>

                    <p className="text-xs text-slate-500">
                      Determine what price you should charge to achieve a target profit margin.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cost Price ({store.currencySymbol})</label>
                        <input
                          type="number"
                          placeholder="e.g. 5000"
                          value={pmCostPrice}
                          onChange={(e) => setPmCostPrice(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Target Margin (%)</label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          placeholder="30"
                          value={pmTargetMargin}
                          onChange={(e) => setPmTargetMargin(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 block">Suggested Selling Price:</span>
                        <span className="text-xl font-black font-mono text-emerald-950">
                          {formatPrice(targetSellingPrice, store.currencySymbol)}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-700 font-semibold">
                        Gives {targetM}% margin
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        </div>{/* /content area */}
      </div>{/* /main flex-1 */}

      {/* ── MOBILE NOTCHED BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 h-16 flex items-end"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex w-full items-center h-16 relative">
          {/* Left 2 tabs */}
          {['orders', 'products'].map((tabId) => {
            const tab = allTabs.find(t => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer relative"
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-slate-400'}`} />
                  {tab.badge && tab.id === 'orders' && pendingOrdersCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
                      {pendingOrdersCount}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-600' : 'text-slate-400'}`}>{tab.label}</span>
              </button>
            );
          })}

          {/* CENTER NOTCH FAB */}
          <div className="flex-1 flex justify-center items-end pb-1 relative">
            <button
              onClick={() => { setActiveTab('products'); setIsAddProductOpen(true); }}
              className="absolute -top-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 active:scale-95 rounded-full shadow-xl flex items-center justify-center transition cursor-pointer border-4 border-white"
            >
              <Plus className="w-7 h-7 text-white" strokeWidth={3} />
            </button>
          </div>

          {/* Right 2 tabs */}
          {['marketing', 'settings'].map((tabId) => {
            const tab = allTabs.find(t => t.id === tabId)!;
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 h-full cursor-pointer"
              >
                <Icon className={`w-5 h-5 ${active ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-semibold ${active ? 'text-amber-600' : 'text-slate-400'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Product Add/Edit Modal */}
      <AddEditProductModal
        isOpen={isAddProductOpen}
        onClose={() => {
          setIsAddProductOpen(false);
          setProductToEdit(null);
        }}
        store={store}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
      />

      {/* Paystack Upgrade Modal */}
      <PaystackModal
        isOpen={isPaystackOpen}
        onClose={() => setIsPaystackOpen(false)}
        store={store}
        initialPlan={paystackInitialPlan}
        initialCycle={billingCycle}
        onUpgradeSuccess={async (plan) => {
          const allStores = getStoredStores();
          const updatedStore: Store = {
            ...store,
            tier: plan === 'badge' ? store.tier : plan,
            verified: plan === 'badge' || plan === 'pro' || plan === 'business' ? true : store.verified,
            hasVerifiedBadgeAddon: plan === 'badge' || plan === 'business' ? true : store.hasVerifiedBadgeAddon,
          };
          saveStores(allStores.map((s) => (s.id === store.id ? updatedStore : s)));
          onSelectStore(updatedStore);
          try {
            await dbSaveStore(updatedStore);
          } catch (e) {}
          onRefreshData();
        }}
      />

      {/* Social Share Modal */}
      <SocialShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        store={store}
      />

      {/* Status & Story Studio Modal */}
      <StatusStudioModal
        isOpen={isStatusStudioOpen}
        onClose={() => setIsStatusStudioOpen(false)}
        store={store}
        products={products}
        initialProduct={statusStudioProduct}
      />

      {/* AI Marketing Studio (Captions, Keywords & Hashtags) Modal */}
      <AIMarketingModal
        isOpen={isAiMarketingOpen}
        onClose={() => setIsAiMarketingOpen(false)}
        store={store}
        products={products}
        initialProduct={selectedAiProduct}
        onStoreUpdated={(updated) => onSelectStore(updated)}
      />

      {/* Commercial Dispatch Waybill Modal */}
      {selectedOrderForWaybill && (
        <WaybillModal
          isOpen={isWaybillOpen}
          onClose={() => {
            setIsWaybillOpen(false);
            setSelectedOrderForWaybill(null);
          }}
          order={selectedOrderForWaybill}
          store={store}
        />
      )}
    </div>
  );
};
