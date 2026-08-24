import React, { useState } from 'react';
import { ShoppingCart, Eye, Package, ShieldCheck, TrendingDown, Check, Sparkles, Copy, Heart } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from './Toast';
import { HighlightedText } from '../utils/searchMatcher';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  isBestMatch?: boolean;
  isNewlyAdded?: boolean;
  searchQuery?: string;
  viewMode?: 'grid' | 'list';
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onSelect,
  isBestMatch = false,
  isNewlyAdded = false,
  searchQuery = '',
  viewMode = 'grid'
}) => {
  const { addToCart, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const [isAdded, setIsAdded] = useState(false);
  const [copiedSku, setCopiedSku] = useState(false);

  const isSaved = isInWishlist(product.id);

  // Calculate highest bulk discount percentage
  const lowestTierPrice = product.wholesaleTiers && product.wholesaleTiers.length > 0
    ? Math.min(...product.wholesaleTiers.map(t => t.pricePerUnit))
    : product.price;

  const maxDiscount = product.price > lowestTierPrice
    ? Math.round(((product.price - lowestTierPrice) / product.price) * 100)
    : 0;

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    const qty = product.minOrderQty || 1;
    addToCart(product, qty);
    setIsAdded(true);
    showToast(`Added ${qty} units of ${product.name.slice(0, 22)}... to wholesale cart`, {
      type: 'success',
      action: {
        label: 'View Cart',
        onClick: () => setIsCartOpen(true)
      }
    });
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleCopySku = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(product.sku);
      setCopiedSku(true);
      showToast(`Copied SKU: ${product.sku} to clipboard`, 'info');
      setTimeout(() => setCopiedSku(false), 1500);
    }
  };

  // Compact List View for Wholesale Buyers
  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onSelect(product)}
        className={`group bg-white dark:bg-[#161616] rounded-2xl border p-3 sm:p-4 shadow-sm hover:shadow-xl dark:hover:border-white/20 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer relative ${
          isBestMatch 
            ? 'border-[#F27D26]/80 ring-2 ring-[#F27D26]/20 dark:ring-[#F27D26]/30' 
            : 'border-slate-200/90 dark:border-white/5'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0f0f0f] shrink-0 border border-slate-200 dark:border-white/5">
            <img
              src={product.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.src.includes('unsplash.com')) {
                  target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
                }
              }}
            />
            {maxDiscount > 0 && (
              <span className="absolute top-1 left-1 bg-[#F27D26] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                -{maxDiscount}%
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1 text-[11px]">
              <button
                type="button"
                onClick={handleCopySku}
                className="font-mono text-slate-500 dark:text-zinc-400 font-medium hover:text-[#F27D26] inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded transition-colors"
                title="Click to copy SKU"
              >
                {copiedSku ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <HighlightedText text={product.sku} query={searchQuery} />
              </button>
              <span className="text-[#F27D26] font-bold uppercase tracking-wider bg-[#F27D26]/10 border border-[#F27D26]/30 px-2 py-0.5 rounded text-[10px]">
                {product.category}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                product.stock > 100 
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' 
                  : product.stock > 0 
                  ? 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10' 
                  : 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10'
              }`}>
                {product.stock > 0 ? `${product.stock} in stock` : 'Backorder'}
              </span>
            </div>

            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-snug line-clamp-1 group-hover:text-[#F27D26] transition-colors">
              <HighlightedText text={product.name} query={searchQuery} />
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1">
              <span>MOQ: <strong className="text-slate-900 dark:text-zinc-200 font-bold">{product.minOrderQty || 1} units</strong></span>
              {product.wholesaleTiers && product.wholesaleTiers.length > 0 && (
                <span className="hidden md:inline-block text-[#F27D26] font-medium">
                  {product.wholesaleTiers.length} Volume Tiers Available
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
          <div className="text-left sm:text-right shrink-0">
            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">Wholesale Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg font-extrabold text-[#F27D26]">
                {formatPrice(lowestTierPrice)}
              </span>
              <span className="text-[10px] text-slate-400">/unit</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSaved 
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-500' 
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500'
              }`}
              title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleQuickAdd}
              className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all btn-hover cursor-pointer ${
                isAdded
                  ? 'bg-emerald-500 text-black font-extrabold'
                  : 'btn-primary-morphic'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-black" /> + Add MOQ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      onClick={() => onSelect(product)}
      className={`group bg-white dark:bg-[#161616] rounded-3xl border shadow-md hover:shadow-2xl dark:hover:border-white/20 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer btn-hover relative ${
        isBestMatch 
          ? 'border-[#F27D26]/80 ring-2 ring-[#F27D26]/20 dark:ring-[#F27D26]/30' 
          : 'border-slate-200/90 dark:border-white/5'
      }`}
    >
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-[#0f0f0f] overflow-hidden">
        <img
          src={product.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 will-change-transform"
          loading="lazy"
          decoding="async"
          width={400}
          height={300}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('unsplash.com')) {
              target.src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80';
            }
          }}
        />
        
        {/* Bulk Savings or Best Match or New Arrival Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {isNewlyAdded && (
            <div className="bg-emerald-500 text-black font-black text-[10px] px-2.5 py-0.5 rounded-lg shadow-md flex items-center gap-1.5 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-black animate-ping" />
              Live Arrival
            </div>
          )}
          {isBestMatch && !isNewlyAdded && (
            <div className="bg-black text-[#F27D26] border border-[#F27D26]/60 text-[10px] font-black px-2.5 py-0.5 rounded-lg shadow-md flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#F27D26] animate-pulse" />
              Closest Match
            </div>
          )}
          {maxDiscount > 0 && (
            <div className="bg-[#F27D26] text-black text-[11px] font-extrabold px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-black" />
              Up to {maxDiscount}% OFF
            </div>
          )}
        </div>

        {/* Stock Status & Floating Wishlist Button */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {product.stock > 100 ? (
            <span className="bg-emerald-500/90 dark:bg-emerald-500/20 border border-emerald-600/30 text-white dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm backdrop-blur-md">
              {product.stock} In Stock
            </span>
          ) : product.stock > 0 ? (
            <span className="bg-amber-500/90 dark:bg-amber-500/20 border border-amber-600/30 text-white dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm backdrop-blur-md">
              Low Stock ({product.stock})
            </span>
          ) : (
            <span className="bg-rose-500/90 dark:bg-rose-500/20 border border-rose-600/30 text-white dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm backdrop-blur-md">
              Backorder
            </span>
          )}

          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`p-1.5 rounded-lg backdrop-blur-md border transition-all cursor-pointer shadow-sm ${
              isSaved 
                ? 'bg-rose-500/90 border-rose-400 text-white' 
                : 'bg-black/40 hover:bg-black/70 border-white/20 text-white/80 hover:text-rose-400'
            }`}
            title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
          >
            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
          </button>
        </div>

        {/* Quick View Overlay on Desktop */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="bg-white/95 dark:bg-[#121212]/95 text-slate-900 dark:text-zinc-100 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5 text-[#F27D26]" /> View Wholesale Tiers
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Row */}
          <div className="flex items-center justify-between gap-2 mb-2 text-[11px]">
            <button
              type="button"
              onClick={handleCopySku}
              className="font-mono text-slate-500 dark:text-zinc-500 font-medium tracking-tight hover:text-[#F27D26] inline-flex items-center gap-1"
              title="Click to copy SKU"
            >
              {copiedSku ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
              SKU: <HighlightedText text={product.sku} query={searchQuery} />
            </button>
            <span className="text-[#F27D26] font-bold uppercase tracking-wider bg-[#F27D26]/10 border border-[#F27D26]/30 px-2 py-0.5 rounded-md text-[10px]">
              {product.category}
            </span>
          </div>

          {/* Product Name with highlight */}
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm leading-snug line-clamp-2 mb-3 group-hover:text-[#F27D26] transition-colors">
            <HighlightedText text={product.name} query={searchQuery} />
          </h3>

          {/* Pricing Section */}
          <div className="bg-slate-50 dark:bg-[#121212] p-3 rounded-2xl border border-slate-100 dark:border-white/5 mb-3 w-full overflow-hidden">
            {lowestTierPrice < product.price ? (
              <div className="space-y-1">
                <div className="flex items-baseline justify-between gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-tight shrink-0">
                    Bulk Rate:
                  </span>
                  <div className="text-right shrink-0">
                    <span className="text-sm sm:text-base font-extrabold text-[#F27D26] tracking-tight whitespace-nowrap">
                      {formatPrice(lowestTierPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium ml-0.5">/unit</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-1.5 min-w-0 pt-1 border-t border-slate-200/50 dark:border-white/5 text-[11px]">
                  <span className="text-slate-500 dark:text-zinc-400 truncate">Base MOQ Price:</span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 whitespace-nowrap shrink-0">
                    {formatPrice(product.price)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-baseline justify-between gap-2 min-w-0">
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium shrink-0">Base Unit:</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-zinc-100 whitespace-nowrap shrink-0">
                  {formatPrice(product.price)}
                </span>
              </div>
            )}

            {/* Tier Highlights */}
            {product.wholesaleTiers && product.wholesaleTiers.length > 1 && (
              <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap items-center gap-1 text-[10px]">
                <span className="font-semibold shrink-0 text-slate-600 dark:text-zinc-300">Tiers:</span>
                {product.wholesaleTiers.slice(0, 3).map((tier, idx) => (
                  <span key={idx} className="bg-white dark:bg-white/5 px-1.5 py-0.5 rounded-md border border-slate-200 dark:border-white/5 shrink-0 text-slate-700 dark:text-zinc-300 font-medium inline-flex items-center gap-1 whitespace-nowrap">
                    <span>{tier.minQty}+:</span>
                    <strong className="text-slate-900 dark:text-zinc-100 font-bold">{formatPrice(tier.pricePerUnit)}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 min-w-0">
          <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1 shrink-0">
            <Package className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 shrink-0" />
            <span className="whitespace-nowrap">MOQ: <strong className="text-slate-900 dark:text-zinc-200 font-bold">{product.minOrderQty || 1}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isSaved 
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-500' 
                  : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:text-rose-500'
              }`}
              title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleQuickAdd}
              className={`py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all btn-hover shrink-0 whitespace-nowrap cursor-pointer ${
                isAdded
                  ? 'bg-emerald-500 text-black font-extrabold'
                  : 'btn-primary-morphic'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Added
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5 text-black" /> + Add MOQ
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

