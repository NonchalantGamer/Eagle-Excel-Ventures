import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Truck, 
  ArrowRight, 
  ShieldCheck,
  TrendingDown,
  FileDown,
  Printer,
  Check,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { CheckoutModal } from './CheckoutModal';
import { Order, CartItem } from '../types';
import { useToast } from './Toast';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface CartDrawerProps {
  onOrderSuccess: (order: Order) => void;
  onOpenAuth: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOrderSuccess, onOpenAuth }) => {
  const { 
    items, 
    itemCount, 
    subtotal, 
    shippingCost, 
    tax, 
    total, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    isCartOpen, 
    setIsCartOpen 
  } = useCart();
  const { formatPrice, currency } = useCurrency();
  const { showToast } = useToast();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isExportingQuote, setIsExportingQuote] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    items: CartItem[];
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
  } | null>(null);

  useModalFocusLock(isCartOpen, () => setIsCartOpen(false));

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      showToast('Your wholesale cart is empty.', 'error');
      return;
    }

    // 1. Snapshot cart data before clearing
    const currentCheckoutData = {
      items: [...items],
      subtotal,
      shippingCost,
      tax: 0,
      total
    };
    setCheckoutData(currentCheckoutData);

    // 2. Clear the cart immediately so no items are left there
    clearCart();

    // 3. Open the checkout modal and close the cart drawer
    setIsCheckoutOpen(true);
    setIsCartOpen(false);
  };

  if (!isCartOpen && !isCheckoutOpen) return null;

  const freeShippingThreshold = 1500;
  const progressToFreeShipping = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  // Compute total wholesale tier savings across all cart items
  const totalBaseValue = items.reduce((acc, item) => acc + (item.quantity * item.product.price), 0);
  const totalVolumeSavings = Math.max(0, totalBaseValue - subtotal);

  const handlePrintProFormaQuote = () => {
    setIsExportingQuote(true);
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast('Pop-up blocked. Please allow pop-ups to print quote.', 'error');
        setIsExportingQuote(false);
        return;
      }

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const quoteHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Eagle Excel Ventures - Pro-Forma B2B Quotation</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px; margin: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #F27D26; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 24px; font-weight: bold; color: #111; }
            .badge { background: #F27D26; color: #000; font-weight: bold; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
            .meta { font-size: 13px; color: #666; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { text-align: left; background: #f4f4f5; padding: 10px; border-bottom: 1px solid #ddd; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; }
            .totals { margin-top: 30px; margin-left: auto; width: 300px; font-size: 14px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-grand { font-size: 18px; font-weight: bold; border-top: 2px solid #111; padding-top: 10px; margin-top: 10px; color: #e06d1a; }
            .terms { margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">Eagle Excel Ventures</div>
              <div class="meta">Global B2B Wholesale & Supply Chain Operations</div>
              <div class="meta">Quote Date: ${dateStr}</div>
            </div>
            <div style="text-align: right;">
              <span class="badge">OFFICIAL PRO-FORMA QUOTE</span>
              <div class="meta" style="margin-top: 10px;">Ref: EEV-${Math.floor(100000 + Math.random() * 900000)}</div>
              <div class="meta">Currency: ${currency}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item & SKU</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Unit Rate</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>
                    <strong>${item.product.name}</strong><br/>
                    <span style="color: #666; font-size: 11px;">SKU: ${item.product.sku}</span>
                  </td>
                  <td>${item.product.category}</td>
                  <td>${item.quantity} units</td>
                  <td>${formatPrice(item.selectedTierPrice)}</td>
                  <td style="text-align: right;">${formatPrice(item.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

            <div class="totals">
              <div class="totals-row">
                <span>Subtotal:</span>
                <strong>${formatPrice(subtotal)}</strong>
              </div>
              ${totalVolumeSavings > 0 ? `
                <div class="totals-row" style="color: #16a34a;">
                  <span>Volume Tier Savings:</span>
                  <strong>-${formatPrice(totalVolumeSavings)}</strong>
                </div>
              ` : ''}
              <div class="totals-row">
                <span>Est. Freight Shipping:</span>
                <strong>${shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</strong>
              </div>
              <div class="totals-row totals-grand">
                <span>Estimated Total:</span>
                <span>${formatPrice(total)}</span>
              </div>
            </div>

          <div class="terms">
            <strong>Terms & Notes:</strong><br/>
            - Prices guaranteed for 14 calendar days from quotation date.<br/>
            - Net 30, Wire Transfer, and Escrow B2B payment terms supported.<br/>
            - For factory procurement inquiries or container bookings, contact procurement@eagleexcel.com.
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(quoteHtml);
      printWindow.document.close();
      showToast('Generated official Pro-Forma B2B Quotation Sheet', 'success');
    } catch (err) {
      console.error('Error printing quote:', err);
      showToast('Unable to generate quote sheet', 'error');
    } finally {
      setIsExportingQuote(false);
    }
  };

  return (
    <>
      {isCartOpen && typeof document !== 'undefined' && createPortal(
        <div data-portal-modal="true" className="fixed inset-0 z-[99990] isolate overflow-hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity animate-fadeIn"
          />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
          <div className="w-screen max-w-md bg-white dark:bg-[#121212] shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 transition-colors duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#0f0f0f] flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl icon-morphism icon-morphism-accent flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-[#F27D26]" />
                </div>
                <div>
                  <h2 className="text-base font-bold font-serif text-slate-900 dark:text-white">Wholesale Cart</h2>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">B2B Purchase Order</span>
                </div>
                <span className="bg-[#F27D26] text-black text-xs px-2 py-0.5 rounded-full font-extrabold shadow-xs ml-1">
                  {itemCount} units
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors btn-hover"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Freight Info Bar */}
            <div className="bg-slate-100 dark:bg-[#161616] px-4 py-2.5 border-b border-slate-200 dark:border-white/5 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-[#F27D26]" />
                Est. Freight Logistics:
              </span>
              <span className="font-bold text-slate-900 dark:text-zinc-100">
                {shippingCost === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">FREE FREIGHT</span>
                ) : (
                  formatPrice(shippingCost)
                )}
              </span>
            </div>

            {/* Total Bulk Savings Banner */}
            {totalVolumeSavings > 0 && (
              <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border-b border-emerald-500/20 px-4 py-2 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Unlocked Wholesale Tier Savings:</span>
                </div>
                <span className="font-extrabold">{formatPrice(totalVolumeSavings)}</span>
              </div>
            )}

            {/* Line Items List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-zinc-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-600 icon-morphism">
                    <ShoppingCart className="w-8 h-8 text-[#F27D26]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-zinc-200 text-sm">Your Wholesale Cart is Empty</h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-xs leading-relaxed">
                      Explore our product catalog to add master cartons, pallets, and bulk products with tiered discounts.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="py-2.5 px-5 rounded-xl btn-primary-morphic text-xs font-bold btn-hover cursor-pointer"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                items.map(item => {
                  const minQty = item.product.minOrderQty || 1;
                  const isBelowMoq = item.quantity < minQty;

                  return (
                    <div 
                      key={item.product.id}
                      className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 rounded-2xl p-3 flex gap-3 text-xs shadow-sm hover:shadow-md transition-shadow"
                    >
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-100 dark:bg-black border border-slate-200 dark:border-white/5 shrink-0" 
                      />

                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 block truncate">SKU: {item.product.sku}</span>
                            <h4 className="font-bold text-slate-900 dark:text-zinc-100 line-clamp-1 text-xs sm:text-sm">{item.product.name}</h4>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* MOQ Warning & Auto-Snap */}
                        {isBelowMoq && (
                          <div className="my-1.5 p-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/20 rounded-lg flex items-center justify-between gap-2 text-[10px] text-amber-800 dark:text-amber-300">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                              Below MOQ ({minQty})
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.product.id, minQty)}
                              className="font-bold underline text-amber-900 dark:text-amber-200 hover:text-amber-950"
                            >
                              Snap to {minQty}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2">
                          {/* Quantity Stepper */}
                          <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg p-0.5 shrink-0">
                            <button
                              onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-bold font-mono text-slate-900 dark:text-zinc-100 text-xs">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Price Breakdown */}
                          <div className="text-right shrink-0 whitespace-nowrap">
                            <span className="text-[10px] text-slate-500 dark:text-zinc-500 block whitespace-nowrap">
                              {formatPrice(item.selectedTierPrice)}/unit
                            </span>
                            <span className="font-extrabold text-[#F27D26] text-xs sm:text-sm whitespace-nowrap block">
                              {formatPrice(item.subtotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer Footer & Actions */}
            {items.length > 0 && (
              <div className="p-4 bg-slate-50 dark:bg-[#0f0f0f] border-t border-slate-200 dark:border-white/5 space-y-3 shrink-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-zinc-200">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Est. Freight Shipping:</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-200">
                      {shippingCost === 0 ? <strong className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</strong> : formatPrice(shippingCost)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 flex justify-between text-sm font-bold text-slate-900 dark:text-zinc-100">
                    <span>Grand Total:</span>
                    <span className="text-[#F27D26] text-base font-extrabold">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={handleProceedToCheckout}
                  className="w-full py-3 px-4 rounded-xl btn-primary-morphic text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 btn-hover cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-black stroke-[2.5]" />
                  Proceed to B2B Checkout
                  <ArrowRight className="w-4 h-4 text-black stroke-[2.5]" />
                </button>

                {/* Secondary Action: Print / Download Pro-Forma Quote */}
                <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                  <button
                    type="button"
                    onClick={handlePrintProFormaQuote}
                    disabled={isExportingQuote}
                    className="inline-flex items-center gap-1.5 text-slate-700 dark:text-zinc-300 hover:text-[#F27D26] dark:hover:text-[#F27D26] font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Pro-Forma Quote
                  </button>

                  <button 
                    onClick={() => {
                      clearCart();
                      showToast('Wholesale cart emptied', 'info');
                    }} 
                    className="text-slate-500 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 underline text-[11px] cursor-pointer"
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="text-center text-[10px] text-slate-400 dark:text-zinc-500 pt-0.5">
                  Instant Flutterwave Checkout & Cash on Delivery supported
                </div>
              </div>
            )}

          </div>
        </div>
      </div>,
      document.body
    )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setCheckoutData(null);
        }}
        onOrderSuccess={(order) => {
          setIsCheckoutOpen(false);
          setCheckoutData(null);
          onOrderSuccess(order);
        }}
        onOpenAuth={onOpenAuth}
        checkoutData={checkoutData}
      />
    </>
  );
};
