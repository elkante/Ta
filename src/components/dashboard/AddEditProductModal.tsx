import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, AlertCircle, Check, Image as ImageIcon, Link, Lock, Plus, Star, Tag, Trash2, Upload, X } from 'lucide-react';
import { Product, ProductVariant, Store } from '../../types';
import { addStoreCategory, getStoreCategories } from '../../utils/storage';

interface AddEditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  productToEdit?: Product | null;
  onSave: (product: Partial<Product>) => void;
}

const PRESET_IMAGES = [
  { name: 'Perfume Noir', category: 'Perfumes', url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=800&auto=format&fit=crop&q=80' },
  { name: 'Perfume Amber', category: 'Perfumes', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&auto=format&fit=crop&q=80' },
  { name: 'Gold Extrait', category: 'Perfumes', url: 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&auto=format&fit=crop&q=80' },
  { name: 'Silk Abaya', category: 'Fashion', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&auto=format&fit=crop&q=80' },
  { name: 'Luxury Dress', category: 'Fashion', url: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80' },
  { name: 'iPhone Device', category: 'Gadgets', url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80' },
  { name: 'AirPods Audio', category: 'Gadgets', url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80' },
  { name: 'Beauty Care', category: 'Beauty', url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80' },
  { name: 'Luxury Watch', category: 'Accessories', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80' },
];

export const DEFAULT_FALLBACK_IMAGE = PRESET_IMAGES[0].url;

export const AddEditProductModal: React.FC<AddEditProductModalProps> = ({
  isOpen,
  onClose,
  store,
  productToEdit,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [uid, setUid] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [originalPrice, setOriginalPrice] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [imageTab, setImageTab] = useState<'upload' | 'url' | 'preset'>('upload');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inStock, setInStock] = useState(true);
  const [badge, setBadge] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [aiDescSuccess, setAiDescSuccess] = useState(false);
  const [aiLimitNotice, setAiLimitNotice] = useState<string | null>(null);

  // Daily 5 AI description generations per store
  const getAiDescUsageToday = (): number => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(`ta_ai_desc_${store.id}_${today}`);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  };

  const incrementAiDescUsage = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const current = getAiDescUsageToday();
      localStorage.setItem(`ta_ai_desc_${store.id}_${today}`, String(current + 1));
    } catch {}
  };

  const handleGenerateDescriptionAI = async () => {
    if (!name.trim()) {
      setError('Please enter a product title first before generating AI description.');
      return;
    }
    const usedToday = getAiDescUsageToday();
    if (usedToday >= 5) {
      setAiLimitNotice('Daily limit reached (5 descriptions per store per day). Resets at midnight.');
      return;
    }

    setIsGeneratingDesc(true);
    setError(null);
    setAiLimitNotice(null);

    try {
      let key = '';
      try {
        key = localStorage.getItem('ta_gemini_api_key') || '';
      } catch {}

      let generated = '';
      if (key && key.startsWith('AIzaSy')) {
        const prompt = `Write an attractive, professional 2-3 sentence product description for an African online store.
Product Name: ${name.trim()}
Category: ${category || 'General'}
Price: ${price ? store.currencySymbol + ' ' + price : 'Best market price'}

Include key selling highlights (quality, finish, durability or feel). Keep it concise, engaging, and clear. Do not include markdown headers or bullet points.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          generated = text.trim();
        }
      }

      // Algorithmic smart marketing generator fallback
      if (!generated) {
        const catClean = (category || 'item').toLowerCase();
        if (catClean.includes('perfume') || catClean.includes('fragrance') || catClean.includes('scent')) {
          generated = `Immerse yourself in the unforgettable luxury of ${name.trim()}. Masterfully formulated with long-lasting aromatic notes designed to leave an elegant impression from day to night. 100% authentic quality guaranteed.`;
        } else if (catClean.includes('fashion') || catClean.includes('cloth') || catClean.includes('wear') || catClean.includes('dress')) {
          generated = `Elevate your wardrobe with ${name.trim()}. Carefully tailored from premium, breathable fabric for superior comfort and an effortlessly stylish silhouette suitable for both casual outings and special occasions.`;
        } else if (catClean.includes('jewel') || catClean.includes('gold') || catClean.includes('silver') || catClean.includes('ring')) {
          generated = `Shine bright with the timeless elegance of ${name.trim()}. Beautifully crafted with high-grade, tarnish-resistant finish for everyday glam and celebrations. Comes safely packaged and ready to gift.`;
        } else if (catClean.includes('gadget') || catClean.includes('tech') || catClean.includes('phone') || catClean.includes('electronic')) {
          generated = `Experience peak reliability with ${name.trim()}. Built with high-performance components, durable battery efficiency, and sleek modern design to streamline your daily routine.`;
        } else if (catClean.includes('beauty') || catClean.includes('skin') || catClean.includes('hair')) {
          generated = `Nourish and glow with ${name.trim()}. Formulated with gentle, skin-loving ingredients to revitalize and enhance your natural radiance. Suitable for everyday care.`;
        } else {
          generated = `Discover premium quality and exceptional value with ${name.trim()}. Thoughtfully designed to meet high standards of performance and style. Available for fast nationwide dispatch.`;
        }
      }

      setDescription(generated);
      incrementAiDescUsage();
      setAiDescSuccess(true);
      setTimeout(() => setAiDescSuccess(false), 2500);
    } catch (e) {
      setError('Could not generate description right now. Please try again.');
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    // Load available categories for this store
    const cats = getStoreCategories(store.id);
    setAvailableCategories(cats);

    if (productToEdit) {
      setName(productToEdit.name);
      setUid(productToEdit.uid || '');
      setDescription(productToEdit.description);
      setPrice(productToEdit.price);
      setOriginalPrice(productToEdit.originalPrice);
      setCategory(productToEdit.category || cats[0] || 'General');

      const existingImgs = Array.isArray(productToEdit.images) && productToEdit.images.length > 0
        ? productToEdit.images.filter((img) => img && img.trim())
        : [];
      setImagesList(existingImgs);
      const firstImg = existingImgs[0] || '';
      setImageUrl(firstImg);

      // If product has a device-uploaded image (base64), show upload tab; URL shows URL tab; preset shows preset tab
      if (firstImg.startsWith('data:')) {
        setImageTab('upload');
      } else if (PRESET_IMAGES.some((p) => p.url === firstImg)) {
        setImageTab('preset');
      } else if (firstImg) {
        setImageTab('url');
      } else {
        setImageTab('upload');
      }
      setInStock(productToEdit.inStock);
      setBadge(productToEdit.badge || '');
      setVariants(productToEdit.variants || []);
    } else {
      setName('');
      // Generate immutable Item SKU for new product
      const prefix = store.slug.split('-')[0]?.toUpperCase().slice(0, 3) || 'ITM';
      const autoSku = `TA-${prefix}-${Math.floor(100 + Math.random() * 899)}`;
      setUid(autoSku);
      setDescription('');
      setPrice(0);
      setOriginalPrice(undefined);
      setCategory(cats[0] || 'General');
      setImageUrl('');
      setImagesList([]);
      setImageTab('upload');
      setInStock(true);
      setBadge('');
      setVariants([]);
    }
    setIsCreatingCategory(false);
    setNewCategoryName('');
    setError(null);
  }, [productToEdit, isOpen, store.slug, store.id]);

  if (!isOpen) return null;

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imagesList.length >= 5) {
      setError('Maximum 5 pictures allowed per product.');
      return;
    }

    const maxToAdd = 5 - imagesList.length;
    const selectedFiles = Array.from(files).slice(0, maxToAdd);

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG, WebP, etc.)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Each image must be under 5MB. Please compress or resize it first.');
        return;
      }
    }

    setIsUploadingImage(true);
    setError(null);

    let loadedCount = 0;
    const newImgs: string[] = [];

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          newImgs.push(reader.result);
        }
        loadedCount++;
        if (loadedCount === selectedFiles.length) {
          setImagesList((prev) => {
            const nextList = [...prev, ...newImgs].slice(0, 5);
            setImageUrl(nextList[0] || '');
            return nextList;
          });
          setIsUploadingImage(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.onerror = () => {
        loadedCount++;
        if (loadedCount === selectedFiles.length) setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddUrlImage = () => {
    const clean = imageUrl.trim();
    if (!clean) return;
    if (imagesList.length >= 5) {
      setError('Maximum 5 pictures allowed per product.');
      return;
    }
    if (imagesList.includes(clean)) return;
    setImagesList((prev) => {
      const next = [...prev, clean].slice(0, 5);
      return next;
    });
    setImageUrl('');
  };

  const handleSelectPreset = (url: string) => {
    if (imagesList.includes(url)) return;
    if (imagesList.length >= 5) {
      setError('Maximum 5 pictures allowed per product.');
      return;
    }
    setImagesList((prev) => {
      const next = [...prev, url].slice(0, 5);
      setImageUrl(next[0] || '');
      return next;
    });
  };

  const handleRemoveImage = (index: number) => {
    setImagesList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setImageUrl(next[0] || '');
      return next;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImagesList((prev) => {
      const target = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      const reordered = [target, ...rest];
      setImageUrl(reordered[0]);
      return reordered;
    });
  };

  const handleCreateCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean) return;

    const updated = addStoreCategory(store.id, clean);
    setAvailableCategories(updated);
    setCategory(clean);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleAddVariant = () => {
    const newVariant: ProductVariant = {
      id: `v_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      name: 'Option (e.g. 100ml or Size L)',
      price: price || 0,
      inStock: true,
    };
    setVariants([...variants, newVariant]);
  };

  const handleUpdateVariant = (index: number, field: keyof ProductVariant, val: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: val };
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Please enter a product name');
      return;
    }

    if (!price || price <= 0) {
      setError('Please set a valid price');
      return;
    }

    const finalCategory = category.trim() || 'General';
    // Ensure category is registered in store categories
    addStoreCategory(store.id, finalCategory);

    const finalImages =
      imagesList.length > 0
        ? imagesList
        : imageUrl.trim()
        ? [imageUrl.trim()]
        : [PRESET_IMAGES[0].url];

    const payload: Partial<Product> = {
      name: name.trim(),
      uid: uid, // Non-editable, kept intact
      description: description.trim(),
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : undefined,
      category: finalCategory,
      images: finalImages,
      inStock,
      badge: badge.trim() || undefined,
      variants,
    };

    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-100 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] sm:max-h-[90vh] flex flex-col z-10 pb-safe sm:pb-0">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div>
            <h3 className="font-bold text-slate-900 text-base leading-tight">
              {productToEdit ? 'Edit Product' : 'Add New Product'}
            </h3>
            <p className="text-xs text-slate-500">
              Update catalog details, categories, and inventory options
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Title and Item SKU (Locked/Non-editable) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Product Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Baccarat Rouge 540 Extrait"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1 flex items-center justify-between">
                <span>Item SKU</span>
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5 text-slate-400" /> Locked
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  disabled
                  value={uid}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-100/90 text-xs font-mono font-bold text-slate-500 uppercase cursor-not-allowed select-all"
                  title="Item SKU is permanent and cannot be edited to preserve barcodes, waybills and QR codes"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Permanent barcode & UID</p>
            </div>
          </div>

          {/* Reusable Category System */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>Product Category *</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isCreatingCategory ? 'Cancel' : 'New Category'}</span>
              </button>
            </div>

            {/* Quick Inline Category Creator */}
            {isCreatingCategory && (
              <div className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-xs flex items-center gap-2 animate-in fade-in duration-150">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Dresses, Shoes, Extrait, Decants..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleCreateCategory()}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Save</span>
                </button>
              </div>
            )}

            {/* Category Select Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Optional badge (e.g. Bestseller, New)"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Quick Category Chips for One-Tap Reuse */}
            {availableCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-medium">Quick switch:</span>
                {availableCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      category === cat
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price & Discount Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Price ({store.currencySymbol}) *
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={price || ''}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Original Price (For discount badge)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 50000"
                value={originalPrice || ''}
                onChange={(e) => setOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <button
                type="button"
                onClick={handleGenerateDescriptionAI}
                disabled={isGeneratingDesc}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                title="Generate with AI (5 free daily per store)"
              >
                <Sparkles className={`w-3 h-3 text-amber-600 ${isGeneratingDesc ? 'animate-spin' : ''}`} />
                <span>{isGeneratingDesc ? 'Writing Description...' : 'Generate with AI'}</span>
                <span className="text-[10px] font-semibold text-amber-900 bg-amber-200/70 px-1 py-0.2 rounded">
                  ${Math.max(0, 5 - getAiDescUsageToday())}/5 left
                </span>
              </button>
            </div>
            <textarea
              rows={3}
              placeholder="Provide fragrance notes, fabric type, condition, or size guide..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed"
            />
            {aiDescSuccess && (
              <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1 animate-in fade-in">
                ✨ AI description created! You can edit or tweak any word above.
              </p>
            )}
            {aiLimitNotice && (
              <p className="text-[11px] font-semibold text-amber-700 mt-1">
                ⚠️ {aiLimitNotice}
              </p>
            )}
          </div>

          {/* Image Section — Upload / URL / Preset tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Product Image</label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-[11px] text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>

            {/* Image Preview */}
            <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mb-3">
              <img
                src={imagesList[0] || imageUrl || DEFAULT_FALLBACK_IMAGE}
                alt="Product preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_FALLBACK_IMAGE;
                }}
              />
              {isUploadingImage && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {(imagesList.length > 0 || imageUrl) && (
                <div className="absolute bottom-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <Check className="w-3 h-3" /> {imagesList.length > 1 ? `${imagesList.length} photos added` : 'Cover image set'}
                </div>
              )}
            </div>

            {/* Multi-Photo Thumbnails Tray */}
            {imagesList.length > 0 && (
              <div className="mb-3 space-y-1.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800">
                    Product Photos ({imagesList.length}/5)
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Photo #1 is your primary cover & WhatsApp bot drop
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5">
                  {imagesList.map((img, idx) => (
                    <div
                      key={idx}
                      className={`relative group shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition ${
                        idx === 0 ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 ? (
                        <span className="absolute bottom-0 inset-x-0 bg-amber-500 text-slate-950 text-[8px] font-black text-center uppercase py-0.5 tracking-tight">
                          Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          className="absolute inset-x-0 bottom-0 bg-slate-900/80 hover:bg-slate-900 text-white text-[8px] font-bold py-0.5 text-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                        >
                          Make Cover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer shadow-xs"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}

                  {imagesList.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (imageTab === 'upload') fileInputRef.current?.click();
                      }}
                      className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-900 bg-white hover:bg-slate-50 flex flex-col items-center justify-center gap-0.5 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-[9px] font-bold">+ Photo</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${imageTab === 'upload' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                <Upload className="w-3.5 h-3.5" /> Device ({imagesList.length}/5)
              </button>
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${imageTab === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                <Link className="w-3.5 h-3.5" /> Direct URL
              </button>
              <button
                type="button"
                onClick={() => setImageTab('preset')}
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${imageTab === 'preset' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Presets
              </button>
            </div>

            {/* Upload Tab */}
            {imageTab === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || imagesList.length >= 5}
                  className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-slate-900 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {isUploadingImage
                    ? 'Loading photos...'
                    : imagesList.length >= 5
                    ? 'Maximum 5 photos reached'
                    : imagesList.length > 0
                    ? `Add more photos (${imagesList.length}/5)`
                    : 'Tap to select photos from device (up to 5)'}
                </button>
                <p className="text-[11px] text-slate-400 mt-1.5 text-center">
                  Select up to 5 photos · Supports JPG, PNG, WebP · Max 5MB each
                </p>
              </div>
            )}

            {/* URL Tab */}
            {imageTab === 'url' && (
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="Paste direct image link (https://...)"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={handleAddUrlImage}
                  disabled={!imageUrl.trim() || imagesList.length >= 5}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  Add
                </button>
              </div>
            )}

            {/* Preset Tab */}
            {imageTab === 'preset' && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {PRESET_IMAGES.map((img) => {
                  const isSelected = imagesList.includes(img.url) || imageUrl === img.url;
                  return (
                    <button
                      type="button"
                      key={img.name}
                      onClick={() => handleSelectPreset(img.url)}
                      className={`group relative rounded-xl overflow-hidden border text-left transition cursor-pointer p-1 flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <div className="w-full h-12 rounded-lg overflow-hidden bg-slate-200">
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 truncate w-full text-center">
                        {img.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-2">
              If no image is set, a quality preset displays automatically on your storefront.
            </p>
          </div>

          {/* Stock Toggle */}
          <div className="pt-2 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs font-semibold text-slate-800 block">Inventory Stock Status</span>
              <span className="text-[11px] text-slate-500">
                {inStock ? 'Available for catalog orders' : 'Marked as Sold Out on storefront'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Variants & Options Section */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={variants.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleAddVariant();
                    } else {
                      setVariants([]);
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-800 block">
                    This item has variants (Sizes / Colors / Scents)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Keep options under this single item instead of creating separate products
                  </span>
                </div>
              </label>

              {variants.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              )}
            </div>

            {variants.length > 0 && (
              <div className="space-y-2 mt-2">
                {variants.map((v, idx) => (
                  <div
                    key={v.id || idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs"
                  >
                    <input
                      type="text"
                      placeholder="Variant name (e.g. 100ml Extrait)"
                      value={v.name}
                      onChange={(e) => handleUpdateVariant(idx, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                    <div className="w-28 flex items-center gap-1">
                      <span className="font-mono text-slate-400">{store.currencySymbol}</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={v.price}
                        onChange={(e) => handleUpdateVariant(idx, 'price', Number(e.target.value))}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white font-mono"
                      />
                    </div>
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.inStock}
                        onChange={(e) => handleUpdateVariant(idx, 'inStock', e.target.checked)}
                      />
                      <span>In Stock</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-md transition cursor-pointer"
            >
              {productToEdit ? 'Save Changes' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
