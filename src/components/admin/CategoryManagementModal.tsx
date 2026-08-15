import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Plus, 
  Trash2, 
  FolderPlus, 
  Layers, 
  Cpu, 
  Wrench, 
  Sparkles, 
  Factory, 
  Package, 
  Sun, 
  Truck, 
  Boxes, 
  Zap, 
  ShieldCheck, 
  ShoppingBag, 
  HardHat, 
  Compass, 
  Printer, 
  FlaskConical, 
  Hammer, 
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Category, Product } from '../../types';
import { 
  createCategoryInDatabase, 
  deleteCategoryFromDatabase 
} from '../../services/productService';
import { useToast } from '../Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  onCategoryCreated?: (category: Category) => void;
  onCategoryDeleted?: (categoryId: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Package', icon: Package, label: 'General Goods' },
  { name: 'Cpu', icon: Cpu, label: 'Electronics & Tech' },
  { name: 'Sun', icon: Sun, label: 'Solar & Renewable' },
  { name: 'Wrench', icon: Wrench, label: 'Hardware & Tools' },
  { name: 'Sparkles', icon: Sparkles, label: 'Textiles & Fashion' },
  { name: 'Factory', icon: Factory, label: 'Machinery & Industry' },
  { name: 'Boxes', icon: Boxes, label: 'Packaging & Cartons' },
  { name: 'Truck', icon: Truck, label: 'Freight & Logistics' },
  { name: 'Zap', icon: Zap, label: 'Power & Electrical' },
  { name: 'HardHat', icon: HardHat, label: 'Construction & Safety' },
  { name: 'ShoppingBag', icon: ShoppingBag, label: 'Merchandise & Retail' },
  { name: 'ShieldCheck', icon: ShieldCheck, label: 'Security & PPE' },
  { name: 'Layers', icon: Layers, label: 'Raw Materials' },
  { name: 'Printer', icon: Printer, label: 'Office & Digital' },
  { name: 'Compass', icon: Compass, label: 'Navigation & Marine' },
  { name: 'FlaskConical', icon: FlaskConical, label: 'Chemicals & Resins' },
  { name: 'Hammer', icon: Hammer, label: 'Heavy Equipment' },
];

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onCategoryCreated,
  onCategoryDeleted
}) => {
  const { showToast } = useToast();

  // Mode: 'list' | 'add'
  const [activeView, setActiveView] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedIconName, setSelectedIconName] = useState('Package');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category to Delete confirmation
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useModalFocusLock(isOpen, () => {
    if (!categoryToDelete && !isSubmitting && !isDeleting) {
      onClose();
    }
  });

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setActiveView('list');
      setSearchQuery('');
      setNewName('');
      setNewDescription('');
      setSelectedIconName('Package');
      setCategoryToDelete(null);
    }
  }, [isOpen]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(c => {
      const cleanSearch = (searchQuery || '').trim();
      if (!cleanSearch) return true;
      const q = cleanSearch.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q))
      );
    });
  }, [categories, searchQuery]);

  // Calculate product count for category
  const getProductCount = (category: Category) => {
    if (category.id === 'all') return products.length;
    const catId = (category.id || '').toLowerCase();
    const catName = (category.name || '').toLowerCase();
    const catSlug = (category.slug || '').toLowerCase();
    return products.filter(p => {
      const prodCat = (p.category || '').toLowerCase();
      return prodCat === catId || prodCat === catName || prodCat === catSlug;
    }).length;
  };

  // Render Icon component safely
  const renderCategoryIcon = (iconName?: string) => {
    const found = AVAILABLE_ICONS.find(i => i.name === iconName);
    const IconComponent = found ? found.icon : Package;
    return <IconComponent className="w-5 h-5" />;
  };

  // Add Category Submit
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = (newName || '').trim();
    if (!trimmed) {
      showToast('Please enter a category name.', 'error');
      return;
    }

    // Check duplicates
    const exists = categories.some(
      c => (c.name || '').toLowerCase() === trimmed.toLowerCase() || (c.id || '').toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showToast(`A category named "${trimmed}" already exists.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createCategoryInDatabase({
        name: trimmed,
        description: newDescription.trim() || `Wholesale ${trimmed} inventory & bulk lines`,
        iconName: selectedIconName
      });
      showToast(`Category "${trimmed}" created successfully!`);
      if (onCategoryCreated) onCategoryCreated(created);
      setNewName('');
      setNewDescription('');
      setSelectedIconName('Package');
      setActiveView('list');
    } catch (err) {
      console.error('Error creating category:', err);
      showToast('Failed to create category.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category Action
  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    if (categoryToDelete.id === 'all') {
      showToast('Cannot delete default "All Categories".', 'error');
      setCategoryToDelete(null);
      return;
    }

    setIsDeleting(true);
    try {
      const targetName = categoryToDelete.name;
      const targetId = categoryToDelete.id;
      await deleteCategoryFromDatabase(targetId);
      showToast(`Category "${targetName}" removed successfully.`);
      if (onCategoryDeleted) onCategoryDeleted(targetId);
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      showToast('Failed to delete category.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-portal-modal="true"
      className="fixed inset-0 z-[99990] isolate flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !categoryToDelete && !isSubmitting && !isDeleting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white dark:bg-[#141414] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-2xl w-full flex flex-col max-h-[90vh] text-slate-900 dark:text-zinc-100 overflow-hidden animate-scaleUp"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/20 text-[#F27D26] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 id="category-modal-title" className="text-base sm:text-lg font-bold font-serif text-slate-900 dark:text-white">
                Wholesale Categories Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Add, organize, and manage catalog classification categories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close category manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-1 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeView === 'list'
                  ? 'bg-[#F27D26] text-black shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('add')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeView === 'add'
                  ? 'bg-[#F27D26] text-black shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Category</span>
            </button>
          </div>

          {activeView === 'list' && (
            <div className="relative w-40 sm:w-56 hidden sm:block">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter categories..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:border-[#F27D26] outline-none"
              />
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
          
          {/* VIEW: CATEGORY LIST */}
          {activeView === 'list' && (
            <div className="space-y-3">
              {/* Mobile Search input */}
              <div className="sm:hidden relative w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:border-[#F27D26] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCategories.map(category => {
                  const productCount = getProductCount(category);
                  const isAll = category.id === 'all';

                  return (
                    <div
                      key={category.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-white/20 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center border border-[#F27D26]/20 shrink-0">
                            {renderCategoryIcon(category.iconName)}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                              {category.name}
                            </h4>
                            <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                              id: {category.id}
                            </span>
                          </div>
                        </div>

                        {isAll ? (
                          <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-[10px] font-bold text-slate-700 dark:text-zinc-300 whitespace-nowrap">
                            Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(category)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title={`Delete category "${category.name}"`}
                            aria-label={`Delete category ${category.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {category.description || 'No description provided.'}
                      </p>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 dark:text-zinc-500">Active Products</span>
                        <span className="font-bold text-slate-900 dark:text-white font-mono bg-white dark:bg-black/40 px-2 py-0.5 rounded-md border border-slate-200 dark:border-white/10">
                          {productCount} {productCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCategories.length === 0 && (
                <div className="p-8 text-center space-y-2 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  <Package className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    No categories found matching "{searchQuery}".
                  </p>
                </div>
              )}
            </div>
          )}

          {/* VIEW: ADD CATEGORY */}
          {activeView === 'add' && (
            <form onSubmit={handleCreateCategory} className="space-y-4" id="add-category-form">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Solar Power & Inverters, Heavy Machinery, Agro Equipment"
                  className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:border-[#F27D26] outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief summary of wholesale merchandise and industrial applications for this category..."
                  className="w-full px-4 py-2 text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl focus:border-[#F27D26] outline-none resize-none"
                />
              </div>

              {/* Icon Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center justify-between">
                  <span>Select Category Icon</span>
                  <span className="text-[11px] text-[#F27D26] font-mono">Selected: {selectedIconName}</span>
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 custom-scrollbar">
                  {AVAILABLE_ICONS.map(item => {
                    const IconComp = item.icon;
                    const isSelected = selectedIconName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setSelectedIconName(item.name)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#F27D26] shadow-xs'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[10px] font-medium truncate max-w-full">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview Card */}
              {(newName || '').trim() && (
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center border border-[#F27D26]/20 shrink-0">
                    {renderCategoryIcon(selectedIconName)}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      {(newName || '').trim()}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1">
                      {(newDescription || '').trim() || `Wholesale ${(newName || '').trim()} inventory & bulk lines`}
                    </p>
                  </div>
                </div>
              )}
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141414] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
          >
            Close
          </button>

          {activeView === 'add' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('list')}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Back to List
              </button>
              <button
                type="submit"
                form="add-category-form"
                disabled={isSubmitting || !newName.trim()}
                className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Category</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setActiveView('add')}
              className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Category</span>
            </button>
          )}
        </div>
      </div>

      {/* CONFIRMATION MODAL BEFORE DELETING CATEGORY */}
      {categoryToDelete && (
        <ConfirmDialog
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title="Delete Wholesale Category?"
          message={
            <span>
              Are you sure you want to delete the category <strong>"{categoryToDelete.name}"</strong>?
            </span>
          }
          confirmText="Yes, Delete Category"
          cancelText="Cancel & Keep"
          variant="danger"
          icon="trash"
          impactDetails={
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Impact Assessment</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                {getProductCount(categoryToDelete) > 0 ? (
                  <>
                    There are currently <strong>{getProductCount(categoryToDelete)} active products</strong> under this category. Deleting this category will remove it from the filter pills and RFQ dropdowns. Existing products will keep their listings.
                  </>
                ) : (
                  <>No products are currently assigned to this category. It is safe to remove.</>
                )}
              </p>
            </div>
          }
        />
      )}
    </div>,
    document.body
  );
};
