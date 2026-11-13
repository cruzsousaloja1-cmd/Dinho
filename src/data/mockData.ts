import { Driver, PushNotification, Ride, SupportTicket } from '../types';
import { WEEKLY_FEE, WEEKLY_FEE_TEXT } from '../config/pricing';

export const DEFAULT_NEW_DRIVER: Driver = {
  id: '',
  name: '',
  avatar: '',
  phone: '',
  email: '',
  cpf: '',
  cnh: '',
  category: 'economica',
  vehicleModel: '',
  vehiclePlate: '',
  vehicleColor: '',
  vehicleYear: 2024,
  rating: 0,
  totalRides: 0,
  status: 'offline',
  lat: -23.0903,
  lng: -47.2180,
  weeklyPlanActive: false,
  weeklyPlanExpiresAt: null,
  weeklyFeePaidAt: null,
  weeklyFeeExpiresAt: null,
  weeklyPlanPrice: WEEKLY_FEE,
  earningsToday: 0,
  earningsWeek: 0,
  walletBalance: 0,
  cnhVerified: false,
  vehicleVerified: false,
  criminalRecordClear: false,
  registrationDate: '',
};

export const INITIAL_DRIVERS: Driver[] = [];

export const INITIAL_RIDES_HISTORY: Ride[] = [];

export const POPULAR_LOCATIONS = [
  { label: 'Av. Presidente Vargas, 1200 - Cidade Nova', lat: -23.0842, lng: -47.2118 },
  { label: 'Parque Ecológico de Indaiatuba - Portão Principal', lat: -23.0955, lng: -47.2250 },
  { label: 'Praça Prudente de Moraes - Centro', lat: -23.0903, lng: -47.2180 },
  { label: 'Rua Ário Barnabé, 800 - Jd. Morada do Sol', lat: -23.1180, lng: -47.2380 },
  { label: 'Polo Shopping Indaiatuba - Alameda Filtros Mann', lat: -23.0682, lng: -47.2024 },
  { label: 'Hospital HAOC - Av. Francisco de Paula Leite', lat: -23.0890, lng: -47.2135 },
  { label: 'Rodoviária de Indaiatuba - Jardim Belo Horizonte', lat: -23.0760, lng: -47.2070 },
];

export const INITIAL_NOTIFICATIONS: PushNotification[] = [];

export const INITIAL_TICKETS: SupportTicket[] = [];
