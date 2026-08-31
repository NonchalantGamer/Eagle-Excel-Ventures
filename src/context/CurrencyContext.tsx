import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CurrencyCode = 'USD' | 'NGN' | 'XAF';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  rateFromUSD: number; // e.g., 1 USD = 1,550 NGN = 610 XAF
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    flag: '🇺🇸',
    rateFromUSD: 1
  },
  NGN: {
    code: 'NGN',
    symbol: '₦',
    label: 'NGN (₦)',
    flag: '🇳🇬',
    rateFromUSD: 1550 // 1 USD = ₦1,550
  },
  XAF: {
    code: 'XAF',
    symbol: 'FCFA',
    label: 'XAF (FCFA)',
    flag: '🇨🇲',
    rateFromUSD: 610 // 1 USD = 610 FCFA
  }
};

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
  formatPrice: (amountInUSD: number, options?: { showCode?: boolean; round?: boolean }) => string;
  convertPrice: (amountInUSD: number) => number;
  currentCurrencyConfig: CurrencyConfig;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem('ee_preferred_currency');
      if (saved === 'USD' || saved === 'NGN' || saved === 'XAF') {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'NGN'; // Default to NGN for West African B2B market
  });

  const setCurrency = React.useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('ee_preferred_currency', c);
    } catch (e) {
      // ignore
    }
  }, []);

  const currentCurrencyConfig = CURRENCIES[currency];

  const convertPrice = React.useCallback((amountInUSD: number): number => {
    return amountInUSD * CURRENCIES[currency].rateFromUSD;
  }, [currency]);

  const formatPrice = React.useCallback((
    amountInUSD: number, 
    options?: { showCode?: boolean; round?: boolean }
  ): string => {
    const config = CURRENCIES[currency];
    const converted = amountInUSD * config.rateFromUSD;
    const { showCode = false, round = currency !== 'USD' } = options || {};

    let formattedNumber: string;
    if (round || currency === 'NGN' || currency === 'XAF') {
      formattedNumber = Math.round(converted).toLocaleString('en-US');
    } else {
      formattedNumber = converted.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }

    if (currency === 'XAF') {
      return `${formattedNumber} FCFA${showCode ? ' (XAF)' : ''}`;
    }

    return `${config.symbol}${formattedNumber}${showCode ? ` ${currency}` : ''}`;
  }, [currency]);

  const value = React.useMemo(() => ({
    currency,
    setCurrency,
    formatPrice,
    convertPrice,
    currentCurrencyConfig
  }), [currency, setCurrency, formatPrice, convertPrice, currentCurrencyConfig]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
