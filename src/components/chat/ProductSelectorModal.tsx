import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Package, Check, DollarSign } from 'lucide-react';
import { Product, ChatAttachedProduct } from '../../types';
import { getCachedProducts, getProductsFromDatabase } from '../../services/productService';
import { useCurrency } from '../../context/CurrencyContext';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: ChatAttachedProduct) => void;
}

export const ProductSelectorModal: React.FC<ProductSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct
}) => {
  const [products, setProducts] = useState<Product[]>(getCachedProducts);
  const [search, setSearch] = useState('');
  const { formatPrice } = useCurrency();

  useModalFocusLock(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      getProductsFromDatabase().then(prods => {
        if (prods && prods.length > 0) setProducts(prods);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (p: Product) => {
    onSelectProduct({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      image: p.images[0] || 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400',
      category: p.category,
      moq: p.minOrderQty,
      unit: p.unit || 'Carton'
    });
    onClose();
  };

  return createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white dark:bg-[#161616] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-[#F27D26]" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Attach Catalog Product</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-200 dark:border-white/10">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product name or SKU..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:border-[#F27D26] outline-none text-slate-900 dark:text-white"
              autoFocus
            />
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No products found matching "{search}"
            </div>
          ) : (
            filtered.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/5 hover:border-[#F27D26]/40 dark:hover:border-[#F27D26]/40 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex items-center gap-3 text-left transition-all group"
              >
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-black/30 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-400">
                    <span className="font-mono">{p.sku}</span>
                    <span>•</span>
                    <span className="capitalize">{p.category}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-[#F27D26] transition-colors">
                    {p.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-xs text-[#F27D26]">
                      {formatPrice(p.price)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400">
                      MOQ: {p.minOrderQty} {p.unit || 'units'}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

      </div>
    </div>,
    document.body
  );
};
