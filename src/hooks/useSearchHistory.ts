import { useState, useEffect, useCallback } from 'react';
import { 
  getSearchHistory, 
  addSearchHistory, 
  removeSearchHistoryItem, 
  clearSearchHistory,
  SEARCH_HISTORY_EVENT,
  SEARCH_HISTORY_STORAGE_KEY
} from '../utils/searchHistory';

export interface UseSearchHistoryReturn {
  recentSearches: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearHistory: () => void;
  hasHistory: boolean;
}

export function useSearchHistory(): UseSearchHistoryReturn {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getSearchHistory());

  useEffect(() => {
    // Sync initial state
    setRecentSearches(getSearchHistory());

    // Listen to in-app custom event
    const handleCustomUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<string[]>;
      if (Array.isArray(customEvent.detail)) {
        setRecentSearches(customEvent.detail);
      } else {
        setRecentSearches(getSearchHistory());
      }
    };

    // Listen to browser storage event (multi-tab sync)
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === SEARCH_HISTORY_STORAGE_KEY) {
        setRecentSearches(getSearchHistory());
      }
    };

    window.addEventListener(SEARCH_HISTORY_EVENT, handleCustomUpdate);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener(SEARCH_HISTORY_EVENT, handleCustomUpdate);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  const addSearch = useCallback((query: string) => {
    const updated = addSearchHistory(query);
    setRecentSearches(updated);
  }, []);

  const removeSearch = useCallback((query: string) => {
    const updated = removeSearchHistoryItem(query);
    setRecentSearches(updated);
  }, []);

  const clearHistory = useCallback(() => {
    clearSearchHistory();
    setRecentSearches([]);
  }, []);

  return {
    recentSearches,
    addSearch,
    removeSearch,
    clearHistory,
    hasHistory: recentSearches.length > 0
  };
}
