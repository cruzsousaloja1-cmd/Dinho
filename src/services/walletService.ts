/**
 * Serviço de Carteira, Saldo e Saques do Motorista RACE
 * - Passageiro paga dentro do app via Asaas
 * - Cada corrida realizada soma 85% líquido no saldo do motorista (15% Comissão Race)
 * - Sem taxa fixa, sem mensalidade, repasse via PIX toda sexta-feira
 * - Sem uso de localStorage para saldos ou saques
 */

import { Driver, WithdrawalRequest } from '../types';
import { savePagamentoSupabase, supabase } from '../supabase';

let inMemoryBalances: Record<string, number> = {};
let inMemoryWithdrawals: WithdrawalRequest[] = [];

export function clearWalletMemoryCache(): void {
  inMemoryBalances = {};
  inMemoryWithdrawals = [];
}

/**
 * Obtém o saldo atual do motorista
 */
export function getDriverBalance(driverId: string, initialFallback: number = 0): number {
  if (!driverId) return 0;
  if (typeof inMemoryBalances[driverId] === 'number') {
    return inMemoryBalances[driverId];
  }
  return initialFallback;
}

/**
 * Define o saldo do motorista
 */
export function setDriverBalance(driverId: string, amount: number): void {
  if (!driverId) return;
  inMemoryBalances[driverId] = Math.max(0, Number(amount.toFixed(2)));
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

export function hasWeeklyFeeBeenDeducted(_driverId: string): boolean {
  return false;
}

export function setWeeklyFeeDeducted(_driverId: string, _deducted: boolean = false): void {
  // Sem mensalidade / sem taxa semanal fixa
}

/**
 * Calcula o resumo da carteira do motorista
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
    weeklyFee: 0,
    net: gross,
    canWithdraw: gross > 0,
    missingForFee: 0,
    alreadyPaidFee: true,
  };
}

export function checkMondayAutoDeduction(driverOrId: Driver | string): {
  deducted: boolean;
  newBalance: number;
  message?: string;
} {
  const driverId = typeof driverOrId === 'string' ? driverOrId : driverOrId.id;
  const initialBalance = typeof driverOrId === 'string' ? undefined : driverOrId.walletBalance;
  return { deducted: false, newBalance: getDriverBalance(driverId, initialBalance || 0) };
}

/**
 * Lista de saques solicitados na sessão / hidratada do Supabase
 */
export function getWithdrawals(): WithdrawalRequest[] {
  return inMemoryWithdrawals;
}

export function setWithdrawalsFromSupabase(list: WithdrawalRequest[]): void {
  inMemoryWithdrawals = list;
}

/**
 * Solicitação de Saque pelo Motorista -> salva no Supabase pagamentos
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

  setDriverBalance(driver.id, 0);

  const newWithdrawal: WithdrawalRequest = {
    id: '',
    driverId: driver.id,
    driverName: driver.name,
    driverEmail: driver.email,
    driverPhone: driver.phone,
    grossAmount: summary.gross,
    weeklyFeeDeducted: 0,
    netAmount: summary.net,
    pixKey: pixKey.trim(),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  inMemoryWithdrawals = [newWithdrawal, ...inMemoryWithdrawals];

  savePagamentoSupabase({
    id_motorista: driver.id,
    nome_motorista: driver.name,
    email_motorista: driver.email,
    valor: summary.net,
    tipo: 'saque',
    status: 'pending',
    chave_pix: pixKey.trim(),
  })
    .then((res) => {
      if (res.id) {
        newWithdrawal.id = res.id;
      }
    })
    .catch(() => {});

  return {
    success: true,
    withdrawal: newWithdrawal,
    newBalance: 0,
  };
}

/**
 * Admin marca saque como Pago via PIX e atualiza no Supabase
 */
export function markWithdrawalAsPaid(withdrawalId: string): boolean {
  let found = false;
  inMemoryWithdrawals = inMemoryWithdrawals.map((w) => {
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

  if (found && /^\d+$/.test(String(withdrawalId))) {
    supabase.from('pagamentos').update({ status: 'paid' }).eq('id', Number(withdrawalId)).then(() => {}, () => {});
  }
  return found;
}
