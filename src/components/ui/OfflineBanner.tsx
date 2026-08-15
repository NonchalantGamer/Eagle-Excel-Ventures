import React from 'react';
import { Wifi, WifiOff, RefreshCw, X, CheckCircle2, Database } from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isOffline, pendingCount, isSyncing, syncNow, dismissBanner, isBannerVisible } = useOffline();

  if (!isBannerVisible && isOnline) return null;

  return (
    <aside
      aria-label="Network Connection Status"
      className={`fixed bottom-4 left-4 z-40 max-w-md rounded-2xl p-3.5 shadow-2xl transition-all duration-300 backdrop-blur-md border ${
        isOffline
          ? 'bg-amber-950/90 dark:bg-amber-950/95 border-amber-500/30 text-amber-200 shadow-amber-950/40'
          : 'bg-emerald-950/90 dark:bg-emerald-950/95 border-emerald-500/30 text-emerald-200 shadow-emerald-950/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-xl shrink-0 ${
          isOffline ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
        }`}>
          {isOffline ? <WifiOff className="w-5 h-5 animate-pulse" /> : <Wifi className="w-5 h-5" />}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              {isOffline ? 'Offline B2B Mode Active' : 'Network Reconnected'}
            </h4>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
              isOffline ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
            }`}>
              {isOffline ? 'IndexedDB Cache' : 'Cloud Sync Live'}
            </span>
          </div>

          <p className="text-xs mt-0.5 opacity-90 leading-relaxed">
            {isOffline
              ? 'Catalog browsing and cart changes are preserved locally in IndexedDB. Pending actions will sync once network is restored.'
              : 'All offline cart actions and catalog snapshots are synchronized with the cloud database.'}
          </p>

          {pendingCount > 0 && (
            <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-white/90">
              <Database className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingCount} action{pendingCount > 1 ? 's' : ''} queued in offline buffer</span>
              {isOnline && (
                <button
                  onClick={() => syncNow()}
                  disabled={isSyncing}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={dismissBanner}
          className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-all cursor-pointer"
          title="Dismiss notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
