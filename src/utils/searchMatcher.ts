import React from 'react';
import { Product } from '../types';

export interface SearchMatchResult {
  product: Product;
  score: number;
  matchType: 'exact' | 'prefix' | 'token' | 'category' | 'sku' | 'specs' | 'description' | 'none';
  matchedField: 'name' | 'sku' | 'category' | 'specs' | 'description' | 'none';
  highlightRanges?: { start: number; end: number }[];
}

/**
 * Normalized string helper: lowercases, removes diacritics/accents, trims whitespace
 */
export function cleanString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, ' ') // keep alphanumeric and hyphens, space out punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips all non-alphanumeric characters for flexible substring checking
 */
export function toAlphanumericOnly(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a specific keyword token is contained in any field of the product.
 * Returns true if found in name, sku, category, description, unit, or specs.
 */
function isTokenContainedInProduct(
  token: string,
  productFields: {
    rawName: string;
    rawSku: string;
    rawCategory: string;
    rawDesc: string;
    rawUnit: string;
    rawSpecs: string;
    cleanName: string;
    cleanSku: string;
    cleanCategory: string;
    cleanDesc: string;
    cleanUnit: string;
    cleanSpecs: string;
    alphaName: string;
    alphaSku: string;
    alphaCategory: string;
    alphaDesc: string;
    alphaSpecs: string;
  }
): {
  contained: boolean;
  inName: boolean;
  inSku: boolean;
  inCategory: boolean;
  inSpecs: boolean;
  inDesc: boolean;
  isNameWordMatch: boolean;
  isNameWordPrefix: boolean;
} {
  const cleanTok = cleanString(token);
  const alphaTok = toAlphanumericOnly(token);
  const lowerTok = token.toLowerCase();

  if (!lowerTok) {
    return {
      contained: true,
      inName: false,
      inSku: false,
      inCategory: false,
      inSpecs: false,
      inDesc: false,
      isNameWordMatch: false,
      isNameWordPrefix: false
    };
  }

  // Name check
  const inName = 
    productFields.rawName.includes(lowerTok) ||
    (cleanTok.length > 0 && productFields.cleanName.includes(cleanTok)) ||
    (alphaTok.length > 0 && productFields.alphaName.includes(alphaTok));

  // Word-level precision in name (e.g. word equals token or starts with token)
  const nameWords = productFields.cleanName.split(' ');
  const isNameWordMatch = cleanTok.length > 0 && nameWords.some(w => w === cleanTok);
  const isNameWordPrefix = cleanTok.length > 0 && nameWords.some(w => w.startsWith(cleanTok));

  // SKU check
  const inSku =
    productFields.rawSku.includes(lowerTok) ||
    (cleanTok.length > 0 && productFields.cleanSku.includes(cleanTok)) ||
    (alphaTok.length > 0 && productFields.alphaSku.includes(alphaTok));

  // Category check
  const inCategory =
    productFields.rawCategory.includes(lowerTok) ||
    (cleanTok.length > 0 && productFields.cleanCategory.includes(cleanTok)) ||
    (alphaTok.length > 0 && productFields.alphaCategory.includes(alphaTok));

  // Specs check
  const inSpecs =
    productFields.rawSpecs.includes(lowerTok) ||
    (cleanTok.length > 0 && productFields.cleanSpecs.includes(cleanTok)) ||
    (alphaTok.length > 0 && productFields.alphaSpecs.includes(alphaTok));

  // Description & Unit check
  const inDesc =
    productFields.rawDesc.includes(lowerTok) ||
    productFields.rawUnit.includes(lowerTok) ||
    (cleanTok.length > 0 && productFields.cleanDesc.includes(cleanTok)) ||
    (alphaTok.length > 0 && productFields.alphaDesc.includes(alphaTok));

  const contained = inName || inSku || inCategory || inSpecs || inDesc;

  return {
    contained,
    inName,
    inSku,
    inCategory,
    inSpecs,
    inDesc,
    isNameWordMatch,
    isNameWordPrefix
  };
}

/**
 * Scores how closely a product matches the search query.
 * STRICT REQUIREMENT: Only returns score > 0 if ALL keywords are contained in the product.
 * If any keyword is not contained in the product, score is strictly 0 (not shown).
 */
export function scoreProductMatch(product: Product, rawQuery: string = ''): SearchMatchResult {
  const trimmed = (rawQuery || '').trim();
  
  // If no search query, return default baseline score for catalog browsing
  if (!trimmed) {
    return {
      product,
      score: 100,
      matchType: 'none',
      matchedField: 'none'
    };
  }

  // Tokenize the search query into non-empty keywords
  const queryTokens = trimmed.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  if (queryTokens.length === 0) {
    return { product, score: 100, matchType: 'none', matchedField: 'none' };
  }

  const rawName = (product.name || '').toLowerCase();
  const rawSku = (product.sku || '').toLowerCase();
  const rawCategory = (product.category || '').toLowerCase();
  const rawDesc = (product.description || '').toLowerCase();
  const rawUnit = (product.unit || '').toLowerCase();
  const rawSpecs = product.specs 
    ? Object.entries(product.specs).map(([k, v]) => `${k} ${v}`).join(' ').toLowerCase() 
    : '';

  const cleanName = cleanString(product.name);
  const cleanSku = cleanString(product.sku);
  const cleanCategory = cleanString(product.category);
  const cleanDesc = cleanString(product.description);
  const cleanUnit = cleanString(product.unit);
  const cleanSpecs = cleanString(rawSpecs);

  const alphaName = toAlphanumericOnly(product.name);
  const alphaSku = toAlphanumericOnly(product.sku);
  const alphaCategory = toAlphanumericOnly(product.category);
  const alphaDesc = toAlphanumericOnly(product.description);
  const alphaSpecs = toAlphanumericOnly(rawSpecs);

  const productFields = {
    rawName,
    rawSku,
    rawCategory,
    rawDesc,
    rawUnit,
    rawSpecs,
    cleanName,
    cleanSku,
    cleanCategory,
    cleanDesc,
    cleanUnit,
    cleanSpecs,
    alphaName,
    alphaSku,
    alphaCategory,
    alphaDesc,
    alphaSpecs
  };

  // 1. STRICT KEYWORD CONTAINMENT CHECK:
  // Every single keyword token MUST be contained in at least one field of the product.
  // If even ONE keyword is missing from the product, the product is completely excluded.
  const tokenMatchDetails = queryTokens.map(tok => isTokenContainedInProduct(tok, productFields));
  
  const allKeywordsContained = tokenMatchDetails.every(d => d.contained);
  if (!allKeywordsContained) {
    return {
      product,
      score: 0, // Excluded from results
      matchType: 'none',
      matchedField: 'none'
    };
  }

  // 2. RELEVANCE & CLOSENESS SCORING (Only for products containing the keywords)
  let score = 200; // Base score for containing all keywords
  let primaryMatchType: SearchMatchResult['matchType'] = 'token';
  let primaryField: SearchMatchResult['matchedField'] = 'none';

  const cleanQuery = cleanString(trimmed);
  const lowerQuery = trimmed.toLowerCase();
  const alphaQuery = toAlphanumericOnly(trimmed);

  // A. FULL PHRASE CHECKS ON PRODUCT NAME
  if (cleanName === cleanQuery || lowerQuery === rawName) {
    score += 1200;
    primaryMatchType = 'exact';
    primaryField = 'name';
  } else if (cleanName.startsWith(cleanQuery) || rawName.startsWith(lowerQuery)) {
    score += 800;
    primaryMatchType = 'prefix';
    primaryField = 'name';
  } else if (cleanName.includes(cleanQuery) || rawName.includes(lowerQuery) || (alphaQuery.length > 2 && alphaName.includes(alphaQuery))) {
    score += 600;
    primaryMatchType = 'prefix';
    primaryField = 'name';
  }

  // B. FULL PHRASE CHECKS ON SKU
  if (cleanSku === cleanQuery || lowerQuery === rawSku || alphaQuery === alphaSku) {
    score += 1000;
    if (primaryField === 'none') {
      primaryMatchType = 'sku';
      primaryField = 'sku';
    }
  } else if (cleanSku.startsWith(cleanQuery) || rawSku.startsWith(lowerQuery) || (alphaQuery.length > 2 && alphaSku.startsWith(alphaQuery))) {
    score += 750;
    if (primaryField === 'none') {
      primaryMatchType = 'sku';
      primaryField = 'sku';
    }
  } else if (cleanSku.includes(cleanQuery) || rawSku.includes(lowerQuery) || (alphaQuery.length > 2 && alphaSku.includes(alphaQuery))) {
    score += 550;
    if (primaryField === 'none') {
      primaryMatchType = 'sku';
      primaryField = 'sku';
    }
  }

  // C. CATEGORY MATCHES
  if (cleanCategory === cleanQuery || lowerQuery === rawCategory) {
    score += 400;
    if (primaryField === 'none') {
      primaryMatchType = 'category';
      primaryField = 'category';
    }
  } else if (cleanCategory.includes(cleanQuery) || rawCategory.includes(lowerQuery)) {
    score += 250;
    if (primaryField === 'none') {
      primaryMatchType = 'category';
      primaryField = 'category';
    }
  }

  // D. TOKEN CONTRIBUTION SCORING
  let tokensInNameCount = 0;
  let tokensInSkuCount = 0;
  let tokensInCatCount = 0;
  let tokensInSpecsCount = 0;
  let tokensInDescCount = 0;

  for (const detail of tokenMatchDetails) {
    if (detail.inName) {
      tokensInNameCount++;
      if (detail.isNameWordMatch) {
        score += 180; // exact word match in title
      } else if (detail.isNameWordPrefix) {
        score += 120; // prefix word match in title
      } else {
        score += 80;  // substring in title
      }
    }

    if (detail.inSku) {
      tokensInSkuCount++;
      score += 100;
    }

    if (detail.inCategory) {
      tokensInCatCount++;
      score += 80;
    }

    if (detail.inSpecs) {
      tokensInSpecsCount++;
      score += 60;
    }

    if (detail.inDesc) {
      tokensInDescCount++;
      score += 30;
    }
  }

  // Bonus if all query tokens appear in the product title/name
  if (tokensInNameCount === queryTokens.length) {
    score += 300;
    if (primaryField === 'none') {
      primaryField = 'name';
      primaryMatchType = 'token';
    }
  }

  // Determine primary matched field if not set
  if (primaryField === 'none') {
    if (tokensInNameCount > 0) {
      primaryField = 'name';
      primaryMatchType = 'token';
    } else if (tokensInSkuCount > 0) {
      primaryField = 'sku';
      primaryMatchType = 'sku';
    } else if (tokensInCatCount > 0) {
      primaryField = 'category';
      primaryMatchType = 'category';
    } else if (tokensInSpecsCount > 0) {
      primaryField = 'specs';
      primaryMatchType = 'specs';
    } else {
      primaryField = 'description';
      primaryMatchType = 'description';
    }
  }

  // Small tie-breakers for better customer experience
  if (product.isFeatured) score += 10;
  if (product.stock > 0) score += 5;
  if (product.rating) score += Math.round(product.rating * 2);

  return {
    product,
    score,
    matchType: primaryMatchType,
    matchedField: primaryField
  };
}

/**
 * Searches and ranks a list of products by closeness to the query.
 * STRICT: Returns only products containing the keywords, sorted by closeness score descending.
 */
export function rankProductsByCloseness(products: Product[], query: string = ''): Product[] {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return products;
  }

  const scored = products.map(product => scoreProductMatch(product, trimmed));
  
  // Filter ONLY items that scored > 0 (strictly containing the keywords)
  const matches = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);

  return matches;
}

/**
 * Returns top N closest matches with full score details for live preview dropdowns.
 * STRICT: Returns only products containing the keywords.
 */
export function getTopSearchSuggestions(
  products: Product[],
  query: string = '',
  limit: number = 6
): SearchMatchResult[] {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const scored = products
    .map(product => scoreProductMatch(product, trimmed))
    .filter(item => item.score > 0) // Only items containing the keywords
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * React helper component to highlight matching search keyword tokens in text strings
 */
export function HighlightedText({ text, query }: { text: string; query?: string }): React.ReactElement {
  if (!query || !query.trim() || !text) {
    return React.createElement(React.Fragment, null, text);
  }

  const tokens = query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 0);

  if (tokens.length === 0) {
    return React.createElement(React.Fragment, null, text);
  }

  // Escape regex special chars in every keyword token
  const escapedTokens = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');
  const parts = text.split(regex);

  return React.createElement(
    React.Fragment,
    null,
    parts.map((part, index) => {
      const isMatch = tokens.some(token => part.toLowerCase() === token);
      if (isMatch) {
        return React.createElement(
          'mark',
          {
            key: index,
            className: 'bg-[#F27D26]/25 text-amber-950 dark:text-[#ffb273] font-bold rounded-xs px-0.5'
          },
          part
        );
      }
      return React.createElement('span', { key: index }, part);
    })
  );
}

