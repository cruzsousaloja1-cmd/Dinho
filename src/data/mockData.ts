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
  lat: -23.5615,
  lng: -46.6558,
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
  { label: 'Av. Paulista, 1000 - Bela Vista', lat: -23.5650, lng: -46.6520 },
  { label: 'Av. Brigadeiro Faria Lima, 2200 - Pinheiros', lat: -23.5780, lng: -46.6900 },
  { label: 'Parque Ibirapuera - Portão 7', lat: -23.5874, lng: -46.6576 },
  { label: 'Aeroporto de Congonhas - Embarque', lat: -23.6273, lng: -46.6565 },
  { label: 'Rua Oscar Freire, 500 - Cerqueira César', lat: -23.5640, lng: -46.6670 },
  { label: 'Estação da Luz - Centro Histórico', lat: -23.5350, lng: -46.6350 },
  { label: 'Shopping Eldorado - Av. Rebouças', lat: -23.5710, lng: -46.6980 },
];

export const INITIAL_NOTIFICATIONS: PushNotification[] = [
  {
    id: 'notif-1',
    title: '🚀 RACE: 100% dos Ganhos são Seus!',
    message: `Lembre-se: com sua assinatura semanal de ${WEEKLY_FEE_TEXT}, nenhuma corrida tem desconto de comissão.`,
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
