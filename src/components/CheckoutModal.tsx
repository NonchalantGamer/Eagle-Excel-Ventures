import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  Truck, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  Sparkles,
  Zap,
  Lock,
  RotateCcw,
  Printer,
  ExternalLink,
  AlertCircle,
  Clock,
  Banknote
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import { getBrandLogo } from '../constants/branding';
import { useToast } from './Toast';
import { createOrderInDatabase } from '../services/orderService';
import { initiateFlutterwavePayment, verifyFlutterwaveTransaction } from '../services/flutterwave';
import { Order, OrderItem, PaymentMethod } from '../types';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
  onOpenAuth: () => void;
}

type CheckoutStep = 'form' | 'processing' | 'verifying' | 'confirmed';

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
  onOpenAuth
}) => {
  const { items, subtotal, shippingCost, tax, total, clearCart } = useCart();
  const { currentUser, userProfile } = useAuth();
  const { formatPrice, convertPrice, currency: currentCurrency } = useCurrency();
  const { isDark } = useTheme();
  const { showToast } = useToast();

  const [companyName, setCompanyName] = useState(userProfile?.companyName || 'Enterprise Procurement Ltd');
  const [customerName, setCustomerName] = useState(userProfile?.displayName || 'Wholesale Buyer');
  const [customerEmail, setCustomerEmail] = useState(userProfile?.email || currentUser?.email || 'buyer@company.com');
  const [phone, setPhone] = useState(userProfile?.phone || '+234 800 123 4567');

  const [street, setStreet] = useState(userProfile?.address?.street || '1040 Logistics Park Ave, Suite 400');
  const [city, setCity] = useState(userProfile?.address?.city || 'Lagos');
  const [state, setState] = useState(userProfile?.address?.state || 'Lagos');
  const [postalCode, setPostalCode] = useState(userProfile?.address?.postalCode || '100001');
  const [country, setCountry] = useState(userProfile?.address?.country || 'Nigeria');

  const [paymentMethod, setPaymentMethod] = useState<'flutterwave' | 'cod'>('flutterwave');
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  const [step, setStep] = useState<CheckoutStep>('form');
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useModalFocusLock(isOpen, onClose);

  useEffect(() => {
    if (userProfile) {
      if (userProfile.companyName) setCompanyName(userProfile.companyName);
      if (userProfile.displayName) setCustomerName(userProfile.displayName);
      if (userProfile.email) setCustomerEmail(userProfile.email);
      if (userProfile.phone) setPhone(userProfile.phone);
      if (userProfile.address) {
        if (userProfile.address.street) setStreet(userProfile.address.street);
        if (userProfile.address.city) setCity(userProfile.address.city);
        if (userProfile.address.state) setState(userProfile.address.state);
        if (userProfile.address.postalCode) setPostalCode(userProfile.address.postalCode);
        if (userProfile.address.country) setCountry(userProfile.address.country);
      }
    }
  }, [userProfile]);

  if (!isOpen) return null;

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCreateOrderAndPay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      onOpenAuth();
      showToast('Please sign in or create an account to place wholesale orders.', 'info');
      return;
    }

    if (items.length === 0) {
      showToast('Your wholesale cart is empty.', 'error');
      return;
    }

    setErrorMessage('');
    setStep('processing');
    setStatusMessage('1/5: Creating Purchase Order in database...');

    try {
      const orderItems: OrderItem[] = items.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        image: item.product.images[0] || '',
        quantity: item.quantity,
        unitPrice: item.selectedTierPrice,
        unit: item.product.unit,
        subtotal: item.subtotal
      }));

      // STEP 1: Order Created & Payment = Pending
      const orderData = {
        userId: currentUser.uid,
        customerEmail,
        customerName,
        companyName,
        phone,
        items: orderItems,
        subtotal,
        shippingCost,
        tax,
        total,
        currency: currentCurrency || 'NGN',
        status: 'pending' as const,             // Order created
        paymentStatus: 'pending' as const,      // Payment = pending
        shippingAddress: {
          street,
          city,
          state,
          postalCode,
          country
        },
        paymentMethod,
        notes: `${poNumber ? `PO Ref: ${poNumber}. ` : ''}${notes || ''}`.trim()
      };

      const newOrder = await createOrderInDatabase(orderData);
      setCreatedOrder(newOrder);

      // If Flutterwave selected: Trigger Flutterwave Payment Gateway Flow
      if (paymentMethod === 'flutterwave') {
        setStatusMessage('2/5: Initializing Flutterwave Secure Gateway...');
        
        const chargeAmount = currentCurrency === 'USD' 
          ? Number(total.toFixed(2)) 
          : Math.round(convertPrice(total));

        await initiateFlutterwavePayment({
          order: newOrder,
          amountToCharge: chargeAmount,
          currency: currentCurrency || 'NGN',
          onSuccess: async (verifiedOrder, flwResponse) => {
            // STEP: Payment successful -> STEP: Verify transaction -> STEP: Payment = paid -> STEP: Order = confirmed
            setStep('confirmed');
            setCreatedOrder(verifiedOrder);
            clearCart();
            
            try {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch {}

            showToast(`Payment verified! Order #${verifiedOrder.orderNumber} confirmed.`, 'success');
            onOrderSuccess(verifiedOrder);
          },
          onError: (errMsg) => {
            setStep('form');
            setErrorMessage(errMsg);
            showToast(errMsg, 'error');
          },
          onClose: () => {
            setStep('form');
            showToast('Flutterwave payment window closed. Your pending order is saved in your dashboard.', 'info');
          }
        });
      } else {
        // Cash on Delivery (COD)
        setStep('confirmed');
        clearCart();
        try {
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch {}
        showToast(`Wholesale Order #${newOrder.orderNumber} submitted successfully!`);
        onOrderSuccess(newOrder);
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      setStep('form');
      setErrorMessage(err.message || 'Failed to place order. Please check your connection.');
      showToast('Failed to place order. Please check connection.', 'error');
    }
  };

  // Direct retry / simulate verification button if needed
  const handleVerifyPendingOrder = async () => {
    if (!createdOrder) return;
    setStep('verifying');
    setStatusMessage('Verifying transaction with Flutterwave API...');
    try {
      const res = await verifyFlutterwaveTransaction({
        transactionId: `FLW_TX_${Date.now()}`,
        orderId: createdOrder.id,
        txRef: createdOrder.orderNumber,
        amount: createdOrder.total,
        currency: currentCurrency || 'NGN'
      });

      if (res.success && res.order) {
        setCreatedOrder(res.order);
        setStep('confirmed');
        clearCart();
        try {
          confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
        } catch {}
        showToast(`Payment verified! Order #${res.order.orderNumber} confirmed.`, 'success');
        onOrderSuccess(res.order);
      } else {
        setStep('form');
        setErrorMessage(res.error || 'Verification could not be confirmed.');
      }
    } catch (e: any) {
      setStep('form');
      setErrorMessage(e.message || 'Verification error');
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'processing' && step !== 'verifying') {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col transition-all text-slate-900 dark:text-zinc-100 animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0f0f0f] text-slate-900 dark:text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl brand-logo-badge flex items-center justify-center p-1.5 shrink-0">
              <img 
                src={getBrandLogo(isDark)} 
                alt="Eagle Excel Ventures" 
                className="w-full h-full object-contain brand-logo-img"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-black font-serif text-slate-950 dark:text-white">Wholesale Purchase Order Checkout</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">Eagle Excel Ventures • B2B Commercial Freight Dispatch</p>
            </div>
          </div>
          {step !== 'processing' && step !== 'verifying' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors btn-hover cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* STEP: Confirmed & Paid Receipt View */}
        {step === 'confirmed' && createdOrder ? (
          <div className="p-6 overflow-y-auto overscroll-contain flex-1 space-y-6 text-xs animate-fadeIn">
            <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500 text-black rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-extrabold uppercase tracking-widest text-[10px] px-3 py-1 rounded-full border border-emerald-500/30">
                  {createdOrder.paymentStatus === 'paid' ? 'Payment Verified & Confirmed' : 'Purchase Order Registered'}
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-2 font-serif">
                  Wholesale Order #{createdOrder.orderNumber}
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1">
                  Thank you! Your purchase order has been logged into the procurement dispatch queue.
                </p>
              </div>

              {/* Transaction & Payment Status Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-2">
                <div className="bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                  <div className="text-slate-500 dark:text-zinc-400 text-[10px]">Order Status</div>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 capitalize">{createdOrder.status}</div>
                </div>
                <div className="bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                  <div className="text-slate-500 dark:text-zinc-400 text-[10px]">Payment Status</div>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">{createdOrder.paymentStatus || 'Paid'}</div>
                </div>
                <div className="bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                  <div className="text-slate-500 dark:text-zinc-400 text-[10px]">Payment Method</div>
                  <div className="font-bold text-slate-900 dark:text-zinc-100 capitalize">{createdOrder.paymentMethod.replace('_', ' ')}</div>
                </div>
                <div className="bg-white/60 dark:bg-black/40 p-2.5 rounded-xl border border-emerald-500/20">
                  <div className="text-slate-500 dark:text-zinc-400 text-[10px]">Total Paid</div>
                  <div className="font-extrabold text-[#F27D26]">{formatPrice(createdOrder.total)}</div>
                </div>
              </div>

              {createdOrder.flwTransactionId && (
                <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 bg-white/40 dark:bg-black/30 p-2 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <span>Flutterwave Tx ID: <strong className="text-slate-900 dark:text-zinc-200">{createdOrder.flwTransactionId}</strong></span>
                  <span>Ref: <strong className="text-slate-900 dark:text-zinc-200">{createdOrder.paymentReference || createdOrder.orderNumber}</strong></span>
                </div>
              )}
            </div>

            {/* Itemized summary */}
            <div className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-slate-50 dark:bg-[#161616]">
              <div className="p-3 bg-slate-100 dark:bg-white/5 font-bold uppercase text-[10px] tracking-wider text-slate-700 dark:text-zinc-300">
                Purchased Freight Items ({createdOrder.items.length})
              </div>
              <div className="divide-y divide-slate-200 dark:divide-white/5">
                {createdOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-zinc-100">{item.name}</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">SKU: {item.sku} • Qty: {item.quantity} {item.unit}</div>
                    </div>
                    <div className="font-extrabold text-[#F27D26]">{formatPrice(item.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-zinc-100 font-bold flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-white/10 transition-all btn-hover cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl btn-primary-morphic text-black font-extrabold flex items-center justify-center gap-2 transition-all btn-hover cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Done • View in Dashboard</span>
              </button>
            </div>
          </div>
        ) : step === 'processing' || step === 'verifying' ? (
          /* Processing Loading View */
          <div className="p-12 text-center flex-1 flex flex-col items-center justify-center space-y-5 animate-fadeIn">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-[#F27D26]/20 border-t-[#F27D26] rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="w-6 h-6 text-[#F27D26]" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">{statusMessage || 'Processing Transaction...'}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm">
                Securely communicating with Flutterwave and Eagle Excel verification server. Please do not refresh.
              </p>
            </div>

            {createdOrder && (
              <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-mono">
                Order #{createdOrder.orderNumber} • Amount: {formatPrice(createdOrder.total)}
              </div>
            )}
          </div>
        ) : (
          /* Scrollable Form Body */
          <form onSubmit={handleCreateOrderAndPay} className="overflow-y-auto overscroll-contain p-6 space-y-5 flex-1">
            
            {/* Transaction Flow Guide Banner */}
            <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-zinc-400 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0 font-medium">
                <span className="text-slate-400">1. Cart</span>
                <span className="text-slate-400">→</span>
                <span className="font-bold text-[#F27D26]">2. Checkout</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-slate-700 dark:text-zinc-300">3. Order Created (Pending)</span>
                <span className="text-slate-400">→</span>
                <span className="font-bold text-[#F27D26] flex items-center gap-1"><Zap className="w-3 h-3 text-[#F27D26]" /> 4. Flutterwave</span>
                <span className="text-slate-400">→</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> 5. Paid & Confirmed</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <div className="flex-1">{errorMessage}</div>
                {createdOrder && (
                  <button 
                    type="button" 
                    onClick={handleVerifyPendingOrder} 
                    className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-bold text-[11px] transition-colors"
                  >
                    Verify Now
                  </button>
                )}
              </div>
            )}

            {/* Section 1: Buyer Information */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#F27D26]" />
                1. Commercial Buyer Profile
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Company / Organization Name</label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="Acme Industrial Supplies LLC"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Buyer Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Procurement Email</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="orders@company.com"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Direct Phone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+234 800 000 0000"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Delivery & Freight Address */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#F27D26]" />
                2. Warehouse / Freight Delivery Address
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-3">
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Street Address / Facility Dock Number</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={e => setStreet(e.target.value)}
                    placeholder="4500 Industrial Parkway, Dock #12"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="Lagos"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">State / Province</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={e => setState(e.target.value)}
                    placeholder="Lagos State"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Postal Code / Country</label>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={e => setCountry(e.target.value)}
                    placeholder="Nigeria"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Commercial Payment Terms & Gateway */}
            <div className="pt-4 border-t border-slate-200 dark:border-white/5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-300 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#F27D26]" />
                  3. Payment Gateway & Terms
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> 256-Bit SSL Encrypted
                </span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Flutterwave Option - Highlighted */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('flutterwave')}
                  className={`p-3.5 rounded-2xl border text-left transition-all btn-hover relative overflow-hidden ${
                    paymentMethod === 'flutterwave'
                      ? 'border-[#F27D26] bg-[#F27D26]/10 ring-2 ring-[#F27D26]/40 shadow-sm'
                      : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#F27D26] text-black font-extrabold flex items-center justify-center text-xs">
                        <Zap className="w-4 h-4 fill-black" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                          <span>Flutterwave Instant Checkout</span>
                          <span className="bg-[#F27D26] text-black text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                          Pay instantly via Debit/Credit Card, Bank Transfer, USSD, or Mobile Money
                        </p>
                      </div>
                    </div>
                    {paymentMethod === 'flutterwave' && <CheckCircle2 className="w-5 h-5 text-[#F27D26] shrink-0" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`p-3.5 rounded-2xl border text-left transition-all btn-hover ${
                    paymentMethod === 'cod'
                      ? 'border-[#F27D26] bg-[#F27D26]/10 ring-2 ring-[#F27D26]/30'
                      : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500 text-black font-extrabold flex items-center justify-center text-xs">
                        <Banknote className="w-4 h-4 text-black" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                          <span>Cash on Delivery (COD)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Payment upon pallet delivery</p>
                      </div>
                    </div>
                    {paymentMethod === 'cod' && <CheckCircle2 className="w-5 h-5 text-[#F27D26] shrink-0" />}
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Purchase Order (PO) # (Optional)</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={e => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-9901"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1">Special Logistics / Dock Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Liftgate required, call 1hr prior"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Final Summary Review */}
            <div className="bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Items Total ({items.length} line items):</span>
                <span className="font-bold text-slate-900 dark:text-zinc-200">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Freight / Pallet Shipping:</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-200">
                  {shippingCost === 0 ? <strong className="text-emerald-600 dark:text-emerald-400">FREE Freight</strong> : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                <span>Estimated Tax (5% B2B):</span>
                <span className="font-semibold text-slate-900 dark:text-zinc-200">{formatPrice(tax)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                <span>Order Total Payable:</span>
                <span className="text-base text-[#F27D26] font-black">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl btn-primary-morphic text-black font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 btn-hover cursor-pointer whitespace-nowrap"
              >
                {paymentMethod === 'flutterwave' ? (
                  <>
                    <Zap className="w-4 h-4 text-black fill-black shrink-0" />
                    <span className="whitespace-nowrap">Proceed to Flutterwave Payment ({formatPrice(total)})</span>
                    <ArrowRight className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">Confirm & Place Wholesale Order</span>
                    <ArrowRight className="w-4 h-4 text-black stroke-[2.5] shrink-0" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>,
    document.body
  ) : null;
};
