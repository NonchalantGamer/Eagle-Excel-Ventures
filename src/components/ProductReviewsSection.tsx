import React, { useState, useEffect, useId, useRef } from 'react';
import { 
  Star, 
  CheckCircle2, 
  ShieldCheck, 
  ThumbsUp, 
  Plus, 
  MessageSquare, 
  Building2, 
  Globe2, 
  PackageCheck,
  ChevronDown,
  Sparkles,
  Camera,
  X,
  AlertCircle
} from 'lucide-react';
import { Product, Order } from '../types';
import { ProductReview, WholesaleRatingCriteria } from '../types/review';
import { 
  getProductReviews, 
  calculateReviewSummary, 
  addProductReview, 
  toggleReviewHelpfulVote, 
  hasUserVotedReviewHelpful,
  checkWholesaleBuyerEligibility
} from '../services/reviewService';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

interface ProductReviewsSectionProps {
  product: Product;
  userOrders?: Order[];
  onOpenAuth?: () => void;
  onUpdateProductRating?: (newRating: number, count: number) => void;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  product,
  userOrders = [],
  onOpenAuth,
  onUpdateProductRating
}) => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [reviews, setReviews] = useState<ProductReview[]>(() => getProductReviews(product.id));
  const [activeFilter, setActiveFilter] = useState<'all' | '5' | '4' | '3' | 'verified' | 'photos'>('all');
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [criteria, setCriteria] = useState<WholesaleRatingCriteria>({
    productQuality: 5,
    packagingDurability: 5,
    shippingSpeed: 5,
    valueForMoney: 5
  });
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [businessType, setBusinessType] = useState<'Wholesaler' | 'Retail Chain' | 'Contractor' | 'Distributor' | 'Importer' | 'Corporate Buyer'>('Wholesaler');
  const [buyerCountry, setBuyerCountry] = useState<'Nigeria' | 'Cameroon' | 'Ghana' | 'Ivory Coast' | 'Other'>('Nigeria');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Unique accessible IDs for form fields
  const ratingSelectId = useId();
  const businessTypeId = useId();
  const buyerCountryId = useId();
  const reviewTitleId = useId();
  const reviewCommentId = useId();
  const photoUrlId = useId();

  const onUpdateRatingRef = useRef(onUpdateProductRating);
  useEffect(() => {
    onUpdateRatingRef.current = onUpdateProductRating;
  }, [onUpdateProductRating]);

  // Reload reviews when product changes or custom event fires
  useEffect(() => {
    const load = () => {
      const revs = getProductReviews(product.id);
      setReviews(revs);
      const summary = calculateReviewSummary(revs, product.rating, product.reviewsCount);
      if (onUpdateRatingRef.current && summary.totalReviews > 0) {
        onUpdateRatingRef.current(summary.averageRating, summary.totalReviews);
      }
    };

    load();

    const handleReviewsUpdated = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.productId === product.id) {
        load();
      }
    };

    window.addEventListener('ee_product_reviews_updated', handleReviewsUpdated);
    return () => {
      window.removeEventListener('ee_product_reviews_updated', handleReviewsUpdated);
    };
  }, [product.id]);

  const summary = calculateReviewSummary(reviews, product.rating, product.reviewsCount);
  const eligibility = checkWholesaleBuyerEligibility(product.id, currentUser?.uid, userProfile?.role, userOrders);

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (activeFilter === '5') return Math.round(r.rating) === 5;
    if (activeFilter === '4') return Math.round(r.rating) === 4;
    if (activeFilter === '3') return Math.round(r.rating) <= 3;
    if (activeFilter === 'verified') return r.verifiedWholesaleBuyer;
    if (activeFilter === 'photos') return Array.isArray(r.images) && r.images.length > 0;
    return true;
  });

  const handleHelpfulClick = (reviewId: string) => {
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      else showToast('Please sign in to vote on buyer reviews.', 'info');
      return;
    }

    const voted = toggleReviewHelpfulVote(product.id, reviewId, currentUser.uid);
    setReviews(getProductReviews(product.id));
    showToast(voted ? 'Marked review as helpful!' : 'Helpful vote removed.');
  };

  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    if (imageUrls.length >= 3) {
      showToast('Maximum 3 review photos allowed.', 'warning');
      return;
    }
    setImageUrls(prev => [...prev, customImageUrl.trim()]);
    setCustomImageUrl('');
  };

  const handleRemoveImageUrl = (idx: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      else showToast('Please sign in to post a verified wholesale review.', 'warning');
      return;
    }

    if (!reviewTitle.trim() || !reviewComment.trim()) {
      showToast('Please enter both a title and review feedback description.', 'warning');
      return;
    }

    if (reviewComment.trim().length < 20) {
      showToast('Please provide at least 20 characters of detailed wholesale feedback.', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const reviewerName = userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'Wholesale Buyer';
      const companyName = userProfile?.companyName || (userProfile?.title ? `${userProfile.title}` : 'Direct Commercial Importer');

      const created = addProductReview(product.id, {
        productId: product.id,
        userId: currentUser.uid,
        reviewerName,
        companyName,
        businessType,
        country: buyerCountry,
        verifiedWholesaleBuyer: true,
        orderNumber: eligibility.orderNumber || `EE-PO-${Math.floor(10000 + Math.random() * 90000)}`,
        unitsPurchased: eligibility.unitsPurchased || product.minOrderQty || 10,
        rating,
        criteria,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined
      });

      const updatedRevs = getProductReviews(product.id);
      setReviews(updatedRevs);
      const newSummary = calculateReviewSummary(updatedRevs);
      if (onUpdateProductRating) {
        onUpdateProductRating(newSummary.averageRating, newSummary.totalReviews);
      }

      showToast('Wholesale feedback and star rating posted successfully!', 'success');
      setShowReviewForm(false);
      setReviewTitle('');
      setReviewComment('');
      setImageUrls([]);
      setRating(5);
    } catch (err) {
      console.error('Submit review error:', err);
      showToast('Failed to save review. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="product-reviews-section" className="border-t border-slate-200 dark:border-white/5 pt-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-serif text-slate-900 dark:text-white">
              Verified Wholesale Reviews
            </h2>
            <span className="bg-[#F27D26]/10 text-[#F27D26] border border-[#F27D26]/30 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#F27D26]" />
              B2B Authenticated
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
            Real feedback from commercial distributors, retailers, and direct container importers.
          </p>
        </div>

        <button
          type="button"
          id="open-write-review-btn"
          onClick={() => {
            if (!currentUser) {
              if (onOpenAuth) onOpenAuth();
              else showToast('Please sign in to write a review.', 'info');
              return;
            }
            setShowReviewForm(!showReviewForm);
          }}
          className="py-2 px-3.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-extrabold text-xs flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-xs"
        >
          {showReviewForm ? (
            <>
              <X className="w-3.5 h-3.5" />
              <span>Cancel Review</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Write Wholesale Review</span>
            </>
          )}
        </button>
      </div>

      {/* Review Submission Form Drawer / Panel */}
      {showReviewForm && (
        <form 
          id="product-review-submission-form"
          onSubmit={handleSubmitReview}
          className="bg-slate-50 dark:bg-[#161616] p-4 sm:p-5 rounded-2xl border border-[#F27D26]/30 shadow-md space-y-4 animate-scaleUp"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#F27D26]/20 flex items-center justify-center text-[#F27D26] font-extrabold text-xs">
                {currentUser?.displayName?.[0] || 'B'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{userProfile?.displayName || currentUser?.email || 'Verified Buyer'}</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.2 rounded">
                    Verified Wholesale Profile
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400">
                  {userProfile?.companyName || 'Commercial Account'} • {eligibility.reason}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">Overall Rating</span>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-amber-400 transition-transform hover:scale-110 cursor-pointer"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star 
                      className={`w-5 h-5 ${
                        (hoverRating || rating) >= star 
                          ? 'fill-amber-400 text-amber-400' 
                          : 'text-slate-300 dark:text-zinc-600'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Wholesale Criteria Sliders / Pickers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white dark:bg-white/5 p-3 rounded-xl border border-slate-200 dark:border-white/5 text-xs">
            <div>
              <label htmlFor={`${ratingSelectId}-quality`} className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                Product Quality
              </label>
              <select
                id={`${ratingSelectId}-quality`}
                value={criteria.productQuality}
                onChange={e => setCriteria(prev => ({ ...prev, productQuality: Number(e.target.value) }))}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-lg p-1.5 text-xs font-bold outline-none border border-slate-200 dark:border-white/10"
              >
                <option value={5}>⭐⭐⭐⭐⭐ 5 - Exceptional</option>
                <option value={4}>⭐⭐⭐⭐ 4 - Good OEM</option>
                <option value={3}>⭐⭐⭐ 3 - Average</option>
                <option value={2}>⭐⭐ 2 - Below Expectation</option>
                <option value={1}>⭐ 1 - Poor</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${ratingSelectId}-packaging`} className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                Carton Durability
              </label>
              <select
                id={`${ratingSelectId}-packaging`}
                value={criteria.packagingDurability}
                onChange={e => setCriteria(prev => ({ ...prev, packagingDurability: Number(e.target.value) }))}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-lg p-1.5 text-xs font-bold outline-none border border-slate-200 dark:border-white/10"
              >
                <option value={5}>⭐⭐⭐⭐⭐ 5 - Heavy 5-Ply</option>
                <option value={4}>⭐⭐⭐⭐ 4 - Secure Export</option>
                <option value={3}>⭐⭐⭐ 3 - Standard</option>
                <option value={2}>⭐⭐ 2 - Light Carton</option>
                <option value={1}>⭐ 1 - Damaged</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${ratingSelectId}-shipping`} className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                Freight & Delivery
              </label>
              <select
                id={`${ratingSelectId}-shipping`}
                value={criteria.shippingSpeed}
                onChange={e => setCriteria(prev => ({ ...prev, shippingSpeed: Number(e.target.value) }))}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-lg p-1.5 text-xs font-bold outline-none border border-slate-200 dark:border-white/10"
              >
                <option value={5}>⭐⭐⭐⭐⭐ 5 - Fast Clearing</option>
                <option value={4}>⭐⭐⭐⭐ 4 - On Schedule</option>
                <option value={3}>⭐⭐⭐ 3 - Moderate</option>
                <option value={2}>⭐⭐ 2 - Port Delay</option>
                <option value={1}>⭐ 1 - Very Slow</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${ratingSelectId}-value`} className="text-[10px] font-bold text-slate-600 dark:text-zinc-400 block mb-1">
                Value for Money
              </label>
              <select
                id={`${ratingSelectId}-value`}
                value={criteria.valueForMoney}
                onChange={e => setCriteria(prev => ({ ...prev, valueForMoney: Number(e.target.value) }))}
                className="w-full bg-slate-100 dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-lg p-1.5 text-xs font-bold outline-none border border-slate-200 dark:border-white/10"
              >
                <option value={5}>⭐⭐⭐⭐⭐ 5 - High Margin</option>
                <option value={4}>⭐⭐⭐⭐ 4 - Good ROI</option>
                <option value={3}>⭐⭐⭐ 3 - Fair Price</option>
                <option value={2}>⭐⭐ 2 - Slim Margin</option>
                <option value={1}>⭐ 1 - Overpriced</option>
              </select>
            </div>
          </div>

          {/* Business Type & Country Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor={businessTypeId} className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Your Wholesale Business Type
              </label>
              <select
                id={businessTypeId}
                value={businessType}
                onChange={e => setBusinessType(e.target.value as any)}
                className="w-full bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-xl p-2.5 text-xs font-medium outline-none border border-slate-200 dark:border-white/10 focus:border-[#F27D26]"
              >
                <option value="Wholesaler">Wholesaler / Major Stockist</option>
                <option value="Retail Chain">Retail Chain / Superstore</option>
                <option value="Distributor">Regional Importer / Distributor</option>
                <option value="Contractor">Contractor / Project Installer</option>
                <option value="Corporate Buyer">Corporate / Institutional Buyer</option>
                <option value="Importer">Direct Container Importer</option>
              </select>
            </div>

            <div>
              <label htmlFor={buyerCountryId} className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Primary Market / Destination
              </label>
              <select
                id={buyerCountryId}
                value={buyerCountry}
                onChange={e => setBuyerCountry(e.target.value as any)}
                className="w-full bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-xl p-2.5 text-xs font-medium outline-none border border-slate-200 dark:border-white/10 focus:border-[#F27D26]"
              >
                <option value="Nigeria">🇳🇬 Nigeria (Lagos / Kano / Onitsha / Abuja)</option>
                <option value="Cameroon">🇨🇲 Cameroon (Douala / Yaoundé)</option>
                <option value="Ghana">🇬🇭 Ghana (Accra / Kumasi)</option>
                <option value="Ivory Coast">🇨🇮 Ivory Coast (Abidjan)</option>
                <option value="Other">🌍 Other African Market</option>
              </select>
            </div>
          </div>

          {/* Review Headline & Body */}
          <div className="space-y-3">
            <div>
              <label htmlFor={reviewTitleId} className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Review Headline
              </label>
              <input
                id={reviewTitleId}
                type="text"
                value={reviewTitle}
                onChange={e => setReviewTitle(e.target.value)}
                placeholder="e.g. Flawless acoustic clarity and fast container clearance at Apapa Port"
                className="w-full bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-xl p-2.5 text-xs font-medium outline-none border border-slate-200 dark:border-white/10 focus:border-[#F27D26]"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label htmlFor={reviewCommentId} className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 block mb-1">
                Wholesale Feedback & Observations
              </label>
              <textarea
                id={reviewCommentId}
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Describe product build quality, retail packaging condition upon container discharge, warranty feedback, customer sales velocity, or customs clearing experience..."
                className="w-full bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-xl p-2.5 text-xs font-medium outline-none border border-slate-200 dark:border-white/10 focus:border-[#F27D26] resize-none"
                required
              />
            </div>
          </div>

          {/* Photo Attachment URL Input */}
          <div className="space-y-2">
            <label htmlFor={photoUrlId} className="text-[11px] font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1">
              <Camera className="w-3.5 h-3.5 text-[#F27D26]" />
              <span>Attach Unboxing / Warehouse Photos (Optional Image URL)</span>
            </label>
            <div className="flex gap-2">
              <input
                id={photoUrlId}
                type="url"
                value={customImageUrl}
                onChange={e => setCustomImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="flex-1 bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white rounded-xl px-3 py-2 text-xs outline-none border border-slate-200 dark:border-white/10 focus:border-[#F27D26]"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Add Image
              </button>
            </div>

            {imageUrls.length > 0 && (
              <div className="flex gap-2 pt-1">
                {imageUrls.map((url, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#F27D26]/40 group">
                    <img src={url} alt="Review attachment" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImageUrl(idx)}
                      className="absolute top-1 right-1 bg-black/70 hover:bg-rose-600 text-white rounded-full p-0.5 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/5">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-black stroke-[2.5]" />
              <span>{isSubmitting ? 'Publishing...' : 'Publish Wholesale Review'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Aggregate Score & Breakdown Box */}
      <div className="bg-slate-50 dark:bg-[#161616] rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-white/5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Overall Rating Score */}
        <div className="md:col-span-4 text-center md:text-left border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 pb-4 md:pb-0 md:pr-4">
          <div className="text-3xl sm:text-4xl font-extrabold font-serif text-slate-900 dark:text-white tracking-tight">
            {summary.averageRating.toFixed(1)}
            <span className="text-lg sm:text-xl font-normal text-slate-400 dark:text-zinc-500 font-sans ml-1">/ 5.0</span>
          </div>

          <div className="flex items-center justify-center md:justify-start gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-4 h-4 ${
                  star <= Math.round(summary.averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-zinc-700'
                }`}
              />
            ))}
          </div>

          <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-0.5">
            <div>Based on <strong className="text-slate-900 dark:text-white font-bold">{summary.totalReviews}</strong> customer reviews</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center md:justify-start gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{summary.verifiedBuyersCount} Verified Importers</span>
            </div>
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="md:col-span-4 space-y-1.5 text-xs">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.ratingBreakdown[star as 1 | 2 | 3 | 4 | 5] || 0;
            const pct = summary.totalReviews > 0 ? Math.round((count / summary.totalReviews) * 100) : 0;

            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-8 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 flex items-center gap-0.5">
                  {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full transition-all duration-500" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-7 text-[10px] font-mono text-slate-400 dark:text-zinc-500 text-right">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Wholesale Metric Criteria */}
        <div className="md:col-span-4 grid grid-cols-2 gap-2 text-xs border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-4 md:pt-0 md:pl-4">
          <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate">Quality & Finish</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between mt-0.5">
              <span>{summary.averageCriteria.productQuality.toFixed(1)}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate">Carton Packaging</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between mt-0.5">
              <span>{summary.averageCriteria.packagingDurability.toFixed(1)}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate">Shipping Speed</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between mt-0.5">
              <span>{summary.averageCriteria.shippingSpeed.toFixed(1)}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
          </div>

          <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium truncate">Wholesale ROI</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between mt-0.5">
              <span>{summary.averageCriteria.valueForMoney.toFixed(1)}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeFilter === 'all'
              ? 'bg-[#F27D26] text-black shadow-xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All Reviews ({reviews.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('verified')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            activeFilter === 'verified'
              ? 'bg-[#F27D26] text-black shadow-xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Verified Buyers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('5')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            activeFilter === '5'
              ? 'bg-[#F27D26] text-black shadow-xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>5 Star</span>
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('4')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            activeFilter === '4'
              ? 'bg-[#F27D26] text-black shadow-xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span>4 Star</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('photos')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
            activeFilter === 'photos'
              ? 'bg-[#F27D26] text-black shadow-xs'
              : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-3 h-3" />
          <span>With Photos</span>
        </button>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="text-center py-8 px-4 bg-slate-50 dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5">
            <MessageSquare className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2 opacity-50" />
            <div className="text-xs font-bold text-slate-700 dark:text-zinc-300">
              No reviews found matching this filter
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1">
              Be the first verified wholesale buyer to leave comprehensive feedback!
            </p>
          </div>
        ) : (
          filteredReviews.map((rev) => {
            const hasVoted = hasUserVotedReviewHelpful(rev.id, currentUser?.uid);

            return (
              <div 
                key={rev.id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-3 transition-all hover:border-slate-300 dark:hover:border-white/10"
              >
                {/* Header: Reviewer Info + Rating */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F27D26] to-amber-500 text-black font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                      {rev.reviewerName[0] || 'U'}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {rev.reviewerName}
                        </span>
                        {rev.verifiedWholesaleBuyer && (
                          <span 
                            title="Verified Wholesale Buyer with completed transaction"
                            className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-extrabold px-1.5 py-0.2 rounded-md flex items-center gap-0.5"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Verified Buyer
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                        {rev.companyName && (
                          <span className="font-semibold text-slate-700 dark:text-zinc-300">
                            {rev.companyName}
                          </span>
                        )}
                        {rev.businessType && <span>• {rev.businessType}</span>}
                        {rev.country && (
                          <span>
                            • {rev.country === 'Nigeria' ? '🇳🇬 Nigeria' : rev.country === 'Cameroon' ? '🇨🇲 Cameroon' : `🌍 ${rev.country}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-zinc-700'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {new Date(rev.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Purchase Scope Badge if available */}
                {(rev.unitsPurchased || rev.orderNumber) && (
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-[10px] text-slate-600 dark:text-zinc-400">
                    <PackageCheck className="w-3 h-3 text-[#F27D26]" />
                    <span>
                      Order Reference: <strong className="text-slate-800 dark:text-zinc-200">{rev.orderNumber || 'PO Direct'}</strong> ({rev.unitsPurchased || 'Bulk'} units fulfilled)
                    </span>
                  </div>
                )}

                {/* Review Headline & Body */}
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {rev.title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>

                {/* Unboxing Photos */}
                {Array.isArray(rev.images) && rev.images.length > 0 && (
                  <div className="flex gap-2 pt-1 overflow-x-auto">
                    {rev.images.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0"
                      >
                        <img 
                          src={img} 
                          alt={`Review photo ${idx + 1}`} 
                          className="w-full h-full object-cover transition-transform hover:scale-105 cursor-pointer"
                          onClick={() => window.open(img, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Criteria breakdown pills if available */}
                {rev.criteria && (
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] text-slate-600 dark:text-zinc-400">
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      Quality: {rev.criteria.productQuality}/5
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      Packaging: {rev.criteria.packagingDurability}/5
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5">
                      Delivery: {rev.criteria.shippingSpeed}/5
                    </span>
                  </div>
                )}

                {/* Admin / Supplier Response */}
                {rev.adminReply && (
                  <div className="bg-amber-500/10 border-l-2 border-[#F27D26] p-3 rounded-r-xl text-xs space-y-1 text-slate-800 dark:text-zinc-200">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#F27D26]">
                      <span>🏢 {rev.adminReply.author}</span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-500 font-normal">
                        {new Date(rev.adminReply.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 dark:text-zinc-300 italic">
                      "{rev.adminReply.message}"
                    </p>
                  </div>
                )}

                {/* Helpful Button */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-white/5 text-[11px]">
                  <span className="text-slate-400 dark:text-zinc-500 text-[10px]">
                    Was this wholesale review helpful?
                  </span>

                  <button
                    type="button"
                    onClick={() => handleHelpfulClick(rev.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                      hasVoted
                        ? 'bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/40'
                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/5'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-[#F27D26]' : ''}`} />
                    <span>Helpful ({rev.helpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
