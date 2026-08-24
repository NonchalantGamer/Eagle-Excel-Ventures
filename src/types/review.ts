export interface WholesaleRatingCriteria {
  productQuality: number; // 1-5
  packagingDurability: number; // 1-5
  shippingSpeed: number; // 1-5
  valueForMoney: number; // 1-5
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  reviewerName: string;
  companyName?: string;
  businessType?: 'Wholesaler' | 'Retail Chain' | 'Contractor' | 'Distributor' | 'Importer' | 'Corporate Buyer';
  country?: 'Nigeria' | 'Cameroon' | 'Ghana' | 'Ivory Coast' | 'Other';
  verifiedWholesaleBuyer: boolean;
  orderNumber?: string;
  unitsPurchased?: number;
  rating: number; // 1-5 overall
  criteria?: WholesaleRatingCriteria;
  title: string;
  comment: string;
  images?: string[];
  helpfulCount: number;
  userVotedHelpful?: boolean;
  adminReply?: {
    author: string;
    message: string;
    date: string;
  };
  createdAt: string;
}

export interface ProductReviewSummary {
  averageRating: number;
  totalReviews: number;
  verifiedBuyersCount: number;
  ratingBreakdown: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  averageCriteria: {
    productQuality: number;
    packagingDurability: number;
    shippingSpeed: number;
    valueForMoney: number;
  };
}
