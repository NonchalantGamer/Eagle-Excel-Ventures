import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, WishlistItem } from '../types';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useToast } from '../components/Toast';

interface WishlistContextType {
  wishlist: WishlistItem[];
  wishlistCount: number;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (product: Product, notes?: string) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (product: Product, notes?: string) => boolean;
  clearWishlist: () => void;
  moveItemToCart: (product: Product, quantity?: number) => void;
  moveAllToCart: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'eagle_excel_wholesale_wishlist_guest';

function getStorageKey(userId?: string): string {
  return userId ? `eagle_excel_wholesale_wishlist_${userId}` : GUEST_STORAGE_KEY;
}

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToCart, addMultipleToCart, setIsCartOpen } = useCart();
  const { showToast } = useToast();

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const currentKey = getStorageKey(currentUser?.id);
      const raw = localStorage.getItem(currentKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load initial wishlist:', err);
    }
    return [];
  });

  // When user signs in or out, load the respective wishlist and merge guest items
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      const userKey = getStorageKey(currentUser?.id);
      const userSavedRaw = localStorage.getItem(userKey);
      let userList: WishlistItem[] = [];

      if (userSavedRaw) {
        try {
          const parsed = JSON.parse(userSavedRaw);
          if (Array.isArray(parsed)) userList = parsed;
        } catch {}
      }

      // If user just logged in, merge any items saved while in guest mode
      if (currentUser?.id) {
        const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
        if (guestRaw) {
          try {
            const guestList: WishlistItem[] = JSON.parse(guestRaw);
            if (Array.isArray(guestList) && guestList.length > 0) {
              const existingIds = new Set(userList.map(item => item.product.id));
              const newItemsFromGuest = guestList.filter(item => !existingIds.has(item.product.id));
              if (newItemsFromGuest.length > 0) {
                userList = [...userList, ...newItemsFromGuest];
                localStorage.setItem(userKey, JSON.stringify(userList));
                showToast(`Merged ${newItemsFromGuest.length} saved item(s) from your browsing session into your account wishlist!`, 'info');
              }
              // Clear guest wishlist after merging
              localStorage.removeItem(GUEST_STORAGE_KEY);
            }
          } catch {}
        }
      }

      setWishlist(userList);
    } catch (err) {
      console.warn('Error syncing wishlist with auth state:', err);
    }
  }, [currentUser?.id]);

  // Save changes to localStorage whenever wishlist changes
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const currentKey = getStorageKey(currentUser?.id);
      localStorage.setItem(currentKey, JSON.stringify(wishlist));
      
      // Dispatch custom event for cross-component and tab sync
      window.dispatchEvent(new CustomEvent('ee_wishlist_updated', {
        detail: { count: wishlist.length, items: wishlist }
      }));
    } catch (err) {
      console.warn('Failed to persist wishlist:', err);
    }
  }, [wishlist, currentUser?.id]);

  // Listen for external updates (e.g. other tabs)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const currentKey = getStorageKey(currentUser?.id);
      if (e.key === currentKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setWishlist(parsed);
          }
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentUser?.id]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlist.some(item => item.product.id === productId);
  }, [wishlist]);

  const addToWishlist = useCallback((product: Product, notes?: string) => {
    setWishlist(prev => {
      if (prev.some(item => item.product.id === product.id)) {
        return prev;
      }
      const newItem: WishlistItem = {
        product,
        addedAt: new Date().toISOString(),
        notes
      };
      return [newItem, ...prev];
    });

    showToast(`Saved "${product.name.slice(0, 24)}..." to your Wishlist!`, {
      type: 'success',
      duration: 3500
    });
  }, [showToast]);

  const removeFromWishlist = useCallback((productId: string) => {
    let removedName = '';
    setWishlist(prev => {
      const target = prev.find(item => item.product.id === productId);
      if (target) removedName = target.product.name;
      return prev.filter(item => item.product.id !== productId);
    });

    if (removedName) {
      showToast(`Removed "${removedName.slice(0, 24)}..." from your Wishlist.`, 'info');
    }
  }, [showToast]);

  const toggleWishlist = useCallback((product: Product, notes?: string): boolean => {
    const alreadyExists = wishlist.some(item => item.product.id === product.id);
    if (alreadyExists) {
      removeFromWishlist(product.id);
      return false;
    } else {
      addToWishlist(product, notes);
      return true;
    }
  }, [wishlist, addToWishlist, removeFromWishlist]);

  const clearWishlist = useCallback(() => {
    if (wishlist.length === 0) return;
    setWishlist([]);
    showToast('Your Wishlist has been cleared.', 'info');
  }, [wishlist.length, showToast]);

  const moveItemToCart = useCallback((product: Product, quantity?: number) => {
    const qty = quantity || product.minOrderQty || 1;
    addToCart(product, qty);
    removeFromWishlist(product.id);
    showToast(`Moved ${qty}x "${product.name.slice(0, 22)}..." to your wholesale cart!`, {
      type: 'success',
      action: {
        label: 'View Cart',
        onClick: () => setIsCartOpen(true)
      }
    });
  }, [addToCart, removeFromWishlist, showToast, setIsCartOpen]);

  const moveAllToCart = useCallback(() => {
    if (wishlist.length === 0) {
      showToast('Your Wishlist is currently empty.', 'error');
      return;
    }

    const itemsToAdd = wishlist.map(item => ({
      product: item.product,
      quantity: item.product.minOrderQty || 1
    }));

    addMultipleToCart(itemsToAdd);
    const count = wishlist.length;
    setWishlist([]);
    showToast(`Moved all ${count} item(s) from your Wishlist into your wholesale cart!`, {
      type: 'success',
      action: {
        label: 'View Cart',
        onClick: () => setIsCartOpen(true)
      }
    });
  }, [wishlist, addMultipleToCart, showToast, setIsCartOpen]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        wishlistCount: wishlist.length,
        isInWishlist,
        addToWishlist,
        removeFromWishlist,
        toggleWishlist,
        clearWishlist,
        moveItemToCart,
        moveAllToCart
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

const defaultWishlistContext: WishlistContextType = {
  wishlist: [],
  wishlistCount: 0,
  isInWishlist: () => false,
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  toggleWishlist: () => false,
  clearWishlist: () => {},
  moveItemToCart: () => {},
  moveAllToCart: () => {}
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    console.warn('useWishlist was called outside of a WishlistProvider. Using fallback state.');
    return defaultWishlistContext;
  }
  return context;
};
