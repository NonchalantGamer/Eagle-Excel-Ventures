import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider, useToast } from './components/Toast';
import { OfflineProvider } from './context/OfflineContext';
import { NotificationProvider } from './context/NotificationContext';
import { OrderProvider, useOrders } from './context/OrderContext';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { AuthModal } from './components/AuthModal';
import { getProductsFromDatabase, subscribeToProducts, getCachedProducts } from './services/productService';
import { Product, Order, PageView } from './types';
import { INITIAL_PRODUCTS } from './data/seedData';
import { useScrollReveal } from './hooks/useScrollReveal';
import { User } from 'lucide-react';
import { OAuthCallbackHandler, isOAuthCallbackOrPopup } from './components/auth/OAuthCallbackHandler';
import { 
  ProductGridSkeleton, 
  OrderListSkeleton, 
  AdminDashboardSkeleton, 
  ProfileDashboardSkeleton, 
  PageSkeleton 
} from './components/ui/Skeleton';

import { HomePage } from './pages/HomePage';
import { CustomerMessageWatcher } from './components/chat/CustomerMessageWatcher';

// Code-split secondary views and modals for fast initial page load & responsiveness
const CatalogPage = lazy(() => import('./pages/CatalogPage').then(m => ({ default: m.CatalogPage })));
const SupplyChainPage = lazy(() => import('./pages/SupplyChainPage').then(m => ({ default: m.SupplyChainPage })));
const RFQPage = lazy(() => import('./pages/RFQPage').then(m => ({ default: m.RFQPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then(m => ({ default: m.DocsPage })));
const ManageProductsPage = lazy(() => import('./pages/ManageProductsPage').then(m => ({ default: m.ManageProductsPage })));

const CustomerDashboard = lazy(() => import('./components/CustomerDashboard').then(m => ({ default: m.CustomerDashboard })));
const AdminDashboard = lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const CustomerProfileDashboard = lazy(() => import('./components/profile/CustomerProfileDashboard').then(m => ({ default: m.CustomerProfileDashboard })));
const AdminProfileDashboard = lazy(() => import('./components/profile/AdminProfileDashboard').then(m => ({ default: m.AdminProfileDashboard })));
const ProductDetailModal = lazy(() => import('./components/ProductDetailModal').then(m => ({ default: m.ProductDetailModal })));
const CustomerSupportModal = lazy(() => import('./components/CustomerSupportModal').then(m => ({ default: m.CustomerSupportModal })));
const SupportPage = lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const RequestQuoteModal = lazy(() => import('./components/home/RequestQuoteModal').then(m => ({ default: m.RequestQuoteModal })));
const FloatingWhatsAppButton = lazy(() => import('./components/home/FloatingWhatsAppButton').then(m => ({ default: m.FloatingWhatsAppButton })));
const CommandPaletteModal = lazy(() => import('./components/CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })));

const VALID_VIEWS: PageView[] = ['home', 'catalog', 'supply-chain', 'rfq', 'orders', 'about', 'admin', 'docs', 'profile', 'manage-products', 'support'];
const STORAGE_KEY = 'eagle_excel_active_page_view';

// Helper to determine initial page view on page refresh, direct link, or reload
function getInitialView(): PageView {
  try {
    if (typeof window === 'undefined') return 'home';

    // 1. Check window.location.hash (e.g. #/orders, #/support, #orders, #support, #/catalog, #/rfq, #/profile, #/admin, #/manage-products)
    const rawHash = window.location.hash || '';
    if (rawHash) {
      const cleanHash = rawHash
        .replace(/^#+/, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .split('?')[0]
        .split('/')[0]
        .trim()
        .toLowerCase();
      if (cleanHash && (VALID_VIEWS as string[]).includes(cleanHash)) {
        return cleanHash as PageView;
      }
    }

    // 2. Check window.location.search (e.g. ?page=support, ?view=support, ?tab=support)
    if (window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const queryView = (params.get('view') || params.get('page') || params.get('tab') || '').toLowerCase().trim();
      if (queryView && (VALID_VIEWS as string[]).includes(queryView)) {
        return queryView as PageView;
      }
    }

    // 3. Check window.location.pathname (e.g. /support, /catalog, /orders, /rfq)
    if (window.location.pathname) {
      const pathname = window.location.pathname
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .split('/')[0]
        .trim()
        .toLowerCase();
      if (pathname && (VALID_VIEWS as string[]).includes(pathname)) {
        return pathname as PageView;
      }
    }

    // 4. Check persistent storage (sessionStorage first for active tab, then localStorage)
    const storedSession = (sessionStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
    if (storedSession && (VALID_VIEWS as string[]).includes(storedSession)) {
      return storedSession as PageView;
    }

    const storedLocal = (localStorage.getItem(STORAGE_KEY) || '').trim().toLowerCase();
    if (storedLocal && (VALID_VIEWS as string[]).includes(storedLocal)) {
      return storedLocal as PageView;
    }
  } catch (err) {
    console.warn('Unable to read initial view from URL / storage:', err);
  }

  return 'home';
}

const MainApp: React.FC = () => {
  const { currentUser, isAdmin, role, isHydrated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { markOrdersAsViewed } = useOrders();

  const [currentView, setCurrentView] = useState<PageView>(getInitialView);
  const [products, setProducts] = useState<Product[]>(getCachedProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogInitialCategory, setCatalogInitialCategory] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const params = new URLSearchParams(hashQuery || window.location.search || '');
        const cat = params.get('category');
        if (cat) return cat;
        const stored = sessionStorage.getItem('ee_catalog_category');
        if (stored) return stored;
      }
    } catch {}
    return 'all';
  });
  const [rfqInitialCategory, setRfqInitialCategory] = useState<string | undefined>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const params = new URLSearchParams(hashQuery || window.location.search || '');
        const cat = params.get('category');
        if (cat) return cat;
        return sessionStorage.getItem('ee_rfq_category') || undefined;
      }
    } catch {}
    return undefined;
  });
  const [rfqInitialProduct, setRfqInitialProduct] = useState<string | undefined>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const params = new URLSearchParams(hashQuery || window.location.search || '');
        const prod = params.get('product');
        if (prod) return prod;
        return sessionStorage.getItem('ee_rfq_product') || undefined;
      }
    } catch {}
    return undefined;
  });
  
  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteModalCategory, setQuoteModalCategory] = useState<string | undefined>(undefined);
  const [quoteModalProduct, setQuoteModalProduct] = useState<string | undefined>(undefined);
  const [supportProductInquiry, setSupportProductInquiry] = useState<Product | null>(null);
  const [supportCustomMessage, setSupportCustomMessage] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Global keyboard shortcut for Command Palette (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll reveal trigger
  useScrollReveal([currentView, products.length, searchQuery]);

  // Synchronize URL hash, browser history, and localStorage when navigating or refreshing
  useEffect(() => {
    const onLocationChange = () => {
      const parsed = getInitialView();
      if (parsed) {
        if ((parsed === 'admin' || parsed === 'manage-products') && !isAdmin && isHydrated && !authLoading) {
          setCurrentView('home');
        } else if (parsed !== currentView) {
          setCurrentView(parsed);
        }
      }
    };

    window.addEventListener('hashchange', onLocationChange);
    window.addEventListener('popstate', onLocationChange);

    // If current view is an admin view and user is not admin, redirect to home
    if (isHydrated && !authLoading && !isAdmin && (currentView === 'admin' || currentView === 'manage-products')) {
      setCurrentView('home');
      try {
        localStorage.setItem(STORAGE_KEY, 'home');
        sessionStorage.setItem(STORAGE_KEY, 'home');
      } catch (e) {}
      return;
    }

    // Persist currentView to localStorage, sessionStorage, and URL hash
    try {
      localStorage.setItem(STORAGE_KEY, currentView);
      sessionStorage.setItem(STORAGE_KEY, currentView);
    } catch (e) {
      // ignore
    }

    const targetHash = currentView === 'home' ? '#/' : `#/${currentView}`;
    const rawHash = window.location.hash || '';
    const currentHash = rawHash
      .replace(/^#+/, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .split('?')[0]
      .split('/')[0]
      .trim()
      .toLowerCase();
    const expectedHash = currentView === 'home' ? '' : currentView;

    if (currentHash !== expectedHash) {
      try {
        window.history.replaceState(null, '', targetHash);
      } catch (e) {
        window.location.hash = targetHash;
      }
    }

    return () => {
      window.removeEventListener('hashchange', onLocationChange);
      window.removeEventListener('popstate', onLocationChange);
    };
  }, [currentView, isAdmin, isHydrated, authLoading]);

  // Listen for OAuth completion and cross-window view navigation signals (e.g. redirect back to homescreen #/)
  useEffect(() => {
    const handleAuthNavigateMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NAVIGATE_VIEW' && event.data?.view) {
        handleNavigate(event.data.view as PageView);
      } else if (event.data?.type === 'OAUTH_AUTH_SUCCESS' || event.data?.type === 'SUPABASE_AUTH_COMPLETE') {
        if (event.data?.redirectToHome) {
          handleNavigate('home');
        }
      }
    };

    window.addEventListener('message', handleAuthNavigateMessage);

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        broadcastChannel = new BroadcastChannel('eagle_excel_oauth_channel');
        broadcastChannel.onmessage = (event) => {
          if (event.data?.redirectToHome) {
            handleNavigate('home');
          }
        };
      }
    } catch (e) {}

    const handleStorageNav = (e: StorageEvent) => {
      if (e.key === 'ee_oauth_completion_signal' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.redirectToHome) {
            handleNavigate('home');
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageNav);

    return () => {
      window.removeEventListener('message', handleAuthNavigateMessage);
      if (broadcastChannel) {
        try { broadcastChannel.close(); } catch {}
      }
      window.removeEventListener('storage', handleStorageNav);
    };
  }, []);

  // Mark orders as acknowledged/viewed whenever navigating to the 'orders' view
  useEffect(() => {
    if (currentView === 'orders') {
      markOrdersAsViewed();
    }
  }, [currentView, markOrdersAsViewed]);

  // Navigation handler with state persistence and admin protection
  const handleNavigate = (view: PageView, options?: { category?: string; product?: string }) => {
    if ((view === 'admin' || view === 'manage-products') && !isAdmin && isHydrated && !authLoading) {
      setCurrentView('home');
      setIsAuthModalOpen(true);
      return;
    }

    setCurrentView(view);
    
    try {
      localStorage.setItem(STORAGE_KEY, view);
      sessionStorage.setItem(STORAGE_KEY, view);
    } catch (e) {
      // ignore
    }

    const targetHash = view === 'home' ? '#/' : `#/${view}`;
    if (window.location.hash !== targetHash) {
      try {
        window.history.pushState(null, '', targetHash);
      } catch (e) {
        window.location.hash = targetHash;
      }
    }

    if (options?.category) {
      setCatalogInitialCategory(options.category);
      setRfqInitialCategory(options.category);
      try {
        sessionStorage.setItem('ee_catalog_category', options.category);
      } catch {}
    }
    if (options?.product) {
      setRfqInitialProduct(options.product);
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  // Quick Landed Quote modal trigger
  const handleRequestQuote = (category?: string, productName?: string) => {
    setQuoteModalCategory(category);
    setQuoteModalProduct(productName);
    setIsQuoteModalOpen(true);
  };

  // Category filter trigger from Home page cards
  const handleSelectCategoryFilter = (category: string) => {
    setCatalogInitialCategory(category);
    handleNavigate('catalog', { category });
  };

  // Auto-restore selected product from URL search or hash parameters on page load/refresh
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && products && products.length > 0 && !selectedProduct) {
        const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
        const searchParams = new URLSearchParams(hashQuery || window.location.search || '');
        const skuParam = searchParams.get('sku');
        const prodParam = searchParams.get('product') || searchParams.get('productId');

        if (skuParam || prodParam) {
          const matched = products.find(p => 
            (skuParam && p.sku?.toLowerCase() === skuParam.toLowerCase()) ||
            (prodParam && p.id === prodParam)
          );
          if (matched) {
            setSelectedProduct(matched);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, [products, selectedProduct]);

  // Load and subscribe to products in database in real-time
  useEffect(() => {
    const unsubscribe = subscribeToProducts((liveProducts) => {
      if (Array.isArray(liveProducts)) {
        setProducts(liveProducts);
      }
      setIsLoadingProducts(false);
    });

    const handleLocalProductsUpdate = (e: Event) => {
      const customEvt = e as CustomEvent<Product[]>;
      if (customEvt.detail && Array.isArray(customEvt.detail)) {
        setProducts(customEvt.detail);
      }
    };

    const handleNewProductUploaded = (e: Event) => {
      const customEvt = e as CustomEvent<Product>;
      if (customEvt.detail?.name) {
        showToast(`⚡ New Wholesale Arrival: "${customEvt.detail.name}" is now live in catalog!`, 'info');
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('eagle_products_updated', handleLocalProductsUpdate);
      window.addEventListener('eagle_product_newly_added', handleNewProductUploaded);
      window.addEventListener('ee_open_support_chat', () => handleOpenSupport());
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('eagle_products_updated', handleLocalProductsUpdate);
        window.removeEventListener('eagle_product_newly_added', handleNewProductUploaded);
        window.removeEventListener('ee_open_support_chat', () => handleOpenSupport());
      }
    };
  }, []);

  const handleOrderSuccess = (order: Order) => {
    handleNavigate('orders');
    showToast(`Order ${order.orderNumber} successfully placed! You can track freight progress below.`, 'success');
  };

  const handleOpenSupportWithProduct = (product: Product) => {
    setSupportProductInquiry(product);
    setSupportCustomMessage(null);
    handleNavigate('support');
  };

  const handleOpenSupport = (prefilledMessage?: string) => {
    setSupportProductInquiry(null);
    setSupportCustomMessage(prefilledMessage || null);
    handleNavigate('support');
  };

  const handleClearInitialInquiry = useCallback(() => {
    setSupportProductInquiry(null);
    setSupportCustomMessage(null);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] text-slate-900 dark:text-zinc-100 flex flex-col font-sans selection:bg-[#F27D26] selection:text-black transition-colors duration-300">
      
      {/* Top Navigation Bar - Always Visible Sticky Header */}
      <div className={`sticky top-0 z-40 w-full ${currentView === 'support' ? 'hidden lg:block' : ''}`}>
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          onOpenSupport={() => handleOpenSupport()}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          products={products}
          onSelectProduct={setSelectedProduct}
          onSelectCategoryFilter={handleSelectCategoryFilter}
        />
      </div>

      {/* Main Content Area - Full-Width Layout */}
      <main id="main-content-area" className={`flex-1 w-full transition-all duration-300 ${
        currentView === 'support' 
          ? 'p-0 lg:px-8 lg:pt-6 lg:pb-12' 
          : 'px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12'
      }`}>
        
        {/* Home Overview Page */}
        {currentView === 'home' && (
          <Suspense fallback={<PageSkeleton />}>
            <HomePage
              products={products}
              onNavigate={handleNavigate}
              onSelectProduct={setSelectedProduct}
              onRequestQuote={handleRequestQuote}
              onOpenSupport={handleOpenSupport}
              onSelectCategoryFilter={handleSelectCategoryFilter}
            />
          </Suspense>
        )}

        {/* Wholesale Catalog Page */}
        {currentView === 'catalog' && (
          <Suspense fallback={<ProductGridSkeleton count={12} />}>
            <CatalogPage
              products={products}
              searchQuery={searchQuery}
              onSelectProduct={setSelectedProduct}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onOpenSupport={handleOpenSupport}
              onSearchChange={setSearchQuery}
              onNavigate={handleNavigate}
              onRequestQuote={handleRequestQuote}
              initialCategory={catalogInitialCategory}
              isLoading={isLoadingProducts}
            />
          </Suspense>
        )}

        {/* China Supply Chain & Shipping Page */}
        {currentView === 'supply-chain' && (
          <Suspense fallback={<PageSkeleton />}>
            <SupplyChainPage
              onNavigate={handleNavigate}
              onRequestQuote={handleRequestQuote}
              onOpenSupport={handleOpenSupport}
            />
          </Suspense>
        )}

        {/* Custom RFQ & Landed Sourcing Page */}
        {currentView === 'rfq' && (
          <Suspense fallback={<PageSkeleton />}>
            <RFQPage
              onNavigate={handleNavigate}
              initialCategory={rfqInitialCategory}
              initialProductName={rfqInitialProduct}
            />
          </Suspense>
        )}

        {/* About Eagle Excel Page */}
        {currentView === 'about' && (
          <Suspense fallback={<PageSkeleton />}>
            <AboutPage
              onNavigate={handleNavigate}
              onOpenSupport={handleOpenSupport}
            />
          </Suspense>
        )}

        {/* Import Compliance & Docs Page */}
        {currentView === 'docs' && (
          <Suspense fallback={<PageSkeleton />}>
            <DocsPage
              onNavigate={handleNavigate}
              onRequestQuote={handleRequestQuote}
            />
          </Suspense>
        )}

        {/* Purchase Orders & Live Freight Tracking */}
        {currentView === 'orders' && (
          <Suspense fallback={<OrderListSkeleton count={4} />}>
            <CustomerDashboard />
          </Suspense>
        )}

        {/* Operations & Admin Console */}
        {currentView === 'admin' && isAdmin && (
          <Suspense fallback={<AdminDashboardSkeleton />}>
            <AdminDashboard onNavigate={handleNavigate} />
          </Suspense>
        )}

        {/* Admin-Only Dedicated Manage Products Page */}
        {currentView === 'manage-products' && isAdmin && (
          <Suspense fallback={<AdminDashboardSkeleton />}>
            <ManageProductsPage
              onNavigate={handleNavigate}
              onSelectProduct={setSelectedProduct}
            />
          </Suspense>
        )}

        {/* User / Business Profile Dashboard */}
        {currentView === 'profile' && (
          <Suspense fallback={<ProfileDashboardSkeleton />}>
            {!isHydrated ? (
              <ProfileDashboardSkeleton />
            ) : !currentUser ? (
              <div className="w-full max-w-xl mx-auto my-12 bg-white dark:bg-[#161616] p-8 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl text-center space-y-4 animate-fadeIn">
                <div className="w-16 h-16 bg-[#F27D26]/20 text-[#F27D26] rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                  <User className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Wholesale Account Profile</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                  Please sign in to configure your wholesale buyer profile, custom avatars, verified business details, tax credentials, and shipping addresses.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => handleNavigate('catalog')}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    Browse Catalog
                  </button>
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-bold shadow-lg transition-transform hover:scale-105 cursor-pointer"
                  >
                    Sign In / Register
                  </button>
                </div>
              </div>
            ) : isAdmin || role === 'admin' ? (
              <AdminProfileDashboard
                onNavigate={handleNavigate}
                onOpenSettings={() => setIsSettingsModalOpen(true)}
              />
            ) : (
              <CustomerProfileDashboard
                onNavigate={handleNavigate}
                onOpenSupport={handleOpenSupport}
              />
            )}
          </Suspense>
        )}

        {/* Commercial Live Support Dedicated Full Page */}
        {currentView === 'support' && (
          <Suspense fallback={<PageSkeleton />}>
            <SupportPage
              onNavigate={handleNavigate}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              initialProductInquiry={supportProductInquiry}
              initialCustomMessage={supportCustomMessage}
              onClearInitialInquiry={handleClearInitialInquiry}
            />
          </Suspense>
        )}
      </main>

      {/* Footer */}
      <div className={currentView === 'support' ? 'hidden lg:block' : ''}>
        <Footer
          onNavigate={handleNavigate}
          onOpenSupport={() => handleOpenSupport()}
          onOpenSettings={() => setIsSettingsModalOpen(true)}
        />
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Suspense fallback={null}>
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onOpenSupportWithProduct={handleOpenSupportWithProduct}
          />
        </Suspense>
      )}

      {/* Wholesale Cart Drawer */}
      <CartDrawer
        onOrderSuccess={handleOrderSuccess}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Dedicated Support Chat Modal */}
      {isSupportModalOpen && (
        <Suspense fallback={null}>
          <CustomerSupportModal
            isOpen={isSupportModalOpen}
            onClose={() => {
              setIsSupportModalOpen(false);
              setSupportProductInquiry(null);
              setSupportCustomMessage(null);
            }}
            initialProductInquiry={supportProductInquiry}
            initialCustomMessage={supportCustomMessage}
            onOpenAuth={() => {
              setIsSupportModalOpen(false);
              setIsAuthModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* Quick Landed Quote Modal */}
      {isQuoteModalOpen && (
        <Suspense fallback={null}>
          <RequestQuoteModal
            isOpen={isQuoteModalOpen}
            onClose={() => {
              setIsQuoteModalOpen(false);
              setQuoteModalCategory(undefined);
              setQuoteModalProduct(undefined);
            }}
            initialCategory={quoteModalCategory}
            initialProductName={quoteModalProduct}
          />
        </Suspense>
      )}

      {/* Platform & Theme Settings Modal */}
      {isSettingsModalOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Authentication Modal */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={(userRole) => {
              setIsAuthModalOpen(false);
              if (userRole === 'admin') {
                handleNavigate('admin');
              } else {
                handleNavigate('home');
              }
            }}
          />
        </Suspense>
      )}

      {/* Modern Command Palette (⌘K / Ctrl+K) */}
      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            products={products}
            onNavigate={handleNavigate}
            onSelectProduct={setSelectedProduct}
            onOpenSupport={() => handleOpenSupport()}
          />
        </Suspense>
      )}

      {/* Global Real-Time Customer Message Notification Watcher */}
      <CustomerMessageWatcher
        isSupportOpen={isSupportModalOpen}
        onOpenSupport={() => handleOpenSupport()}
        currentView={currentView}
      />

      {/* Floating WhatsApp Quick Contact for Nigeria & Cameroon */}
      <div className={currentView === 'support' ? 'hidden lg:block' : ''}>
        <Suspense fallback={null}>
          <FloatingWhatsAppButton onOpenSupport={() => handleOpenSupport()} />
        </Suspense>
        <ScrollToTopButton />
        <OfflineBanner />
      </div>

    </div>
  );
};

export default function App() {
  const [isCallback, setIsCallback] = useState(() => isOAuthCallbackOrPopup());

  useEffect(() => {
    const handleUrlChange = () => {
      setIsCallback(isOAuthCallbackOrPopup());
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (isCallback) {
    return <OAuthCallbackHandler onComplete={() => setIsCallback(false)} />;
  }

  return (
    <ThemeProvider>
      <CurrencyProvider>
        <ToastProvider>
          <AuthProvider>
            <OfflineProvider>
              <NotificationProvider>
                <OrderProvider>
                  <CartProvider>
                    <MainApp />
                  </CartProvider>
                </OrderProvider>
              </NotificationProvider>
            </OfflineProvider>
          </AuthProvider>
        </ToastProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

