import React from 'react';
import { Package, ShoppingCart, Check, ExternalLink } from 'lucide-react';
import { ChatAttachedProduct } from '../../types';
import { useCart } from '../../context/CartContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../Toast';

interface ChatProductCardProps {
  product: ChatAttachedProduct;
  isMe?: boolean;
}

export const ChatProductCard: React.FC<ChatProductCardProps> = ({ product, isMe }) => {
  const { addItem } = useCart();
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const [added, setAdded] = React.useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Convert to minimal Product structure
    const cartProduct = {
      id: product.id,
      name: product.name,
      sku: product.sku,
      category: product.category || 'general',
      price: product.price,
      stock: 1000,
      minOrderQty: product.moq || 1,
      unit: product.unit || 'Carton',
      images: [product.image],
      description: product.name,
      specs: {},
      wholesaleTiers: [
        { minQty: product.moq || 1, pricePerUnit: product.price, discountPercentage: 0 }
      ],
      createdAt: new Date().toISOString()
    };

    addItem(cartProduct, product.moq || 1, product.price);
    setAdded(true);
    showToast(`Added ${product.moq || 1}x ${product.name} to wholesale cart`, 'success');
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={`mt-2 rounded-xl p-3 border transition-all ${
      isMe
        ? 'bg-black/15 border-black/20 text-black'
        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100'
    }`}>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400';
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Catalog Ref</span>
            <span className="text-[10px] font-mono opacity-80">{product.sku}</span>
          </div>
          <h4 className="font-bold text-xs truncate mt-0.5">{product.name}</h4>
          
          <div className="flex items-center gap-2 mt-1">
            <span className="font-extrabold text-xs text-[#F27D26] dark:text-[#F27D26]">
              {formatPrice(product.price)}
            </span>
            {product.moq && (
              <span className="text-[10px] opacity-70">
                MOQ: {product.moq} {product.unit || 'units'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2.5 pt-2 border-t border-current/10 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={added}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
            added
              ? 'bg-emerald-600 text-white'
              : isMe
              ? 'bg-black text-white hover:bg-black/80'
              : 'bg-[#F27D26] text-black hover:bg-[#e06d1a]'
          }`}
        >
          {added ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              Added to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              Add MOQ ({product.moq || 1})
            </>
          )}
        </button>
      </div>
    </div>
  );
};
