import { getSupabase, isSupabaseEnabled, OperationType, handleSupabaseError } from '../lib/supabase';
import { Product, Category, ProductAuditAction } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../data/seedData';
import { convertImageToOptimizedWebP } from './imageOptimizationService';
import { recordProductAudit, calculateProductDiffs } from './auditLogService';

const PRODUCTS_TABLE = 'products';
const CATEGORIES_TABLE = 'categories';
const LOCAL_PRODUCTS_CACHE_KEY = 'ee_products_cache_v5';
const LOCAL_CATEGORIES_CACHE_KEY = 'ee_categories_cache_v5';
const DELETED_PRODUCTS_KEY = 'ee_deleted_products_v5';
const DELETED_CATEGORIES_KEY = 'ee_deleted_categories_v5';

// Purge any legacy stale localStorage keys from earlier app builds
if (typeof window !== 'undefined') {
  try {
    const legacyKeys = [
      'ee_products_cache_v1',
      'ee_products_cache_v2',
      'ee_products_cache_v3',
      'ee_products_cache_v4',
      'eagle_excel_products_cache',
      'eagle_excel_products_v4_cache',
      'ee_categories_cache_v1',
      'ee_categories_cache_v2',
      'ee_deleted_products_v1',
      'ee_deleted_categories_v1'
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    // Ignore
  }
}

// In-memory product and category cache and subscriber buses for instant local reactivity
let inMemoryProducts: Product[] = [];
const productSubscribers = new Set<(products: Product[]) => void>();

let inMemoryCategories: Category[] = [];
const categorySubscribers = new Set<(categories: Category[]) => void>();

// Broadcast channel for multi-tab synchronization in the same browser
let productBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    productBroadcastChannel = new BroadcastChannel('eagle_products_sync_bus');
    productBroadcastChannel.onmessage = (event) => {
      if (event.data?.type === 'PRODUCTS_UPDATED' && Array.isArray(event.data?.products)) {
        updateLocalProductsState(event.data.products, false);
      } else if (event.data?.type === 'CATEGORIES_UPDATED' && Array.isArray(event.data?.categories)) {
        updateLocalCategoriesState(event.data.categories, false);
      }
    };
  } catch (e) {
    console.warn('BroadcastChannel initialization:', e);
  }
}

// -------------------------------------------------------------
// REAL-TIME SERVER-SENT EVENTS (SSE) & WEBSOCKET/SUPABASE STREAM
// -------------------------------------------------------------
let sseEventSource: EventSource | null = null;
let sseReconnectTimer: any = null;
let sseActive = false;
const connectionStatusSubscribers = new Set<(status: 'connected' | 'connecting' | 'disconnected') => void>();

function notifyConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
  sseActive = status === 'connected';
  connectionStatusSubscribers.forEach(cb => {
    try {
      cb(status);
    } catch {}
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eagle_realtime_status', { detail: status }));
  }
}

export function isRealtimeConnected(): boolean {
  return sseActive;
}

export function subscribeToRealtimeStatus(callback: (status: 'connected' | 'connecting' | 'disconnected') => void): () => void {
  connectionStatusSubscribers.add(callback);
  callback(sseActive ? 'connected' : 'connecting');
  initProductSseStream();
  return () => {
    connectionStatusSubscribers.delete(callback);
  };
}

export function initProductSseStream() {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  if (sseEventSource && sseActive) return;

  notifyConnectionStatus('connecting');

  try {
    if (sseEventSource) {
      sseEventSource.close();
    }

    const source = new EventSource('/api/products/stream');
    sseEventSource = source;

    source.onopen = () => {
      notifyConnectionStatus('connected');
    };

    // Initial snapshot sync upon stream connection
    source.addEventListener('initial_sync', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.products && Array.isArray(payload.products)) {
          updateLocalProductsState(payload.products, true);
        }
        if (payload?.categories && Array.isArray(payload.categories)) {
          updateLocalCategoriesState(payload.categories, true);
        }
      } catch (err) {
        console.warn('SSE initial_sync parse error:', err);
      }
    });

    // Product created event (Instant push to all connected customer clients)
    source.addEventListener('product_created', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.products && Array.isArray(payload.products)) {
          updateLocalProductsState(payload.products, true);
        } else if (payload?.product) {
          const current = inMemoryProducts.length > 0 ? inMemoryProducts : getCachedProducts();
          const updated = [payload.product, ...current.filter(p => p.id !== payload.product.id)];
          updateLocalProductsState(updated, true);
        }

        if (typeof window !== 'undefined' && payload?.product) {
          recordProductAudit({
            action: 'SSE_STREAM_SYNC',
            severity: 'info',
            source: 'sse_stream',
            productId: payload.product.id,
            productName: payload.product.name,
            productSku: payload.product.sku,
            category: payload.product.category,
            summary: `SSE Broadcast Sync: "${payload.product.name}" created`,
            details: `Received live SSE push from server: ${payload.product.name} ($${payload.product.price}).`,
            payloadSnapshot: payload.product
          });
          window.dispatchEvent(new CustomEvent('eagle_product_newly_added', { detail: payload.product }));
        }
      } catch (err) {
        console.warn('SSE product_created parse error:', err);
      }
    });

    // Product updated event
    source.addEventListener('product_updated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.products && Array.isArray(payload.products)) {
          updateLocalProductsState(payload.products, true);
        } else if (payload?.product) {
          const current = inMemoryProducts.length > 0 ? inMemoryProducts : getCachedProducts();
          const updated = current.map(p => p.id === payload.product.id ? payload.product : p);
          if (!updated.some(p => p.id === payload.product.id)) {
            updated.unshift(payload.product);
          }
          updateLocalProductsState(updated, true);
        }

        if (typeof window !== 'undefined' && payload?.product) {
          window.dispatchEvent(new CustomEvent('eagle_product_updated_item', { detail: payload.product }));
        }
      } catch (err) {
        console.warn('SSE product_updated parse error:', err);
      }
    });

    // Product deleted event
    source.addEventListener('product_deleted', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.products && Array.isArray(payload.products)) {
          updateLocalProductsState(payload.products, true);
        } else if (payload?.id) {
          const current = inMemoryProducts.length > 0 ? inMemoryProducts : getCachedProducts();
          const updated = current.filter(p => p.id !== payload.id);
          updateLocalProductsState(updated, true);
        }
      } catch (err) {
        console.warn('SSE product_deleted parse error:', err);
      }
    });

    // Products seeded event
    source.addEventListener('products_seeded', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.products && Array.isArray(payload.products)) {
          updateLocalProductsState(payload.products, true);
        }
      } catch (err) {
        console.warn('SSE products_seeded parse error:', err);
      }
    });

    // Category updated event
    source.addEventListener('category_updated', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.categories && Array.isArray(payload.categories)) {
          updateLocalCategoriesState(payload.categories, true);
        }
      } catch (err) {
        console.warn('SSE category_updated parse error:', err);
      }
    });

    // Category deleted event
    source.addEventListener('category_deleted', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.categories && Array.isArray(payload.categories)) {
          updateLocalCategoriesState(payload.categories, true);
        }
      } catch (err) {
        console.warn('SSE category_deleted parse error:', err);
      }
    });

    source.onerror = () => {
      notifyConnectionStatus('disconnected');
      try {
        source.close();
      } catch {}
      // Auto-reconnect with backoff
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = setTimeout(() => {
        initProductSseStream();
      }, 4000);
    };
  } catch (err) {
    console.warn('Failed to start SSE stream:', err);
    notifyConnectionStatus('disconnected');
  }
}

// Helper to track explicitly deleted product IDs
function getDeletedProductIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_PRODUCTS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return new Set(list.filter((id): id is string => typeof id === 'string' && id.trim().length > 0 && id !== 'undefined' && id !== 'null'));
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return new Set<string>();
}

function addDeletedProductId(id: string) {
  if (!id || typeof id !== 'string' || !id.trim() || id === 'undefined' || id === 'null' || id.includes('[object')) {
    return;
  }
  const cleanId = id.trim();
  const set = getDeletedProductIds();
  set.add(cleanId);
  try {
    localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    // Ignore storage quota errors
  }
}

function unmarkDeletedProductId(id: string) {
  if (!id || typeof id !== 'string') return;
  const cleanId = id.trim();
  const set = getDeletedProductIds();
  if (set.has(cleanId)) {
    set.delete(cleanId);
    try {
      localStorage.setItem(DELETED_PRODUCTS_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      // Ignore
    }
  }
}

// -------------------------------------------------------------
// CATEGORY DELETION TRACKING
// -------------------------------------------------------------
function getDeletedCategoryIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CATEGORIES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return new Set(list.filter((id): id is string => typeof id === 'string' && id.trim().length > 0));
      }
    }
  } catch (e) {
    // Ignore
  }
  return new Set<string>();
}

function addDeletedCategoryId(id: string) {
  if (!id || typeof id !== 'string' || !id.trim() || id === 'all') return;
  const cleanId = id.trim().toLowerCase();
  const set = getDeletedCategoryIds();
  set.add(cleanId);
  try {
    localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    // Ignore
  }
}

function unmarkDeletedCategoryId(id: string) {
  if (!id || typeof id !== 'string') return;
  const cleanId = id.trim().toLowerCase();
  const set = getDeletedCategoryIds();
  if (set.has(cleanId)) {
    set.delete(cleanId);
    try {
      localStorage.setItem(DELETED_CATEGORIES_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      // Ignore
    }
  }
}

function updateLocalCategoriesState(cats: Category[], shouldBroadcast = true) {
  inMemoryCategories = cats;
  try {
    localStorage.setItem(LOCAL_CATEGORIES_CACHE_KEY, JSON.stringify(cats));
  } catch (e) {}

  categorySubscribers.forEach(cb => {
    try {
      cb(cats);
    } catch (err) {
      console.warn('Category subscriber notification error:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eagle_categories_updated', { detail: cats }));
    if (shouldBroadcast && productBroadcastChannel) {
      try {
        productBroadcastChannel.postMessage({ type: 'CATEGORIES_UPDATED', categories: cats });
      } catch (e) {}
    }
  }
}

function updateLocalProductsState(prods: Product[], shouldBroadcast = true) {
  inMemoryProducts = prods;
  try {
    localStorage.setItem(LOCAL_PRODUCTS_CACHE_KEY, JSON.stringify(prods));
  } catch (e) {
    // Ignore storage quota errors
  }

  productSubscribers.forEach(cb => {
    try {
      cb(prods);
    } catch (err) {
      console.warn('Product subscriber notification error:', err);
    }
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('eagle_products_updated', { detail: prods }));
    if (shouldBroadcast && productBroadcastChannel) {
      try {
        productBroadcastChannel.postMessage({ type: 'PRODUCTS_UPDATED', products: prods });
      } catch (e) {}
    }
  }
}

export function getCachedProducts(): Product[] {
  if (inMemoryProducts.length > 0) {
    return inMemoryProducts;
  }
  try {
    const raw = localStorage.getItem(LOCAL_PRODUCTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryProducts = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  inMemoryProducts = INITIAL_PRODUCTS;
  return INITIAL_PRODUCTS;
}

export function getCachedCategories(): Category[] {
  if (inMemoryCategories.length > 0) {
    return inMemoryCategories;
  }
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCategories = parsed;
        return parsed;
      }
    }
  } catch (e) {}
  inMemoryCategories = INITIAL_CATEGORIES;
  return INITIAL_CATEGORIES;
}

// -------------------------------------------------------------
// CATEGORY OPERATIONS
// -------------------------------------------------------------
export async function getCategoriesFromDatabase(): Promise<Category[]> {
  try {
    const res = await fetch(`/api/categories?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const serverCats: Category[] = await res.json();
      if (Array.isArray(serverCats) && serverCats.length > 0) {
        updateLocalCategoriesState(serverCats);
        return serverCats;
      }
    }
  } catch (err) {
    // Fallback to supabase or cached
  }

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase.from(CATEGORIES_TABLE).select('*');
        if (data && !error && data.length > 0) {
          const fetchedSupabase = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            slug: item.slug || item.id,
            description: item.description || '',
            iconName: item.iconName || item.icon_name || 'Package',
            itemCount: item.itemCount || item.item_count || 0
          }));
          updateLocalCategoriesState(fetchedSupabase);
          return fetchedSupabase;
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.READ, CATEGORIES_TABLE);
      }
    }
  }

  const cached = getCachedCategories();
  return cached;
}

export function subscribeToCategories(callback: (categories: Category[]) => void): () => void {
  categorySubscribers.add(callback);
  callback(getCachedCategories());
  initProductSseStream();

  return () => {
    categorySubscribers.delete(callback);
  };
}

export async function createCategoryInDatabase(data: {
  name: string;
  description?: string;
  iconName?: string;
  slug?: string;
}): Promise<Category> {
  const cleanName = data.name.trim();
  const slug = data.slug || cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = slug || `cat_${Date.now()}`;

  const newCategory: Category = {
    id,
    name: cleanName,
    slug,
    description: data.description?.trim() || `Wholesale ${cleanName} supplies & bulk orders`,
    iconName: data.iconName || 'Package',
    itemCount: 0
  };

  unmarkDeletedCategoryId(id);

  // Optimistic update
  const current = getCachedCategories();
  const updatedList = [...current.filter(c => c.id.toLowerCase() !== id.toLowerCase()), newCategory];
  updateLocalCategoriesState(updatedList);

  // Send to server API
  try {
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCategory)
    });
  } catch (err) {
    console.warn('Server create category fallback:', err);
  }

  // Backup to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(CATEGORIES_TABLE).upsert(newCategory);
      } catch {}
    }
  }

  return newCategory;
}

export async function deleteCategoryFromDatabase(id: string): Promise<void> {
  const cleanId = id.trim().toLowerCase();
  if (cleanId === 'all') {
    throw new Error('Cannot delete default "all" category.');
  }

  addDeletedCategoryId(cleanId);

  // Optimistic update
  const current = getCachedCategories();
  const updatedList = current.filter(c => c.id.toLowerCase() !== cleanId);
  updateLocalCategoriesState(updatedList);

  // Send to server API
  try {
    await fetch(`/api/categories/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Server delete category fallback:', err);
  }

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(CATEGORIES_TABLE).delete().eq('id', cleanId);
      } catch {}
    }
  }
}

// -------------------------------------------------------------
// PRODUCT OPERATIONS
// -------------------------------------------------------------

// Retrieve all products from authoritative database / server API
export async function getProductsFromDatabase(): Promise<Product[]> {
  initProductSseStream();

  // 1. Try server REST endpoint first (authoritative persistent store) with cache-busting
  try {
    const response = await fetch(`/api/products?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    if (response.ok) {
      const serverProducts: Product[] = await response.json();
      if (Array.isArray(serverProducts)) {
        updateLocalProductsState(serverProducts);
        return serverProducts;
      }
    }
  } catch (err) {
    // If server unreachable, proceed to fallback
  }

  // 2. Try Supabase if enabled
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(PRODUCTS_TABLE)
          .select('*')
          .order('createdAt', { ascending: false });
        
        if (data && !error && Array.isArray(data)) {
          updateLocalProductsState(data as Product[]);
          return data as Product[];
        }
      } catch (error) {
        handleSupabaseError(error, OperationType.READ, PRODUCTS_TABLE);
      }
    }
  }

  // 3. Fallback to cached catalog
  return getCachedProducts();
}

// Retrieve single product
export async function getProductById(id: string): Promise<Product | null> {
  const deletedIds = getDeletedProductIds();
  if (deletedIds.has(id)) return null;

  const cached = getCachedProducts();
  const found = cached.find(p => p.id === id);

  try {
    const response = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (response.ok) {
      const remoteProd = await response.json();
      if (remoteProd && remoteProd.id) {
        return remoteProd;
      }
    }
  } catch {}

  return found || null;
}

// Add or Create a product (Instantly synced to server and all connected customer devices)
export async function createProductInDatabase(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const newId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  
  const product: Product = {
    ...productData,
    id: newId,
    createdAt: now,
    updatedAt: now,
    rating: productData.rating || 5.0,
    reviewsCount: productData.reviewsCount || 0,
    isFeatured: productData.isFeatured ?? false,
    images: productData.images && productData.images.length > 0 ? productData.images : [
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
    ]
  };

  // Remove from deleted list if reused
  unmarkDeletedProductId(newId);

  // Record Audit Log for Creation
  recordProductAudit({
    action: 'PRODUCT_CREATED',
    severity: 'success',
    source: 'admin_ui',
    productId: product.id,
    productName: product.name,
    productSku: product.sku,
    category: product.category,
    summary: `New wholesale SKU created: "${product.name}" ($${product.price} / ${product.unit})`,
    details: `Initial stock: ${product.stock} units, MOQ: ${product.minOrderQty}, ${product.wholesaleTiers?.length || 0} price tiers configured.`,
    payloadSnapshot: product,
    clientMemoryCount: getCachedProducts().length + 1
  });

  // 1. Optimistically update local state & subscribers instantly (0ms delay)
  const current = getCachedProducts();
  const updatedList = [product, ...current.filter(p => p.id !== newId)];
  updateLocalProductsState(updatedList, true);

  // 2. Post to backend server API (persisted to server_data/products.json and broadcasted via SSE)
  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product)
    });
    if (res.ok) {
      const serverProduct = await res.json();
      return serverProduct || product;
    }
  } catch (err) {
    console.warn('Server API create product sync warning:', err);
  }

  // 3. Fallback / Secondary write to Supabase if configured
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(PRODUCTS_TABLE).insert(product);
      } catch {}
    }
  }

  return product;
}

// Update existing product
export async function updateProductInDatabase(id: string, updates: Partial<Product>): Promise<Product> {
  const now = new Date().toISOString();
  const current = getCachedProducts();
  const existingProduct = current.find(p => p.id === id) || INITIAL_PRODUCTS.find(p => p.id === id);

  const mergedProduct: Product = {
    ...(existingProduct || {
      id,
      name: updates.name || 'Wholesale Product',
      sku: updates.sku || 'EE-SKU',
      category: updates.category || 'electronics',
      price: updates.price || 10,
      stock: updates.stock || 100,
      minOrderQty: updates.minOrderQty || 1,
      unit: updates.unit || 'Unit',
      description: updates.description || '',
      images: updates.images || [],
      wholesaleTiers: updates.wholesaleTiers || [],
      specs: updates.specs || {},
      createdAt: now
    }),
    ...updates,
    id,
    updatedAt: now
  };

  unmarkDeletedProductId(id);

  // Compute field-level diffs and record audit log
  const diffs = calculateProductDiffs(existingProduct, mergedProduct);
  let auditAction: ProductAuditAction = 'PRODUCT_UPDATED';
  if (diffs.some(d => d.field === 'price')) {
    auditAction = 'PRICE_CHANGED';
  } else if (diffs.some(d => d.field === 'stock')) {
    auditAction = 'STOCK_ADJUSTED';
  }

  recordProductAudit({
    action: auditAction,
    severity: 'info',
    source: 'admin_ui',
    productId: id,
    productName: mergedProduct.name,
    productSku: mergedProduct.sku,
    category: mergedProduct.category,
    summary: `Updated product "${mergedProduct.name}" (${diffs.length > 0 ? diffs.map(d => d.label).join(', ') : 'attributes updated'})`,
    details: diffs.length > 0 
      ? diffs.map(d => `${d.label}: ${d.oldValue} ➔ ${d.newValue}`).join(' | ')
      : 'General product specifications updated.',
    diffs,
    payloadSnapshot: mergedProduct,
    clientMemoryCount: getCachedProducts().length
  });

  // 1. Optimistically update local cache and subscribers immediately
  const updatedList = current.map(p => p.id === id ? mergedProduct : p);
  if (!updatedList.some(p => p.id === id)) {
    updatedList.unshift(mergedProduct);
  }
  updateLocalProductsState(updatedList, true);

  // 2. Send to backend server API
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mergedProduct)
    });
    if (res.ok) {
      const saved = await res.json();
      return saved || mergedProduct;
    }
  } catch (err) {
    console.warn('Server API update product sync warning:', err);
  }

  // 3. Backup to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(PRODUCTS_TABLE).upsert(mergedProduct, { onConflict: 'id' });
      } catch {}
    }
  }

  return mergedProduct;
}

// Delete product
export async function deleteProductFromDatabase(id: string): Promise<void> {
  const current = getCachedProducts();
  const deletedProduct = current.find(p => p.id === id);

  addDeletedProductId(id);

  // Record audit log for deletion
  recordProductAudit({
    action: 'PRODUCT_DELETED',
    severity: 'warning',
    source: 'admin_ui',
    productId: id,
    productName: deletedProduct?.name || 'Wholesale SKU',
    productSku: deletedProduct?.sku,
    category: deletedProduct?.category,
    summary: `Deleted product SKU "${deletedProduct?.name || id}"`,
    details: `Product removed from active catalog (was $${deletedProduct?.price || 0}, ${deletedProduct?.stock || 0} units stock).`,
    payloadSnapshot: deletedProduct,
    clientMemoryCount: Math.max(0, current.length - 1)
  });

  // 1. Optimistically update local cache and subscribers immediately
  const updatedList = current.filter(p => p.id !== id);
  updateLocalProductsState(updatedList, true);

  // 2. Send DELETE to backend server API
  try {
    await fetch(`/api/products/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Server API delete product warning:', err);
  }

  // 3. Backup to Supabase
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(PRODUCTS_TABLE).delete().eq('id', id);
      } catch {}
    }
  }
}

// Seed the initial catalog to database in bulk
export async function seedCatalogToDatabase(): Promise<number> {
  updateLocalProductsState([...INITIAL_PRODUCTS], true);

  recordProductAudit({
    action: 'CATALOG_SEEDED',
    severity: 'success',
    source: 'admin_ui',
    summary: `Restored default catalog with ${INITIAL_PRODUCTS.length} wholesale SKUs`,
    details: 'Master default product records seeded to browser cache, server JSON storage, and Supabase database.',
    clientMemoryCount: INITIAL_PRODUCTS.length,
    serverCount: INITIAL_PRODUCTS.length,
    supabaseCount: INITIAL_PRODUCTS.length
  });

  try {
    await fetch('/api/products/seed', { method: 'POST' });
  } catch (err) {
    console.warn('Server seed API warning:', err);
  }

  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from(PRODUCTS_TABLE).upsert(INITIAL_PRODUCTS, { onConflict: 'id' });
      } catch {}
    }
  }

  return INITIAL_PRODUCTS.length;
}

// Upload Product Image with instant WebP compression and permanent server storage
export async function uploadProductImage(
  file: File, 
  onProgress?: (progress: number) => void
): Promise<string> {
  if (onProgress) onProgress(20);

  let optimizedDataUrl = '';
  let fileToUpload = file;

  // 1. Perform client-side WebP compression (<80ms)
  try {
    const optimized = await convertImageToOptimizedWebP(file, 1100, 0.82);
    fileToUpload = optimized.file;
    optimizedDataUrl = optimized.dataUrl;
    if (onProgress) onProgress(50);
  } catch (optErr) {
    console.warn('WebP compression fallback to original file:', optErr);
  }

  // 2. Upload to server endpoint /api/upload-image (saved to public/uploads/ and accessible to all customers)
  if (optimizedDataUrl) {
    try {
      if (onProgress) onProgress(75);
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: optimizedDataUrl,
          filename: file.name
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          if (onProgress) onProgress(100);
          return data.url;
        }
      }
    } catch (apiErr) {
      console.warn('Upload to server API fallback:', apiErr);
    }
  }

  // 3. Fallback to Supabase Storage if configured
  if (isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const timestamp = Date.now();
        const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const storagePath = `products/${timestamp}_${cleanFileName}`;

        const { data: uploadData, error } = await supabase.storage
          .from('products')
          .upload(storagePath, fileToUpload, {
            contentType: fileToUpload.type || 'image/webp',
            upsert: true,
          });

        if (!error && uploadData) {
          const { data: publicUrlData } = supabase.storage.from('products').getPublicUrl(storagePath);
          if (publicUrlData?.publicUrl) {
            if (onProgress) onProgress(100);
            return publicUrlData.publicUrl;
          }
        }
      } catch (uploadErr) {
        console.warn('Supabase storage upload fallback:', uploadErr);
      }
    }
  }

  if (onProgress) onProgress(100);
  if (optimizedDataUrl) {
    return optimizedDataUrl;
  }

  // Direct FileReader fallback
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (onProgress) onProgress(100);
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to normalize Supabase / PostgreSQL product row
function normalizeSupabaseProductRow(row: any): Product | null {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id || '').trim();
  if (!id) return null;

  let specs = row.specs;
  if (typeof specs === 'string') {
    try { specs = JSON.parse(specs); } catch { specs = {}; }
  }
  if (!specs || typeof specs !== 'object') specs = {};

  let wholesaleTiers = row.wholesaleTiers || row.wholesale_tiers;
  if (typeof wholesaleTiers === 'string') {
    try { wholesaleTiers = JSON.parse(wholesaleTiers); } catch { wholesaleTiers = []; }
  }
  if (!Array.isArray(wholesaleTiers)) wholesaleTiers = [];

  let images = row.images;
  if (typeof images === 'string') {
    try { images = JSON.parse(images); } catch { images = [images]; }
  }
  if (!Array.isArray(images)) images = row.image ? [row.image] : [];

  let responsiveImages = row.responsiveImages || row.responsive_images;
  if (typeof responsiveImages === 'string') {
    try { responsiveImages = JSON.parse(responsiveImages); } catch { responsiveImages = undefined; }
  }

  const basePrice = Number(row.price) || 0;
  const minOrderQty = Number(row.minOrderQty || row.min_order_qty || row.moq) || 1;

  return {
    id,
    name: String(row.name || 'Untitled Wholesale Product'),
    sku: String(row.sku || `SKU-${id.slice(0, 8).toUpperCase()}`),
    category: String(row.category || 'all').toLowerCase(),
    description: String(row.description || ''),
    price: basePrice,
    wholesaleTiers: wholesaleTiers.length > 0 ? wholesaleTiers : [
      { minQty: minOrderQty, pricePerUnit: basePrice, discountPercentage: 0 }
    ],
    stock: Number(row.stock) || 0,
    minOrderQty,
    unit: String(row.unit || 'units'),
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'],
    responsiveImages: Array.isArray(responsiveImages) ? responsiveImages : undefined,
    specs,
    isFeatured: row.isFeatured !== undefined ? Boolean(row.isFeatured) : Boolean(row.featured),
    rating: Number(row.rating) || 4.9,
    reviewsCount: Number(row.reviewsCount || row.reviews_count) || 12,
    createdAt: row.createdAt || row.created_at || new Date().toISOString(),
    updatedAt: row.updatedAt || row.updated_at || new Date().toISOString()
  };
}

// Shared singleton subscription state for catalog synchronization
let sharedProductSupabaseChannel: any = null;
let sharedProductPollInterval: any = null;
let sharedLifecycleAttached = false;

function startSharedProductSync() {
  if (typeof window === 'undefined') return;

  if (!sharedLifecycleAttached) {
    sharedLifecycleAttached = true;
    const handleLifecycleSync = () => {
      getProductsFromDatabase().catch(() => {});
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        getProductsFromDatabase().catch(() => {});
      }
    };
    window.addEventListener('focus', handleLifecycleSync);
    window.addEventListener('online', handleLifecycleSync);
    window.addEventListener('pageshow', handleLifecycleSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  if (!sharedProductPollInterval) {
    sharedProductPollInterval = setInterval(() => {
      getProductsFromDatabase().catch(() => {});
    }, 15000);
  }

  if (!sharedProductSupabaseChannel && isSupabaseEnabled()) {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const channelName = `public:${PRODUCTS_TABLE}:realtime:shared`;
        sharedProductSupabaseChannel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: PRODUCTS_TABLE },
            (payload: any) => {
              if (payload?.new) {
                const newProduct = normalizeSupabaseProductRow(payload.new);
                if (newProduct) {
                  unmarkDeletedProductId(newProduct.id);
                  const current = getCachedProducts();
                  const updated = [newProduct, ...current.filter(p => p.id !== newProduct.id)];
                  updateLocalProductsState(updated, true);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('eagle_product_newly_added', { detail: newProduct }));
                  }
                }
              }
              getProductsFromDatabase().then(prods => {
                updateLocalProductsState(prods, true);
              }).catch(() => {});
            }
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: PRODUCTS_TABLE },
            (payload: any) => {
              if (payload?.new) {
                const updatedProduct = normalizeSupabaseProductRow(payload.new);
                if (updatedProduct) {
                  const current = getCachedProducts();
                  const updated = current.map(p => p.id === updatedProduct.id ? updatedProduct : p);
                  if (!updated.some(p => p.id === updatedProduct.id)) {
                    updated.unshift(updatedProduct);
                  }
                  updateLocalProductsState(updated, true);
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('eagle_product_updated_item', { detail: updatedProduct }));
                  }
                }
              }
              getProductsFromDatabase().then(prods => {
                updateLocalProductsState(prods, true);
              }).catch(() => {});
            }
          )
          .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: PRODUCTS_TABLE },
            (payload: any) => {
              const deletedId = payload?.old?.id;
              if (deletedId) {
                const current = getCachedProducts();
                addDeletedProductId(deletedId);
                const updated = current.filter(p => p.id !== deletedId);
                updateLocalProductsState(updated, true);
              }
              getProductsFromDatabase().then(prods => {
                updateLocalProductsState(prods, true);
              }).catch(() => {});
            }
          )
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              notifyConnectionStatus('connected');
            }
          });
      } catch (e) {
        // quiet fallback
      }
    }
  }
}

function stopSharedProductSyncIfNoSubscribers() {
  if (productSubscribers.size === 0) {
    if (sharedProductPollInterval) {
      clearInterval(sharedProductPollInterval);
      sharedProductPollInterval = null;
    }
    if (sharedProductSupabaseChannel && isSupabaseEnabled()) {
      const supabase = getSupabase();
      if (supabase) {
        try { supabase.removeChannel(sharedProductSupabaseChannel); } catch {}
      }
      sharedProductSupabaseChannel = null;
    }
  }
}

// Real-time database subscription + SSE stream + local event bus for products catalog
export function subscribeToProducts(callback: (products: Product[]) => void): () => void {
  // 1. Immediately pass current cached products to the callback
  const initial = getCachedProducts();
  callback(initial);

  // 2. Register in local subscriber set
  productSubscribers.add(callback);

  // 3. Start SSE stream for real-time live events from server
  initProductSseStream();

  // 4. Perform background fetch from database / server to guarantee latest state
  getProductsFromDatabase().catch(() => {});

  // 5. Start shared singleton background sync and real-time channel
  startSharedProductSync();

  return () => {
    productSubscribers.delete(callback);
    stopSharedProductSyncIfNoSubscribers();
  };
}

// Backwards-compatible aliases for legacy integrations & cached bundles
export const createProductInFirestore = createProductInDatabase;
export const updateProductInFirestore = updateProductInDatabase;
export const deleteProductInFirestore = deleteProductFromDatabase;
export const getProductsFromFirestore = getProductsFromDatabase;
export const getProductFromFirestore = getProductById;
export const seedCatalogToFirestore = seedCatalogToDatabase;
export const getCategoriesFromFirestore = getCategoriesFromDatabase;
export const createCategoryInFirestore = createCategoryInDatabase;
export const deleteCategoryInFirestore = deleteCategoryFromDatabase;
export const subscribeToProductsFirestore = subscribeToProducts;
