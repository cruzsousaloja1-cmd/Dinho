export interface DriverReview {
  id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  driverVehicle?: string;
  passengerName: string;
  passengerEmail?: string;
  rating: number; // 1 a 5
  comment: string;
  issueComment?: string; // Se 1 ou 2 estrelas: "O que deu errado?" para o admin
  tags?: string[];
  createdAt: string;
}

let inMemoryReviews: DriverReview[] = [];

export function getStoredReviews(): DriverReview[] {
  return inMemoryReviews;
}

export function setReviewsFromSupabase(reviews: DriverReview[]): void {
  inMemoryReviews = reviews;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('race_review_added'));
  }
}

export function clearReviewsCache(): void {
  inMemoryReviews = [];
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('race_review_added'));
  }
}

export function saveDriverReview(reviewData: Omit<DriverReview, 'id' | 'createdAt'>): DriverReview {
  const newReview: DriverReview = {
    ...reviewData,
    id: `rev-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  inMemoryReviews = [newReview, ...inMemoryReviews];

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('race_review_added', { detail: newReview }));
  }

  return newReview;
}

export function getDriverReviews(driverId?: string): DriverReview[] {
  if (!driverId) return inMemoryReviews;
  return inMemoryReviews.filter((r) => r.driverId === driverId);
}

export function getDriverRatingStats(driverId?: string): {
  average: number;
  totalReviews: number;
  recentReviews: DriverReview[];
} {
  const reviews = getDriverReviews(driverId);
  if (reviews.length === 0) {
    return {
      average: 0,
      totalReviews: 0,
      recentReviews: [],
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Number((sum / reviews.length).toFixed(1));

  return {
    average: avg,
    totalReviews: reviews.length,
    recentReviews: reviews.slice(0, 3),
  };
}

export function getIssuesForAdmin(): DriverReview[] {
  return inMemoryReviews.filter((r) => r.rating <= 2 || Boolean(r.issueComment));
}
