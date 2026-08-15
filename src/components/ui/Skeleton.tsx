import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base atomic Skeleton component with smooth CSS shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`skeleton-shimmer bg-slate-200/80 dark:bg-white/[0.08] relative overflow-hidden rounded-xl ${className}`}
      {...props}
    />
  );
};

/**
 * Product Card Skeleton mirroring the exact layout of ProductCard
 */
export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#161616] rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-xs p-4 space-y-4 flex flex-col justify-between h-full">
      <div className="space-y-3">
        {/* Product Image placeholder */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5">
          <Skeleton className="w-full h-full rounded-2xl" />
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
          <div className="absolute bottom-2.5 right-2.5">
            <Skeleton className="w-14 h-5 rounded-md" />
          </div>
        </div>

        {/* Category & Rating */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Skeleton className="w-20 h-3.5 rounded-md" />
          <Skeleton className="w-12 h-3.5 rounded-md" />
        </div>

        {/* Product Title */}
        <div className="space-y-1.5">
          <Skeleton className="w-full h-4 rounded-md" />
          <Skeleton className="w-3/4 h-4 rounded-md" />
        </div>

        {/* Pricing */}
        <div className="pt-1.5 space-y-1">
          <div className="flex items-baseline gap-2">
            <Skeleton className="w-24 h-6 rounded-md" />
            <Skeleton className="w-16 h-4 rounded-md" />
          </div>
          <Skeleton className="w-32 h-3 rounded-md" />
        </div>

        {/* Wholesale Tiers placeholder */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
          <Skeleton className="h-8 rounded-lg" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex items-center gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
      </div>
    </div>
  );
};

/**
 * Product Grid Skeleton with category pills and multi-card grid
 */
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Category Pills & Toolbar Skeleton */}
      <div className="bg-white dark:bg-[#141414] rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="w-32 h-6 rounded-lg" />
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Skeleton className="w-28 h-8 rounded-xl" />
            <Skeleton className="w-28 h-8 rounded-xl" />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Skeleton className="w-24 h-8 rounded-full shrink-0" />
          <Skeleton className="w-28 h-8 rounded-full shrink-0" />
          <Skeleton className="w-32 h-8 rounded-full shrink-0" />
          <Skeleton className="w-28 h-8 rounded-full shrink-0" />
          <Skeleton className="w-24 h-8 rounded-full shrink-0" />
          <Skeleton className="w-36 h-8 rounded-full shrink-0" />
        </div>
      </div>

      {/* Product Grid of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

/**
 * Dashboard Metrics Stats Cards Skeleton
 */
export const DashboardMetricsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#161616] p-5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xs flex items-center justify-between"
        >
          <div className="space-y-2 flex-1 pr-3">
            <Skeleton className="w-24 h-3.5 rounded-md" />
            <Skeleton className="w-32 h-7 rounded-lg" />
            <Skeleton className="w-20 h-3 rounded-md" />
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        </div>
      ))}
    </div>
  );
};

/**
 * Single Order Row Skeleton
 */
export const OrderRowSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="space-y-3 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="w-36 h-5 rounded-md" />
          <Skeleton className="w-24 h-6 rounded-full" />
          <Skeleton className="w-28 h-3.5 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-28 h-6 rounded-lg" />
          <Skeleton className="w-36 h-6 rounded-lg" />
          <Skeleton className="w-24 h-6 rounded-lg" />
        </div>
      </div>
      <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-white/5 shrink-0">
        <div className="space-y-1 text-right">
          <Skeleton className="w-16 h-3 rounded-md ml-auto" />
          <Skeleton className="w-24 h-6 rounded-md ml-auto" />
        </div>
        <Skeleton className="w-24 h-9 rounded-xl" />
      </div>
    </div>
  );
};

/**
 * Customer / Order List Dashboard Skeleton
 */
export const OrderListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Top Banner Skeleton */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <Skeleton className="w-28 h-5 rounded-full" />
            <Skeleton className="w-64 h-8 rounded-xl" />
            <Skeleton className="w-48 h-4 rounded-md" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="w-24 h-16 rounded-2xl" />
            <Skeleton className="w-24 h-16 rounded-2xl" />
            <Skeleton className="w-28 h-16 rounded-2xl" />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar Skeleton */}
      <div className="bg-white dark:bg-[#161616] rounded-2xl p-4 border border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <Skeleton className="w-14 h-8 rounded-xl" />
          <Skeleton className="w-18 h-8 rounded-xl" />
          <Skeleton className="w-20 h-8 rounded-xl" />
          <Skeleton className="w-18 h-8 rounded-xl" />
        </div>
        <Skeleton className="w-full sm:w-64 h-8 rounded-xl" />
      </div>

      {/* Orders List Skeleton Rows */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <OrderRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

/**
 * Admin Dashboard Full Skeleton
 */
export const AdminDashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-fadeIn">
      {/* Header Skeleton */}
      <div className="bg-slate-900 dark:bg-[#141414] rounded-3xl p-6 border border-slate-800 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="w-72 h-7 rounded-lg" />
            <Skeleton className="w-96 h-3.5 rounded-md" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-36 h-9 rounded-xl" />
          <Skeleton className="w-9 h-9 rounded-xl" />
        </div>
      </div>

      {/* Navigation Tabs Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto bg-slate-100 dark:bg-[#121212] p-1.5 rounded-2xl border border-slate-200 dark:border-white/5">
        <Skeleton className="w-32 h-8 rounded-xl" />
        <Skeleton className="w-36 h-8 rounded-xl" />
        <Skeleton className="w-36 h-8 rounded-xl" />
        <Skeleton className="w-36 h-8 rounded-xl" />
        <Skeleton className="w-32 h-8 rounded-xl" />
      </div>

      {/* Key Metric Cards */}
      <DashboardMetricsSkeleton />

      {/* Content Table Placeholder */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 border border-slate-200 dark:border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
          <Skeleton className="w-48 h-6 rounded-lg" />
          <Skeleton className="w-32 h-8 rounded-xl" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="w-40 h-4 rounded-md" />
                  <Skeleton className="w-24 h-3 rounded-md" />
                </div>
              </div>
              <Skeleton className="w-24 h-6 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Profile Dashboard Skeleton
 */
export const ProfileDashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Profile Header Banner Skeleton */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl shrink-0" />
          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Skeleton className="w-48 h-7 rounded-lg" />
              <Skeleton className="w-24 h-5 rounded-full" />
            </div>
            <Skeleton className="w-40 h-4 rounded-md mx-auto sm:mx-0" />
            <Skeleton className="w-56 h-3.5 rounded-md mx-auto sm:mx-0" />
          </div>
        </div>
      </div>

      {/* Form Tabs and Card Skeleton */}
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-4">
          <Skeleton className="w-28 h-8 rounded-xl" />
          <Skeleton className="w-28 h-8 rounded-xl" />
          <Skeleton className="w-28 h-8 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="w-20 h-3.5 rounded-md" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-24 h-3.5 rounded-md" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-28 h-3.5 rounded-md" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="w-20 h-3.5 rounded-md" />
            <Skeleton className="w-full h-10 rounded-xl" />
          </div>
        </div>
        <div className="pt-2 flex justify-end gap-3">
          <Skeleton className="w-24 h-10 rounded-xl" />
          <Skeleton className="w-36 h-10 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

/**
 * Generic Full Page Skeleton Loader
 */
export const PageSkeleton: React.FC<{ type?: 'catalog' | 'dashboard' | 'profile' | 'general' }> = ({
  type = 'general'
}) => {
  if (type === 'catalog') {
    return <ProductGridSkeleton count={8} />;
  }
  if (type === 'dashboard') {
    return <OrderListSkeleton />;
  }
  if (type === 'profile') {
    return <ProfileDashboardSkeleton />;
  }

  return (
    <div className="w-full space-y-6 animate-fadeIn py-4">
      <div className="bg-white dark:bg-[#161616] rounded-3xl p-8 border border-slate-200 dark:border-white/5 space-y-4">
        <Skeleton className="w-48 h-8 rounded-xl" />
        <Skeleton className="w-full max-w-lg h-4 rounded-md" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
};
