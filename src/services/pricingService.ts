import { CategoryInfo, VehicleCategory } from '../types';

export const VEHICLE_CATEGORIES: Record<VehicleCategory, CategoryInfo> = {
  economica: {
    id: 'economica',
    name: 'RACE Econômica',
    tagline: 'O melhor custo-benefício da cidade',
    basePrice: 5.00,
    pricePerKm: 2.50, // Conforme especificado pelo usuário: R$ 2,50 por km
    iconName: 'Car',
    estimatedTimeMin: 4,
    description: 'Carros compactos e confortáveis com ar-condicionado. Ideal para o dia a dia.',
    capacity: 'Até 4 passageiros',
    recommendedFor: 'Economia e agilidade',
  },
  confort: {
    id: 'confort',
    name: 'RACE Confort',
    tagline: 'Espaço extra, carros premium e atendimento VIP',
    basePrice: 7.00,
    pricePerKm: 3.50, // Conforme especificado pelo usuário: R$ 3,50 por km
    iconName: 'Sparkles',
    estimatedTimeMin: 6,
    description: 'Sedans e SUVs novos, motoristas top avaliados e temperatura personalizada.',
    capacity: 'Até 4 passageiros + bagagem ampla',
    recommendedFor: 'Reuniões, viagens e máximo conforto',
  },
  moto_passageiro: {
    id: 'moto_passageiro',
    name: 'RACE Moto Passageiro',
    tagline: 'Fuja do trânsito na modalidade mais rápida',
    basePrice: 4.00,
    pricePerKm: 1.80,
    iconName: 'Bike',
    estimatedTimeMin: 2,
    description: 'Motoboy profissional credenciado. Acompanha capacete higienizado com touca descartável.',
    capacity: '1 passageiro',
    recommendedFor: 'Pressa e horários de pico',
  },
  moto_entrega: {
    id: 'moto_entrega',
    name: 'RACE Moto Entrega Flash',
    tagline: 'Envio imediato de encomendas e documentos',
    basePrice: 4.50,
    pricePerKm: 2.00,
    iconName: 'PackageCheck',
    estimatedTimeMin: 3,
    description: 'Motoboy com baú térmico/mochila segura. Rastreamento do pacote em tempo real e código de entrega.',
    capacity: 'Até 20kg / 45L',
    recommendedFor: 'Documentos, compras e encomendas urgentes',
  },
};

import { COMMISSION, RACE_COMMISSION_PERCENT, DRIVER_SHARE_PERCENT } from '../config/pricing';
import { calculateRideSplitForDriver } from './promoService';

export const RACE_COMMISSION_RATE = COMMISSION; // 0.15
export { RACE_COMMISSION_PERCENT, DRIVER_SHARE_PERCENT };
// Taxa semanal fixa é ZERO (0) - 0% até 17/12/2026, 15% após 17/12/2026
export const WEEKLY_SUBSCRIPTION_PRICE = 0;

export function calculateFare(
  category: VehicleCategory,
  distanceKm: number
): {
  totalPrice: number;
  driverEarnings: number;
  platformFee: number;
  breakdown: { base: number; perKm: number; distance: number; rate: number };
} {
  const cat = VEHICLE_CATEGORIES[category];
  const kmCost = distanceKm * cat.pricePerKm;
  const total = Math.max(cat.basePrice + kmCost, cat.basePrice);
  const roundedTotal = Number(total.toFixed(2));

  // Até 17/12/2026: taxa = 0% (100% condutor) | Após 17/12/2026: taxa = 15% (85% condutor)
  const split = calculateRideSplitForDriver(roundedTotal);

  return {
    totalPrice: roundedTotal,
    driverEarnings: split.driverEarnings,
    platformFee: split.platformFee,
    breakdown: {
      base: cat.basePrice,
      perKm: kmCost,
      distance: distanceKm,
      rate: cat.pricePerKm,
    },
  };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

let lastGeneratedConfirmationCode = '';

/**
 * Gera um código único de 4 dígitos numéricos (ex: 4827) para confirmação da corrida.
 * Garante que o código nunca repita o da corrida imediatamente anterior.
 */
export function generateUniqueRideConfirmationCode(): string {
  let code = '';
  let guard = 0;
  do {
    code = String(Math.floor(1000 + Math.random() * 9000));
    guard += 1;
  } while (code === lastGeneratedConfirmationCode && guard < 20);

  lastGeneratedConfirmationCode = code;
  return code;
}
