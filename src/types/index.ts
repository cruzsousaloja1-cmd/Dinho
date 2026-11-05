export type VehicleCategory = 'economica' | 'confort' | 'moto_passageiro' | 'moto_entrega';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'passenger' | 'driver' | 'admin';
  avatar?: string;
  rating?: number;
  driverData?: Driver;
}

export interface CategoryInfo {
  id: VehicleCategory;
  name: string;
  tagline: string;
  basePrice: number;
  pricePerKm: number;
  iconName: string;
  estimatedTimeMin: number;
  description: string;
  capacity: string;
  recommendedFor: string;
}

export interface PendingPayment {
  status: 'pending' | 'approved' | 'rejected';
  amount: number;
  sentAt: string; // ISO date
  comprovanteId: string;
  comprovanteUrl?: string;
  driverName?: string;
  driverPhone?: string;
}

export interface Driver {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  email: string;
  cpf: string;
  cnh: string;
  category: VehicleCategory;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleColor: string;
  vehicleYear: number;
  rating: number;
  totalRides: number;
  status: 'online' | 'offline' | 'in_ride' | 'pending_approval';
  lat: number;
  lng: number;
  weeklyPlanActive: boolean;
  weeklyPlanExpiresAt?: string | null;
  weeklyFeePaidAt?: string | null; // ISO date
  weeklyFeeExpiresAt?: string | null; // ISO date
  weeklyPlanPrice?: number;
  pixKey?: string; // chave pix do motorista pra receber corrida
  pendingPayment?: PendingPayment | null;
  earningsToday: number;
  earningsWeek: number;
  cnhVerified: boolean;
  vehicleVerified: boolean;
  criminalRecordClear: boolean;
  registrationDate: string;
  password?: string;
  comfortEligible?: boolean;
  comfortEligibilityReason?: string;
}

export interface LocationPoint {
  address: string;
  lat: number;
  lng: number;
  complement?: string;
  contactName?: string;
  contactPhone?: string;
}

export type RideStatus = 
  | 'idle' 
  | 'searching' 
  | 'driver_assigned' 
  | 'driver_arriving' 
  | 'in_progress' 
  | 'completed' 
  | 'cancelled';

export interface Ride {
  id: string;
  passengerName: string;
  passengerPhone: string;
  passengerRating: number;
  driver?: Driver;
  category: VehicleCategory;
  pickup: LocationPoint;
  destination: LocationPoint;
  distanceKm: number;
  durationMinutes: number;
  price: number;
  driverEarnings: number; // 100% of price
  platformFee: number;    // R$ 0.00
  paymentMethod: 'pix' | 'credit_card' | 'race_pay' | 'money';
  paymentStatus: 'pending' | 'paid';
  status: RideStatus;
  createdAt: string;
  completedAt?: string;
  ratingGivenToDriver?: number;
  ratingComment?: string;
  deliveryDetails?: {
    packageType: string;
    instructions: string;
    deliveryCode: string;
    recipientName: string;
  };
}

export interface WeeklySubscription {
  driverId: string;
  driverName: string;
  amount: number; // 200 (WEEKLY_FEE)
  status: 'active' | 'expiring_soon' | 'expired' | 'pending_payment';
  startedAt: string;
  expiresAt: string;
  paymentMethod: string;
  autoRenew: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'ride' | 'financial' | 'safety' | 'system';
  read: boolean;
}

export interface SupportTicket {
  id: string;
  userName: string;
  userType: 'driver' | 'passenger';
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: 'normal' | 'urgent' | 'emergency';
  createdAt: string;
  messages: {
    sender: 'user' | 'support';
    text: string;
    timestamp: string;
  }[];
}
