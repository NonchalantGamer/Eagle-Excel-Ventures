import React from 'react';
import { Truck, Package, CheckCircle2, Clock, Zap } from 'lucide-react';
import { useOrders } from '../context/OrderContext';

interface OrderNavBadgeProps {
  variant?: 'pill' | 'compact' | 'dot-only' | 'drawer-row';
  className?: string;
  showZero?: boolean;
}

export const OrderNavBadge: React.FC<OrderNavBadgeProps> = ({
  variant = 'pill',
  className = '',
  showZero = false
}) => {
  const {
    orders,
    isLoading,
    inTransitCount,
    processingCount,
    activeOrdersCount,
    unviewedStatusChangesCount,
    hasUnviewedChanges,
    latestStatusChange
  } = useOrders();

  if (isLoading && orders.length === 0) {
    return null;
  }

  if (orders.length === 0 && !showZero) {
    return null;
  }

  // Dot-Only Indicator (e.g. for small icon overlays)
  if (variant === 'dot-only') {
    if (hasUnviewedChanges || inTransitCount > 0) {
      const dotColor = inTransitCount > 0 ? 'bg-purple-500' : 'bg-[#F27D26]';
      return (
        <span className={`relative flex h-2 w-2 ${className}`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-80`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
      );
    }
    return null;
  }

  // Compact Badge (for Desktop Header buttons)
  if (variant === 'compact') {
    if (hasUnviewedChanges) {
      if (inTransitCount > 0 || (latestStatusChange?.newStatus === 'shipped')) {
        return (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-xs animate-pulse ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
            <Truck className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>{inTransitCount > 0 ? `${inTransitCount}` : 'Shipped'}</span>
          </span>
        );
      }

      return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[#F27D26] text-black shadow-xs animate-pulse ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
          <span>{unviewedStatusChangesCount}</span>
        </span>
      );
    }

    if (inTransitCount > 0) {
      return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 ${className}`}>
          <Truck className="w-3 h-3 text-purple-500 shrink-0" />
          <span>{inTransitCount}</span>
        </span>
      );
    }

    if (activeOrdersCount > 0) {
      return (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-zinc-300 ${className}`}>
          <span>{activeOrdersCount}</span>
        </span>
      );
    }

    return null;
  }

  // Drawer-Row or Standard Pill Badge
  if (hasUnviewedChanges) {
    // 1. In-Transit / Freight Shipment Status Change
    if (inTransitCount > 0 || latestStatusChange?.newStatus === 'shipped') {
      return (
        <span 
          id="orders-live-status-badge-transit"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-500/40 shadow-xs animate-pulse ${className}`}
          title="Live Freight Shipment: Consignment In Transit"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-90" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500" />
          </span>
          <Truck className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0 animate-bounce" />
          <span className="whitespace-nowrap font-black">
            {inTransitCount > 1 ? `${inTransitCount} In Transit` : 'In Transit'}
          </span>
        </span>
      );
    }

    // 2. Delivered Status Change
    if (latestStatusChange?.newStatus === 'delivered') {
      return (
        <span 
          id="orders-live-status-badge-delivered"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 shadow-xs animate-pulse ${className}`}
          title="Consignment Delivered"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="whitespace-nowrap font-black">Delivered</span>
        </span>
      );
    }

    // 3. Processing Status Change
    if (latestStatusChange?.newStatus === 'processing' || processingCount > 0) {
      return (
        <span 
          id="orders-live-status-badge-processing"
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-800 dark:text-blue-300 border border-blue-500/40 shadow-xs animate-pulse ${className}`}
          title="Order Processing & Packing"
        >
          <Package className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="whitespace-nowrap font-black">Processing</span>
        </span>
      );
    }

    // 4. General unviewed changes count
    return (
      <span 
        id="orders-live-status-badge-updates"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F27D26] text-black shadow-xs animate-pulse ${className}`}
        title={`${unviewedStatusChangesCount} new status update${unviewedStatusChangesCount > 1 ? 's' : ''}`}
      >
        <Zap className="w-3 h-3 fill-black text-black shrink-0" />
        <span className="whitespace-nowrap">
          {unviewedStatusChangesCount} {unviewedStatusChangesCount === 1 ? 'Update' : 'Updates'}
        </span>
      </span>
    );
  }

  // When all updates have been viewed, but there are active freight shipments in transit
  if (inTransitCount > 0) {
    return (
      <span 
        id="orders-live-status-badge-active-transit"
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 ${className}`}
        title={`${inTransitCount} shipment${inTransitCount > 1 ? 's' : ''} currently in freight transit`}
      >
        <Truck className="w-3 h-3 text-purple-500 shrink-0" />
        <span className="whitespace-nowrap">
          {inTransitCount} In Transit
        </span>
      </span>
    );
  }

  // Active orders (pending or processing)
  if (activeOrdersCount > 0) {
    return (
      <span 
        id="orders-live-status-badge-active-count"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/5 ${className}`}
        title={`${activeOrdersCount} active purchase order${activeOrdersCount > 1 ? 's' : ''}`}
      >
        <Package className="w-3 h-3 text-[#F27D26] shrink-0" />
        <span className="whitespace-nowrap">
          {activeOrdersCount} Active
        </span>
      </span>
    );
  }

  return null;
};
