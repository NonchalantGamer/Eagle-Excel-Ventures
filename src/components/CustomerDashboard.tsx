import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, 
  Search, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ExternalLink, 
  Building2, 
  DollarSign, 
  ChevronRight, 
  ShoppingBag,
  RotateCcw,
  Printer,
  X,
  AlertTriangle,
  Ban,
  CreditCard,
  RefreshCw,
  Loader2,
  Trash2,
  ArrowUpDown,
  SlidersHorizontal
} from 'lucide-react';
import { Order, OrderStatus, Product, OrderItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { subscribeToOrders, getLocalCachedOrders, cancelOrder, deleteOrder } from '../services/orderService';
import { getCachedProducts } from '../services/productService';
import { initiateFlutterwavePayment } from '../services/flutterwave';
import { useToast } from './Toast';
import { OrderListSkeleton, DashboardMetricsSkeleton } from './ui/Skeleton';
import { useModalFocusLock } from '../hooks/useModalFocusLock';

export const CustomerDashboard: React.FC = () => {
  const { currentUser, userProfile, isHydrated } = useAuth();
  const { addToCart, addMultipleToCart, setIsCartOpen } = useCart();
  const { formatPrice, convertPrice, currency: currentCurrency } = useCurrency();
  const { showToast } = useToast();

  const [orders, setOrders] = useState<Order[]>(() => {
    return currentUser ? getLocalCachedOrders(currentUser.uid, false) : [];
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Changed requirements');
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useModalFocusLock(Boolean(selectedOrder || orderToCancel || orderToDelete), () => {
    if (orderToDelete) setOrderToDelete(null);
    else if (orderToCancel) setOrderToCancel(null);
    else setSelectedOrder(null);
  });

  useEffect(() => {
    if (!currentUser) {
      setOrders([]);
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToOrders(currentUser.uid, false, (fetchedOrders) => {
      setOrders(fetchedOrders);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleRetryPayment = async (order: Order) => {
    if (order.paymentStatus === 'paid' || order.status === 'cancelled') {
      showToast('This order does not require payment.', 'info');
      return;
    }

    setRetryingOrderId(order.id);
    showToast(`Launching Flutterwave checkout for Order #${order.orderNumber}...`, 'info');

    const chargeAmount = currentCurrency === 'USD' 
      ? Number(order.total.toFixed(2)) 
      : Math.round(convertPrice(order.total));

    try {
      await initiateFlutterwavePayment({
        order,
        amountToCharge: chargeAmount,
        currency: currentCurrency || 'NGN',
        onSuccess: (verifiedOrder) => {
          showToast(`Payment successful! Order #${verifiedOrder.orderNumber} is now confirmed.`, 'success');
          setOrders(prev => prev.map(o => o.id === verifiedOrder.id ? verifiedOrder : o));
          if (selectedOrder?.id === verifiedOrder.id) {
            setSelectedOrder(verifiedOrder);
          }
          setRetryingOrderId(null);
        },
        onError: (errorMsg) => {
          showToast(`Payment error: ${errorMsg}`, 'error');
          setRetryingOrderId(null);
        },
        onClose: () => {
          showToast('Payment window closed without completion. You can retry anytime.', 'info');
          setRetryingOrderId(null);
        }
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to initialize payment gateway.', 'error');
      setRetryingOrderId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    setCancellingOrderId(orderToCancel.id);
    try {
      const res = await cancelOrder(orderToCancel.id, cancelReason);
      if (res.success) {
        showToast(`Order ${orderToCancel.orderNumber} has been successfully cancelled.`, 'info');
        setOrders(prev => prev.map(o => o.id === orderToCancel.id ? { ...o, status: 'cancelled' as OrderStatus, rejectionReason: cancelReason } : o));
        if (selectedOrder?.id === orderToCancel.id) {
          setSelectedOrder(prev => prev ? { ...prev, status: 'cancelled' as OrderStatus, rejectionReason: cancelReason } : null);
        }
        setOrderToCancel(null);
      } else {
        showToast(res.error || 'Failed to cancel order.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'An unexpected error occurred.', 'error');
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setDeletingOrderId(orderToDelete.id);
    try {
      const success = await deleteOrder(orderToDelete.id);
      if (success) {
        showToast(`Order #${orderToDelete.orderNumber} deleted from records.`, 'success');
        setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
        if (selectedOrder?.id === orderToDelete.id) {
          setSelectedOrder(null);
        }
        setOrderToDelete(null);
      } else {
        showToast('Failed to delete transaction. Please try again.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'An unexpected error occurred while deleting.', 'error');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const handleReorder = (order: Order) => {
    if (!order || !order.items || order.items.length === 0) {
      showToast('No items found in this order to reorder.', 'error');
      return;
    }

    const cachedProducts = getCachedProducts();

    const itemsToAdd = order.items.map(orderItem => {
      const matched = cachedProducts.find(
        p => p.id === orderItem.productId || (p.sku && orderItem.sku && p.sku.toLowerCase() === orderItem.sku.toLowerCase())
      );

      const product: Product = matched || {
        id: orderItem.productId,
        name: orderItem.name,
        sku: orderItem.sku || `SKU-${orderItem.productId}`,
        category: 'General',
        description: orderItem.name,
        price: orderItem.unitPrice,
        wholesaleTiers: [{ minQty: 1, pricePerUnit: orderItem.unitPrice }],
        stock: 9999,
        minOrderQty: 1,
        unit: orderItem.unit || 'Unit',
        images: [orderItem.image || ''],
        specs: {},
        createdAt: new Date().toISOString()
      };

      return {
        product,
        quantity: orderItem.quantity
      };
    });

    addMultipleToCart(itemsToAdd);

    const totalUnits = order.items.reduce((sum, item) => sum + item.quantity, 0);
    showToast(`Added ${order.items.length} item(s) (${totalUnits} total units) from Order #${order.orderNumber} to your cart!`, 'success');
  };

  const handleReorderSingleItem = (orderItem: OrderItem) => {
    const cachedProducts = getCachedProducts();
    const matched = cachedProducts.find(
      p => p.id === orderItem.productId || (p.sku && orderItem.sku && p.sku.toLowerCase() === orderItem.sku.toLowerCase())
    );

    const product: Product = matched || {
      id: orderItem.productId,
      name: orderItem.name,
      sku: orderItem.sku || `SKU-${orderItem.productId}`,
      category: 'General',
      description: orderItem.name,
      price: orderItem.unitPrice,
      wholesaleTiers: [{ minQty: 1, pricePerUnit: orderItem.unitPrice }],
      stock: 9999,
      minOrderQty: 1,
      unit: orderItem.unit || 'Unit',
      images: [orderItem.image || ''],
      specs: {},
      createdAt: new Date().toISOString()
    };

    addToCart(product, orderItem.quantity);
    showToast(`Added ${orderItem.quantity}x ${orderItem.name} to your cart!`, 'success');
  };

  const isDeletable = (order: Order) => order.status === 'cancelled' || order.paymentStatus === 'failed';

  const processedOrders = useMemo(() => {
    // 1. Filter
    const filtered = orders.filter(order => {
      let matchesStatus = true;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'paid' || statusFilter === 'confirmed') {
        matchesStatus = order.paymentStatus === 'paid' || order.status === 'confirmed';
      } else if (statusFilter === 'pending') {
        matchesStatus = order.status === 'pending' || order.paymentStatus === 'pending';
      } else if (statusFilter === 'cancelled') {
        matchesStatus = order.status === 'cancelled';
      } else if (statusFilter === 'failed') {
        matchesStatus = order.paymentStatus === 'failed';
      } else {
        matchesStatus = order.status === statusFilter;
      }

      const term = searchQuery.toLowerCase().trim();
      const matchesSearch = !term ||
        order.orderNumber.toLowerCase().includes(term) ||
        (order.trackingNumber && order.trackingNumber.toLowerCase().includes(term)) ||
        order.items.some(i => i.name.toLowerCase().includes(term) || (i.sku && i.sku.toLowerCase().includes(term)));

      return matchesStatus && matchesSearch;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'amount_desc':
          return (b.total || 0) - (a.total || 0);
        case 'amount_asc':
          return (a.total || 0) - (b.total || 0);
        case 'status_priority': {
          const getRank = (o: Order) => {
            if (o.paymentStatus === 'paid' || o.status === 'confirmed') return 1;
            if (o.status === 'processing') return 2;
            if (o.status === 'shipped') return 3;
            if (o.status === 'delivered') return 4;
            if (o.status === 'pending') return 5;
            if (o.status === 'cancelled') return 6;
            if (o.paymentStatus === 'failed') return 7;
            return 8;
          };
          return getRank(a) - getRank(b);
        }
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [orders, statusFilter, sortBy, searchQuery]);

  const totalSpent = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const activeOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'processing' || o.status === 'shipped').length;

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> Pending Review</span>;
      case 'confirmed':
        return <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Confirmed & Verified</span>;
      case 'processing':
        return <span className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Package className="w-3 h-3" /> Processing & Packing</span>;
      case 'shipped':
        return <span className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><Truck className="w-3 h-3" /> In Transit / Shipped</span>;
      case 'delivered':
        return <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
      case 'cancelled':
        return <span className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"><XCircle className="w-3 h-3" /> Cancelled</span>;
      default:
        return null;
    }
  };

  const getPaymentStatusBadge = (order: Order) => {
    if (order.paymentStatus === 'paid') {
      return (
        <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
          Paid
        </span>
      );
    }
    return (
      <span className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
        Payment Pending
      </span>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full py-2 sm:py-4 space-y-6 animate-fadeIn text-slate-900 dark:text-zinc-100 transition-colors duration-300">
      
      {/* Top Customer Banner & Stats */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-[#181818] dark:via-[#121212] dark:to-[#0a0a0a] text-slate-900 dark:text-white rounded-3xl p-6 sm:p-8 shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/5 reveal-on-scroll">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="bg-[#F27D26]/10 text-[#F27D26] text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-[#F27D26]/30">
                Verified B2B Buyer
              </span>
              <span className="text-slate-500 dark:text-zinc-500 text-xs font-mono">
                ID: {currentUser?.uid.slice(0, 10)}...
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 dark:text-white">
              {userProfile?.companyName || 'Enterprise Procurement Dashboard'}
            </h1>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              Primary Buyer: <strong className="text-slate-900 dark:text-zinc-200">{userProfile?.displayName || currentUser?.displayName || 'Wholesale Buyer'}</strong> ({currentUser?.email})
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center shrink-0">
            <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Total Orders</div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{orders.length}</div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Active Orders</div>
              <div className="text-xl font-extrabold text-[#F27D26] mt-1">{activeOrdersCount}</div>
            </div>
            <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-2xl border border-slate-200 dark:border-white/5">
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-semibold">Total Volume</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {formatPrice(totalSpent)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter, Sort and Search Toolbar */}
      <div className="bg-white dark:bg-[#161616] rounded-2xl p-4 border border-slate-200 dark:border-white/5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 text-xs no-scrollbar">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'paid', label: 'Paid / Confirmed' },
              { id: 'pending', label: 'Pending' },
              { id: 'processing', label: 'Processing' },
              { id: 'shipped', label: 'In Transit' },
              { id: 'delivered', label: 'Delivered' },
              { id: 'cancelled', label: 'Cancelled' },
              { id: 'failed', label: 'Failed' }
            ].map(status => (
              <button
                key={status.id}
                onClick={() => setStatusFilter(status.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all btn-hover cursor-pointer ${
                  statusFilter === status.id
                    ? 'bg-[#F27D26] text-black shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
            {/* Sort Dropdown */}
            <div className="relative w-full sm:w-auto flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#F27D26] shrink-0" />
              <label htmlFor="customer-sort-select" className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 whitespace-nowrap">Sort:</label>
              <select
                id="customer-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort orders by date, amount, or status"
                className="bg-transparent text-xs font-semibold text-slate-900 dark:text-zinc-100 focus:outline-none cursor-pointer pr-2"
              >
                <option value="date_desc" className="bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-zinc-100">Date: Newest First</option>
                <option value="date_asc" className="bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-zinc-100">Date: Oldest First</option>
                <option value="amount_desc" className="bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-zinc-100">Total Amount: High to Low</option>
                <option value="amount_asc" className="bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-zinc-100">Total Amount: Low to High</option>
                <option value="status_priority" className="bg-white dark:bg-[#1e1e1e] text-slate-900 dark:text-zinc-100">Status: Paid → Pending → Cancelled</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search PO #, tracking, SKU..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:border-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <OrderListSkeleton count={4} />
      ) : processedOrders.length === 0 ? (
        <div className="bg-white dark:bg-[#161616] rounded-2xl p-12 text-center border border-slate-200 dark:border-white/5 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 dark:text-zinc-500 mx-auto icon-morphism">
            <ShoppingBag className="w-8 h-8 text-[#F27D26]" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-base">No Purchase Orders Found</h3>
          <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {orders.length === 0
              ? 'You have not placed any wholesale orders yet. Browse our catalog to place your first commercial order.'
              : 'No orders match your current filter and sort criteria.'}
          </p>
          {(statusFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => { setStatusFilter('all'); setSearchQuery(''); }}
              className="text-xs font-bold text-[#F27D26] hover:underline cursor-pointer pt-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {processedOrders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-slate-300 dark:hover:border-white/20 flex flex-col md:flex-row md:items-center justify-between gap-4 btn-hover"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-zinc-100">
                    {order.orderNumber}
                  </span>
                  {getStatusBadge(order.status)}
                  {getPaymentStatusBadge(order)}
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                    Placed on {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Items preview */}
                <div className="flex items-center gap-2 overflow-x-auto text-xs text-slate-700 dark:text-zinc-300">
                  {order.items.slice(0, 3).map((item, i) => (
                    <span key={i} className="bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5 shrink-0 font-medium">
                      {item.quantity}x {item.name.slice(0, 28)}...
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="text-slate-500 dark:text-zinc-500 text-[11px] font-semibold">
                      +{order.items.length - 3} more items
                    </span>
                  )}
                </div>

                {/* Tracking information if shipped */}
                {order.trackingNumber && (
                  <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 px-3 py-1.5 rounded-lg flex items-center gap-2 max-w-fit">
                    <Truck className="w-3.5 h-3.5 text-[#F27D26]" />
                    <span>Carrier: <strong className="text-slate-900 dark:text-zinc-100">{order.carrier || 'Freight Logistics'}</strong> • Tracking: <strong className="text-slate-900 dark:text-zinc-100 font-mono">{order.trackingNumber}</strong></span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 sm:gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/5 shrink-0">
                <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Reorder Button */}
                  <button
                    type="button"
                    onClick={() => handleReorder(order)}
                    className="px-3 py-1.5 rounded-xl border border-[#F27D26]/40 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] text-xs font-extrabold transition-all flex items-center gap-1.5 btn-hover cursor-pointer shadow-sm"
                    title={`Add all ${order.items.length} item(s) from Order #${order.orderNumber} back into cart`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reorder</span>
                  </button>

                  {order.status !== 'cancelled' && order.paymentStatus !== 'paid' && (
                    <>
                      <button
                        disabled={retryingOrderId === order.id}
                        onClick={() => handleRetryPayment(order)}
                        className="px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold transition-all flex items-center gap-1.5 btn-hover cursor-pointer disabled:opacity-50 shadow-sm"
                        title="Retry checkout via Flutterwave"
                      >
                        {retryingOrderId === order.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                            <span>Opening...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Retry Payment</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setOrderToCancel(order)}
                        className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-hover cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}

                  {/* Delete button for cancelled / failed orders */}
                  {isDeletable(order) && (
                    <button
                      onClick={() => setOrderToDelete(order)}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-hover cursor-pointer"
                      title="Delete failed or cancelled transaction record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500 block">Total Amount</span>
                  <span className="text-lg font-extrabold text-[#F27D26]">
                    {formatPrice(order.total)}
                  </span>
                </div>

                <div className="flex items-center text-xs font-bold text-[#F27D26] gap-1">
                  <span>View Invoice</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed Order Invoice Modal */}
      {selectedOrder && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedOrder(null);
          }}
        >
          <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col text-slate-900 dark:text-zinc-100 animate-scaleUp">
            
            {/* Header */}
            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-[#0f0f0f] flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-white/5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-serif text-slate-900 dark:text-white">Wholesale Order Invoice</h2>
                  <span className="text-xs font-mono bg-[#F27D26] px-2 py-0.5 rounded text-black font-extrabold">
                    {selectedOrder.orderNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors btn-hover cursor-pointer"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors btn-hover cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Invoice Content */}
            <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-6 text-xs text-slate-700 dark:text-zinc-300">
              
              {/* Order Status Timeline Tracker */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-300 mb-3 flex items-center justify-between">
                  <span>Shipment & Fulfillment Status</span>
                  {getPaymentStatusBadge(selectedOrder)}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className={`p-2 rounded-xl border ${
                    selectedOrder.status !== 'cancelled'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500'
                  }`}>
                    1. PO Created
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    ['confirmed', 'processing', 'shipped', 'delivered'].includes(selectedOrder.status) || selectedOrder.paymentStatus === 'paid'
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                      : selectedOrder.status === 'pending'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-300 font-bold animate-pulse'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500'
                  }`}>
                    2. Paid & Confirmed
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    ['processing', 'shipped', 'delivered'].includes(selectedOrder.status)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                      : selectedOrder.status === 'confirmed'
                      ? 'bg-blue-500/15 border-blue-500/30 text-blue-800 dark:text-blue-300 font-bold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500'
                  }`}>
                    3. Processing
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    ['shipped', 'delivered'].includes(selectedOrder.status)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold'
                      : selectedOrder.status === 'processing'
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-800 dark:text-purple-300 font-bold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500'
                  }`}>
                    4. Shipped Freight
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    selectedOrder.status === 'delivered'
                      ? 'bg-[#F27D26] text-black font-extrabold'
                      : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400 dark:text-zinc-500'
                  }`}>
                    5. Delivered
                  </div>
                </div>

                {selectedOrder.flwTransactionId && (
                  <div className="mt-3 text-[11px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 p-2.5 rounded-xl flex items-center justify-between">
                    <span>Flutterwave Tx ID: <strong>{selectedOrder.flwTransactionId}</strong></span>
                    <span>Verified Ref: <strong>{selectedOrder.paymentReference || selectedOrder.orderNumber}</strong></span>
                  </div>
                )}

                {selectedOrder.trackingNumber && (
                  <div className="mt-3 text-xs bg-white dark:bg-[#121212] p-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 flex justify-between items-center">
                    <span>Carrier: <strong className="text-slate-900 dark:text-zinc-100">{selectedOrder.carrier || 'Freight Logistics'}</strong></span>
                    <span>Tracking #: <strong className="font-mono text-[#F27D26] font-bold">{selectedOrder.trackingNumber}</strong></span>
                  </div>
                )}
              </div>

              {/* Parties Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="font-bold uppercase text-[10px] tracking-wider text-slate-500 dark:text-zinc-500">
                    B2B Customer Details
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedOrder.companyName || 'Enterprise Buyer'}</div>
                  <div>Contact: <span className="text-slate-900 dark:text-zinc-100 font-medium">{selectedOrder.customerName}</span></div>
                  <div>Email: <span className="text-slate-900 dark:text-zinc-100 font-medium">{selectedOrder.customerEmail}</span></div>
                  <div>Phone: <span className="text-slate-900 dark:text-zinc-100 font-medium">{selectedOrder.phone || 'N/A'}</span></div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/5 space-y-1">
                  <div className="font-bold uppercase text-[10px] tracking-wider text-slate-500 dark:text-zinc-500">
                    Shipping & Payment Terms
                  </div>
                  <div><strong className="text-slate-900 dark:text-zinc-200">Address:</strong> {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} {selectedOrder.shippingAddress?.postalCode}</div>
                  <div><strong className="text-slate-900 dark:text-zinc-200">Payment Term:</strong> <span className="capitalize text-slate-900 dark:text-zinc-100 font-semibold">{selectedOrder.paymentMethod?.replace('_', ' ')}</span></div>
                  {selectedOrder.notes && <div><strong className="text-slate-900 dark:text-zinc-200">Notes:</strong> {selectedOrder.notes}</div>}
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="font-bold uppercase text-[11px] tracking-wider mb-2 text-slate-900 dark:text-zinc-300 flex items-center justify-between">
                  <span>Itemized Products</span>
                  <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400">
                    {selectedOrder.items.length} line item(s)
                  </span>
                </div>
                <div className="border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden bg-white dark:bg-[#161616]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-zinc-300 text-[11px] font-bold border-b border-slate-200 dark:border-white/5">
                      <tr>
                        <th className="p-3">Product</th>
                        <th className="p-3 text-center">Unit</th>
                        <th className="p-3 text-center">Quantity</th>
                        <th className="p-3 text-right">Wholesale Rate</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                      {selectedOrder.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-3 flex items-center gap-2.5">
                            {item.image && (
                              <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-black shrink-0 border border-slate-200 dark:border-white/5" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-zinc-100 line-clamp-1">{item.name}</div>
                              <div className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">SKU: {item.sku}</div>
                            </div>
                          </td>
                          <td className="p-3 text-center text-slate-500 dark:text-zinc-400">{item.unit || 'Unit'}</td>
                          <td className="p-3 text-center font-bold text-slate-900 dark:text-zinc-100">{item.quantity}</td>
                          <td className="p-3 text-right text-slate-700 dark:text-zinc-300 font-medium">{formatPrice(item.unitPrice)}</td>
                          <td className="p-3 text-right font-extrabold text-[#F27D26]">{formatPrice(item.subtotal)}</td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleReorderSingleItem(item)}
                              className="px-2 py-1 rounded-lg border border-[#F27D26]/40 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] text-[11px] font-bold transition-all inline-flex items-center gap-1 btn-hover cursor-pointer"
                              title={`Add ${item.quantity}x ${item.name} to cart`}
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span className="hidden sm:inline">Add</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary & Invoice Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Reorder Entire Order Button */}
                  <button
                    type="button"
                    onClick={() => handleReorder(selectedOrder)}
                    className="px-4 py-2.5 rounded-xl border border-[#F27D26]/50 bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-black transition-all flex items-center gap-2 btn-hover cursor-pointer shadow-lg shadow-[#F27D26]/25"
                    title="Add all items from this order into your cart"
                  >
                    <RotateCcw className="w-4 h-4 text-black stroke-[2.5]" />
                    <span>Reorder All Items</span>
                  </button>

                  {selectedOrder.status !== 'cancelled' && selectedOrder.paymentStatus !== 'paid' && (
                    <>
                      <button
                        disabled={retryingOrderId === selectedOrder.id}
                        onClick={() => handleRetryPayment(selectedOrder)}
                        className="px-4 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all flex items-center gap-2 btn-hover cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                      >
                        {retryingOrderId === selectedOrder.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Opening Flutterwave...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Retry Payment (Flutterwave)</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setOrderToCancel(selectedOrder)}
                        className="px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-hover cursor-pointer"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Cancel Order</span>
                      </button>
                    </>
                  )}
                  {isDeletable(selectedOrder) && (
                    <button
                      onClick={() => setOrderToDelete(selectedOrder)}
                      className="px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5 btn-hover cursor-pointer"
                      title="Permanently remove this transaction record"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Record</span>
                    </button>
                  )}
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-all flex items-center gap-1.5 btn-hover cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>
                </div>

                <div className="w-full sm:w-72 space-y-1.5 bg-slate-50 dark:bg-[#161616] p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Items Subtotal:</span>
                    <span className="font-bold text-slate-900 dark:text-zinc-200">{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-zinc-400">
                    <span>Est. Freight Logistics:</span>
                    <span className="font-semibold text-slate-900 dark:text-zinc-200">{formatPrice(selectedOrder.shippingCost)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                    <span>Total Invoiced:</span>
                    <span className="text-base text-[#F27D26] font-black">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Cancel Order Confirmation Modal */}
      {orderToCancel && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !cancellingOrderId && setOrderToCancel(null)}
        >
          <div 
            className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left space-y-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Cancel Order {orderToCancel.orderNumber}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  This action will mark the purchase order as cancelled.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-xl border border-slate-200 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Order Total:</span>
                <span className="font-extrabold text-[#F27D26]">{formatPrice(orderToCancel.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Status:</span>
                <span className="font-bold uppercase text-amber-600 dark:text-amber-400">{orderToCancel.paymentStatus}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 pt-1 border-t border-slate-200 dark:border-white/5">
                Note: Orders can only be cancelled while payment remains uncollected.
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-semibold text-slate-700 dark:text-zinc-300">
                Reason for Cancellation:
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:border-[#F27D26] outline-none cursor-pointer"
              >
                <option value="Changed procurement requirements">Changed procurement requirements</option>
                <option value="Ordered incorrect product / quantity">Ordered incorrect product / quantity</option>
                <option value="Selected different shipping method">Selected different shipping method</option>
                <option value="Will replace order later">Will replace order later</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                disabled={Boolean(cancellingOrderId)}
                onClick={() => setOrderToCancel(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 transition-colors btn-hover cursor-pointer"
              >
                Keep Order
              </button>
              <button
                disabled={Boolean(cancellingOrderId)}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 btn-hover cursor-pointer disabled:opacity-50"
              >
                {cancellingOrderId ? (
                  <span>Cancelling...</span>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    <span>Confirm Cancellation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Order Confirmation Modal */}
      {orderToDelete && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => !deletingOrderId && setOrderToDelete(null)}
        >
          <div 
            className="bg-white dark:bg-[#121212] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl text-left space-y-4 animate-in fade-in zoom-in duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-zinc-100">
                  Delete Order #{orderToDelete.orderNumber}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  This transaction record will be permanently removed from your dashboard.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#161616] p-3 rounded-xl border border-slate-200 dark:border-white/5 space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
              <div className="flex justify-between">
                <span>Order Reference:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-zinc-100">{orderToDelete.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-extrabold text-[#F27D26]">{formatPrice(orderToDelete.total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-bold capitalize text-rose-600 dark:text-rose-400">{orderToDelete.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                disabled={Boolean(deletingOrderId)}
                onClick={() => setOrderToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-zinc-300 transition-colors btn-hover cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={Boolean(deletingOrderId)}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 btn-hover cursor-pointer disabled:opacity-50"
              >
                {deletingOrderId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

