import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
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
  HelpCircle,
  Copy,
  Check,
  Share2,
  FileText
} from 'lucide-react';
import { Product } from '../types';
import { useCart, getProductTierPrice } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from './Toast';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onOpenSupportWithProduct?: (product: Product) => void;
  onNavigateToRfq?: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenSupportWithProduct,
  onNavigateToRfq
}) => {
  const { addToCart, setIsCartOpen } = useCart();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(10);
  const [copiedSku, setCopiedSku] = useState(false);

  useModalFocusLock(!!product, onClose);

  useEffect(() => {
    if (product) {
      setQuantity(product.minOrderQty || 10);
      setActiveImageIdx(0);
    }
  }, [product]);

  if (!product) return null;

  const currentTierPrice = getProductTierPrice(product, quantity);
  const lineSubtotal = Number((quantity * currentTierPrice).toFixed(2));
  const baseCost = Number((quantity * product.price).toFixed(2));
  const totalSavings = Number((baseCost - lineSubtotal).toFixed(2));
  const savingsPercent = baseCost > 0 ? Math.round((totalSavings / baseCost) * 100) : 0;

  const handleQuantityChange = (newQty: number) => {
    const min = product.minOrderQty || 1;
    setQuantity(Math.max(min, newQty));
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
    onClose();
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
      const shareUrl = `${window.location.origin}${window.location.pathname}#/catalog?sku=${encodeURIComponent(product.sku)}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
        showToast('Direct product link copied to clipboard!', 'success');
      }
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-4xl w-full max-h-[92vh] overflow-hidden flex flex-col transition-all text-slate-900 dark:text-zinc-100 animate-scaleUp">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f0f0f] shrink-0">
          <div className="flex items-center gap-2.5 text-xs">
            <button
              type="button"
              onClick={handleCopySku}
              className="font-mono text-slate-600 dark:text-zinc-400 font-bold hover:text-[#F27D26] inline-flex items-center gap-1 bg-slate-200/70 dark:bg-white/5 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Click to copy SKU"
            >
              {copiedSku ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-60" />}
              <span>SKU: {product.sku}</span>
            </button>
            <span className="text-slate-300 dark:text-zinc-600">•</span>
            <span className="text-[#F27D26] font-bold uppercase tracking-wider bg-[#F27D26]/10 border border-[#F27D26]/30 px-2.5 py-1 rounded-lg text-[10px]">
              {product.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareProduct}
              className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Share Product"
              aria-label="Share Product Link"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Image Gallery Column */}
            <div className="space-y-3">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0f0f0f] border border-slate-200 dark:border-white/5 relative">
                <img
                  src={product.images[activeImageIdx] || product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {savingsPercent > 0 && (
                  <div className="absolute top-3 left-3 bg-[#F27D26] text-black text-xs font-extrabold px-3 py-1 rounded-xl shadow-md flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5 text-black" />
                    Active Savings: {savingsPercent}% OFF
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIdx(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                        activeImageIdx === idx
                          ? 'border-[#F27D26] ring-2 ring-[#F27D26]/30'
                          : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* B2B Assurance Box */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 text-xs space-y-2 text-slate-600 dark:text-zinc-400">
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-zinc-200">
                  <Truck className="w-4 h-4 text-[#F27D26] shrink-0" />
                  <span>Pallet Freight & Logistics Dispatch Verified</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-zinc-200">
                  <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Eagle Excel Ventures Verified Quality Assurance</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-zinc-200">
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Factory Direct OEM Warranties & CE/RoHS Compliant</span>
                </div>
              </div>
            </div>

            {/* Product Details & Ordering Column */}
            <div className="space-y-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-serif text-slate-900 dark:text-white leading-snug">
                  {product.name}
                </h1>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-zinc-400">
                  <span>Packaging: <strong className="text-slate-800 dark:text-zinc-200 font-bold">{product.unit}</strong></span>
                  <span>•</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {product.stock} units in stock
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                {product.description}
              </p>

              {/* Wholesale Tier Table */}
              <div className="bg-slate-50 dark:bg-[#161616] rounded-2xl p-4 border border-slate-200 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300">
                    Tiered Volume Pricing
                  </span>
                  <span className="text-[11px] text-[#F27D26] font-bold">
                    MOQ: {product.minOrderQty || 1} units
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  {product.wholesaleTiers?.map((tier, idx) => {
                    const isActive = quantity >= tier.minQty && (
                      idx === (product.wholesaleTiers.length - 1) ||
                      quantity < product.wholesaleTiers[idx + 1].minQty
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border transition-all overflow-hidden min-w-0 ${
                          isActive
                            ? 'bg-[#F27D26] text-black border-[#F27D26] shadow-md ring-2 ring-[#F27D26]/40 font-bold'
                            : 'bg-white dark:bg-white/5 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-white/5'
                        }`}
                      >
                        <div className={`text-[10px] font-semibold truncate ${isActive ? 'text-black font-bold' : 'text-slate-500 dark:text-zinc-400'}`}>
                          {tier.minQty}+ units
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold mt-0.5 tracking-tight truncate">
                          {formatPrice(tier.pricePerUnit)}
                        </div>
                        {tier.discountPercentage ? (
                          <div className={`text-[9px] font-bold mt-0.5 truncate ${isActive ? 'text-black' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            -{tier.discountPercentage}%
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Stepper & Price Calculation */}
              <div className="bg-slate-100 dark:bg-[#161616] rounded-2xl p-4 space-y-3 shadow-inner dark:shadow-xl border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-zinc-300">Order Quantity:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 10)}
                      className="px-2 py-1 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-[11px] font-mono text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-white/5 font-bold cursor-pointer"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 10)}
                      className="px-2 py-1 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-[11px] font-mono text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-white/5 font-bold cursor-pointer"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 50)}
                      className="px-2 py-1 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-[11px] font-mono text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-white/5 font-bold cursor-pointer"
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 100)}
                      className="px-2 py-1 bg-white dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-[11px] font-mono text-slate-800 dark:text-zinc-300 border border-slate-200 dark:border-white/5 font-bold cursor-pointer"
                    >
                      +100
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min={product.minOrderQty || 1}
                      value={quantity}
                      onChange={e => handleQuantityChange(parseInt(e.target.value) || (product.minOrderQty || 1))}
                      className="w-16 text-center font-bold text-sm bg-transparent outline-none text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 text-right min-w-0">
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                      Rate: <strong className="text-slate-900 dark:text-zinc-100 font-bold">{formatPrice(currentTierPrice)}</strong> / unit
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-[#F27D26] tracking-tight whitespace-nowrap">
                      {formatPrice(lineSubtotal)}
                    </div>
                  </div>
                </div>

                {totalSavings > 0 && (
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/30 p-2.5 rounded-xl flex items-center justify-between font-bold">
                    <span>Bulk Tier Savings:</span>
                    <span>+{formatPrice(totalSavings)} ({savingsPercent}% saved)</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full py-3 px-4 rounded-xl btn-primary-morphic text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 btn-hover cursor-pointer whitespace-nowrap"
                >
                  <ShoppingCart className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                  <span className="whitespace-nowrap">Add {quantity} Units to Wholesale Cart</span>
                </button>
              </div>

              {/* Inquiry & RFQ Shortcuts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onOpenSupportWithProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSupportWithProduct(product);
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors btn-hover cursor-pointer whitespace-nowrap"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
                    <span className="whitespace-nowrap">Live Desk Inquiry</span>
                  </button>
                )}

                {onNavigateToRfq && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToRfq(product);
                      onClose();
                    }}
                    className="py-2.5 px-3 rounded-xl border border-[#F27D26]/40 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#e06d1a] dark:text-[#F27D26] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors btn-hover cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="whitespace-nowrap">Request Factory RFQ</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* Technical Specifications Table */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="border-t border-slate-200 dark:border-white/5 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300 mb-3">
                Technical Specifications & Compliance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {Object.entries(product.specs).map(([key, val], idx) => (
                  <div key={idx} className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5">
                    <span className="font-semibold text-slate-500 dark:text-zinc-400">{key}:</span>
                    <span className="text-slate-900 dark:text-zinc-100 font-bold text-right ml-2">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  ) : null;
};
