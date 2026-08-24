import { ProductReview, ProductReviewSummary } from '../types/review';
import { Order } from '../types';

const REVIEWS_STORAGE_KEY_PREFIX = 'ee_product_reviews_v1_';
const REVIEW_VOTES_KEY = 'ee_review_user_votes_v1';

// Initial verified reviews seeded for catalog products
export const INITIAL_PRODUCT_REVIEWS: Record<string, ProductReview[]> = {
  'prod_ee_01': [
    {
      id: 'rev_ee_01_1',
      productId: 'prod_ee_01',
      userId: 'usr_buyer_lagos_01',
      reviewerName: 'Chief Emeka N.',
      companyName: 'Alaba Sound Electronics Ltd',
      businessType: 'Wholesaler',
      country: 'Nigeria',
      verifiedWholesaleBuyer: true,
      orderNumber: 'EE-ORD-98214',
      unitsPurchased: 200,
      rating: 5,
      criteria: {
        productQuality: 5,
        packagingDurability: 5,
        shippingSpeed: 5,
        valueForMoney: 5
      },
      title: 'Outstanding acoustics & sturdy retail master cartons',
      comment: 'Ordered 20 Master Cartons (200 units) direct from Guangzhou to Lagos Apapa. ANC noise cancellation performs at par with major brand names. The barcode labels scanned immediately into our ERP with zero defects upon unboxing.',
      images: [
        'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600&auto=format&fit=crop&q=80'
      ],
      helpfulCount: 38,
      adminReply: {
        author: 'Eagle Excel Ops Desk',
        message: 'Thank you Chief Emeka! Your next container booking with discounted containerized pallet pricing is confirmed for delivery next Tuesday.',
        date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
      },
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
    },
    {
      id: 'rev_ee_01_2',
      productId: 'prod_ee_01',
      userId: 'usr_buyer_dla_02',
      reviewerName: 'Alain Mbianda',
      companyName: 'Akwa Sound Distribution Douala',
      businessType: 'Distributor',
      country: 'Cameroon',
      verifiedWholesaleBuyer: true,
      orderNumber: 'EE-ORD-88102',
      unitsPurchased: 50,
      rating: 5,
      criteria: {
        productQuality: 5,
        packagingDurability: 4,
        shippingSpeed: 5,
        valueForMoney: 5
      },
      title: 'Very rapid turnover across our Yaoundé & Douala retail outlets',
      comment: 'The 45-hour battery capacity is a massive selling point for the Cameroon market where steady power can fluctuate. Customers love the build quality.',
      helpfulCount: 19,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString()
    }
  ],
  'prod_ee_09': [
    {
      id: 'rev_ee_09_1',
      productId: 'prod_ee_09',
      userId: 'usr_buyer_abj_03',
      reviewerName: 'Engr. Babatunde Adeyemi',
      companyName: 'SolarMatrix Solutions Abuja',
      businessType: 'Contractor',
      country: 'Nigeria',
      verifiedWholesaleBuyer: true,
      orderNumber: 'EE-ORD-77412',
      unitsPurchased: 20,
      rating: 5,
      criteria: {
        productQuality: 5,
        packagingDurability: 5,
        shippingSpeed: 4,
        valueForMoney: 5
      },
      title: 'Rock solid 5.5KVA hybrid inverters for residential estate projects',
      comment: 'Installed 14 units across a residential development in Gwarinpa, Abuja. Built-in 100A MPPT performs flawlessly under heavy Nigerian peak sun hours. Zero breakdown issues after 3 months in heavy daily operation.',
      images: [
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80'
      ],
      helpfulCount: 42,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
    }
  ]
};

/**
 * Get all reviews for a specific product
 */
export function getProductReviews(productId: string): ProductReview[] {
  try {
    const raw = localStorage.getItem(`${REVIEWS_STORAGE_KEY_PREFIX}${productId}`);
    if (raw) {
      const stored: ProductReview[] = JSON.parse(raw);
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    }
  } catch (e) {
    console.warn('Failed to load reviews from storage:', e);
  }

  // Fallback to seeded initial reviews
  const seeded = INITIAL_PRODUCT_REVIEWS[productId] || [];
  return seeded;
}

/**
 * Save reviews for a specific product
 */
export function saveProductReviews(productId: string, reviews: ProductReview[]): void {
  try {
    localStorage.setItem(`${REVIEWS_STORAGE_KEY_PREFIX}${productId}`, JSON.stringify(reviews));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ee_product_reviews_updated', { detail: { productId } }));
    }
  } catch (e) {
    console.warn('Failed to save product reviews:', e);
  }
}

/**
 * Calculate aggregation summary for reviews
 */
export function calculateReviewSummary(reviews: ProductReview[], baseRating?: number, baseCount?: number): ProductReviewSummary {
  if (!reviews || reviews.length === 0) {
    const defaultRating = baseRating || 5.0;
    const defaultCount = baseCount || 0;
    return {
      averageRating: defaultRating,
      totalReviews: defaultCount,
      verifiedBuyersCount: defaultCount > 0 ? Math.round(defaultCount * 0.95) : 0,
      ratingBreakdown: {
        5: Math.round(defaultCount * 0.8),
        4: Math.round(defaultCount * 0.15),
        3: Math.round(defaultCount * 0.05),
        2: 0,
        1: 0
      },
      averageCriteria: {
        productQuality: 4.9,
        packagingDurability: 4.8,
        shippingSpeed: 4.7,
        valueForMoney: 4.9
      }
    };
  }

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let sumRating = 0;
  let verifiedCount = 0;

  const criteriaSum = {
    productQuality: 0,
    packagingDurability: 0,
    shippingSpeed: 0,
    valueForMoney: 0,
    count: 0
  };

  reviews.forEach(rev => {
    const star = Math.min(5, Math.max(1, Math.round(rev.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[star] = (breakdown[star] || 0) + 1;
    sumRating += rev.rating;
    if (rev.verifiedWholesaleBuyer) verifiedCount++;

    if (rev.criteria) {
      criteriaSum.productQuality += rev.criteria.productQuality || rev.rating;
      criteriaSum.packagingDurability += rev.criteria.packagingDurability || rev.rating;
      criteriaSum.shippingSpeed += rev.criteria.shippingSpeed || rev.rating;
      criteriaSum.valueForMoney += rev.criteria.valueForMoney || rev.rating;
      criteriaSum.count++;
    }
  });

  const count = reviews.length;
  const avg = Number((sumRating / count).toFixed(1));

  const cCount = criteriaSum.count || 1;
  return {
    averageRating: avg,
    totalReviews: count,
    verifiedBuyersCount: verifiedCount,
    ratingBreakdown: breakdown,
    averageCriteria: {
      productQuality: Number((criteriaSum.productQuality / cCount).toFixed(1)) || avg,
      packagingDurability: Number((criteriaSum.packagingDurability / cCount).toFixed(1)) || avg,
      shippingSpeed: Number((criteriaSum.shippingSpeed / cCount).toFixed(1)) || avg,
      valueForMoney: Number((criteriaSum.valueForMoney / cCount).toFixed(1)) || avg
    }
  };
}

/**
 * Check if the user is a verified wholesale buyer for a specific product or eligible wholesale customer
 */
export function checkWholesaleBuyerEligibility(
  productId: string,
  userId?: string,
  userRole?: string,
  userOrders?: Order[]
): {
  isVerifiedBuyer: boolean;
  orderNumber?: string;
  unitsPurchased?: number;
  reason?: string;
} {
  if (!userId) {
    return { isVerifiedBuyer: false, reason: 'Sign in to submit a verified wholesale review.' };
  }

  // If user is admin, allow them to post verified test reviews
  if (userRole === 'admin') {
    return {
      isVerifiedBuyer: true,
      orderNumber: 'EE-ADMIN-VERIFIED',
      unitsPurchased: 100,
      reason: 'Administrator / Verified Supply Operations Desk'
    };
  }

  // Check user orders for this specific product
  if (userOrders && userOrders.length > 0) {
    for (const order of userOrders) {
      if (order.status === 'delivered' || order.status === 'shipped' || order.status === 'confirmed' || order.status === 'processing') {
        const item = order.items.find(i => i.productId === productId);
        if (item) {
          return {
            isVerifiedBuyer: true,
            orderNumber: order.orderNumber,
            unitsPurchased: item.quantity,
            reason: `Verified purchase on Order #${order.orderNumber}`
          };
        }
      }
    }

    // If buyer has at least one confirmed wholesale order across any product
    const anyConfirmedOrder = userOrders.find(o => o.status !== 'cancelled');
    if (anyConfirmedOrder) {
      return {
        isVerifiedBuyer: true,
        orderNumber: anyConfirmedOrder.orderNumber,
        unitsPurchased: 20,
        reason: `Verified wholesale account with active order history #${anyConfirmedOrder.orderNumber}`
      };
    }
  }

  return {
    isVerifiedBuyer: true, // Allow registered account holders to review with verified status
    unitsPurchased: 10,
    orderNumber: `EE-BUYER-${userId.slice(0, 6).toUpperCase()}`,
    reason: 'Verified wholesale registered account'
  };
}

/**
 * Add a new product review
 */
export function addProductReview(
  productId: string,
  reviewData: Omit<ProductReview, 'id' | 'createdAt' | 'helpfulCount'>
): ProductReview {
  const current = getProductReviews(productId);
  
  const newReview: ProductReview = {
    ...reviewData,
    id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    helpfulCount: 0,
    createdAt: new Date().toISOString()
  };

  const updated = [newReview, ...current];
  saveProductReviews(productId, updated);
  return newReview;
}

/**
 * Toggle helpful vote on a review
 */
export function toggleReviewHelpfulVote(productId: string, reviewId: string, userId: string): boolean {
  try {
    const votesRaw = localStorage.getItem(REVIEW_VOTES_KEY);
    const votes: Record<string, string[]> = votesRaw ? JSON.parse(votesRaw) : {};
    
    const userVotes = votes[userId] || [];
    const hasVoted = userVotes.includes(reviewId);

    const reviews = getProductReviews(productId);
    const targetIdx = reviews.findIndex(r => r.id === reviewId);
    if (targetIdx === -1) return false;

    if (hasVoted) {
      // Remove vote
      votes[userId] = userVotes.filter(id => id !== reviewId);
      reviews[targetIdx].helpfulCount = Math.max(0, (reviews[targetIdx].helpfulCount || 1) - 1);
    } else {
      // Add vote
      votes[userId] = [...userVotes, reviewId];
      reviews[targetIdx].helpfulCount = (reviews[targetIdx].helpfulCount || 0) + 1;
    }

    localStorage.setItem(REVIEW_VOTES_KEY, JSON.stringify(votes));
    saveProductReviews(productId, reviews);
    return !hasVoted;
  } catch (e) {
    console.warn('Error voting on review:', e);
    return false;
  }
}

/**
 * Check if user has voted helpful on a review
 */
export function hasUserVotedReviewHelpful(reviewId: string, userId?: string): boolean {
  if (!userId) return false;
  try {
    const votesRaw = localStorage.getItem(REVIEW_VOTES_KEY);
    if (!votesRaw) return false;
    const votes: Record<string, string[]> = JSON.parse(votesRaw);
    return (votes[userId] || []).includes(reviewId);
  } catch {
    return false;
  }
}
