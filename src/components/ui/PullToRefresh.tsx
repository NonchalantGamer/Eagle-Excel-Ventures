import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  pullText?: string;
  releaseText?: string;
  refreshingText?: string;
  successText?: string;
  threshold?: number;
  maxPullDistance?: number;
}

type PullStatus = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'success';

/**
 * Ultra-smooth, 120 FPS capacitive Pull-To-Refresh component for mobile views.
 * Features:
 * - Exponential resistance physics curve (natural spring feel)
 * - Hardware accelerated CSS transform & opacity
 * - Haptic vibration feedback on threshold reach
 * - Visual pull progress rotation and state badges
 * - Non-interfering scroll isolation
 */
export const PullToRefresh = React.forwardRef<HTMLDivElement, PullToRefreshProps>(({
  onRefresh,
  children,
  className = '',
  disabled = false,
  pullText = 'Pull down to refresh',
  releaseText = 'Release to refresh live support',
  refreshingText = 'Refreshing live support stream...',
  successText = 'Live support updated',
  threshold = 60,
  maxPullDistance = 90
}, forwardedRef) => {
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<PullStatus>('idle');
  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const hasVibratedRef = useRef<boolean>(false);
  const isRefreshingRef = useRef<boolean>(false);

  // Sync forwardedRef with innerContainerRef
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    (innerContainerRef as any).current = node;
    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
    } else if (forwardedRef) {
      (forwardedRef as any).current = node;
    }
  }, [forwardedRef]);

  const pullPercentage = Math.min(1, Math.max(0, pullDistance / threshold));

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || isRefreshingRef.current) return;
    
    const container = innerContainerRef.current;
    if (!container) return;

    // Only allow pull to refresh if the container or page is scrolled all the way to the top
    const isAtTop = container.scrollTop <= 1;
    if (!isAtTop) return;

    startYRef.current = e.touches[0].clientY;
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
    hasVibratedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || disabled || isRefreshingRef.current) return;

    const container = innerContainerRef.current;
    if (!container) return;

    // If user scrolled down inside container, cancel drag
    if (container.scrollTop > 1) {
      isDraggingRef.current = false;
      setPullDistance(0);
      setStatus('idle');
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const dy = currentY - startYRef.current;
    const dx = Math.abs(currentX - startXRef.current);

    // If moving sideways or upward, ignore
    if (dy <= 0 || dx > dy * 1.2) {
      if (pullDistance > 0) {
        setPullDistance(0);
        setStatus('idle');
      }
      return;
    }

    // Apply smooth logarithmic/exponential resistance curve
    const dampened = Math.min(Math.pow(dy, 0.82) * 1.15, maxPullDistance);

    setPullDistance(dampened);

    if (dampened >= threshold) {
      setStatus('ready');
      if (!hasVibratedRef.current) {
        hasVibratedRef.current = true;
        try {
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(12);
          }
        } catch {}
      }
    } else {
      setStatus('pulling');
      hasVibratedRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (status === 'ready' && !isRefreshingRef.current) {
      isRefreshingRef.current = true;
      setStatus('refreshing');
      // Snap to refreshing height
      setPullDistance(48);

      try {
        await Promise.resolve(onRefresh());
        setStatus('success');
        // Show success briefly
        await new Promise((r) => setTimeout(r, 600));
      } catch (err) {
        console.warn('PullToRefresh refresh failed:', err);
      } finally {
        isRefreshingRef.current = false;
        setStatus('idle');
        setPullDistance(0);
      }
    } else if (status !== 'refreshing') {
      setStatus('idle');
      setPullDistance(0);
    }
  };

  const isInteracting = isDraggingRef.current || status === 'refreshing' || status === 'success';

  return (
    <div
      ref={setContainerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      data-scrollable="true"
      className={`relative overflow-y-auto overscroll-contain select-none flex flex-col ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      {/* Pull down indicator container */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out flex items-center justify-center pointer-events-none shrink-0"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 8 ? Math.min(1, pullDistance / 35) : 0,
          transition: isDraggingRef.current ? 'none' : 'height 0.28s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease'
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 dark:bg-zinc-900/95 border border-slate-200/90 dark:border-white/15 shadow-sm text-xs font-semibold backdrop-blur-md transform transition-transform duration-150 scale-95">
          {status === 'pulling' && (
            <>
              <ArrowDown 
                className="w-3.5 h-3.5 text-[#F27D26] transition-transform duration-100" 
                style={{ transform: `rotate(${pullPercentage * 180}deg)` }}
              />
              <span className="text-slate-600 dark:text-zinc-300 text-[11px] font-medium">
                {pullText}
              </span>
            </>
          )}

          {status === 'ready' && (
            <>
              <div className="w-4 h-4 rounded-full bg-[#F27D26] text-black flex items-center justify-center animate-pulse">
                <ArrowDown className="w-2.5 h-2.5 transform rotate-180" />
              </div>
              <span className="text-[#F27D26] dark:text-[#F27D26] text-[11px] font-bold">
                {releaseText}
              </span>
            </>
          )}

          {status === 'refreshing' && (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-[#F27D26] animate-spin" />
              <span className="text-slate-700 dark:text-zinc-200 text-[11px] font-medium">
                {refreshingText}
              </span>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-2.5 h-2.5" />
              </div>
              <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                {successText}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col min-h-0"
        style={{
          transform: isInteracting && pullDistance > 0 ? `translate3d(0, 0, 0)` : undefined,
          willChange: isInteracting ? 'transform' : undefined
        }}
      >
        {children}
      </div>
    </div>
  );
});

PullToRefresh.displayName = 'PullToRefresh';
