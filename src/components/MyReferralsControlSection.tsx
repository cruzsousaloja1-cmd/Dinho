import React from 'react';
import {
  Gift,
  Users,
  Wallet,
  Calendar,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { ReferralCandidateItem, SupabasePagamentoRow, withPhotoCacheBuster } from '../supabase';
import { formatBRL } from '../services/pricingService';
import {
  isPassengerReferralRole,
  parseReferralBonusMeta,
  PASSENGER_REFERRAL_BONUS_AMOUNT,
  PASSENGER_REFERRAL_REQUIRED_RIDES,
  REFERRAL_BONUS_AMOUNT,
  REFERRAL_REQUIRED_RIDES,
} from '../services/promoService';

interface MyReferralsControlSectionProps {
  referrals: ReferralCandidateItem[];
  bonusPayments: SupabasePagamentoRow[];
  creditBalance?: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  titleSubtitle?: string;
}

const formatRoleLabel = (tipo?: string | null): 'Motoboy' | 'Motorista' | 'Passageiro' => {
  const norm = String(tipo || '').trim().toLowerCase();
  if (norm === 'motoboy' || norm === 'moto_entrega' || norm === 'moto_passageiro') return 'Motoboy';
  if (isPassengerReferralRole(norm)) return 'Passageiro';
  return 'Motorista';
};

const formatDateBR = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
};

export const MyReferralsControlSection: React.FC<MyReferralsControlSectionProps> = ({
  referrals,
  bonusPayments,
  creditBalance = 0,
  isLoading = false,
  onRefresh,
  titleSubtitle,
}) => {
  const findMatchedPayment = (item: ReferralCandidateItem): SupabasePagamentoRow | undefined =>
    bonusPayments.find((p) => {
      const meta = parseReferralBonusMeta(p.comprovante_url, p.chave_pix, p.valor);
      const idMatch = meta.indicatedId && String(item.id || '') && meta.indicatedId === String(item.id);
      const emailMatch =
        meta.indicatedEmail &&
        item.email &&
        meta.indicatedEmail.toLowerCase() === item.email.toLowerCase();
      return Boolean(idMatch || emailMatch);
    });

  const driverReferralsRaw = referrals.filter((r) => !isPassengerReferralRole(r.tipo));
  const passengerReferralsRaw = referrals.filter((r) => isPassengerReferralRole(r.tipo));

  // Processa R$50 (Motorista OU Motoboy)
  const driverEntries = driverReferralsRaw.map((item) => {
    const matchedPayment = findMatchedPayment(item);
    const meta = matchedPayment
      ? parseReferralBonusMeta(matchedPayment.comprovante_url, matchedPayment.chave_pix, matchedPayment.valor)
      : null;
    const ridesCount = Math.max(
      Number(item.ridesCount || 0),
      item.bonusPaid || matchedPayment ? REFERRAL_REQUIRED_RIDES : 0
    );
    const completed = Math.min(REFERRAL_REQUIRED_RIDES, ridesCount);
    const remainingRides = Math.max(0, REFERRAL_REQUIRED_RIDES - completed);
    const isPaidFriday = Boolean(
      meta?.paidFriday ||
        String(matchedPayment?.status || '').toLowerCase() === 'pago_sexta'
    );
    const isUnlocked = Boolean(
      isPaidFriday || item.bonusPaid || ridesCount >= REFERRAL_REQUIRED_RIDES || matchedPayment
    );
    const status: 'waiting' | 'released' | 'paid_friday' = isPaidFriday
      ? 'paid_friday'
      : isUnlocked
      ? 'released'
      : 'waiting';
    const paidAtFormatted = isPaidFriday
      ? formatDateBR(meta?.paidAt || matchedPayment?.data)
      : '';
    return {
      item,
      roleLabel: formatRoleLabel(item.tipo),
      completed,
      remainingRides,
      isUnlocked,
      isPaidFriday,
      status,
      paidAtFormatted,
      pct: Math.min(100, Math.round((completed / REFERRAL_REQUIRED_RIDES) * 100)),
    };
  });

  // Processa R$10 (Passageiro) com detecção FIFO de Crédito Usado vs Crédito Liberado
  const rawPassengerEntries = passengerReferralsRaw.map((item) => {
    const matchedPayment = findMatchedPayment(item);
    const ridesCount = Math.max(
      Number(item.ridesCount || 0),
      item.bonusPaid || matchedPayment ? PASSENGER_REFERRAL_REQUIRED_RIDES : 0
    );
    const completed = Math.min(PASSENGER_REFERRAL_REQUIRED_RIDES, ridesCount);
    const isReleased = Boolean(
      item.bonusPaid || ridesCount >= PASSENGER_REFERRAL_REQUIRED_RIDES || matchedPayment
    );
    return {
      item,
      matchedPayment,
      completed,
      isReleased,
    };
  });

  const releasedPassengerList = rawPassengerEntries.filter((e) => e.isReleased);
  const totalPassengerReleasedBRL = releasedPassengerList.length * PASSENGER_REFERRAL_BONUS_AMOUNT;
  const consumedPassengerCreditBRL = Math.max(
    0,
    totalPassengerReleasedBRL - Math.max(0, Number(creditBalance || 0))
  );
  const usedPassengerIds = new Set<string>();
  let remainingConsumed = consumedPassengerCreditBRL;
  for (const entry of [...releasedPassengerList].sort(
    (a, b) => new Date(a.item.createdAt || 0).getTime() - new Date(b.item.createdAt || 0).getTime()
  )) {
    if (remainingConsumed >= PASSENGER_REFERRAL_BONUS_AMOUNT - 0.01) {
      usedPassengerIds.add(String(entry.item.id || entry.item.email));
      remainingConsumed -= PASSENGER_REFERRAL_BONUS_AMOUNT;
    }
  }

  const passengerEntries = rawPassengerEntries.map((entry) => {
    const key = String(entry.item.id || entry.item.email);
    const status: 'waiting' | 'released' | 'used' = !entry.isReleased
      ? 'waiting'
      : usedPassengerIds.has(key)
      ? 'used'
      : 'released';
    return {
      ...entry,
      status,
    };
  });

  // Totais gerais do usuário
  const totalIndicated = driverEntries.length + passengerEntries.length;
  const driverEarnedCount = driverEntries.filter((e) => e.isUnlocked).length;
  const passengerEarnedCount = passengerEntries.filter((e) => e.isReleased).length;
  const alreadyEarnedBRL = Number(
    (
      driverEarnedCount * REFERRAL_BONUS_AMOUNT +
      passengerEarnedCount * PASSENGER_REFERRAL_BONUS_AMOUNT
    ).toFixed(2)
  );

  // Quanto falta receber: pendentes R$50 (aguardando ou liberados aguardando sexta) + pendentes R$10 (aguardando 1ª corrida)
  const driverPendingToReceiveBRL =
    driverEntries.filter((e) => !e.isPaidFriday).length * REFERRAL_BONUS_AMOUNT;
  const passengerPendingToReceiveBRL =
    passengerEntries.filter((e) => !e.isReleased).length * PASSENGER_REFERRAL_BONUS_AMOUNT;
  const remainingToReceiveBRL = Number(
    (driverPendingToReceiveBRL + passengerPendingToReceiveBRL).toFixed(2)
  );

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-5 text-slate-950">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-3 py-0.5 rounded-full">
            SEM LIMITE DE INDICAÇÃO ATÉ 17/12/2026
          </span>
          <h3 className="font-heading font-black text-lg sm:text-xl text-slate-950 flex items-center gap-2">
            <span>📋 MEUS BENEFICIADOS / MINHAS INDICAÇÕES</span>
          </h3>
          {titleSubtitle && (
            <p className="text-xs text-slate-600 font-medium">{titleSubtitle}</p>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-heading font-black inline-flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 active:scale-95 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        )}
      </div>

      {/* 4 Métricas no topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#ff6a00]" />
            <span>Quantos você indicou no total</span>
          </span>
          <p className="text-2xl font-heading font-black text-slate-950">{totalIndicated}</p>
          <span className="text-[11px] text-slate-500 font-medium block">
            {driverEntries.length} Motorista/Motoboy &bull; {passengerEntries.length} Passageiro
          </span>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Quanto você já ganhou</span>
          </span>
          <p className="text-2xl font-heading font-black text-emerald-700">
            {formatBRL(alreadyEarnedBRL)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium block">
            R$50 (10 corridas) + R$10 (1ª corrida)
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-amber-800 flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-[#ff6a00]" />
            <span>Quanto falta receber</span>
          </span>
          <p className="text-2xl font-heading font-black text-[#ff6a00]">
            {formatBRL(remainingToReceiveBRL)}
          </p>
          <span className="text-[11px] text-amber-800 font-medium block">
            Aguardando meta ou pagamento sexta
          </span>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase text-blue-800 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Próximo pagamento</span>
          </span>
          <p className="text-xl font-heading font-black text-blue-700">Sexta-feira</p>
          <span className="text-[11px] text-blue-800 font-medium block">
            PIX via RACE (R$10 crédito imediato)
          </span>
        </div>
      </div>

      {/* CAIXA 1 (LARANJA EM CIMA): R$50 MOTORISTA OU MOTOBOY */}
      <div className="rounded-3xl border-2 border-orange-400 bg-gradient-to-b from-orange-50 to-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 shrink-0" />
              <h4 className="font-heading font-black text-base sm:text-lg">
                Você indicou Motorista OU Motoboy ({driverEntries.length})
              </h4>
            </div>
            <p className="text-xs text-amber-50 font-medium">
              Ganhe R$50 via PIX toda sexta-feira por cada Motorista OU Motoboy que completar 10 corridas!
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-black/25 border border-white/30 text-xs font-black self-start sm:self-auto shrink-0">
            Bônus R$50 &bull; 10 corridas
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#ff6a00]" />
              <span>Carregando seus Motoristas e Motoboys indicados...</span>
            </div>
          ) : driverEntries.length === 0 ? (
            <div className="py-6 px-4 text-center bg-white rounded-2xl border border-dashed border-orange-300 space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Nenhum Motorista OU Motoboy indicado ainda
              </p>
              <p className="text-xs text-slate-500">
                Passageiro, Motorista, Motoboy e ADM podem indicar amigos com o código acima e ganhar R$50 quando completarem 10 corridas!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {driverEntries.map(
                ({
                  item,
                  roleLabel,
                  completed,
                  remainingRides,
                  status,
                  paidAtFormatted,
                  pct,
                }) => {
                  const photoSrc = item.foto ? withPhotoCacheBuster(item.foto) : '';
                  return (
                    <div
                      key={item.id || item.email}
                      className="p-3.5 sm:p-4 rounded-2xl border border-orange-200 bg-white shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-full border-2 border-orange-400 bg-zinc-900 overflow-hidden flex items-center justify-center shrink-0">
                            {photoSrc ? (
                              <img
                                src={photoSrc}
                                alt={item.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="font-heading font-black text-base text-[#ff6a00]">
                                {(item.nome || 'M').charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-heading font-black text-slate-950 text-sm sm:text-base truncate">
                                {item.nome}
                              </p>
                              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-900 border border-orange-300">
                                {roleLabel}
                              </span>
                              <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-slate-900 text-white">
                                Valor R$50
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-600 mt-0.5">
                              Progresso: <strong>{completed}/10 corridas</strong> &bull;{' '}
                              {remainingRides > 0 ? (
                                <span className="text-amber-700 font-bold">
                                  Faltam {remainingRides} {remainingRides === 1 ? 'corrida' : 'corridas'}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">
                                  Meta 10/10 concluída!
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {status === 'waiting' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                              <Clock className="w-3.5 h-3.5" />
                              <span>⏳ Aguardando</span>
                            </span>
                          )}
                          {status === 'released' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                              <span>✅ Liberado</span>
                            </span>
                          )}
                          {status === 'paid_friday' && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 text-white border border-emerald-500 text-xs font-black">
                              <span>
                                💸 Pago na sexta{paidAtFormatted ? ` (${paidAtFormatted})` : ''}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'waiting' ? 'bg-[#ff6a00]' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* CAIXA 2 (AZUL EMBAIXO): R$10 PASSAGEIRO */}
      <div className="rounded-3xl border-2 border-blue-400 bg-gradient-to-b from-blue-50 to-white overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 shrink-0" />
              <h4 className="font-heading font-black text-base sm:text-lg">
                Você indicou Passageiro ({passengerEntries.length})
              </h4>
            </div>
            <p className="text-xs text-blue-50 font-medium">
              Ganhe R$10 crédito imediato no app quando cada Passageiro indicado completar a 1ª corrida!
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-black/25 border border-white/30 text-xs font-black self-start sm:self-auto shrink-0">
            R$10 crédito &bull; 1ª corrida
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Carregando seus Passageiros indicados...</span>
            </div>
          ) : passengerEntries.length === 0 ? (
            <div className="py-6 px-4 text-center bg-white rounded-2xl border border-dashed border-blue-300 space-y-1">
              <p className="text-sm font-bold text-slate-800">
                Nenhum Passageiro indicado ainda
              </p>
              <p className="text-xs text-slate-500">
                Motorista, Motoboy, Passageiro e ADM podem indicar passageiros e ganhar R$10 de crédito na 1ª corrida do indicado!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {passengerEntries.map(({ item, completed, status }) => {
                const photoSrc = item.foto ? withPhotoCacheBuster(item.foto) : '';
                return (
                  <div
                    key={item.id || item.email}
                    className="p-3.5 sm:p-4 rounded-2xl border border-blue-200 bg-white shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-full border-2 border-blue-400 bg-blue-950 overflow-hidden flex items-center justify-center shrink-0">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={item.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="font-heading font-black text-base text-sky-300">
                            {(item.nome || 'P').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-heading font-black text-slate-950 text-sm sm:text-base truncate">
                            {item.nome}
                          </p>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                            Passageiro
                          </span>
                          <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-full bg-blue-700 text-white">
                            R$10 crédito
                          </span>
                        </div>
                        <p className="text-xs font-mono text-slate-600 mt-0.5">
                          Progresso: <strong>{completed}/1 corrida</strong> &bull;{' '}
                          {completed >= 1 ? (
                            <span className="text-emerald-700 font-bold">1ª corrida concluída!</span>
                          ) : (
                            <span className="text-amber-700 font-bold">Falta 1 corrida</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {status === 'waiting' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                          ⏳ Aguardando 1ª corrida
                        </span>
                      )}
                      {status === 'released' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-black">
                          ✅ Crédito Liberado
                        </span>
                      )}
                      {status === 'used' && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-xs font-black">
                          💳 Crédito Usado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
