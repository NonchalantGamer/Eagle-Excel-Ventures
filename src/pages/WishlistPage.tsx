import React, { useState, useMemo } from 'react';
import { 
  Heart, 
  ShoppingCart, 
  Trash2, 
  ArrowRight, 
  Layers, 
  Package, 
  TrendingDown, 
  ShieldCheck, 
  Check, 
  Copy, 
  Share2, 
  FileText, 
  Search, 
  Filter, 
  Sparkles, 
  SlidersHorizontal,
  Plus,
  Minus,
  MessageSquare,
  Building2,
  Boxes,
  Truck,
  RotateCcw
} from 'lucide-react';
import { Product, PageView } from '../types';
import { useWishlist } from '../context/WishlistContext';
import { useCart, getProductTierPrice } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

interface WishlistPageProps {
  onNavigate: (view: PageView) => void;
  onSelectProduct: (product: Product) => void;
  onOpenSupport?: (prefilledText?: string) => void;
  onRequestQuote?: (category?: string, productName?: string) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  onNavigate,
  onSelectProduct,
  onOpenSupport,
  onRequestQuote
}) => {
  const { wishlist, removeFromWishlist, clearWishlist, moveItemToCart, moveAllToCart } = useWishlist();
  const { addToCart, setIsCartOpen } = useCart();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'price_asc' | 'price_desc' | 'discount_desc'>('date_desc');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize or get quantity for an item
  const getQuantity = (product: Product) => {
    return itemQuantities[product.id] || product.minOrderQty || 1;
  };

  const setQuantity = (productId: string, qty: number, minQty = 1) => {
    setItemQuantities(prev => ({
      ...prev,
      [productId]: Math.max(minQty, qty)
    }));
  };

  // Extract available categories from saved items
  const categories = useMemo(() => {
    const set = new Set<string>();
    wishlist.forEach(item => {
      if (item.product.category) set.add(item.product.category);
    });
    return Array.from(set);
  }, [wishlist]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return wishlist.filter(item => {
      const p = item.product;
      const matchesCategory = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) || 
        p.sku.toLowerCase().includes(query) || 
        p.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
      if (sortBy === 'price_asc') {
        return a.product.price - b.product.price;
      }
      if (sortBy === 'price_desc') {
        return b.product.price - a.product.price;
      }
      if (sortBy === 'discount_desc') {
        const getDiscount = (p: Product) => {
          const lowest = p.wholesaleTiers?.length ? Math.min(...p.wholesaleTiers.map(t => t.pricePerUnit)) : p.price;
          return p.price > 0 ? (p.price - lowest) / p.price : 0;
        };
        return getDiscount(b.product) - getDiscount(a.product);
      }
      return 0;
    });
  }, [wishlist, selectedCategory, searchQuery, sortBy]);

  // Calculations for total estimated procurement value
  const summary = useMemo(() => {
    let totalMoqValue = 0;
    let totalBulkValue = 0;
    let totalUnits = 0;

    wishlist.forEach(item => {
      const p = item.product;
      const moq = p.minOrderQty || 1;
      const moqPrice = getProductTierPrice(p, moq);
      totalMoqValue += moq * moqPrice;
      totalUnits += moq;

      // Max bulk tier rate
      const lowestTier = p.wholesaleTiers?.length ? Math.min(...p.wholesaleTiers.map(t => t.pricePerUnit)) : p.price;
      totalBulkValue += moq * lowestTier;
    });

    return {
      totalMoqValue,
      totalBulkValue,
      totalUnits,
      savings: Math.max(0, totalMoqValue - totalBulkValue)
    };
  }, [wishlist]);

  const handleCopySku = (sku: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      showToast(`Copied SKU: ${sku} to clipboard`, 'info');
      setTimeout(() => setCopiedSku(null), 1500);
    }
  };

  const handleShareWishlist = () => {
    if (typeof navigator !== 'undefined') {
      const url = window.location.href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        showToast('Wishlist page link copied to clipboard!', 'success');
      }
    }
  };

  const handleAddToCartWithCustomQty = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const qty = getQuantity(product);
    addToCart(product, qty);
    showToast(`Added ${qty}x "${product.name.slice(0, 22)}..." to wholesale cart!`, {
      type: 'success',
      action: {
        label: 'View Cart',
        onClick: () => setIsCartOpen(true)
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0c0c] text-slate-900 dark:text-zinc-100 pb-20">
      
      {/* 1. Header Banner */}
      <div className="bg-white dark:bg-[#121212] border-b border-slate-200 dark:border-white/5 py-8 sm:py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 inline-flex items-center justify-center">
                  <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                </span>
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#F27D26]">
                  Wholesale Procurement List
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-serif text-slate-950 dark:text-white tracking-tight">
                Saved Wholesale Products
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
                Curate your upcoming inventory purchases, track volume discount tier breaks, and transfer saved SKUs directly into your wholesale purchase order.
              </p>
            </div>

            {/* Quick Actions & Total Badge */}
            {wishlist.length > 0 && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={moveAllToCart}
                  className="py-3 px-5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg shadow-[#F27D26]/20 btn-hover cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4 text-black stroke-[2.5]" />
                  <span>Move All to Wholesale Cart ({wishlist.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWishlist}
                  className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Share Wishlist Link"
                >
                  <Share2 className="w-4 h-4 text-[#F27D26]" />
                  <span className="hidden sm:inline">Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Clear all saved products"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Value Highlights Bar */}
          {wishlist.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-200/80 dark:border-white/5">
              <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200/70 dark:border-white/5">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider block">
                  Saved Products
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {wishlist.length} {wishlist.length === 1 ? 'Item' : 'Items'}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200/70 dark:border-white/5">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider block">
                  Est. MOQ Volume
                </span>
                <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">
                  {summary.totalUnits} Units
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200/70 dark:border-white/5">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider block">
                  Est. Order Value (MOQ)
                </span>
                <span className="text-lg font-extrabold text-[#F27D26] mt-0.5 block">
                  {formatPrice(summary.totalMoqValue)}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-2xl border border-slate-200/70 dark:border-white/5">
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 uppercase font-bold tracking-wider block">
                  Bulk Tier Potential
                </span>
                <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {formatPrice(summary.totalBulkValue)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        
        {wishlist.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white dark:bg-[#121212] rounded-3xl border border-slate-200 dark:border-white/5 p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 sm:w-10 sm:h-10 fill-rose-500 text-rose-500" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black font-serif text-slate-900 dark:text-white mb-2">
              Your Wishlist is Empty
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
              Save products you want to procure later by clicking the heart icon on any product card or catalog listing.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('catalog')}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md btn-hover cursor-pointer"
              >
                <Layers className="w-4 h-4 text-black" />
                <span>Explore Wholesale Catalog</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('rfq')}
                className="w-full sm:w-auto py-3 px-6 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-white/10 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#F27D26]" />
                <span>Submit Custom Sourcing RFQ</span>
              </button>
            </div>

            {/* Wholesale highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 pt-8 border-t border-slate-200/80 dark:border-white/5 text-left text-xs text-slate-600 dark:text-zinc-400">
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-zinc-200 block">Direct Factory Shipments</strong>
                  <span>Lagos & Douala bonded warehouse clearance.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-zinc-200 block">Tiered Volume Pricing</strong>
                  <span>Automatic price breaks for container-load orders.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#F27D26] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-zinc-200 block">Quality Inspection SLA</strong>
                  <span>100% pre-shipment container verification.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE WISHLIST ITEMS VIEW */
          <div className="space-y-6">
            
            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search saved products, SKU, or category..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-[#F27D26] outline-none"
                />
              </div>

              {/* Category Pills & Sort */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/5 overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === 'all'
                        ? 'bg-[#F27D26] text-black font-extrabold'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All ({wishlist.length})
                  </button>

                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-[#F27D26] text-black font-extrabold'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Sort Dropdown */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 text-xs font-bold rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="date_desc">Recently Added</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="discount_desc">Highest Bulk Discount</option>
                </select>
              </div>

            </div>

            {/* Items List */}
            {filteredItems.length === 0 ? (
              <div className="bg-white dark:bg-[#121212] rounded-2xl border border-slate-200 dark:border-white/5 p-8 text-center">
                <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">No items match your search or filter.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="mt-2 text-xs font-bold text-[#F27D26] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map(item => {
                  const product = item.product;
                  const qty = getQuantity(product);
                  const currentRate = getProductTierPrice(product, qty);
                  const lineTotal = Number((qty * currentRate).toFixed(2));
                  const lowestTierPrice = product.wholesaleTiers?.length 
                    ? Math.min(...product.wholesaleTiers.map(t => t.pricePerUnit)) 
                    : product.price;
                  const maxDiscount = product.price > lowestTierPrice 
                    ? Math.round(((product.price - lowestTierPrice) / product.price) * 100) 
                    : 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => onSelectProduct(product)}
                      className="group bg-white dark:bg-[#141414] rounded-2xl border border-slate-200/90 dark:border-white/5 p-4 sm:p-5 shadow-sm hover:shadow-xl dark:hover:border-white/20 transition-all duration-300 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 cursor-pointer relative"
                    >
                      {/* Left: Image & Main Product Info */}
                      <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                        
                        {/* Thumbnail */}
                        <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-[#0f0f0f] shrink-0 border border-slate-200 dark:border-white/5">
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
                            <span className="absolute top-1.5 left-1.5 bg-[#F27D26] text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">
                              -{maxDiscount}%
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5 text-[11px]">
                            <button
                              type="button"
                              onClick={(e) => handleCopySku(product.sku, e)}
                              className="font-mono text-slate-500 dark:text-zinc-400 font-medium hover:text-[#F27D26] inline-flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded transition-colors"
                              title="Click to copy SKU"
                            >
                              {copiedSku === product.sku ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              <span>{product.sku}</span>
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
                              {product.stock > 0 ? `${product.stock} in stock` : 'Backorder Available'}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-[#F27D26] transition-colors">
                            {product.name}
                          </h3>

                          {product.description && (
                            <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 mt-1">
                              {product.description}
                            </p>
                          )}

                          {/* Tier preview pills */}
                          {product.wholesaleTiers && product.wholesaleTiers.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">Tiers:</span>
                              {product.wholesaleTiers.slice(0, 3).map((tier, idx) => (
                                <span key={idx} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 px-2 py-0.5 rounded text-[10px] font-medium text-slate-700 dark:text-zinc-300">
                                  {tier.minQty}+ units: <strong className="text-slate-900 dark:text-zinc-100 font-bold">{formatPrice(tier.pricePerUnit)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Right: Quantity Configurator, Rate, and Action Buttons */}
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-white/5"
                      >
                        {/* Quantity Counter */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setQuantity(product.id, qty - 1, product.minOrderQty || 1)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={product.minOrderQty || 1}
                              value={qty}
                              onChange={(e) => setQuantity(product.id, parseInt(e.target.value) || (product.minOrderQty || 1), product.minOrderQty || 1)}
                              className="w-14 text-center font-bold text-xs bg-transparent outline-none text-slate-900 dark:text-white font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setQuantity(product.id, qty + 1, product.minOrderQty || 1)}
                              className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[90px]">
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-medium">
                              {formatPrice(currentRate)}/unit
                            </span>
                            <span className="text-sm sm:text-base font-extrabold text-[#F27D26]">
                              {formatPrice(lineTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => handleAddToCartWithCustomQty(product, e)}
                            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm btn-hover cursor-pointer whitespace-nowrap"
                          >
                            <ShoppingCart className="w-3.5 h-3.5 text-black stroke-[2.5]" />
                            <span>Add {qty} to Cart</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => removeFromWishlist(product.id)}
                            className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
                            title="Remove from saved products"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Sourcing Help Bar */}
            <div className="bg-gradient-to-r from-amber-500/10 via-[#F27D26]/10 to-orange-500/10 border border-[#F27D26]/30 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-[#F27D26]" />
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#F27D26]">
                    Custom Container Sourcing
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Need customized factory packaging or private labeling?
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-xl">
                  We handle custom OEM factory manufacturing, sea container consolidation (FCL/LCL), and port clearance in Lagos and Douala.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate('rfq')}
                  className="py-2.5 px-4 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-black" />
                  <span>Request Custom RFQ</span>
                </button>

                {onOpenSupport && (
                  <button
                    type="button"
                    onClick={() => onOpenSupport('Hello Eagle Excel team, I have questions about the items saved in my wholesale wishlist.')}
                    className="py-2.5 px-4 rounded-xl bg-white dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Live Desk Inquiry</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Clear Saved Wishlist?
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Are you sure you want to remove all {wishlist.length} product(s) from your saved wholesale list?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  clearWishlist();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
