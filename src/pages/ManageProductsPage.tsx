import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  RefreshCw, 
  Layers, 
  DollarSign, 
  Tag, 
  Boxes, 
  ShieldCheck, 
  Sparkles, 
  X, 
  Database, 
  ExternalLink, 
  ArrowUpDown, 
  SlidersHorizontal,
  FileSpreadsheet,
  Lock,
  Eye,
  Check,
  Percent,
  TrendingDown,
  Info,
  FolderPlus
} from 'lucide-react';
import { Product, WholesaleTier, PageView, Category } from '../types';
import { 
  getProductsFromDatabase, 
  createProductInDatabase, 
  updateProductInDatabase, 
  deleteProductFromDatabase, 
  seedCatalogToDatabase, 
  uploadProductImage, 
  subscribeToProducts,
  getCachedProducts,
  getCachedCategories,
  getCategoriesFromDatabase,
  subscribeToCategories
} from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../components/Toast';
import { INITIAL_CATEGORIES } from '../data/seedData';
import { CategoryManagementModal } from '../components/admin/CategoryManagementModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

interface ManageProductsPageProps {
  onNavigate: (view: PageView) => void;
  onSelectProduct?: (product: Product) => void;
}

// Preset photo assets for quick commercial creation
const SAMPLE_IMAGE_PRESETS = [
  { label: 'Solar Panel 550W', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80' },
  { label: 'Power Drill Set', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&auto=format&fit=crop&q=80' },
  { label: 'Safety Steel Boots', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80' },
  { label: 'Diesel Generator', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80' },
  { label: 'Industrial LED High Bay', url: 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&auto=format&fit=crop&q=80' },
  { label: 'Commercial Electronics', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80' },
  { label: 'Safety Helmets & PPE', url: 'https://images.unsplash.com/photo-1578873375953-159517e47854?w=800&auto=format&fit=crop&q=80' },
  { label: 'Warehouse Pallet / Boxes', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80' }
];

export const ManageProductsPage: React.FC<ManageProductsPageProps> = ({
  onNavigate,
  onSelectProduct
}) => {
  const { currentUser, isAdmin, role, isHydrated, loading: authLoading, setSimulatedRole } = useAuth();
  const { formatPrice, currentCurrencyConfig } = useCurrency();
  const { showToast } = useToast();

  // Data states initialized instantly from memory/cache
  const [products, setProducts] = useState<Product[]>(getCachedProducts);
  const [categories, setCategories] = useState<Category[]>(getCachedCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc' | 'name'>('newest');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSeedConfirmOpen, setIsSeedConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirmation Modal
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('Electronics & Audio');
  const [customCategory, setCustomCategory] = useState('');
  const [formPrice, setFormPrice] = useState('49.99');
  const [formStock, setFormStock] = useState('500');
  const [formMoq, setFormMoq] = useState('10');
  const [formEstimatedFreight, setFormEstimatedFreight] = useState('25.00');
  const [formUnit, setFormUnit] = useState('Master Carton (10 Units)');
  const [formDesc, setFormDesc] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formTiers, setFormTiers] = useState<WholesaleTier[]>([
    { minQty: 10, pricePerUnit: 49.99, discountPercentage: 0 },
    { minQty: 50, pricePerUnit: 44.99, discountPercentage: 10 },
    { minQty: 200, pricePerUnit: 39.99, discountPercentage: 20 }
  ]);
  const [formSpecs, setFormSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: 'Packaging Type', value: 'Master Carton (Export Grade)' },
    { key: 'Lead Time', value: '1-3 Business Days Freight Dispatch' },
    { key: 'Compliance', value: 'Standard ISO9001 / CE Certified' }
  ]);

  // Image Upload state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Load products & categories in background without blocking UI
  const loadProducts = async () => {
    try {
      const [prods, cats] = await Promise.all([
        getProductsFromDatabase(),
        getCategoriesFromDatabase()
      ]);
      if (prods && prods.length > 0) setProducts(prods);
      if (cats && cats.length > 0) setCategories(cats);
    } catch (error) {
      console.warn('Background load:', error);
    }
  };

  useEffect(() => {
    loadProducts();

    // Subscribe to live database updates
    const unsubProducts = subscribeToProducts((liveProducts) => {
      if (liveProducts && liveProducts.length > 0) {
        setProducts(liveProducts);
      }
    });

    const unsubCategories = subscribeToCategories((liveCategories) => {
      if (liveCategories && liveCategories.length > 0) {
        setCategories(liveCategories);
      }
    });

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  // Lock body scroll whenever modals are active to prevent footer and background page collisions
  useEffect(() => {
    if (isModalOpen || deletingProduct || isCategoryModalOpen || isSeedConfirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, deletingProduct, isCategoryModalOpen, isSeedConfirmOpen]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [prods, cats] = await Promise.all([
        getProductsFromDatabase(),
        getCategoriesFromDatabase()
      ]);
      setProducts(prods);
      setCategories(cats);
      showToast('Catalog & categories refreshed!');
    } catch (e) {
      showToast('Refresh failed', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check admin authorization
  const userIsAdmin = isAdmin || role === 'admin';

  // Seed sample products if collection is empty
  const handleSeedDatabase = async () => {
    setIsRefreshing(true);
    setIsSeedConfirmOpen(false);
    try {
      const count = await seedCatalogToDatabase();
      showToast(`Successfully seeded ${count || 8} products to database!`);
      await loadProducts();
    } catch (err) {
      showToast('Failed to seed catalog', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Open Create or Edit Modal
  const openProductModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormName(product.name);
      setFormSku(product.sku);
      setFormCategory(product.category);
      setCustomCategory('');
      setFormPrice(product.price.toString());
      setFormStock(product.stock.toString());
      setFormMoq(product.minOrderQty.toString());
      setFormEstimatedFreight(product.estimatedFreight !== undefined ? product.estimatedFreight.toString() : '25.00');
      setFormUnit(product.unit);
      setFormDesc(product.description);
      setFormIsFeatured(product.isFeatured || false);
      setFormImages(product.images && product.images.length > 0 ? product.images : []);
      setFormTiers(product.wholesaleTiers && product.wholesaleTiers.length > 0 ? product.wholesaleTiers : [
        { minQty: product.minOrderQty || 10, pricePerUnit: product.price, discountPercentage: 0 }
      ]);
      if (product.specs) {
        const specArr = Object.entries(product.specs).map(([key, value]) => ({ key, value }));
        setFormSpecs(specArr.length > 0 ? specArr : [
          { key: 'Packaging', value: product.unit }
        ]);
      } else {
        setFormSpecs([{ key: 'Packaging', value: product.unit }]);
      }
    } else {
      setEditingProduct(null);
      setFormName('');
      setFormSku(`EE-${Math.floor(100 + Math.random() * 900)}`);
      setFormCategory('Solar & Renewable Energy');
      setCustomCategory('');
      setFormPrice('45.00');
      setFormStock('500');
      setFormMoq('10');
      setFormEstimatedFreight('25.00');
      setFormUnit('Master Carton (10 Units)');
      setFormDesc('High-grade commercial wholesale inventory item manufactured for enterprise distribution in West Africa.');
      setFormIsFeatured(false);
      setFormImages(['https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80']);
      setFormTiers([
        { minQty: 10, pricePerUnit: 45.00, discountPercentage: 0 },
        { minQty: 50, pricePerUnit: 39.50, discountPercentage: 12 },
        { minQty: 200, pricePerUnit: 33.00, discountPercentage: 26 }
      ]);
      setFormSpecs([
        { key: 'Packaging Type', value: 'Master Carton (10 Units)' },
        { key: 'Lead Time', value: '1-3 Business Days Freight Dispatch' },
        { key: 'Compliance', value: 'Standard ISO9001 / CE Commercial' }
      ]);
    }
    setIsModalOpen(true);
  };

  // Image Upload handler to Cloud Storage
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      showToast('Image file must be less than 10MB', 'error');
      return;
    }

    setIsUploadingImage(true);
    setUploadProgress(15);

    try {
      const downloadUrl = await uploadProductImage(file, (progress) => {
        setUploadProgress(progress);
      });

      setFormImages(prev => [downloadUrl, ...prev]);
      showToast('Product image uploaded successfully!');
    } catch (err) {
      console.error('Storage upload error:', err);
      showToast('Image upload failed. You can paste a web URL.', 'error');
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl.trim());
      setFormImages(prev => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
      showToast('Image URL added!');
    } catch (e) {
      showToast('Please enter a valid image URL (e.g. https://...)', 'error');
    }
  };

  const handleAddPresetImage = (url: string) => {
    if (!formImages.includes(url)) {
      setFormImages(prev => [...prev, url]);
      showToast('Preset image added');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  };

  // Add Spec Row
  const handleAddSpec = () => {
    setFormSpecs(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemoveSpec = (index: number) => {
    setFormSpecs(prev => prev.filter((_, i) => i !== index));
  };

  // Tier calculation helper
  const handleAddTier = () => {
    const basePrice = parseFloat(formPrice) || 10;
    const nextQty = (formTiers[formTiers.length - 1]?.minQty || 10) * 2;
    const discount = Math.min(35, (formTiers.length + 1) * 8);
    const discountedPrice = parseFloat((basePrice * (1 - discount / 100)).toFixed(2));
    
    setFormTiers(prev => [
      ...prev,
      { minQty: nextQty, pricePerUnit: discountedPrice, discountPercentage: discount }
    ]);
  };

  // Submit Product Form to Database
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(formName || '').trim()) {
      showToast('Product Title is required.', 'error');
      return;
    }
    if (!(formSku || '').trim()) {
      showToast('SKU code is required.', 'error');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    const stockNum = parseInt(formStock);
    if (isNaN(stockNum) || stockNum < 0) {
      showToast('Please enter a valid stock quantity.', 'error');
      return;
    }

    const moqNum = parseInt(formMoq);
    if (isNaN(moqNum) || moqNum < 1) {
      showToast('Minimum Order Quantity (MOQ) must be at least 1.', 'error');
      return;
    }

    const freightNum = parseFloat(formEstimatedFreight);
    const validFreight = !isNaN(freightNum) && freightNum >= 0 ? freightNum : 0;

    const finalCategory = formCategory === 'custom' ? ((customCategory || '').trim() || 'General Wholesale') : formCategory;

    // Convert specs array to Record<string, string>
    const specsObject: Record<string, string> = {};
    formSpecs.forEach(s => {
      const cleanKey = (s.key || '').trim();
      const cleanVal = (s.value || '').trim();
      if (cleanKey && cleanVal) {
        specsObject[cleanKey] = cleanVal;
      }
    });

    let finalImages = [...formImages];
    const cleanNewImg = (newImageUrl || '').trim();
    if (cleanNewImg && !finalImages.includes(cleanNewImg)) {
      finalImages.push(cleanNewImg);
      setNewImageUrl('');
    }
    if (finalImages.length === 0) {
      finalImages = ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'];
    }

    const payload = {
      name: (formName || '').trim(),
      sku: (formSku || '').trim().toUpperCase(),
      category: finalCategory,
      price: priceNum,
      stock: stockNum,
      minOrderQty: moqNum,
      unit: (formUnit || '').trim() || 'Unit',
      description: (formDesc || '').trim() || `${(formName || '').trim()} wholesale commercial inventory item.`,
      images: finalImages,
      wholesaleTiers: formTiers.length > 0 ? formTiers : [
        { minQty: moqNum, pricePerUnit: priceNum, discountPercentage: 0 }
      ],
      specs: Object.keys(specsObject).length > 0 ? specsObject : {
        'Packaging Type': (formUnit || '').trim() || 'Master Carton',
        'Compliance': 'Standard ISO9001 Commercial',
        'Lead Time': '1-3 Business Days Freight Dispatch'
      },
      estimatedFreight: validFreight,
      isFeatured: formIsFeatured
    };

    setIsSaving(true);
    try {
      if (editingProduct) {
        const updated = await updateProductInDatabase(editingProduct.id, payload);
        setProducts(prev => prev.map(p => p.id === editingProduct.id ? updated : p));
        showToast(`Product "${payload.name}" updated successfully!`);
      } else {
        const created = await createProductInDatabase(payload);
        setProducts(prev => [created, ...prev.filter(p => p.id !== created.id)]);
        showToast(`Product "${payload.name}" published to catalog!`);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      // Asynchronously refresh in background without holding the modal/button
      loadProducts().catch(() => {});
    } catch (err) {
      console.error('Error saving product to database:', err);
      showToast('Failed to save product to database.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete product action
  const confirmDeleteProduct = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProductFromDatabase(deletingProduct.id);
      showToast(`Product "${deletingProduct.name}" removed from catalog.`);
      setDeletingProduct(null);
      loadProducts().catch(() => {});
    } catch (err) {
      console.error('Error deleting product from database:', err);
      showToast('Failed to delete product', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick Inline Stock adjuster
  const handleQuickStockUpdate = async (product: Product, delta: number) => {
    const newStock = Math.max(0, product.stock + delta);
    try {
      await updateProductInDatabase(product.id, { stock: newStock });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, stock: newStock } : p));
      showToast(`Stock updated to ${newStock} units`);
    } catch (err) {
      showToast('Failed to update stock', 'error');
    }
  };

  // Distinct categories available from live state + catalog items
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    categories.forEach(c => {
      if (c.id !== 'all' && c.name) cats.add(c.name);
    });
    products.forEach(p => {
      if (p.category && p.category !== 'all') cats.add(p.category);
    });
    return Array.from(cats);
  }, [categories, products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Search query
        const cleanSearch = (searchQuery || '').trim();
        if (cleanSearch) {
          const q = cleanSearch.toLowerCase();
          const matchName = (product.name || '').toLowerCase().includes(q);
          const matchSku = (product.sku || '').toLowerCase().includes(q);
          const matchCat = (product.category || '').toLowerCase().includes(q);
          const matchDesc = (product.description || '').toLowerCase().includes(q);
          if (!matchName && !matchSku && !matchCat && !matchDesc) return false;
        }

        // Category filter
        if (selectedCategory !== 'all') {
          if (product.category.toLowerCase() !== selectedCategory.toLowerCase()) {
            return false;
          }
        }

        // Stock filter
        if (stockFilter === 'in_stock' && product.stock <= 0) return false;
        if (stockFilter === 'low_stock' && (product.stock > 100 || product.stock === 0)) return false;
        if (stockFilter === 'out_of_stock' && product.stock > 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'stock_asc') return a.stock - b.stock;
        if (sortBy === 'stock_desc') return b.stock - a.stock;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, searchQuery, selectedCategory, stockFilter, sortBy]);

  // Inventory Statistics
  const totalInventoryValue = useMemo(() => {
    return products.reduce((sum, p) => sum + (p.price * p.stock), 0);
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => p.stock > 0 && p.stock < 100).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => p.stock === 0).length;
  }, [products]);

  // If auth session is still hydrating or checking from database, show skeleton
  if (!isHydrated || authLoading) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6 animate-pulse">
        <div className="h-28 rounded-3xl bg-slate-200 dark:bg-white/5" />
        <div className="h-16 rounded-2xl bg-slate-200 dark:bg-white/5" />
        <div className="h-96 rounded-2xl bg-slate-200 dark:bg-white/5" />
      </div>
    );
  }

  // If user is not admin, show security barrier
  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fadeIn">
        <div className="bg-white dark:bg-[#161616] rounded-3xl border border-slate-200 dark:border-white/10 p-8 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center border border-amber-500/20 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Restricted Operations Area
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
              Administrator Access Required
            </h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              The <strong>Manage Products</strong> portal is restricted to authorized administrators permitted by the executive director. If you require access, please contact the administrator.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => onNavigate('catalog')}
              className="px-5 py-2.5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-bold text-xs transition-colors cursor-pointer"
            >
              Back to Wholesale Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#141414] p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('admin')}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-[#F27D26] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
            <span className="text-slate-300 dark:text-zinc-600">•</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
              <Database className="w-3 h-3" />
              Database `products` Live
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Manage Wholesale Products</span>
            <span className="text-xs font-mono font-normal px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300">
              {products.length} SKUs
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Create, edit, image upload, and delete wholesale products in your real-time database.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh from Database"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F27D26]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {products.length === 0 && (
            <button
              onClick={() => setIsSeedConfirmOpen(true)}
              disabled={isRefreshing}
              className="py-2.5 px-4 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4" />
              <span>Seed Initial Catalog</span>
            </button>
          )}

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4 text-[#F27D26]" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={() => onNavigate('catalog')}
            className="py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Eye className="w-4 h-4 text-[#F27D26]" />
            <span>View Public Catalog</span>
          </button>

          <button
            id="admin-add-product-btn"
            onClick={() => openProductModal()}
            className="py-2.5 px-5 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-black shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Metric Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Catalog Inventory</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {products.length}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              {availableCategories.length} active categories
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Warehouse Stock</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {products.reduce((acc, p) => acc + (p.stock || 0), 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              Units across inventory
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Wholesale Value</span>
            <div className="text-2xl font-black text-[#F27D26] mt-1">
              {formatPrice(totalInventoryValue)}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              Calculated at base wholesale
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Stock Alerts</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <span className={lowStockCount > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}>{lowStockCount}</span>
              {outOfStockCount > 0 && (
                <span className="text-xs text-rose-500 font-bold px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                  {outOfStockCount} OOS
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
              {lowStockCount > 0 ? 'Requires freight reorder' : 'All items well-stocked'}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Filter & Search Controls Bar */}
      <div className="bg-white dark:bg-[#141414] p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU (e.g. EE-SOL-99), category, or specs..."
              className="w-full pl-10 pr-9 py-2.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-2xl focus:ring-2 focus:ring-[#F27D26] focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-zinc-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Category Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-1.5 text-xs">
              <Tag className="w-3.5 h-3.5 text-[#F27D26]" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent text-slate-900 dark:text-zinc-200 outline-none font-semibold text-xs cursor-pointer"
              >
                <option value="all" className="dark:bg-[#161616]">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat} className="dark:bg-[#161616]">{cat}</option>
                ))}
              </select>
            </div>

            {/* Stock Level Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-1.5 text-xs">
              <Boxes className="w-3.5 h-3.5 text-[#F27D26]" />
              <select
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value as any)}
                className="bg-transparent text-slate-900 dark:text-zinc-200 outline-none font-semibold text-xs cursor-pointer"
              >
                <option value="all" className="dark:bg-[#161616]">All Stock Levels</option>
                <option value="in_stock" className="dark:bg-[#161616]">In Stock (&gt; 0)</option>
                <option value="low_stock" className="dark:bg-[#161616]">Low Stock (&lt; 100)</option>
                <option value="out_of_stock" className="dark:bg-[#161616]">Out of Stock (0)</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-3 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#F27D26]" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 dark:text-zinc-200 outline-none font-semibold text-xs cursor-pointer"
              >
                <option value="newest" className="dark:bg-[#161616]">Newest Added</option>
                <option value="oldest" className="dark:bg-[#161616]">Oldest First</option>
                <option value="price_desc" className="dark:bg-[#161616]">Price: High to Low</option>
                <option value="price_asc" className="dark:bg-[#161616]">Price: Low to High</option>
                <option value="stock_desc" className="dark:bg-[#161616]">Stock: Highest</option>
                <option value="stock_asc" className="dark:bg-[#161616]">Stock: Lowest</option>
                <option value="name" className="dark:bg-[#161616]">Name: A-Z</option>
              </select>
            </div>

          </div>

        </div>

        {/* Category Fast Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 pt-0.5 mb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-[#F27D26] text-black shadow-xs'
                : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300'
            }`}
          >
            All Categories ({products.length})
          </button>
          {availableCategories.map(cat => {
            const count = products.filter(p => p.category?.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                className={`px-3 py-1 rounded-xl font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#F27D26] text-black shadow-xs font-bold'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] font-mono ${isSelected ? 'text-black/70' : 'text-slate-400 dark:text-zinc-500'}`}>
                  ({count})
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-1 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 bg-[#F27D26]/10 hover:bg-[#F27D26]/20 text-[#F27D26] border border-[#F27D26]/30 whitespace-nowrap ml-1"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Manage Categories</span>
          </button>
        </div>

      </div>

      {/* Products Table & Card Grid View */}
      <div className="bg-white dark:bg-[#141414] rounded-3xl border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden">
        
        {/* Table Header Summary */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm">
              Live Product Inventory
            </h2>
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              Showing {filteredProducts.length} of {products.length} items
            </span>
          </div>

          <div className="flex items-center gap-2">
            {searchQuery || selectedCategory !== 'all' || stockFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setStockFilter('all');
                }}
                className="text-xs text-[#F27D26] hover:underline font-semibold"
              >
                Reset Filters
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#F27D26] animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
              Synchronizing with database `products` collection...
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-zinc-500 flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">No products found</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'No items match your active search and category filters.'
                  : 'Your database products table is currently empty.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => openProductModal()}
                className="px-4 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-bold shadow-md cursor-pointer"
              >
                Add First Product
              </button>
              {products.length === 0 && (
                <button
                  onClick={handleSeedDatabase}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                >
                  Seed Sample Products
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-white/[0.03] text-slate-700 dark:text-zinc-300 font-bold border-b border-slate-200 dark:border-white/5">
                <tr>
                  <th className="p-4">Product Details & SKU</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Base Price</th>
                  <th className="p-4">Wholesale Tiers</th>
                  <th className="p-4">Stock Level</th>
                  <th className="p-4">MOQ & Unit</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {filteredProducts.map((product) => {
                  const isLow = product.stock > 0 && product.stock < 100;
                  const isOOS = product.stock === 0;

                  return (
                    <tr 
                      key={product.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Product Name, SKU, Image */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                            <img
                              src={product.images && product.images[0] ? product.images[0] : 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            {product.isFeatured && (
                              <span className="absolute top-1 left-1 bg-[#F27D26] text-black text-[8px] font-black px-1 rounded-sm shadow-xs">
                                HOT
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-mono uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-bold">
                                {product.sku}
                              </span>
                              {product.images && product.images.length > 1 && (
                                <span className="text-[9px] text-slate-400 dark:text-zinc-500 font-mono">
                                  +{product.images.length - 1} photos
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-xs line-clamp-1 group-hover:text-[#F27D26] transition-colors">
                              {product.name}
                            </h3>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 font-semibold text-[11px]">
                          <Tag className="w-2.5 h-2.5 text-[#F27D26]" />
                          <span>{product.category}</span>
                        </span>
                      </td>

                      {/* Base Price */}
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white text-xs">
                        <div>{formatPrice(product.price)}</div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal font-sans block">
                          USD ${product.price.toFixed(2)}
                        </span>
                      </td>

                      {/* Wholesale Tiers */}
                      <td className="p-4">
                        {product.wholesaleTiers && product.wholesaleTiers.length > 0 ? (
                          <div className="space-y-0.5 text-[10px]">
                            {product.wholesaleTiers.slice(0, 2).map((tier, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                                <span className="font-semibold text-slate-800 dark:text-zinc-300">{tier.minQty}+:</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">${tier.pricePerUnit.toFixed(2)}</span>
                                {tier.discountPercentage ? (
                                  <span className="text-[9px] text-[#F27D26]">(-{tier.discountPercentage}%)</span>
                                ) : null}
                              </div>
                            ))}
                            {product.wholesaleTiers.length > 2 && (
                              <span className="text-[9px] text-slate-400 dark:text-zinc-500">
                                +{product.wholesaleTiers.length - 2} more bulk tiers
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">Standard rate</span>
                        )}
                      </td>

                      {/* Stock Level with Fast Inline Adjusters */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                isOOS ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                              <span className="font-mono font-bold text-slate-900 dark:text-zinc-100 text-xs">
                                {product.stock.toLocaleString()}
                              </span>
                            </div>
                            <span className={`text-[10px] font-semibold block mt-0.5 ${
                              isOOS ? 'text-rose-500' : isLow ? 'text-amber-500' : 'text-slate-400 dark:text-zinc-500'
                            }`}>
                              {isOOS ? 'Out of Stock' : isLow ? 'Low Stock (<100)' : 'In Stock'}
                            </span>
                          </div>

                          {/* Quick Delta Buttons */}
                          <div className="flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleQuickStockUpdate(product, -10)}
                              className="w-5 h-5 rounded bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                              title="Decrease stock by 10"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleQuickStockUpdate(product, +50)}
                              className="w-5 h-5 rounded bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-zinc-300 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                              title="Increase stock by 50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* MOQ & Packaging Unit */}
                      <td className="p-4">
                        <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                          MOQ: {product.minOrderQty || 1}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block truncate max-w-[130px]">
                          {product.unit}
                        </span>
                        <span className="inline-block mt-0.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Freight: {typeof product.estimatedFreight === 'number' ? `$${product.estimatedFreight.toFixed(2)}` : '$0.00'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview in Catalog */}
                          {onSelectProduct && (
                            <button
                              onClick={() => onSelectProduct(product)}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 transition-colors cursor-pointer"
                              title="Preview Details Modal"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => openProductModal(product)}
                            className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-[#F27D26]/15 hover:text-[#F27D26] text-slate-700 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-200/60 dark:border-white/5"
                            title="Edit Product Details"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#F27D26]" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* CREATE & EDIT PRODUCT MODAL */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div 
          data-portal-modal="true"
          className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-hidden animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-2xl w-full max-h-[90vh] sm:max-h-[88vh] overflow-hidden flex flex-col text-slate-900 dark:text-zinc-100 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold shrink-0">
                  {editingProduct ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-slate-900 dark:text-white">
                    {editingProduct ? 'Edit Wholesale Product' : 'Add New Product to Catalog'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono">
                    Product ID: {editingProduct?.id || 'new_auto_id'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form id="manage-product-form" onSubmit={handleSaveProduct} noValidate className="flex-1 p-5 sm:p-6 space-y-5 text-xs overflow-y-auto overscroll-contain">
              
              {/* Row 1: Product Name & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. 550W Monocrystalline Commercial Solar Panel"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] focus:border-transparent outline-none font-medium placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block font-bold text-slate-700 dark:text-zinc-300">
                      SKU Code *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormSku(`EE-${Math.floor(100 + Math.random() * 900)}`)}
                      className="text-[10px] text-[#F27D26] hover:underline cursor-pointer font-semibold"
                    >
                      Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={e => setFormSku(e.target.value)}
                    placeholder="EE-SOL-550"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none font-mono font-bold uppercase placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Row 2: Category & Featured Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-700 dark:text-zinc-300">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] text-[#F27D26] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <FolderPlus className="w-3 h-3" />
                      <span>+ Manage Categories</span>
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none font-semibold cursor-pointer"
                  >
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat} className="dark:bg-[#161616]">{cat}</option>
                    ))}
                    <option value="custom" className="dark:bg-[#161616]">+ Custom Category...</option>
                  </select>

                  {formCategory === 'custom' && (
                    <input
                      type="text"
                      value={customCategory}
                      onChange={e => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category name..."
                      className="w-full mt-2 p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none"
                    />
                  )}
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={formIsFeatured}
                      onChange={e => setFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-[#F27D26] rounded accent-[#F27D26]"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-zinc-200 block">Featured in Hero / Deals</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">Highlights item on homepage & top wholesale banners</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Row 3: Price, Est. Freight, Stock, MOQ, Packaging Unit */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Base Price ($ USD) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formPrice}
                      onChange={e => setFormPrice(e.target.value)}
                      placeholder="49.99"
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Est. Freight ($ USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formEstimatedFreight}
                      onChange={e => setFormEstimatedFreight(e.target.value)}
                      placeholder="25.00"
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Warehouse Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    placeholder="500"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Min Order Qty (MOQ) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formMoq}
                    onChange={e => setFormMoq(e.target.value)}
                    placeholder="10"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none font-bold placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    Packaging Unit
                  </label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                    placeholder="Master Carton (10 pcs)"
                    className="w-full p-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Commercial Description *
                </label>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Provide comprehensive product specifications, commercial grade rating, compliance details, and logistics characteristics..."
                  className="w-full p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl focus:ring-2 focus:ring-[#F27D26] outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 leading-relaxed"
                />
              </div>

              {/* Image Upload to Cloud Storage & Gallery */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#F27D26]" />
                    <span>Product Images (Cloud Storage & URLs)</span>
                  </label>
                  {isUploadingImage && (
                    <span className="text-[#F27D26] font-bold text-[11px] flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Uploading ({uploadProgress}%)...
                    </span>
                  )}
                </div>

                {/* Upload Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label className="cursor-pointer py-2.5 px-4 bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/20 rounded-xl font-bold flex items-center justify-center gap-2 text-slate-800 dark:text-zinc-200 transition-colors shadow-2xs">
                    <Upload className="w-4 h-4 text-[#F27D26]" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="Or paste web image URL (https://...)"
                      className="flex-1 p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-600 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="py-2 px-3.5 bg-slate-200 dark:bg-white/10 hover:bg-[#F27D26] hover:text-black font-bold rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {/* Preset Image Quick Selector */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold block">
                    Quick Sample Presets:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {SAMPLE_IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddPresetImage(preset.url)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white dark:bg-white/5 hover:bg-[#F27D26]/20 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Uploaded Images Gallery Preview */}
                {formImages.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                      Product Gallery ({formImages.length} images - first is primary):
                    </span>
                    <div className="flex gap-2.5 overflow-x-auto pb-1">
                      {formImages.map((img, idx) => (
                        <div 
                          key={idx} 
                          className="relative w-20 h-20 rounded-2xl border-2 border-slate-200 dark:border-white/10 overflow-hidden shrink-0 group bg-slate-100 dark:bg-black shadow-xs"
                        >
                          <img src={img} alt={`preview-${idx}`} className="w-full h-full object-cover" />
                          
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 bg-[#F27D26] text-black text-[8px] font-black px-1 rounded shadow-xs">
                              Main
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-rose-700 cursor-pointer"
                            title="Remove image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Wholesale Tier Schedules */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Wholesale Bulk Volume Discount Tiers
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Tiered unit prices automatically applied in buyer carts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTier}
                    className="text-[11px] text-[#F27D26] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Volume Tier
                  </button>
                </div>

                <div className="space-y-2">
                  {formTiers.map((tier, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white dark:bg-white/5 p-2 rounded-xl border border-slate-200 dark:border-white/10">
                      <span className="font-bold text-slate-500 dark:text-zinc-400 text-[11px] shrink-0">
                        Tier {idx + 1}: Min Units
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={tier.minQty}
                        onChange={e => {
                          const updated = [...formTiers];
                          updated[idx].minQty = parseInt(e.target.value) || 1;
                          setFormTiers(updated);
                        }}
                        className="w-20 p-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-center font-mono font-bold text-slate-900 dark:text-white text-xs"
                      />

                      <span className="font-bold text-slate-500 dark:text-zinc-400 text-[11px] shrink-0">
                        Price / Unit ($)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.pricePerUnit}
                        onChange={e => {
                          const updated = [...formTiers];
                          updated[idx].pricePerUnit = parseFloat(e.target.value) || 0;
                          setFormTiers(updated);
                        }}
                        className="w-24 p-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs"
                      />

                      <button
                        type="button"
                        onClick={() => setFormTiers(formTiers.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors ml-auto cursor-pointer"
                        title="Delete tier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Technical & Logistics Specs
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                      Key attributes (e.g. Dimensions, Weight, Certification, Voltage, Origin)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="text-[11px] text-[#F27D26] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Spec Attribute
                  </button>
                </div>

                <div className="space-y-2">
                  {formSpecs.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Feature / Attribute (e.g. Origin)"
                        value={spec.key}
                        onChange={e => {
                          const updated = [...formSpecs];
                          updated[idx].key = e.target.value;
                          setFormSpecs(updated);
                        }}
                        className="w-1/3 p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl outline-none font-semibold text-xs"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Ningbo, China)"
                        value={spec.value}
                        onChange={e => {
                          const updated = [...formSpecs];
                          updated[idx].value = e.target.value;
                          setFormSpecs(updated);
                        }}
                        className="flex-1 p-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 rounded-xl outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSpec(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </form>

            {/* Modal Action Buttons Footer (Pinned at bottom so always visible and never overlaps) */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141414] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-bold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="manage-product-form"
                id={editingProduct ? "btn-save-product-changes" : "btn-publish-product"}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-2xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-black shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs whitespace-nowrap"
              >
                {isSaving && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
                <span className="whitespace-nowrap">
                  {isSaving
                    ? (editingProduct ? 'Saving Changes...' : 'Publishing...')
                    : (editingProduct ? 'Save Changes' : 'Publish to Catalog')}
                </span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        products={products}
        onCategoryCreated={(newCat) => {
          setFormCategory(newCat.name);
          setSelectedCategory(newCat.name);
        }}
        onCategoryDeleted={(deletedId) => {
          if (selectedCategory === deletedId || selectedCategory.toLowerCase() === deletedId.toLowerCase()) {
            setSelectedCategory('all');
          }
        }}
      />

      {/* SEED CATALOG CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={isSeedConfirmOpen}
        onClose={() => setIsSeedConfirmOpen(false)}
        onConfirm={handleSeedDatabase}
        isLoading={isRefreshing}
        title="Seed Initial Wholesale Catalog?"
        message={
          <span>
            Populate initial China-Africa wholesale products and categories into your live database?
          </span>
        }
        confirmText="Yes, Seed Catalog"
        cancelText="Cancel"
        variant="info"
        icon="info"
        impactDetails={
          <div className="space-y-1">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              This will create 8 pre-configured commercial products across diverse industrial categories with wholesale pricing tiers, realistic inventory, and specifications.
            </p>
          </div>
        }
      />

      {/* DELETE PRODUCT CONFIRMATION DIALOG */}
      {deletingProduct && (
        <ConfirmDialog
          isOpen={!!deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onConfirm={confirmDeleteProduct}
          isLoading={isDeleting}
          title="Delete Product from Catalog?"
          message={
            <span>
              Are you sure you want to permanently remove <strong>"{deletingProduct.name}"</strong> (SKU: {deletingProduct.sku}) from your database?
            </span>
          }
          confirmText="Yes, Delete Product"
          cancelText="Keep Product"
          variant="danger"
          icon="trash"
          impactDetails={
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Action Cannot Be Undone</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Customers will no longer be able to purchase or view this SKU on the wholesale marketplace or submit RFQ orders.
              </p>
            </div>
          }
        />
      )}

    </div>
  );
};
