import { Driver, PushNotification, Ride, SupportTicket } from '../types';
import { WEEKLY_FEE, WEEKLY_FEE_TEXT } from '../config/pricing';

export const DEFAULT_NEW_DRIVER: Driver = {
  id: '',
  name: 'Novo Motorista',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  phone: '',
  email: '',
  cpf: '',
  cnh: '',
  category: 'economica',
  vehicleModel: '',
  vehiclePlate: '',
  vehicleColor: 'Preto',
  vehicleYear: 2024,
  rating: 5.0,
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
  cnhVerified: false,
  vehicleVerified: false,
  criminalRecordClear: false,
  registrationDate: new Date().toISOString().split('T')[0],
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

export const INITIAL_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'notif-1',
    title: '🚀 RACE: 85% dos Ganhos são Seus!',
    message: 'Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar. Repasse toda sexta-feira.',
    time: 'Há 5 minutos',
    type: 'financial',
    read: false,
  },
  {
    id: 'notif-2',
    title: '🛡️ Suporte 24h Ativo',
    message: 'Nossa central de telemetria e segurança está monitorando todas as rotas com GPS ao vivo.',
    time: 'Há 25 minutos',
    type: 'safety',
    read: false,
  },
];

export const INITIAL_TICKETS: SupportTicket[] = [];
