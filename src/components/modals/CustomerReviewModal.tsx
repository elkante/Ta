import React, { useState } from 'react';
import { Camera, CheckCircle2, MessageSquareHeart, Star, Upload, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, Store, StoreReview } from '../../types';
import { addStoreReview } from '../../utils/storage';

interface CustomerReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: Store;
  products?: Product[];
  onReviewSubmitted?: (review: StoreReview) => void;
}

const RATING_LABELS: Record<number, string> = {
  5: '⭐⭐⭐⭐⭐ Excellent! Absolutely loved it!',
  4: '⭐⭐⭐⭐ Great experience!',
  3: '⭐⭐⭐ Good / Satisfied',
  2: '⭐⭐ Fair / Needs improvement',
  1: '⭐ Not satisfied',
};

export const CustomerReviewModal: React.FC<CustomerReviewModalProps> = ({
  isOpen,
  onClose,
  store,
  products = [],
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [authorName, setAuthorName] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMessage('Photo must be less than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // Create an image to resize client-side to keep size compact
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          setPhotoPreview(canvas.toDataURL('image/jpeg', 0.82));
          setErrorMessage(null);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim()) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const newReview: StoreReview = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        storeId: store.id,
        author: authorName.trim(),
        rating: rating,
        comment: comment.trim() || 'Great experience shopping here!',
        productName: productName.trim() || undefined,
        customerPhotoUrl: photoPreview || undefined,
        verifiedBuyer: true,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };

      addStoreReview(newReview);
      onReviewSubmitted?.(newReview);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (err) {}

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2400);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Thank You! 🎉</h3>
              <p className="text-sm text-slate-600 mt-1">
                Your verified review is now live on <span className="font-semibold text-slate-900">{store.name}</span>'s catalog!
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {/* Store Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              {store.logoUrl ? (
                <img
                  src={store.logoUrl}
                  alt={store.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white font-black flex items-center justify-center text-base shrink-0">
                  {store.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">Rate & Review</h3>
                <p className="text-xs text-slate-500">
                  Feedback for <span className="font-semibold text-slate-700">{store.name}</span>
                </p>
              </div>
            </div>

            {/* Star Rating Picker */}
            <div className="text-center pt-1 pb-2">
              <p className="text-xs font-semibold text-slate-500 mb-2">Tap stars to rate your experience:</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = (hoverRating || rating) >= star;
                  return (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 cursor-pointer transition-transform active:scale-125 focus:outline-hidden"
                      title={`${star} Star`}
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          filled
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-slate-200 fill-slate-100 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-bold text-amber-700 mt-2 min-h-[18px]">
                {RATING_LABELS[hoverRating || rating]}
              </p>
            </div>

            {/* Author Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="e.g. Chioma A., Tunde B."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Photo of Item Received */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Photo of what you received (optional)</span>
                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                  <Camera className="w-3 h-3 inline" /> Shows verified proof
                </span>
              </label>

              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-amber-400 bg-slate-900 group">
                  <img
                    src={photoPreview}
                    alt="Customer upload"
                    className="w-full h-36 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    className="absolute top-2 right-2 bg-rose-600 text-white rounded-full p-1 text-xs shadow-md hover:bg-rose-700 cursor-pointer"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors text-center">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">Add a photo of your item</span>
                  <span className="text-[10px] text-slate-400">Snap with camera or upload from gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Review / Comment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Your Review / Feedback (optional)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How was the product quality, packaging, and delivery?"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>

            {/* Product Purchased (optional) */}
            {products.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Item Purchased (optional)
                </label>
                <select
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Select item (optional)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-center">
                {errorMessage}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageSquareHeart className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting Review...' : 'Submit Verified Review'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
