/**
 * Localized Search History Manager for B2B Wholesale Inventory
 * Persists the last 5 product queries in localStorage with automatic
 * deduplication, order ranking, and real-time cross-component synchronization.
 */

export const SEARCH_HISTORY_STORAGE_KEY = 'eagle_excel_recent_searches_v1';
export const SEARCH_HISTORY_EVENT = 'eagle_excel_search_history_updated';
export const MAX_HISTORY_ITEMS = 5;

// Popular B2B wholesale procurement queries for quick-fill suggestions
export const DEFAULT_B2B_SUGGESTIONS = [
  'Solar Hybrid Inverter 5kW',
  'Industrial Safety Boots S3',
  'Stretch Film 500mm Pallet Wrap',
  'Diesel Generator Filter Set',
  'Molded Case Circuit Breaker 100A'
];

/**
 * Safely retrieve the last 5 product search queries from localStorage
 */
export function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Filter and sanitize: must be non-empty strings, trimmed, max 5 items
    const sanitized = parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim())
      .slice(0, MAX_HISTORY_ITEMS);

    return sanitized;
  } catch (error) {
    console.warn('Failed to retrieve search history from localStorage:', error);
    return [];
  }
}

/**
 * Save a product query to the top of search history (max 5 items, case-insensitive deduplication)
 */
export function addSearchHistory(query: string): string[] {
  if (typeof window === 'undefined') return [];
  
  const trimmed = query ? query.trim() : '';
  // Ignore single-character noise or empty strings
  if (!trimmed || trimmed.length < 2) {
    return getSearchHistory();
  }

  try {
    const current = getSearchHistory();
    
    // Case-insensitive deduplication: remove any existing match
    const filtered = current.filter(
      item => item.toLowerCase() !== trimmed.toLowerCase()
    );
    
    // Prepend the new query and cap to MAX_HISTORY_ITEMS (5)
    const updated = [trimmed, ...filtered].slice(0, MAX_HISTORY_ITEMS);
    
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    
    // Notify all active listeners/components
    window.dispatchEvent(
      new CustomEvent(SEARCH_HISTORY_EVENT, { detail: updated })
    );
    
    return updated;
  } catch (error) {
    console.warn('Failed to save search query to localStorage:', error);
    return [];
  }
}

/**
 * Remove a specific query item from search history
 */
export function removeSearchHistoryItem(queryToRemove: string = ''): string[] {
  if (typeof window === 'undefined') return [];

  const target = (queryToRemove || '').trim().toLowerCase();
  if (!target) return getSearchHistory();

  try {
    const current = getSearchHistory();
    const updated = current.filter(item => item.toLowerCase() !== target);
    
    localStorage.setItem(SEARCH_HISTORY_STORAGE_KEY, JSON.stringify(updated));
    
    window.dispatchEvent(
      new CustomEvent(SEARCH_HISTORY_EVENT, { detail: updated })
    );
    
    return updated;
  } catch (error) {
    console.warn('Failed to remove search query from localStorage:', error);
    return [];
  }
}

/**
 * Clear all recent search history
 */
export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SEARCH_HISTORY_STORAGE_KEY);
    
    window.dispatchEvent(
      new CustomEvent(SEARCH_HISTORY_EVENT, { detail: [] })
    );
  } catch (error) {
    console.warn('Failed to clear search history from localStorage:', error);
  }
}
