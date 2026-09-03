import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Product, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  shippingCost: number;
  transactionFee: number;
  vatFee: number;
  tax: number;
  total: number;
  addToCart: (product: Product, quantity?: number) => void;
  addMultipleToCart: (itemsToAdd: { product: Product; quantity?: number }[]) => void;
  addItem?: (product: Product, quantity?: number, price?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  calculateTierPrice: (product: Product, quantity: number) => number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to determine bulk price according to tier
export function getProductTierPrice(product: Product, quantity: number): number {
  if (!product.wholesaleTiers || product.wholesaleTiers.length === 0) {
    return product.price;
  }

  // Sort tiers by minQty descending to find highest applicable tier
  const sortedTiers = [...product.wholesaleTiers].sort((a, b) => b.minQty - a.minQty);
  for (const tier of sortedTiers) {
    if (quantity >= tier.minQty) {
      return tier.pricePerUnit;
    }
  }

  return product.price;
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ee_wholesale_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem('ee_wholesale_cart', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cart to localStorage', e);
    }
  }, [items]);

  const addToCart = useCallback((product: Product, requestedQty?: number) => {
    const qty = requestedQty !== undefined ? requestedQty : (product.minOrderQty || 1);
    
    setItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.product.id === product.id);
      
      if (existingIndex > -1) {
        const newQty = prevItems[existingIndex].quantity + qty;
        const tierPrice = getProductTierPrice(product, newQty);
        const updated = [...prevItems];
        updated[existingIndex] = {
          product,
          quantity: newQty,
          selectedTierPrice: tierPrice,
          subtotal: Number((newQty * tierPrice).toFixed(2))
        };
        return updated;
      } else {
        const tierPrice = getProductTierPrice(product, qty);
        return [
          ...prevItems,
          {
            product,
            quantity: qty,
            selectedTierPrice: tierPrice,
            subtotal: Number((qty * tierPrice).toFixed(2))
          }
        ];
      }
    });

    setIsCartOpen(true);
  }, []);

  const addMultipleToCart = useCallback((itemsToAdd: { product: Product; quantity?: number }[]) => {
    if (!itemsToAdd || itemsToAdd.length === 0) return;

    setItems(prevItems => {
      const updated = [...prevItems];

      itemsToAdd.forEach(({ product, quantity: requestedQty }) => {
        const qty = requestedQty !== undefined ? requestedQty : (product.minOrderQty || 1);
        const existingIndex = updated.findIndex(item => item.product.id === product.id);

        if (existingIndex > -1) {
          const newQty = updated[existingIndex].quantity + qty;
          const tierPrice = getProductTierPrice(product, newQty);
          updated[existingIndex] = {
            product,
            quantity: newQty,
            selectedTierPrice: tierPrice,
            subtotal: Number((newQty * tierPrice).toFixed(2))
          };
        } else {
          const tierPrice = getProductTierPrice(product, qty);
          updated.push({
            product,
            quantity: qty,
            selectedTierPrice: tierPrice,
            subtotal: Number((qty * tierPrice).toFixed(2))
          });
        }
      });

      return updated;
    });

    setIsCartOpen(true);
  }, []);

  const addItem = useCallback((product: Product, quantity?: number) => {
    addToCart(product, quantity || 1);
  }, [addToCart]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(item => item.product.id !== productId);
      }

      return prevItems.map(item => {
        if (item.product.id === productId) {
          const validQty = Math.max(item.product.minOrderQty || 1, quantity);
          const tierPrice = getProductTierPrice(item.product, validQty);
          return {
            ...item,
            quantity: validQty,
            selectedTierPrice: tierPrice,
            subtotal: Number((validQty * tierPrice).toFixed(2))
          };
        }
        return item;
      });
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const subtotal = useMemo(() => Number(items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)), [items]);
  // Est freight shipping is decided by the admin per product rather than a fixed amount
  const shippingCost = useMemo(() => items.length === 0
    ? 0
    : Number(
        items
          .reduce((sum, item) => {
            const itemFreight = typeof item.product.estimatedFreight === 'number'
              ? item.product.estimatedFreight
              : typeof item.product.freight === 'number'
              ? item.product.freight
              : 0;
            return sum + itemFreight;
          }, 0)
          .toFixed(2)
      ), [items]);
  const tax = 0; // Estimated tax removed per business requirements
  // 2% transaction fee of order total amount at checkout
  const transactionFee = useMemo(() => {
    if (items.length === 0) return 0;
    return Number(((subtotal + shippingCost) * 0.02).toFixed(2));
  }, [items.length, subtotal, shippingCost]);

  // Additional VAT fee of 15 Naira (or currency equivalent; 1 USD = 1,550 NGN)
  const vatFee = useMemo(() => {
    if (items.length === 0) return 0;
    return Number((15 / 1550).toFixed(4));
  }, [items.length]);

  const total = useMemo(() => {
    if (items.length === 0) return 0;
    return Number((subtotal + shippingCost + transactionFee + vatFee).toFixed(2));
  }, [items.length, subtotal, shippingCost, transactionFee, vatFee]);

  const contextValue = useMemo(() => ({
    items,
    itemCount,
    subtotal,
    shippingCost,
    transactionFee,
    vatFee,
    tax,
    total,
    addToCart,
    addMultipleToCart,
    addItem,
    updateQuantity,
    removeFromCart,
    clearCart,
    calculateTierPrice: getProductTierPrice,
    isCartOpen,
    setIsCartOpen
  }), [
    items,
    itemCount,
    subtotal,
    shippingCost,
    transactionFee,
    vatFee,
    tax,
    total,
    addToCart,
    addMultipleToCart,
    addItem,
    updateQuantity,
    removeFromCart,
    clearCart,
    isCartOpen,
    setIsCartOpen
  ]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
