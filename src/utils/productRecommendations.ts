import { Product } from '../types';

/**
 * Intelligent product similarity scoring and recommendation engine.
 * Calculates relevance based on:
 * - Same primary category (highest weight)
 * - Keyword matching in name, description, and technical specifications
 * - Complementary price brackets and wholesale tiers
 * - High buyer satisfaction & rating
 */
export function getRelatedProducts(
  currentProduct: Product,
  allProducts: Product[],
  limit: number = 8
): Product[] {
  if (!currentProduct || !Array.isArray(allProducts) || allProducts.length <= 1) {
    return [];
  }

  // Filter out the current product itself
  const candidates = allProducts.filter(p => p.id !== currentProduct.id && p.sku !== currentProduct.sku);

  // Extract key search terms from current product
  const stopWords = new Set([
    'and', 'or', 'the', 'a', 'an', 'in', 'on', 'with', 'for', 'to', 'of', 'at', 'by', 'from',
    'bulk', 'master', 'carton', 'unit', 'units', 'box', 'wholesale', 'direct', 'china', 'set',
    'pcs', 'high', 'grade', 'commercial', 'industrial', 'pro', 'heavy', 'duty', 'premium'
  ]);

  const extractTokens = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !stopWords.has(t));
  };

  const currentTokens = new Set([
    ...extractTokens(currentProduct.name),
    ...extractTokens(currentProduct.category),
    ...Object.values(currentProduct.specs || {}).flatMap(v => extractTokens(v))
  ]);

  // Score each candidate product
  const scored = candidates.map(product => {
    let score = 0;

    // 1. Category match (50 points)
    if (product.category?.toLowerCase() === currentProduct.category?.toLowerCase()) {
      score += 50;
    }

    // 2. Token overlap in title & specs (5 points per matching meaningful term)
    const productTokens = [
      ...extractTokens(product.name),
      ...extractTokens(product.description || ''),
      ...Object.values(product.specs || {}).flatMap(v => extractTokens(v))
    ];

    let tokenMatches = 0;
    for (const token of productTokens) {
      if (currentTokens.has(token)) {
        tokenMatches++;
      }
    }
    score += Math.min(tokenMatches * 6, 36);

    // 3. Price proximity score (up to 10 points for comparable price bracket)
    if (currentProduct.price > 0 && product.price > 0) {
      const ratio = Math.min(currentProduct.price, product.price) / Math.max(currentProduct.price, product.price);
      score += Math.round(ratio * 10);
    }

    // 4. Featured & Rating boost (up to 10 points)
    if (product.isFeatured) score += 5;
    if (product.rating && product.rating >= 4.5) score += 5;

    // 5. In-stock availability preference
    if (product.stock > 0) score += 4;

    return { product, score };
  });

  // Sort descending by relevance score
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(item => item.product);
}

/**
 * Filter related products by specific relationship criteria
 */
export type RelatedFilterType = 'all' | 'same_category' | 'complementary';

export function filterRelatedProducts(
  currentProduct: Product,
  relatedProducts: Product[],
  filterType: RelatedFilterType
): Product[] {
  if (filterType === 'same_category') {
    const sameCat = relatedProducts.filter(
      p => p.category?.toLowerCase() === currentProduct.category?.toLowerCase()
    );
    return sameCat.length > 0 ? sameCat : relatedProducts;
  }

  if (filterType === 'complementary') {
    const complementary = relatedProducts.filter(
      p => p.category?.toLowerCase() !== currentProduct.category?.toLowerCase()
    );
    return complementary.length > 0 ? complementary : relatedProducts;
  }

  return relatedProducts;
}
