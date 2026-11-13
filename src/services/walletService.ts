/**
 * Serviço de Carteira, Saldo e Saques do Motorista RACE
 * - Passageiro paga dentro do app via Asaas
 * - Cada corrida realizada soma 85% líquido no saldo do motorista (15% Comissão Race)
 * - Sem taxa fixa, sem mensalidade, repasse via PIX toda sexta-feira
 * - Gestão de saques pendentes pelo Admin
 */

import { Driver, WithdrawalRequest } from '../types';
import { RACE_PIX_KEY } from '../config/pricing';

const STORAGE_KEY_WITHDRAWALS = 'race_withdrawals';
const STORAGE_KEY_BALANCES = 'race_driver_balances';
const STORAGE_KEY_FEE_DEDUCTED = 'race_weekly_fee_deducted';

/**
 * Obtém o mapa de saldos dos motoristas
 */
function getBalancesMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BALANCES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Salva o mapa de saldos
 */
function saveBalancesMap(map: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(map));
  } catch {}
}

/**
 * Obtém o saldo atual do motorista
 */
export function getDriverBalance(driverId: string, initialFallback: number = 0): number {
  if (!driverId) return 0;
  const map = getBalancesMap();
  if (typeof map[driverId] === 'number') {
    return map[driverId];
  }
  return initialFallback;
}

/**
 * Define o saldo do motorista
 */
export function setDriverBalance(driverId: string, amount: number): void {
  if (!driverId) return;
  const map = getBalancesMap();
  map[driverId] = Math.max(0, Number(amount.toFixed(2)));
  saveBalancesMap(map);
}

/**
 * Soma o valor de uma corrida ao saldo do motorista
 */
export function addDriverEarnings(driverId: string, amount: number): number {
  if (!driverId || amount <= 0) return getDriverBalance(driverId);
  const current = getDriverBalance(driverId);
  const updated = Number((current + amount).toFixed(2));
  setDriverBalance(driverId, updated);
  return updated;
}

/**
 * Obtém a chave de ciclo da semana (ex: "2026-W45")
 */
function getCurrentWeekCycleKey(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum}`;
}

export function hasWeeklyFeeBeenDeducted(_driverId: string): boolean {
  return false;
}

export function setWeeklyFeeDeducted(driverId: string, deducted: boolean = false): void {
  if (!driverId) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEE_DEDUCTED);
    const map = raw ? JSON.parse(raw) : {};
    const cycle = getCurrentWeekCycleKey();
    map[`${driverId}_${cycle}`] = deducted;
    localStorage.setItem(STORAGE_KEY_FEE_DEDUCTED, JSON.stringify(map));
  } catch {}
}

/**
 * Calcula o resumo da carteira do motorista
 * MODELO OFICIAL RACE: A comissão da Race (15%) já é descontada na corrida.
 * O saldo do motorista (85%) fica livre para saque via PIX sem mensalidade.
 */
export function calculateWalletSummary(driver: Driver): {
  gross: number;
  weeklyFee: number;
  net: number;
  canWithdraw: boolean;
  missingForFee: number;
  alreadyPaidFee: boolean;
} {
  const gross = getDriverBalance(driver.id, driver.walletBalance || 0);

  return {
    gross,
    weeklyFee: 0, // Sem mensalidade e sem taxa para trabalhar
    net: gross,   // Motorista recebe seus 85% integralmente
    canWithdraw: gross > 0,
    missingForFee: 0,
    alreadyPaidFee: true,
  };
}

/**
 * Verifica se hoje é segunda-feira e aplica desconto automático se houver saldo suficiente
 */
export function checkMondayAutoDeduction(driverOrId: Driver | string): {
  deducted: boolean;
  newBalance: number;
  message?: string;
} {
  // Sem desconto fixo; o motorista recebe 85% líquido por corrida.
  const driverId = typeof driverOrId === 'string' ? driverOrId : driverOrId.id;
  const initialBalance = typeof driverOrId === 'string' ? undefined : driverOrId.walletBalance;
  return { deducted: false, newBalance: getDriverBalance(driverId, initialBalance || 0) };
}

/**
 * Lista de saques solicitados
 */
export function getWithdrawals(): WithdrawalRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WITHDRAWALS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Salva a lista de saques
 */
function saveWithdrawals(list: WithdrawalRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY_WITHDRAWALS, JSON.stringify(list));
  } catch {}
}

/**
 * Solicitação de Saque pelo Motorista
 * Saca o saldo líquido acumulado (85% das corridas) sem mensalidade
 */
export function requestWithdrawal(
  driver: Driver,
  pixKey: string
): {
  success: boolean;
  error?: string;
  withdrawal?: WithdrawalRequest;
  newBalance: number;
  missingAmount?: number;
} {
  const summary = calculateWalletSummary(driver);

  if (!pixKey || !pixKey.trim()) {
    return {
      success: false,
      error: 'Por favor, informe sua chave PIX para receber o valor.',
      newBalance: summary.gross,
    };
  }

  if (summary.net <= 0) {
    return {
      success: false,
      error: 'Você não possui saldo acumulado disponível para saque no momento.',
      newBalance: summary.gross,
    };
  }

  // Zera o saldo retirado
  setDriverBalance(driver.id, 0);

  const newWithdrawal: WithdrawalRequest = {
    id: `SAQ-${Date.now().toString().slice(-6)}`,
    driverId: driver.id,
    driverName: driver.name,
    driverEmail: driver.email,
    driverPhone: driver.phone,
    grossAmount: summary.gross,
    weeklyFeeDeducted: 0, // Zero taxa de desconto
    netAmount: summary.net,
    pixKey: pixKey.trim(),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  const list = getWithdrawals();
  saveWithdrawals([newWithdrawal, ...list]);

  return {
    success: true,
    withdrawal: newWithdrawal,
    newBalance: 0,
  };
}

/**
 * Admin marca saque como Pago via PIX
 */
export function markWithdrawalAsPaid(withdrawalId: string): boolean {
  const list = getWithdrawals();
  let found = false;
  const updated = list.map((w) => {
    if (w.id === withdrawalId) {
      found = true;
      return {
        ...w,
        status: 'paid' as const,
        paidAt: new Date().toISOString(),
      };
    }
    return w;
  });

  if (found) {
    saveWithdrawals(updated);
  }
  return found;
}
