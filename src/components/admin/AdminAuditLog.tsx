import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Radio, 
  Database, 
  Layers, 
  ArrowRight, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  PlusCircle, 
  Edit3, 
  DollarSign, 
  Boxes, 
  Activity, 
  ShieldCheck, 
  ShieldAlert,
  UserCheck,
  Server, 
  Zap,
  Clock,
  Eye,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ProductAuditLog, ProductAuditAction, AuditLogSeverity, AuditLogSource } from '../../types';
import { 
  getAuditLogs, 
  subscribeToAuditLogs, 
  clearAuditLogs, 
  exportAuditLogsCsv, 
  exportAuditLogsJson, 
  runLiveSyncVerification, 
  SyncVerificationResult,
  recordProductAudit
} from '../../services/auditLogService';
import { getCachedProducts, getProductsFromDatabase } from '../../services/productService';
import { isSupabaseEnabled } from '../../lib/supabase';

interface AdminAuditLogProps {
  onSelectProduct?: (productId: string) => void;
  onNavigateToProducts?: () => void;
}

export const AdminAuditLog: React.FC<AdminAuditLogProps> = ({ 
  onSelectProduct,
  onNavigateToProducts
}) => {
  const [logs, setLogs] = useState<ProductAuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('ALL');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('ALL');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Parity Diagnostic state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<SyncVerificationResult | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLiveActive, setIsLiveActive] = useState(true);

  // Subscribe to real-time audit log changes
  useEffect(() => {
    const unsubscribe = subscribeToAuditLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Format relative time
  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSecs < 10) return 'Just now';
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  // Run Parity Diagnostic
  const handleRunDiagnostic = async () => {
    setIsVerifying(true);
    try {
      const result = await runLiveSyncVerification();
      setVerificationResult(result);
    } catch (err) {
      console.error('Failed to run verification:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  // Force reconcile / reload catalog
  const handleForceReconcile = async () => {
    setIsVerifying(true);
    try {
      await getProductsFromDatabase();
      const result = await runLiveSyncVerification();
      setVerificationResult(result);
      recordProductAudit({
        action: 'SCHEMA_CACHE_RELOAD',
        severity: 'success',
        source: 'admin_ui',
        summary: 'Manual Catalog Re-synchronization completed successfully',
        details: 'Fetched freshest snapshot from Express API & Supabase and repopulated browser cache.'
      });
    } catch (e: any) {
      console.error('Reconcile error:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = (log: ProductAuditLog) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopiedId(log.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  // Download CSV
  const handleDownloadCsv = () => {
    const csvData = exportAuditLogsCsv();
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eagle_product_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download JSON
  const handleDownloadJson = () => {
    const jsonData = exportAuditLogsJson();
    const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `eagle_product_audit_log_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Computed metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const created = logs.filter(l => l.action === 'PRODUCT_CREATED' || l.action === 'CATALOG_SEEDED').length;
    const updated = logs.filter(l => l.action === 'PRODUCT_UPDATED' || l.action === 'PRICE_CHANGED' || l.action === 'STOCK_ADJUSTED').length;
    const deleted = logs.filter(l => l.action === 'PRODUCT_DELETED' || l.action === 'REALTIME_DELETE_RECEIVED').length;
    const realtime = logs.filter(l => l.source === 'supabase_realtime' || l.source === 'sse_stream').length;
    const diagnostics = logs.filter(l => l.action === 'DIAGNOSTIC_VERIFY').length;
    const roleChanges = logs.filter(l => l.action === 'USER_ROLE_CHANGED' || l.action === 'ADMIN_PROMOTED' || l.action === 'ADMIN_REVOKED').length;

    return { total, created, updated, deleted, realtime, diagnostics, roleChanges };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search text
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = log.productName?.toLowerCase().includes(query);
        const matchesSku = log.productSku?.toLowerCase().includes(query);
        const matchesId = log.productId?.toLowerCase().includes(query);
        const matchesSummary = log.summary.toLowerCase().includes(query);
        const matchesDetails = log.details?.toLowerCase().includes(query);
        const matchesActor = log.actorEmail?.toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesId && !matchesSummary && !matchesDetails && !matchesActor) {
          return false;
        }
      }

      // Action Filter
      if (selectedActionFilter !== 'ALL') {
        if (selectedActionFilter === 'CREATED' && log.action !== 'PRODUCT_CREATED' && log.action !== 'CATALOG_SEEDED') return false;
        if (selectedActionFilter === 'UPDATED' && log.action !== 'PRODUCT_UPDATED') return false;
        if (selectedActionFilter === 'PRICE_STOCK' && log.action !== 'PRICE_CHANGED' && log.action !== 'STOCK_ADJUSTED') return false;
        if (selectedActionFilter === 'DELETED' && log.action !== 'PRODUCT_DELETED' && log.action !== 'REALTIME_DELETE_RECEIVED') return false;
        if (selectedActionFilter === 'REALTIME' && !log.action.startsWith('REALTIME_') && log.action !== 'SSE_STREAM_SYNC') return false;
        if (selectedActionFilter === 'DIAGNOSTICS' && log.action !== 'DIAGNOSTIC_VERIFY') return false;
        if (selectedActionFilter === 'ROLE_CHANGES' && log.action !== 'USER_ROLE_CHANGED' && log.action !== 'ADMIN_PROMOTED' && log.action !== 'ADMIN_REVOKED') return false;
      }

      // Severity Filter
      if (selectedSeverityFilter !== 'ALL' && log.severity !== selectedSeverityFilter.toLowerCase()) {
        return false;
      }

      // Source Filter
      if (selectedSourceFilter !== 'ALL' && log.source !== selectedSourceFilter) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedActionFilter, selectedSeverityFilter, selectedSourceFilter]);

  // Helper for Action Badge Colors & Icons
  const getActionBadge = (action: ProductAuditAction) => {
    switch (action) {
      case 'ADMIN_PROMOTED':
        return {
          label: 'Admin Promoted',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />,
          classes: 'bg-amber-50 text-amber-800 border-amber-300'
        };
      case 'ADMIN_REVOKED':
        return {
          label: 'Role Reverted',
          icon: <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />,
          classes: 'bg-blue-50 text-blue-800 border-blue-300'
        };
      case 'USER_ROLE_CHANGED':
        return {
          label: 'Role Changed',
          icon: <UserCheck className="w-3.5 h-3.5 text-purple-600" />,
          classes: 'bg-purple-50 text-purple-800 border-purple-300'
        };
      case 'PRODUCT_CREATED':
        return {
          label: 'Created',
          icon: <PlusCircle className="w-3.5 h-3.5" />,
          classes: 'bg-emerald-50 text-emerald-700 border-emerald-200'
        };
      case 'PRODUCT_UPDATED':
        return {
          label: 'Updated',
          icon: <Edit3 className="w-3.5 h-3.5" />,
          classes: 'bg-blue-50 text-blue-700 border-blue-200'
        };
      case 'PRICE_CHANGED':
        return {
          label: 'Price Changed',
          icon: <DollarSign className="w-3.5 h-3.5" />,
          classes: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'STOCK_ADJUSTED':
        return {
          label: 'Stock Adjusted',
          icon: <Boxes className="w-3.5 h-3.5" />,
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      case 'PRODUCT_DELETED':
        return {
          label: 'Deleted',
          icon: <Trash2 className="w-3.5 h-3.5" />,
          classes: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'REALTIME_INSERT_RECEIVED':
        return {
          label: 'Realtime Insert',
          icon: <Radio className="w-3.5 h-3.5 animate-pulse" />,
          classes: 'bg-teal-50 text-teal-700 border-teal-200'
        };
      case 'REALTIME_UPDATE_RECEIVED':
        return {
          label: 'Realtime Update',
          icon: <Radio className="w-3.5 h-3.5" />,
          classes: 'bg-cyan-50 text-cyan-700 border-cyan-200'
        };
      case 'REALTIME_DELETE_RECEIVED':
        return {
          label: 'Realtime Delete',
          icon: <Radio className="w-3.5 h-3.5 text-rose-600" />,
          classes: 'bg-rose-50 text-rose-700 border-rose-200'
        };
      case 'SSE_STREAM_SYNC':
        return {
          label: 'SSE Broadcast',
          icon: <Zap className="w-3.5 h-3.5" />,
          classes: 'bg-purple-50 text-purple-700 border-purple-200'
        };
      case 'DIAGNOSTIC_VERIFY':
        return {
          label: 'Diagnostic Check',
          icon: <Activity className="w-3.5 h-3.5" />,
          classes: 'bg-slate-100 text-slate-700 border-slate-200'
        };
      case 'CATALOG_SEEDED':
        return {
          label: 'Catalog Seeded',
          icon: <Database className="w-3.5 h-3.5" />,
          classes: 'bg-indigo-50 text-indigo-700 border-indigo-200'
        };
      default:
        return {
          label: action,
          icon: <Info className="w-3.5 h-3.5" />,
          classes: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  // Helper for Source Badge
  const getSourceBadge = (source: AuditLogSource) => {
    switch (source) {
      case 'admin_ui':
        return { label: 'Admin Dashboard', color: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'supabase_realtime':
        return { label: 'Supabase Postgres Realtime', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'sse_stream':
        return { label: 'SSE Server Stream', color: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'server_api':
        return { label: 'Server REST API', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'local_cache':
        return { label: 'Local IndexedDB Cache', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { label: 'System Engine', color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div id="admin-audit-log-view" className="space-y-6">
      {/* 1. Header with Live Status Indicator & Action Bar */}
      <div id="audit-log-header-card" className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-5 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                  Product Audit Log & Sync Trail
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Sync Active
                  </span>
                </h1>
                <p className="text-sm text-gray-500">
                  Real-time recording of catalog additions, attribute updates, price tiers, inventory adjustments, and multi-device replication events.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              id="audit-run-parity-btn"
              onClick={handleRunDiagnostic}
              disabled={isVerifying}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              title="Verify catalog synchronization across Client Memory, Express API, and Supabase Postgres"
            >
              <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Checking Sync...' : 'Verify Sync Parity'}</span>
            </button>

            <button
              id="audit-export-csv-btn"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Download audit trail as CSV spreadsheet"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              id="audit-export-json-btn"
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Download raw audit payload as JSON"
            >
              <FileCode className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>

            <button
              id="audit-clear-logs-btn"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Reset local audit history buffer"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Diagnostic Results Banner (if ran) */}
        {verificationResult && (
          <div id="parity-result-card" className={`mt-5 p-4 rounded-xl border ${verificationResult.status === 'healthy' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {verificationResult.status === 'healthy' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <h4 className="text-sm font-bold">{verificationResult.summary}</h4>
                  <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span><strong>Browser Cache:</strong> {verificationResult.clientCount} SKUs</span>
                    <span><strong>Express API:</strong> {verificationResult.serverCount} SKUs</span>
                    {verificationResult.supabaseConfigured ? (
                      <span><strong>Supabase Postgres:</strong> {verificationResult.supabaseCount} records</span>
                    ) : (
                      <span className="text-gray-500"><strong>Supabase:</strong> (Local Fallback Active)</span>
                    )}
                    <span><strong>Latency:</strong> {verificationResult.latencyMs}ms</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {verificationResult.status !== 'healthy' && (
                  <button
                    onClick={handleForceReconcile}
                    className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Force Reconcile Now
                  </button>
                )}
                <button
                  onClick={() => setVerificationResult(null)}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Key Metrics Deck */}
      <div id="audit-metrics-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-gray-500 block">Total Events</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Stored audit records</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
            <PlusCircle className="w-3.5 h-3.5" /> Additions
          </span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.created}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">New SKUs created</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" /> Updates
          </span>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.updated}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Price, stock & specs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-rose-700 flex items-center gap-1">
            <Trash2 className="w-3.5 h-3.5" /> Deletions
          </span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{stats.deleted}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Removed from catalog</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-purple-700 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5" /> Real-time Sync
          </span>
          <div className="text-2xl font-bold text-purple-600 mt-1">{stats.realtime}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Supabase / SSE events</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5" /> Diagnostics
          </span>
          <div className="text-2xl font-bold text-slate-700 mt-1">{stats.diagnostics}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Parity integrity checks</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs">
          <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Staff Roles
          </span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.roleChanges}</div>
          <span className="text-[11px] text-gray-400 mt-0.5 block">Admin role transitions</span>
        </div>
      </div>

      {/* 3. Filter and Search Controls */}
      <div id="audit-filter-controls" className="bg-white rounded-xl border border-gray-200/90 shadow-sm p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="audit-search-input"
              type="text"
              placeholder="Search by product name, SKU, ID, user ID, or admin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50/80 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Actions' },
              { id: 'ROLE_CHANGES', label: '🛡️ Role Changes' },
              { id: 'CREATED', label: 'Created' },
              { id: 'UPDATED', label: 'Updated' },
              { id: 'PRICE_STOCK', label: 'Price & Stock' },
              { id: 'DELETED', label: 'Deleted' },
              { id: 'REALTIME', label: 'Realtime' },
              { id: 'DIAGNOSTICS', label: 'Diagnostics' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setSelectedActionFilter(pill.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedActionFilter === pill.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary dropdown filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Refine By:</span>
          </div>

          {/* Severity */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Severity:</span>
            <select
              value={selectedSeverityFilter}
              onChange={(e) => setSelectedSeverityFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Severities</option>
              <option value="SUCCESS">Success Only</option>
              <option value="INFO">Info Only</option>
              <option value="WARNING">Warnings (Deletes/Alerts)</option>
              <option value="ERROR">Errors Only</option>
            </select>
          </div>

          {/* Source */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400">Source:</span>
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Sources</option>
              <option value="admin_ui">Admin UI</option>
              <option value="supabase_realtime">Supabase Realtime</option>
              <option value="sse_stream">SSE Server Stream</option>
              <option value="server_api">Server REST API</option>
              <option value="system">System Engine</option>
            </select>
          </div>

          {/* Result Count and Clear Filters */}
          <div className="ml-auto text-gray-500">
            Showing <strong>{filteredLogs.length}</strong> of {logs.length} events
            {(searchTerm || selectedActionFilter !== 'ALL' || selectedSeverityFilter !== 'ALL' || selectedSourceFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedActionFilter('ALL');
                  setSelectedSeverityFilter('ALL');
                  setSelectedSourceFilter('ALL');
                }}
                className="ml-2 text-blue-600 hover:underline font-medium cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Event Feed / Table */}
      <div id="audit-log-list" className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">No matching audit events found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              Try adjusting your search terms or filters. New product changes and real-time events will stream here automatically.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedActionFilter('ALL');
                setSelectedSeverityFilter('ALL');
                setSelectedSourceFilter('ALL');
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const actionBadge = getActionBadge(log.action);
            const sourceBadge = getSourceBadge(log.source);
            const isExpanded = expandedLogId === log.id;

            return (
              <div
                key={log.id}
                id={`audit-event-${log.id}`}
                className={`bg-white rounded-xl border transition-all shadow-xs ${
                  isExpanded ? 'border-blue-300 ring-2 ring-blue-500/10' : 'border-gray-200/90 hover:border-gray-300'
                }`}
              >
                {/* Header Row */}
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Action Icon Badge */}
                    <div className={`p-2 rounded-lg border flex items-center justify-center shrink-0 ${actionBadge.classes}`}>
                      {actionBadge.icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Action Pill */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${actionBadge.classes}`}>
                          {actionBadge.label}
                        </span>

                        {/* Product SKU / Name (if applicable) */}
                        {log.productName && (
                          <span className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors">
                            {log.productName}
                          </span>
                        )}

                        {log.productSku && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-mono font-medium">
                            {log.productSku}
                          </span>
                        )}

                        {log.category && (
                          <span className="text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {log.category}
                          </span>
                        )}

                        {/* Source Tag */}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${sourceBadge.color}`}>
                          {sourceBadge.label}
                        </span>
                      </div>

                      {/* Summary Description */}
                      <p className="text-sm text-gray-700 leading-snug">
                        {log.summary}
                      </p>

                      {log.details && !isExpanded && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right metadata & Expand Trigger */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-gray-700 block" title={log.timestamp}>
                        {formatRelativeTime(log.timestamp)}
                      </span>
                      <span className="text-[11px] text-gray-400 block font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {log.productId && onSelectProduct && (
                        <button
                          onClick={() => onSelectProduct(log.productId!)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Open Product in Editor"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isExpanded 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="border-t border-gray-200/80 bg-gray-50/60 p-4 sm:p-5 rounded-b-xl space-y-4 text-xs">
                    {/* Detailed Explanation */}
                    {log.details && (
                      <div className="space-y-1">
                        <span className="font-semibold text-gray-700 block">Event Detail & Context:</span>
                        <div className="p-3 bg-white rounded-lg border border-gray-200 text-gray-800 text-xs leading-relaxed">
                          {log.details}
                        </div>
                      </div>
                    )}

                    {/* Field Diffs (if present) */}
                    {log.diffs && log.diffs.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-semibold text-gray-700 block">Attribute Value Diffs:</span>
                        <div className="overflow-x-auto">
                          <table className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[11px]">
                              <tr>
                                <th className="py-2 px-3 text-left font-semibold">Field</th>
                                <th className="py-2 px-3 text-left font-semibold">Previous Value</th>
                                <th className="py-2 px-3 text-center font-semibold w-8">➔</th>
                                <th className="py-2 px-3 text-left font-semibold">New Synced Value</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-mono text-xs">
                              {log.diffs.map((d, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                  <td className="py-2 px-3 font-semibold text-gray-800">{d.label}</td>
                                  <td className="py-2 px-3 text-rose-700 bg-rose-50/40">{String(d.oldValue ?? 'None')}</td>
                                  <td className="py-2 px-3 text-center text-gray-400">➔</td>
                                  <td className="py-2 px-3 text-emerald-700 bg-emerald-50/40 font-bold">{String(d.newValue ?? 'None')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-gray-200">
                      <div>
                        <span className="text-gray-400 block text-[11px]">Actor:</span>
                        <span className="font-medium text-gray-800 truncate block">{log.actorEmail || 'admin@eagleexcel.com'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Exact Timestamp:</span>
                        <span className="font-mono text-gray-800 text-[11px] block">{log.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Active Memory Count:</span>
                        <span className="font-medium text-gray-800 block">
                          {log.clientMemoryCount !== undefined ? `${log.clientMemoryCount} SKUs` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[11px]">Event Identifier:</span>
                        <span className="font-mono text-gray-600 text-[10px] truncate block">{log.id}</span>
                      </div>
                    </div>

                    {/* Raw Payload Snapshot (if present) */}
                    {log.payloadSnapshot && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">Raw JSON Payload Snapshot:</span>
                          <button
                            onClick={() => handleCopyJson(log)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 rounded transition-colors cursor-pointer"
                          >
                            {copiedId === log.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy JSON</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg overflow-x-auto text-[11px] font-mono leading-relaxed max-h-56">
                          {JSON.stringify(log.payloadSnapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Clear Audit Trail?</h3>
            </div>
            <p className="text-sm text-gray-600">
              This will clear the current local audit history buffer. Future additions, updates, and real-time events will continue to be tracked in real-time.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAuditLogs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                Yes, Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
