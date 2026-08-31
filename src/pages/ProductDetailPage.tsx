import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  ShoppingCart, 
  TrendingDown, 
  ShieldCheck, 
  Package, 
  CheckCircle2, 
  Minus, 
  Plus, 
  MessageSquare, 
  Truck, 
  Award, 
  FileText, 
  Copy, 
  Check, 
  Share2, 
  Heart, 
  Star, 
  Layers, 
  Globe2, 
  Building2, 
  Download, 
  Zap, 
  Sparkles,
  Info,
  ChevronRight,
  Maximize2,
  Box,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { Product, PageView } from '../types';
import { useCart, getProductTierPrice } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';
import { useOrders } from '../context/OrderContext';
import { useToast } from '../components/Toast';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { ProductCard } from '../components/ProductCard';
import { ProductReviewsSection } from '../components/ProductReviewsSection';
import { getProductReviews, calculateReviewSummary } from '../services/reviewService';
import { getRelatedProducts, filterRelatedProducts, RelatedFilterType } from '../utils/productRecommendations';

interface ProductDetailPageProps {
  product: Product | null;
  allProducts: Product[];
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: PageView, options?: { category?: string; product?: string }) => void;
  onOpenAuth?: () => void;
  onOpenSupportWithProduct?: (product: Product) => void;
  onRequestQuote?: (category?: string, productName?: string) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  allProducts,
  onSelectProduct,
  onNavigate,
  onOpenAuth,
  onOpenSupportWithProduct,
  onRequestQuote
}) => {
  const { addToCart, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { orders } = useOrders();
  const { formatPrice, currency } = useCurrency();
  const { showToast } = useToast();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState<number>(() => product?.minOrderQty || 10);
  const [copiedSku, setCopiedSku] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'logistics' | 'reviews'>('overview');
  const [relatedFilter, setRelatedFilter] = useState<RelatedFilterType>('all');
  const [isZoomed, setIsZoomed] = useState(false);
  const [liveRating, setLiveRating] = useState<number>(() => product?.rating || 5.0);
  const [liveReviewsCount, setLiveReviewsCount] = useState<number>(() => product?.reviewsCount || 0);

  const handleUpdateRating = useCallback((newRating: number, count: number) => {
    setLiveRating(prev => prev !== newRating ? newRating : prev);
    setLiveReviewsCount(prev => prev !== count ? count : prev);
  }, []);

  const reviewsSectionRef = useRef<HTMLDivElement | null>(null);

  // Initialize scroll reveal observer
  useScrollReveal([product?.id]);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      setQuantity(product.minOrderQty || 10);
      setActiveImageIdx(0);
      setActiveTab('overview');
      const revs = getProductReviews(product.id);
      const summary = calculateReviewSummary(revs, product.rating, product.reviewsCount);
      setLiveRating(summary.averageRating);
      setLiveReviewsCount(summary.totalReviews);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [product?.id]);

  // Compute smart related products
  const rawRelatedProducts = useMemo(() => {
    if (!product) return [];
    return getRelatedProducts(product, allProducts, 8);
  }, [product, allProducts]);

  const displayedRelatedProducts = useMemo(() => {
    if (!product) return [];
    return filterRelatedProducts(product, rawRelatedProducts, relatedFilter);
  }, [product, rawRelatedProducts, relatedFilter]);

  if (!product) {
    return (
      <div className="w-full max-w-4xl mx-auto py-16 px-4 text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-[#F27D26]/10 text-[#F27D26] rounded-3xl mx-auto flex items-center justify-center border border-[#F27D26]/20">
          <Package className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
          The requested wholesale product could not be located or may have been updated in the factory catalog.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="px-6 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
          >
            Return to Wholesale Catalog
          </button>
        </div>
      </div>
    );
  }

  const isSaved = isInWishlist(product.id);

  // Pricing and Tier Calculations
  const currentTierPrice = getProductTierPrice(product, quantity);
  const lineSubtotal = Number((quantity * currentTierPrice).toFixed(2));
  const baseCost = Number((quantity * product.price).toFixed(2));
  const totalSavings = Number((baseCost - lineSubtotal).toFixed(2));
  const savingsPercent = baseCost > 0 ? Math.round((totalSavings / baseCost) * 100) : 0;
  const estimatedFreightTotal = product.estimatedFreight ? Number((product.estimatedFreight * (quantity / (product.minOrderQty || 10))).toFixed(2)) : 0;

  const handleQuantityChange = (newQty: number) => {
    const min = product.minOrderQty || 1;
    setQuantity(Math.max(min, Math.min(newQty, product.stock > 0 ? product.stock : 99999)));
  };

  const handleAddToCart = () => {
    addToCart(product, quantity);
    showToast(`Added ${quantity} units of "${product.name.slice(0, 24)}..." to wholesale cart!`, {
      type: 'success',
      action: {
        label: 'View Cart',
        onClick: () => setIsCartOpen(true)
      }
    });
  };

  const handleCopySku = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(product.sku);
      setCopiedSku(true);
      showToast(`Copied SKU: ${product.sku} to clipboard`, 'info');
      setTimeout(() => setCopiedSku(false), 1500);
    }
  };

  const handleShareProduct = () => {
    if (typeof navigator !== 'undefined') {
      const shareUrl = `${window.location.origin}${window.location.pathname}#/product?id=${encodeURIComponent(product.id)}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        showToast('Direct product page link copied to clipboard!', 'success');
      }
    }
  };

  const scrollToReviews = () => {
    setActiveTab('reviews');
    setTimeout(() => {
      reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleDownloadSpecSheet = () => {
    try {
      const specsText = [
        `==================================================`,
        `EAGLE EXCEL WHOLESALE SPECIFICATION SHEET`,
        `==================================================`,
        `Product Name: ${product.name}`,
        `SKU: ${product.sku}`,
        `Category: ${product.category.toUpperCase()}`,
        `Base Price: $${product.price.toFixed(2)} USD`,
        `Minimum Order Qty (MOQ): ${product.minOrderQty || 1} units`,
        `Packaging Unit: ${product.unit || 'Master Carton'}`,
        `Stock Status: ${product.stock > 0 ? `${product.stock} units ready in Guangzhou warehouse` : 'Backorder / Factory Custom Run'}`,
        `\n--- TECHNICAL SPECIFICATIONS ---`,
        ...Object.entries(product.specs || {}).map(([key, val]) => `${key}: ${val}`),
        `\n--- VOLUME TIER PRICING ---`,
        ...(product.wholesaleTiers || []).map(t => `MOQ ${t.minQty}+ units: $${t.pricePerUnit.toFixed(2)}/unit (-${t.discountPercentage || 0}%)`),
        `\n--- LOGISTICS & TRANSIT ---`,
        `Air Express Transit (Lagos/Douala): 5-7 Business Days`,
        `Consolidated Ocean Freight: 30-45 Days via Apapa & Douala Ports`,
        `Pre-clearance Guarantee: Form M / SONCAP / BESC Compliant`,
        `==================================================`,
        `Generated from Eagle Excel B2B Platform: ${new Date().toLocaleDateString()}`
      ].join('\n');

      const blob = new Blob([specsText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SpecSheet_${product.sku}_EagleExcel.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Downloaded wholesale specification sheet!', 'success');
    } catch (err) {
      showToast('Unable to export spec sheet. Please copy specs manually.', 'warning');
    }
  };

  const mainImage = product.images?.[activeImageIdx] || product.images?.[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';

  return (
    <div id="product-detail-page-container" className="w-full max-w-7xl mx-auto space-y-8 pb-16 animate-fadeIn">
      
      {/* 1. BREADCRUMBS & TOP NAV BAR */}
      <div className="reveal-on-scroll flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="hover:text-[#F27D26] transition-colors font-medium cursor-pointer"
          >
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="hover:text-[#F27D26] transition-colors font-medium cursor-pointer"
          >
            Wholesale Catalog
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={() => onNavigate('catalog', { category: product.category })}
            className="hover:text-[#F27D26] transition-colors font-medium capitalize cursor-pointer text-[#F27D26]"
          >
            {product.category}
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block" />
          <span className="text-slate-800 dark:text-zinc-200 font-bold truncate max-w-[200px] sm:max-w-[320px] hidden sm:inline-block">
            {product.name}
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </button>
          <button
            type="button"
            onClick={handleShareProduct}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            title="Share Direct Product Link"
            aria-label="Share direct product link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => toggleWishlist(product)}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isSaved
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:text-rose-500'
            }`}
            title={isSaved ? 'Remove from saved wishlist' : 'Save to wholesale wishlist'}
            aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. MAIN PRODUCT SECTION: 2-COLUMN HERO & ORDER BUILDER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        
        {/* LEFT COLUMN (lg:cols-6 / 7): Interactive Gallery & Media Display */}
        <div id="product-detail-media-gallery" className="lg:col-span-6 space-y-4 reveal-on-scroll stagger-1">
          
          {/* Main Visual Display */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-white/10 aspect-square sm:aspect-[4/3] flex items-center justify-center group shadow-md">
            <img
              src={mainImage}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-500 ${isZoomed ? 'scale-125 cursor-zoom-out' : 'group-hover:scale-105 cursor-zoom-in'}`}
              onClick={() => setIsZoomed(!isZoomed)}
              loading="eager"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('unsplash.com')) {
                  target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
                }
              }}
            />

            {/* Overlay Status Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
              <span className="bg-[#F27D26] text-black font-black text-xs px-3 py-1 rounded-xl shadow-md tracking-wider uppercase">
                {product.category}
              </span>
              {savingsPercent > 0 && (
                <span className="bg-emerald-500 text-black font-black text-xs px-2.5 py-0.5 rounded-lg shadow-md inline-flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 stroke-[3]" />
                  Up to -{savingsPercent}% Tier Savings
                </span>
              )}
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-xl shadow-md backdrop-blur-md ${
                product.stock > 100
                  ? 'bg-emerald-500/90 text-black'
                  : product.stock > 0
                  ? 'bg-amber-500/90 text-black'
                  : 'bg-rose-500/90 text-white'
              }`}>
                {product.stock > 0 ? `${product.stock} Units Ready` : 'Backorder'}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomed(!isZoomed)}
                className="p-2 rounded-xl bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition-colors cursor-pointer"
                title={isZoomed ? 'Reset zoom' : 'Click to zoom'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Sourcing Origin Tag */}
            <div className="absolute bottom-4 left-4 right-4 bg-black/75 backdrop-blur-md rounded-2xl p-2.5 text-white text-[11px] flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-1.5 truncate">
                <Globe2 className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                <span className="truncate">{product.specs?.['Sourcing Origin'] || 'Shenzhen High-Tech Hub, China'}</span>
              </div>
              <span className="text-emerald-400 font-bold shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Pre-Inspected
              </span>
            </div>
          </div>

          {/* Thumbnail Gallery Strip */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {product.images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIdx === idx
                      ? 'border-[#F27D26] ring-2 ring-[#F27D26]/40 scale-105 shadow-md'
                      : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100 hover:border-slate-400'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.name} photo variant ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Sourcing & Quality Trust Guarantee Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-[#141414] border border-slate-200/80 dark:border-white/5 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#F27D26] shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-800 dark:text-zinc-200 block">SGS & CE Verified</span>
                <span className="text-slate-400 dark:text-zinc-500">100% QA Inspection</span>
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-[#141414] border border-slate-200/80 dark:border-white/5 flex items-center gap-2.5">
              <Truck className="w-5 h-5 text-[#F27D26] shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-800 dark:text-zinc-200 block">Apapa & Douala Port</span>
                <span className="text-slate-400 dark:text-zinc-500">Pre-cleared Customs</span>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-100/80 dark:bg-[#141414] border border-slate-200/80 dark:border-white/5 flex items-center gap-2.5">
              <Box className="w-5 h-5 text-[#F27D26] shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold text-slate-800 dark:text-zinc-200 block">Export Master Packing</span>
                <span className="text-slate-400 dark:text-zinc-500">{product.unit || 'Palletized Unit'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:cols-6): Wholesale Specifications & Interactive Order Builder */}
        <div id="product-detail-info-column" className="lg:col-span-6 space-y-6 reveal-on-scroll stagger-2">
          
          {/* Header Metadata: SKU + Category + Rating */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySku}
                  className="font-mono text-slate-600 dark:text-zinc-400 font-bold hover:text-[#F27D26] inline-flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Click to copy SKU code"
                >
                  {copiedSku ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
                  <span>SKU: {product.sku}</span>
                </button>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span className="text-slate-500 dark:text-zinc-400 font-medium">
                  MOQ: <strong className="text-slate-900 dark:text-zinc-200">{product.minOrderQty || 1} units</strong>
                </span>
              </div>

              {/* Star Rating Badge */}
              <button
                type="button"
                onClick={scrollToReviews}
                className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-500 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-current" />
                <span className="font-bold text-xs">{liveRating.toFixed(1)}</span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  ({liveReviewsCount} buyer reviews)
                </span>
              </button>
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
              {product.name}
            </h1>

            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed pt-1">
              {product.description}
            </p>
          </div>

          {/* Pricing Highlight Card with Live Tier Matrix */}
          <div className="p-5 rounded-3xl bg-slate-100/90 dark:bg-[#141414] border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium block">Current Wholesale Rate</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                    {formatPrice(currentTierPrice)}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500">
                    / unit ({currency})
                  </span>
                  {currentTierPrice < product.price && (
                    <span className="text-xs line-through text-slate-400">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
              </div>

              {savingsPercent > 0 && (
                <div className="text-right">
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 block">
                    Saving {savingsPercent}% vs Single Unit
                  </span>
                </div>
              )}
            </div>

            {/* Wholesale Tier Breakdown Matrix */}
            {product.wholesaleTiers && product.wholesaleTiers.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200/80 dark:border-white/5">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                  Volume Discount Tiers (Guangzhou Factory Direct):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {product.wholesaleTiers.map((tier, idx) => {
                    const isCurrentTier = quantity >= tier.minQty && 
                      (!product.wholesaleTiers[idx + 1] || quantity < product.wholesaleTiers[idx + 1].minQty);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuantityChange(tier.minQty)}
                        className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          isCurrentTier
                            ? 'bg-[#F27D26]/20 border-[#F27D26] ring-2 ring-[#F27D26]/40 shadow-xs'
                            : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase">
                          {tier.minQty}+ Units
                        </span>
                        <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block mt-0.5">
                          {formatPrice(tier.pricePerUnit)}
                        </span>
                        {tier.discountPercentage ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                            -{tier.discountPercentage}% off
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Base MOQ</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Order Quantity & Line Subtotal Configuration */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 block mb-1">
                  Order Quantity (Units)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-300 dark:border-white/15 rounded-2xl bg-slate-50 dark:bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 10)}
                      disabled={quantity <= (product.minOrderQty || 1)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-200 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                      title="Decrease by 10 units"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={product.minOrderQty || 1}
                      max={product.stock > 0 ? product.stock : 99999}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || (product.minOrderQty || 1))}
                      className="w-16 sm:w-20 text-center font-bold text-sm bg-transparent outline-none text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 10)}
                      className="w-8 h-8 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
                      title="Increase by 10 units"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bulk Preset Quick Buttons */}
                  <div className="hidden sm:flex items-center gap-1">
                    {[product.minOrderQty || 10, 50, 100, 250].map((presetQty) => (
                      <button
                        key={presetQty}
                        type="button"
                        onClick={() => handleQuantityChange(presetQty)}
                        className={`px-2 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                          quantity === presetQty
                            ? 'bg-[#F27D26] text-black border-[#F27D26]'
                            : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-slate-400'
                        }`}
                      >
                        {presetQty}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Order Subtotal Summary */}
              <div className="text-left sm:text-right w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium block">
                  Wholesale Subtotal ({quantity} units)
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#F27D26]">
                  {formatPrice(lineSubtotal)}
                </span>
                {totalSavings > 0 && (
                  <span className="text-[10px] text-emerald-500 font-bold block">
                    Total Savings: {formatPrice(totalSavings)}
                  </span>
                )}
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                id="product-page-add-to-cart-btn"
                onClick={handleAddToCart}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-sm shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                <span>Add {quantity} Units to Wholesale Cart ({formatPrice(lineSubtotal)})</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onRequestQuote?.(product.category, product.name)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Request Custom RFQ / FCL Quote</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenSupportWithProduct?.(product)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Ask China Sourcing Agent</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. STRUCTURED PRODUCT INFORMATION TABS SECTION */}
      <div id="product-detail-tabs-section" className="pt-6 space-y-6 reveal-on-scroll stagger-3">
        
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Product Overview & Highlights</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'specs'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Technical Specifications ({Object.keys(product.specs || {}).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logistics')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'logistics'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Packaging & Freight Logistics</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'border-[#F27D26] text-[#F27D26]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Star className="w-4 h-4 fill-current text-amber-500" />
            <span>Buyer Reviews ({liveReviewsCount})</span>
          </button>
        </div>

        {/* TAB CONTENT PANELS */}
        <div className="bg-white dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-white/10 p-6 sm:p-8 shadow-sm">
          
          {/* 1. Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Wholesale Commercial Overview
                </h3>
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Key Features Bullet Grid */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Key Wholesale Features & Advantages
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-white block">Direct China Factory Source</strong>
                      <span className="text-slate-500 dark:text-zinc-400">Manufactured with zero intermediary markups, ensuring peak profit margins for African wholesalers.</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-white block">Pre-Tested Quality Standards</strong>
                      <span className="text-slate-500 dark:text-zinc-400">Subjected to batch stress-testing, heat resilience checks, and electrical compliance.</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-white block">Retail-Ready Barcode Packaging</strong>
                      <span className="text-slate-500 dark:text-zinc-400">Master cartons come pre-labeled with international barcodes for immediate POS inventory sync.</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="text-slate-900 dark:text-white block">Consolidated Freight Ready</strong>
                      <span className="text-slate-500 dark:text-zinc-400">Standardized carton volumetric dimensions fit optimal 20ft/40ft container stacking grids.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Technical Specifications Tab */}
          {activeTab === 'specs' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Technical Specifications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Comprehensive factory engineering and import parameters.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSpecSheet}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-zinc-200 transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                >
                  <Download className="w-3.5 h-3.5 text-[#F27D26]" />
                  <span>Download Spec Sheet (.txt)</span>
                </button>
              </div>

              {/* Specifications Table */}
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden divide-y divide-slate-200 dark:divide-white/5">
                <div className="grid grid-cols-1 sm:grid-cols-3 bg-slate-50 dark:bg-white/5 p-3.5 text-xs font-semibold">
                  <span className="text-slate-500 dark:text-zinc-400">SKU / Model Number</span>
                  <span className="sm:col-span-2 text-slate-900 dark:text-white font-mono font-bold">{product.sku}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 text-xs font-semibold">
                  <span className="text-slate-500 dark:text-zinc-400">Wholesale Category</span>
                  <span className="sm:col-span-2 text-slate-900 dark:text-white capitalize font-bold">{product.category}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 bg-slate-50 dark:bg-white/5 p-3.5 text-xs font-semibold">
                  <span className="text-slate-500 dark:text-zinc-400">Packaging Unit</span>
                  <span className="sm:col-span-2 text-slate-900 dark:text-white font-bold">{product.unit || 'Master Carton'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 p-3.5 text-xs font-semibold">
                  <span className="text-slate-500 dark:text-zinc-400">Minimum Order Qty (MOQ)</span>
                  <span className="sm:col-span-2 text-[#F27D26] font-bold">{product.minOrderQty || 1} units</span>
                </div>

                {/* Dynamic Spec Entries */}
                {Object.entries(product.specs || {}).map(([key, val], idx) => (
                  <div 
                    key={key} 
                    className={`grid grid-cols-1 sm:grid-cols-3 p-3.5 text-xs font-semibold ${
                      idx % 2 === 0 ? 'bg-slate-50 dark:bg-white/5' : ''
                    }`}
                  >
                    <span className="text-slate-500 dark:text-zinc-400">{key}</span>
                    <span className="sm:col-span-2 text-slate-900 dark:text-white font-bold">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Logistics Tab */}
          {activeTab === 'logistics' && (
            <div className="space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Packaging, Freight & Port Clearance
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Reliable end-to-end China-to-Africa supply chain routing.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Truck className="w-4 h-4 text-[#F27D26]" />
                    <span>Air Express Freight</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    5-7 business days door-to-door delivery to Lagos (LOS) and Douala (DLA) airports with full pre-clearance.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <Globe2 className="w-4 h-4 text-[#F27D26]" />
                    <span>Ocean FCL / LCL Freight</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    30-45 calendar days consolidated container shipments directly berthed at Apapa, Tincan, or Douala Port.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-[#F27D26]" />
                    <span>Import Compliance</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    All consignments include SONCAP certificates, Form M guidance, and BESC / ECTN waiver documentation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Reviews Tab */}
          {activeTab === 'reviews' && (
            <div ref={reviewsSectionRef} className="animate-fadeIn">
              <ProductReviewsSection
                product={product}
                userOrders={orders}
                onOpenAuth={onOpenAuth}
                onUpdateProductRating={handleUpdateRating}
              />
            </div>
          )}

        </div>
      </div>

      {/* 4. "OTHER PRODUCTS YOU MAY BE INTERESTED IN" (RECOMMENDED PRODUCTS SECTION) */}
      <section id="related-products-section" className="pt-10 space-y-6 border-t border-slate-200 dark:border-white/10 reveal-on-scroll stagger-4">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F27D26]" />
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Other products you may be interested in
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              Curated wholesale recommendations based on <strong className="text-slate-700 dark:text-zinc-300 font-bold capitalize">{product.category}</strong> category and technical compatibility.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setRelatedFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                relatedFilter === 'all'
                  ? 'bg-[#F27D26] text-black shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Matches ({rawRelatedProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setRelatedFilter('same_category')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer capitalize ${
                relatedFilter === 'same_category'
                  ? 'bg-[#F27D26] text-black shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Same Category
            </button>
            <button
              type="button"
              onClick={() => setRelatedFilter('complementary')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                relatedFilter === 'complementary'
                  ? 'bg-[#F27D26] text-black shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Complementary
            </button>
          </div>
        </div>

        {/* Recommended Products Grid */}
        {displayedRelatedProducts.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-white/5 text-xs text-slate-400">
            No additional items in this category yet. Explore our full wholesale catalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayedRelatedProducts.map((relatedProd) => (
              <ProductCard
                key={relatedProd.id}
                product={relatedProd}
                onSelect={(clickedProd) => {
                  onSelectProduct(clickedProd);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                viewMode="grid"
              />
            ))}
          </div>
        )}

        {/* Explore More Banner */}
        <div className="p-6 rounded-3xl bg-linear-to-r from-slate-100 via-slate-50 to-slate-100 dark:from-[#141414] dark:via-[#161616] dark:to-[#141414] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Looking for custom manufacturing or bulk container sourcing?
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Submit your bespoke specifications, OEM packaging requirements, or factory audit requests.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('catalog')}
              className="px-4 py-2 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              Browse Full Catalog
            </button>
            <button
              type="button"
              onClick={() => onRequestQuote?.(product.category)}
              className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-bold shadow-md transition-transform hover:scale-105 cursor-pointer"
            >
              Submit RFQ
            </button>
          </div>
        </div>

      </section>

    </div>
  );
};
