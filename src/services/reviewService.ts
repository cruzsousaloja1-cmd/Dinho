export interface DriverReview {
  id: string;
  rideId: string;
  driverId: string;
  driverName: string;
  driverVehicle?: string;
  passengerName: string;
  passengerEmail?: string;
  rating: number; // 1 a 5
  comment: string; // "Como foi sua corrida com José da Cruz?"
  issueComment?: string; // Se 1 ou 2 estrelas: "O que deu errado?" para o admin
  tags?: string[];
  createdAt: string;
}

const REVIEWS_STORAGE_KEY = 'race_driver_reviews';

// Comentários iniciais padrão para motoristas de Indaiatuba
const INITIAL_SAMPLE_REVIEWS: DriverReview[] = [
  {
    id: 'rev-sample-1',
    rideId: 'RCE-9021',
    driverId: 'drv-indaiatuba-1',
    driverName: 'José da Cruz',
    driverVehicle: 'Chevrolet Onix - RCE9C40',
    passengerName: 'Maria Silva',
    passengerEmail: 'maria@gmail.com',
    rating: 5,
    comment: 'Chegou rápido e carro limpo',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'rev-sample-2',
    rideId: 'RCE-8412',
    driverId: 'drv-indaiatuba-1',
    driverName: 'José da Cruz',
    driverVehicle: 'Chevrolet Onix - RCE9C40',
    passengerName: 'Carlos Eduardo',
    passengerEmail: 'carlos@gmail.com',
    rating: 5,
    comment: 'Direção muito tranquila, ar condicionado gelando e muito educado',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'rev-sample-3',
    rideId: 'RCE-7734',
    driverId: 'drv-indaiatuba-1',
    driverName: 'José da Cruz',
    driverVehicle: 'Chevrolet Onix - RCE9C40',
    passengerName: 'Ana Paula',
    passengerEmail: 'ana@gmail.com',
    rating: 5,
    comment: 'Excelente motorista, pontual no Centro de Indaiatuba',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
  {
    id: 'rev-sample-4',
    rideId: 'RCE-6120',
    driverId: 'moto-indaiatuba-1',
    driverName: 'Lucas Souza',
    driverVehicle: 'Honda CG 160 Fan - MTO-1A23',
    passengerName: 'Rodrigo Lima',
    passengerEmail: 'rodrigo@gmail.com',
    rating: 5,
    comment: 'Entrega rápida e capacete limpo e novo!',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
];

export function getStoredReviews(): DriverReview[] {
  if (typeof window === 'undefined') return INITIAL_SAMPLE_REVIEWS;
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return INITIAL_SAMPLE_REVIEWS;
}

export function saveDriverReview(reviewData: Omit<DriverReview, 'id' | 'createdAt'>): DriverReview {
  const current = getStoredReviews();
  const newReview: DriverReview = {
    ...reviewData,
    id: `rev-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const updated = [newReview, ...current];
  try {
    localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Emite evento para componentes ouvintes
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('race_review_added', { detail: newReview }));
  }

  return newReview;
}

export function getDriverReviews(driverId?: string): DriverReview[] {
  const all = getStoredReviews();
  if (!driverId) return all;
  return all.filter((r) => r.driverId === driverId || r.driverName === 'José da Cruz');
}

export function getDriverRatingStats(driverId?: string, baseRating = 4.8, baseTotalRides = 25): {
  average: number;
  totalReviews: number;
  recentReviews: DriverReview[];
} {
  const reviews = getDriverReviews(driverId);
  if (reviews.length === 0) {
    return {
      average: baseRating,
      totalReviews: baseTotalRides,
      recentReviews: [],
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avg = Number((sum / reviews.length).toFixed(1));

  return {
    average: avg,
    totalReviews: Math.max(reviews.length, baseTotalRides),
    recentReviews: reviews.slice(0, 3), // Últimos 3 comentários
  };
}

export function getIssuesForAdmin(): DriverReview[] {
  const all = getStoredReviews();
  return all.filter((r) => r.rating <= 2 || Boolean(r.issueComment));
}
